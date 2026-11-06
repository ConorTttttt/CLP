// Supplemental hazard information (EUH) for mixtures — CLP Annex II Parts 1, 2 and 4.
const CLP = require('./engine.js');
let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL: ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); } };

function ing(name, pct, codes, patch) {
  const i = CLP.blankIngredient(); i.name = name; i.pct = pct;
  if (codes) CLP.applyHCodes(i, codes);
  return Object.assign(i, patch || {});
}
const water = (p) => ing('water', p);
const run = (ings, mix) => CLP.classify(Object.assign({ state: 'liquid', ingredients: ings }, mix || {}));
const euh = (r) => r.label.euhStatements.map((x) => x.code);
const has = (r, c) => euh(r).includes(c);
const rev = (r, c) => r.label.supplementalHazardInformation.review.some((x) => x.codes.includes(c));

/* ---- parser ---- */
{
  const p = CLP.parseHCodeTokens('EUH201A EUH209A EUH066 EUH201B');
  t('parser keeps EUH201A/EUH209A', p.codes.map((c) => c.code).join() === 'EUH201A,EUH209A,EUH066', p.codes);
  t('parser rejects EUH201B', p.invalid.includes('EUH201B'));
}

/* ---- EUH070: ≥ 0.1 % of a substance labelled EUH070 (Annex II 1.2.5) ---- */
t('EUH070 at 0.1 %', has(run([ing('A', 0.1, 'EUH070'), water(99.9)]), 'EUH070'));
t('EUH070 below 0.1 %', !has(run([ing('A', 0.099, 'EUH070'), water(99.901)]), 'EUH070'));
t('EUH070 Annex VI Part 3 limit', !has(run([ing('A', 0.5, 'EUH070', { scl: { euh070: '1' } }), water(99.5)]), 'EUH070'));
t('EUH070 confirmed from data', has(run([water(100)], { euhConfirmed: ['EUH070'] }), 'EUH070'));

/* ---- EUH071 (Annex II 1.2.6) ---- */
{
  const corr = () => [ing('acid', 10, 'H314', { skinCorr: '1A' }), water(90)];
  t('EUH071 corrosive + inhalable + no inh data', has(run(corr(), { mayBeInhaled: 'yes' }), 'EUH071'));
  t('EUH071 not when inh test data exist', !has(run(corr(), { mayBeInhaled: 'yes', acuteInhTestData: true }), 'EUH071'));
  t('EUH071 not when not inhalable', !has(run(corr(), { mayBeInhaled: 'no' }), 'EUH071'));
  t('EUH071 review when inhalability unknown', rev(run(corr()), 'EUH071') && !has(run(corr()), 'EUH071'));
  const notCorr = run([ing('X', 0.5, 'EUH071 H314', { skinCorr: '1B' }), water(99.5)], { mayBeInhaled: 'yes' });
  t('EUH071 ingredient only -> review, not transfer', !has(notCorr, 'EUH071') && rev(notCorr, 'EUH071'));
}

/* ---- property-based Part 1 ---- */
{
  const r = run([ing('NaOCl', 5, 'EUH031'), water(95)]);
  t('EUH031 ingredient -> review only', !has(r, 'EUH031') && rev(r, 'EUH031'));
  t('EUH031 confirmed -> assigned', has(run([ing('NaOCl', 5, 'EUH031'), water(95)], { euhConfirmed: ['EUH031'] }), 'EUH031'));
  t('EUH014 confirmed', has(run([water(100)], { euhConfirmed: ['EUH014'] }), 'EUH014'));
  const irr = [ing('irr', 20, 'H315', { skinCorr: '2' }), water(80)];
  t('EUH066 suppressed when Skin Irrit. 2', !has(run(irr, { euhConfirmed: ['EUH066'] }), 'EUH066'));
  t('EUH066 confirmed, not irritant', has(run([ing('solvent', 30, 'EUH066'), water(70)], { euhConfirmed: ['EUH066'] }), 'EUH066'));
  t('EUH018 suppressed when flammable', !has(run([water(100)], { flashPoint: '30', euhConfirmed: ['EUH018'] }), 'EUH018'));
  t('EUH018 screen review from flammable ingredient', rev(run([ing('ethanol', 4, 'H225'), water(96)], { flashPoint: '80' }), 'EUH018'));
}

/* ---- EUH201 / EUH201A (Annex II 2.1) ---- */
t('EUH201 paint lead > 0.15 %', has(run([water(100)], { isPaintVarnish: true, leadPct: '0.16' }), 'EUH201'));
t('EUH201 not at 0.15 %', !has(run([water(100)], { isPaintVarnish: true, leadPct: '0.15' }), 'EUH201'));
t('EUH201A on small pack when chosen', has(run([water(100)], { isPaintVarnish: true, leadPct: '1', packVolumeMl: '100', leadShortStatement: true }), 'EUH201A'));
t('EUH201A not allowed on 125 ml', has(run([water(100)], { isPaintVarnish: true, leadPct: '1', packVolumeMl: '125', leadShortStatement: true }), 'EUH201'));
t('lead but not paint -> review', rev(run([water(100)], { leadPct: '1' }), 'EUH201'));

/* ---- EUH202, EUH207, EUH401 ---- */
t('EUH202 cyanoacrylate adhesive', has(run([ing('ethyl 2-cyanoacrylate', 95), water(5)], { isCyanoacrylateAdhesive: true }), 'EUH202'));
t('EUH202 name hint -> review', rev(run([ing('ethyl 2-cyanoacrylate', 95), water(5)]), 'EUH202'));
t('EUH207 Cd brazing alloy', has(run([ing('alloy', 100)], { state: 'solid', isCdBrazingAlloy: true }), 'EUH207'));
t('EUH401 plant protection', has(run([water(100)], { isPlantProtection: true }), 'EUH401'));

/* ---- EUH203 cement Cr(VI) (Annex II 2.3) ---- */
t('EUH203 Cr(VI) > 2 ppm', has(run([ing('cement', 100)], { state: 'solid', isCement: true, solubleCrVIppm: '2.1' }), 'EUH203'));
t('EUH203 not at 2 ppm', !has(run([ing('cement', 100)], { state: 'solid', isCement: true, solubleCrVIppm: '2' }), 'EUH203'));
t('EUH203 not when labelled H317', !has(run([ing('sens', 2, 'H317', { skinSens: '1B' }), ing('cement', 98)], { state: 'solid', isCement: true, solubleCrVIppm: '5' }), 'EUH203'));
t('EUH203 missing Cr(VI) -> review', rev(run([ing('cement', 100)], { state: 'solid', isCement: true }), 'EUH203'));

/* ---- EUH204 / EUH205 and EUH208 interplay (Annex II 2.4, 2.5, 2.8) ---- */
{
  const iso = ing('HDI', 0.2, 'H317 H334', { skinSens: '1', respSens: '1', isocyanate: true });
  const r = run([iso, water(99.8)]);
  t('EUH204 at low concentration', has(r, 'EUH204'));
  t('EUH208 for isocyanate replaced by EUH204', !has(r, 'EUH208'), euh(r));
  const plain = ing('hexamethylene diisocyanate', 0.2, 'H317 H334', { skinSens: '1', respSens: '1' });
  const r2 = run([plain, water(99.8)]);
  t('without flag: single EUH208 + review', euh(r2).filter((c) => c === 'EUH208').length === 1 && rev(r2, 'EUH204'), euh(r2));
  t('EUH205 epoxy MW ≤ 700', has(run([ing('BADGE resin', 30, 'H315 H317', { epoxyLowMW: true }), water(70)]), 'EUH205'));
}

/* ---- EUH206 active chlorine (Annex II 2.6) ---- */
t('EUH206 consumer > 1 %', has(run([water(100)], { audience: 'consumer', activeChlorinePct: '1.5' }), 'EUH206'));
t('EUH206 not at 1 %', !has(run([water(100)], { audience: 'consumer', activeChlorinePct: '1' }), 'EUH206'));
t('EUH206 not professional', !has(run([water(100)], { audience: 'professional', activeChlorinePct: '5' }), 'EUH206'));
t('EUH206 audience unknown -> review', rev(run([water(100)], { activeChlorinePct: '5' }), 'EUH206'));

/* ---- EUH209 / EUH209A (Annex II 2.9) ---- */
{
  const dcm = ing('dichloromethane', 60, 'H351', { carc: '2', halogenatedHC: true });
  t('EUH209 highly flammable > 5 %', has(run([dcm, ing('acetone', 10, 'H225'), water(30)], { noFlashPoint: true }), 'EUH209'));
  t('EUH209A flammable only', has(run([dcm, ing('xylene', 10, 'H226'), water(30)], { flashPoint: '70' }), 'EUH209A'));
  t('EUH209 not at 5 %', !has(run([dcm, ing('acetone', 5, 'H225'), water(35)], { noFlashPoint: true }), 'EUH209'));
  t('EUH209 not with FP 50 °C', !has(run([dcm, ing('acetone', 10, 'H225'), water(30)], { flashPoint: '50' }), 'EUH209'));
  t('EUH209 not with FP 94 °C', !has(run([dcm, ing('acetone', 10, 'H225'), water(30)], { flashPoint: '94' }), 'EUH209'));
  t('EUH209 needs halogenated HC', !has(run([ing('acetone', 10, 'H225'), water(90)], { noFlashPoint: true }), 'EUH209'));
}

/* ---- EUH211 / EUH212 TiO2 (Annex II 2.12) and EUH210 link ---- */
t('EUH211 liquid ≥ 1 % respirable TiO2', has(run([ing('TiO2', 1, null, { tio2: 'respirable' }), water(99)]), 'EUH211'));
t('EUH211 not < 1 %', !has(run([ing('TiO2', 0.9, null, { tio2: 'respirable' }), water(99.1)]), 'EUH211'));
t('EUH211 size unknown -> review', rev(run([ing('TiO2', 5, null, { tio2: 'present' }), water(95)]), 'EUH211'));
t('EUH212 solid ≥ 1 % TiO2', has(run([ing('TiO2', 2, null, { tio2: 'present' }), ing('filler', 98)], { state: 'solid' }), 'EUH212'));
t('EUH212 + EUH210 professional', (() => { const r = run([ing('TiO2', 2, null, { tio2: 'present' }), ing('filler', 98)], { state: 'solid', audience: 'professional' }); return has(r, 'EUH212') && has(r, 'EUH210'); })());

/* ---- EUH210 (Annex II 2.10) ---- */
t('EUH210 Carc. 2 ≥ 0.1 %, professional', has(run([ing('C', 0.1, 'H351'), water(99.9)], { audience: 'professional' }), 'EUH210'));
t('EUH210 not for consumers', !has(run([ing('C', 0.1, 'H351'), water(99.9)], { audience: 'consumer' }), 'EUH210'));
t('EUH210 not when classified', !has(run([ing('C', 1, 'H351'), water(99)], { audience: 'professional' }), 'EUH210'));
t('EUH210 ≥ 1 % health-classified ingredient', has(run([ing('irr', 1, 'H315', { skinCorr: '2' }), water(99)], { audience: 'industrial' }), 'EUH210'));
t('EUH210 ≥ 1 % Union OEL substance', has(run([ing('oel', 1, null, { sdsUnionOEL: true }), water(99)], { audience: 'industrial' }), 'EUH210'));
t('EUH210 gas 0.2 % v/v', has(run([ing('g', 0.2, 'H315', { skinCorr: '2' }), ing('N2', 99.8)], { state: 'gas', audience: 'industrial' }), 'EUH210'));
t('EUH210 audience unknown -> review', rev(run([ing('C', 0.1, 'H351'), water(99.9)]), 'EUH210'));
t('EUH210 no trigger', !has(run([water(100)], { audience: 'professional' }), 'EUH210'));

/* ---- integration ---- */
{
  const r = run([water(100)]);
  const H = r.hazards.find((h) => h.id === 'euh');
  t('EUH hazard panel present and not classified', H && H.status === 'not');
  const r2 = run([water(100)], { isPlantProtection: true });
  t('panel classified when EUH assigned, no outcome added', r2.hazards.find((h) => h.id === 'euh').status === 'classified' && r2.outcomes.length === 0);
  t('report lists EUH section', /SUPPLEMENTAL HAZARD INFORMATION[\s\S]*EUH401/.test(CLP.report({ state: 'liquid', ingredients: [water(100)], isPlantProtection: true }, r2)));
  const r3 = run([ing('A', 1, 'EUH070'), water(99)], { euhConfirmed: ['EUH070'] });
  t('no duplicate EUH070', euh(r3).filter((c) => c === 'EUH070').length === 1);
}

console.log(`${pass} EUH supplemental hazard tests passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
