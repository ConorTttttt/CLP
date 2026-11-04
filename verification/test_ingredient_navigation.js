// Prototype UI structure and behaviour contract — Node.js, no browser required.
const fs=require("fs"),assert=require("assert").strict;
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const app=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
let n=0;function check(label,fn){try{fn();n++}catch(e){throw Error(label+": "+e.message)}}
check("JS application parses",()=>assert.doesNotThrow(()=>new Function(app)));
check("Compact ingredient rows and collapsed details",()=>{
 assert.match(app,/function renderIngs\(\)/);
 assert.match(app,/data-expanded=/);
 assert.match(app,/open\.has\(i\._id\)/);
 assert.match(app,/ingredientWorkspaceHTML\(i\)/);
});
check("Tab navigation has four categories",()=>{
 for(const name of ['Health','Environmental','Physical','SCLs & evidence'])assert(app.includes('label:"'+name+'"'),name);
 for(const id of ['health','environmental','physical','regulatory'])assert(html.includes('ix-editor[data-tab="'+id+'"]'),id);
});
check("Clicking hazard chip opens its context",()=>{
 assert.match(app,/data-edit-hazard=/);
 assert.match(app,/showIngredientEditor\(id,editChip\.dataset\.editHazard\)/);
 assert.match(app,/sectionForHazard\(code\)/);
});
check("Editing tab is not formulation data",()=>{
 assert.match(app,/const ingredientTabs = new Map\(\)/);
 assert.match(app,/ingredientTabs\.set\(id,tab\.dataset\.ingredientTab\)/);
 assert.match(app,/ingredientTabs\.clear\(\)/);
});
check("Original classification controls remain available",()=>{
 for(const key of ["acute","skin","cmr","stot","edHH","aquatic","newHazards","otherSCL","provenance"])
  assert(html.includes('data-detail-section="'+key+'"'),key);
});
check("Existing hazard picker retained",()=>{
 assert.match(app,/function hazardEditorHTML\(i\)/);
 assert.match(app,/function chooseIngredientHazard\(input,code,category/);
 assert.match(app,/function applyIngredientHazards\(ing,nextText\)/);
});
check("Live Section 3 indicators retained",()=>{
 assert.match(app,/data-ingredient-insight/);
 assert.match(app,/renderIngredientInsightMarkers\(last\)/);
 assert.match(html,/data-view="ingredientsInsight"/);
});
console.log(n+" compact ingredient UI checks passed");