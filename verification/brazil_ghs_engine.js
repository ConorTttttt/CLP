/* Brazil — ABNT NBR 14725:2023 (UN GHS Rev. 7) mixture classification pilot.
   A limited, provisional decision-support calculator, NOT a complete Brazilian
   classification, label (rótulo) or FDS (Ficha com Dados de Segurança).

   Legal context: NR-26 (Ministério do Trabalho e Emprego) requires hazardous
   chemicals to be classified, labelled and accompanied by an FDS in accordance
   with ABNT NBR 14725. NBR 14725:2023 (published 2023-07-03) consolidates the
   former parts 1–4 and is based on GHS Rev. 7; mandatory from 2025-07-04.

   The NBR text is a paid ABNT publication and was NOT available when this module
   was written. Thresholds below are implemented from the GHS Rev. 7 mixture
   criteria (ST/SG/AC.10/30/Rev.7). Items whose Brazilian adoption could not be
   confirmed against the NBR text are marked verify:true and reported as review
   items. Jurisdiction-specific logic only: no EU CLP or Canadian WHMIS code is
   reused. */
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.BRAZIL_GHS=factory();
})(typeof self!=="undefined"?self:this,function(){
  "use strict";

  const PROFILE=Object.freeze({
    id:"BR-NBR14725-2023",country:"Brazil",
    regulation:"ABNT NBR 14725:2023 — Produtos químicos: informações sobre segurança, saúde e meio ambiente",
    workplaceLaw:"NR-26 (Sinalização e identificação de segurança)",
    published:"2023-07-03",mandatoryFrom:"2025-07-04",
    ghs:"UN GHS Rev. 7 (ST/SG/AC.10/30/Rev.7)",
    labelLanguage:"Portuguese (pt-BR)",
    buildingBlocks:"All GHS hazard classes and categories, including optional categories "+
      "(Acute Tox. 5, Skin Irrit. 3, Eye Irrit. 2B, Asp. Tox. 2, Aquatic Acute 2/3, Aquatic Chronic 4, Flam. Liq. 4) — verify against NBR 14725:2023",
    sources:[
      "ABNT NBR 14725:2023 (purchase from ABNT: https://www.abntcatalogo.com.br)",
      "UN GHS Rev. 7: https://unece.org/ghs-rev7-2017",
      "NR-26: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes"
    ]});

  /* GHS Rev. 7 Table 3.1.1 upper limits per category and Table 3.1.2 converted
     acute toxicity point estimates. Category 5 is the GHS optional category. */
  const ROUTES=Object.freeze({
    oral:{label:"Oral",unit:"mg/kg bw",limits:[5,50,300,2000,5000],point:[0.5,5,100,500,2500],h:["H300","H300","H301","H302","H303"],ref:"GHS Rev.7 Tables 3.1.1/3.1.2"},
    dermal:{label:"Dermal",unit:"mg/kg bw",limits:[50,200,1000,2000,5000],point:[5,50,300,1100,2500],h:["H310","H310","H311","H312","H313"],ref:"GHS Rev.7 Tables 3.1.1/3.1.2"},
    gas:{label:"Inhalation (gas)",unit:"ppmV",limits:[100,500,2500,20000],point:[10,100,700,4500],h:["H330","H330","H331","H332"],ref:"GHS Rev.7 Tables 3.1.1/3.1.2"},
    vapour:{label:"Inhalation (vapour)",unit:"mg/l",limits:[0.5,2,10,20],point:[0.05,0.5,3,11],h:["H330","H330","H331","H332"],ref:"GHS Rev.7 Tables 3.1.1/3.1.2"},
    dustMist:{label:"Inhalation (dust/mist)",unit:"mg/l",limits:[0.05,0.5,1,5],point:[0.005,0.05,0.5,1.5],h:["H330","H330","H331","H332"],ref:"GHS Rev.7 Tables 3.1.1/3.1.2"}
  });

  /* Generic cut-off values / concentration limits. GHS Rev. 7 offers two
     values for several endpoints (table notes 1 and 2). "lower" applies the
     lower trigger (most protective); "upper" the higher one. The value adopted
     by NBR 14725:2023 must be verified. */
  const CUTOFFS=Object.freeze({
    lower:{skinSens1:0.1,respSens1Solid:0.1,respSens1Gas:0.1,carc2:0.1,repro1:0.1,repro2:0.1,lactation:0.1,stot1:1.0,stot2:1.0},
    upper:{skinSens1:1.0,respSens1Solid:1.0,respSens1Gas:0.2,carc2:1.0,repro1:0.3,repro2:3.0,lactation:0.3,stot1:10,stot2:10}
  });

  /* Hazard communication elements (GHS Rev. 7 Annex 1/3). English reference
     text only; Portuguese label wording must come from NBR 14725:2023. */
  const H_TEXT=Object.freeze({
    H224:"Extremely flammable liquid and vapour",H225:"Highly flammable liquid and vapour",H226:"Flammable liquid and vapour",H227:"Combustible liquid",
    H300:"Fatal if swallowed",H301:"Toxic if swallowed",H302:"Harmful if swallowed",H303:"May be harmful if swallowed",
    H304:"May be fatal if swallowed and enters airways",H305:"May be harmful if swallowed and enters airways",
    H310:"Fatal in contact with skin",H311:"Toxic in contact with skin",H312:"Harmful in contact with skin",H313:"May be harmful in contact with skin",
    H314:"Causes severe skin burns and eye damage",H315:"Causes skin irritation",H316:"Causes mild skin irritation",
    H317:"May cause an allergic skin reaction",H318:"Causes serious eye damage",H319:"Causes serious eye irritation",H320:"Causes eye irritation",
    H330:"Fatal if inhaled",H331:"Toxic if inhaled",H332:"Harmful if inhaled",H333:"May be harmful if inhaled",
    H334:"May cause allergy or asthma symptoms or breathing difficulties if inhaled",
    H335:"May cause respiratory irritation",H336:"May cause drowsiness or dizziness",
    H340:"May cause genetic defects",H341:"Suspected of causing genetic defects",
    H350:"May cause cancer",H351:"Suspected of causing cancer",
    H360:"May damage fertility or the unborn child",H361:"Suspected of damaging fertility or the unborn child",H362:"May cause harm to breast-fed children",
    H370:"Causes damage to organs",H371:"May cause damage to organs",
    H372:"Causes damage to organs through prolonged or repeated exposure",H373:"May cause damage to organs through prolonged or repeated exposure",
    H400:"Very toxic to aquatic life",H401:"Toxic to aquatic life",H402:"Harmful to aquatic life",
    H410:"Very toxic to aquatic life with long lasting effects",H411:"Toxic to aquatic life with long lasting effects",
    H412:"Harmful to aquatic life with long lasting effects",H413:"May cause long lasting harmful effects to aquatic life",
    H420:"Harms public health and the environment by destroying ozone in the upper atmosphere"
  });

  /* Default ingredient categories implied by an H-code. Codes shared by more
     than one category are flagged as ambiguous and default to the more severe. */
  const HCODE_MAP=Object.freeze({
    H300:{field:"acute.oral",value:1,ambiguous:"Acute Tox. 1 or 2"},H301:{field:"acute.oral",value:3},H302:{field:"acute.oral",value:4},H303:{field:"acute.oral",value:5},
    H310:{field:"acute.dermal",value:1,ambiguous:"Acute Tox. 1 or 2"},H311:{field:"acute.dermal",value:3},H312:{field:"acute.dermal",value:4},H313:{field:"acute.dermal",value:5},
    H330:{field:"acute.inhalation",value:1,ambiguous:"Acute Tox. 1 or 2"},H331:{field:"acute.inhalation",value:3},H332:{field:"acute.inhalation",value:4},H333:{field:"acute.inhalation",value:5},
    H314:{field:"skin",value:"1",ambiguous:"Skin Corr. 1A, 1B or 1C"},H315:{field:"skin",value:"2"},H316:{field:"skin",value:"3"},
    H318:{field:"eye",value:"1"},H319:{field:"eye",value:"2A"},H320:{field:"eye",value:"2B"},
    H334:{field:"respSens",value:"1"},H317:{field:"skinSens",value:"1"},
    H340:{field:"mutagen",value:"1B",ambiguous:"Muta. 1A or 1B"},H341:{field:"mutagen",value:"2"},
    H350:{field:"carcinogen",value:"1B",ambiguous:"Carc. 1A or 1B"},H351:{field:"carcinogen",value:"2"},
    H360:{field:"repro",value:"1B",ambiguous:"Repr. 1A or 1B"},H361:{field:"repro",value:"2"},H362:{field:"lactation",value:true},
    H370:{field:"stotSE",value:"1"},H371:{field:"stotSE",value:"2"},H335:{field:"stotSE3Resp",value:true},H336:{field:"stotSE3Narcotic",value:true},
    H372:{field:"stotRE",value:"1"},H373:{field:"stotRE",value:"2"},
    H304:{field:"aspiration",value:"1"},H305:{field:"aspiration",value:"2"},
    H400:{field:"aquaticAcute",value:"1"},H401:{field:"aquaticAcute",value:"2"},H402:{field:"aquaticAcute",value:"3"},
    H410:{field:"aquaticChronic",value:"1"},H411:{field:"aquaticChronic",value:"2"},H412:{field:"aquaticChronic",value:"3"},H413:{field:"aquaticChronic",value:"4"},
    H420:{field:"ozone",value:true}
  });
  const PHYSICAL_HCODE=/^H2\d\d$/;

  const NOT_ASSESSED=Object.freeze([
    "Physical hazards other than flammable liquids (explosives, flammable gases/aerosols/solids, oxidisers, self-reactives, peroxides, corrosive to metals, desensitized explosives, etc.)",
    "Whole-mixture test data and bridging principles (GHS 1.3.2.3; 3.x.3.1–3.x.3.2) — enter as manual classifications after expert review",
    "Acute inhalation Category 5 (no additivity point estimate in GHS Rev. 7 Table 3.1.2)",
    "Specific concentration limits and synergistic/antagonistic effects (GHS 1.3.3.2)",
    "Aquatic classification of tested mixtures and the additivity formula of GHS 4.1.3.5.2",
    "STOT SE Category 3 below the 20 % guidance value without expert judgement",
    "Portuguese (pt-BR) label wording, precautionary statements, label layout/size and the 16-section FDS",
    "Product-scope decisions: sector-specific regimes (e.g. ANVISA-regulated products, pesticides, medicines, cosmetics) and transport (ANTT) classification"
  ]);

  function num(v){if(v===""||v===null||v===undefined)return NaN;const x=Number(v);return Number.isFinite(x)?x:NaN;}
  function str(v){return v===undefined||v===null?"":String(v).trim();}
  function nameOf(i,ix){return str(i&&i.name)||"Ingredient "+(ix+1);}
  function fmt(n){return Number.isFinite(n)?Number(n.toPrecision(6)).toString():"—";}
  const EPS=1e-9;

  /* Merge explicit ingredient fields with H-code defaults. Explicit fields win. */
  function parseHCodes(text){
    const codes=(str(text).toUpperCase().match(/H\d{3}[A-Z]*/g)||[]);
    const base=[...new Set(codes.map(c=>c.slice(0,4)))];
    const out={codes:base,mapped:{},ambiguous:[],physical:[],unknown:[]};
    for(const c of base){
      if(HCODE_MAP[c]){
        const m=HCODE_MAP[c],prev=out.mapped[m.field];
        // keep the most severe default if two codes target one field
        if(prev===undefined||severity(m.field,m.value)>severity(m.field,prev))out.mapped[m.field]=m.value;
        if(m.ambiguous)out.ambiguous.push(c+" → "+m.ambiguous);
      }else if(PHYSICAL_HCODE.test(c))out.physical.push(c);
      else out.unknown.push(c);
    }
    return out;
  }
  function severity(field,v){
    if(typeof v==="boolean")return v?1:0;
    if(typeof v==="number")return 10-v;
    const order={"1":9,"1A":10,"1B":9,"1C":8,"2":5,"2A":5,"2B":4,"3":3,"4":2};
    return order[String(v)]||0;
  }
  function normalise(i,ix,review){
    const h=parseHCodes(i.hcodes);
    const get=(field)=>{
      const parts=field.split(".");let v=i;
      for(const p of parts)v=v&&typeof v==="object"?v[p]:undefined;
      return v;
    };
    const pick=(field)=>{const v=get(field);if(v!==undefined&&v!==null&&v!==""&&v!==false)return v;return h.mapped[field];};
    const nm=nameOf(i,ix);
    if(h.ambiguous.length)review.push(nm+": "+h.ambiguous.join("; ")+" — H-code defaults to the more severe category; set the exact category from the supplier FDS.");
    if(h.physical.length)review.push(nm+": physical H-codes "+h.physical.join(", ")+" are ingredient information only and do not classify the mixture's physical hazards.");
    if(h.unknown.length)review.push(nm+": unrecognised codes "+h.unknown.join(", ")+" ignored.");
    const acute={};
    for(const r of ["oral","dermal"]){
      const raw=(i.acute&&i.acute[r])||{};
      acute[r]={ate:num(raw.ate),category:num(raw.category)||num(h.mapped["acute."+r])||NaN,notAcute:raw.notAcute===true};
    }
    const inh=(i.acute&&i.acute.inhalation)||{};
    acute.inhalation={form:str(inh.form),ate:num(inh.ate),category:num(inh.category)||num(h.mapped["acute.inhalation"])||NaN,
      notAcute:inh.notAcute===true,volumePct:num(inh.volumePct)};
    return {name:nm,pct:num(i.pct),acute,
      skin:str(pick("skin")).toUpperCase(),eye:str(pick("eye")).toUpperCase(),
      nonAdditive:i.nonAdditive===true,acidBase:str(i.acidBase),
      respSens:str(pick("respSens")).toUpperCase(),skinSens:str(pick("skinSens")).toUpperCase(),
      state:str(i.state),
      mutagen:str(pick("mutagen")).toUpperCase(),carcinogen:str(pick("carcinogen")).toUpperCase(),
      repro:str(pick("repro")).toUpperCase(),lactation:pick("lactation")===true,
      stotSE:str(pick("stotSE")),stotSE3Resp:pick("stotSE3Resp")===true,stotSE3Narcotic:pick("stotSE3Narcotic")===true,
      stotRE:str(pick("stotRE")),aspiration:str(pick("aspiration")),
      aquaticAcute:str(pick("aquaticAcute")),aquaticChronic:str(pick("aquaticChronic")),
      mAcute:i.mAcute,mChronic:i.mChronic,ozone:pick("ozone")===true,hcodes:h.codes};
  }

  function acuteCategory(ate,route){
    if(!(ate>0))return null;
    const k=ROUTES[route].limits.findIndex(l=>ate<=l+1e-12);
    return k<0?null:k+1;
  }

  /* GHS Rev. 7 3.1.3.6: additivity formula with the >10 % unknown correction
     (3.1.3.6.2.3). Ingredients ≥1 % are relevant (3.1.3.3). */
  function acuteRoute(ings,route,review){
    const def=ROUTES[route],isInh=["gas","vapour","dustMist"].includes(route);
    const contributions=[],missing=[];let sum=0,unknown=0;
    const maxCat=def.limits.length;
    for(const i of ings){
      if(!(i.pct>0))continue;
      const raw=isInh?i.acute.inhalation:i.acute[route];
      if(isInh&&raw.form&&raw.form!==route)continue;
      if(raw.notAcute)continue;
      let pct=i.pct;
      if(route==="gas"){
        if(!(raw.volumePct>=0)){ if(raw.form==="gas"){review.push(i.name+": gas inhalation additivity needs the gas concentration in % v/v; mass % is not substituted.");missing.push({ingredient:i.name,pct});unknown+=pct;}continue;}
        pct=raw.volumePct;
      }
      if(pct<1-EPS)continue;
      let ate=raw.ate,source="entered ATE";
      if(!(ate>0)&&Number.isInteger(raw.category)&&raw.category>=1){
        if(raw.category<=maxCat){ate=def.point[raw.category-1];source="converted point estimate (Table 3.1.2), Category "+raw.category;}
        else {review.push(i.name+": inhalation Category 5 has no Table 3.1.2 point estimate; treated as unknown for "+def.label+".");}
      }
      if(isInh&&!raw.form&&(ate>0||Number.isInteger(raw.category))){
        // form not stated: cannot assign route; only record once (vapour pass)
        if(route==="vapour")review.push(i.name+": inhalation data entered without gas/vapour/dust-mist form — not used.");
        continue;
      }
      if(ate>0){
        if(ate>def.limits[maxCat-1])continue; // above the highest category: not contributing
        const term=pct/ate;sum+=term;contributions.push({ingredient:i.name,pct,ate,source,term});
      }else if(!isInh||raw.form===route){
        unknown+=pct;missing.push({ingredient:i.name,pct});
      }
    }
    const numerator=unknown>10+EPS?100-unknown:100;
    const ate=sum>0?numerator/sum:null;
    const cat=acuteCategory(ate,route);
    const steps=[...contributions.map(c=>c.ingredient+": "+fmt(c.pct)+" / "+fmt(c.ate)+" = "+fmt(c.term)+"  ("+c.source+")"),
      ...missing.map(m=>m.ingredient+": "+fmt(m.pct)+" % with unknown "+def.label.toLowerCase()+" toxicity"),
      "ATEmix = "+fmt(numerator)+" / "+fmt(sum)+(ate?" = "+fmt(ate)+" "+def.unit:" (no contributing ingredients)")];
    const notes=[];
    if(unknown>10+EPS)notes.push("Unknown acute toxicity >10 %: GHS 3.1.3.6.2.3 corrected formula used.");
    if(unknown>EPS)notes.push("Label/FDS should state that "+fmt(unknown)+" % of the mixture consists of ingredient(s) of unknown acute "+def.label.toLowerCase()+" toxicity (GHS 3.1.3.6.2.2).");
    return {key:"acute-"+route,label:"Acute toxicity — "+def.label,ref:def.ref+"; 3.1.3.6",status:cat?"classified":missing.length?"incomplete":"not classified",
      ate,category:cat,unknownPct:unknown,contributions,missing,steps,notes};
  }

  function sumWhere(ings,pred){return ings.reduce((s,i)=>s+(i.pct>0&&pred(i)?i.pct:0),0);}

  /* GHS Rev. 7 Table 3.2.3 (additive) and 3.2.4 (non-additive). */
  function skinCorrosion(ings,mixture){
    const rel=ings.filter(i=>i.pct>=1-EPS&&!i.nonAdditive);
    const c1=sumWhere(rel,i=>/^1/.test(i.skin)),c2=sumWhere(rel,i=>i.skin==="2"),c3=sumWhere(rel,i=>i.skin==="3");
    const w=10*c1+c2,w3=w+c3;
    const steps=["Σ Skin Cat 1 = "+fmt(c1)+" %","Σ Skin Cat 2 = "+fmt(c2)+" %","Σ Skin Cat 3 = "+fmt(c3)+" %",
      "10×Cat1 + Cat2 = "+fmt(w)+" %","10×Cat1 + Cat2 + Cat3 = "+fmt(w3)+" %"];
    let cat=null;
    if(c1>=5-EPS)cat="1";
    else if(c1>=1-EPS||c2>=10-EPS||w>=10-EPS)cat="2";
    else if(c2>=1-EPS||c3>=10-EPS||w>=1-EPS||w3>=10-EPS)cat="3";
    const na=ings.filter(i=>i.nonAdditive&&i.pct>0);
    for(const i of na){
      if(/^1/.test(i.skin)&&i.pct>=1-EPS){cat="1";steps.push(i.name+": non-additive Skin Cat 1 ≥1 % → Category 1 (Table 3.2.4)");}
      else if((i.skin==="2"||i.skin==="3")&&i.pct>=3-EPS&&(!cat||cat==="3")){cat=i.skin;steps.push(i.name+": non-additive Skin Cat "+i.skin+" ≥3 % → Category "+i.skin+" (Table 3.2.4)");}
    }
    const notes=[];
    if(cat==="1"){
      const subs=new Set(rel.concat(na).filter(i=>/^1/.test(i.skin)).map(i=>i.skin));
      if(subs.size===1&&!subs.has("1"))notes.push("All corrosive ingredients are Sub-category "+[...subs][0]+"; a sub-categorised mixture result requires review.");
    }
    if(Number.isFinite(mixture.pH)&&(mixture.pH<=2||mixture.pH>=11.5))notes.push("Mixture pH "+mixture.pH+" is extreme (≤2 or ≥11.5): consider Skin Corr. 1 unless acid/alkaline reserve or test data justify otherwise (GHS 3.2.2).");
    if(na.length)notes.push("Non-additive ingredients present (acids, bases, inorganic salts, aldehydes, phenols, surfactants…): Table 3.2.4 applied; verify with expert judgement.");
    return {key:"skin",label:"Skin corrosion/irritation",ref:"GHS Rev.7 Tables 3.2.3/3.2.4",status:cat?"classified":"not classified",category:cat,steps,notes};
  }

  /* GHS Rev. 7 Table 3.3.3 (additive) and 3.3.4 (non-additive). */
  function eyeDamage(ings,mixture){
    const rel=ings.filter(i=>i.pct>=1-EPS&&!i.nonAdditive);
    const c1=sumWhere(rel,i=>/^1/.test(i.skin)||i.eye==="1");
    const c2=sumWhere(rel,i=>i.eye==="2"||i.eye==="2A"||i.eye==="2B");
    const c2B=sumWhere(rel,i=>i.eye==="2B");
    const w=10*c1+c2;
    const steps=["Σ Skin Cat 1 + Eye Cat 1 = "+fmt(c1)+" %","Σ Eye Cat 2/2A/2B = "+fmt(c2)+" % (of which 2B: "+fmt(c2B)+" %)","10×(Skin 1 + Eye 1) + Eye 2 = "+fmt(w)+" %"];
    let cat=null;
    if(c1>=3-EPS)cat="1";
    else if(c1>=1-EPS||c2>=10-EPS||w>=10-EPS)cat="2A";
    for(const i of ings.filter(x=>x.nonAdditive&&x.pct>0)){
      if((/^1/.test(i.skin)||i.eye==="1")&&i.pct>=1-EPS){cat="1";steps.push(i.name+": non-additive Eye Cat 1 / Skin Cat 1 ≥1 % → Category 1 (Table 3.3.4)");}
      else if(/^2/.test(i.eye)&&i.pct>=3-EPS&&!cat){cat="2A";steps.push(i.name+": non-additive Eye Cat 2 ≥3 % → Category 2 (Table 3.3.4)");}
    }
    const notes=[];
    // A mixture may be Category 2B when all relevant ingredients are 2B (Table 3.3.3 note).
    if(cat==="2A"&&c1<EPS&&c2>EPS&&Math.abs(c2-c2B)<EPS&&!ings.some(i=>i.nonAdditive&&/^[12]/.test(i.eye))){
      cat="2B";notes.push("All contributing eye irritants are Category 2B → mixture Category 2B (GHS Table 3.3.3 note).");
    }
    if(Number.isFinite(mixture.pH)&&(mixture.pH<=2||mixture.pH>=11.5))notes.push("Mixture pH "+mixture.pH+" is extreme: consider Eye Dam. 1 unless acid/alkaline reserve or test data justify otherwise (GHS 3.3.2).");
    return {key:"eye",label:"Serious eye damage/eye irritation",ref:"GHS Rev.7 Tables 3.3.3/3.3.4",status:cat?"classified":"not classified",category:cat,steps,notes};
  }

  /* Threshold hazards: ingredients individually at/above a generic cut-off. */
  function thresholdResult(key,label,ref,ings,rules){
    const steps=[],hits=[];let cat=null;
    for(const r of rules){
      for(const i of ings){
        if(!(i.pct>0)||!r.match(i))continue;
        if(r.below!==undefined&&i.pct>=r.below-EPS)continue; // banded rule outside its band
        const lim=typeof r.limit==="function"?r.limit(i):r.limit;
        const hit=i.pct>=lim-EPS;
        steps.push(i.name+": "+r.text+" at "+fmt(i.pct)+" % "+(hit?"≥":"<")+" "+fmt(lim)+" %"+(r.below!==undefined?" (and <"+fmt(r.below)+" %)":"")+(hit?" → Category "+r.cat:""));
        if(hit){hits.push({ingredient:i.name,cat:r.cat});if(!cat||rank(r.cat)>rank(cat))cat=r.cat;}
      }
    }
    return {key,label,ref,status:cat?"classified":"not classified",category:cat,hits,steps,notes:[]};
  }
  function rank(c){return {"1":9,"1A":10,"1B":9,"2":5,"3":3}[c]||0;}

  function sensitisation(ings,cut,review){
    const isGas=i=>i.state==="gas";
    const resp=thresholdResult("respSens","Respiratory sensitisation","GHS Rev.7 Table 3.4.5",ings,[
      {match:i=>i.respSens==="1A",limit:0.1,cat:"1",text:"Resp. Sens. 1A"},
      {match:i=>i.respSens==="1B",limit:i=>isGas(i)?0.2:1.0,cat:"1",text:"Resp. Sens. 1B"},
      {match:i=>i.respSens==="1",limit:i=>isGas(i)?cut.respSens1Gas:cut.respSens1Solid,cat:"1",text:"Resp. Sens. 1"}]);
    const skin=thresholdResult("skinSens","Skin sensitisation","GHS Rev.7 Table 3.4.5",ings,[
      {match:i=>i.skinSens==="1A",limit:0.1,cat:"1",text:"Skin Sens. 1A"},
      {match:i=>i.skinSens==="1B",limit:1.0,cat:"1",text:"Skin Sens. 1B"},
      {match:i=>i.skinSens==="1",limit:cut.skinSens1,cat:"1",text:"Skin Sens. 1"}]);
    for(const i of ings){
      if(i.respSens&&!i.state)review.push(i.name+": respiratory sensitiser without physical state — solid/liquid cut-off applied; gases use different limits.");
      if(/^1/.test(i.skinSens)&&i.pct>=0.1-EPS&&!skin.hits.some(h=>h.ingredient===i.name))
        skin.notes.push(i.name+": sensitiser at "+fmt(i.pct)+" % is below the classification limit but ≥0.1 % — FDS information expected (GHS Table 3.4.5 note).");
    }
    return [resp,skin];
  }

  function cmr(ings,cut){
    const muta=thresholdResult("mutagen","Germ cell mutagenicity","GHS Rev.7 Table 3.5.1",ings,[
      {match:i=>/^1/.test(i.mutagen),limit:0.1,cat:"1",text:"Muta. 1A/1B"},
      {match:i=>i.mutagen==="2",limit:1.0,cat:"2",text:"Muta. 2"}]);
    const carc=thresholdResult("carcinogen","Carcinogenicity","GHS Rev.7 Table 3.6.1",ings,[
      {match:i=>/^1/.test(i.carcinogen),limit:0.1,cat:"1",text:"Carc. 1A/1B"},
      {match:i=>i.carcinogen==="2",limit:cut.carc2,cat:"2",text:"Carc. 2"}]);
    const repro=thresholdResult("repro","Reproductive toxicity","GHS Rev.7 Table 3.7.1",ings,[
      {match:i=>/^1/.test(i.repro),limit:cut.repro1,cat:"1",text:"Repr. 1A/1B"},
      {match:i=>i.repro==="2",limit:cut.repro2,cat:"2",text:"Repr. 2"}]);
    const lact=thresholdResult("lactation","Reproductive toxicity — effects on or via lactation","GHS Rev.7 Table 3.7.1",ings,[
      {match:i=>i.lactation,limit:cut.lactation,cat:"L",text:"Lact."}]);
    for(const r of [muta,carc,repro]){
      // 1A/1B distinction for the mixture follows the ingredient sub-category
      const subs=new Set(ings.filter(i=>r.hits.some(h=>h.ingredient===i.name&&h.cat==="1")).map(i=>i[r.key]));
      if(r.category==="1")r.subcategory=subs.has("1A")?"1A":"1B";
    }
    return [muta,carc,repro,lact];
  }

  function stot(ings,cut){
    const rulesFor=(field,label)=>{
      const rules=[{match:i=>i[field]==="1",limit:cut.stot1,cat:"1",text:label+" 1"}];
      if(cut.stot1>1.0+EPS)rules.push({match:i=>i[field]==="1",limit:1.0,below:cut.stot1,cat:"2",text:label+" 1 between 1.0 and 10 %"});
      rules.push({match:i=>i[field]==="2",limit:cut.stot2,cat:"2",text:label+" 2"});
      return rules;
    };
    const se=thresholdResult("stotSE","STOT — single exposure (Cat 1/2)","GHS Rev.7 Table 3.8.3",ings,rulesFor("stotSE","STOT SE"));
    const re=thresholdResult("stotRE","STOT — repeated exposure","GHS Rev.7 Table 3.9.4",ings,rulesFor("stotRE","STOT RE"));
    const out=[se,re];
    for(const [field,label,h] of [["stotSE3Resp","respiratory tract irritation","H335"],["stotSE3Narcotic","narcotic effects","H336"]]){
      const s=sumWhere(ings.filter(i=>i.pct>=1-EPS),i=>i[field]);
      const cat=s>=20-EPS?"3":null;
      out.push({key:field,label:"STOT SE Category 3 — "+label,ref:"GHS Rev.7 3.8.3.4.5",status:cat?"classified":"not classified",
        category:cat,hcode:h,steps:["Σ ingredients with "+label+" = "+fmt(s)+" % (guidance value 20 %)"],
        notes:s>EPS&&!cat?["Below the 20 % guidance value: expert judgement may still classify (GHS 3.8.3.4.5)."]:cat?["Classified using the 20 % guidance value; expert judgement required."]:[]});
    }
    return out;
  }

  /* GHS Rev. 7 3.10.3.3. */
  function aspiration(ings,mixture){
    const c1=sumWhere(ings,i=>i.aspiration==="1"),c2=sumWhere(ings,i=>i.aspiration==="2");
    const v=mixture.viscosity40;
    const steps=["Σ Asp. Tox. 1 = "+fmt(c1)+" %","Σ Asp. Tox. 2 = "+fmt(c2)+" %","Kinematic viscosity at 40 °C = "+(Number.isFinite(v)?fmt(v)+" mm²/s":"not entered")];
    let cat=null,status="not classified";const notes=[];
    if(c1>=10-EPS||c1+c2>=10-EPS){
      if(!Number.isFinite(v)){status="incomplete";notes.push("Aspiration ingredients ≥10 %: enter kinematic viscosity at 40 °C to decide.");}
      else if(c1>=10-EPS&&v<=20.5+EPS)cat="1";
      else if(c1+c2>=10-EPS&&v<=14+EPS){cat="2";if(c2<10-EPS)notes.push("Category 2 reached only by combining Cat 1 and Cat 2 ingredients: verify.");}
    }
    if(mixture.state&&mixture.state!=="liquid"&&cat){notes.push("Aspiration criteria concern liquids; review for a "+mixture.state+".");}
    if(cat)status="classified";
    return {key:"aspiration",label:"Aspiration hazard",ref:"GHS Rev.7 3.10.3.3",status,category:cat,steps,notes};
  }

  const M_VALID=[1,10,100,1000,10000,100000,1000000];
  function mOf(i,kind,review){
    const raw=kind==="acute"?i.mAcute:i.mChronic;
    const m=num(raw);
    if(raw===undefined||raw===null||raw===""){review.push(i.name+": Aquatic "+kind+" 1 without M-factor — M = 1 used provisionally (lower-bound screen).");return 1;}
    if(!M_VALID.includes(m)){review.push(i.name+": M-factor "+raw+" is not a power of 10 (GHS Table 4.1.5) — M = 1 used; correct the input.");return 1;}
    return m;
  }
  /* GHS Rev. 7 Tables 4.1.1–4.1.2 summation method. Cat 1 ingredients ≥0.1 %,
     others ≥1 % are treated as relevant (4.1.3.5.5.1). */
  function aquatic(ings,review){
    const relevant=(i,cat1)=>i.pct>=(cat1?0.1:1)-EPS;
    let a1=0,a2=0,a3=0,c1=0,c2=0,c3=0,c4=0;
    for(const i of ings){
      if(!(i.pct>0))continue;
      if(i.aquaticAcute==="1"&&relevant(i,true))a1+=i.pct*mOf(i,"acute",review);
      if(i.aquaticAcute==="2"&&relevant(i))a2+=i.pct;
      if(i.aquaticAcute==="3"&&relevant(i))a3+=i.pct;
      if(i.aquaticChronic==="1"&&relevant(i,true))c1+=i.pct*mOf(i,"chronic",review);
      if(i.aquaticChronic==="2"&&relevant(i))c2+=i.pct;
      if(i.aquaticChronic==="3"&&relevant(i))c3+=i.pct;
      if(i.aquaticChronic==="4"&&relevant(i))c4+=i.pct;
    }
    const acuteSums=[a1,10*a1+a2,100*a1+10*a2+a3];
    const chronicSums=[c1,10*c1+c2,100*c1+10*c2+c3,c1+c2+c3+c4];
    // Chronic 4 sums unweighted percentages; undo the M weighting for c1.
    const c1raw=sumWhere(ings.filter(i=>relevant(i,true)),i=>i.aquaticChronic==="1");
    chronicSums[3]=c1raw+c2+c3+c4;
    const ai=acuteSums.findIndex(s=>s>=25-EPS),ci=chronicSums.findIndex(s=>s>=25-EPS);
    return [
      {key:"aquaticAcute",label:"Hazardous to the aquatic environment — acute",ref:"GHS Rev.7 Table 4.1.1",
        status:ai>=0?"classified":"not classified",category:ai>=0?String(ai+1):null,
        steps:["ΣAcute1×M = "+fmt(acuteSums[0])+" %","10×ΣAcute1×M + ΣAcute2 = "+fmt(acuteSums[1])+" %","100×ΣAcute1×M + 10×ΣAcute2 + ΣAcute3 = "+fmt(acuteSums[2])+" %","Classification threshold: ≥25 %"],notes:[]},
      {key:"aquaticChronic",label:"Hazardous to the aquatic environment — long-term",ref:"GHS Rev.7 Table 4.1.2",
        status:ci>=0?"classified":"not classified",category:ci>=0?String(ci+1):null,
        steps:["ΣChronic1×M = "+fmt(chronicSums[0])+" %","10×ΣChronic1×M + ΣChronic2 = "+fmt(chronicSums[1])+" %",
          "100×ΣChronic1×M + 10×ΣChronic2 + ΣChronic3 = "+fmt(chronicSums[2])+" %","ΣChronic1 + 2 + 3 + 4 = "+fmt(chronicSums[3])+" %","Classification threshold: ≥25 %"],notes:[]}
    ];
  }

  function ozone(ings){
    const hits=ings.filter(i=>i.ozone&&i.pct>=0.1-EPS);
    return {key:"ozone",label:"Hazardous to the ozone layer",ref:"GHS Rev.7 4.2.3",status:hits.length?"classified":"not classified",
      category:hits.length?"1":null,steps:hits.map(i=>i.name+": "+fmt(i.pct)+" % ≥0.1 %"),notes:[]};
  }

  /* GHS Rev. 7 Table 2.6.1. */
  function flammableLiquid(m){
    const fp=m.flashPoint,ibp=m.ibp;
    const base={key:"flamLiq",label:"Flammable liquids",ref:"GHS Rev.7 Table 2.6.1",steps:[],notes:[]};
    if(m.state&&m.state!=="liquid")return Object.assign(base,{status:"not applicable",category:null,steps:["Mixture is a "+m.state+"; flammable-liquid criteria not applied."]});
    if(!Number.isFinite(fp))return Object.assign(base,{status:"incomplete",category:null,steps:["Flash point not entered."],notes:["Flammability of the mixture not assessed."]});
    let cat=null;
    if(fp<23){
      if(!Number.isFinite(ibp))return Object.assign(base,{status:"incomplete",category:null,steps:["Flash point "+fp+" °C < 23 °C; initial boiling point needed to choose Category 1 or 2."]});
      cat=ibp<=35?"1":"2";
    }else if(fp<=60)cat="3";else if(fp<=93)cat="4";
    base.steps.push("Flash point "+fp+" °C"+(Number.isFinite(ibp)?", initial boiling point "+ibp+" °C":"")+(cat?" → Category "+cat:" → not classified (>93 °C)"));
    if(cat==="3"&&fp>35)base.notes.push("Flash point 35–60 °C: GHS 2.6.4.5 allows non-classification if sustained combustibility test (L.2) is negative — verify NBR adoption.");
    return Object.assign(base,{status:cat?"classified":"not classified",category:cat});
  }

  /* Label elements per category (GHS Rev. 7 Annex 1). */
  function labelFor(o){
    const c=o.category;
    const L=(pic,sig,h)=>({pictogram:pic,signal:sig,h});
    if(o.key.startsWith("acute-")){const n=Number(c),route=ROUTES[o.key.slice(6)];
      if(!route||!(n>=1&&n<=5))return L(null,null,null);
      const h=route.h[n-1]||(o.key==="acute-oral"?"H303":o.key==="acute-dermal"?"H313":"H333");
      return n<=3?L("GHS06","Danger",h):n===4?L("GHS07","Warning",h):L(null,"Warning",h);}
    switch(o.key){
      case "skin":return /^1/.test(c)?L("GHS05","Danger","H314"):c==="2"?L("GHS07","Warning","H315"):L(null,"Warning","H316");
      case "eye":return c==="1"?L("GHS05","Danger","H318"):(c==="2A"||c==="2")?L("GHS07","Warning","H319"):L(null,"Warning","H320");
      case "respSens":return L("GHS08","Danger","H334");
      case "skinSens":return L("GHS07","Warning","H317");
      case "mutagen":return c==="1"?L("GHS08","Danger","H340"):L("GHS08","Warning","H341");
      case "carcinogen":return c==="1"?L("GHS08","Danger","H350"):L("GHS08","Warning","H351");
      case "repro":return c==="1"?L("GHS08","Danger","H360"):L("GHS08","Warning","H361");
      case "lactation":return L(null,null,"H362");
      case "stotSE":return c==="1"?L("GHS08","Danger","H370"):L("GHS08","Warning","H371");
      case "stotRE":return c==="1"?L("GHS08","Danger","H372"):L("GHS08","Warning","H373");
      case "stotSE3Resp":return L("GHS07","Warning","H335");
      case "stotSE3Narcotic":return L("GHS07","Warning","H336");
      case "aspiration":return c==="1"?L("GHS08","Danger","H304"):L("GHS08","Warning","H305");
      case "aquaticAcute":return c==="1"?L("GHS09","Warning","H400"):L(null,null,c==="2"?"H401":"H402");
      case "aquaticChronic":return c==="1"?L("GHS09","Warning","H410"):c==="2"?L("GHS09",null,"H411"):L(null,null,c==="3"?"H412":"H413");
      case "ozone":return L("GHS07","Warning","H420");
      case "flamLiq":return c==="1"?L("GHS02","Danger","H224"):c==="2"?L("GHS02","Danger","H225"):c==="3"?L("GHS02","Warning","H226"):L(null,"Warning","H227");
    }
    return L(null,null,null);
  }

  /* GHS Rev. 7 1.4.10.5.3.1 pictogram precedence and 1.4.10.5.3.2 signal word. */
  function buildLabel(classified){
    const contributions=classified.map(o=>Object.assign({key:o.key,label:o.label,category:o.category},labelFor(o)));
    const has=p=>contributions.some(c=>c.pictogram===p);
    const respSensGHS08=contributions.some(c=>c.key==="respSens");
    const decisions=[];
    const irritation=c=>(c.key==="skin"&&!/^1/.test(c.category))||(c.key==="eye"&&/^2/.test(c.category));
    const kept=new Set();
    for(const c of contributions){
      if(!c.pictogram)continue;
      let drop=null;
      if(c.pictogram==="GHS07"){
        if(has("GHS06"))drop="GHS06 present — GHS07 shall not appear (GHS 1.4.10.5.3.1(a))";
        else if(has("GHS05")&&irritation(c))drop="GHS05 present — GHS07 not used for skin/eye irritation (GHS 1.4.10.5.3.1(b))";
        else if(respSensGHS08&&(irritation(c)||c.key==="skinSens"))drop="GHS08 for respiratory sensitisation — GHS07 not used for skin sensitisation or skin/eye irritation (GHS 1.4.10.5.3.1(c))";
      }
      decisions.push({pictogram:c.pictogram,from:c.label+" "+c.category,kept:!drop,reason:drop||"required"});
      if(!drop)kept.add(c.pictogram);
    }
    const order=["GHS01","GHS02","GHS03","GHS04","GHS05","GHS06","GHS07","GHS08","GHS09"];
    const pictograms=order.filter(p=>kept.has(p));
    const signal=contributions.some(c=>c.signal==="Danger")?"Danger":contributions.some(c=>c.signal==="Warning")?"Warning":null;
    const hcodes=[...new Set(contributions.map(c=>c.h).filter(Boolean))].sort();
    const hazardStatements=hcodes.map(code=>({code,english:H_TEXT[code]||"",ptBR:null}));
    const notes=[];
    if(hcodes.includes("H314")&&hcodes.includes("H318"))notes.push("H314 already covers serious eye damage; check whether NBR 14725:2023 permits omitting H318.");
    if(hcodes.includes("H410")&&hcodes.includes("H400"))notes.push("H400 and H410 both assigned; check NBR 14725:2023 for combined/omitted statements.");
    return {signalWord:signal,signalWordPtBR:signal==="Danger"?"Perigo":signal==="Warning"?"Atenção":null,
      pictograms,pictogramDecisions:decisions,hazardStatements,reviewNotes:notes,
      note:"Hazard statements are GHS Rev. 7 English reference text. Brazilian labels must be in Portuguese using NBR 14725:2023 wording, with precautionary statements, supplier identification and emergency telephone — not generated here."};
  }

  function readMixture(input){
    const m=(input&&input.mixture)||{};
    return {state:str(m.state)||"liquid",flashPoint:num(m.flashPoint),ibp:num(m.ibp),viscosity40:num(m.viscosity40),pH:num(m.pH),
      cutoffOption:m.cutoffOption==="upper"?"upper":"lower"};
  }

  function classify(input){
    const raw=Array.isArray(input&&input.ingredients)?input.ingredients:[];
    const issues=[],review=[];
    const mixture=readMixture(input);
    const ings=raw.map((i,ix)=>normalise(i||{},ix,review));
    let total=0;
    ings.forEach((i,ix)=>{if(!Number.isFinite(i.pct)||i.pct<0||i.pct>100)issues.push("Ingredient "+(ix+1)+" ("+i.name+"): concentration must be 0–100 %.");else total+=i.pct;});
    if(!ings.length)issues.push("No ingredients provided.");
    if(ings.length&&Math.abs(total-100)>0.01)issues.push("Concentrations total "+fmt(total)+" %, not 100 %.");
    const valid=issues.length===0;
    const cut=CUTOFFS[mixture.cutoffOption];
    let results=[];
    if(valid){
      for(const r of ["oral","dermal","gas","vapour","dustMist"])results.push(acuteRoute(ings,r,review));
      results.push(skinCorrosion(ings,mixture),eyeDamage(ings,mixture),...sensitisation(ings,cut,review),...cmr(ings,cut),
        ...stot(ings,cut),aspiration(ings,mixture),...aquatic(ings,review),ozone(ings),flammableLiquid(mixture));
    }
    // A single inhalation statement is retained: keep the most severe inhalation form.
    const classified=results.filter(r=>r.status==="classified");
    const inh=classified.filter(r=>/^acute-(gas|vapour|dustMist)$/.test(r.key));
    if(inh.length>1){
      const worst=inh.reduce((a,b)=>Number(b.category)<Number(a.category)?b:a);
      review.push("Several inhalation forms classified; label uses the most severe ("+worst.label+" Category "+worst.category+").");
      for(const r of inh)if(r!==worst)r.labelSuppressed=true;
    }
    const manual=Array.isArray(input&&input.manual)?input.manual:[];
    for(const m of manual){
      if(!m||!m.key||!m.category)continue;
      classified.push({key:m.key,label:(m.label||m.key)+" (manual)",category:String(m.category),status:"classified",manual:true});
      review.push("Manual classification "+(m.label||m.key)+" "+m.category+" accepted without validation — document the test data or bridging basis.");
    }
    const label=buildLabel(classified.filter(r=>!r.labelSuppressed));
    if(mixture.cutoffOption==="lower")review.push("Generic cut-offs: GHS lower option applied (most protective). Confirm the values adopted in NBR 14725:2023.");
    else review.push("Generic cut-offs: GHS upper option applied. Confirm the values adopted in NBR 14725:2023; where a lower option exists, FDS information may still be expected.");
    review.push("Use whole-mixture data and bridging principles before ingredient calculations where available (GHS 1.3.2.3).");
    review.push("Brazilian labels and the FDS must be in Portuguese (NBR 14725:2023; NR-26). Translate and verify all label text.");
    return {profile:PROFILE,phase:"limited pilot",complete:false,valid,mixture,cutoffs:cut,
      outcomes:classified.map(r=>({key:r.key,label:r.label,category:r.category,subcategory:r.subcategory||null,manual:!!r.manual,ref:r.ref||null})),
      results,label,issues,review:[...new Set(review)],notAssessed:NOT_ASSESSED.slice(),
      note:"Provisional decision support only — not a final NBR 14725:2023 classification, label or FDS."};
  }

  return {PROFILE,ROUTES,CUTOFFS,H_TEXT,HCODE_MAP,NOT_ASSESSED,parseHCodes,acuteCategory,classify};
});
