/* GIF link rules and preview. Run with: node tests/run.js */

// [expected verdict, link, hint icon]; 'probably' = rule exists but untested in
// Discord, 'unknown' = no rule. Only 'works' links get a live preview check.
const CASES = [
  ['works', 'https://giphy.com/gifs/BichiMao-bichimao-cutecats-bichi-mao-iY25xIloX4bkwhcJJG', 'ti-check'],
  ['works', 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXQ0eW9semcxMXV5aGl2anlweTZxZjR1cnFjOTd2dXp6aDV4Z3R6dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/iY25xIloX4bkwhcJJG/giphy.gif', 'ti-check'],
  ['works', 'https://giphy.com/gifs/BichiMao-bichimao-cutecats-bichi-mao-46kg3fVOWQB9NZpibk', 'ti-check'],
  ['works', 'https://tenor.com/en-GB/view/pixelplace-gif-24586548', 'ti-check'],
  ['fails', 'https://media1.tenor.com/m/vxq76cN5xyMAAAAC/pixelplace.gif', 'ti-alert-triangle'],
  ['works', 'https://c.tenor.com/vxq76cN5xyMAAAAC/tenor.gif', 'ti-check'],
  ['works', 'https://tenor.com/view/dungeon-meshi-delicious-in-dungeon-laios-marcille-chilchuck-gif-14327501401196912076', 'ti-check'],
  ['works', 'https://i.imgur.com/i2EIwi6.gif', 'ti-check'],
  ['probably', 'https://i.imgur.com/abc1234.gifv', 'ti-check'],
  ['works', 'https://imgur.com/gallery/funny-waving-alien-gif-qT4zfLv#/t/gifs', 'ti-check'],
  ['probably', 'https://cdn.discordapp.com/attachments/111/222/train.gif?ex=1&is=2&hm=3', 'ti-check'],
  ['probably', 'https://example.com/some.gif', 'ti-check'],
  ['unknown', 'https://example.com/some-page', 'ti-help-circle'],
];

module.exports = async ({ browser, BASE, check }) => {
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE);

  async function setGif(url) {
    await page.fill('#gif-url', url);
  }
  async function previewLoaded(timeout = 9000) {
    try {
      await page.waitForFunction(() => {
        const img = document.querySelector('#gif-preview img');
        return document.getElementById('gif-preview').style.display === 'block' && img.complete && img.naturalWidth > 0;
      }, null, { timeout });
      return true;
    } catch { return false; }
  }

  for (const [expect, url, icon] of CASES) {
    await setGif(url);
    const hintIcon = await page.getAttribute('#gif-url-hint i', 'class');
    const text = (await page.innerText('#gif-url-hint')).replace(/\s+/g, ' ');
    check(`${expect.padEnd(8)} verdict  ${url.slice(0, 60)}`, hintIcon.includes(icon), `${hintIcon} | ${text}`);
    if (url.includes('/view/')) {
      const src = await page.getAttribute('#gif-preview iframe', 'src');
      const shown = await page.evaluate(() => document.getElementById('gif-preview').style.display === 'block');
      check(`         player   ${url.slice(0, 60)}`, shown && src.startsWith('https://tenor.com/embed/'), src);
    } else if (expect === 'works' && !url.includes('imgur.com/gallery/')) {   // Imgur pages get no preview
      const ok = await previewLoaded();
      check(`         preview  ${url.slice(0, 60)}`, ok, 'img src=' + await page.getAttribute('#gif-preview img', 'src'));
    }
  }

  // Fix button on a media1.tenor.com link
  await setGif('https://media1.tenor.com/m/vxq76cN5xyMAAAAC/pixelplace.gif');
  await page.click('#gif-url-hint .gif-fix');
  check('fix: media1 → c.tenor.com', (await page.inputValue('#gif-url')) === 'https://c.tenor.com/vxq76cN5xyMAAAAC/tenor.gif');
  check('fix: now verdict works', (await page.getAttribute('#gif-url-hint i', 'class')).includes('ti-check'));
  check('fix: train link uses new link', (await page.evaluate(() => location.hash)).includes('c.tenor.com'));

  // Tenor short link: verdict + no preview, hint tells what to paste
  await setGif('https://tenor.com/reygSVZAanM.gif');
  const shortHint = await page.innerText('#gif-url-hint');
  check('short link: works', shortHint.startsWith('Shows as a GIF') &&(await page.getAttribute('#gif-url-hint i', 'class')).includes('ti-check'), shortHint);

  for (const [typed, plain] of [
    ['https://tenor.com/en-GB/view/pixelplace-gif-24586548', 'https://tenor.com/view/pixelplace-gif-24586548'],
    ['https://www.tenor.com/pt-BR/view/pixelplace-gif-24586548', 'https://tenor.com/view/pixelplace-gif-24586548'],
    ['https://tenor.com/es-419/view/pixelplace-gif-24586548?x=1', 'https://tenor.com/view/pixelplace-gif-24586548?x=1'],
  ]) {
    await setGif(typed);
    const h = await page.innerText('#gif-url-hint');
    check(`auto-removed: ${typed.slice(8, 40)}`, (await page.inputValue('#gif-url')) === plain && h.startsWith('Removed /') && !(await page.$('#gif-url-hint .gif-fix')), (await page.inputValue('#gif-url')) + ' | ' + h);
  }
  await setGif('https://tenor.com/view/pixelplace-gif-24586548');
  check('plain link: no removal note', !(await page.innerText('#gif-url-hint')).startsWith('Removed'));

  // Train link carrying an old /en-GB/ GIF
  await page.goto(BASE + '#w=Odin&gif=' + encodeURIComponent('https://tenor.com/en-GB/view/pixelplace-gif-24586548') + '&e=DT&DT.t=3');
  await page.click('#exp-pills .pill[data-exp="DT"]'); await page.click('#exp-pills .pill[data-exp="DT"]');
  check('train link: GIF cleaned in field + hash', (await page.inputValue('#gif-url')) === 'https://tenor.com/view/pixelplace-gif-24586548'
    && (await page.evaluate(() => decodeURIComponent(location.hash))).includes('gif=https://tenor.com/view/pixelplace'));
  check('train link: command uses plain link', (await page.innerText('#pv-DT')).includes('(https://tenor.com/view/pixelplace-gif-24586548)'));

  // Saved GIF with a language part gets cleaned on load
  await page.evaluate(() => localStorage.setItem('hunt-train-gif-library-v2', JSON.stringify([{ url: 'https://tenor.com/en-GB/view/pixelplace-gif-24586548', label: 'Pixel' }])));
  await page.reload();
  check('saved GIF cleaned on load', (await page.getAttribute('.gif-pick--saved', 'data-url')) === 'https://tenor.com/view/pixelplace-gif-24586548');
  await page.evaluate(() => localStorage.removeItem('hunt-train-gif-library-v2'));
  await page.reload();

  // Saved GIF follows the fix and keeps its name
  await setGif('https://media1.tenor.com/m/xtWCnTFA3cwAAAAC/dungeon-meshi-delicious-in-dungeon.gif');
  await page.fill('#gif-name', 'Dungeon Meshi');
  await page.press('#gif-name', 'Enter');
  await page.click('#gif-url-hint .gif-fix');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hunt-train-gif-library-v2')));
  check('saved GIF moved to working link', saved.length === 1 && saved[0].url === 'https://c.tenor.com/xtWCnTFA3cwAAAAC/tenor.gif' && saved[0].label === 'Dungeon Meshi', JSON.stringify(saved));

  // Switching from a Tenor page to an image link hides the player
  await setGif('https://tenor.com/view/pixelplace-gif-24586548');
  await setGif('https://c.tenor.com/vxq76cN5xyMAAAAC/tenor.gif');
  const ok = await previewLoaded();
  check('player hidden after switching to image', ok && (await page.evaluate(() => document.querySelector('#gif-preview iframe').style.display)) === 'none');
  await setGif('https://tenor.com/view/pixelplace-gif-24586548');
  await page.waitForTimeout(1500);
  check('player still shown after old image events', await page.evaluate(() => document.getElementById('gif-preview').style.display === 'block'));

  await setGif('https://example.com/other.gif');
  check('name field cleared for unsaved link', (await page.inputValue('#gif-name')) === '');

  // Name and link typed into each other's fields
  const LINK = 'https://tenor.com/view/anime-dance-gainax-gif-7624284469323029107';
  await page.evaluate(() => localStorage.removeItem('hunt-train-gif-library-v2'));
  await page.goto(BASE + '#w=Odin&e=DT&DT.t=3');
  await page.reload();
  await setGif('mako fight');
  check('plain name: hint asks for a link', (await page.innerText('#gif-url-hint')).includes('starting with https://'));
  await page.fill('#gif-name', LINK);
  const notLink = await page.innerText('#gif-url-hint');
  await page.press('#gif-name', 'Enter');
  check('non-link is not saved', (await page.locator('.gif-pick--saved').count()) === 0);
  check('non-link left out of command', (await page.innerText('#pv-DT')).includes('Speed: [relaxed]\n'), await page.innerText('#pv-DT'));
  check('hint says it isn\'t a link', notLink.includes("isn't a link") && notLink.includes('GIF name field'), notLink);
  await page.click('#gif-url-hint .gif-fix');
  check('swap puts the link in the link field', (await page.inputValue('#gif-url')) === LINK);
  check('swap puts the name in the name field', (await page.inputValue('#gif-name')) === 'mako fight');
  const lib = await page.evaluate(() => JSON.parse(localStorage.getItem('hunt-train-gif-library-v2')));
  check('swapped GIF saved correctly', lib.length === 1 && lib[0].url === LINK && lib[0].label === 'mako fight', JSON.stringify(lib));
  check('command uses the link', (await page.innerText('#pv-DT')).includes(`(${LINK})`));

  // An entry already saved the wrong way round is repaired on load; junk is dropped
  await page.evaluate(link => localStorage.setItem('hunt-train-gif-library-v2', JSON.stringify([
    { url: 'mako fight', label: link }, { url: 'nonsense', label: 'Junk' },
  ])), LINK);
  await page.reload();
  const pills = await page.$$eval('.gif-pick--saved', els => els.map(e => [e.dataset.url, e.textContent.trim()]));
  check('swapped saved entry repaired, junk dropped', pills.length === 1 && pills[0][0] === LINK && pills[0][1] === 'mako fight', JSON.stringify(pills));
  check('no page errors', errors.length === 0, errors.join(' / '));
};
