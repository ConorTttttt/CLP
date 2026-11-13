// Keeps the mobile build in step with the desktop calculator and local-only.
// Run from the repository root: node verification/test_mobile_build.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { build, PICTOGRAMS } = require('../mobile/build.js');

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL: ' + name); } };

const ROOT = path.resolve(__dirname, '..');
const desktop = fs.readFileSync(path.join(ROOT, 'clp_mixture_calculator.html'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'verification', 'engine.js'), 'utf8').trimEnd();
const built = build();
const onDisk = fs.readFileSync(path.join(ROOT, 'mobile', 'index.html'), 'utf8');
const swOnDisk = fs.readFileSync(path.join(ROOT, 'mobile', 'sw.js'), 'utf8');
const html = onDisk;

// 1. The committed files are exactly what the build produces from the current sources.
check('mobile/index.html is up to date (run: npm run build:mobile)', onDisk === built.html);
check('mobile/sw.js is up to date (run: npm run build:mobile)', swOnDisk === built.sw);

// 2. Same engine, byte for byte.
check('mobile build embeds verification/engine.js unchanged', html.includes(engine));

// 3. Same features: every element id in the desktop page exists in the mobile page,
//    except the removed Gemini panel.
const geminiIds = new Set(['aibox', 'key', 'model', 'remember', 'sdstext', 'imp', 'impstat', 'impout', 'anon', 'rev', 'prev', 'revstat', 'revout']);
const ids = (text) => new Set([...text.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map((m) => m[1]));
const desktopIds = ids(desktop.slice(0, desktop.indexOf('<script>')));
const mobileIds = ids(html);
const missing = [...desktopIds].filter((id) => !geminiIds.has(id) && !mobileIds.has(id));
check('every desktop control is present in the mobile build (missing: ' + missing.join(', ') + ')', missing.length === 0);
check('desktop page still has the ids this test expects', ['mixture-card', 'ingredients-card', 'p28settings', 'results', 'res', 'ings'].every((id) => desktopIds.has(id)));
const appStart = desktop.lastIndexOf('<script>') + '<script>'.length;
const desktopApp = desktop.slice(appStart, desktop.indexOf('</script>', appStart));
const desktopAppNoGemini = desktopApp.slice(0, desktopApp.indexOf('/* ---------- optional Gemini ---------- */')) +
  desktopApp.slice(desktopApp.indexOf('/* ---------- init ---------- */'));
const appBody = desktopAppNoGemini.replace('src="pictograms/${esc(p.code)}.svg"', 'src="${mobilePictogramSrc(p.code)}"');
check('mobile build runs the same application code (minus Gemini)', html.includes('<script>' + appBody + '</script>'));

// 4. Local only: no Gemini, no network APIs, no external resources.
check('Gemini panel removed', !/id="aibox"|clp_gemini_key|generativelanguage\.googleapis\.com|x-goog-api-key/.test(html));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const code = scripts.join('\n');
for (const api of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'importScripts', 'import(']) {
  check('no network API in page scripts: ' + api, !code.includes(api));
}
check('no external scripts, stylesheets or images', !/<(script|link|img|iframe)\b[^>]*\b(src|href)="(https?:)?\/\//i.test(html));
const cspMatch = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
const csp = cspMatch ? cspMatch[1] : '';
check('Content-Security-Policy present before any script', !!cspMatch && html.indexOf(cspMatch[0]) < html.indexOf('<script>'));
check("CSP blocks all network connections (connect-src 'none')", /connect-src 'none'/.test(csp));
check("CSP default-src 'none'", /default-src 'none'/.test(csp));
check("CSP does not allow 'unsafe-inline' or 'unsafe-eval' scripts", !/script-src[^;]*'unsafe-(inline|eval)'/.test(csp));
check('CSP allows exactly the page scripts by hash', scripts.length === 4 && scripts.every((s) =>
  csp.includes("'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'")));
check('service worker never fetches other origins', /origin !== self\.location\.origin\) return/.test(swOnDisk) && !/https?:\/\//.test(swOnDisk));

// 5. Self-contained pictograms, identical to the desktop artwork.
const map = JSON.parse((html.match(/const MOBILE_PICTOGRAMS = (\{[^\n]*\});/) || [, '{}'])[1]);
for (const p of PICTOGRAMS) {
  const svg = fs.readFileSync(path.join(ROOT, 'pictograms', p + '.svg'));
  check('pictogram ' + p + ' inlined unchanged', map[p] === 'data:image/svg+xml;base64,' + svg.toString('base64'));
}
check('no reference to the pictograms folder', !html.includes('src="pictograms/'));

// 6. Page structure and scripts parse.
check('doctype is the first line (standards mode)', html.startsWith('<!doctype html>\n'));
check('generated-file notice present', html.includes('GENERATED FILE: do not edit'));
scripts.forEach((s, n) => {
  try { new Function(s); check('script ' + (n + 1) + ' compiles', true); } catch (e) { check('script ' + (n + 1) + ' compiles: ' + e.message, false); }
});
check('mobile layer present', html.includes('<style id="mobile-layer">') && html.includes("nav.className = 'm-tabbar noprint'"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'mobile', 'manifest.webmanifest'), 'utf8'));
check('manifest icons exist', manifest.icons.every((i) => fs.existsSync(path.join(ROOT, 'mobile', i.src))));
check('service worker caches only files that exist', JSON.parse(swOnDisk.match(/const FILES = (\[[^\n]*\]);/)[1])
  .filter((f) => f !== './').every((f) => fs.existsSync(path.join(ROOT, 'mobile', f))));

// 7. The engine inside the mobile page gives the same answers as verification/engine.js.
const engineScript = scripts.find((s) => s.includes('CLP mixture classification engine'));
const sandbox = {};
new Function('self', engineScript)(sandbox);
const CLP = require('./engine.js');
const example = { state: 'liquid', ingredients: [
  { name: 'A', pct: 30, hcodes: 'H225 H319 H336', acute: { oral: { cat: '4' }, dermal: {}, inh: {} } },
  { name: 'B', pct: 2, skinCorr: '1B', eye: '1' }, { name: 'C', pct: 0.5, skinSens: '1A' },
  { name: 'D', pct: 3, aquaAcute: true, mAcute: 10, aquaChronic: '1', mChronic: 10 }, { name: 'W', pct: 64.5 }] };
const strip = (r) => JSON.stringify({ o: r.outcomes, l: r.label, w: r.warnings, s: r.sds });
check('mobile engine result identical to verification/engine.js', strip(sandbox.CLP.classify(example)) === strip(CLP.classify(example)));

console.log(pass + ' mobile build checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
