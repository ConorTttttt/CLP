/* Canadian WHMIS 2022 / Hazardous Products Regulations: standalone pilot.
   A limited calculator, NOT a complete WHMIS determination.
   Sources: https://laws-lois.justice.gc.ca/eng/regulations/SOR-2015-17/FullText.html
   HPR ss. 2.2, 8.1.1–8.1.7, 8.12.4. Jurisdiction-specific logic only.
*/
(function(root,factory) {
  if(typeof module==="object" && module.exports) module.exports=factory();
  else root.WHMIS=factory();
})(typeof self!=="undefined"?self:this,function(){
  "use strict";
  const PROFILE=Object.freeze({id:"CA-WHMIS-2022",country:"Canada",
    regulation:"Hazardous Products Regulations (SOR/2015-17)",
    effective:"2022-12-15",transitionEnded:"2025-12-14",
    ghs:"GHS Rev. 7, selected Rev. 8 provisions",
    sources:["https://laws-lois.justice.gc.ca/eng/regulations/SOR-2015-17/FullText.html",
      "https://www.canada.ca/en/health-canada/services/environmental-workplace-health/occupational-health-safety/workplace-hazardous-materials-information-system/supplier-hazard-communication-requirements-whmis/guidance.html"]});
  const ROUTES=Object.freeze({
    oral:{label:"Oral",unit:"mg/kg",limits:[5,50,300,2000],point:[0.5,5,100,500],ref:"HPR 8.1.1 Table 1; 8.1.7"},
    dermal:{label:"Dermal",unit:"mg/kg",limits:[50,200,1000,2000],point:[5,50,300,1100],ref:"HPR 8.1.1 Table 2; 8.1.7"}
  });
  const UNSUPPORTED=Object.freeze([
    "Physical hazards (including combustible dust, simple asphyxiants, PHNOC and chemicals under pressure)",
    "Inhalation acute toxicity and water-activated toxicants",
    "Skin corrosion/irritation; serious eye damage/eye irritation",
    "Respiratory and skin sensitisation",
    "Germ cell mutagenicity, carcinogenicity, reproductive toxicity",
    "STOT SE/RE and aspiration hazard",
    "Biohazardous infectious materials and most HHNOC pathways",
    "Whole-mixture evidence, bridging principles and applicable exemptions",
    "WHMIS hazard communication: pictograms, hazard and precautionary statements, bilingual labels and SDSs"
  ]);
  function value(n){if(n===""||n===null||n===undefined)return NaN;const x=Number(n);return Number.isFinite(x)?x:NaN;}
  function category(ate,route){const r=ROUTES[route];if(!(ate>0))return null;const k=r.limits.findIndex(limit=>ate<=limit+1e-10);return k<0?null:k+1;}
  function resolveATE(raw,route){
    if(raw===null||raw===undefined||raw==="" ) return null;
    if(typeof raw==="number"||typeof raw==="string"){
      const n=value(raw);return n>0?{ate:n,source:"measured or entered ATE"}:null;
    }
    if(typeof raw!=="object")return null;
    if(raw.ate!==undefined && raw.ate!==""){
      const n=value(raw.ate);return n>0?{ate:n,source:raw.source||"entered ATE"}:null;
    }
    const k=Number(raw.category);
    return Number.isInteger(k)&&k>=1&&k<=4 ? {
      ate:ROUTES[route].point[k-1],source:"HPR 8.1.7 category "+k+" point estimate"}:null;
  }
  function classify(input){
    const ingredients=Array.isArray(input&&input.ingredients)?input.ingredients:[];
    const issues=[],outcomes=[],calculations=[],review=[];
    let total=0;
    for(let ix=0;ix<ingredients.length;ix++){
      const i=ingredients[ix],n=value(i.pct);
      if(!Number.isFinite(n)||n<0||n>100)issues.push("Ingredient "+(ix+1)+": concentration must be 0–100%.");
      else total+=n;
    }
    if(!ingredients.length)issues.push("No ingredients provided.");
    if(ingredients.length&&Math.abs(total-100)>0.01)issues.push("Concentrations total "+total.toFixed(4)+"%, not 100%.");
    const valid=issues.length===0;
    for(const [route,definition] of Object.entries(ROUTES)){
      const contributions=[],missing=[];
      let divisor=0,unknown=0;
      if(valid)ingredients.forEach((i,index)=>{
        const pct=value(i.pct);
        if(pct<1)return; // HPR 8.1.2(2)
        const raw=i.acute&&i.acute[route];
        if(raw&&typeof raw==="object"&&raw.notAcute===true)return;
        const converted=resolveATE(raw,route);
        if(converted){
          if(converted.ate>5000 && route!=="dermal" && route!=="oral")return;
          // Oral and dermal values to 5000 are relevant in HPR 8.1.5.
          if(converted.ate<=5000){
            const fraction=pct/converted.ate;divisor+=fraction;
            contributions.push({ingredient:i.name||"Ingredient "+(index+1),pct,ate:converted.ate,
              source:converted.source,term:fraction});
          }
        } else {
          unknown+=pct;missing.push({ingredient:i.name||"Ingredient "+(index+1),pct});
        }
      });
      const hasUnknown=missing.length>0;
      const numerator=unknown>10?100-unknown:100;
      const ate=valid&&!hasUnknown&&!divisor?null:(valid&&divisor>0?numerator/divisor:null);
      const cat=category(ate,route);
      const status=!valid?"invalid":hasUnknown?"provisional":"calculated";
      calculations.push({route,label:definition.label,unit:definition.unit,ref:definition.ref,
        status,ate,category:cat,unknownPct:unknown,numerator,denominator:divisor,
        contributions,missing,formula:unknown>10?"HPR 8.1.6(b)(ii)":"HPR 8.1.5 / 8.1.6(b)(i)",
        steps:[...contributions.map(x=>x.ingredient+": "+x.pct+" / "+x.ate+" = "+x.term.toPrecision(7)),
          ...missing.map(x=>x.ingredient+": "+x.pct+"% unknown "+route+" ATE"),
          "ATEmix = "+numerator+" / "+divisor.toPrecision(7)+(ate!==null?" = "+ate.toPrecision(7)+" "+definition.unit:" (not calculable)")],
        notes:hasUnknown?["Unknown acute toxicity data require review; provisional result cannot establish absence of classification."]:[]});
      if(valid&&cat)outcomes.push({id:"acute-"+route,label:"Acute Toxicity ("+definition.label+") — Category "+cat,
        route,category:cat,ate,status,ref:definition.ref});
      if(hasUnknown)review.push("Verify unknown "+route+" toxicity: "+unknown+"% of ingredients at ≥1% have no usable ATE or explicit not-acutely-toxic evidence.");
      if(valid&&!cat&&!hasUnknown&&divisor===0)review.push("No "+route+" acute toxicity classification calculated: verify negative evidence for all ingredients; missing ATE must not imply safety.");
    }
    if(valid){
      const matches=ingredients.filter(i=>Number(i.pct)>=1&&i.hhnoc===true);
      if(matches.length){
        outcomes.push({id:"hhnoc",label:"Health Hazards Not Otherwise Classified — Category 1",
          category:1,status:"ingredient-triggered",ref:"HPR 8.12.4"});
        calculations.push({route:"hhnoc",label:"HHNOC",status:"ingredient-triggered",
          ref:"HPR 8.12.4",steps:matches.map(i=>(i.name||"Ingredient")+": "+i.pct+"% ≥1%"),notes:
          ["Confirm the ingredient's HHNOC classification and check whole-mixture data under HPR 8.12.3 first."]});
      }
    }
    review.push("Check whole-mixture data and bridging principles BEFORE using ingredient calculations (HPR 2.2, 8.1.2–8.1.6).");
    return {profile:PROFILE,phase:"limited pilot",complete:false,valid,
      outcomes,calculations,issues,review,notAssessed:[...UNSUPPORTED],
      note:"Not a complete WHMIS classification, SDS or label decision. No CLP output is reused."};
  }
  return {PROFILE,ROUTES,UNSUPPORTED,category,resolveATE,classify};
});
