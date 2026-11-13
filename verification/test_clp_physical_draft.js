// EU/GB CLP Annex I Part 2 physical hazards — DRAFT rules and their review marking.
// Run from the repository root: node verification/test_clp_physical_draft.js
'use strict';
const fs = require('fs');
const C = require('./engine.js');
const gate = require('./review_gate.js');
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL: ' + name); } };
const run = (state, physical, extra) => C.classify(Object.assign({ state, ingredients: [{ name: 'Product', pct: 100 }], physical }, extra || {}));
const find = (r, label) => r.outcomes.find((o) => o.label === label);
const H = (r, id) => r.hazards.find((h) => h.id === id);

// --- Draft status and marking ---------------------------------------------------------
check('rules are marked draft', C.PHYSICAL_RULES.status === 'draft-needs-review' || C.PHYSICAL_RULES.status === 'reviewed');
check('review items listed', Array.isArray(C.PHYSICAL_RULES.reviewItems) && C.PHYSICAL_RULES.reviewItems.length >= 5);
const draft = C.PHYSICAL_RULES.status !== 'reviewed';
const metal = run('liquid', { corrosionSteel: 8 });
check('every physical outcome carries draft: true', metal.outcomes.filter((o) => /Met\. Corr/.test(o.label)).every((o) => o.draft === true));
check('draft warning shown when physical data are entered', !draft || metal.warnings.some((w) => /^DRAFT RULES:/.test(w)));
check('result records the review status', metal.reviewStatus.physicalRules === C.PHYSICAL_RULES.status);
check('report marks draft outcomes', /Met\. Corr\. 1 — H290 \[DRAFT – not reviewed\]/.test(C.report({ state: 'liquid', ingredients: [{ name: 'P', pct: 100 }], physical: { corrosionSteel: 8 } }, metal)));
check('trail sections say DRAFT, needs review', /DRAFT, needs review/.test(H(metal, 'pMetal').ref));
const none = run('liquid', {});
check('no physical data: one "not assessed" summary, no draft warning', H(none, 'pNone') && H(none, 'pNone').status === 'nodata' && !H(none, 'pMetal') && !none.warnings.some((w) => /DRAFT RULES/.test(w)));
check('no physical data: health/existing classes unaffected', !none.outcomes.some((o) => o.draft));

// --- Merge gate ------------------------------------------------------------------------------
check('gate fails while draft', !draft || gate.run().failed.length === 1);
check('gate requires reviewer and date even when status is reviewed', gate.evaluate({ rules: { status: 'reviewed' } }).length === 2);
check('gate passes a complete sign-off', gate.evaluate({ rules: { status: 'reviewed', reviewedBy: 'A Reviewer', reviewedOn: '2026-12-01' } }).length === 0);
check('CI runs the gate only on pull requests into main', (() => { const y = fs.readFileSync('.github/workflows/tests.yml', 'utf8'); return /review-gate:/.test(y) && /github\.base_ref == 'main'/.test(y) && /node verification\/review_gate\.js/.test(y); })());

// --- Classes (same criteria in the GB Annex I Part 2 text) -----------------------------------
check('aerosol ≥85 % / ≥30 kJ/g → Aerosol 1 (H222, H229, GHS02)', (() => { const o = find(run('liquid', { packaging: 'aerosol', flammableComponentsPct: 85, heatOfCombustion: 30 }), 'Aerosol 1'); return o && o.h.join() === 'H222,H229' && o.picto.join() === 'GHS02' && o.signal === 'Danger'; })());
check('aerosol untested over thresholds → Category 1 (2.3.2.2)', !!find(run('liquid', { packaging: 'aerosol', flammableComponentsPct: 40, heatOfCombustion: 25 }), 'Aerosol 1'));
check('aerosol ≤1 % / <20 kJ/g → Aerosol 3, no pictogram', (() => { const o = find(run('liquid', { packaging: 'aerosol', flammableComponentsPct: 1, heatOfCombustion: 19 }), 'Aerosol 3'); return o && o.picto.length === 0; })());
check('aerosol is not also a flammable liquid', (() => { const r = run('liquid', { packaging: 'aerosol', flammableComponentsPct: 1, heatOfCombustion: 5 }, { flashPoint: '10', ibp: '50' }); return !r.outcomes.some((o) => /Flam\. Liq/.test(o.label)) && H(r, 'flam').status === 'na'; })());
check('chemicals under pressure: not a class in this text (review item)', (() => { const r = run('liquid', { packaging: 'pressurized', flammableComponentsPct: 90, heatOfCombustion: 30 }); return !r.outcomes.some((o) => o.draft) && H(r, 'pAerosol').status === 'na'; })());
check('flammable gas 1A + liquefied gas', (() => { const r = run('gas', { lflPct: 2, uflPct: 10, gasGroup: 'liquefied_low' }); return !!find(r, 'Flam. Gas 1A') && find(r, 'Press. Gas (Liq.)').picto.join() === 'GHS04'; })());
check('flammable gas LFL 13 % → 1B; 13.1 % with 11.9 points → 2 (no pictogram)', !!find(run('gas', { lflPct: 13, uflPct: 20 }), 'Flam. Gas 1B') && find(run('gas', { lflPct: 13.1, uflPct: 25 }), 'Flam. Gas 2').picto.length === 0);
check('oxidising gas >23.5 % → Ox. Gas 1 (GHS03)', find(run('gas', { oxidizingPowerPct: 23.6 }), 'Ox. Gas 1').picto.join() === 'GHS03' && !find(run('gas', { oxidizingPowerPct: 23.5 }), 'Ox. Gas 1'));
check('explosive Division 1.1 (GHS01, H201); 1.5 no pictogram', find(run('solid', { explosiveResult: '1.1' }), 'Expl. 1.1').h.join() === 'H201' && find(run('solid', { explosiveResult: '1.5' }), 'Expl. 1.5').picto.length === 0);
check('known explosive ingredient blocks the screening exemption', H(C.classify({ state: 'solid', physical: { explosiveResult: 'screen_no_groups' }, ingredients: [{ name: 'E', pct: 5, hcodes: 'H201' }, { name: 'W', pct: 95 }] }), 'pExpl').status === 'nodata');
check('desensitised explosive: Ac 300 → Cat 1 (H206); 59 → Cat 4 (H208); excludes flammable liquid', (() => { const a = run('liquid', { desensitized: 'yes', desensBurningRate: 300 }), b = run('liquid', { desensitized: 'yes', desensBurningRate: 59 }, { flashPoint: '10', ibp: '50' });
  return find(a, 'Desen. Expl. 1').h.join() === 'H206' && find(b, 'Desen. Expl. 4').h.join() === 'H208' && !b.outcomes.some((o) => /Flam\. Liq/.test(o.label)); })());
check('flammable solid: 44 s → Cat 1; wetted zone stops ≥4 min → Cat 2; metal powder 10.1 min → none', !!find(run('solid', { flamSolidType: 'non_metal', burningTimeS: 44 }), 'Flam. Sol. 1') &&
  !!find(run('solid', { flamSolidType: 'non_metal', burningTimeS: 44, wettedZone: 'stopped4' }), 'Flam. Sol. 2') && !run('solid', { flamSolidType: 'metal_powder', metalBurnMin: 10.1 }).outcomes.some((o) => o.draft));
check('self-reactive Type B: GHS01 + GHS02, H241; Type G no H-statement', find(run('liquid', { selfReactiveType: 'B' }), 'Self-react. B').picto.join() === 'GHS01,GHS02' && find(run('liquid', { selfReactiveType: 'G' }), 'Self-react. G').h.length === 0);
check('organic peroxide Type B uses H241 (GB text)', find(run('liquid', { opType: 'B' }), 'Org. Perox. B').h.join() === 'H241');
check('organic peroxide exclusion: AO 0.5 % with 5 % H2O2 → not considered; excludes self-reactive', !run('liquid', { opAvailableOxygen: 0.5, opHydrogenPeroxide: 5, opType: 'D' }).outcomes.some((o) => o.draft) &&
  H(run('liquid', { opType: 'D', selfReactiveType: 'C' }), 'pSelfReact').status === 'na');
check('pyrophoric liquid; excludes self-heating', !!find(run('liquid', { pyrophoric: 'yes', sh25at140: 'pos' }), 'Pyr. Liq. 1') && H(run('liquid', { pyrophoric: 'yes', sh25at140: 'pos' }), 'pSelfHeat').status === 'na');
check('self-heating Category 2 via >3 m³', !!find(run('solid', { sh25at140: 'neg', sh100at140: 'pos', shUnitVolumeL: 3001 }), 'Self-heat. 2'));
check('water-reactive 20 L/kg/h → Cat 2 Danger; 1.1 → Cat 3 Warning', find(run('solid', { wrRatePerHour: 20 }), 'Water-react. 2').signal === 'Danger' && find(run('solid', { wrRatePerHour: 1.1 }), 'Water-react. 3').signal === 'Warning');
check('oxidising liquid 1 (H271) / solid 3 (H272, Warning)', find(run('liquid', { oxidizerResult: '1' }), 'Ox. Liq. 1').h.join() === 'H271' && find(run('solid', { oxidizerResult: '3' }), 'Ox. Sol. 3').signal === 'Warning');
check('corrosive to metals needs both metals for a negative', H(run('liquid', { corrosionSteel: 3 }), 'pMetal').status === 'nodata' && !find(run('liquid', { corrosionSteel: 6.25, corrosionAluminium: 6.25 }), 'Met. Corr. 1'));
check('GB gives the same physical result as EU', JSON.stringify(run('liquid', { oxidizerResult: '2', corrosionSteel: 9 }).outcomes.map((o) => o.label)) === JSON.stringify(C.classify({ jurisdiction: 'GB', state: 'liquid', ingredients: [{ name: 'P', pct: 100 }], physical: { oxidizerResult: '2', corrosionSteel: 9 } }).outcomes.map((o) => o.label)));
check('Article 26: GHS02 optional omission with GHS01 is not applied to self-reactive Type B', (() => { const r = C.classify({ state: 'liquid', ingredients: [{ name: 'P', pct: 100 }], physical: { selfReactiveType: 'B' }, article26Mode: 'omitOptional' }); return r.label.pictograms.some((p) => p.code === 'GHS02'); })());

// --- UI ----------------------------------------------------------------------------------------
const html = fs.readFileSync('clp_mixture_calculator.html', 'utf8');
check('physical panel shows a draft banner in EU/GB mode', /id="phys-draft-note"[^>]*>[\s\S]{0,80}Draft: needs regulatory review/.test(html) && html.includes('$("phys-draft-note").hidden = us;'));
check('draft outcomes get a visible badge', html.includes('DRAFT – not reviewed</span>'));

console.log(pass + ' CLP physical (draft) checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
