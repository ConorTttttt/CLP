/* Canadian WHMIS 2022 physical hazard assessments from product-level data.
 * HPR (SOR/2015-17) 7.6 Flammable liquids: Categories 1–4 from the
 * product's closed-cup flash point and initial boiling point.
 * Canada adopts Category 4 (flash point >60 °C and ≤93 °C), unlike EU CLP.
 * The flash point is a whole-product property: ingredient flammability
 * declarations never classify the mixture on their own.
 * All results are provisional decision support, not compliant labels/SDSs.
 */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else root.WHMIS_PHYSICAL=factory();
})(typeof self!=="undefined"?self:this,function(){
"use strict";
const REF="HPR 7.6";
// Reference previews (GHS Annex 3 codes); Canadian labels need English and French.
const FLAMMABLE_LIQUID_LABELS=Object.freeze({
  1:{code:"H224",statement:"Extremely flammable liquid and vapour",signal:"Danger",symbols:["Flame"]},
  2:{code:"H225",statement:"Highly flammable liquid and vapour",signal:"Danger",symbols:["Flame"]},
  3:{code:"H226",statement:"Flammable liquid and vapour",signal:"Warning",symbols:["Flame"]},
  4:{code:"H227",statement:"Combustible liquid",signal:"Warning",symbols:[]}
});
const finite=x=>x===null||x===undefined||(typeof x==="string"&&!x.trim())||!Number.isFinite(Number(x))?null:Number(x);

// Pure category rule (HPR 7.6 table). Returns 1–4, null (not a flammable
// liquid) or "needs_ibp" when the flash point is <23 °C and IBP is unknown.
function flammableLiquidCategory(flashPointC,initialBoilingPointC){
  const fp=finite(flashPointC),ibp=finite(initialBoilingPointC);
  if(fp===null)return undefined;
  if(fp<23){
    if(ibp===null)return "needs_ibp";
    return ibp<=35?1:2;
  }
  if(fp<=60)return 3;
  if(fp<=93)return 4;
  return null;
}

function flammableLiquid(raw){
  const p=raw||{},steps=[],notes=[];
  const result={route:"flammable-liquid",label:"Flammable Liquids",ref:REF,status:"not_assessed",
    category:null,candidate:null,steps,notes,outcomes:[],review:[]};
  if(p.assess!==true){
    notes.push("Not assessed: enter the product's closed-cup flash point to evaluate HPR 7.6.");
    return result;
  }
  if(p.aerosolDispenser===true){
    result.status="not_applicable";
    notes.push("Product is an aerosol dispenser: evaluate the aerosol class (HPR 7.3) rather than flammable liquids.");
    return result;
  }
  if(p.physicalState==="gas"||p.physicalState==="solid"){
    result.status="not_applicable";
    notes.push("Product is a "+p.physicalState+"; HPR 7.6 applies to liquids. Evaluate the relevant gas/solid physical classes.");
    return result;
  }
  if(p.physicalState!=="liquid"){
    result.status="requires_data";
    notes.push("Confirm the product is a liquid before applying HPR 7.6.");
    result.review.push("Flammable liquids: "+notes[notes.length-1]);
    return result;
  }
  const fp=finite(p.flashPointC),ibp=finite(p.initialBoilingPointC);
  if(fp===null){
    result.status="requires_data";
    notes.push("A product flash point (°C, closed cup) is required. No category is inferred from ingredient data.");
    result.review.push("Flammable liquids: "+notes[notes.length-1]);
    return result;
  }
  steps.push("Flash point = "+fp+" °C"+(p.flashPointMethod?" ("+String(p.flashPointMethod).replace(/_/g," ")+")":"")+
    (ibp!==null?"; initial boiling point = "+ibp+" °C":"")+".");
  const method=p.flashPointMethod||"";
  if(method==="open_cup")notes.push("Open-cup flash points are typically higher than closed-cup values; HPR 7.6 classification should use a closed-cup result.");
  if(method==="calculated"||method==="literature")notes.push("Flash point is "+method+", not measured on this product. Confirm it is representative of the actual mixture; non-ideal mixtures can flash lower than predicted.");
  if(!method)notes.push("Record the flash point method (closed cup expected).");
  const cat=flammableLiquidCategory(fp,ibp);
  if(cat==="needs_ibp"){
    result.status="requires_data";
    notes.push("Flash point <23 °C: at least Category 2. Enter the initial boiling point (Category 1 if ≤35 °C, Category 2 if >35 °C).");
    result.review.push("Flammable liquids: "+notes[notes.length-1]);
    return result;
  }
  if(cat===null){
    result.status="not_established";
    steps.push("Flash point >93 °C: outside HPR 7.6 Categories 1–4.");
    notes.push("Not a flammable liquid on the entered flash point. Other physical hazard classes are not assessed by this result.");
    return result;
  }
  const rule={1:"flash point <23 °C and initial boiling point ≤35 °C",2:"flash point <23 °C and initial boiling point >35 °C",
    3:"flash point ≥23 °C and ≤60 °C",4:"flash point >60 °C and ≤93 °C"}[cat];
  steps.push("HPR 7.6: "+rule+" ⇒ Category "+cat+".");
  const l=FLAMMABLE_LIQUID_LABELS[cat];
  result.status="provisional";result.category=cat;result.candidate=cat;
  result.label="Flammable Liquids — Category "+cat;
  result.outcomes.push({id:"flammable-liquid",route:"flammable-liquid",label:result.label,category:cat,
    hazardCode:l.code,hazardStatement:l.statement,signalWord:l.signal,pictogramSymbols:[...l.symbols],
    status:"provisional",ref:REF});
  if(cat===3)notes.push("Do not omit Category 3 on the basis of a sustained-combustibility (UN L.2) test: that GHS allowance is aimed at transport and is not automated here; verify against the HPR before relying on it.");
  notes.push("Hazard code, statement and signal word are English reference previews only; Canadian labels and SDSs require compliant English and French text.");
  result.review.push("Flammable liquids: verify the flash point method and representativeness before accepting Category "+cat+".");
  return result;
}

// Ingredient-declared flammable liquids are a prompt to measure the product,
// never a mixture classification (the finished product's flash point governs).
function declaredFlammableIngredients(ingredients){
  return (Array.isArray(ingredients)?ingredients:[]).flatMap((i,ix)=>
    (Array.isArray(i.declaredPhysicalHazards)?i.declaredPhysicalHazards:[]).some(id=>/^P:Flam-Liq/.test(String(id)))&&Number(i.pct)>0
      ?[i.name||"Ingredient "+(ix+1)]:[]);
}

function classify(input){
  const fl=flammableLiquid(input&&input.flammableLiquid);
  const review=[...fl.review];
  const declared=declaredFlammableIngredients(input&&input.ingredients);
  if(declared.length&&fl.status==="not_assessed")
    review.push("Flammable liquids: "+declared.join(", ")+" "+(declared.length>1?"are":"is")+
      " declared as a flammable liquid ingredient. Determine the finished product's flash point (HPR 7.6); ingredient declarations do not classify the mixture.");
  const calculations=fl.status==="not_assessed"?[]:[{route:fl.route,label:fl.label,status:fl.status,
    candidate:fl.candidate,ref:fl.ref,steps:fl.steps,notes:fl.notes}];
  return {flammableLiquid:fl,outcomes:[...fl.outcomes],calculations,review,
    notAssessed:fl.status==="not_assessed"?["Flammable liquids (HPR 7.6)"]:[]};
}
return {FLAMMABLE_LIQUID_LABELS,flammableLiquidCategory,flammableLiquid,declaredFlammableIngredients,classify};
});
