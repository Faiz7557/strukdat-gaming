import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLabServer} from '../serve.js';
import {scoreAnswer} from '../quiz-server.js';
import {queueQuiz} from '../quiz-bank.js';
import {Queue,Clinic} from '../model.js';

async function boot(t,options={}) {
  const {server,quiz}=createLabServer(options);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{quiz.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
  return {url,quiz,server};
}
function client(url) {
  async function call(path,{data,token,method,headers}={}) {
    const response=await fetch(url+path,{method:method??(data===undefined?'GET':'POST'),headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`} : {}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})});
    const text=await response.text();
    return {status:response.status,data:response.headers.get('Content-Type')?.includes('application/json')?JSON.parse(text):text,headers:response.headers};
  }
  const create=async(multiplier=1,headers)=>(await call('/api/quiz/rooms',{data:{multiplier},headers})).data;
  const path=(s,action)=>`/api/quiz/rooms/${s.pin}/${action}`;
  const get=async(s)=>(await call(path(s,'state'),{token:s.token})).data;
  const join=async(s,name,headers)=>(await call(path(s,'join'),{data:{name},headers})).data;
  async function command(s,command) {
    for(let attempt=0;attempt<3;attempt++) {
      const state=await get(s),result=await call(path(s,'command'),{token:s.token,data:{command,revision:state.revision}});
      if(result.status!==409 || !result.data.error.includes('Keadaan ruang berubah'))return result;
    }
    assert.fail('Room revision never settled');
  }
  const answer=(s,choice,questionId='q01')=>call(path(s,'answer'),{token:s.token,data:{choice,questionId}});
  return {url,call,create,path,get,join,command,answer};
}
async function setup(t,options={}) {
  let clock=1000000;
  const booted=await boot(t,{now:()=>clock,...options});
  return {...client(booted.url),url:booted.url,set(value){clock=value;booted.quiz.tick();},add(value){clock+=value;booted.quiz.tick();}};
}

test('Quiz scoring: correctness, speed, boundaries and monotonic bonus',()=>{
  assert.equal(scoreAnswer(false,0,10000),0);
  assert.equal(scoreAnswer(true,0,10000),1000);
  assert.equal(scoreAnswer(true,5000,10000),900);
  assert.equal(scoreAnswer(true,10000,10000),800);
  assert.equal(scoreAnswer(true,999999,10000),800);
  let previous=1001;for(let elapsed=0;elapsed<=10000;elapsed+=137){const score=scoreAnswer(true,elapsed,10000);assert.ok(score<=previous&&score>=800);previous=score;}
});

test('Exactly 20 coherent Queue questions; trace answers match existing models',()=>{
  assert.equal(queueQuiz.length,20);assert.equal(new Set(queueQuiz.map(q=>q.id)).size,20);
  for(const q of queueQuiz){assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.ok(q.explanation.length>30);assert.ok(q.seconds>=25&&q.seconds<=45);}
  const q=new Queue();assert.equal(q.dequeue(),null);q.enqueue({id:'A'});assert.equal(q.front,q.rear);q.enqueue({id:'B'});assert.equal(q.dequeue().id,'A');q.enqueue({id:'C'});assert.deepEqual(q.values().map(p=>p.id),['B','C']);assert.equal(q.peek().id,'B');assert.equal(q.dequeue().id,'B');assert.deepEqual(q.values().map(p=>p.id),['C']);q.dequeue();assert.equal(q.front,null);assert.equal(q.rear,null);
  for(const id of ['A','B','C'])q.enqueue({id});q.remove('B');assert.equal(q.front.next,q.rear);q.remove('C');assert.equal(q.rear,q.front);assert.equal(q.rear.next,null);
  const clinic=new Clinic();for(const [id,priority] of [['A','non-darurat'],['B','darurat'],['C','darurat'],['D','kritis']])clinic.register({id,name:id,priority});
  const order=[];while(clinic.waiting()){order.push(clinic.call().id);clinic.advance(5);}assert.deepEqual(order,['D','B','C','A']);
  const fifo=new Clinic();for(const id of ['A','B','C'])fifo.register({id,name:id,priority:'non-darurat'});assert.equal(fifo.estimate('C'),10);fifo.call();fifo.advance(3);assert.equal(fifo.estimate('C'),7);assert.throws(()=>fifo.call(),/berlangsung/);
});

test('Static allowlist serves the integration, keeps answer bank and server private',async t=>{
  const h=await setup(t);
  for(const file of ['/quiz.html','/quiz.css','/quiz-client.js','/app.js'])assert.equal((await h.call(file)).status,200);
  for(const file of ['/quiz-bank.js','/quiz-server.js','/README.md','/../quiz-bank.js'])assert.equal((await h.call(file)).status,404);
  assert.match((await h.call('/')).data,/queue-quiz/);
  assert.equal((await h.call('/quiz-client.js',{method:'HEAD'})).data,'');
});

test('Room validation, duplicate nicknames, role isolation and origin protection',async t=>{
  const h=await setup(t),host=await h.create();
  assert.match(host.pin,/^\d{6}$/);assert.match(host.token,/^[a-f0-9]{48}$/);
  assert.equal((await h.call('/api/quiz/rooms',{data:{multiplier:0}})).status,400);
  assert.equal((await h.call('/api/quiz/rooms',{data:{multiplier:1},headers:{Origin:'https://other.example'}})).status,403);
  assert.equal((await h.call(h.path(host,'state'))).status,401);
  assert.equal((await h.command(host,'start')).status,409);
  for(const name of ['', 'x', 'a'.repeat(25), 'A\nB', 'A‍B'])assert.equal((await h.call(h.path(host,'join'),{data:{name}})).status,400);
  const player=await h.join(host,'Nara');assert.notEqual(player.token,host.token);
  assert.equal((await h.call(h.path(host,'join'),{data:{name:' nArA '}})).status,409);
  assert.equal((await h.command(player,'start')).status,403);
  assert.equal((await h.answer(host,1)).status,403);
  assert.equal((await h.call(h.path(player,'results'),{token:player.token})).status,403);
  assert.equal((await h.call(h.path(host,'results'),{token:host.token})).status,409);
  const data=JSON.stringify(await h.get(host));assert.ok(!data.includes(player.token));assert.ok(!data.includes('explanation'));assert.ok(!data.includes('q20'));
  // A valid token from another room grants nothing here, for any role or endpoint.
  const other=await h.create(),stranger=await h.join(other,'Citra');
  for(const token of [other.token,stranger.token]) {
    assert.equal((await h.call(h.path(host,'state'),{token})).status,401);
    assert.equal((await h.call(h.path(host,'events'),{token})).status,401);
    assert.equal((await h.call(h.path(host,'results'),{token})).status,401);
  }
  assert.equal((await h.call(h.path(host,'command'),{token:other.token,data:{command:'start',revision:0}})).status,401);
  assert.equal((await h.call(h.path(host,'answer'),{token:stranger.token,data:{choice:0,questionId:'q01'}})).status,401);
});

test('State transitions, countdown, hidden key and delayed leaderboard, idempotent locked answer',async t=>{
  const h=await setup(t),host=await h.create(),a=await h.join(host,'Alya'),b=await h.join(host,'Bima');
  const start=await h.command(host,'start');assert.equal(start.data.phase,'countdown');assert.equal(start.data.question,undefined);
  assert.equal((await h.answer(a,1)).status,409);
  assert.equal((await h.call(h.path(host,'join'),{data:{name:'Late'}})).status,409);
  const repeated=await h.call(h.path(host,'command'),{token:host.token,data:{command:'start',revision:start.data.revision-1}});assert.equal(repeated.status,409);
  h.set(start.data.startsAt+1000);
  const active=await h.get(a);assert.equal(active.phase,'question');assert.equal(active.question.answer,undefined);assert.equal(active.question.explanation,undefined);
  const received=await h.answer(a,1);assert.equal(received.status,200);assert.deepEqual(received.data.me.answer,{choice:1});assert.equal(received.data.me.score,0);assert.equal(received.data.me.correct,0);assert.ok(received.data.leaderboard.every(p=>p.score===0));
  assert.equal((await h.answer(a,1)).status,200);assert.equal((await h.answer(a,2)).status,409);
  assert.equal((await h.answer(b,99)).status,400);assert.equal((await h.answer(b,1.5)).status,400);assert.equal((await h.answer(b,1,'q20')).status,409);
  h.add(1000);const review=await h.answer(b,0);assert.equal(review.data.phase,'review');assert.equal(review.data.question.answer,1);assert.equal(review.data.leaderboard[0].correct,1);assert.equal(review.data.leaderboard[0].score,992);
  const replay=await h.answer(a,1);assert.equal(replay.data.me.score,992);assert.equal(replay.data.me.answer.points,992);
  assert.deepEqual(review.data.distribution,[1,1,0,0]);
  assert.equal((await h.command(host,'finish')).status,409);
  assert.equal((await h.command(host,'next')).data.phase,'countdown');
  assert.equal((await h.answer(a,1)).status,409);
});

test('Strict server deadline, absent players, timer multiplier and score tie ranks',async t=>{
  const h=await setup(t),host=await h.create(2),a=await h.join(host,'Alya'),b=await h.join(host,'Bima'),c=await h.join(host,'Citra');
  const countdown=(await h.command(host,'start')).data;assert.equal(countdown.deadline-countdown.startsAt,50000);
  h.set(countdown.startsAt+10000);await h.answer(a,1);await h.answer(b,1);
  assert.equal((await h.get(host)).phase,'question','disconnected roster still counts until deadline');
  h.set(countdown.deadline);assert.equal((await h.answer(c,1)).status,409);
  const final=await h.get(host);assert.equal(final.phase,'review');assert.equal(final.answered,2);assert.deepEqual(final.leaderboard.map(p=>p.rank),[1,1,3]);assert.equal(final.leaderboard[0].score,960);
});

test('60 simultaneous participants complete all 20 questions; own review and safe host CSV',async t=>{
  const h=await setup(t),host=await h.create();
  const players=await Promise.all(Array.from({length:60},(_,i)=>h.join(host,i===0?'=SUM(A1)':'Peserta '+i)));
  assert.equal((await h.call(h.path(host,'join'),{data:{name:'Berlebih'}})).status,409);
  let result;
  for(let i=0;i<20;i++) {
    const next=await h.command(host,i?'next':'start');assert.equal(next.status,200);h.set(next.data.startsAt+1000);
    const responses=await Promise.all(players.map(player=>h.answer(player,queueQuiz[i].answer,queueQuiz[i].id)));
    assert.ok(responses.every(r=>r.status===200));result=await h.get(host);assert.equal(result.phase,'review');assert.equal(result.answered,60);
  }
  assert.ok(result.leaderboard.every(p=>p.rank===1&&p.correct===20));
  assert.equal((await h.command(host,'finish')).data.phase,'finished');
  const personal=await h.get(players[0]);assert.equal(personal.review.length,20);assert.ok(personal.review.every(q=>q.mine.correct));assert.equal(personal.me.correct,20);
  const csv=await h.call(h.path(host,'results'),{token:host.token});assert.equal(csv.status,200);assert.match(csv.data,/"'=SUM\(A1\)"/);assert.equal(csv.data.split('\r\n').length,61);
  assert.equal((await h.command(host,'close')).data.phase,'closed');assert.equal((await h.command(host,'next')).status,409);
});

test('SSE initial snapshots and reconnect use bearer header; lost response does not lose score',async t=>{
  const h=await setup(t),host=await h.create(),a=await h.join(host,'Alya');
  const controller=new AbortController();
  const response=await fetch(h.url+h.path(a,'events'),{headers:{Authorization:`Bearer ${a.token}`},signal:controller.signal});
  assert.equal(response.headers.get('Content-Type'),'text/event-stream; charset=utf-8');
  const reader=response.body.getReader();const first=new TextDecoder().decode((await reader.read()).value);assert.match(first,/event: state/);assert.match(first,/"connected":true/);assert.ok(!first.includes(a.token));controller.abort();
  const countdown=(await h.command(host,'start')).data;h.set(countdown.startsAt+1000);await h.answer(a,1);
  const reconnect=new AbortController(),resumed=await fetch(h.url+h.path(a,'events'),{headers:{Authorization:`Bearer ${a.token}`},signal:reconnect.signal});
  const chunk=new TextDecoder().decode((await resumed.body.getReader().read()).value);assert.match(chunk,/"phase":"review"/);assert.match(chunk,/"points":992/);reconnect.abort();
  assert.equal((await h.answer(a,1)).data.me.correct,1);
});

test('Room expiry and bounded JSON/rate limits return explicit errors',async t=>{
  const h=await setup(t),host=await h.create();
  const oversized=await h.call(h.path(host,'join'),{data:{name:'a'.repeat(5000)}});assert.equal(oversized.status,413);
  const bad=await fetch(h.url+'/api/quiz/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(bad.status,400);
  const wrong=await fetch(h.url+'/api/quiz/rooms',{method:'POST',body:'{}'});assert.equal(wrong.status,415);
  for(let i=0;i<17;i++)await h.create();
  assert.equal((await h.call('/api/quiz/rooms',{data:{multiplier:1}})).status,429);
  h.add(3*60*60*1000);assert.equal((await h.call(h.path(host,'state'),{token:host.token})).status,404);
});

test('Host allowlist rejects unexpected Host headers; health stays open for probes',async t=>{
  const h=await setup(t,{allowedHosts:['quiz.example.edu']});
  const raw=(path,{method='GET',headers={},body}={})=>new Promise((resolve,reject)=>{const req=request(h.url+path,{method,headers},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,text}));});req.on('error',reject);req.end(body);});
  const json={'Content-Type':'application/json'};
  assert.equal((await raw('/api/quiz/health',{headers:{Host:'evil.example'}})).status,200);
  assert.equal((await raw('/api/quiz/rooms',{method:'POST',headers:{...json,Host:'evil.example'},body:'{"multiplier":1}'})).status,403);
  assert.equal((await raw('/api/quiz/rooms',{method:'POST',headers:{...json,Host:'quiz.example.edu',Origin:'https://evil.example'},body:'{"multiplier":1}'})).status,403);
  assert.equal((await raw('/api/quiz/rooms',{method:'POST',headers:{...json,Host:'quiz.example.edu',Origin:'https://quiz.example.edu'},body:'{"multiplier":1}'})).status,201);
});

test('Trusted proxy keys rate limits by X-Forwarded-For only when enabled',async t=>{
  const trusted=await setup(t,{trustProxy:true}),direct=await setup(t,{trustProxy:false});
  const statuses=async(h)=>{const out=[];for(let i=0;i<21;i++)out.push((await h.call('/api/quiz/rooms',{data:{multiplier:1},headers:{'X-Forwarded-For':`203.0.113.${i+1}`}})).status);return out;};
  const proxied=await statuses(trusted),spoofed=await statuses(direct);
  assert.equal(proxied[19],201);assert.equal(proxied[20],503,'distinct client IPs are not limited by the 20-room cap');
  assert.equal(spoofed[19],201);assert.equal(spoofed[20],429,'without a trusted proxy the socket address is the limit key');
});

test('Idempotency-Key makes a retried create or join return the first response',async t=>{
  const h=await setup(t),createKey={'Idempotency-Key':'create-key-0001-abcdef'};
  const first=await h.create(1,createKey),again=await h.create(1,createKey);
  assert.equal(again.pin,first.pin);assert.equal(again.token,first.token);assert.equal(again.recoveryCode,first.recoveryCode);
  assert.notEqual((await h.create(1)).pin,first.pin);
  const joinKey={'Idempotency-Key':'join-key-0001-abcdef'};
  const alya=await h.join(first,'Alya',joinKey),retry=await h.join(first,'Alya',joinKey);
  assert.equal(retry.token,alya.token);assert.equal((await h.get(first)).leaderboard.length,1);
  assert.equal((await h.call(h.path(first,'join'),{data:{name:'Bima'},headers:{'Idempotency-Key':'short'}})).status,400);
});

test('Host recovery code rotates the host token; old token and closed rooms are refused',async t=>{
  const h=await setup(t),host=await h.create(),a=await h.join(host,'Alya');
  assert.match(host.recoveryCode,/^[a-f0-9]{48}$/);
  assert.equal((await h.call(h.path(host,'recover'),{data:{code:'0'.repeat(48)}})).status,401);
  assert.equal((await h.call(h.path(host,'recover'),{data:{code:'nope'}})).status,400);
  const recovered=await h.call(h.path(host,'recover'),{data:{code:host.recoveryCode}});
  assert.equal(recovered.status,200);assert.notEqual(recovered.data.token,host.token);
  assert.equal((await h.call(h.path(host,'state'),{token:host.token})).status,401);
  const newHost={...host,token:recovered.data.token};
  assert.equal((await h.get(newHost)).role,'host');assert.equal((await h.get(a)).role,'player');
  assert.equal((await h.command(newHost,'close')).data.phase,'closed');
  assert.equal((await h.call(h.path(host,'recover'),{data:{code:host.recoveryCode}})).status,409);
});

test('Durable snapshot restores rooms, resumes tokens and keeps answers after restart',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'queue-live-'));const dataFile=join(dir,'rooms.json');t.after(()=>rm(dir,{recursive:true,force:true}));
  let clock=1000000,wall=1700000000000;
  const first=await boot(t,{now:()=>clock,wallNow:()=>wall,dataFile}),c1=client(first.url);
  const host=await c1.create(),a=await c1.join(host,'Alya');
  const start=(await c1.command(host,'start')).data;clock=start.startsAt+1000;first.quiz.tick();
  assert.equal((await c1.answer(a,1)).data.phase,'review');
  const remainingBefore=(await c1.get(host)).expiresAt-clock;first.quiz.close();
  const saved=await readFile(dataFile,'utf8');
  assert.ok(!saved.includes(host.token)&&!saved.includes(a.token)&&!saved.includes(host.recoveryCode),'snapshot stores hashes only');
  // Simulated restart: new monotonic base and three seconds of wall-clock downtime.
  clock=5000;wall+=3000;
  const second=await boot(t,{now:()=>clock,wallNow:()=>wall,dataFile}),c2=client(second.url);
  const resumed=await c2.get(a);assert.equal(resumed.phase,'review');assert.equal(resumed.me.score,992);assert.equal(resumed.me.answer.choice,1);
  const hostAfter=await c2.get(host);assert.equal(hostAfter.role,'host');
  assert.equal(remainingBefore-(hostAfter.expiresAt-clock),3000,'downtime counts against room lifetime');
});

test('Round deadlines use the monotonic process clock, not wall-clock jumps',async t=>{
  const booted=await boot(t),c=client(booted.url);
  const host=await c.create();await c.join(host,'Alya');
  const realNow=Date.now;Date.now=()=>realNow()+60*60*1000;t.after(()=>{Date.now=realNow;});
  const start=await c.command(host,'start');
  assert.equal(start.data.deadline-start.data.startsAt,25000);
  assert.ok(Math.abs(start.data.expiresAt-start.data.serverNow-3*60*60*1000)<5000);
});
