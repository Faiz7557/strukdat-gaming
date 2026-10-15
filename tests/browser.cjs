const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Use the already installed Playwright package; do not install a new dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: {width:1440,height:1100}, deviceScaleFactor:1 });
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let touchPage=null;
  const acceptReplacement=async target=>{
    if(await target.locator('#replace-confirm').isVisible()){
      await target.getByRole('button',{name:'Ya, ganti skenario'}).click();
      await target.locator('#replace-confirm').waitFor({state:'hidden'});
    }
  };
  const reset=async target=>{
    await target.locator('#reset').click();await acceptReplacement(target);
    await target.waitForFunction(()=>document.querySelector('#mission-status').textContent==='Siap dicoba');
  };
  const screenshots=path.join(__dirname,'..','screenshots');fs.mkdirSync(screenshots,{recursive:true});
  try {
    await page.goto(process.env.LAB_URL || 'http://127.0.0.1:5174');await page.waitForLoadState('networkidle');
    assert.equal((await page.request.get(new URL('/README.md',page.url()).href)).status(),404);
    assert.equal((await page.request.head(new URL('/model.js',page.url()).href)).status(),200);
    assert.equal((await page.request.post(new URL('/app.js',page.url()).href)).status(),404);
    assert.equal(await page.title(),'Strukdat Gaming');
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>document.fonts.check('500 16px Ubuntu')),true);
    assert.deepEqual(await page.evaluate(()=>['--indigo','--blue','--cyan','--teal'].map(name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim())),['#2f39a9','#2e6fa0','#49a4bb','#15d8b3']);
    assert.equal(await page.locator('#nodes .node').count(),4);
    await page.screenshot({path:path.join(screenshots,'stack-desktop.png'),fullPage:true});
    for(const width of [605,820,320]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.locator('#quick-actions').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      for(const button of await page.locator('.camera-controls button, #quick-actions button').all()) {
        const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);
      }
      const hint=await page.locator('#scene-hint').boundingBox(),camera=await page.locator('.camera-controls').boundingBox(),world=await page.locator('#scene').boundingBox();
      assert.ok(hint.y>=world.y+world.height-1);assert.ok(camera.y>=hint.y+hint.height);
      if(width===605)await page.screenshot({path:path.join(screenshots,'stack-panel.png'),fullPage:true});
    }
    await page.locator('[data-quick="peek"]').click();assert.match(await page.locator('#feedback').innerText(),/peek\(\) → D/);
    await page.setViewportSize({width:1440,height:1100});
    assert.equal(await page.locator('#quick-actions').isVisible(),true);
    await page.locator('#item-name').fill('Nama tersimpan');await page.locator('#controls [data-rack="1"]').click();
    assert.equal(await page.locator('#item-name').inputValue(),'Nama tersimpan');
    await page.locator('#controls [data-rack="0"]').click();
    const position=async(locator,height=.5)=>{const b=await locator.boundingBox();assert.ok(b);return {x:b.x+b.width/2,y:b.y+b.height*height};};
    const mouseDrag=async(id,destination)=>{
      await page.locator('#scene').scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>document.getAnimations().every(animation=>animation.playState!=='running'));
      const from=await position(page.locator(`#scene [data-item="${id}"]`),.82);
      const to=await position(page.locator(`#scene .rack-base[data-rack="${destination}"]`));
      await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();
    };
    await mouseDrag('D',2);
    assert.equal(await page.locator('#scene [data-item="D"]').getAttribute('data-rack'),'2');
    assert.deepEqual(await page.locator('#nodes .node-data').allTextContents(),['D']);
    await reset(page);
    await page.locator('#controls [data-rack="2"]').click();await page.locator('.capacity-settings summary').click();
    await page.locator('#max-weight').fill('1');await page.locator('#capacity-form button').click();
    await mouseDrag('D',2);
    assert.match(await page.locator('#feedback').innerText(),/Kapasitas/);
    assert.equal(await page.locator('#scene [data-item="D"]').getAttribute('data-rack'),'0');
    await mouseDrag('C',2);
    assert.match(await page.locator('#feedback').innerText(),/tertimbun/);
    assert.equal(await page.locator('#scene [data-item="C"]').getAttribute('data-rack'),'0');
    await reset(page);
    await page.locator('#zoom-in').click();assert.equal(await page.locator('#zoom-level').innerText(),'120%');
    await page.locator('#focus-object').click();assert.equal(await page.locator('#focus-object').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#zoom-level').innerText(),'140%');
    await page.locator('#reset-camera').click();assert.equal(await page.locator('#zoom-level').innerText(),'100%');
    await page.locator('#start-mission').click();await acceptReplacement(page);await page.waitForFunction(()=>document.querySelector('#mission-status').textContent==='Sedang berjalan');await page.locator('[data-predict="D"]').click();
    for(let i=0;i<2;i++) {
      await page.locator('#controls [data-rack="0"]').click();
      await page.locator('#destination').selectOption('2');await page.locator('[data-action="transfer"]').click();
    }
    await page.locator('#controls [data-rack="0"]').click();await page.locator('[data-action="pop"]').click();
    assert.match(await page.locator('#feedback').innerText(),/pop\(\) → B/);
    for(let i=0;i<2;i++) {
      await page.locator('#controls [data-rack="2"]').click();
      await page.locator('#destination').selectOption('0');await page.locator('[data-action="transfer"]').click();
    }
    assert.equal(await page.locator('#mission-status').innerText(),'Selesai ✓');
    assert.equal(await page.locator('#mission-score').innerText(),'1 / 2 misi');
    assert.deepEqual(await page.locator('#nodes .node-data').allTextContents(),['D','C','A']);
    await page.locator('#item-weight').fill('31');await page.locator('#push-form .primary').click();
    assert.match(await page.locator('#feedback').innerText(),/Kapasitas/);
    assert.equal(await page.locator('#nodes .node').count(),3);
    await page.locator('#item-weight').fill('1');await page.locator('#item-id').fill('<X>');
    await page.locator('#item-name').fill('<img src=x onerror=alert(1)>');await page.locator('#push-form .primary').click();
    assert.equal(await page.locator('#nodes .node-data').first().innerText(),'<X>');
    assert.equal(await page.locator('#controls img').count(),0);
    await page.locator('#trace-next').click();assert.match(await page.locator('#trace-position').innerText(),/2 \/ 4/);
    await page.locator('#help').click();assert.equal(await page.locator('#guide').isVisible(),true);await page.locator('#close-guide').click();
    await page.locator('[data-room="queue"]:visible').first().click();
    await page.waitForFunction(()=>document.getAnimations().every(animation=>animation.playState!=='running'));
    await page.screenshot({path:path.join(screenshots,'queue-desktop.png'),fullPage:true});
    await page.locator('#start-mission').click();await acceptReplacement(page);await page.waitForFunction(()=>document.querySelector('#mission-status').textContent==='Sedang berjalan');
    await page.locator('#register-form .primary').click();await page.locator('[data-predict="P04"]').click();
    await page.locator('[data-action="call"]').click();assert.match(await page.locator('.service-status').innerText(),/P04/);
    assert.equal(await page.locator('[data-action="call"]').isDisabled(),true);
    await page.locator('[data-action="next-event"]').click();
    await page.locator('[data-action="call"]').click();assert.match(await page.locator('.service-status').innerText(),/P02/);
    await page.locator('#controls [data-patient="P01"]').click();await page.locator('[data-action="cancel"]').click();
    assert.equal(await page.locator('#mission-status').innerText(),'Selesai ✓');
    assert.equal(await page.locator('#mission-score').innerText(),'2 / 2 misi');
    assert.deepEqual(await page.locator('.report strong').allTextContents(),['1','1','1']);
    await page.locator('[data-mode="fifo"]').click();await acceptReplacement(page);await page.waitForFunction(()=>document.querySelector('[data-mode="fifo"]').getAttribute('aria-pressed')==='true');await page.locator('[data-action="call"]').click();
    assert.match(await page.locator('.service-status').innerText(),/P01/);
    await page.locator('#reduce-motion').check();assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('reduced-motion')),true);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await page.screenshot({path:path.join(screenshots,'queue-mobile.png'),fullPage:true});
    await page.locator('[data-room="stack"]:visible').first().click();await reset(page);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await page.screenshot({path:path.join(screenshots,'stack-mobile.png'),fullPage:true});
    await page.locator('#destination').selectOption('1');
    assert.match(await page.locator('[data-quick="transfer"]').innerText(),/Rak B/);
    await page.locator('[data-quick="transfer"]').click();
    assert.equal(await page.locator('#scene [data-item="D"]').getAttribute('data-rack'),'1');
    await page.locator('[data-quick="peek"]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.quick),'peek');
    await reset(page);
    await page.locator('#controls [data-rack="2"]').click();await page.locator('[data-action="pop"]').click();
    assert.match(await page.locator('#feedback').innerText(),/Underflow/);
    assert.match(await page.locator('#nodes').innerText(),/top → None/);
    await page.locator('[data-action="peek"]').click();
    await page.locator('#trace-next').click();await page.locator('#trace-next').click();
    assert.match(await page.locator('#code .active').innerText(),/return None/);
    assert.equal(await page.locator('#trace-next').isDisabled(),true);
    await page.clock.install();await page.locator('#trace-play').click();await page.clock.runFor(1200);
    assert.equal(await page.locator('#trace-position').innerText(),'2 / 3');
    await page.locator('#trace-play').click();await page.clock.runFor(2400);
    assert.equal(await page.locator('#trace-position').innerText(),'2 / 3');
    await page.setViewportSize({width:1440,height:1100});
    const svgTarget=page.locator('#scene [data-rack="0"]').first();await svgTarget.focus();await page.keyboard.press('Enter');
    assert.match(await page.locator('#structure-label').innerText(),/Rak A/);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#push-form .primary').click();
    assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
    touchPage=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    touchPage.on('pageerror',error=>errors.push(error.message));
    await touchPage.goto(process.env.LAB_URL||'http://127.0.0.1:5174');await touchPage.waitForLoadState('networkidle');
    await touchPage.evaluate(()=>document.fonts.ready);
    const session=await touchPage.context().newCDPSession(touchPage);
    await touchPage.locator('#scene').scrollIntoViewIfNeeded();
    const touchFrom=await position(touchPage.locator('#scene [data-item="D"]'),.82);
    const touchTo=await position(touchPage.locator('#scene .rack-base[data-rack="2"]'));
    assert.equal(await touchPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touchFrom,id:1}]});
    for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchFrom.x+(touchTo.x-touchFrom.x)*i/10,y:touchFrom.y+(touchTo.y-touchFrom.y)*i/10,id:1}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await touchPage.locator('#scene [data-item="D"]').getAttribute('data-rack'),'2');
    await reset(touchPage);
    await touchPage.locator('#scene').scrollIntoViewIfNeeded();
    const cancelFrom=await position(touchPage.locator('#scene [data-item="D"]'),.82);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...cancelFrom,id:1}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cancelFrom.x+30,y:cancelFrom.y+10,id:1}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert.equal(await touchPage.locator('#scene [data-item="D"]').getAttribute('data-rack'),'0');
    assert.equal(await touchPage.locator('.drag-ghost').count(),0);
    await touchPage.close();touchPage=null;
    assert.deepEqual(errors,[]);
    console.log('PASS: palette, local font, drafts, mouse/touch drag, failed/cancelled drag safety, camera, mission rewards, Stack/Queue missions, capacity, escaped input, trace, guide, reports, FIFO, mobile, underflow, keyboard, reduced motion, and no browser errors.');
  } catch(error) {
    console.error('Original browser failure:',error);
    if(touchPage&&!touchPage.isClosed()){
      console.error('Touch state:',await touchPage.evaluate(()=>({url:location.href,title:document.title,room:document.querySelector('h1')?.textContent,ids:[...document.querySelectorAll('[data-item]')].map(el=>el.dataset.item),feedback:document.querySelector('#feedback')?.textContent,body:document.body.innerText.slice(0,250),scrollY,innerWidth,scale:visualViewport.scale})));
      await touchPage.screenshot({path:path.join(screenshots,'touch-failure.png'),fullPage:true});
    }
    console.error('Feedback:',await page.evaluate(()=>document.querySelector('#feedback')?.innerText??'(page not ready)'));
    console.error('Form validity:',await page.locator('form input').evaluateAll(inputs=>inputs.filter(input=>!input.validity.valid).map(input=>({id:input.id,value:input.value,message:input.validationMessage}))));
    await page.screenshot({path:path.join(screenshots,'failure.png'),fullPage:true});throw error;
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
