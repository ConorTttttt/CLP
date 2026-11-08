const assert = require("node:assert/strict");
const WHMIS = require("./whmis_engine.js");
const SURFACE = require("./whmis_skin_eye.js");
const refs = require("../data/canada/hpr_2022_rule_manifest.json");
let passes=0;
function test(title,fn){fn();passes++;console.log("PASS "+title)}
const i=(pct,x={})=>({name:x.name||"Ingredient",pct,acute:{oral:{notAcute:true},dermal:{notAcute:true}},...x});
const run=(items)=>WHMIS.classify({ingredients:items});
const has=(r,id,cat)=>r.outcomes.some(o=>o.id===id&&(cat===undefined||o.category===cat));
const skin=(items)=>SURFACE.calculate(items).calculations.find(x=>x.route==="skin");
const eye=(items)=>SURFACE.calculate(items).calculations.find(x=>x.route==="eye");
const water=p=>i(p,{name:"Water"});
test("source reference: HPR 8.2.11 and 8.3.11 recorded",()=>{
 assert.match(refs.skin.reference,/8\.2\.11/);assert.match(refs.eye.reference,/8\.3\.11/);
 assert.deepEqual(WHMIS.ROUTES.oral.limits,refs.acute.oral.limits);
 assert.deepEqual(WHMIS.ROUTES.oral.point,refs.acute.oral.categoryPoints);
 assert.deepEqual(WHMIS.ROUTES.dermal.point,refs.acute.dermal.categoryPoints);
});
test("6% only Skin Corr 1A permits 1A (8.2.11(2)(a.1))",()=>{
 assert.equal(has(run([i(6,{skin:"1A"}),water(94)]),"skin","1A"),true);
});
test("6% only Skin Corr 1B permits 1B (8.2.11(2)(a.2))",()=>{
 assert.equal(has(run([i(6,{skin:"1B"}),water(94)]),"skin","1B"),true);
});
test("6% only Skin Corr 1C permits 1C (8.2.11(2)(a.3))",()=>{
 assert.equal(has(run([i(6,{skin:"1C"}),water(94)]),"skin","1C"),true);
});
test("mixed 1A/1C at 3% each yields Skin Corr 1, not 1A/1C",()=>{
 const r=run([i(3,{skin:"1A"}),i(3,{skin:"1C"}),water(94)]);
 assert.equal(has(r,"skin","1"),true);assert.equal(has(r,"skin","1A"),false);
});
test("undifferentiated 1 6% returns Skin Corr 1",()=>{
 assert.equal(has(run([i(6,{skin:"1"}),water(94)]),"skin","1"),true);
});
test("3% corrosive contributes Skin Irrit 2 (8.2.11(2)(b))",()=>{
 assert.equal(has(run([i(3,{skin:"1B"}),water(97)]),"skin","2"),true);
});
test("10% irritant yields Skin Irrit 2",()=>{
 assert.equal(has(run([i(10,{skin:"2"}),water(90)]),"skin","2"),true);
});
test("corrosive 0.8% without supporting evidence is not included",()=>{
 assert.equal(skin([i(0.8,{skin:"1A"}),water(99.2)]).candidate,null);
});
test("below 1% counts only with specified supporting evidence",()=>{
 const x=[i(0.6,{skin:"1C",skinEvidenceBelow1:true}),i(0.6,{skin:"1C",skinEvidenceBelow1:true}),water(98.8)];
 assert.equal(skin(x).candidate,"2");
});
test("special non-additivity explicitly blocks finalization of additive skin candidate",()=>{
 const r=run([i(6,{skin:"1B",specialSkin:true}),water(94)]);
 assert.equal(has(r,"skin"),false);
 assert.equal(r.calculations.find(x=>x.route==="skin").candidate,"1B");
 assert.ok(r.review.some(x=>/8.2.11\(3\)/.test(x)));
});
test("3% Eye Dam 1 yields Eye Dam Category 1",()=>{
 assert.equal(has(run([i(3,{eye:"1"}),water(97)]),"eye","1"),true);
});
test("2% Eye Dam 1 yields Eye Irrit Category 2",()=>{
 assert.equal(has(run([i(2,{eye:"1"}),water(98)]),"eye","2"),true);
});
test("2% Skin Corr 1B contributes to Eye Irrit 2 once",()=>{
 const r=run([i(2,{skin:"1B",eye:"1"}),water(98)]);
 assert.equal(has(r,"eye","2"),true);
 assert.match(eye([i(2,{skin:"1B",eye:"1"}),water(98)]).steps[1],/2.0000%/);
});
test("only eye irritation 2A 12% permits subcategory 2A",()=>{
 assert.equal(has(run([i(12,{eye:"2A"}),water(88)]),"eye","2A"),true);
});
test("only eye irritation 2B 12% permits subcategory 2B",()=>{
 assert.equal(has(run([i(12,{eye:"2B"}),water(88)]),"eye","2B"),true);
});
test("mixed Eye Irrit 2A and 2B yields general Category 2",()=>{
 const r=run([i(6,{eye:"2A"}),i(6,{eye:"2B"}),water(88)]);
 assert.equal(has(r,"eye","2"),true);assert.equal(has(r,"eye","2A"),false);
});
test("Eye Irrit 2 at 10% gives Category 2",()=>{
 assert.equal(has(run([i(10,{eye:"2"}),water(90)]),"eye","2"),true);
});
test("special eye additive assessment blocked for expert review",()=>{
 const r=run([i(12,{eye:"2",specialEye:true}),water(88)]);
 assert.equal(has(r,"eye"),false);assert.ok(r.review.some(x=>/8.3.11\(3\)/.test(x)));
});
test("skin and eye statuses never misrepresent full hazard review",()=>{
 const r=run([water(100)]);
 assert.equal(r.complete,false);assert.ok(r.notAssessed.some(x=>/special-ingredient/i.test(x)));
});
console.log(passes+" WHMIS skin/eye assessment tests passed");
