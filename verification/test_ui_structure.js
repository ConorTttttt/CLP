// Source-level UI regression checks (not a substitute for headless browser tests).
// Run from repository root: node verification/test_ui_structure.js
const fs = require('fs');
const assert = require('assert').strict;
const html = fs.readFileSync('clp_mixture_calculator.html', 'utf8');
const engine = fs.readFileSync('verification/engine.js', 'utf8').trimEnd();
let pass = 0;
function check(name, condition) { assert.ok(condition, name); pass++; }
check('HTML embeds precisely the verified engine', html.includes(engine));
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
check('Two inline scripts exist', scripts.length === 2);
scripts.forEach((m, index) => {
  assert.doesNotThrow(() => new Function(m[1]), 'Inline script ' + index + ' compiles');
  pass++;
});
for (const key of ['reproFert', 'reproDev', 'repro', 'carc', 'carcRoute', 'reproQuick']) {
  check('UI selector exists: ' + key, html.includes('SEL("' + key + '"'));
}
for (const code of ['H350i', 'H360F', 'H360D', 'H360FD', 'H360Fd', 'H360Df', 'H361f', 'H361d', 'H361fd']) {
  check('Differentiation supported: ' + code, html.includes(code));
}
check('Browser load migrates legacy data', html.includes('CLP.normalise({ ingredients: [{...r, pct: 100}] })'));
check('Article 27 decisions shown', html.includes('Article 27 — hazard-statement decisions'));
check('Article 27 toggle exists', html.includes('id="mart27"'));
check('Article 26 toggle exists', html.includes('id="mart26"'));
check('Article 26 toggle stored in mix', html.includes('mix.article26Mode = $("mart26").checked ? "omitOptional" : "retainOptional"'));
check('Article 26 audit visible', html.includes('Article 26 — pictogram decisions'));
check('Article 26 per-hazard audit visible', html.includes('item.decision === "omitted"'));
check('Article 26 H319 vs H314 explanation rendered prominently', html.includes('explanationsArt26.map') &&
  html.includes('H319 / GHS07 (exclamation mark): omitted for the H319 hazard'));
check('Article 26 distinguishes ingredient-only H319', html.includes('Ingredient H319: no GHS07 omission occurred'));
check('Article 26 audit shows source H codes', html.includes('item.hazardStatements.join(", ")'));
check('Article 26 default retains optional physical pictograms', html.includes('article26Mode: "retainOptional"'));
check('Article 27 toggle saved to mixture', html.includes('mix.article27Mode = $("mart27").checked ? "apply" : "keepAll"'));
check('Article 27 old JSON gets default', html.includes('article27Mode: "apply"'));

check('Article 27 label header clearly qualified', html.includes('H/EUH Article 27 rules applied'));
check('Article 27 includes omission rationale', html.includes('d.reason') && html.includes('d.basis'));
check('Quick pick preserves other manual category edits', html.includes('i.reproFert = reproOnly.reproFert') &&
  html.includes('i.reproDev = reproOnly.reproDev') && !html.includes('CLP.applyHCodes(i, (otherCodes'));
for (const id of ['maudience','muse','mdisposal','mppe','mpextra','mpexclude','mpreason']) {
  check('Article 28 setting field exists '+id, html.includes('id="'+id+'"'));
}
check('Article 28 settings map to mixture',html.includes('maudience: "audience"') &&
  html.includes('mdisposal: "disposalDestination"') &&
  html.includes('mpextra: "manualPExtra"'));
check('Article 28 new JSON default is safe unknown audience',html.includes('audience: "unknown"'));
check('Article 28 results panel exists',html.includes('Article 28 — precautionary-statement decisions'));
check('Article 28 has legal-obligation rendering',html.includes('Legal obligation — '));
check('Article 28 selected statements visible on label',html.includes('Draft P-statements — Article 28 (not final)'));
check('Article 28 Annex IV input clarification exists',html.includes('Consumer disposal: Article 28(2)') &&
 html.includes('P502/P503 alone may not satisfy the packaging requirement'));
check('Article 28 renders complete candidate audit',html.includes('All eligible and non-selected candidates'));

// Regression: three Article 28 surfaces must NOT use the 62px general H-code grid.
check('P-statement grid sizes code naturally',html.includes('.pstatement-row{grid-template-columns:max-content minmax(0,1fr)'));
check('P-statement wording can wrap',html.includes('.pstatement-row>div{min-width:0;overflow-wrap:anywhere}'));
check('P-statement code stays intact at desktop width',html.includes('.pstatement-row>code{display:block;white-space:nowrap'));
check('P-statement rows stack on narrow screens',html.includes('.pstatement-row{grid-template-columns:minmax(0,1fr);row-gap:2px}'));
const pRows = [
  '(L0.precautionaryStatements || []).map((p) => `<div class="hrow pstatement-row"',
  '(P28.selected || []).map((p) => `<div class="hrow pstatement-row"',
  'pDecisions.map((p) => `<div class="hrow pstatement-row"'
];
pRows.forEach((marker,index) => check('Article 28 row '+index+' uses code-aware layout',html.includes(marker)));
// Viewer Settings must not interfere with the classification engine or exports.
check('Viewer settings panel exists', html.includes('id="viewersettings"'));
check('Viewer settings use independent local preference storage',
  html.includes('const VIEWER_STORE = "clp_calc_viewer_settings_v1"'));
check('Viewer settings controls are grouped and accessible',
  html.includes('id="viewer-controls"') && html.includes('data-view-setting='));
check('All section controls are present', ['classification','label','article26','article27','article28',
  'sds','calculation','notes'].every(k=>html.includes('data-view="'+k+'"')));
check('All label detail controls are present', ['labelSignal','labelPictograms','labelH',
  'labelEUH','labelSupplemental','labelP','labelNoData'].every(k=>html.includes('data-view="'+k+'"')));
check('Plain report is independent',html.includes('viewerSettings.report === false'));
check('Visibility applied after result renderer',html.includes('applyViewerSettings();\n}\nlet tm = null;'));
check('Preferences reset and article explanation preset available',
  html.includes('id="viewer-show-all"')&&html.includes('id="viewer-hide-audits"')&&
  html.includes('id="viewer-defaults"'));
check('Mandatory warnings remain outside hideable cards',
  !html.includes('data-view="warnings"')&&!html.includes('data-view="incomplete"'));
check('Expanded Article 28 catalogue reported in viewer',html.includes('P28.catalogueSize'));
check('Article 28 conditional candidate audit visible',html.includes('Conditional statements requiring applicability review'));
check('Article 28 makes condition explanation visible',html.includes('p.condition'));
check('Article 28 component-only codes are clearly marked',html.includes('Incomplete component-only codes'));
check('Article 28 disposal documentation includes P502/P503',html.includes('P502 and P503'));
console.log(pass + ' UI source checks passed');
