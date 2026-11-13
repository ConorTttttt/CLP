// US OSHA HazCom 2024 — Appendix B physical hazards from mixture test data, and
// OSHA-defined hazards. Run from the repository root:
//   node verification/test_us_hazcom2024_physical.js
'use strict';
const US = require('./hazcom2024.js');
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL: ' + name); } };
const run = (state, physical, extra) => US.classify(Object.assign({ state, ingredients: [{ name: 'Product', pct: '100' }], physical }, extra || {}));
const find = (r, name) => r.outcomes.find((o) => o.name === name);
const cat = (r, name) => { const o = find(r, name); return o ? String(o.category) : null; };
const sec = (r, id) => r.sections.find((s) => s.id === id);

// --- No data: every class is "not assessed" or "not applicable", never negative ----------
const blank = run('liquid', {});
check('liquid without data: metals, asphyxiant, respiratory tract, not assessed', ['metals', 'asphyxiant', 'respCorr'].every((id) => sec(blank, id).status === 'not-assessed'));
check('liquid: gas classes and pressurized packaging not applicable', ['flamGas', 'oxGas', 'gasPressure', 'aerosol', 'cup', 'dust'].every((id) => sec(blank, id).status === 'not-applicable'));
check('gas without data: flammable, oxidizing, pressure not assessed', ['flamGas', 'oxGas', 'gasPressure'].every((id) => sec(run('gas', {}), id).status === 'not-assessed'));
check('solid without dust data: combustible dust not assessed', sec(run('solid', {}), 'dust').status === 'not-assessed');
check('remaining Appendix B classes listed as not assessed', blank.notAssessed.some((x) => /Explosives \(B\.1\)/.test(x) && /desensitized explosives \(B\.17\)/.test(x)));

// --- B.3.1 Aerosols (Table B.3.1) ---------------------------------------------------------
const aer = (p) => run('liquid', Object.assign({ packaging: 'aerosol' }, p));
check('aerosol: ≥85 % flammable and ≥30 kJ/g → Category 1', cat(aer({ flammableComponentsPct: 85, heatOfCombustion: 30 }), 'Aerosol') === '1');
check('aerosol: 84.9 % / 30 kJ/g, untested → Category 1 by note 3', cat(aer({ flammableComponentsPct: 84.9, heatOfCombustion: 30 }), 'Aerosol') === '1' &&
  sec(aer({ flammableComponentsPct: 84.9, heatOfCombustion: 30 }), 'aerosol').steps.some((s) => /Note 3/.test(s)));
check('spray: ignition distance 75 cm → Category 1', cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'spray', ignitionDistanceCm: 75 }), 'Aerosol') === '1');
check('spray: ignition distance 74 cm → Category 2', cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'spray', ignitionDistanceCm: 74 }), 'Aerosol') === '2');
check('spray: 14 cm but enclosed time equivalent 300 s/m³ → Category 2', cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'spray', ignitionDistanceCm: 14, enclosedTimeEquivalent: 300 }), 'Aerosol') === '2');
check('spray: tests negative → Category 3', cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'spray', ignitionDistanceCm: 14, enclosedTimeEquivalent: 301, enclosedDeflagrationDensity: 301 }), 'Aerosol') === '3');
check('foam: 20 cm / 2 s → Category 1; 4 cm / 7 s → Category 1', cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'foam', foamFlameHeightCm: 20, foamFlameDurationS: 2 }), 'Aerosol') === '1' &&
  cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'foam', foamFlameHeightCm: 4, foamFlameDurationS: 7 }), 'Aerosol') === '1');
check('foam: 4 cm / 2 s → Category 2; 3.9 cm / 2 s → Category 3', cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'foam', foamFlameHeightCm: 4, foamFlameDurationS: 2 }), 'Aerosol') === '2' &&
  cat(aer({ flammableComponentsPct: 40, heatOfCombustion: 25, aerosolForm: 'foam', foamFlameHeightCm: 3.9, foamFlameDurationS: 2 }), 'Aerosol') === '3');
check('≤1 % flammable and <20 kJ/g → Category 3, no pictogram', (() => { const o = find(aer({ flammableComponentsPct: 1, heatOfCombustion: 19.9 }), 'Aerosol'); return o && o.category === 3 && o.pictogram === null && o.statement === 'Pressurized container: may burst if heated'; })());
check('heat of combustion 20 kJ/g with ≤1 % flammable → considered for Category 1/2', cat(aer({ flammableComponentsPct: 0.5, heatOfCombustion: 20 }), 'Aerosol') === '1');
check('aerosol without data → not assessed', sec(aer({}), 'aerosol').status === 'not-assessed' && !find(aer({}), 'Aerosol'));
check('flammable components estimated from ingredient H-codes', (() => {
  const r = US.classify({ state: 'liquid', physical: { packaging: 'aerosol', heatOfCombustion: 10 }, ingredients: [{ name: 'Propane', pct: '30', hcodes: 'H220 H280' }, { name: 'Ethanol', pct: '20', hcodes: 'H225 H319' }, { name: 'Water', pct: '50' }] });
  return sec(r, 'aerosol').steps.some((s) => /estimated from ingredient H-codes.*= 50%/.test(s)); })());
check('aerosol is not also classified as a flammable liquid (note 2)', (() => { const r = aer({ flammableComponentsPct: 1, heatOfCombustion: 5 }); const r2 = US.classify({ state: 'liquid', flashPoint: '10', ibp: '40', ingredients: [{ name: 'P', pct: '100' }], physical: { packaging: 'aerosol', flammableComponentsPct: 1, heatOfCombustion: 5 } });
  return sec(r2, 'flammable').status === 'not-applicable' && !find(r2, 'Flammable Liquid') && cat(r, 'Aerosol') === '3'; })());
check('Category 1 aerosol label: Danger, flame, extremely flammable + pressurized', (() => { const o = find(aer({ flammableComponentsPct: 90, heatOfCombustion: 35 }), 'Aerosol'); return o.signal === 'Danger' && o.pictogram === 'Flame' && /Extremely flammable aerosol/.test(o.statement) && /may burst if heated/.test(o.statement); })());

// --- B.3.2 Chemicals under pressure (Table B.3.2) -------------------------------------------
const cup = (fc, hoc, g) => run('liquid', { packaging: 'pressurized', flammableComponentsPct: fc, heatOfCombustion: hoc, gaugePressureKPa: g });
check('CUP: 85 % / 20 kJ/g → Category 1 (Danger, flame + gas cylinder)', (() => { const o = find(cup(85, 20), 'Chemical Under Pressure'); return o.category === 1 && o.signal === 'Danger' && /Flame/.test(o.pictogram) && /Gas cylinder/.test(o.pictogram); })());
check('CUP: 2 % / 19 kJ/g → Category 2', cat(cup(2, 19), 'Chemical Under Pressure') === '2');
check('CUP: 84 % / 25 kJ/g → Category 2', cat(cup(84, 25), 'Chemical Under Pressure') === '2');
check('CUP: 1 % / 19.9 kJ/g → Category 3 (gas cylinder only)', (() => { const o = find(cup(1, 19.9), 'Chemical Under Pressure'); return o.category === 3 && o.pictogram === 'Gas cylinder'; })());
check('CUP: gauge pressure 199 kPa → not a chemical under pressure', sec(cup(50, 25, 199), 'cup').status === 'not-applicable');
check('CUP: missing heat of combustion → not assessed', sec(run('liquid', { packaging: 'pressurized', flammableComponentsPct: 50 }), 'cup').status === 'not-assessed');

// --- B.2 Flammable gases (Table B.2.1) ---------------------------------------------------------
const gas = (p) => run('gas', p);
check('LFL 13 % meets the 1A flammability criteria; LFL >6 % then gives Category 1B', cat(gas({ lflPct: 13, uflPct: 20 }), 'Flammable Gas') === '1B');
check('LFL 2 %, no burning velocity → Category 1A (note 2 default)', cat(gas({ lflPct: 2, uflPct: 10 }), 'Flammable Gas') === '1A');
check('LFL 13.1 %, range 11.9 points → Category 2', cat(gas({ lflPct: 13.1, uflPct: 25 }), 'Flammable Gas') === '2');
check('LFL 14 %, range 12 points → Category 1A criteria, then 1B (LFL >6 %)', cat(gas({ lflPct: 14, uflPct: 26 }), 'Flammable Gas') === '1B');
check('LFL 5 %, burning velocity 9 cm/s → Category 1B', cat(gas({ lflPct: 5, uflPct: 15, burningVelocity: 9 }), 'Flammable Gas') === '1B');
check('LFL 5 %, burning velocity 10 cm/s → Category 1A', cat(gas({ lflPct: 5, uflPct: 15, burningVelocity: 10 }), 'Flammable Gas') === '1A');
check('flammable without limits → Category 1A by default (note 2)', cat(gas({ gasFlammable: 'yes' }), 'Flammable Gas') === '1A');
check('not flammable → no outcome, not "not assessed"', (() => { const r = gas({ gasFlammable: 'no' }); return !find(r, 'Flammable Gas') && sec(r, 'flamGas').status === 'screened'; })());
check('untested with >1 % pyrophoric components → pyrophoric gas (note 4), never 1B', (() => { const o = find(gas({ lflPct: 8, uflPct: 15, pyrophoricComponentsPct: 1.1 }), 'Flammable Gas'); return /1A \(pyrophoric gas\)/.test(o.category) && /ignite spontaneously/.test(o.statement); })());
check('1 % pyrophoric components → not pyrophoric by note 4', !/pyrophoric/.test(cat(gas({ lflPct: 8, uflPct: 15, pyrophoricComponentsPct: 1 }), 'Flammable Gas')));
check('chemically unstable gas A adds its statement', /react explosively even in the absence of air$/.test(find(gas({ lflPct: 5, uflPct: 15, unstableGas: 'A' }), 'Flammable Gas').statement));
check('Category 2 flammable gas: Warning, no pictogram', (() => { const o = find(gas({ lflPct: 15, uflPct: 20 }), 'Flammable Gas'); return o.signal === 'Warning' && o.pictogram === null; })());
check('aerosol in gas state is not a flammable gas (note 1)', sec(run('gas', { packaging: 'aerosol', lflPct: 2, uflPct: 10 }), 'flamGas').status === 'not-applicable');

// --- B.4 Oxidizing gases, B.5 Gases under pressure -----------------------------------------------
check('oxidizing power 23.6 % → Oxidizing Gas 1; 23.5 % → not classified', cat(gas({ oxidizingPowerPct: 23.6 }), 'Oxidizing Gas') === '1' && !find(gas({ oxidizingPowerPct: 23.5 }), 'Oxidizing Gas'));
check('critical temperature −50 °C → compressed gas', cat(gas({ criticalTempC: -50 }), 'Gas Under Pressure') === 'Compressed gas');
check('critical temperature 65 °C → high-pressure liquefied gas', cat(gas({ criticalTempC: 65 }), 'Gas Under Pressure') === 'Liquefied gas (high pressure)');
check('critical temperature 65.1 °C → low-pressure liquefied gas', cat(gas({ criticalTempC: 65.1 }), 'Gas Under Pressure') === 'Liquefied gas (low pressure)');
check('refrigerated liquefied gas: cryogenic statement', /cryogenic burns/.test(find(gas({ gasGroup: 'refrigerated' }), 'Gas Under Pressure').statement));
check('"not a gas under pressure" → no outcome', !find(gas({ gasGroup: 'none' }), 'Gas Under Pressure') && sec(gas({ gasGroup: 'none' }), 'gasPressure').status === 'screened');

// --- B.16 Corrosive to metals ----------------------------------------------------------------------
check('steel 6.26 mm/year → Category 1 (Warning, corrosion)', (() => { const o = find(run('liquid', { corrosionSteel: 6.26 }), 'Corrosive to Metals'); return o && o.signal === 'Warning' && o.pictogram === 'Corrosion'; })());
check('steel 6.25 and aluminium 6.25 → not classified', (() => { const r = run('liquid', { corrosionSteel: 6.25, corrosionAluminium: 6.25 }); return !find(r, 'Corrosive to Metals') && sec(r, 'metals').status === 'screened'; })());
check('only one metal negative → not assessed (both needed)', sec(run('liquid', { corrosionSteel: 3 }), 'metals').status === 'not-assessed');
check('aluminium alone positive → Category 1', !!find(run('liquid', { corrosionAluminium: 10 }), 'Corrosive to Metals'));

// --- OSHA-defined hazards ----------------------------------------------------------------------------
check('simple asphyxiant: Warning, no pictogram, C.4.31 statement', (() => { const o = find(gas({ simpleAsphyxiant: 'yes' }), 'Simple Asphyxiant'); return o && o.signal === 'Warning' && o.pictogram === null && o.statement === 'May displace oxygen and cause rapid suffocation'; })());
check('combustible dust shipped as dust', find(run('solid', { combustibleDust: 'dust' }), 'Combustible Dust').statement === 'May form combustible dust concentrations in air');
check('combustible dust formed in processing uses the bracketed wording', /if small particles are generated/.test(find(run('solid', { combustibleDust: 'may_form' }), 'Combustible Dust').statement));
check('HNOC: one outcome per line, SDS only (label optional)', (() => { const r = run('liquid', { hnoc: 'Effect one\n\nEffect two' }); const h = r.outcomes.filter((o) => o.name === 'Hazard Not Otherwise Classified'); return h.length === 2 && h.every((o) => o.labelRequired === false) && r.signal === null; })());
check('respiratory tract (lethal): corrosion pictogram, flagged when no inhalation toxicity', (() => { const r = run('liquid', { respiratoryCorrosive: 'lethal' }); const o = find(r, 'Corrosive to the Respiratory Tract'); return o && o.pictogram === 'Corrosion' && sec(r, 'respCorr').steps.some((s) => /No acute inhalation toxicity/.test(s)); })());
check('respiratory tract (non-lethal): no outcome, directed to STOT', (() => { const r = run('liquid', { respiratoryCorrosive: 'non_lethal' }); return !find(r, 'Corrosive to the Respiratory Tract') && sec(r, 'respCorr').steps.some((s) => /STOT/.test(s)); })());

// --- Signal word and report ---------------------------------------------------------------------------
check('physical Danger sets the screen signal word', gas({ lflPct: 2, uflPct: 10 }).signal === 'Danger');
check('report includes physical sections', /Aerosols \[not-applicable\]/.test(US.report({}, blank)) && /Corrosive to metals \[not-assessed\]/.test(US.report({}, blank)));

console.log(pass + ' US HazCom 2024 physical-hazard checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
