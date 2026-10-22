const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>new Intl.NumberFormat('id-ID').format(value);
const time=value=>`${(value/1000).toFixed(2).replace('.',',')} dtk`;
let session=null,state=null,stream=null,busy=false,online=false,pendingChoice=null,retryTimer=null;
let clock={server:0,received:0};
function notice(message='') {$('quiz-notice').hidden=!message;$('quiz-notice').textContent=message;}
function remember() {try {if(session)sessionStorage.setItem('queue-live',JSON.stringify(session));else sessionStorage.removeItem('queue-live');}catch {notice('Penyimpanan tab dibatasi. Sesi berjalan, tetapi tidak dapat dipulihkan setelah refresh.');}}
function endpoint(action) {return `/api/quiz/rooms/${session.pin}/${action}`;}
let pendingKey=null;
// Same form values reuse one key, so a timed-out create/join retried by the user cannot make a second room or player.
function keyFor(signature) {if(pendingKey?.signature!==signature)pendingKey={signature,key:[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('')};return pendingKey.key;}
async function api(path, data, authenticated=true, key) {
  const response=await fetch(path,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(authenticated?{Authorization:`Bearer ${session.token}`}:{}),...(key?{'Idempotency-Key':key}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(12000)});
  const result=await response.json();
  if(!response.ok)throw Object.assign(new Error(result.error??'Permintaan gagal.'),{status:response.status});
  return result;
}
function accept(value) {
  if(!session || value.pin!==session.pin || (state && value.revision<state.revision))return;
  clock={server:value.serverNow,received:performance.now()};
  if(state?.revision===value.revision){updateTimer();return;}
  if(state?.question?.id!==value.question?.id || value.me?.answer)pendingChoice=null;
  state=value;render();
}
function connection(value) {online=value;$('quiz-connection').textContent=value?'● Terhubung':'○ Menyambungkan ulang…';$('quiz-connection').classList.toggle('quiz-offline',!value);renderControls();updateTimer();}
async function connect() {
  stream?.abort();clearTimeout(retryTimer);
  const controller=new AbortController();stream=controller;
  try {
    const response=await fetch(endpoint('events'),{headers:{Authorization:`Bearer ${session.token}`},signal:controller.signal});
    if(!response.ok)throw Object.assign(new Error((await response.json()).error),{status:response.status});
    connection(true);notice();
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    while(true) {
      const result=await reader.read();if(result.done)break;
      buffer+=decoder.decode(result.value,{stream:true});
      let end;while((end=buffer.indexOf('\n\n'))>=0) {
        const event=buffer.slice(0,end);buffer=buffer.slice(end+2);
        const data=event.split('\n').find(line=>line.startsWith('data: '));
        if(data && !controller.signal.aborted){if(!online)connection(true);accept(JSON.parse(data.slice(6)));}
      }
      if(buffer.length>1024*1024)throw new Error('Pembaruan server terlalu besar.');
    }
  } catch(error) {
    if(controller.signal.aborted)return;
    if([401,404].includes(error.status)){leave();notice(error.message);return;}
    notice(error.status===429?'Koneksi sesi dibatasi. Tutup salinan tab, lalu tunggu.':'Koneksi terputus. Jawaban yang diterima server tetap tersimpan; mencoba tersambung kembali.');
  }
  if(controller.signal.aborted||!session)return;
  connection(false);retryTimer=setTimeout(connect,2500);
}
async function enter(result) {
  stream?.abort();state=null;online=false;pendingChoice=null;session={pin:result.pin,token:result.token,role:result.role,recoveryCode:result.recoveryCode??session?.recoveryCode??null};remember();notice();
  $('quiz-entry').hidden=true;$('quiz-session').hidden=false;$('resume-session').hidden=true;
  accept(result.state);$('session-title').focus();void connect();
}
function leave() {
  stream?.abort();clearTimeout(retryTimer);session=null;state=null;pendingChoice=null;online=false;remember();
  $('quiz-entry').hidden=false;$('quiz-session').hidden=true;$('resume-session').hidden=true;
  notice();$('entry-title').setAttribute('tabindex','-1');$('entry-title').focus();
}
async function run(task) {
  if(busy)return;busy=true;notice();renderControls();updateTimer();
  document.querySelectorAll('#quiz-entry button').forEach(b=>b.disabled=true);
  try {await task();}catch(error){notice(error.name==='TimeoutError'?'Server belum memberi konfirmasi. Sambungkan kembali atau kirim ulang jawaban yang sama.':error.message);if(session){try{accept(await api(endpoint('state')));}catch{connection(false);}}}
  finally{busy=false;renderControls();updateTimer();document.querySelectorAll('#quiz-entry button').forEach(b=>b.disabled=false);}
}
function leaderboard() {
  const rows=state.leaderboard;
  $('quiz-ranking-body').innerHTML=rows.length?rows.map(p=>`<tr class="${p.id===state.memberId?'quiz-me':''}"><td>${p.rank}</td><th scope="row">${escape(p.name)}${p.id===state.memberId?' <span>(kamu)</span>':''}<small>${p.connected?'Terhubung':'Koneksi terputus'}</small></th><td>${number(p.score)}</td><td>${p.correct} / ${state.total}</td><td>${time(p.correctMs)}</td></tr>`).join(''):'<tr><td colspan="5">Belum ada peserta. Bagikan kode ruang untuk mulai.</td></tr>';
  $('my-score').textContent=state.me?`${number(state.me.score)} poin · ${state.me.correct} benar`:`${rows.length} peserta`;
}
function renderControls() {
  if(!state)return;
  const disabled=busy||!online?' disabled':'';
  let html='';
  if(state.role==='host') {
    if(state.phase==='lobby')html=`<button class="primary" data-command="start"${disabled||(!state.leaderboard.length?' disabled':'')}>Mulai 20 soal →</button>`;
    if(state.phase==='review')html=`<button class="primary" data-command="${state.number===state.total?'finish':'next'}"${disabled}>${state.number===state.total?'Tampilkan hasil akhir':'Soal berikutnya →'}</button>`;
    if(state.phase==='finished')html=`<button class="primary" id="download-results"${disabled}>Unduh hasil kelas (.csv)</button>`;
    if(state.phase!=='closed')html+='<button class="text-button" id="close-room">Tutup ruang</button>';
  }
  if(state.role==='player'&&pendingChoice!==null&&state.phase==='question'&&!state.me.answer)html+=`<button class="secondary" id="retry-answer"${disabled}>Kirim ulang pilihan ${'ABCD'[pendingChoice]}</button>`;
  $('quiz-controls').innerHTML=html;
}
function render() {
  const oldFocus=document.activeElement?.id, oldQuestion=$('quiz-stage').dataset.question;
  const phase=state.phase,q=state.question,host=state.role==='host',players=state.leaderboard;
  const titles={lobby:'Kelas siap bergabung.',countdown:'Siapkan jawabanmu.',question:`Soal ${state.number} dari ${state.total}`,review:'Lihat alasan di balik jawaban.',finished:'Queue selesai. Pemahaman bertambah.',closed:'Ruang sudah ditutup.'};
  $('session-title').textContent=titles[phase];$('session-label').textContent=host?'QUEUE LIVE · HOST':'QUEUE LIVE · PESERTA';
  $('session-pin').textContent=state.pin;$('session-roster').textContent=`${players.length} peserta · ${players.filter(p=>p.connected).length} terhubung`;
  $('session-progress').textContent=`${phase==='lobby'?'20 soal Queue':`${state.number} / ${state.total} soal`} · Durasi ${state.durationMultiplier}×`;
  let html='';
  if(phase==='lobby') {
    html=`<span class="quiz-eyebrow">${host?'BAGIKAN KODE RUANG':'KAMU SUDAH TERDAFTAR'}</span><h2>${host?'Ajak kelas masuk, lalu mulai bersama.':'Tunggu host memulai kuis.'}</h2><div class="quiz-pin">${state.pin}</div><p>20 soal · FIFO, node, penelusuran operasi, prioritas, dan waktu tunggu.</p><p class="quiz-muted">Jawaban benar: 800 + bonus hingga 200 poin. Jawaban pertama terkunci. Salah atau melewati soal: 0.</p>${host&&session?.recoveryCode?`<p class="quiz-muted">Kode pemulihan host (simpan jika tab tertutup): <code>${escape(session.recoveryCode)}</code></p>`:''}<button class="secondary" id="copy-link">Salin tautan bergabung</button><p id="share-address" class="quiz-address"></p>${['localhost','127.0.0.1','[::1]'].includes(location.hostname)?'<p class="quiz-local-note">Alamat localhost hanya berlaku di komputer ini. Untuk perangkat lain, gunakan IP LAN server dan jalankan npm run start:lan.</p>':''}`;
  } else if(phase==='countdown') {
    html='<span class="quiz-eyebrow">SEMUA PESERTA MULAI BERSAMA</span><h2>Siap untuk ronde berikutnya?</h2><p class="quiz-countdown" id="round-timer" role="timer" aria-label="Hitung mundur ronde">3</p><p>Baca soal dengan teliti. Utamakan jawaban yang tepat.</p>';
  } else if(phase==='question'||phase==='review') {
    const answer=state.me?.answer, locked=!!answer || pendingChoice!==null;
    html=`<div class="quiz-question-meta"><span class="quiz-eyebrow">${escape(q.topic)} · ${state.number} / ${state.total}</span><span id="round-timer" role="timer" aria-label="Sisa waktu menjawab"></span></div><h2 id="question-prompt" tabindex="-1">${escape(q.prompt)}</h2><p class="quiz-muted">${state.answered} / ${players.length} jawaban diterima${phase==='question'?' · Skor diperbarui setelah ronde selesai':''}</p><div class="quiz-choices" role="group" aria-labelledby="question-prompt">${q.choices.map((choice,i)=>`<button id="choice-${i}" class="quiz-choice ${phase==='review'&&i===q.answer?'quiz-correct':''} ${answer?.choice===i?'quiz-chosen':''}" data-choice="${i}" ${host||phase!=='question'||locked||!online||busy?'disabled':''}><span class="quiz-choice-letter">${'ABCD'[i]}</span><span>${escape(choice)}${phase==='review'?`<small>${i===q.answer?'✓ Jawaban benar · ':''}${state.distribution[i]} memilih${answer?.choice===i?' · Pilihanmu':''}</small>`:''}</span></button>`).join('')}</div>`;
    if(phase==='review') html+=`<div class="quiz-explanation" role="status"><h3>${host?'Pembahasan bersama':answer?(answer.correct?`Tepat! +${number(answer.points)} poin`:'Belum tepat. +0 poin'):'Waktu habis · tidak ada jawaban'}</h3><p>${escape(q.explanation)}</p>${answer?`<p>Jawabanmu: ${'ABCD'[answer.choice]} · Diterima dalam ${time(answer.elapsedMs)}.</p>`:''}</div>${host?'':'<p class="quiz-muted">Tunggu host melanjutkan. Lihat posisimu di leaderboard.</p>'}`;
    else html+=`<p id="answer-status" class="quiz-answer-status" role="status">${host?'Layar host · peserta menjawab di perangkat masing-masing.':answer?'✓ Jawaban diterima dan dikunci. Tunggu pembahasan.':pendingChoice!==null?'Menunggu konfirmasi server. Pilihan pertama tetap terkunci.':'Pilih satu jawaban. Jawaban pertama dikunci.'}</p>`;
  } else if(phase==='finished') {
    const top=players.filter(p=>p.rank<=3);
    html=`<span class="quiz-eyebrow">HASIL AKHIR · 20 SOAL QUEUE</span><h2>Terima kasih sudah bermain bersama.</h2><div class="quiz-podium">${top.map(p=>`<div><span>Peringkat ${p.rank}</span><h3>${escape(p.name)}</h3><strong>${number(p.score)} poin</strong><p>${p.correct} / ${state.total} benar · ${time(p.correctMs)}</p></div>`).join('')}</div>${state.me?`<p class="quiz-personal">Hasilmu: <strong>${state.me.correct} / ${state.total} benar (${Math.round(state.me.correct/state.total*100)}%)</strong>. Pelajari pembahasan di bawah, lalu coba kembali di arena Queue.</p>`:'<p>Unduh hasil kelas sebelum menutup ruang atau memulai ulang server.</p>'}<a class="secondary" href="./">Kembali ke laboratorium</a>`;
  } else html='<h2>Terima kasih sudah bergabung.</h2><p>Host telah menutup ruang. Kembali ke halaman awal untuk bergabung ke kuis baru.</p><button class="secondary" id="new-session">Kembali ke halaman kuis</button>';
  $('quiz-stage').innerHTML=html;$('quiz-stage').dataset.question=q?.id??phase;
  if(phase==='lobby')$('share-address').textContent=joinLink();
  leaderboard();renderControls();updateTimer();
  $('quiz-review').hidden=phase!=='finished';
  if(phase==='finished')$('quiz-review-body').innerHTML=state.review.map((item,i)=>`<details class="quiz-review-item"><summary>${i+1}. ${escape(item.topic)}${host?'':item.mine?(item.mine.correct?' · Benar':' · Belum tepat'):' · Tidak dijawab'}</summary><p>${escape(item.prompt)}</p><p><strong>Kunci ${'ABCD'[item.answer]}:</strong> ${escape(item.choices[item.answer])}</p>${!host?`<p>Jawabanmu: ${item.mine?`${'ABCD'[item.mine.choice]} · ${escape(item.choices[item.mine.choice])} · ${item.mine.points} poin`:'Tidak ada'}</p>`:''}<p>${escape(item.explanation)}</p></details>`).join('');
  if(oldFocus && $(oldFocus) && !$(oldFocus).disabled)$(oldFocus).focus({preventScroll:true});
  else if(q?.id!==oldQuestion && phase==='question')$('question-prompt').focus();
}
function updateTimer() {
  if(!state)return;
  const estimated=clock.server+performance.now()-clock.received,remaining=(state.phase==='countdown'?state.startsAt:state.deadline)-estimated;
  const timer=$('round-timer');if(timer)timer.textContent=state.phase==='review'?'Ronde selesai':state.phase==='countdown'?(remaining>0?Math.ceil(remaining/1000):'Mulai…'):`${Math.max(0,Math.ceil(remaining/1000))} dtk`;
  if(state.phase==='question')document.querySelectorAll('[data-choice]').forEach(button=>button.disabled=state.role==='host'||!!state.me?.answer||pendingChoice!==null||remaining<=0||!online||busy);
}
function joinLink() {const url=new URL('quiz.html',location.href);url.searchParams.set('join',state.pin);return url.href;}
async function sendAnswer(choice) {pendingChoice=choice;updateTimer();renderControls();accept(await api(endpoint('answer'),{questionId:state.question.id,choice}));}
$('host-form').addEventListener('submit',event=>{event.preventDefault();const body={multiplier:Number($('quiz-duration').value)};const key=keyFor(`host:${JSON.stringify(body)}`);void run(async()=>{await enter(await api('/api/quiz/rooms',body,false,key));pendingKey=null;});});
$('join-form').addEventListener('submit',event=>{event.preventDefault();const pin=$('join-pin').value,body={name:$('join-name').value};const key=keyFor(`join:${pin}:${body.name}`);void run(async()=>{await enter(await api(`/api/quiz/rooms/${pin}/join`,body,false,key));pendingKey=null;});});
$('recover-form').addEventListener('submit',event=>{event.preventDefault();void run(async()=>enter(await api(`/api/quiz/rooms/${$('recover-pin').value}/recover`,{code:$('recover-code').value},false)));});
$('leave-session').addEventListener('click',()=>{stream?.abort();clearTimeout(retryTimer);connection(false);$('quiz-entry').hidden=false;$('quiz-session').hidden=true;$('resume-session').hidden=false;notice('Ruang dan skor tetap tersimpan. Pilih kembali ke sesi aktif untuk melanjutkan.');});
$('resume-session').addEventListener('click',()=>{if(session)void run(async()=>enter({...session,state:await api(endpoint('state'))}));});
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.choice!==undefined)void run(()=>sendAnswer(Number(button.dataset.choice)));
  if(button.id==='retry-answer')void run(()=>sendAnswer(pendingChoice));
  if(button.dataset.command)void run(async()=>accept(await api(endpoint('command'),{command:button.dataset.command,revision:state.revision})));
  if(button.id==='close-room')$('quiz-confirm').showModal();
  if(button.id==='new-session')leave();
  if(button.id==='copy-link')void run(async()=>{try{await navigator.clipboard.writeText(joinLink());notice('Tautan bergabung tersalin.');}catch{notice(`Salin alamat ini: ${joinLink()}`);}});
  if(button.id==='download-results')void run(async()=>{
    const response=await fetch(endpoint('results'),{headers:{Authorization:`Bearer ${session.token}`}});
    if(!response.ok)throw new Error((await response.json()).error);
    const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download=`queue-${session.pin}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
});
$('quiz-confirm').addEventListener('close',()=>{if($('quiz-confirm').returnValue==='close')void run(async()=>accept(await api(endpoint('command'),{command:'close',revision:state.revision})));});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session&&!$('quiz-session').hidden)void api(endpoint('state')).then(accept).catch(()=>connection(false));});
window.addEventListener('online',()=>{if(session&&!$('quiz-session').hidden)void connect();});
setInterval(updateTimer,200);
const pin=new URLSearchParams(location.search).get('join');if(/^\d{6}$/.test(pin??''))$('join-pin').value=pin;
try {
  const saved=JSON.parse(sessionStorage.getItem('queue-live')??'null');
  if(saved&&/^\d{6}$/.test(saved.pin)&&/^[a-f0-9]{48}$/.test(saved.token)&&(!pin||pin===saved.pin)) {
    session=saved;void run(async()=>{try{const value=await api(endpoint('state'));await enter({...saved,state:value});}catch(error){leave();throw error;}});
  }
}catch {notice('Sesi tersimpan tidak dapat dibaca. Silakan masuk kembali.');}
