import {RULESET, GROUPS, evaluateMixture, screenSubstance, complianceStatus,formatPercent} from './rules.js';
import {normaliseIdentifier, validChemicalIdentifier, registryAssessment,makeRegistryRecord,applyReviewedLibrary,createMixtureReviewQueue} from './workflow.js';
import {METRICS,evaluateNumericEvidence} from './metrics.js';
const KEY='clp-new-hazards-v2';
const OLD_KEY='clp-new-hazards-v1';
const $=sel=>document.querySelector(sel);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const asLocalDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const newIngredient=()=>({id:`i-${Date.now()}-${Math.random().toString(16).slice(2,8)}`,name:'',cas:'',concentration:null,edhh:'unknown',edenv:'unknown',pbt:'unknown',pmt:'unknown',source:'',provenance:{}});
const defaults=()=>({mixture:{name:'',phase:'liquid',date:asLocalDate(),older:'unknown',components:[newIngredient()],edReview:{whole:'unknown',bridging:'unknown',expertNotes:'',reviewer:''}},substance:{name:'',cas:'',date:asLocalDate(),older:'unknown',sources:'',reviewer:'',evidence:{},numeric:{},decisions:{}},library:[],audit:[]});
function load(){try{const raw=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD_KEY));if(!raw || !raw.mixture || !raw.substance || !Array.isArray(raw.mixture.components))return defaults();const d=defaults();return {...d,...raw,library:Array.isArray(raw.library)?raw.library:[],audit:Array.isArray(raw.audit)?raw.audit:[],mixture:{...d.mixture,...raw.mixture,edReview:{...d.mixture.edReview,...raw.mixture.edReview}},substance:{...d.substance,...raw.substance,numeric:{...d.substance.numeric,...raw.substance.numeric},decisions:{...d.substance.decisions,...raw.substance.decisions}}};}catch{return defaults();}}
let state=load();
const logAction=(type,detail)=>{state.audit.push({date:new Date().toISOString(),type,detail});if(state.audit.length>300)state.audit=state.audit.slice(-300)};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{toast('Browser storage unavailable. Export a JSON copy to retain your work.')}};
let toastTimer;
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),4500)}
const option=(v,label,selected)=>`<option value="${escapeHTML(v)}" ${selected===v?'selected':''}>${escapeHTML(label)}</option>`;
const classSelect=(group,val)=>{
  const options={
    edhh:[['unknown','Not assessed'],['none','Not classified · reviewed'],['1','Category 1'],['2','Category 2']],
    edenv:[['unknown','Not assessed'],['none','Not classified · reviewed'],['1','Category 1'],['2','Category 2']],
    pbt:[['unknown','Not assessed'],['none','Not classified · reviewed'],['PBT','PBT'],['vPvB','vPvB'],['PBT+vPvB','PBT + vPvB']],
    pmt:[['unknown','Not assessed'],['none','Not classified · reviewed'],['PMT','PMT'],['vPvM','vPvM'],['PMT+vPvM','PMT + vPvM']],
  };return options[group].map(([value,label])=>option(value,label,val)).join('');
};
function drawComponents(){
  $('#ingredient-rows').innerHTML=state.mixture.components.map((c,i)=>`<tr>
    <td><div class="name-stack inline-field"><input aria-label="Ingredient ${i+1} name" data-idx="${i}" data-field="name" value="${escapeHTML(c.name)}" placeholder="Ingredient name" /><input aria-label="Ingredient ${i+1} CAS" data-idx="${i}" data-field="cas" value="${escapeHTML(c.cas)}" placeholder="CAS / EC number" /><div class="row-buttons"><button type="button" class="auto-button" data-auto="${i}">↻ Match reviewed record</button><button type="button" class="auto-button" data-assess="${i}">◇ Guided assessment</button></div>${Object.keys(c.provenance||{}).length?`<span class="audit-chip">${Object.keys(c.provenance).length} reviewed groups linked</span>`:''}</div></td>
    <td><div class="inline-field"><input type="number" min="0" max="100" step="any" aria-label="Ingredient ${i+1} concentration" data-idx="${i}" data-field="concentration" value="${c.concentration==null?'':escapeHTML(c.concentration)}" placeholder="0.0000" /></div></td>
    ${GROUPS.map(g=>`<td><div class="inline-field"><select aria-label="Ingredient ${i+1}, ${escapeHTML(g.title)}" data-idx="${i}" data-field="${g.key}">${classSelect(g.key,c[g.key]||'unknown')}</select></div></td>`).join('')}
    <td><div class="inline-field"><input aria-label="Ingredient ${i+1} evidence reference" data-idx="${i}" data-field="source" value="${escapeHTML(c.source)}" placeholder="SDS / dossier / legal source" /></div></td>
    <td><button class="remove-row" data-remove="${i}" title="Remove ingredient ${i+1}" aria-label="Remove ingredient ${i+1}">×</button></td>
  </tr>`).join('');
}
const labelStatus=(status)=>({triggered:'Threshold met',review:'Needs review',not_triggered:'No ingredient trigger',invalid:'Input error'})[status]||'Needs review';
function drawMixtureResults(){
  const a=evaluateMixture(state.mixture),c=$('#overall-status');
  c.className=`status-badge ${a.overall==='invalid'?'status-error':a.overall==='triggered'?'status-hit':a.overall==='not_triggered'?'status-clear':'status-review'}`;
  c.textContent= a.overall==='invalid'?'Input errors':a.overall==='triggered'?'One or more thresholds met':a.overall==='not_triggered'?'No ingredient threshold met':'Review required';
  $('#component-count').textContent=`${state.mixture.components.length} ingredient${state.mixture.components.length===1?'':'s'}`;
  $('#concentration-total').textContent=`Total: ${formatPercent(a.validation.total)}% / 100%`;
  $('#mixture-compliance').textContent=complianceStatus('mixture',state.mixture.date,state.mixture.older).text;
  $('#validation-messages').innerHTML=[...a.validation.errors.map(message=>({message,type:'error'})),...a.validation.warnings.map(message=>({message,type:'warning'}))].map(({message,type})=>`<div class="message ${type}">${escapeHTML(message)}</div>`).join('');
  if(a.overall==='invalid'){
    $('#results-grid').innerHTML=`<div class="result-card" style="grid-column:1/-1"><h3>Correct the ingredient inputs</h3><p class="result-explanation">The calculation is paused because at least one required field or concentration is invalid.</p></div>`;
    $('#sds-box').innerHTML='';drawReviewQueue();return;
  }
  $('#results-grid').innerHTML=a.groups.map(g=>{
    const kind=g.result==='triggered'?'hit':g.result==='review'?'review':'clear';
    const text=g.result==='triggered'?'At least one individual ingredient reaches the classification threshold.':g.result==='review'?'A missing classification or incomplete formulation prevents a reliable negative screening outcome.':'No entered ingredient meets this group’s generic concentration limit.';
    const triggered=g.hits.length?`<div class="result-evidence"><strong>Triggering:</strong> ${g.hits.map(h=>`${escapeHTML(h.name)} (${formatPercent(h.concentration)}% · ${escapeHTML(h.value)})`).join('; ')}</div>`:'';
    const gap=g.missing.length?`<div class="result-evidence"><strong>Unassessed:</strong> ${g.missing.map(x=>escapeHTML(x.name)).join(', ')}</div>`:'';
    const upgrade=g.upgradePossible?`<p class="result-explanation"><strong>Potential higher category:</strong> An unassessed ingredient could meet Category 1. The Category 2 result cannot be treated as the final endpoint classification.</p>`:'';
    const both=g.categories.includes('PBT')&&g.categories.includes('vPvB')?`<p class="result-explanation">Where EUH441 applies, EUH440 may be omitted in the final labelling assessment.</p>`:g.categories.includes('PMT')&&g.categories.includes('vPvM')?`<p class="result-explanation">Where EUH451 applies, EUH450 may be omitted in the final labelling assessment.</p>`:'';
    return `<article class="result-card"><div class="result-title"><h3>${escapeHTML(g.title)}</h3><small>§ ${escapeHTML(g.section)}</small></div><div class="result-type ${kind}">${labelStatus(g.result)}</div><div class="result-main">${g.statements.map(s=>`<span class="euh-chip" title="${escapeHTML(s.label)}">${escapeHTML(s.code)}</span>`).join('')||'<span style="font-size:12px;color:#8aa0b2">No EUH code established</span>'}</div><p class="result-explanation">${text}</p>${triggered}${gap}${upgrade}${both}</article>`;
  }).join('');
  $('#sds-box').innerHTML=a.sdsRequest.length?`<h3>Additional SDS-on-request consideration</h3><p>Category 2 endocrine-disrupting ingredients present at ≥0.1% may require a safety data sheet to be available upon request even where the mixture’s corresponding Category 2 classification limit (1%) is not met. Flagged: ${a.sdsRequest.map(x=>`${escapeHTML(x.ingredient)} (${formatPercent(x.concentration)}% · ${x.group==='edhh'?'human health':'environment'})`).join('; ')}. See CLP Annex II, section 2.10 and Annex I Tables 3.11.2 / 4.2.2.</p>`:'';
  drawReviewQueue();
}

function drawReviewQueue(){
  const q=createMixtureReviewQueue(state.mixture,state.library);
  $('#review-counts').innerHTML=`<span class="review-count">${q.counts.blocker} blockers</span><span class="review-count">${q.counts.review} assessments</span><span class="review-count">${q.counts.verify} source checks</span>`;
  $('#review-queue').innerHTML=q.items.length?q.items.map(x=>`<div class="review-step"><span class="step-icon ${escapeHTML(x.priority)}">${x.priority==='blocker'?'!':x.priority==='verify'?'?':'•'}</span><div><strong>${escapeHTML(x.title)}</strong><small>${escapeHTML(x.section)} · ${escapeHTML(x.priority)}</small><p>${escapeHTML(x.detail)}</p></div></div>`).join(''):'<div class="queue-empty"><strong>Checklist clear for recorded inputs</strong>No outstanding guided-workflow items identified. This is not an independent verification of scientific evidence or legal classification.</div>';
}
function drawLibrary(){
  const list=state.library||[];
  $('#library-summary').innerHTML=list.length?`<p><strong>${list.length} locally reviewed substance record${list.length===1?'':'s'}</strong>. Matching uses validated CAS / EC identifiers. The information is user-supplied, not automatically sourced or verified against the current ECHA database.</p>${list.slice(0,8).map(r=>`<div class="library-entry"><div><strong>${escapeHTML(r.name)}</strong> (${escapeHTML(r.identifier)})<small> · ${Object.keys(r.groups||{}).length} reviewed groups</small></div><small>${escapeHTML(r.reviewer)} · ${escapeHTML((r.reviewedAt||'').slice(0,10))}</small></div>`).join('')}${list.length>8?`<small>+ ${list.length-8} further records in exported library</small>`:''}`:'<p>No reviewed substance records saved yet. Open Substance screening, record defensible decisions, and save at least one reviewed hazard group. Then apply it to mixtures by CAS / EC identifier.</p>';
}
function updateWithLibrary(index=null){
  const selected=index===null?state.mixture.components:[state.mixture.components[index]];
  if(!selected?.length)return;
  const result=applyReviewedLibrary(selected,state.library);
  if(index===null)state.mixture.components=result.components; else state.mixture.components[index]=result.components[0];
  logAction('library-match',{applied:result.applied,conflicts:result.conflicts,unmatched:result.unmatched});
  drawComponents();drawMixtureResults();save();
  if(result.conflicts.length)toast(`Conflicts not overwritten: ${result.conflicts.slice(0,2).join('; ')}`);
  else toast(`${result.applied.length} reviewed hazard-group decision(s) applied. ${result.unmatched.length} ingredient(s) unmatched.`);
}


function openSubstanceFromMixture(index){
  const c=state.mixture.components[index];if(!c)return;
  if(state.substance.name && normaliseIdentifier(state.substance.cas)!==normaliseIdentifier(c.cas) && !confirm('Start a new substance dossier for this ingredient? The current screening draft will be replaced. Export it first if necessary.'))return;
  if(normaliseIdentifier(state.substance.cas)!==normaliseIdentifier(c.cas)){
    state.substance={...defaults().substance,name:c.name,cas:c.cas,reviewer:state.substance.reviewer||''};
    for(const [id,key] of Object.entries({'sub-name':'name','sub-cas':'cas','sub-date':'date','sub-older':'older','sub-sources':'sources','sub-reviewer':'reviewer'}))$(`#${id}`).value=state.substance[key]||'';
    drawSubstanceCriteria();drawNumericInputs();drawDecisionCards();drawSubResults();
  }
  document.querySelector('[data-view="substance"]').click();save();toast('Guided substance dossier opened. Verify identity and legal sources before approval.');
}

function bindMixture(){
  const fields={'mixture-name':'name','mixture-phase':'phase','mixture-date':'date','mixture-older':'older'};
  for(const [id,key] of Object.entries(fields)){
    const el=$(`#${id}`);el.value=state.mixture[key]??'';
    el.addEventListener('input',e=>{state.mixture[key]=e.target.value;save();drawMixtureResults();});
  }
  const tbody=$('#ingredient-rows');
  tbody.addEventListener('input',e=>{
    const el=e.target, idx=Number(el.dataset.idx),field=el.dataset.field;
    if(!field||!state.mixture.components[idx])return;
    const ingredient=state.mixture.components[idx];
    if(field==='cas' && ingredient.cas!==el.value){ingredient.provenance={};if((ingredient.source||'').startsWith('Reviewed library:'))ingredient.source='';}
    if(GROUPS.some(g=>g.key===field) && ingredient[field]!==el.value)delete ingredient.provenance?.[field];
    ingredient[field]=field==='concentration'?(el.value.trim()===''?null:Number(el.value)):el.value;
    save();drawMixtureResults();
  });
  tbody.addEventListener('click',e=>{
    const auto=e.target.closest('[data-auto]');if(auto){updateWithLibrary(Number(auto.dataset.auto));return;}
    const assess=e.target.closest('[data-assess]');if(assess){openSubstanceFromMixture(Number(assess.dataset.assess));return;}
    const btn=e.target.closest('[data-remove]');if(!btn)return;
    state.mixture.components.splice(Number(btn.dataset.remove),1);drawComponents();save();drawMixtureResults();
  });
  $('#add-ingredient').addEventListener('click',()=>{state.mixture.components.push(newIngredient());drawComponents();save();drawMixtureResults();});
  $('#auto-library').addEventListener('click',()=>updateWithLibrary());
  for(const [id,key] of [['mix-whole','whole'],['mix-bridging','bridging'],['mix-ed-notes','expertNotes'],['mix-ed-reviewer','reviewer']]){const el=$(`#${id}`);el.value=state.mixture.edReview[key];el.addEventListener('input',()=>{state.mixture.edReview[key]=el.value;drawReviewQueue();save()});}
  $('#export-library').addEventListener('click',()=>download('clp-reviewed-substance-library.json',{kind:'CLP_2023_707_reviewed_substance_library',ruleVersion:RULESET.version,exportedAt:new Date().toISOString(),records:state.library,audit:state.audit}));
  $('#import-library').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.kind!=='CLP_2023_707_reviewed_substance_library'||!Array.isArray(data.records)||data.records.length>3000)throw Error('Invalid reviewed-library format.');const validated=data.records.map(r=>{if(!r||!validChemicalIdentifier(r.identifier)||!r.name||!r.reviewer||!r.reviewedAt||!r.groups)throw Error('Record identity or reviewer invalid.');const groups={};for(const g of GROUPS){const d=r.groups[g.key];if(d && registryAssessment({name:r.name,cas:r.identifier,reviewer:r.reviewer,decisions:{[g.key]:d}}).approved[g.key])groups[g.key]=d;}if(!Object.keys(groups).length)throw Error('Record lacks signed-off group data.');return {...r,id:normaliseIdentifier(r.identifier),identifier:normaliseIdentifier(r.identifier),groups};});if(!confirm(`Import ${validated.length} user-reviewed record(s)? This tool cannot independently validate the sources; only import records from a trusted, reviewed library.`))return;for(const r of validated){state.library=state.library.filter(x=>x.identifier!==r.identifier);state.library.push(r);}logAction('library-import',{count:validated.length});drawLibrary();save();toast(`${validated.length} reviewed records imported; recheck their legal currency before use.`)}catch(err){toast(`Library import failed: ${err.message}`)}finally{e.target.value='';}});
  $('#reset-mixture').addEventListener('click',()=>{if(!confirm('Clear all entered mixture information?'))return;state.mixture=defaults().mixture;bindMixtureValues();bindEDReviewValues();drawComponents();save();drawMixtureResults();toast('Mixture assessment cleared.');});
  $('#export-json').addEventListener('click',()=>download('clp-mixture-assessment.json',{kind:'CLP_2023_707_mixture_assessment',ruleset:RULESET,exportedAt:new Date().toISOString(),mixture:state.mixture,assessment:evaluateMixture(state.mixture),reviewQueue:createMixtureReviewQueue(state.mixture,state.library),audit:state.audit}));
  $('#print-report').addEventListener('click',()=>window.print());
  $('#import-json').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{const data=JSON.parse(await file.text());const m=data.mixture;if(!m||!Array.isArray(m.components)||m.components.length>2000||m.components.some(c=>!c||typeof c!=='object'||typeof c.name!=='string'))throw Error('Invalid mixture file.');
      state.mixture={name:String(m.name||''),phase:String(m.phase||'liquid'),date:String(m.date||asLocalDate()),older:String(m.older||'unknown'),components:m.components.map(c=>({...newIngredient(),...c})),edReview:{...defaults().mixture.edReview,...m.edReview}};bindMixtureValues();bindEDReviewValues();drawComponents();save();drawMixtureResults();toast('Assessment imported. Review all evidence and classifications.');
    }catch(err){toast(`Import failed: ${err.message}`);}finally{e.target.value='';}
  });
  drawComponents();drawLibrary();drawMixtureResults();
}
function bindMixtureValues(){for(const [id,key] of Object.entries({'mixture-name':'name','mixture-phase':'phase','mixture-date':'date','mixture-older':'older'}))$(`#${id}`).value=state.mixture[key]??'';}
function bindEDReviewValues(){for(const [id,key] of [['mix-whole','whole'],['mix-bridging','bridging'],['mix-ed-notes','expertNotes'],['mix-ed-reviewer','reviewer']])$(`#${id}`).value=state.mixture.edReview[key]||'';}
function download(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),600);toast('JSON file prepared for download.');}
const ynOptions=val=>[['unknown','Not assessed'],['yes','Yes · evidence supports'],['no','No · not demonstrated']].map(([v,label])=>option(v,label,val||'unknown')).join('');
const endocrineFields=[['Activity','Evidence of endocrine activity'],['Adverse','Evidence of an adverse effect'],['Link','Biologically plausible causal link']];
const propFields=[['persistent','Persistent (P)','§§4.3 / 4.4'],['veryPersistent','Very persistent (vP)','§§4.3 / 4.4'],['bioaccumulative','Bioaccumulative (B)','§4.3'],['veryBioaccumulative','Very bioaccumulative (vB)','§4.3'],['mobile','Mobile (M)','§4.4'],['veryMobile','Very mobile (vM)','§4.4'],['toxic','Toxic (T)','§§4.3 / 4.4']];
function drawSubstanceCriteria(){
  for(const [prefix,target] of [['hh','#edhh-criteria'],['env','#edenv-criteria']]){
    $(target).innerHTML=endocrineFields.map(([key,text])=>`<div class="criteria-row"><label for="${prefix}${key}">${text}</label><select id="${prefix}${key}" data-evidence="${prefix}${key}">${ynOptions(state.substance.evidence[`${prefix}${key}`])}</select></div>`).join('');
  }
  $('#property-flags').innerHTML=propFields.map(([key,label,section])=>`<div class="flag"><label for="p-${key}">${label}<span>Annex I ${section}</span></label><select id="p-${key}" data-evidence="${key}">${ynOptions(state.substance.evidence[key])}</select></div>`).join('');
}
function drawSubResults(){
  const r=screenSubstance(state.substance.evidence);
  $('#sub-compliance').textContent=complianceStatus('substance',state.substance.date,state.substance.older).text;
  $('#sub-results').innerHTML=GROUPS.map(g=>{
    const x=r[g.key];
    return `<article class="result-card"><div class="result-title"><h3>${escapeHTML(g.title)}</h3><small>§ ${g.section}</small></div><div class="result-type ${x.status==='candidate'?'review':'clear'}">${x.status==='candidate'?'Potential criteria identified · review required':'Insufficient to establish classification'}</div><p class="result-explanation">${escapeHTML(x.message)}</p>${x.candidates?.length?`<div class="result-main" style="margin-top:10px">${x.candidates.map(s=>`<span class="euh-chip">${escapeHTML(s)} candidate</span>`).join('')}</div>`:''}</article>`;
  }).join('');
}


function drawNumericInputs(){
  const data=state.substance.numeric||{};
  $('#numeric-inputs').innerHTML=METRICS.map(m=>`<label class="field">${escapeHTML(m.label)} (${escapeHTML(m.unit)})<input type="number" step="any" data-metric="${m.key}" value="${escapeHTML(data[m.key]??'')}" placeholder="Not available" /></label>`).join('')+
    `<label class="field">Ionisable substance?<select data-metric="ionisable">${[['unknown','Not assessed'],['yes','Yes'],['no','No']].map(([v,l])=>option(v,l,data.ionisable||'unknown')).join('')}</select></label>`+
    `<label class="field">For ionisable substance: log Koc evidence covers pH 4–9?<select data-metric="phCoverage">${[['unknown','Not confirmed'],['yes','Yes — lowest value established'],['no','No']].map(([v,l])=>option(v,l,data.phCoverage||'unknown')).join('')}</select></label>`;
  drawNumericResults();
}
function drawNumericResults(){
  const n=evaluateNumericEvidence(state.substance.numeric);
  const labels={P:'Persistent (P)',vP:'Very persistent (vP)',B:'Bioaccumulative (B)',vB:'Very bioaccumulative (vB)',M:'Mobile (M)',vM:'Very mobile (vM)',T:'Toxic (T): aquatic long-term criterion'};
  $('#numeric-results').innerHTML=`<div class="numeric-flags">${Object.entries(labels).map(([k,l])=>`<span class="numeric-flag ${n.supported[k]?'numeric-met':'numeric-unchecked'}" title="${escapeHTML((n.flags[k]||[]).join('; ')||'No positive numerical result entered. This is not a negative classification.')}" >${n.supported[k]?'✓ Indicated':'— Unresolved'} · ${escapeHTML(l)}</span>`).join('')}</div>`+
    (n.provisional.length?`<p class="numeric-message"><strong>Possible combinations from numerical data: ${escapeHTML(n.provisional.join(', '))}.</strong> These are screening candidates only. Confirm the scientific and legal assessment before signing off.</p>`:'<p class="numeric-message">No full PBT/vPvB/PMT/vPvM combination established using the entered numeric measurements alone. Other evidence may change the result.</p>')+
    (n.uncertain.length?`<p class="numeric-warning"><strong>Mobility applicability check:</strong> ${escapeHTML(n.uncertain.join('; '))}</p>`:'')+
    (n.invalid.length?`<p class="numeric-warning"><strong>Invalid data:</strong> ${escapeHTML(n.invalid.join('; '))}</p>`:'');
}

const decisionGuides={
  edhh:'Verify Annex VI for this differentiation. For self-classification, consider endocrine activity, adverse effects in an intact organism/progeny, biological plausibility, human relevance and evidence strength. Select Cat. 1 or Cat. 2 only after reviewing the legal category criteria (§3.11).',
  edenv:'Verify Annex VI. Review endocrine activity, adverse effects at organism, population or subpopulation level, causal biological plausibility, relevance to the environment and the weight of evidence (§4.2).',
  pbt:'Verify Annex VI. Review P and vP degradation criteria for each relevant medium, B and vB bioaccumulation data, T criteria, reliability/weight of evidence and whether PBT and vPvB both apply (§4.3).',
  pmt:'Verify Annex VI. Assess P and vP, M and vM including adsorption/Koc and conditions, T criteria, evidence reliability and whether PMT and vPvM both apply (§4.4).'
};
function drawDecisionCards(){
  $('#decision-cards').innerHTML=GROUPS.map(g=>{
    const d=state.substance.decisions[g.key]||{};
    return `<article class="decision-card"><h3>${escapeHTML(g.title)}</h3><p class="decision-description">${escapeHTML(decisionGuides[g.key])}</p>
      <label class="field">Expert / binding classification outcome<select data-decision="${g.key}" data-dfield="classification">${classSelect(g.key,d.classification||'unknown')}</select></label>
      <label class="field">Regulatory basis<select data-decision="${g.key}" data-dfield="basis">${[['','Select basis'],['annex_vi','Harmonised Annex VI entry (verify scope)'],['expert_review','Expert self-classification / evidence review']].map(([v,l])=>option(v,l,d.basis||'')).join('')}</select></label>
      <label class="field">Traceable source / legal entry / studies<input data-decision="${g.key}" data-dfield="source" value="${escapeHTML(d.source||'')}" placeholder="Study IDs, Annex VI ATP entry, link and date" /></label>
      <label class="field">Regulatory reasoning / evidence sufficiency<textarea rows="3" data-decision="${g.key}" data-dfield="reason" placeholder="Why this outcome and not another? Include the studies, thresholds, limitations and uncertainty.">${escapeHTML(d.reason||'')}</textarea></label>
      <label class="verify-row"><input type="checkbox" data-decision="${g.key}" data-dfield="annexChecked" ${d.annexChecked?'checked':''}/>Applicable Annex VI harmonisation checked and substance identity/scope verified</label>
      <label class="verify-row"><input type="checkbox" data-decision="${g.key}" data-dfield="reviewed" ${d.reviewed?'checked':''}/>I have reviewed the evidence and explicitly approve this hazard-group conclusion</label>
      <small class="soft-warning">Annex I §${g.section} · Leave unresolved if evidence is insufficient. A user-entered “harmonised” claim is not verified by this app.</small>
    </article>`;
  }).join('');drawDecisionCheck();
}
function drawDecisionCheck(){
  const x=registryAssessment(state.substance);
  $('#decision-check').innerHTML=`<strong>${Object.keys(x.approved).length} of 4 hazard groups ready for local sign-off</strong>. ${x.unreviewed.length?`Unresolved: ${escapeHTML(x.unreviewed.join('; '))}. `:''}${x.issues.length?`<span class="soft-warning">${escapeHTML(x.issues.join(' '))}</span>`:'Ready to save the signed-off groups. Unresolved groups stay unknown when imported into mixtures.'}`;
}

function bindSubstance(){
  const fields={'sub-name':'name','sub-cas':'cas','sub-date':'date','sub-older':'older','sub-sources':'sources','sub-reviewer':'reviewer'};
  for(const [id,key] of Object.entries(fields)){
    const el=$(`#${id}`);el.value=state.substance[key]||'';
    el.addEventListener('input',e=>{state.substance[key]=e.target.value;save();drawSubResults();drawDecisionCheck();});
  }
  $('#numeric-inputs').addEventListener('input',e=>{const el=e.target,key=el.dataset.metric;if(!key)return;state.substance.numeric[key]=el.value;save();drawNumericResults();});
  $('#view-substance').addEventListener('change',e=>{
    if(!e.target.dataset.evidence)return;
    state.substance.evidence[e.target.dataset.evidence]=e.target.value;save();drawSubResults();
  });
  $('#export-substance').addEventListener('click',()=>download('clp-substance-evidence.json',{kind:'CLP_2023_707_substance_screening',ruleset:RULESET,exportedAt:new Date().toISOString(),substance:state.substance,screening:screenSubstance(state.substance.evidence),numericEvidence:evaluateNumericEvidence(state.substance.numeric),approvalReadiness:registryAssessment(state.substance),audit:state.audit}));
  $('#print-substance').addEventListener('click',()=>window.print());
  $('#reset-substance').addEventListener('click',()=>{if(!confirm('Clear all substance evidence and identity information?'))return;state.substance=defaults().substance;for(const [id,key] of Object.entries(fields))$(`#${id}`).value=state.substance[key]||'';drawSubstanceCriteria();drawNumericInputs();drawDecisionCards();save();drawSubResults();toast('Substance screening cleared.');});
  $('#decision-cards').addEventListener('input',e=>{const el=e.target,group=el.dataset.decision,field=el.dataset.dfield;if(!group||!field)return;state.substance.decisions[group]??={};state.substance.decisions[group][field]=el.type==='checkbox'?el.checked:el.value;save();drawDecisionCheck();});
  $('#decision-cards').addEventListener('change',e=>{const el=e.target,group=el.dataset.decision,field=el.dataset.dfield;if(!group||!field)return;state.substance.decisions[group]??={};state.substance.decisions[group][field]=el.type==='checkbox'?el.checked:el.value;save();drawDecisionCheck();});
  $('#save-decisions').addEventListener('click',()=>{const outcome=makeRegistryRecord(state.substance);if(!outcome.ok){toast(outcome.issues.join(' '));drawDecisionCheck();return;}const record=outcome.record;const existing=state.library.find(r=>r.identifier===record.identifier);if(existing && !confirm(`Replace the reviewed library record for ${record.identifier}? Existing mixture decisions will need their provenance rechecked.`))return;state.library=state.library.filter(x=>x.identifier!==record.identifier);state.library.push(record);logAction('reviewed-substance-record',{identifier:record.identifier,reviewer:record.reviewer,approved:Object.keys(record.groups)});save();drawLibrary();toast(`${Object.keys(record.groups).length} reviewed hazard-group decision(s) saved for ${record.identifier}.`);});
  drawSubstanceCriteria();drawNumericInputs();drawDecisionCards();drawSubResults();
}
function navigation(){
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
    const view=b.dataset.view;document.querySelectorAll('.nav-link').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${view}`));
    if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);window.scrollTo({top:0,behavior:'instant'});
  }));
  const v=location.hash.replace('#','');const initial=document.querySelector(`[data-view="${v}"]`);if(initial)initial.click();
}
navigation();bindMixture();bindSubstance();
