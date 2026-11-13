/* Canadian WHMIS 2022 / Hazardous Products Regulations: standalone pilot.
   A limited calculator, NOT a complete WHMIS determination.
   Sources: https://laws-lois.justice.gc.ca/eng/regulations/SOR-2015-17/FullText.html
   HPR ss. 2.2, 7.6, 8.1.1–8.1.7, 8.12.4. Jurisdiction-specific logic only.
*/
(function(root,factory) {
  if(typeof module==="object" && module.exports) module.exports=factory();
  else root.WHMIS=factory();
})(typeof self!=="undefined"?self:this,function(){
  "use strict";
  const SURFACE=(typeof module==="object"&&module.exports)
    ? require("./whmis_skin_eye.js")
    : (typeof globalThis!=="undefined" ? globalThis.WHMIS_SURFACE : null);
  const EXTENDED=(typeof module==="object"&&module.exports)
    ? require("./whmis_extended.js")
    : (typeof globalThis!=="undefined" ? globalThis.WHMIS_EXTENDED : null);
  const HEALTH=(typeof module==="object"&&module.exports)
    ? require("./whmis_health.js")
    : (typeof globalThis!=="undefined" ? globalThis.WHMIS_HEALTH : null);
  const HAZARD_CATALOG=(typeof module==="object"&&module.exports)
    ? require("./whmis_hazard_catalog.js")
    : (typeof globalThis!=="undefined" ? globalThis.WHMIS_HAZARD_CATALOG : null);
  const PHYSICAL=(typeof module==="object"&&module.exports)
    ? require("./whmis_physical.js")
    : (typeof globalThis!=="undefined" ? globalThis.WHMIS_PHYSICAL : null);
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
    "Physical hazards other than the flash-point-based Flammable Liquids and limited Chemicals Under Pressure assessments, including combustible dust, simple asphyxiants, and PHNOC",
    "Inhalation toxic gas release on contact with water; unimplemented inhalation edge cases and scientific estimates",
    "Skin/eye tested-mixture data, bridging, special-ingredient cases under HPR 8.2.11(3) and 8.3.11(3)",
    "Sensitisation and CMR: conclusive whole-mixture studies, applicable bridging, and evidence below generic thresholds",
    "STOT SE/RE: mixture studies, bridging and specific target organ evidence outside implemented ingredient paths",
    "Aspiration: phase-separated layer-specific evaluation, tested-mixture evidence, and bridging",
    "Biohazardous infectious materials and most HHNOC pathways",
    "Whole-mixture evidence, bridging principles and exemptions outside the limited acute inhalation route",
    "WHMIS hazard communication: pictograms, hazard and precautionary statements, bilingual labels and SDSs"
  ]);
  function value(n){if(n===""||n===null||n===undefined)return NaN;const x=Number(n);return Number.isFinite(x)?x:NaN;}
  function category(ate,route){const r=ROUTES[route];if(!(ate>0))return null;const k=r.limits.findIndex(limit=>ate<=limit+1e-10);return k<0?null:k+1;}
  const blank=x=>x===null||x===undefined||(typeof x==="string"&&!x.trim());
  // Returns {ate,source}, {invalid:message} or null (no usable data).
  // Invalid entries are reported rather than silently treated as "unknown".
  function resolveATE(raw,route){
    if(blank(raw)) return null;
    const r=ROUTES[route];
    if(typeof raw==="number"||typeof raw==="string"){
      const n=value(raw);return n>0?{ate:n,source:"measured or entered ATE"}:{invalid:"ATE/LD50 must be a positive number."};
    }
    if(typeof raw!=="object")return {invalid:"Unrecognised acute toxicity data type."};
    if(!blank(raw.ate)){
      const n=value(raw.ate);return n>0?{ate:n,source:raw.source||"entered ATE"}:{invalid:"ATE/LD50 must be a positive number."};
    }
    if(!blank(raw.category)){
      const k=Number(raw.category);
      return Number.isInteger(k)&&k>=1&&k<=4 ? {
        ate:r.point[k-1],source:"HPR 8.1.7 category "+k+" point estimate"}:
        {invalid:"Acute toxicity category must be 1–4 (Category 5 is not adopted in Canada)."};
    }
    if(!blank(raw.rangeMin)||!blank(raw.rangeMax)){
      // HPR 8.1.7(2): a range wholly within one category uses that category's
      // point estimate; a range crossing categories uses its lowest value.
      const low=value(raw.rangeMin),high=value(raw.rangeMax);
      if(!(low>0)||!(high>=low))return {invalid:"Provide a positive LD50 range with minimum ≤ maximum."};
      const lowCat=category(low,route),highCat=category(high,route);
      if(lowCat&&lowCat===highCat)return {ate:r.point[lowCat-1],source:"HPR 8.1.7 point estimate for range wholly in Category "+lowCat};
      if(lowCat)return {ate:low,source:"HPR 8.1.7(2): lowest value of a range crossing category boundaries"};
      return {invalid:"LD50 range lies entirely above Category 4; enter a single value or expert-assess relevance under HPR 8.1.5."};
    }
    return null;
  }
  // HPR 8.1.3 (whole-mixture data) and 8.1.4 (bridging) precede the
  // ingredient formula in 8.1.5–8.1.6. Returns null when neither is entered.
  function mixtureEvidence(ev,route){
    if(!ev||typeof ev!=="object")return null;
    const def=ROUTES[route];
    if(!blank(ev.wholeMixtureLD50)){
      const n=value(ev.wholeMixtureLD50);
      if(!(n>0))return {status:"invalid",ate:null,category:null,
        steps:[],notes:["Whole-mixture "+def.label.toLowerCase()+" LD50 must be a positive number."]};
      const cat=category(n,route);
      return {status:"whole_mixture_candidate",ate:n,category:cat,
        steps:["HPR 8.1.3: whole-mixture "+def.label.toLowerCase()+" LD50 = "+n+" "+def.unit+" takes precedence over bridging and ingredient additivity.",
          cat?"HPR 8.1.1: Category "+cat+".":"Above the Category 4 limit ("+def.limits[3]+" "+def.unit+"): no "+def.label.toLowerCase()+" category from whole-mixture data."],
        notes:["Verify the source, validity and applicability of the whole-mixture test (HPR 8.1.3)."]};
    }
    if(!blank(ev.bridgedCategory)){
      const k=Number(ev.bridgedCategory);
      if(!Number.isInteger(k)||k<1||k>4||!String(ev.bridgingEvidence||"").trim())
        return {status:"requires_review",ate:null,category:null,steps:[],
          notes:["A bridging candidate needs Category 1–4 and a documented basis under HPR 2.3 / 8.1.4; no category was assigned."]};
      return {status:"bridging_candidate",ate:null,category:k,
        steps:["HPR 8.1.4: bridging Category "+k+" entered; basis: "+String(ev.bridgingEvidence).trim()+"."],
        notes:["Expert-review the applicability of the selected HPR 2.3 bridging principle and the tested mixture."]};
    }
    return null;
  }
  function classify(input){
    const ingredients=Array.isArray(input&&input.ingredients)?input.ingredients:[];
    const issues=[],outcomes=[],calculations=[],review=[],supplementalStatements=[];
    let total=0;
    for(let ix=0;ix<ingredients.length;ix++){
      const i=ingredients[ix],n=value(i.pct);
      if(!Number.isFinite(n)||n<0||n>100)issues.push("Ingredient "+(ix+1)+": concentration must be 0–100%.");
      else total+=n;
    }
    if(!ingredients.length)issues.push("No ingredients provided.");
    if(ingredients.length&&Math.abs(total-100)>0.01)issues.push("Concentrations total "+total.toFixed(4)+"%, not 100%.");
    const valid=issues.length===0;
    const acuteMixture=(input&&input.acuteMixture)||{};
    for(const [route,definition] of Object.entries(ROUTES)){
      const evidence=valid?mixtureEvidence(acuteMixture[route],route):null;
      if(evidence){
        calculations.push({route,label:definition.label,unit:definition.unit,ref:definition.ref,
          status:evidence.status,ate:evidence.ate,category:evidence.category,candidate:evidence.category,
          unknownPct:0,contributions:[],missing:[],steps:[...evidence.steps,
            "Ingredient additivity (HPR 8.1.5–8.1.6) not used because higher-priority evidence was entered."],
          notes:evidence.notes});
        if(evidence.category)outcomes.push({id:"acute-"+route,label:"Acute Toxicity ("+definition.label+") — Category "+evidence.category,
          route,category:evidence.category,ate:evidence.ate,status:evidence.status,ref:definition.ref});
        review.push(...evidence.notes.map(n=>definition.label+" acute toxicity: "+n));
        continue;
      }
      const contributions=[],missing=[],invalidData=[];
      let divisor=0,unknown=0;
      if(valid)ingredients.forEach((i,index)=>{
        const pct=value(i.pct);
        if(pct<=0)return;
        const raw=i.acute&&i.acute[route];
        if(raw&&typeof raw==="object"&&raw.notAcute===true)return;
        // HPR 2.5(1), explained in Health Canada supplier guidance:
        // sub-1% ingredients must also be relevant when evidence shows
        // acute toxicity effects at their actual mixture concentration.
        const belowOneRelevant=pct<1 && raw && typeof raw==="object" && raw.relevantBelow1===true;
        if(pct<1 && !belowOneRelevant)return;
        if(belowOneRelevant)review.push((i.name||"Ingredient "+(index+1))+
          ": "+route+" acute toxicity below 1% included on recorded evidence (HPR 2.5(1)); verify supporting data.");
        const converted=resolveATE(raw,route);
        if(converted&&converted.invalid){
          // Conservative: unusable data are counted as unknown, and flagged.
          unknown+=pct;missing.push({ingredient:i.name||"Ingredient "+(index+1),pct});
          invalidData.push((i.name||"Ingredient "+(index+1))+": "+converted.invalid);
        } else if(converted){
          // Oral and dermal values to 5000 are relevant in HPR 8.1.5;
          // above 5000 the ingredient is neither a contributor nor unknown.
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
      // HPR 3(1)(e), Schedule 1 2(b): supplemental unknown-toxicity
      // percentage applies when classified for this route and unknown
      // relevant ingredients total at least 1% of the mixture.
      // This is an English review prompt, NOT a compliant bilingual label.
      if(valid&&cat&&unknown>=1-1e-9){
        const english=unknown+"% of the mixture consists of ingredient(s) of unknown acute "+route+" toxicity.";
        supplementalStatements.push({route,unknownPct:unknown,english,
          ref:"HPR 3(1)(e); Schedule 1 paragraph 2(b)",status:"requires bilingual label/SDS review"});
        review.push("Canadian supplemental label/SDS statement required for unknown acute "+route+
          " toxicity ("+unknown+"%); draft English only — verify and provide compliant English and French wording.");
      }
      invalidData.forEach(msg=>review.push(definition.label+" acute toxicity input not usable, treated as unknown — "+msg));
      if(invalidData.length)calculations[calculations.length-1].notes.push(...invalidData.map(m=>"Invalid input treated as unknown: "+m));
      if(hasUnknown)review.push("Verify unknown "+route+" toxicity: "+unknown+
        "% of relevant ingredients have no usable ATE or explicit not-acutely-toxic evidence.");
      if(valid&&!cat&&!hasUnknown&&divisor===0)review.push("No "+route+" acute toxicity classification calculated: verify negative evidence for all ingredients; missing ATE must not imply safety.");
    }
    if(valid&&SURFACE){
      const surface=SURFACE.calculate(ingredients);
      outcomes.push(...surface.outcomes);
      calculations.push(...surface.calculations);
      review.push(...surface.review);
    }else if(valid){
      review.push("Skin and eye additive module unavailable: these hazard classes have not been evaluated.");
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
    let scope=null;
    let extension=null;
    let healthResult=null;
    if(HEALTH){
      if(valid){
        healthResult=HEALTH.evaluate(input);
        outcomes.push(...healthResult.outcomes);
        calculations.push(...healthResult.calculations);
        review.push(...healthResult.review);
      }else review.push("Additional WHMIS health class calculations blocked: invalid ingredient percentages.");
    }else review.push("Additional WHMIS health class module unavailable.");
    if(EXTENDED){
      if(valid){
        extension=EXTENDED.classify(input);
        scope=extension.scope;
        outcomes.push(...extension.outcomes);
        calculations.push(...extension.calculations);
        review.push(...extension.review);
        supplementalStatements.push(...extension.supplementalStatements);
      } else {
        scope=EXTENDED.evaluateScope(input&&input.scope);
        review.push("Extended WHMIS calculations not run because ingredient concentrations are invalid.");
      }
    }else{
      review.push("Canadian inhalation, Chemicals Under Pressure and scope modules unavailable.");
    }
    let physical=null;
    if(PHYSICAL){
      if(valid){
        physical=PHYSICAL.classify(input);
        outcomes.push(...physical.outcomes);
        calculations.push(...physical.calculations);
        review.push(...physical.review);
      }else review.push("Flammable liquids (HPR 7.6) not evaluated because ingredient concentrations are invalid.");
    }else review.push("Canadian physical hazard module (flammable liquids) unavailable.");
    review.push("Check whole-mixture data and bridging principles BEFORE using ingredient calculations (HPR 2.2, 8.1.2–8.1.6).");
    return {profile:PROFILE,phase:"limited pilot",complete:false,valid,scope,extension,healthResult,physical,
      hazardCoverage:HAZARD_CATALOG?HAZARD_CATALOG.CATALOG:[],
      outcomes,calculations,issues,review,supplementalStatements,
      notAssessed:[...UNSUPPORTED,...(physical?physical.notAssessed:[]),...(extension?extension.notAssessed:[])],
      note:"Not a complete WHMIS classification, SDS or label decision. No CLP output is reused."};
  }
  return {PROFILE,ROUTES,UNSUPPORTED,category,resolveATE,classify};
});
