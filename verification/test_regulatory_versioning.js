// Regulatory versioning: deterministic legal applicability audit, not historical rule switching.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('clp_mixture_calculator.html','utf8');
const begin=html.indexOf('/* BEGIN REGULATORY VERSIONING V1 */');
const end=html.indexOf('/* END REGULATORY VERSIONING V1 */',begin);
assert(begin>=0&&end>begin,'versioning assessment block present');
const context=vm.createContext({});
vm.runInContext(html.slice(begin,end),context);
const assess=m=>vm.runInContext('assessRegulatoryVersion('+JSON.stringify(m)+')',context);
let n=0;
function test(name,fn){fn();n++;console.log('PASS '+name)}
test('Known EU version and explicit placement record',()=>{
 const x=assess({assessmentDate:'2026-11-07',marketPlacement:'new'});
 assert.equal(x.rulesetId,'eu-clp-2026-07-01');
 assert.equal(x.newClasses,'mandatory');assert.equal(x.status,'review-required');
 assert.equal(x.consolidation,'2026-07-01');assert.equal(x.assessmentDate,'2026-11-07');
});
test('Pre-2026-05-01 placement prompts transition evidence',()=>{
 const x=assess({assessmentDate:'2026-11-07',marketPlacement:'pre20260501'});
 assert.equal(x.newClasses,'derogation-possible');
 assert.match(x.warnings.join(' '),/1 May 2028/);
});
test('Market placement unknown is not treated as a proven exemption',()=>{
 const x=assess({assessmentDate:'2026-11-07'});
 assert.equal(x.newClasses,'placement-unknown');
});
test('Transition ends in May 2028 regardless of placement',()=>{
 const x=assess({assessmentDate:'2028-05-01',marketPlacement:'pre20260501'});
 assert.equal(x.newClasses,'mandatory');
});
test('Historical dates do not falsely select current rules as legally applicable',()=>{
 const x=assess({assessmentDate:'2025-11-07'});
 assert.equal(x.status,'unsupported');
 assert.match(x.warnings.join(' '),/historical results are not supported/);
});
test('Legacy import missing date is not backdated or silently approved',()=>{
 const x=assess({regulatoryProfile:'eu-clp-2026-07-01'});
 assert.equal(x.status,'unsupported');assert.equal(x.assessmentDate,null);
});
test('Invalid and impossible dates are refused',()=>{
 for(const date of ['2026-02-30','invalid','2026-13-01','']){
  assert.equal(assess({assessmentDate:date}).status,'unsupported');
 }
});
test('Unknown profile is never approved',()=>{
 const x=assess({regulatoryProfile:'us-hazcom-2024',assessmentDate:'2026-11-07'});
 assert.equal(x.status,'unsupported');
 assert.match(x.warnings.join(' '),/Unknown ruleset/);
});
test('Regulatory audit is shown and embedded in exported report',()=>{
 for(const text of ['id="regProfile"','id="regDate"','id="regPlacement"','id="regulatory-audit-result"',
 'REGULATORY VERSION AUDIT (provisional)','assessmentDate:""','marketPlacement:"unknown"']){
  assert.ok(html.includes(text),'Missing '+text);
 }
});
test('Versioning does not rewrite the CLP engine',()=>{
 const engine=fs.readFileSync('verification/engine.js','utf8');
 const embedded=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
 assert.equal(embedded.trim(),engine.trim());
});
console.log(n+' regulatory versioning tests passed');
