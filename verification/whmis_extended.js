/* Canadian WHMIS 2022 extensions: HPR 8.1 inhalation, HPR 7.21-7.21.1
 * chemicals under pressure, and HPA section 12 / Schedule 1 scope screening.
 * Source priority: Canada's HPA and HPR; GHS Rev.7 and adopted GHS Rev.8
 * are supporting evidence, not an automatic adoption of every GHS class.
 * All results require regulatory review and are NOT final labels/SDSs.
 */
(function(root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.WHMIS_EXTENDED = factory();
})(typeof self !== "undefined" ? self : this, function() {
  "use strict";

  const INHALATION = Object.freeze({
    gas: {label:"Gases",unit:"ppmV",basis:"volumePct",limits:[100,500,2500,20000],points:[10,100,700,4500],hourDivisor:2},
    vapour: {label:"Vapours",unit:"mg/L",basis:"pct",limits:[0.5,2,10,20],points:[0.05,0.5,3,11],hourDivisor:2},
    dustMist: {label:"Dusts and mists",unit:"mg/L",basis:"pct",limits:[0.05,0.5,1,5],points:[0.005,0.05,0.5,1.5],hourDivisor:4}
  });

  const EXCLUSIONS = Object.freeze({
    radioactive_nuclear_substance:"HPA 12(d)",
    hazardous_waste:"HPA 12(e)",
    tobacco_or_tobacco_product:"HPA 12(h)",
    manufactured_article:"HPA 12(i)",
    pest_control_product:"HPA 12(j), Schedule 1 item 1",
    explosive_product:"HPA 12(j), Schedule 1 item 2",
    food_drug_cosmetic_device:"HPA 12(j), Schedule 1 item 3",
    consumer_product:"HPA 12(j), Schedule 1 item 4",
    wood_product:"HPA 12(j), Schedule 1 item 5"
  });

  const PRESSURE_LABELS = Object.freeze({
    1:{code:"H282",statement:"Extremely flammable chemical under pressure: May explode if heated",signal:"Danger",symbols:["Flame","Gas cylinder"]},
    2:{code:"H283",statement:"Flammable chemical under pressure: May explode if heated",signal:"Warning",symbols:["Flame","Gas cylinder"]},
    3:{code:"H284",statement:"Chemical under pressure: May explode if heated",signal:"Warning",symbols:["Gas cylinder"]}
  });
  const finite = value => value !== "" && value !== null && value !== undefined &&
    Number.isFinite(Number(value)) ? Number(value) : null;
  const countCategory = (ate,form) => {
    const d=INHALATION[form];
    if(!d || !(ate>0))return null;
    const index=d.limits.findIndex(x=>ate<=x);
    return index<0?null:index+1;
  };
  const blank = value => value===null || value===undefined || value==="";

  function evaluateScope(raw) {
    const s=raw||{},activity=s.activity||"unknown",workplace=s.workplace||"unknown",exclusion=s.exclusion||"unknown";
    const result={status:"undetermined",reason:"HPA applicability has not been established.",ref:"HPA 2, 12–15, Schedules 1–2",
      notes:["This is a federal supplier Part II screen, not a conclusion that the product is safe or non-hazardous."]};
    if(exclusion in EXCLUSIONS) {
      result.status="outside_part_ii_scope";
      result.ref=EXCLUSIONS[exclusion];
      result.reason="User has identified a product type excluded by HPA section 12 / Schedule 1.";
      result.notes.push("An exclusion must be substantiated. Some exclusions depend on definitions in other federal Acts.");
    } else if(exclusion!=="none_confirmed"&&exclusion!=="unknown"){
      result.notes.push("Unrecognised exclusion code. Obtain legal applicability review.");
    } else if(activity==="internal_use"){
      result.status="supplier_activity_not_established";
      result.reason="No sale or import activity entered; HPA Part II supplier obligations are not determined by this screen.";
      result.notes.push("Provincial/territorial employer workplace duties may still apply.");
    } else if(["sell","import","sell_import"].includes(activity)&&workplace==="no"){
      result.status="outside_described_workplace_scope";
      result.reason="User indicates product is not intended for use, handling or storage in a Canadian workplace.";
      result.notes.push("Verify intended use; this is not a chemical-hazard determination.");
    } else if(["sell","import","sell_import"].includes(activity)&&workplace==="yes"&&exclusion==="none_confirmed"){
      result.status="potentially_in_scope";
      result.reason="The identified supplier activity and workplace use meet the basic scope screen with no confirmed HPA section 12 exclusion.";
      result.notes.push("Actual duties depend on whether the product is a hazardous product classified under HPR and other applicable exceptions.");
    } else {
      result.notes.push("To establish scope, select supply activity, Canadian workplace intended use and a reviewed exclusion decision.");
    }
    return result;
  }

  function pressureResult(raw){
    const p=raw||{},notes=[],steps=[],result={
      status:"not_assessed",candidate:null,category:null,label:"Chemicals Under Pressure",
      ref:"HPR 7.21–7.21.1; HPR 3(1)(c.1)–(c.2)",
      notes,steps,outcomes:[]
    };
    if(p.assess!==true){
      notes.push("Not assessed: product-level package pressure, composition and heat-of-combustion information has not been requested.");
      return result;
    }
    if(p.aerosolDispenser===true){
      result.status="not_applicable";
      notes.push("Product is an aerosol dispenser: evaluate HPR 7.3/7.3.1 instead. HPR 7.21 excludes aerosol dispensers.");
      return result;
    }
    if(p.gasUnderPressure===true||p.physicalState==="gas"){
      result.status="not_applicable";
      notes.push("Product is a gas/gas under pressure: evaluate HPR 7.5, not Chemicals Under Pressure (HPR 7.21).");
      return result;
    }
    if(p.pressurisedWithGas===false){
      result.status="not_applicable";
      notes.push("The product is not pressurised with a gas and does not meet the HPR 7.21 definition.");
      return result;
    }
    if(p.physicalState!=="liquid"&&p.physicalState!=="solid"){
      result.status="requires_data";notes.push("Select a liquid or solid physical state; pastes and powders are treated as solids where appropriate.");
      return result;
    }
    if(p.aerosolDispenser!==false||p.gasUnderPressure!==false||p.pressurisedWithGas!==true){
      result.status="requires_data";
      notes.push("Confirm non-aerosol receptacle, pressurisation with gas and exclusion of HPR 7.5 gases under pressure.");
      return result;
    }
    const pressure=finite(p.pressureKPa);
    if(pressure===null||pressure<0){
      result.status="requires_data";notes.push("A valid gauge pressure at 20°C (kPa) is required.");
      return result;
    }
    steps.push("HPR 7.21: gauge pressure at 20°C = "+pressure+" kPa; required ≥ 200 kPa.");
    if(pressure<200){
      result.status="not_applicable";notes.push("Below the 200 kPa inclusive legal boundary. Consider other physical classes as applicable.");
      return result;
    }
    const flame=finite(p.flammablePct),heat=finite(p.heatCombustionKJg);
    if(flame===null||flame<0||flame>100||heat===null||heat<0){
      result.status="requires_data";
      notes.push("Enter valid mass % of flammable components (0–100) and specific heat of combustion (≥0 kJ/g). No category is inferred from incomplete information.");
      return result;
    }
    steps.push("Flammable GHS gas/liquid/solid components by mass = "+flame+"%.");
    steps.push("Mixture specific heat of combustion = "+heat+" kJ/g (measured, calculated or scientifically substantiated).");
    let cat;
    if(flame>=85&&heat>=20)cat=1;
    else if((flame>1&&heat<20)||(flame<85&&heat>=20))cat=2;
    else if(flame<=1&&heat<20)cat=3;
    else {
      result.status="requires_review";
      notes.push("The inputs do not match a table row; inspect rounding, flammable component basis and mixture test data.");
      return result;
    }
    result.status="provisional";
    result.category=cat;result.candidate=cat;
    const l=PRESSURE_LABELS[cat];
    result.label="Chemicals Under Pressure — Category "+cat;
    result.outcomes.push({
      id:"chemicals-under-pressure",label:result.label,category:cat,
      hazardCode:l.code,hazardStatement:l.statement,signalWord:l.signal,pictogramSymbols:[...l.symbols],
      status:"provisional",ref:result.ref
    });
    steps.push("HPR 7.21.1(2): "+(cat===1?"≥85% and ≥20 kJ/g":cat===2?"(>1% and <20 kJ/g) OR (<85% and ≥20 kJ/g)":"≤1% and <20 kJ/g")+" ⇒ Category "+cat+".");
    notes.push("Use HPR 3 and GHS Rev.8 Annex 3 for legally required bilingual label elements; codes and wording here are reference previews, not compliant labels.");
    notes.push("Check HPR 7.3.1 / 7.21.1 mutual exclusivity and other applicable independent hazards. Flammable fraction and combustion data require substantiation.");
    return result;
  }

  function convertATE(raw,form){
    if(blank(raw))return {missing:true};
    if(typeof raw==="number"||typeof raw==="string")raw={ate:raw};
    if(typeof raw!=="object")return {invalid:"Unrecognised inhalation ATE data type."};
    if(raw.notAcute===true)return {nonAcute:true};
    const d=INHALATION[form];
    if(!blank(raw.ate)){
      const entered=finite(raw.ate),hours=blank(raw.hours)?4:finite(raw.hours);
      if(!(entered>0))return {invalid:"Inhalation LC50 must be positive."};
      if(hours!==1&&hours!==4)return {invalid:"Exposure must be 1 hour or 4 hours. Other durations need expert conversion."};
      return {ate:hours===1?entered/d.hourDivisor:entered,
        source:hours===1?"One-hour LC50 converted to four hours (÷"+d.hourDivisor+")":"Four-hour LC50",
        entered,hours};
    }
    if(!blank(raw.category)){
      const cat=Number(raw.category);
      if(!Number.isInteger(cat)||cat<1||cat>4)return {invalid:"Inhalation category must be 1–4."};
      return {ate:d.points[cat-1],source:"HPR 8.1.7 Category "+cat+" point estimate",enteredCategory:cat};
    }
    if(!blank(raw.rangeMin)||!blank(raw.rangeMax)){
      const low=finite(raw.rangeMin),high=finite(raw.rangeMax);
      if(!(low>0)||!(high>=low))return {invalid:"Provide a positive LC50 range with minimum ≤ maximum."};
      if(high>d.limits[3])return {invalid:"LC50 range above Category 4 requires expert assessment under HPR 8.1.5."};
      const lowCat=countCategory(low,form),highCat=countCategory(high,form);
      if(lowCat===highCat)return {ate:d.points[lowCat-1],source:"HPR 8.1.7 point estimate for range in Category "+lowCat};
      return {ate:low,source:"HPR 8.1.7(2): lowest range value for range crossing categories"};
    }
    return {missing:true};
  }

  function inhalationResult(input){
    const q=(input&&input.inhalation)||{},items=(input&&Array.isArray(input.ingredients))?input.ingredients:[],
      form=q.form,d=INHALATION[form],outcomes=[],review=[],steps=[],notes=[],missing=[];
    const result={status:"not_assessed",label:"Acute Toxicity (Inhalation)",route:"inhalation",
      ref:"HPR 8.1.1–8.1.7",category:null,ate:null,unit:d&&d.unit,
      form,unknownPct:0,denominator:null,numerator:null,steps,notes,missing,contributions:[],
      outcomes,review,supplementalStatements:[]};
    if(!d){notes.push("Inhalation form not selected; no inhalation classification performed.");return result;}
    const fractionKey=d.basis;
    // Whole-mixture LC50 and applicable bridging evidence take precedence:
    // individual gas volume percentages are only needed for ingredient
    // additivity, never to use a valid HPR 8.1.3 whole-mixture test.
    const ingredientMethod=blank(q.wholeMixtureLC50)&&blank(q.bridgedCategory);
    if(ingredientMethod){
      if(!items.length){result.status="invalid";notes.push("Enter ingredients before inhalation calculation.");return result;}
      const invalidInputs=items.map((item,index)=>{
        const n=finite(item[fractionKey]);
        return n===null||n<0||n>100?
          "Ingredient "+(index+1)+": "+(form==="gas"?"volume % v/v":"mass % w/w")+" must be between 0 and 100.":null;
      }).filter(Boolean);
      if(invalidInputs.length){result.status="invalid";notes.push(...invalidInputs);return result;}
      const total=items.reduce((sum,item)=>sum+Number(item[fractionKey]),0);
      if(Math.abs(total-100)>0.01){
        result.status="invalid";notes.push("Inhalation "+(form==="gas"?"volume":"mass")+
          " percentage total is "+total.toFixed(4)+"%, not 100%.");return result;
      }
    }
    steps.push("Inhalation form: "+d.label+"; "+(ingredientMethod?"ingredient basis: ":"evidence route: ")+
      (form==="gas"?"% v/v for ingredient method":"% w/w for ingredient method")+".");
    if(form==="gas"&&ingredientMethod)
      notes.push("Gas mixture calculations use explicitly entered volume concentrations; mass % is not substituted.");
    // HPR 8.1.3: whole-mixture LC50 data precede HPR 8.1.4 bridging
    // and the HPR 8.1.5–8.1.6 ingredient-based estimation.
    if(!blank(q.wholeMixtureLC50)){
      const measured=convertATE({ate:q.wholeMixtureLC50,hours:q.wholeMixtureHours||4},form);
      if(measured.invalid){result.status="invalid";notes.push(measured.invalid);return result;}
      result.ate=measured.ate;result.category=countCategory(measured.ate,form);
      result.status="whole_mixture_candidate";
      steps.push("HPR 8.1.3: whole-mixture test result takes precedence. "+measured.source+".");
      steps.push("Four-hour mixture LC50 = "+result.ate+" "+d.unit+".");
      review.push("Verify the source, validity and applicability of whole-mixture LC50 data (HPR 8.1.3).");
    }else if(!blank(q.bridgedCategory)){
      const cat=Number(q.bridgedCategory);
      if(!Number.isInteger(cat)||cat<1||cat>4||!String(q.bridgingEvidence||"").trim()){
        result.status="requires_review";
        notes.push("A bridging candidate must have Category 1–4 and a documented scientific basis under HPR 2.3/8.1.4.");
        return result;
      }
      result.category=cat;result.status="bridging_candidate";
      steps.push("HPR 8.1.4: bridging Category "+cat+" entered; basis: "+q.bridgingEvidence+".");
      review.push("Expert-review the applicability of the selected HPR 2.3 bridging principle and supporting tested mixture.");
    }else{
      let denom=0,unknown=0,highATE=false,invalid=false;
      items.forEach((i,index)=>{
        const pct=Number(i[fractionKey]);if(pct<=0)return;
        const raw=i.acute&&i.acute.inhalation;
        const isRelevant=pct>=1 || (raw && typeof raw==="object" && raw.relevantBelow1===true);
        if(!isRelevant)return;
        const converted=convertATE(raw,form);
        if(converted.nonAcute)return;
        if(converted.invalid){invalid=true;notes.push((i.name||"Ingredient "+(index+1))+": "+converted.invalid);return;}
        if(converted.missing){
          unknown+=pct;missing.push({ingredient:i.name||"Ingredient "+(index+1),pct});
          return;
        }
        if(converted.ate>d.limits[3]){
          highATE=true;
          review.push((i.name||"Ingredient "+(index+1))+
          ": LC50 exceeds Category 4 range; its inclusion under HPR 8.1.5 'comparable amplitude' must be assessed.");
          return;
        }
        const term=pct/converted.ate;denom+=term;
        result.contributions.push({ingredient:i.name||"Ingredient "+(index+1),pct,ate:converted.ate,source:converted.source,term});
        if(pct<1)review.push((i.name||"Ingredient "+(index+1))+": included at <1% on stated HPR 2.5 evidence; verify evidence.");
      });
      if(invalid){result.status="invalid";return result;}
      result.unknownPct=unknown;result.denominator=denom;result.numerator=unknown>10?100-unknown:100;
      result.ate=denom>0?result.numerator/denom:null;
      result.category=countCategory(result.ate,form);
      result.status=(missing.length||highATE)?"provisional_incomplete":"ingredient_candidate";
      steps.push(...result.contributions.map(x=>x.ingredient+": "+x.pct+" / "+x.ate+" ("+x.source+") = "+x.term.toPrecision(7)));
      steps.push(...missing.map(x=>x.ingredient+": "+x.pct+"% has unknown inhalation LC50/ATE."));
      steps.push("HPR 8.1."+(unknown>10?"6(b)(ii)":"5 / 8.1.6(b)(i)")+
        ": ATE_mix = "+result.numerator+" / "+denom.toPrecision(7)+
        (result.ate?" = "+result.ate.toPrecision(7)+" "+d.unit:" (not calculable)"));
      if(missing.length||highATE)review.push("Inhalation ingredient data incomplete; calculated candidates do not establish absence of classification or support a compliant label.");
      review.push("Before accepting ingredient method, confirm there is no applicable whole-mixture evidence or HPR 2.3 bridging method (HPR 2.2; 8.1.2–8.1.6).");
      if(result.category&&unknown>=1){
        const disclosure=unknown+"% of the mixture consists of an ingredient or ingredients of unknown acute toxicity.";
        result.supplementalStatements.push({
          route:"inhalation",unknownPct:unknown,english:disclosure,
          status:"bilingual HPR label/SDS review required",
          ref:"HPR 3(1)(e), applied where 8.1.6(b) applies"
        });
      }
    }
    if(result.category){
      steps.push("HPR 8.1.1(3) inhalation "+d.label+": Category "+result.category+".");
      outcomes.push({
        id:"acute-inhalation",label:"Acute Toxicity (Inhalation) — Category "+result.category,
        route:"inhalation",category:result.category,ate:result.ate,unit:d.unit,form,
        status:result.status,ref:result.ref
      });
    }else if(result.ate!==null){
      notes.push("No inhalation Category 1–4 candidate from this pathway; other inhalation mechanisms and other hazards remain unassessed.");
    }
    notes.push("Water-contact release of an acutely toxic gas under HPR 8.1.1(2), 3(1)(f)–(g) is NOT covered by this module.");
    return result;
  }

  function classify(input){
    const scope=evaluateScope(input&&input.scope);
    const pressure=pressureResult(input&&input.chemicalsUnderPressure);
    const inhalation=inhalationResult(input||{});
    const outcomes=[...pressure.outcomes,...inhalation.outcomes];
    const calculations=[];
    if(pressure.status!=="not_assessed")calculations.push({
      route:"chemicals-under-pressure",label:pressure.label,status:pressure.status,
      candidate:pressure.category,ref:pressure.ref,steps:pressure.steps,notes:pressure.notes
    });
    if(inhalation.status!=="not_assessed")calculations.push({
      route:"inhalation",label:inhalation.label,status:inhalation.status,
      candidate:inhalation.category,ate:inhalation.ate,unit:inhalation.unit,ref:inhalation.ref,
      steps:inhalation.steps,notes:inhalation.notes
    });
    const review=[...inhalation.review];
    if(scope.status!=="potentially_in_scope")review.push("Supplier scope: "+scope.reason+" "+scope.notes.join(" "));
    if(pressure.status==="requires_data"||pressure.status==="requires_review")
      review.push("Chemicals Under Pressure: "+pressure.notes.join(" "));
    if(pressure.status==="provisional")review.push("Verify package state, flammable component mass and heat of combustion before accepting Chemicals Under Pressure categorisation.");
    return {scope,pressure,inhalation,outcomes,calculations,review,
      supplementalStatements:[...inhalation.supplementalStatements],
      notAssessed: [
        ...(pressure.status==="not_assessed"?["Chemicals Under Pressure (HPR 7.21)"]:[]),
        ...(inhalation.status==="not_assessed"?["Acute inhalation toxicity (HPR 8.1)"]:[]),
        "Other WHMIS hazard categories and special evidence routes are not assessed by this extension."
      ]};
  }
  return {INHALATION,EXCLUSIONS,PRESSURE_LABELS,countCategory,convertATE,evaluateScope,pressureResult,inhalationResult,classify};
});
