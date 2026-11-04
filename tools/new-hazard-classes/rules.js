/**
 * CLP new hazard classes screening rules, Commission Delegated Regulation (EU) 2023/707.
 * Version: 2026-11-04. Ingredient-based mixture criteria only; not a formal classification.
 * ED: CLP Annex I §§3.11.3.1, 4.2.3.1; PBT/vPvB §4.3.3.1; PMT/vPvM §4.4.3.1.
 */
export const RULESET = Object.freeze({id:'eu-clp-2023-707', version:'2026-11-04', jurisdiction:'EU', percentBasis:'w/w', scope:'solid-liquid-mixtures'});
export const CATEGORIES = Object.freeze({
  edhh: [{value:'1', code:'EUH380', label:'ED human health · Cat. 1', limit:0.1, section:'3.11.3.1'}, {value:'2', code:'EUH381', label:'ED human health · Cat. 2', limit:1, section:'3.11.3.1'}],
  edenv: [{value:'1', code:'EUH430', label:'ED environment · Cat. 1', limit:0.1, section:'4.2.3.1'}, {value:'2', code:'EUH431', label:'ED environment · Cat. 2', limit:1, section:'4.2.3.1'}],
  pbt: [{value:'vPvB', code:'EUH441', label:'vPvB', limit:0.1, section:'4.3.3.1'}, {value:'PBT', code:'EUH440', label:'PBT', limit:0.1, section:'4.3.3.1'}],
  pmt: [{value:'vPvM', code:'EUH451', label:'vPvM', limit:0.1, section:'4.4.3.1'}, {value:'PMT', code:'EUH450', label:'PMT', limit:0.1, section:'4.4.3.1'}],
});
export const GROUPS = Object.freeze([
  {key:'edhh', title:'Endocrine disruption · human health', section:'3.11', candidates:['1','2']},
  {key:'edenv', title:'Endocrine disruption · environment', section:'4.2', candidates:['1','2']},
  {key:'pbt', title:'PBT / vPvB', section:'4.3', candidates:['PBT','vPvB','PBT+vPvB']},
  {key:'pmt', title:'PMT / vPvM', section:'4.4', candidates:['PMT','vPvM','PMT+vPvM']},
]);
export const LIMITS = Object.freeze({edhh:{'1':0.1,'2':1},edenv:{'1':0.1,'2':1},pbt:{PBT:0.1,vPvB:0.1,'PBT+vPvB':0.1},pmt:{PMT:0.1,vPvM:0.1,'PMT+vPvM':0.1}});
const EPS=1e-9;
function isValidPercent(x){return typeof x==='number' && Number.isFinite(x) && x>=0 && x<=100;}
const standardStatuses = ['unknown','none'];
export function validateMixture(input){
  const errors=[], warnings=[];
  if(input.phase==='gas') errors.push('Gas mixture calculation is not implemented. ED thresholds use % v/v for gases, while PBT/PMT require % w/w.');
  if(!Array.isArray(input.components)||input.components.length===0) errors.push('Add at least one ingredient.');
  let sum=0; const ids=new Set();
  for(const [i,c] of (input.components||[]).entries()){
    if(!isValidPercent(c.concentration))errors.push(`Ingredient ${i+1}: concentration must be between 0 and 100% w/w.`);
    else sum+=c.concentration;
    if(!String(c.name||'').trim())errors.push(`Ingredient ${i+1}: enter an ingredient name.`);
    if(c.id && ids.has(c.id))warnings.push(`Duplicate internal ingredient identifier in row ${i+1}.`);
    ids.add(c.id);
    for(const g of GROUPS){
      const val = c[g.key]??'unknown';
      if(![...standardStatuses, ...g.candidates].includes(val)) errors.push(`Ingredient ${i+1}: invalid ${g.key} classification value.`);
    }
    if(!String(c.source||'').trim()) warnings.push(`Ingredient ${i+1}: no evidence or classification reference recorded.`);
  }
  if(sum>100+EPS) errors.push(`Ingredient concentrations total ${formatPercent(sum)}%, exceeding 100%.`);
  else if(sum<100-EPS)warnings.push(`Only ${formatPercent(sum)}% of the formulation is entered. Unlisted components may affect the outcome.`);
  return {errors,warnings,total:sum,complete:Math.abs(sum-100)<EPS};
}
export function formatPercent(n){return (Math.round(n*10000)/10000).toLocaleString('en-GB',{maximumFractionDigits:4});}
export function evaluateMixture(input){
  const validation=validateMixture(input);
  if(validation.errors.length)return {validation,groups:[], sdsRequest:[], overall:'invalid'};
  const groups=GROUPS.map(g=>{
    const hits=[], missing=[], reviewed=[], categoryItems=[];
    for(const c of input.components){
      const value=c[g.key]??'unknown';
      if(value==='unknown'){missing.push({name:c.name,concentration:c.concentration});continue;}
      if(value==='none'){reviewed.push(c.name);continue;}
      const lim=LIMITS[g.key][value];
      if(c.concentration>=lim){
        for(const category of value.split('+'))hits.push({name:c.name,concentration:c.concentration, value:category, threshold:lim, source:c.source||''});
      } else categoryItems.push({name:c.name,concentration:c.concentration,value,threshold:lim});
    }
    let chosen=null;
    const byValue=v=>hits.find(h=>h.value===v);
    // Within a given hazard-class group, prefer Category 1 / more severe over Category 2.
    if(g.key==='edhh'||g.key==='edenv')chosen=byValue('1')?'1':byValue('2')?'2':null;
    else chosen=hits.length?hits.map(h=>h.value):null;
    const hasUnknown=missing.length>0 || !validation.complete;
    const result=hits.length ? 'triggered' : hasUnknown ? 'review' : 'not_triggered';
    const categories=Array.isArray(chosen)?chosen.filter((v,i,a)=>a.indexOf(v)===i):chosen?[chosen]:[];
    const statements=categories.map(v=>CATEGORIES[g.key].find(c=>c.value===v)).filter(Boolean);
    const upgradePossible=!!((g.key==='edhh'||g.key==='edenv')&&chosen==='2'&&missing.some(c=>c.concentration>=0.1));
    return {...g, result, hits, missing, belowLimit:categoryItems, categories, statements, upgradePossible, complete:!hasUnknown};
  });
  const sdsRequest=[];
  for(const group of ['edhh','edenv']){
    for(const c of input.components){
      if(c[group]==='2' && c.concentration>=0.1) sdsRequest.push({group,ingredient:c.name,concentration:c.concentration,reason:'Category 2 ED ingredient at or above 0.1%; SDS available on request',section:group==='edhh'?'3.11.3.1, Table 3.11.2 Note 1':'4.2.3.1, Table 4.2.2 Note 1'});
    }
  }
  const overall=groups.some(g=>g.result==='triggered')?'triggered':groups.some(g=>g.result==='review')?'review':'not_triggered';
  return {validation,groups,sdsRequest,overall,ruleVersion:RULESET.version};
}

/** Screening is evidence triage; it never establishes formal substance classification. */
export function screenSubstance(evidence){
  const ed=(prefix)=>{
    const x=[evidence[`${prefix}Activity`],evidence[`${prefix}Adverse`],evidence[`${prefix}Link`]];
    if(x.every(v=>v==='yes'))return {status:'candidate',message:'All three core evidence elements indicated. Expert weight-of-evidence assessment is required to distinguish Category 1 from Category 2.'};
    if(x.includes('no'))return {status:'review',message:'At least one core evidence element is marked not demonstrated. Review all relevant evidence before concluding no classification.'};
    return {status:'unknown',message:'Insufficient information to establish or exclude endocrine-disrupting properties.'};
  };
  const yes=key=>evidence[key]==='yes';
  const p=yes('persistent')||yes('veryPersistent');
  const b=yes('bioaccumulative')||yes('veryBioaccumulative');
  const m=yes('mobile')||yes('veryMobile');
  const t=yes('toxic');
  const pbt=[];if(yes('veryPersistent')&&yes('veryBioaccumulative'))pbt.push('vPvB');if(p&&b&&t)pbt.push('PBT');
  const pmt=[];if(yes('veryPersistent')&&yes('veryMobile'))pmt.push('vPvM');if(p&&m&&t)pmt.push('PMT');
  const f=(arr,detail)=>arr.length?{status:'candidate',candidates:arr,message:`Potential ${arr.join(' and ')} criteria indicated by the entered expert evidence flags. Confirm using the full CLP criteria, study reliability and weight of evidence.`}:{status:'unknown',candidates:[],message:`${detail} not established by these flags. This does not prove that the substance is not classified.`};
  return {edhh:ed('hh'),edenv:ed('env'),pbt:f(pbt,'PBT/vPvB'),pmt:f(pmt,'PMT/vPvM'),notice:'Screening only; candidate classes are not verified substance classifications.'};
}

/** Exemption applies to existing stock already in the EU supply chain, not all future batches of an established product. */
export function complianceStatus(type,asOf,olderStock){
  const substance=type==='substance';
  const start=substance?'2025-05-01':'2026-05-01';
  const end=substance?'2026-11-01':'2028-05-01';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||Number.isNaN(Date.parse(`${asOf}T00:00:00Z`)))return {status:'unknown',text:'Enter a valid assessment date.'};
  if(asOf<start)return {status:'not_yet',text:`The new hazard classes were not yet mandatory for ${type}s on this date.`};
  if(asOf>=end)return {status:'required',text:`New-hazard-class obligations apply. The transitional period for qualifying older ${type} stock has ended.`};
  if(olderStock==='yes')return {status:'transition',text:`Qualifying stock already placed on the EU market before ${start} may use the transition until ${end}. Confirm stock identity and eligibility.`};
  if(olderStock==='unknown')return {status:'review',text:`Check whether this particular stock was already in the EU supply chain before ${start}; otherwise the new rules apply.`};
  return {status:'required',text:`New-hazard-class obligations apply to ${type}s placed on the market from ${start}.`};
}
