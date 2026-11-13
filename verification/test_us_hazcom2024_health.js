// US OSHA HazCom 2024 — Appendix A.2–A.10 health classes (ingredient-based).
// Run from the repository root: node verification/test_us_hazcom2024_health.js
'use strict';
const US = require('./hazcom2024.js');
const CLP = require('./engine.js');
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL: ' + name); } };

// Ingredients use the shared calculator model; H-codes set default categories.
const ing = (name, pct, hcodes, extra) => { const i = CLP.blankIngredient(); Object.assign(i, { name, pct: String(pct) }); if (hcodes) CLP.applyHCodes(i, hcodes); return Object.assign(i, extra || {}); };
const run = (ingredients, mix) => US.classify(Object.assign({ state: 'liquid', ingredients }, mix || {}));
const one = (pct, hcodes, extra, mix) => run([ing('Active', pct, hcodes, extra), ing('Water', 100 - pct)], mix);
const find = (r, name) => r.outcomes.find((o) => o.name.startsWith(name));
const cat = (r, name) => { const o = find(r, name); return o ? String(o.category) : null; };
const section = (r, id) => r.sections.find((s) => s.id === id);

// --- Cut-off table -------------------------------------------------------------------
const C = US.CUTOFFS;
check('every cut-off has a value, unit, Appendix A table and label', Object.values(C).every((c) =>
  Number.isFinite(c.value) && c.unit && /^A\.\d/.test(c.basis) && /Table|A\.\d+\.\d/.test(c.basis) && c.label));
check('every cut-off verified against the HazCom 2024 text', Object.values(C).every((c) => c.verified === true));
check('source records the amendment and retrieval date', /91 FR 566/.test(US.SOURCE.amendedThrough) && /89 FR 44360/.test(US.SOURCE.amendedThrough) && /^\d{4}-\d{2}-\d{2}$/.test(US.SOURCE.retrieved));
const r0 = run([ing('Water', 100)]);
check('no unverified cut-offs reported', r0.unverifiedCutoffs.length === 0 && !r0.warnings.some((w) => /not yet been verified/.test(w)));
check('report states the rules source', /Rules: 29 CFR 1910\.1200 Appendix A .* as amended through 91 FR 566/.test(US.report({}, r0)) && !/NOT YET VERIFIED/.test(US.report({}, r0)));
check('respiratory-tract corrosivity (A.1.2.4, HazCom 2024) listed as not assessed', r0.notAssessed.some((x) => /respiratory tract \(A\.1\.2\.4/.test(x)));

// --- A.2 Skin -------------------------------------------------------------------------
check('Skin Cat 1 sum 5 % → Category 1', cat(one(5, 'H314'), 'Skin Corrosion') === '1');
check('Skin Cat 1 4.99 % → Skin Irritation 2', cat(one(4.99, 'H314'), 'Skin Irritation') === '2' && !find(one(4.99, 'H314'), 'Skin Corrosion'));
check('Skin Cat 1 0.99 % → not classified', !find(one(0.99, 'H314'), 'Skin'));
check('single sub-category 1B carried through', cat(one(6, 'H314', { skinCorr: '1B' }), 'Skin Corrosion') === '1B');
check('Table A.2.3 note: 1A 3 % + 1B 3 % → 1B (cumulative)',
  cat(run([ing('A', 3, 'H314', { skinCorr: '1A' }), ing('B', 3, 'H314', { skinCorr: '1B' }), ing('W', 94)]), 'Skin Corrosion') === '1B');
check('Table A.2.3 note: 1A 5 % + 1C 3 % → 1A',
  cat(run([ing('A', 5, 'H314', { skinCorr: '1A' }), ing('B', 3, 'H314', { skinCorr: '1C' }), ing('W', 92)]), 'Skin Corrosion') === '1A');
check('Table A.2.3 note: 1B 3 % + 1C 3 % → 1C',
  cat(run([ing('A', 3, 'H314', { skinCorr: '1B' }), ing('B', 3, 'H314', { skinCorr: '1C' }), ing('W', 94)]), 'Skin Corrosion') === '1C');
check('Table A.2.3 note: a Category 1 ingredient without sub-category → Category 1',
  cat(run([ing('A', 5, 'H314', { skinCorr: '1A' }), ing('B', 1, 'H314', { skinCorr: '1' }), ing('W', 94)]), 'Skin Corrosion') === '1');
check('Skin Irrit 2 sum 10 % → Category 2', cat(one(10, 'H315'), 'Skin Irritation') === '2');
check('Skin Irrit 2 sum 9.9 % → not classified', !find(one(9.9, 'H315'), 'Skin'));
check('corrosive ingredient below 1 % is left out of additivity and flagged for review', (() => {
  const r = run([ing('C', 0.5, 'H314'), ing('I', 9, 'H315'), ing('W', 90.5)]);
  return !find(r, 'Skin') && section(r, 'skin').steps.some((s) => /below the 1% relevance level/.test(s)); })());
check('additivity not applicable: corrosive 1 % → Category 1', cat(one(1, 'H314', { nonAdditive: true }), 'Skin Corrosion') === '1');
check('additivity not applicable: irritant 3 % → Category 2', cat(one(3, 'H315', { nonAdditive: true }), 'Skin Irritation') === '2');
check('extreme pH → Skin Category 1', cat(one(1, '', {}, { pH: '1.5' }), 'Skin Corrosion') === '1');
check('extreme pH with reserve data → not classified from pH', !find(one(1, '', {}, { pH: '12', pHReserveOk: true }), 'Skin'));
check('Skin Corrosion: Danger, corrosion pictogram, H314', (() => { const o = find(one(6, 'H314'), 'Skin Corrosion'); return o.signal === 'Danger' && o.pictogram === 'Corrosion' && o.code === 'H314'; })());

// --- A.3 Eye --------------------------------------------------------------------------
check('Skin Cat 1 3 % → Eye Category 1', cat(one(3, 'H314'), 'Serious Eye Damage') === '1');
check('Eye Dam 1 2.9 % → Eye Irritation 2A', cat(one(2.9, 'H318'), 'Eye Irritation') === '2A');
check('Eye Irrit 2 10 % → 2A (EU Cat 2 treated as 2A)', cat(one(10, 'H319'), 'Eye Irritation') === '2A');
check('Eye 2B only, 10 % → 2B with H320 and no pictogram', (() => { const o = find(one(10, '', { eye: '2B' }), 'Eye Irritation'); return o && o.category === '2B' && o.code === 'H320' && o.pictogram === null; })());
check('Eye 2A + 2B → 2A', cat(run([ing('A', 5, '', { eye: '2' }), ing('B', 6, '', { eye: '2B' }), ing('W', 89)]), 'Eye Irritation') === '2A');
check('Eye Irrit 9.9 % → not classified', !find(one(9.9, 'H319'), 'Eye'));
check('skin-corrosive + Eye Dam 1 ingredient counted once', cat(one(2.9, 'H314 H318'), 'Eye Irritation') === '2A');
check('extreme pH → Eye Category 1', cat(one(1, '', {}, { pH: '11.5' }), 'Serious Eye Damage') === '1');

// --- A.4 Sensitizers -------------------------------------------------------------------
check('skin sensitizer 0.1 % → Category 1', cat(one(0.1, 'H317'), 'Skin Sensitizer') === '1');
check('skin sensitizer 0.09 % → not classified', !find(one(0.09, 'H317'), 'Skin Sensitizer'));
check('mixture classified Category 1, ingredient sub-categories recorded', (() => { const o = find(run([ing('A', 0.2, 'H317', { skinSens: '1A' }), ing('B', 2, 'H317', { skinSens: '1B' }), ing('W', 97.8)]), 'Skin Sensitizer'); return o.category === '1' && o.ingredientSubcategories.join() === '1A,1B'; })());
check('skin sensitizer 1B 0.99 % → not classified (Table A.4.5: 1B ≥1.0 %)', !find(one(0.99, 'H317', { skinSens: '1B' }), 'Skin Sensitizer'));
check('skin sensitizer 1B 1.0 % → Category 1', cat(one(1, 'H317', { skinSens: '1B' }), 'Skin Sensitizer') === '1');
check('skin sensitizer 1A 0.1 % → Category 1', cat(one(0.1, 'H317', { skinSens: '1A' }), 'Skin Sensitizer') === '1');
check('respiratory 1B liquid 0.99 % → not classified; 1.0 % → Category 1', !find(one(0.99, 'H334', { respSens: '1B' }), 'Respiratory') && cat(one(1, 'H334', { respSens: '1B' }), 'Respiratory') === '1');
check('respiratory 1B gas 0.19 % → not classified; 0.2 % → Category 1', !find(one(0.19, 'H334', { respSens: '1B' }, { state: 'gas' }), 'Respiratory') && cat(one(0.2, 'H334', { respSens: '1B' }, { state: 'gas' }), 'Respiratory') === '1');
check('respiratory sensitizer 0.1 % → Category 1, Danger', (() => { const o = find(one(0.1, 'H334'), 'Respiratory Sensitizer'); return o && o.signal === 'Danger' && o.pictogram === 'Health hazard'; })());

// --- A.5–A.7 CMR -------------------------------------------------------------------------
check('mutagen 1B 0.1 % → mixture Category 1 (Table A.5.1)', cat(one(0.1, 'H340'), 'Germ Cell') === '1');
check('mutagen 1B 0.09 % → not classified', !find(one(0.09, 'H340'), 'Germ Cell'));
check('mutagen 2 at 0.99 % → not classified', !find(one(0.99, 'H341'), 'Germ Cell'));
check('mutagen 2 at 1 % → Category 2', cat(one(1, 'H341'), 'Germ Cell') === '2');
check('carcinogen 1B 0.1 % → Category 1, label required', (() => { const o = find(one(0.1, 'H350'), 'Carcinogenicity'); return o && o.category === '1' && o.labelRequired === true && o.ingredientSubcategories.join() === '1B'; })());
check('carcinogen trail cites A.6.4 (NTP / IARC)', section(one(0.1, 'H350'), 'carc').steps.some((x) => /A\.6\.4.*NTP.*IARC/.test(x)));
check('carcinogen 2 at 0.5 % → Category 2, SDS required, label optional', (() => { const r = one(0.5, 'H351'); const o = find(r, 'Carcinogenicity'); return o && o.labelRequired === false && r.signal === null; })());
check('carcinogen 2 at 1 % → label required, Warning', (() => { const r = one(1, 'H351'); return find(r, 'Carcinogenicity').labelRequired === true && r.signal === 'Warning'; })());
check('carcinogen 2 at 0.09 % → not classified', !find(one(0.09, 'H351'), 'Carcinogenicity'));
check('repro 1B development 0.1 % → Category 1, H360, effect recorded', (() => { const o = find(one(0.1, 'H360D'), 'Reproductive'); return o && o.category === '1' && o.code === 'H360' && o.effects.development === '1B'; })());
check('repro 2 at 0.09 % → not classified', !find(one(0.09, 'H361'), 'Reproductive'));
check('repro 2 at 0.1 % → Category 2, H361', (() => { const o = find(one(0.1, 'H361'), 'Reproductive'); return o && o.category === '2' && o.code === 'H361'; })());
check('lactation 0.1 % → H362, no signal word', (() => { const o = find(one(0.1, 'H362'), 'Effects on or via Lactation'); return o && o.signal === null && o.pictogram === null; })());

// --- A.8/A.9 STOT ---------------------------------------------------------------------------
check('STOT RE 1 at 10 % → Category 1', cat(one(10, 'H372'), 'Specific Target Organ Toxicity, Repeated') === '1');
check('STOT RE 1 at 5 % → Category 1 (Table A.9.3: ≥1.0 %)', cat(one(5, 'H372'), 'Specific Target Organ Toxicity, Repeated') === '1');
check('STOT RE 1 at 1.0 % → Category 1', cat(one(1, 'H372'), 'Specific Target Organ Toxicity, Repeated') === '1');
check('STOT SE 1 at 1.0 % → Category 1 (Table A.8.2)', cat(one(1, 'H370'), 'Specific Target Organ Toxicity, Single Exposure') === '1');
check('STOT SE 2 at 0.99 % → not classified', !find(one(0.99, 'H371'), 'Specific Target Organ Toxicity, Single Exposure'));
check('STOT RE 1 at 0.9 % → not classified', !find(one(0.9, 'H372'), 'Specific Target Organ Toxicity, Repeated'));
check('STOT SE 2 at 1 % → Category 2', cat(one(1, 'H371'), 'Specific Target Organ Toxicity, Single Exposure') === '2');
check('STOT SE 3 narcotic 20 % → Category 3 (H336)', (() => { const o = one(20, 'H336').outcomes.find((x) => x.code === 'H336'); return o && o.category === 3 && o.signal === 'Warning'; })());
check('STOT SE 3 narcotic 19.9 % → not classified', !one(19.9, 'H336').outcomes.some((x) => x.code === 'H336'));
check('STOT SE 3 summed per effect', run([ing('A', 12, 'H335'), ing('B', 9, 'H335'), ing('W', 79)]).outcomes.some((x) => x.code === 'H335'));
check('STOT SE 3 effects not mixed', !run([ing('A', 12, 'H335'), ing('B', 9, 'H336'), ing('W', 79)]).outcomes.some((x) => x.code === 'H335' || x.code === 'H336'));

// --- A.10 Aspiration ---------------------------------------------------------------------
check('aspiration 10 % and 20.5 mm²/s → Category 1', cat(one(10, 'H304', {}, { viscosity40: '20.5' }), 'Aspiration') === '1');
check('aspiration viscosity 20.6 → not classified', !find(one(50, 'H304', {}, { viscosity40: '20.6' }), 'Aspiration'));
check('aspiration 9.9 % → not classified', !find(one(9.9, 'H304', {}, { viscosity40: '5' }), 'Aspiration'));
check('aspiration without viscosity → not assessed, not negative', (() => { const r = one(50, 'H304'); return !find(r, 'Aspiration') && section(r, 'asp').status === 'not-assessed'; })());

// --- Fail-safe behaviour and independence from EU CLP ---------------------------------------
const blank = run([ing('Unknown', 100)]);
check('no data → every health class "not assessed", never "not hazardous"',
  ['skin', 'eye', 'respSens', 'skinSens', 'muta', 'carc', 'repro', 'lact', 'stotSE', 'stotRE', 'asp'].every((id) => section(blank, id).status === 'not-assessed'));
const euOnly = run([ing('X', 50, 'H410 EUH380 EUH440'), ing('W', 50)]);
check('EU-only classes never become US outcomes', euOnly.outcomes.length === 0);
const scl = one(0.5, 'H350', { scl: { carc: '1' } });
check('EU SCL is not applied (generic 0.1 % used) and is reported', find(scl, 'Carcinogenicity') && scl.warnings.some((w) => /not applied in this US screen/.test(w)));
check('"5%" concentration accepted', cat(run([ing('C', '5%', 'H351'), ing('W', '95 %')]), 'Carcinogenicity') === '2');
check('signal word: Danger outranks Warning', run([ing('A', 6, 'H314'), ing('B', 1, 'H351'), ing('W', 93)]).signal === 'Danger');
check('partial-screen status kept', blank.status === 'partial-screen' && blank.warnings[0].startsWith('PARTIAL HAZCOM SCREEN'));

console.log(pass + ' US HazCom 2024 health-class checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
