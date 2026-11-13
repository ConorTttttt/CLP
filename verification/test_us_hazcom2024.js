// Independent US OSHA HazCom 2024 initial-screen tests.
// Test exact bounds, mixture ATE methods, exclusion of CLP-only outputs and
// preservation of the offline single-file calculator.
const assert=require("node:assert/strict"),fs=require("node:fs");
const US=require("./hazcom2024.js");
let n=0;
const test=(name,fn)=>{try{fn();n++;console.log("PASS "+name)}catch(e){throw Error(name+": "+e.message)}};
const ingredient=(p,route,category,ate,extra={})=>({
  name:"Test ingredient",pct:p,
  acute:{oral:{cat:route==="oral"?String(category||""):"",ate:route==="oral"?(ate||""):"",unknown:false},
    dermal:{cat:route==="dermal"?String(category||""):"",ate:route==="dermal"?(ate||""):"",unknown:false},
    inh:{form:route==="gas"||route==="dust_mist"?route:"vapour",cat:["vapour","gas","dust_mist"].includes(route)?String(category||""):"",ate:["vapour","gas","dust_mist"].includes(route)?(ate||""):"",unknown:false},
    unknown:false},...extra});
const classify=(data={})=>US.classify({state:"liquid",ingredients:[],...data});
const f=(fp,ibp)=>classify({flashPoint:String(fp),ibp:ibp===undefined?"":String(ibp)}).outcomes[0];
test("Flammable Liquid 1 requires flash point <23 and boiling point <=35",()=>{
  assert.equal(f(22.9,35).category,1);assert.equal(f(22.9,35.1).category,2);
});
test("Flammable Liquid 3 boundary is 60 °C",()=>{
  assert.equal(f(23).category,3);assert.equal(f(60).category,3);
});
test("HazCom 2024 Category 4 includes 60–93 °C above 60",()=>{
  const out=f(70);assert.equal(out.category,4);assert.equal(out.statement,"Combustible liquid");
  assert.equal(out.signal,"Warning");assert.equal(out.pictogram,null);
  assert.equal(f(93).category,4);
  assert.equal(classify({flashPoint:"93.001"}).outcomes.length,0);
});
test("Missing boiling point does not guess Category 1/2",()=>{
  const r=classify({flashPoint:"10"});assert.equal(r.sections[0].status,"not-assessed");assert.equal(r.outcomes.length,0);
});
test("Solids do not receive a flammable-liquid classification",()=>{
  const r=classify({state:"solid",flashPoint:"10",ibp:"20"});assert.equal(r.sections[0].status,"not-applicable");assert.equal(r.outcomes.length,0);
});
test("Oral Category 3 ATE input is independently calculated",()=>{
  const r=classify({ingredients:[ingredient(40,"oral",3,""),ingredient(60,null,null,null)]});
  const oral=r.sections.find(s=>s.id==="acute-oral");
  assert.equal(oral.outcomes[0].category,3);assert.equal(oral.outcomes[0].ate,250);
  assert.ok(oral.steps.some(s=>/Table A.1.2/.test(s)));
});
test("Undiluted converted Cat 2 stays Cat 2 under A.1.3.3(c)",()=>{
  const r=classify({ingredients:[ingredient(100,"oral",2,"")]});
  assert.equal(r.sections.find(s=>s.id==="acute-oral").outcomes[0].category,2);
});
test("Diluted Category 2 ingredient is not promoted by A.1.3.3(c)",()=>{
  const r=classify({ingredients:[ingredient(1,"oral",2,""),ingredient(99,null,null,null)]});
  assert.equal(r.sections.find(s=>s.id==="acute-oral").outcomes[0].category,4);
});
test("Acute toxicity at 10% unknown uses full 100 numerator",()=>{
  const u=ingredient(10,null,null,null);u.acute.oral.unknown=true;
  const r=classify({ingredients:[ingredient(25,"oral",3,""),u,ingredient(65,null,null,null)]});
  assert.equal(r.sections.find(s=>s.id==="acute-oral").ate,400);
});
test("Acute toxicity unknown >10% uses adjusted numerator",()=>{
  const u=ingredient(15,null,null,null);u.acute.oral.unknown=true;
  const r=classify({ingredients:[ingredient(25,"oral",3,""),u,ingredient(60,null,null,null)]});
  assert.equal(r.sections.find(s=>s.id==="acute-oral").ate,340);
  assert.ok(r.warnings.some(s=>/15%.*unknown acute toxicity/.test(s)));
});
test("Oral ATE uses input estimate when available",()=>{
  const r=classify({ingredients:[ingredient(50,"oral",3,"500"),ingredient(50,null,null,null)]});
  assert.equal(r.sections.find(s=>s.id==="acute-oral").ate,1000);
  assert.equal(r.sections.find(s=>s.id==="acute-oral").outcomes[0].category,4);
});
test("Separate inhalation form boundaries are respected",()=>{
  const r=classify({ingredients:[ingredient(100,"dust_mist",2,""),]});
  assert.equal(r.sections.find(s=>s.id==="acute-dust_mist").outcomes[0].category,2);
  assert.equal(r.sections.find(s=>s.id==="acute-vapour").status,"not-assessed");
});
test("No ingredient route data is not falsely called nonhazardous",()=>{
  const r=classify({ingredients:[ingredient(100,null,null,null)]});
  assert.equal(r.outcomes.length,0);
  assert.equal(r.sections.find(s=>s.id==="acute-oral").status,"not-assessed");
  assert.match(US.report({},r),/NOT FINAL CLASSIFICATION/);
});
test("Outcomes exclude EU CLP aquatic, endocrine, PBT and EUH classes",()=>{
  const r=classify({flashPoint:"70",ingredients:[ingredient(100,null,null,null,{aquaChronic:"1",edHH:"1",pbt:true})]});
  assert.ok(r.outcomes.every(o=>!/Aquatic|ED HH|PBT|EUH/.test(JSON.stringify(o))));
  assert.ok(r.notRequired.some(x=>/Aquatic/.test(x)));
});
test("US hazard classes not yet implemented are explicitly shown",()=>{
  const r=classify();
  assert.ok(r.notAssessed.some(x=>/Explosives \(B\.1\)/.test(x)&&/organic peroxides/.test(x)));
  assert.ok(r.sections.some(x=>x.id==="hnoc"),"HNOC now has its own section");
  assert.ok(r.notAssessed.some(x=>/labeling/.test(x)));
  assert.ok(!r.notAssessed.some(x=>/Skin corrosion|Carcinogenicity/.test(x)),"implemented health classes are no longer listed as not assessed");
});
test("Concentration totals are checked",()=>{
  assert.ok(classify({ingredients:[ingredient(80,null,null,null)]}).warnings.some(x=>/not 100%/.test(x)));
});
test("Standalone HTML embeds identical HazCom engine, selected from the jurisdiction selector",()=>{
  const html=fs.readFileSync("clp_mixture_calculator.html","utf8"),engine=fs.readFileSync("verification/hazcom2024.js","utf8");
  assert.equal(require("./sync_engines.js").embedded(html,"verification/hazcom2024.js"),engine.trimEnd());
  assert.match(html,/<select id="mjur"[\s\S]*?<option value="US">US OSHA HazCom 2024/);
  assert.match(html,/function renderHazCom2024Result/);
  assert.match(html,/shownResult = HazCom2024.classify\(mix\)/);
  assert.match(html,/HazCom2024.report\(mix, shownResult\)/);
  assert.equal([...html.matchAll(/<script>/g)].length,2);
  assert.equal([...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].length,2);
});
console.log(n+" US HazCom 2024 initial-screen checks passed");
