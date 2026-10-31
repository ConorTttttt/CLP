// node verification/test_hazard_picker.js
const fs=require("fs"),assert=require("assert").strict,C=require("./engine.js");
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
const begin=script.indexOf("const HAZARD_PHYSICAL="),end=script.indexOf("function renderIngs()",begin);
assert(begin>=0&&end>begin,"picker source block missing");
const s=script.slice(begin,end),dom={};
const $=id=>dom[id]||(dom[id]={innerHTML:""}),mix={ingredients:[]};
const esc=x=>String(x??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
const ui=new Function("CLP","esc","$","mix",s+
 "\nreturn {HAZARD_CHOICES,HAZARD_GROUPS,searchHazards,hazardEditorHTML,ingredientHCodes,changeIngredientHazard,applyIngredientHazards,groupForCode};")(C,esc,$,mix);
const make=(codes="")=>{const i=C.blankIngredient();i._id=1;C.applyHCodes(i,codes);mix.ingredients=[i];return i};
let n=0;function test(name,fn){try{fn();n++}catch(e){throw Error(name+": "+e.message)}}
test("Three separate search groups",()=>assert.deepEqual(ui.HAZARD_GROUPS.map(x=>x.id),["physical","health","environmental"]));
test("Autocomplete by H phrase",()=>assert(ui.searchHazards("physical","highly flammable liquid").some(x=>x.code==="H225")));
test("Autocomplete by class",()=>assert(ui.searchHazards("health","Skin Corr. 1").some(x=>x.code==="H314")));
test("Autocomplete by health phrase",()=>assert(ui.searchHazards("health","severe skin burns").some(x=>x.code==="H314")));
test("Autocomplete by code case insensitive",()=>assert(ui.searchHazards("health","h350i").some(x=>x.code==="H350i")));
test("Differentiated reproductive phrases searchable",()=>assert(ui.searchHazards("health","may damage fertility").some(x=>x.code==="H360FD")));
test("Environmental new hazards searchable",()=>assert(ui.searchHazards("environmental","EUH440").some(x=>x.code==="EUH440")));
test("Physical hazard list includes non-engine H-code",()=>assert(ui.searchHazards("physical","pressurised container").some(x=>x.code==="H229")));
test("Search bounded to group and eight suggestions",()=>{
 assert(!ui.searchHazards("physical","skin").some(x=>x.code==="H315"));
 assert(ui.searchHazards("health","a").length<=8);
 assert.deepEqual(ui.searchHazards("health",""),[]);
});
test("Selected hazards excluded from suggestions",()=>assert(!ui.searchHazards("health","H314",["H314"]).some(x=>x.code==="H314")));
test("Chips from all groups have remove buttons",()=>{
 const h=ui.hazardEditorHTML(make("H225 H314 H410"));
 assert.equal((h.match(/class="hazard-picker"/g)||[]).length,3);
 assert.equal((h.match(/data-remove-hazard=/g)||[]).length,3);
 for(const code of ["H225","H314","H410"])assert(h.includes('data-remove-hazard="'+code+'"'));
});
test("Accessible labels for search and removal",()=>{
 const h=ui.hazardEditorHTML(make("H314"));
 assert.match(h,/aria-label="Remove H314:/);
 assert.match(h,/role="combobox"/);
 assert.match(h,/role="listbox"/);
 assert(!h.includes('class="chip on"'));
});
test("Add H-code sets source classification",()=>{
 const i=make("H314");ui.changeIngredientHazard(i,"H317",true);
 assert.deepEqual(ui.ingredientHCodes(i),["H314","H317"]);
 assert.equal(i.skinSens,"1");
});
test("Adding duplicate is idempotent",()=>{
 const i=make("H315");ui.changeIngredientHazard(i,"H315",true);
 assert.deepEqual(ui.ingredientHCodes(i),["H315"]);
});
test("Remove code clears corresponding hazard",()=>{
 const i=make("H315 H317 H410");ui.changeIngredientHazard(i,"H317",false);
 assert.equal(i.skinSens,"");assert.equal(i.skinCorr,"2");assert.equal(i.aquaChronic,"1");
});
test("Removing H314 clears corrosion not eye irritation",()=>{
 const i=make("H314 H319");ui.changeIngredientHazard(i,"H314",false);
 assert.equal(i.skinCorr,"");assert.equal(i.eye,"2");
});
test("Unrelated additions preserve manually refined skin category",()=>{
 const i=make("H314");i.skinCorr="1B";ui.changeIngredientHazard(i,"H410",true);
 assert.equal(i.skinCorr,"1B");assert.equal(i.aquaChronic,"1");
});
test("Unrelated removals preserve refined carcinogenicity",()=>{
 const i=make("H350 H410");i.carc="1A";ui.changeIngredientHazard(i,"H410",false);
 assert.equal(i.carc,"1A");
});
test("Changed source code resets affected field",()=>{
 const i=make("H314");i.skinCorr="1B";ui.changeIngredientHazard(i,"H314",false);
 assert.equal(i.skinCorr,"");
});
test("Differentiated H360 variants are not confused",()=>{
 const i=make("H360FD");ui.changeIngredientHazard(i,"H360Fd",true);
 assert.deepEqual(ui.ingredientHCodes(i),["H360FD","H360Fd"]);
 ui.changeIngredientHazard(i,"H360FD",false);
 assert.equal(i.reproFert,"1B");assert.equal(i.reproDev,"2");
});
test("Physical source hazard does not silently become mixture classification",()=>{
 const i=make("");ui.changeIngredientHazard(i,"H220",true);
 assert(ui.ingredientHCodes(i).includes("H220"));assert.equal(i.skinCorr,"");
 assert(html.includes("require independent assessment and a manual mixture classification"));
});
test("Adding hazard preserves SCL, M-factor and ATE inputs",()=>{
 const i=make("H314");i.scl.skinCorr="0.5";i.mAcute="10";i.acute.oral.ate="100";
 ui.changeIngredientHazard(i,"H410",true);
 assert.equal(i.scl.skinCorr,"0.5");assert.equal(i.mAcute,"10");assert.equal(i.acute.oral.ate,"100");
});
test("Unknown legacy EUH code retained when other code removed",()=>{
 const i=make("EUH071 H315");ui.changeIngredientHazard(i,"H315",false);
 assert(ui.ingredientHCodes(i).includes("EUH071"));
 assert(ui.hazardEditorHTML(i).includes('data-remove-hazard="EUH071"'));
});
test("Unrecognized free text is preserved on addition",()=>{
 const i=make("SupplierNote H315");ui.changeIngredientHazard(i,"H317",true);
 assert(i.hcodes.includes("SupplierNote"));
});
test("Advanced direct-code editor and keyboard navigation retained",()=>{
 assert(html.includes('data-p="hcodes"'));
 for(const key of ["ArrowDown","ArrowUp","Enter","Escape"])assert(html.includes('event.key==="'+key+'"'));
 assert(html.includes('data-hazard-option='));
});
test("Embedded engine stays synchronized",()=>{
 const a=html.indexOf("/* CLP mixture classification engine"),b=html.indexOf("\n</script>",a);
 assert.equal(html.slice(a,b).trimEnd(),fs.readFileSync("verification/engine.js","utf8").trimEnd());
});
console.log(n+" hazard picker checks passed");
