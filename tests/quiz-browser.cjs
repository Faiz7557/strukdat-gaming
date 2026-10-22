const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

(async()=>{
  const {createLabServer}=await import('../serve.js');
  const {queueQuiz}=await import('../quiz-bank.js');
  let clock=Date.now();
  const {server,quiz}=createLabServer({now:()=>clock});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  let browser;
  try {browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});}
  catch(error){quiz.close();await new Promise(resolve=>server.close(resolve));throw error;}
  const shots=path.join(__dirname,'../screenshots/quiz');fs.mkdirSync(shots,{recursive:true});
  const host=await browser.newPage({viewport:{width:1440,height:1000}}),a=await browser.newPage({viewport:{width:390,height:844}}),b=await browser.newPage({viewport:{width:1024,height:900}});
  const errors=[];for(const page of [host,a,b])page.on('pageerror',e=>errors.push(e.message));
  const noOverflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const capture=async(page,name)=>{await noOverflow(page);await page.screenshot({path:path.join(shots,name),fullPage:true});};
  try {
    await host.goto(base);assert.equal(await host.locator('#queue-quiz').isVisible(),false);
    await host.locator('.room-switch [data-room="queue"]').click();assert.equal(await host.locator('#queue-quiz').isVisible(),true);
    await host.goto(base+'/quiz.html');await capture(host,'entry-desktop.png');
    await host.getByRole('button',{name:'Buat ruang Queue',exact:true}).click();await host.locator('#session-pin').waitFor();
    const pin=await host.locator('#session-pin').innerText();assert.match(pin,/^\d{6}$/);
    for(const [page,name] of [[a,'Alya'],[b,'<Nara>']]) {
      await page.goto(base+`/quiz.html?join=${pin}`);assert.equal(await page.locator('#join-pin').inputValue(),pin);
      await page.locator('#join-name').fill(name);await page.getByRole('button',{name:'Gabung kuis'}).click();
      await page.waitForFunction(()=>document.querySelector('#quiz-connection').textContent.includes('Terhubung'));
    }
    await host.waitForFunction(()=>document.querySelector('#session-roster').textContent.startsWith('2 peserta'));
    assert.match(await host.locator('#quiz-ranking-body').innerText(),/<Nara>/);assert.equal(await host.locator('#quiz-ranking-body nara').count(),0);
    await capture(host,'lobby-desktop.png');await capture(a,'lobby-mobile.png');
    await host.getByRole('button',{name:'Mulai 20 soal'}).click();
    for(let i=0;i<20;i++) {
      await host.waitForFunction(()=>document.querySelector('#session-title').textContent==='Siapkan jawabanmu.');
      clock+=4000;quiz.tick();
      await a.locator('#choice-0').waitFor();await b.locator('#choice-0').waitFor();
      if(i===0) {
        await capture(a,'question-mobile.png');
        for(const width of [320,768,1440]){await a.setViewportSize({width,height:900});await noOverflow(a);}await a.setViewportSize({width:390,height:844});
        const buttons=await a.locator('[data-choice]').all();for(const button of buttons){const box=await button.boundingBox();assert.ok(box.height>=44&&box.width>=44);}
        await a.locator(`#choice-${queueQuiz[i].answer}`).focus();await a.keyboard.press('Enter');
        await a.locator('#answer-status').filter({hasText:'Jawaban diterima'}).waitFor();
        assert.match(await a.locator('#my-score').innerText(),/^0 poin/);
        assert.equal(await a.locator('[data-choice]:enabled').count(),0);
      } else await a.locator(`#choice-${queueQuiz[i].answer}`).click();
      if(i===1) {
        await a.reload();await a.locator('#answer-status').filter({hasText:'Jawaban diterima'}).waitFor();
        assert.equal(await a.locator('[data-choice]:enabled').count(),0);
      }
      await b.locator(`#choice-${i%2?queueQuiz[i].answer:(queueQuiz[i].answer+1)%4}`).click();
      await host.getByRole('button',{name:i===19?'Tampilkan hasil akhir':'Soal berikutnya'}).waitFor();
      await a.locator('.quiz-explanation').waitFor();
      if(i===0){await capture(host,'review-desktop.png');await capture(a,'review-mobile.png');}
      if(i===2) {
        await b.context().setOffline(true);await b.reload().catch(()=>{});await b.context().setOffline(false);await b.reload();
        await b.locator('.quiz-explanation').waitFor();assert.match(await b.locator('#session-roster').innerText(),/2 peserta/);
      }
      await host.getByRole('button',{name:i===19?'Tampilkan hasil akhir':'Soal berikutnya'}).click();
    }
    await host.locator('#download-results').waitFor();await a.locator('#quiz-review').waitFor();
    assert.equal(await a.locator('.quiz-review-item').count(),20);assert.match(await a.locator('.quiz-personal').innerText(),/20 \/ 20 benar \(100%\)/);
    await capture(host,'finished-desktop.png');await capture(a,'finished-mobile.png');
    const downloadPromise=host.waitForEvent('download');await host.locator('#download-results').click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/^queue-\d{6}\.csv$/);
    await a.locator('.quiz-review-item').first().locator('summary').click();await noOverflow(a);
    await host.locator('#close-room').click();await host.getByRole('button',{name:'Kembali',exact:true}).click();assert.equal(await host.locator('#download-results').isVisible(),true);
    await host.locator('#close-room').click();await host.locator('#quiz-confirm button[value="close"]').click();await a.getByRole('button',{name:'Kembali ke halaman kuis'}).waitFor();
    // Host recovery: a fresh context (lost tab) takes over with PIN + recovery code; the old tab drops to entry.
    const open=async()=>{const page=await (await browser.newContext({viewport:{width:1100,height:900}})).newPage();page.on('pageerror',e=>errors.push(e.message));return page;};
    const origin=await open();await origin.goto(base+'/quiz.html');
    await origin.getByRole('button',{name:'Buat ruang Queue',exact:true}).click();await origin.locator('#session-pin').waitFor();
    const recoverPin=(await origin.locator('#session-pin').innerText()).trim(),code=(await origin.locator('#quiz-stage code').innerText()).trim();assert.match(code,/^[a-f0-9]{48}$/);
    const lost=await open();await lost.goto(base+'/quiz.html');await lost.locator('#recover-panel summary').click();
    await lost.locator('#recover-pin').fill(recoverPin);await lost.locator('#recover-code').fill('0'.repeat(48));await lost.getByRole('button',{name:'Pulihkan host'}).click();
    await lost.waitForFunction(()=>document.querySelector('#quiz-notice').textContent.includes('tidak cocok'));assert.equal(await lost.locator('#quiz-session').isVisible(),false);
    await lost.locator('#recover-code').fill(code);await lost.getByRole('button',{name:'Pulihkan host'}).click();await lost.locator('#session-pin').waitFor();
    assert.match(await lost.locator('#session-label').innerText(),/HOST/);assert.equal((await lost.locator('#session-pin').innerText()).trim(),recoverPin);
    await origin.locator('#quiz-entry').waitFor({state:'visible',timeout:15000});
    assert.deepEqual(errors,[]);console.log('Queue Live browser: PASS — host + 2 peserta, 20 ronde, refresh, offline/reconnect, keyboard, XSS escaping, CSV, 320–1440px, pemulihan host.');
  } finally {await browser.close();quiz.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
