// Regression: substance-specific concentration limits, ATEs and M factors.
// node verification/test_specific_values.js
const C=require('./engine.js');let pass=0,fail=0;
const check=(n,x)=>{if(x)pass++;else{fail++;console.log('FAIL: '+n)}};
const classify=(ingredients,opts={})=>C.classify({ingredients:ingredients.map((i,k)=>({name:i.name||'Ingredient '+(k+1),...i})),...opts});
const single=(pct,data)=>classify([{name:'active',pct,...data},{name:'inert',pct:100-pct}]);
const H=(r,id)=>r.hazards.find(h=>h.id===id),label=(r,x)=>r.outcomes.some(o=>o.label===x);
const warn=(r,x)=>r.warnings.some(w=>w.includes(x));
// SCL generic replacement and 2-ingredient additivity
{
const x=single(0.7,{skinCorr:'1B',scl:{skinCorr:0.5}});
check('0.5% skin corrosion SCL below 1%',label(x,'Skin Corr. 1B'));
check('SCL weighted rationale',H(x,'skin').steps.some(y=>y.includes('SCL-aware')));
}
{
const x=single(5.4,{skinCorr:'1B',scl:{skinCorr:10,skinIrrit:5}});
check('Above generic but below high skin corrosion SCL',!label(x,'Skin Corr. 1B'));
check('Explicit skin irritation SCL',label(x,'Skin Irrit. 2'));
}
{
const x=single(5.4,{skinCorr:'1B'});
check('Generic skin corrosion remains',label(x,'Skin Corr. 1B'));
}
{
const x=classify([{pct:0.3,skinCorr:'1B',scl:{skinCorr:0.5}},{pct:0.3,skinCorr:'1B',scl:{skinCorr:0.5}},{pct:99.4}]);
check('Two below-SCL corrosives sum to corrosion',label(x,'Skin Corr. 1B'));
check('Low-concentration evidence note shown',H(x,'skin').notes.some(y=>y.includes('below 1 %')));
}
{
const x=classify([{pct:1,skinCorr:'2',scl:{skinIrrit:2}},{pct:5,skinCorr:'2'},{pct:94}]);
check('Skin irritant weighted SCL/GCL sum',label(x,'Skin Irrit. 2'));
}
{
const x=single(0.3,{nonAdditive:true,skinCorr:'1B',scl:{skinCorr:0.2}});
check('Non-additive skin SCL below 1%',label(x,'Skin Corr. 1'));
}
{
const x=single(0.3,{eye:'1',scl:{eyeDam:0.2}});
check('Eye damage SCL <1%',label(x,'Eye Dam. 1'));
}
{
const x=single(0.7,{eye:'2',scl:{eyeIrrit:0.5}});
check('Eye irritation SCL <1%',label(x,'Eye Irrit. 2'));
}
{
const x=single(4,{eye:'1',scl:{eyeDam:10,eyeIrrit:2}});
check('High Eye Dam SCL avoids generic overclassification',!label(x,'Eye Dam. 1'));
check('Eye irritation fallback SCL remains',label(x,'Eye Irrit. 2'));
}
{
const x=classify([{pct:1,eye:'2',scl:{eyeIrrit:2}},{pct:5,eye:'2'},{pct:94}]);
check('Weighted eye irritation combination',label(x,'Eye Irrit. 2'));
}
{
const x=single(0.4,{eye:'1',nonAdditive:true,scl:{eyeDam:0.3}});
check('Non-additive eye damage SCL',label(x,'Eye Dam. 1'));
}
{
const x=single(12,{skinCorr:'2',scl:{skinIrrit:'invalid'}});
check('Malformed skin SCL explicitly flagged',warn(x,'invalid SCL skinIrrit'));
check('Malformed SCL falls back to generic as provisional',label(x,'Skin Irrit. 2'));
}
{
const x=single(5,{eye:'2',scl:{eyeIrrit:0}});
check('Zero SCL invalid',warn(x,'invalid SCL eyeIrrit'));
}
{
const x=single(5,{eye:'2',scl:{eyeIrrit:101}});
check('SCL above 100% invalid',warn(x,'invalid SCL eyeIrrit'));
}
// Acute toxicity conversion, mismatch, and route-specific unknowns
{
const x=single(10,{acute:{oral:{cat:'3'},dermal:{},inh:{form:'vapour'}}});
check('Acute toxicity category conversion',H(x,'acute').steps.some(z=>z.includes('Table 3.1.2 conversion')));
check('10% Cat3 oral conversion gives ATE mix1000',x.outcomes.some(o=>o.label==='Acute Tox. 4 (oral)'&&o.ate===1000));
}
{
const x=single(1,{acute:{oral:{cat:'4',ate:5},dermal:{},inh:{form:'vapour'}}});
check('ATE precedes category and is used in formula',H(x,'acute').steps.some(z=>z.includes('1 % ÷ 5')));
check('Contradictory source category is flagged',warn(x,'conflicts with entered ATE'));
}
{
const x=single(10,{acute:{oral:{cat:'3',ate:'bad'},dermal:{},inh:{form:'vapour'}}});
check('Invalid ATE alerted',warn(x,'invalid oral ATE'));
check('Category still provides converted fallback',H(x,'acute').steps.some(z=>z.includes('Table 3.1.2 conversion')));
}
{
const x=single(10,{acute:{oral:{cat:'3',ate:-10},dermal:{},inh:{form:'vapour'}}});
check('Negative ATE alerted',warn(x,'invalid oral ATE'));
}
{
const x=single(10,{acute:{oral:{cat:'3',ate:0},dermal:{},inh:{form:'vapour'}}});
check('Zero ATE alerted',warn(x,'invalid oral ATE'));
}
{
const x=classify([{name:'known',pct:10,acute:{oral:{ate:100},dermal:{},inh:{form:'vapour'}}},
{name:'unknown',pct:20,acute:{oral:{unknown:true},dermal:{},inh:{form:'vapour'}}},{pct:70}]);
check('Oral unknown >10 corrects ATEmix numerator to 80',x.outcomes.some(o=>o.label==='Acute Tox. 4 (oral)'&&Math.abs(o.ate-800)<1e-8));
check('Unknown oral part documented',H(x,'acute').steps.some(s=>s.includes('oral unknown data:')));
}
{
const x=classify([{name:'known',pct:10,acute:{oral:{ate:100},dermal:{},inh:{form:'vapour'}}},
{name:'unknown dermal',pct:20,acute:{oral:{},dermal:{unknown:true},inh:{form:'vapour'}}},{pct:70}]);
check('Unknown dermal does not affect oral formula',x.outcomes.some(o=>o.label==='Acute Tox. 4 (oral)'&&Math.abs(o.ate-1000)<1e-8));
check('Unknown dermal route shown separately',H(x,'acute').steps.some(s=>s.includes('dermal unknown data:')));
}
{
const x=single(20,{acute:{oral:{ate:100},dermal:{},inh:{form:'vapour'},unknown:true}});
check('Legacy unknown does not double count known oral ATE',H(x,'acute').steps.some(s=>s.includes('ATEmix = 100 /')));
check('Legacy unknown conflicts flagged',warn(x,'marked unknown acute toxicity'));
}
{
const x=single(15,{acute:{oral:{unknown:true},dermal:{},inh:{form:'vapour'}}});
check('Unknown route without ATE is incomplete',H(x,'acute').status==='incomplete');
}
{
const x=single(50,{acute:{oral:{},dermal:{},inh:{form:'gas',cat:'3'}}});
check('Inhalation gas uses ppmV conversion values',H(x,'acute').steps.some(s=>s.includes('inhalation (gas) (ppmV)')&&s.includes('700')));
}
// M-factor independent application and completeness
{
const x=single(0.1,{aquaChronic:'1',mChronic:100});
check('Chronic M=100 at 0.1% gives aquatic chronic2',label(x,'Aquatic Chronic 2'));
check('Explicit M factor avoids missing-M warning',!warn(x,'M-factor is missing'));
}
{
const x=single(0.1,{aquaChronic:'1'});
check('Missing chronic M-factor flagged',warn(x,'Chronic 1 M-factor is missing'));
check('No aquatic negative without known M-factor',H(x,'aquatic').status==='incomplete');
}
{
const x=single(0.1,{aquaChronic:'1',mChronic:0});
check('Zero M factor is invalid',warn(x,'invalid mChronic'));
}
{
const x=single(3,{aquaAcute:true,mAcute:0.5});
check('Fractional M factor flagged',warn(x,'invalid mAcute'));
}
{
const x=single(0.3,{aquaAcute:true,mAcute:100});
check('Acute M100 at low level',label(x,'Aquatic Acute 1'));
}
{
const x=single(0.3,{aquaAcute:true,mAcute:100,aquaChronic:'1',mChronic:1});
check('Acute M applied independently',label(x,'Aquatic Acute 1'));
check('Chronic M applied independently',!label(x,'Aquatic Chronic 1'));
}
{
const x=single(0.3,{aquaAcute:true,mAcute:'garbage'});
check('Invalid acute M factor flagged',warn(x,'invalid mAcute'));
check('No definitive aquatic negative for invalid M',H(x,'aquatic').status==='incomplete');
}
{
const x=single(5,{aquaChronic:'2',mChronic:10});
check('Unneeded chronic M-factor flagged',warn(x,'mChronic supplied but'));
}
{
const x=single(26,{aquaAcute:true});
check('Lower bound positive aquatic still flagged provisional',label(x,'Aquatic Acute 1')&&warn(x,'Acute 1 M-factor is missing'));
}
{
const x=single(101,{aquaChronic:'1',mChronic:100});
check('Mixture percentage over 100 validated',warn(x,'Total mixture concentration exceeds 100%'));
}
{
const mix={ingredients:[{name:'source A',pct:10,eye:'2',scl:{eyeIrrit:3},valueSource:'Supplier SDS revision 5'}, {name:'balance',pct:90}]};
const x=C.classify(mix);
const report=C.report(mix,x);
check('SCL/ATE/M-factor source evidence included in report',report.includes('Specific value source: Supplier SDS revision 5'));
check('Source references redacted from anonymised report',!C.report(mix,x,{anonymise:true}).includes('Supplier SDS revision 5'));
check('Evidence review warning absent when source recorded',!warn(x,'no source reference is recorded'));
}
{
const x=single(4,{skinCorr:'1B',scl:{skinCorr:10,skinIrrit:5}});
check('Skin corrosion SCL without specific eye assessment flagged',warn(x,'Skin corrosion SCLs were entered'));
}
{
const x=single(5,{eye:'2',scl:{eyeIrrit:3}});
check('SCL without evidence reference flagged for regulatory review',warn(x,'no source reference is recorded'));
}
{
const x=single(20,{acute:{oral:{cat:'3',ate:100,unknown:true},dermal:{cat:'4',ate:1000},inh:{form:'vapour',cat:'4',ate:10},unknown:true}});
check('All routes with valid data do not create unknown acute toxicity statement',
 !(x.label.supplemental||[]).some(s=>s.includes('unknown acute toxicity')));
}
{
const x=single(20,{acute:{oral:{ate:'bad'},dermal:{},inh:{form:'vapour'}}});
check('Invalid ATE without category is recorded as incomplete',H(x,'acute').status==='incomplete');
}
// M-factors must be powers of ten (Annex I Table 4.1.3); other integers are invalid input.
{
for (const m of [1,10,100,1000,'10','1e2'])
  check('M-factor '+m+' accepted',C.isValidMFactor(m));
for (const m of [0,2,3,5,15,20,50,110,0.5,-10,'','abc',null,undefined])
  check('M-factor '+JSON.stringify(m)+' rejected',!C.isValidMFactor(m));
const x=single(5,{aquaAcute:true,mAcute:5,aquaChronic:'1',mChronic:5});
check('M=5 flagged as invalid (acute)',warn(x,'invalid mAcute'));
check('M=5 flagged as invalid (chronic)',warn(x,'invalid mChronic'));
check('M=5 is not used as a multiplier',!label(x,'Aquatic Acute 1')&&!label(x,'Aquatic Chronic 1'));
check('M=5 falls back to the M=1 lower-bound screen',label(x,'Aquatic Chronic 2'));
check('M=5 result is marked provisional',H(x,'aquatic').steps.some(s=>/PROVISIONAL/.test(s)));
const y=single(5,{aquaAcute:true,mAcute:10,aquaChronic:'1',mChronic:10});
check('M=10 at 5% still gives Acute 1 and Chronic 1',label(y,'Aquatic Acute 1')&&label(y,'Aquatic Chronic 1'));
check('M=10 is not flagged as invalid',!warn(y,'invalid mAcute')&&!warn(y,'invalid mChronic'));
}
// Anonymised reports must not reveal ingredient names, CAS/EC numbers or the
// mixture name anywhere (warnings, notes, SDS triggers, supplemental text).
{
const mix={name:'SecretProduct',state:'liquid',ingredients:[
  {name:'AcmeSecretSolvent',cas:'123-45-6',pct:60},
  {name:'ProprietaryBiocideX',cas:'999-99-9',pct:0.05,skinSens:'1A'},
  {name:'HiddenCarc',cas:'111-11-1',pct:0.5,carc:'2'},
  {name:'',cas:'222-22-2',pct:1,acute:{oral:{ate:'-5'},dermal:{},inh:{form:'vapour'}}},
  {name:'DroppedThing',cas:'333-33-3',pct:0},
  {name:'Acid',pct:2,skinCorr:'1B',scl:{skinCorr:0.5}},
  {name:'WaterBase',pct:36.45}]};
const x=C.classify(mix);
const plain=C.report(mix,x), anon=C.report(mix,x,{anonymise:true});
const secrets=['AcmeSecretSolvent','ProprietaryBiocideX','HiddenCarc','222-22-2','DroppedThing','333-33-3','SecretProduct','WaterBase','123-45-6'];
check('Plain report still names ingredients',['ProprietaryBiocideX','HiddenCarc','222-22-2'].every(s=>plain.includes(s)));
secrets.forEach(s=>check('Anonymised report omits '+s,!anon.includes(s)));
check('Anonymised SDS trigger uses the ingredient label',/SDS available on request: Carc\. 2 ingredient Ingredient C/.test(anon));
check('Anonymised warning for unnamed ingredient uses its label',/DATA VALIDATION: Ingredient D /.test(anon));
check('Excluded ingredient is redacted in warnings',anon.includes('an excluded ingredient'));
check('Short ingredient name replaced as a whole word only',!/\bAcid\b/.test(anon)&&anon.includes('acids, bases'));
}
{
const many={ingredients:Array.from({length:28},(_,k)=>({name:'Comp'+k+'X',pct:k<27?3:19}))};
const anon=C.report(many,C.classify(many),{anonymise:true});
check('More than 26 ingredients get distinct labels',anon.includes('Ingredient Z:')&&anon.includes('Ingredient AA:')&&anon.includes('Ingredient AB:'));
check('No raw names with many ingredients',!/Comp\d+X/.test(anon));
}
console.log('\n'+pass+' specific-value checks passed, '+fail+' failed');
process.exit(fail?1:0);
