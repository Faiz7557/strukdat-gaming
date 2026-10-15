import test from 'node:test';
import assert from 'node:assert/strict';
import {Stack, Queue, Clinic, transfer} from '../model.js';
import {lessons} from '../execution.js';
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

const nodeAt = (frame, ref) => frame.nodes.find(node=>node.id===frame.refs[ref]);
test('Push records the actual disconnected node, next link, and top assignment as separate states',()=>{
  const s=new Stack();s.push(item('A'));s.push(item('B'));
  const execution=s.lastExecution, [before,created,linked,finished]=execution.frames;
  assert.deepEqual(execution.frames.map(f=>f.line),[0,1,2,3]);
  assert.equal(nodeAt(before,'top').data,'A');assert.equal(nodeAt(created,'new_node').next,null);
  assert.equal(created.refs.top,before.refs.top);assert.equal(linked.refs.top,before.refs.top);
  assert.equal(nodeAt(linked,'new_node').next,before.refs.top);
  assert.equal(finished.refs.top,finished.refs.new_node);
  const saved=JSON.stringify(execution);s.top.next.data.id='changed';s.pop();
  assert.equal(JSON.stringify(execution),saved,'recorded snapshots must not retain live node data');
});

test('Pop records only the taken branch and preserves the returned data after top moves',()=>{
  const s=new Stack();s.push(item('A'));assert.equal(s.pop().id,'A');
  let frames=s.lastExecution.frames;
  assert.deepEqual(frames.map(f=>f.line),[0,1,3,4,5]);
  assert.equal(frames[2].values.data,'A');assert.equal(nodeAt(frames[2],'top').data,'A');
  assert.equal(frames[3].refs.top,null);assert.equal(frames.at(-1).values.hasil,'A');
  assert.equal(s.pop(),null);frames=s.lastExecution.frames;
  assert.deepEqual(frames.map(f=>f.line),[0,1,2]);assert.deepEqual(frames.at(-1).nodes,[]);
});

test('Enqueue and dequeue expose the temporary front/rear states from the document branches',()=>{
  const q=new Queue();q.enqueue(10);
  let frames=q.lastExecution.frames;
  assert.deepEqual(frames.map(f=>f.line),[0,1,2,3,4]);
  assert.notEqual(frames[3].refs.front,null);assert.equal(frames[3].refs.rear,null);
  assert.equal(frames[4].refs.front,frames[4].refs.rear);
  q.enqueue(20);frames=q.lastExecution.frames;
  assert.deepEqual(frames.map(f=>f.line),[0,1,2,5,6,7]);
  assert.equal(nodeAt(frames.at(-2),'rear').next,frames.at(-2).refs.new_node);
  assert.notEqual(frames.at(-2).refs.rear,frames.at(-2).refs.new_node);
  assert.equal(frames.at(-1).refs.rear,frames.at(-1).refs.new_node);
  q.dequeue();assert.deepEqual(q.lastExecution.frames.map(f=>f.line),[0,1,3,4,5,7]);
  q.dequeue();frames=q.lastExecution.frames;
  assert.deepEqual(frames.map(f=>f.line),[0,1,3,4,5,6,7]);
  assert.equal(frames[3].refs.front,null);assert.notEqual(frames[3].refs.rear,null);
  assert.equal(frames[5].refs.rear,null);
  q.dequeue();assert.deepEqual(q.lastExecution.frames.map(f=>f.line),[0,1,2]);
});

test('Recorded final chains equal the real model after mixed operations and a transfer',()=>{
  const verify=structure=>{
    const execution=structure.lastExecution, frame=execution.frames.at(-1), actual=[];
    let id=frame.refs.top??frame.refs.front;
    while(id){const n=frame.nodes.find(n=>n.id===id);assert.ok(n);actual.push(n.data);id=n.next;}
    assert.deepEqual(actual,structure.values().map(data=>String(data.id??data)));
    assert.ok(execution.frames.every(f=>lessons[execution.operation].lines[f.line]));
  };
  const a=new Stack(),b=new Stack(),q=new Queue();
  for(let i=0;i<6;i++){a.push(item(String(i)));q.enqueue(i);verify(a);verify(q);}
  transfer(a,b);verify(a);verify(b);
  for(let i=0;i<7;i++){a.pop();q.dequeue();verify(a);verify(q);}
});
