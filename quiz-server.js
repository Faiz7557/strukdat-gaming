import {createHash, randomBytes, randomInt} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {queueQuiz} from './quiz-bank.js';

const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const secret = () => randomBytes(24).toString('hex');
const digest = value => createHash('sha256').update(value).digest('hex');
const TTL = 3 * 60 * 60 * 1000;
const IDEM_TTL = 10 * 60 * 1000;
const defaultNow = () => Math.floor(performance.timeOrigin + performance.now());
export const scoreAnswer = (correct, elapsed, duration) => correct ? 800 + Math.round(200 * (1 - Math.min(1, Math.max(0, elapsed / duration)))) : 0;
const csvCell = value => `"${String(value).replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"','""')}"`;
const sameHost = (origin, host) => { try {return new URL(origin).host===host;} catch {return false;} };

export function createQuizService({now = defaultNow, wallNow = () => Date.now(), allowedHosts = null, trustProxy = false, dataFile = null} = {}) {
  // shortcut: rooms live in RAM and, with dataFile, are snapshotted to one JSON file. Use a real database before multi-instance or graded use.
  const rooms = new Map(), limits = new Map(), idem = new Map();
  let saveTimer = null, closed = false;
  const json = (res, status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
  function limit(key, max, window) {
    const t = now();
    let item = limits.get(key);
    if (!item || t >= item.until) { item = {count:0, until:t+window}; limits.set(key,item); }
    if (++item.count > max) fail(429,'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.');
  }
  function clientIp(req) {
    const forwarded = trustProxy ? req.headers['x-forwarded-for']?.split(',').at(-1).trim() : null;
    return forwarded || req.socket.remoteAddress || 'unknown';
  }
  // Idempotency-Key makes a retried create/join return the first response instead of a second room or player.
  function idemScope(scope, req) {
    const key = req.headers['idempotency-key'];
    if (key===undefined) return null;
    if (typeof key!=='string' || !/^[A-Za-z0-9_-]{16,64}$/.test(key)) fail(400,'Idempotency-Key tidak valid.');
    return digest(`${scope}:${key}`);
  }
  function remember(key, status, body) { if (key) idem.set(key, {status, body, until:now()+IDEM_TTL}); }
  function rank(room) {
    const rows = [...room.players.values()].map(p => {
      const hidden=room.phase==='question' ? p.answers.get(queueQuiz[room.index]?.id) : null;
      return {id:p.id, name:p.name, score:p.score-(hidden?.points??0), correct:p.correct-Number(hidden?.correct??false), correctMs:p.correctMs-(hidden?.correct?hidden.elapsedMs:0), connected:p.streams.size>0};
    });
    rows.sort((a,b) => b.score-a.score || b.correct-a.correct || a.correctMs-b.correctMs || a.id.localeCompare(b.id));
    return rows.map((p,i) => {p.rank=i && p.score===rows[i-1].score && p.correct===rows[i-1].correct && p.correctMs===rows[i-1].correctMs ? rows[i-1].rank : i+1;return p;});
  }
  function view(room, member) {
    const t = now(), question = queueQuiz[room.index], reveal = ['review','finished'].includes(room.phase);
    const answer = member.answers?.get(question?.id), leaderboard=rank(room), mine=leaderboard.find(p=>p.id===member.id);
    const state = {pin:room.pin, phase:room.phase, revision:room.revision, serverNow:t, expiresAt:room.expiresAt, role:member.role, memberId:member.id,
      total:queueQuiz.length, number:room.index+1, durationMultiplier:room.multiplier,
      startsAt:room.startsAt, deadline:room.deadline, answered:question ? [...room.players.values()].filter(p=>p.answers.has(question.id)).length : 0,
      leaderboard, me:member.role==='player' ? {score:mine.score, correct:mine.correct, answer:answer ? {choice:answer.choice, ...(reveal ? answer : {})} : null} : null};
    if (question && ['question','review','finished'].includes(room.phase)) {
      state.question = {id:question.id, topic:question.topic, prompt:question.prompt, choices:question.choices, durationMs:question.seconds*1000*room.multiplier};
      if (reveal) {
        state.question.answer=question.answer; state.question.explanation=question.explanation;
        state.distribution=question.choices.map((_,i)=>[...room.players.values()].filter(p=>p.answers.get(question.id)?.choice===i).length);
      }
    }
    if (room.phase==='finished') state.review=queueQuiz.map(q=>({id:q.id, topic:q.topic, prompt:q.prompt, choices:q.choices, answer:q.answer, explanation:q.explanation, ...(member.role==='player' ? {mine:member.answers.get(q.id)??null} : {})}));
    return state;
  }
  function send(room, member, res) {
    if (res.writableEnded || res.destroyed) return;
    if (res.writableLength > 256*1024) {res.destroy();return;}
    res.write(`event: state\ndata: ${JSON.stringify(view(room,member))}\n\n`);
  }
  function broadcast(room) {
    room.revision++;
    for (const member of [room.host,...room.players.values()]) for (const res of member.streams) send(room,member,res);
    persist();
  }
  function advance(room) {
    if (room.phase==='countdown' && now()>=room.startsAt) {room.phase='question';broadcast(room);}
    if (room.phase==='question' && now()>=room.deadline) {room.phase='review';broadcast(room);}
  }
  function openQuestion(room) {
    room.index++;room.phase='countdown';room.startsAt=now()+3000;
    room.deadline=room.startsAt+queueQuiz[room.index].seconds*1000*room.multiplier;
  }
  function memberFor(req,room) {
    const token=req.headers.authorization?.match(/^Bearer ([a-f0-9]{48})$/)?.[1];
    if (!token) fail(401,'Sesi tidak valid. Masuk kembali dengan kode ruang.');
    const hash=digest(token);
    const member=hash===room.host.tokenHash ? room.host : [...room.players.values()].find(p=>p.tokenHash===hash);
    if (!member) fail(401,'Sesi tidak valid. Masuk kembali dengan kode ruang.');
    return member;
  }
  async function body(req) {
    if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) fail(415,'Kirim data JSON.');
    let size=0, chunks=[];
    for await (const chunk of req) {size+=chunk.length;if(size>4096)fail(413,'Permintaan terlalu besar.');chunks.push(chunk);}
    try {const value=JSON.parse(Buffer.concat(chunks).toString());if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value;}
    catch {fail(400,'Data JSON tidak valid.');}
  }
  // Only token hashes and the host recovery hash reach disk; raw credentials exist only in client tabs.
  function snapshot() {
    const wall=wallNow(), t=now();
    return {version:1, savedAt:wall, rooms:[...rooms.values()].map(room=>({
      pin:room.pin, phase:room.phase, index:room.index, multiplier:room.multiplier, revision:room.revision,
      expiresIn:room.expiresAt-t, startsIn:room.startsAt===null?null:room.startsAt-t, deadlineIn:room.deadline===null?null:room.deadline-t,
      host:{id:room.host.id, tokenHash:room.host.tokenHash}, recoverHash:room.recoverHash,
      players:[...room.players.values()].map(p=>({id:p.id, name:p.name, tokenHash:p.tokenHash, score:p.score, correct:p.correct, correctMs:p.correctMs, answers:[...p.answers]})),
    }))};
  }
  function persist() {
    if (!dataFile) return;
    clearTimeout(saveTimer);
    // A failed write (for example a volume the container user cannot write) is logged; it must not crash the room server.
    saveTimer=setTimeout(()=>{try{flush();}catch(error){console.error(`Snapshot gagal ditulis: ${error.message}`);}},200);saveTimer.unref();
  }
  function flush() {
    if (!dataFile || closed) return;
    clearTimeout(saveTimer);saveTimer=null;
    mkdirSync(dirname(dataFile),{recursive:true});
    writeFileSync(`${dataFile}.tmp`,JSON.stringify(snapshot()));
    renameSync(`${dataFile}.tmp`,dataFile);
  }
  // Monotonic deadlines are stored as remaining time and re-anchored; time while the process was down counts against the room.
  function restore() {
    if (!dataFile || !existsSync(dataFile)) return;
    const data=JSON.parse(readFileSync(dataFile,'utf8'));
    const elapsed=Math.max(0,wallNow()-data.savedAt), t=now();
    const shift=value=>value===null ? null : t+value-elapsed;
    for (const saved of data.rooms) {
      const expiresAt=shift(saved.expiresIn);
      if (expiresAt<=t) continue;
      const room={pin:saved.pin, recoverHash:saved.recoverHash, phase:saved.phase, index:saved.index, multiplier:saved.multiplier, revision:saved.revision, expiresAt,
        startsAt:shift(saved.startsIn), deadline:shift(saved.deadlineIn),
        host:{id:saved.host.id, role:'host', tokenHash:saved.host.tokenHash, streams:new Set()},
        players:new Map(saved.players.map(p=>[p.id, {id:p.id, role:'player', name:p.name, tokenHash:p.tokenHash, answers:new Map(p.answers), score:p.score, correct:p.correct, correctMs:p.correctMs, streams:new Set()}]))};
      rooms.set(room.pin, room);
    }
  }
  async function handle(req,res) {
    let url;
    try {url=new URL(req.url,'http://localhost');}
    catch {json(res,400,{error:'URL tidak valid.'});return true;}
    if (!url.pathname.startsWith('/api/quiz/')) return false;
    try {
      if (req.method==='GET' && url.pathname==='/api/quiz/health') {json(res,200,{ok:true});return true;}
      const host=req.headers.host, origin=req.headers.origin;
      if (allowedHosts && !allowedHosts.includes(host)) fail(403,'Host tidak diizinkan. Periksa QUIZ_HOSTS.');
      if ((origin && !sameHost(origin,host)) || req.headers['sec-fetch-site']==='cross-site') fail(403,'Gunakan halaman dari server yang sama.');
      const ip=clientIp(req);
      if (req.method==='POST' && url.pathname==='/api/quiz/rooms') {
        limit(`create:${ip}`,20,60*60*1000);
        const key=idemScope('create',req);
        if (key && idem.has(key)) {const replay=idem.get(key);json(res,replay.status,replay.body);return true;}
        const input=await body(req);
        if (![1,2,3].includes(input.multiplier)) fail(400,'Durasi harus 1×, 2×, atau 3×.');
        if (rooms.size>=20) fail(503,'Semua ruang sedang digunakan. Coba lagi nanti.');
        let pin;do {pin=String(randomInt(100000,1000000));}while(rooms.has(pin));
        const token=secret(), recoveryCode=secret();
        const hostMember={id:'host',role:'host',tokenHash:digest(token),streams:new Set()};
        const room={pin,host:hostMember,recoverHash:digest(recoveryCode),players:new Map(),phase:'lobby',index:-1,multiplier:input.multiplier,revision:0,expiresAt:now()+TTL,startsAt:null,deadline:null};
        rooms.set(pin,room);
        const response={pin,token,recoveryCode,role:'host',state:view(room,hostMember)};
        remember(key,201,response);persist();json(res,201,response);return true;
      }
      const match=url.pathname.match(/^\/api\/quiz\/rooms\/(\d{6})\/(join|recover|state|events|command|answer|results)$/);
      if (!match) fail(404,'Endpoint kuis tidak ditemukan.');
      const [,pin,action]=match, room=rooms.get(pin);
      if (!room || now()>=room.expiresAt) fail(404,'Ruang tidak ditemukan atau sudah kedaluwarsa.');
      advance(room);
      if (action==='join' && req.method==='POST') {
        limit(`join:${ip}`,120,60000);
        const key=idemScope(`join:${pin}`,req);
        if (key && idem.has(key)) {const replay=idem.get(key);json(res,replay.status,replay.body);return true;}
        const input=await body(req);
        if(room.phase!=='lobby')fail(409,'Kuis sudah dimulai. Hanya peserta yang sudah terdaftar dapat melanjutkan.');
        const name=typeof input.name==='string'?input.name.normalize('NFKC').trim():'';
        if (name.length<2 || name.length>24 || /[\p{C}\p{Zl}\p{Zp}]/u.test(name)) fail(400,'Nama harus 2–24 karakter tanpa karakter kontrol.');
        if ([...room.players.values()].some(p=>p.name.toLocaleLowerCase('id')===name.toLocaleLowerCase('id'))) fail(409,'Nama sudah dipakai. Tambahkan pembeda.');
        if(room.players.size>=60)fail(409,'Ruang penuh (maksimum 60 peserta).');
        const token=secret();
        const player={id:secret().slice(0,12),role:'player',name,tokenHash:digest(token),answers:new Map(),score:0,correct:0,correctMs:0,streams:new Set()};
        room.players.set(player.id,player);broadcast(room);
        const response={pin,token,role:'player',state:view(room,player)};
        remember(key,201,response);json(res,201,response);return true;
      }
      if (action==='recover' && req.method==='POST') {
        limit(`recover:${ip}`,10,60*60*1000);
        const input=await body(req);
        if (typeof input.code!=='string' || !/^[a-f0-9]{48}$/.test(input.code)) fail(400,'Kode pemulihan tidak valid.');
        if (digest(input.code)!==room.recoverHash) fail(401,'Kode pemulihan tidak cocok.');
        if (room.phase==='closed') fail(409,'Ruang sudah ditutup.');
        const token=secret();
        room.host.tokenHash=digest(token);
        for (const stream of room.host.streams) stream.end();
        room.host.streams.clear();
        broadcast(room);
        json(res,200,{pin,token,role:'host',state:view(room,room.host)});return true;
      }
      const member=memberFor(req,room);
      if (action==='state' && req.method==='GET') {json(res,200,view(room,member));return true;}
      if (action==='events' && req.method==='GET') {
        if(member.streams.size>=2)fail(429,'Sesi ini sudah terbuka di dua koneksi. Tutup tab lainnya.');
        res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
        res.flushHeaders(); member.streams.add(res);broadcast(room);
        res.on('close',()=>{member.streams.delete(res);if(rooms.has(pin))broadcast(room);});
        return true;
      }
      if(action==='results' && req.method==='GET') {
        if(member.role!=='host')fail(403,'Hanya host dapat mengunduh hasil kelas.');
        if(room.phase!=='finished')fail(409,'Hasil tersedia setelah seluruh kuis selesai.');
        const lines=[['Peringkat','Nama','Skor','Benar','Total soal','Waktu jawaban benar (ms)'],...rank(room).map(p=>[p.rank,p.name,p.score,p.correct,queueQuiz.length,p.correctMs])];
        res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="queue-${pin}.csv"`,'Cache-Control':'no-store'});
        res.end('﻿'+lines.map(row=>row.map(csvCell).join(',')).join('\r\n'));return true;
      }
      if(req.method!=='POST')fail(405,'Metode tidak didukung.');
      limit(`member:${pin}:${member.id}`,180,60000);
      const input=await body(req);
      advance(room);
      if(action==='command') {
        if(member.role!=='host')fail(403,'Kontrol ronde hanya untuk host.');
        if(!['start','next','finish','close'].includes(input.command))fail(400,'Perintah tidak dikenal.');
        if(input.revision!==room.revision)fail(409,'Keadaan ruang berubah. Coba lagi setelah tersinkron.');
        if(input.command==='start') {
          if(room.phase!=='lobby' || !room.players.size)fail(409,'Mulai dari lobi dengan minimal satu peserta.');
          openQuestion(room);
        } else if(input.command==='next') {
          if(room.phase!=='review' || room.index>=queueQuiz.length-1)fail(409,'Lanjut hanya tersedia setelah pembahasan sebelum soal terakhir.');
          openQuestion(room);
        } else if(input.command==='finish') {
          if(room.phase!=='review' || room.index!==queueQuiz.length-1)fail(409,'Selesaikan seluruh 20 soal terlebih dahulu.');
          room.phase='finished';
        } else {
          if(room.phase==='closed')fail(409,'Ruang sudah ditutup.');
          room.phase='closed';
        }
      } else if(action==='answer') {
        if(member.role!=='player')fail(403,'Host tidak mengirim jawaban.');
        const question=queueQuiz[room.index];
        if(!Number.isInteger(input.choice)||input.choice<0||input.choice>3)fail(400,'Pilihan jawaban tidak valid.');
        if(!question || input.questionId!==question.id)fail(409,'Soal sudah berganti.');
        const previous=member.answers.get(question.id);
        if(previous) {
          if(previous.choice!==input.choice)fail(409,'Jawaban pertama sudah dikunci.');
          json(res,200,view(room,member));return true;
        }
        const receivedAt=now();
        if(room.phase!=='question' || receivedAt<room.startsAt || receivedAt>=room.deadline)fail(409,'Waktu menjawab belum dimulai atau sudah berakhir.');
        const elapsedMs=Math.max(0,receivedAt-room.startsAt), correct=input.choice===question.answer;
        const points=scoreAnswer(correct,elapsedMs,question.seconds*1000*room.multiplier);
        member.answers.set(question.id,{choice:input.choice,correct,elapsedMs,points});
        member.score+=points;if(correct){member.correct++;member.correctMs+=elapsedMs;}
        if([...room.players.values()].every(p=>p.answers.has(question.id)))room.phase='review';
      } else fail(405,'Metode tidak didukung.');
      broadcast(room);json(res,200,view(room,member));return true;
    } catch(error) {
      if(res.headersSent){res.destroy();return true;}
      json(res,error.status??500,{error:error.status?error.message:'Server gagal memproses kuis.'});return true;
    }
  }
  function tick() {
    for(const [pin,room] of rooms) {
      if(now()>=room.expiresAt) {rooms.delete(pin);for(const member of [room.host,...room.players.values()])for(const res of member.streams)res.end();persist();}
      else advance(room);
    }
    for(const [key,value] of limits)if(now()>=value.until)limits.delete(key);
    for(const [key,value] of idem)if(now()>=value.until)idem.delete(key);
  }
  const timer=setInterval(tick,100);timer.unref();
  const heartbeat=setInterval(()=>{for(const room of rooms.values())for(const member of [room.host,...room.players.values()])for(const res of member.streams)send(room,member,res);},15000);heartbeat.unref();
  restore();
  return {handle,tick,flush,close(){clearInterval(timer);clearInterval(heartbeat);flush();closed=true;for(const room of rooms.values())for(const member of [room.host,...room.players.values()])for(const res of member.streams)res.end();rooms.clear();}};
}
