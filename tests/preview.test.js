/* Command boxes: spacing, keyboard use, live start time; tab icon. Run with: node tests/run.js */

module.exports = async ({ browser, BASE, check }) => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.slice(0, -1) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // No template whitespace inside the boxes: text starts with the command
  await page.goto(BASE + '#w=Odin&e=HW.DT&HW.t=3&HW.st=5&DT.t=4');
  const texts = await page.$$eval('#preview-area .preview-visual', els =>
    els.map(el => [...el.childNodes].filter(n => !(n.classList?.contains('copy-hint'))).map(n => n.textContent).join('')));
  check('every box starts with its text', texts.length > 0 && texts.every(t => t === t.trimStart()), JSON.stringify(texts.map(t => t.slice(0, 12))));
  check('every box ends with its text', texts.every(t => t === t.trimEnd()));
  check('HW box starts with .msh', texts.some(t => t.startsWith('.msh "')));
  check('DT box starts with .sh', texts.some(t => t.startsWith('.sh Odin')));

  // Live start time: the preview's <t:…:R> follows the clock
  const ts = () => page.$eval('#pv-HW .pv-ts', el => parseInt(el.textContent.match(/<t:(\d+):R>/)[1], 10));
  const t1 = await ts();
  check('start time is now + 5 min', Math.abs(t1 - (Date.now() / 1000 + 300)) < 5, String(t1));
  await page.waitForTimeout(2200);
  const t2 = await ts();
  check('start time moves on without edits', t2 - t1 >= 1, `${t1} → ${t2}`);

  // Keyboard: Tab reaches the boxes, Enter copies, Space toggles a pill
  await page.focus('#pv-DT');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('Enter copies a command box', /Copied/.test(await page.textContent('#pv-DT .copy-hint')));
  check('copied text is the command', (await page.evaluate(() => navigator.clipboard.readText())).startsWith('.sh Odin'));
  check('Enter-copy starts the timer', (await page.locator('#timer-list .timer-card').count()) === 1);

  await page.focus('#exp-pills .pill[data-exp="SB"]');
  const scrollBefore = await page.evaluate(() => scrollY);
  await page.keyboard.press(' ');
  check('Space selects an expansion pill', await page.$eval('#exp-pills .pill[data-exp="SB"]', e => e.classList.contains('active')));
  check('Space does not scroll the page', (await page.evaluate(() => scrollY)) === scrollBefore);
  await page.keyboard.press('Enter');
  check('Enter deselects it again', !(await page.$eval('#exp-pills .pill[data-exp="SB"]', e => e.classList.contains('active'))));

  await page.focus('#speed-pills .pill[data-speed="fast"]');
  await page.keyboard.press('Enter');
  check('Enter picks a speed', await page.$eval('#speed-pills .pill[data-speed="fast"]', e => e.classList.contains('active')));

  const tabbable = await page.$$eval('#exp-pills .pill, #speed-pills .pill, .gif-pick, .train-tab, .preview-visual',
    els => els.every(e => e.tabIndex === 0 && e.getAttribute('role') === 'button'));
  check('pills, tabs and boxes are tabbable buttons', tabbable);

  // Train tabs by keyboard
  await page.click('.train-tab-add');
  await page.focus('.train-tab >> nth=0');
  await page.keyboard.press('Enter');
  check('Enter switches train tab', (await page.inputValue('#combo-world .combo-input')) === 'Odin');

  // Typing a space in a text field is unaffected
  await page.fill('#combo-world .combo-input', '');
  await page.focus('#combo-world .combo-input');
  await page.keyboard.type('A B');
  check('space still types in fields', (await page.inputValue('#combo-world .combo-input')) === 'A B');

  // Tab icon
  const icon = await page.$eval('link[rel="icon"]', l => l.href);
  const res = await page.request.get(icon);
  check('tab icon is served', res.ok() && (await res.text()).includes('<svg'));

  check('no page errors', errors.length === 0, errors.join(' / '));
  await ctx.close();
};
