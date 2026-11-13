/* Canadian WHMIS health mixture rules verified to official HPR
 * 8.4.5, 8.5.3-8.5.5, 8.6.3-8.6.5, 8.7.3-8.7.6,
 * 8.8.5, 8.9.5, 8.10.5.
 */
const assert=require("node:assert/strict");
const Health=require("./whmis_health.js");
const WHMIS=require("./whmis_engine.js");
let n=0;
function t(name,fn){fn();n++;console.log("PASS "+name)}
const ing=(name,pct,health={},volumePct)=>({name,pct,volumePct,health});
const r=(items,opts={})=>Health.evaluate({ingredients:items,healthMixture:opts});
const out=(res,key)=>res.outcomes.filter(x=>x.route===key);
const cat=(res,key)=>out(res,key).map(x=>x.category);
const details=(res,key)=>res.calculations.find(x=>x.route===key);

t("HPR 8.4.5: respiratory Cat1 and 1A at exactly 0.1%",()=>{
 const x=r([ing("Sens",.1,{ingredientState:"liquid",respSens:"1A"}),ing("Base",99.9)]);
 assert.deepEqual(cat(x,"respSens"),["1A"]);
 const y=r([ing("Sens",.1,{ingredientState:"solid",respSens:"1"}),ing("Base",99.9)]);
 assert.deepEqual(cat(y,"respSens"),["1"]);
});
t("HPR 8.4.5: respiratory 1B liquids threshold 1.0%",()=>{
 assert.deepEqual(cat(r([ing("A",.99,{ingredientState:"liquid",respSens:"1B"}),ing("B",99.01)]),"respSens"),[]);
 assert.deepEqual(cat(r([ing("A",1,{ingredientState:"liquid",respSens:"1B"}),ing("B",99)]),"respSens"),["1B"]);
});
t("HPR 8.4.5: respiratory 1B gas threshold 0.2% v/v, not mass%",()=>{
 const bad=r([ing("A",3,{ingredientState:"gas",respSens:"1B"}),ing("B",97)]);
 assert.deepEqual(cat(bad,"respSens"),[]);assert.match(bad.review.join(" "),/% v\/v/);
 const low=r([ing("A",3,{ingredientState:"gas",respSens:"1B"},.199),ing("B",97)]);
 assert.deepEqual(cat(low,"respSens"),[]);
 const yes=r([ing("A",.01,{ingredientState:"gas",respSens:"1B"},.2),ing("B",99.99)]);
 assert.deepEqual(cat(yes,"respSens"),["1B"]);
});
t("Missing sensitiser state is screened on % w/w and flagged, never silently dropped",()=>{
 const a=r([ing("A",3,{respSens:"1B"}),ing("B",97)]);
 assert.deepEqual(cat(a,"respSens"),["1B"]);assert.match(a.review.join(" "),/physical state not established/);
 // Skin sensitisation thresholds do not depend on state.
 const s=r([ing("A",5,{skinSens:"1"}),ing("B",95)]);
 assert.deepEqual(cat(s,"skinSens"),["1"]);
 // Respiratory 1B between the gas (0.2%) and solid/liquid (1%) cut-offs:
 // no candidate on w/w, but the gas ambiguity is raised for review.
 const g=r([ing("A",.5,{respSens:"1B"}),ing("B",99.5)]);
 assert.deepEqual(cat(g,"respSens"),[]);assert.match(g.review.join(" "),/would meet the 0\.2% gas cut-off/);
});
t("HPR 8.4.5 skin 1B threshold 1% and 1A 0.1%",()=>{
 assert.deepEqual(cat(r([ing("A",.99,{ingredientState:"liquid",skinSens:"1B"}),ing("B",99.01)]),"skinSens"),[]);
 assert.deepEqual(cat(r([ing("A",1,{ingredientState:"liquid",skinSens:"1B"}),ing("B",99)]),"skinSens"),["1B"]);
 assert.deepEqual(cat(r([ing("A",.1,{ingredientState:"liquid",skinSens:"1A"}),ing("B",99.9)]),"skinSens"),["1A"]);
});
t("Respiratory and skin sensitisation are independent concurrent classifications",()=>{
 const a=r([ing("A",2,{ingredientState:"liquid",respSens:"1B",skinSens:"1A"}),ing("B",98)]);
 assert.deepEqual(cat(a,"respSens"),["1B"]);
 assert.deepEqual(cat(a,"skinSens"),["1A"]);
});
t("Sensitiser Category 1A prevents weaker 1B result",()=>{
 const a=r([ing("A",1,{ingredientState:"liquid",respSens:"1B"}),ing("B",.2,{ingredientState:"liquid",respSens:"1A"}),ing("C",98.8)]);
 assert.deepEqual(cat(a,"respSens"),["1A"]);
});
t("HPR 8.5.3 germ cell mutagenicity 1A and 1B ≥0.1%",()=>{
 for(const cls of ["1A","1B"]){assert.deepEqual(cat(r([ing("A",.1,{mutagen:cls}),ing("B",99.9)]),"mutagen"),[cls]);}
});
t("HPR 8.5.4 germ cell mutagenicity Cat2 requires 1.0%, not 0.1%",()=>{
 assert.deepEqual(cat(r([ing("A",.99,{mutagen:"2"}),ing("B",99.01)]),"mutagen"),[]);
 assert.deepEqual(cat(r([ing("A",1,{mutagen:"2"}),ing("B",99)]),"mutagen"),["2"]);
});
t("HPR 8.6.4 carcinogenicity Cat2 requires only 0.1%",()=>{
 assert.deepEqual(cat(r([ing("A",.1,{carcinogen:"2"}),ing("B",99.9)]),"carcinogen"),["2"]);
 assert.deepEqual(cat(r([ing("A",.099,{carcinogen:"2"}),ing("B",99.901)]),"carcinogen"),[]);
});
t("HPR 8.7.4 reproductive toxicity Cat2 requires 0.1%",()=>{
 assert.deepEqual(cat(r([ing("A",.1,{repro:"2"}),ing("B",99.9)]),"repro"),["2"]);
});
t("HPR 8.7.5 lactation separate from Cat1 fertility/development",()=>{
 const a=r([ing("A",.1,{repro:"1B",reproLactation:true}),ing("B",99.9)]);
 assert.deepEqual(cat(a,"repro"),["1B"]);
 assert.deepEqual(cat(a,"repro-lactation"),["Lactation"]);
});
t("HPR 8.7.5 effects on or via lactation also stand alone",()=>{
 const a=r([ing("A",.1,{reproLactation:true}),ing("B",99.9)]);
 assert.deepEqual(cat(a,"repro"),[]);
 assert.deepEqual(cat(a,"repro-lactation"),["Lactation"]);
});
t("CMR threshold is per ingredient, no invention of summation",()=>{
 const a=r([ing("A",.05,{mutagen:"1A"}),ing("B",.05,{mutagen:"1A"}),ing("C",99.9)]);
 assert.deepEqual(cat(a,"mutagen"),[]);
});
t("CMR 1A takes priority over 1B and Cat2",()=>{
 const a=r([ing("A",2,{carcinogen:"2"}),ing("B",.1,{carcinogen:"1B"}),ing("C",.1,{carcinogen:"1A"}),ing("D",97.8)]);
 assert.deepEqual(cat(a,"carcinogen"),["1A"]);
});
t("Unsubtyped CMR Category1 warns rather than inferring 1A/1B",()=>{
 const a=r([ing("A",.1,{carcinogen:"1"}),ing("B",99.9)]);
 assert.deepEqual(cat(a,"carcinogen"),["1"]);
 assert.match(a.review.join(" "),/no A\/B subcategory/);
});
t("HPR 8.8.5 STOT SE Category1 and Category2 trigger at exactly 1%",()=>{
 assert.deepEqual(cat(r([ing("A",1,{stotSE:"1"}),ing("B",99)]),"stot-se"),["1"]);
 assert.deepEqual(cat(r([ing("A",1,{stotSE:"2"}),ing("B",99)]),"stot-se"),["2"]);
});
t("HPR 8.8.5 STOT SE Category3 one ingredient 20% narcotic",()=>{
 assert.deepEqual(cat(r([ing("A",20,{stotSE3Narcotic:true}),ing("B",80)]),"stot-se"),["3"]);
 assert.deepEqual(cat(r([ing("A",19.99,{stotSE3Narcotic:true}),ing("B",80.01)]),"stot-se"),[]);
});
t("STOT SE Cat3 accepts known effect-eliciting concentration",()=>{
 const a=r([ing("A",5,{stotSE3Respiratory:true,stotSE3EffectPct:5}),ing("B",95)]);
 assert.deepEqual(cat(a,"stot-se"),["3"]);
});
t("STOT SE Cat3 requires same-effect combination of ≥2 ingredients each ≥1%",()=>{
 const a=r([ing("A",10,{stotSE3Narcotic:true}),ing("B",10,{stotSE3Narcotic:true}),ing("C",80)]);
 assert.deepEqual(cat(a,"stot-se"),["3"]);
 const b=r([ing("A",10,{stotSE3Narcotic:true}),ing("B",10,{stotSE3Respiratory:true}),ing("C",80)]);
 assert.deepEqual(cat(b,"stot-se"),[]);
});
t("STOT SE Cat3 sum excludes ingredients below 1% threshold",()=>{
 const a=r([ing("A",19.5,{stotSE3Narcotic:true}),ing("B",.5,{stotSE3Narcotic:true}),ing("C",80)]);
 assert.deepEqual(cat(a,"stot-se"),[]);
});
t("STOT SE Category1 and3 can coexist through paragraph (1)(c)",()=>{
 const a=r([ing("A",1,{stotSE:"1"}),ing("B",20,{stotSE3Respiratory:true}),ing("C",79)]);
 assert.deepEqual(cat(a,"stot-se"),["1","3"]);
});
t("STOT SE Category1 plus Cat3 summation alone does not add Cat3",()=>{
 const a=r([ing("A",1,{stotSE:"1"}),ing("B",10,{stotSE3Narcotic:true}),ing("C",10,{stotSE3Narcotic:true}),ing("D",79)]);
 assert.deepEqual(cat(a,"stot-se"),["1"]);
});
t("STOT SE Category2 plus Cat3 direct can coexist",()=>{
 const a=r([ing("A",1,{stotSE:"2"}),ing("B",20,{stotSE3Narcotic:true}),ing("C",79)]);
 assert.deepEqual(cat(a,"stot-se"),["2","3"]);
});
t("HPR 8.9.5 STOT RE Category1/2 1% per ingredient",()=>{
 assert.deepEqual(cat(r([ing("A",1,{stotRE:"1"}),ing("B",99)]),"stot-re"),["1"]);
 assert.deepEqual(cat(r([ing("A",.99,{stotRE:"2"}),ing("B",99.01)]),"stot-re"),[]);
 assert.deepEqual(cat(r([ing("A",1,{stotRE:"2"}),ing("B",99)]),"stot-re"),["2"]);
});
t("HPR 8.10.5: aspiration 10% with 20.5 mm²/s is positive",()=>{
 const a=r([ing("A",10,{aspiration:true}),ing("B",90)],{phaseSeparated:"no",aspirationViscosity40:20.5});
 assert.deepEqual(cat(a,"aspiration"),["1"]);
});
t("Aspiration requires both sum and low viscosity",()=>{
 const base=[ing("A",10,{aspiration:true}),ing("B",90)];
 assert.deepEqual(cat(r(base,{phaseSeparated:"no",aspirationViscosity40:20.501}),"aspiration"),[]);
 assert.deepEqual(cat(r([ing("A",9.99,{aspiration:true}),ing("B",90.01)],{phaseSeparated:"no",aspirationViscosity40:1}),"aspiration"),[]);
});
t("Aspiration sums only constituents individually at least 1%",()=>{
 const a=r([ing("A",9.8,{aspiration:true}),ing("B",.2,{aspiration:true}),ing("C",90)],{phaseSeparated:"no",aspirationViscosity40:5});
 assert.deepEqual(cat(a,"aspiration"),[]);
 assert.match(details(a,"aspiration").steps.join(" "),/9.8000%/);
});
t("Phase-separated aspiration requires HPR 8.10.5(b) layer evaluation",()=>{
 const a=r([ing("A",20,{aspiration:true}),ing("B",80)],{phaseSeparated:"yes",aspirationViscosity40:5});
 assert.deepEqual(cat(a,"aspiration"),[]);
 assert.equal(details(a,"aspiration").status,"requires_review");
 assert.match(a.review.join(" "),/layer-specific/);
});
t("Missing phase/viscosity does not imply no aspiration hazard",()=>{
 const a=r([ing("A",20,{aspiration:true}),ing("B",80)]);
 assert.deepEqual(cat(a,"aspiration"),[]);
 assert.equal(details(a,"aspiration").status,"requires_review");
 const b=r([ing("A",20,{aspiration:true}),ing("B",80)],{phaseSeparated:"no"});
 assert.equal(details(b,"aspiration").status,"requires_data");
});
t("HPR 2.2 precedence evidence flag withholds ingredient candidate outcomes",()=>{
 const a=r([ing("A",.1,{carcinogen:"1A"}),ing("B",99.9)],{otherEvidence:true,phaseSeparated:"no",aspirationViscosity40:30});
 assert.deepEqual(cat(a,"carcinogen"),[]);
 assert.equal(details(a,"carcinogen").candidate,"1A");
 assert.equal(details(a,"carcinogen").status,"evidence_review");
});
t("No automatic negative conclusion for blank health data",()=>{
 const a=r([ing("A",100)]);
 assert.equal(a.outcomes.length,0);
 assert.ok(a.calculations.some(x=>x.status==="not_established"));
 assert.match(a.note,/not negative hazard/);
});
t("Only new health paths are added; EU engine remains separate",()=>{
 const r0=WHMIS.classify({ingredients:[{name:"A",pct:1,acute:{oral:{notAcute:true},dermal:{notAcute:true}},health:{carcinogen:"1A"}},{name:"Base",pct:99,acute:{oral:{notAcute:true},dermal:{notAcute:true}}}]});
 assert.equal(r0.valid,true);
 assert.ok(r0.outcomes.some(x=>x.route==="carcinogen"&&x.category==="1A"));
 assert.equal(r0.complete,false);
 assert.equal(r0.hazardCoverage.filter(x=>x.status==="partial").length,13);
});
t("Gas lactation screening uses volume rather than mass concentration",()=>{
 const low=r([ing("A",50,{ingredientState:"gas",reproLactation:true},.099),ing("B",50)]);
 assert.deepEqual(cat(low,"repro-lactation"),[]);
 const high=r([ing("A",.01,{ingredientState:"gas",reproLactation:true},.1),ing("B",99.99)]);
 assert.deepEqual(cat(high,"repro-lactation"),["Lactation"]);
});
t("Gas STOT SE Cat3 direct threshold uses separately entered volume percentage",()=>{
 const low=r([ing("A",50,{ingredientState:"gas",stotSE3Narcotic:true},19.9),ing("B",50)]);
 assert.deepEqual(cat(low,"stot-se"),[]);
 const high=r([ing("A",.01,{ingredientState:"gas",stotSE3Narcotic:true},20),ing("B",99.99)]);
 assert.deepEqual(cat(high,"stot-se"),["3"]);
});
t("Missing gas volume data in STOT SE Cat3 or lactation triggers review",()=>{
 const a=r([ing("A",50,{ingredientState:"gas",stotSE3Respiratory:true,reproLactation:true}),ing("B",50)]);
 assert.deepEqual(cat(a,"stot-se"),[]);
 assert.deepEqual(cat(a,"repro-lactation"),[]);
 assert.match(a.review.join(" "),/requires % v\/v/);
});
console.log(n+" Canadian HPR 8.4–8.10 health hazard tests passed");
