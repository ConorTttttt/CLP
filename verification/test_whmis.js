const assert=require("node:assert/strict");
const W=require("./whmis_engine.js");
const I=(name,pct,acute={},hhnoc=false)=>({name,pct,acute,hhnoc});
const C=(ingredients)=>W.classify({ingredients});
const result=(r,route)=>r.calculations.find(c=>c.route===route);
let n=0;function test(title,fn){fn();n++;console.log("PASS "+title)}
test("valid oral Category 4 at 100 mg/kg from 20% ATE20",()=>{
 const r=C([I("Toxic",20,{oral:20,dermal:{notAcute:true}}),I("Inert",80,{oral:{notAcute:true},dermal:{notAcute:true}})]);
 assert.equal(result(r,"oral").category,4);assert.equal(result(r,"oral").ate,100);
});
test("unknown >10% changes numerator",()=>{
 const r=C([I("Known",20,{oral:200,dermal:{notAcute:true}}),I("Unknown",20,{dermal:{notAcute:true}}),I("Other",60,{oral:{notAcute:true},dermal:{notAcute:true}})]);
 assert.equal(result(r,"oral").numerator,80);assert.equal(result(r,"oral").ate,800);assert.equal(result(r,"oral").status,"provisional");
});
test("unknown at exactly 10% uses 100",()=>{
 const r=C([I("Known",20,{oral:200,dermal:{notAcute:true}}),I("Unknown",10,{dermal:{notAcute:true}}),I("Other",70,{oral:{notAcute:true},dermal:{notAcute:true}})]);
 assert.equal(result(r,"oral").numerator,100);
});
test("category-only ATE conversion",()=>{
 const r=C([I("Toxic",100,{oral:{category:3},dermal:{notAcute:true}})]);
 assert.equal(result(r,"oral").ate,100);assert.match(result(r,"oral").steps[0],/100/);
});
test("dermal category boundaries",()=>{
 assert.equal(W.category(50,"dermal"),1);assert.equal(W.category(200,"dermal"),2);
 assert.equal(W.category(1000,"dermal"),3);assert.equal(W.category(2000,"dermal"),4);
 assert.equal(W.category(2000.01,"dermal"),null);
});
test("ingredients below 1% ignored",()=>{
 const r=C([I("Toxic",0.5,{oral:1}),I("Inert",99.5,{oral:{notAcute:true},dermal:{notAcute:true}})]);
 assert.equal(result(r,"oral").contributions.length,0);
});
test("HHNOC ≥1% triggers while below doesn't",()=>{
 assert.equal(C([I("A",1,{},true),I("B",99)]).outcomes.some(o=>o.id==="hhnoc"),true);
 assert.equal(C([I("A",0.9,{},true),I("B",99.1)]).outcomes.some(o=>o.id==="hhnoc"),false);
});
test("invalid totals block calculation",()=>{
 const r=C([I("A",50,{oral:100})]);
 assert.equal(r.valid,false);assert.equal(r.outcomes.length,0);
});
test("environmental result never reused from EU",()=>{
 const r=C([I("Aquatic EU CLP",100,{oral:{notAcute:true},dermal:{notAcute:true}})]);
 assert.equal(r.outcomes.some(o=>/aquatic/i.test(o.label)),false);
});
console.log(n+" WHMIS pilot tests passed");
