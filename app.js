import { Stack, Clinic, transfer, priorities } from './model.js';

const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rackNames = ['Rak A', 'Rak B', 'Bantuan'];
const priorityNames = ['Kritis', 'Darurat', 'Non-darurat'];
const colors = [ ['#8790e7','#5560c5','#2f39a9'], ['#87bbdf','#5198c8','#2e6fa0'], ['#a0d9e6','#68b8cb','#49a4bb'], ['#91efdc','#43dabc','#10ab90'] ];
let room = 'stack', racks, clinic, rack = 0, selectedItem = null, selectedPatient = null, selectedQueue = 0;
let queueMode = 'priority', serial = 7, patientSerial = 6, operationCount = 0, lastObject = null;
let missions = { stack: { active:false }, queue: { active:false } };
let trace = null, traceIndex = 0, traceTimer = null, logs = [];
let drawnRoom = null;
const rackPositions = [[278,335],[470,431],[684,333]];
const completedMissions = new Set();
const drafts = {stack:{},queue:{}};
const camera = {zoom:1,focus:false};
let motionSpeed = 1, keyboardInput = false, drag = null, suppressClick = false, achievementTimer = null;
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const motionAllowed = () => !keyboardInput && !document.body.classList.contains('reduced-motion') && !matchMedia('(prefers-reduced-motion: reduce)').matches;
let feedback = { text:'Pilih rak, lalu coba push atau pop. Amati perubahan top pada linked-list.', error:false };

function item(id, name, weight, category = 'Elektronik') { return { id, name, weight, category }; }
function seedStack(mission = false) {
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

function clock(time = clinic.time) { return `${String(8 + Math.floor(time/60)).padStart(2,'0')}.${String(time%60).padStart(2,'0')}`; }
function stopTrace() { clearInterval(traceTimer); traceTimer = null; $('trace-play').innerHTML = `${icon('play')}Putar`; }
function setTrace(lines, notes, snapshots = [], skipped = []) {
  stopTrace(); trace = {lines,notes,snapshots,steps:lines.map((_,i)=>i).filter(i=>!skipped.includes(i))}; traceIndex = trace.steps[0]; renderTrace();
}
function tracePush(before, data) {
  setTrace(['def push(self, data):','    new_node = Node(data)','    new_node.next = self.top','    self.top = new_node'],
    ['Push menerima data baru.','Node baru dibuat; next masih None.','Node baru terhubung ke top lama.','Top berpindah ke node baru.'],
    [`top → ${before}`,`top → ${before}\nnew_node → ${data.id}; next → None`,`top → ${before}\nnew_node → ${data.id}; next → ${before}`,`top → ${data.id} → ${before}`]);
}
function tracePop(before, next, empty = false) {
  setTrace(empty ? ['def pop(self):','    if self.top is None:','        return None'] : ['def pop(self):','    if self.top is None:','        return None','    data = self.top.data','    self.top = self.top.next','    return data'],
    empty ? ['Periksa Stack sebelum mengambil data.','Top bernilai None: Stack kosong.','Kembalikan None; Stack tetap kosong.'] : ['Pop mengambil elemen teratas.','Top tersedia; cabang return None dilewati.','Baris ini dilewati karena Stack berisi data.','Simpan data top sebelum mengubah referensi.','Top berpindah ke node berikutnya.','Kembalikan data yang sudah diambil.'],
    empty ? ['top → None','top → None','hasil → None'] : [`top → ${before}`,`top → ${before}`,`top → ${before}`,`data → ${before}; top → ${before}`,`data → ${before}; top → ${next}`,`hasil → ${before}; top → ${next}`],empty?[]:[2]);
}
function traceEnqueue(patient, oldRear, oldFront) {
  const empty = oldRear === 'None';
  setTrace(empty ? ['def enqueue(self, data):','    new_node = Node(data)','    if self.rear is None:','        self.front = new_node','        self.rear = new_node'] : ['def enqueue(self, data):','    new_node = Node(data)','    if self.rear is None:','        # cabang kosong dilewati','    else:','        self.rear.next = new_node','        self.rear = new_node'],
    empty ? ['Tambahkan pasien ke Queue.','Buat node pasien.','Queue kosong; front dan rear harus diisi.','Front menunjuk pasien pertama.','Rear menunjuk node yang sama.'] : ['Tambahkan pasien ke belakang Queue.','Buat node pasien.','Rear tersedia; gunakan cabang else.','Front tetap menunjuk pasien pertama.','Masuk ke cabang Queue berisi data.','Hubungkan rear lama ke node baru.','Pindahkan rear ke node baru.'],
    empty ? ['front → None; rear → None',`node → ${patient.id}; next → None`,'front → None; rear → None',`front → ${patient.id}; rear → None`,`front → ${patient.id}; rear → ${patient.id}`] : [`front → ${oldFront}; rear → ${oldRear}`,`node → ${patient.id}; next → None`,`rear → ${oldRear}`,`front → ${oldFront}`,`rear → ${oldRear}`,`${oldRear}.next → ${patient.id}`,`front → ${oldFront}; rear → ${patient.id}`],empty?[]:[3]);
}
function traceDequeue(patient, next, rear) {
  if (!patient) return setTrace(['def dequeue(self):','    if self.front is None:','        return None'],['Periksa Queue.','Front bernilai None.','Kembalikan None tanpa mengubah Queue.'],['front → None; rear → None','front → None','hasil → None']);
  const emptied = next === 'None';
  setTrace(['def dequeue(self):','    if self.front is None:','        return None','    data = self.front.data','    self.front = self.front.next','    if self.front is None:',...(emptied?['        self.rear = None']:['        # Queue masih berisi data']),'    return data'],
    ['Ambil pasien dari depan jalur terpilih.','Front tersedia.','Cabang ini dilewati.','Simpan data pasien.','Pindahkan front ke node berikutnya.',emptied?'Queue sekarang kosong.':'Queue masih berisi data.',emptied?'Kosongkan rear juga.':'Rear tetap menunjuk pasien terakhir.','Kembalikan data pasien.'],
    [`front → ${patient.id}; rear → ${rear}`,`front → ${patient.id}`,`front → ${patient.id}`,`data → ${patient.id}`,`front → ${next}; rear → ${rear}`,`front → ${next}`,`front → ${next}; rear → ${emptied?'None':rear}`,`hasil → ${patient.id}`],emptied?[2]:[2,6]);
}
function renderTrace() {
  if (!trace) {
    $('code').innerHTML = '<div class="code-empty"># Coba operasi pada meja operator.\n# Setiap perubahan punya cerita.</div>';
    $('trace-position').textContent = 'Belum ada operasi'; $('trace-note').textContent = 'Diagram utama menunjukkan keadaan saat ini.';
  } else {
    $('code').innerHTML = trace.lines.map((line,i)=>`<div class="code-line ${i===traceIndex?'active':''}"><span class="line-number">${i+1}</span>${escape(line)}</div>`).join('');
    $('trace-position').textContent = `${trace.steps.indexOf(traceIndex)+1} / ${trace.steps.length}`;
    $('trace-note').innerHTML = `${escape(trace.notes[traceIndex]||'')}<span class="trace-snapshot">${escape(trace.snapshots[traceIndex]||'')}</span>`;
  }
  $('trace-prev').disabled = !trace || traceIndex===trace.steps[0];
  $('trace-next').disabled = !trace || traceIndex===trace.steps.at(-1);
  $('trace-play').disabled = !trace;
}
function notify(text, error = false, operation = null) {
  feedback = {text,error};
  if (operation) { operationCount++; logs.unshift({time:room==='queue'?clock():String(operationCount).padStart(2,'0'),operation,text}); logs = logs.slice(0,100); }
  renderFeedback(); renderLog();
}
function renderFeedback() {
  $('feedback').classList.toggle('error',feedback.error);
  $('feedback').innerHTML = `<span class="feedback-symbol">${feedback.error?'!':'i'}</span><p>${escape(feedback.text)}</p>`;
}
function renderLog() {
  $('log').innerHTML = logs.length ? logs.map(l=>`<li><time>${escape(l.time)}</time><code>${escape(l.operation)}</code><span>${escape(l.text)}</span></li>`).join('') : '<li class="log-empty">Setiap operasi akan dicatat di sini.</li>';
}

// Isometric blocks are SVG geometry: the same data feeds the scene and linked-list diagram.
function block(x,y,a,b,h,palette, extra = '') {
  const [top,left,right] = palette;
  return `<g ${extra}><polygon points="${x-a},${y-b-h} ${x},${y-h} ${x},${y} ${x-a},${y-b}" fill="${left}"/><polygon points="${x},${y-h} ${x+a},${y-b-h} ${x+a},${y-b} ${x},${y}" fill="${right}"/><polygon class="box-top" points="${x-a},${y-b-h} ${x},${y-2*b-h} ${x+a},${y-b-h} ${x},${y-h}" fill="${top}" stroke="${left}" stroke-width=".7"/></g>`;
}
function svgLabel(x,y,text,cls='svg-label',anchor='middle') { return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${escape(text)}</text>`; }
function floor() {
  let grid = '';
  for(let i=0;i<=8;i++) {
    const t=i/8;
    grid += `<path d="M${460-355*t},${149+188*t} L${845-355*t},${347+188*t} M${460+385*t},${149+198*t} L${105+385*t},${337+198*t}"/>`;
  }
  return `<defs><filter id="shadow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter><linearGradient id="floor-material" x2="0" y2="1"><stop stop-color="#f9fbff"/><stop offset="1" stop-color="#e2e8f3"/></linearGradient></defs><ellipse cx="476" cy="396" rx="353" ry="80" fill="#384e8a" opacity=".12" filter="url(#shadow)"/><polygon points="105,337 490,535 845,347 460,149" fill="#c0cbdf" transform="translate(0,10)"/><polygon points="105,337 490,535 845,347 460,149" fill="url(#floor-material)" stroke="#b6c7e0"/><g stroke="#c6d6ed" stroke-width=".8" opacity=".7">${grid}</g><path d="M113 337 490 531 837 347" fill="none" stroke="#49a4bb" stroke-width="2"/><path d="M129 337 186 366m536 47 81-44" stroke="#15d8b3" stroke-width="3" fill="none"/>`;
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
      const palette = isTarget?colors[3]:colors[(p.id.charCodeAt(0)+1)%3];
      const selected = selectedItem===p.id;
      content += `<g class="svg-item ${selected?'selected':''} ${i===values.length-1?'svg-draggable':''}" data-entity="${escape(p.id)}" data-item="${escape(p.id)}" data-rack="${ri}" role="button" tabindex="0" aria-label="${escape(p.id)}, ${escape(p.name)}, ${p.weight} kilogram, ${i===values.length-1?'teratas, dapat diseret ke rak lain':'tertimbun'}">`;
      content += block(x,base,53,27,32,palette);
      content += `<path class="box-edge" d="M${x-53} ${base-59}l53 27 53-27M${x} ${base-32}v32"/><path d="m${x-33} ${base-61} 33-17 33 17-33 17Z" fill="#ffffff26" stroke="#ffffff50" stroke-width=".7"/><path d="M${x+37} ${base-50}v17m5-20v17" stroke="#c6f5fa" stroke-width="2"/><polygon points="${x-40},${base-47} ${x-12},${base-33} ${x-12},${base-16} ${x-40},${base-30}" fill="#f6f9ff"/><text x="${x-26}" y="${base-29}" text-anchor="middle" fill="#2f39a9" font-size="11" font-weight="600" transform="rotate(27 ${x-26} ${base-29})">${escape(p.id.length>4?p.id.slice(0,3)+'…':p.id)}</text>`;
      if(isTarget) content += `<path class="target-ring" d="M${x-57},${base-60} ${x},${base-89} ${x+57},${base-60} ${x},${base-30}Z"/>`;
      content += '</g>';
    });
    if(s.count) {
      const ty=y-10-values.length*35-49;
      content += `<g><rect x="${x-23}" y="${ty-14}" width="46" height="21" rx="5" fill="${active?'#2f39a9':'#ffffff'}" stroke="${active?'#2f39a9':'#c6d4eb'}"/><text x="${x}" y="${ty}" text-anchor="middle" font-size="10" font-family="Consolas" fill="${active?'white':'#2e6fa0'}">top</text><path d="M${x},${ty+8}v10" stroke="#49a4bb"/></g>`;
    } else content += svgLabel(x,y-50,'Kosong','svg-small');
    if(s.count>6)content+=svgLabel(x,y+66,`+${s.count-6} barang di bawah`,'svg-small');
    content += `<g class="svg-item" role="button" tabindex="0" data-rack="${ri}" aria-label="Pilih ${rackNames[ri]}"><rect x="${x-59}" y="${y+14}" width="118" height="40" rx="6" fill="${active?'#2f39a9':'#ffffff'}" stroke="${active?'#2f39a9':'#d0d9eb'}"/><text x="${x}" y="${y+31}" text-anchor="middle" font-size="12" font-weight="500" fill="${active?'white':'#344e77'}">${rackNames[ri]}</text><text x="${x}" y="${y+45}" text-anchor="middle" font-size="10" fill="${active?'#d7e3ff':'#596e8f'}">${s.count} / ${s.maxItems} barang · ${s.weight} kg</text></g>`;
  });
  $('scene').innerHTML = `<title id="scene-title">Gudang isometrik. Pilih rak atau barang. Seret barang teratas untuk memindahkannya.</title><g id="world">${content}</g>`;
}
function person(x,y,patient,rank,selected=false,active=false) {
  const shades=[['#666ed0','#2f39a9'],['#69a7cc','#2e6fa0'],['#8bc8d7','#49a4bb']][rank];
  const label = `${patient.id}, ${patient.name}, ${priorityNames[rank]}`;
  return `<g class="svg-item ${selected?'selected':''}" data-entity="${escape(patient.id)}" ${active?'':`role="button" tabindex="0" data-patient="${escape(patient.id)}" data-queue="${rank}" aria-label="${escape(label)}"`}><ellipse class="patient-halo" cx="${x}" cy="${y}" rx="20" ry="10" fill="${selected?'#a0efdd':'#b7c8e5'}" opacity=".7"/><path d="M${x-6} ${y-20}v18m12-18v18" stroke="#3b4c71" stroke-width="7" stroke-linecap="round"/><path d="M${x-12} ${y-46}q12-8 24 0v26q-12 6-24 0Z" fill="${shades[0]}"/><path d="M${x+4} ${y-49}l8 3v26l-8 3Z" fill="${shades[1]}"/><path d="M${x-14} ${y-42}l-3 21m31-21 3 21" stroke="${shades[1]}" stroke-width="7" stroke-linecap="round"/><path d="M${x-7} ${y-42}h5v5h-5Z" fill="#f1f8ff"/><circle cx="${x}" cy="${y-60}" r="11" fill="#e4bea0"/><path d="M${x-10} ${y-62}q-1-14 10-13q12 0 11 14q-11-5-21-1" fill="#37446a"/><rect x="${x-19}" y="${y+10}" width="38" height="18" rx="4" fill="white" stroke="#cfdaed"/><text x="${x}" y="${y+23}" text-anchor="middle" font-size="10" fill="#2e6fa0">${escape(patient.id.length>5?patient.id.slice(0,4)+'…':patient.id)}</text></g>`;
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
    content += `<g class="svg-item" role="button" tabindex="0" data-queue="${rank}" aria-label="Lihat antrean ${queueMode==='fifo'?'FIFO':priorityNames[rank]}"><path class="platform-outline" d="M${x0-32},${y0+9}l226-119 36 18-226 119Z" fill="${['#e2e5fb','#e0effa','#e2f4f8'][rank]}" stroke="${rank===selectedQueue?'#49a4bb':'#b6c8e5'}" stroke-width="${rank===selectedQueue?'2':'1'}"/><path d="M${x0},${y0+8}l184-98" stroke="${['#2f39a9','#2e6fa0','#49a4bb'][rank]}" opacity=".45" stroke-width="1.3" stroke-dasharray="5 6"/></g>`;
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
  $('controls').innerHTML=`<section class="control-section"><div class="control-title">Rak penyimpanan <span>top: ${escape(s.peek()?.id??'None')}</span></div><div class="rack-tabs">${rackNames.map((n,i)=>`<button data-rack="${i}" class="${rack===i?'active':''}">${n}</button>`).join('')}</div><div class="capacity"><span>${s.count} / ${s.maxItems} barang</span><span>${s.weight} / ${s.maxWeight} kg</span></div><div class="capacity-track"><span style="width:100%;transform:scaleX(${Math.max(s.count/s.maxItems,s.weight/s.maxWeight)})"></span></div><details class="capacity-settings"><summary>Ubah batas kapasitas</summary><form id="capacity-form"><div class="form-grid">${field('Maks. barang','max-items',s.maxItems,'number',false,'min="1" max="12" required')}${field('Maks. berat (kg)','max-weight',s.maxWeight,'number',false,'min="0.1" max="1000" step="0.1" required')}</div><button class="secondary" style="margin-top:8px">Simpan batas</button></form></details></section>
  <section class="control-section"><div class="control-title">Barang baru</div><form id="push-form"><div class="form-grid">${field('ID barang','item-id',`G${String(serial).padStart(2,'0')}`,'text',false,'maxlength="12" required')}${field('Berat (kg)','item-weight','3','number',false,'min="0.1" max="1000" step="0.1" required')}${field('Nama barang','item-name','Modul cadangan','text',true,'maxlength="50" required')}<label class="field full">Kategori<select id="item-category"><option>Elektronik</option><option>Peralatan</option><option>Dokumen</option><option>Lainnya</option></select></label></div><button class="primary" type="submit">${icon('plus')}Simpan barang <span>/ push</span></button></form><div class="operation-row"><button class="secondary" data-action="pop">${icon('up')}Ambil / pop</button><button class="secondary" data-action="peek">${icon('eye')}Lihat / peek</button></div><button class="text-button" data-action="empty" style="margin-top:9px">Periksa isEmpty()</button></section>
  <section class="control-section"><div class="control-title">Pindahkan barang teratas</div><div class="transfer-row"><select id="destination" aria-label="Rak tujuan">${rackNames.map((n,i)=>i===rack?'':`<option value="${i}" ${i===2?'selected':''}>${n}</option>`).join('')}</select><button class="secondary" data-action="transfer">Pindahkan</button></div>${chosen?`<div class="selection-detail"><strong>${escape(chosen.id)} · ${escape(chosen.name)}</strong><span>${chosen.weight} kg · ${escape(chosen.category)}</span><span>${s.peek()?.id===chosen.id?'Teratas: dapat diambil langsung.':`Tertimbun: ${s.values().findIndex(p=>p.id===chosen.id)} barang penghalang.`}</span></div>`:''}<form id="find-form" class="transfer-row"><input id="search-item" aria-label="Cari barang berdasarkan ID" placeholder="Cari ID barang…" maxlength="12" style="width:100%;min-width:0;border:1px solid var(--line);border-radius:5px;padding:8px;font-size:11px"><button class="secondary">Cari</button></form>${predictionHTML()}</section>`;
}
function predictionHTML() {
  const m=missions[room]; if(!m.active || m.prediction) return m.prediction?`<div class="prediction-result">Prediksi: ${escape(m.prediction)}</div>`:'';
  if(room==='queue'&&!m.critical) return '';
  const ids=room==='stack'?['A','D']:['P01','P04'];
  return `<div class="prediction">${room==='stack'?'Barang mana yang perlu dipindahkan lebih dulu?':'Pasien mana yang dipanggil berikutnya?'}<div class="operation-row">${ids.map(id=>`<button class="secondary" data-predict="${id}">${id}</button>`).join('')}</div></div>`;
}
function renderQueueControls() {
  const all=clinic.queues.flatMap(q=>q.values()), chosen=all.find(p=>p.id===selectedPatient);
  $('controls').innerHTML=`<section class="control-section"><div class="control-title">Mode antrean <span class="clock-label">${clock()}</span></div><div class="rack-tabs queue-mode"><button data-mode="fifo" class="${queueMode==='fifo'?'active':''}">FIFO dasar</button><button data-mode="priority" class="${queueMode==='priority'?'active':''}">Tiga prioritas</button></div><div class="report"><div><strong>${clinic.served}</strong><span>Dilayani</span></div><div><strong>${clinic.cancelled}</strong><span>Dibatalkan</span></div><div><strong>${clinic.waiting()}</strong><span>Menunggu</span></div></div><div class="service-status">${clinic.active?`Melayani ${escape(clinic.active.patient.id)} · ${escape(clinic.active.patient.name)}<span>Selesai ${clock(clinic.active.endsAt)} · sisa ${Math.max(0,clinic.active.endsAt-clinic.time)} menit</span>`:'Loket tersedia<span>Durasi pelayanan: 5 menit per pasien.</span>'}</div><div class="operation-row"><button class="secondary" data-action="advance">${icon('plus')}1 menit</button><button class="secondary" data-action="next-event">Kejadian berikut</button></div><button class="primary" data-action="call" ${clinic.active?'disabled':''}>${icon('arrow')}Panggil berikutnya / dequeue</button><div class="operation-row"><button class="secondary" data-action="peek">${icon('eye')}Lihat / peek</button><button class="secondary" data-action="empty">isEmpty()</button></div></section>
  <section class="control-section"><div class="control-title">Registrasi pasien</div><form id="register-form"><div class="form-grid">${field('ID pasien','patient-id',`P${String(patientSerial).padStart(2,'0')}`,'text',false,'maxlength="12" required')}${field('Nama pasien','patient-name',missions.queue.active?'Dina':'Fajar','text',false,'maxlength="50" required')}<label class="field full">Tingkat kegawatan<select id="patient-priority" ${queueMode==='fifo'?'disabled':''}>${priorities.map((p,i)=>`<option value="${p}" ${queueMode==='fifo'?i===2?'selected':'':i===0?'selected':''}>${priorityNames[i]}</option>`).join('')}</select></label></div><button class="primary">${icon('plus')}Daftarkan / enqueue</button></form></section>
  <section class="control-section"><div class="control-title">Pasien dalam antrean <span>${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}</span></div><div class="patient-list">${all.length?all.map(p=>`<button data-patient="${escape(p.id)}" data-queue="${priorities.indexOf(p.priority)}" class="${selectedPatient===p.id?'selected':''}" aria-pressed="${selectedPatient===p.id}"><strong>${escape(p.id)} · ${escape(p.name)}</strong><span>±${clinic.estimate(p.id)} mnt</span></button>`).join(''):'<p class="structure-note">Belum ada pasien. Gunakan registrasi di atas.</p>'}</div>${chosen?`<div class="selection-detail"><strong>${escape(chosen.id)} · ${escape(chosen.name)}</strong><span>Datang ${clock(chosen.arrival)} · ${priorityNames[priorities.indexOf(chosen.priority)]}</span><span>Estimasi tunggu: ${clinic.estimate(chosen.id)} menit.</span><span>Berdasarkan antrean saat ini.</span></div><button class="secondary danger-button" data-action="cancel" style="width:100%;margin-top:8px">Batalkan antrean ${escape(chosen.id)}</button>`:''}${predictionHTML()}</section>`;
}
function renderNodes() {
  const values=room==='stack'?racks[rack].values():clinic.queues[selectedQueue].values();
  const first=room==='stack'?'top':'front';
  $('structure-label').textContent=`Linked-list · ${room==='stack'?rackNames[rack]:queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}`;
  $('nodes').innerHTML=values.length?values.map((p,i)=>`<div data-node="${escape(p.id)}" class="node ${p.id===(room==='stack'?selectedItem:selectedPatient)?'selected':''}">${i===0||room==='queue'&&i===values.length-1?`<span class="pointer-label">${i===0?first:''}${room==='queue'&&i===values.length-1?i===0?' / rear':'rear':''} ↓</span>`:''}<span class="node-data">${escape(p.id)}</span><span class="node-next">next</span></div><span class="arrow">→</span>`).join('')+'<span class="null">None</span>':`<span class="null">${first} → None${room==='queue'?' &nbsp; · &nbsp; rear → None':''}</span>`;
  $('structure-note').textContent=room==='stack'?'Panah next bergerak dari top menuju dasar rak. Push dan pop dasar: O(1). Pencarian: O(n).':'Panah next bergerak dari front ke rear. Enqueue dan dequeue dasar: O(1). Pencarian untuk pembatalan: O(n).';
}
function renderMission() {
  const m=missions[room]; let complete=false, stages;
  if(room==='stack') {
    const removed=!!m.removed, restored=removed&&racks[0].values().map(p=>p.id).join(',')==='D,C,A'&&racks[1].isEmpty()&&racks[2].isEmpty();
    complete=restored;
    stages=[['Pindahkan penghalang',!!m.cleared],['Ambil B',removed],['Pulihkan urutan',restored]];
    $('mission-title').textContent='Misi: ambil barang B';
    $('mission-description').textContent=complete?'Berhasil! B keluar, A–C–D kembali pada urutan yang benar.':m.active?'Target B ada di Rak A. Gunakan Bantuan; kembalikan C lalu D setelah B diambil.':'Pindahkan penghalang ke rak bantuan, ambil B, lalu kembalikan urutan barang.';
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
      hint=!m.removed?(racks[0].peek()?.id==='B'?'Ambil B dari Rak A.':`Pindahkan ${racks[0].peek()?.id??'penghalang'} dari Rak A ke Bantuan.`):`Kembalikan ${racks[2].peek()?.id??'barang penghalang'} dari Bantuan ke Rak A.`;
    }else hint=!m.critical?'Daftarkan P04 dengan tingkat kritis.':!m.servedCritical?(clinic.active?'Majukan ke kejadian berikut untuk menyelesaikan pelayanan.':'Panggil P04 dari jalur kritis.') :!m.fifo?'Panggil P02; P03 datang setelahnya.':'Pilih P01 lalu batalkan antreannya.';
  }
  $('mission-next').textContent=hint?`Langkah berikut: ${hint}`:'';
  if(complete&&!m.wasComplete){
    completedMissions.add(room);clearTimeout(achievementTimer);
    $('achievement').innerHTML=`${icon('check')}<div><strong>Misi selesai.</strong><small>${room==='stack'?'Urutan pulih. Konsep LIFO dikuasai.':'Prioritas tertib. FIFO tetap terjaga.'}</small></div>`;
    $('achievement').hidden=false;
    if(motionAllowed())$('achievement').animate([{opacity:0,transform:'translate(-50%, -8px) scale(.97)'},{opacity:1,transform:'translate(-50%, 0) scale(1)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
    achievementTimer=setTimeout(()=>$('achievement').hidden=true,3500);
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
  $('focus-object').setAttribute('aria-pressed',String(camera.focus));return changed;
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
    $('quick-actions').innerHTML=`<button class="secondary" data-quick="pop">${icon('up')}Ambil / pop</button><button class="secondary" data-quick="peek">${icon('eye')}Lihat / peek</button><button class="secondary" data-quick="transfer">${icon('arrow')}${rackNames[dest]}</button>`;
  }else $('quick-actions').innerHTML=`<button class="secondary" data-quick="call" ${clinic.active?'disabled':''}>${icon('arrow')}Panggil</button><button class="secondary" data-quick="next-event" ${clinic.active?'':'disabled'}>Selesaikan</button><button class="secondary" data-quick="peek">${icon('eye')}Lihat / peek</button>`;
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
  for(const [id,old] of previous)if(!visible.has(id)){
    const clone=old.clone;world.append(clone);
    clone.animate([{transform:'translate(0,0)',opacity:.9},{transform:'translate(0,-65)',opacity:0}],{duration:250/motionSpeed,easing:'cubic-bezier(.16,1,.3,1)'}).finished.then(()=>clone.remove()).catch(()=>clone.remove());
  }
}
function render() {
  const focused=document.activeElement;
  let focusSelector=focused.id?`#${CSS.escape(focused.id)}`:null;
  if(!focusSelector){
    const zone=focused.closest('#scene')?'#scene ':focused.closest('#controls')?'#controls ':'';
    const attribute=['data-item','data-patient','data-action','data-quick','data-rack','data-queue','data-mode','data-room'].find(a=>focused.hasAttribute(a));
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
  document.querySelector('.scene-legend').innerHTML=room==='stack'?'<i class="legend-item"></i> Barang <i class="legend-target"></i> Target misi':'<i style="background:#2f39a9"></i> Kritis <i style="background:#2e6fa0"></i> Darurat <i style="background:#49a4bb"></i> Non-darurat';
  if(room==='stack'){renderStackScene();renderStackControls();}else{renderQueueScene();renderQueueControls();}
  for(const [id,value] of Object.entries(drafts[room]))if($(id))$(id).value=value;
  const cameraMoved=applyCamera(sameRoom,oldTransform);animateScene(oldPositions,cameraMoved);
  drawnRoom=room;
  renderNodes();renderMission();renderHUD();renderFeedback();renderTrace();renderLog();
  if(lastObject&&motionAllowed())document.querySelector(`[data-node="${CSS.escape(lastObject)}"]`)?.animate([{opacity:.4,transform:'translateX(-10px)'},{opacity:1,transform:'translateX(0)'}],{duration:200/motionSpeed,easing:'cubic-bezier(.16,1,.3,1)'});
  lastObject=null;
  if(focusSelector)document.querySelector(focusSelector)?.focus({preventScroll:true});
}

function run(operation) {
  try { operation(); render(); } catch(error) { notify(error.message,true); }
}
function performTransfer(source,destination,expectedId=null) {
  if(!Number.isInteger(source)||!Number.isInteger(destination)||!racks[source]||!racks[destination])throw new Error('Pilih rak sumber dan tujuan yang valid.');
  if(expectedId&&racks[source].peek()?.id!==expectedId)throw new Error('Barang tersebut sudah bukan top. Pilih barang teratas saat ini.');
  const data=transfer(racks[source],racks[destination]);selectedItem=data.id;lastObject=data.id;
  setTrace(['data = sumber.peek()','tujuan.push(data)  # cek kapasitas','sumber.pop()'],['Lihat top sumber tanpa menghapusnya.','Push memvalidasi kapasitas tujuan; jika gagal, sumber tetap utuh.','Setelah push berhasil, pop mengambil node dari sumber.'],[`sumber.top → ${data.id}`,`tujuan.top → ${data.id}`,`sumber.top → ${racks[source].peek()?.id??'None'}`]);
  if(missions.stack.active&&racks[0].peek()?.id==='B')missions.stack.cleared=true;
  notify(`${data.id}: ${rackNames[source]} → ${rackNames[destination]}. Push ke tujuan dan pop dari sumber berhasil.`,false,'pindah()');rack=destination;
}
function endDrag() {
  if(!drag)return;
  const state=drag;drag=null;state.ghost?.remove();state.element.style.opacity='';
  document.body.classList.remove('is-dragging');document.querySelectorAll('.drop-zone').forEach(el=>el.classList.remove('drop-zone'));
  if($('scene').hasPointerCapture(state.pointer))$('scene').releasePointerCapture(state.pointer);
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
  const {active,source,destination,id}=drag;endDrag();
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
document.addEventListener('input',event=>{if(event.target.closest('#push-form,#register-form,#find-form'))drafts[room][event.target.id]=event.target.value;});
document.addEventListener('change',event=>{if(event.target.closest('#push-form,#register-form'))drafts[room][event.target.id]=event.target.value;});
document.addEventListener('change',event=>{if(event.target.id==='destination')renderHUD();});
document.addEventListener('click',event=>{
  if(suppressClick){suppressClick=false;event.preventDefault();return;}
  const quick=event.target.closest('[data-quick]');
  if(quick){document.querySelector(`#controls [data-action="${quick.dataset.quick}"]`)?.click();return;}
  const button=event.target.closest('[data-room],[data-item],[data-patient],[data-rack],[data-queue],[data-action],[data-mode],[data-predict]');
  if(!button)return;
  if(button.dataset.room) {
    endDrag();room=button.dataset.room;camera.zoom=1;camera.focus=false;stopTrace();trace=null;clearTimeout(achievementTimer);$('achievement').hidden=true;feedback={text:room==='stack'?'Pilih rak, lalu coba push atau pop.':'Pilih pasien untuk melihat estimasi tunggu. Panggil pasien saat loket tersedia.',error:false};render();return;
  }
  if(button.dataset.mode) {
    if(queueMode!==button.dataset.mode) {queueMode=button.dataset.mode;missions.queue={active:false};drafts.queue={};seedQueue();stopTrace();trace=null;notify('Mode diubah. Antrean dimuat ulang untuk eksperimen baru.');render();}return;
  }
  if(button.dataset.predict) {
    const expected=room==='stack'?'D':'P04';missions[room].prediction=button.dataset.predict===expected?'Benar! '+(room==='stack'?'D adalah top.':'P04 memiliki prioritas tertinggi.'):'Coba amati kembali: '+(room==='stack'?'D berada paling atas.':'P04 dipilih dari jalur kritis.');render();return;
  }
  if(button.dataset.patient){selectedPatient=button.dataset.patient;selectedQueue=Number(button.dataset.queue);render();return;}
  if(button.dataset.rack!==undefined){rack=Number(button.dataset.rack);selectedItem=button.dataset.item??null;render();return;}
  if(button.dataset.queue!==undefined){selectedQueue=Number(button.dataset.queue);selectedPatient=null;render();return;}
  const action=button.dataset.action;
  run(()=>{
    if(action==='peek'||action==='empty') {
      const structure=room==='stack'?racks[rack]:clinic.queues[selectedQueue];
      const result=action==='peek'?structure.peek()?.id??'None':structure.isEmpty()?'True':'False';
      const pointer=room==='stack'?'top':'front';
      if(action==='peek'){if(room==='stack')selectedItem=structure.peek()?.id??null;else selectedPatient=structure.peek()?.id??null;}
      notify(`${action}() → ${result}. Isi ${room==='stack'?rackNames[rack]:'jalur '+priorityNames[selectedQueue]} tetap sama.`,false,`${action}()`);
      setTrace(action==='empty'?['def isEmpty(self):',`    return self.${pointer} is None`]:['def peek(self):',`    if self.${pointer} is None:`,`        return None`,`    return self.${pointer}.data`],action==='empty'?['Periksa referensi utama.','Kembalikan hasil tanpa mengubah struktur.']:['Lihat elemen terdepan.','Periksa kondisi kosong.','Dijalankan hanya jika kosong.','Kembalikan data tanpa menghapus node.'],action==='empty'?[`${pointer} → ${structure.peek()?.id??'None'}`,`hasil → ${result}`]:[`${pointer} → ${structure.peek()?.id??'None'}`,`${pointer} → ${structure.peek()?.id??'None'}`,structure.isEmpty()?'hasil → None':'Cabang dilewati',`hasil → ${result}`],action==='peek'?[structure.isEmpty()?3:2]:[]);
    }
    if(action==='pop') {
      const data=racks[rack].pop(); selectedItem=null;
      tracePop(data?.id??'None',racks[rack].peek()?.id??'None',!data);
      if(data?.id==='B'&&missions.stack.active&&rack===0)missions.stack.removed=true;
      notify(data?`pop() → ${data.id} (${data.name}). Top sekarang ${racks[rack].peek()?.id??'None'}.`:'Underflow: Stack kosong. pop() mengembalikan None.',!data,'pop()');
    }
    if(action==='transfer') {
      performTransfer(rack,Number($('destination').value));
    }
    if(action==='call') {
      const q=clinic.queues.find(q=>!q.isEmpty()),rear=q?.rear?.data.id??'None';
      const p=clinic.call();selectedPatient=null;
      if(p)selectedQueue=priorities.indexOf(p.priority);
      traceDequeue(p,q?.front?.data.id??'None',rear);
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
      if(missions.queue.active&&p.id==='P01')missions.queue.cancelled=true;
      setTrace(['node = cari_node(id)',index===0?'self.front = node.next':'previous.next = node.next','if self.rear is node:','    self.rear = previous','return node.data'],['Cari pasien pada linked-list, O(n).',index===0?'Node pertama dihapus; perbarui front.':'Lewati node yang dibatalkan; urutan lainnya tetap sama.','Periksa apakah node merupakan rear.',index===values.length-1?'Perbarui rear; None jika antrean kosong.':'Cabang ini dilewati; rear tetap sama.','Kembalikan data pasien yang dibatalkan.'],[`node → ${p.id}`,index===0?`front → ${next}`:`${previous}.next → ${next}`,`rear → ${values.at(-1).id}`,`rear → ${clinic.queues[rank].rear?.data.id??'None'}`,`dibatalkan → ${p.id}`],index===values.length-1?[]:[3]);
      notify(`${p.id} dibatalkan. Urutan pasien lainnya tetap sama; laporan diperbarui.`,false,'batalkan()');
    }
  });
});
// SVG objects expose the same actions to keyboard users as the control buttons.
$('scene').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
document.addEventListener('submit',event=>{
  event.preventDefault();
  run(()=>{
    if(event.target.id==='push-form') {
      const data=item($('item-id').value.trim(),$('item-name').value.trim(),Number($('item-weight').value),$('item-category').value);
      if(racks.flatMap(r=>r.values()).some(p=>p.id===data.id))throw new Error('ID barang sudah digunakan. Isi ID yang berbeda.');
      const before=racks[rack].peek()?.id??'None';racks[rack].push(data);serial++;drafts.stack={};selectedItem=data.id;lastObject=data.id;tracePush(before,data);
      notify(`push(${data.id}) berhasil. Top ${rackNames[rack]} sekarang ${data.id}; berat ${racks[rack].weight} kg.`,false,`push(${data.id})`);
    }
    if(event.target.id==='capacity-form') {
      const maxItems=Number($('max-items').value),maxWeight=Number($('max-weight').value),s=racks[rack];
      if(!Number.isInteger(maxItems)||maxItems<1||maxItems>12||!Number.isFinite(maxWeight)||maxWeight<=0||maxWeight>1000)throw new Error('Isi kapasitas 1–12 barang dan berat positif hingga 1000 kg.');
      if(maxItems<s.count||maxWeight<s.weight)throw new Error('Batas baru lebih kecil dari isi rak. Ambil barang terlebih dahulu.');
      s.maxItems=maxItems;s.maxWeight=maxWeight;notify('Batas kapasitas rak diperbarui.',false,'kapasitas()');
    }
    if(event.target.id==='find-form') {
      const id=$('search-item').value.trim();const ri=racks.findIndex(s=>s.values().some(p=>p.id===id));
      if(ri<0)throw new Error(`Barang ${id||'(ID kosong)'} tidak ditemukan pada rak.`);
      rack=ri;selectedItem=id;camera.focus=true;camera.zoom=Math.max(camera.zoom,1.4);const blockers=racks[rack].values().findIndex(p=>p.id===id);
      notify(`${id} ada di ${rackNames[rack]}. ${blockers?`${blockers} penghalang perlu dipindahkan sebelum target diambil.`:'Barang berada di top dan dapat diambil langsung.'}`,false,'cari()');
    }
    if(event.target.id==='register-form') {
      const priority=queueMode==='fifo'?'non-darurat':$('patient-priority').value,rank=priorities.indexOf(priority),q=clinic.queues[rank],oldRear=q.rear?.data.id??'None',oldFront=q.front?.data.id??'None';
      const p=clinic.register({id:$('patient-id').value.trim(),name:$('patient-name').value.trim(),priority});patientSerial++;drafts.queue={};selectedPatient=p.id;selectedQueue=rank;lastObject=p.id;traceEnqueue(p,oldRear,oldFront);
      if(missions.queue.active&&p.id==='P04'&&priority==='kritis')missions.queue.critical=true;
      notify(`${p.id} masuk dari rear ${queueMode==='fifo'?'antrean FIFO':'jalur '+priorityNames[rank]}. Estimasi tunggu ${clinic.estimate(p.id)} menit berdasarkan antrean saat ini.`,false,`enqueue(${p.id})`);
    }
  });
});
$('start-mission').addEventListener('click',()=>{
  endDrag();stopTrace();trace=null;drafts[room]={};clearTimeout(achievementTimer);$('achievement').hidden=true;
  if(room==='stack'){missions.stack={active:true,removed:false,cleared:false};seedStack(true);}else{queueMode='priority';missions.queue={active:true,critical:false,servedCritical:false,fifo:false,cancelled:false};seedQueue(true);}
  notify(room==='stack'?'Misi dimulai. Cari B, pindahkan D lalu C ke Bantuan, kemudian ambil B.':'Misi dimulai. Daftarkan P04 sebagai kritis melalui registrasi.',false,'misi()');render();
});
$('reset').addEventListener('click',()=>{endDrag();stopTrace();trace=null;drafts[room]={};camera.zoom=1;camera.focus=false;clearTimeout(achievementTimer);$('achievement').hidden=true;missions[room]={active:false};if(room==='stack')seedStack();else seedQueue();notify('Ruang diatur ulang. Data contoh siap digunakan.',false,'reset()');render();});
$('clear-log').addEventListener('click',()=>{logs=[];renderLog();});
$('help').addEventListener('click',()=>$('guide').showModal());
$('close-guide').addEventListener('click',()=>$('guide').close());
$('reduce-motion').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('reduce-motion').addEventListener('change',event=>{document.body.classList.toggle('reduced-motion',event.target.checked);if(event.target.checked)document.getAnimations().forEach(a=>a.cancel());});
$('zoom-in').addEventListener('click',()=>{camera.zoom=Math.min(1.8,Math.round((camera.zoom+.2)*10)/10);applyCamera();});
$('zoom-out').addEventListener('click',()=>{camera.zoom=Math.max(1,Math.round((camera.zoom-.2)*10)/10);applyCamera();});
$('focus-object').addEventListener('click',()=>{camera.focus=!camera.focus;if(camera.focus)camera.zoom=Math.max(1.4,camera.zoom);applyCamera();});
$('reset-camera').addEventListener('click',()=>{camera.zoom=1;camera.focus=false;applyCamera();});
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
$('trace-prev').innerHTML=icon('arrow');$('trace-prev').querySelector('svg').style.transform='rotate(180deg)';$('trace-next').innerHTML=icon('arrow');
render();
