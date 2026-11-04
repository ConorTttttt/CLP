// Calculation breakdown presentation checks: engine classifications remain untouched.
const fs=require("fs"),assert=require("assert").strict,CLP=require("./engine.js");
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const app=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
const start=app.indexOf("function calcRole(h, line)"),end=app.indexOf("\n\n/* Transparent screening for REACH Annex II",start);
assert(start>=0&&end>start,"Calculation renderer missing");
const code=app.slice(start,end),esc=x=>String(x??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const ui=new Function("esc","CLP",code+"\nreturn {calcRole,calcRouteSummary,calcRouteGroups,calcExplanationHTML};")(esc,CLP);
let count=0;function test(label,fn){try{fn();count++}catch(e){throw Error(label+": "+e.message)}}
function ing(name,pct,code){const i=CLP.blankIngredient();i.name=name;i.pct=String(pct);CLP.applyHCodes(i,code);return i;}
const mixture={state:"liquid",ingredients:[ing("A",5,"H301 H311 H332"),ing("B",1,"H302")]};
const r=CLP.classify(mixture),acute=r.hazards.find(h=>h.id==="acute");
test("Acute engine calculation unchanged and shows oral Cat. 4",()=>{
 assert(acute.outcomes.some(o=>o.label.includes("Acute Tox. 4")));
});
test("Acute routes grouped separately",()=>{
 const groups=ui.calcRouteGroups(acute);
 assert.deepEqual(groups.map(x=>x.name),["Oral","Dermal","Inhalation · vapour"]);
 assert(groups.every(x=>x.math.length===1&&x.ingredients.length===1));
});
test("Each acute route has own status",()=>{
 const out=ui.calcExplanationHTML(acute);
 assert.match(out,/data-state="classified"/);
 assert.match(out,/data-state="not"/);
 assert.match(out,/Ingredient terms and route evidence/);
 assert.match(out,/ATEmix =/);
});
test("Calculation output remains escaped",()=>{
 const sample={id:"test",name:"<script>alert(1)</script>",status:"classified",outcomes:[],steps:["Σ <img src=x onerror=alert(1)>"],notes:["<script>"]};
 const out=ui.calcExplanationHTML(sample);
 assert(!out.includes("<script>"));assert(!out.includes("<img"));
 assert.match(out,/&lt;script&gt;/);
});
test("Classified hazard expanded initially and raw trail retained",()=>{
 const out=ui.calcExplanationHTML(acute);
 assert.match(out,/data-calc-id="acute" open/);
 assert.match(out,/Original calculation trail and regulatory reference/);
 assert.match(out,/calc-result-caption/);
});
test("Result-first summaries use actual engine outcomes",()=>{
 const out=ui.calcExplanationHTML(acute);
 assert.match(out,/Acute Tox. 4/);
 assert.match(out,/H302/);
});
test("Review notes displayed clearly",()=>{
 const out=ui.calcExplanationHTML({...acute,notes:["Review source ATE"],status:"incomplete"});
 assert.match(out,/Review notes and limitations \(1\)/);
 assert.match(out,/Review source ATE/);
 assert.match(out,/calc-review" open/);
});
test("Not-classified hazards remain collapsible",()=>{
 const skin=r.hazards.find(h=>h.id==="skin");
 const out=ui.calcExplanationHTML(skin);
 if(skin.status==="not")assert(!/data-calc-id="skin" open/.test(out));
 assert.match(out,/Original calculation trail and regulatory reference/);
});
test("No extra classified outcomes invented for blank hazard",()=>{
 const out=ui.calcExplanationHTML({id:"other",name:"Other",status:"not",outcomes:[],steps:[],notes:[],ref:"Annex I"});
 assert.match(out,/Not classified/);
 assert.doesNotMatch(out,/Mixture classification/);
});
console.log(count+" classification breakdown UI tests passed");