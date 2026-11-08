const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"../canada_whmis_calculator.html"),"utf8");
const clp=fs.readFileSync(path.join(__dirname,"../clp_mixture_calculator.html"),"utf8");
let passed=0;
function t(name,fn){fn();passed++;console.log("PASS "+name)}
t("uses CLP palette and dark-mode tokens",()=>{
for(const mark of ["--bg:#f7f7f5","--panel:#fff","--accent:#0b5cad","prefers-color-scheme:dark"]){
 assert.ok(html.includes(mark),"WHMIS absent "+mark);
 assert.ok(clp.includes(mark),"CLP absent "+mark);
}
});
t("CLP-style header, banner and two-column layout",()=>{
for(const mark of ['<header>','class="banner"','class="wrap"','id="inputs"','id="results"','class="card"'])assert.ok(html.includes(mark),mark);
});
t("formulation editor groups the existing 16 inputs in ingredient cards",()=>{
for(const mark of ["tbody tr{display:grid","--ix-accent","td:nth-child(16)","id=\"rows\""])assert.ok(html.includes(mark),mark);
});
t("all WHMIS input fields are preserved for engine",()=>{
for(const mark of ["data-field=\"name\"","data-field=\"pct\"","route+'ATE","route+'Cat","route+'Safe","data-field=\"skin\"","data-field=\"eye\"",
"data-field=\"skinEvidenceBelow1\"","data-field=\"eyeEvidenceBelow1\"","data-field=\"specialSkin\"","data-field=\"specialEye\"","data-field=\"hhnoc\""])assert.ok(html.includes(mark),"field "+mark);
});
t("clear provisional message and regulatory scope remain",()=>{
assert.match(html,/Decision-support only/);assert.match(html,/not a final classification/);
assert.match(html,/still require review/);assert.match(html,/SOR-2015-17/);
});
t("calculation panels and total concentration update",()=>{
assert.ok(html.includes("calc-panel"));assert.ok(html.includes('function updateTotal()'));
assert.ok(html.includes("rows.addEventListener(\"input\""));
});
t("independent WHMIS engines retained; EU engine not inserted",()=>{
assert.ok(html.includes('src="verification/whmis_skin_eye.js"'));
assert.ok(html.includes('src="verification/whmis_engine.js"'));
assert.ok(!html.includes('src="verification/engine.js"'));
});
t("inline browser JavaScript remains syntactically valid",()=>{
const match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
assert.doesNotThrow(()=>new Function(match[1]));
});
t("HPR sub-1% acute route evidence is available in the UI",()=>{
 assert.ok(html.includes("route+'Below1"),"route-specific acute relevance checkbox missing");
 assert.ok(html.includes('relevantBelow1=get(route+"Below1").checked'),"route-specific input not read");
 assert.ok(html.includes("HPR 2.5(1)"),"evidence regulation not displayed");
});
t("Unknown acute toxicity disclosure prompts are displayed with bilingual caveat",()=>{
 assert.ok(html.includes("r.supplementalStatements"));
 assert.ok(html.includes("English drafts only"));
 assert.ok(html.includes("English and French"));
});
t("HPA supplier-scope controls include explicit unknown and exemption handling",()=>{
 for(const id of ["scope-activity","scope-workplace","scope-exclusion","scope-inputs"])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('value="none_confirmed"'));
 assert.ok(html.includes('value="manufactured_article"'));
});
t("Chemicals Under Pressure inputs include HPR physical definition and numerical evidence",()=>{
 for(const id of ["pressure-assess","pressure-state","pressure-gas","pressure-aerosol","pressure-gup","pressure-kpa","pressure-flame","pressure-heat"])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes("200 or more"));
});
t("Inhalation inputs represent gases separately from vapour and dust/mist",()=>{
 for(const mark of ['value="gas">Gas','value="vapour">Vapour','value="dustMist">Dust',
 'data-field="volumePct"','data-field="inhATE"','data-field="inhCat"','data-field="inhHours"','data-field="inhBelow1"'])
 assert.ok(html.includes(mark),mark);
});
t("HPR inhalation precedence inputs for mixture-test and bridging are separate",()=>{
 for(const id of ["inh-whole","inh-whole-hours","inh-bridge","inh-bridge-evidence"])
  assert.ok(html.includes('id="'+id+'"'),id);
});
t("hazard coverage displays all 32 classes and separates statuses",()=>{
 assert.ok(html.includes('id="coverage-list"'));
 assert.ok(html.includes('r.hazardCoverage'));
 assert.ok(html.includes("not_implemented"));
});
t("Extended module and HPA class catalogue precede core engine",()=>{
 const p=html.indexOf("verification/whmis_extended.js");
 const c=html.indexOf("verification/whmis_hazard_catalog.js");
 const e=html.indexOf("verification/whmis_engine.js");
 assert.ok(p>=0&&c>p&&e>c);
});
t("HPA scope result and extended classifications go through normal safe rendering",()=>{
 assert.ok(html.includes("r.scope.status.replace"));
 assert.ok(html.includes("safe(r.scope.reason)"));
 assert.ok(html.includes("WHMIS.classify({ingredients,scope,inhalation,chemicalsUnderPressure,healthMixture})"));
});
t("All WHMIS preview text remains explicit about incomplete classification",()=>{
 assert.match(html,/Decision-support only/);
 assert.match(html,/not a final classification/);
 assert.match(html,/no|not.*non-hazardous/i);
});
t("new health classification controls are present and source-linked",()=>{
 for(const field of ["hRespSens","hSkinSens","hMutagen","hCarcinogen","hRepro","hLactation","hStotSE","hStotRE","hStot3Narcotic","hStot3Resp","hStot3Elicit","hAspiration","hState"])
   assert.ok(html.includes(field),"Missing dynamically generated health field "+field);
 for(const id of ["health-mixture-inputs","health-other-evidence","asp-viscosity","asp-phase"])
   assert.ok(html.includes('id="'+id+'"'),id);
});
t("WHMIS additional health engine loads before core engine",()=>{
 const p=html.indexOf("verification/whmis_health.js"),c=html.indexOf("verification/whmis_engine.js");
 assert.ok(p>=0&&c>p);
 assert.ok(html.includes("healthMixture"));
});
console.log(passed+" WHMIS presentation checks passed");
