// GB CLP jurisdiction profile: same Annex I mixture rules as EU CLP except where
// GB law differs. Run from the repository root: node verification/test_gb_profile.js
'use strict';
const fs = require('fs');
const C = require('./engine.js');
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL: ' + name); } };

// H-codes first (they set default categories), then explicit fields such as 1A.
const ing = (data) => { const i = C.blankIngredient(); const { hcodes, ...rest } = data; if (hcodes) C.applyHCodes(i, hcodes); return Object.assign(i, rest); };
const run = (jurisdiction, ingredients, extra) => C.classify(Object.assign({ jurisdiction, state: 'liquid', ingredients: ingredients.map(ing) }, extra || {}));
const labels = (r) => r.outcomes.map((o) => o.label);
const codes = (r) => [...r.label.hazardStatements, ...r.label.euhStatements].map((x) => x.code);
const H = (r, id) => r.hazards.find((h) => h.id === id);
const warn = (r, text) => r.warnings.some((w) => w.includes(text));

// --- Profiles and defaults --------------------------------------------------
check('EU and GB profiles exported', C.JURISDICTIONS.EU && C.JURISDICTIONS.GB);
const base = [{ name: 'Water', pct: 100 }];
check('no jurisdiction defaults to EU CLP', C.classify({ ingredients: base.map(ing) }).jurisdiction.id === 'EU');
check('lower-case "gb" accepted', run('gb', base).jurisdiction.id === 'GB');
check('EU result has no comparison block', !('differencesFromEU' in run('EU', base).jurisdiction));
const unknown = run('US', base);
check('unsupported jurisdiction reported, not guessed silently', unknown.jurisdiction.id === 'EU' && warn(unknown, 'jurisdiction "US" is not supported'));

// --- EU-only 2023/707 hazard classes are not GB hazard classes ----------------
const newClassIngredients = [
  { name: 'ED one', pct: 1, hcodes: 'EUH380' }, { name: 'ED env', pct: 2, hcodes: 'EUH431' },
  { name: 'PBT sub', pct: 0.5, hcodes: 'EUH440' }, { name: 'vPvB sub', pct: 0.5, hcodes: 'EUH441' },
  { name: 'PMT sub', pct: 0.5, hcodes: 'EUH450' }, { name: 'vPvM sub', pct: 0.5, hcodes: 'EUH451' },
  { name: 'ED two', pct: 0.5, hcodes: 'EUH381' }, { name: 'Water', pct: 94.5 }];
const eu = run('EU', newClassIngredients), gb = run('GB', newClassIngredients);
for (const l of ['ED HH 1', 'ED ENV 2', 'PBT', 'vPvB', 'PMT', 'vPvM']) {
  check('EU classifies ' + l, labels(eu).includes(l));
  check('GB does not classify ' + l, !labels(gb).includes(l));
}
for (const c of ['EUH380', 'EUH431', 'EUH440', 'EUH441', 'EUH450', 'EUH451'])
  check('GB label has no ' + c, !codes(gb).includes(c));
check('GB signal word not driven by EU-only classes', eu.label.signal === 'Danger' && gb.label.signal === null);
check('GB has no ED SDS-on-request trigger', eu.sds.some((s) => /ED HH Cat\. 2/.test(s)) && !gb.sds.some((s) => /ED (HH|ENV)/.test(s)));
for (const id of ['edHH', 'edEnv', 'pbt', 'vpvb', 'pmt', 'vpvm']) {
  const h = H(gb, id);
  check('GB trail explains ' + id + ' is not a GB hazard class', h && h.status === 'na' && h.steps.some((s) => /Not a hazard class under GB CLP/.test(s)));
}
check('GB trail names the ingredient whose EU-only data was not used', H(gb, 'edHH').steps.some((s) => s.includes('ED one')));
check('GB warns per ingredient that EU-only data was not used', warn(gb, 'JURISDICTION: ED one') && warn(gb, 'not GB CLP hazard classes'));
check('EU has no jurisdiction warning', !eu.warnings.some((w) => w.startsWith('JURISDICTION')));
check('EU transitional note for new classes not shown for GB', eu.notes.some((n) => /1 May 2028/.test(n)) && !gb.notes.some((n) => /1 May 2028/.test(n)));
check('ozone layer still a GB hazard class', labels(run('GB', [{ name: 'CFC', pct: 0.5, hcodes: 'H420' }, { name: 'W', pct: 99.5 }])).includes('Ozone 1'));

// --- Differences from EU are reported exactly --------------------------------
const d = gb.jurisdiction.differencesFromEU;
check('comparison lists EU-only classifications', ['ED HH 1', 'PBT', 'vPvM'].every((l) => d.classifications.onlyInEU.includes(l)) && d.classifications.onlyHere.length === 0);
check('comparison lists EU-only statements', d.statements.onlyInEU.includes('EUH380') && d.statements.onlyHere.length === 0);
check('comparison reports the signal word change', d.signal.eu === 'Danger' && d.signal.here === null && d.identical === false);

// --- Everything else: identical to EU CLP --------------------------------------
const fixtures = {
  flammable: [{ name: 'Solvent', pct: 100 }],
  acute: [{ name: 'Tox', pct: 30, hcodes: 'H301 H331' }, { name: 'W', pct: 70 }],
  skinEye: [{ name: 'Acid', pct: 6, hcodes: 'H314' }, { name: 'Irr', pct: 12, hcodes: 'H315 H319' }, { name: 'W', pct: 82 }],
  sensitiser: [{ name: 'Sens', pct: 0.5, hcodes: 'H317', skinSens: '1A' }, { name: 'W', pct: 99.5 }],
  cmr: [{ name: 'Carc', pct: 0.2, hcodes: 'H350' }, { name: 'Repro', pct: 3.5, hcodes: 'H361d' }, { name: 'W', pct: 96.3 }],
  stotAsp: [{ name: 'HC', pct: 60, hcodes: 'H304 H336 H373' }, { name: 'W', pct: 40 }],
  aquatic: [{ name: 'Aq', pct: 3, hcodes: 'H400 H410', mAcute: '10', mChronic: '10' }, { name: 'W', pct: 97 }]
};
const extra = { flammable: { flashPoint: '18', ibp: '80' }, stotAsp: { viscosity40: '5' } };
for (const [name, list] of Object.entries(fixtures)) {
  const a = run('EU', list, extra[name]), b = run('GB', list, extra[name]);
  check(name + ': GB classification identical to EU', JSON.stringify(labels(a)) === JSON.stringify(labels(b)) && labels(a).length > 0);
  check(name + ': GB label identical to EU', JSON.stringify(codes(a)) === JSON.stringify(codes(b)) &&
    JSON.stringify(a.label.pictograms) === JSON.stringify(b.label.pictograms) && a.label.signal === b.label.signal &&
    JSON.stringify(a.label.precautionaryStatements.map((p) => p.code)) === JSON.stringify(b.label.precautionaryStatements.map((p) => p.code)));
  check(name + ': comparison says identical', b.jurisdiction.differencesFromEU.identical === true);
}

// --- Evidence: GB MCL, not EU Annex VI ---------------------------------------
const noSource = run('GB', [{ name: 'S', pct: 5, carc: '1B', scl: { carc: '1' } }, { name: 'W', pct: 95 }]);
check('GB evidence prompt points to the GB MCL', warn(noSource, 'Verify against the GB Mandatory Classification List (GB MCL)'));
check('EU evidence prompt still points to Annex VI', warn(run('EU', [{ name: 'S', pct: 5, carc: '1B', scl: { carc: '1' } }, { name: 'W', pct: 95 }]), 'Verify against Annex VI'));
const annexVI = run('GB', [{ name: 'S', pct: 5, carc: '1B', scl: { carc: '1' }, valueSource: 'EU Annex VI entry, 21st ATP' }, { name: 'W', pct: 95 }]);
check('GB flags a value sourced from EU Annex VI / an ATP', warn(annexVI, 'refers to EU Annex VI or an EU ATP'));
check('GB does not flag a GB MCL source', !warn(run('GB', [{ name: 'S', pct: 5, carc: '1B', scl: { carc: '1' }, valueSource: 'GB MCL entry' }, { name: 'W', pct: 95 }]), 'refers to EU Annex VI'));
check('EU does not flag an Annex VI source', !warn(run('EU', [{ name: 'S', pct: 5, carc: '1B', scl: { carc: '1' }, valueSource: 'Annex VI' }, { name: 'W', pct: 95 }]), 'refers to EU Annex VI'));

// --- Report and notes ----------------------------------------------------------
const mix = { jurisdiction: 'GB', name: 'Secret GB product', state: 'liquid', ingredients: newClassIngredients.map(ing) };
const rep = C.report(mix, C.classify(mix));
check('GB report header', rep.startsWith('GB CLP MIXTURE CLASSIFICATION'));
check('GB report states the legal basis', rep.includes('Jurisdiction: Great Britain (England, Scotland, Wales) — GB CLP'));
check('GB report says Northern Ireland applies EU CLP', rep.includes('Northern Ireland applies EU CLP'));
check('GB report lists differences from EU', rep.includes('classifications only in EU: ED HH 1'));
check('GB notes mention the GB MCL', gb.notes.some((n) => n.includes('GB Mandatory Classification List')));
check('EU report header unchanged in substance', C.report({ ingredients: base.map(ing) }, C.classify({ ingredients: base.map(ing) })).startsWith('EU CLP MIXTURE CLASSIFICATION'));
const anon = C.report(mix, C.classify(mix), { anonymise: true });
check('anonymised GB report still withholds names', !/ED one|PBT sub|Secret GB product/.test(anon));

// --- Desktop UI wiring ---------------------------------------------------------
const html = fs.readFileSync('clp_mixture_calculator.html', 'utf8');
check('jurisdiction selector with EU and GB options', /<select id="mjur"[^>]*>\s*<option value="EU">EU CLP[^<]*Northern Ireland<\/option>\s*<option value="GB">GB CLP/.test(html));
check('selector bound to the saved formulation', html.includes('mjur: "jurisdiction"') && html.includes('let mix = { jurisdiction: "EU"'));
check('results show the jurisdiction card', html.includes('L.push(jurisdictionCardHTML(r));'));
check('cut-off display skips EU-only classes in GB', html.includes('mix.jurisdiction==="GB")continue;'));

console.log(pass + ' GB profile checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
