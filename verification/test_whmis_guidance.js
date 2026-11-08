/* Health Canada, Guidance on WHMIS supplier requirements, updated 2026-03-31.
 * Verify HPR 2.5(1), 8.1.2(2), 8.1.5–8.1.7 and the supplemental
 * unknown acute toxicity percentage for HPR 3(1)(e)/Schedule 1 2(b).
 */
const assert=require("node:assert/strict");
const W=require("./whmis_engine.js");
let passed=0;
function test(label,fn){fn();passed++;console.log("PASS "+label)}
const ingredient=(name,pct,oral=null,dermal={notAcute:true})=>({name,pct,acute:{oral,dermal}});
const calc=(items,route="oral")=>W.classify({ingredients:items}).calculations.find(x=>x.route===route);
const routeOut=(r,route="oral")=>r.outcomes.find(x=>x.id==="acute-"+route);
test("Sub-1% oral ATE excluded normally under HPR 8.1.2(2)",()=>{
 const r=W.classify({ingredients:[ingredient("trace toxicant",0.5,{ate:0.1}),ingredient("base",99.5,{notAcute:true})]});
 assert.equal(calc([ingredient("trace toxicant",0.5,{ate:0.1}),ingredient("base",99.5,{notAcute:true})]).contributions.length,0);
 assert.equal(routeOut(r),undefined);
});
test("HPR 2.5(1) evidence includes sub-1% acute oral toxicant in ATE",()=>{
 const ingredients=[ingredient("potent",0.5,{ate:0.1,relevantBelow1:true}),ingredient("base",99.5,{notAcute:true})];
 const r=W.classify({ingredients}),c=calc(ingredients);
 assert.equal(c.ate,20);assert.equal(c.category,2);
 assert.equal(c.contributions[0].pct,0.5);
 assert.ok(r.review.some(x=>/below 1% included on recorded evidence/.test(x)));
});
test("Sub-1% relevance flag applies independently to dermal",()=>{
 const ingredients=[ingredient("dermal toxicant",0.4,{notAcute:true},{ate:0.4,relevantBelow1:true}),
    ingredient("other",99.6,{notAcute:true},{notAcute:true})];
 const c=calc(ingredients,"dermal");
 assert.equal(c.ate,100);assert.equal(c.category,2);
 assert.equal(calc(ingredients,"oral").contributions.length,0);
});
test("Relevant sub-1% unknown ATE is flagged, not treated as safe",()=>{
 const ingredients=[ingredient("unknown",0.5,{relevantBelow1:true}),
    ingredient("toxic",99.5,{ate:100})];
 const c=calc(ingredients);
 assert.equal(c.unknownPct,0.5);assert.equal(c.status,"provisional");
 assert.equal(c.missing[0].ingredient,"unknown");
});
test("Classified route with unknown 10% yields English supplemental disclosure prompt",()=>{
 const r=W.classify({ingredients:[ingredient("toxic",20,{ate:40}),
    ingredient("unknown",10,null),ingredient("inert",70,{notAcute:true})]});
 assert.equal(routeOut(r).category,3);
 assert.equal(r.supplementalStatements.length,1);
 assert.equal(r.supplementalStatements[0].unknownPct,10);
 assert.match(r.supplementalStatements[0].english,/10%.*unknown acute oral toxicity/);
 assert.match(r.supplementalStatements[0].status,/bilingual/);
});
test("Unknown >10% still adjusts ATE numerator and triggers disclosure",()=>{
 const ingredients=[ingredient("toxic",20,{ate:100}),
    ingredient("unknown",15,null),ingredient("inert",65,{notAcute:true})];
 const r=W.classify({ingredients}),c=calc(ingredients);
 assert.equal(c.numerator,85);assert.equal(c.ate,425);
 assert.equal(r.supplementalStatements[0].unknownPct,15);
});
test("No supplemental requirement when unknown relevant portion below 1%",()=>{
 const r=W.classify({ingredients:[ingredient("toxic",20,{ate:40}),
    ingredient("unknown",0.5,{relevantBelow1:true}),
    ingredient("inert",79.5,{notAcute:true})]});
 assert.equal(r.supplementalStatements.length,0);
 assert.equal(routeOut(r).category,3);
});
test("No supplemental label draft for unclassified acute endpoint",()=>{
 const r=W.classify({ingredients:[ingredient("unknown",15,null),
    ingredient("inert",85,{notAcute:true})]});
 assert.equal(routeOut(r),undefined);assert.equal(r.supplementalStatements.length,0);
});
test("Unknown percentage and drafts are route-specific",()=>{
 const r=W.classify({ingredients:[
  ingredient("both",40,{ate:200},{ate:200}),
  ingredient("oral unknown",20,null,{notAcute:true}),
  ingredient("dermal unknown",10,{notAcute:true},null),
  ingredient("inert",30,{notAcute:true},{notAcute:true})
 ]});
 const docs=r.supplementalStatements;
 assert.equal(docs.length,2);
 assert.equal(docs.find(x=>x.route==="oral").unknownPct,20);
 assert.equal(docs.find(x=>x.route==="dermal").unknownPct,10);
});
test("0% ingredient marked relevant does not affect ATE or create missing data",()=>{
 const r=W.classify({ingredients:[ingredient("zero",0,{relevantBelow1:true}),
   ingredient("inert",100,{notAcute:true})]});
 const c=r.calculations.find(x=>x.route==="oral");
 assert.equal(c.unknownPct,0);assert.equal(c.missing.length,0);
 assert.equal(c.status,"calculated");
});
test("No-acute evidence is not accidentally counted as relevant below 1%",()=>{
 const r=W.classify({ingredients:[ingredient("negative evidence",0.5,{notAcute:true,relevantBelow1:true}),
   ingredient("inert",99.5,{notAcute:true})]});
 assert.equal(r.review.some(x=>/below 1% included/.test(x)),false);
 assert.equal(r.calculations.find(x=>x.route==="oral").unknownPct,0);
});
console.log(passed+" Health Canada guidance regression checks passed");
