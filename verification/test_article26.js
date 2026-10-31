// Article 26 pictogram precedence regression tests.
// Run from repository root: node verification/test_article26.js
const CLP = require('./engine.js');
let pass = 0, fail = 0;
const t = (name, ok) => {
  if (ok) pass++;
  else { fail++; console.log('FAIL: ' + name); }
};
const one = (label, h, pict, hazardId) => ({
  label, h: typeof h === 'string' ? h.split(' ') : h, picto: [pict],
  hazardId: hazardId || 'manual0'
});
const check = (items, options) => CLP.selectArticle26(items, options || {});
const selected = (x, p) => x.pictograms.some((v) => v.code === p);
const omitted = (x, p) => x.omittedPictograms.some((v) => v.code === p);
const contribution = (x, code, label) =>
  x.pictogramDecisions.find((d)=>d.code===code)?.contributions.find((v)=>v.from===label);
{
  const x=check([one('Acute Tox. 3','H301','GHS06'),one('Acute Tox. 4','H302','GHS07')]);
  t('26b GHS06 removes GHS07 regardless of trigger', selected(x,'GHS06') && omitted(x,'GHS07'));
  t('26b rationale', contribution(x,'GHS07','Acute Tox. 4').basis.includes('(1)(b)'));
}
{
  const x=check([one('Skin Corr. 1','H314','GHS05'),one('Skin Irrit. 2','H315','GHS07')]);
  t('26c skin irritation GHS07 removed by GHS05',omitted(x,'GHS07'));
  t('26c rationale',contribution(x,'GHS07','Skin Irrit. 2').basis.includes('(1)(c)'));
}
{
  const x=check([one('Eye Dam. 1','H318','GHS05'),one('Eye Irrit. 2','H319','GHS07')]);
  t('26c eye irritation GHS07 removed by GHS05',omitted(x,'GHS07'));
}
{
  const x=check([one('Skin Corr. 1','H314','GHS05'),one('Acute Tox. 4','H302','GHS07')]);
  t('GHS05 does not remove GHS07 acute toxicity Cat4',selected(x,'GHS07'));
}
{
  const x=check([one('Skin Corr. 1','H314','GHS05'),one('STOT SE 3','H336','GHS07')]);
  t('GHS05 does not remove GHS07 STOT narcotic effects',selected(x,'GHS07'));
}
{
  const x=check([one('Resp. Sens. 1','H334','GHS08','respSens'),one('Skin Sens. 1','H317','GHS07','skinSens')]);
  t('26d respiratory sensitisation removes skin sensitisation GHS07',omitted(x,'GHS07'));
  t('26d rationale',contribution(x,'GHS07','Skin Sens. 1').basis.includes('(1)(d)'));
}
{
  const x=check([one('Carc. 1B','H350','GHS08','carc'),one('Skin Sens. 1','H317','GHS07','skinSens')]);
  t('GHS08 carcinogenicity does not suppress GHS07 skin sensitisation', selected(x,'GHS07'));
}
{
  const x=check([one('STOT RE 1','H372','GHS08','stotRE'),one('Skin Irrit. 2','H315','GHS07','skin')]);
  t('GHS08 STOT RE does not suppress GHS07 irritation', selected(x,'GHS07'));
}
{
  const x=check([one('Resp. Sens. 1','H334','GHS08','respSens'),one('STOT SE 3','H335','GHS07','stotSE')]);
  t('Resp sens GHS08 does not suppress GHS07 respiratory irritation', selected(x,'GHS07'));
}
{
  const x=check([one('Resp. Sens. 1','H334','GHS08','respSens'),
    one('Skin Sens. 1','H317','GHS07','skinSens'),one('STOT SE 3','H336','GHS07','stotSE')]);
  t('GHS07 retained if any contribution survives',selected(x,'GHS07'));
  t('GHS07 audit explains removed skin sensitisation contribution',
    contribution(x,'GHS07','Skin Sens. 1').decision==='omitted' &&
    contribution(x,'GHS07','STOT SE 3').decision==='retained');
}
{
  const x=check([one('Skin Corr. 1','H314','GHS05'),one('Skin Sens. 1','H317','GHS07','skinSens')]);
  t('GHS05 alone does not suppress GHS07 skin sensitisation',selected(x,'GHS07'));
}
{
  const x=check([one('Skin Corr. 1','H314','GHS05'),one('Skin Irrit. 2','H315','GHS07'),one('Ozone 1','H420','GHS07')]);
  t('Ozone GHS07 survives GHS05 even if irritation does not',selected(x,'GHS07'));
}
{
  const src=[one('GHS01 manual','H201','GHS01'),one('Flam. Liq. 2','H225','GHS02')];
  const initial=check(src), reduced=check(src,{omitOptional:true});
  t('26a GHS02 retained by default',selected(initial,'GHS02'));
  t('26a GHS02 optional when selected',omitted(reduced,'GHS02'));
  t('26a optional omission does not remove classification',src[1].picto[0]==='GHS02');
  t('26a optional documented',contribution(reduced,'GHS02','Flam. Liq. 2').basis.includes('(1)(a)'));
}
{
  const x=check([one('Explosive 1.1','H201','GHS01'),one('Oxid. Sol. 1','H271','GHS03')],{omitOptional:true});
  t('26a GHS03 optional with GHS01',omitted(x,'GHS03'));
}
{
  const x=check([one('Self-react. B','H241','GHS01'),one('Self-react. B','H241','GHS02')],{omitOptional:true});
  t('26a Self-react Type B retains GHS02',selected(x,'GHS02'));
  t('26a Type B exception reason',contribution(x,'GHS02','Self-react. B').reason.includes('mandatory'));
}
{
  const x=check([one('Org. Perox. B','H241','GHS01'),one('Org. Perox. B','H241','GHS02')],{omitOptional:true});
  t('26a organic peroxide Type B retains GHS02',selected(x,'GHS02'));
}
{
  const raw=[one('Flam. Liq. 2','H225','GHS02'),one('Gas under pressure','H280','GHS04')];
  t('26e GHS04 retained by default',selected(check(raw),'GHS04'));
  t('26e GHS04 optionally omitted',omitted(check(raw,{omitOptional:true}),'GHS04'));
  t('26e reason',contribution(check(raw,{omitOptional:true}),'GHS04','Gas under pressure').basis.includes('(1)(e)'));
}
{
  const raw=[one('Acute Tox. 3','H301','GHS06'),one('Gas under pressure','H280','GHS04')];
  t('26e GHS06 permits optional GHS04', omitted(check(raw,{omitOptional:true}),'GHS04'));
}
{
  const x=check([one('Skin Sens. 1','H317','GHS07')]);
  t('No related pictogram -> GHS07 retained',selected(x,'GHS07'));
}
{
  const x=check([one('Unspecified GHS07','H000','GHS07'),one('Eye Dam. 1','H318','GHS05')]);
  t('Unrecognised GHS07 reason is retained rather than guessed away',selected(x,'GHS07'));
}
{
  const x=check([one('Resp. Sens. 1','H334','GHS08','respSens'),one('Skin Irrit. 2','H315','GHS07','skin')]);
  t('26d respiratory sensitisation + irritation excludes GHS07',omitted(x,'GHS07'));
}
{
  const x=check([one('Resp. Sens. 1','H334','GHS08','respSens'),one('Acute Tox. 4','H302','GHS07','acute')]);
  t('26d respiratory sensitisation does not remove GHS07 acute cat4',selected(x,'GHS07'));
}
{
  const x=check([one('Acute Tox. 3','H301','GHS06'),one('Skin Irrit. 2','H315','GHS07')]);
  t('Classification sources are not mutated', x.triggeredPictograms.some(p=>p.code==='GHS07') && omitted(x,'GHS07'));
}
{
  const x=CLP.classify({ingredients:[],manual:[
    {label:'Acute Tox. 3',h:'H301',signal:'Danger',picto:'GHS06'},
    {label:'Skin Irrit. 2',h:'H315',signal:'Warning',picto:'GHS07'}
  ]});
  t('Integrated result includes final pictograms',selected(x.label,'GHS06')&&!selected(x.label,'GHS07'));
  t('Integrated result retains original classification',x.outcomes.length===2);
  t('Article 26 report includes audit',CLP.report({ingredients:[],manual:[
    {label:'Acute Tox. 3',h:'H301',picto:'GHS06'},
    {label:'Skin Irrit. 2',h:'H315',picto:'GHS07'}
  ]},x).includes('ARTICLE 26 PICTOGRAM AUDIT'));
}
console.log('\n'+pass+' Article 26 tests passed, '+fail+' failed');
process.exit(fail ? 1 : 0);
