// Regression checks for ingredient relevance and REACH Annex II §3.2 screening.
const fs=require("fs"),assert=require("assert").strict,CLP=require("./engine.js");
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const app=scripts[1],start=app.indexOf("/* Transparent screening for REACH Annex II"),end=app.indexOf("function renderResult(r)",start);
assert(start>=0&&end>start,"Ingredient screening functions missing");
const code=app.slice(start,end),esc=x=>String(x??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
let mix={ingredients:[],state:"liquid"},codes=i=>CLP.parseHCodeTokens(i.hcodes).codes.map(x=>x.code);
const fn=new Function("CLP","esc","ingredientHCodes","getMix","groupForCode","hazardChipLabel",code.replace("const rows=mix.ingredients.map","const rows=getMix().ingredients.map").replace("mix.state===","getMix().state===")+
 "\nreturn {ingredientSection3Signals,hazardIngredientRelevant,ingredientInsightsHTML,ingredientCutoffDetails,ingredientContributionModel,ingredientContributionDetailsHTML};");
const ui=fn(CLP,esc,codes,()=>mix,code=>/^H2/.test(code)?"physical":/^H4|^EUH4/.test(code)?"environmental":"health",code=>code);
const ing=(pct,codes="",props={})=>{const i=CLP.blankIngredient();i.name=props.name||"Test";i.pct=String(pct);CLP.applyHCodes(i,codes);return Object.assign(i,props);};
const screen=(i,classified=true,gas=false)=>ui.ingredientSection3Signals(i,classified,gas);
const run=(a)=>{mix={name:"Test",state:"liquid",ingredients:a};return CLP.classify(mix)};
let n=0;function test(name,fn){try{fn();n++}catch(e){throw Error(name+": "+e.message)}}
test("Classified: skin corrosion threshold 1%",()=>{
 assert.equal(screen(ing(1,"H314")).status,"include");
 assert.notEqual(screen(ing(0.5,"H314")).status,"include");
});
test("Classified: SCL below the generic threshold triggers disclosure",()=>{
 assert.equal(screen(ing(0.4,"H314",{scl:{skinCorr:"0.3"}})).status,"include");
});
test("Classified: sensitiser 1A threshold 0.01%",()=>{
 assert.equal(screen(ing(0.01,"H317",{skinSens:"1A"})).status,"include");
 assert.notEqual(screen(ing(0.009,"H317",{skinSens:"1A"})).status,"include");
});
test("Classified: low generic skin sensitiser threshold",()=>{
 assert.equal(screen(ing(0.1,"H317",{skinSens:"1B"})).status,"include");
});
test("Classified: lowered aquatic cutoff with M-factor",()=>{
 assert.equal(screen(ing(0.01,"H410",{mChronic:"10"})).status,"include");
 assert.notEqual(screen(ing(0.005,"H410",{mChronic:"10"})).status,"include");
});
test("Classified: OEL at low positive percentage triggers",()=>{
 assert.equal(screen(ing(0.001,"",{sdsUnionOEL:true})).status,"include");
});
test("Unclassified: hazardous non-gaseous component ≥1%",()=>{
 assert.equal(screen(ing(1,"H315"),false).status,"include");
 assert.notEqual(screen(ing(0.9,"H315"),false).status,"include");
});
test("Unclassified: gas 0.2% cutoff",()=>{
 assert.equal(screen(ing(0.2,"H315"),false,true).status,"include");
});
test("Unclassified: reproductive toxicity ≥0.1%",()=>{
 assert.equal(screen(ing(0.1,"H361"),false).status,"include");
});
test("Unclassified: Article 59/Annex XIII status triggers at 0.1%",()=>{
 assert.equal(screen(ing(0.1,"",{sdsSVHC:true}),false).status,"include");
 assert.equal(screen(ing(0.1,"",{sdsPBT:true}),false).status,"include");
});
test("Unclassified: Category 1A sensitiser lower bound",()=>{
 assert.equal(screen(ing(0.01,"H334",{respSens:"1A"}),false).status,"include");
});
test("Missing concentration is never assumed to trigger",()=>{
 assert.equal(screen(ing("", "H350")).status,"review");
});
test("Unclassified raw material with no identified hazard is not automatically omitted",()=>{
 assert.equal(screen(ing(5,""),false).status,"review");
});
test("Ingredient relevance evaluates matching hazard class separately",()=>{
 const a=ing(4,"H314",{name:"Corrosive"}),b=ing(2,"H410",{name:"Aquatic"}),r=run([a,b]);
 assert(ui.hazardIngredientRelevant({id:"skin"},a));
 assert(!ui.hazardIngredientRelevant({id:"skin"},b));
 assert(ui.hazardIngredientRelevant({id:"aquatic"},b));
 assert(!ui.hazardIngredientRelevant({id:"aquatic"},a));
});
test("Insight panel separates SDS disclosure from mixture contributor flags",()=>{
 const a=ing(5,"H314",{name:"Corrosive"}),b=ing(0.2,"H317",{name:"Sensitiser"});
 const r=run([a,b]),text=ui.ingredientInsightsHTML(r);
 assert.match(text,/SDS Section 3 screening/);
 assert.match(text,/Corrosive/);
 assert.match(text,/Sensitiser/);
 assert.match(text,/potential contributor/);
 assert.match(text,/Disclose — indicated/);
 assert.match(text,/data-view="ingredientsInsight"/);
});

test("Aquatic Chronic 1 M=10 below 0.01% is screened below cut-off",()=>{
 const i=ing(0.005,"H410",{aquaChronic:"1",mChronic:"10"});
 const x=ui.ingredientCutoffDetails(i).find(x=>x.label==="Aquatic Chronic 1");
 assert.equal(x.cut,0.01);assert.equal(x.status,"below");
});
test("Aquatic Chronic 1 M=10 at 0.01% is included",()=>{
 const i=ing(0.01,"H410",{aquaChronic:"1",mChronic:"10"});
 const x=ui.ingredientCutoffDetails(i).find(x=>x.label==="Aquatic Chronic 1");
 assert.equal(x.status,"included");
});
test("Aquatic M-factor missing explicitly requests review",()=>{
 const i=ing(0.01,"H410",{aquaChronic:"1",mChronic:""});
 const x=ui.ingredientCutoffDetails(i).find(x=>x.label==="Aquatic Chronic 1");
 assert.equal(x.status,"review");
 assert.match(x.extra,/M-factor missing/);
});
test("Acute 4 at 0.5% is below the engine's 1% cut-off",()=>{
 const i=ing(0.5,"H302");
 const x=ui.ingredientCutoffDetails(i).find(x=>x.label.startsWith("Acute toxicity — Oral"));
 assert.equal(x.cut,1);assert.equal(x.status,"below");
});
test("ATE-provided ingredient requires derived category review",()=>{
 const i=ing(2,"H302");i.acute.oral.ate="350";
 const x=ui.ingredientCutoffDetails(i).find(x=>x.label.startsWith("Acute toxicity — Oral"));
 assert.equal(x.status,"review");
});
test("STOT SE Category 3 below 1% is screened out",()=>{
 const i=ing(0.5,"H335");
 const x=ui.ingredientCutoffDetails(i).find(x=>x.label==="STOT SE Cat. 3 effects");
 assert.equal(x.status,"below");
});
test("Skin Corr with lower SCL remains relevant below 1%",()=>{
 const i=ing(0.3,"H314",{skinCorr:"1A",scl:{skinCorr:"0.5"}});
 const x=ui.ingredientCutoffDetails(i).find(x=>x.id==="skin");
 assert.equal(x.status,"included");assert.equal(x.cut,0);
});
test("Non-hazardous ingredient has no identified hazard rows",()=>{
 const x=ui.ingredientContributionModel(ing(20,""),{outcomes:[]});
 assert.equal(x.entries.length,0);assert.equal(x.count,0);
});
test("Matching mixture result counted even if below cut-off, with explicit flag",()=>{
 const i=ing(0.005,"H410",{aquaChronic:"1",mChronic:"10"});
 const r={outcomes:[{hazardId:"aquatic",label:"Aquatic Chronic 2"}]};
 const x=ui.ingredientContributionModel(i,r);
 assert.equal(x.count,1);assert.equal(x.below,1);
 assert.match(ui.ingredientContributionDetailsHTML(i,r),/Below cut-off/);
 assert.match(ui.ingredientContributionDetailsHTML(i,r),/Aquatic Chronic 2/);
});
test("Nonmatching hazards still appear in detail rows",()=>{
 const i=ing(3,"H315");const r={outcomes:[{hazardId:"aquatic",label:"Aquatic Chronic 3"}]};
 const x=ui.ingredientContributionModel(i,r);
 assert.equal(x.count,0);
 assert.match(ui.ingredientContributionDetailsHTML(i,r),/No matching mixture classification/);
});
test("Physical source hazard flags review instead of implying mixture contribution",()=>{
 const i=ing(20,"H225");
 const rows=ui.ingredientCutoffDetails(i).filter(x=>x.id==="physical");
 assert(rows.length>=1);assert(rows.every(x=>x.status==="review"));
});
console.log(n+" ingredient contribution / Section 3 checks passed");
