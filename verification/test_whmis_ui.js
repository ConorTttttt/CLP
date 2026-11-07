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
for(const mark of ["data-field=\"name\"","data-field=\"pct\"","route+'ATE'","route+'Cat'","route+'Safe'","data-field=\"skin\"","data-field=\"eye\"",
"data-field=\"skinEvidenceBelow1\"","data-field=\"eyeEvidenceBelow1\"","data-field=\"specialSkin\"","data-field=\"specialEye\"","data-field=\"hhnoc\""])assert.ok(html.includes(mark),"field "+mark);
});
t("clear provisional message and regulatory scope remain",()=>{
assert.match(html,/Decision-support only/);assert.match(html,/not a final classification/);
assert.match(html,/not yet automated/);assert.match(html,/SOR-2015-17/);
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
console.log(passed+" WHMIS presentation checks passed");
