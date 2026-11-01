// Runs every verification suite and fails if any suite fails.
// Run from repository root: npm test  (or: node verification/run_all.js)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const suites = fs.readdirSync(dir).filter((f) => /^test_.*\.js$/.test(f)).sort();
let failed = 0;
for (const suite of suites) {
  const r = spawnSync(process.execPath, [path.join(dir, suite)], { cwd: path.join(dir, '..'), encoding: 'utf8' });
  const out = (r.stdout + r.stderr).trim().split('\n');
  const ok = r.status === 0 && !/[1-9]\d* failed/.test(r.stdout);
  if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + suite + ' — ' + out[out.length - 1]);
  if (!ok) console.log(out.slice(-15).join('\n'));
}
console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
