import test from 'node:test';
import assert from 'node:assert/strict';
import {Stack, Queue, Clinic, transfer} from '../model.js';
const item = (id,weight=2) => ({id,name:`Barang ${id}`,weight});

test('Stack maintains LIFO and safely returns null when empty',()=>{
  const s=new Stack();assert.equal(s.pop(),null);assert.equal(s.peek(),null);
  s.push(item('A'));s.push(item('B'));assert.equal(s.top.next.data.id,'A');
  assert.equal(s.peek().id,'B');assert.equal(s.count,2);
  assert.equal(s.pop().id,'B');assert.equal(s.pop().id,'A');
  assert.equal(s.top,null);assert.equal(s.weight,0);assert.equal(s.count,0);
});
test('Capacity errors preserve both stacks during transfer',()=>{
  const a=new Stack(),b=new Stack(1,2);a.push(item('A'));b.push(item('B'));
  assert.throws(()=>transfer(a,b),/Kapasitas/);assert.equal(a.peek().id,'A');assert.equal(b.peek().id,'B');
  assert.throws(()=>a.push(item('heavy',31)),/Kapasitas/);assert.equal(a.count,1);
  assert.throws(()=>a.push(item('bad',-1)),/positif/);
  assert.throws(()=>transfer(a,a),/berbeda/);
});
test('Auxiliary stack retrieves the target and restores every other item',()=>{
  const source=new Stack(),helper=new Stack();['A','B','C','D'].forEach(id=>source.push(item(id)));
  transfer(source,helper);transfer(source,helper);assert.equal(source.pop().id,'B');
  transfer(helper,source);transfer(helper,source);
  assert.deepEqual(source.values().map(p=>p.id),['D','C','A']);assert.equal(helper.top,null);
  assert.equal(source.count,3);assert.equal(source.weight,6);
});
test('Fractional weights reach the exact capacity without floating-point overflow',()=>{
  const s=new Stack(6,0.3);s.push(item('A',0.1));s.push(item('B',0.2));
  assert.equal(s.weight,0.3);assert.equal(s.pop().id,'B');assert.equal(s.weight,0.1);
});
test('Queue maintains FIFO and resets both pointers after the last removal',()=>{
  const q=new Queue();assert.equal(q.dequeue(),null);
  q.enqueue(item('A'));assert.equal(q.front,q.rear);q.enqueue(item('B'));
  assert.equal(q.front.next,q.rear);assert.equal(q.dequeue().id,'A');assert.equal(q.dequeue().id,'B');
  assert.equal(q.front,null);assert.equal(q.rear,null);assert.equal(q.count,0);
  q.enqueue(item('C'));assert.equal(q.front,q.rear);
});
test('Cancellation handles front, middle, rear, only node, and unknown IDs',()=>{
  const q=new Queue();['A','B','C','D'].forEach(id=>q.enqueue(item(id)));
  assert.equal(q.remove('B').id,'B');assert.deepEqual(q.values().map(p=>p.id),['A','C','D']);
  assert.equal(q.remove('D').id,'D');assert.equal(q.rear.data.id,'C');
  assert.equal(q.remove('A').id,'A');assert.equal(q.front,q.rear);
  assert.equal(q.remove('unknown'),null);assert.equal(q.count,1);
  q.remove('C');assert.equal(q.front,null);assert.equal(q.rear,null);assert.equal(q.count,0);
});
test('Clinic respects priority, FIFO within each rank, and non-preemptive service',()=>{
  const c=new Clinic();
  [['A','non-darurat'],['B','darurat'],['C','darurat']].forEach(([id,priority])=>c.register({id,name:id,priority}));
  assert.equal(c.estimate('A'),10);assert.equal(c.call().id,'B');c.advance(1);
  c.register({id:'D',name:'D',priority:'kritis'});
  assert.equal(c.active.patient.id,'B');assert.equal(c.estimate('D'),4);assert.equal(c.estimate('A'),14);
  assert.throws(()=>c.call(),/berlangsung/);assert.throws(()=>c.cancel('B'),/menunggu/);
  assert.equal(c.advance(4).id,'B');assert.equal(c.call().id,'D');c.advance(5);
  assert.equal(c.call().id,'C');c.advance(5);c.cancel('A');
  assert.equal(c.served,3);assert.equal(c.cancelled,1);assert.equal(c.waiting(),0);assert.equal(c.call(),null);
  assert.equal(c.registered,c.served+c.cancelled+c.waiting()+(c.active?1:0));
});
test('Clinic rejects invalid registration, duplicate waiting IDs, and invalid time',()=>{
  const c=new Clinic();assert.throws(()=>c.register({id:'X',name:' ',priority:'kritis'}),/valid/);
  assert.throws(()=>c.register({id:'X',name:'X',priority:'unknown'}),/valid/);
  c.register({id:'X',name:'X',priority:'kritis'});
  assert.throws(()=>c.register({id:'X',name:'Y',priority:'darurat'}),/digunakan/);
  assert.throws(()=>c.advance(-1),/positif/);assert.equal(c.time,0);
});
