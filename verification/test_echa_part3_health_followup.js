// ECHA Part 3 (Version 5.0, Nov 2024) regression scenarios:
// extreme pH pp. 78–80 / 106–108; sensitisation Table 3.4.6 p. 142;
// STOT-SE Cat. 3 component effects pp. 239–241.
const assert = require('assert').strict;
const CLP = require('./engine');

let passed = 0;
const run = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const mk = (name, pct, detail = {}) => Object.assign(CLP.blankIngredient(), { name, pct }, detail);
const withCarrier = (i, mix = {}) =>
  CLP.classify({ state: 'liquid', ingredients: [i, mk('Carrier', 100 - i.pct)], ...mix });
const has = (r, label) => r.outcomes.some(o => o.label === label);
const haz = (r,id) => r.hazards.find(h => h.id === id);
const notes = r => r.warnings.join(' | ');

run('Reserve indication alone cannot negate extreme-pH skin/eye classification', () => {
  const r = withCarrier(mk('Carrier',100), {pH:'12',pHReserveOk:true});
  assert.ok(has(r,'Skin Corr. 1'));
  assert.ok(has(r,'Eye Dam. 1'));
  assert.ok(notes(r).includes('acid/alkaline reserve'));
  assert.ok(haz(r,'skin').steps.some(s => s.includes('provisional Skin Corr. 1')));
});
run('Acidic boundary pH 2 with reserve flag retains both severe outcomes', () => {
  const r = withCarrier(mk('Carrier',100),{pH:'2',pHReserveOk:true});
  assert.ok(has(r,'Skin Corr. 1') && has(r,'Eye Dam. 1'));
});
run('Reserve indication at non-extreme pH does not itself trigger corrosion', () => {
  const r = withCarrier(mk('Carrier',100),{pH:'7',pHReserveOk:true});
  assert.ok(!has(r,'Skin Corr. 1') && !has(r,'Eye Dam. 1'));
  assert.ok(!notes(r).includes('acid/alkaline reserve'));
});
run('Extreme pH with corrosive ingredient SCL requests exception review', () => {
  const r = withCarrier(mk('Acid/base ingredient',1,{skinCorr:'1B',scl:{skinCorr:5}}),
    {pH:'1.5'});
  assert.ok(has(r,'Skin Corr. 1'));
  assert.ok(notes(r).includes('sole corrosive/irritant ingredient'));
});
run('Skin Sens 1B SCL 5%: elicitation stays at 0.1%, not 0.5%', () => {
  const r = withCarrier(mk('Sensitiser',0.1,{skinSens:'1B',scl:{skinSens:5}}));
  assert.ok(!has(r,'Skin Sens. 1B'));
  assert.ok(r.label.euhStatements.some(s=>s.code==='EUH208'));
});
run('Skin Sens 1B SCL 0.5%: no premature EUH208 at 0.05%', () => {
  const r = withCarrier(mk('Sensitiser',0.05,{skinSens:'1B',scl:{skinSens:0.5}}));
  assert.ok(!r.label.euhStatements.some(s=>s.code==='EUH208'));
});
run('Skin Sens 1A SCL 0.3%: retain 0.01% elicitation', () => {
  const r = withCarrier(mk('Sensitiser',0.01,{skinSens:'1A',scl:{skinSens:0.3}}));
  assert.ok(r.label.euhStatements.some(s=>s.code==='EUH208'));
});
run('SCL below 0.1%: elicitation is one tenth of the SCL', () => {
  const pos=withCarrier(mk('Sensitiser',0.005,{skinSens:'1B',scl:{skinSens:0.05}}));
  const neg=withCarrier(mk('Sensitiser',0.004,{skinSens:'1B',scl:{skinSens:0.05}}));
  assert.ok(pos.label.euhStatements.some(s=>s.code==='EUH208'));
  assert.ok(!neg.label.euhStatements.some(s=>s.code==='EUH208'));
});
run('Respiratory sensitiser 1B gas with SCL 0.5% still elicits at 0.1%', () => {
  const r=CLP.classify({state:'gas',ingredients:[
    mk('Sensitiser',0.1,{respSens:'1B',scl:{respSens:0.5}}),
    mk('Carrier',99.9)]});
  assert.ok(!has(r,'Resp. Sens. 1B'));
  assert.ok(r.label.euhStatements.some(s=>s.code==='EUH208'));
});
run('STOT SE Cat 3 unspecified must not silently emit H335 and H336', () => {
  const r=withCarrier(mk('Unspecified',25,{stotSE:'3'}));
  assert.ok(!has(r,'STOT SE 3 (respiratory irritation)'));
  assert.ok(!has(r,'STOT SE 3 (narcotic effects)'));
  assert.equal(haz(r,'stotSE').status,'incomplete');
  assert.ok(notes(r).includes('not specified'));
});
run('Unknown STOT SE 3 effect must not inflate known narcotic component', () => {
  const r=CLP.classify({ingredients:[
    mk('Unspecified',12,{stotSE:'3'}),
    mk('Narcotic',10,{stotSE:'3',stotSEnarc:true}),mk('Carrier',78)]});
  assert.ok(!has(r,'STOT SE 3 (narcotic effects)'));
  assert.ok(!has(r,'STOT SE 3 (respiratory irritation)'));
  assert.ok(notes(r).includes('not specified'));
});
run('STOT SE specified dual effect still triggers both independently', () => {
  const r=withCarrier(mk('Both effects',20,{stotSE:'3',stotSEresp:true,stotSEnarc:true}));
  assert.ok(has(r,'STOT SE 3 (respiratory irritation)'));
  assert.ok(has(r,'STOT SE 3 (narcotic effects)'));
});
run('Out-of-range SCL cannot suppress skin sensitisation classification', () => {
  const r = withCarrier(mk('Sensitiser',1,{skinSens:'1B',scl:{skinSens:150}}));
  assert.ok(has(r,'Skin Sens. 1B'));
  assert.ok(notes(r).includes('invalid SCL skinSens'));
});
run('Out-of-range SCL cannot suppress carcinogenicity', () => {
  const r = withCarrier(mk('Carcinogen',0.1,{carc:'1B',scl:{carc:150}}));
  assert.ok(has(r,'Carc. 1B'));
  assert.ok(notes(r).includes('invalid SCL carc'));
});
run('Out-of-range SCL cannot suppress reproductive toxicity', () => {
  const r = withCarrier(mk('Reprotoxicant',0.3,{reproFert:'1B',scl:{reproFert:150}}));
  assert.ok(has(r,'Repr. 1B'));
  assert.ok(notes(r).includes('invalid SCL reproFert'));
});
run('Out-of-range SCL cannot suppress STOT SE Category 1', () => {
  const r = withCarrier(mk('Target-organ toxicant',10,{stotSE:'1',scl:{stotSE:150}}));
  assert.ok(has(r,'STOT SE 1'));
  assert.ok(notes(r).includes('invalid SCL stotSE'));
});
run('Out-of-range SCL cannot suppress STOT RE Category 2', () => {
  const r = withCarrier(mk('Target-organ toxicant',10,{stotRE:'2',scl:{stotRE:150}}));
  assert.ok(has(r,'STOT RE 2'));
  assert.ok(notes(r).includes('invalid SCL stotRE'));
});
console.log(passed + ' ECHA Part 3 follow-up checks passed');
