// Synthetic load: 1 host + 30 SSE participants through all 20 rounds of one room.
// Run: node tests/quiz-load.mjs            (in-process server, loopback)
//      BASE=https://quiz.example.edu node tests/quiz-load.mjs   (deployed URL)
import {pathToFileURL, fileURLToPath} from 'node:url';
import {join, dirname} from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const N = 30;
let base = process.env.BASE, server = null, quiz = null;
if (!base) {
  const {createLabServer} = await import(pathToFileURL(join(root, '..', 'serve.js')).href);
  ({server, quiz} = createLabServer());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
const rss0 = process.memoryUsage().rss;
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, timeout = 20000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error(`timeout: ${label}`);
    await sleep(5);
  }
}
async function post(path, body, token) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    body: JSON.stringify(body),
  });
  return {status: response.status, json: await response.json()};
}

const created = await post('/api/quiz/rooms', {multiplier: 1});
if (created.status !== 201) throw new Error(`create ${created.status}`);
const pin = created.json.pin;
const host = {role: 'host', token: created.json.token, log: []};
const people = [];
for (let i = 0; i < N; i++) {
  const joined = await post(`/api/quiz/rooms/${pin}/join`, {name: `Peserta ${String(i + 1).padStart(2, '0')}`});
  if (joined.status !== 201) throw new Error(`join ${i}: ${joined.status} ${joined.json.error}`);
  people.push({role: 'player', token: joined.json.token, id: joined.json.state.memberId, log: [], answers: []});
}
const everyone = [host, ...people];
const latest = m => m.log.at(-1)?.state;
const all = pred => everyone.every(m => { const s = latest(m); return !!s && pred(s); });

for (const m of everyone) {
  m.ctrl = new AbortController();
  m.loop = (async () => {
    try {
      const response = await fetch(`${base}/api/quiz/rooms/${pin}/events`, {
        headers: {Authorization: `Bearer ${m.token}`}, signal: m.ctrl.signal,
      });
      if (!response.ok) { errors.push(`stream ${response.status}`); return; }
      const reader = response.body.getReader(), decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const event = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const line = event.split('\n').find(l => l.startsWith('data: '));
          if (line) m.log.push({t: performance.now(), state: JSON.parse(line.slice(6))});
        }
      }
    } catch (error) {
      if (!m.ctrl.signal.aborted) errors.push(`stream error: ${error.message}`);
    }
  })();
}
await until(() => all(() => true), 'initial snapshots');

const commandLatency = [], reviewLatency = [], startLag = [];
const leakViolations = [];
const checkNoLeak = s => {
  if (['lobby', 'countdown', 'question'].includes(s.phase) && s.question && ('answer' in s.question || 'explanation' in s.question)) leakViolations.push(s.phase);
  if (s.phase === 'question' && s.distribution) leakViolations.push('distribution-during-question');
};

async function command(name) {
  const revision = latest(host).revision;
  const sentAt = performance.now();
  const response = await post(`/api/quiz/rooms/${pin}/command`, {command: name, revision}, host.token);
  if (response.status !== 200) throw new Error(`${name}: ${response.status} ${response.json.error}`);
  return {sentAt, target: response.json.revision};
}
const measure = (cmd, phase, into) => {
  for (const m of everyone) {
    const entry = m.log.find(e => e.t >= cmd.sentAt && e.state.revision >= cmd.target && e.state.phase === phase);
    if (entry) into.push(entry.t - cmd.sentAt);
  }
};

let cmd = await command('start');
await until(() => all(s => s.phase === 'countdown' && s.revision >= cmd.target), 'countdown fan-out');
measure(cmd, 'countdown', commandLatency);

for (let round = 0; round < 20; round++) {
  await until(() => all(s => s.phase === 'question'), `question ${round + 1}`, 30000);
  for (const m of everyone) for (const e of m.log) checkNoLeak(e.state);
  const qs = latest(people[0]);
  startLag.push(qs.serverNow - qs.startsAt);
  const questionId = qs.question.id;
  let lastSent = 0;
  await Promise.all(people.map(async p => {
    await sleep(Math.random() * 1500);
    const choice = Math.floor(Math.random() * 4);
    const sentAt = performance.now();
    lastSent = Math.max(lastSent, sentAt);
    const response = await post(`/api/quiz/rooms/${pin}/answer`, {questionId, choice}, p.token);
    if (response.status !== 200) errors.push(`answer r${round + 1}: ${response.status} ${response.json.error}`);
    else p.answers.push(choice);
  }));
  await until(() => all(s => s.phase === 'review'), `review ${round + 1}`, 30000);
  for (const m of everyone) {
    const entry = m.log.find(e => e.t >= lastSent && e.state.phase === 'review');
    if (entry) reviewLatency.push(entry.t - lastSent);
  }
  const reviewed = everyone.map(m => latest(m));
  const distTotal = reviewed[0].distribution.reduce((a, b) => a + b, 0);
  if (distTotal !== N) errors.push(`round ${round + 1} distribution total ${distTotal}`);
  if (new Set(reviewed.map(s => JSON.stringify(s.leaderboard))).size !== 1) errors.push(`round ${round + 1} leaderboard mismatch`);
  if (round < 19) {
    cmd = await command('next');
    await until(() => all(s => s.phase === 'countdown' && s.revision >= cmd.target), `next ${round + 2}`);
    measure(cmd, 'countdown', commandLatency);
  }
}
cmd = await command('finish');
await until(() => all(s => s.phase === 'finished'), 'finished');
measure(cmd, 'finished', commandLatency);
for (const m of everyone) for (const e of m.log) checkNoLeak(e.state);

const finalBoards = everyone.map(m => JSON.stringify(latest(m).leaderboard));
const mismatch = new Set(finalBoards).size !== 1;
const ownScoreMismatch = people.filter(p => {
  const s = latest(p);
  const row = s.leaderboard.find(r => r.id === p.id);
  return !row || row.score !== s.me.score || row.correct !== s.me.correct;
}).length;
const csv = await fetch(`${base}/api/quiz/rooms/${pin}/results`, {headers: {Authorization: `Bearer ${host.token}`}});
const csvRows = (await csv.text()).replace(/^﻿/, '').trim().split('\r\n').length;
const playerCsv = await fetch(`${base}/api/quiz/rooms/${pin}/results`, {headers: {Authorization: `Bearer ${people[0].token}`}});

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1) : null; };
const summary = {
  target: base, participants: N, rounds: 20,
  streamErrors: errors,
  leakViolations: leakViolations.length,
  finalLeaderboardMismatch: mismatch,
  ownScoreMismatch,
  startLagMs: {max: Math.max(...startLag)},
  countdownFanoutMs: {p50: pct(commandLatency, .5), p95: pct(commandLatency, .95), max: pct(commandLatency, 1), n: commandLatency.length},
  answerToReviewFanoutMs: {p50: pct(reviewLatency, .5), p95: pct(reviewLatency, .95), max: pct(reviewLatency, 1), n: reviewLatency.length},
  eventsPerMember: {min: Math.min(...everyone.map(m => m.log.length)), max: Math.max(...everyone.map(m => m.log.length))},
  csvLines: csvRows, csvStatusForPlayer: playerCsv.status,
  rssMB: {start: +(rss0 / 1048576).toFixed(1), end: +(process.memoryUsage().rss / 1048576).toFixed(1)},
};
console.log(JSON.stringify(summary, null, 2));

for (const m of everyone) m.ctrl.abort();
if (server) {
  quiz.close();
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
}
process.exit(errors.length || mismatch || leakViolations.length || ownScoreMismatch ? 1 : 0);
