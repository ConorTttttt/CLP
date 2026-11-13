#!/usr/bin/env node
/* Copies the engine source files into clp_mixture_calculator.html so the single
 * HTML file keeps working offline. Edit the files in verification/, never the
 * embedded copies, then run:
 *
 *   npm run sync:engines           update the embedded copies
 *   npm run sync:engines -- --check exit 1 if any embedded copy is out of date
 *
 * Each engine sits between BEGIN/END marker comments inside the first <script>.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'clp_mixture_calculator.html');
const ENGINES = ['verification/engine.js', 'verification/hazcom2024.js'];

const begin = (file) => `/* BEGIN EMBEDDED ${file} — copy of the source file; edit that file and run: npm run sync:engines */`;
const end = (file) => `/* END EMBEDDED ${file} */`;

function region(html, file) {
  const a = html.indexOf(begin(file)), b = html.indexOf(end(file));
  if (a < 0 || b < a || html.indexOf(begin(file), a + 1) >= 0)
    throw new Error(`sync_engines: expected one BEGIN/END marker pair for ${file} in clp_mixture_calculator.html`);
  return { start: a + begin(file).length + 1, stop: b - 1 }; // contents sit between newline-separated markers
}

function sync(html) {
  for (const file of ENGINES) {
    const source = fs.readFileSync(path.join(ROOT, file), 'utf8').trimEnd();
    const r = region(html, file);
    html = html.slice(0, r.start) + source + html.slice(r.stop);
  }
  return html;
}

function embedded(html, file) {
  const r = region(html, file);
  return html.slice(r.start, r.stop);
}

if (require.main === module) {
  const html = fs.readFileSync(HTML, 'utf8');
  const updated = sync(html);
  if (process.argv.includes('--check')) {
    if (updated !== html) { console.error('Embedded engines are out of date. Run: npm run sync:engines'); process.exit(1); }
    console.log('Embedded engines are up to date.');
  } else {
    fs.writeFileSync(HTML, updated);
    console.log(updated === html ? 'Embedded engines already up to date.' : 'Updated embedded engines in clp_mixture_calculator.html.');
  }
}

module.exports = { ENGINES, begin, end, sync, embedded };
