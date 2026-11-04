// Browser-local, no-database multiple formulation workspace regression tests.
const fs=require("fs"),assert=require("assert").strict;
const html=fs.readFileSync("clp_mixture_calculator.html","utf8");
const app=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
const a=app.indexOf("let workspaceTabs=[]"),b=app.indexOf("/* ---------- mixture fields ---------- */",a);
assert(a>=0&&b>a,"Workspace logic missing");
const section=app.slice(a,b);
const saved=new Map();
const storage={setItem(k,v){saved.set(k,v)},getItem(k){return saved.has(k)?saved.get(k):null}};
const escaping=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initial=()=>({name:"",ingredients:[],manual:[],state:"liquid"});
function makeRuntime(legacy=null,confirmValue=true){
 const els=new Map();
 const $=id=>{if(!els.has(id))els.set(id,{
   innerHTML:"",textContent:"",classList:{toggle(){}},
   events:{},addEventListener(k,fn){this.events[k]=fn},focus(){this.focused=true}
 });return els.get(id)};
 const initialMix=initial();
 const factory=new Function("$","localStorage","esc","loadSaved","confirm",
  "let mix="+JSON.stringify(initialMix)+";"+
  "function adopt(obj){mix=JSON.parse(JSON.stringify(obj));}"+
  "function renderAll(){saveWorkspaceState();renderWorkspaceTabs();}"+
  section+
  "\nreturn {initialiseWorkspaces,switchWorkspace,addWorkspace,closeWorkspace,saveWorkspaceState,renderWorkspaceTabs,"+
  "getMix:()=>mix,getTabs:()=>workspaceTabs,getActive:()=>activeWorkspaceId,selectors:()=>$('formulation-tab-list').innerHTML};");
 return factory($,storage,escaping,()=>legacy,()=>confirmValue);
}
let n=0;
function test(label,fn){try{fn();n++}catch(e){throw Error(label+": "+e.message)}}
test("Storage is local only and legacy mixture preserved",()=>{
 saved.clear();
 const a=makeRuntime({name:"Legacy Mix",state:"liquid",ingredients:[],manual:[]});
 a.initialiseWorkspaces();a.saveWorkspaceState();
 assert.equal(a.getMix().name,"Legacy Mix");
 const stored=JSON.parse(storage.getItem("clp_calc_workspaces_v1"));
 assert.equal(stored.tabs.length,1);assert.equal(stored.tabs[0].mixture.name,"Legacy Mix");
});
test("New classification has independent empty formulation and preserves prior tab",()=>{
 saved.clear();const a=makeRuntime();a.initialiseWorkspaces();
 const first=a.getActive();a.getMix().name="Mixture A";a.getMix().ingredients.push({name:"A",pct:"50"});
 a.addWorkspace(false);assert.notEqual(a.getActive(),first);
 assert.equal(a.getMix().ingredients.length,0);
 a.getMix().name="Mixture B";a.getMix().ingredients.push({name:"B",pct:"10"});
 a.switchWorkspace(first);assert.equal(a.getMix().name,"Mixture A");
 assert.equal(a.getMix().ingredients[0].name,"A");
 assert.equal(a.getTabs().length,2);
});
test("Duplicate is independent, not a shared reference",()=>{
 saved.clear();const a=makeRuntime();a.initialiseWorkspaces();
 const id=a.getActive();a.getMix().name="Original";a.getMix().ingredients.push({name:"Raw A",pct:"50"});
 a.addWorkspace(true);assert.equal(a.getMix().name,"Original (copy)");
 a.getMix().ingredients[0].pct="99";
 a.switchWorkspace(id);assert.equal(a.getMix().ingredients[0].pct,"50");
});
test("Reload from browser storage restores active tab and every mixture",()=>{
 saved.clear();const a=makeRuntime();a.initialiseWorkspaces();
 a.getMix().name="First";a.addWorkspace(false);a.getMix().name="Second";a.saveWorkspaceState();
 const b=makeRuntime();b.initialiseWorkspaces();
 assert.equal(b.getTabs().length,2);assert.equal(b.getMix().name,"Second");
 b.switchWorkspace(b.getTabs()[0].id);assert.equal(b.getMix().name,"First");
});
test("Closing inactive tab does not delete the active formulation",()=>{
 saved.clear();const a=makeRuntime();a.initialiseWorkspaces();
 const first=a.getActive();a.addWorkspace(false);a.getMix().name="Keep me";
 a.closeWorkspace(first);assert.equal(a.getTabs().length,1);
 assert.equal(a.getMix().name,"Keep me");
});
test("Closing active tab activates an existing tab",()=>{
 saved.clear();const a=makeRuntime();a.initialiseWorkspaces();
 a.getMix().name="First";a.addWorkspace(false);a.getMix().name="Second";
 a.closeWorkspace(a.getActive());assert.equal(a.getTabs().length,1);
 assert.equal(a.getMix().name,"First");
});
test("Closing last tab replaces it with a blank form, not zero tabs",()=>{
 saved.clear();const a=makeRuntime();a.initialiseWorkspaces();
 a.getMix().name="Close";a.closeWorkspace(a.getActive());
 assert.equal(a.getTabs().length,1);
 assert.equal(a.getMix().name,"");
});
test("Cancelled closure retains every tab",()=>{
 saved.clear();const a=makeRuntime(null,false);a.initialiseWorkspaces();
 a.addWorkspace(false);const count=a.getTabs().length;
 a.closeWorkspace(a.getActive());assert.equal(a.getTabs().length,count);
});
test("Malformed saved workspace falls back safely to legacy data",()=>{
 saved.clear();storage.setItem("clp_calc_workspaces_v1","{bad");
 const a=makeRuntime({name:"Old",ingredients:[],manual:[]});a.initialiseWorkspaces();
 assert.equal(a.getMix().name,"Old");assert.equal(a.getTabs().length,1);
});
test("Tab titles escape markup to avoid injected HTML",()=>{
 saved.clear();const a=makeRuntime();a.initialiseWorkspaces();
 a.getMix().name='<img src=x onerror="alert(1)">';
 a.renderWorkspaceTabs();assert(!a.selectors().includes("<img"));
 assert(a.selectors().includes("&lt;img"));
});
test("No server or network requests in the workspace implementation",()=>{
 assert(!/\bfetch\s*\(|XMLHttpRequest|indexedDB|WebSocket|sendBeacon/.test(section));
 assert.match(html,/Saved locally in this browser/);
});
console.log(n+" multi-workspace tab tests passed");