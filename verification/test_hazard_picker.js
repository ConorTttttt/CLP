// node verification/test_hazard_picker.js
const fs=require("fs"),assert=require("assert").strict,C=require("./engine.js");
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
const begin=script.indexOf("const HAZARD_PHYSICAL="),end=script.indexOf("function renderIngs()",begin);
assert(begin>=0&&end>begin,"picker source block missing");
const s=script.slice(begin,end),dom={};
const $=id=>dom[id]||(dom[id]={innerHTML:""}),mix={ingredients:[]};
const esc=x=>String(x??"").replace(/[&<>"']/g,k=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[k]));
const hazardPanelsOpen=new Set();
const ui=new Function("CLP","esc","$","mix","hazardPanelsOpen",s+
 "\nreturn {HAZARD_CHOICES,HAZARD_GROUPS,searchHazards,hazardEditorHTML,hazardRowChipsHTML,hazardRowControlsHTML,ingredientHCodes,changeIngredientHazard,applyIngredientHazards,groupForCode,hazardChipLabel,hazardQueryCategory};")(C,esc,$,mix,hazardPanelsOpen);
const make=(codes="")=>{const i=C.blankIngredient();i._id=1;C.applyHCodes(i,codes);mix.ingredients=[i];return i};
let n=0;function test(name,fn){try{fn();n++}catch(e){throw Error(name+": "+e.message)}}
test("Search supports H314 skin corrosion subcategories",()=>{
 for(const cat of ["1A","1B","1C"]){
  const items=ui.searchHazards("all","h314 "+cat);
  assert.equal(items[0]?.code,"H314");
  assert.equal(items[0]?.category,cat);
  assert.equal(items[0]?.classification,"Skin Corr. "+cat);
 }
});
test("Refine already selected H314 by typing subcategory",()=>{
 const h=ui.searchHazards("all","H314 1C",["H314"]);
 assert.equal(h[0]?.category,"1C");
 assert.deepEqual(ui.searchHazards("all","H314",["H314"]),[]);
});
test("Category search validates supported code/category combinations",()=>{
 assert.equal(ui.searchHazards("all","H317 1A")[0]?.category,"1A");
 assert.equal(ui.searchHazards("all","H334 1B")[0]?.category,"1B");
 assert.equal(ui.searchHazards("all","H314 2").length,0);
 assert.equal(ui.hazardQueryCategory("H314 1D"),null);
});
test("Hazard chips show category refinements from Details",()=>{
 const i=make("H314 H317 H410 H400");
 i.skinCorr="1C";i.skinSens="1A";i.mChronic="10";i.mAcute="100";
 const result=ui.hazardRowChipsHTML(i);
 assert.match(result,/H314<\/strong><span>Skin Corr\. 1C<\/span>/);
 assert.match(result,/H317<\/strong><span>Skin Sens\. 1A<\/span>/);
 assert.match(result,/Aquatic Chronic 1 · M=10/);
 assert.match(result,/Aquatic Acute 1 · M=100/);
 i.skinCorr="1A";
 assert.match(ui.hazardRowChipsHTML(i),/Skin Corr\. 1A/);
});
test("Acute toxicity ATE appears on its corresponding chip",()=>{
 const i=make("H302");i.acute.oral.ate="450";
 assert.match(ui.hazardRowChipsHTML(i),/ATE 450/);
});
test("Three hazard groups still classify suggestions",()=>assert.deepEqual(ui.HAZARD_GROUPS.map(x=>x.id),["physical","health","environmental"]));
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
test("Unified search covers all three hazard groups",()=>{
 assert(ui.searchHazards("all","H225").some(x=>x.code==="H225"));
 assert(ui.searchHazards("all","severe skin burns").some(x=>x.code==="H314"));
 assert(ui.searchHazards("all","EUH441").some(x=>x.code==="EUH441"));
 assert(ui.searchHazards("all","a").length<=8);
});
test("Single unified hazard search inside collapsible editor",()=>{
 const h=ui.hazardEditorHTML(make("H225 H314 H410"));
 assert.equal((h.match(/class="hazard-picker"/g)||[]).length,1);
 assert.match(h,/data-hazard-picker data-group="all"/);
 assert.match(h,/<details class="hazard-editor" data-hazard-panel/);
 assert.equal((h.match(/data-remove-hazard=/g)||[]).length,0,
   "Chips must be in table cell rather than duplicated inside editor");
});
test("Removable selected chips appear in the ingredient row",()=>{
 const chips=ui.hazardRowControlsHTML(make("H225 H314 H410"));
 assert.equal((chips.match(/data-remove-hazard=/g)||[]).length,3);
 for(const code of ["H225","H314","H410"])
   assert(chips.includes('data-remove-hazard="'+code+'"'));
 assert(!chips.includes("Edit below"));
});
test("Accessible labels for search and removal",()=>{
 const i=make("H314"),row=ui.hazardRowControlsHTML(i),editor=ui.hazardEditorHTML(i);
 assert.match(row,/aria-label="Remove H314:/);
 assert.match(row,/aria-controls="hazard-editor-1"/);
 assert.match(editor,/role="combobox"/);
 assert.match(editor,/role="listbox"/);
 assert(!row.includes('class="chip on"'));
});
test("Hazards editor is collapsed by default, even with selected hazards",()=>{
 const item=make("H225 H314 H410");
 const html=ui.hazardEditorHTML(item);
 assert.match(html,/id="hazard-editor-1"/);
 assert(!html.includes('id="hazard-editor-1" open'));
 assert.match(html,/<summary class="hazard-editor-head">/);
 assert.match(html,/data-hazard-selected-count>3</);
});
test("Expanding one ingredient updates the disclosure and edit button",()=>{
 const item=make("H314");
 hazardPanelsOpen.add(item._id);
 const panel=ui.hazardEditorHTML(item),row=ui.hazardRowControlsHTML(item);
 assert.match(panel,/id="hazard-editor-1" open/);
 assert.match(row,/aria-expanded="true"/);
 assert.match(row,/Hide hazard search/);
 hazardPanelsOpen.delete(item._id);
 assert.match(ui.hazardRowControlsHTML(item),/aria-expanded="false"/);
});
test("Empty ingredient has add/edit control without a selection count placeholder",()=>{
 const row=ui.hazardRowControlsHTML(make());
 assert.match(row,/No hazards selected/);
 assert.match(row,/Add \/ edit hazards/);
});
test("Row chips remain visible when hazard editor is collapsed",()=>{
 const item=make("H225 H314");
 assert(!hazardPanelsOpen.has(item._id));
 assert(ui.hazardRowChipsHTML(item).includes('data-remove-hazard="H225"'));
 assert(ui.hazardRowChipsHTML(item).includes('data-remove-hazard="H314"'));
});
test("Hazard panel state survives full ingredient rerender",()=>{
 assert(script.includes("rememberHazardPanelStates();"));
 assert(script.includes('hazardPanelsOpen.add(id)'));
 assert(script.includes('hazardPanelsOpen.delete(id)'));
 assert(script.includes("data-hazard-panel"));
});
test("Adding or removing chips does not replace open search DOM",()=>{
 const start=script.indexOf("function refreshRow("),end=script.indexOf("function refreshSummaryOnly(",start);
 const block=script.slice(start,end);
 assert(!block.includes("s.innerHTML = hazardEditorHTML(i)"));
 assert(block.includes('chips.innerHTML=hazardRowChipsHTML(i)'));
 assert(block.includes('panel.querySelector("[data-hazard-selected-count]")'));
 assert(script.includes("closeHazardSuggestions(replacement)"));
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
test("Removing H315 retains manually refined H314 subcategory",()=>{
 const i=make("H314 H315");i.skinCorr="1B";ui.changeIngredientHazard(i,"H315",false);
 assert.equal(i.skinCorr,"1B");
});
test("Introducing H314 resets outdated Skin Irrit. 2 source classification",()=>{
 const i=make("H315");ui.changeIngredientHazard(i,"H314",true);
 assert.equal(i.skinCorr,"1");
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
 assert(ui.hazardRowControlsHTML(i).includes('data-remove-hazard="EUH071"'));
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
