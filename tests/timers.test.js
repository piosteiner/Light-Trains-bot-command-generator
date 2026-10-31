/* Per-train countdown timers. Run with: node tests/run.js */

module.exports = async ({ browser, BASE, check }) => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.slice(0, -1) });
  // Record spoken cues instead of speaking them
  await ctx.addInitScript(() => {
    window.__spoken = [];
    const fake = { speak: u => window.__spoken.push(u.text), cancel() {}, getVoices: () => [] };
    Object.defineProperty(window, 'speechSynthesis', { value: fake });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());

  const cards  = () => page.locator('#timer-list .timer-card');
  const cardOf = name => cards().filter({ hasText: name });

  // Train 1: Phoenix DT, copy main command → its timer starts at 10:30
  await page.goto(BASE + '#w=Phoenix&e=DT&DT.t=5');
  check('no timer cards at start', (await cards().count()) === 0);
  check('settings panel names current train', (await page.textContent('#timer-title')) === 'Phoenix · DT');
  await page.click('#pv-DT');
  await page.waitForTimeout(150);   // the timer starts once the copy is confirmed
  check('copy starts Phoenix timer', (await cards().count()) === 1 && /Phoenix · DT/i.test(await cards().first().innerText()));
  check('Phoenix timer ~10:30', /10:(30|29|28)/.test(await cards().first().locator('.timer-display').textContent()));
  check('Phoenix card is current', await cards().first().evaluate(c => c.classList.contains('current')));
  check('tab badge shows time', /10:(30|29|28)/.test(await page.locator('.train-tab.active .train-tab-timer').textContent()));

  // Train 2: Odin HW (pre-ShB, 5 min)
  await page.click('.train-tab-add');
  await page.goto(BASE + '#w=Odin&e=HW&HW.t=3&HW.st=5');
  check('second tab opened', (await page.locator('.train-tab').count()) === 2);
  await page.click('#pv-HW');
  await page.waitForTimeout(150);   // the timer starts once the copy is confirmed
  check('two timer cards', (await cards().count()) === 2);
  check('Odin timer ~5:00', /0?(5:00|4:59|4:58)/.test(await cardOf('Odin').locator('.timer-display').textContent()));
  check('Phoenix timer still running', /10:\d\d|09:5\d/.test(await cardOf('Phoenix').locator('.timer-display').textContent()));
  check('Odin is current, Phoenix not', await cardOf('Odin').evaluate(c => c.classList.contains('current'))
    && !(await cardOf('Phoenix').evaluate(c => c.classList.contains('current'))));
  const spoken = await page.evaluate(() => window.__spoken);
  check('start cue names train when 2 timers', spoken.some(t => t.startsWith('Odin: Start: 5 minutes')), JSON.stringify(spoken));
  check('first start cue unprefixed', spoken[0] === 'Start: 10 minutes 30', JSON.stringify(spoken));
  check('both tabs show badges', (await page.locator('.train-tab-timer:not(:empty)').count()) === 2);

  // Pause Phoenix from its card
  await cardOf('Phoenix').locator('[data-act="pause"]').click();
  const p1 = await cardOf('Phoenix').locator('.timer-display').textContent();
  await page.waitForTimeout(1300);
  check('paused Phoenix does not count', (await cardOf('Phoenix').locator('.timer-display').textContent()) === p1);
  check('paused badge class', await page.locator('.train-tab-timer.paused').count() === 1);

  // Card name switches tab
  await cardOf('Phoenix').locator('.timer-name').click();
  check('card name opens Phoenix tab', (await page.inputValue('#combo-world .combo-input')) === 'Phoenix');
  check('Phoenix card now current', await cardOf('Phoenix').evaluate(c => c.classList.contains('current')));

  // Manual start from the settings panel acts on the current train
  await page.fill('#timer-set', '2:00');
  await page.click('#timer-apply');
  check('manual start restarts current train only', /0?2:00|01:59/.test(await cardOf('Phoenix').locator('.timer-display').textContent())
    && (await cards().count()) === 2);

  // Reload keeps both timers
  const before = await cardOf('Odin').locator('.timer-display').textContent();
  await page.reload();
  check('timers survive reload', (await cards().count()) === 2);
  check('Odin kept counting through reload', (await cardOf('Odin').locator('.timer-display').textContent()) <= before);
  await page.evaluate(() => { window.__spoken.length = 0; });
  await page.waitForTimeout(1200);
  check('no cue burst after reload', (await page.evaluate(() => window.__spoken.length)) === 0, JSON.stringify(await page.evaluate(() => window.__spoken)));

  // Renaming the train renames its card
  await page.fill('#combo-world .combo-input', 'Lich');
  await page.press('#combo-world .combo-input', 'Enter');
  check('card follows train rename', (await cardOf('Lich').count()) === 1 && (await cardOf('Phoenix').count()) === 0);

  // Overtime: start Odin with a 1-second timer via the store, then check overtime
  await cardOf('Odin').locator('.timer-name').click();
  await page.fill('#timer-set', '1');   // "1" = 1 minute; use seconds form instead
  await page.evaluate(() => TrainTimers.start(document.querySelector('.train-tab.active .train-tab-timer').dataset.trainId, 1, 'Odin · HW', 'Odin'));
  await page.waitForTimeout(2300);
  check('overtime card', await cardOf('Odin').evaluate(c => c.classList.contains('overtime')));
  check('overtime shows +', (await cardOf('Odin').locator('.timer-display').textContent()).startsWith('+'));
  check('overtime cue named', (await page.evaluate(() => window.__spoken)).includes('Odin: Train starts now'));

  // Dismiss a card
  await cardOf('Odin').locator('[data-act="close"]').click();
  check('dismiss removes card and badge', (await cards().count()) === 1 && (await page.locator('.train-tab-timer:not(:empty)').count()) === 1);

  // Closing a tab removes its timer
  const lichIdx = await page.evaluate(() => [...document.querySelectorAll('.train-tab')].findIndex(t => t.textContent.includes('Lich')));
  await page.locator('.train-tab-close').nth(lichIdx).click();
  check('closing tab removes its timer', (await cards().count()) === 0);
  check('saved timers empty', (await page.evaluate(() => JSON.parse(localStorage.getItem('hunt-train-timers-v1')).length)) === 0);

  // Old saved-tabs format (bare strings) still loads
  await page.evaluate(() => localStorage.setItem('hunt-train-trains-v1', JSON.stringify({ trains: ['w=Zodiark&e=EW', 'w=Alpha'], active: 1 })));
  await page.goto(BASE);
  await page.reload();
  check('old saved format migrates', (await page.locator('.train-tab').count()) === 2 && (await page.inputValue('#combo-world .combo-input')) === 'Alpha');

  // Panel can be hidden and comes back on a new timer
  await page.click('#timer-close');
  check('panel hides', await page.$eval('#timer-panel', e => getComputedStyle(e).display === 'none'));
  await page.goto(BASE + '#w=Alpha&e=EW&EW.t=1');
  await page.click('#pv-EW');
  await page.waitForTimeout(150);   // the timer starts once the copy is confirmed
  check('panel returns on timer start', await page.$eval('#timer-panel', e => getComputedStyle(e).display !== 'none'));

  check('no page errors', errors.length === 0, errors.join(' / '));
};
