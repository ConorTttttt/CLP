// UI-only behaviour and structure regression checks. Run from repository root.
const fs=require("fs"), assert=require("assert").strict, CLP=require("./engine.js");
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
let passed=0;
function check(name,fn){try{fn();passed++}catch(e){throw Error(name+": "+e.message)}}
function section(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert(i>=0&&j>i,a);return source.slice(i,j)}
const esc=x=>String(x??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const makeEditor=()=>{
 const openState=new Map(),code=section("const SEL = ","\nfunction hazardChip(");
 return {openState,...new Function("esc","detailPanels","CLP",code+"\nreturn {detailHTML};")(esc,openState,CLP)};
};
function ing(id,override={}){
 const base=CLP.blankIngredient(),x={...base,...override,_id:id};
 x.scl={...base.scl,...(override.scl||{})};
 x.acute={...base.acute,...(override.acute||{})};
 return x;
}
function makeResults(){
 const els={},store=new Map(),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const $=k=>els[k]||(els[k]={innerHTML:"",textContent:"",hidden:false,events:{},addEventListener(type,fn){this.events[type]=fn}});
 const document={querySelectorAll(){return [...$("res").innerHTML.matchAll(/data-view="([^"]+)"/g)].map(x=>({dataset:{view:x[1]},hidden:false}))}};
 const code=section("const VIEWER_STORE = ","\nlet mix =")+section("/* ---------- results ---------- */","let tm = null;");
 const api=new Function("$","document","localStorage","esc","CLP",code+"\nreturn {renderResult,setViewerPreferences};")($,document,localStorage,esc,CLP);
 return {api,$};
}
const fixture={warnings:["Unverified M-factor"],incomplete:["Aquatic hazard incomplete"],nodata:[],sds:[],outcomes:[],hazards:[],notes:[],
 label:{signal:"",pictograms:[],hazardStatements:[],euhStatements:[],supplemental:[],precautionaryStatements:[],
 pictogramDecisions:[],omittedPictograms:[],pictogramReview:[],pictogramExplanations:[],omitOptionalPictograms:false,
 decisions:[],review:[],omitOptional:true,
 article28:{selected:[],candidates:[],requiredObligations:[],review:[{severity:"blocker",code:"audience",reason:"Supply audience unknown"}],
 warnings:[],uncovered:[],scope:"Partial",limit:6}}};
check("Navigation anchors",()=>{
 assert.match(html,/class="workspace-nav noprint"/);
 for(const id of ["mixture-card","ingredients-card","p28settings","results"]){
  assert(html.includes('href="#'+id+'"')&&html.includes('id="'+id+'"'));
 }
});
check("Persistent regulatory disclaimer",()=>{
 assert.match(html,/Decision-support only — not a final classification or label/);
 assert.match(html,/Read calculation scope and regulatory limitations/);
});
check("Mobile ingredient overflow region",()=>{
 assert.match(html,/class="ingredient-scroll" role="region" tabindex="0"/);
 assert.match(html,/\.ingredient-scroll table\{[^}]*min-width:670px/);
});
check("Optional labelling context and manual entries",()=>{
 assert.match(html,/<details class="card disclosure-card" id="p28settings">/);
 assert.match(html,/<details class="card disclosure-card" id="manualsettings">/);
});
check("Hazard detail groups organised by physical / health / environmental",()=>{
 const h=makeEditor().detailHTML(ing(1)),groups=[...h.matchAll(/data-detail-section="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(groups,["acute","skin","cmr","stot","edHH","aquatic","newHazards","otherSCL","provenance"]);
 const cats=[...h.matchAll(/data-detail-category="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(cats,["physical","health","environmental","shared"]);
 assert(!h.includes("<fieldset>"));
});
check("New ingredient shows compact empty hazard detail",()=>{
 const h=makeEditor().detailHTML(ing(2));
 assert(!/data-detail-section="[^"]+" open/.test(h));
});
check("Skin/SCL values expand relevant details",()=>{
 const h=makeEditor().detailHTML(ing(3,{skinCorr:"1B",scl:{skinCorr:0.5}}));
 assert.match(h,/data-detail-section="skin" open/);
 assert.doesNotMatch(h,/data-detail-section="aquatic" open/);
 assert.match(h,/data-p="scl.skinCorr"/);
});
check("ATE route and unknown controls survive",()=>{
 const h=makeEditor().detailHTML(ing(4,{acute:{oral:{cat:"3",ate:150,unknown:true}}}));
 assert.match(h,/data-detail-section="acute" open/);
 assert.match(h,/data-p="acute.oral.unknown"/);
 assert.match(h,/data-p="acute.oral.ate"/);
});
check("Aquatic M and provenance inputs survive",()=>{
 const h=makeEditor().detailHTML(ing(5,{aquaChronic:"1",mChronic:100,valueSource:"SDS v4"}));
 assert.match(h,/data-detail-section="aquatic" open/);
 assert.match(h,/data-detail-section="provenance" open/);
 assert.match(h,/data-p="mChronic"/);
 assert.match(h,/data-p="valueSource"/);
});
check("Expanded state survives detail re-renders",()=>{
 const e=makeEditor();e.openState.set(6,new Set(["cmr","otherSCL"]));
 const h=e.detailHTML(ing(6));
 assert.match(h,/data-detail-section="cmr" open/);
 assert.match(h,/data-detail-section="otherSCL" open/);
 assert.doesNotMatch(h,/data-detail-section="skin" open/);
});
check("Expand/collapse buttons and persistence",()=>{
 const h=makeEditor().detailHTML(ing(7));
 assert.match(h,/data-detail-action="expand"/);
 assert.match(h,/data-detail-action="collapse"/);
 assert.match(source,/addEventListener\("toggle",\(event\)=>/);
 assert.match(source,/detailPanels\.get\(id\)/);
});
check("SCL zero and escaped provenance remain visible",()=>{
 const h=makeEditor().detailHTML(ing(8,{scl:{eyeIrrit:"0"},valueSource:"SDS & Co."}));
 assert.match(h,/value="0"/);
 assert.match(h,/SDS &amp; Co\./);
});
check("Result overview counts never claim regulatory approval",()=>{
 const r=makeResults();r.api.renderResult(fixture);
 const s=r.$("result-overview").innerHTML;
 assert.match(s,/>0<\/strong><span>Classifications found/);
 assert.match(s,/>1<\/strong><span>Input warnings/);
 assert.match(s,/>2<\/strong><span>Unresolved checks/);
 assert.match(html,/Live preview &middot; not final approval/);
});
check("Critical input warnings visible despite hidden panels",()=>{
 const r=makeResults();r.api.renderResult(fixture);
 r.api.setViewerPreferences({classification:false,label:false,article26:false,article27:false,article28:false,sds:false,calculation:false,notes:false});
 assert.match(r.$("res").innerHTML,/Unverified M-factor/);
 assert.match(r.$("res").innerHTML,/Aquatic hazard incomplete/);
});
check("Narrow screens collapse grid spans",()=>{
 assert.match(html,/\.g3>\[style\*="grid-column:span"\]/);
 assert.match(html,/grid-column:1\/-1!important/);
});
check("Manual input controls have accessible names",()=>{
 for(const key of ["label","h","signal","picto"])
  assert(html.includes('data-m="'+key+'" aria-label='),key);
});
check("Banded STOT Category 2 SCL inputs available",()=>{
 const h=makeEditor().detailHTML(ing(9,{stotRE:"1",scl:{stotRE:"20",stotRE2:"5"}}));
 assert.match(h,/data-p="scl.stotSE2"/);
 assert.match(h,/data-p="scl.stotRE2"/);
 assert.match(h,/data-detail-section="otherSCL" open/);
});
check("Solid physical state selectable",()=>assert.match(html,/<option value="solid">Solid<\/option>/));
check("Embedded engine is unchanged",()=>{
 const i=html.indexOf("/* CLP mixture classification engine"),j=html.indexOf("\n</script>",i);
 assert.equal(html.slice(i,j).trimEnd(),fs.readFileSync("verification/engine.js","utf8").trimEnd());
});
console.log(passed+" UI cleanup checks passed");
