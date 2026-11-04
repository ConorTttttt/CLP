/** Guided regulatory decisions and *local* reusable evidence records.
 * These functions never fetch legal data or claim that user supplied claims are harmonised classifications.
 */
import {GROUPS, evaluateMixture, RULESET} from './rules.js';
const choices=Object.fromEntries(GROUPS.map(g=>[g.key,['none',...g.candidates]]));
export function normaliseIdentifier(input){return String(input||'').trim().toUpperCase().replace(/\s+/g,'');}
export function validCAS(id){
  const s=normaliseIdentifier(id);
  if(!/^\d{2,7}-\d{2}-\d$/.test(s))return false;
  const digits=s.replace(/-/g,'');let checksum=0;
  for(let i=digits.length-2,weight=1;i>=0;i--,weight++)checksum+=Number(digits[i])*weight;
  return checksum%10===Number(digits.at(-1));
}
export function validEC(id){return /^\d{3}-\d{3}-\d$/.test(normaliseIdentifier(id));}
export function validChemicalIdentifier(id){return validCAS(id)||validEC(id);}
export function reviewedDecision(decision){
  return !!decision && choices[decision.group]?.includes(decision.classification) &&
    ['annex_vi','expert_review'].includes(decision.basis) &&
    !!String(decision.source||'').trim() && !!String(decision.reason||'').trim() &&
    decision.annexChecked===true && decision.reviewed===true;
}
export function registryAssessment(substance){
  const issues=[];
  if(!String(substance.name||'').trim())issues.push('Enter a substance name.');
  if(!validChemicalIdentifier(substance.cas))issues.push('Enter a valid CAS number with check digit, or an EC number (XXX-XXX-X).');
  if(!String(substance.reviewer||'').trim())issues.push('Enter the reviewer responsible for the regulatory decisions.');
  const approved={};
  for(const g of GROUPS){
    const d={...(substance.decisions?.[g.key]||{}),group:g.key};
    if(reviewedDecision(d))approved[g.key]={classification:d.classification,basis:d.basis,source:d.source.trim(),reason:d.reason.trim(),annexChecked:true,reviewed:true};
  }
  if(!Object.keys(approved).length)issues.push('Complete and sign off at least one hazard-group decision before saving to the reviewed library.');
  return {issues, approved, unreviewed:GROUPS.filter(g=>!approved[g.key]).map(g=>g.title)};
}
export function makeRegistryRecord(substance,reviewDate=new Date().toISOString()){
  const result=registryAssessment(substance);
  if(result.issues.length)return {ok:false,...result};
  return {ok:true, record:{id:normaliseIdentifier(substance.cas),name:substance.name.trim(),identifier:normaliseIdentifier(substance.cas),reviewer:substance.reviewer.trim(),reviewedAt:reviewDate,ruleVersion:RULESET.version,groups:result.approved},unreviewed:result.unreviewed};
}
export function applyReviewedLibrary(components,library){
  const updated=components.map(c=>({...c,provenance:{...(c.provenance||{})}}));
  const applied=[],conflicts=[],unmatched=[];
  for(const c of updated){
    const id=normaliseIdentifier(c.cas);
    if(!validChemicalIdentifier(id)){unmatched.push(`${c.name||'Unnamed ingredient'}: valid CAS / EC identifier required`);continue;}
    const matches=(library||[]).filter(r=>r.identifier===id);
    if(matches.length!==1){unmatched.push(`${c.name||id}: ${matches.length?'multiple reviewed records':'no reviewed record'}`);continue;}
    const record=matches[0];
    for(const g of GROUPS){
      const decision=record.groups?.[g.key];
      if(!decision)continue;
      if(!reviewedDecision({...decision,group:g.key}))continue;
      const existing=c[g.key]||'unknown';
      if(existing!=='unknown' && existing!==decision.classification){conflicts.push(`${c.name||id} / ${g.title}: entered ${existing} conflicts with reviewed ${decision.classification}; not overwritten.`);continue;}
      c[g.key]=decision.classification;
      c.provenance[g.key]={recordId:record.id,reviewer:record.reviewer,reviewedAt:record.reviewedAt,source:decision.source};
      applied.push(`${c.name||id} / ${g.title}`);
    }
    if(applied.some(x=>x.startsWith(`${c.name||id} / `)) && !c.source) c.source=`Reviewed library: ${record.identifier} (${record.reviewedAt.slice(0,10)})`;
  }
  return {components:updated,applied,conflicts,unmatched};
}
export function createMixtureReviewQueue(mixture,library=[]){
  const result=evaluateMixture(mixture),items=[];
  if(result.validation.errors.length)items.push({priority:'blocker',title:'Correct composition errors',detail:result.validation.errors.join(' '),section:'Annex I mixture rules'});
  if(!result.validation.complete)items.push({priority:'blocker',title:'Complete formulation',detail:`Entered total: ${result.validation.total.toFixed(4)}%. Assess missing components before concluding no classification.`,section:'Composition'});
  for(const c of mixture.components||[]){
    const id=String(c.cas||'').trim();
    if(!validChemicalIdentifier(id))items.push({priority:'review',title:`Verify identifier: ${c.name||'unnamed ingredient'}`,detail:'Enter a valid CAS or EC identifier and check substance identity, including relevant substance form/constituents.',section:'Identity'});
    for(const g of GROUPS){
      if((c[g.key]||'unknown')==='unknown')items.push({priority:'review',title:`Assess ${c.name||'ingredient'} — ${g.title}`,detail:'Check the applicable Annex VI entry first; then assess the available evidence. Do not interpret missing data as a negative assessment.',section:`Annex I §${g.section}`});
      else if(!c.provenance?.[g.key])items.push({priority:'verify',title:`Verify manual decision: ${c.name||'ingredient'} — ${g.title}`,detail:'This ingredient classification was entered manually and is not linked to an approved local evidence record. Confirm the source and current applicability.',section:`Annex I §${g.section}`});
      else {
        const r=(library||[]).find(record=>record.identifier===normaliseIdentifier(c.cas));
        const p=c.provenance[g.key];
        if(!r||r.id!==p.recordId||r.reviewedAt!==p.reviewedAt||r.ruleVersion!==RULESET.version||r.groups?.[g.key]?.classification!==c[g.key])
          items.push({priority:'blocker',title:`Refresh outdated evidence: ${c.name||'ingredient'} — ${g.title}`,detail:'The linked reviewed record is unavailable, superseded, or no longer matches this classification. Reapply or investigate the library record; the previous provenance cannot be relied upon.',section:`Annex I §${g.section}`});
      }
    }
  }
  for(const [key,label,section] of [['whole','whole-mixture endocrine studies','3.11.3.2 / 4.2.3.2'],['bridging','relevant similar-mixture evidence / bridging','3.11.3.3 / 4.2.3.3']]){
    const r=mixture.edReview?.[key]||'unknown';
    if(r==='unknown')items.push({priority:'review',title:`Check ${label}`,detail:'Record whether relevant evidence exists. These routes may establish additional ED hazard; do not use them automatically to negate an ingredient-based trigger.',section:`Annex I §§${section}`});
    if(r==='yes' && !(mixture.edReview?.expertNotes||'').trim())items.push({priority:'blocker',title:`Expert assessment required: ${label}`,detail:'Relevant evidence has been identified. Document its evaluation and any impact on the classification.',section:`Annex I §§${section}`});
  }
  if(!String(mixture.edReview?.reviewer||'').trim())items.push({priority:'review',title:'Record the mixture assessment reviewer',detail:'Record who reviewed the whole-mixture and bridging considerations. This is not automated approval.',section:'Audit trail'});
  return {items,counts:{blocker:items.filter(x=>x.priority==='blocker').length,review:items.filter(x=>x.priority==='review').length,verify:items.filter(x=>x.priority==='verify').length},ruleVersion:RULESET.version};
}
