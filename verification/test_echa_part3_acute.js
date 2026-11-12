// Regression cases from ECHA Guidance on the Application of CLP Criteria,
// Part 3: Health Hazards, version 5.0, Nov 2024; sections 3.1.3.3.3–3.1.3.3.5.
// Run with: node verification/test_echa_part3_acute.js
const assert = require('assert').strict;
const CLP = require('./engine');
let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log('PASS ' + name);
}
function component(name, pct, opts = {}) {
  const i = CLP.blankIngredient();
  i.name = name;
  i.pct = pct;
  if (opts.inh) Object.assign(i.acute.inh, opts.inh);
  if (opts.oral) Object.assign(i.acute.oral, opts.oral);
  if (opts.unknown) i.acute.unknown = true;
  if (opts.inhUnknown) i.acute.inh.unknown = true;
  return i;
}
const inert = pct => component('Inert carrier', pct);
const result = (...ingredients) => CLP.classify({state:'liquid',ingredients});
const inhalation = r => r.outcomes.filter(o => /Acute Tox\\. \\d \\(inhalation\\)/.test(o.label));
const oral = r => r.outcomes.filter(o => /Acute Tox\\. \\d \\(oral\\)/.test(o.label));
const trail = r => r.hazards.find(h=>h.id==='acute').steps.join('\\n');

check('Mixed gas and vapour: individually unclassified contributions combine to Acute 4', () => {
  const r = result(component('Gas',20,{inh:{form:'gas',cat:'4'}}),
    component('Vapour',20,{inh:{form:'vapour',cat:'4'}}),inert(60));
  assert.deepEqual(inhalation(r).map(o=>o.label), ['Acute Tox. 4 (inhalation)']);
  assert.match(trail(r), /Combined inhalation classification: Category 4/);
});
check('Example 13 on pp. 59–60: nicotine mist plus diacetyl vapour is not classified', () => {
  const r = result(component('Nicotine',1.9,{inh:{form:'dust_mist',ate:'0.19'}}),
    component('Diacetyl',6,{inh:{form:'vapour',cat:'3'}}),inert(92.1));
  assert.deepEqual(inhalation(r), []);
  assert.match(trail(r), /Combined inhalation classification: not classified/);
  assert.match(trail(r), /Category 4: .*< 1/);
});
check('Gas and dust/mist fractions combine into one Category 3 instead of two Category 4 results', () => {
  const r = result(component('Gas',10,{inh:{form:'gas',cat:'3'}}),
    component('Aerosol',35,{inh:{form:'dust_mist',cat:'3'}}),inert(55));
  assert.deepEqual(inhalation(r).map(o=>o.label), ['Acute Tox. 3 (inhalation)']);
});
check('All oral Category 2 components: converted ATE boundary must not cause Category 1', () => {
  const r = result(component('A',50,{oral:{cat:'2'}}),component('B',50,{oral:{cat:'2'}}));
  assert.deepEqual(oral(r).map(o=>o.label), ['Acute Tox. 2 (oral)']);
  assert.match(trail(r), /3\.1\.3\.3\(c\)/);
});
check('All inhalation dust/mist Category 3 components: do not overclassify Category 2', () => {
  const r = result(component('A',50,{inh:{form:'dust_mist',cat:'3'}}),
    component('B',50,{inh:{form:'dust_mist',cat:'3'}}));
  assert.deepEqual(inhalation(r).map(o=>o.label), ['Acute Tox. 3 (inhalation)']);
});
check('Mixed inhalation converted Category 2 values: boundary safeguard still applies', () => {
  const r = result(component('A',50,{inh:{form:'gas',cat:'2'}}),
    component('B',50,{inh:{form:'vapour',cat:'2'}}));
  assert.deepEqual(inhalation(r).map(o=>o.label), ['Acute Tox. 2 (inhalation)']);
});
check('Same-category exception must NOT apply to diluted Category 2 ingredient', () => {
  const r = result(component('A',1,{oral:{cat:'2'}}),inert(99));
  assert.deepEqual(oral(r).map(o=>o.label), ['Acute Tox. 4 (oral)']);
});
check('Single-form gas toxicity: inhalation unknown fraction counts regardless of default vapour selector', () => {
  const r = result(component('Gas',19,{inh:{form:'gas',cat:'4'}}),
    component('Unknown',20,{inhUnknown:true}),inert(61));
  assert.deepEqual(inhalation(r).map(o=>o.label), ['Acute Tox. 4 (inhalation)']);
  assert.match(trail(r), /inhalation \\(gas\\) unknown data/);
});
check('Mixed-form unknown >10%: combined fraction denominator is corrected', () => {
  const r = result(component('Gas',12,{inh:{form:'gas',cat:'4'}}),
    component('Dust',12,{inh:{form:'dust_mist',cat:'4'}}),
    component('Unknown',20,{inhUnknown:true}),inert(56));
  assert.deepEqual(inhalation(r).map(o=>o.label), ['Acute Tox. 4 (inhalation)']);
  assert.match(trail(r), /correction denominator 80/);
});
console.log(passed + ' ECHA Part 3 acute-toxicity regression checks passed');
