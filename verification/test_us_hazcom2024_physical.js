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
check('every Appendix B class has a section', ['explosive', 'desensitized', 'aerosol', 'cup', 'flamGas', 'oxGas', 'gasPressure', 'flammable', 'flamSolid', 'selfReactive', 'pyrophoric', 'selfHeating', 'waterReactive', 'oxidizer', 'organicPeroxide', 'metals'].every((id) => sec(blank, id)));
check('liquid without data: batch 2 classes not assessed', ['explosive', 'desensitized', 'selfReactive', 'pyrophoric', 'selfHeating', 'waterReactive', 'oxidizer', 'organicPeroxide'].every((id) => sec(blank, id).status === 'not-assessed'));

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

// ================= Batch 2: B.1, B.7–B.15, B.17 =================
const liq = (p, x) => run('liquid', p, x), sol = (p, x) => run('solid', p, x);
// B.1 Explosives
check('explosive Division 1.1: Danger, exploding bomb, mass explosion', (() => { const o = find(sol({ explosiveResult: '1.1' }), 'Explosive'); return o.signal === 'Danger' && o.pictogram === 'Exploding bomb' && o.statement === 'Explosive; mass explosion hazard'; })());
check('Division 1.4: Warning; 1.5: Danger without pictogram; 1.6: no signal word', find(sol({ explosiveResult: '1.4' }), 'Explosive').signal === 'Warning' &&
  find(sol({ explosiveResult: '1.5' }), 'Explosive').pictogram === null && find(sol({ explosiveResult: '1.6' }), 'Explosive').signal === null);
check('unstable explosive', find(sol({ explosiveResult: 'unstable' }), 'Explosive').statement === 'Unstable explosive');
check('screening exemption → not classified', (() => { const r = sol({ explosiveResult: 'screen_oxygen_balance' }); return !find(r, 'Explosive') && sec(r, 'explosive').status === 'screened'; })());
check('known explosive ingredient blocks screening exemption (B.1.3.3)', (() => { const r = US.classify({ state: 'solid', physical: { explosiveResult: 'screen_no_groups' }, ingredients: [{ name: 'E', pct: '5', hcodes: 'H201' }, { name: 'W', pct: '95' }] }); return sec(r, 'explosive').status === 'not-assessed' && sec(r, 'explosive').steps.some((x) => /B\.1\.3\.3/.test(x)); })());
check('gases are not explosives', sec(run('gas', { explosiveResult: '1.1' }), 'explosive').status === 'not-applicable');
// B.17 Desensitized explosives
const des = (ac, x) => sol(Object.assign({ desensitized: 'yes', desensBurningRate: ac }, x || {}));
check('Ac 300 → Category 1 (H206); 1200 → Category 1', cat(des(300), 'Desensitized Explosive') === '1' && find(des(300), 'Desensitized Explosive').code === 'H206' && cat(des(1200), 'Desensitized Explosive') === '1');
check('Ac 299 → 2; 140 → 2; 139 → 3; 60 → 3; 59 → 4', cat(des(299), 'Desensitized Explosive') === '2' && cat(des(140), 'Desensitized Explosive') === '2' &&
  cat(des(139), 'Desensitized Explosive') === '3' && cat(des(60), 'Desensitized Explosive') === '3' && cat(des(59), 'Desensitized Explosive') === '4');
check('Category 4: Warning, fire hazard wording, H208', (() => { const o = find(des(10), 'Desensitized Explosive'); return o.signal === 'Warning' && /^Fire hazard;/.test(o.statement) && o.code === 'H208'; })());
check('Ac >1200 → classify as explosive instead', (() => { const r = des(1201); return !find(r, 'Desensitized Explosive') && sec(r, 'explosive').steps.some((x) => /1200 kg\/min/.test(x)); })());
check('desensitized explosive excludes explosive and flammable solid (note 3)', (() => { const r = des(200, { explosiveResult: '1.3', flamSolidType: 'non_metal', burningTimeS: 10 }); return !find(r, 'Explosive') && !find(r, 'Flammable Solid') && sec(r, 'flamSolid').status === 'not-applicable'; })());
// B.7 Flammable solids
check('burning time 44.9 s → flammable solid; 45 s and 2.2 mm/s → not', !!find(sol({ flamSolidType: 'non_metal', burningTimeS: 44.9 }), 'Flammable Solid') &&
  !find(sol({ flamSolidType: 'non_metal', burningTimeS: 45, burningRateMmS: 2.2 }), 'Flammable Solid'));
check('burning rate 2.21 mm/s → flammable solid', !!find(sol({ flamSolidType: 'non_metal', burningRateMmS: 2.21 }), 'Flammable Solid'));
check('wetted zone stops fire ≥4 min → Category 2 (Warning); does not stop → Category 1 (Danger)', (() => {
  const a = find(sol({ flamSolidType: 'non_metal', burningTimeS: 30, wettedZone: 'stopped4' }), 'Flammable Solid'), b = find(sol({ flamSolidType: 'non_metal', burningTimeS: 30, wettedZone: 'not_stopped' }), 'Flammable Solid');
  return a.category === 2 && a.signal === 'Warning' && b.category === 1 && b.signal === 'Danger'; })());
check('metal powder 5 min → 1; 5.1 → 2; 10 → 2; 10.1 → not', cat(sol({ flamSolidType: 'metal_powder', metalBurnMin: 5 }), 'Flammable Solid') === '1' && cat(sol({ flamSolidType: 'metal_powder', metalBurnMin: 5.1 }), 'Flammable Solid') === '2' &&
  cat(sol({ flamSolidType: 'metal_powder', metalBurnMin: 10 }), 'Flammable Solid') === '2' && !find(sol({ flamSolidType: 'metal_powder', metalBurnMin: 10.1 }), 'Flammable Solid'));
check('flammable solid only for solids', sec(liq({ flamSolidType: 'non_metal', burningTimeS: 10 }), 'flamSolid').status === 'not-applicable');
// B.8 Self-reactive, B.15 Organic peroxides
check('self-reactive Type A/B/C–D/E–F/G label elements', (() => {
  const t = (x) => find(liq({ selfReactiveType: x }), 'Self-Reactive Chemical');
  return t('A').pictogram === 'Exploding bomb' && t('B').statement === 'Heating may cause a fire or explosion' && t('D').signal === 'Danger' && t('E').signal === 'Warning' && t('G').labelRequired === false && t('G').signal === null; })());
check('self-reactive: decomposition 299 J/g → not; SADT 76 °C → not', !find(liq({ decompositionEnergy: 299 }), 'Self-Reactive Chemical') && sec(liq({ decompositionEnergy: 299 }), 'selfReactive').status === 'screened' &&
  sec(liq({ sadtC: 76 }), 'selfReactive').status === 'screened');
check('explosive or organic peroxide excludes self-reactive', sec(sol({ explosiveResult: '1.1', selfReactiveType: 'C' }), 'selfReactive').status === 'not-applicable' && sec(liq({ opType: 'D', selfReactiveType: 'C' }), 'selfReactive').status === 'not-applicable');
check('organic peroxide exemption: AO 1.0 % with H2O2 1.0 % → not considered', (() => { const r = liq({ opAvailableOxygen: 1, opHydrogenPeroxide: 1, opType: 'D' }); return !find(r, 'Organic Peroxide') && sec(r, 'organicPeroxide').status === 'screened'; })());
check('organic peroxide: AO 0.6 % with H2O2 5 % → classified (limit 0.5 %)', cat(liq({ opAvailableOxygen: 0.6, opHydrogenPeroxide: 5, opType: 'D' }), 'Organic Peroxide') === 'Type D');
check('organic peroxide Type B follows published C.4.28 wording and flags the GHS difference', (() => { const r = liq({ opType: 'B' }); return find(r, 'Organic Peroxide').statement === 'Heating may cause an explosion' && sec(r, 'organicPeroxide').steps.some((x) => /H241/.test(x)); })());
// B.9–B.10 Pyrophoric, B.11 Self-heating
check('pyrophoric liquid and solid', find(liq({ pyrophoric: 'yes' }), 'Pyrophoric Liquid').statement === 'Catches fire spontaneously if exposed to air' && !!find(sol({ pyrophoric: 'yes' }), 'Pyrophoric Solid'));
check('pyrophoric: handling experience → not classified', sec(liq({ pyrophoric: 'experience' }), 'pyrophoric').status === 'screened');
check('self-heating: 25 mm positive → Category 1 (Danger)', find(sol({ sh25at140: 'pos' }), 'Self-Heating').signal === 'Danger');
check('self-heating Category 2 via (a) >3 m³, (b) 120 °C + >450 L, (c) 100 °C', ['3001', null, null].every(() => true) &&
  cat(sol({ sh25at140: 'neg', sh100at140: 'pos', shUnitVolumeL: 3001 }), 'Self-Heating') === '2' &&
  cat(sol({ sh25at140: 'neg', sh100at140: 'pos', sh100at120: 'pos', shUnitVolumeL: 451 }), 'Self-Heating') === '2' &&
  cat(sol({ sh25at140: 'neg', sh100at140: 'pos', sh100at100: 'pos' }), 'Self-Heating') === '2');
check('self-heating: 3000 L and 120 °C negative → not classified', !find(sol({ sh25at140: 'neg', sh100at140: 'pos', sh100at120: 'neg', sh100at100: 'neg', shUnitVolumeL: 3000 }), 'Self-Heating'));
check('self-heating: 100 mm at 140 °C negative → not self-heating', sec(sol({ sh25at140: 'neg', sh100at140: 'neg' }), 'selfHeating').status === 'screened');
check('pyrophoric excludes self-heating', sec(sol({ pyrophoric: 'yes', sh25at140: 'pos' }), 'selfHeating').status === 'not-applicable');
// B.12 Water-reactive
check('spontaneous ignition → Category 1 (Danger, may ignite spontaneously)', /ignite spontaneously/.test(find(sol({ wrIgnition: 'yes' }), 'Emits Flammable Gas in Contact with Water').statement));
check('10 L/kg in one minute → 1; 20 L/kg/h → 2 (Danger); 1.1 → 3 (Warning); 1 → not', cat(sol({ wrRatePerMinute: 10 }), 'Emits Flammable Gas in Contact with Water') === '1' &&
  find(sol({ wrRatePerHour: 20 }), 'Emits Flammable Gas in Contact with Water').signal === 'Danger' && find(sol({ wrRatePerHour: 1.1 }), 'Emits Flammable Gas in Contact with Water').signal === 'Warning' &&
  !find(sol({ wrRatePerHour: 1 }), 'Emits Flammable Gas in Contact with Water'));
check('water-reactive screening (no metals) → not applied', sec(sol({ wrScreen: 'no_metals' }), 'waterReactive').status === 'screened');
// B.13–B.14 Oxidizers
check('oxidizing liquid 1: strong oxidizer (Danger); 3: Warning', find(liq({ oxidizerResult: '1' }), 'Oxidizing Liquid').statement === 'May cause fire or explosion; strong oxidizer' && find(liq({ oxidizerResult: '3' }), 'Oxidizing Liquid').signal === 'Warning');
check('oxidizing solid uses the solid class', !!find(sol({ oxidizerResult: '2' }), 'Oxidizing Solid') && sec(sol({ oxidizerResult: '2' }), 'oxidizer').source.includes('B.14'));
check('oxidizer screening exemption', sec(liq({ oxidizerResult: 'exempt' }), 'oxidizer').status === 'screened');

// --- Signal word and report ---------------------------------------------------------------------------
check('physical Danger sets the screen signal word', gas({ lflPct: 2, uflPct: 10 }).signal === 'Danger');
check('report includes physical sections', /Aerosols \[not-applicable\]/.test(US.report({}, blank)) && /Corrosive to metals \[not-assessed\]/.test(US.report({}, blank)));

console.log(pass + ' US HazCom 2024 physical-hazard checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
