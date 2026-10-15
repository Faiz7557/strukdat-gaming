import test from 'node:test';
import assert from 'node:assert/strict';
import { transfer } from '../model.js';
import { levels, complete, stars, buildRacks, buildClinic } from '../levels.js';

const events=()=>({popped:[],called:[],served:[],cancelled:[],registered:[]});
const ids=s=>s.values().map(p=>p.id).join(',');

test('Each room has six levels with unique ids, par, hints, and an explain question',()=>{
  for(const room of ['stack','queue']){
    assert.equal(levels[room].length,6);
    assert.equal(new Set(levels[room].map(l=>l.id)).size,6);
    for(const l of levels[room])assert.ok(l.par>0&&l.hints.concept&&l.explain.choices.length===3&&l.explain.choices[l.explain.answer]);
  }
});

test('Stack level 4 (reverse) completes with the 7-move solution',()=>{
  const level=levels.stack[3],racks=buildRacks(level.setup),ctx={racks,events:events()};
  assert.equal(ids(racks[0]),'C,B,A');
  for(const [s,d] of [[0,1],[0,2],[0,2],[1,0],[2,1],[2,0],[1,0]])transfer(racks[s],racks[d]);
  assert.equal(ids(racks[0]),'A,B,C');
  assert.equal(complete(level,ctx),true);
});

test('Stack level 3 needs B popped and Rak A restored',()=>{
  const level=levels.stack[2],racks=buildRacks(level.setup),ctx={racks,events:events()};
  assert.equal(complete(level,ctx),false);
  transfer(racks[0],racks[2]);transfer(racks[0],racks[2]);ctx.events.popped.push(racks[0].pop().id);
  transfer(racks[2],racks[0]);transfer(racks[2],racks[0]);
  assert.equal(complete(level,ctx),true);
});

test('Stack level 5 capacity forces splitting blockers',()=>{
  const level=levels.stack[4],racks=buildRacks(level.setup);
  transfer(racks[0],racks[2]);
  assert.throws(()=>transfer(racks[0],racks[2]),/Kapasitas/);
  assert.equal(ids(racks[0]),'C,B,A','failed transfer leaves the source intact');
});

test('Queue level 5 (priority) checks P04 first, P02 before P03, and P01 cancelled',()=>{
  const level=levels.queue[4],clinic=buildClinic(level.setup),ctx={clinic,events:events()};
  clinic.register({id:'P04',name:'Dina',priority:'kritis'});ctx.events.registered.push({id:'P04',priority:'kritis'});
  ctx.events.called.push(clinic.call().id);ctx.events.served.push(clinic.advance(5).id);
  ctx.events.called.push(clinic.call().id);
  ctx.events.cancelled.push(clinic.cancel('P01').id);
  assert.deepEqual(ctx.events.called,['P04','P02']);
  assert.equal(complete(level,ctx),true);
});

test('Queue level 2 requires an underflow call after emptying',()=>{
  const level=levels.queue[1],clinic=buildClinic(level.setup),ctx={clinic,events:events()};
  for(let i=0;i<2;i++){ctx.events.called.push(clinic.call().id);ctx.events.served.push(clinic.advance(5).id);}
  assert.equal(complete(level,ctx),false);
  ctx.events.called.push(clinic.call()?.id??null);
  assert.equal(complete(level,ctx),true);
});

test('Stars reward par and penalise exact-step hints and wrong predictions',()=>{
  assert.equal(stars({done:false,moves:3,par:5,hintLevel:0,wrongPredictions:0}),0);
  assert.equal(stars({done:true,moves:9,par:5,hintLevel:0,wrongPredictions:0}),1);
  assert.equal(stars({done:true,moves:5,par:5,hintLevel:3,wrongPredictions:0}),2);
  assert.equal(stars({done:true,moves:5,par:5,hintLevel:2,wrongPredictions:1}),2);
  assert.equal(stars({done:true,moves:4,par:5,hintLevel:2,wrongPredictions:0}),3);
});
