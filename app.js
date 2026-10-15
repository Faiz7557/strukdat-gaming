import { Stack, Queue, Clinic, transfer, priorities } from './model.js';
import { lessons } from './execution.js';
import { warmupQuestions } from './challenges.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rackNames = ['Rak A', 'Rak B', 'Bantuan'];
const priorityNames = ['Kritis', 'Darurat', 'Non-darurat'];
// Colour encodes state, never identity: one neutral box hue, amber for goals, triage colours for patient priority.
const boxPalette = ['#8790e7','#5560c5','#2f39a9'], goalPalette = ['#e9b25a','#c98a1e','#9a6410'];
const priorityShades = [['#d27b86','#b24555'],['#d9a04a','#b9730f'],['#7dbccc','#2f8aa0']];
const laneFills = ['#fbe9ec','#fbf1e0','#e2f4f8'], laneStrokes = ['#b24555','#b9730f','#2f8aa0'];
let room = 'stack', racks, clinic, rack = 0, selectedItem = null, selectedPatient = null, selectedQueue = 0;
let queueMode = 'fifo', serial = 7, patientSerial = 6, operationCount = 0, lastObject = null;
let missions = { stack: { active:false }, queue: { active:false } };
let trace = null, traceIndex = 0, traceTimer = null, logs = [];
let drawnRoom = null;
let lastResult = null;
const rackPositions = [[278,335],[470,431],[684,333]];
const completedMissions = new Set();
const drafts = {stack:{},queue:{}};
let capacityDrafts = [{},{},{}];
let motionSpeed = 1, keyboardInput = false, drag = null, suppressClick = false, achievementTimer = null;
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
// Arena motion explains state changes, so keyboard users keep it; only button transitions follow keyboard mode (CSS).
const motionAllowed = () => !document.body.classList.contains('reduced-motion') && !motionPreference.matches;
const phone = matchMedia('(max-width:540px)');
const defaultZoom = () => phone.matches ? 1.4 : 1;
// Scale SVG text so its smallest size (10 user units) renders at ≥12px; capped to limit overlap.
function labelScale(ctmA, minPx = 12, smallest = 10, max = 2.2) { return Math.min(max, Math.max(1, Math.round(minPx / (smallest * ctmA) * 100) / 100)); }
function fitSceneText() {
  const world = $('world'); if (!world?.getScreenCTM) return;
  const k = labelScale(world.getScreenCTM().a);
  // Enlarged labels no longer fit the rack plates; the same counts stay in the HUD and lens.
  $('scene').classList.toggle('compact-labels', k > 1.3);
  document.querySelectorAll('#scene text').forEach(t => { const base = Number(t.getAttribute('font-size')) || 12; t.style.fontSize = `${base * k}px`; });
}
globalThis.addEventListener?.('resize', fitSceneText);
const camera = {zoom:defaultZoom(),focus:false}; camera.focus = camera.zoom > 1;
let feedback = { text:'Pilih rak, lalu coba push atau pop. Amati perubahan top pada linked-list.', error:false };
const edited = {stack:false,queue:false};
let pendingReplacement = null;

function replaceExperiment(description, action) {
  if (!edited[room]) { action(); return; }
  pendingReplacement = action;
  $('replace-description').textContent = description;
  $('replace-confirm').returnValue = '';
  $('replace-confirm').showModal();
}

function item(id, name, weight, category = 'Elektronik') { return { id, name, weight, category }; }
function seedStack(mission = false) {
  capacityDrafts = [{},{},{}];
  racks = [new Stack(), new Stack(), new Stack(6, 30)];
  [item('A','Modul daya',4),item('B','Sensor suhu',3),item('C','Panel kontrol',5),item('D','Kabel jaringan',2)].forEach(p => racks[0].push(p));
  if (!mission) [item('E','Buku panduan',2,'Dokumen'),item('F','Alat ukur',4,'Peralatan')].forEach(p => racks[1].push(p));
  rack = 0; selectedItem = null; serial = 7;
}
function seedQueue(mission = false) {
  clinic = new Clinic(); selectedQueue = queueMode === 'fifo' ? 2 : 1; selectedPatient = null; patientSerial = mission ? 4 : 6;
  const data = mission ? [['P01','Arif','non-darurat'],['P02','Bima','darurat'],['P03','Citra','darurat']] : [['P01','Arif','non-darurat'],['P02','Bima','darurat'],['P03','Citra','darurat'],['P04','Dina','kritis'],['P05','Eka','non-darurat']];
  for (const [id,name,priority] of data) clinic.register({id,name,priority:queueMode==='fifo'?'non-darurat':priority});
}
seedStack(); seedQueue();

function newWarmup(kind,step=0) {
  const structure=kind==='stack'?new Stack():new Queue();
  for(const id of warmupQuestions[kind][step].initial)structure[kind==='stack'?'push':'enqueue'](item(id,`Data ${id}`,1));
  return {structure,step,answered:false,message:'',error:false};
}
const warmups={stack:newWarmup('stack'),queue:newWarmup('queue')};
let warmupOpen=false;

function renderWarmup() {
  const state=warmups[room],stack=room==='stack',values=state.structure.values();
  const question=warmupQuestions[room][state.step],total=warmupQuestions[room].length,done=state.step+Number(state.answered),complete=done===total;
  $('warmup-title').textContent=`Tantangan pemula · ${stack?'Stack':'Queue'}`;
  $('warmup-summary').textContent=`${total} soal singkat: operasi dasar, kondisi kosong, dan urutan data.`;
  $('warmup-progress').textContent=`${done} / ${total} selesai`;
  $('toggle-warmup').textContent=warmupOpen?'Tutup latihan':done===0?'Mulai latihan':complete?'Lihat hasil':'Lanjutkan latihan';
  $('toggle-warmup').setAttribute('aria-expanded',String(warmupOpen));
  $('warmup-body').hidden=!warmupOpen;
  const description=complete?`${stack?'LIFO':'FIFO'}, peek, kondisi kosong, dan perubahan referensi sudah kamu coba. Lanjutkan bereksperimen di arena.`:state.answered?'Amati hasilnya pada diagram. Soal berikutnya memuat skenario latihan sendiri.':question.prompt;
  const diagram=values.map((value,i)=>`<li><span>${i===0?stack?'top':values.length===1?'front / rear':'front':i===values.length-1?stack?'dasar':'rear':'data'}</span><strong>${escape(value.id)}</strong></li>`).join('')||`<li class="warmup-empty"><span>${stack?'top':'front / rear'}</span><strong>None</strong></li>`;
  $('warmup-exercise').innerHTML=`<p class="warmup-steps">${complete?'Latihan selesai':`Soal ${state.step+1} dari ${total}`}</p><div class="warmup-grid"><div><h3>${complete?`${total} soal selesai.`:escape(question.title)+(state.answered?' · selesai':'')}</h3><p>${escape(description)}</p><div id="warmup-choices" class="warmup-choices">${state.answered?'':question.choices.map(([answer,label])=>`<button class="secondary" data-warmup-answer="${escape(answer)}">${escape(label)}</button>`).join('')}</div><div class="warmup-actions">${state.answered&&!complete?'<button class="primary" data-warmup-next="true">Lanjut ke soal berikutnya</button>':''}${complete?'<a class="secondary" href="#simulation">Coba di arena</a>':''}<button class="text-button" data-warmup-reset="true">Ulangi latihan</button></div></div><div class="warmup-preview"><h3>${stack?'Stack latihan':'Queue latihan · FIFO dasar'}</h3><p>${stack?'Dibaca dari top menuju dasar.':'Dibaca dari front menuju rear; tanpa prioritas dan waktu pelayanan.'}</p><ul class="warmup-data" aria-label="${stack?'Urutan dari top ke dasar':'Urutan dari front ke rear'}">${diagram}</ul><p>Jumlah data: <strong>${values.length}</strong></p></div></div>`;
  $('warmup-feedback').textContent=state.message;
  $('warmup-feedback').classList.toggle('error',state.error);
}

function answerWarmup(answer) {
  const state=warmups[room];if(state.answered)return;
  const question=warmupQuestions[room][state.step];
  if(!question.choices.some(([value])=>value===answer))return;
  state.error=answer!==question.answer;
  if(state.error)state.message=`Belum tepat. ${question.hint} Coba lagi.`;
  else{question.run(state.structure);state.message=`Benar. ${question.explanation}`;state.answered=true;}
  renderWarmup();$('warmup-feedback').focus({preventScroll:true});
}

$('toggle-warmup').addEventListener('click',()=>{warmupOpen=!warmupOpen;renderWarmup();});

function clock(time = clinic.time) { return `${String(8 + Math.floor(time/60)).padStart(2,'0')}.${String(time%60).padStart(2,'0')}`; }
function stopTrace() { clearInterval(traceTimer); traceTimer = null; $('trace-play').innerHTML = `${icon('play')}Putar`; }
function setTrace(lines, notes, snapshots = [], skipped = []) {
  stopTrace(); trace = {lines,notes,snapshots,steps:lines.map((_,i)=>i).filter(i=>!skipped.includes(i))}; traceIndex = trace.steps[0]; renderTrace();
}
function traceExecution(entries) {
  stopTrace();
  trace = { lines:[], notes:[], snapshots:[], steps:[], records:[], lineNumbers:[] };
  for (const { execution, context } of entries) {
    const lesson = lessons[execution.operation], offset = trace.lines.length;
    trace.lines.push(...lesson.lines);
    lesson.lines.forEach((_,i)=>trace.lineNumbers.push(i+1));
    execution.frames.forEach((frame,i)=>{
      const index = offset + frame.line;
      trace.steps.push(index); trace.notes[index] = frame.note;
      trace.records[index] = { frame, previous:execution.frames[i-1], lesson, execution, context };
    });
  }
  traceIndex = trace.steps[0]; renderTrace();
  const current = trace;
  if (traceAuto && motionAllowed()) setTimeout(() => { if (trace === current && !traceTimer) playTrace(); }, 560 / motionSpeed);
}
// Map a recorded frame back to arena entities: the structure's entry reference and any freshly created node.
function traceFocusIds(frame) {
  const data = id => frame.nodes.find(n => n.id === id)?.data;
  return [...new Set([frame.refs.top ?? frame.refs.front, frame.refs.new_node].filter(Boolean).map(data).filter(Boolean))];
}
let traceAuto = true;
function renderExecution() {
  const record = trace?.records?.[traceIndex];
  $('foundation-source').textContent = `class Node: PRAKTIKUM 7 Queue.docx › Membuat struktur node. class ${room==='stack'?'Stack: PRAKTIKUM 6 Stack.docx › Membuat struktur stack':'Queue: PRAKTIKUM 7 Queue.docx › Membuat Struktur Queue'}. Baris kosong dihilangkan.`;
  $('foundation-code').textContent = `class Node:\n    def __init__(self, data):\n        self.data = data\n        self.next = None\n\nclass ${room==='stack'?'Stack':'Queue'}:\n    def __init__(self):\n${room==='stack'?'        self.top = None':'        self.front = None\n        self.rear = None'}`;
  $('implementation-details').hidden = !record;
  $('execution-kind').textContent = record ? 'Rekaman model' : trace ? 'Penjelasan algoritma' : 'Pilih operasi';
  $('code-source').textContent = record ? `${record.lesson.document} › Percobaan Praktikum › ${record.lesson.section}. Nomor baris relatif cuplikan; baris kosong dihilangkan.` : trace ? 'Padanan Python untuk penjelasan. Operasi ini belum memiliki rekaman node per instruksi.' : 'Jalankan push, pop, registrasi (enqueue), atau panggil (dequeue) untuk membuka cuplikan praktikum.';
  $('memory-context').textContent = record?.context ?? 'Rekaman operasi';
  $('code-meaning').textContent = record ? record.lesson.meaning : 'Kotak atau pasien = Node.data. Panah next = referensi ke node berikutnya. Satu rak atau jalur antrean = satu objek Stack atau Queue.';
  $('code-extension').textContent = record ? record.lesson.extension : 'Bedah Eksekusi merekam push, pop, enqueue, dan dequeue. Kapasitas, pencarian, pembatalan, dan waktu adalah pengembangan tugas; penjelasannya dibedakan dari rekaman instruksi.';
  if (!record) {
    $('memory-state').innerHTML = '<div class="memory-empty"><span>JALANKAN OPERASI</span><strong>Objek bergerak karena referensi berubah.</strong><p>Coba push satu barang, lalu telusuri barisnya. Amati node baru dibuat, next disambungkan, dan top berpindah. Rekaman akan tetap tersedia saat kamu memilih objek lain.</p></div>';
    document.querySelectorAll('#scene .trace-focus').forEach(el=>el.classList.remove('trace-focus'));
    return;
  }
  const { frame, previous } = record;
  const focus = new Set(traceFocusIds(frame));
  document.querySelectorAll('#scene [data-entity]').forEach(el => el.classList.toggle('trace-focus', focus.has(el.dataset.entity)));
  $('implementation').textContent = record.execution.implementation;
  const target = id => id ? `${id} · ${frame.nodes.find(n=>n.id===id)?.data ?? '?'}` : 'None';
  const refs = Object.entries(frame.refs).map(([name,id])=>{
    const old = previous?.refs[name], changed = previous && old !== id;
    return `<tr class="${changed?'reference-changed':''}"><th scope="row">${escape(name)}</th><td>${escape(target(id))}${changed?`<small>${old === undefined?'baru':`${escape(target(old))} → ${escape(target(id))}`}</small>`:''}</td></tr>`;
  }).join('');
  const reachable = new Set();
  for (let id = frame.refs.top ?? frame.refs.front; id && !reachable.has(id); id = frame.nodes.find(n=>n.id===id)?.next) reachable.add(id);
  const nodes = frame.nodes.map(node=>{
    const old = previous?.nodes.find(n=>n.id===node.id), changed = previous && (!old || old.next!==node.next);
    const pointers = Object.entries(frame.refs).filter(([,id])=>id===node.id).map(([name])=>name).join(' + ');
    return `<li class="memory-node ${changed?'memory-changed':''} ${reachable.has(node.id)?'':'memory-detached'}" data-memory-node="${node.id}" data-memory-data="${escape(node.data)}"><span class="memory-pointers">${escape(pointers||'Tidak dicapai dari top/front')}</span><strong>${escape(node.id)} <span>${escape(node.data)}</span></strong><code>next → ${escape(target(node.next))}</code></li>`;
  }).join('');
  $('memory-state').innerHTML = `<table class="reference-table"><caption>Referensi setelah baris ${frame.line+1}</caption><tbody>${refs}</tbody></table><div class="memory-locals"><span>Variabel lokal</span>${Object.entries(frame.values).map(([name,value])=>`<code>${escape(name)} = ${escape(value)}</code>`).join('')||'<code>Belum ada</code>'}</div><ul class="memory-nodes" aria-label="Node yang teramati dalam operasi">${nodes||'<li class="memory-null">Tidak ada node · None</li>'}</ul>`;
}
function renderTrace() {
  if (!trace) {
    $('code').innerHTML = '<div class="code-empty"># Coba operasi pada meja operator.\n# Setiap perubahan punya cerita.</div>';
    $('trace-position').textContent = 'Belum ada operasi'; $('trace-note').textContent = 'Diagram utama menunjukkan keadaan saat ini.';
  } else {
    $('code').innerHTML = trace.lines.map((line,i)=>`<button class="code-line ${i===traceIndex?'active':''} ${trace.steps.includes(i)?'':'skipped'}" data-trace-line="${i}" ${trace.steps.includes(i)?'':'disabled'} aria-current="${i===traceIndex?'step':'false'}" aria-label="Baris ${trace.lineNumbers?.[i]??i+1}: ${escape(line.trim())}${trace.steps.includes(i)?'':'; cabang tidak dijalankan'}"><span class="line-number">${trace.lineNumbers?.[i]??i+1}</span><span>${escape(line)}</span>${trace.steps.includes(i)?'':'<span class="skip-label">dilewati</span>'}</button>`).join('');
    $('trace-position').textContent = `${trace.steps.indexOf(traceIndex)+1} / ${trace.steps.length}`;
    $('trace-note').innerHTML = `${escape(trace.notes[traceIndex]||'')}<span class="trace-snapshot">${escape(trace.snapshots[traceIndex]||'')}</span>`;
  }
  $('trace-prev').disabled = !trace || traceIndex===trace.steps[0];
  $('trace-next').disabled = !trace || traceIndex===trace.steps.at(-1);
  $('trace-play').disabled = !trace;
  renderExecution();
}
function notify(text, error = false, operation = null) {
  feedback = {text,error};
  if (operation && !['peek()','empty()','cari()','reset()'].includes(operation)) edited[room] = true;
  if (operation) { operationCount++; logs.unshift({time:room==='queue'?clock():String(operationCount).padStart(2,'0'),operation,text}); logs = logs.slice(0,100); }
  renderFeedback(); renderLog();
}
function renderResult() {
  const tray=$('result-tray'); if(!lastResult){tray.hidden=true;return;}
  const none=lastResult.value===null;
  tray.hidden=false;
  tray.innerHTML=`<span class="${none?'result-none':''}"><span>${escape(lastResult.operation)} →</span> <strong>${escape(none?'None':lastResult.value)}</strong></span>`;
  tray.classList.add('fresh');setTimeout(()=>tray.classList.remove('fresh'),600);
}
function renderFeedback() {
  const changed=$('feedback').dataset.text!==feedback.text;$('feedback').dataset.text=feedback.text;
  $('feedback').classList.toggle('error',feedback.error);
  $('feedback').innerHTML = `<span class="feedback-symbol">${feedback.error?'!':'i'}</span><div><p>${escape(feedback.text)}</p>${trace?'<a href="#execution-lab">Telusuri operasi ini di Bedah Eksekusi</a>':''}</div>`;
  if(changed&&motionAllowed())$('feedback').animate([{opacity:.35},{opacity:1}],{duration:150,easing:'cubic-bezier(.16,1,.3,1)'});
}
function renderLog() {
  $('log').innerHTML = logs.length ? logs.map(l=>`<li><time>${escape(l.time)}</time><code>${escape(l.operation)}</code><span>${escape(l.text)}</span></li>`).join('') : '<li class="log-empty">Setiap operasi akan dicatat di sini.</li>';
}

// Isometric blocks are SVG geometry: the same data feeds the scene and linked-list diagram.
function block(x,y,a,b,h,palette, extra = '') {
  const [top,left,right] = palette;
  return `<g ${extra}><polygon points="${x-a},${y-b-h} ${x},${y-h} ${x},${y} ${x-a},${y-b}" fill="${left}"/><polygon points="${x},${y-h} ${x+a},${y-b-h} ${x+a},${y-b} ${x},${y}" fill="${right}"/><polygon class="box-top" points="${x-a},${y-b-h} ${x},${y-2*b-h} ${x+a},${y-b-h} ${x},${y-h}" fill="${top}" stroke="${left}" stroke-width=".7"/></g>`;
}
function svgLabel(x,y,text,cls='svg-label',anchor='middle') { return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}" font-size="${cls==='svg-small'?10:12}">${escape(text)}</text>`; }
function floor() {
  let grid = '';
  for(let i=0;i<=8;i++) {
    const t=i/8;
    grid += `<path d="M${460-355*t},${149+188*t} L${845-355*t},${347+188*t} M${460+385*t},${149+198*t} L${105+385*t},${337+198*t}"/>`;
  }
  return `<defs><filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter><linearGradient id="floor-material" x2="0" y2="1"><stop stop-color="#f9fbff"/><stop offset="1" stop-color="#e2e8f3"/></linearGradient></defs><ellipse cx="476" cy="396" rx="353" ry="80" fill="#384e8a" opacity=".12" filter="url(#shadow)"/><polygon points="105,347 490,545 845,357 460,159" fill="#c0cbdf"/><polygon points="105,337 490,535 845,347 460,149" fill="url(#floor-material)" stroke="#b6c7e0"/><g stroke="#c6d6ed" stroke-width=".8" opacity=".7">${grid}</g><path d="M113 337 490 531 837 347" fill="none" stroke="#2f8aa0" stroke-width="2"/><path d="M129 337 186 366m536 47 81-44" stroke="#15d8b3" stroke-width="3" fill="none"/>`;
}
function renderStackScene() {
  const positions = rackPositions;
  let content = floor();
  content += block(415,202,58,30,20,['#f4f7ff','#dce4f4','#b8c9e4']);
  content += `<path d="m381 171 34-18 34 18-34 18Z" fill="none" stroke="#49a4bb" stroke-width="1.5"/><path d="M415 168v12m-6-9 12 6" stroke="#2f39a9" stroke-width="2"/>`;
  content += svgLabel(415,222,'Penerimaan','svg-small');
  content += `<path d="M365 433l42 22m-28-19 15-8m-1 25 15-8" fill="none" stroke="#91abce" stroke-width="2"/>`;
  racks.forEach((s,ri)=>{
    const [x,y] = positions[ri]; const active = ri===rack;
    content += `<g class="svg-item rack-base" role="button" tabindex="0" data-rack="${ri}" aria-label="Pilih ${rackNames[ri]}, ${s.count} barang, ${s.weight} kilogram">`;
    content += `<ellipse cx="${x}" cy="${y-18}" rx="85" ry="30" fill="#2f39a9" opacity=".12" filter="url(#shadow)"/>`;
    content += `<path class="platform-outline" d="M${x-82},${y-36} ${x},${y-79} ${x+82},${y-36} ${x},${y+8}Z" fill="${active?'#e8ebff':'#ecf0f8'}" stroke="${active?'#49a4bb':'#bdcbe2'}" stroke-width="${active?2:1}"/>`;
    content += block(x,y,69,35,10,['#f8faff','#d1dbed','#b6c5df']);
    content += `<path d="M${x-60} ${y-19}l60 31 60-31" stroke="${active?'#15d8b3':'#91adce'}" stroke-width="3" fill="none"/>`;
    content += `</g>`;
    const values = s.values().slice(0,6).reverse();
    values.forEach((p,i)=>{
      const base = y-10-i*35; const isTarget = p.id==='B'&&missions.stack.active;
      const palette = isTarget?goalPalette:boxPalette;
      const selected = selectedItem===p.id;
      content += `<g class="svg-item ${selected?'selected':''} ${i===values.length-1?'svg-draggable':''}" data-entity="${escape(p.id)}" data-item="${escape(p.id)}" data-rack="${ri}" role="button" tabindex="0" aria-label="${escape(p.id)}, ${escape(p.name)}, ${p.weight} kilogram, ${i===values.length-1?'teratas, dapat diseret ke rak lain':'tertimbun'}">`;
      content += block(x,base,53,27,32,palette);
      content += `<path class="box-edge" d="M${x-53} ${base-59}l53 27 53-27M${x} ${base-32}v32"/><path d="m${x-33} ${base-61} 33-17 33 17-33 17Z" fill="#ffffff26" stroke="#ffffff50" stroke-width=".7"/><path d="M${x+37} ${base-50}v17m5-20v17" stroke="#c6f5fa" stroke-width="2"/><rect x="${x-15}" y="${base-26}" width="30" height="17" rx="3" fill="#ffffffe0"/><text x="${x}" y="${base-13}" text-anchor="middle" fill="#2f39a9" font-size="11" font-weight="500">${escape(p.id.length>4?p.id.slice(0,3)+'…':p.id)}</text>`;
      if(isTarget) content += `<path class="target-ring" d="M${x-57},${base-60} ${x},${base-89} ${x+57},${base-60} ${x},${base-30}Z"/>`;
      content += '</g>';
    });
    if(s.count) {
      const ty=y-10-values.length*35-49;
      content += `<g><rect x="${x-23}" y="${ty-14}" width="46" height="21" rx="5" fill="${active?'#2f39a9':'#ffffff'}" stroke="${active?'#2f39a9':'#c6d4eb'}"/><text x="${x}" y="${ty}" text-anchor="middle" font-size="10" font-family="Consolas" fill="${active?'white':'#2e6fa0'}">top</text><path d="M${x},${ty+8}v10" stroke="#49a4bb"/></g>`;
    } else content += svgLabel(x,y-50,'Kosong','svg-small');
    if(s.count>6)content+=svgLabel(x,y+66,`+${s.count-6} barang di bawah`,'svg-small');
    content += `<g class="svg-item" role="button" tabindex="0" data-rack="${ri}" aria-label="Pilih ${rackNames[ri]}"><rect x="${x-59}" y="${y+14}" width="118" height="40" rx="6" fill="${active?'#2f39a9':'#ffffff'}" stroke="${active?'#2f39a9':'#d0d9eb'}"/><text x="${x}" y="${y+31}" text-anchor="middle" font-size="12" font-weight="500" fill="${active?'white':'#344e77'}">${rackNames[ri]}</text><text x="${x}" y="${y+45}" text-anchor="middle" class="rack-meta" font-size="10" fill="${active?'#d7e3ff':'#596e8f'}">${s.count} / ${s.maxItems} barang · ${s.weight} kg</text></g>`;
  });
  $('scene').innerHTML = `<title id="scene-title">Gudang isometrik. Pilih rak atau barang. Seret barang teratas untuk memindahkannya.</title><g id="world">${content}</g>`;
}
function person(x,y,patient,rank,selected=false,active=false) {
  const shades=priorityShades[rank];
  const label = `${patient.id}, ${patient.name}, ${priorityNames[rank]}`;
  return `<g class="svg-item ${selected?'selected':''}" data-priority="${priorities[rank]}" data-entity="${escape(patient.id)}" ${active?'':`role="button" tabindex="0" data-patient="${escape(patient.id)}" data-queue="${rank}" aria-label="${escape(label)}"`}><ellipse class="patient-halo" cx="${x}" cy="${y}" rx="20" ry="10" fill="${selected?'#a0efdd':'#b7c8e5'}" opacity=".7"/><path d="M${x-6} ${y-20}v18m12-18v18" stroke="#3b4c71" stroke-width="7" stroke-linecap="round"/><path d="M${x-12} ${y-46}q12-8 24 0v26q-12 6-24 0Z" fill="${shades[0]}"/><path d="M${x+4} ${y-49}l8 3v26l-8 3Z" fill="${shades[1]}"/><path d="M${x-14} ${y-42}l-3 21m31-21 3 21" stroke="${shades[1]}" stroke-width="7" stroke-linecap="round"/><path d="M${x-7} ${y-42}h5v5h-5Z" fill="#f1f8ff"/><circle cx="${x}" cy="${y-60}" r="11" fill="#e4bea0"/>${rank===0?`<path d="M${x-4} ${y-80}h8m-4-4v8" stroke="#b24555" stroke-width="2.5" stroke-linecap="round"/>`:rank===1?`<path d="M${x} ${y-84}l4 7h-8Z" fill="#b9730f"/>`:''}<path d="M${x-10} ${y-62}q-1-14 10-13q12 0 11 14q-11-5-21-1" fill="#37446a"/><rect x="${x-19}" y="${y+10}" width="38" height="18" rx="4" fill="white" stroke="${laneStrokes[rank]}" stroke-width="1.5"/><text x="${x}" y="${y+23}" text-anchor="middle" font-size="10" fill="#2e6fa0">${escape(patient.id.length>5?patient.id.slice(0,4)+'…':patient.id)}</text></g>`;
}
function renderQueueScene() {
  let content = floor();
  content += block(230,318,65,33,60,['#e7f0ff','#79acd3','#2e6fa0']);
  content += `<path d="M190 250h16m-8-8v16" stroke="#f3fbff" stroke-width="4"/><path d="M230 305l53-27" stroke="#15d8b3" stroke-width="3"/>`;
  content += svgLabel(230,345,'Loket pelayanan');
  if(clinic.active) content += person(200,358,clinic.active.patient,priorities.indexOf(clinic.active.patient.priority),false,true);
  else content += svgLabel(205,374,'Siap menerima pasien','svg-small');
  const lanes = queueMode==='fifo'?[2]:[0,1,2];
  lanes.forEach(rank=>{
    const y0=queueMode==='fifo'?399:327+rank*40; const x0=queueMode==='fifo'?449:382+rank*75;
    content += `<g class="svg-item" role="button" tabindex="0" data-queue="${rank}" aria-label="Lihat antrean ${queueMode==='fifo'?'FIFO':priorityNames[rank]}"><path class="platform-outline" d="M${x0-32},${y0+9}l226-119 36 18-226 119Z" fill="${laneFills[rank]}" stroke="${rank===selectedQueue?'#0e9e82':'#b6c8e5'}" stroke-width="${rank===selectedQueue?'2':'1'}"/><path d="M${x0},${y0+8}l184-98" stroke="${laneStrokes[rank]}" opacity=".45" stroke-width="1.3" stroke-dasharray="5 6"/></g>`;
    const values=clinic.queues[rank].values();
    values.slice(0,5).reverse().forEach((p,rev)=>{const i=Math.min(5,values.length)-1-rev; content+=person(x0+i*40,y0-i*21,p,rank,p.id===selectedPatient);});
    if(!values.length) content+=svgLabel(x0+70,y0-36,'Antrean kosong','svg-small');
    if(values.length>5) content+=svgLabel(x0+208,y0-110,`+${values.length-5} pasien`,'svg-small');
    const label=queueMode==='fifo'?'FIFO':priorityNames[rank];
    content+=`<g class="svg-item" role="button" tabindex="0" data-queue="${rank}" aria-label="Pilih jalur ${label}"><rect x="${x0-60}" y="${y0+34}" width="110" height="24" rx="5" fill="${rank===selectedQueue?'#2f39a9':'white'}" stroke="${rank===selectedQueue?'#2f39a9':'#cfdaed'}"/><text x="${x0-5}" y="${y0+50}" text-anchor="middle" font-size="11" fill="${rank===selectedQueue?'white':'#41567d'}">${label} · ${values.length}</text></g>`;
    if(rank===selectedQueue&&values.length>1){
      content+=svgLabel(x0,y0-87,'front','svg-small');
      const tail=Math.min(values.length,5)-1;
      content+=svgLabel(x0+tail*40,y0-tail*21-88,values.length>5?'rear di luar tampilan':'rear','svg-small');
    }else if(rank===selectedQueue&&values.length)content+=svgLabel(x0,y0-87,'front / rear','svg-small');
  });
  content+=`<g><rect x="620" y="120" width="119" height="48" rx="7" fill="#ffffffee" stroke="#c8d5eb"/>${svgLabel(680,139,'Waktu simulasi','svg-small')}${svgLabel(680,158,clock())}</g>`;
  $('scene').innerHTML=`<title id="scene-title">Antrean pasien isometrik. Pilih pasien atau jalur.</title><g id="world">${content}</g>`;
}

function field(label,id,value,type='text',full=false,extra='') { return `<label class="field ${full?'full':''}">${label}<input id="${id}" value="${escape(value)}" type="${type}" ${extra}></label>`; }
function renderStackControls() {
  const s=racks[rack], chosen=racks.flatMap(r=>r.values()).find(p=>p.id===selectedItem);
  const capacityOpen=$('controls').querySelector('.capacity-settings')?.open;
  $('controls').innerHTML=`<section class="control-section"><div class="control-title">Rak penyimpanan <span>top: ${escape(s.peek()?.id??'None')}</span></div><div class="rack-tabs">${rackNames.map((n,i)=>`<button data-rack="${i}" class="${rack===i?'active':''}">${n}</button>`).join('')}</div><div class="capacity"><span>${s.count} / ${s.maxItems} barang</span><span>${s.weight} / ${s.maxWeight} kg</span></div><div class="capacity-track"><span style="width:100%;transform:scaleX(${Math.max(s.count/s.maxItems,s.weight/s.maxWeight)})"></span></div><details class="capacity-settings" ${capacityOpen?'open':''}><summary>Ubah batas kapasitas</summary><form id="capacity-form"><div class="form-grid">${field('Maks. barang','max-items',s.maxItems,'number',false,'min="1" max="12" required')}${field('Maks. berat (kg)','max-weight',s.maxWeight,'number',false,'min="0.1" max="1000" step="0.1" required')}</div><button class="secondary" style="margin-top:8px">Simpan batas</button></form></details></section>
  <section class="control-section"><div class="control-title">Barang baru</div><form id="push-form"><div class="form-grid">${field('ID barang','item-id',`G${String(serial).padStart(2,'0')}`,'text',false,'maxlength="12" required')}${field('Berat (kg)','item-weight','3','number',false,'min="0.1" max="1000" step="0.1" required')}${field('Nama barang','item-name','Modul cadangan','text',true,'maxlength="50" required')}<label class="field full">Kategori<select id="item-category"><option>Elektronik</option><option>Peralatan</option><option>Dokumen</option><option>Lainnya</option></select></label></div><button class="primary" type="submit">${icon('plus')}Simpan barang <span>/ push</span></button></form><div class="operation-row"><button class="secondary" data-action="pop">${icon('up')}Ambil / pop</button><button class="secondary" data-action="peek">${icon('eye')}Lihat / peek</button></div><button class="text-button" data-action="empty" style="margin-top:9px">Periksa isEmpty()</button></section>
  <section class="control-section"><div class="control-title">Pindahkan barang teratas</div><div class="transfer-row"><select id="destination" aria-label="Rak tujuan">${rackNames.map((n,i)=>i===rack?'':`<option value="${i}" ${i===2?'selected':''}>${n}</option>`).join('')}</select><button class="secondary" data-action="transfer">Pindahkan</button></div>${chosen?`<div class="selection-detail"><strong>${escape(chosen.id)} · ${escape(chosen.name)}</strong><span>${chosen.weight} kg · ${escape(chosen.category)}</span><span>${s.peek()?.id===chosen.id?'Teratas: dapat diambil langsung.':`Tertimbun: ${s.values().findIndex(p=>p.id===chosen.id)} barang penghalang.`}</span></div>`:''}<form id="find-form" class="transfer-row"><input id="search-item" aria-label="Cari barang berdasarkan ID" placeholder="Cari ID barang…" maxlength="12" style="width:100%;min-width:0;border:1px solid var(--line);border-radius:5px;padding:8px;font-size:11px"><button class="secondary">Cari</button></form>${predictionHTML()}</section>`;
}
function predictionState() {
  if (!missions[room].active || missions[room].wasComplete || room==='queue' && clinic.active) return null;
  const values=room==='stack'?racks[rack].values():clinic.queues.flatMap(q=>q.values());
  if (values.length<2) return null;
  return {key:`${room}:${room==='stack'?rack:queueMode}:${values.map(p=>p.id).join(',')}`, expected:values[0].id, options:[values.at(-1).id,values[0].id]};
}
function predictionHTML() {
  const state=predictionState(); if(!state) return '';
  const result=missions[room].prediction, current=result?.key===state.key;
  return `<div class="prediction" tabindex="-1"><strong>${room==='stack'?`Jika pop pada ${rackNames[rack]} sekarang, barang mana yang keluar?`:'Jika dipanggil sekarang, pasien mana yang dilayani berikutnya?'}</strong>${current?`<p class="prediction-result ${result.correct?'':'incorrect'}" role="status">${escape(result.text)}</p>`:''}${current&&result.correct?'':`<div class="operation-row">${state.options.map(id=>`<button class="secondary" data-predict="${escape(id)}">${escape(id)}</button>`).join('')}</div>`}</div>`;
}
function renderQueueControls() {
  const all=clinic.queues.flatMap(q=>q.values()), chosen=all.find(p=>p.id===selectedPatient);
  $('controls').innerHTML=`<section class="control-section"><div class="control-title">Mode antrean <span class="clock-label">${clock()}</span></div><div class="rack-tabs queue-mode"><button data-mode="fifo" class="${queueMode==='fifo'?'active':''}">FIFO dasar</button><button data-mode="priority" class="${queueMode==='priority'?'active':''}">Tiga prioritas</button></div><div class="report"><div><strong>${clinic.served}</strong><span>Dilayani</span></div><div><strong>${clinic.cancelled}</strong><span>Dibatalkan</span></div><div><strong>${clinic.waiting()}</strong><span>Menunggu</span></div></div><div class="service-status">${clinic.active?`Melayani ${escape(clinic.active.patient.id)} · ${escape(clinic.active.patient.name)}<span>Selesai ${clock(clinic.active.endsAt)} · sisa ${Math.max(0,clinic.active.endsAt-clinic.time)} menit</span>`:'Loket tersedia<span>Durasi pelayanan: 5 menit per pasien.</span>'}</div><div class="operation-row"><button class="secondary" data-action="advance">${icon('plus')}1 menit</button><button class="secondary" data-action="next-event">Kejadian berikut</button></div><button class="primary" data-action="call" ${clinic.active?'disabled':''}>${icon('arrow')}Panggil berikutnya / dequeue</button><p class="service-next">Berikutnya dilayani: <strong>${escape(nextServedId())}</strong></p><div class="operation-row"><button class="secondary" data-action="peek">${icon('eye')}peek() ${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}</button><button class="secondary" data-action="empty">isEmpty() ${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}</button></div></section>
  <section class="control-section"><div class="control-title">Registrasi pasien</div><form id="register-form"><div class="form-grid">${field('ID pasien','patient-id',`P${String(patientSerial).padStart(2,'0')}`,'text',false,'maxlength="12" required')}${field('Nama pasien','patient-name',missions.queue.active?'Dina':'Fajar','text',false,'maxlength="50" required')}<label class="field full">Tingkat kegawatan<select id="patient-priority" ${queueMode==='fifo'?'disabled':''}>${priorities.map((p,i)=>`<option value="${p}" ${queueMode==='fifo'?i===2?'selected':'':i===0?'selected':''}>${priorityNames[i]}</option>`).join('')}</select></label></div><button class="primary">${icon('plus')}Daftarkan / enqueue</button></form></section>
  <section class="control-section"><div class="control-title">Pasien dalam antrean <span>${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}</span></div><div class="patient-list">${all.length?all.map(p=>`<button data-patient="${escape(p.id)}" data-queue="${priorities.indexOf(p.priority)}" class="${selectedPatient===p.id?'selected':''}" aria-pressed="${selectedPatient===p.id}"><strong>${escape(p.id)} · ${escape(p.name)}</strong><span>±${clinic.estimate(p.id)} mnt</span></button>`).join(''):'<p class="structure-note">Belum ada pasien. Gunakan registrasi di atas.</p>'}</div>${chosen?`<div class="selection-detail"><strong>${escape(chosen.id)} · ${escape(chosen.name)}</strong><span>Datang ${clock(chosen.arrival)} · ${priorityNames[priorities.indexOf(chosen.priority)]}</span><span>Estimasi tunggu: ${clinic.estimate(chosen.id)} menit.</span><span>Berdasarkan antrean saat ini.</span></div><button class="secondary danger-button" data-action="cancel" style="width:100%;margin-top:8px">Batalkan antrean ${escape(chosen.id)}</button>`:''}${predictionHTML()}</section>`;
}
function renderNodes() {
  const values=room==='stack'?racks[rack].values():clinic.queues[selectedQueue].values();
  const first=room==='stack'?'top':'front';
  $('structure-label').textContent=`Linked-list · ${room==='stack'?rackNames[rack]:queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}`;
  $('nodes').innerHTML=values.length?values.map((p,i)=>`<div data-node="${escape(p.id)}" class="node ${p.id===(room==='stack'?selectedItem:selectedPatient)?'selected':''}">${i===0||room==='queue'&&i===values.length-1?`<span class="pointer-label">${i===0?first:''}${room==='queue'&&i===values.length-1?i===0?' / rear':'rear':''} ↓</span>`:''}<span class="node-data">${escape(p.id)}</span><span class="node-next">next</span></div><span class="arrow">→</span>`).join('')+'<span class="null">None</span>':`<span class="null">${first} → None${room==='queue'?' &nbsp; · &nbsp; rear → None':''}</span>`;
  $('structure-note').textContent=room==='stack'?'Panah next bergerak dari top menuju dasar rak. push/pop: O(1). Cari ID: O(n) karena menelusuri node.':'Panah next bergerak dari front ke rear. enqueue/dequeue: O(1). Batalkan pasien: O(n) karena mencari node.';
}
function renderMission() {
  const m=missions[room]; let complete=false, stages;
  if(room==='stack') {
    const removed=!!m.removed, restored=removed&&racks[0].values().map(p=>p.id).join(',')==='D,C,A'&&racks[1].isEmpty()&&racks[2].isEmpty();
    complete=restored;
    stages=[['Pindahkan penghalang',!!m.cleared],['Ambil B',removed],['Pulihkan urutan',restored]];
    $('mission-title').textContent='Misi: ambil barang B';
    $('mission-description').textContent=complete?'Berhasil! B keluar dan Rak A kembali: top → D → C → A.':m.active?'Target B ada di Rak A. Gunakan Bantuan; kembalikan C lalu D setelah B diambil.':'Pindahkan penghalang ke rak bantuan, ambil B, lalu pulihkan Rak A: top → D → C → A.';
  } else {
    complete=!!(m.critical&&m.servedCritical&&m.fifo&&m.cancelled);
    stages=[['Daftarkan P04 kritis',!!m.critical],['Selesaikan P04',!!m.servedCritical],['Panggil P02',!!m.fifo],['Batalkan P01',!!m.cancelled]];
    $('mission-title').textContent='Misi: prioritas tetap tertib';
    $('mission-description').textContent=complete?'Berhasil! Prioritas didahulukan, FIFO darurat terjaga, dan laporan pembatalan diperbarui.':m.active?'Daftarkan P04 kritis, layani sampai selesai, panggil P02 sebelum P03, lalu batalkan P01.':'Amati pasien kritis mengubah urutan pelayanan sambil menjaga FIFO pada setiap jalur.';
  }
  $('mission-status').textContent=complete?'Selesai ✓':m.active?'Sedang berjalan':'Siap dicoba';
  $('mission-status').classList.toggle('complete',complete);
  $('start-mission').textContent=m.active?'Ulangi misi':'Mulai misi';
  const next=stages.findIndex(([,done])=>!done);
  $('mission-progress').innerHTML=stages.map(([name,done],i)=>`<span class="${done?'done':m.active&&i===next?'current':''}">${done?icon('check'):`${i+1}.`} ${name}</span>`).join('');
  let hint='';
  if(m.active&&!complete){
    if(room==='stack'){
    const location=id=>racks.findIndex(s=>s.values().some(p=>p.id===id));
    const missing=['A','C','D',...(!m.removed?['B']:[])].find(id=>location(id)<0);
    if(missing) hint=`${missing} sudah keluar dari arena. Ulangi misi untuk memulihkan skenario.`;
    else if(!m.removed){
      const source=location('B');
      hint=racks[source].peek()?.id==='B'?`Ambil B dari ${rackNames[source]}.`:`Pindahkan ${racks[source].peek().id} dari ${rackNames[source]} ke ${source===2?'Rak B':'Bantuan'}.`;
    }else{
      const expected=['D','C','A'], target=expected.findLast(id=>location(id)!==0);
      if(target){
        const source=location(target),top=racks[source].peek().id;
        hint=top===target?`Kembalikan ${target} dari ${rackNames[source]} ke Rak A.`:`Pindahkan ${top} dari ${rackNames[source]} ke ${source===2?'Rak B':'Bantuan'} agar ${target} dapat diambil.`;
      }else hint='Urutan Rak A belum tepat. Ulangi misi dan kembalikan C sebelum D.';
    }
    }else hint=!m.critical?'Daftarkan P04 dengan tingkat kritis.':!m.servedCritical?(clinic.active?'Majukan ke kejadian berikut untuk menyelesaikan pelayanan.':'Panggil P04 dari jalur kritis.') :!m.fifo?'Panggil P02; P03 datang setelahnya.':'Pilih P01 lalu batalkan antreannya.';
  }
  $('mission-next').textContent=hint?`Langkah berikut: ${hint}`:'';
  if(complete&&!m.wasComplete){
    completedMissions.add(room);clearTimeout(achievementTimer);
    $('achievement').innerHTML=`${icon('check')}<div><strong>Misi selesai.</strong><small>${room==='stack'?'B diambil. Rak A pulih: top → D → C → A.':'P04 selesai. P02 dipanggil sebelum P03.'}</small></div>`;
    $('achievement').hidden=false;
    if(motionAllowed())$('achievement').animate([{opacity:0,transform:'translate(-50%, -8px) scale(.97)'},{opacity:1,transform:'translate(-50%, 0) scale(1)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
    achievementTimer=setTimeout(()=>{const el=$('achievement');if(!motionAllowed()){el.hidden=true;return;}el.animate([{opacity:1,transform:'translate(-50%,0px)'},{opacity:0,transform:'translate(-50%,-4px)'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'}).finished.then(()=>el.hidden=true).catch(()=>el.hidden=true);},3500);
  }
  m.wasComplete=complete;$('mission-score').textContent=`${completedMissions.size} / 2 misi`;
}
function cleanGhost(element) {
  const clone=element.cloneNode(true);
  for(const attribute of [...clone.attributes])if(attribute.name.startsWith('data-')||['id','tabindex','role','aria-label'].includes(attribute.name))clone.removeAttribute(attribute.name);
  clone.setAttribute('aria-hidden','true');clone.setAttribute('class','drag-ghost');clone.style.pointerEvents='none';return clone;
}
function cameraTransform() {
  let x=470,y=285;
  if(camera.focus){
    if(room==='stack'){[x,y]=rackPositions[rack];y-=Math.min(racks[rack].count,6)*17.5+45;}
    else {
      x=queueMode==='fifo'?449:382+selectedQueue*75;y=queueMode==='fifo'?399:327+selectedQueue*40;
      const index=clinic.queues[selectedQueue].values().findIndex(p=>p.id===selectedPatient);
      x+=index>=0?Math.min(index,4)*40:60;y-=(index>=0?Math.min(index,4)*21:30)+35;
    }
  }
  return `matrix(${camera.zoom},0,0,${camera.zoom},${470-camera.zoom*x},${285-camera.zoom*y})`;
}
function applyCamera(animate=true, previous=null) {
  const world=$('world');if(!world)return false;
  const before=previous??getComputedStyle(world).transform;
  const target=cameraTransform();world.getAnimations().forEach(a=>a.cancel());world.style.transform=target;
  const changed=before!=='none'&&before!==getComputedStyle(world).transform;
  if(animate&&changed&&motionAllowed())world.animate([{transform:before},{transform:target}],{duration:260/motionSpeed,easing:'cubic-bezier(.16,1,.3,1)'});
  $('zoom-level').textContent=`${Math.round(camera.zoom*100)}%`;
  $('zoom-in').disabled=camera.zoom>=1.8;$('zoom-out').disabled=camera.zoom<=1;
  $('focus-object').setAttribute('aria-pressed',String(camera.focus));fitSceneText();return changed;
}
function renderHUD() {
  if(room==='stack'){
    const s=racks[rack],chosen=s.values().find(p=>p.id===selectedItem),top=s.peek();
    const p=chosen??top,blockers=p?s.values().findIndex(v=>v.id===p.id):0;
    $('selection-hud').innerHTML=`<strong><span class="hud-dot"></span>${escape(chosen?`${chosen.id} · ${chosen.name}`:rackNames[rack])}</strong><small>${p?`${chosen?`${p.weight} kg · `:`top → ${escape(top.id)} · `}${blockers?`${blockers} penghalang`:'Teratas dapat diseret'}`:'Kosong · siap menerima barang'}</small>`;
  }else{
    const p=clinic.queues[selectedQueue].values().find(p=>p.id===selectedPatient);
    $('selection-hud').innerHTML=`<strong><span class="hud-dot"></span>${escape(p?`${p.id} · ${p.name}`:queueMode==='fifo'?'Antrean FIFO':priorityNames[selectedQueue])}</strong><small>${p?`Estimasi tunggu ${clinic.estimate(p.id)} menit`: `${clinic.queues[selectedQueue].count} menunggu · FIFO dalam jalur`}</small>`;
  }
  if(room==='stack'){
    const dest=Number($('destination').value);
    $('quick-actions').innerHTML=`<button class="primary" data-quick-push="true">${icon('plus')}Simpan / push</button><button class="secondary" data-quick="pop">${icon('up')}Ambil / pop</button><button class="secondary" data-quick="peek">${icon('eye')}Lihat / peek</button><button class="secondary" data-quick="empty">isEmpty?</button><button class="secondary" data-quick="transfer">${icon('arrow')}${rackNames[dest]}</button>`;
  }else $('quick-actions').innerHTML=`<button class="primary" data-quick-register="true">${icon('plus')}Daftar / enqueue</button><button class="secondary" data-quick="call" ${clinic.active?'disabled':''}>${icon('arrow')}Panggil / dequeue</button><button class="secondary" data-quick="next-event" ${clinic.active?'':'disabled'}>Selesaikan</button><button class="secondary" data-quick="advance">+1 menit</button><button class="secondary" data-quick="peek">${icon('eye')}Lihat / peek</button>`;
}
function animateScene(previous, cameraMoved) {
  if(!motionAllowed()||cameraMoved)return;
  const world=$('world'),scale=world.getScreenCTM().a,visible=new Set();
  document.querySelectorAll('#world [data-entity]').forEach(element=>{
    const id=element.dataset.entity;visible.add(id);const old=previous.get(id),bounds=element.getBoundingClientRect();
    let x=old?(old.bounds.x-bounds.x)/scale:0,y=old?(old.bounds.y-bounds.y)/scale:0;
    if(!old&&id===lastObject){
      const dock=new DOMPoint(room==='stack'?415:750,room==='stack'?145:220).matrixTransform(world.getScreenCTM());
      x=(dock.x-bounds.x-bounds.width/2)/scale;y=(dock.y-bounds.y-bounds.height/2)/scale;
    }
    if(Math.abs(x)>1||Math.abs(y)>1)element.animate([{transform:`translate(${x}px,${y}px)`,opacity:old?1:.3},{transform:`translate(${x*.5}px,${y*.5-28}px)`,opacity:1,offset:.5},{transform:'translate(0,0)',opacity:1}],{duration:560/motionSpeed,easing:'cubic-bezier(.65,0,.25,1)'});
  });
  const tray=$('result-tray'),trayBox=tray.hidden?null:tray.getBoundingClientRect();
  for(const [id,old] of previous)if(!visible.has(id)){
    const clone=old.clone;world.append(clone);
    let dx=0,dy=-65;
    if(trayBox&&lastResult?.value===id){dx=(trayBox.x+trayBox.width/2-old.bounds.x-old.bounds.width/2)/scale;dy=(trayBox.y-old.bounds.y-old.bounds.height/2)/scale;}
    clone.animate([{transform:'translate(0px,0px)',opacity:.95},{transform:`translate(${dx*.5}px,${dy*.5-30}px)`,opacity:.9,offset:.5},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:420/motionSpeed,easing:'cubic-bezier(.65,0,.25,1)'}).finished.then(()=>clone.remove()).catch(()=>clone.remove());
  }
}
function render() {
  const focused=document.activeElement;
  let focusSelector=focused.id?`#${CSS.escape(focused.id)}`:null;
  if(!focusSelector){
    const zone=focused.closest('#scene')?'#scene ':focused.closest('#controls')?'#controls ':'';
    const attribute=['data-item','data-patient','data-action','data-quick','data-rack','data-queue','data-mode','data-room','data-predict'].find(a=>focused.hasAttribute(a));
    if(attribute)focusSelector=`${zone}[${attribute}="${CSS.escape(focused.getAttribute(attribute))}"]`;
    else if(focused.closest('form'))focusSelector=`#${focused.closest('form').id} button`;
  }
  const oldPositions=new Map(),sameRoom=drawnRoom===room,oldTransform=sameRoom&&$('world')?getComputedStyle($('world')).transform:null;
  if(sameRoom&&motionAllowed())document.querySelectorAll('#world [data-entity]').forEach(el=>oldPositions.set(el.dataset.entity,{bounds:el.getBoundingClientRect(),clone:cleanGhost(el)}));
  document.querySelectorAll('[data-room]').forEach(b=>{b.classList.toggle('active',b.dataset.room===room);b.setAttribute('aria-pressed',String(b.dataset.room===room));});
  $('practicum').textContent=room==='stack'?'Praktikum 6':'Praktikum 7';
  $('room-title').textContent=room==='stack'?'Gudang Stack':'Antrean Queue';
  $('room-description').textContent=room==='stack'?'Simpan, pindahkan, dan temukan barang. Pahami apa yang terjadi di balik setiap operasi.':'Atur kedatangan dan pelayanan pasien. Temukan hubungan antara prioritas, FIFO, dan waktu tunggu.';
  $('principle').innerHTML=`${icon(room==='stack'?'up':'arrow')}<div><strong>${room==='stack'?'LIFO':'FIFO'}</strong><span>${room==='stack'?'Terakhir masuk, pertama keluar':queueMode==='fifo'?'Pertama masuk, pertama keluar':'FIFO di setiap tingkat prioritas'}</span></div>`;
  $('room-number').textContent=room==='stack'?'06':'07';
  $('scene-summary').textContent=room==='stack'?'3 rak penyimpanan':queueMode==='fifo'?'1 jalur · 1 loket':'3 jalur · 1 loket';
  $('scene-hint').innerHTML=`${icon(room==='stack'?'hand':'focus')}${room==='stack'?'Seret barang teratas ke rak lain':'Pilih pasien untuk mengamati antrean'}`;
  $('scene-caption').textContent=room==='stack'?'Kotak paling atas adalah pintu masuk dan keluar Stack.':'Pasien baru masuk dari rear. Pelayanan mengambil dari front.';
  document.querySelector('.scene-legend').innerHTML=room==='stack'?'<i class="legend-item"></i> Barang <i class="legend-target"></i> Target misi':'<i style="background:#b24555"></i> Kritis + <i style="background:#b9730f"></i> Darurat ▲ <i style="background:#2f8aa0"></i> Non-darurat';
  if(room==='stack'){renderStackScene();renderStackControls();}else{renderQueueScene();renderQueueControls();}
  const values={...drafts[room],...(room==='stack'?capacityDrafts[rack]:{})};
  for(const [id,value] of Object.entries(values)){
    if(id==='destination'&&(Number(value)===rack||!racks[Number(value)]))continue;
    if($(id))$(id).value=value;
  }
  document.querySelectorAll('#controls [data-rack],#controls [data-mode],#scene [role="button"]').forEach(button=>{
    const selected=button.dataset.mode?button.dataset.mode===queueMode:button.dataset.item?button.dataset.item===selectedItem:button.dataset.patient?button.dataset.patient===selectedPatient:button.dataset.rack!==undefined?Number(button.dataset.rack)===rack:Number(button.dataset.queue)===selectedQueue;
    button.setAttribute('aria-pressed',String(selected));
  });
  renderResult();
  const cameraMoved=applyCamera(sameRoom,oldTransform);fitSceneText();animateScene(oldPositions,cameraMoved);
  if(!motionAllowed()&&lastObject)document.querySelectorAll('#scene [data-entity]').forEach(el=>{if(el.dataset.entity===lastObject)el.classList.add('changed');});
  drawnRoom=room;
  renderNodes();renderMission();renderHUD();renderFeedback();renderTrace();renderLog();renderWarmup();
  if(lastObject&&motionAllowed())document.querySelector(`[data-node="${CSS.escape(lastObject)}"]`)?.animate([{opacity:.4,transform:'translateX(-10px)'},{opacity:1,transform:'translateX(0)'}],{duration:200/motionSpeed,easing:'cubic-bezier(.16,1,.3,1)'});
  lastObject=null;
  if(focusSelector){
    const target=document.querySelector(focusSelector);
    if(target&&!target.disabled)target.focus({preventScroll:true});
    else (focused.hasAttribute('data-predict')?document.querySelector('.prediction')??$('feedback'):$('feedback')).focus();
  }
}

function nextSupply() {
  if(missions.stack.supply?.length)return missions.stack.supply.shift();
  return item(`G${String(serial).padStart(2,'0')}`,'Modul cadangan',1+serial%4);
}
function pushItem(data) {
  if(racks.flatMap(r=>r.values()).some(p=>p.id===data.id))throw new Error('ID barang sudah digunakan. Isi ID yang berbeda.');
  racks[rack].push(data);serial++;
  for(const id of ['item-id','item-name','item-weight','item-category'])delete drafts.stack[id];
  selectedItem=data.id;lastObject=data.id;
  traceExecution([{execution:racks[rack].lastExecution,context:`${rackNames[rack]} · push`}]);
  notify(`push(${data.id}) berhasil. Top ${rackNames[rack]} sekarang ${data.id}; berat ${racks[rack].weight} kg.`,false,`push(${data.id})`);
}
const patientNames=['Fajar','Gita','Hadi','Intan','Joko','Kirana','Lutfi','Maya'];
function registerPatient(input) {
  const priority=queueMode==='fifo'?'non-darurat':input.priority,rank=priorities.indexOf(priority),q=clinic.queues[rank];
  const p=clinic.register({...input,priority});patientSerial++;drafts.queue={};selectedPatient=p.id;selectedQueue=rank;lastObject=p.id;
  traceExecution([{execution:q.lastExecution,context:`Jalur ${priorityNames[rank]} · enqueue`}]);
  if(missions.queue.active&&p.id==='P04'&&priority==='kritis')missions.queue.critical=true;
  notify(`${p.id} masuk dari rear ${queueMode==='fifo'?'antrean FIFO':'jalur '+priorityNames[rank]}. Estimasi tunggu ${clinic.estimate(p.id)} menit berdasarkan antrean saat ini.`,false,`enqueue(${p.id})`);
}
const nextServedId=()=>clinic.queues.find(q=>!q.isEmpty())?.peek()?.id??'None';
function run(operation) {
  try { operation(); render(); } catch(error) { stopTrace(); trace=null; renderTrace(); notify(error.message,true); $('feedback').focus(); }
}
function performTransfer(source,destination,expectedId=null) {
  if(!Number.isInteger(source)||!Number.isInteger(destination)||!racks[source]||!racks[destination])throw new Error('Pilih rak sumber dan tujuan yang valid.');
  if(expectedId&&racks[source].peek()?.id!==expectedId)throw new Error('Barang tersebut sudah bukan top. Pilih barang teratas saat ini.');
  const data=transfer(racks[source],racks[destination]);selectedItem=data.id;lastObject=data.id;
  traceExecution([{execution:racks[destination].lastExecution,context:`Pindah · peek ${rackNames[source]} → ${data.id}, lalu 1/2 push tujuan ${rackNames[destination]}`},{execution:racks[source].lastExecution,context:`Pindah · 2/2 pop sumber ${rackNames[source]}`}]);
  if(missions.stack.active&&racks[0].peek()?.id==='B')missions.stack.cleared=true;
  notify(`${data.id}: ${rackNames[source]} → ${rackNames[destination]}. Urutan: peek sumber → push tujuan → pop sumber. Sumber diubah terakhir agar tetap utuh bila tujuan penuh.`,false,'pindah()');rack=destination;
}
function endDrag(returnHome=false) {
  if(!drag)return;
  const state=drag;drag=null;state.element.style.opacity='';
  document.body.classList.remove('is-dragging');document.querySelectorAll('.drop-zone').forEach(el=>el.classList.remove('drop-zone'));
  if($('scene').hasPointerCapture(state.pointer))$('scene').releasePointerCapture(state.pointer);
  if(returnHome&&state.ghost&&motionAllowed())state.ghost.animate([{transform:state.ghost.style.transform},{transform:'translate(0px,0px)'}],{duration:200,easing:'cubic-bezier(.16,1,.3,1)'}).finished.then(()=>state.ghost.remove()).catch(()=>state.ghost.remove());
  else state.ghost?.remove();
}
$('scene').addEventListener('pointerdown',event=>{
  const element=event.target.closest('[data-item]');
  if(room!=='stack'||!element||!event.isPrimary||event.button!==0||drag)return;
  drag={element,id:element.dataset.item,source:Number(element.dataset.rack),pointer:event.pointerId,x:event.clientX,y:event.clientY,active:false};
});
$('scene').addEventListener('pointermove',event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  if(!drag.active&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
  if(!drag.active){
    if(racks[drag.source].peek()?.id!==drag.id){suppressClick=true;notify('Barang tertimbun. Pindahkan barang di atasnya terlebih dahulu.',true);endDrag();return;}
    drag.active=true;drag.ghost=cleanGhost(drag.element);$('world').append(drag.ghost);
    drag.element.style.opacity='.25';$('scene').setPointerCapture(event.pointerId);document.body.classList.add('is-dragging');
  }
  event.preventDefault();
  const inverse=$('world').getScreenCTM().inverse();
  const from=new DOMPoint(drag.x,drag.y).matrixTransform(inverse),to=new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse);
  drag.ghost.style.transform=`translate(${to.x-from.x}px,${to.y-from.y-12}px)`;
  const hovered=document.elementFromPoint(event.clientX,event.clientY)?.closest('#scene [data-rack]');
  drag.destination=hovered?Number(hovered.dataset.rack):null;
  document.querySelectorAll('.drop-zone').forEach(el=>el.classList.remove('drop-zone'));
  if(drag.destination!==null&&drag.destination!==drag.source)$('scene').querySelector(`.rack-base[data-rack="${drag.destination}"]`)?.classList.add('drop-zone');
});
$('scene').addEventListener('pointerup',event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  const {active,source,destination,id}=drag;endDrag(destination===null||destination===source);
  if(!active)return;
  suppressClick=true;setTimeout(()=>suppressClick=false,0);
  run(()=>{if(destination===null)throw new Error('Letakkan barang pada rak tujuan. Isi rak belum berubah.');performTransfer(source,destination,id);});
});
$('scene').addEventListener('pointercancel',endDrag);
// Touch transfers its implicit capture from a face to the arena; only losing arena capture ends the drag.
$('scene').addEventListener('lostpointercapture',event=>{if(event.target===$('scene')&&event.pointerId===drag?.pointer)endDrag();});
document.addEventListener('keydown',event=>{keyboardInput=true;document.body.classList.add('keyboard-input');if(event.key==='Escape')endDrag();},true);
document.addEventListener('pointerdown',()=>{keyboardInput=false;document.body.classList.remove('keyboard-input');},true);
document.addEventListener('pointerup',()=>{if(suppressClick)setTimeout(()=>suppressClick=false,0);},true);
document.addEventListener('input',event=>{
  if(event.target.closest('#push-form,#register-form,#find-form,#capacity-form')){
    const draft=event.target.closest('#capacity-form')?capacityDrafts[rack]:drafts[room];
    draft[event.target.id]=event.target.value;edited[room]=true;
  }
});
document.addEventListener('change',event=>{if(event.target.closest('#push-form,#register-form')||event.target.id==='destination'){drafts[room][event.target.id]=event.target.value;edited[room]=true;}});
document.addEventListener('change',event=>{if(event.target.id==='destination')renderHUD();});
document.addEventListener('click',event=>{
  if(suppressClick){suppressClick=false;event.preventDefault();return;}
  const tap=event.target.closest('[data-quick-push],[data-quick-register]');
  if(tap&&(tap.dataset.quickPush||tap.dataset.quickRegister)){run(()=>tap.dataset.quickPush?pushItem(nextSupply()):registerPatient({id:missions.queue.supply?.shift()??`P${String(patientSerial).padStart(2,'0')}`,name:patientNames[patientSerial%patientNames.length],priority:priorities[selectedQueue]}));return;}
  const quick=event.target.closest('[data-quick]');
  if(quick){document.querySelector(`#controls [data-action="${quick.dataset.quick}"]`)?.click();return;}
  const button=event.target.closest('[data-room],[data-item],[data-patient],[data-rack],[data-queue],[data-action],[data-mode],[data-predict],[data-warmup-answer],[data-warmup-next],[data-warmup-reset]');
  if(!button)return;
  if(button.dataset.warmupAnswer){answerWarmup(button.dataset.warmupAnswer);return;}
  if(button.dataset.warmupNext){
    const state=warmups[room];if(!state.answered||state.step>=warmupQuestions[room].length-1)return;
    warmups[room]=newWarmup(room,state.step+1);renderWarmup();
    document.querySelector('#warmup-choices button')?.focus({preventScroll:true});return;
  }
  if(button.dataset.warmupReset){warmups[room]=newWarmup(room);renderWarmup();document.querySelector('#warmup-choices button')?.focus({preventScroll:true});return;}
  if(button.dataset.room) {
    endDrag();room=button.dataset.room;lastResult=null;camera.zoom=defaultZoom();camera.focus=camera.zoom>1;stopTrace();trace=null;clearTimeout(achievementTimer);$('achievement').hidden=true;feedback={text:room==='stack'?'Pilih rak, lalu coba push atau pop.':'Pilih pasien untuk melihat estimasi tunggu. Panggil pasien saat loket tersedia.',error:false};render();return;
  }
  if(button.dataset.mode) {
    if(queueMode!==button.dataset.mode) replaceExperiment('Mengganti mode akan mengganti seluruh antrean dengan data contoh, mengosongkan laporan, dan menghentikan pelayanan saat ini.',()=>{queueMode=button.dataset.mode;missions.queue={active:false};drafts.queue={};seedQueue();stopTrace();trace=null;edited.queue=false;notify('Mode diubah. Antrean dimuat ulang untuk eksperimen baru.');render();});return;
  }
  if(button.dataset.predict) {
    const state=predictionState();if(!state)return;
    const correct=button.dataset.predict===state.expected;
    missions[room].prediction={key:state.key,correct,text:correct?`Benar. ${state.expected} ${room==='stack'?'berada pada top; pop mengambil node ini.':queueMode==='fifo'?'berada pada front; pasien ini masuk lebih dulu.':'berada pada front jalur berprioritas tertinggi yang terisi.'}`:room==='stack'?'Belum tepat. Ikuti penanda top pada rak yang dipilih, lalu coba lagi.':'Belum tepat. Periksa prioritas jalur dan penanda front, lalu coba lagi.'};render();return;
  }
  if(button.dataset.patient){selectedPatient=button.dataset.patient;selectedQueue=Number(button.dataset.queue);render();return;}
  if(button.dataset.rack!==undefined){rack=Number(button.dataset.rack);selectedItem=button.dataset.item??null;render();return;}
  if(button.dataset.queue!==undefined){selectedQueue=Number(button.dataset.queue);selectedPatient=null;render();return;}
  const action=button.dataset.action;
  run(()=>{
    if(action==='peek'||action==='empty') {
      const structure=room==='stack'?racks[rack]:clinic.queues[selectedQueue];
      const result=action==='peek'?structure.peek()?.id??'None':structure.isEmpty()?'True':'False';
      lastResult={operation:action==='peek'?'peek()':'isEmpty()',value:result==='None'?null:result};
      const pointer=room==='stack'?'top':'front';
      if(action==='peek'){if(room==='stack')selectedItem=structure.peek()?.id??null;else selectedPatient=structure.peek()?.id??null;}
      const lane=room==='stack'?rackNames[rack]:`jalur ${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}`;
      notify(`${action==='peek'?'peek()':'isEmpty()'} ${lane} → ${result}. Isi tetap sama.${room==='queue'&&queueMode!=='fifo'?` Berikutnya dilayani: ${nextServedId()}.`:''}`,false,`${action}()`);
      setTrace(action==='empty'?['def isEmpty(self):',`    return self.${pointer} is None`]:['def peek(self):',`    if self.${pointer} is None:`,`        return None`,`    return self.${pointer}.data`],action==='empty'?['Periksa referensi utama.','Kembalikan hasil tanpa mengubah struktur.']:['Lihat elemen terdepan.','Periksa kondisi kosong.','Dijalankan hanya jika kosong.','Kembalikan data tanpa menghapus node.'],action==='empty'?[`${pointer} → ${structure.peek()?.id??'None'}`,`hasil → ${result}`]:[`${pointer} → ${structure.peek()?.id??'None'}`,`${pointer} → ${structure.peek()?.id??'None'}`,structure.isEmpty()?'hasil → None':'Cabang dilewati',`hasil → ${result}`],action==='peek'?[structure.isEmpty()?3:2]:[]);
    }
    if(action==='pop') {
      const data=racks[rack].pop(); selectedItem=null;
      lastResult={operation:'pop()',value:data?.id??null};
      traceExecution([{execution:racks[rack].lastExecution,context:`${rackNames[rack]} · pop`}]);
      if(data?.id==='B'&&missions.stack.active)missions.stack.removed=true;
      notify(data?`pop() → ${data.id} (${data.name}). Top sekarang ${racks[rack].peek()?.id??'None'}.`:'Underflow: Stack kosong. pop() mengembalikan None.',!data,'pop()');
    }
    if(action==='transfer') {
      performTransfer(rack,Number($('destination').value));
    }
    if(action==='call') {
      const q=clinic.queues.find(q=>!q.isEmpty());
      const p=clinic.call();selectedPatient=null;
      lastResult={operation:'dequeue()',value:p?.id??null};
      if(p)selectedQueue=priorities.indexOf(p.priority);
      if(q)traceExecution([{execution:q.lastExecution,context:`Jalur ${priorityNames[selectedQueue]} · dequeue`}]);
      else setTrace(['if semua_jalur_kosong:', '    return None'], ['Semua Queue kosong; tidak ada jalur untuk dipanggil.', 'Pemanggilan mengembalikan None tanpa menjalankan dequeue pada jalur.']);
      if(missions.queue.active&&p?.id==='P02'&&missions.queue.servedCritical&&clinic.queues[1].peek()?.id==='P03')missions.queue.fifo=true;
      notify(p?`${p.id} (${p.name}) mulai dilayani. ${queueMode==='fifo'?'FIFO memilih pasien terdepan.':priorityNames[selectedQueue]+' adalah jalur tertinggi yang berisi pasien.'} Selesai ${clock(clinic.active.endsAt)}.`:'Underflow: semua jalur kosong. dequeue() mengembalikan None.',!p,'dequeue()');
    }
    if(action==='advance'||action==='next-event') {
      if(action==='next-event'&&!clinic.active)throw new Error('Belum ada pelayanan berlangsung. Panggil pasien berikutnya dahulu.');
      const minutes=action==='advance'?1:clinic.active.endsAt-clinic.time;
      const done=clinic.advance(minutes);
      if(done?.id==='P04'&&missions.queue.active&&done.priority==='kritis')missions.queue.servedCritical=true;
      notify(done?`${clock()}: ${done.id} selesai dilayani. Loket tersedia untuk pasien berikutnya.`:`Waktu maju ${minutes} menit menjadi ${clock()}.`,false,'waktu()');
    }
    if(action==='cancel') {
      const rank=priorities.indexOf(clinic.queues.flatMap(q=>q.values()).find(p=>p.id===selectedPatient)?.priority);
      const values=clinic.queues[rank].values(),index=values.findIndex(p=>p.id===selectedPatient),previous=values[index-1]?.id??'None',next=values[index+1]?.id??'None';
      const p=clinic.cancel(selectedPatient);selectedPatient=null;selectedQueue=rank;
      lastResult={operation:`batalkan(${p.id})`,value:p.id};
      if(missions.queue.active&&p.id==='P01')missions.queue.cancelled=true;
      setTrace(['node = cari_node(id)',index===0?'self.front = node.next':'previous.next = node.next','if self.rear is node:','    self.rear = previous','return node.data'],['Cari pasien pada linked-list, O(n).',index===0?'Node pertama dihapus; perbarui front.':'Lewati node yang dibatalkan; urutan lainnya tetap sama.','Periksa apakah node merupakan rear.',index===values.length-1?'Perbarui rear; None jika antrean kosong.':'Cabang ini dilewati; rear tetap sama.','Kembalikan data pasien yang dibatalkan.'],[`node → ${p.id}`,index===0?`front → ${next}`:`${previous}.next → ${next}`,`rear → ${values.at(-1).id}`,`rear → ${clinic.queues[rank].rear?.data.id??'None'}`,`dibatalkan → ${p.id}`],index===values.length-1?[]:[3]);
      notify(`${p.id} dibatalkan. Urutan pasien lainnya tetap sama; laporan diperbarui.`,false,'batalkan()');
    }
  });
});
// SVG objects expose the same actions to keyboard users as the control buttons.
$('scene').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.addEventListener('submit',event=>{
  if(!['push-form','capacity-form','find-form','register-form'].includes(event.target.id))return;
  event.preventDefault();
  run(()=>{
    if(event.target.id==='push-form') {
      pushItem(item($('item-id').value.trim(),$('item-name').value.trim(),Number($('item-weight').value),$('item-category').value));
    }
    if(event.target.id==='capacity-form') {
      const maxItems=Number($('max-items').value),maxWeight=Number($('max-weight').value),s=racks[rack];
      if(!Number.isInteger(maxItems)||maxItems<1||maxItems>12||!Number.isFinite(maxWeight)||maxWeight<=0||maxWeight>1000)throw new Error('Isi kapasitas 1–12 barang dan berat positif hingga 1000 kg.');
      if(maxItems<s.count||maxWeight<s.weight)throw new Error('Batas baru lebih kecil dari isi rak. Ambil barang terlebih dahulu.');
      s.maxItems=maxItems;s.maxWeight=maxWeight;capacityDrafts[rack]={};notify('Batas kapasitas rak diperbarui.',false,'kapasitas()');
    }
    if(event.target.id==='find-form') {
      const id=$('search-item').value.trim();const ri=racks.findIndex(s=>s.values().some(p=>p.id===id));
      if(ri<0)throw new Error(`Barang ${id||'(ID kosong)'} tidak ditemukan pada rak.`);
      rack=ri;selectedItem=id;camera.focus=true;camera.zoom=Math.max(camera.zoom,1.4);const blockers=racks[rack].values().findIndex(p=>p.id===id);
      notify(`${id} ada di ${rackNames[rack]}. ${blockers?`${blockers} penghalang perlu dipindahkan sebelum target diambil.`:'Barang berada di top dan dapat diambil langsung.'}`,false,'cari()');
    }
    if(event.target.id==='register-form') {
      registerPatient({id:$('patient-id').value.trim(),name:$('patient-name').value.trim(),priority:$('patient-priority').value});
    }
  });
});
$('start-mission').addEventListener('click',()=>replaceExperiment('Memulai atau mengulang misi akan mengganti isi ruang ini dengan skenario misi. Eksperimen saat ini akan hilang.',()=>{
  endDrag();stopTrace();trace=null;lastResult=null;drafts[room]={};clearTimeout(achievementTimer);$('achievement').hidden=true;
  if(room==='stack'){missions.stack={active:true,removed:false,cleared:false};seedStack(true);}else{queueMode='priority';missions.queue={active:true,critical:false,servedCritical:false,fifo:false,cancelled:false};seedQueue(true);}
  notify(room==='stack'?'Misi dimulai. Cari B, pindahkan D lalu C ke Bantuan, kemudian ambil B.':'Misi dimulai. Daftarkan P04 sebagai kritis melalui registrasi.',false,'misi()');render();
}));
$('reset').addEventListener('click',()=>replaceExperiment('Atur ulang akan mengganti isi ruang ini dengan data contoh dan mengakhiri misi yang berjalan.',()=>{endDrag();stopTrace();trace=null;lastResult=null;drafts[room]={};camera.zoom=defaultZoom();camera.focus=camera.zoom>1;clearTimeout(achievementTimer);$('achievement').hidden=true;missions[room]={active:false};if(room==='stack')seedStack();else seedQueue();edited[room]=false;notify('Ruang diatur ulang. Data contoh siap digunakan.',false,'reset()');render();}));
$('replace-confirm').addEventListener('close',()=>{
  const action=pendingReplacement;pendingReplacement=null;
  if($('replace-confirm').returnValue==='replace')action?.();
});
$('clear-log').addEventListener('click',()=>{logs=[];renderLog();});
$('help').addEventListener('click',()=>$('guide').showModal());
$('close-guide').addEventListener('click',()=>$('guide').close());
$('reduce-motion').checked=motionPreference.matches;
motionPreference.addEventListener?.('change',()=>{
  $('reduce-motion').checked=motionPreference.matches||document.body.classList.contains('reduced-motion');
  if(motionPreference.matches)document.getAnimations().forEach(a=>a.cancel());
});
$('reduce-motion').addEventListener('change',event=>{document.body.classList.toggle('reduced-motion',event.target.checked);if(event.target.checked)document.getAnimations().forEach(a=>a.cancel());});
$('zoom-in').addEventListener('click',()=>{camera.zoom=Math.min(1.8,Math.round((camera.zoom+.2)*10)/10);applyCamera();});
$('zoom-out').addEventListener('click',()=>{camera.zoom=Math.max(1,Math.round((camera.zoom-.2)*10)/10);applyCamera();});
$('focus-object').addEventListener('click',()=>{camera.focus=!camera.focus;if(camera.focus)camera.zoom=Math.max(1.4,camera.zoom);applyCamera();});
$('reset-camera').addEventListener('click',()=>{camera.zoom=defaultZoom();camera.focus=camera.zoom>1;applyCamera();});
$('motion-speed').addEventListener('change',()=>{motionSpeed=Number($('motion-speed').value);const playing=!!traceTimer;stopTrace();if(playing)playTrace();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTrace();endDrag();document.getAnimations().forEach(a=>a.cancel());}});
$('trace-prev').addEventListener('click',()=>{stopTrace();if(trace&&trace.steps.indexOf(traceIndex)>0)traceIndex=trace.steps[trace.steps.indexOf(traceIndex)-1];renderTrace();});
$('trace-next').addEventListener('click',()=>{stopTrace();if(trace&&trace.steps.indexOf(traceIndex)<trace.steps.length-1)traceIndex=trace.steps[trace.steps.indexOf(traceIndex)+1];renderTrace();});
function playTrace(){
  if(traceTimer){stopTrace();return;}if(!trace)return;
  if(traceIndex===trace.steps.at(-1))traceIndex=trace.steps[0];renderTrace();$('trace-play').innerHTML=`${icon('pause')}Jeda`;
  traceTimer=setInterval(()=>{const position=trace.steps.indexOf(traceIndex);if(position<trace.steps.length-1){traceIndex=trace.steps[position+1];renderTrace();}else stopTrace();},1100/motionSpeed);
}
$('trace-play').addEventListener('click',playTrace);
$('trace-auto').addEventListener('change',event=>{traceAuto=event.target.checked;if(!traceAuto)stopTrace();});
$('code').addEventListener('click',event=>{
  const line=event.target.closest('[data-trace-line]');
  if(!line||!trace||!trace.steps.includes(Number(line.dataset.traceLine)))return;
  stopTrace();traceIndex=Number(line.dataset.traceLine);renderTrace();
  $('code').querySelector(`[data-trace-line="${traceIndex}"]`)?.focus({preventScroll:true});
});
$('trace-prev').innerHTML=icon('arrow');$('trace-prev').querySelector('svg').style.transform='rotate(180deg)';$('trace-next').innerHTML=icon('arrow');
render();
