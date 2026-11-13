#!/usr/bin/env node
/* Builds the mobile, local-only CLP calculator from the desktop calculator.
 *
 *   node mobile/build.js           write mobile/index.html and mobile/sw.js
 *   node mobile/build.js --check   exit 1 if the committed files are out of date
 *
 * The desktop page clp_mixture_calculator.html stays the single source of truth
 * for the engine and every feature. This script only:
 *   1. removes the optional Gemini panel and its code (no network features),
 *   2. inlines the GHS pictograms so the file works on its own,
 *   3. adds a strict Content-Security-Policy that blocks all network requests,
 *   4. adds the mobile presentation layer (src/mobile.css, src/mobile.js),
 *   5. adds a web app manifest and an offline service worker.
 * Each step must match the source exactly once; otherwise the build fails, so a
 * change to the desktop page can never silently produce a broken mobile build.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'clp_mixture_calculator.html');
const OUT_HTML = path.join(__dirname, 'index.html');
const OUT_SW = path.join(__dirname, 'sw.js');
const PICTOGRAMS = ['GHS01', 'GHS02', 'GHS03', 'GHS04', 'GHS05', 'GHS06', 'GHS07', 'GHS08', 'GHS09'];
const STATIC_FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

const read = (file) => fs.readFileSync(file, 'utf8');
const sha256 = (text, encoding) => crypto.createHash('sha256').update(text, 'utf8').digest(encoding || 'hex');

function replaceOnce(html, find, replacement, what) {
  const count = html.split(find).length - 1;
  if (count !== 1) throw new Error(`mobile build: expected exactly one ${what}, found ${count}. Update mobile/build.js to match the desktop page.`);
  return html.replace(find, () => replacement);
}

function removeBetween(html, start, end, what, keepEnd) {
  const a = html.indexOf(start);
  if (a < 0 || html.indexOf(start, a + 1) >= 0) throw new Error(`mobile build: expected exactly one start of ${what}.`);
  const b = html.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`mobile build: could not find the end of ${what}.`);
  return html.slice(0, a) + html.slice(keepEnd ? b : b + end.length);
}

function build() {
  let html = read(SOURCE);

  // 1. Remove the optional Gemini helpers: markup, then code. The init block that
  //    follows the Gemini code is kept.
  const aiStart = '<details class="ai" id="aibox">';
  const aiBlock = html.slice(html.indexOf(aiStart), html.indexOf('</details>', html.indexOf(aiStart)));
  if (aiBlock.indexOf('<details', 1) >= 0) throw new Error('mobile build: the Gemini panel now contains nested <details>; update the removal step.');
  html = removeBetween(html, aiStart, '</details>', 'the Gemini panel');
  html = removeBetween(html, '/* ---------- optional Gemini ---------- */', '/* ---------- init ---------- */', 'the Gemini script', true);
  html = replaceOnce(html, 'Single file &mdash; no network access except the optional Gemini calls you trigger.',
    'Mobile build &mdash; generated from clp_mixture_calculator.html. Local only: nothing is sent anywhere, and the page is not allowed to make network requests. ' +
    'Formulations are saved only in this browser on this device.', 'footer network statement');

  // 2. Inline the pictograms (data URIs) so the page needs no other files.
  const pictogramMap = {};
  PICTOGRAMS.forEach((code) => {
    const svg = fs.readFileSync(path.join(ROOT, 'pictograms', code + '.svg'));
    pictogramMap[code] = 'data:image/svg+xml;base64,' + svg.toString('base64');
  });
  html = replaceOnce(html, 'src="pictograms/${esc(p.code)}.svg"', 'src="${mobilePictogramSrc(p.code)}"', 'pictogram image path');
  const pictogramScript = '\n/* GHS pictograms inlined by mobile/build.js */\nconst MOBILE_PICTOGRAMS = ' + JSON.stringify(pictogramMap) +
    ';\nfunction mobilePictogramSrc(code) { return MOBILE_PICTOGRAMS[code] || ""; }\n';

  // 3./4. Head: title, viewport, app metadata and the mobile stylesheet.
  html = replaceOnce(html, '<title>CLP Mixture Classification Calculator</title>', '<title>CLP Calculator (mobile)</title>', 'page title');
  html = replaceOnce(html, '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<meta name="theme-color" content="#1565c0">\n' +
    '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
    '<meta name="mobile-web-app-capable" content="yes">\n' +
    '<meta name="apple-mobile-web-app-title" content="CLP Calc">\n' +
    '<meta name="referrer" content="no-referrer">\n' +
    '<link rel="manifest" href="manifest.webmanifest">\n' +
    '<link rel="icon" href="icons/icon.svg" type="image/svg+xml">\n' +
    '<link rel="apple-touch-icon" href="icons/icon-192.png">', 'viewport meta tag');
  html = replaceOnce(html, '</head>', '<style id="mobile-layer">\n' + read(path.join(__dirname, 'src', 'mobile.css')) + '</style>\n</head>', '</head>');
  html = replaceOnce(html, '<span class="sub">EU CLP &middot; Annex I (01.07.2026) &middot; Local and offline &middot; Regulatory review required</span>',
    '<span class="sub">EU CLP &middot; Annex I (01.07.2026) &middot; Regulatory review required<span class="m-local-note">Mobile &middot; local only &middot; works offline</span></span>',
    'header subtitle');

  // Scripts: pictograms first (the calculator uses them), mobile layer last.
  const scriptCount = html.split('<script>').length - 1;
  if (scriptCount !== 2) throw new Error(`mobile build: expected the engine and app <script> blocks (2), found ${scriptCount}.`);
  const firstScript = html.indexOf('<script>');
  html = html.slice(0, firstScript) + '<script>' + pictogramScript + '</script>\n' + html.slice(firstScript);
  html = replaceOnce(html, '</body>', '<script>\n' + read(path.join(__dirname, 'src', 'mobile.js')) + '</script>\n</body>', '</body>');

  // Generated-file notice (after the doctype, which must stay first).
  html = replaceOnce(html, '<!doctype html>\n',
    '<!doctype html>\n<!-- GENERATED FILE: do not edit. Built by mobile/build.js from clp_mixture_calculator.html.\n' +
    '     Change the desktop page or mobile/src/*, then run: npm run build:mobile -->\n', 'doctype line');

  // 3. Content-Security-Policy: only this page's own inline scripts (by hash) may
  //    run, and no network connection of any kind is allowed.
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if ([...html.matchAll(/<script\b/g)].length !== scripts.length) throw new Error('mobile build: found a <script> with attributes; only inline scripts are allowed.');
  const hashes = scripts.map((s) => `'sha256-${sha256(s, 'base64')}'`).join(' ');
  const csp = ["default-src 'none'", `script-src ${hashes}`, "style-src 'unsafe-inline'", "img-src 'self' data: blob:",
    "connect-src 'none'", "font-src 'none'", "object-src 'none'", "frame-src 'none'", "base-uri 'none'", "form-action 'none'",
    "manifest-src 'self'", "worker-src 'self'"].join('; ');
  html = replaceOnce(html, '<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`, 'charset meta tag');

  // 5. Service worker: cache name changes whenever the page changes.
  const version = sha256(html).slice(0, 12);
  const sw = `/* GENERATED by mobile/build.js — do not edit. Offline cache for the mobile CLP calculator.
   It only caches this app's own files; it never contacts any other site. */
'use strict';
const CACHE = 'clp-mobile-${version}';
const FILES = ${JSON.stringify(STATIC_FILES)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith('clp-mobile-') && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Cache first: the app works with no connection. A new build installs a new cache.
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)));
});
`;
  return { html, sw, version };
}

if (require.main === module) {
  const { html, sw, version } = build();
  if (process.argv.includes('--check')) {
    const stale = [[OUT_HTML, html], [OUT_SW, sw]].filter(([file, text]) => !fs.existsSync(file) || read(file) !== text);
    if (stale.length) {
      console.error('Mobile build is out of date: ' + stale.map(([f]) => path.relative(ROOT, f)).join(', ') + '. Run: npm run build:mobile');
      process.exit(1);
    }
    console.log('Mobile build is up to date (' + version + ').');
  } else {
    fs.writeFileSync(OUT_HTML, html);
    fs.writeFileSync(OUT_SW, sw);
    console.log('Wrote mobile/index.html (' + Math.round(html.length / 1024) + ' KB) and mobile/sw.js, version ' + version + '.');
  }
}

module.exports = { build, PICTOGRAMS };
