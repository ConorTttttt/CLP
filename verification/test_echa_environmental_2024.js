'use strict';
// Regression scenarios based on ECHA Guidance on the Application of the CLP
// Criteria, Parts 4 and 5, version 4.0 (November 2024).
const fs = require('fs');
const path = require('path');
const CLP = require('./engine.js');
let passed = 0;
let failed = 0;
function test(name, ok) {
  if (ok) passed++;
  else { failed++; console.error('FAIL: ' + name); }
}
function ing(pct, fields) {
  return Object.assign(CLP.blankIngredient(), { name: 'Ingredient', pct }, fields || {});
}
function water(pct) { return ing(pct, { name: 'Water' }); }
function run(ingredients) { return CLP.classify({ state: 'liquid', ingredients }); }
function classified(result, label) {
  return result.outcomes.some((outcome) => outcome.label === label);
}
function warning(result, expression) {
  return result.warnings.some((msg) => expression.test(msg));
}

// ECHA 4.1.4.7.1, pp. 72–73: Example A, five named hazard contributors.
{
  const r = run([
    ing(1, { aquaAcute: true, mAcute: '10', aquaChronic: '1', mChronic: '10' }),
    ing(3, { aquaAcute: true, mAcute: '1', aquaChronic: '2' }),
    ing(10, { aquaChronic: '2' }),
    ing(10, { aquaChronic: '3' }),
    water(76)
  ]);
  test('ECHA mixture Example A is not Acute 1', !classified(r, 'Aquatic Acute 1'));
  test('ECHA mixture Example A is Chronic 2', classified(r, 'Aquatic Chronic 2'));
}

// ECHA Annex I Table 4.1.3 reproduced on p. 42: M-factors are 1, 10, 100, ...
{
  const valid10 = run([ing(2.5, { aquaAcute: true, mAcute: '10' }), water(97.5)]);
  test('M=10 at 2.5% crosses Acute 1 threshold', classified(valid10, 'Aquatic Acute 1'));
  test('valid decade M-factor not rejected', !warning(valid10, /invalid mAcute/));
  for (const invalid of ['2', '5', '0.5', '-10']) {
    const r = run([ing(10, { aquaAcute: true, mAcute: invalid }), water(90)]);
    test('invalid M=' + invalid + ' flagged', warning(r, /invalid mAcute/));
    test('invalid M=' + invalid + ' not used as a multiplier', !classified(r, 'Aquatic Acute 1'));
    test('invalid M=' + invalid + ' makes aquatic result provisional', warning(r, /PROVISIONAL AQUATIC RESULT/));
  }
  const missing = run([ing(10, { aquaChronic: '1' }), water(90)]);
  test('missing M-factor gives prominent provisional warning', warning(missing, /PROVISIONAL AQUATIC RESULT/));
}

// ECHA 4.2.3.1.1 p. 118: individual GCLs and case-specific additivity review.
{
  const both = run([ing(0.06, { edEnv: '1' }), ing(0.06, { edEnv: '1' }), water(99.88)]);
  test('ED ENV mixture not auto-classified by unvalidated additivity', !classified(both, 'ED ENV 1'));
  test('multiple ED ENV ingredients prompt expert review', warning(both, /ED ENV ADDITIVITY REVIEW/));
  test('ED ENV Category 1 individual 0.1% threshold', classified(run([ing(0.1, { edEnv: '1' }), water(99.9)]), 'ED ENV 1'));
  test('ED ENV Category 2 individual 1% threshold', classified(run([ing(1, { edEnv: '2' }), water(99)]), 'ED ENV 2'));
  const sds = run([ing(0.1, { edEnv: '2' }), water(99.9)]);
  test('ED ENV Category 2 at 0.1% gives SDS upon request', sds.sds.some((s) => /ED ENV Cat\. 2/.test(s)));
  test('ED ENV Category 2 at 0.1% is not automatically Cat 2', !classified(sds, 'ED ENV 2'));
}

// CLP Article 10: valid SCL overrides generic limit, invalid SCL does not.
{
  const valid = run([ing(0.1, { edEnv: '1', scl: { edEnv: 0.2 } }), water(99.9)]);
  test('valid ED ENV SCL overrides generic classification limit', !classified(valid, 'ED ENV 1'));
  const invalid = run([ing(0.1, { edEnv: '1', scl: { edEnv: 150 } }), water(99.9)]);
  test('invalid SCL above 100% is flagged', warning(invalid, /invalid SCL edEnv/));
  test('invalid SCL cannot suppress generic hazard', classified(invalid, 'ED ENV 1'));
}
const browser = fs.readFileSync(path.join(__dirname, '..', 'clp_mixture_calculator.html'), 'utf8');
const engine = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
test('offline HTML contains exact tested engine copy', browser.includes(engine));
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
