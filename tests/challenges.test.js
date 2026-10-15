import test from 'node:test';
import assert from 'node:assert/strict';
import { Stack, Queue } from '../model.js';
import { warmupQuestions } from '../challenges.js';

const fixtures={
  stack:{
    answers:['add','C','peek','False','True','None','None','C','B','C,B'],
    returned:['C','C','B',false,true,'K',null,'C','C',['C','B']],
    after:[['C','B','A'],['B','A'],['B','A'],['B','A'],[],[],[],['A'],['B','A'],['A']],
  },
  queue:{
    answers:['add','A','peek','False','True','None','None','B','C','A,B'],
    returned:['C','A','B',false,true,'K',null,'B','A',['A','B']],
    after:[['A','B','C'],['B','C'],['B','C'],['A','B'],[],[],[],['C'],['B','C'],['C']],
  },
};
const label=value=>Array.isArray(value)?value.map(label):value&&typeof value==='object'?value.id:value;
const data=id=>({id,name:id,weight:1});

for(const kind of ['stack','queue'])test(`${kind}: all ten questions match real operation results and pointer states`,()=>{
  assert.equal(warmupQuestions[kind].length,10);
  const expected=fixtures[kind];
  for(const [i,question] of warmupQuestions[kind].entries()){
    const structure=kind==='stack'?new Stack():new Queue();
    for(const id of question.initial)structure[kind==='stack'?'push':'enqueue'](data(id));
    assert.equal(question.answer,expected.answers[i],`question ${i+1} answer`);
    assert.equal(new Set(question.choices.map(([value])=>value)).size,question.choices.length);
    assert.equal(question.choices.filter(([value])=>value===question.answer).length,1);
    const result=question.run(structure);
    assert.deepEqual(label(result),expected.returned[i],`question ${i+1} result`);
    assert.deepEqual(structure.values().map(value=>value.id),expected.after[i],`question ${i+1} diagram`);
    assert.equal(structure.count,expected.after[i].length);
    if(!structure.count){
      if(kind==='stack')assert.equal(structure.top,null);
      else {assert.equal(structure.front,null);assert.equal(structure.rear,null);}
    }else if(kind==='queue'){
      assert.equal(structure.rear.next,null);
      if(structure.count===1)assert.equal(structure.front,structure.rear);
    }
  }
  const mixed=kind==='stack'?new Stack():new Queue(),add=kind==='stack'?'push':'enqueue',remove=kind==='stack'?'pop':'dequeue';
  for(const id of ['A','B'])mixed[add](data(id));
  mixed[remove]();mixed[add](data('C'));
  assert.deepEqual(mixed.values().map(value=>value.id),kind==='stack'?[...warmupQuestions[kind][7].initial].reverse():warmupQuestions[kind][7].initial);
});
