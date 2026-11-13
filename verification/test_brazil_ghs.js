// Regression tests for the Brazilian ABNT NBR 14725:2023 / GHS Rev. 7 pilot engine.
// Run: node verification/test_brazil_ghs.js
const assert=require("node:assert/strict");
const B=require("./brazil_ghs_engine.js");
let passed=0,failed=0;
function t(name,fn){try{fn();passed++;console.log("PASS "+name);}catch(e){failed++;console.log("FAIL "+name+"\n  "+e.message);}}
const safe={acute:{oral:{notAcute:true},dermal:{notAcute:true}}};
const filler=pct=>Object.assign({name:"Water",pct},JSON.parse(JSON.stringify(safe)));
const run=(ings,mixture,extra)=>B.classify(Object.assign({mixture:Object.assign({flashPoint:100},mixture||{}),ingredients:ings},extra||{}));
const res=(r,key)=>r.results.find(x=>x.key===key);
const cat=(r,key)=>{const x=res(r,key);return x?x.category:undefined;};
const H=r=>r.label.hazardStatements.map(h=>h.code);

t("profile identifies NBR 14725:2023, GHS Rev.7 and the 2025-07-04 mandatory date",()=>{
  assert.equal(B.PROFILE.id,"BR-NBR14725-2023");
  assert.equal(B.PROFILE.mandatoryFrom,"2025-07-04");
  assert.match(B.PROFILE.ghs,/Rev\. 7/);
  assert.match(B.PROFILE.labelLanguage,/Portuguese/);
});

t("acute category boundaries include the GHS optional Category 5",()=>{
  assert.equal(B.acuteCategory(5,"oral"),1);assert.equal(B.acuteCategory(5.01,"oral"),2);
  assert.equal(B.acuteCategory(300,"oral"),3);assert.equal(B.acuteCategory(2000,"oral"),4);
  assert.equal(B.acuteCategory(2001,"oral"),5);assert.equal(B.acuteCategory(5000,"oral"),5);
  assert.equal(B.acuteCategory(5001,"oral"),null);
  assert.equal(B.acuteCategory(50,"dermal"),1);assert.equal(B.acuteCategory(2500,"dermal"),5);
  assert.equal(B.acuteCategory(20,"vapour"),4);assert.equal(B.acuteCategory(20.1,"vapour"),null);
  assert.equal(B.acuteCategory(20000,"gas"),4);assert.equal(B.acuteCategory(0.05,"dustMist"),1);
});

t("ATEmix additivity (GHS 3.1.3.6.1) with entered ATE",()=>{
  const r=run([{name:"A",pct:10,acute:{oral:{ate:100},dermal:{notAcute:true}}},filler(90)]);
  const o=res(r,"acute-oral");
  assert.ok(Math.abs(o.ate-1000)<1e-6);assert.equal(o.category,4);
  assert.ok(H(r).includes("H302"));assert.ok(r.label.pictograms.includes("GHS07"));
});

t("unknown acute toxicity >10 % uses the corrected numerator (GHS 3.1.3.6.2.3)",()=>{
  const r=run([{name:"A",pct:20,acute:{oral:{ate:200},dermal:{notAcute:true}}},{name:"U",pct:15,acute:{dermal:{notAcute:true}}},filler(65)]);
  const o=res(r,"acute-oral");
  assert.equal(o.unknownPct,15);assert.ok(Math.abs(o.ate-850)<1e-6);assert.equal(o.category,4);
  assert.ok(o.notes.some(n=>/3\.1\.3\.6\.2\.3/.test(n)));
  assert.ok(o.notes.some(n=>/unknown acute oral toxicity/.test(n)));
});

t("unknown exactly 10 % keeps the uncorrected formula",()=>{
  const r=run([{name:"A",pct:20,acute:{oral:{ate:200},dermal:{notAcute:true}}},{name:"U",pct:10,acute:{dermal:{notAcute:true}}},filler(70)]);
  assert.ok(Math.abs(res(r,"acute-oral").ate-1000)<1e-6);
});

t("H-code category converts to Table 3.1.2 point estimate",()=>{
  const r=run([{name:"A",pct:50,hcodes:"H301",acute:{dermal:{notAcute:true}}},filler(50)]);
  const o=res(r,"acute-oral");assert.ok(Math.abs(o.ate-200)<1e-6);assert.equal(o.category,3);
  assert.equal(r.label.signalWord,"Danger");assert.deepEqual(r.label.pictograms,["GHS06"]);
});

t("Acute Tox. 5 gives H303, signal word Warning and no pictogram",()=>{
  const r=run([{name:"A",pct:100,hcodes:"H303",acute:{dermal:{notAcute:true}}}]);
  assert.equal(cat(r,"acute-oral"),5);assert.deepEqual(H(r),["H303"]);
  assert.equal(r.label.signalWord,"Warning");assert.deepEqual(r.label.pictograms,[]);
  assert.equal(r.label.signalWordPtBR,"Atenção");
});

t("ingredients below 1 % are not relevant for acute additivity",()=>{
  const r=run([{name:"A",pct:0.9,acute:{oral:{ate:1},dermal:{notAcute:true}}},filler(99.1)]);
  assert.equal(cat(r,"acute-oral"),null);
});

t("gas inhalation uses % v/v and never substitutes mass %",()=>{
  const ok=run([{name:"G",pct:10,acute:{oral:{notAcute:true},dermal:{notAcute:true},inhalation:{form:"gas",ate:200,volumePct:50}}},filler(90)]);
  const g=res(ok,"acute-gas");assert.ok(Math.abs(g.ate-400)<1e-6);assert.equal(g.category,2);
  const bad=run([{name:"G",pct:10,acute:{oral:{notAcute:true},dermal:{notAcute:true},inhalation:{form:"gas",ate:200}}},filler(90)]);
  assert.equal(cat(bad,"acute-gas"),null);assert.ok(bad.review.some(x=>/% v\/v/.test(x)));
});

t("inhalation data without a form is flagged and not used",()=>{
  const r=run([{name:"A",pct:50,hcodes:"H331",acute:{dermal:{notAcute:true},oral:{notAcute:true}}},filler(50)]);
  assert.equal(cat(r,"acute-vapour"),null);assert.ok(r.review.some(x=>/without gas\/vapour\/dust-mist form/.test(x)));
});

t("only the most severe inhalation statement is labelled",()=>{
  const r=run([{name:"V",pct:50,acute:{oral:{notAcute:true},dermal:{notAcute:true},inhalation:{form:"vapour",ate:0.4}}},
    {name:"D",pct:50,acute:{oral:{notAcute:true},dermal:{notAcute:true},inhalation:{form:"dustMist",ate:1.2}}}]);
  assert.equal(cat(r,"acute-vapour"),2);assert.equal(cat(r,"acute-dustMist"),4);
  assert.ok(H(r).includes("H330"));assert.ok(!H(r).includes("H332"));
});

t("skin additivity Table 3.2.3 boundaries including optional Category 3",()=>{
  const s=(f)=>cat(run([...f,filler(100-f.reduce((a,b)=>a+b.pct,0))]),"skin");
  assert.equal(s([{name:"c",pct:5,skin:"1"}]),"1");
  assert.equal(s([{name:"c",pct:4.9,skin:"1"}]),"2");
  assert.equal(s([{name:"c",pct:10,skin:"2"}]),"2");
  assert.equal(s([{name:"c",pct:9.9,skin:"2"}]),"3");
  assert.equal(s([{name:"c",pct:10,skin:"3"}]),"3");
  assert.equal(s([{name:"c",pct:9,skin:"3"}]),null);
  assert.equal(s([{name:"c",pct:0.5,skin:"1"}]),null);
  assert.equal(s([{name:"a",pct:0.6*0+1,skin:"2"},{name:"b",pct:9,skin:"3"}]),"3");
});

t("non-additive corrosive ≥1 % gives Skin 1 and Eye 1 (Tables 3.2.4/3.3.4)",()=>{
  const r=run([{name:"NaOH",pct:1,skin:"1B",nonAdditive:true},filler(99)]);
  assert.equal(cat(r,"skin"),"1");assert.equal(cat(r,"eye"),"1");
  assert.ok(H(r).includes("H314"));assert.ok(r.label.reviewNotes.some(n=>/H318/.test(n)));
});

t("eye additivity Table 3.3.3 and the 2B rule",()=>{
  const e=(f)=>cat(run([...f,filler(100-f.reduce((a,b)=>a+b.pct,0))]),"eye");
  assert.equal(e([{name:"a",pct:3,eye:"1"}]),"1");
  assert.equal(e([{name:"a",pct:2,eye:"1"}]),"2A");
  assert.equal(e([{name:"a",pct:10,eye:"2A"}]),"2A");
  assert.equal(e([{name:"a",pct:10,eye:"2B"}]),"2B");
  assert.equal(e([{name:"a",pct:5,eye:"2A"},{name:"b",pct:5,eye:"2B"}]),"2A");
  assert.equal(e([{name:"a",pct:9,eye:"2A"}]),null);
  const r=run([{name:"a",pct:10,hcodes:"H320"},filler(90)]);
  assert.deepEqual(H(r),["H320"]);assert.deepEqual(r.label.pictograms,[]);
});

t("extreme mixture pH is flagged for skin and eye",()=>{
  const r=run([filler(100)],{pH:1.5});
  assert.ok(res(r,"skin").notes.some(n=>/pH 1.5/.test(n)));
  assert.ok(res(r,"eye").notes.some(n=>/pH 1.5/.test(n)));
});

t("sensitisation cut-offs follow the selected GHS option",()=>{
  const ing=[{name:"S",pct:0.5,skinSens:"1"},filler(99.5)];
  assert.equal(cat(run(ing,{cutoffOption:"lower"}),"skinSens"),"1");
  const up=run(ing,{cutoffOption:"upper"});
  assert.equal(cat(up,"skinSens"),null);assert.ok(res(up,"skinSens").notes.some(n=>/FDS information/.test(n)));
  assert.equal(cat(run([{name:"S",pct:0.1,skinSens:"1A"},filler(99.9)],{cutoffOption:"upper"}),"skinSens"),"1");
  assert.equal(cat(run([{name:"S",pct:0.9,skinSens:"1B"},filler(99.1)]),"skinSens"),null);
  assert.equal(cat(run([{name:"R",pct:0.2,respSens:"1",state:"gas"},filler(99.8)],{cutoffOption:"upper"}),"respSens"),"1");
  assert.equal(cat(run([{name:"R",pct:0.2,respSens:"1",state:"liquid"},filler(99.8)],{cutoffOption:"upper"}),"respSens"),null);
});

t("CMR thresholds (Tables 3.5.1, 3.6.1, 3.7.1)",()=>{
  assert.equal(cat(run([{name:"C",pct:0.5,carcinogen:"2"},filler(99.5)]),"carcinogen"),"2");
  assert.equal(cat(run([{name:"C",pct:0.5,carcinogen:"2"},filler(99.5)],{cutoffOption:"upper"}),"carcinogen"),null);
  assert.equal(cat(run([{name:"R",pct:0.2,repro:"1B"},filler(99.8)],{cutoffOption:"upper"}),"repro"),null);
  assert.equal(cat(run([{name:"R",pct:0.3,repro:"1B"},filler(99.7)],{cutoffOption:"upper"}),"repro"),"1");
  assert.equal(cat(run([{name:"R",pct:2.9,repro:"2"},filler(97.1)],{cutoffOption:"upper"}),"repro"),null);
  const m=run([{name:"M",pct:0.1,mutagen:"1A"},filler(99.9)]);
  assert.equal(cat(m,"mutagen"),"1");assert.equal(res(m,"mutagen").subcategory,"1A");
  assert.equal(cat(run([{name:"M",pct:0.9,mutagen:"2"},filler(99.1)]),"mutagen"),null);
  const l=run([{name:"L",pct:0.1,hcodes:"H362"},filler(99.9)]);
  assert.equal(cat(l,"lactation"),"L");assert.deepEqual(H(l),["H362"]);assert.equal(l.label.signalWord,null);
});

t("STOT SE/RE cut-offs, including Cat 1 at 1–10 % → Cat 2 under the upper option",()=>{
  assert.equal(cat(run([{name:"S",pct:1,stotSE:"1"},filler(99)]),"stotSE"),"1");
  assert.equal(cat(run([{name:"S",pct:5,stotSE:"1"},filler(95)],{cutoffOption:"upper"}),"stotSE"),"2");
  const ten=run([{name:"S",pct:10,stotSE:"1"},filler(90)],{cutoffOption:"upper"});
  assert.equal(cat(ten,"stotSE"),"1");assert.ok(!res(ten,"stotSE").steps.some(s=>/between/.test(s)));
  assert.equal(cat(run([{name:"S",pct:1,stotRE:"2"},filler(99)]),"stotRE"),"2");
  assert.equal(cat(run([{name:"S",pct:0.9,stotRE:"1"},filler(99.1)]),"stotRE"),null);
});

t("STOT SE 3 uses the 20 % guidance value per effect",()=>{
  const r=run([{name:"a",pct:12,hcodes:"H335"},{name:"b",pct:10,stotSE3Resp:true},{name:"c",pct:15,hcodes:"H336"},filler(63)]);
  assert.equal(cat(r,"stotSE3Resp"),"3");assert.equal(cat(r,"stotSE3Narcotic"),null);
  assert.ok(H(r).includes("H335"));assert.ok(!H(r).includes("H336"));
});

t("aspiration Cat 1 (≤20.5 mm²/s) and Cat 2 (≤14 mm²/s)",()=>{
  assert.equal(cat(run([{name:"a",pct:10,aspiration:"1"},filler(90)],{viscosity40:20.5}),"aspiration"),"1");
  assert.equal(cat(run([{name:"a",pct:10,aspiration:"1"},filler(90)],{viscosity40:21}),"aspiration"),null);
  assert.equal(cat(run([{name:"a",pct:10,aspiration:"2"},filler(90)],{viscosity40:14}),"aspiration"),"2");
  assert.equal(cat(run([{name:"a",pct:10,aspiration:"2"},filler(90)],{viscosity40:14.1}),"aspiration"),null);
  const r=run([{name:"a",pct:10,hcodes:"H304"},filler(90)]);
  assert.equal(res(r,"aspiration").status,"incomplete");
});

t("aquatic acute summation with M-factors (Table 4.1.1)",()=>{
  const r=run([{name:"a",pct:2.5,aquaticAcute:"1",mAcute:10},filler(97.5)]);
  assert.equal(cat(r,"aquaticAcute"),"1");assert.ok(r.label.pictograms.includes("GHS09"));
  assert.equal(cat(run([{name:"a",pct:24.9,aquaticAcute:"2"},filler(75.1)]),"aquaticAcute"),"3");
  const a2=run([{name:"a",pct:25,hcodes:"H401"},filler(75)]);
  assert.equal(cat(a2,"aquaticAcute"),"2");assert.equal(a2.label.signalWord,null);assert.deepEqual(a2.label.pictograms,[]);
  const nm=run([{name:"a",pct:25,aquaticAcute:"1"},filler(75)]);
  assert.equal(cat(nm,"aquaticAcute"),"1");assert.ok(nm.review.some(x=>/without M-factor/.test(x)));
  const bad=run([{name:"a",pct:25,aquaticAcute:"1",mAcute:5},filler(75)]);
  assert.ok(bad.review.some(x=>/not a power of 10/.test(x)));
});

t("aquatic chronic summation (Table 4.1.2) including Chronic 4",()=>{
  assert.equal(cat(run([{name:"a",pct:0.3,aquaticChronic:"1",mChronic:1},{name:"b",pct:22,aquaticChronic:"2"},filler(77.7)]),"aquaticChronic"),"2");
  assert.equal(cat(run([{name:"a",pct:25,hcodes:"H412"},filler(75)]),"aquaticChronic"),"3");
  const c4=run([{name:"a",pct:25,hcodes:"H413"},filler(75)]);
  assert.equal(cat(c4,"aquaticChronic"),"4");assert.deepEqual(H(c4),["H413"]);
  const c2=run([{name:"a",pct:25,hcodes:"H411"},filler(75)]);
  assert.deepEqual(c2.label.pictograms,["GHS09"]);assert.equal(c2.label.signalWord,null);
  assert.equal(cat(run([{name:"a",pct:0.09,aquaticChronic:"1",mChronic:1000},filler(99.91)]),"aquaticChronic"),null);
});

t("ozone layer Category 1 at ≥0.1 %",()=>{
  const r=run([{name:"a",pct:0.1,hcodes:"H420"},filler(99.9)]);
  assert.equal(cat(r,"ozone"),"1");assert.deepEqual(r.label.pictograms,["GHS07"]);assert.deepEqual(H(r),["H420"]);
});

t("flammable liquid categories (Table 2.6.1)",()=>{
  const f=(fp,ibp,state)=>cat(run([filler(100)],{flashPoint:fp,ibp,state}),"flamLiq");
  assert.equal(f(20,35),"1");assert.equal(f(22.9,36),"2");assert.equal(f(23),"3");assert.equal(f(60),"3");
  assert.equal(f(60.5),"4");assert.equal(f(93),"4");assert.equal(f(94),null);
  assert.equal(res(run([filler(100)],{flashPoint:10}),"flamLiq").status,"incomplete");
  assert.equal(res(run([filler(100)],{flashPoint:10,ibp:30,state:"solid"}),"flamLiq").status,"not applicable");
  const r=run([filler(100)],{flashPoint:70});assert.deepEqual(H(r),["H227"]);assert.deepEqual(r.label.pictograms,[]);
});

t("pictogram precedence GHS 1.4.10.5.3.1(a): GHS06 removes GHS07",()=>{
  const r=run([{name:"T",pct:50,hcodes:"H301 H317",acute:{dermal:{notAcute:true}}},filler(50)]);
  assert.deepEqual(r.label.pictograms,["GHS06"]);
  assert.ok(r.label.pictogramDecisions.some(d=>!d.kept&&/\(a\)/.test(d.reason)));
});

t("pictogram precedence (b): GHS05 removes irritation GHS07 only",()=>{
  const irr=run([{name:"a",pct:10,skin:"2"},{name:"b",pct:3,eye:"1"},filler(87)]);
  assert.equal(cat(irr,"skin"),"2");assert.equal(cat(irr,"eye"),"1");
  assert.deepEqual(irr.label.pictograms,["GHS05"]);
  const sens=run([{name:"a",pct:5,skin:"1"},{name:"b",pct:1,skinSens:"1"},filler(94)]);
  assert.deepEqual(sens.label.pictograms,["GHS05","GHS07"]);
});

t("pictogram precedence (c): respiratory-sensitiser GHS08 removes skin-sensitiser GHS07",()=>{
  const r=run([{name:"a",pct:1,respSens:"1",skinSens:"1",state:"liquid"},filler(99)]);
  assert.deepEqual(r.label.pictograms,["GHS08"]);assert.equal(r.label.signalWord,"Danger");
  assert.equal(r.label.signalWordPtBR,"Perigo");
});

t("H-code parsing: ambiguity, physical codes, unknown codes and explicit override",()=>{
  const p=B.parseHCodes("H300, H314; H225 H999 H360Fd");
  assert.deepEqual(p.codes,["H300","H314","H225","H999","H360"]);
  assert.equal(p.ambiguous.length,3);assert.deepEqual(p.physical,["H225"]);assert.deepEqual(p.unknown,["H999"]);
  const r=run([{name:"a",pct:10,hcodes:"H315",skin:"3"},filler(90)]);
  assert.equal(cat(r,"skin"),"3");
  const two=B.parseHCodes("H302 H300");assert.equal(two.mapped["acute.oral"],1);
});

t("invalid concentrations block classification",()=>{
  const r=run([{name:"a",pct:60},{name:"b",pct:30}]);
  assert.equal(r.valid,false);assert.equal(r.results.length,0);assert.ok(r.issues.some(i=>/not 100/.test(i)));
  const e=B.classify({});assert.equal(e.valid,false);assert.ok(e.issues.includes("No ingredients provided."));
  assert.equal(run([{name:"a",pct:120}]).valid,false);
});

t("manual classifications reach the label with a review flag",()=>{
  const r=run([filler(100)],{},{manual:[{key:"skin",label:"Skin corrosion (test data)",category:"1B"}]});
  assert.ok(r.outcomes.some(o=>o.manual&&o.category==="1B"));
  assert.ok(H(r).includes("H314"));assert.ok(r.review.some(x=>/without validation/.test(x)));
});

t("output never claims to be final and lists unassessed scope",()=>{
  const r=run([filler(100)]);
  assert.equal(r.complete,false);assert.match(r.note,/not a final/);
  assert.ok(r.notAssessed.some(n=>/Physical hazards/.test(n)));
  assert.ok(r.notAssessed.some(n=>/Portuguese/.test(n)));
  assert.ok(r.review.some(x=>/Portuguese/.test(x)));
  assert.ok(r.label.hazardStatements.every(h=>h.ptBR===null));
});

t("every H-code the label can produce has reference text",()=>{
  const codes=new Set(Object.keys(B.HCODE_MAP));
  for(const r of Object.values(B.ROUTES))r.h.forEach(h=>codes.add(h));
  ["H224","H225","H226","H227"].forEach(h=>codes.add(h));
  for(const c of codes)assert.ok(B.H_TEXT[c],"missing text "+c);
});

console.log(passed+" passed, "+failed+" failed");
process.exit(failed?1:0);
