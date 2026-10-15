const assert = require('node:assert/strict');
const { readFile, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname,'..');

(async () => {
  const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined});
  const errors=[], results=[];
  const output=path.join(root,'screenshots','audit');
  await mkdir(output,{recursive:true});
  try {
    const context=await browser.newContext();
    // Serve the local app through routing, so the audit needs no network or running server.
    const serve=async route=>{
      const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
      const file=path.resolve(root,name);
      assert.ok(file.startsWith(root+path.sep));
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'};
      await route.fulfill({body:await readFile(file),contentType:types[path.extname(file)]});
    };
    await context.route('http://strukdat.local/**',serve);
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://strukdat.local/');
    await page.getByRole('heading',{name:'Gudang Stack',exact:true}).waitFor();
    await page.evaluate(()=>document.fonts.ready);

    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:1000});
      for(const room of ['stack','queue']){
        await page.locator(`.rail [data-room="${room}"]`).click();
        const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,
          principle:getComputedStyle(document.querySelector('#principle')).display,
          text:getComputedStyle(document.querySelector('#room-description')).fontSize,
          missionBeforeArena:document.querySelector('.mission').getBoundingClientRect().top<document.querySelector('#scene').getBoundingClientRect().top,
          camera:[...document.querySelectorAll('.camera-controls button')].map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))}));
        assert.ok(layout.scroll<=width,`${room} overflows at ${width}: ${layout.scroll}`);
        assert.notEqual(layout.principle,'none');assert.ok(layout.missionBeforeArena);
        assert.ok(parseFloat(layout.text)>=14);
        assert.ok(layout.camera.every(box=>box.w>=44&&box.h>=44));
        results.push({room,...layout});
        if([390,1440].includes(width)){
          await page.screenshot({path:path.join(output,`${room}-${width}.png`),fullPage:true});
          await page.screenshot({path:path.join(output,`${room}-${width}-viewport.png`)});
        }
      }
    }

    await page.locator('.rail [data-room="stack"]').click();
    await page.locator('#start-mission').click();
    await page.locator('#controls [data-predict="A"]').click();
    assert.match(await page.locator('.prediction').innerText(),/Belum tepat/);
    await page.locator('#controls [data-predict="D"]').click();
    assert.match(await page.locator('.prediction').innerText(),/Benar. D/);
    assert.notEqual(await page.evaluate(()=>document.activeElement.tagName),'BODY');
    for(let i=0;i<2;i++){
      await page.locator('#controls [data-rack="0"]').click();
      await page.locator('#destination').selectOption('1');
      await page.locator('#controls [data-action="peek"]').click();
      assert.equal(await page.locator('#destination').inputValue(),'1');
      await page.locator('#controls [data-action="transfer"]').click();
    }
    await page.locator('#controls [data-rack="0"]').click();
    await page.locator('#controls [data-action="pop"]').click();
    assert.match(await page.locator('#mission-next').innerText(),/C dari Rak B/);
    for(let i=0;i<2;i++){
      await page.locator('#controls [data-rack="1"]').click();
      await page.locator('#destination').selectOption('0');
      await page.locator('#controls [data-action="transfer"]').click();
    }
    assert.match(await page.locator('#mission-status').innerText(),/Selesai/);
    await page.locator('#reset').click();
    await page.getByRole('button',{name:'Kembali ke eksperimen'}).click();
    await page.waitForFunction(()=>!document.querySelector('#replace-confirm').open);
    assert.match(await page.locator('#mission-status').innerText(),/Selesai/);
    await page.locator('#reset').click();
    await page.getByRole('button',{name:'Ya, ganti skenario'}).click();
    await page.waitForFunction(()=>document.querySelector('#mission-status').textContent==='Siap dicoba');
    assert.equal(await page.locator('#mission-status').innerText(),'Siap dicoba');
    await page.locator('#controls [data-action="pop"]').click();
    await page.locator('#reset').click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#replace-confirm').open);
    assert.match(await page.locator('#controls .control-title').first().innerText(),/top: C/);
    // Capacity drafts and expanded state survive an operation that rebuilds controls.
    await page.locator('.capacity-settings summary').click();
    await page.locator('#max-items').fill('10');
    await page.locator('#controls [data-action="peek"]').click();
    assert.equal(await page.locator('#max-items').inputValue(),'10');
    assert.equal(await page.locator('.capacity-settings').getAttribute('open'),'');
    await page.locator('#destination').selectOption('1');
    await page.locator('#controls [data-rack="1"]').click();
    assert.notEqual(await page.locator('#destination').inputValue(),'');
    assert.notEqual(await page.locator('#destination').inputValue(),'1');
    assert.equal(await page.locator('#max-items').inputValue(),'6');
    await page.locator('#controls [data-rack="0"]').click();
    assert.equal(await page.locator('#max-items').inputValue(),'10');
    assert.equal(await page.locator('#destination').inputValue(),'1');
    await page.locator('#push-form button').click();
    assert.equal(await page.locator('#max-items').inputValue(),'10');
    assert.equal(await page.locator('#destination').inputValue(),'1');

    await page.locator('.rail [data-room="queue"]').click();
    await page.locator('#start-mission').click();
    await page.locator('#register-form button').click();
    await page.locator('#controls [data-action="call"]').click();
    await page.locator('#controls [data-mode="fifo"]').click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#replace-confirm').open);
    assert.match(await page.locator('.service-status').innerText(),/P04/);
    await page.locator('#controls [data-action="next-event"]').click();
    await page.locator('#controls [data-action="call"]').click();
    await page.locator('#controls [data-patient="P01"]').click();
    await page.locator('#controls [data-action="cancel"]').click();
    assert.match(await page.locator('#mission-status').innerText(),/Selesai/);
    await page.locator('#controls [data-action="next-event"]').click();
    await page.locator('#controls [data-action="call"]').click();
    await page.locator('#scene [data-queue="1"][role="button"]').last().focus();
    await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
    const focus=await page.evaluate(()=>({outline:getComputedStyle(document.activeElement).outlineStyle,pressed:document.activeElement.getAttribute('aria-pressed')}));
    assert.equal(focus.outline,'solid');assert.equal(focus.pressed,'true');

    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#controls [data-action="next-event"]').click();
    assert.equal(await page.evaluate(()=>document.getAnimations().length),0);

    const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await touchContext.route('http://strukdat.local/**',serve);
    const touch=await touchContext.newPage();
    touch.on('pageerror',error=>errors.push(error.message));
    await touch.goto('http://strukdat.local/');
    await touch.locator('#scene').scrollIntoViewIfNeeded();
    const session=await touchContext.newCDPSession(touch);
    const swipe=async(from,to)=>{
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x,y:from.y}]});
      for(let i=1;i<=12;i++){
        await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12}]});
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    const floor=await touch.locator('#scene').boundingBox();
    const before=await touch.evaluate(()=>scrollY);
    await swipe({x:floor.x+12,y:floor.y+floor.height*.8},{x:floor.x+12,y:floor.y+floor.height*.3});
    await touch.waitForFunction(y=>scrollY>y+30,before);
    await touch.locator('#scene').scrollIntoViewIfNeeded();
    const box=await touch.locator('#scene [data-item="D"] .box-top').boundingBox();
    const destination=await touch.locator('#scene .rack-base[data-rack="2"] .platform-outline').boundingBox();
    const dragScroll=await touch.evaluate(()=>scrollY);
    await swipe({x:box.x+box.width/2,y:box.y+box.height/2},{x:destination.x+destination.width/2,y:destination.y+destination.height/2});
    await touch.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('Rak A → Bantuan'));
    assert.ok(Math.abs(await touch.evaluate(()=>scrollY)-dragScroll)<10,'drag must not scroll the page');
    assert.equal(await touch.locator('.drag-ghost').count(),0);
    await touch.locator('#reduce-motion').check();
    await touch.locator('[data-quick="transfer"]').click();
    assert.equal(await touch.evaluate(()=>document.getAnimations().length),0);
    await touchContext.close();
    assert.deepEqual(errors,[]);
    await writeFile(path.join(output,'results.json'),JSON.stringify({viewports:results,checks:['responsive','missions-stack-and-queue','stateful-prediction','replacement-cancel-confirm-escape','draft-persistence','svg-keyboard-focus','reduced-motion','synthesized-touch-scroll-and-drag'],errors},null,2));
    console.log(`Browser audit passed: ${results.length} room/viewport combinations, both missions, prediction, replacement, drafts, keyboard focus and reduced motion.`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
