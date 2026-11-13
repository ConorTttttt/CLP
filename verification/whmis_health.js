/* Independent Canadian WHMIS 2022 health mixture screening:
 * HPR 8.4.5, 8.5.3-8.5.5, 8.6.3-8.6.5, 8.7.3-8.7.6,
 * 8.8.5, 8.9.5 and 8.10.5.
 * Regulator: Hazardous Products Regulations SOR/2015-17, consolidated 2023-01-01.
 * These are strictly provisional INGREDIENT-BASED rules: assess whole-mixture
 * evidence, relevant bridging, HPR 2.4-2.6, 2.9 and Schedule 4 first.
 */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else root.WHMIS_HEALTH=factory();
})(typeof self!=="undefined"?self:this,function(){
"use strict";
const CODES=Object.freeze({
 respiratory:"respSens",skin:"skinSens",mutagen:"mutagen",carcinogen:"carcinogen",
 reproduction:"repro",lactation:"reproLactation",single:"stotSE",
 repeated:"stotRE",aspiration:"aspiration"
});
const number=x=>x===undefined||x===null||x===""||typeof x==="string"&&!x.trim()?null:
  Number.isFinite(Number(x))?Number(x):null;
const category=(x)=>x===undefined||x===null?"":String(x).trim();
const pct=i=>number(i.pct);
const h=i=>i.health||{};
const sourceName=(i,index)=>i.name||"Ingredient "+(index+1);
const meets=(n,threshold)=>n!==null&&n>=threshold-1e-10;
function evaluate(input){
 const ingredients=Array.isArray(input&&input.ingredients)?input.ingredients:[],
       opts=input&&input.healthMixture||{},
       outcomes=[],calculations=[],review=[];
 const healthConcentration=(i,ix,endpoint)=>{
   if(h(i).ingredientState==="gas"){
     const value=number(i.volumePct);
     if(value===null)review.push(endpoint+": "+sourceName(i,ix)+" is a gas and requires % v/v; mass % was not used.");
     return value;
   }
   return pct(i);
 };
 const blocked=opts.otherEvidence===true;
 if(blocked)review.push("User marked relevant whole-mixture or bridging evidence: ingredient-rule candidates are held for expert review; HPR evidence-order requirements must be applied per hazard class.");
 function report(key,label,ref,chosen,triggered,notes=[],details=[]){
   const status=blocked?"evidence_review":chosen?"provisional":"not_established";
   const info=[...notes,
     "HPR 2.5(1) lower-concentration hazard evidence and HPR 2.9 biological availability may change this assessment.",
     "Ingredient-trigger screening does not establish non-classification or override relevant whole-mixture/bridging studies."];
   calculations.push({route:key,label,ref,status,candidate:chosen,
     steps:[...details,...triggered.map(t=>t.ingredient+": "+t.pct+"% "+t.detail)],
     notes:info,triggered});
   if(chosen&&!blocked){
     const list=Array.isArray(chosen)?chosen:[chosen];
     list.forEach(c=>outcomes.push({id:key+(list.length>1?"-"+c:""),
       route:key,label:label+" — "+(c==="Lactation"?"Effects on or via Lactation":"Category "+c),
       category:c,status:"provisional",ref}));
   }
   if(blocked&&chosen)review.push(label+": calculated candidate "+chosen+" withheld because whole-mixture/bridging evidence requires review.");
 }
 function triggers(key,allowed,limit){
   const out=[];
   ingredients.forEach((i,idx)=>{
     const cat=category(h(i)[key]);
     if(!cat||!allowed.includes(cat))return;
     const isGas=h(i).ingredientState==="gas";
     const mass=isGas?number(i.volumePct):pct(i);
     if(isGas&&mass===null)review.push(labelFor(key)+": "+sourceName(i,idx)+" requires gas % v/v, not mass % w/w.");
     if(mass===null||mass<=0)return;
     const min=typeof limit==="function"?limit(i,cat):limit[cat]??limit;
     if(min===null){
       review.push(labelFor(key)+": "+sourceName(i,idx)+" ("+cat+") requires concentration-basis verification.");
       return;
     }
     if(meets(mass,min))out.push({ingredient:sourceName(i,idx),pct:mass,cat,detail:"category "+cat+" at limit ≥"+min+"%"});
   });
   return out;
 }
 function labelFor(x){return ({respSens:"Respiratory sensitization",skinSens:"Skin sensitization",mutagen:"Germ cell mutagenicity",
   carcinogen:"Carcinogenicity",repro:"Reproductive toxicity",stotSE:"STOT single exposure",stotRE:"STOT repeated exposure"})[x]||x;}
 function standardCMR(key,label,ref,cat2Threshold){
   const matches=triggers(key,["1","1A","1B","2"],{1:0.1,"1A":0.1,"1B":0.1,"2":cat2Threshold});
   const strong=matches.filter(x=>["1","1A","1B"].includes(x.cat));
   let chosen=null;
   if(strong.some(x=>x.cat==="1A"))chosen="1A";
   else if(strong.some(x=>x.cat==="1"))chosen="1";
   else if(strong.some(x=>x.cat==="1B"))chosen="1B";
   else if(matches.some(x=>x.cat==="2"))chosen="2";
   if(strong.some(x=>x.cat==="1")){
      review.push(label+": at least one Category 1 ingredient has no A/B subcategory. Verify the applicable HPR subclassification and do not infer 1A or 1B.");
   }
   report(key,label,ref,chosen,matches,
     ["This is a per-ingredient concentration threshold, not the sum of multiple sub-threshold ingredients.",
      "Whole-mixture conclusive positive/negative evidence and restricted bridging provisions may supersede these ingredient triggers."]);
   return chosen;
 }
 // HPR 8.4.5. Respiratory and skin must be evaluated independently.
 function sensitizer(key,label,resp){
   const matches=[],missingBasis=[];
   ingredients.forEach((i,ix)=>{
     const cat=category(h(i)[key]);if(!["1","1A","1B"].includes(cat))return;
     const state=h(i).ingredientState;
     const gas=state==="gas";
     const conc=gas?number(i.volumePct):pct(i);
     if(conc===null){
       missingBasis.push(sourceName(i,ix)+": a gas sensitizer requires % v/v; no % w/w substitution.");
       return;
     }
     // The physical state only changes the respiratory 1B cut-off (0.2% v/v
     // for gases) and the concentration basis. An unspecified state must not
     // silently drop a sensitiser: screen it on the % w/w basis used for
     // solids/liquids and ask for confirmation instead.
     const stateKnown=["gas","liquid","solid"].includes(state);
     const min=cat==="1B"?(resp&&gas?0.2:1):0.1;
     if(!stateKnown){
       if(resp&&cat==="1B"&&!meets(conc,1)&&meets(conc,0.2))
         missingBasis.push(sourceName(i,ix)+": physical state not established. Respiratory 1B at "+conc+
           "% w/w is below the 1.0% solid/liquid cut-off but would meet the 0.2% gas cut-off if the ingredient is a gas (then enter % v/v).");
       else if(meets(conc,min))
         missingBasis.push(sourceName(i,ix)+": physical state not established; screened on % w/w (solid/liquid basis). Confirm the state; a gas ingredient requires % v/v.");
     }
     if(meets(conc,min))matches.push({ingredient:sourceName(i,ix),pct:conc,cat,
       detail:"sensitizer "+cat+" at ≥"+min+"% ("+(gas?"v/v":"w/w")+(stateKnown?"":", state not established")+")"});
   });
   let chosen=null;
   if(matches.some(x=>x.cat==="1A"))chosen="1A";
   else if(matches.some(x=>x.cat==="1"))chosen="1";
   else if(matches.some(x=>x.cat==="1B"))chosen="1B";
   if(missingBasis.length)review.push(...missingBasis);
   if(matches.some(x=>x.cat==="1")&&matches.some(x=>x.cat==="1B")){
      review.push(label+": Category 1 ingredient also present; report general Category 1 rather than assuming 1B only.");
   }
   report(key,label,"HPR 8.4.2–8.4.5",chosen,matches,
    [resp?"Respiratory 1B cut-off: 1.0% (solids/liquids) or 0.2% (gases).":"Skin 1B cut-off: 1.0%; 1 and 1A cut-offs: 0.1%.",
     "HPR 8.4 can classify respiratory and skin sensitization independently; sensitization 1B is not assigned when a 1A trigger exists.",
     ...missingBasis]);
 }
 sensitizer("respSens","Respiratory Sensitization",true);
 sensitizer("skinSens","Skin Sensitization",false);

 // HPR 8.5 and 8.6: CMR ingredient thresholds, with priority of Category 1.
 standardCMR("mutagen","Germ Cell Mutagenicity","HPR 8.5.3–8.5.5",1.0);
 standardCMR("carcinogen","Carcinogenicity","HPR 8.6.3–8.6.5",0.1);

 // HPR 8.7.5(2) requires separate effects on or via lactation,
 // even if classified in Category 1A/1B/2 for fertility/development.
 const repro=standardCMR("repro","Reproductive Toxicity","HPR 8.7.3–8.7.4",0.1);
 const lactation=ingredients.flatMap((i,ix)=>{
   if(h(i).reproLactation!==true)return [];
   const concentration=healthConcentration(i,ix,"Lactation");
   return meets(concentration,0.1)?[{ingredient:sourceName(i,ix),pct:concentration,detail:"effects on or via lactation (≥0.1%)"}]:[];
 });
 report("repro-lactation","Reproductive Toxicity","HPR 8.7.5(1)–(2)",lactation.length?"Lactation":null,lactation,
  ["Lactation is a separate classification that may coexist with reproductive toxicity Category 1 or 2.",
   "HPR 8.7.5 mixture evidence exceptions and bridging provisions remain subject to review."]);
 if(repro&&lactation.length)review.push("Reproductive toxicity: retain both developmental/fertility classification and effects on or via lactation under HPR 8.7.5(2).");

 // STOT SE 8.8.5: main severity 1/2 is ingredient-specific >=1%;
 // Cat 3 direct 20% OR documented effect concentration, or pair >=1% each
 // with the same transient effect and combined >=20%. 1/2 + Cat3 can
 // coexist only when Cat3 is established through 8.8.5(1)(c).
 const se=triggers("stotSE",["1","2"],{1:1,2:1});
 const seMain=se.some(x=>x.cat==="1")?"1":se.some(x=>x.cat==="2")?"2":null;
 const effects=["narcotic","respiratory"];
 const direct=[],combined=[],effectNotes=[];
 effects.forEach(effect=>{
   const flag=effect==="narcotic"?"stotSE3Narcotic":"stotSE3Respiratory";
   const eligible=ingredients.flatMap((i,ix)=>{
     if(h(i)[flag]!==true)return[];
     const concentration=healthConcentration(i,ix,"STOT SE 3");
     if(concentration===null||concentration<=0)return[];
     const elicitation=number(h(i).stotSE3EffectPct);
     if(elicitation!==null&&!(elicitation>0&&elicitation<=100)){
       review.push("STOT SE Category 3: invalid effect-eliciting concentration on "+sourceName(i,ix)+".");
       return[];
     }
     return[{ingredient:sourceName(i,ix),pct:concentration,cat:"3",effect,elicitation}];
   });
   const singly=eligible.filter(x=>meets(x.pct,x.elicitation===null?20:x.elicitation));
   if(singly.length)direct.push(...singly.map(x=>({...x,detail:effect+" at ≥"+(x.elicitation===null?20:x.elicitation)+"% (8.8.5(1)(c))"})));
   const pair=eligible.filter(x=>meets(x.pct,1));
   const sum=pair.reduce((v,x)=>v+x.pct,0);
   if(pair.length>=2&&meets(sum,20))combined.push(...pair.map(x=>({...x,detail:effect+" Σ="+sum+"% from ≥2 ingredients (8.8.5(1)(d))"})));
   if(eligible.length)effectNotes.push(effect+": individual ≥20% or known elicitation; combined ≥2 ingredients each ≥1% and sum ≥20%.");
 });
 if(se.some(x=>x.cat==="1")&&se.some(x=>x.cat==="2"))
   review.push("STOT — Single Exposure: Category 2 ingredient(s) are present alongside a Category 1 ingredient. Category 1 is reported; if they affect different target organs, also classify Category 2 for those organs (organ-specific data are not captured here).");
 const cat3=direct.length>0||(!seMain&&combined.length>0);
 const chosen=[...(seMain?[seMain]:[]),...(cat3?["3"]:[])];
 if(seMain&&combined.length&&!direct.length)review.push("STOT SE: Category 3 summation under 8.8.5(1)(d) is not added to a Category 1/2 result; 8.8.5(2) allows coexistence only via paragraph (1)(c).");
 report("stot-se","STOT — Single Exposure","HPR 8.8.2–8.8.5",chosen.length?chosen:null,
  [...se,...direct,...(!seMain?combined:[])],
  ["Category 3 endpoints must not be summed across narcotic effects and respiratory irritation.",
   "Category 1 or 2 can coexist with Category 3 only where 8.8.5(1)(c) applies.",...effectNotes]);
 // STOT RE: 1% per-ingredient for both Cat 1 and 2.
 const re=triggers("stotRE",["1","2"],{1:1,2:1});
 if(re.some(x=>x.cat==="1")&&re.some(x=>x.cat==="2"))
   review.push("STOT — Repeated Exposure: Category 2 ingredient(s) are present alongside a Category 1 ingredient. Category 1 is reported; if they affect different target organs, also classify Category 2 for those organs (organ-specific data are not captured here).");
 report("stot-re","STOT — Repeated Exposure","HPR 8.9.2–8.9.5",
   re.some(x=>x.cat==="1")?"1":re.some(x=>x.cat==="2")?"2":null,re,
   ["Each relevant ingredient must independently meet the 1.0% limit; do not apply an invented summation threshold."]);

 // Aspiration mixture Category 1 requires >=10% sum of Cat1 aspiration
 // ingredients EACH present >=1%, plus measured 40°C viscosity <=20.5.
 // Separated layers follow HPR 8.10.5(b) and are withheld unless a
 // complete, separately verified layer-composition workflow exists.
 const asp=ingredients.flatMap((i,ix)=>h(i).aspiration===true&&h(i).ingredientState!=="gas"&&meets(pct(i),1)?
  [{ingredient:sourceName(i,ix),pct:pct(i),detail:"aspiration Cat 1 ingredient ≥1%"}]:[]);
 const total=asp.reduce((v,x)=>v+x.pct,0);
 const viscosity=number(opts.aspirationViscosity40);
 const separated=opts.phaseSeparated||"unknown";
 let aspCat=null,aspStatus;
 const aspNotes=[
   "HPR 8.10.5(a): sum only aspiration ingredients individually ≥1%; sum ≥10% AND mixture viscosity ≤20.5 mm²/s at 40°C.",
   "HPR 8.10.5(b): separate layers each require their own aspiration ingredient concentration and viscosity assessment.",
   "HPR 8.10.3 whole-mixture data and 8.10.4 bridging take priority; low-viscosity liquid hydrocarbon/human aspiration evidence must be reviewed."
 ];
 // Any recorded aspiration ingredient (even <1%) matters for layer review:
 // a separated layer can concentrate it above the bulk value.
 const anyAspiration=ingredients.some(i=>h(i).aspiration===true&&h(i).ingredientState!=="gas"&&(pct(i)||0)>0);
 const validViscosity=viscosity!==null&&viscosity>=0;
 const bulkMet=validViscosity&&meets(total,10)&&viscosity<=20.5;
 if(!["yes","no","unknown"].includes(separated)){
   aspStatus="invalid";aspNotes.push("Unrecognised phase separation status.");
 }else if(!anyAspiration){
   aspStatus="not_established";
   aspNotes.push("No ingredient is recorded as an aspiration hazard, so the HPR 8.10.5 ingredient route cannot trigger. This is not a negative determination for unrecorded hydrocarbons.");
 }else if(separated==="yes"){
   aspStatus="requires_review";aspNotes.push("Phase separation confirmed: the layer-specific HPR 8.10.5(b) route is NOT automated. Do not classify using bulk viscosity alone.");
 }else if(separated==="no"&&!meets(total,10)){
   aspStatus="not_established";
   aspNotes.push("Σ aspiration toxicants (each ≥1%) = "+total.toFixed(4)+"% < 10%: HPR 8.10.5(a) is not met regardless of viscosity.");
 }else if(!validViscosity&&separated==="unknown"){
   aspStatus="requires_review";aspNotes.push("Confirm whether the mixture separates into layers and enter its measured kinematic viscosity at 40°C (mm²/s); do not infer a negative aspiration assessment.");
 }else if(!validViscosity){
   aspStatus="requires_data";aspNotes.push("Enter measured bulk kinematic viscosity at 40°C (mm²/s).");
 }else if(separated==="unknown"){
   aspNotes.push("Σ aspiration toxicants = "+total.toFixed(4)+"%; bulk viscosity = "+viscosity+" mm²/s.");
   if(bulkMet){
     // Conservative: the bulk HPR 8.10.5(a) criteria are met and only
     // homogeneity is unconfirmed, so the candidate is reported, not hidden.
     aspCat="1";aspStatus="provisional";
     aspNotes.push("Bulk HPR 8.10.5(a) criteria are met. Category 1 is reported provisionally; confirm the mixture does not separate into layers (otherwise apply 8.10.5(b)).");
   }else{
     aspStatus="requires_review";
     aspNotes.push("Bulk criteria not met, but homogeneity is unconfirmed: a separated layer may still meet HPR 8.10.5(b). Confirm whether the mixture separates into layers.");
   }
 }else{
   aspCat=bulkMet?"1":null;
   aspStatus=aspCat?"provisional":"not_established";
   aspNotes.push("Σ aspiration toxicants = "+total.toFixed(4)+"%; bulk viscosity = "+viscosity+" mm²/s.");
 }
 if(aspCat&&separated==="unknown")review.push("Aspiration: "+aspNotes[aspNotes.length-1]);
 calculations.push({route:"aspiration",label:"Aspiration Hazard",status:blocked?"evidence_review":aspStatus,ref:"HPR 8.10.2–8.10.5",
  candidate:aspCat,steps:[...asp.map(x=>x.ingredient+": "+x.pct+"% Cat 1"),"Sum (individual ingredients ≥1%): "+total.toFixed(4)+"%"],
  notes:aspNotes,triggered:asp});
 if(aspCat&&!blocked)outcomes.push({id:"aspiration",route:"aspiration",label:"Aspiration Hazard — Category 1",
   category:"1",ref:"HPR 8.10.5(a)",status:"provisional"});
 if(aspStatus==="requires_review"||aspStatus==="requires_data"||aspStatus==="invalid")
   review.push("Aspiration: "+aspNotes[aspNotes.length-1]);
 return {outcomes,calculations,review,complete:false,
  note:"Partial HPR ingredient-based assessment only; missing or blocked pathways are not negative hazard determinations."};
}
return {CODES,evaluate};
});
