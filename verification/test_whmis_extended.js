const assert=require("node:assert/strict");
const E=require("./whmis_extended.js");
const WHMIS=require("./whmis_engine.js");
const meta=require("../data/canada/hpr_2022_rule_manifest.json");
const hpa=require("../data/canada/hpa_2023_source_map.json");
let n=0;function t(label,fn){fn();n++;console.log("PASS "+label)}
const base={assess:true,physicalState:"liquid",pressurisedWithGas:true,aerosolDispenser:false,gasUnderPressure:false,pressureKPa:200,flammablePct:85,heatCombustionKJg:20};
const press=o=>E.pressureResult({...base,...o});
const i=(name,pct,inh,volumePct)=>({name,pct,volumePct,acute:{inhalation:inh}});
const calc=(ingredients,form="vapour",extra={})=>E.inhalationResult({ingredients,inhalation:{form,...extra}});
const notAcute={notAcute:true};

t("HPR 7.21 exactly 200 kPa includes chemicals under pressure",()=>{
 assert.equal(press({}).category,1);assert.equal(press({pressureKPa:199.999}).status,"not_applicable");
});
t("HPR 7.21.1 Category 1: ≥85% and ≥20 kJ/g",()=>{
 assert.equal(press({flammablePct:85,heatCombustionKJg:20}).category,1);
 assert.equal(press({flammablePct:99,heatCombustionKJg:29}).category,1);
});
t("HPR Category 2 branch 1: >1% and heat <20",()=>{
 assert.equal(press({flammablePct:1.001,heatCombustionKJg:19.999}).category,2);
 assert.equal(press({flammablePct:85,heatCombustionKJg:19.999}).category,2);
});
t("HPR Category 2 branch 2: <85% and heat ≥20",()=>{
 assert.equal(press({flammablePct:84.999,heatCombustionKJg:20}).category,2);
 assert.equal(press({flammablePct:1,heatCombustionKJg:25}).category,2);
});
t("HPR Category 3 ≤1% and heat <20",()=>{
 assert.equal(press({flammablePct:1,heatCombustionKJg:19.999}).category,3);
 assert.equal(press({flammablePct:0,heatCombustionKJg:0}).category,3);
});
t("Boundary 85% and 20 kJ/g must select Category 1",()=>{
 assert.equal(press({flammablePct:85,heatCombustionKJg:20}).category,1);
});
t("Aerosol dispenser supersedes chemicals under pressure",()=>{
 const r=press({aerosolDispenser:true});assert.equal(r.status,"not_applicable");assert.equal(r.outcomes.length,0);
});
t("HPR gas under pressure is excluded from chemicals under pressure",()=>{
 assert.equal(press({gasUnderPressure:true}).status,"not_applicable");
 assert.equal(press({physicalState:"gas"}).status,"not_applicable");
});
t("No pressurising gas excludes class",()=>{
 assert.equal(press({pressurisedWithGas:false}).status,"not_applicable");
});
t("Incomplete package data must never return a category",()=>{
 for(const props of [{aerosolDispenser:null},{gasUnderPressure:null},{pressurisedWithGas:null},{physicalState:""},{pressureKPa:null},{flammablePct:null},{heatCombustionKJg:null}]){
 const r=press(props);assert.equal(r.category,null,JSON.stringify(props));assert.equal(r.outcomes.length,0);
 }
});
t("Invalid physical numerical data block classification",()=>{
 for(const props of [{flammablePct:101},{flammablePct:-1},{pressureKPa:-5},{heatCombustionKJg:-1}]){
 assert.equal(press(props).status,"requires_data");
 }
});
t("Pressure categories map to H282/H283/H284 and correct GHS8 pictogram signals",()=>{
 for(const [category,code,signal] of [[1,"H282","Danger"],[2,"H283","Warning"],[3,"H284","Warning"]]){
 const q=category===1?press({}):category===2?press({flammablePct:80}):press({flammablePct:1,heatCombustionKJg:18});
 assert.equal(q.category,category);assert.equal(q.outcomes[0].hazardCode,code);
 assert.equal(q.outcomes[0].signalWord,signal);
 }
});
t("GHS8 Category 3 French/English HPR label not represented as final SDS",()=>{
 assert.match(press({flammablePct:0,heatCombustionKJg:0}).notes.join(" "),/not compliant labels/i);
});
t("HPR inhalation categories for gases exactly at thresholds",()=>{
 const d=E.INHALATION.gas;
 assert.deepEqual(d.limits,[100,500,2500,20000]);
 assert.deepEqual([100,500,2500,20000].map(x=>E.countCategory(x,"gas")),[1,2,3,4]);
 assert.equal(E.countCategory(20000.001,"gas"),null);
});
t("HPR inhalation categories for vapours and dust/mists",()=>{
 assert.deepEqual(E.INHALATION.vapour.limits,[0.5,2,10,20]);
 assert.deepEqual(E.INHALATION.dustMist.limits,[0.05,0.5,1,5]);
 assert.equal(E.countCategory(.5,"vapour"),1);assert.equal(E.countCategory(.05,"dustMist"),1);
});
t("One-hour gases and vapours divided by 2 to four-hour LC50",()=>{
 assert.equal(E.convertATE({ate:1000,hours:1},"gas").ate,500);
 assert.equal(E.convertATE({ate:2,hours:1},"vapour").ate,1);
});
t("One-hour dust/mist divided by 4 to four-hour LC50",()=>{
 assert.equal(E.convertATE({ate:4,hours:1},"dustMist").ate,1);
});
t("Durations other than 1h/4h require expert conversion",()=>{
 assert.match(E.convertATE({ate:100,hours:2},"gas").invalid,/1 hour or 4 hours/);
});
t("Category-only inhalation input uses HPR 8.1.7 correct point estimates",()=>{
 assert.deepEqual(["gas","vapour","dustMist"].map(f=>E.convertATE({category:3},f).ate),[700,3,0.5]);
 assert.deepEqual(meta.acute.inhalation.gas.categoryPoints,E.INHALATION.gas.points);
});
t("Crossing two inhalation category ranges uses minimum LC50",()=>{
 assert.equal(E.convertATE({rangeMin:0.45,rangeMax:0.55},"vapour").ate,0.45);
 assert.equal(E.convertATE({rangeMin:0.3,rangeMax:0.4},"vapour").ate,0.05);
});
t("Mixture vapour acute Cat 4 calculation using mass %",()=>{
 const r=calc([i("A",20,{ate:4}),i("B",80,notAcute)]);
 assert.equal(r.ate,80);assert.equal(r.category,null);
 const s=calc([i("A",50,{ate:1}),i("B",50,notAcute)]);
 assert.equal(s.ate,2);assert.equal(s.category,2);
});
t("Gas mixture requires volume % and must never substitute mass percent",()=>{
 const r=calc([i("A",30,{ate:100},null),i("B",70,notAcute,null)],"gas");
 assert.equal(r.status,"invalid");assert.equal(r.category,null);
});
t("Gas mixture with volume % uses correct units",()=>{
 const r=calc([i("A",20,{ate:100},20),i("B",80,notAcute,80)],"gas");
 assert.equal(r.ate,500);assert.equal(r.category,2);assert.equal(r.unit,"ppmV");
});
t("Inhalation unknown >10% changes numerator",()=>{
 const r=calc([i("A",20,{ate:1}),i("U",15,null),i("I",65,notAcute)]);
 assert.equal(r.numerator,85);assert.equal(r.ate,4.25);
 assert.equal(r.unknownPct,15);assert.equal(r.category,3);
 assert.equal(r.supplementalStatements[0].unknownPct,15);
});
t("Unknown exactly 10% uses unmodified numerator",()=>{
 const r=calc([i("A",20,{ate:1}),i("U",10,null),i("I",70,notAcute)]);
 assert.equal(r.numerator,100);
});
t("Sub-1% only contributes on explicit supporting evidence",()=>{
 const r=calc([i("A",0.5,{ate:0.01}),i("B",99.5,notAcute)]);
 assert.equal(r.contributions.length,0);
 const e=calc([i("A",0.5,{ate:0.01,relevantBelow1:true}),i("B",99.5,notAcute)]);
 assert.equal(e.ate,2);assert.equal(e.category,2);
});
t("Missing inhalation evidence is unknown, not safe",()=>{
 const r=calc([i("unknown",20,null),i("inert",80,notAcute)]);
 assert.equal(r.category,null);assert.equal(r.status,"provisional_incomplete");
 assert.equal(r.unknownPct,20);
});
t("No final negative result when measured LC50 exceeds Cat4",()=>{
 const r=calc([i("A",100,{ate:100})],"vapour");
 assert.equal(r.status,"provisional_incomplete");
 assert.equal(r.category,null);
 assert.match(r.review.join(" "),/comparable amplitude/);
});
t("Whole-mixture valid LC50 precedes ingredient-based formula",()=>{
 const r=calc([i("A",20,{ate:0.001}),i("I",80,notAcute)],"vapour",{wholeMixtureLC50:8,wholeMixtureHours:4});
 assert.equal(r.status,"whole_mixture_candidate");assert.equal(r.category,3);assert.equal(r.ate,8);
 assert.equal(r.contributions.length,0);
});
t("Bridging category requires evidence; precedence after whole mixture",()=>{
 const items=[i("A",20,{ate:1}),i("B",80,notAcute)];
 const bad=calc(items,"vapour",{bridgedCategory:"1"});assert.equal(bad.category,null);
 const good=calc(items,"vapour",{bridgedCategory:"3",bridgingEvidence:"HPR 2.3 dilution, source report 123"});assert.equal(good.category,3);
 const first=calc(items,"vapour",{wholeMixtureLC50:12,bridgedCategory:"1",bridgingEvidence:"Source report"});assert.equal(first.category,4);
});
t("Zero concentration does not contribute to inhalation",()=>{
 const r=calc([i("A",0,{ate:0.01}),i("B",100,notAcute)]);
 assert.equal(r.contributions.length,0);assert.equal(r.unknownPct,0);
});
t("HPA section 12 direct exclusions are not safety findings",()=>{
 const r=E.evaluateScope({activity:"sell",workplace:"yes",exclusion:"manufactured_article"});
 assert.equal(r.status,"outside_part_ii_scope");
 assert.match(r.notes.join(" "),/not a conclusion.*non-hazardous/i);
});
t("HPA Schedule 1 exclusion codes match source map",()=>{
 const m=[...hpa.scopeExclusions.section12Direct,...hpa.scopeExclusions.schedule1].map(x=>x.type).sort();
 assert.deepEqual(Object.keys(E.EXCLUSIONS).sort(),m);
});
t("Only reviewed none and verified workplace sale/import yield potential scope",()=>{
 assert.equal(E.evaluateScope({activity:"import",workplace:"yes",exclusion:"none_confirmed"}).status,"potentially_in_scope");
 assert.equal(E.evaluateScope({activity:"import",workplace:"yes",exclusion:"unknown"}).status,"undetermined");
});
t("User input invalid percentages block extension hazard outcomes",()=>{
 const r=WHMIS.classify({ingredients:[i("A",60,{ate:1})],inhalation:{form:"vapour"},
  chemicalsUnderPressure:base,scope:{activity:"sell",workplace:"yes",exclusion:"none_confirmed"}});
 assert.equal(r.valid,false);assert.equal(r.outcomes.length,0);
 assert.ok(r.scope);
});
t("End-to-end WHMIS engine returns inhalation/pressure alongside existing routes",()=>{
 const ingredients=[{name:"A",pct:20,volumePct:20,acute:{oral:{notAcute:true},dermal:{notAcute:true},inhalation:{ate:100}}},
 {name:"B",pct:80,volumePct:80,acute:{oral:{notAcute:true},dermal:{notAcute:true},inhalation:{notAcute:true}}}];
 const r=WHMIS.classify({ingredients,inhalation:{form:"gas"},chemicalsUnderPressure:base,
 scope:{activity:"sell",workplace:"yes",exclusion:"none_confirmed"}});
 assert.equal(r.valid,true);assert.equal(r.outcomes.some(x=>x.id==="acute-inhalation"),true);
 assert.equal(r.outcomes.some(x=>x.id==="chemicals-under-pressure"),true);
 assert.equal(r.scope.status,"potentially_in_scope");
 assert.equal(r.complete,false);
});
console.log(n+" HPR/HPA WHMIS extension tests passed");
