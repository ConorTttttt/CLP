// Article 28 / Article 22 P-statement selection regressions.
// Run from repo root: node verification/test_article28.js
const CLP=require('./engine.js'); let pass=0,fail=0;
function t(name,ok){if(ok)pass++;else{fail++;console.log('FAIL: '+name);}}
const rule=(h,label)=>({label:label||h,h:[h],picto:[]});
const choose=(hs,opts)=>CLP.selectArticle28(hs.map(h=>rule(h)),opts||{});
const picked=(r,p)=>r.selected.some(x=>x.code===p);
const cand=(r,p)=>r.candidates.find(x=>x.code===p);
const flagged=(r,frag)=>r.review.some(x=>x.reason.includes(frag));
{
 const r=choose(['H314'],{audience:'consumer'});
 t('Consumer P501 is selected',picked(r,'P501'));
 t('Consumer disposal obligation identified',r.requiredObligations.some(x=>x.id==='consumer-disposal'));
 t('P501 wording still requires user data',flagged(r,'disposal wording is incomplete'));
 t('Article 28 obligation is conditional not all codes mandatory',cand(r,'P501').legalStatus.includes('conditional')&&cand(r,'P280').legalStatus==='candidate');
 t('Consumer P102 is candidate not inherently mandatory',cand(r,'P102').legalStatus==='candidate');
 t('Corrosive eye first aid candidate present',!!cand(r,'P305+P351+P338'));
 t('Corrosive swallow first aid candidate present',!!cand(r,'P301+P330+P331'));
}
{
 const r=choose(['H314'],{audience:'consumer',disposalDestination:'an authorised hazardous waste facility',intendedUse:'surface cleaner'});
 t('Specific disposal destination shown',cand(r,'P501').text.includes('authorised hazardous waste facility'));
 t('Disposal conditionally satisfied as draft',r.requiredObligations.some(x=>x.status==='satisfied-draft'));
 t('Never claims approved final label',r.readyForFinalLabel===false);
}
{
 const r=choose(['H314'],{audience:'professional'});
 t('No consumer-only candidates for professional',!cand(r,'P102')&&!cand(r,'P103'));
 t('Professional disposal is not consumer mandatory',!!cand(r,'P501')&&r.requiredObligations.length===0);
}
{
 const r=choose(['H319'],{audience:'consumer'});
 t('H319 consumer does not invent P501',!cand(r,'P501'));
 t('Consumer H319 flags legal disposal review',r.requiredObligations.some(x=>x.status==='requires-review'));
 t('Eye first aid exists',!!cand(r,'P305+P351+P338'));
}
{
 const r=choose(['H350'],{audience:'consumer'});
 t('P202 CMR candidate selected',picked(r,'P202'));
 t('P103 omitted as redundant when P202 applies',cand(r,'P103').decision==='redundant');
 t('CMR first-aid candidate included',!!cand(r,'P308+P313'));
}
{
 const r=choose(['H334','H330'],{audience:'industrial'});
 t('P260 and P261 detected',!!cand(r,'P260')&&!!cand(r,'P261'));
 t('P261 omitted as redundant with P260',cand(r,'P261').decision==='redundant');
}
{
 const r=choose(['H224','H314','H317','H318','H350','H410'],{audience:'consumer'});
 t('Six-statement draft cap applied',r.selected.length===6);
 t('More than six proposals reviewed rather than hidden',r.excessCandidateCount>0&&r.review.some(x=>x.code==='six-statements'&&x.severity==='blocker'));
 t('Consumer P501 not dropped by cap',picked(r,'P501'));
 t('All unselected candidates remain auditable',r.candidates.length>r.selected.length);
 t('Exceptional more-than-six permission documented',flagged(r,'permits more when needed'));
}
{
 const r=choose(['H225'],{audience:'unknown'});
 t('Audience missing stays unknown',r.audience==='unknown'&&!cand(r,'P102'));
 t('Audience missing is flagged',r.review.some(x=>x.code==='audience'));
}
{
 const r=choose(['H400','H410'],{audience:'professional',intendedUse:'water treatment'});
 t('P273 merges aquatic sources',r.candidates.filter(x=>x.code==='P273').length===1&&cand(r,'P273').triggeredBy.length===2);
 t('Conditional intended release of P273 flagged',flagged(r,'if environmental release is the intended use'));
}
{
 const r=choose(['H304'],{audience:'professional'});
 t('Aspiration P331 offered',!!cand(r,'P331'));
 t('Aspiration response P301+P310 offered',!!cand(r,'P301+P310'));
}
{
 const r=choose(['H314'],{audience:'consumer',manualPExcluded:'P501',manualPReason:'Not necessary'});
 t('Consumer P501 cannot be manually suppressed without legal review',picked(r,'P501')&&flagged(r,'Manual exclusion of consumer disposal'));
}
{
 const r=choose(['H225'],{audience:'professional',manualPExcluded:'P210'});
 t('Unjustified manual exclusion blocked',cand(r,'P210').decision==='proposed'&&flagged(r,'requires a documented regulatory reason'));
}
{
 const r=choose(['H225'],{audience:'professional',manualPExcluded:'P210',manualPReason:'documented exceptional condition'});
 t('Manual P210 exclusion is audited with reason',cand(r,'P210').decision==='excluded'&&cand(r,'P210').decisionReason.includes('documented'));
}
{
 const r=choose(['H225'],{audience:'professional',manualPExtra:'P272'});
 t('Manual code outside partial catalogue explicitly unverified',cand(r,'P272')?.manual&&r.warnings.some(x=>x.includes('no verified wording')));
}
{
 const r=choose(['H225'],{audience:'professional',manualPExtra:'P305 + P351 + P338'});
 t('Manual combined code parsed correctly',cand(r,'P305+P351+P338')?.manual===true);
}
{
 const r=choose(['H225'],{audience:'professional',manualPExtra:'BAD,P308'});
 t('Invalid manual code flagged',r.warnings.some(x=>x.includes('Invalid manual')));
}
{
 const r=choose(['H999'],{audience:'professional'});
 t('Unmapped H999 disclosed',r.uncovered.includes('H999')&&r.review.some(x=>x.code==='unmapped'));
 t('No invented P candidates for unknown H999',r.selected.length===0);
}
{
 const r=choose(['H317','H315'],{audience:'professional'});
 t('Duplicate skin washing P302 combination deduplicated',r.candidates.filter(x=>x.code==='P302+P352').length===1);
}
{
 const r=choose([],{audience:'unknown'});
 t('No hazards do not invent obligatory P',r.selected.length===0&&r.requiredObligations.length===0);
}
{
 const mixture={ingredients:[],manual:[{label:'Skin Corr. 1',h:'H314',signal:'Danger',picto:'GHS05'}],audience:'consumer'};
 const r=CLP.classify(mixture);
 t('Classifications not changed by Article28',r.outcomes.some(x=>x.h.includes('H314')));
 t('Article28 proposed P on label object',r.label.precautionaryStatements.some(x=>x.code==='P501'));
 t('Article28 candidate audit remains available',r.label.article28.candidates.length>r.label.precautionaryStatements.length);
 t('Article28 report includes audit',CLP.report(mixture,r).includes('ARTICLE 28 PRECAUTIONARY-STATEMENT AUDIT'));
 t('Article26 and Article27 still present',!!r.label.pictogramDecisions&&!!r.label.decisions);
}
console.log('\n'+pass+' Article 28 tests passed, '+fail+' failed');process.exit(fail?1:0);