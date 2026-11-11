// Per-outcome classification audit, numerical cut-offs and provenance.
const fs=require("fs"),assert=require("assert").strict,CLP=require("./engine.js");
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const app=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
const start=app.indexOf("const CLP_AUDIT_LAW="),end=app.indexOf("function ingredientContributionModel(i,r)");
assert(start>=0&&end>start,"Standalone ingredient audit functions missing");
const {ingredientOutcomeAssessment:assess,CLP_AUDIT_REFS,CLP_AUDIT_LABELS}=
 new Function("CLP",app.slice(start,end)+"\nreturn {ingredientOutcomeAssessment,CLP_AUDIT_REFS,CLP_AUDIT_LABELS};")(CLP);
const ing=(pct,codes,patch={})=>{const i=CLP.blankIngredient();i.name=patch.name||"Raw material";i.pct=String(pct);CLP.applyHCodes(i,codes);return Object.assign(i,patch);};
const outcome=(hazardId,label,other={})=>({hazardId,label,...other});
let n=0;function test(name,fn){try{fn();n++;}catch(e){throw Error(name+": "+e.message);}}
test("Acute Category 4 below Table 1.1 cut-off",()=>{
 const a=assess(ing(0.5,"H302"),outcome("acute","Acute Tox. 4 (oral)",{route:"oral"}));
 assert.equal(a.status,"below");assert.match(a.math,/0.5% < 1%/);assert.match(a.reference,/Table 1.1/);
});
test("Acute oral counted, but not dermal",()=>{
 const i=ing(3,"H302");
 assert.equal(assess(i,outcome("acute","Acute Tox. 4 (oral)",{route:"oral"})).status,"counted");
 assert.equal(assess(i,outcome("acute","Acute Tox. 4 (dermal)",{route:"dermal"})).status,"absent");
});
test("ATE outside acute toxic range is not forced into calculation",()=>{
 const i=ing(12,"H302");i.acute.oral.ate="999999";
 assert.equal(assess(i,outcome("acute","Acute Tox. 4 (oral)",{route:"oral"})).status,"notused");
});
test("Aquatic M=10 below 0.01% cut-off",()=>{
 const a=assess(ing(0.005,"H410",{mChronic:"10"}),outcome("aquatic","Aquatic Chronic 2"));
 assert.equal(a.status,"below");assert.match(a.math,/0.005% < 0.01%/);
});
test("Aquatic chronic 1 contributes 10 times to chronic 2",()=>{
 const a=assess(ing(0.2,"H410",{mChronic:"10"}),outcome("aquatic","Aquatic Chronic 2"));
 assert.equal(a.status,"counted");assert.match(a.math,/× M 10 × 10/);assert.match(a.math,/20% weighted term/);
});
test("Aquatic chronic 4 uses unweighted concentration even when M=10",()=>{
 const a=assess(ing(0.02,"H410",{mChronic:"10"}),outcome("aquatic","Aquatic Chronic 4"));
 assert.equal(a.status,"counted");assert.match(a.math,/= 0.02% weighted term/);assert.doesNotMatch(a.math,/× M 10/);
});
test("Aquatic Chronic 3 ingredient does not affect mixture Chronic 2 equation",()=>{
 const a=assess(ing(20,"H412"),outcome("aquatic","Aquatic Chronic 2"));
 assert.equal(a.status,"notused");
});
test("Missing M-factor is review, not exclusion",()=>{
 const a=assess(ing(0.02,"H410"),outcome("aquatic","Aquatic Chronic 2"));
 assert.equal(a.status,"review");assert.match(a.reason,/M-factor/);
});
test("Additive skin corrosive raw material counted at 1%",()=>{
 const a=assess(ing(1,"H314"),outcome("skin","Skin Irrit. 2"));
 assert.equal(a.status,"counted");assert.match(a.math,/10 ×/);
});
test("Nonadditive skin corrosive >=1% is direct trigger",()=>{
 const a=assess(ing(1.5,"H314",{nonAdditive:true}),outcome("skin","Skin Corr. 1"));
 assert.equal(a.status,"direct");assert.match(a.reference,/3.2.4/);
});
test("Nonadditive skin corrosive below 1% evaluated, not summed",()=>{
 const a=assess(ing(0.5,"H314",{nonAdditive:true}),outcome("skin","Skin Corr. 1"));
 assert.equal(a.status,"below");
});
test("Sub 1% SCL keeps additive skin effect under consideration",()=>{
 const a=assess(ing(0.3,"H314",{scl:{skinCorr:"0.5"}}),outcome("skin","Skin Irrit. 2"));
 assert.equal(a.status,"counted");
});
test("Carcinogen below GCL is below limit",()=>{
 const a=assess(ing(0.05,"H350"),outcome("carc","Carc. 1B"));
 assert.equal(a.status,"below");assert.match(a.math,/0.05% < 0.1%/);
});
test("Carcinogen above GCL is direct trigger",()=>{
 const a=assess(ing(0.2,"H350"),outcome("carc","Carc. 1B"));
 assert.equal(a.status,"direct");
});
test("Respiratory sensitiser Category 1B gas vs liquid GCL",()=>{
 const i=ing(0.3,"H334",{respSens:"1B"}),o=outcome("respSens","Resp. Sens. 1B");
 assert.equal(assess(i,o,"gas").status,"direct");
 assert.equal(assess(i,o,"liquid").status,"below");
});
test("Reproductive differentiation has its own threshold",()=>{
 const a=assess(ing(0.4,"H360F",{reproFert:"1B"}),outcome("repro","Repr. 1B"));
 assert.equal(a.status,"direct");assert.match(a.math,/fertility/);
});
test("Physical mixture outcome cannot be attributed from ingredient H-code",()=>{
 const a=assess(ing(30,"H225"),outcome("flam","Flam. Liq. 2"));
 assert.equal(a.status,"unattributed");
});
test("No source hazard is not an assertion of chemical safety",()=>{
 const a=assess(ing(40,""),outcome("carc","Carc. 1B"));
 assert.equal(a.status,"absent");assert.match(a.reason,/No corresponding/);
});
test("Invalid SCL requires review, not generic fallback",()=>{
 const a=assess(ing(2,"H317",{scl:{skinSens:"invalid"}}),outcome("skinSens","Skin Sens. 1"));
 assert.equal(a.status,"review");
});
test("Legal citations and decision labels are present",()=>{
 assert.match(CLP_AUDIT_REFS.aquatic,/4.1.3.5/);
 assert.match(CLP_AUDIT_LABELS.below,/Below/);
 assert.match(html,/CLP_AUDIT_LAW/);
});
console.log(n+" ingredient-level classification audit checks passed");