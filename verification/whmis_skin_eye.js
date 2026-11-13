/* Canada HPR (SOR/2015-17), ss. 8.2.11(1)–(2), 8.3.11(1)–(2).
   Ingredient-based additive assessment only. Whole-mixture data, bridging
   and special ingredient routes in (3) must be considered first.
   Verified against uploaded HPR XML, consolidation 2023-01-01.
*/
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else root.WHMIS_SURFACE=factory();
})(typeof self!=="undefined"?self:this,function(){
"use strict";
const pct=i=>Number(i.pct);
const names=i=>i.name||"Ingredient";
const nonempty=x=>x!==null&&x!==undefined&&String(x)!=="";
const CORR=["1","1A","1B","1C"],IRR=["2","2A","2B"];
function calculate(ingredients){
  const outcomes=[],calculations=[],review=[];
  const ixs=ingredients.map((i,n)=>({i,p:pct(i),index:n}))
    .filter(x=>Number.isFinite(x.p)&&x.p>0);
  // Do not treat an ingredient as eligible below 1% without evidence of
  // corrosive/irritant effect at its actual mixture concentration.
  function eligible(x,domain){
    return x.p>=1-1e-10||x.i[domain+"EvidenceBelow1"]===true;
  }
  const skin=ixs.filter(x=>CORR.includes(x.i.skin)||x.i.skin==="2");
  const sActive=skin.filter(x=>eligible(x,"skin"));
  const sGroups=new Set(skin.filter(x=>CORR.includes(x.i.skin)).map(x=>x.i.skin));
  const sc=sActive.filter(x=>CORR.includes(x.i.skin)).reduce((n,x)=>n+x.p,0);
  const si=sActive.filter(x=>x.i.skin==="2").reduce((n,x)=>n+x.p,0);
  const sParts=CORR.map(c=>({cat:c,pct:sActive.filter(x=>x.i.skin===c).reduce((n,x)=>n+x.p,0)}));
  const sSpecial=ixs.filter(x=>x.i.specialSkin===true);
  let sCat=null;
  if(sc>=5-1e-9){
    sCat=sGroups.size===1&&sGroups.has("1A")?"1A":
      sGroups.size===1&&sGroups.has("1B")?"1B":
      sGroups.size===1&&sGroups.has("1C")?"1C":"1";
  }else if((sc>=1-1e-9&&sc<5-1e-9)||si>=10-1e-9||(10*sc+si)>=10-1e-9){
    sCat="2";
  }
  const sSteps=[
    "8.2.11(1): ingredients ≥1% are summed; <1% only with evidence of skin hazard at present concentration.",
    ...sParts.filter(x=>x.pct>0).map(x=>"Σ Skin Corr. "+x.cat+" (relevant ingredients) = "+x.pct.toFixed(4)+"%"),
    "Σ skin corrosion ingredients = "+sc.toFixed(4)+"%; Σ skin irritation 2 = "+si.toFixed(4)+"%",
    "Irritation weighted test = 10 × "+sc.toFixed(4)+" + "+si.toFixed(4)+" = "+(10*sc+si).toFixed(4)+"%",
    sCat?"Additive result: Skin "+(sCat==="2"?"Irritation":"Corrosion")+" — Category "+sCat:"No additive skin threshold met."
  ];
  const sNotes=[
    "This is the 8.2.11(2) ingredient-additive route, not a complete skin assessment.",
    "Check 8.2.9 (mixture data), 8.2.10 (bridging), and 8.2.11(3) (particular ingredients) before finalizing."
  ];
  if(sCat&&sCat!=="2"&&sCat!=="1"){
    sNotes.push("HPR 8.2.11(2)(a.1)–(a.3) permits Category 1 or this subcategory where no other corrosion category/subcategory ingredient is present.");
  }
  if(sSpecial.length){
    sNotes.push("Special-ingredient route 8.2.11(3) was flagged. Additive result cannot be finalized without separate assessment.");
    review.push("Skin: apply HPR 8.2.11(3) to the flagged ingredient(s); provisional additive result has not been promoted to a classification.");
  }
  if(sCat&&!sSpecial.length)outcomes.push({
    id:"skin",label:"Skin "+(sCat==="2"?"Irritation":"Corrosion")+" — Category "+sCat,
    category:sCat,status:"provisional",ref:"HPR 8.2.11(1)–(2)"});
  calculations.push({route:"skin",label:"Skin corrosion/irritation",status:sSpecial.length?"review":sCat?"provisional":"not established",
    candidate:sCat,ref:"HPR 8.2.11",steps:sSteps,notes:sNotes});
  const eye=ixs.filter(x=>["1","2","2A","2B"].includes(x.i.eye));
  const eActive=eye.filter(x=>eligible(x,"eye"));
  const eTypes=new Set(eye.filter(x=>IRR.includes(x.i.eye)).map(x=>x.i.eye));
  // Count an ingredient carrying both skin corrosion and Eye Dam. 1 only once.
  const severe=ixs.filter(x=>(CORR.includes(x.i.skin)&&eligible(x,"skin"))||
    (x.i.eye==="1"&&eligible(x,"eye")));
  const es=severe.reduce((n,x)=>n+x.p,0);
  const ei=eActive.filter(x=>IRR.includes(x.i.eye)).reduce((n,x)=>n+x.p,0);
  const eSpecial=ixs.filter(x=>x.i.specialEye===true);
  let eCat=null;
  if(es>=3-1e-9)eCat="1";
  else if((es>=1-1e-9&&es<3-1e-9)||ei>=10-1e-9||(10*es+ei)>=10-1e-9){
    if(es<1-1e-9&&eTypes.size===1&&eTypes.has("2A")&&ei>=10-1e-9)eCat="2A";
    else if(es<1-1e-9&&eTypes.size===1&&eTypes.has("2B")&&ei>=10-1e-9)eCat="2B";
    else eCat="2";
  }
  const eSteps=[
    "8.3.11(1): eye-hazard ingredients ≥1% are included, or <1% with supporting effect evidence.",
    "Σ Eye Dam. 1 / Skin Corr. 1* = "+es.toFixed(4)+"% (each ingredient counted once)",
    "Σ eye irritation 2/2A/2B = "+ei.toFixed(4)+"%",
    "Weighted irritation test = 10 × "+es.toFixed(4)+" + "+ei.toFixed(4)+" = "+(10*es+ei).toFixed(4)+"%",
    eCat?"Additive result: "+(eCat==="1"?"Serious Eye Damage":"Eye Irritation")+" — Category "+eCat:"No additive eye threshold met."
  ];
  const eNotes=[
    "This is the 8.3.11(2) additive route only, not a complete eye hazard determination.",
    "Check 8.3.9 (mixture data), 8.3.10 (bridging), and 8.3.11(3) (particular ingredients) before finalizing.",
    "*Skin Corr. and Eye Dam. classifications on the same ingredient are counted only once in the severe-hazard sum."
  ];
  if(eSpecial.length){
    eNotes.push("Special-ingredient route 8.3.11(3) was flagged; final classification requires expert review.");
    review.push("Eye: apply HPR 8.3.11(3) to flagged ingredient(s); provisional additive result not finalized.");
  }
  if(eCat&&!eSpecial.length)outcomes.push({
    id:"eye",label:(eCat==="1"?"Serious Eye Damage":"Eye Irritation")+" — Category "+eCat,
    category:eCat,status:"provisional",ref:"HPR 8.3.11(1)–(2)"});
  calculations.push({route:"eye",label:"Serious eye damage/eye irritation",status:eSpecial.length?"review":eCat?"provisional":"not established",
    candidate:eCat,ref:"HPR 8.3.11",steps:eSteps,notes:eNotes});
  review.push("Skin/eye: verify whole-mixture and bridging data, lower-concentration evidence under 2.5, and special-ingredient exceptions before final classification.");
  return {outcomes,calculations,review};
}
return {calculate};
});
