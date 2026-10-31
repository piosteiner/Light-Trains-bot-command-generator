/* Copy failures, stale timers, phone layout. Run with: node tests/run.js */

module.exports = async ({ browser, BASE, check }) => {
  const fakeSpeech = () => {
    const fake = { speak() {}, cancel() {}, getVoices: () => [] };
    Object.defineProperty(window, 'speechSynthesis', { value: fake });
  };

  // 1. Clipboard blocked: both the API and execCommand fail
  {
    const ctx = await browser.newContext();
    await ctx.addInitScript(fakeSpeech);
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
      document.execCommand = () => false;
    });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE + '#w=Phoenix&e=DT&DT.t=5');
    await page.click('#pv-DT');
    await page.waitForTimeout(200);
    check('failed copy shows message', /Copy failed/.test(await page.textContent('#pv-DT .copy-hint')));
    check('failed copy is marked red', await page.$eval('#pv-DT', e => e.classList.contains('blocked')));
    check('failed copy starts no timer', (await page.locator('#timer-list .timer-card').count()) === 0);
    await page.click('#train-copy-link');
    await page.waitForTimeout(100);
    check('copy link reports failure', /Copy failed/.test(await page.textContent('#train-copy-link')));
    check('no page errors (blocked)', errors.length === 0, errors.join(' / '));
    await ctx.close();
  }

  // 2. Clipboard API missing, execCommand fallback works
  {
    const ctx = await browser.newContext();
    await ctx.addInitScript(fakeSpeech);
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
      window.__copied = [];
      document.execCommand = () => { window.__copied.push(document.activeElement.value); return true; };
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '#w=Phoenix&e=DT&DT.t=5');
    await page.click('#pv-DT');
    await page.waitForTimeout(200);
    check('fallback copy succeeds', /Copied/.test(await page.textContent('#pv-DT .copy-hint')));
    check('fallback copied the command', (await page.evaluate(() => window.__copied[0] || '')).length > 10);
    check('fallback copy starts timer', (await page.locator('#timer-list .timer-card').count()) === 1);
    await ctx.close();
  }

  // 3. Stale timers: dropped on reload, and while ticking
  {
    const ctx = await browser.newContext();
    await ctx.addInitScript(fakeSpeech);
    const page = await ctx.newPage();
    await page.goto(BASE + '#w=Phoenix&e=DT&DT.t=5');
    const id = await page.evaluate(() => JSON.parse(localStorage.getItem('hunt-train-trains-v1')).trains[0].id);
    const save = (overSecs) => page.evaluate(([id, over]) => localStorage.setItem('hunt-train-timers-v1', JSON.stringify([
      { id, label: 'Phoenix · DT', spoken: 'Phoenix', duration: 630, accumulatedMs: 0,
        runStartTs: Date.now() - (630 + over) * 1000, running: true },
    ])), [id, overSecs]);
    await save(3 * 3600);
    await page.reload();
    check('timer 3h over is dropped on load', (await page.locator('#timer-list .timer-card').count()) === 0);
    await save(3600);
    await page.reload();
    check('timer 1h over is kept', (await page.locator('#timer-list .timer-card').count()) === 1);
    await page.evaluate(() => { const real = Date.now; Date.now = () => real() + 2 * 3600 * 1000; });
    await page.waitForTimeout(600);
    check('timer dropped once it passes 2h over', (await page.locator('#timer-list .timer-card').count()) === 0);
    check('tab badge cleared', (await page.locator('.train-tab-timer:not(:empty)').count()) === 0);
    await ctx.close();
  }

  // 4. Phone layout
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.slice(0, -1) });
    await ctx.addInitScript(fakeSpeech);
    const page = await ctx.newPage();
    page.on('dialog', d => d.accept());
    await page.goto(BASE + '#w=Phoenix&e=DT&DT.t=5');
    await page.click('#pv-DT');
    await page.waitForTimeout(150);   // the timer starts once the copy is confirmed
    await page.click('.train-tab-add');
    await page.goto(BASE + '#w=Odin&e=HW&HW.t=3&HW.st=5');
    await page.click('#pv-HW');
    await page.waitForTimeout(150);   // the timer starts once the copy is confirmed
    const dock = await page.$eval('#timer-dock', e => e.getBoundingClientRect().height);
    check('collapsed dock is a short bar', dock < 70, `height ${dock}`);
    check('panel hidden while collapsed', await page.$eval('#timer-panel', e => getComputedStyle(e).display === 'none'));
    const times = await page.locator('.timer-card .timer-display').allTextContents();
    check('two chips with times', times.length === 2 && times.every(t => /\d\d:\d\d/.test(t)), JSON.stringify(times));
    await page.click('#timer-toggle');
    check('expanded shows panel', await page.$eval('#timer-panel', e => getComputedStyle(e).display !== 'none'));
    check('expanded shows card buttons', await page.locator('.timer-card [data-act="pause"]').first().isVisible());
    await page.click('#timer-toggle');
    check('collapses again', await page.$eval('#timer-panel', e => getComputedStyle(e).display === 'none'));
    check('no horizontal page scroll', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await ctx.close();

    const dctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await dctx.addInitScript(fakeSpeech);
    const dp = await dctx.newPage();
    await dp.goto(BASE);
    check('toggle hidden on desktop', await dp.$eval('#timer-toggle', e => getComputedStyle(e).display === 'none'));
    check('panel shown on desktop', await dp.$eval('#timer-panel', e => getComputedStyle(e).display !== 'none'));
    await dctx.close();
  }
};
