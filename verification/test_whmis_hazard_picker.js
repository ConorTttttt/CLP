/* CLP-style Canadian WHMIS raw-material hazard selection tests.
 * The picker captures ingredient classifications only; it must never
 * silently generate finished-mixture physical/environmental classifications.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const P=require("./whmis_hazard_picker.js");
const ui=fs.readFileSync(path.join(__dirname,"../canada_whmis_calculator.html"),"utf8");
let count=0;
function t(label,fn){fn();count++;console.log("PASS "+label)}
const q=(query,group)=>P.search(query,group).map(x=>x);
const pick=(state,code,category,group="health")=>{
 const item=P.CHOICES.find(x=>x.code===code&&x.category===category&&x.group===group);
 assert.ok(item,code+" / "+category);
 return P.apply(state,item.id);
};
t("Canadian picker choices have distinct IDs and no environmental WHMIS group",()=>{
 assert.equal(new Set(P.CHOICES.map(x=>x.id)).size,P.CHOICES.length);
 assert.ok(P.CHOICES.every(x=>["health","physical"].includes(x.group)));
 assert.ok(P.groups.every(x=>x.id!=="environmental"));
});
t("H314 is represented by separately selectable Skin Corr. 1, 1A, 1B and 1C",()=>{
 assert.deepEqual(q("H314").map(x=>x.category).sort(),["1","1A","1B","1C"]);
});
t("H314 1B query resolves ONLY Skin Corr. 1B, not generic category 1",()=>{
 const result=q("H314 1B");
 assert.equal(result.length,1);assert.equal(result[0].category,"1B");
});
t("H300 maps separately to oral acute Categories 1 and 2",()=>{
 assert.deepEqual(q("H300").map(x=>x.category).sort(),["1","2"]);
});
t("H310 and H330 each map separately to Categories 1 and 2",()=>{
 assert.deepEqual(q("H310").map(x=>x.category).sort(),["1","2"]);
 assert.deepEqual(q("H330").map(x=>x.category).sort(),["1","2"]);
});
t("H317 and H334 represent 1/1A/1B, selectable individually",()=>{
 for(const code of ["H317","H334"])assert.deepEqual(q(code).map(x=>x.category).sort(),["1","1A","1B"]);
});
t("Eye 2B uses H320 separately from eye 2/2A using H319",()=>{
 assert.deepEqual(q("H319").map(x=>x.category).sort(),["2","2A"]);
 assert.deepEqual(q("H320").map(x=>x.category),["2B"]);
});
t("STOT SE Category 3 preserves the respiratory vs narcotic effect choice",()=>{
 assert.equal(q("H335").length,1);assert.equal(q("H336").length,1);
 assert.equal(q("H335")[0].field,"hStot3Resp");
 assert.equal(q("H336")[0].field,"hStot3Narcotic");
});
t("CMR search by category or text finds available classifications",()=>{
 assert.ok(q("Carc.").some(x=>x.code==="H350"&&x.category==="1A"));
 assert.ok(q("genetic defects").some(x=>x.code==="H340"));
 assert.ok(q("lactation").some(x=>x.code==="H362"));
});
t("Search does not treat partial H-code prefix as an exact different code",()=>{
 assert.ok(q("H350").every(x=>x.code==="H350"));
 assert.ok(q("H350 1A").every(x=>x.category==="1A"));
});
t("Search filters the physical vs health classifications",()=>{
 assert.ok(q("flammable","physical").length>0);
 assert.equal(q("H350","physical").length,0);
 assert.equal(q("H225","health").length,0);
 assert.equal(q("H225","physical").length,1);
});
t("Environmental H-codes and EU-specific CLP classes are never selectable as WHMIS classes",()=>{
 for(const s of ["H400","H410","H420","EUH380","EUH430","EUH450","Aquatic Acute","PBT","ozone"])
  assert.equal(q(s).length,0,"unexpected CA hazard option: "+s);
});
t("Applying a classification writes the existing WHMIS engine input field",()=>{
 const after=pick({fields:{},manualPhysical:[]},"H314","1B");
 assert.equal(after.fields.skin,"1B");
 assert.deepEqual(after.manualPhysical,[]);
});
t("Changing category replaces previous selected category without duplicate chips",()=>{
 let s=pick({fields:{},manualPhysical:[]},"H314","1B");
 s=pick(s,"H314","1A");
 const selected=P.selected(s.fields,s.manualPhysical).filter(x=>x.family==="Skin Corr.");
 assert.equal(selected.length,1);assert.equal(selected[0].category,"1A");
});
t("Removing a chip clears only its matching category, leaving unrelated classifications",()=>{
 let s=pick({fields:{oralATE:"23"},manualPhysical:[]},"H314","1A");
 s=pick(s,"H317","1B");
 const id=P.search("H314 1A")[0].id;
 s=P.remove(s,id);
 assert.equal(s.fields.skin,"");
 assert.equal(s.fields.hSkinSens,"1B");
 assert.equal(s.fields.oralATE,"23");
});
t("Removing stale chip does not clear a newly changed category",()=>{
 let s=pick({fields:{},manualPhysical:[]},"H314","1A");
 const old=P.search("H314 1A")[0].id;
 s=pick(s,"H314","1B");
 s=P.remove(s,old);
 assert.equal(s.fields.skin,"1B");
});
t("Acute category picker leaves measured ATE unchanged as higher-priority evidence",()=>{
 let s=pick({fields:{oralATE:"175",oralSafe:false},manualPhysical:[]},"H301","3");
 assert.equal(s.fields.oralCat,"3");
 assert.equal(s.fields.oralATE,"175");
});
t("H335 and H336 can be selected concurrently and removed independently",()=>{
 let s=pick({fields:{},manualPhysical:[]},"H335","3 (respiratory)");
 s=pick(s,"H336","3 (narcotic)");
 assert.equal(s.fields.hStot3Resp,true);assert.equal(s.fields.hStot3Narcotic,true);
 s=P.remove(s,q("H335")[0].id);
 assert.equal(s.fields.hStot3Resp,false);
 assert.equal(s.fields.hStot3Narcotic,true);
});
t("Respiratory sensitizer categories remain distinct and use the existing hRespSens field",()=>{
 const x=pick({fields:{},manualPhysical:[]},"H334","1A");
 assert.equal(x.fields.hRespSens,"1A");
 assert.equal(P.selected(x.fields).find(y=>y.code==="H334").category,"1A");
});
t("H362 lactation and HHNOC checkbox states are individually reversible",()=>{
 let s=pick({fields:{},manualPhysical:[]},"H362","");
 assert.equal(s.fields.hLactation,true);
 const h=P.CHOICES.find(x=>x.family==="HHNOC");
 s=P.apply(s,h.id);assert.equal(s.fields.hhnoc,true);
 s=P.remove(s,h.id);assert.equal(s.fields.hhnoc,false);
 assert.equal(s.fields.hLactation,true);
});
t("Physical hazard selection is a recorded raw-material declaration, not a health engine field",()=>{
 let s=P.apply({fields:{skin:"2"},manualPhysical:[]},q("H225","physical")[0].id);
 assert.equal(s.fields.skin,"2");
 assert.equal(s.manualPhysical.length,1);
 assert.ok(P.selected(s.fields,s.manualPhysical).some(x=>x.code==="H225"));
 s=P.remove(s,q("H225","physical")[0].id);
 assert.deepEqual(s.manualPhysical,[]);
 assert.equal(s.fields.skin,"2");
});
t("Chemicals under pressure physical ingredient declaration never sets finished-mixture product inputs",()=>{
 const p=q("H282","physical")[0],s=P.apply({fields:{},manualPhysical:[]},p.id);
 assert.equal(p.group,"physical");assert.equal(p.manual,true);
 assert.equal(s.fields.pressureKPa,undefined);
});
t("Unknown code cannot be accepted or implicitly mapped to a Canadian hazard",()=>{
 assert.equal(P.byId("H400"),null);
 assert.throws(()=>P.apply({fields:{}},"H400"),/Unknown or unadopted/);
});
t("Picker excludes already selected exact classification from suggestions",()=>{
 const p=q("H314 1B")[0];
 assert.equal(P.search("H314 1B","all",[p.id]).length,0);
});
t("UI loads Canadian picker before core engine and preserves existing detail inputs",()=>{
 const p=ui.indexOf('verification/whmis_hazard_picker.js');
 const core=ui.indexOf('verification/whmis_engine.js');
 assert.ok(p>=0&&p<core);
 for(const id of ["hRespSens","hCarcinogen","hStot3Resp","oralCat","skin","eye"])
  assert.ok(ui.includes(id),id);
});
t("UI provides CLP-style search + grouped filters + removable chips and keyboard selection",()=>{
 for(const key of ['role="combobox"','role="listbox"','data-ca-group="health"','data-ca-group="physical"',
   "function renderSuggestions()","function chooseClassification(id)","PICKER.apply(","PICKER.remove(","ca-hazard-chip",
   'event.key==="ArrowDown"','event.key==="Enter"','event.key==="Escape"']){
  assert.ok(ui.includes(key),key);
 }
});
t("UI makes the physical-source declaration boundary explicit",()=>{
 assert.ok(ui.includes("Raw-material physical classifications recorded"));
 assert.ok(ui.includes("do not classify the finished mixture"));
 assert.ok(ui.includes("Environmental GHS classes are not WHMIS hazard classes"));
});
t("Inline browser JavaScript remains parseable",()=>{
 const match=ui.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(match);assert.doesNotThrow(()=>new Function(match[1]));
});
console.log(count+" Canadian WHMIS hazard-picker verification checks passed");
