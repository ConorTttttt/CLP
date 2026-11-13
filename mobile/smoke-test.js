#!/usr/bin/env node
/* Optional browser smoke test for the mobile build (needs Playwright + Chromium).
 *   npm run test:mobile-browser
 * Checks, in a phone-sized browser:
 *   - the page opens from a file with no script errors and no network requests,
 *   - nothing overflows sideways at 360 px and 390 px,
 *   - the worked example classifies exactly as on the desktop page,
 *   - the tab bar reaches every section,
 *   - served over http, the service worker keeps the app working offline.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
const check = (name, ok, detail) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !detail ? '' : ' — ' + detail)); if (!ok) failures++; };

async function resultOf(page) {
  return page.evaluate(() => JSON.stringify({ outcomes: last.outcomes.map((o) => o.label), signal: last.label.signal,
    pictograms: last.label.pictograms.map((p) => p.code), h: last.label.hazardStatements.map((x) => x.code),
    p: last.label.precautionaryStatements.map((x) => x.code), warnings: last.warnings.length }));
}

function serve(dir) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const browser = await chromium.launch();
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await phone.newPage();
  const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.locator('#ex').click();
  await page.waitForFunction(() => typeof last !== 'undefined' && last && last.outcomes.length > 0);
  check('opens from a file without errors', errors.length === 0, errors.join(' | '));
  check('makes no network requests', external.length === 0, external.join(' | '));
  check('no Gemini panel', (await page.locator('#aibox').count()) === 0);
  const broken = await page.evaluate(() => [...document.querySelectorAll('#res img')].filter((i) => !i.naturalWidth).length);
  check('pictograms render', broken === 0 && (await page.locator('#res img').count()) > 0);
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('#ingredients-card tr.ing button[data-act="det"]').first().click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('no sideways scrolling at ' + width + ' px (with an ingredient editor open)', overflow <= 0, overflow + ' px');
    await page.locator('#ingredients-card tr.ing button[data-act="det"]').first().click();
  }
  for (const target of ['ingredients-card', 'p28settings', 'results', 'mixture-card']) {
    await page.locator('.m-tabbar a[data-target="' + target + '"]').click();
    // Wait for the smooth scroll to settle (long jumps take a while).
    for (let i = 0, prev = -1; i < 40; i++) {
      await page.waitForTimeout(150);
      const y = await page.evaluate(() => window.scrollY);
      if (y === prev) break;
      prev = y;
    }
    const top = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top, target);
    check('tab bar reaches ' + target, Math.abs(top) < 80, 'top=' + Math.round(top));
  }
  const badge = await page.locator('#m-result-badge').getAttribute('aria-label');
  check('results badge summarises the result', /classification/.test(badge || ''), badge);

  const desktop = await (await browser.newContext()).newPage();
  await desktop.goto('file://' + path.join(ROOT, 'clp_mixture_calculator.html'));
  await desktop.locator('#ex').click();
  await desktop.waitForFunction(() => typeof last !== 'undefined' && last && last.outcomes.length > 0);
  const [a, b] = [await resultOf(desktop), await resultOf(page)];
  check('worked example classifies exactly as on the desktop page', a === b, a + ' vs ' + b);

  const server = await serve(__dirname);
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const app = await browser.newContext({ ...devices['Pixel 7'] });
  const installed = await app.newPage();
  await installed.goto(url);
  await installed.evaluate(() => navigator.serviceWorker.ready);
  await installed.reload();
  await app.setOffline(true);
  await installed.reload();
  await installed.locator('#ex').click();
  const offlineOk = await installed.evaluate(() => typeof last !== 'undefined' && !!last && last.outcomes.length > 0);
  check('works offline after first visit (service worker)', offlineOk);
  server.close();

  await browser.close();
  console.log(failures ? failures + ' check(s) failed' : 'All mobile browser checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
