/** Pure numeric checks for specific CLP 2023/707 criteria. Not a substance classification.
 * All measured values must be evaluated for applicability, quality, biological relevance,
 * relevant constituents/transformation products and complete weight-of-evidence.
 */
export const METRICS=Object.freeze([
 {key:'marineWater',label:'Marine water degradation half-life',unit:'days',p:60,vp:60,section:'4.3.2.1.1(a), 4.3.2.2.1(a)'},
 {key:'freshWater',label:'Fresh / estuarine water half-life',unit:'days',p:40,vp:60,section:'4.3.2.1.1(b), 4.3.2.2.1(a)'},
 {key:'marineSediment',label:'Marine sediment half-life',unit:'days',p:180,vp:180,section:'4.3.2.1.1(c), 4.3.2.2.1(b)'},
 {key:'freshSediment',label:'Fresh / estuarine sediment half-life',unit:'days',p:120,vp:180,section:'4.3.2.1.1(d), 4.3.2.2.1(b)'},
 {key:'soil',label:'Soil degradation half-life',unit:'days',p:120,vp:180,section:'4.3.2.1.1(e), 4.3.2.2.1(c)'},
 {key:'bcf',label:'Aquatic species bioconcentration factor (BCF)',unit:'L/kg',b:2000,vb:5000,section:'4.3.2.1.2, 4.3.2.2.2'},
 {key:'logKoc',label:'log Koc (lowest pH 4–9 if ionisable)',unit:'log10',m:3,vm:2,section:'4.4.2.1.2, 4.4.2.2.2'},
 {key:'chronicEc',label:'Aquatic long-term NOEC or ECx',unit:'mg/L',t:0.01,section:'4.3.2.1.3(a), 4.4.2.1.3(a)'}
]);
export function evaluateNumericEvidence(evidence={}){
  const flags={P:[],vP:[],B:[],vB:[],M:[],vM:[],T:[]},invalid=[],uncertain=[];
  for(const metric of METRICS){
    const input=evidence[metric.key];
    if(input==null || input==='')continue;
    const value=Number(input);
    if(!Number.isFinite(value)||(metric.key==='logKoc'?false:value<0)){invalid.push(`${metric.label}: enter a valid numeric result.`);continue;}
    if(metric.p!==undefined && value>metric.p)flags.P.push(`${metric.label}: ${value} > ${metric.p} days`);
    if(metric.vp!==undefined && value>metric.vp)flags.vP.push(`${metric.label}: ${value} > ${metric.vp} days`);
    if(metric.b!==undefined && value>metric.b)flags.B.push(`BCF ${value} > ${metric.b}`);
    if(metric.vb!==undefined && value>metric.vb)flags.vB.push(`BCF ${value} > ${metric.vb}`);
    if(metric.t!==undefined && value<metric.t)flags.T.push(`Long-term aquatic NOEC/ECx ${value} < ${metric.t} mg/L`);
    if(metric.m!==undefined){
      const context=evidence.ionisable;
      const suitable=context==='no'||context==='yes'&&evidence.phCoverage==='yes';
      if(value<metric.m){
        const target=suitable?flags.M:uncertain;
        target.push(`log Koc ${value} < ${metric.m}: ${suitable?'M numerical indication':'ionisation / pH applicability review needed'}`);
      }
      if(value<metric.vm){
        const target=suitable?flags.vM:uncertain;
        target.push(`log Koc ${value} < ${metric.vm}: ${suitable?'vM numerical indication':'ionisation / pH applicability review needed'}`);
      }
    }
  }
  const supported=Object.fromEntries(Object.entries(flags).map(([k,v])=>[k,v.length>0]));
  const provisional=[];
  if(supported.P&&supported.B&&supported.T)provisional.push('PBT');
  if(supported.vP&&supported.vB)provisional.push('vPvB');
  if(supported.P&&supported.M&&supported.T)provisional.push('PMT');
  if(supported.vP&&supported.vM)provisional.push('vPvM');
  return {flags,supported,provisional,invalid,uncertain,notice:'Numeric comparisons only: absence of a trigger does not mean the criterion is not met. Expert weight-of-evidence and study verification are mandatory.'};
}
