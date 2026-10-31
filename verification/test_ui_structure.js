// Source-level UI regression checks (not a substitute for headless browser tests).
// Run from repository root: node verification/test_ui_structure.js
const fs = require('fs');
const assert = require('assert').strict;
const html = fs.readFileSync('clp_mixture_calculator.html', 'utf8');
const engine = fs.readFileSync('verification/engine.js', 'utf8').trimEnd();
let pass = 0;
function check(name, condition) { assert.ok(condition, name); pass++; }
check('HTML embeds precisely the verified engine', html.includes(engine));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
check('Two inline scripts exist', scripts.length === 2);
scripts.forEach((m, index) => {
  assert.doesNotThrow(() => new Function(m[1]), 'Inline script ' + index + ' compiles');
  pass++;
});
for (const key of ['reproFert', 'reproDev', 'repro', 'carc', 'carcRoute', 'reproQuick']) {
  check('UI selector exists: ' + key, html.includes('SEL("' + key + '"'));
}
for (const code of ['H350i', 'H360F', 'H360D', 'H360FD', 'H360Fd', 'H360Df', 'H361f', 'H361d', 'H361fd']) {
  check('Differentiation supported: ' + code, html.includes('"' + code + '"'));
}
check('Browser load migrates legacy data', html.includes('CLP.normalise({ ingredients: [{...r, pct: 100}] })'));
check('Quick pick preserves other manual category edits', html.includes('i.reproFert = reproOnly.reproFert') &&
  html.includes('i.reproDev = reproOnly.reproDev') && !html.includes('CLP.applyHCodes(i, (otherCodes'));
console.log(pass + ' UI source checks passed');
