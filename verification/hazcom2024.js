/* US HazCom 2024 — bounded, independent classification screening engine.
 * Legal basis: 29 CFR 1910.1200, Appendices A (health, A.1–A.10), B.6 and C.4.
 * Not derived from or filtered from EU CLP classification outputs: it reads the
 * shared ingredient data, never EU results, and never applies EU SCLs or EUH codes.
 * No complete-US-classification or compliant-US-label claims are made.
 */
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.HazCom2024=factory();
})(typeof self!=="undefined"?self:this,function(){
  "use strict";
  const EPS=1e-9;
  const numeric=x=>x===undefined||x===null||String(x).trim()===""?NaN:Number(x);
  // Ingredient concentrations: one number, optionally with a trailing "%" or a decimal comma.
  const pct=x=>numeric(typeof x==="string"?x.trim().replace(/\s*%$/,"").replace(",","."):x);
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
    "Solids which may cause fire through friction (B.7.2.3, classified by analogy, e.g. matches)",
    "Hazards of chemical reactions or changes in physical form during use",
    "Tested-mixture data, bridging principles and weight-of-evidence for every health class (Appendix A, A.0.4 / class-specific sections)",
    "Eye Irritation Category 2B needs ingredient data recorded as 2B; Category 2 ingredients are assessed with the 2A criteria (A.3.2.1.2)",
    "Complete OSHA Appendix C labeling and Appendix D SDS preparation"
  ]);

  /* Appendix A ingredient cut-offs for mixtures, one place, each quoting its table.
     Source: 29 CFR 1910.1200 Appendix A (Mandatory), as amended through 91 FR 566-594
     (Jan. 8, 2026), retrieved from osha.gov on 2026-11-13. verified:true means the value
     was checked against that text; docs/us_hazcom_2024_initial_mode.md quotes each row.
     Re-verify when OSHA amends the standard. */
  const SOURCE=Object.freeze({
    title:"29 CFR 1910.1200 Appendix A — Health Hazard Criteria (Mandatory)",
    url:"https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200AppA",
    amendedThrough:"91 FR 566-594, Jan. 8, 2026 (HazCom 2024: 89 FR 44360, May 20, 2024)",
    retrieved:"2026-11-13"
  });
  const V=(value,unit,basis,label)=>Object.freeze({value,unit,basis,label,verified:true});
  const CUTOFFS=Object.freeze({
    skinCorrosionSum:V(5,"%","A.2.3.3, Table A.2.3","Sum of Skin Category 1 ingredients → Skin Category 1 (sub-categories: 1A sum, else 1A+1B, else 1A+1B+1C, each ≥5 %)"),
    skinCorrosionToIrritation:V(1,"%","A.2.3.3, Table A.2.3","Sum of Skin Category 1 ingredients ≥1 % but <5 % → Skin Category 2"),
    skinIrritationSum:V(10,"%","A.2.3.3, Table A.2.3","Sum of Skin Category 2, or (10 × Skin Category 1) + Skin Category 2 → Skin Category 2"),
    skinNonAdditiveCorrosive:V(1,"%","A.2.3.3.4, Table A.2.4","Additivity not applicable: acid pH ≤2, base pH ≥11.5 or other corrosive ingredient → Category 1"),
    skinNonAdditiveIrritant:V(3,"%","A.2.3.3.4, Table A.2.4","Additivity not applicable: other irritant (Category 2) ingredient, including acids and bases → Category 2"),
    eyeDamageSum:V(3,"%","A.3.3.3, Table A.3.3","Skin Category 1 + Eye Category 1 ingredients (each counted once) → Eye Category 1"),
    eyeDamageToIrritation:V(1,"%","A.3.3.3, Table A.3.3","Skin Category 1 + Eye Category 1 ≥1 % but <3 % → Eye Category 2/2A"),
    eyeIrritationSum:V(10,"%","A.3.3.3, Table A.3.3 and note b","Eye Category 2, or 10 × (Skin 1 + Eye 1) + Eye 2 → Category 2/2A; 2B only if all relevant ingredients are 2B"),
    eyeNonAdditiveSevere:V(1,"%","A.3.3.3.4, Table A.3.4","Additivity not applicable: acid, base, skin corrosive or Eye Category 1 ingredient → Eye Category 1"),
    eyeNonAdditiveIrritant:V(3,"%","A.3.3.3.4, Table A.3.4","Additivity not applicable: other eye irritant (Category 2) → Eye Category 2"),
    respiratorySensitizer:V(0.1,"%","A.4.3.3, Table A.4.5","Respiratory sensitizer Category 1 or Sub-category 1A (solid/liquid and gas)"),
    respiratorySensitizer1B:V(1,"%","A.4.3.3, Table A.4.5","Respiratory sensitizer Sub-category 1B, solid/liquid"),
    respiratorySensitizer1BGas:V(0.2,"%","A.4.3.3, Table A.4.5","Respiratory sensitizer Sub-category 1B, gas"),
    skinSensitizer:V(0.1,"%","A.4.3.3, Table A.4.5","Skin sensitizer Category 1 or Sub-category 1A (all physical states)"),
    skinSensitizer1B:V(1,"%","A.4.3.3, Table A.4.5","Skin sensitizer Sub-category 1B (all physical states)"),
    mutagenCategory1:V(0.1,"%","A.5.3.1.2, Table A.5.1","Category 1A/1B mutagen (w/w; v/v for gases)"),
    mutagenCategory2:V(1,"%","A.5.3.1.2, Table A.5.1","Category 2 mutagen (w/w; v/v for gases)"),
    carcinogenCategory1:V(0.1,"%","A.6.3.1, Table A.6.1","Category 1 carcinogen"),
    carcinogenCategory2:V(0.1,"%","A.6.3.1, Table A.6.1 and note 1","Category 2 carcinogen (0.1 % to <1 %: SDS required, label warning optional)"),
    carcinogenCategory2Label:V(1,"%","A.6.3.1, Table A.6.1 note 1","Category 2 carcinogen: SDS and label required"),
    reproCategory1:V(0.1,"%","A.7.3.1.1, Table A.7.1","Category 1 reproductive toxicant"),
    reproCategory2:V(0.1,"%","A.7.3.1.1, Table A.7.1","Category 2 reproductive toxicant"),
    lactation:V(0.1,"%","A.7.3.1.2, Table A.7.1","Additional category for effects on or via lactation"),
    stotCategory1:V(1,"%","A.8.3.4.1 Table A.8.2; A.9.3.4.1 Table A.9.3","Category 1 target organ toxicant → mixture Category 1 (single and repeated exposure)"),
    stotCategory2:V(1,"%","A.8.3.4.1 Table A.8.2; A.9.3.4.1 Table A.9.3","Category 2 target organ toxicant → mixture Category 2"),
    stotCategory3Sum:V(20,"%","A.8.3.4.5–A.8.3.4.6","Sum of Category 3 ingredients ≥1 %, per effect (may be higher or lower by expert judgment)"),
    aspirationSum:V(10,"%","A.10.3.3.1–A.10.3.3.2.1","Sum of Category 1 ingredients ≥1 %, with kinematic viscosity ≤20.5 mm²/s at 40 °C"),
    aspirationViscosity:V(20.5,"mm²/s at 40 °C","A.10.3.3.2.1","Aspiration: maximum kinematic viscosity")
  });
  const cut=k=>CUTOFFS[k].value;
  const cite=k=>CUTOFFS[k].basis;
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
        const p=pct(ingredient.pct);if(!valid(p)||p===0)continue;
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
  /* ---------------- Appendix A.2–A.10: ingredient-based health classes ----------------
     Reads the shared ingredient fields (skinCorr, eye, sensitizers, CMR, STOT,
     aspiration). Missing data are never treated as "not hazardous". */
  const sum=list=>list.reduce((t,x)=>t+x.p,0);
  const present=mix=>(Array.isArray(mix.ingredients)?mix.ingredients:[]).map(i=>({i,p:pct(i.pct)})).filter(x=>valid(x.p)&&x.p>0);
  const section=(id,label,source)=>({id,name:label,source,status:"screened",steps:[],outcomes:[]});
  const HP="Health hazard",EX="Exclamation mark",CO="Corrosion";
  const ge=(a,b)=>a>=b-EPS;
  const field=(x,k)=>String(x.i[k]===undefined||x.i[k]===null?"":x.i[k]).trim();

  function skinCorrosion(mix){
    const s=section("skin","Skin corrosion/irritation","29 CFR 1910.1200 Appendix A.2, Tables A.2.3–A.2.4; Appendix C");
    const corr=x=>["1","1A","1B","1C"].includes(field(x,"skinCorr")),irr=x=>field(x,"skinCorr")==="2";
    const rel=present(mix).filter(x=>corr(x)||irr(x));
    const add=rel.filter(x=>!x.i.nonAdditive&&ge(x.p,1)),non=rel.filter(x=>x.i.nonAdditive);
    rel.filter(x=>!x.i.nonAdditive&&!ge(x.p,1)).forEach(x=>s.steps.push(name(x.i)+" at "+fmt(x.p)+"% is below the 1% relevance level for additivity; check data for effects at this concentration."));
    const C=sum(add.filter(corr)),I=sum(add.filter(irr));
    let cat=null,sub=null;
    if(add.length)s.steps.push("Σ Category 1 = "+fmt(C)+"%; Σ Category 2 = "+fmt(I)+"%; 10 × Cat 1 + Cat 2 = "+fmt(10*C+I)+"% ("+cite("skinCorrosionSum")+").");
    if(ge(C,cut("skinCorrosionSum"))){
      cat="1";
      // Table A.2.3 note: Σ1A ≥5 % → 1A; else Σ(1A+1B) ≥5 % → 1B; else Σ(1A+1B+1C) ≥5 % → 1C.
      // A relevant Category 1 ingredient without a sub-category → Category 1 without one.
      const subSum=list=>sum(add.filter(x=>list.includes(field(x,"skinCorr"))));
      if(add.some(x=>field(x,"skinCorr")==="1"))sub=null;
      else if(ge(subSum(["1A"]),cut("skinCorrosionSum")))sub="1A";
      else if(ge(subSum(["1A","1B"]),cut("skinCorrosionSum")))sub="1B";
      else sub="1C";
      s.steps.push("Σ Category 1 ≥ "+cut("skinCorrosionSum")+"% → Category 1"+(sub?", Sub-category "+sub+" (Table A.2.3 note: cumulative Σ1A, Σ1A+1B, Σ1A+1B+1C ≥ "+cut("skinCorrosionSum")+"%)":" without sub-category (a relevant ingredient is Category 1 without sub-category; Table A.2.3 note)")+".");
    }else if(ge(C,cut("skinCorrosionToIrritation"))||ge(I,cut("skinIrritationSum"))||ge(10*C+I,cut("skinIrritationSum"))){
      cat="2";s.steps.push("Category 2 threshold met (Table A.2.3).");
    }else if(add.length)s.steps.push("Below the Table A.2.3 thresholds.");
    non.forEach(x=>{
      const c=corr(x),k=c?"skinNonAdditiveCorrosive":"skinNonAdditiveIrritant";
      if(ge(x.p,cut(k))){s.steps.push(name(x.i)+" (additivity not applicable) "+fmt(x.p)+"% ≥ "+cut(k)+"% → Category "+(c?"1":"2")+" ("+cite(k)+").");if(c){cat="1";sub=null;}else if(!cat)cat="2";}
      else s.steps.push(name(x.i)+" (additivity not applicable) "+fmt(x.p)+"% < "+cut(k)+"%.");
    });
    const ph=numeric(mix.pH);
    if(Number.isFinite(ph)&&(ph<=2+EPS||ph>=11.5-EPS)){
      if(mix.pHReserveOk)s.steps.push("Mixture pH "+fmt(ph)+" is extreme, but acid/alkaline reserve data were marked non-corrosive: confirm with test data.");
      else{s.steps.push("Mixture pH "+fmt(ph)+" (≤2 or ≥11.5) → Category 1 in the absence of buffering/test data (Appendix A.2).");if(cat!=="1"){cat="1";sub=null;}}
    }
    if(!rel.length&&!Number.isFinite(ph)){s.status="not-assessed";s.steps.push("No skin corrosion/irritation ingredient data and no mixture pH. Not assessed, not demonstrated non-hazardous.");}
    if(cat==="1")s.outcomes.push(outcome("Skin Corrosion",sub||"1","Causes severe skin burns and eye damage","H314",s.source,{signal:"Danger",pictogram:CO}));
    if(cat==="2")s.outcomes.push(outcome("Skin Irritation",2,"Causes skin irritation","H315",s.source,{signal:"Warning",pictogram:EX}));
    return s;
  }

  function eyeDamage(mix){
    const s=section("eye","Serious eye damage/eye irritation","29 CFR 1910.1200 Appendix A.3, Tables A.3.3–A.3.4; Appendix C");
    const severe=x=>["1","1A","1B","1C"].includes(field(x,"skinCorr"))||field(x,"eye")==="1";
    const irritant=x=>!severe(x)&&["2","2A","2B"].includes(field(x,"eye"));
    const rel=present(mix).filter(x=>severe(x)||irritant(x));
    const add=rel.filter(x=>!x.i.nonAdditive&&ge(x.p,1)),non=rel.filter(x=>x.i.nonAdditive);
    if(rel.some(x=>field(x,"eye")==="2"))s.steps.push("Ingredients recorded as Eye Irritation Category 2 without further categorization use the same criteria as 2A (A.3.2.1.2). Mark an ingredient 2B only where its source says so.");
    const S=sum(add.filter(severe)),E=sum(add.filter(irritant));
    const only2B=add.filter(irritant).length>0&&add.filter(irritant).every(x=>field(x,"eye")==="2B");
    let cat=null;
    if(add.length)s.steps.push("Σ Skin Cat 1 + Eye Cat 1 = "+fmt(S)+"% (each ingredient counted once); Σ eye irritants = "+fmt(E)+"%; 10 × Cat 1 + Cat 2 = "+fmt(10*S+E)+"% ("+cite("eyeDamageSum")+").");
    if(ge(S,cut("eyeDamageSum")))cat="1";
    else if(ge(S,cut("eyeDamageToIrritation"))||ge(E,cut("eyeIrritationSum"))||ge(10*S+E,cut("eyeIrritationSum")))cat=!ge(S,cut("eyeDamageToIrritation"))&&only2B&&ge(E,cut("eyeIrritationSum"))?"2B":"2A";
    else if(add.length)s.steps.push("Below the Table A.3.3 thresholds.");
    non.forEach(x=>{
      const sv=severe(x),k=sv?"eyeNonAdditiveSevere":"eyeNonAdditiveIrritant";
      if(ge(x.p,cut(k))){s.steps.push(name(x.i)+" (additivity not applicable) "+fmt(x.p)+"% ≥ "+cut(k)+"% → "+(sv?"Category 1":"Category 2A")+" ("+cite(k)+").");if(sv)cat="1";else if(!cat||cat==="2B")cat="2A";}
      else s.steps.push(name(x.i)+" (additivity not applicable) "+fmt(x.p)+"% < "+cut(k)+"%.");
    });
    const ph=numeric(mix.pH);
    if(Number.isFinite(ph)&&(ph<=2+EPS||ph>=11.5-EPS)&&!mix.pHReserveOk){s.steps.push("Mixture pH "+fmt(ph)+" (≤2 or ≥11.5) → Category 1 in the absence of buffering/test data (Appendix A.3).");cat="1";}
    if(cat)s.steps.push("Result: Eye Category "+cat+".");
    if(!rel.length&&!Number.isFinite(ph)){s.status="not-assessed";s.steps.push("No eye or skin-corrosion ingredient data and no mixture pH. Not assessed, not demonstrated non-hazardous.");}
    if(cat==="1")s.outcomes.push(outcome("Serious Eye Damage",1,"Causes serious eye damage","H318",s.source,{signal:"Danger",pictogram:CO}));
    if(cat==="2A")s.outcomes.push(outcome("Eye Irritation","2A","Causes serious eye irritation","H319",s.source,{signal:"Warning",pictogram:EX}));
    if(cat==="2B")s.outcomes.push(outcome("Eye Irritation","2B","Causes eye irritation","H320",s.source,{signal:"Warning",pictogram:null}));
    return s;
  }

  // One ingredient at or above its category cut-off classifies the mixture
  // (no summation): Tables A.4.5, A.5.1, A.6.1 and A.7.1.
  function perIngredient(s,list,key,keys,order){
    const hits=[];
    list.forEach(x=>{
      const c=field(x,key);if(!keys[c])return;
      const k=keys[c],ok=ge(x.p,cut(k));
      s.steps.push(name(x.i)+" [Category "+c+"] "+fmt(x.p)+"% "+(ok?"≥":"<")+" "+cut(k)+"% ("+cite(k)+")"+(ok?" → triggers":""));
      if(ok)hits.push({x,c});
    });
    const best=order.find(c=>hits.some(h=>h.c===c));
    return {hits,best};
  }
  // The mixture tables classify a mixture as "Category 1" or "Category 2"; they do not
  // assign sub-categories to mixtures. Ingredient sub-categories are kept for the trail.
  const mixtureCategory=c=>c==="2"?"2":"1";
  const subcategories=hits=>[...new Set(hits.map(h=>h.c))];
  function sensitization(mix){
    const out=[],gas=mix.state==="gas";
    [["respSens","Respiratory sensitization",{"1":"respiratorySensitizer","1A":"respiratorySensitizer","1B":gas?"respiratorySensitizer1BGas":"respiratorySensitizer1B"},"Respiratory Sensitizer","May cause allergy or asthma symptoms or breathing difficulties if inhaled","H334","Danger",HP],
     ["skinSens","Skin sensitization",{"1":"skinSensitizer","1A":"skinSensitizer","1B":"skinSensitizer1B"},"Skin Sensitizer","May cause an allergic skin reaction","H317","Warning",EX]].forEach(([key,label,keys,oname,stmt,code,signal,pic])=>{
      const s=section(key,label,"29 CFR 1910.1200 Appendix A.4.3.3, Table A.4.5; Appendix C.4.6–C.4.7");
      if(key==="respSens")s.steps.push("Mixture physical state: "+(gas?"gas (Sub-category 1B limit 0.2%)":"solid/liquid (Sub-category 1B limit 1.0%)")+".");
      const r=perIngredient(s,present(mix),key,keys,["1A","1","1B"]);
      if(s.steps.length<=(key==="respSens"?1:0)){s.status="not-assessed";s.steps.push("No "+label.toLowerCase()+" ingredient data. Not assessed, not demonstrated non-hazardous.");}
      if(r.best){
        s.steps.push("Mixture classified as Category 1 (Table A.4.5; Appendix C: Category 1 includes sub-categories 1A and 1B).");
        s.outcomes.push(outcome(oname,"1",stmt,code,s.source,{signal,pictogram:pic,ingredientSubcategories:subcategories(r.hits)}));
      }
      out.push(s);
    });
    return out;
  }
  function cmr(mix){
    const list=present(mix),out=[];
    const m=section("muta","Germ cell mutagenicity","29 CFR 1910.1200 Appendix A.5.3.1.2, Table A.5.1; Appendix C.4.8");
    const rm=perIngredient(m,list,"muta",{"1":"mutagenCategory1","1A":"mutagenCategory1","1B":"mutagenCategory1","2":"mutagenCategory2"},["1A","1","1B","2"]);
    if(rm.best)m.outcomes.push(outcome("Germ Cell Mutagenicity",mixtureCategory(rm.best),rm.best==="2"?"Suspected of causing genetic defects":"May cause genetic defects",rm.best==="2"?"H341":"H340",m.source,{signal:rm.best==="2"?"Warning":"Danger",pictogram:HP,ingredientSubcategories:subcategories(rm.hits)}));
    out.push(m);
    const c=section("carc","Carcinogenicity","29 CFR 1910.1200 Appendix A.6.3.1, Table A.6.1 and note; A.6.4; Appendix C.4.9");
    const rc=perIngredient(c,list,"carc",{"1":"carcinogenCategory1","1A":"carcinogenCategory1","1B":"carcinogenCategory1","2":"carcinogenCategory2"},["1A","1","1B","2"]);
    if(rc.best){
      const cat2=rc.best==="2",labelRequired=!cat2||rc.hits.some(h=>h.c==="2"&&ge(h.x.p,cut("carcinogenCategory2Label")));
      if(cat2&&!labelRequired)c.steps.push("Category 2 carcinogen(s) present at 0.1% to <1%: SDS information required; label warning optional ("+cite("carcinogenCategory2Label")+").");
      c.outcomes.push(outcome("Carcinogenicity",mixtureCategory(rc.best),cat2?"Suspected of causing cancer":"May cause cancer",cat2?"H351":"H350",c.source,{signal:cat2?"Warning":"Danger",pictogram:HP,labelRequired,ingredientSubcategories:subcategories(rc.hits)}));
    }
    c.steps.push("A.6.4: a substance listed by the NTP Report on Carcinogens or the IARC Monographs may be treated as a carcinogen; record such ingredients with the corresponding category.");
    out.push(c);
    const r=section("repro","Reproductive toxicity","29 CFR 1910.1200 Appendix A.7.3.1.1, Table A.7.1; Appendix C.4.10");
    const rank={"1A":3,"1":3,"1B":2,"2":1},keys={"1":"reproCategory1","1A":"reproCategory1","1B":"reproCategory1","2":"reproCategory2"};
    const effects={};let best=null;
    [["reproFert","fertility"],["reproDev","development"],["repro","unspecified effect"]].forEach(([k,eff])=>{
      const res=perIngredient(r,list,k,keys,["1A","1","1B","2"]);
      if(res.best){effects[eff]=res.best;if(!best||rank[res.best]>rank[best])best=res.best;}
    });
    if(best){
      const one=best!=="2";
      r.steps.push("Effects triggered: "+Object.entries(effects).map(([e,c])=>e+" Category "+c).join("; ")+". The hazard statement may state the specific effect where known.");
      r.outcomes.push(outcome("Reproductive Toxicity",mixtureCategory(best),one?"May damage fertility or the unborn child":"Suspected of damaging fertility or the unborn child",one?"H360":"H361",r.source,{signal:one?"Danger":"Warning",pictogram:HP,effects}));
    }
    out.push(r);
    const l=section("lact","Effects on or via lactation","29 CFR 1910.1200 Appendix A.7.3.1.2, Table A.7.1; Appendix C.4.10");
    list.filter(x=>x.i.lact).forEach(x=>{const ok=ge(x.p,cut("lactation"));l.steps.push(name(x.i)+" "+fmt(x.p)+"% "+(ok?"≥":"<")+" "+cut("lactation")+"% ("+cite("lactation")+")"+(ok?" → triggers":""));if(ok&&!l.outcomes.length)l.outcomes.push(outcome("Effects on or via Lactation","—","May cause harm to breast-fed children","H362",l.source,{signal:null,pictogram:null}));});
    out.push(l);
    out.filter(x=>!x.steps.length||(x.id==="carc"&&x.steps.length===1)).forEach(x=>{x.status="not-assessed";x.steps.push("No ingredient data for this class. Not assessed, not demonstrated non-hazardous.");});
    return out;
  }
  function stot(mix){
    const list=present(mix),out=[];
    [["stotSE","STOT — single exposure","Specific Target Organ Toxicity, Single Exposure","A.8.3.4, Table A.8.2",["Causes damage to organs","May cause damage to organs"],["H370","H371"]],
     ["stotRE","STOT — repeated exposure","Specific Target Organ Toxicity, Repeated Exposure","A.9.3.4, Table A.9.3",["Causes damage to organs through prolonged or repeated exposure","May cause damage to organs through prolonged or repeated exposure"],["H372","H373"]]].forEach(([key,label,oname,table,stmts,codes])=>{
      const s=section(key,label,"29 CFR 1910.1200 Appendix "+table+"; Appendix C");
      let cat=null;
      list.forEach(x=>{
        const c=field(x,key);
        if(c==="1"){
          if(ge(x.p,cut("stotCategory1"))){cat="1";s.steps.push(name(x.i)+" [Category 1] "+fmt(x.p)+"% ≥ "+cut("stotCategory1")+"% → Category 1 ("+cite("stotCategory1")+").");}
          else s.steps.push(name(x.i)+" [Category 1] "+fmt(x.p)+"% < "+cut("stotCategory1")+"%: below the cut-off; potentiation by other ingredients can still matter (A.8.3.4.4 / A.9.3.4.4).");
        }else if(c==="2"){
          if(ge(x.p,cut("stotCategory2"))){if(!cat)cat="2";s.steps.push(name(x.i)+" [Category 2] "+fmt(x.p)+"% ≥ "+cut("stotCategory2")+"% → Category 2 ("+cite("stotCategory2")+").");}
          else s.steps.push(name(x.i)+" [Category 2] "+fmt(x.p)+"% < "+cut("stotCategory2")+"%.");
        }
      });
      if(cat)s.outcomes.push(outcome(oname,Number(cat),stmts[cat==="1"?0:1],codes[cat==="1"?0:1],s.source,{signal:cat==="1"?"Danger":"Warning",pictogram:HP}));
      if(key==="stotSE"){
        const unspecified=x=>field(x,"stotSE")==="3"&&!x.i.stotSEresp&&!x.i.stotSEnarc;
        const c3=list.filter(x=>(field(x,"stotSE")==="3"||x.i.stotSEresp||x.i.stotSEnarc)&&ge(x.p,1));
        [["stotSEresp","respiratory tract irritation","May cause respiratory irritation","H335"],["stotSEnarc","narcotic effects","May cause drowsiness or dizziness","H336"]].forEach(([flag,eff,stmt,code])=>{
          const members=c3.filter(x=>x.i[flag]||unspecified(x));if(!members.length)return;
          const t=sum(members),ok=ge(t,cut("stotCategory3Sum"));
          s.steps.push("Category 3 ("+eff+"): "+members.map(x=>name(x.i)+" "+fmt(x.p)+"%").join(" + ")+" = "+fmt(t)+"% "+(ok?"≥":"<")+" "+cut("stotCategory3Sum")+"% ("+cite("stotCategory3Sum")+"; expert judgment may apply).");
          if(ok)s.outcomes.push(outcome("Specific Target Organ Toxicity, Single Exposure (Category 3, "+eff+")",3,stmt,code,s.source,{signal:"Warning",pictogram:EX}));
        });
        if(list.some(unspecified))s.steps.push("A Category 3 ingredient without a stated effect is counted for both respiratory irritation and narcotic effects.");
      }
      if(!s.steps.length){s.status="not-assessed";s.steps.push("No ingredient data for this class. Not assessed, not demonstrated non-hazardous.");}
      out.push(s);
    });
    return out;
  }
  function aspiration(mix){
    const s=section("asp","Aspiration hazard","29 CFR 1910.1200 Appendix A.10, A.10.3.3; Appendix C");
    const rel=present(mix).filter(x=>x.i.asp&&ge(x.p,1));
    if(!rel.length){s.status="not-assessed";s.steps.push("No Aspiration Category 1 ingredient at ≥1%. Not assessed, not demonstrated non-hazardous.");return s;}
    const t=sum(rel),v=numeric(mix.viscosity40);
    s.steps.push("Σ Aspiration Category 1 = "+rel.map(x=>name(x.i)+" "+fmt(x.p)+"%").join(" + ")+" = "+fmt(t)+"% ("+cite("aspirationSum")+").");
    if(mix.state==="solid")s.steps.push("Mixture recorded as a solid: aspiration applies to liquids; confirm the physical form.");
    if(!ge(t,cut("aspirationSum"))){s.steps.push("Below "+cut("aspirationSum")+"% → not classified on this basis.");return s;}
    if(!Number.isFinite(v)){s.status="not-assessed";s.steps.push("Σ ≥ "+cut("aspirationSum")+"%: enter the mixture's kinematic viscosity at 40 °C to conclude.");return s;}
    if(v<=cut("aspirationViscosity")+EPS){s.steps.push("Kinematic viscosity "+fmt(v)+" mm²/s ≤ "+cut("aspirationViscosity")+" → Category 1.");s.outcomes.push(outcome("Aspiration Hazard",1,"May be fatal if swallowed and enters airways","H304",s.source,{signal:"Danger",pictogram:HP}));}
    else s.steps.push("Kinematic viscosity "+fmt(v)+" mm²/s > "+cut("aspirationViscosity")+" → not classified.");
    return s;
  }

  /* ---------------- Appendix B physical hazards from mixture test data, and OSHA-defined hazards ----------------
     Inputs: mix.physical (test results and declarations for the mixture as supplied).
     Physical hazards are classified from data on the mixture, not from ingredients.
     Missing data → "not assessed". Criteria quoted from Appendix B / C as retrieved (SOURCE). */
  const PHYS_SOURCE="29 CFR 1910.1200 Appendix B";
  const phys=mix=>mix&&mix.physical&&typeof mix.physical==="object"?mix.physical:{};
  const n=v=>pct(v);
  const has=v=>Number.isFinite(v);
  const choice=v=>String(v===undefined||v===null?"":v).trim();
  const FLAMMABLE_CODES=/\bH(220|221|224|225|226|227|228)\b/i;   // flammable gas, liquid (incl. Cat 4), solid
  // Flammable components (by mass): entered value, else an estimate from ingredient H-codes.
  function flammableComponents(mix,steps){
    const entered=n(phys(mix).flammableComponentsPct);
    if(has(entered)){steps.push("Flammable components (by mass): "+fmt(entered)+"% (entered).");return entered;}
    const list=present(mix);
    if(!list.length||!list.some(x=>String(x.i.hcodes||"").trim())){steps.push("Flammable components: not entered and no ingredient H-codes to estimate from.");return NaN;}
    const flam=list.filter(x=>FLAMMABLE_CODES.test(String(x.i.hcodes||"")));
    const t=sum(flam);
    steps.push("Flammable components (by mass) estimated from ingredient H-codes H220/H221/H224–H228: "+(flam.length?flam.map(x=>name(x.i)+" "+fmt(x.p)+"%").join(" + "):"none")+" = "+fmt(t)+"%. Pyrophoric, self-heating and water-reactive components are not flammable components. Enter a declared value to override.");
    return t;
  }
  const packaging=mix=>choice(phys(mix).packaging);
  function aerosol(mix){
    const s=section("aerosol","Aerosols",PHYS_SOURCE+" B.3.1, Table B.3.1; Appendix C.4.16");
    if(packaging(mix)!=="aerosol"){s.status="not-applicable";s.steps.push("Not packaged as an aerosol dispenser.");return s;}
    const p=phys(mix),fc=flammableComponents(mix,s.steps),hoc=n(p.heatOfCombustion),form=choice(p.aerosolForm);
    if(has(hoc))s.steps.push("Chemical heat of combustion: "+fmt(hoc)+" kJ/g.");
    const considered=(has(fc)&&fc>1+EPS)||(has(hoc)&&ge(hoc,20));
    if(!considered){
      if(has(fc)&&has(hoc)){s.steps.push("≤1% flammable components and heat of combustion <20 kJ/g → Category 3 (Table B.3.1 (2)).");s.outcomes.push(outcome("Aerosol",3,"Pressurized container: may burst if heated","H229",s.source,{signal:"Warning",pictogram:null}));}
      else{s.status="not-assessed";s.steps.push("Enter the flammable components (%) and the chemical heat of combustion to classify.");}
      return s;
    }
    s.steps.push(">1% flammable components or heat of combustion ≥20 kJ/g: Categories 1 or 2 must be considered (B.3.1.2.1).");
    let cat=null;
    if(has(fc)&&ge(fc,85)&&has(hoc)&&ge(hoc,30)){cat=1;s.steps.push("≥85% flammable components and heat of combustion ≥30 kJ/g → Category 1.");}
    const dist=n(p.ignitionDistanceCm),te=n(p.enclosedTimeEquivalent),dd=n(p.enclosedDeflagrationDensity),fh=n(p.foamFlameHeightCm),fd=n(p.foamFlameDurationS);
    const tested=form==="spray"?has(dist)||has(te)||has(dd):form==="foam"?has(fh)&&has(fd):false;
    if(!cat&&!tested){cat=1;s.steps.push("No flammability test results"+(form?" for the "+form+" aerosol":" (spray/foam form not stated)")+": Note 3 to Table B.3.1 → Category 1 by default.");}
    if(!cat&&form==="spray"){
      if(has(dist)&&ge(dist,75)){cat=1;s.steps.push("Ignition distance "+fmt(dist)+" cm ≥75 cm → Category 1.");}
      else if((has(dist)&&ge(dist,15))||(has(te)&&te<=300+EPS)||(has(dd)&&dd<=300+EPS)){cat=2;s.steps.push("Ignition distance ≥15 cm or enclosed space ignition (time equivalent ≤300 s/m³ or deflagration density ≤300 g/m³) → Category 2.");}
      else{cat=3;s.steps.push("Spray aerosol flammability tests negative for Categories 1 and 2 → Category 3.");}
    }
    if(!cat&&form==="foam"){
      if((ge(fh,20)&&ge(fd,2))||(ge(fh,4)&&ge(fd,7))){cat=1;s.steps.push("Foam flame height "+fmt(fh)+" cm, duration "+fmt(fd)+" s → Category 1.");}
      else if(ge(fh,4)&&ge(fd,2)){cat=2;s.steps.push("Foam flame height ≥4 cm and duration ≥2 s → Category 2.");}
      else{cat=3;s.steps.push("Foam flammability test negative for Categories 1 and 2 → Category 3.");}
    }
    const L={1:["Extremely flammable aerosol. Pressurized container: may burst if heated","H222, H229","Danger","Flame"],2:["Flammable aerosol. Pressurized container: may burst if heated","H223, H229","Warning","Flame"],3:["Pressurized container: may burst if heated","H229","Warning",null]}[cat];
    s.outcomes.push(outcome("Aerosol",cat,L[0],L[1],s.source,{signal:L[2],pictogram:L[3]}));
    return s;
  }
  function chemicalUnderPressure(mix){
    const s=section("cup","Chemicals under pressure",PHYS_SOURCE+" B.3.2, Table B.3.2; Appendix C.4.16");
    if(packaging(mix)!=="pressurized"){s.status="not-applicable";s.steps.push("Not a liquid or solid pressurized with a gas in a pressure receptacle (other than an aerosol).");return s;}
    const p=phys(mix),g=n(p.gaugePressureKPa);
    if(has(g)&&g<200-EPS){s.status="not-applicable";s.steps.push("Gauge pressure "+fmt(g)+" kPa at 20 °C is below 200 kPa: not a chemical under pressure (B.3.2.1).");return s;}
    const fc=flammableComponents(mix,s.steps),hoc=n(p.heatOfCombustion);
    if(!has(fc)||!has(hoc)){s.status="not-assessed";s.steps.push("Enter the flammable components (%) and the heat of combustion (kJ/g) to classify.");return s;}
    s.steps.push("Heat of combustion "+fmt(hoc)+" kJ/g.");
    const cat=ge(fc,85)&&ge(hoc,20)?1:fc<=1+EPS&&hoc<20-EPS?3:2;
    s.steps.push("Table B.3.2 → Category "+cat+".");
    const L={1:["Extremely flammable chemical under pressure. May explode if heated","H282","Danger","Flame, Gas cylinder"],2:["Flammable chemical under pressure. May explode if heated","H283","Warning","Flame, Gas cylinder"],3:["Chemical under pressure: may explode if heated","H284","Warning","Gas cylinder"]}[cat];
    s.outcomes.push(outcome("Chemical Under Pressure",cat,L[0],L[1],s.source,{signal:L[2],pictogram:L[3]}));
    return s;
  }
  const isGasProduct=mix=>mix.state==="gas"&&!["aerosol","pressurized"].includes(packaging(mix));
  function flammableGas(mix){
    const s=section("flamGas","Flammable gases",PHYS_SOURCE+" B.2, Table B.2.1; Appendix C.4.15");
    if(!isGasProduct(mix)){s.status="not-applicable";s.steps.push(mix.state==="gas"?"Aerosols and chemicals under pressure are not classified as flammable gases (Table B.2.1 note 1).":"Mixture is not a gas.");return s;}
    const p=phys(mix),flam=choice(p.gasFlammable),lfl=n(p.lflPct),ufl=n(p.uflPct),bv=n(p.burningVelocity),pyro=choice(p.pyrophoricGas),pyroPct=n(p.pyrophoricComponentsPct),unstable=choice(p.unstableGas);
    const range=has(lfl)&&has(ufl);
    if(flam==="no"&&!range){s.steps.push("Not flammable in air at 20 °C and 101.3 kPa (ISO 10156 test or calculation) → not a flammable gas.");return s;}
    if(flam!=="yes"&&!range){s.status="not-assessed";s.steps.push("Enter whether the gas has a flammable range in air (ISO 10156) and, if so, its lower and upper flammability limits.");return s;}
    let cat="2";
    if(range){
      s.steps.push("Flammable range "+fmt(lfl)+"–"+fmt(ufl)+"% in air ("+fmt(ufl-lfl)+" percentage points).");
      if(lfl<=13+EPS||ufl-lfl>=12-EPS){cat="1A";s.steps.push("Ignitable at ≤13% in air or range ≥12 points → meets Category 1A flammability criteria.");}
      else s.steps.push("Flammable range but not ≤13% LFL or ≥12 points → Category 2.");
    }else{cat="1A";s.steps.push("Flammable, but no flammability limits entered: Category 1A by default (Table B.2.1 note 2); enter the limits to refine.");}
    const pyrophoric=pyro==="yes"||(pyro===""&&has(pyroPct)&&pyroPct>1+EPS);
    if(pyro===""&&has(pyroPct)&&pyroPct>1+EPS)s.steps.push("Not tested for pyrophoricity and contains "+fmt(pyroPct)+"% (>1%) pyrophoric components → pyrophoric gas (Table B.2.1 note 4).");
    if(cat==="1A"&&!pyrophoric&&!["A","B"].includes(unstable)&&((has(lfl)&&lfl>6+EPS)||(has(bv)&&bv<10-EPS))){cat="1B";s.steps.push("Not pyrophoric or chemically unstable, and LFL >6% or burning velocity <10 cm/s → Category 1B.");}
    else if(cat==="1A")s.steps.push("Category 1B needs LFL >6% or burning velocity <10 cm/s with no pyrophoricity or chemical instability; otherwise Category 1A (note 2).");
    const statements=[cat==="1B"||cat==="2"?"Flammable gas":"Extremely flammable gas"],codes=[cat==="1A"?"H220":"H221"];
    if(pyrophoric){statements.push("May ignite spontaneously if exposed to air");codes.push("H232");cat="1A";}
    if(unstable==="A"){statements.push("May react explosively even in the absence of air");codes.push("H230");}
    if(unstable==="B"){statements.push("May react explosively even in the absence of air at elevated pressure and/or temperature");codes.push("H231");}
    if(pyro===""&&!has(pyroPct)&&cat!=="2")s.steps.push("Pyrophoricity not recorded: confirm by test, handling experience or pyrophoric-component content (B.2.3.2–B.2.3.3).");
    const label=cat+(pyrophoric?" (pyrophoric gas)":"")+(unstable==="A"||unstable==="B"?" (chemically unstable gas "+unstable+")":"");
    s.outcomes.push(outcome("Flammable Gas",label,statements.join(". "),codes.join(", "),s.source,{signal:cat==="2"?"Warning":"Danger",pictogram:cat==="2"?null:"Flame"}));
    return s;
  }
  function oxidizingGas(mix){
    const s=section("oxGas","Oxidizing gases",PHYS_SOURCE+" B.4, Table B.4.1; Appendix C.4.17");
    if(!isGasProduct(mix)){s.status="not-applicable";s.steps.push("Mixture is not a gas.");return s;}
    const op=n(phys(mix).oxidizingPowerPct);
    if(!has(op)){s.status="not-assessed";s.steps.push("Enter the oxidizing power (ISO 10156) to classify.");return s;}
    if(op>23.5+EPS){s.steps.push("Oxidizing power "+fmt(op)+"% >23.5% → Category 1.");s.outcomes.push(outcome("Oxidizing Gas",1,"May cause or intensify fire; oxidizer","H270",s.source,{signal:"Danger",pictogram:"Flame over circle"}));}
    else s.steps.push("Oxidizing power "+fmt(op)+"% ≤23.5% → not an oxidizing gas.");
    return s;
  }
  function gasUnderPressure(mix){
    const s=section("gasPressure","Gases under pressure",PHYS_SOURCE+" B.5, Table B.5.1; Appendix C.4.18");
    if(!isGasProduct(mix)){s.status="not-applicable";s.steps.push(mix.state==="gas"?"Aerosols and chemicals under pressure are not classified as gases under pressure (Table B.5.1 note).":"Mixture is not a gas.");return s;}
    const p=phys(mix);let group=choice(p.gasGroup);const tc=n(p.criticalTempC);
    if(!group&&has(tc)){group=tc<=-50+EPS?"compressed":tc<=65+EPS?"liquefied_high":"liquefied_low";s.steps.push("Critical temperature "+fmt(tc)+" °C → "+group.replace("_"," ").replace("high","(high pressure)").replace("low","(low pressure)")+" gas, if contained at ≥200 kPa (gauge) at 20 °C or liquefied.");}
    if(!group){s.status="not-assessed";s.steps.push("Select the gas group (compressed, liquefied, refrigerated liquefied, dissolved or not under pressure) or enter the critical temperature.");return s;}
    if(group==="none"){s.steps.push("Not contained at ≥200 kPa (gauge) at 20 °C, and not liquefied → not a gas under pressure.");return s;}
    const names={compressed:"Compressed gas",liquefied_high:"Liquefied gas (high pressure)",liquefied_low:"Liquefied gas (low pressure)",refrigerated:"Refrigerated liquefied gas",dissolved:"Dissolved gas"};
    if(!names[group]){s.status="not-assessed";s.steps.push("Unknown gas group "+JSON.stringify(group)+".");return s;}
    const refr=group==="refrigerated";
    s.steps.push("Group: "+names[group]+" (Table B.5.1).");
    s.outcomes.push(outcome("Gas Under Pressure",names[group],refr?"Contains refrigerated gas; may cause cryogenic burns or injury":"Contains gas under pressure; may explode if heated",refr?"H281":"H280",s.source,{signal:"Warning",pictogram:"Gas cylinder"}));
    return s;
  }
  function corrosiveToMetals(mix){
    const s=section("metals","Corrosive to metals",PHYS_SOURCE+" B.16, Table B.16.1; Appendix C.4.29");
    const p=phys(mix),st=n(p.corrosionSteel),al=n(p.corrosionAluminium);
    if(mix.state==="gas"&&!has(st)&&!has(al)){s.status="not-applicable";s.steps.push("Gas: the UN 37.4 corrosion test applies to liquids and solids that may become liquid.");return s;}
    if(!has(st)&&!has(al)){s.status="not-assessed";s.steps.push("Enter the UN 37.4 corrosion rate at 55 °C on steel and/or aluminium (mm/year).");return s;}
    [["steel",st],["aluminium",al]].forEach(([m,v])=>{if(has(v))s.steps.push("Corrosion rate on "+m+": "+fmt(v)+" mm/year "+(v>6.25+EPS?"> 6.25 → corrosive":"≤ 6.25")+".");});
    if((has(st)&&st>6.25+EPS)||(has(al)&&al>6.25+EPS)){s.outcomes.push(outcome("Corrosive to Metals",1,"May be corrosive to metals","H290",s.source,{signal:"Warning",pictogram:"Corrosion"}));}
    else if(has(st)&&has(al))s.steps.push("Not corrosive on either metal → not classified.");
    else{s.status="not-assessed";s.steps.push("A negative result needs both steel and aluminium (Table B.16.1); one metal was not tested.");}
    return s;
  }
  /* ---- Batch 2: energetic and reactive classes (B.1, B.7–B.15, B.17) ---- */
  const state=mix=>String(mix.state||"liquid");
  const EXPLOSIVE_CODES=/\bH20[0-5]\b/i;
  const containsKnownExplosive=mix=>present(mix).some(x=>EXPLOSIVE_CODES.test(String(x.i.hcodes||"")));
  function explosives(mix){
    const s=section("explosive","Explosives",PHYS_SOURCE+" B.1 (UN Part I test series 1–7); Appendix C.4.14");
    if(state(mix)==="gas"){s.status="not-applicable";s.steps.push("Explosives are solid or liquid chemicals.");return s;}
    const r=choice(phys(mix).explosiveResult);
    const screens={screen_no_groups:"no chemical groups associated with explosive properties (B.1.3.4(a))",screen_oxygen_balance:"explosive groups containing oxygen with calculated oxygen balance < −200 (B.1.3.4(b))",screen_decomposition:"organic: exothermic decomposition energy <500 J/g and onset <500 °C (B.1.3.4(c))",screen_oxidizer:"inorganic oxidizer with organic material below 15 % (Category 1/2 oxidizer) or 30 % (Category 3) (B.1.3.4(d))"};
    if(screens[r]){
      if(containsKnownExplosive(mix)){s.status="not-assessed";s.steps.push("An ingredient is a known explosive (H200–H205): the acceptance procedure is necessary (B.1.3.3); the screening exemption cannot be used.");return s;}
      s.steps.push("Not classified as explosive: "+screens[r]+".");return s;
    }
    if(r==="not_explosive"){s.steps.push("UN acceptance procedure (test series 2–4) or test series 6: not an explosive. If test series 2 was positive, communicate the explosive properties in SDS sections 2 and 9 (B.1.3.1 note 3).");return s;}
    const L={unstable:["Unstable Explosive","Unstable explosive","H200","Danger","Exploding bomb"],"1.1":["Division 1.1","Explosive; mass explosion hazard","H201","Danger","Exploding bomb"],"1.2":["Division 1.2","Explosive; severe projection hazard","H202","Danger","Exploding bomb"],"1.3":["Division 1.3","Explosive; fire, blast or projection hazard","H203","Danger","Exploding bomb"],"1.4":["Division 1.4","Fire or projection hazard","H204","Warning","Exploding bomb (none for 1.4S small arms ammunition)"],"1.5":["Division 1.5","May mass explode in fire","H205","Danger",null],"1.6":["Division 1.6","No hazard statement","—",null,null]}[r];
    if(!L){s.status="not-assessed";s.steps.push(containsKnownExplosive(mix)?"An ingredient is a known explosive (H200–H205): the acceptance procedure is necessary (B.1.3.3).":"Record the screening outcome (B.1.3.4) or the UN test result (unstable explosive or Division 1.1–1.6).");return s;}
    s.steps.push("UN Part I result: "+L[0]+" (B.1.2).");
    s.outcomes.push(outcome("Explosive",r==="unstable"?"Unstable":L[0],L[1],L[2],s.source,{signal:L[3],pictogram:L[4]}));
    return s;
  }
  function desensitizedExplosives(mix){
    const s=section("desensitized","Desensitized explosives",PHYS_SOURCE+" B.17, Table B.17.1; Appendix C.4.30");
    if(state(mix)==="gas"){s.status="not-applicable";s.steps.push("Desensitized explosives are solid or liquid.");return s;}
    const p=phys(mix),d=choice(p.desensitized),ac=n(p.desensBurningRate);
    if(d==="no"){s.steps.push("Not a desensitized explosive: contains no explosives (B.17.3.1(a)) or exothermic decomposition energy <300 J/g (B.17.3.1(b)).");return s;}
    if(d!=="yes"){s.status="not-assessed";s.steps.push("Record whether the chemical is a desensitized (phlegmatized) explosive.");return s;}
    if(!has(ac)){s.status="not-assessed";s.steps.push("Enter the corrected burning rate Ac (UN Part V, 51.4).");return s;}
    if(ac>1200+EPS){s.steps.push("Corrected burning rate "+fmt(ac)+" kg/min >1200: classify as an explosive instead (B.17.2.1).");s.reclassifyAsExplosive=true;return s;}
    const cat=ac>=300-EPS?1:ac>=140-EPS?2:ac>=60-EPS?3:4;
    s.steps.push("Corrected burning rate "+fmt(ac)+" kg/min → Category "+cat+" (Table B.17.1). Not additionally an explosive, flammable liquid or flammable solid (note 3).");
    const st=cat===4?"Fire hazard; increased risk of explosion if desensitizing agent is reduced":"Fire, blast or projection hazard; increased risk of explosion if desensitizing agent is reduced";
    s.outcomes.push(outcome("Desensitized Explosive",cat,st,cat===4?"H208":cat===1?"H206":"H207",s.source,{signal:cat<=2?"Danger":"Warning",pictogram:"Flame"}));
    return s;
  }
  function flammableSolid(mix){
    const s=section("flamSolid","Flammable solids",PHYS_SOURCE+" B.7, Table B.7.1 (UN N.1); Appendix C.4.20");
    if(state(mix)!=="solid"){s.status="not-applicable";s.steps.push("Mixture is not a solid.");return s;}
    if(["aerosol","pressurized"].includes(packaging(mix))){s.status="not-applicable";s.steps.push("Aerosols and chemicals under pressure are not classified as flammable solids (Table B.7.1 note 2).");return s;}
    const p=phys(mix),t=choice(p.flamSolidType);let cat=null;
    if(t==="negative"){s.steps.push("UN N.1 burning rate test: not a flammable solid.");return s;}
    if(t==="metal_powder"){
      const m=n(p.metalBurnMin);
      if(!has(m)){s.status="not-assessed";s.steps.push("Metal powder: enter the time for the reaction to spread over the whole sample (min), or record a negative result.");return s;}
      cat=m<=5+EPS?1:m<=10+EPS?2:null;
      s.steps.push("Metal powder: reaction spreads over the sample in "+fmt(m)+" min → "+(cat?"Category "+cat:"not a flammable solid (>10 min)")+" (B.7.2.2, Table B.7.1).");
    }else if(t==="non_metal"){
      const bt=n(p.burningTimeS),br=n(p.burningRateMmS),w=choice(p.wettedZone);
      if(!has(bt)&&!has(br)){s.status="not-assessed";s.steps.push("Enter the burning time (s) or burning rate (mm/s) from UN N.1.");return s;}
      const positive=(has(bt)&&bt<45-EPS)||(has(br)&&br>2.2+EPS);
      s.steps.push("Burning time "+(has(bt)?fmt(bt)+" s":"not entered")+", burning rate "+(has(br)?fmt(br)+" mm/s":"not entered")+": "+(positive?"<45 s or >2.2 mm/s → flammable solid":"not <45 s and not >2.2 mm/s → not a flammable solid")+" (B.7.2.1).");
      if(positive){
        if(w==="stopped4"){cat=2;s.steps.push("Wetted zone stops the fire for at least 4 min → Category 2.");}
        else{cat=1;s.steps.push(w==="not_stopped"?"Wetted zone does not stop the fire → Category 1.":"Wetted zone result not recorded: Category 1 applies unless the wetted zone stops the fire for at least 4 min (record it to confirm).");}
      }
    }else{s.status="not-assessed";s.steps.push("Record the UN N.1 result: metal powder, other solid, or not a flammable solid.");return s;}
    if(cat)s.outcomes.push(outcome("Flammable Solid",cat,"Flammable solid","H228",s.source,{signal:cat===1?"Danger":"Warning",pictogram:"Flame"}));
    return s;
  }
  const TYPE_LABELS={A:["Heating may cause an explosion","H240","Danger","Exploding bomb"],B:["Heating may cause a fire or explosion","H241","Danger","Exploding bomb, Flame"],C:["Heating may cause a fire","H242","Danger","Flame"],D:["Heating may cause a fire","H242","Danger","Flame"],E:["Heating may cause a fire","H242","Warning","Flame"],F:["Heating may cause a fire","H242","Warning","Flame"],G:["No label elements allocated (Appendix C)","—",null,null]};
  function selfReactive(mix){
    const s=section("selfReactive","Self-reactive chemicals",PHYS_SOURCE+" B.8 (UN Part II test series A–H); Appendix C.4.21");
    if(state(mix)==="gas"){s.status="not-applicable";s.steps.push("Self-reactive chemicals are liquids or solids.");return s;}
    const p=phys(mix),t=choice(p.selfReactiveType),e=n(p.decompositionEnergy),sadt=n(p.sadtC);
    if(t==="exempt"){s.steps.push("Not self-reactive: no explosive or self-reactive groups, SADT >75 °C, or exothermic decomposition energy <300 J/g (B.8.2.1(d)–(e), B.8.3.3).");return s;}
    if(!TYPE_LABELS[t]){
      if(has(e)&&e<300-EPS){s.steps.push("Exothermic decomposition energy "+fmt(e)+" J/g <300 J/g → not self-reactive (B.8.2.1(d)).");return s;}
      if(has(sadt)&&sadt>75+EPS){s.steps.push("SADT "+fmt(sadt)+" °C >75 °C (50 kg package) → not self-reactive (B.8.2.1(e)).");return s;}
      s.status="not-assessed";s.steps.push("Record the screening result or the UN test series A–H result (Type A–G).");return s;
    }
    const L=TYPE_LABELS[t];
    s.steps.push("UN test series A–H: Type "+t+" (B.8.2.3).");
    s.outcomes.push(outcome("Self-Reactive Chemical","Type "+t,L[0],L[1],s.source,{signal:L[2],pictogram:L[3],labelRequired:t!=="G"}));
    return s;
  }
  function pyrophoric(mix){
    const st=state(mix),liquid=st==="liquid";
    const s=section("pyrophoric",liquid?"Pyrophoric liquids":"Pyrophoric solids",PHYS_SOURCE+(liquid?" B.9, Table B.9.1 (UN N.3); Appendix C.4.22":" B.10, Table B.10.1 (UN N.2); Appendix C.4.23"));
    if(st==="gas"){s.status="not-applicable";s.steps.push("Pyrophoric gases are assessed under flammable gases (B.2).");return s;}
    const r=choice(phys(mix).pyrophoric);
    if(r==="yes"){s.steps.push(liquid?"Ignites within 5 min on an inert carrier or ignites/chars filter paper within 5 min → Category 1.":"Ignites within 5 min of contact with air → Category 1.");s.outcomes.push(outcome(liquid?"Pyrophoric Liquid":"Pyrophoric Solid",1,"Catches fire spontaneously if exposed to air","H250",s.source,{signal:"Danger",pictogram:"Flame"}));}
    else if(r==="no")s.steps.push("Tested: does not ignite within 5 min → not pyrophoric.");
    else if(r==="experience")s.steps.push("Experience in production or handling: stable at room temperature for prolonged periods (days) → classification procedure need not be applied ("+(liquid?"B.9.3":"B.10.3")+").");
    else{s.status="not-assessed";s.steps.push("Record the pyrophoricity test result or handling experience.");}
    return s;
  }
  function selfHeating(mix,pyrophoricClassified){
    const s=section("selfHeating","Self-heating chemicals",PHYS_SOURCE+" B.11, Table B.11.1 (UN N.4); Appendix C.4.24");
    if(state(mix)==="gas"){s.status="not-applicable";s.steps.push("Self-heating chemicals are liquids or solids.");return s;}
    if(pyrophoricClassified){s.status="not-applicable";s.steps.push("Classified as pyrophoric: self-heating chemicals are other than pyrophoric liquids or solids (B.11.1).");return s;}
    const p=phys(mix),c25=choice(p.sh25at140),c140=choice(p.sh100at140),c120=choice(p.sh100at120),c100=choice(p.sh100at100),vol=n(p.shUnitVolumeL);
    if(choice(p.selfHeatingScreen)==="exempt"){s.steps.push("Screening test adequately correlated with the classification test shows no self-heating (B.11.3).");return s;}
    if(!c25&&!c140){s.status="not-assessed";s.steps.push("Record the UN N.4 cube test results (25 mm and 100 mm at 140 °C).");return s;}
    if(c25==="pos"){s.steps.push("Positive in the 25 mm cube at 140 °C → Category 1.");s.outcomes.push(outcome("Self-Heating",1,"Self-heating; may catch fire","H251",s.source,{signal:"Danger",pictogram:"Flame"}));return s;}
    if(c140==="neg"){s.steps.push("Negative in the 100 mm cube at 140 °C → not self-heating.");return s;}
    if(c25!=="neg"||c140!=="pos"){s.status="not-assessed";s.steps.push("Category 2 needs a negative 25 mm and a positive 100 mm result at 140 °C; record both.");return s;}
    const a=has(vol)&&vol>3000+EPS,b=c120==="pos"&&has(vol)&&vol>450+EPS,c=c100==="pos";
    if(a||b||c){
      s.steps.push("Negative 25 mm / positive 100 mm at 140 °C, and "+(a?"unit volume >3 m³":b?"positive 100 mm at 120 °C with unit volume >450 L":"positive 100 mm at 100 °C")+" → Category 2.");
      s.outcomes.push(outcome("Self-Heating",2,"Self-heating in large quantities; may catch fire","H252",s.source,{signal:"Warning",pictogram:"Flame"}));
    }else if(!has(vol)&&!c120&&!c100){s.status="not-assessed";s.steps.push("Negative 25 mm / positive 100 mm at 140 °C: enter the unit volume and the 100 mm results at 120 °C and 100 °C to decide Category 2 (Table B.11.1 (a)–(c)).");}
    else s.steps.push("Negative 25 mm / positive 100 mm at 140 °C, but none of Table B.11.1 (a)–(c) is met → not classified.");
    return s;
  }
  function waterReactive(mix){
    const s=section("waterReactive","Chemicals which, in contact with water, emit flammable gases",PHYS_SOURCE+" B.12, Table B.12.1 (UN N.5); Appendix C.4.25");
    if(state(mix)==="gas"){s.status="not-applicable";s.steps.push("This class covers solids and liquids.");return s;}
    const p=phys(mix),scr=choice(p.wrScreen),ign=choice(p.wrIgnition),perMin=n(p.wrRatePerMinute),perHour=n(p.wrRatePerHour);
    const screens={no_metals:"the chemical structure contains no metals or metalloids (B.12.3(a))",experience:"experience shows it does not react with water, e.g. made or washed with water (B.12.3(b))",soluble:"known to dissolve in water to form a stable mixture (B.12.3(c))"};
    if(screens[scr]){s.steps.push("Classification procedure need not be applied: "+screens[scr]+".");return s;}
    if(!ign&&!has(perMin)&&!has(perHour)){s.status="not-assessed";s.steps.push("Record the UN N.5 result: spontaneous ignition, and the flammable gas evolution rates.");return s;}
    let cat=null;
    if(ign==="yes"){cat=1;s.steps.push("Spontaneous ignition in the test → classified; reacts with water and the gas tends to ignite spontaneously → Category 1 (B.12.2.2, Table B.12.1).");}
    else if(has(perMin)&&perMin>=10-EPS){cat=1;s.steps.push("Flammable gas evolution "+fmt(perMin)+" L/kg over one minute ≥10 → Category 1.");}
    else if(has(perHour)&&perHour>=20-EPS){cat=2;s.steps.push("Maximum evolution rate "+fmt(perHour)+" L/kg/h ≥20 → Category 2.");}
    else if(has(perHour)&&perHour>1+EPS){cat=3;s.steps.push("Maximum evolution rate "+fmt(perHour)+" L/kg/h >1 → Category 3.");}
    else if(has(perHour)){s.steps.push("Maximum evolution rate "+fmt(perHour)+" L/kg/h ≤1 and no spontaneous ignition → not classified.");}
    else{s.status="not-assessed";s.steps.push("Enter the maximum flammable gas evolution rate (L/kg/h) to complete the classification.");}
    const L={1:["In contact with water releases flammable gases, which may ignite spontaneously","H260","Danger"],2:["In contact with water releases flammable gas","H261","Danger"],3:["In contact with water releases flammable gas","H261","Warning"]}[cat];
    if(L)s.outcomes.push(outcome("Emits Flammable Gas in Contact with Water",cat,L[0],L[1],s.source,{signal:L[2],pictogram:"Flame"}));
    return s;
  }
  function oxidizer(mix){
    const st=state(mix),liquid=st==="liquid";
    const s=section("oxidizer",liquid?"Oxidizing liquids":"Oxidizing solids",PHYS_SOURCE+(liquid?" B.13, Table B.13.1 (UN O.2); Appendix C.4.26":" B.14, Table B.14.1 (UN O.1 or O.3); Appendix C.4.27"));
    if(st==="gas"){s.status="not-applicable";s.steps.push("Oxidizing gases are assessed under B.4.");return s;}
    const r=choice(phys(mix).oxidizerResult);
    if(r==="exempt"){s.steps.push("Classification procedure not applied: organic chemical without O, F or Cl, or with these bonded only to C or H; or inorganic chemical without oxygen or halogen atoms ("+(liquid?"B.13.3.1–B.13.3.2":"B.14.3.1–B.14.3.2")+").");return s;}
    if(r==="negative"){s.steps.push("Tested: does not meet Category 3 → not an oxidizer. Known handling experience showing oxidizing behaviour takes precedence over test results ("+(liquid?"B.13.3.3":"B.14.3.3")+").");return s;}
    const L={"1":["May cause fire or explosion; strong oxidizer","H271","Danger"],"2":["May intensify fire; oxidizer","H272","Danger"],"3":["May intensify fire; oxidizer","H272","Warning"]}[r];
    if(!L){s.status="not-assessed";s.steps.push("Record the screening outcome or the UN "+(liquid?"O.2":"O.1/O.3")+" category.");return s;}
    s.steps.push("UN "+(liquid?"O.2":"O.1/O.3")+" result: Category "+r+".");
    s.outcomes.push(outcome(liquid?"Oxidizing Liquid":"Oxidizing Solid",Number(r),L[0],L[1],s.source,{signal:L[2],pictogram:"Flame over circle"}));
    return s;
  }
  function organicPeroxide(mix){
    const s=section("organicPeroxide","Organic peroxides",PHYS_SOURCE+" B.15 (UN Part II test series A–H); Appendix C.4.28");
    if(state(mix)==="gas"){s.status="not-applicable";s.steps.push("Organic peroxides are liquids or solids.");return s;}
    const p=phys(mix),t=choice(p.opType),ao=n(p.opAvailableOxygen),h2o2=n(p.opHydrogenPeroxide);
    if(t==="none"){s.steps.push("Contains no organic peroxide (no bivalent –O–O– organic structure).");return s;}
    if(has(ao)){
      const h=has(h2o2)?h2o2:0;
      const exempt=(h<=1+EPS&&ao<=1+EPS)||(h>1+EPS&&h<=7+EPS&&ao<=0.5+EPS);
      s.steps.push("Available oxygen "+fmt(ao)+"%, hydrogen peroxide "+(has(h2o2)?fmt(h2o2)+"%":"not entered (taken as ≤1%)")+".");
      if(exempt){s.steps.push("Not considered for this class: ≤1.0% available oxygen with ≤1.0% H₂O₂, or ≤0.5% with >1.0–7.0% H₂O₂ (B.15.2.1).");return s;}
    }
    if(!TYPE_LABELS[t]){s.status="not-assessed";s.steps.push("Record whether the chemical contains an organic peroxide, its available oxygen, or the UN test series A–H result (Type A–G).");return s;}
    const L=t==="B"?["Heating may cause an explosion","H241","Danger","Exploding bomb, Flame"]:TYPE_LABELS[t];
    s.steps.push("UN test series A–H: Type "+t+" (B.15.2.2)."+(t==="B"?" Appendix C.4.28 prints “Heating may cause an explosion” for Type B; GHS H241 and the self-reactive Type B row read “Heating may cause a fire or explosion” — check the label text.":""));
    s.outcomes.push(outcome("Organic Peroxide","Type "+t,L[0],L[1],s.source,{signal:L[2],pictogram:L[3],labelRequired:t!=="G"}));
    return s;
  }
  // Apply Appendix B's own exclusions between classes.
  function reconcile(list,mix){
    const get=id=>list.find(x=>x.id===id);
    const na=(s,why)=>{if(!s||s.status==="not-applicable")return;s.status="not-applicable";s.outcomes.length=0;s.steps.push(why);};
    const des=get("desensitized"),exp=get("explosive"),op=get("organicPeroxide");
    if(des&&des.reclassifyAsExplosive&&exp&&!exp.outcomes.length){exp.status="not-assessed";exp.steps.push("Desensitized explosive with corrected burning rate >1200 kg/min: assign the explosive division from the UN Part I tests (B.17.2.1).");}
    if(des&&des.outcomes.length){
      na(exp,"Classified as a desensitized explosive: not additionally an explosive (B.17 note 3).");
      na(get("flammable"),"Classified as a desensitized explosive: not additionally a flammable liquid (B.17 note 3).");
      na(get("flamSolid"),"Classified as a desensitized explosive: not additionally a flammable solid (B.17 note 3).");
    }
    if(exp&&exp.outcomes.length)na(get("selfReactive"),"Classified as an explosive: not a self-reactive chemical (B.8.2.1(a)).");
    if(op&&op.outcomes.length)na(get("selfReactive"),"Classified as an organic peroxide: not a self-reactive chemical (B.8.2.1(c)).");
    const ox=get("oxidizer"),sr=get("selfReactive");
    if(ox&&ox.outcomes.length&&sr&&sr.status!=="not-applicable")sr.steps.push("Oxidizers are excluded from self-reactive classification unless the mixture contains ≥5% combustible organic substances (B.8.2.1(b), B.8.2.2).");
  }

  function oshaDefined(mix,outcomesSoFar){
    const out=[],p=phys(mix);
    const sa=section("asphyxiant","Simple asphyxiant","29 CFR 1910.1200(c) definition; Appendix C.4.31");
    const a=choice(p.simpleAsphyxiant);
    if(a==="yes"){sa.steps.push("Recorded as a substance or mixture that displaces oxygen in the ambient atmosphere (1910.1200(c)).");sa.outcomes.push(outcome("Simple Asphyxiant","—","May displace oxygen and cause rapid suffocation","—",sa.source,{signal:"Warning",pictogram:null}));}
    else if(a==="no")sa.steps.push("Recorded as not a simple asphyxiant.");
    else{sa.status="not-assessed";sa.steps.push(mix.state==="gas"?"Gas mixture: record whether it can displace oxygen (e.g. nitrogen, argon, carbon dioxide).":"Record whether the chemical is a simple asphyxiant (usually gases).");}
    out.push(sa);
    const cd=section("dust","Combustible dust","29 CFR 1910.1200(c) definition; Appendix C.4.31 and footnote 2");
    const d=choice(p.combustibleDust);
    if(d==="dust"||d==="may_form"){
      const st=d==="dust"?"May form combustible dust concentrations in air":"May form combustible dust concentrations in air if small particles are generated during further processing, handling or by other means";
      cd.steps.push(d==="dust"?"Shipped in dust form and presents a combustible dust hazard downstream ((f)(1)).":"Not shipped as a dust, but may form combustible dust during processing or handling: label per (f)(4) (C.4.31 note 2).");
      cd.outcomes.push(outcome("Combustible Dust","—",st,"—",cd.source,{signal:"Warning",pictogram:null}));
    }else if(d==="no")cd.steps.push("Recorded as not a combustible dust hazard.");
    else{cd.status=mix.state==="solid"?"not-assessed":"not-applicable";cd.steps.push(mix.state==="solid"?"Solid: record whether it is (or may form) finely divided particulates posing a flash-fire or explosion hazard.":"Not a solid.");}
    out.push(cd);
    const rt=section("respCorr","Corrosive to the respiratory tract","29 CFR 1910.1200 Appendix A.1.2.4 (HazCom 2024)");
    const r=choice(p.respiratoryCorrosive);
    if(r==="lethal"){
      rt.steps.push("Corrosive to the respiratory tract with lethal effect: add the statement and the corrosion pictogram to the acute toxicity label elements (A.1.2.4.1).");
      if(!outcomesSoFar.some(o=>/^Acute Toxicity — Inhalation/.test(o.name)))rt.steps.push("No acute inhalation toxicity classification was calculated: check the inhalation data, since A.1.2.4.1 applies in addition to it.");
      rt.outcomes.push(outcome("Corrosive to the Respiratory Tract","—","Corrosive to the respiratory tract","—",rt.source,{signal:null,pictogram:"Corrosion"}));
    }else if(r==="non_lethal")rt.steps.push("Corrosive to the respiratory tract without lethality: address under STOT (A.8), or under skin/eye classes if STOT data are insufficient (A.1.2.4.2). Record the ingredient STOT/skin/eye data accordingly.");
    else if(r==="no")rt.steps.push("Recorded as not corrosive to the respiratory tract.");
    else{rt.status="not-assessed";rt.steps.push("Record whether data show the mechanism of inhalation toxicity is corrosivity (A.1.2.4).");}
    out.push(rt);
    const hn=section("hnoc","Hazards not otherwise classified (HNOC)","29 CFR 1910.1200(c) definition; (f)(1); Appendix C.2.3.3");
    const lines=String(p.hnoc||"").split(/\n+/).map(x=>x.trim()).filter(Boolean);
    lines.forEach(x=>hn.outcomes.push(outcome("Hazard Not Otherwise Classified","—",x,"—",hn.source,{signal:null,pictogram:null,labelRequired:false})));
    if(lines.length)hn.steps.push(lines.length+" HNOC recorded. Disclose on the SDS; HNOCs need not be on the shipped-container label ((f)(1)); the exclamation mark may be used with the words “Hazard Not Otherwise Classified” or “HNOC” (C.2.3.3).");
    else hn.steps.push("No HNOC recorded. HNOCs are effects identified from scientific evidence that meet no OSHA hazard class (not effects below a cut-off, nor unadopted GHS categories such as acute toxicity Category 5).");
    out.push(hn);
    return out;
  }

  function classify(mix){
    mix=mix||{};const warnings=[];
    const ing=Array.isArray(mix.ingredients)?mix.ingredients:[];
    let total=0;
    for(const i of ing){const p=pct(i.pct);if(!valid(p)||p>100){warnings.push(name(i)+": invalid ingredient concentration "+JSON.stringify(i.pct)+".");continue;}total+=p;}
    if(ing.length&&Math.abs(total-100)>0.05)warnings.push("Ingredient concentrations total "+fmt(total)+"%, not 100%; correct the formulation before relying on results.");
    if(ing.some(i=>i&&i.scl&&Object.values(i.scl).some(v=>v!==""&&v!==null&&v!==undefined)))
      warnings.push("Specific concentration limits entered for EU CLP are not applied in this US screen; Appendix A cut-offs are used. Where data show a hazard below a cut-off, assess it separately.");
    const flam=flammable(mix,warnings);
    if(["aerosol","pressurized"].includes(packaging(mix))&&flam.status!=="not-applicable"){
      flam.status="not-applicable";flam.outcomes.length=0;
      flam.steps.push((packaging(mix)==="aerosol"?"Aerosols":"Chemicals under pressure")+" are not additionally classified as flammable liquids (Table B.3.1 / B.3.2 note 2); see that class instead.");
    }
    const health=[...acute(mix,warnings),skinCorrosion(mix),eyeDamage(mix),...sensitization(mix),...cmr(mix),...stot(mix),aspiration(mix)];
    const pyro=pyrophoric(mix);
    const physicalSections=[explosives(mix),desensitizedExplosives(mix),aerosol(mix),chemicalUnderPressure(mix),flammableGas(mix),oxidizingGas(mix),gasUnderPressure(mix),
      flammableSolid(mix),selfReactive(mix),pyro,selfHeating(mix,pyro.outcomes.length>0),waterReactive(mix),oxidizer(mix),organicPeroxide(mix),corrosiveToMetals(mix)];
    reconcile([flam,...physicalSections],mix);
    const healthOutcomes=health.flatMap(x=>x.outcomes);
    const sections=[flam,...physicalSections,...health,...oshaDefined(mix,healthOutcomes)];
    const outcomes=sections.flatMap(x=>x.outcomes);
    const labelled=outcomes.filter(o=>o.labelRequired!==false);
    const signal=labelled.some(o=>o.signal==="Danger")?"Danger":labelled.some(o=>o.signal==="Warning")?"Warning":null;
    const unverifiedCutoffs=Object.entries(CUTOFFS).filter(([,c])=>!c.verified).map(([id,c])=>({id,label:c.label,value:c.value,unit:c.unit,basis:c.basis}));
    warnings.unshift("PARTIAL HAZCOM SCREEN: health classes A.1–A.10 from ingredient data with the HazCom 2024 cut-offs (Appendix A as amended through "+SOURCE.amendedThrough.split(" (")[0]+"); all Appendix B physical classes from mixture test data and screening outcomes; OSHA-defined hazards as recorded. Tested-mixture health data, bridging and the full Appendix C/D label and SDS content still need independent assessment.");
    if(unverifiedCutoffs.length)warnings.push(unverifiedCutoffs.length+" Appendix A cut-off value(s) used here have not yet been verified against the current 29 CFR 1910.1200 text (see the cut-off list). Treat results as provisional.");
    return {jurisdiction:"US",regulation:"OSHA HazCom 2024 (29 CFR 1910.1200)",status:"partial-screen",source:SOURCE,outcomes,sections,warnings,signal,unverifiedCutoffs,notAssessed:UNASSESSED.slice(),notRequired:["Aquatic environmental hazards are not classification requirements of OSHA HazCom; other US environmental laws may apply.","EU CLP endocrine disruption / PBT / PMT / ozone categories are not automatically US OSHA HCS classifications."],deadline:"Mixture manufacturer/importer/distributor compliance date: November 19, 2027 (January 2026 extension)."};
  }
  function report(mix,r){
    const lines=[r.regulation+" — PARTIAL SCREEN, NOT FINAL CLASSIFICATION",String(mix?.name||"Unnamed mixture"),r.deadline,
      "Rules: "+r.source.title+", as amended through "+r.source.amendedThrough+"; text retrieved "+r.source.retrieved+".","", "SCREENED OUTCOMES"];
    for(const o of r.outcomes)lines.push(o.name+" Cat. "+o.category+" — "+o.statement+" ("+o.code+" reference; check Appendix C)"+(o.labelRequired===false?" [SDS required; label warning optional]":""));
    if(!r.outcomes.length)lines.push("No positive outcome in the limited supported screens; this is NOT evidence that the mixture is non-hazardous.");
    lines.push("Signal word (screen): "+(r.signal||"none"));
    lines.push("","CALCULATION DETAILS");
    for(const s of r.sections)lines.push(s.name+" ["+s.status+"]",s.source,...s.steps,"");
    lines.push("REQUIRES SEPARATE HAZCOM ASSESSMENT",...r.notAssessed,"","WARNINGS",...r.warnings);
    if(r.unverifiedCutoffs&&r.unverifiedCutoffs.length){
      lines.push("","CUT-OFF VALUES NOT YET VERIFIED AGAINST 29 CFR 1910.1200");
      for(const c of r.unverifiedCutoffs)lines.push("- "+c.label+": "+c.value+" "+c.unit+" ["+c.basis+"]");
    }
    lines.push("","This is not an OSHA-compliant final label or SDS.");
    return lines.join("\n");
  }
  return Object.freeze({classify,report,AT,UNASSESSED,CUTOFFS,SOURCE});
});
