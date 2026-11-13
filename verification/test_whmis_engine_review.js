/* Regression tests for the 2026-11-13 Canadian WHMIS engine review:
 * defects fixed in existing pathways, oral/dermal evidence precedence
 * (HPR 8.1.3/8.1.4/8.1.7(2)) and HPR 7.6 flammable liquids.
 */
const assert=require("node:assert/strict");
const W=require("./whmis_engine.js");
const P=require("./whmis_physical.js");
const Picker=require("./whmis_hazard_picker.js");
let n=0;
function t(name,fn){fn();n++;console.log("PASS "+name)}
const safe={oral:{notAcute:true},dermal:{notAcute:true}};
const I=(name,pct,extra={})=>({name,pct,acute:safe,...extra});
const calc=(r,route)=>r.calculations.find(c=>c.route===route);
const labels=r=>r.outcomes.map(o=>o.label);

// ---------- Defects in existing pathways ----------
t("Skin: per-subcategory sums are shown in the calculation trail",()=>{
 const r=W.classify({ingredients:[I("Acid",3,{skin:"1A"}),I("Base",4,{skin:"1B"}),I("W",93)]});
 const steps=calc(r,"skin").steps.join(" | ");
 assert.match(steps,/Σ Skin Corr\. 1A \(relevant ingredients\) = 3\.0000%/);
 assert.match(steps,/Σ Skin Corr\. 1B \(relevant ingredients\) = 4\.0000%/);
 assert.equal(calc(r,"skin").candidate,"1");
});
t("Skin sensitiser with no recorded physical state is classified, not dropped",()=>{
 const r=W.classify({ingredients:[I("Sens",5,{health:{skinSens:"1"}}),I("W",95)]});
 assert.ok(labels(r).includes("Skin Sensitization — Category 1"));
 assert.match(r.review.join(" "),/physical state not established/);
});
t("Respiratory 1/1A at 0.1% w/w is classified without a recorded state",()=>{
 const r=W.classify({ingredients:[I("Iso",.1,{health:{respSens:"1A"}}),I("W",99.9)]});
 assert.ok(labels(r).includes("Respiratory Sensitization — Category 1A"));
});
t("A declared gas sensitiser still requires % v/v (no w/w substitution)",()=>{
 const r=W.classify({ingredients:[I("G",5,{health:{respSens:"1",ingredientState:"gas"}}),I("W",95)]});
 assert.equal(r.outcomes.filter(o=>o.route==="respSens").length,0);
 assert.match(r.review.join(" "),/requires % v\/v/);
});
t("Aspiration: no review noise when no aspiration ingredient is recorded",()=>{
 const r=W.classify({ingredients:[I("W",100)]});
 assert.equal(r.review.some(x=>/^Aspiration/.test(x)),false);
 assert.equal(calc(r,"aspiration").status,"not_established");
});
t("Aspiration: bulk criteria met with unconfirmed homogeneity is reported provisionally",()=>{
 const r=W.classify({ingredients:[I("Kerosene",50,{health:{aspiration:true}}),I("W",50)],healthMixture:{aspirationViscosity40:2}});
 assert.ok(labels(r).includes("Aspiration Hazard — Category 1"));
 assert.match(r.review.join(" "),/confirm the mixture does not separate/);
});
t("Aspiration: confirmed homogeneous with <10% needs no viscosity",()=>{
 const r=W.classify({ingredients:[I("Kerosene",5,{health:{aspiration:true}}),I("W",95)],healthMixture:{phaseSeparated:"no"}});
 assert.equal(calc(r,"aspiration").status,"not_established");
 assert.equal(r.review.some(x=>/^Aspiration/.test(x)),false);
});
t("Aspiration: separated layers still withhold the bulk candidate",()=>{
 const r=W.classify({ingredients:[I("Kerosene",50,{health:{aspiration:true}}),I("W",50)],healthMixture:{phaseSeparated:"yes",aspirationViscosity40:2}});
 assert.equal(r.outcomes.some(o=>o.route==="aspiration"),false);
 assert.equal(calc(r,"aspiration").status,"requires_review");
});
t("STOT SE/RE: Category 2 alongside Category 1 raises a different-organ review",()=>{
 const r=W.classify({ingredients:[I("A",2,{health:{stotSE:"1",stotRE:"1"}}),I("B",5,{health:{stotSE:"2",stotRE:"2"}}),I("W",93)]});
 assert.ok(labels(r).includes("STOT — Single Exposure — Category 1"));
 assert.match(r.review.join(" "),/STOT — Single Exposure: Category 2 ingredient\(s\)/);
 assert.match(r.review.join(" "),/STOT — Repeated Exposure: Category 2 ingredient\(s\)/);
});
t("Oral: invalid category or ATE is flagged and conservatively counted as unknown",()=>{
 const r=W.classify({ingredients:[I("Cat5",20,{acute:{oral:{category:5},dermal:{notAcute:true}}}),I("Neg",20,{acute:{oral:-1,dermal:{notAcute:true}}}),I("W",60)]});
 const o=calc(r,"oral");
 assert.equal(o.unknownPct,40);assert.equal(o.status,"provisional");
 assert.match(r.review.join(" "),/Category 5 is not adopted in Canada/);
 assert.match(r.review.join(" "),/must be a positive number/);
 assert.ok(o.notes.some(x=>/Invalid input treated as unknown/.test(x)));
});

// ---------- HPR 8.1.7(2) LD50 ranges ----------
t("HPR 8.1.7: oral range wholly in one category uses its point estimate",()=>{
 const res=W.resolveATE({rangeMin:60,rangeMax:250},"oral");
 assert.equal(res.ate,100);assert.match(res.source,/Category 3/);
});
t("HPR 8.1.7(2): range crossing a category boundary uses the lowest value",()=>{
 assert.equal(W.resolveATE({rangeMin:40,rangeMax:250},"oral").ate,40);
 assert.equal(W.resolveATE({rangeMin:1500,rangeMax:3000},"oral").ate,1500);
});
t("Range entirely above Category 4 or reversed is invalid",()=>{
 assert.ok(W.resolveATE({rangeMin:2500,rangeMax:3000},"oral").invalid);
 assert.ok(W.resolveATE({rangeMin:300,rangeMax:100},"dermal").invalid);
});

// ---------- HPR 8.1.3 / 8.1.4 oral & dermal evidence precedence ----------
const mix=[I("Toxic",50,{acute:{oral:10,dermal:10}}),I("W",50)];
t("HPR 8.1.3: whole-mixture oral LD50 overrides ingredient additivity",()=>{
 const r=W.classify({ingredients:mix,acuteMixture:{oral:{wholeMixtureLD50:400}}});
 const o=calc(r,"oral");
 assert.equal(o.status,"whole_mixture_candidate");assert.equal(o.category,4);assert.equal(o.ate,400);
 assert.ok(labels(r).includes("Acute Toxicity (Oral) — Category 4"));
 // Dermal still uses ingredient additivity: 100/(50/10)=20 mg/kg -> Cat 1.
 assert.equal(calc(r,"dermal").category,1);
});
t("HPR 8.1.3: whole-mixture LD50 above 2000 gives no oral category",()=>{
 const r=W.classify({ingredients:mix,acuteMixture:{oral:{wholeMixtureLD50:2500}}});
 assert.equal(calc(r,"oral").category,null);
 assert.equal(r.outcomes.some(o=>o.id==="acute-oral"),false);
});
t("HPR 8.1.4: bridging needs a category and documented basis",()=>{
 const ok=W.classify({ingredients:mix,acuteMixture:{dermal:{bridgedCategory:3,bridgingEvidence:"Dilution of tested batch X-12"}}});
 assert.equal(calc(ok,"dermal").status,"bridging_candidate");
 assert.ok(labels(ok).includes("Acute Toxicity (Dermal) — Category 3"));
 const bad=W.classify({ingredients:mix,acuteMixture:{dermal:{bridgedCategory:3}}});
 assert.equal(calc(bad,"dermal").status,"requires_review");
 assert.equal(bad.outcomes.some(o=>o.id==="acute-dermal"),false);
});
t("Invalid whole-mixture LD50 is reported, not silently ignored",()=>{
 const r=W.classify({ingredients:mix,acuteMixture:{oral:{wholeMixtureLD50:-3}}});
 assert.equal(calc(r,"oral").status,"invalid");
 assert.match(r.review.join(" "),/must be a positive number/);
});
t("No evidence entered keeps the previous ingredient method unchanged",()=>{
 const r=W.classify({ingredients:mix,acuteMixture:{oral:{wholeMixtureLD50:"",bridgedCategory:""}}});
 assert.equal(calc(r,"oral").ate,20);assert.equal(calc(r,"oral").status,"calculated");
});

// ---------- HPR 7.6 Flammable liquids ----------
t("HPR 7.6 category boundaries (flash point and initial boiling point)",()=>{
 const c=P.flammableLiquidCategory;
 assert.equal(c(22.9,35),1);assert.equal(c(22.9,35.1),2);
 assert.equal(c(23,20),3);assert.equal(c(60,100),3);
 assert.equal(c(60.1,200),4);assert.equal(c(93,200),4);
 assert.equal(c(93.1,200),null);assert.equal(c(10,null),"needs_ibp");
 assert.equal(c("",50),undefined);
});
t("Flammable liquid: provisional outcome with reference label elements",()=>{
 const r=W.classify({ingredients:[I("Ethanol",40),I("W",60)],flammableLiquid:{assess:true,physicalState:"liquid",flashPointC:25,flashPointMethod:"closed_cup"}});
 const o=r.outcomes.find(x=>x.id==="flammable-liquid");
 assert.equal(o.category,3);assert.equal(o.hazardCode,"H226");assert.equal(o.signalWord,"Warning");
 assert.deepEqual(o.pictogramSymbols,["Flame"]);
 assert.equal(r.hazardCoverage.find(x=>x.name==="Flammable liquids").status,"partial");
});
t("Flammable liquid Category 4 (Canada-specific) has no pictogram",()=>{
 const f=P.flammableLiquid({assess:true,physicalState:"liquid",flashPointC:75,flashPointMethod:"closed_cup"});
 assert.equal(f.category,4);assert.equal(f.outcomes[0].hazardCode,"H227");assert.deepEqual(f.outcomes[0].pictogramSymbols,[]);
});
t("Flammable liquid: missing data never yields a category",()=>{
 assert.equal(P.flammableLiquid({assess:true,physicalState:"liquid"}).status,"requires_data");
 const noIbp=P.flammableLiquid({assess:true,physicalState:"liquid",flashPointC:5});
 assert.equal(noIbp.status,"requires_data");assert.equal(noIbp.outcomes.length,0);
 assert.match(noIbp.notes.join(" "),/at least Category 2/);
 assert.equal(P.flammableLiquid({assess:true,flashPointC:5}).status,"requires_data");
});
t("Flammable liquid: aerosols, solids and gases are out of HPR 7.6",()=>{
 assert.equal(P.flammableLiquid({assess:true,physicalState:"liquid",aerosolDispenser:true,flashPointC:5}).status,"not_applicable");
 assert.equal(P.flammableLiquid({assess:true,physicalState:"solid",flashPointC:5}).status,"not_applicable");
});
t("Flammable liquid: flash point above 93 °C is not established, not a hazard",()=>{
 const f=P.flammableLiquid({assess:true,physicalState:"liquid",flashPointC:120,flashPointMethod:"closed_cup"});
 assert.equal(f.status,"not_established");assert.equal(f.outcomes.length,0);
});
t("Flammable liquid: open-cup and calculated flash points are flagged",()=>{
 assert.match(P.flammableLiquid({assess:true,physicalState:"liquid",flashPointC:40,flashPointMethod:"open_cup"}).notes.join(" "),/closed-cup/);
 assert.match(P.flammableLiquid({assess:true,physicalState:"liquid",flashPointC:40,flashPointMethod:"calculated"}).notes.join(" "),/not measured/);
});
t("Declared flammable-liquid ingredients prompt a product flash point, not a classification",()=>{
 const r=W.classify({ingredients:[I("Acetone",30,{declaredPhysicalHazards:["P:Flam-Liq-:2:H225"]}),I("W",70)]});
 assert.equal(r.outcomes.some(o=>o.id==="flammable-liquid"),false);
 assert.match(r.review.join(" "),/Acetone is declared as a flammable liquid ingredient/);
 assert.ok(r.notAssessed.includes("Flammable liquids (HPR 7.6)"));
});
t("Hazard picker offers Canada's Flammable Liquids Category 4 (H227)",()=>{
 const hit=Picker.search("H227","physical");
 assert.equal(hit.length,1);assert.equal(hit[0].category,"4");
});
t("Browser page loads the physical module before the engine and passes the new inputs",()=>{
 const html=require("node:fs").readFileSync(require("node:path").join(__dirname,"../canada_whmis_calculator.html"),"utf8");
 assert.ok(html.indexOf('src="verification/whmis_physical.js"')>0);
 assert.ok(html.indexOf('src="verification/whmis_physical.js"')<html.indexOf('src="verification/whmis_engine.js"'));
 for(const id of ["oral-whole","oral-bridge","oral-bridge-evidence","dermal-whole","dermal-bridge","dermal-bridge-evidence",
   "flam-assess","flam-state","flam-aerosol","flam-fp","flam-method","flam-ibp"])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/WHMIS\.classify\(\{ingredients,scope,inhalation,chemicalsUnderPressure,healthMixture,acuteMixture,flammableLiquid\}\)/);
});
console.log(n+" WHMIS engine review regression tests passed");
