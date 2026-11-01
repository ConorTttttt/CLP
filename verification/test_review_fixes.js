// Regression tests for the corrections made after the November 2026 review.
// Run from repository root: node verification/test_review_fixes.js
const CLP = require('./engine.js');
const assert = require('assert').strict;
let n = 0;
const test = (name, fn) => { try { fn(); n++; } catch (e) { throw Error(name + ': ' + e.message); } };

const ing = (pct, codes, patch) => {
  const i = CLP.blankIngredient(); i.name = 'X'; i.pct = pct;
  if (codes) CLP.applyHCodes(i, codes);
  return Object.assign(i, patch || {});
};
const water = (p) => Object.assign(CLP.blankIngredient(), { name: 'water', pct: p });
const run = (ings, mix) => CLP.classify(Object.assign({ state: 'liquid', ingredients: ings }, mix || {}));
const labels = (r) => r.outcomes.map((o) => o.label);
const hz = (r, id) => r.hazards.find((h) => h.id === id);

/* 1. ED HH signal words – Table 3.11.3, Delegated Regulation (EU) 2023/707 */
test('ED HH 1 -> Danger', () => {
  const r = run([ing(1, 'EUH380'), water(99)]);
  assert.equal(r.outcomes.find((o) => o.label === 'ED HH 1').signal, 'Danger');
  assert.equal(r.label.signal, 'Danger');
});
test('ED HH 2 -> Warning', () => {
  const r = run([ing(2, 'EUH381'), water(98)]);
  assert.equal(r.label.signal, 'Warning');
});

/* 2. STOT SE 3 survives alongside STOT SE 1/2 on the same ingredient */
test('H335 then H370: both kept', () => {
  const r = run([ing(25, 'H335 H370'), water(75)]);
  assert.ok(labels(r).includes('STOT SE 1'));
  assert.ok(labels(r).includes('STOT SE 3 (respiratory irritation)'));
});
test('H370 then H336: both kept, independent of code order', () => {
  const r = run([ing(25, 'H370 H336'), water(75)]);
  assert.ok(labels(r).includes('STOT SE 1'));
  assert.ok(labels(r).includes('STOT SE 3 (narcotic effects)'));
});
test('Cat 1 ingredient with H335 adds to another Cat 3 ingredient', () => {
  const a = ing(12, 'H371 H335'); a.name = 'A';
  const b = ing(10, 'H335'); b.name = 'B';
  const r = run([a, b, water(78)]);
  assert.ok(labels(r).includes('STOT SE 3 (respiratory irritation)'));
  assert.ok(!labels(r).includes('STOT SE 3 (narcotic effects)'), 'H371+H335 must not count as unspecified Cat 3');
});
test('Report lists STOT SE 3 next to STOT SE 1', () => {
  const m = { state: 'liquid', ingredients: [ing(25, 'H370 H335'), water(75)] };
  assert.match(CLP.report(m, CLP.classify(m)), /STOT SE 1; STOT SE 3 \(resp\.\)/);
});

/* 3. Banded Category 2 SCL for a Category 1 STOT substance */
test('STOT RE banded SCL: 4 % below band -> not classified', () => {
  const r = run([ing(4, 'H372', { scl: { stotRE: '20', stotRE2: '5' } }), water(96)]);
  assert.ok(!labels(r).some((l) => l.startsWith('STOT RE')));
});
test('STOT RE banded SCL: 5 % -> Cat 2, 20 % -> Cat 1', () => {
  assert.ok(labels(run([ing(5, 'H372', { scl: { stotRE: '20', stotRE2: '5' } }), water(95)])).includes('STOT RE 2'));
  assert.ok(labels(run([ing(20, 'H372', { scl: { stotRE: '20', stotRE2: '5' } }), water(80)])).includes('STOT RE 1'));
});
test('STOT without band keeps the generic 1 % lower bound', () => {
  assert.ok(labels(run([ing(1, 'H372', { scl: { stotRE: '20' } }), water(99)])).includes('STOT RE 2'));
});
test('Inconsistent band above Cat 1 limit is flagged', () => {
  const r = run([ing(5, 'H370', { scl: { stotSE: '10', stotSE2: '15' } }), water(95)]);
  assert.ok(hz(r, 'stotSE').notes.some((x) => /band SCL 15 % is above/.test(x)));
});

/* 4. Sensitiser sub-category prompts */
test('H317 parse note asks for 1A/1B', () => {
  const i = CLP.blankIngredient();
  assert.ok(CLP.applyHCodes(i, 'H317').notes.some((x) => /Skin Sens\. 1.*1A/.test(x)));
});
test('Classification note for unspecified Cat 1 sensitiser', () => {
  const r = run([ing(0.5, 'H317'), water(99.5)]);
  assert.ok(hz(r, 'skinSens').notes.some((x) => /without sub-category or SCL/.test(x)));
});
test('No sub-category note once 1A is set', () => {
  const r = run([ing(0.5, 'H317', { skinSens: '1A' }), water(99.5)]);
  assert.ok(!hz(r, 'skinSens').notes.some((x) => /without sub-category/.test(x)));
  assert.ok(labels(r).includes('Skin Sens. 1A'));
});
test('EUH208 driver detection uses structured data (second sensitiser named)', () => {
  const a = ing(2, 'H317', { skinSens: '1B' }); a.name = 'Driver';
  const b = ing(0.5, 'H317', { skinSens: '1B' }); b.name = 'Other';
  const r = run([a, b, water(97.5)]);
  assert.ok(r.label.supplemental.some((x) => /Name Other on the label/.test(x)));
  assert.ok(!r.label.supplemental.some((x) => /Name Driver on the label/.test(x)));
});

/* 5. Solid mixtures: no flammable-liquid calculation */
test('Solid state skips flammable-liquid criteria', () => {
  const r = run([ing(50, 'H225'), water(50)], { state: 'solid', flashPoint: '10', ibp: '80' });
  assert.equal(hz(r, 'flam').status, 'na');
  assert.ok(!labels(r).some((l) => l.startsWith('Flam. Liq')));
});
test('Liquid state still classifies from flash point', () => {
  assert.ok(labels(run([water(100)], { flashPoint: '10', ibp: '80' })).includes('Flam. Liq. 2'));
});

/* 6. Non-additive corrosive does not erase an additive 1A/1B/1C sub-category */
test('Additive 1A kept when a non-additive corrosive also triggers', () => {
  const a = ing(6, null, { skinCorr: '1A' }); a.name = 'A';
  const b = ing(2, null, { skinCorr: '1B', nonAdditive: true }); b.name = 'B';
  assert.ok(labels(run([a, b, water(92)])).includes('Skin Corr. 1A'));
});
test('Non-additive corrosive still upgrades Skin Irrit. 2 to Skin Corr. 1', () => {
  const a = ing(15, null, { skinCorr: '2' }); a.name = 'A';
  const b = ing(2, null, { skinCorr: '1B', nonAdditive: true }); b.name = 'B';
  assert.ok(labels(run([a, b, water(83)])).includes('Skin Corr. 1'));
});

/* 7. GHS-superseded P codes are flagged for review, not silently replaced */
test('P202 / P301+P310 flagged as GHS-superseded', () => {
  const r = run([ing(1, 'H350'), ing(50, null, { acute: { oral: { cat: '3', ate: '', unknown: false }, dermal: { cat: '', ate: '', unknown: false }, inh: { form: 'vapour', cat: '', ate: '', unknown: false }, unknown: false } }), water(49)], { audience: 'professional', intendedUse: 'test' });
  const codes = r.label.article28.review.filter((x) => /obsolete in later UN GHS/.test(x.reason)).map((x) => x.code);
  assert.ok(codes.includes('P202'));
  assert.ok(codes.includes('P301+P310'));
});

console.log(n + ' review-fix regression tests passed');
