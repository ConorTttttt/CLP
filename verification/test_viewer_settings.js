// Verify Viewer Settings against the actual renderer embedded in the HTML.
// Run: node verification/test_viewer_settings.js
const fs=require('fs'), assert=require('assert').strict;
const html=fs.readFileSync('clp_mixture_calculator.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(scripts.length,2);
const app=scripts[1];
function extract(a,b){const start=app.indexOf(a),end=app.indexOf(b,start);assert.ok(start>=0&&end>start,a);return app.slice(start,end)}
const code=extract('const VIEWER_STORE = ','\nlet mix =')+extract('/* ---------- results ---------- */','let tm = null;');
let passed=0;function test(label,fn){try{fn();passed++}catch(e){throw Error(label+': '+e.message)}}
function setup(saved={}){
 const store=new Map(Object.entries(saved)),localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const elements={};const $=id=>elements[id]||(elements[id]={innerHTML:'',textContent:'',hidden:false,events:{},addEventListener(k,f){this.events[k]=f}});
 const document={nodes:[],querySelectorAll(){this.nodes=[...$('res').innerHTML.matchAll(/data-view="([^"]+)"/g)].map(m=>({dataset:{view:m[1]},hidden:false}));return this.nodes}};
 const esc=x=>String(x||'');
 const ui=new Function('
 return {ui,store,$,document};
}
function example(){
 return {warnings:['IMPORTANT VALIDATION WARNING'],incomplete:['Unverified ingredient'],
 outcomes:[],nodata:[],sds:[],hazards:[],notes:[],
 label:{signal:'',pictograms:[],hazardStatements:[],euhStatements:[],supplemental:[],
 precautionaryStatements:[{code:'P305+P351+P338',text:'Rinse eyes',legalStatus:'candidate'}],
 pictogramDecisions:[],omittedPictograms:[],pictogramReview:[],pictogramExplanations:[],
 decisions:[],review:[],article28:{selected:[],candidates:[],review:[],requiredObligations:[],warnings:[],uncovered:[],limit:6,scope:'Partial'}}};
}
test('Collapsible settings panel present',()=>assert.ok(html.includes('id="viewersettings"')));
test('Every section has a visible toggle',()=>{
 const x=setup();assert.equal(x.ui.VIEWER_OPTIONS.length,17);
 for(const key of ['classification','label','article26','article27','article28','sds','calculation','ingredientsInsight','notes'])
  assert.ok(html.includes('data-view="'+key+'"'),key);
});
test('All toggles default to visible',()=>{
 const x=setup();x.ui.renderResult(example());
 assert.ok(x.document.nodes.every(n=>!n.hidden));
});
test('Label detail toggles do not hide each other',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({labelP:false});
 assert.ok(x.document.nodes.find(n=>n.dataset.view==='labelP').hidden);
 assert.ok(!x.document.nodes.find(n=>n.dataset.view==='labelH').hidden);
});
test('Panel toggles do not hide warnings or incomplete data',()=>{
 const x=setup();x.ui.renderResult(example());
 x.ui.setViewerPreferences(Object.fromEntries(x.ui.VIEWER_OPTIONS.map(o=>[o.key,false])));
 assert.ok(x.$('res').innerHTML.includes('IMPORTANT VALIDATION WARNING'));
 assert.ok(x.$('res').innerHTML.includes('Unverified ingredient'));
});
test('Report visibility independent of calculation',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({report:false});
 assert.equal(x.$('repbox').hidden,true);
});
test('Viewer preferences persist locally and are sanitised',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({article28:false});
 const saved=x.store.get('clp_calc_viewer_settings_v1');assert.ok(saved);
 assert.equal(setup({'clp_calc_viewer_settings_v1':saved}).ui.viewerSettings.article28,false);
 const y=setup({'clp_calc_viewer_settings_v1':'{"label":7,"unknown":false}'});
 assert.equal(y.ui.viewerSettings.label,true);
 assert.ok(!Object.hasOwn(y.ui.viewerSettings,'unknown'));
});
test('Controls apply immediately',()=>{
 const x=setup();x.ui.renderResult(example());
 x.$('viewer-controls').events.change({target:{closest:()=>({dataset:{viewSetting:'article26'},checked:false})}});
 assert.ok(x.document.nodes.find(n=>n.dataset.view==='article26').hidden);
});
test('Hide audits shortcut preserves classification',()=>{
 const x=setup();x.ui.renderResult(example());x.$('viewer-hide-audits').events.click();
 assert.ok(['article26','article27','article28'].every(k=>x.document.nodes.find(n=>n.dataset.view===k).hidden));
 assert.ok(!x.document.nodes.find(n=>n.dataset.view==='classification').hidden);
});
test('Show all restores defaults',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({article26:false});
 x.$('viewer-show-all').events.click();
 assert.ok(x.document.nodes.every(n=>!n.hidden));
});
console.log(passed+' viewer settings tests passed');
,'document','localStorage','esc','CLP','mix','ingredientHCodes',code+
   '\nreturn {renderResult,setViewerPreferences,viewerSettings,VIEWER_OPTIONS};')($,document,localStorage,esc,{fmt:String,num:Number},{ingredients:[],state:'liquid'},()=>[]);
 return {ui,store,$,document};
}
function example(){
 return {warnings:['IMPORTANT VALIDATION WARNING'],incomplete:['Unverified ingredient'],
 outcomes:[],nodata:[],sds:[],hazards:[],notes:[],
 label:{signal:'',pictograms:[],hazardStatements:[],euhStatements:[],supplemental:[],
 precautionaryStatements:[{code:'P305+P351+P338',text:'Rinse eyes',legalStatus:'candidate'}],
 pictogramDecisions:[],omittedPictograms:[],pictogramReview:[],pictogramExplanations:[],
 decisions:[],review:[],article28:{selected:[],candidates:[],review:[],requiredObligations:[],warnings:[],uncovered:[],limit:6,scope:'Partial'}}};
}
test('Collapsible settings panel present',()=>assert.ok(html.includes('id="viewersettings"')));
test('Every section has a visible toggle',()=>{
 const x=setup();assert.equal(x.ui.VIEWER_OPTIONS.length,16);
 for(const key of ['classification','label','article26','article27','article28','sds','calculation','notes'])
  assert.ok(html.includes('data-view="'+key+'"'),key);
});
test('All toggles default to visible',()=>{
 const x=setup();x.ui.renderResult(example());
 assert.ok(x.document.nodes.every(n=>!n.hidden));
});
test('Label detail toggles do not hide each other',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({labelP:false});
 assert.ok(x.document.nodes.find(n=>n.dataset.view==='labelP').hidden);
 assert.ok(!x.document.nodes.find(n=>n.dataset.view==='labelH').hidden);
});
test('Panel toggles do not hide warnings or incomplete data',()=>{
 const x=setup();x.ui.renderResult(example());
 x.ui.setViewerPreferences(Object.fromEntries(x.ui.VIEWER_OPTIONS.map(o=>[o.key,false])));
 assert.ok(x.$('res').innerHTML.includes('IMPORTANT VALIDATION WARNING'));
 assert.ok(x.$('res').innerHTML.includes('Unverified ingredient'));
});
test('Report visibility independent of calculation',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({report:false});
 assert.equal(x.$('repbox').hidden,true);
});
test('Viewer preferences persist locally and are sanitised',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({article28:false});
 const saved=x.store.get('clp_calc_viewer_settings_v1');assert.ok(saved);
 assert.equal(setup({'clp_calc_viewer_settings_v1':saved}).ui.viewerSettings.article28,false);
 const y=setup({'clp_calc_viewer_settings_v1':'{"label":7,"unknown":false}'});
 assert.equal(y.ui.viewerSettings.label,true);
 assert.ok(!Object.hasOwn(y.ui.viewerSettings,'unknown'));
});
test('Controls apply immediately',()=>{
 const x=setup();x.ui.renderResult(example());
 x.$('viewer-controls').events.change({target:{closest:()=>({dataset:{viewSetting:'article26'},checked:false})}});
 assert.ok(x.document.nodes.find(n=>n.dataset.view==='article26').hidden);
});
test('Hide audits shortcut preserves classification',()=>{
 const x=setup();x.ui.renderResult(example());x.$('viewer-hide-audits').events.click();
 assert.ok(['article26','article27','article28'].every(k=>x.document.nodes.find(n=>n.dataset.view===k).hidden));
 assert.ok(!x.document.nodes.find(n=>n.dataset.view==='classification').hidden);
});
test('Show all restores defaults',()=>{
 const x=setup();x.ui.renderResult(example());x.ui.setViewerPreferences({article26:false});
 x.$('viewer-show-all').events.click();
 assert.ok(x.document.nodes.every(n=>!n.hidden));
});
console.log(passed+' viewer settings tests passed');
