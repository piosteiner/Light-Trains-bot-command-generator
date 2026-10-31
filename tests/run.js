/* Browser tests for the site. Serves the repo on a local port, opens it in a
   headless browser and runs every tests/*.test.js (or the ones named):

     cd tests && npm install        (once; installs playwright-core only)
     node tests/run.js              all suites
     node tests/run.js timers gif   only those

   Uses the installed Microsoft Edge; set BROWSER=chrome to use Chrome instead.
   The GIF suite loads real GIFs from Giphy and Tenor, so it needs internet. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT  = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  const only  = process.argv.slice(2);
  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js'))
    .filter(f => !only.length || only.some(o => f.startsWith(o)));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE    = `http://localhost:${server.address().port}/`;
  const channel = process.env.BROWSER === 'chrome' ? 'chrome' : 'msedge';
  const browser = await chromium.launch({ channel, headless: true });

  let failed = 0, passed = 0;
  for (const file of files) {
    console.log(`\n── ${file}`);
    const check = (name, cond, extra = '') => {
      console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`);
      cond ? passed++ : failed++;
    };
    try {
      await require(path.join(__dirname, file))({ browser, BASE, check });
    } catch (e) {
      check(`${file} ran to the end`, false, e.message);
    }
  }

  await browser.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
