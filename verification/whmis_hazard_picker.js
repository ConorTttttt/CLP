/* Canadian WHMIS raw-material hazard picker.
 * Presentation/data entry only: individual classifications are NOT a finished-
 * mixture WHMIS classification. HPA Schedule 2 controls adopted hazard classes.
 * This is intentionally separate from EU CLP hazard mappings. Canada has no
 * adopted environmental WHMIS hazard class; no environmental choices are added.
 */
(function(root,factory){
 if(typeof module==="object"&&module.exports)module.exports=factory();
 else root.WHMIS_HAZARD_PICKER=factory();
})(typeof self!=="undefined"?self:this,function(){
"use strict";
const CHOICES=[];
function choose(group,family,category,code,phrase,field,value,manual=false){
 const label=family+(category?" "+category:"");
 const id=(group==="physical"?"P:":"H:")+family.replace(/[^A-Za-z0-9]+/g,"-")+":"+(category||"general")+(code?":"+code:"");
 CHOICES.push(Object.freeze({id,group,family,category:category||"",code:code||"",phrase:phrase||"",
   label,field:field||null,value:value===undefined?null:value,manual:!!manual}));
}
// The categories, not merely their H codes, determine mixture input state.
// H300/H310/H330 each represent both Category 1 and Category 2.
for(const [route,family,codes] of [
 ["oral","Acute Tox. Oral",["H300","H300","H301","H302"]],
 ["dermal","Acute Tox. Dermal",["H310","H310","H311","H312"]],
 ["inh","Acute Tox. Inhalation",["H330","H330","H331","H332"]]
]){
 const field=route==="inh"?"inhCat":route+"Cat";
 const phr=route==="oral"?["Fatal if swallowed","Fatal if swallowed","Toxic if swallowed","Harmful if swallowed"]:
  route==="dermal"?["Fatal in contact with skin","Fatal in contact with skin","Toxic in contact with skin","Harmful in contact with skin"]:
  ["Fatal if inhaled","Fatal if inhaled","Toxic if inhaled","Harmful if inhaled"];
 for(let i=0;i<4;i++)choose("health",family,String(i+1),codes[i],phr[i],field,String(i+1));
}
for(const cat of ["1","1A","1B","1C"])
 choose("health","Skin Corr.",cat,"H314","Causes severe skin burns and eye damage","skin",cat);
choose("health","Skin Irrit.","2","H315","Causes skin irritation","skin","2");
choose("health","Eye Dam.","1","H318","Causes serious eye damage","eye","1");
for(const cat of ["2","2A"])choose("health","Eye Irrit.",cat,"H319","Causes serious eye irritation","eye",cat);
choose("health","Eye Irrit.","2B","H320","Causes eye irritation","eye","2B");
for(const cat of ["1","1A","1B"]){
 choose("health","Resp. Sens.",cat,"H334","May cause allergy or asthma symptoms or breathing difficulties if inhaled","hRespSens",cat);
 choose("health","Skin Sens.",cat,"H317","May cause an allergic skin reaction","hSkinSens",cat);
}
for(const [field,family,primary,secondary] of [
 ["hMutagen","Muta.","H340","H341"],
 ["hCarcinogen","Carc.","H350","H351"],
 ["hRepro","Repr.","H360","H361"]
]){
 for(const cat of ["1","1A","1B","2"])choose("health",family,cat,cat==="2"?secondary:primary,
  cat==="2"?"Suspected of causing "+(field==="hMutagen"?"genetic defects":field==="hCarcinogen"?"cancer":"reproductive harm"):
  "May cause "+(field==="hMutagen"?"genetic defects":field==="hCarcinogen"?"cancer":"reproductive harm"),
  field,cat);
}
choose("health","Lactation","", "H362","May cause harm to breast-fed children","hLactation",true);
choose("health","STOT SE","1","H370","Causes damage to organs","hStotSE","1");
choose("health","STOT SE","2","H371","May cause damage to organs","hStotSE","2");
choose("health","STOT SE","3 (respiratory)","H335","May cause respiratory irritation","hStot3Resp",true);
choose("health","STOT SE","3 (narcotic)","H336","May cause drowsiness or dizziness","hStot3Narcotic",true);
choose("health","STOT RE","1","H372","Causes damage to organs through prolonged or repeated exposure","hStotRE","1");
choose("health","STOT RE","2","H373","May cause damage to organs through prolonged or repeated exposure","hStotRE","2");
choose("health","Asp. Tox.","1","H304","May be fatal if swallowed and enters airways","hAspiration",true);
choose("health","HHNOC","1","","Health hazards not otherwise classified — Canadian HPR 8.12","hhnoc",true);
// Physical input below is declared ingredient source data only; no physical
// mixture class is derived from these entries. Categories omitted where
// regulatory category/H-code mapping is not independently verified.
for(const [family,cat,code,phrase] of [
 ["Flam. Gas","1A","H220","Extremely flammable gas"],
 ["Flam. Gas","2","H221","Flammable gas"],
 ["Aerosol","1","H222","Extremely flammable aerosol"],
 ["Aerosol","2","H223","Flammable aerosol"],
 ["Flam. Liq.","1","H224","Extremely flammable liquid and vapour"],
 ["Flam. Liq.","2","H225","Highly flammable liquid and vapour"],
 ["Flam. Liq.","3","H226","Flammable liquid and vapour"],
 ["Flam. Sol.","1","H228","Flammable solid"],
 ["Flam. Sol.","2","H228","Flammable solid"],
 ["Ox. Gas","1","H270","May cause or intensify fire; oxidizer"],
 ["Ox. Liq.","1","H271","May cause fire or explosion; strong oxidizer"],
 ["Ox. Liq.","2","H272","May intensify fire; oxidizer"],
 ["Ox. Liq.","3","H272","May intensify fire; oxidizer"],
 ["Ox. Sol.","1","H271","May cause fire or explosion; strong oxidizer"],
 ["Ox. Sol.","2","H272","May intensify fire; oxidizer"],
 ["Ox. Sol.","3","H272","May intensify fire; oxidizer"],
 ["Met. Corr.","1","H290","May be corrosive to metals"],
 ["Chem. Under Pressure","1","H282","Extremely flammable chemical under pressure: may explode if heated"],
 ["Chem. Under Pressure","2","H283","Flammable chemical under pressure: may explode if heated"],
 ["Chem. Under Pressure","3","H284","Chemical under pressure: may explode if heated"],
 ["Combustible Dusts","","","Combustible dust — Canadian physical hazard"],
 ["Simple Asphyxiants","","","Simple asphyxiant — Canadian physical hazard"],
 ["PHNOC","","","Physical hazards not otherwise classified — Canadian hazard"]
])choose("physical",family,cat,code,phrase,null,null,true);

// Search terms use familiar full classification names as well as CLP-style abbreviations.
const ALIASES=Object.freeze({
 "Acute Tox. Oral":"acute toxicity oral swallowed",
 "Acute Tox. Dermal":"acute toxicity dermal skin contact",
 "Acute Tox. Inhalation":"acute toxicity inhalation gas vapour dust mist",
 "Skin Corr.":"skin corrosion corrosive",
 "Skin Irrit.":"skin irritation irritant",
 "Eye Dam.":"serious eye damage",
 "Eye Irrit.":"eye irritation",
 "Resp. Sens.":"respiratory sensitisation respiratory sensitization asthma",
 "Skin Sens.":"skin sensitisation skin sensitization allergy",
 "Muta.":"germ cell mutagenicity mutagenic",
 "Carc.":"carcinogenicity carcinogenic cancer",
 "Repr.":"reproductive toxicity fertility development",
 "Lactation":"effects on or via lactation breast feeding",
 "STOT SE":"specific target organ toxicity single exposure",
 "STOT RE":"specific target organ toxicity repeated exposure",
 "Asp. Tox.":"aspiration hazard",
 "HHNOC":"health hazards not otherwise classified",
 "Flam. Gas":"flammable gases",
 "Flam. Liq.":"flammable liquids",
 "Flam. Sol.":"flammable solids",
 "Ox. Gas":"oxidizing gases",
 "Ox. Liq.":"oxidizing liquids",
 "Ox. Sol.":"oxidizing solids",
 "Met. Corr.":"corrosive to metals",
 "PHNOC":"physical hazards not otherwise classified",
 "Chem. Under Pressure":"chemicals under pressure"
});
const BY_ID=new Map(CHOICES.map(x=>[x.id,x]));
if(BY_ID.size!==CHOICES.length)throw new Error("WHMIS picker choice IDs must be unique");
const FIELDS=Object.freeze([...new Set(CHOICES.filter(x=>x.field).map(x=>x.field))]);
function byId(id){return BY_ID.get(id)||null}
function selected(fields={},manual=[]){
 const physical=new Set(Array.isArray(manual)?manual:[]);
 return CHOICES.filter(x=>x.manual?x.group==="physical"&&physical.has(x.id):
   x.field&&((typeof x.value==="boolean")?fields[x.field]===x.value:String(fields[x.field]??"")===String(x.value)));
}
function search(query,group="all",selectedIds=[],limit=12){
 const q=String(query||"").trim().toLowerCase();
 if(!q)return[];
 if(!["all","health","physical"].includes(group))return[];
 const exclude=new Set(selectedIds);
 // Exact H-code searches never suggest different H-codes sharing that prefix.
 const isExactCode=/^h\d{3}[a-z]?$/i.test(q),qualified=q.match(/^(h\d{3}[a-z]?)\s+(1a|1b|1c|1|2a|2b|2|3|4)$/i);
 const list=CHOICES.filter(x=>(group==="all"||x.group===group)&&!exclude.has(x.id))
 .filter(x=>{
   if(qualified)return x.code.toLowerCase()===qualified[1] &&
      x.category.toLowerCase()===qualified[2].toLowerCase();
   if(isExactCode)return x.code.toLowerCase()===q;
   return [x.code,x.label,x.phrase,x.group,x.family,ALIASES[x.family]||""].join(" ").toLowerCase().includes(q);
 })
 .sort((a,b)=>{
   const score=x=>x.code.toLowerCase()===q?0:x.code.toLowerCase().startsWith(q)?1:
    x.label.toLowerCase().startsWith(q)?2:3;
   return score(a)-score(b)||a.label.localeCompare(b.label);
 });
 return list.slice(0,Math.max(1,Math.min(50,limit)));
}
function apply(state,id){
 const x=byId(id);
 if(!x)throw new Error("Unknown or unadopted Canadian WHMIS classification: "+id);
 const fields={...(state?.fields||{})},manualPhysical=[...(state?.manualPhysical||[])];
 if(x.manual){
   if(x.group==="physical"&&!manualPhysical.includes(id))manualPhysical.push(id);
 }else if(x.field){
   fields[x.field]=x.value;
   // Explicitly selecting an acute category contradicts any previously
   // ticked "evidence of no acute hazard" checkbox for the same route.
   // Keep measured ATEs unchanged: HPR uses those in preference to the
   // category-point estimate, and the user must reconcile both sources.
   if(x.field==="oralCat")fields.oralSafe=false;
   if(x.field==="dermalCat")fields.dermalSafe=false;
   if(x.field==="inhCat")fields.inhSafe=false;
 }
 return {fields,manualPhysical};
}
function remove(state,id){
 const x=byId(id),fields={...(state?.fields||{})};
 let manualPhysical=[...(state?.manualPhysical||[])];
 if(!x)return {fields,manualPhysical};
 if(x.manual)manualPhysical=manualPhysical.filter(xid=>xid!==id);
 else if(x.field&&((typeof x.value==="boolean")?fields[x.field]===x.value:
   String(fields[x.field]??"")===String(x.value)))fields[x.field]=typeof x.value==="boolean"?false:"";
 return {fields,manualPhysical};
}
return {CHOICES:Object.freeze(CHOICES),FIELDS,byId,selected,search,apply,remove,
   groups:Object.freeze([{id:"all",label:"All"},{id:"health",label:"Health"},{id:"physical",label:"Physical"}])};
});
