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
    "Flammable gases, aerosols, chemicals under pressure, flammable solids and other physical hazards (Appendix B)",
    "Hazards not otherwise classified (HNOC), combustible dust, simple asphyxiants and hazards of chemical reactions or changes in physical form",
    "Tested-mixture data, bridging principles and weight-of-evidence for every health class (Appendix A, A.0.4 / class-specific sections)",
    "Eye Irritation Category 2B from ingredient data: ingredients entered as Eye Irrit. 2 are treated as 2A unless marked 2B",
    "Complete OSHA Appendix C labeling and Appendix D SDS preparation"
  ]);

  /* Appendix A ingredient cut-offs for mixtures, one place, each with its table.
     option: "GHS single value" = GHS gives one value; "OSHA choice" = GHS offers
     alternatives (e.g. 0.1 % / 1.0 %) and OSHA's selection must be confirmed.
     verified:false = transcribed without access to the regulation text in the
     session that wrote it. Confirm each against the current 29 CFR 1910.1200
     Appendix A and set verified:true; unverified values are listed in every result.
     Where OSHA's choice was not certain, the more protective value is used. */
  const CUTOFFS=Object.freeze({
    skinCorrosionSum:{value:5,unit:"%",basis:"A.2, Table A.2.3",option:"GHS single value",verified:false,label:"Skin Category 1 ingredients (sum) → Category 1"},
    skinCorrosionToIrritation:{value:1,unit:"%",basis:"A.2, Table A.2.3",option:"GHS single value",verified:false,label:"Skin Category 1 ingredients (sum) ≥1 % but <5 % → Category 2"},
    skinIrritationSum:{value:10,unit:"%",basis:"A.2, Table A.2.3",option:"GHS single value",verified:false,label:"Skin Category 2 ingredients (sum), or 10 × Cat 1 + Cat 2 → Category 2"},
    skinNonAdditiveCorrosive:{value:1,unit:"%",basis:"A.2, Table A.2.4",option:"GHS single value",verified:false,label:"Additivity not applicable: corrosive ingredient (incl. acids pH ≤2, bases pH ≥11.5) → Category 1"},
    skinNonAdditiveIrritant:{value:3,unit:"%",basis:"A.2, Table A.2.4",option:"GHS single value",verified:false,label:"Additivity not applicable: irritant ingredient → Category 2"},
    eyeDamageSum:{value:3,unit:"%",basis:"A.3, Table A.3.3",option:"GHS single value",verified:false,label:"Skin Cat 1 + Eye Cat 1 ingredients (sum) → Eye Category 1"},
    eyeDamageToIrritation:{value:1,unit:"%",basis:"A.3, Table A.3.3",option:"GHS single value",verified:false,label:"Skin Cat 1 + Eye Cat 1 ingredients (sum) ≥1 % but <3 % → Eye Category 2A"},
    eyeIrritationSum:{value:10,unit:"%",basis:"A.3, Table A.3.3",option:"GHS single value",verified:false,label:"Eye Category 2 ingredients (sum), or 10 × Cat 1 + Cat 2 → Category 2A (2B only if every eye irritant is 2B)"},
    eyeNonAdditiveSevere:{value:1,unit:"%",basis:"A.3, Table A.3.4",option:"GHS single value",verified:false,label:"Additivity not applicable: Eye Cat 1 / corrosive ingredient → Eye Category 1"},
    eyeNonAdditiveIrritant:{value:3,unit:"%",basis:"A.3, Table A.3.4",option:"GHS single value",verified:false,label:"Additivity not applicable: eye irritant → Category 2A"},
    respiratorySensitizer:{value:0.1,unit:"%",basis:"A.4, Table A.4.3",option:"OSHA choice (GHS: 0.1 % or 1.0 %; gases 0.1 % or 0.2 %); more protective value used",verified:false,label:"Respiratory sensitizer Category 1/1A/1B ingredient"},
    skinSensitizer:{value:0.1,unit:"%",basis:"A.4, Table A.4.3",option:"OSHA choice (GHS: 0.1 % or 1.0 % for Category 1 and 1B); more protective value used",verified:false,label:"Skin sensitizer Category 1/1A/1B ingredient"},
    mutagenCategory1:{value:0.1,unit:"%",basis:"A.5, Table A.5.3",option:"GHS single value",verified:false,label:"Germ cell mutagen Category 1A/1B ingredient"},
    mutagenCategory2:{value:1,unit:"%",basis:"A.5, Table A.5.3",option:"GHS single value",verified:false,label:"Germ cell mutagen Category 2 ingredient"},
    carcinogenCategory1:{value:0.1,unit:"%",basis:"A.6, Table A.6.1",option:"GHS single value",verified:false,label:"Carcinogen Category 1A/1B ingredient"},
    carcinogenCategory2:{value:0.1,unit:"%",basis:"A.6, Table A.6.1 and note",option:"OSHA choice (GHS: 0.1 % or 1.0 %); OSHA note: 0.1–<1 % SDS required, label optional; ≥1 % SDS and label",verified:false,label:"Carcinogen Category 2 ingredient (label required from 1 %)"},
    carcinogenCategory2Label:{value:1,unit:"%",basis:"A.6, Table A.6.1 note",option:"OSHA choice",verified:false,label:"Carcinogen Category 2: label warning required"},
    reproCategory1:{value:0.1,unit:"%",basis:"A.7, Table A.7.1",option:"OSHA choice (GHS: 0.1 % or 0.3 %); more protective value used",verified:false,label:"Reproductive toxicant Category 1A/1B ingredient"},
    reproCategory2:{value:0.1,unit:"%",basis:"A.7, Table A.7.1",option:"OSHA choice (GHS: 0.1 % or 3.0 %); more protective value used",verified:false,label:"Reproductive toxicant Category 2 ingredient"},
    lactation:{value:0.1,unit:"%",basis:"A.7, Table A.7.1",option:"OSHA choice (GHS: 0.1 % or 0.3 %); more protective value used",verified:false,label:"Effects on or via lactation ingredient"},
    stotCategory1:{value:10,unit:"%",basis:"A.8 Table A.8.3 / A.9 Table A.9.4",option:"OSHA choice (GHS: 1.0 % or 10 %)",verified:false,label:"STOT Category 1 ingredient → mixture Category 1"},
    stotCategory1ToCategory2:{value:1,unit:"%",basis:"A.8 Table A.8.3 / A.9 Table A.9.4",option:"GHS single value",verified:false,label:"STOT Category 1 ingredient ≥1 % but below the Category 1 limit → Category 2"},
    stotCategory2:{value:1,unit:"%",basis:"A.8 Table A.8.3 / A.9 Table A.9.4",option:"OSHA choice (GHS: 1.0 % or 10 %); more protective value used",verified:false,label:"STOT Category 2 ingredient → Category 2"},
    stotCategory3Sum:{value:20,unit:"%",basis:"A.8.3.4.5",option:"GHS guidance value (may be higher or lower with expert judgment)",verified:false,label:"STOT SE Category 3 ingredients (sum, per effect) → Category 3"},
    aspirationSum:{value:10,unit:"%",basis:"A.10.3.3",option:"GHS single value",verified:false,label:"Aspiration Category 1 ingredients (sum), with kinematic viscosity ≤20.5 mm²/s at 40 °C"},
    aspirationViscosity:{value:20.5,unit:"mm²/s at 40 °C",basis:"A.10.3.3",option:"GHS single value",verified:false,label:"Aspiration: maximum kinematic viscosity"}
  });
  const cut=k=>CUTOFFS[k].value;
  const cite=k=>CUTOFFS[k].basis+(CUTOFFS[k].verified?"":" (value not yet verified)");
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
      cat="1";const subs=[...new Set(add.filter(corr).map(x=>field(x,"skinCorr")))];
      sub=subs.length===1&&subs[0]!=="1"?subs[0]:null;
      s.steps.push("Σ Category 1 ≥ "+cut("skinCorrosionSum")+"% → Category 1"+(sub?" (all corrosive ingredients are Sub-category "+sub+")":"")+".");
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
    if(rel.some(x=>field(x,"eye")==="2"))s.steps.push("Ingredients recorded as Eye Irritation 2 are treated as Category 2A (the more severe sub-category). Mark them 2B only where the source classification says so.");
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
  // (no summation), as in Tables A.4.3, A.5.3, A.6.1 and A.7.1.
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
  function sensitization(mix){
    const out=[];
    [["respSens","Respiratory sensitization","respiratorySensitizer","Respiratory Sensitizer","May cause allergy or asthma symptoms or breathing difficulties if inhaled","H334","Danger",HP],
     ["skinSens","Skin sensitization","skinSensitizer","Skin Sensitizer","May cause an allergic skin reaction","H317","Warning",EX]].forEach(([key,label,k,oname,stmt,code,signal,pic])=>{
      const s=section(key,label,"29 CFR 1910.1200 Appendix A.4, Table A.4.3; Appendix C");
      const r=perIngredient(s,present(mix),key,{"1":k,"1A":k,"1B":k},["1A","1","1B"]);
      if(!s.steps.length){s.status="not-assessed";s.steps.push("No "+label.toLowerCase()+" ingredient data. Not assessed, not demonstrated non-hazardous.");}
      if(r.best)s.outcomes.push(outcome(oname,r.best,stmt,code,s.source,{signal,pictogram:pic}));
      out.push(s);
    });
    return out;
  }
  function cmr(mix){
    const list=present(mix),out=[];
    const m=section("muta","Germ cell mutagenicity","29 CFR 1910.1200 Appendix A.5, Table A.5.3; Appendix C");
    const rm=perIngredient(m,list,"muta",{"1":"mutagenCategory1","1A":"mutagenCategory1","1B":"mutagenCategory1","2":"mutagenCategory2"},["1A","1","1B","2"]);
    if(rm.best)m.outcomes.push(outcome("Germ Cell Mutagenicity",rm.best,rm.best==="2"?"Suspected of causing genetic defects":"May cause genetic defects",rm.best==="2"?"H341":"H340",m.source,{signal:rm.best==="2"?"Warning":"Danger",pictogram:HP}));
    out.push(m);
    const c=section("carc","Carcinogenicity","29 CFR 1910.1200 Appendix A.6, Table A.6.1 and note; Appendix C");
    const rc=perIngredient(c,list,"carc",{"1":"carcinogenCategory1","1A":"carcinogenCategory1","1B":"carcinogenCategory1","2":"carcinogenCategory2"},["1A","1","1B","2"]);
    if(rc.best){
      const cat2=rc.best==="2",labelRequired=!cat2||rc.hits.some(h=>h.c==="2"&&ge(h.x.p,cut("carcinogenCategory2Label")));
      if(cat2&&!labelRequired)c.steps.push("Category 2 carcinogen(s) present at 0.1% to <1%: SDS information required; label warning optional ("+cite("carcinogenCategory2Label")+").");
      c.outcomes.push(outcome("Carcinogenicity",rc.best,cat2?"Suspected of causing cancer":"May cause cancer",cat2?"H351":"H350",c.source,{signal:cat2?"Warning":"Danger",pictogram:HP,labelRequired}));
    }
    out.push(c);
    const r=section("repro","Reproductive toxicity","29 CFR 1910.1200 Appendix A.7, Table A.7.1; Appendix C");
    const rank={"1A":3,"1":3,"1B":2,"2":1},keys={"1":"reproCategory1","1A":"reproCategory1","1B":"reproCategory1","2":"reproCategory2"};
    const effects={};let best=null;
    [["reproFert","fertility"],["reproDev","development"],["repro","unspecified effect"]].forEach(([k,eff])=>{
      const res=perIngredient(r,list,k,keys,["1A","1","1B","2"]);
      if(res.best){effects[eff]=res.best;if(!best||rank[res.best]>rank[best])best=res.best;}
    });
    if(best){
      const one=best!=="2";
      r.steps.push("Effects triggered: "+Object.entries(effects).map(([e,c])=>e+" Category "+c).join("; ")+". The hazard statement may state the specific effect where known.");
      r.outcomes.push(outcome("Reproductive Toxicity",best,one?"May damage fertility or the unborn child":"Suspected of damaging fertility or the unborn child",one?"H360":"H361",r.source,{signal:one?"Danger":"Warning",pictogram:HP,effects}));
    }
    out.push(r);
    const l=section("lact","Effects on or via lactation","29 CFR 1910.1200 Appendix A.7, Table A.7.1; Appendix C");
    list.filter(x=>x.i.lact).forEach(x=>{const ok=ge(x.p,cut("lactation"));l.steps.push(name(x.i)+" "+fmt(x.p)+"% "+(ok?"≥":"<")+" "+cut("lactation")+"% ("+cite("lactation")+")"+(ok?" → triggers":""));if(ok&&!l.outcomes.length)l.outcomes.push(outcome("Effects on or via Lactation","—","May cause harm to breast-fed children","H362",l.source,{signal:null,pictogram:null}));});
    out.push(l);
    out.filter(x=>!x.steps.length).forEach(x=>{x.status="not-assessed";x.steps.push("No ingredient data for this class. Not assessed, not demonstrated non-hazardous.");});
    return out;
  }
  function stot(mix){
    const list=present(mix),out=[];
    [["stotSE","STOT — single exposure","Specific Target Organ Toxicity, Single Exposure","A.8, Table A.8.3",["Causes damage to organs","May cause damage to organs"],["H370","H371"]],
     ["stotRE","STOT — repeated exposure","Specific Target Organ Toxicity, Repeated Exposure","A.9, Table A.9.4",["Causes damage to organs through prolonged or repeated exposure","May cause damage to organs through prolonged or repeated exposure"],["H372","H373"]]].forEach(([key,label,oname,table,stmts,codes])=>{
      const s=section(key,label,"29 CFR 1910.1200 Appendix "+table+"; Appendix C");
      let cat=null;
      list.forEach(x=>{
        const c=field(x,key);
        if(c==="1"){
          if(ge(x.p,cut("stotCategory1"))){cat="1";s.steps.push(name(x.i)+" [Category 1] "+fmt(x.p)+"% ≥ "+cut("stotCategory1")+"% → Category 1 ("+cite("stotCategory1")+").");}
          else if(ge(x.p,cut("stotCategory1ToCategory2"))){if(!cat)cat="2";s.steps.push(name(x.i)+" [Category 1] "+fmt(x.p)+"% ≥ "+cut("stotCategory1ToCategory2")+"% but < "+cut("stotCategory1")+"% → Category 2 ("+cite("stotCategory1ToCategory2")+").");}
          else s.steps.push(name(x.i)+" [Category 1] "+fmt(x.p)+"% < "+cut("stotCategory1ToCategory2")+"%.");
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

  function classify(mix){
    mix=mix||{};const warnings=[];
    const ing=Array.isArray(mix.ingredients)?mix.ingredients:[];
    let total=0;
    for(const i of ing){const p=pct(i.pct);if(!valid(p)||p>100){warnings.push(name(i)+": invalid ingredient concentration "+JSON.stringify(i.pct)+".");continue;}total+=p;}
    if(ing.length&&Math.abs(total-100)>0.05)warnings.push("Ingredient concentrations total "+fmt(total)+"%, not 100%; correct the formulation before relying on results.");
    if(ing.some(i=>i&&i.scl&&Object.values(i.scl).some(v=>v!==""&&v!==null&&v!==undefined)))
      warnings.push("Specific concentration limits entered for EU CLP are not applied in this US screen; Appendix A cut-offs are used. Where data show a hazard below a cut-off, assess it separately.");
    const sections=[flammable(mix,warnings),...acute(mix,warnings),skinCorrosion(mix),eyeDamage(mix),...sensitization(mix),...cmr(mix),...stot(mix),aspiration(mix)];
    const outcomes=sections.flatMap(x=>x.outcomes);
    const labelled=outcomes.filter(o=>o.labelRequired!==false);
    const signal=labelled.some(o=>o.signal==="Danger")?"Danger":labelled.some(o=>o.signal==="Warning")?"Warning":null;
    const unverifiedCutoffs=Object.entries(CUTOFFS).filter(([,c])=>!c.verified).map(([id,c])=>({id,label:c.label,value:c.value,unit:c.unit,basis:c.basis,option:c.option}));
    warnings.unshift("PARTIAL HAZCOM SCREEN: health classes A.1–A.10 and flammable liquids are calculated from ingredient data only. Other physical hazards, HNOC, combustible dust, simple asphyxiants, tested-mixture data, bridging and all Appendix C label elements still need independent assessment.");
    if(unverifiedCutoffs.length)warnings.push(unverifiedCutoffs.length+" Appendix A cut-off value(s) used here have not yet been verified against the current 29 CFR 1910.1200 text (see the cut-off list). Treat results as provisional.");
    return {jurisdiction:"US",regulation:"OSHA HazCom 2024 (29 CFR 1910.1200)",status:"partial-screen",outcomes,sections,warnings,signal,unverifiedCutoffs,notAssessed:UNASSESSED.slice(),notRequired:["Aquatic environmental hazards are not classification requirements of OSHA HazCom; other US environmental laws may apply.","EU CLP endocrine disruption / PBT / PMT / ozone categories are not automatically US OSHA HCS classifications."],deadline:"Mixture manufacturer/importer/distributor compliance date: November 19, 2027 (January 2026 extension)."};
  }
  function report(mix,r){
    const lines=[r.regulation+" — PARTIAL SCREEN, NOT FINAL CLASSIFICATION",String(mix?.name||"Unnamed mixture"),r.deadline,"", "SCREENED OUTCOMES"];
    for(const o of r.outcomes)lines.push(o.name+" Cat. "+o.category+" — "+o.statement+" ("+o.code+" reference; check Appendix C)"+(o.labelRequired===false?" [SDS required; label warning optional]":""));
    if(!r.outcomes.length)lines.push("No positive outcome in the limited supported screens; this is NOT evidence that the mixture is non-hazardous.");
    lines.push("Signal word (screen): "+(r.signal||"none"));
    lines.push("","CALCULATION DETAILS");
    for(const s of r.sections)lines.push(s.name+" ["+s.status+"]",s.source,...s.steps,"");
    lines.push("REQUIRES SEPARATE HAZCOM ASSESSMENT",...r.notAssessed,"","WARNINGS",...r.warnings);
    if(r.unverifiedCutoffs&&r.unverifiedCutoffs.length){
      lines.push("","CUT-OFF VALUES NOT YET VERIFIED AGAINST 29 CFR 1910.1200");
      for(const c of r.unverifiedCutoffs)lines.push("- "+c.label+": "+c.value+" "+c.unit+" ["+c.basis+"; "+c.option+"]");
    }
    lines.push("","This is not an OSHA-compliant final label or SDS.");
    return lines.join("\n");
  }
  return Object.freeze({classify,report,AT,UNASSESSED,CUTOFFS});
});
