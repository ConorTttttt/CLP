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
check("Hazard codes map to correct contextual tab and section",()=>{
 const a=app.indexOf('const ING_TABS=['),b=app.indexOf('function renderIngs()',a);
 assert(a>=0&&b>a);
 const picker=app.slice(a,b);
 const api=new Function('groupForCode',picker+
  '\nreturn {tabForHazard,sectionForHazard};')(code=>
   /^H2/.test(code)?'physical':/^H4|^EUH4/.test(code)?'environmental':'health');
 assert.equal(api.tabForHazard('H314'),'health');
 assert.equal(api.sectionForHazard('H314'),'skin');
 assert.equal(api.sectionForHazard('H317'),'cmr');
 assert.equal(api.sectionForHazard('H302'),'acute');
 assert.equal(api.tabForHazard('H410'),'environmental');
 assert.equal(api.sectionForHazard('H410'),'aquatic');
 assert.equal(api.tabForHazard('H225'),'physical');
 assert.equal(api.sectionForHazard('H225'),'');
});
check("Always-visible hazard search is beneath ingredient name",()=>{
 const start=app.indexOf("function renderIngs(){"),end=app.indexOf("function refreshRow(id)",start);
 const renderer=app.slice(start,end);
 assert.match(renderer,/class="ingredient-name"/);
 assert.match(renderer,/ingredientQuickSearchHTML\(i\)/);
 assert(renderer.indexOf("ingredient-name")<renderer.indexOf("ingredientQuickSearchHTML(i)"));
 assert.match(app,/function ingredientQuickSearchHTML\(i\)/);
 assert.match(app,/quick-hazard-options-/);
 assert.match(app,/data-hazard-query data-group="all"/);
});
check("Expanded editor does not duplicate the quick search",()=>{
 const start=app.indexOf("function ingredientWorkspaceHTML(i)"),end=app.indexOf("function showIngredientEditor(",start);
 const workspace=app.slice(start,end);
 assert(!workspace.includes('hazardEditorHTML(i)'));
 assert.match(workspace,/Advanced: paste or edit H\/EUH codes/);
 assert.match(workspace,/ingredientTabs\.get/);
});
check("Hazard selection retains the row search and keyboard focus",()=>{
 const start=app.indexOf("function chooseIngredientHazard(input,code"),end=app.indexOf("function rememberHazardPanelStates",start);
 const choice=app.slice(start,end);
 assert.match(choice,/tr\[data-id=/);
 assert.match(choice,/replacement\.value=""/);
 assert.match(choice,/replacement\.focus\(\)/);
 assert(!choice.includes('tr[data-detrow='));
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