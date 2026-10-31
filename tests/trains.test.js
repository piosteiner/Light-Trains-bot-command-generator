/* Train tabs, links and merged mode. Run with: node tests/run.js */

module.exports = async ({ browser, BASE, check }) => {
  const ctx = await browser.newContext();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.slice(0, -1) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());

  await page.goto(BASE);
  check('blank load: no hash', (await page.evaluate(() => location.hash)) === '');
  check('blank load: one tab "New train"', (await page.locator('.train-tab').allTextContents()).map(s => s.trim()).join('|') === 'New train');

  // Fill a two-expansion train
  await page.fill('#combo-world .combo-input', 'Phoenix');
  await page.press('#combo-world .combo-input', 'Enter');
  await page.click('#exp-pills .pill[data-exp="ShB"]');
  await page.click('#exp-pills .pill[data-exp="DT"]');
  await page.fill('#tgt-ShB', '8');
  await page.fill('#scouts-ShB', 'Ceri Aphelia');
  await page.fill('#tgt-DT', '15');   // clamps to 12
  await page.fill('#cmsg-DT', 'Mount up & go!');
  await page.click('#speed-pills .pill[data-speed="fast"]');
  const hash1 = await page.evaluate(() => location.hash);
  check('hash has world/exps/fields', hash1.includes('w=Phoenix') && hash1.includes('e=ShB.DT') && hash1.includes('ShB.t=8') && hash1.includes('DT.t=12') && hash1.includes('sp=fast') && hash1.includes('ShB.sc=Ceri+Aphelia'));
  check('tab label', (await page.locator('.train-tab.active').textContent()).trim() === 'Phoenix · ShB > DT');

  // Fresh browser profile opening the link
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  page2.on('pageerror', e => errors.push(e.message));
  await page2.goto(BASE + hash1);
  check('link restores world', (await page2.inputValue('#combo-world .combo-input')) === 'Phoenix');
  check('link restores targets', (await page2.inputValue('#tgt-ShB')) === '8' && (await page2.inputValue('#tgt-DT')) === '12');
  check('link restores custom msg', (await page2.inputValue('#cmsg-DT')) === 'Mount up & go!');
  check('link restores speed', (await page2.locator('#speed-pills .pill.active').getAttribute('data-speed')) === 'fast');
  check('link restores map', (await page2.inputValue('#combo-map-ShB .combo-input')) === 'Lakeland');
  check('hash is stable after load', (await page2.evaluate(() => location.hash)) === hash1);
  const pvA = await page.locator('#pv-ShB').innerText();
  const pvB = await page2.locator('#pv-ShB').innerText();
  check('same command in both browsers', pvA === pvB);
  await ctx2.close();

  // Reload keeps the train
  await page.reload();
  check('reload keeps train', (await page.inputValue('#scouts-ShB')) === 'Ceri Aphelia');

  // Second tab
  await page.click('.train-tab-add');
  check('new tab is blank', (await page.evaluate(() => location.hash)) === '' && (await page.inputValue('#combo-world .combo-input')) === '');
  await page.fill('#combo-world .combo-input', 'Odin');
  await page.press('#combo-world .combo-input', 'Enter');
  await page.click('#exp-pills .pill[data-exp="EW"]');
  check('two tabs', (await page.locator('.train-tab').count()) === 2);
  await page.locator('.train-tab').nth(0).click();
  check('switch back restores tab 1', (await page.evaluate(() => location.hash)) === hash1 && (await page.inputValue('#tgt-ShB')) === '8');
  await page.locator('.train-tab').nth(1).click();
  check('tab 2 restored', (await page.inputValue('#combo-world .combo-input')) === 'Odin' && (await page.locator('#exp-pills .pill.active').count()) === 1);

  // Duplicate, then close it
  await page.click('#train-duplicate');
  check('duplicate opens third tab', (await page.locator('.train-tab').count()) === 3);
  await page.locator('.train-tab-close').nth(2).click();
  check('close tab', (await page.locator('.train-tab').count()) === 2);

  // Copy link
  await page.click('#train-copy-link');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check('copy link = current URL', clip === await page.evaluate(() => location.href));

  // Merged train starting on ARR
  await page.goto(BASE + '#w=Odin&e=ARR.ShB&nb=1&ARR.t=5&ARR.max=14&ARR.i=2&ARR.st=7&ShB.t=6');
  check('merged ARR-first link opens in new tab', (await page.locator('.train-tab').count()) === 3);
  const merged = await page.locator('#pv-merged').innerText();
  check('merged ARR-first uses .msh + timestamp', /\.msh "\s*On Odin at .* - .*\(Instance 2\) in <t:\d+:R>/.test(merged), merged);
  const cwl = await page.locator('#pvc-merged').innerText();
  check('merged CWLS uses 7min + instance', cwl.includes('in 7min') && cwl.includes('(Instance 2)'), cwl);
  check('merged scouts uses /msh', (await page.locator('#pvs-merged').innerText()).includes('/msh This train'));
  await page.click('#pv-merged');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  check('copied merged starts with .msh', copied.startsWith('.msh "On **Odin** at'), copied);
  check('timer named after train', (await page.textContent('#timer-title')) === 'Odin · ARR > ShB');
  check('timer at 7 min', /0?7:0\d|06:5\d/.test(await page.textContent('.timer-card.current .timer-display')));

  // Merged ShB-first unchanged
  await page.goto(BASE + '#w=Odin&e=ShB.EW&nb=1&ShB.t=5&EW.t=6');
  check('merged ShB-first still .sh', (await page.locator('#pv-merged').innerText()).includes('.sh Odin "'));

  // Clear
  await page.click('#train-clear');
  check('clear empties hash', (await page.evaluate(() => location.hash)) === '');

  // Pasted link while page is open (hashchange)
  await page.evaluate(() => { location.hash = 'w=Lich&e=DT&DT.t=3'; });
  await page.waitForTimeout(200);
  check('hashchange loads link into blank tab', (await page.inputValue('#combo-world .combo-input')) === 'Lich' && (await page.inputValue('#tgt-DT')) === '3');

  check('no page errors', errors.length === 0, errors.join(' / '));
};
