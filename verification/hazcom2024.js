/* US HazCom 2024 — bounded, independent classification screening engine.
 * Legal basis: 29 CFR 1910.1200, Appendices A.1, B.6 and C.4.
 * Not derived from or filtered from EU CLP classification outputs.
 * No complete-US-classification or compliant-US-label claims are made.
 */
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.HazCom2024=factory();
})(typeof self!=="undefined"?self:this,function(){
  "use strict";
  const EPS=1e-9;
  const numeric=x=>x===undefined||x===null||String(x).trim()===""?NaN:Number(x);
  const valid=x=>Number.isFinite(x)&&x>=0;
  const fmt=x=>Number.isFinite(x)?Number(x.toPrecision(6)).toString():String(x);
  const AT=Object.freeze({
    oral:{label:"Oral",unit:"mg/kg",limits:[5,50,300,2000],conv:[0.5,5,100,500],codes:["H300","H300","H301","H302"],statements:["Fatal if swallowed","Fatal if swallowed","Toxic if swallowed","Harmful if swallowed"]},
    dermal:{label:"Dermal",unit:"mg/kg",limits:[50,200,1000,2000],conv:[5,50,300,1100],codes:["H310","H310","H311","H312"],statements:["Fatal in contact with skin","Fatal in contact with skin","Toxic in contact with skin","Harmful in contact with skin"]},
    gas:{label:"Inhalation — gases",unit:"ppmV",limits:[100,500,2500,20000],conv:[10,100,700,4500],codes:["H330","H330","H331","H332"],statements:["Fatal if inhaled","Fatal if inhaled","Toxic if inhaled","Harmful if inhaled"]},
    vapour:{label:"Inhalation — vapours",unit:"mg/L",limits:[0.5,2,10,20],conv:[0.05,0.5,3,11],codes:["H330","H330","H331","H332"],statements:["Fatal if inhaled","Fatal if inhaled","Toxic if inhaled","Harmful if inhaled"]},
    dust_mist:{label:"Inhalation — dust/mist",unit:"mg/L",limits:[0.05,0.5,1,5],conv:[0.005,0.05,0.5,1.5],codes:["H330","H330","H331","H332"],statements:["Fatal if inhaled","Fatal if inhaled","Toxic if inhaled","Harmful if inhaled"]}
  });
  const UNASSESSED=Object.freeze([
    "Skin corrosion/irritation (Appendix A.2)",
    "Serious eye damage/irritation (Appendix A.3)",
    "Respiratory and skin sensitization (Appendix A.4)",
    "Germ cell mutagenicity (Appendix A.5)",
    "Carcinogenicity (Appendix A.6)",
    "Reproductive toxicity (Appendix A.7)",
    "STOT single/repeated exposure (Appendices A.8–A.9)",
    "Aspiration hazard (Appendix A.10)",
    "Flammable gases, aerosols, chemicals under pressure, flammable solids and other physical hazards (Appendix B)",
    "Hazards not otherwise classified (HNOC), combustible dust, simple asphyxiants and hazards of chemical reactions or changes in physical form",
    "Complete OSHA Appendix C labeling and Appendix D SDS preparation"
  ]);
  const outcome=(name,cat,statement,code,basis,extra={})=>({name,category:cat,statement,code,basis,...extra});
  const category=(route,x)=>{for(let j=0;j<4;j++)if(x<=AT[route].limits[j]+EPS)return j+1;return 0;};
  const name=i=>String(i.name||i.cas||"Unnamed ingredient");
  function flammable(mix,warnings){
    const section={id:"flammable",name:"Flammable liquid",source:"29 CFR 1910.1200 Appendix B.6, Table B.6.1; Appendix C.4.19",status:"not-assessed",steps:[],outcomes:[]};
    if(mix.state!=="liquid"){section.status="not-applicable";section.steps.push("Liquid classification does not apply to a "+String(mix.state||"non-liquid")+" mixture. Other physical hazard classes still require assessment.");return section;}
    const fp=numeric(mix.flashPoint),ibp=numeric(mix.ibp);
    if(!Number.isFinite(fp)){section.steps.push("Enter a tested closed-cup flash point for the mixture.");return section;}
    section.steps.push("Mixture flash point: "+fmt(fp)+" °C.");
    let c=0;
    if(fp<23){
      if(!Number.isFinite(ibp)){section.steps.push("Initial boiling point is needed to distinguish Category 1 from Category 2.");return section;}
      c=ibp<=35?1:2;
      section.steps.push("Flash point <23 °C; initial boiling point "+fmt(ibp)+" °C "+(c===1?"≤":">")+" 35 °C.");
    } else if(fp<=60)c=3;
    else if(fp<=93)c=4;
    else{section.status="screened";section.steps.push("Flash point >93 °C: no Flammable Liquid classification under Table B.6.1 from this criterion.");return section;}
    const text=["Extremely flammable liquid and vapor","Highly flammable liquid and vapor","Flammable liquid and vapor","Combustible liquid"];
    const codes=["H224","H225","H226","H227"];
    section.status="screened";
    section.outcomes.push(outcome("Flammable Liquid",c,text[c-1],codes[c-1],section.source,{signal:c<=2?"Danger":"Warning",pictogram:c===4?null:"Flame"}));
    section.steps.push("Category "+c+" under OSHA B.6; Category 4 has no pictogram under C.4.19.");
    return section;
  }
  function acute(mix,warnings){
    const list=[];
    const ingredients=Array.isArray(mix.ingredients)?mix.ingredients:[];
    const inhaledForms=[...new Set(ingredients.filter(i=>i?.acute?.inh&&(i.acute.inh.cat||i.acute.inh.ate)).map(i=>i.acute.inh.form||"vapour"))];
    if(inhaledForms.length>1)warnings.push("Inhalation data use different forms. Evaluate each form and confirm that the form and units apply to the mixture.");
    for(const key of Object.keys(AT)){
      const rule=AT[key],section={id:"acute-"+key,name:"Acute toxicity — "+rule.label,source:"29 CFR 1910.1200 Appendix A.1, Tables A.1.1/A.1.2, sections A.1.3.3 and A.1.3.6",status:"not-assessed",steps:[],outcomes:[]};
      const rows=[];let unknown=0;let unknownNames=[];
      for(const ingredient of ingredients){
        const p=numeric(ingredient.pct);if(!valid(p)||p===0)continue;
        const a=ingredient.acute||{},data=(key==="oral"||key==="dermal")?a[key]:(a.inh&&(a.inh.form||"vapour")===key?a.inh:null);
        if(!data)continue;
        const rawAte=numeric(data.ate),cat=Number(data.cat)||0,hasATE=Number.isFinite(rawAte)&&rawAte>0,hasCat=Number.isInteger(cat)&&cat>=1&&cat<=4;
        if(String(data.ate??"").trim()!==""&&!hasATE)warnings.push(name(ingredient)+": invalid "+rule.label+" ATE; enter a positive number.");
        if(String(data.cat??"").trim()!==""&&!hasCat)warnings.push(name(ingredient)+": invalid "+rule.label+" acute category.");
        if((a.unknown||data.unknown)&&!hasATE&&!hasCat&&p>=1-EPS){unknown+=p;unknownNames.push(name(ingredient));continue;}
        if(!hasATE&&!hasCat)continue;
        const ate=hasATE?rawAte:rule.conv[cat-1],inferred=category(key,ate),source=hasATE?"entered ATE":"Table A.1.2 Category "+cat+" conversion";
        if(hasATE&&hasCat&&cat!==inferred)warnings.push(name(ingredient)+": "+rule.label+" entered ATE/category mismatch; ATE used in screen.");
        // A.1.3.3(a): relevant ingredients are normally >=1%; below 1% can matter,
        // particularly Cat 1 or 2. Conservatively include all known contributions.
        if(p<1)section.steps.push(name(ingredient)+" at "+fmt(p)+"%: included conservatively below 1%; verify relevance under A.1.3.3(a).");
        if(ate>rule.limits[3]&&(key==="oral"||key==="dermal")&&ate>5000){section.steps.push(name(ingredient)+": ATE above 5000 "+rule.unit+"; verify whether inclusion is required.");continue;}
        if(ate>rule.limits[3]&&key!=="oral"&&key!=="dermal")section.steps.push(name(ingredient)+": ATE above Category 4; confirm whether this value is relevant for inhalation screening.");
        rows.push({name:name(ingredient),pct:p,ate,category:hasCat?cat:inferred,source});
      }
      if(unknownNames.length){section.steps.push("Unknown "+rule.label+" toxicity: "+unknownNames.join(", ")+" = "+fmt(unknown)+"% (A.1.3.6.2.3).");warnings.push(rule.label+": "+fmt(unknown)+"% of the mixture consists of ingredient(s) of unknown acute toxicity. Review OSHA Appendix C.3.3 disclosure.");}
      if(!rows.length){section.steps.push(unknown>0?"No usable ATE contributions; unknown-toxicity information requires review.":"No route-specific ingredient ATE/category data entered. Not assessed, not demonstrated non-hazardous.");list.push(section);continue;}
      let denom=0;
      for(const r of rows){const contribution=r.pct/r.ate;denom+=contribution;section.steps.push(r.name+": "+fmt(r.pct)+"% / "+fmt(r.ate)+" "+rule.unit+" ("+r.source+") = "+fmt(contribution));}
      const numerator=unknown>10+EPS?100-unknown:100;
      if(!(denom>0&&numerator>0)){section.status="not-assessed";section.steps.push("Invalid numerator/denominator; review unknown concentrations and supplied data.");list.push(section);continue;}
      const value=numerator/denom;
      let c=category(key,value);
      // A.1.3.3(c): where all converted ingredient category estimates are
      // in the same category, retain that category rather than allowing a
      // conversion point on a category boundary to spuriously upgrade it.
      const allSameConverted=unknown===0&&
        rows.reduce((total,r)=>total+r.pct,0)>=99.999&&
        rows.length>0&&rows.every(r=>
          r.source.startsWith("Table A.1.2")&&r.category===rows[0].category);
      if(allSameConverted&&c!==rows[0].category){
        section.steps.push("A.1.3.3(c): all converted ingredient estimates are Category "+rows[0].category+
          "; use that category rather than the formula-boundary result "+(c||"not classified")+".");
        c=rows[0].category;
      }
      section.status="screened";
      section.ate=value;section.unit=rule.unit;
      section.steps.push("ATE mixture = "+fmt(numerator)+" / "+fmt(denom)+" = "+fmt(value)+" "+rule.unit+".");
      if(unknown>10+EPS)section.steps.push("Numerator corrected for >10% ingredients of unknown "+rule.label+" toxicity (A.1.3.6.2.4).");
      if(c) section.outcomes.push(outcome("Acute Toxicity — "+rule.label,c,rule.statements[c-1],rule.codes[c-1],section.source,{signal:c<=3?"Danger":"Warning",pictogram:c<=3?"Skull and crossbones":"Exclamation mark",ate:value,unit:rule.unit}));
      else section.steps.push("Screened ATE is above Category 4. This alone is not proof that all acute-toxicity obligations have been assessed.");
      const knownCats=rows.map(r=>r.category).filter(c=>c>=1&&c<=4);
      if(knownCats.length===rows.length&&knownCats.length>1&&knownCats.every(c=>c===knownCats[0])&&c!==knownCats[0])warnings.push(rule.label+": all converted ingredients share Category "+knownCats[0]+" but the formula yields "+(c?"Category "+c:"no category")+"; review A.1.3.3(c) before classification.");
      list.push(section);
    }
    return list;
  }
  function classify(mix){
    mix=mix||{};const warnings=[];
    const ing=Array.isArray(mix.ingredients)?mix.ingredients:[];
    let total=0;
    for(const i of ing){const p=numeric(i.pct);if(!valid(p)||p>100){warnings.push(name(i)+": invalid ingredient concentration "+JSON.stringify(i.pct)+".");continue;}total+=p;}
    if(ing.length&&Math.abs(total-100)>0.05)warnings.push("Ingredient concentrations total "+fmt(total)+"%, not 100%; correct the formulation before relying on results.");
    const sections=[flammable(mix,warnings),...acute(mix,warnings)];
    const outcomes=sections.flatMap(x=>x.outcomes);
    warnings.unshift("INITIAL HAZCOM SCREEN ONLY: many US physical/health classes, HNOC, combustible dust, tests/bridging and all Appendix C label elements still need independent assessment.");
    return {jurisdiction:"US",regulation:"OSHA HazCom 2024 (29 CFR 1910.1200)",status:"partial-screen",outcomes,sections,warnings,notAssessed:UNASSESSED.slice(),notRequired:["Aquatic environmental hazards are not classification requirements of OSHA HazCom; other US environmental laws may apply.","EU CLP endocrine disruption / PBT / PMT / ozone categories are not automatically US OSHA HCS classifications."],deadline:"Mixture manufacturer/importer/distributor compliance date: November 19, 2027 (January 2026 extension)."};
  }
  function report(mix,r){
    const lines=[r.regulation+" — INITIAL SCREEN, NOT FINAL CLASSIFICATION",String(mix?.name||"Unnamed mixture"),r.deadline,"", "SCREENED OUTCOMES"];
    for(const o of r.outcomes)lines.push(o.name+" Cat. "+o.category+" — "+o.statement+" ("+o.code+" reference; check Appendix C)");
    if(!r.outcomes.length)lines.push("No positive outcome in the limited supported screens; this is NOT evidence that the mixture is non-hazardous.");
    lines.push("","CALCULATION DETAILS");
    for(const s of r.sections)lines.push(s.name+" ["+s.status+"]",s.source,...s.steps,"");
    lines.push("REQUIRES SEPARATE HAZCOM ASSESSMENT",...r.notAssessed,"","WARNINGS",...r.warnings,"","This is not an OSHA-compliant final label or SDS.");
    return lines.join("\n");
  }
  return Object.freeze({classify,report,AT,UNASSESSED});
});
