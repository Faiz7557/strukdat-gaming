import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Stack, Queue, Clinic, transfer, priorities } from '../model.js';
import { lessons } from '../execution.js';
import { warmupQuestions } from '../challenges.js';

// A small DOM sink tests event wiring and generated markup without a browser or network.
function view({reducedMotion=true}={}) {
  const elements = new Map(), listeners = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      innerHTML:'', textContent:'', value:id==='destination'?'2':'', style:{setProperty(){}}, dataset:{},
      classList:{contains:()=>false,toggle(){},add(){},remove(){}}, setAttribute(){}, getAttribute:()=>null, hasAttribute:()=>false, focus(){}, closest:()=>null,
      showModal(){this.open=true;}, append(){}, remove(){},
      animate:()=>({finished:Promise.resolve(),cancel(){}}),
      getScreenCTM:()=>({a:1,e:0,f:0,inverse(){return this;}}),
      getBoundingClientRect:()=>({x:0,y:0,width:0,height:0,top:0,left:0,right:0,bottom:0}),
      getAnimations:()=>[], querySelector:()=>element('queried-child'), querySelectorAll:()=>[],
      addEventListener:(type,handler)=>listeners.set(`${id}:${type}`,handler),
    });
    return elements.get(id);
  };
  const document = {
    getElementById:element, querySelector:element, querySelectorAll:()=>[], body:element('body'),
    activeElement:element('body'),
    addEventListener:(type,handler)=>listeners.set(`document:${type}`,handler),
  };
  const context = vm.createContext({ document, Stack, Queue, Clinic, transfer, priorities, lessons, warmupQuestions,
    matchMedia:()=>({matches:reducedMotion,addEventListener(){}}),
    DOMPoint:class{constructor(x=0,y=0){this.x=x;this.y=y;}matrixTransform(){return this;}},
    getComputedStyle:()=>({transform:'none'}),
    setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},
  });
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'');
  vm.runInContext(app,context);
  const click = id => listeners.get(`${id}:click`)();
  const action = dataset => listeners.get('document:click')({target:{closest:selector=>selector==='[data-quick]'?null:{dataset}}});
  const decide = value => {element('replace-confirm').returnValue=value;listeners.get('replace-confirm:close')();};
  return {element,context,click,action,listeners,decide};
}

test('Beginner challenges teach LIFO and FIFO with real operations while preserving the arena',()=>{
  for(const kind of ['stack','queue']){
    const {element,context,click,action}=view();
    if(kind==='queue')action({room:'queue'});
    const scene=element('scene').innerHTML,mission=element('mission-status').textContent;
    click('toggle-warmup');assert.equal(element('warmup-body').hidden,false);
    action({warmupNext:'true'});assert.equal(vm.runInContext('warmups[room].step',context),0);
    action({warmupAnswer:'remove'});
    assert.match(element('warmup-feedback').textContent,/Belum tepat/);
    assert.equal(vm.runInContext('warmups[room].structure.count',context),2);
    action({warmupAnswer:'add'});action({warmupAnswer:'add'});
    assert.equal(vm.runInContext('warmups[room].structure.count',context),3,'double activation must not add another C');
    assert.equal(element('warmup-progress').textContent,'1 / 10 selesai');
    action({warmupNext:'true'});
    action({warmupAnswer:kind==='stack'?'A':'C'});
    assert.equal(vm.runInContext('warmups[room].structure.count',context),3);
    action({warmupAnswer:kind==='stack'?'C':'A'});
    assert.match(element('warmup-feedback').textContent,/sekarang B/);
    action({warmupNext:'true'});action({warmupAnswer:'empty'});
    assert.match(element('warmup-feedback').textContent,/Belum tepat/);
    action({warmupAnswer:'peek'});
    assert.equal(element('warmup-progress').textContent,'3 / 10 selesai');
    assert.equal(vm.runInContext('warmups[room].structure.count',context),2);
    for(let step=3;step<10;step++){
      action({warmupNext:'true'});
      const question=warmupQuestions[kind][step];
      const before=vm.runInContext('JSON.stringify(warmups[room].structure.values())',context);
      action({warmupAnswer:'not-an-option'});
      assert.equal(element('warmup-progress').textContent,`${step} / 10 selesai`);
      action({warmupAnswer:question.choices.find(([value])=>value!==question.answer)[0]});
      assert.match(element('warmup-feedback').textContent,/Belum tepat/);
      assert.equal(vm.runInContext('JSON.stringify(warmups[room].structure.values())',context),before);
      action({warmupAnswer:question.answer});
      assert.equal(element('warmup-progress').textContent,`${step+1} / 10 selesai`);
      const after=vm.runInContext('JSON.stringify(warmups[room].structure.values())',context);
      action({warmupAnswer:question.answer});
      assert.equal(vm.runInContext('JSON.stringify(warmups[room].structure.values())',context),after);
    }
    assert.match(element('warmup-exercise').innerHTML,/10 soal selesai/);
    assert.equal(element('scene').innerHTML,scene);assert.equal(element('mission-status').textContent,mission);
    assert.equal(vm.runInContext('edited[room]',context),false);
    click('toggle-warmup');click('toggle-warmup');assert.equal(element('warmup-progress').textContent,'10 / 10 selesai');
    action({room:kind==='stack'?'queue':'stack'});assert.equal(element('warmup-progress').textContent,'0 / 10 selesai');
    action({room:kind});assert.equal(element('warmup-progress').textContent,'10 / 10 selesai');
    action({warmupNext:'true'});assert.equal(vm.runInContext('warmups[room].step',context),9);
    action({warmupReset:'true'});assert.equal(element('warmup-progress').textContent,'0 / 10 selesai');
    assert.equal(vm.runInContext('warmups[room].structure.count',context),2);
  }
});

test('Push form drives recorded code, escaped memory, clickable lines, and replay without arena mutations',()=>{
  const {element,context,click,listeners}=view();
  assert.match(element('memory-state').innerHTML,/JALANKAN OPERASI/);
  for(const [id,value] of Object.entries({'item-id':'<X>','item-name':'Uji','item-weight':'1','item-category':'Elektronik'}))element(id).value=value;
  listeners.get('document:submit')({preventDefault(){},target:{id:'push-form'}});
  assert.equal(element('trace-position').textContent,'1 / 4');
  assert.match(element('code-source').textContent,/PRAKTIKUM 6 Stack.docx/);
  const arena=element('scene').innerHTML;
  click('trace-next');
  assert.equal(element('trace-position').textContent,'2 / 4');
  assert.match(element('memory-state').innerHTML,/data-memory-data="&lt;X&gt;"/);
  assert.match(element('memory-state').innerHTML,/new_node/);
  assert.doesNotMatch(element('memory-state').innerHTML,/<X>/);
  listeners.get('code:click')({target:{closest:()=>({dataset:{traceLine:'3'}})}});
  assert.equal(element('trace-position').textContent,'4 / 4');
  assert.match(element('memory-state').innerHTML,/reference-changed/);
  assert.equal(element('trace-next').disabled,true);
  click('trace-prev');assert.equal(element('trace-position').textContent,'3 / 4');
  assert.equal(element('scene').innerHTML,arena);
  assert.equal(vm.runInContext('racks[0].peek().id',context),'<X>');
  assert.match(element('implementation').textContent,/node.next = this.top/);
});

test('Queue branches, transfer phases, rejected operations, and reset have truthful view states',()=>{
  const {element,context,action,click,decide}=view();
  action({action:'transfer'});
  assert.match(element('memory-context').textContent,/1\/2 push tujuan Bantuan/);
  for(let i=0;i<4;i++)click('trace-next');
  assert.match(element('memory-context').textContent,/2\/2 pop sumber Rak A/);
  vm.runInContext("room='queue';clinic=new Clinic();clinic.register({id:'P',name:'Pasien',priority:'kritis'});render();",context);
  action({action:'call'});
  assert.match(element('code-source').textContent,/PRAKTIKUM 7 Queue.docx/);
  assert.match(element('code').innerHTML,/skipped.*?data-trace-line="2" disabled/);
  for(let i=0;i<6;i++)click('trace-next');
  assert.equal(element('trace-position').textContent,'7 / 7');
  assert.match(element('memory-state').innerHTML,/<th scope="row">front<\/th><td>None/);
  assert.match(element('memory-state').innerHTML,/<th scope="row">rear<\/th><td>None/);
  assert.match(element('code-extension').textContent,/prioritas/);
  action({action:'call'}); // Active service rejects another call; no stale record is presented.
  assert.equal(element('implementation-details').hidden,true);
  assert.equal(element('execution-kind').textContent,'Pilih operasi');
  click('reset');decide('replace');assert.equal(element('trace-position').textContent,'Belum ada operasi');
});

test('Predictions follow current top and next patient; wrong answers allow another attempt',()=>{
  const {element,context,click,action}=view();
  click('start-mission');
  action({predict:'A'});
  assert.match(element('controls').innerHTML,/Belum tepat/);
  assert.match(element('controls').innerHTML,/data-predict="D"/);
  action({predict:'D'});
  assert.match(element('controls').innerHTML,/Benar. D berada pada top/);
  action({action:'pop'});
  assert.doesNotMatch(element('controls').innerHTML,/Benar. D berada pada top/);
  action({predict:'D'});
  assert.match(element('controls').innerHTML,/Belum tepat/);
  action({predict:'C'});
  assert.match(element('controls').innerHTML,/Benar. C berada pada top/);
  vm.runInContext("room='queue';missions.queue={active:true};seedQueue(true);clinic.register({id:'P04',name:'Dina',priority:'kritis'});render();",context);
  action({predict:'P04'});assert.match(element('controls').innerHTML,/Benar. P04 berada pada front/);
  action({action:'call'});assert.doesNotMatch(element('controls').innerHTML,/data-predict=/);
  action({action:'next-event'});
  action({predict:'P04'});assert.match(element('controls').innerHTML,/Belum tepat/);
  action({predict:'P02'});assert.match(element('controls').innerHTML,/Benar. P02 berada pada front/);
});

test('Reset, mode switch, and mission replacement preserve work when cancelled',()=>{
  const {context,element,click,action,decide,listeners}=view();
  let prevented=false;
  listeners.get('document:submit')({target:{id:''},preventDefault(){prevented=true;}});
  assert.equal(prevented,false,'native dialog submission must be allowed to close the dialog');
  action({action:'pop'});
  click('reset');assert.equal(element('replace-confirm').open,true);
  decide('cancel');assert.equal(vm.runInContext('racks[0].peek().id',context),'C');
  click('start-mission');decide('cancel');assert.equal(vm.runInContext('missions.stack.active',context),false);
  click('reset');decide('replace');assert.equal(vm.runInContext('racks[0].peek().id',context),'D');
  action({room:'queue'});action({action:'call'});
  action({mode:'fifo'});decide('cancel');
  assert.equal(vm.runInContext('queueMode',context),'priority');
  assert.equal(vm.runInContext('clinic.active.patient.id',context),'P04');
  action({mode:'fifo'});decide('replace');
  assert.equal(vm.runInContext('queueMode',context),'fifo');
  assert.equal(vm.runInContext('clinic.active',context),null);
});

test('Stack mission hints follow blockers on Rak B and name unrecoverable missing items',()=>{
  const {context,element,click,action}=view();
  click('start-mission');element('destination').value='1';action({action:'transfer'});
  action({rack:'0'});element('destination').value='1';action({action:'transfer'});
  action({rack:'0'});action({action:'pop'});
  assert.match(element('mission-next').textContent,/C dari Rak B ke Rak A/);
  action({rack:'1'});element('destination').value='0';action({action:'transfer'});
  assert.match(element('mission-next').textContent,/D dari Rak B ke Rak A/);
  action({rack:'1'});element('destination').value='0';action({action:'transfer'});
  assert.equal(element('mission-status').textContent,'Selesai ✓');
  assert.equal(vm.runInContext('completedMissions.has("stack")',context),true);
  const other=view();other.click('start-mission');other.action({action:'pop'});
  assert.match(other.element('mission-next').textContent,/D sudah keluar.*Ulangi misi/);
});

test('Keyboard users still see explanatory arena motion; only reduced motion disables it',()=>{
  const moving=view({reducedMotion:false});
  vm.runInContext('keyboardInput=true',moving.context);
  assert.equal(vm.runInContext('motionAllowed()',moving.context),true);
  const reduced=view({reducedMotion:true});
  assert.equal(vm.runInContext('motionAllowed()',reduced.context),false);
});

test('Order text always names its reading direction and complexity notes stay about the operation',()=>{
  const {element,click,action}=view();
  assert.doesNotMatch(element('structure-note').textContent,/Perekaman/);
  assert.match(element('structure-note').textContent,/push\/pop: O\(1\)/);
  click('start-mission');element('destination').value='1';action({action:'transfer'});
  action({rack:'0'});element('destination').value='1';action({action:'transfer'});
  action({rack:'0'});action({action:'pop'});
  action({rack:'1'});element('destination').value='0';action({action:'transfer'});
  action({rack:'1'});element('destination').value='0';action({action:'transfer'});
  assert.match(element('mission-description').textContent,/top → D → C → A/);
  assert.doesNotMatch(element('mission-description').textContent,/A–C–D/);
});

test('Transfer explains peek, push, then pop and why the source changes last',()=>{
  const {element,action}=view();
  action({action:'transfer'});
  assert.match(element('feedback').innerHTML,/peek sumber → push tujuan → pop sumber/);
  assert.match(element('memory-context').textContent,/peek Rak A → D/);
});

test('World labels scale up to stay readable and phones start focused',()=>{
  const {context}=view();
  assert.equal(vm.runInContext('labelScale(1.3)',context),1);
  assert.equal(vm.runInContext('labelScale(0.47)',context),2.2);
  assert.equal(vm.runInContext('labelScale(0.8)',context),1.5);
  assert.equal(vm.runInContext('defaultZoom()',context),1.4,'sink matchMedia matches → phone default');
  assert.equal(vm.runInContext('camera.zoom',view({reducedMotion:false}).context),1,'desktop starts at 100%');
});
