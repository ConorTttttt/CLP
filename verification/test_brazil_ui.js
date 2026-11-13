// Static presentation checks for brazil_ghs_calculator.html.
// Run: node verification/test_brazil_ui.js
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"../brazil_ghs_calculator.html"),"utf8");
const B=require("./brazil_ghs_engine.js");
let passed=0,failed=0;
function t(name,fn){try{fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.log("FAIL "+name+"\n  "+e.message);}}

t("uses the shared CLP palette and dark-mode tokens",()=>{
  for(const mark of ["--bg:#f7f7f5","--panel:#fff","--accent:#0b5cad","prefers-color-scheme:dark"])assert.ok(html.includes(mark),mark);
});
t("header, banner, navigation and two-column layout",()=>{
  for(const mark of ["<header>",'class="banner"','class="wrap"','id="inputs"','id="results"','id="mixture-card"','id="ingredients-card"','id="source-card"'])assert.ok(html.includes(mark),mark);
});
t("provisional status and Brazilian sources are stated",()=>{
  assert.match(html,/Decision-support only/);assert.match(html,/not a final classification/);
  assert.match(html,/NBR 14725:2023/);assert.match(html,/NR-26/);assert.match(html,/GHS Rev\. 7/);
  assert.match(html,/does not establish that a product is non-hazardous/);
  assert.match(html,/must be in Portuguese/);
});
t("loads only the Brazilian engine (no EU CLP or WHMIS engine)",()=>{
  assert.ok(html.includes('src="verification/brazil_ghs_engine.js"'));
  assert.ok(!html.includes('src="verification/engine.js"'));
  assert.ok(!/whmis_/.test(html));
});
t("inline browser JavaScript is syntactically valid",()=>{
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.ok(scripts.length);
  for(const m of scripts)assert.doesNotThrow(()=>new Function(m[1]));
});
t("mixture inputs feed every engine mixture field",()=>{
  for(const id of ["m-state","m-fp","m-ibp","m-visc","m-ph","m-cutoff"])assert.ok(html.includes('id="'+id+'"'),id);
  for(const key of ["state:","flashPoint:","ibp:","viscosity40:","pH:","cutoffOption:"])assert.ok(html.includes(key),key);
  assert.ok(html.includes('value="lower"')&&html.includes('value="upper"'));
});
t("ingredient detail paths cover the engine input model",()=>{
  for(const p of ["acute.oral.ate","acute.oral.category","acute.oral.notAcute","acute.dermal.ate","acute.dermal.notAcute",
    "acute.inhalation.form","acute.inhalation.ate","acute.inhalation.category","acute.inhalation.volumePct","acute.inhalation.notAcute",
    '"skin"','"eye"',"nonAdditive","respSens","skinSens",'"state"',"mutagen","carcinogen","repro","lactation",
    '"stotSE"',"stotSE3Resp","stotSE3Narcotic",'"stotRE"',"aspiration","aquaticAcute","mAcute","aquaticChronic","mChronic","ozone"])
    assert.ok(html.includes(p),"missing detail field "+p);
  assert.ok(html.includes('data-path="hcodes"'));assert.ok(html.includes('data-path="pct"'));
});
t("category dropdowns include GHS optional categories",()=>{
  assert.ok(html.includes('opt(["","1","1A","1B","1C","2","3"])'),"Skin Cat 3");
  assert.ok(html.includes('opt(["","1","2A","2B"])'),"Eye 2B");
  assert.ok(html.includes('opt(["","1","2","3","4","5"])'),"Acute Cat 5");
  assert.ok(html.includes('opt(["","1","2","3","4"])'),"Chronic 4");
});
t("results show signal word in Portuguese, pictogram files and precedence audit",()=>{
  assert.ok(html.includes("r.label.signalWordPtBR"));
  assert.ok(html.includes('src="pictograms/'));
  assert.ok(html.includes("r.label.pictogramDecisions"));
  assert.ok(html.includes("r.notAssessed"));assert.ok(html.includes("r.review"));
});
t("all user text is escaped before insertion",()=>{
  assert.ok(html.includes("const esc="));
  assert.ok(!/innerHTML=[^;]*\+\s*i\.name/.test(html));
});
t("every pictogram the engine can select exists on disk",()=>{
  for(const p of ["GHS02","GHS05","GHS06","GHS07","GHS08","GHS09"])
    assert.ok(fs.existsSync(path.join(__dirname,"../pictograms/"+p+".svg")),p);
});
t("example formulation in the page classifies without input issues",()=>{
  const m=html.match(/ingredients=\[\s*(\{name:"Water"[\s\S]*?)\n \];/);assert.ok(m,"example not found");
  const ings=new Function("return ["+m[1]+"]")();
  const r=B.classify({mixture:{state:"liquid",viscosity40:2,pH:12.5},ingredients:ings});
  assert.equal(r.valid,true,r.issues.join("; "));
  assert.ok(r.outcomes.some(o=>o.key==="skin"&&o.category==="1"));
});
console.log(passed+" passed, "+failed+" failed");
process.exit(failed?1:0);
