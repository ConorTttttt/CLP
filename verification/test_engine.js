const CLP = require('./engine.js');
let pass = 0, fail = 0;
const t = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('FAIL: ' + name + (extra ? '  -> ' + extra : '')); } };

function ing(pct, codes, patch) {
  const i = CLP.blankIngredient(); i.name = 'X'; i.pct = pct;
  if (codes) CLP.applyHCodes(i, codes);
  return Object.assign(i, patch || {});
}
const water = (p) => Object.assign(CLP.blankIngredient(), { name: 'water', pct: p });
const run = (ings, mix) => CLP.classify(Object.assign({ state: 'liquid', ingredients: ings }, mix || {}));
const labels = (r) => r.outcomes.map((o) => o.label);
const has = (r, l) => labels(r).includes(l);
const hz = (r, id) => r.hazards.find((h) => h.id === id);

/* ---------- 1. worked example from the earlier turn (independent hand calc) ---------- */
{
  const A = ing(20, 'H225 H319 H336'); A.name = 'A';
  const B = ing(30, 'H226 H312 H332 H315 H336 H411'); B.name = 'B';
  const C = ing(10, 'H302 H319'); C.name = 'C'; C.acute.oral.ate = '400';
  const D = ing(4, 'H301 H312 H314 H318'); D.name = 'D'; D.skinCorr = '1B';
  const E = ing(5, 'H318 H412'); E.name = 'E';
  const F = ing(1.0, 'H317 H400 H410'); F.name = 'F'; F.skinSens = '1B'; F.mAcute = '10'; F.mChronic = '10';
  const r = run([A, B, C, D, E, F, water(30)], { flashPoint: '27', pH: '10.9' });
  const exp = ['Flam. Liq. 3', 'Acute Tox. 4 (oral)', 'Skin Irrit. 2', 'Eye Dam. 1', 'Skin Sens. 1B', 'STOT SE 3 (narcotic effects)', 'Aquatic Chronic 2'];
  t('example outcomes', exp.every((l) => has(r, l)) && r.outcomes.length === exp.length, labels(r).join(' | '));
  const oral = r.outcomes.find((o) => o.label === 'Acute Tox. 4 (oral)');
  t('example oral ATEmix 1538.46', oral && Math.abs(oral.ate - 1538.4615) < 0.01, oral && oral.ate);
  t('example label signal', r.label.signal === 'Danger');
  t('example pictograms', r.label.pictograms.map((p) => p.code).join() === 'GHS02,GHS05,GHS07,GHS09', r.label.pictograms.map((p) => p.code).join());
  t('example H list', ['H226', 'H302', 'H315', 'H317', 'H318', 'H336', 'H411'].every((c) => r.label.hazardStatements.some((h) => h.code === c)));
  t('example no EUH208 (already sensitising)', !r.label.euhStatements.some((x) => x.code === 'EUH208'));
}

/* ---------- 2. skin ---------- */
const skin = (pct, c, extra) => run([ing(pct, null, Object.assign({ skinCorr: c }, extra || {})), water(100 - pct)]);
t('skin 1B 5% -> Corr 1B', has(skin(5, '1B'), 'Skin Corr. 1B'));
t('skin 1B 4.99% -> Irrit 2', has(skin(4.99, '1B'), 'Skin Irrit. 2'));
t('skin 1B 1% -> Irrit 2', has(skin(1, '1B'), 'Skin Irrit. 2'));
t('skin 1B 0.99% -> none', !labels(skin(0.99, '1B')).some((l) => l.startsWith('Skin')));
t('skin irritant 10% -> Irrit 2', has(skin(10, '2'), 'Skin Irrit. 2'));
t('skin irritant 9.99% -> none', !labels(skin(9.99, '2')).some((l) => l.startsWith('Skin')));
t('skin 1A 5% -> 1A', has(skin(5, '1A'), 'Skin Corr. 1A'));
t('skin 1C 5% -> 1C', has(skin(5, '1C'), 'Skin Corr. 1C'));
t('skin unsub 5% -> Corr 1', has(skin(5, '1'), 'Skin Corr. 1'));
{
  const r = run([ing(3, null, { skinCorr: '1A' }), ing(2.5, null, { skinCorr: '1B' }), water(94.5)]);
  t('skin 1A3+1B2.5 -> 1B', has(r, 'Skin Corr. 1B'), labels(r).join());
}
{
  const r = run([ing(2, null, { skinCorr: '1A' }), ing(2, null, { skinCorr: '1B' }), ing(2, null, { skinCorr: '1C' }), water(94)]);
  t('skin 1A2+1B2+1C2 (6%) -> 1C', has(r, 'Skin Corr. 1C'), labels(r).join());
}
{
  const r = run([ing(5, null, { skinCorr: '1B' }), ing(1, null, { skinCorr: '1' }), water(94)]);
  t('skin sub-cat mixed with unsub -> Corr 1 no sub', has(r, 'Skin Corr. 1'), labels(r).join());
}
t('nonadditive corrosive 1% -> Corr 1', has(skin(1, '1B', { nonAdditive: true }), 'Skin Corr. 1'));
t('nonadditive corrosive 0.99% -> none', !labels(skin(0.99, '1B', { nonAdditive: true })).some((l) => l.startsWith('Skin')));
t('nonadditive irritant 3% -> Irrit 2', has(skin(3, '2', { nonAdditive: true }), 'Skin Irrit. 2'));
t('nonadditive irritant 2.99% -> none', !labels(skin(2.99, '2', { nonAdditive: true })).some((l) => l.startsWith('Skin')));

/* ---------- 3. eye ---------- */
const eye = (pct, c, extra) => run([ing(pct, null, Object.assign({ eye: c }, extra || {})), water(100 - pct)]);
t('eye dam 3% -> Dam 1', has(eye(3, '1'), 'Eye Dam. 1'));
t('eye dam 2.99% -> Irrit 2', has(eye(2.99, '1'), 'Eye Irrit. 2'));
t('eye dam 1% -> Irrit 2', has(eye(1, '1'), 'Eye Irrit. 2'));
t('eye dam 0.99% -> none', !labels(eye(0.99, '1')).some((l) => l.startsWith('Eye')));
t('eye irritant 10% -> Irrit 2', has(eye(10, '2'), 'Eye Irrit. 2'));
t('eye irritant 9.99% -> none', !labels(eye(9.99, '2')).some((l) => l.startsWith('Eye')));
t('skin corr 1B 3% counts for eye -> Dam 1', has(skin(3, '1B'), 'Eye Dam. 1'));
{
  // ingredient both skin corr and eye dam 1 counted once: 2% (not 4%) -> Irrit 2 not Dam 1
  const r = run([ing(2, null, { skinCorr: '1B', eye: '1' }), water(98)]);
  t('eye: skin-corr + eye-dam-1 ingredient counted once', has(r, 'Eye Irrit. 2') && !has(r, 'Eye Dam. 1'), labels(r).join());
}
{
  const r = run([ing(6, null, { skinCorr: '1B', eye: '1' }), water(94)]);
  t('skin corr -> eye outcome omitted on label', has(r, 'Skin Corr. 1B') && has(r, 'Eye Dam. 1') && !r.label.hazardStatements.some((h) => h.code === 'H318') && r.label.hazardStatements.some((h) => h.code === 'H314'));
}

/* ---------- 4. pH ---------- */
t('pH 12 -> Skin Corr 1 + Eye Dam 1', (() => { const r = run([water(100)], { pH: '12' }); return has(r, 'Skin Corr. 1') && has(r, 'Eye Dam. 1'); })());
t('pH 11.5 -> corrosive', has(run([water(100)], { pH: '11.5' }), 'Skin Corr. 1'));
t('pH 11.49 -> none', !has(run([water(100)], { pH: '11.49' }), 'Skin Corr. 1'));
t('pH 2 -> corrosive', has(run([water(100)], { pH: '2' }), 'Skin Corr. 1'));
t('pH 2.01 -> none', !has(run([water(100)], { pH: '2.01' }), 'Skin Corr. 1'));
t('pH 12 + reserve ok -> not applied', !has(run([water(100)], { pH: '12', pHReserveOk: true }), 'Skin Corr. 1'));

/* ---------- 5. acute ---------- */
const ac = (rows, mix) => run(rows.concat([water(100 - rows.reduce((s, x) => s + x.pct, 0))]), mix);
{
  const r = ac([ing(10, 'H301')]); // conv 100 -> ATE 1000
  const o = r.outcomes.find((x) => x.label.startsWith('Acute'));
  t('acute Cat3 10% -> ATE 1000 Cat 4', o && o.label === 'Acute Tox. 4 (oral)' && Math.abs(o.ate - 1000) < 1e-6, o && o.ate);
}
t('acute Cat3 4% -> ATE 2500 not classified', !labels(ac([ing(4, 'H301')])).some((l) => l.startsWith('Acute')));
t('acute tested ATE 300 at 50% -> 600 Cat 4', (() => { const a = ing(50, null); a.acute.oral.ate = '300'; return has(ac([a]), 'Acute Tox. 4 (oral)'); })());
t('acute tested ATE 40 at 100% -> Cat 2', (() => { const a = ing(100, null); a.acute.oral.ate = '40'; return has(run([a]), 'Acute Tox. 2 (oral)'); })());
t('acute Cat 1 -> H300 GHS06 Danger', (() => { const r = ac([ing(100, 'H300')]); const o = r.outcomes.find((x) => x.label.startsWith('Acute')); return o && o.h[0] === 'H300' && o.picto[0] === 'GHS06' && o.signal === 'Danger'; })());
{
  const a = ing(40, null); a.acute.oral.ate = '500';
  const u = ing(20, null); u.acute.unknown = true; u.name = 'U';
  const r = run([a, u, water(40)]);
  const o = r.outcomes.find((x) => x.label === 'Acute Tox. 4 (oral)');
  t('acute unknown >10% corrects numerator (100-20)/0.08 = 1000', o && Math.abs(o.ate - 1000) < 1e-6, o && o.ate);
  t('acute unknown statement generated', r.label.supplemental.some((s) => /20 % of the mixture consists of ingredient/.test(s)));
}
{
  const a = ing(40, null); a.acute.oral.ate = '500';
  const u = ing(10, null); u.acute.unknown = true;
  const r = run([a, u, water(50)]);
  const o = r.outcomes.find((x) => x.label === 'Acute Tox. 4 (oral)');
  t('acute unknown =10% uses standard formula (100/0.08=1250)', o && Math.abs(o.ate - 1250) < 1e-6, o && o.ate);
}
t('acute Cat4 0.9% below cut-off ignored', !labels(ac([ing(0.9, 'H302')])).some((l) => l.startsWith('Acute')));
t('acute vapour ATE 2.0 -> Cat 2', (() => { const a = ing(100, null); a.acute.inh.form = 'vapour'; a.acute.inh.ate = '2.0'; return has(run([a]), 'Acute Tox. 2 (inhalation)'); })());
t('acute dust/mist ATE 0.5 -> Cat 2 (0.05<ATE<=0.5)', (() => { const a = ing(100, null); a.acute.inh.form = 'dust_mist'; a.acute.inh.ate = '0.5'; return has(run([a]), 'Acute Tox. 2 (inhalation)'); })());
t('acute gas ATE 20000 -> Cat 4', (() => { const a = ing(100, null); a.acute.inh.form = 'gas'; a.acute.inh.ate = '20000'; return has(run([a], { state: 'gas' }), 'Acute Tox. 4 (inhalation)'); })());
t('acute oral ATE 2000 -> Cat 4; 2001 none', (() => { const a = ing(100, null); a.acute.oral.ate = '2000'; const b = ing(100, null); b.acute.oral.ate = '2001'; return has(run([a]), 'Acute Tox. 4 (oral)') && !has(run([b]), 'Acute Tox. 4 (oral)'); })());

/* ---------- 6. sensitisation ---------- */
const sens = (pct, c, f, mix, extra) => run([ing(pct, null, Object.assign({ [f || 'skinSens']: c }, extra || {})), water(100 - pct)], mix);
t('skin sens 1 at 1.0% -> yes', has(sens(1.0, '1'), 'Skin Sens. 1'));
t('skin sens 1 at 0.99% -> no', !has(sens(0.99, '1'), 'Skin Sens. 1'));
t('skin sens 1A at 0.1% -> 1A', has(sens(0.1, '1A'), 'Skin Sens. 1A'));
t('skin sens 1A at 0.099% -> no', !labels(sens(0.099, '1A')).some((l) => l.startsWith('Skin Sens')));
t('skin sens 1B at 1% -> 1B; 0.99 no', has(sens(1, '1B'), 'Skin Sens. 1B') && !has(sens(0.99, '1B'), 'Skin Sens. 1B'));
t('resp sens 1 liquid 1.0% yes, 0.2% no', has(sens(1, '1', 'respSens'), 'Resp. Sens. 1') && !has(sens(0.2, '1', 'respSens'), 'Resp. Sens. 1'));
t('resp sens 1 gas 0.2% yes', has(sens(0.2, '1', 'respSens', { state: 'gas' }), 'Resp. Sens. 1'));
t('skin sens SCL overrides (SCL 0.05, 0.06% 1B)', has(sens(0.06, '1B', 'skinSens', null, { scl: { skinSens: 0.05 } }), 'Skin Sens. 1B'));
{
  const r = sens(0.01, '1A');
  t('EUH208 at elicitation 0.01% (1A, not classified)', r.label.euhStatements.some((x) => x.code === 'EUH208') && !has(r, 'Skin Sens. 1A'));
  const r2 = sens(0.009, '1A');
  t('no EUH208 below 0.01%', !r2.label.euhStatements.some((x) => x.code === 'EUH208'));
  const r3 = sens(0.1, '1B');
  t('EUH208 1B at 0.1%', r3.label.euhStatements.some((x) => x.code === 'EUH208'));
  const r4 = sens(0.5, '1');
  t('EUH208 Cat 1 at 0.5%', r4.label.euhStatements.some((x) => x.code === 'EUH208') && r4.sds.length > 0);
}

/* ---------- 7. CMR ---------- */
const one = (f, c, pct) => run([ing(pct, null, { [f]: c }), water(100 - pct)]);
t('carc 1B 0.1% yes / 0.099 no', has(one('carc', '1B', 0.1), 'Carc. 1B') && !has(one('carc', '1B', 0.099), 'Carc. 1B'));
t('carc 2 1.0 yes / 0.99 no', has(one('carc', '2', 1.0), 'Carc. 2') && !has(one('carc', '2', 0.99), 'Carc. 2'));
t('muta 1A 0.1 yes', has(one('muta', '1A', 0.1), 'Muta. 1A'));
t('muta 2 1.0 yes / 0.99 no', has(one('muta', '2', 1.0), 'Muta. 2') && !has(one('muta', '2', 0.99), 'Muta. 2'));
t('repro 1B 0.3 yes / 0.29 no', has(one('repro', '1B', 0.3), 'Repr. 1B') && !has(one('repro', '1B', 0.29), 'Repr. 1B'));
t('repro 2 3.0 yes / 2.99 no', has(one('repro', '2', 3.0), 'Repr. 2') && !has(one('repro', '2', 2.99), 'Repr. 2'));
t('lact 0.3 yes / 0.29 no', has(one('lact', true, 0.3), 'Lact.') && !has(one('lact', true, 0.29), 'Lact.'));
t('lact has no pictogram/signal', (() => { const r = one('lact', true, 1); const o = r.outcomes.find((x) => x.label === 'Lact.'); return o && o.picto.length === 0 && o.signal === null; })());
t('carc 2 at 0.1% -> SDS note only', (() => { const r = one('carc', '2', 0.1); return !has(r, 'Carc. 2') && r.sds.some((s) => /Carc\. 2/.test(s)); })());
t('carc 1A -> Carc.1A H350 Danger GHS08', (() => { const o = one('carc', '1A', 1).outcomes.find((x) => x.label === 'Carc. 1A'); return o && o.h[0] === 'H350' && o.signal === 'Danger' && o.picto[0] === 'GHS08'; })());

/* ---------- 8. STOT ---------- */
t('STOT SE 1 ingr 10% -> Cat 1', has(one('stotSE', '1', 10), 'STOT SE 1'));
t('STOT SE 1 ingr 9.99% -> Cat 2', has(one('stotSE', '1', 9.99), 'STOT SE 2') && !has(one('stotSE', '1', 9.99), 'STOT SE 1'));
t('STOT SE 1 ingr 1% -> Cat 2; 0.99 none', has(one('stotSE', '1', 1), 'STOT SE 2') && !labels(one('stotSE', '1', 0.99)).some((l) => l.startsWith('STOT')));
t('STOT SE 2 ingr 10% -> Cat 2; 9.99 none', has(one('stotSE', '2', 10), 'STOT SE 2') && !labels(one('stotSE', '2', 9.99)).some((l) => l.startsWith('STOT')));
t('STOT RE 1 ingr 10% -> Cat 1; Cat 2 10% -> Cat 2', has(one('stotRE', '1', 10), 'STOT RE 1') && has(one('stotRE', '2', 10), 'STOT RE 2'));
t('STOT SE 3 narc 20% yes / 19.9 no', (() => { const f = (p) => run([ing(p, null, { stotSE: '3', stotSEnarc: true }), water(100 - p)]); return has(f(20), 'STOT SE 3 (narcotic effects)') && !has(f(19.9), 'STOT SE 3 (narcotic effects)'); })());
t('STOT SE 3 two narcotics 10+10 additive', (() => { const r = run([ing(10, null, { stotSE: '3', stotSEnarc: true }), ing(10, null, { stotSE: '3', stotSEnarc: true }), water(80)]); return has(r, 'STOT SE 3 (narcotic effects)'); })());
t('STOT SE 3 resp irritation and narcotic counted separately', (() => { const r = run([ing(15, null, { stotSE: '3', stotSEnarc: true }), ing(15, null, { stotSE: '3', stotSEresp: true }), water(70)]); return !labels(r).some((l) => l.startsWith('STOT SE 3')); })());

/* ---------- 9. aspiration ---------- */
const asp = (pct, v) => run([ing(pct, 'H304'), water(100 - pct)], { viscosity40: v });
t('asp 10% & 20.5 -> Cat 1', has(asp(10, '20.5'), 'Asp. Tox. 1'));
t('asp 10% & 20.6 -> none', !has(asp(10, '20.6'), 'Asp. Tox. 1'));
t('asp 9.9% -> none', !has(asp(9.9, '10'), 'Asp. Tox. 1'));
t('asp no viscosity -> incomplete', (() => { const r = asp(10, ''); return r.incomplete.length === 1; })());

/* ---------- 10. aquatic ---------- */
const aq = (pct, patch, rest) => run([ing(pct, null, patch), water(100 - pct)].concat(rest || []));
t('chronic 1 M=1 25% -> Chronic 1', has(aq(25, { aquaChronic: '1' }), 'Aquatic Chronic 1'));
t('chronic 1 M=1 24.9% -> Chronic 2', has(aq(24.9, { aquaChronic: '1' }), 'Aquatic Chronic 2'));
t('chronic 1 M=10 2.5% -> Chronic 1', has(aq(2.5, { aquaChronic: '1', mChronic: '10' }), 'Aquatic Chronic 1'));
t('chronic 1 M=10 2.4% -> Chronic 2 (10*24=240)', has(aq(2.4, { aquaChronic: '1', mChronic: '10' }), 'Aquatic Chronic 2'));
t('acute 1 M=10 2.5% -> Acute 1; 2.4 no', has(aq(2.5, { aquaAcute: true, mAcute: '10' }), 'Aquatic Acute 1') && !has(aq(2.4, { aquaAcute: true, mAcute: '10' }), 'Aquatic Acute 1'));
t('chronic 2 25% -> 2; 24.9 -> 3 (10*24.9>=25)', has(aq(25, { aquaChronic: '2' }), 'Aquatic Chronic 2') && has(aq(24.9, { aquaChronic: '2' }), 'Aquatic Chronic 3'));
t('chronic 3 25% -> 3; 24.9 -> none', has(aq(25, { aquaChronic: '3' }), 'Aquatic Chronic 3') && !labels(aq(24.9, { aquaChronic: '3' })).some((l) => l.startsWith('Aquatic')));
t('chronic 4 25% -> 4', has(aq(25, { aquaChronic: '4' }), 'Aquatic Chronic 4'));
t('chronic 4 sum of 3 and 4 (12+13)', (() => { const r = run([ing(12, null, { aquaChronic: '3' }), ing(13, null, { aquaChronic: '4' }), water(75)]); return has(r, 'Aquatic Chronic 3') || has(r, 'Aquatic Chronic 4'); })());
t('chronic 1 M=100 at 0.0011% relevant, below limit -> no class', (() => { const r = aq(0.0011, { aquaChronic: '1', mChronic: '100' }); return !labels(r).some((l) => l.startsWith('Aquatic')) && hz(r, 'aquatic').steps.some((s) => /Σ\(C × M\)/.test(s)); })());
t('chronic 1 M=100 at 0.0009% not relevant', (() => { const r = aq(0.0009, { aquaChronic: '1', mChronic: '100' }); return hz(r, 'aquatic').steps.some((s) => /not relevant/.test(s)); })());
t('Chronic 2 label: GHS09 no signal word', (() => { const o = aq(30, { aquaChronic: '2' }).outcomes.find((x) => x.label === 'Aquatic Chronic 2'); return o && o.picto[0] === 'GHS09' && o.signal === null; })());
t('Chronic 1: Warning H410', (() => { const o = aq(30, { aquaChronic: '1' }).outcomes.find((x) => x.label === 'Aquatic Chronic 1'); return o && o.signal === 'Warning' && o.h[0] === 'H410'; })());
t('aquatic unknown statement', (() => { const u = ing(5, null, { aquaUnknown: true }); return run([u, water(95)]).label.supplemental.some((s) => /5 % of components with unknown hazards/.test(s)); })());

/* ---------- 11. new classes ---------- */
t('ED HH 1 at 0.1 -> EUH380; 0.099 none', (() => { const f = (p) => one('edHH', '1', p); const o = f(0.1).outcomes.find((x) => x.label === 'ED HH 1'); return o && o.h[0] === 'EUH380' && o.picto.length === 0 && o.signal === null && !has(f(0.099), 'ED HH 1'); })());
t('ED HH 2 at 1.0 -> EUH381; 0.99 none', has(one('edHH', '2', 1), 'ED HH 2') && !has(one('edHH', '2', 0.99), 'ED HH 2'));
t('ED ENV 1 Danger / 2 Warning', (() => { const a = one('edEnv', '1', 0.1).outcomes.find((x) => x.label === 'ED ENV 1'); const b = one('edEnv', '2', 1).outcomes.find((x) => x.label === 'ED ENV 2'); return a.signal === 'Danger' && b.signal === 'Warning'; })());
t('PBT 0.1 yes / 0.099 no; Danger EUH440', (() => { const a = one('pbt', true, 0.1).outcomes.find((x) => x.label === 'PBT'); return a && a.h[0] === 'EUH440' && a.signal === 'Danger' && !has(one('pbt', true, 0.099), 'PBT'); })());
t('PMT/vPvM/vPvB', has(one('pmt', true, 0.1), 'PMT') && has(one('vpvm', true, 0.1), 'vPvM') && has(one('vpvb', true, 0.1), 'vPvB'));
t('Ozone 0.1 -> H420 GHS07 Warning', (() => { const o = one('ozone', true, 0.1).outcomes.find((x) => x.label === 'Ozone 1'); return o && o.h[0] === 'H420' && o.picto[0] === 'GHS07'; })());
t('new-class note about 1 May 2028', one('pbt', true, 1).notes.some((n) => /1 May 2028/.test(n)));

/* ---------- 12. flammability ---------- */
const fl = (fp, ibp, mix) => run([water(100)], Object.assign({ flashPoint: fp, ibp }, mix || {}));
t('FP 22.9 IBP 35 -> Cat 1 H224', (() => { const o = fl('22.9', '35').outcomes.find((x) => x.label === 'Flam. Liq. 1'); return o && o.h[0] === 'H224' && o.signal === 'Danger' && o.picto[0] === 'GHS02'; })());
t('FP 22.9 IBP 35.1 -> Cat 2', has(fl('22.9', '35.1'), 'Flam. Liq. 2'));
t('FP 23 -> Cat 3; FP 60 -> Cat 3; 60.1 -> none', has(fl('23', ''), 'Flam. Liq. 3') && has(fl('60', ''), 'Flam. Liq. 3') && !labels(fl('60.1', '')).some((l) => l.startsWith('Flam')));
t('FP 20 no IBP -> incomplete', fl('20', '').incomplete.length === 1);
t('FP not entered -> nodata', fl('', '').nodata.length === 1);

/* ---------- 13. H-code parser ---------- */
{
  const i = CLP.blankIngredient();
  const r = CLP.applyHCodes(i, 'H302 + H312 + H332, H315 H318 H410 H400 H336 H361 H317 EUH208 H226 H360FD');
  t('parser: acute cats', i.acute.oral.cat === '4' && i.acute.dermal.cat === '4' && i.acute.inh.cat === '4');
  t('parser: skin/eye/aquatic', i.skinCorr === '2' && i.eye === '1' && i.aquaChronic === '1' && i.aquaAcute === true);
  t('parser: stot narc, repro 1B (H360 beats H361), sens', i.stotSE === '3' && i.stotSEnarc && i.repro === '1B' || i.repro === '2', i.repro);
  t('parser: skin sens 1', i.skinSens === '1');
  t('parser: physical H226 noted', r.notes.some((n) => /H226/.test(n)));
  const j = CLP.blankIngredient(); CLP.applyHCodes(j, 'H314 H318');
  t('parser: H314 -> skinCorr 1 + note', j.skinCorr === '1');
  const k = CLP.blankIngredient(); CLP.applyHCodes(k, 'H411 H410 H412');
  t('parser: most severe chronic wins', k.aquaChronic === '1');
  const l = CLP.blankIngredient(); CLP.applyHCodes(l, 'H300+H310+H330');
  t('parser: H300+H310+H330', l.acute.oral.cat === '1' && l.acute.dermal.cat === '1' && l.acute.inh.cat === '1');
  const m = CLP.blankIngredient(); CLP.applyHCodes(m, 'EUH380 EUH431 EUH440 EUH451 H420 H362 H304 H372 H371');
  t('parser: new classes', m.edHH === '1' && m.edEnv === '2' && m.pbt && m.vpvm && m.ozone && m.lact && m.asp && m.stotRE === '1' && m.stotSE === '2');
  // re-applying clears old
  CLP.applyHCodes(m, 'H315');
  t('parser: re-apply clears previous', !m.pbt && !m.ozone && m.skinCorr === '2');
}

/* ---------- 14. differentiated H codes, validity and category precedence ---------- */
{
  const all = [
    ['H350i', 'H350i', 'inhalation', null, null],
    ['H360F', 'H360F', null, 1, null],
    ['H360D', 'H360D', null, null, 1],
    ['H360FD', 'H360FD', null, 1, 1],
    ['H360Fd', 'H360Fd', null, 1, 2],
    ['H360Df', 'H360Df', null, 2, 1],
    ['H361f', 'H361f', null, 2, null],
    ['H361d', 'H361d', null, null, 2],
    ['H361fd', 'H361fd', null, 2, 2]
  ];
  all.forEach(([raw, code, route, fertility, development]) => {
    const i = CLP.blankIngredient();
    const r = CLP.applyHCodes(i, raw);
    t('differentiation '+code, r.codes.length === 1 && r.codes[0].code === code &&
      r.codes[0].route === route && r.codes[0].fertility === fertility &&
      r.codes[0].development === development && r.invalid.length === 0);
    t('input category '+code, i[code.startsWith('H350') ? 'carc' : 'repro'] === (code.startsWith('H361') ? '2' : '1B'));
  });
  const rev = CLP.blankIngredient();
  CLP.applyHCodes(rev, 'H341 H340 H351 H350i H361d H360Fd');
  t('strongest CMR wins later', rev.muta === '1B' && rev.carc === '1B' && rev.repro === '1B');
  const reversed = CLP.blankIngredient();
  CLP.applyHCodes(reversed, 'H340 H341 H350i H351 H360Fd H361d');
  t('strongest CMR wins earlier', reversed.muta === '1B' && reversed.carc === '1B' && reversed.repro === '1B');
  const mixed = CLP.blankIngredient();
  CLP.applyHCodes(mixed, 'H360F, H361d+H350I');
  t('multiple separate reproductive effects retained', mixed.hcodeDetails.some(x => x.code === 'H360F' && x.fertility === 1) &&
    mixed.hcodeDetails.some(x => x.code === 'H361d' && x.development === 2));
  t('unambiguous casing H350I canonicalised', mixed.hcodeDetails.some(x => x.code === 'H350i'));
  const ambiguous = CLP.blankIngredient();
  const ar = CLP.applyHCodes(ambiguous, 'H360fd H351i H360FD');
  t('ambiguous or invalid suffix rejected', ar.invalid.length === 2 && ar.codes.length === 1 &&
    ar.codes[0].code === 'H360FD' && ambiguous.repro === '1B' && ambiguous.carc === '');
  t('ambiguous suffix produces review warning', ar.notes.some(s => /H360fd.*ambiguous/.test(s)));
  for (const [route, severe, mild] of [
    ['oral', 'H300', 'H302'],
    ['dermal', 'H310', 'H312'],
    ['inh', 'H330', 'H332']
  ]) {
    for (const str of [severe + ' ' + mild, mild + ' ' + severe]) {
      const i = CLP.blankIngredient(), r = CLP.applyHCodes(i, str);
      t('acute most severe '+route+' '+str, i.acute[route].cat === '1');
      t('acute conflict flagged '+route+' '+str, r.notes.some(s => s.includes('Conflicting acute toxicity categories')));
    }
  }
  const legacy = CLP.blankIngredient();
  legacy.name = 'Test'; legacy.pct = 1; legacy.hcodes = 'H360Df';
  legacy.repro = '1A'; // manually set: do not overwrite during normalise
  const normal = CLP.normalise({ingredients:[legacy]});
  t('normalise restores metadata without changing manual category', normal.ings[0].repro === '1A' &&
    normal.ings[0].hcodeDetails[0].code === 'H360Df');
  const report = CLP.report({ingredients:[legacy]}, CLP.classify({ingredients:[legacy]}));
  t('report retains differentiated source code', report.includes('H360Df') && report.includes('source H differentiations'));
}

/* ---------- 15. robustness ---------- */
t('empty mixture ok', (() => { const r = CLP.classify({ ingredients: [] }); return r.outcomes.length === 0 && r.warnings.length > 0; })());
t('sum warning', run([ing(50, 'H315')]).warnings.some((w) => /add up to 50/.test(w)));
t('comma decimals', has(run([ing('1,0', null, { skinSens: '1' }), water(99)]), 'Skin Sens. 1'));
t('floating point boundary 0.1+0.2 vs 0.3 repro', has(run([ing(0.1 + 0.2, null, { repro: '1B' }), water(99.7)]), 'Repr. 1B'));
t('report builds + anonymises', (() => { const m = { name: 'Secret', state: 'liquid', ingredients: [Object.assign(ing(30, 'H315'), { name: 'Secretium' }), water(70)] }; const r = CLP.classify(m); const s = CLP.report(m, r, { anonymise: true }); return !/Secretium|Secret\b/.test(s) && /Ingredient A/.test(s); })());
t('manual entries pass through to label', (() => { const r = CLP.classify({ ingredients: [water(100)], manual: [{ label: 'Oxid. Liq. 3', h: 'H272', signal: 'Warning', picto: 'GHS03' }] }); return r.label.hazardStatements.some((h) => h.code === 'H272') && r.label.pictograms.some((p) => p.code === 'GHS03'); })());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
