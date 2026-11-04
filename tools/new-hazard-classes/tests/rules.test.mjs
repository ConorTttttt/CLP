import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateMixture,screenSubstance,complianceStatus,validateMixture} from '../rules.js';
const comp=(concentration,values={})=>({id:'a',name:'Ingredient A',concentration,source:'Reviewed SDS and CLP records',edhh:'none',edenv:'none',pbt:'none',pmt:'none',...values});
const mix=components=>({phase:'liquid',components});
function group(result,key){return result.groups.find(g=>g.key===key);}
test('ED HH Category 1 triggers at precisely 0.1%',()=>{const r=evaluateMixture(mix([comp(0.1,{edhh:'1'}),comp(99.9)]));assert.equal(group(r,'edhh').result,'triggered');assert.deepEqual(group(r,'edhh').categories,['1']);});
test('ED HH Category 1 below 0.1 does not trigger by ingredient rule',()=>{const r=evaluateMixture(mix([comp(0.0999,{edhh:'1'}),comp(99.9001)]));assert.equal(group(r,'edhh').result,'not_triggered');});
test('ED ENV Category 2 triggers at 1%, not at 0.9999%',()=>{const low=evaluateMixture(mix([comp(0.9999,{edenv:'2'}),comp(99.0001)]));const high=evaluateMixture(mix([comp(1,{edenv:'2'}),comp(99)]));assert.equal(group(low,'edenv').result,'not_triggered');assert.deepEqual(group(high,'edenv').categories,['2']);});
test('ED Category 2 at 0.1% has SDS-on-request implication but not mixture hazard trigger',()=>{const r=evaluateMixture(mix([comp(0.1,{edhh:'2',edenv:'2'}),comp(99.9)]));assert.equal(group(r,'edhh').result,'not_triggered');assert.equal(r.sdsRequest.length,2);});
test('PBT, vPvB, PMT, vPvM each trigger at 0.1% w/w',()=>{for(const [key,value] of [['pbt','PBT'],['pbt','vPvB'],['pmt','PMT'],['pmt','vPvM']]){const r=evaluateMixture(mix([comp(0.1,{[key]:value}),comp(99.9)]));assert.equal(group(r,key).result,'triggered');assert.ok(group(r,key).categories.includes(value));}});
test('no summing concentrations across different ingredients',()=>{const r=evaluateMixture(mix([comp(0.06,{pbt:'PBT'}),comp(0.06,{pbt:'PBT'}),comp(99.88)]));assert.equal(group(r,'pbt').result,'not_triggered');});
test('category 1 takes precedence over category 2 for ED endpoint',()=>{const r=evaluateMixture(mix([comp(1,{edhh:'2'}),comp(0.1,{edhh:'1'}),comp(98.9)]));assert.deepEqual(group(r,'edhh').categories,['1']);});
test('unknown classification is never treated as not classified',()=>{const r=evaluateMixture(mix([comp(10,{edhh:'unknown'}),comp(90)]));assert.equal(group(r,'edhh').result,'review');assert.equal(r.overall,'review');});
test('missing share of formula keeps untriggered output in review',()=>{const r=evaluateMixture(mix([comp(25)]));assert.equal(group(r,'pbt').result,'review');assert.equal(r.validation.complete,false);});
test('strong category 2 hit with unknown component notes potential upgrade',()=>{const r=evaluateMixture(mix([comp(1,{edhh:'2'}),comp(99,{edhh:'unknown'})]));assert.equal(group(r,'edhh').result,'triggered');assert.equal(group(r,'edhh').upgradePossible,true);});
test('composition over 100 or gas phase is invalid',()=>{assert.ok(validateMixture(mix([comp(101)])).errors.length);assert.equal(evaluateMixture({phase:'gas',components:[comp(100)]}).overall,'invalid');});
test('no evidence never creates a positive substance classification',()=>{const r=screenSubstance({});for(const g of ['edhh','edenv','pbt','pmt'])assert.equal(r[g].status,'unknown');});
test('all endocrine evidence flags generates only candidate, no sign-off',()=>{const r=screenSubstance({hhActivity:'yes',hhAdverse:'yes',hhLink:'yes'});assert.equal(r.edhh.status,'candidate');});
test('persistence criteria screen PBT and vPvB candidates with robust flags',()=>{const r=screenSubstance({veryPersistent:'yes',veryBioaccumulative:'yes',toxic:'yes'});assert.deepEqual(r.pbt.candidates,['vPvB','PBT']);});
test('substance transition ended on 1 November 2026',()=>{assert.equal(complianceStatus('substance','2026-10-31','yes').status,'transition');assert.equal(complianceStatus('substance','2026-11-01','yes').status,'required');});
test('mixture stock in supply chain before May 2026 may transition until May 2028',()=>{assert.equal(complianceStatus('mixture','2027-03-01','yes').status,'transition');assert.equal(complianceStatus('mixture','2027-03-01','no').status,'required');assert.equal(complianceStatus('mixture','2028-05-01','yes').status,'required');});

test('Single ingredient can carry both PBT and vPvB outcomes without summing different ingredients',()=>{const a=evaluateMixture(mix([comp(0.1,{pbt:'PBT+vPvB'}),comp(99.9)]));assert.deepEqual(group(a,'pbt').categories,['PBT','vPvB']);});
