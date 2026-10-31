/* CLP mixture classification engine
 * Implements the ingredient-based mixture rules of Regulation (EC) No 1272/2008 Annex I
 * (consolidated 01.07.2026) as supplied in the CLP_2026_Annex_I_II package.
 * Page references "p." are CONSOLIDATED page numbers (printed page numbers of the consolidated text).
 * Pure functions, no DOM. Works in browsers and Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CLP = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPS = 1e-9;
  const ge = (a, b) => a >= b - EPS;
  const le = (a, b) => a <= b + EPS;
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const fmt = (x, d) => {
    const n = Number(x);
    if (!isFinite(n)) return String(x);
    const dd = d === undefined ? (Math.abs(n) >= 100 ? 1 : Math.abs(n) >= 1 ? 2 : 4) : d;
    return String(+n.toFixed(dd));
  };
  const num = (x) => {
    if (x === '' || x === null || x === undefined) return NaN;
    const n = Number(String(x).replace(',', '.'));
    return isFinite(n) ? n : NaN;
  };
  const has = (x) => typeof x === 'number' && isFinite(x);


  // A recorded numerical input is not silently replaced by a default when
  // malformed. Source-specific thresholds take precedence over generic values.
  const entered = (value) => value !== '' && value !== null && value !== undefined;
  const validPositive = (value) => has(num(value)) && num(value) > 0;
  const sclValue = (ingredient, key) => {
    const value = (ingredient.scl || {})[key];
    return validPositive(value) && num(value) <= 100 ? num(value) : NaN;
  };
  const concentrationLimit = (i, key, generic) => has(sclValue(i,key)) ? sclValue(i,key) : generic;

  /* ---------------- reference data ---------------- */
  const PICTO = {
    GHS01: 'exploding bomb', GHS02: 'flame', GHS03: 'flame over circle', GHS04: 'gas cylinder',
    GHS05: 'corrosion', GHS06: 'skull and crossbones', GHS07: 'exclamation mark',
    GHS08: 'health hazard', GHS09: 'environment'
  };

  const HTEXT = {
    H224: 'Extremely flammable liquid and vapour', H225: 'Highly flammable liquid and vapour', H226: 'Flammable liquid and vapour',
    H300: 'Fatal if swallowed', H301: 'Toxic if swallowed', H302: 'Harmful if swallowed',
    H310: 'Fatal in contact with skin', H311: 'Toxic in contact with skin', H312: 'Harmful in contact with skin',
    H330: 'Fatal if inhaled', H331: 'Toxic if inhaled', H332: 'Harmful if inhaled',
    H314: 'Causes severe skin burns and eye damage', H315: 'Causes skin irritation',
    H318: 'Causes serious eye damage', H319: 'Causes serious eye irritation',
    H317: 'May cause an allergic skin reaction',
    H334: 'May cause allergy or asthma symptoms or breathing difficulties if inhaled',
    H335: 'May cause respiratory irritation', H336: 'May cause drowsiness or dizziness',
    H340: 'May cause genetic defects', H341: 'Suspected of causing genetic defects',
    H350: 'May cause cancer', H350i: 'May cause cancer by inhalation', H351: 'Suspected of causing cancer',
    H360: 'May damage fertility or the unborn child', H361: 'Suspected of damaging fertility or the unborn child',
    H360F: 'May damage fertility', H360D: 'May damage the unborn child',
    H360FD: 'May damage fertility. May damage the unborn child',
    H360Fd: 'May damage fertility. Suspected of damaging the unborn child',
    H360Df: 'May damage the unborn child. Suspected of damaging fertility',
    H361f: 'Suspected of damaging fertility', H361d: 'Suspected of damaging the unborn child',
    H361fd: 'Suspected of damaging fertility. Suspected of damaging the unborn child',
    H362: 'May cause harm to breast-fed children',
    H370: 'Causes damage to organs', H371: 'May cause damage to organs',
    H372: 'Causes damage to organs through prolonged or repeated exposure',
    H373: 'May cause damage to organs through prolonged or repeated exposure',
    H304: 'May be fatal if swallowed and enters airways',
    H400: 'Very toxic to aquatic life', H410: 'Very toxic to aquatic life with long lasting effects',
    H411: 'Toxic to aquatic life with long lasting effects', H412: 'Harmful to aquatic life with long lasting effects',
    H413: 'May cause long lasting harmful effects to aquatic life',
    H420: 'Harms public health and the environment by destroying ozone in the upper atmosphere',
    EUH208: 'Contains (name of sensitising substance). May produce an allergic reaction',
    EUH380: 'May cause endocrine disruption in humans', EUH381: 'Suspected of causing endocrine disruption in humans',
    EUH430: 'May cause endocrine disruption in the environment', EUH431: 'Suspected of causing endocrine disruption in the environment',
    EUH440: 'Accumulates in the environment and living organisms including in humans',
    EUH441: 'Strongly accumulates in the environment and living organisms including in humans',
    EUH450: 'Can cause long-lasting and diffuse contamination of water resources',
    EUH451: 'Can cause very long-lasting and diffuse contamination of water resources'
  };

  /* Table 3.1.1 limits and Table 3.1.2 conversion values */
  const AT = {
    oral: { unit: 'mg/kg bw', label: 'oral', limits: [5, 50, 300, 2000], conv: [0.5, 5, 100, 500], h: ['H300', 'H300', 'H301', 'H302'] },
    dermal: { unit: 'mg/kg bw', label: 'dermal', limits: [50, 200, 1000, 2000], conv: [5, 50, 300, 1100], h: ['H310', 'H310', 'H311', 'H312'] },
    gas: { unit: 'ppmV', label: 'inhalation (gas)', limits: [100, 500, 2500, 20000], conv: [10, 100, 700, 4500], h: ['H330', 'H330', 'H331', 'H332'] },
    vapour: { unit: 'mg/l', label: 'inhalation (vapour)', limits: [0.5, 2, 10, 20], conv: [0.05, 0.5, 3, 11], h: ['H330', 'H330', 'H331', 'H332'] },
    dust_mist: { unit: 'mg/l', label: 'inhalation (dust/mist)', limits: [0.05, 0.5, 1, 5], conv: [0.005, 0.05, 0.5, 1.5], h: ['H330', 'H330', 'H331', 'H332'] }
  };
  const catFromATE = (route, ate) => {
    const L = AT[route].limits;
    for (let i = 0; i < 4; i++) if (ate <= L[i] + EPS) return i + 1;
    return 0;
  };

  /* ---------------- H-code parser ---------------- */
  function blankIngredient() {
    return {
      name: '', cas: '', pct: '', hcodes: '', hcodeDetails: [],
      acute: { oral: { cat: '', ate: '', unknown: false }, dermal: { cat: '', ate: '', unknown: false }, inh: { form: 'vapour', cat: '', ate: '', unknown: false }, unknown: false },
      skinCorr: '', eye: '', nonAdditive: false,
      skinSens: '', respSens: '', muta: '', carc: '', carcRoute: '', repro: '', reproFert: '', reproDev: '', lact: false,
      stotSE: '', stotSEresp: false, stotSEnarc: false, stotRE: '', asp: false,
      aquaAcute: false, mAcute: '', aquaChronic: '', mChronic: '', aquaUnknown: false,
      edHH: '', edEnv: '', pbt: false, vpvb: false, pmt: false, vpvm: false, ozone: false,
      scl: {}
    };
  }

  const CLEAR_KEYS = ['skinCorr', 'eye', 'skinSens', 'respSens', 'muta', 'carc', 'carcRoute', 'repro', 'reproFert', 'reproDev', 'stotSE', 'stotRE', 'aquaChronic', 'edHH', 'edEnv'];
  const CLEAR_BOOL = ['lact', 'stotSEresp', 'stotSEnarc', 'asp', 'aquaAcute', 'pbt', 'vpvb', 'pmt', 'vpvm', 'ozone'];

  /* Annex VI 1.1.2.1.2 differentiations are CASE-SENSITIVE, notably H360FD/Fd/Df.
     This is source-ingredient metadata; mixture H-statement selection is a separate step. */
  const REPRO_DIFFERENTIATIONS = {
    H360F:  [1, null], H360D:  [null, 1], H360FD: [1, 1],
    H360Fd: [1, 2],    H360Df: [2, 1],
    H361f:  [2, null], H361d:  [null, 2], H361fd: [2, 2]
  };

  function canonicalHCode(raw) {
    const m = String(raw).replace(/\s/g, '').match(/^(EUH|H)(\d{3})([A-Za-z]*)$/i);
    if (!m) return null;
    const base = m[1].toUpperCase() + m[2], suffix = m[3];
    if (base === 'H350') return !suffix ? base : suffix.toLowerCase() === 'i' ? 'H350i' : null;
    if (base === 'H360') {
      if (!suffix) return base;
      if (suffix.length === 1 && /^[FD]$/i.test(suffix)) return base + suffix.toUpperCase();
      // Do not guess from "H360fd": FD vs Fd mean different things.
      const candidate = base + suffix;
      return Object.prototype.hasOwnProperty.call(REPRO_DIFFERENTIATIONS, candidate) ? candidate : null;
    }
    if (base === 'H361') {
      if (!suffix) return base;
      const candidate = base + suffix.toLowerCase();
      return Object.prototype.hasOwnProperty.call(REPRO_DIFFERENTIATIONS, candidate) ? candidate : null;
    }
    return suffix ? null : base;
  }

  /* Does not alter classification fields; can safely derive metadata for older JSON saves. */
  function parseHCodeTokens(text) {
    const tokens = String(text || '').match(/\b(?:EUH|H)\s*\d{3}[A-Za-z]*\b/gi) || [];
    const codes = [], invalid = [], seen = new Set();
    tokens.forEach((token) => {
      const canonical = canonicalHCode(token);
      if (!canonical) { invalid.push(token.replace(/\s/g, '')); return; }
      if (seen.has(canonical)) return;
      seen.add(canonical);
      const base = canonical.replace(/^(EUH|H)(\d{3}).*$/, '$1$2');
      const suffix = canonical.slice(base.length);
      const effects = REPRO_DIFFERENTIATIONS[canonical] || [null, null];
      codes.push({
        code: canonical, base, suffix,
        route: canonical === 'H350i' ? 'inhalation' : null,
        fertility: effects[0], development: effects[1]
      });
    });
    return { codes, invalid };
  }

  /* Applies ingredient H/EUH codes (mutates classifications). Returns {notes, codes, invalid}.
     Input H-codes alone do not identify all subcategories, ATEs or route-specific details. */
  function applyHCodes(ing, text) {
    const notes = [];
    CLEAR_KEYS.forEach((k) => (ing[k] = ''));
    CLEAR_BOOL.forEach((k) => (ing[k] = false));
    ing.acute.oral.cat = ''; ing.acute.dermal.cat = ''; ing.acute.inh.cat = '';
    ing.hcodes = text || '';
    const parsed = parseHCodeTokens(text);
    ing.hcodeDetails = parsed.codes;
    parsed.invalid.forEach((c) => notes.push(c + ': invalid or ambiguous H/EUH suffix; check the exact code and letter case. Not used for classification.'));
    if (!parsed.codes.length && String(text || '').trim() && !parsed.invalid.length)
      notes.push('No H/EUH codes recognised. Check the input format.');
    // Once set, a more severe CMR category must not be overwritten by a later code.
    const setCMR = (field, cat) => {
      const rank = { '2': 1, '1B': 2, '1A': 3 };
      if (!ing[field] || rank[cat] > rank[ing[field]]) ing[field] = cat;
    };
    const setAcute = (route, cat) => {
      const old = ing.acute[route].cat;
      if (old && old !== cat) notes.push('Conflicting acute toxicity categories for ' + route + ' (' + old + ' and ' + cat + '): most severe retained. Verify the source classification.');
      if (!old || Number(cat) < Number(old)) ing.acute[route].cat = cat;
    };
    const setChronic = (c) => { if (!ing.aquaChronic || c < ing.aquaChronic) ing.aquaChronic = c; };
    parsed.codes.forEach(({ code, base, suffix }) => {
      switch (base) {
        case 'H300': setAcute('oral', '1'); notes.push('H300 read as Acute Tox. 1 (oral) – change to Category 2 if applicable.'); break;
        case 'H301': setAcute('oral', '3'); break;
        case 'H302': setAcute('oral', '4'); break;
        case 'H310': setAcute('dermal', '1'); notes.push('H310 read as Acute Tox. 1 (dermal) – change to Category 2 if applicable.'); break;
        case 'H311': setAcute('dermal', '3'); break;
        case 'H312': setAcute('dermal', '4'); break;
        case 'H330': setAcute('inh', '1'); notes.push('H330 read as Acute Tox. 1 (inhalation) – check Category 1/2 and vapour/dust-mist/gas.'); break;
        case 'H331': setAcute('inh', '3'); break;
        case 'H332': setAcute('inh', '4'); break;
        case 'H314': ing.skinCorr = '1'; notes.push('H314 read as Skin Corr. 1 (no sub-category) – set 1A/1B/1C if known.'); break;
        case 'H315': if (!ing.skinCorr) ing.skinCorr = '2'; break;
        case 'H318': ing.eye = '1'; break;
        case 'H319': if (ing.eye !== '1') ing.eye = '2'; break;
        case 'H317': ing.skinSens = '1'; break;
        case 'H334': ing.respSens = '1'; break;
        case 'H335': ing.stotSE = ing.stotSE && ing.stotSE !== '3' ? ing.stotSE : '3'; ing.stotSEresp = true; break;
        case 'H336': ing.stotSE = ing.stotSE && ing.stotSE !== '3' ? ing.stotSE : '3'; ing.stotSEnarc = true; break;
        case 'H340': setCMR('muta', '1B'); notes.push('H340 read as Muta. 1B – set 1A if applicable (same concentration limit).'); break;
        case 'H341': setCMR('muta', '2'); break;
        case 'H350':
          setCMR('carc', '1B');
          if (code === 'H350' || ing.carcRoute !== 'general') ing.carcRoute = code === 'H350i' ? 'inhalation' : 'general';
          notes.push(code === 'H350i'
            ? 'H350i: inhalation-specific carcinogenicity preserved in hcodeDetails; verify the exposure route and final mixture hazard-statement wording.'
            : 'H350 read as Carc. 1B – set 1A if applicable (same concentration limit).');
          break;
        case 'H351': setCMR('carc', '2'); break;
        case 'H360': {
          if (suffix) {
            const effects = REPRO_DIFFERENTIATIONS[code];
            if (effects[0]) setCMR('reproFert', effects[0] === 1 ? '1B' : '2');
            if (effects[1]) setCMR('reproDev', effects[1] === 1 ? '1B' : '2');
          } else setCMR('repro', '1B');
          notes.push(code + ': ' + (suffix ? 'fertility/development categories populated in Details' : 'effect unspecified; change only if supported') + '. For Category 1, verify 1A versus 1B.');
          break;
        }
        case 'H361': {
          if (suffix) {
            const effects = REPRO_DIFFERENTIATIONS[code];
            if (effects[0]) setCMR('reproFert', '2');
            if (effects[1]) setCMR('reproDev', '2');
          } else setCMR('repro', '2');
          if (suffix) notes.push(code + ': fertility/development categories populated in Details.');
          break;
        }
        case 'H362': ing.lact = true; break;
        case 'H370': ing.stotSE = '1'; break;
        case 'H371': if (ing.stotSE !== '1') ing.stotSE = '2'; break;
        case 'H372': ing.stotRE = '1'; break;
        case 'H373': if (ing.stotRE !== '1') ing.stotRE = '2'; break;
        case 'H304': ing.asp = true; break;
        case 'H400': ing.aquaAcute = true; break;
        case 'H410': setChronic('1'); break;
        case 'H411': setChronic('2'); break;
        case 'H412': setChronic('3'); break;
        case 'H413': setChronic('4'); break;
        case 'H420': ing.ozone = true; break;
        case 'EUH380': ing.edHH = '1'; break;
        case 'EUH381': if (ing.edHH !== '1') ing.edHH = '2'; break;
        case 'EUH430': ing.edEnv = '1'; break;
        case 'EUH431': if (ing.edEnv !== '1') ing.edEnv = '2'; break;
        case 'EUH440': ing.pbt = true; break;
        case 'EUH441': ing.vpvb = true; break;
        case 'EUH450': ing.pmt = true; break;
        case 'EUH451': ing.vpvm = true; break;
        default:
          if (/^H2\d\d$/.test(base)) notes.push(code + ': physical hazards of the MIXTURE come from test data – ignored for the ingredient calculation.');
          else if (!/^EUH/.test(base)) notes.push(code + ' is not used in ingredient-based mixture classification (ignored).');
      }
    });
    if (ing.aquaChronic === '1' && !ing.aquaAcute) { /* H410 often accompanied by H400; leave to user */ }
    return { notes, codes: parsed.codes, invalid: parsed.invalid };
  }

  /* ---------------- helpers for result objects ---------------- */
  const hz = (id, name, ref) => ({ id, name, ref, steps: [], notes: [], outcomes: [], status: 'not' });
  const out = (label, h, signal, picto, extra) => Object.assign({ label, h: h || [], signal: signal || null, picto: picto || [] }, extra || {});
  const nm = (i) => (i.name && i.name.trim()) || '(unnamed ingredient)';

  /* ---------------- hazard classes ---------------- */

  function flammability(mix) {
    const H = hz('flam', 'Flammable liquid (physical hazard – from test data)', 'Annex I 2.6 · Table 2.6.1 (cons. p.101); closed-cup requirement 2.6.4.1 (p.102)');
    if (mix.state === 'gas') { H.status = 'na'; H.steps.push('Gaseous mixture: flammable-gas / pressure-gas classes are not calculated here. Use the manual entries.'); return H; }
    const fp = num(mix.flashPoint), ibp = num(mix.ibp);
    if (!has(fp)) { H.status = 'nodata'; H.steps.push('No flash point entered. Flammable-liquid classification needs a closed-cup flash point of the mixture (2.6.4.1).'); return H; }
    H.steps.push(`Flash point ${fmt(fp)} °C${has(ibp) ? ', initial boiling point ' + fmt(ibp) + ' °C' : ''}.`);
    if (fp < 23 - EPS) {
      if (!has(ibp)) { H.status = 'incomplete'; H.steps.push('Flash point < 23 °C: the initial boiling point is needed to choose between Category 1 and 2.'); return H; }
      if (le(ibp, 35)) { H.status = 'classified'; H.outcomes.push(out('Flam. Liq. 1', ['H224'], 'Danger', ['GHS02'])); H.steps.push('FP < 23 °C and IBP ≤ 35 °C → Category 1.'); }
      else { H.status = 'classified'; H.outcomes.push(out('Flam. Liq. 2', ['H225'], 'Danger', ['GHS02'])); H.steps.push('FP < 23 °C and IBP > 35 °C → Category 2.'); }
    } else if (le(fp, 60)) {
      H.status = 'classified'; H.outcomes.push(out('Flam. Liq. 3', ['H226'], 'Warning', ['GHS02']));
      H.steps.push('FP ≥ 23 °C and ≤ 60 °C → Category 3.');
      if (fp >= 55 - EPS && fp <= 75 + EPS) H.notes.push('Footnote to Table 2.6.1: gas oils, diesel and light heating oils with FP between 55 °C and 75 °C may be regarded as Category 3.');
    } else {
      H.steps.push('FP > 60 °C → not a flammable liquid under 2.6.1.');
      if (fp <= 75 + EPS && fp >= 55) H.notes.push('Footnote to Table 2.6.1: gas oils/diesel/light heating oils with FP 55–75 °C may be regarded as Category 3.');
    }
    H.notes.push('A calculated flash point (2.6.4.2–3) is only valid for the mixture types described there; enter a measured closed-cup value where in doubt.');
    return H;
  }

  function acute(mix, ings, ctx) {
    const H = hz('acute', 'Acute toxicity', 'Annex I 3.1.3.6 (cons. pp.138–139); Table 3.1.1 (p.134); conversions Table 3.1.2 (pp.139–140); cut-offs Table 1.1 (p.68)');
    const unknown = ings.filter((i) => ge(i.pct, 1) &&
      (i.acute.unknown || i.acute.oral.unknown || i.acute.dermal.unknown || i.acute.inh.unknown));
    const unkSum = sum(unknown.map((i) => i.pct));
    const routes = [
      ['oral', (i) => i.acute.oral], ['dermal', (i) => i.acute.dermal],
      ['vapour', (i) => (i.acute.inh.form === 'vapour' ? i.acute.inh : null)],
      ['dust_mist', (i) => (i.acute.inh.form === 'dust_mist' ? i.acute.inh : null)],
      ['gas', (i) => (i.acute.inh.form === 'gas' ? i.acute.inh : null)]
    ];
    const anyAcute = ings.filter((i) => ['oral', 'dermal'].some((r) => has(num(i.acute[r].ate)) || i.acute[r].cat) || has(num(i.acute.inh.ate)) || i.acute.inh.cat);
    if (!anyAcute.length && !unknown.length) { H.steps.push('No ingredient carries acute-toxicity data → not classified.'); return H; }
    if (unkSum > 0) {
      const corrected = unkSum > 10 + EPS;
      H.steps.push(`Ingredients with no usable acute-toxicity data (≥ 1 %): ${unknown.map(nm).join(', ')} = ${fmt(unkSum)} %. ` +
        (corrected ? 'Total > 10 % → numerator of the formula is corrected to 100 − ' + fmt(unkSum) + ' (3.1.3.6.2.3).' : 'Total ≤ 10 % → standard formula used (3.1.3.6.2.3).'));
      ctx.supplemental.push(`${fmt(unkSum)} % of the mixture consists of ingredient(s) of unknown acute toxicity (3.1.3.6.2.2; label and SDS).`);
    }
    const inhForms = new Set(ings.filter((i) => i.acute.inh.cat || has(num(i.acute.inh.ate))).map((i) => i.acute.inh.form));
    if (inhForms.size > 1) H.notes.push('Inhalation data are given in different forms (' + [...inhForms].join(', ') + '). Each form is calculated separately – check that this is appropriate for your mixture.');
    routes.forEach(([key, getter]) => {
      const T = AT[key], rows = [], skipped = [];
      const routeUnknown = ings.filter((i) => {
        if (!ge(i.pct,1)) return false;
        const r=getter(i);
        if (!r || (key!=='oral'&&key!=='dermal'&&i.acute.inh.form!==key)) return false;
        const known=(validPositive(r.ate) || ['1','2','3','4'].includes(String(r.cat)));
        return (i.acute.unknown || !!r.unknown) && !known;
      });
      const routeUnknownSum=sum(routeUnknown.map(i=>i.pct));
      if(routeUnknownSum>0) {
        H.steps.push('— '+T.label+' unknown data: '+routeUnknown.map(nm).join(', ')+
          ' = '+fmt(routeUnknownSum)+' %. '+
          (routeUnknownSum>10+EPS?'Corrected formula numerator 100 − unknown fraction.':'Standard formula numerator 100.'));
      }
      ings.forEach((i) => {
        const r = getter(i); if (!r) return;
        const tested = num(r.ate); const cat0 = parseInt(r.cat, 10) || 0;
        if (!(tested > 0) && !cat0) return;
        let cat, ate, src;
        if (tested > 0) {
          ate = tested; cat = catFromATE(key, ate); src = 'tested/derived ATE';
          if (cat0 && cat !== cat0) {
            const detail=nm(i)+' '+T.label+': Category '+cat0+
              ' conflicts with entered ATE '+fmt(ate)+' '+T.unit+
              ' ('+(cat ? 'Category '+cat : 'outside Category 4 range')+'). ATE was used, but verify source evidence.';
            H.notes.push(detail); ctx.warnings.push('DATA REVIEW: '+detail);
          }
        } else { cat = cat0; ate = T.conv[cat - 1]; src = 'Table 3.1.2 conversion of Category ' + cat; }
        if (!cat) { skipped.push(`${nm(i)}: ATE ${fmt(ate)} is above the Category 4 range → not acutely toxic, ignored (3.1.3.6.1(b),(c)).`); return; }
        const cut = cat <= 3 ? 0.1 : 1;
        if (i.pct < cut - EPS) { skipped.push(`${nm(i)} (Cat. ${cat}) at ${fmt(i.pct)} % is below the Table 1.1 cut-off of ${cut} % → not taken into account.`); return; }
        rows.push({ i, ate, cat, src });
      });
      if (!rows.length) {
        if (skipped.length) H.steps.push(`— ${T.label}: ` + skipped.join(' '));
        if(routeUnknownSum>0) {
          if(H.status!=='classified')H.status='incomplete';
          H.notes.push(T.label+': the unknown-data flag is present, but no known ATE contributions are available for this route.');
        }
        return;
      }
      const terms = rows.map((r) => r.i.pct / r.ate);
      const denom = sum(terms), numer = routeUnknownSum > 10 + EPS ? 100 - routeUnknownSum : 100;
      if (!(numer > 0) || !(denom > 0)) {
        H.status='incomplete';
        const detail='Acute toxicity formula for '+T.label+
          ' has an invalid numerator or denominator; the unknown fraction must be reviewed.';
        H.notes.push(detail); ctx.warnings.push('DATA VALIDATION: '+detail);
        return;
      }
      const ateMix = numer / denom, cat = catFromATE(key, ateMix);
      H.steps.push(`— ${T.label} (${T.unit}): ` + rows.map((r, k) => `${nm(r.i)} ${fmt(r.i.pct)} % ÷ ${fmt(r.ate)} [${r.src}] = ${fmt(terms[k], 6)}`).join(' ; '));
      H.steps.push(`   ATEmix = ${fmt(numer)} / ${fmt(denom, 6)} = ${fmt(ateMix)} ${T.unit}  → ` + (cat ? `Category ${cat} (limit ≤ ${fmt(T.limits[cat - 1])})` : `above Category 4 limit (${fmt(T.limits[3])}) → not classified for this route`));
      skipped.forEach((s) => H.steps.push('   ' + s));
      const missing = anyAcute.filter((i) => !rows.some((r) => r.i === i) && !skipped.some((s) => s.startsWith(nm(i))));
      if (missing.length) H.notes.push(`${T.label}: ingredient(s) ${missing.map(nm).join(', ')} have acute-toxicity data for other routes only and are not in this route's sum. Consider extrapolation between routes (3.1.3.6.2.1).`);
      if (cat) {
        H.status = 'classified';
        H.outcomes.push(out(`Acute Tox. ${cat} (${key === 'oral' ? 'oral' : key === 'dermal' ? 'dermal' : 'inhalation'})`, [T.h[cat - 1]], cat <= 3 ? 'Danger' : 'Warning', [cat <= 3 ? 'GHS06' : 'GHS07'], { route: key, ate: ateMix }));
      }
      if (new Set(rows.map((r) => r.cat)).size === 1 && rows.length > 1 && cat !== rows[0].cat)
        H.notes.push(`${T.label}: all contributing ingredients are in Category ${rows[0].cat} but the mixture result is ${cat ? 'Category ' + cat : 'not classified'}. 3.1.3.3(c) says the mixture should then be classified in that category – review with expert judgement.`);
    });
    if (H.outcomes.length > 1) H.notes.push('Classified for more than one route: the pictogram and signal word reflect the most severe category and all hazard statements are used (3.1.3.2).');
    if (!H.steps.length) H.steps.push('No acute-toxicity route could be calculated.');
    return H;
  }

  function corrosionHazards(mix, ings) {
    const S = hz('skin', 'Skin corrosion / irritation', 'Annex I 3.2.3 (cons. pp.145–147); Tables 3.2.3 and 3.2.4 (p.147); cut-off Table 1.1 (p.68)');
    const E = hz('eye', 'Serious eye damage / eye irritation', 'Annex I 3.3.3 (cons. pp.151–154); Tables 3.3.3 and 3.3.4 (p.153–154); cut-off Table 1.1 (p.68)');
    const pH = num(mix.pH), phTrig = has(pH) && (pH <= 2 + EPS || pH >= 11.5 - EPS), reserveOk = !!mix.pHReserveOk;

    /* ---- skin ---- */
    const skinCut = (i) => {
      const specific = i.skinCorr === '2' ? sclValue(i, 'skinIrrit') : sclValue(i, 'skinCorr');
      return has(specific) ? Math.min(1,specific) : 1;
    };
    const sRel = ings.filter((i) => i.skinCorr && ge(i.pct, skinCut(i)));
    ings.filter((i) => i.skinCorr && !ge(i.pct, skinCut(i))).forEach((i) =>
      S.notes.push(nm(i)+' ('+(i.skinCorr === '2' ? 'Skin Irrit. 2' : 'Skin Corr. '+i.skinCorr)+
        ') at '+fmt(i.pct)+' % is below relevance threshold '+fmt(skinCut(i))+
        ' %. Lower test-supported effect levels can still matter (3.2.3.3.6).'));
    const sAdd = sRel.filter((i) => !i.nonAdditive), sNon = sRel.filter((i) => i.nonAdditive);
    const by = (list, c) => sum(list.filter((i) => i.skinCorr === c).map((i) => i.pct));
    const s1A = by(sAdd, '1A'), s1B = by(sAdd, '1B'), s1C = by(sAdd, '1C'), s1U = by(sAdd, '1'), s2 = by(sAdd, '2');
    const corr = s1A + s1B + s1C + s1U;
    let sCat = null, sWhy = [];
    if (sAdd.length) {
      S.steps.push(`Additive ingredients (≥ 1 %): ` + sAdd.map((i) => `${nm(i)} ${fmt(i.pct)} % [${i.skinCorr === '2' ? 'Cat. 2' : 'Cat. ' + i.skinCorr}]`).join('; '));
      S.steps.push(`Σ corrosive (1/1A/1B/1C) = ${fmt(corr)} % ; Σ irritant (Cat. 2) = ${fmt(s2)} % ; 10 × corrosive + irritant = ${fmt(10 * corr + s2)} %`);
      // Article 10(5): use SCLs in the additive potency-weighted summation
      // rather than summing raw concentrations against generic limits.
      const withSCL=sAdd.some(i => has(sclValue(i,i.skinCorr==='2'?'skinIrrit':'skinCorr')) ||
        (i.skinCorr!=='2' && has(sclValue(i,'skinIrrit'))));
      if (withSCL) {
        const corrosives=sAdd.filter(i=>i.skinCorr!=='2');
        const contribution=(list,key,gcl)=>sum(list.map(i=>i.pct/concentrationLimit(i,key,gcl)));
        const allCorr=contribution(corrosives,'skinCorr',5);
        const categoryCorr=(cats)=>contribution(corrosives.filter(i=>cats.includes(i.skinCorr)),'skinCorr',5);
        const irritation = contribution(corrosives,'skinIrrit',1) +
          contribution(sAdd.filter(i=>i.skinCorr==='2'),'skinIrrit',10);
        S.steps.push('SCL-aware additive approach: Σ (ingredient % / applicable SCL or GCL), threshold ≥ 1. '+
          'Corrosion = '+fmt(allCorr,5)+'; irritation = '+fmt(irritation,5)+'.');
        if(ge(allCorr,1)) {
          if(corrosives.some(i=>i.skinCorr==='1')) sCat='1';
          else if(ge(categoryCorr(['1A']),1))sCat='1A';
          else if(ge(categoryCorr(['1A','1B']),1))sCat='1B';
          else sCat='1C';
          sWhy.push('Weighted corrosion summation ≥ 1 → Skin Corr. '+sCat);
        } else if(ge(irritation,1)){
          sCat='2';sWhy.push('Weighted irritation summation ≥ 1 → Skin Irrit. 2');
        } else sWhy.push('Below weighted SCL/GCL thresholds.');
      } else if (ge(corr, 5)) {
        if (s1U > 0) sCat = '1'; else if (ge(s1A, 5)) sCat = '1A'; else if (ge(s1A + s1B, 5)) sCat = '1B'; else sCat = '1C';
        sWhy.push(`Σ corrosive ${fmt(corr)} % ≥ 5 % → Skin Corr. ${sCat === '1' ? '1 (no sub-category)' : sCat}`);
      } else if (ge(corr, 1)) { sCat = '2'; sWhy.push(`Σ corrosive ${fmt(corr)} % is ≥ 1 % but < 5 % → Skin Irrit. 2`); }
      else if (ge(s2, 10)) { sCat = '2'; sWhy.push(`Σ irritant ${fmt(s2)} % ≥ 10 % → Skin Irrit. 2`); }
      else if (ge(10 * corr + s2, 10)) { sCat = '2'; sWhy.push(`10 × corrosive + irritant = ${fmt(10 * corr + s2)} % ≥ 10 % → Skin Irrit. 2`); }
      else sWhy.push('Below all Table 3.2.3 limits for the additive ingredients.');
      S.steps.push(...sWhy.map((w) => '   ' + w));
      if (corr > 0) S.notes.push('3.2.3.3.4.1: particular care is needed for mixtures containing acids, bases, inorganic salts, aldehydes, phenols and surfactants – additivity may under-classify. For strong acids/bases use pH (3.2.3.3.4.2). Mark such ingredients "additivity not applicable" to use Table 3.2.4.');
    }
    sNon.forEach((i) => {
      const corrI = i.skinCorr !== '2';
      const limit=concentrationLimit(i,corrI?'skinCorr':'skinIrrit',corrI?1:3);
      if (ge(i.pct,limit)) {
        const target=corrI?'1':'2';
        S.steps.push('Non-additive '+nm(i)+' '+fmt(i.pct)+' % ≥ '+fmt(limit)+
          ' % ('+(has(sclValue(i,corrI?'skinCorr':'skinIrrit'))?'SCL':'Table 3.2.4')+') → Skin '+(corrI?'Corr. 1':'Irrit. 2'));
        if(corrI || !sCat) sCat=target;
      } else S.steps.push('Non-additive '+nm(i)+' '+fmt(i.pct)+' % < '+fmt(limit)+' % threshold.');
    });
    if (has(pH)) {
      if (phTrig && !reserveOk) { S.steps.push(`Mixture pH ${fmt(pH)} (≤ 2 or ≥ 11.5) → Skin Corr. 1 in the absence of other information (3.2.3.1.2).`); if (!sCat || sCat === '2') sCat = '1'; }
      else if (phTrig && reserveOk) S.steps.push(`Mixture pH ${fmt(pH)} is extreme but acid/alkaline reserve was marked as not corrosive – pH criterion not applied; this needs confirming data (preferably validated in-vitro test).`);
      else S.steps.push(`Mixture pH ${fmt(pH)}: pH criterion (≤ 2 or ≥ 11.5) not met.`);
    }
    if (!sRel.length && !has(pH)) S.steps.push('No skin-corrosive or skin-irritant ingredient ≥ 1 % and no pH entered.');
    if (sCat === '2') { S.status = 'classified'; S.outcomes.push(out('Skin Irrit. 2', ['H315'], 'Warning', ['GHS07'])); }
    else if (sCat) { S.status = 'classified'; S.outcomes.push(out(sCat === '1' ? 'Skin Corr. 1' : 'Skin Corr. ' + sCat, ['H314'], 'Danger', ['GHS05'])); }

    /* ---- eye ---- */
    const eRel = ings.filter((i) => (i.skinCorr && i.skinCorr !== '2') || i.eye);
    const eyeCut=(i) => {
      const specific=sclValue(i,((i.skinCorr&&i.skinCorr!=='2') || i.eye==='1')?'eyeDam':'eyeIrrit');
      return has(specific)?Math.min(1,specific):1;
    };
    const eRelC = eRel.filter((i) => ge(i.pct, eyeCut(i)));
    const eCorr = (i) => (i.skinCorr && i.skinCorr !== '2') || i.eye === '1';
    eRel.filter((i) => !ge(i.pct, eyeCut(i))).forEach((i) =>
      E.notes.push(nm(i)+' at '+fmt(i.pct)+' % is below relevance threshold '+fmt(eyeCut(i))+
        ' %. Lower evidence-based limits still require evaluation (3.3.3.3.6).'));
    const eAdd = eRelC.filter((i) => !i.nonAdditive), eNon = eRelC.filter((i) => i.nonAdditive);
    const e1 = sum(eAdd.filter(eCorr).map((i) => i.pct)), e2 = sum(eAdd.filter((i) => !eCorr(i) && i.eye === '2').map((i) => i.pct));
    let eCat = null;
    if (eAdd.length) {
      E.steps.push('Additive ingredients (≥ 1 %): ' + eAdd.map((i) => `${nm(i)} ${fmt(i.pct)} % [${eCorr(i) ? 'skin corr./eye dam. 1' : 'eye irrit. 2'}]`).join('; ') + ' (an ingredient that is both skin-corrosive and Eye Dam. 1 is counted once, Table 3.3.3 note a)');
      E.steps.push(`Σ skin corrosive + Eye Dam. 1 = ${fmt(e1)} % ; Σ Eye Irrit. 2 = ${fmt(e2)} % ; 10 × Σ Cat. 1 + Σ Cat. 2 = ${fmt(10 * e1 + e2)} %`);
      const withSCL=eAdd.some(i=>has(sclValue(i,'eyeDam')) || has(sclValue(i,'eyeIrrit')));
      if(withSCL) {
        const severe=eAdd.filter(eCorr),irrit=eAdd.filter(i=>!eCorr(i)&&i.eye==='2');
        const damage=sum(severe.map(i=>i.pct/concentrationLimit(i,'eyeDam',3)));
        const irritation=sum(severe.map(i=>i.pct/concentrationLimit(i,'eyeIrrit',1)))+
          sum(irrit.map(i=>i.pct/concentrationLimit(i,'eyeIrrit',10)));
        E.steps.push('SCL-aware eye additivity: Σ(%/applicable SCL or GCL); damage = '+
          fmt(damage,5)+'; irritation = '+fmt(irritation,5)+' (threshold ≥ 1).');
        if(ge(damage,1)){eCat='1';E.steps.push('   Weighted damage ≥ 1 → Eye Dam. 1');}
        else if(ge(irritation,1)){eCat='2';E.steps.push('   Weighted irritation ≥ 1 → Eye Irrit. 2');}
        else E.steps.push('   Below SCL/GCL weighted eye limits.');
      } else if (ge(e1, 3)) { eCat = '1'; E.steps.push(`   Σ Cat. 1 ${fmt(e1)} % ≥ 3 % → Eye Dam. 1`); }
      else if (ge(e1, 1)) { eCat = '2'; E.steps.push(`   Σ Cat. 1 ${fmt(e1)} % is ≥ 1 % but < 3 % → Eye Irrit. 2`); }
      else if (ge(e2, 10)) { eCat = '2'; E.steps.push(`   Σ irritant ${fmt(e2)} % ≥ 10 % → Eye Irrit. 2`); }
      else if (ge(10 * e1 + e2, 10)) { eCat = '2'; E.steps.push(`   10 × Σ Cat. 1 + Σ Cat. 2 = ${fmt(10 * e1 + e2)} % ≥ 10 % → Eye Irrit. 2`); }
      else E.steps.push('   Below all Table 3.3.3 limits.');
      if (e1 > 0 || e2 > 0) E.notes.push('3.3.3.3.4.1: care is needed with acids, bases, inorganic salts, aldehydes, phenols and surfactants (many are damaging at < 1 %). Mark such ingredients "additivity not applicable" to use Table 3.3.4, or use pH.');
    }
    eNon.forEach((i) => {
      const severe=eCorr(i),key=severe?'eyeDam':'eyeIrrit';
      const limit=concentrationLimit(i,key,severe?1:3);
      if(ge(i.pct,limit)) {
        E.steps.push('Non-additive '+nm(i)+' '+fmt(i.pct)+' % ≥ '+fmt(limit)+
          ' % ('+(has(sclValue(i,key))?'SCL':'Table 3.3.4')+') → Eye '+(severe?'Dam. 1':'Irrit. 2'));
        if(severe || !eCat)eCat=severe?'1':'2';
      } else E.steps.push('Non-additive '+nm(i)+' '+fmt(i.pct)+' % < '+fmt(limit)+' % threshold.');
    });
    if (has(pH)) {
      if (phTrig && !reserveOk) { E.steps.push(`Mixture pH ${fmt(pH)} (≤ 2 or ≥ 11.5) → Eye Dam. 1 in the absence of other information (3.3.3.1.2).`); eCat = '1'; }
      else if (phTrig) E.steps.push(`Mixture pH ${fmt(pH)} extreme, reserve marked non-corrosive → pH criterion not applied (needs confirming data).`);
    }
    if (!eRel.length && !has(pH)) E.steps.push('No eye-damaging/irritant or skin-corrosive ingredient ≥ 1 % and no pH entered.');
    if (eCat === '1') { E.status = 'classified'; E.outcomes.push(out('Eye Dam. 1', ['H318'], 'Danger', ['GHS05'])); }
    else if (eCat === '2') { E.status = 'classified'; E.outcomes.push(out('Eye Irrit. 2', ['H319'], 'Warning', ['GHS07'])); }
    if (S.status === 'classified' && S.outcomes[0].label.startsWith('Skin Corr') && E.outcomes.length) {
      E.notes.push('Skin corrosion and eye classification both retained. Article 27 label selection will separately assess H314/H318 redundancy; H319 requires case-specific review.');
    }
    return [S, E];
  }

  /* Generic threshold hazard: ingredient is classified and present >= limit (GCL or its SCL) */
  function thresholdHazard(def, ings, mix) {
    const H = hz(def.id, def.name, def.ref);
    const trig = [], below = [];
    ings.forEach((i) => {
      const cat = def.get(i); if (!cat) return;
      const gcl = def.gcl(cat, mix); if (gcl === undefined) return;
      const scl = num((i.scl || {})[def.sclKey || def.id]);
      const lim = has(scl) && scl > 0 ? scl : gcl;
      const isScl = lim !== gcl;
      const ok = ge(i.pct, lim);
      const line = `${nm(i)} [${def.catLabel(cat)}] ${fmt(i.pct)} % ${ok ? '≥' : '<'} ${fmt(lim)} % (${isScl ? 'specific concentration limit' : 'generic limit'})`;
      H.steps.push(line + (ok ? ' → triggers' : ''));
      (ok ? trig : below).push({ i, cat });
    });
    if (!H.steps.length) { H.steps.push(def.none || 'No ingredient carries this classification.'); return H; }
    if (trig.length) {
      const best = def.order.find((c) => trig.some((t) => t.cat === c));
      const o = def.outcome(best, trig);
      H.status = 'classified'; H.outcomes.push(o);
      H.steps.push(`→ ${o.label}`);
    } else H.steps.push('→ no ingredient at or above its concentration limit: not classified.');
    return H;
  }

  function sensitisation(mix, ings, ctx) {
    const gas = mix.state === 'gas';
    const skin = thresholdHazard({
      id: 'skinSens', name: 'Skin sensitisation', ref: 'Annex I 3.4.3.3 · Table 3.4.5 (cons. p.162); label Table 3.4.7 (p.163)',
      get: (i) => i.skinSens, order: ['1A', '1B', '1'], catLabel: (c) => 'Skin Sens. ' + c,
      gcl: (c) => ({ '1': 1.0, '1A': 0.1, '1B': 1.0 }[c]),
      outcome: (c) => out('Skin Sens. ' + c, ['H317'], 'Warning', ['GHS07'])
    }, ings, mix);
    const resp = thresholdHazard({
      id: 'respSens', name: 'Respiratory sensitisation', ref: 'Annex I 3.4.3.3 · Table 3.4.5 (cons. p.162); label Table 3.4.7 (p.163)',
      get: (i) => i.respSens, order: ['1A', '1B', '1'], catLabel: (c) => 'Resp. Sens. ' + c,
      gcl: (c, m) => (m.state === 'gas' ? { '1': 0.2, '1A': 0.1, '1B': 0.2 } : { '1': 1.0, '1A': 0.1, '1B': 1.0 })[c],
      outcome: (c) => out('Resp. Sens. ' + c, ['H334'], 'Danger', ['GHS08'])
    }, ings, mix);
    /* elicitation: Table 3.4.6, Annex II 2.8 */
    const el = { '1': 0.1, '1A': 0.01, '1B': 0.1 };
    [['skinSens', skin, 'skin'], ['respSens', resp, 'respiratory']].forEach(([f, H, lab]) => {
      const named = [];
      ings.forEach((i) => {
        const c = i[f]; if (!c) return;
        const scl = num((i.scl || {})[f]);
        const lim = has(scl) && scl > 0 ? scl / 10 : el[c];
        if (ge(i.pct, lim)) {
          const driver = H.status === 'classified' && H.steps.some((s) => s.startsWith(nm(i) + ' [') && s.includes('→ triggers'));
          named.push({ i, c, lim, driver });
        }
      });
      if (!named.length) return;
      if (H.status !== 'classified') {
        named.forEach((n) => {
          ctx.euh.push({ code: 'EUH208', text: `Contains ${nm(n.i)}. May produce an allergic reaction`, why: `${nm(n.i)} (${lab} sensitiser ${n.c}) at ${fmt(n.i.pct)} % ≥ elicitation limit ${fmt(n.lim)} % (Table 3.4.6) and the mixture is not classified as ${lab} sensitising (Annex II 2.8, cons. p.242)` });
          ctx.sds.push(`SDS available on request: ${lab} sensitiser ${nm(n.i)} ≥ elicitation limit ${fmt(n.lim)} % (Table 3.4.6, note 1).`);
        });
      } else {
        named.filter((n) => !n.driver).forEach((n) => {
          ctx.supplemental.push(`Name ${nm(n.i)} on the label: additional ${lab} sensitiser ≥ elicitation limit ${fmt(n.lim)} % (Annex II 2.8, 2nd paragraph).`);
          ctx.sds.push(`SDS required: ${lab} sensitiser ${nm(n.i)} ≥ elicitation limit (Table 3.4.6 note 1).`);
        });
      }
    });
    return [skin, resp];
  }

  function cmr(mix, ings, ctx) {
    const mk = (id, name, field, tag, gclTable, ref, h1, h2) => thresholdHazard({
      id, name, ref, get: (i) => i[field], order: ['1A', '1B', '2'], catLabel: (c) => tag + ' ' + c, gcl: (c) => gclTable[c],
      outcome: (c) => (c === '2' ? out(tag + ' 2', [h2], 'Warning', ['GHS08']) : out(tag + ' ' + c, [h1], 'Danger', ['GHS08']))
    }, ings, mix);
    const m = mk('muta', 'Germ cell mutagenicity', 'muta', 'Muta.', { '1A': 0.1, '1B': 0.1, '2': 1.0 }, 'Annex I 3.5.3.1 · Table 3.5.2 (cons. p.166); label Table 3.5.3 (p.167)', 'H340', 'H341');
    const c = mk('carc', 'Carcinogenicity', 'carc', 'Carc.', { '1A': 0.1, '1B': 0.1, '2': 1.0 }, 'Annex I 3.6.3.1 · Table 3.6.2 (cons. p.171); label Table 3.6.3 (p.172)', 'H350', 'H351');
    /* Mixture reproductive effects are tested independently using Table 3.7.2.
       Generic/undifferentiated reproductive toxicity remains separate. */
    const r = hz('repro', 'Reproductive toxicity – fertility / development',
      'Annex I 3.7.1.1 and 3.7.3.1, Table 3.7.2; Annex VI 1.1.2.1.2');
    const rank = { '1A': 3, '1B': 2, '2': 1 };
    const genericLimit = { '1A': 0.3, '1B': 0.3, '2': 3 };
    const assess = (field, name) => {
      let best = '';
      ings.filter((i) => rank[i[field]]).forEach((i) => {
        const exact = num((i.scl || {})[field]), common = num((i.scl || {}).repro);
        const lim = exact > 0 ? exact : common > 0 ? common : genericLimit[i[field]];
        const triggered = ge(i.pct, lim);
        r.steps.push(name + ': ' + nm(i) + ' Repr. ' + i[field] + ' ' + fmt(i.pct) +
          ' % ' + (triggered ? '≥' : '<') + ' ' + fmt(lim) + ' % (' +
          (exact > 0 ? 'effect-specific SCL' : common > 0 ? 'common reproductive SCL' : 'generic limit') +
          ')' + (triggered ? ' → triggers' : ''));
        if (triggered && (!best || rank[i[field]] > rank[best])) best = i[field];
      });
      return best;
    };
    const f = assess('reproFert', 'Fertility'), d = assess('reproDev', 'Development');
    const u = assess('repro', 'Undifferentiated reproductive effect');
    const f1 = f === '1A' || f === '1B', d1 = d === '1A' || d === '1B';
    const code = f1 && d1 ? 'H360FD' : f1 && d === '2' ? 'H360Fd'
      : d1 && f === '2' ? 'H360Df' : f1 ? 'H360F' : d1 ? 'H360D'
      : f === '2' && d === '2' ? 'H361fd' : f === '2' ? 'H361f'
      : d === '2' ? 'H361d' : '';
    const statements = [];
    if (code) statements.push(code);
    if (u) statements.push(u === '2' ? 'H361' : 'H360');
    const best = [f, d, u].filter(Boolean).sort((x,y)=>rank[y]-rank[x])[0];
    if (best) {
      r.status = 'classified';
      r.outcomes.push(out('Repr. ' + best, statements,
        best === '2' ? 'Warning' : 'Danger', ['GHS08'],
        { reproductiveEffects: { fertility: f || null, development: d || null, unspecified: u || null } }));
      r.steps.push('Mixture: fertility ' + (f || 'not triggered') +
        ', development ' + (d || 'not triggered') + ', unspecified ' + (u || 'not triggered') +
        ' -> ' + statements.join(', '));
      if (u && code) r.notes.push('Generic and differentiated reproductive effects both trigger. Article 27 redundancy must be reviewed before use on a label.');
    } else r.steps.push('No reproductive endpoint met its applicable concentration limit.');
    const l = thresholdHazard({
      id: 'lact', name: 'Effects on or via lactation', ref: 'Annex I 3.7.3.1.2 · Table 3.7.2 (cons. p.181); label Table 3.7.3 (p.182)',
      get: (i) => (i.lact ? 'L' : ''), order: ['L'], catLabel: () => 'Lact.', gcl: () => 0.3,
      outcome: () => out('Lact.', ['H362'], null, [])
    }, ings, mix);
    if (c.status === 'classified' && ings.some((i) => i.carcRoute === 'inhalation'))
      c.notes.push('A source H350i does not establish that the mixture is carcinogenic only by inhalation. H350 is used until the route is justified.');
    /* SDS on request (notes to tables) */
    ings.forEach((i) => {
      if (i.carc === '2' && ge(i.pct, 0.1)) ctx.sds.push(`SDS available on request: Carc. 2 ingredient ${nm(i)} ≥ 0.1 % (Table 3.6.2 note 1).`);
      if ((i.repro || i.reproFert || i.reproDev || i.lact) && ge(i.pct, 0.1)) ctx.sds.push(`SDS available on request: reproductive toxicant / lactation ingredient ${nm(i)} ≥ 0.1 % (Table 3.7.2 note 1).`);
    });
    return [m, c, r, l];
  }

  function stot(mix, ings, ctx) {
    const res = [];
    [['SE', 'stotSE', 'Specific target organ toxicity – single exposure', 'STOT SE', 'Annex I 3.8.3.4 · Table 3.8.3 (cons. pp.189–190); 3.8.3.4.5–6 (p.190); label Table 3.8.4 (pp.190–191)', ['H370', 'H371']],
     ['RE', 'stotRE', 'Specific target organ toxicity – repeated exposure', 'STOT RE', 'Annex I 3.9.3.4 · Table 3.9.4 (cons. p.198); label Table 3.9.5 (pp.198–199)', ['H372', 'H373']]].forEach(([k, f, name, tag, ref, hs]) => {
      const H = hz('stot' + k, name, ref);
      const trig1 = [], trig2 = [];
      ings.forEach((i) => {
        const c = i[f]; if (c !== '1' && c !== '2') return;
        const scl = num((i.scl || {})[f]); const useScl = has(scl) && scl > 0;
        if (c === '1') {
          const l1 = useScl ? scl : 10;
          if (ge(i.pct, l1)) { trig1.push(i); H.steps.push(`${nm(i)} [Cat. 1] ${fmt(i.pct)} % ≥ ${fmt(l1)} % → Category 1`); }
          else if (ge(i.pct, 1)) { trig2.push(i); H.steps.push(`${nm(i)} [Cat. 1] ${fmt(i.pct)} % is ≥ 1 % but < ${fmt(l1)} % → Category 2`); }
          else H.steps.push(`${nm(i)} [Cat. 1] ${fmt(i.pct)} % < 1 % → no classification`);
        } else {
          const l2 = useScl ? scl : 10;
          if (ge(i.pct, l2)) { trig2.push(i); H.steps.push(`${nm(i)} [Cat. 2] ${fmt(i.pct)} % ≥ ${fmt(l2)} % → Category 2`); }
          else H.steps.push(`${nm(i)} [Cat. 2] ${fmt(i.pct)} % < ${fmt(l2)} % → no classification`);
          if (ge(i.pct, 1)) ctx.sds.push(`SDS available on request: ${tag} Cat. 2 ingredient ${nm(i)} ≥ 1.0 % (note 1).`);
        }
      });
      if (trig1.length) { H.status = 'classified'; H.outcomes.push(out(tag + ' 1', [hs[0]], 'Danger', ['GHS08'])); }
      else if (trig2.length) { H.status = 'classified'; H.outcomes.push(out(tag + ' 2', [hs[1]], 'Warning', ['GHS08'])); }
      if (k === 'SE') {
        const c3 = ings.filter((i) => i.stotSE === '3' && ge(i.pct, 1));
        ings.filter((i) => i.stotSE === '3' && !ge(i.pct, 1)).forEach((i) => H.steps.push(`${nm(i)} [Cat. 3] ${fmt(i.pct)} % < 1 % (relevant-ingredient threshold 3.8.3.4.6) – not counted`));
        const eff = [['stotSEresp', 'respiratory tract irritation', 'H335'], ['stotSEnarc', 'narcotic effects (drowsiness/dizziness)', 'H336']];
        eff.forEach(([flag, lab, h]) => {
          const members = c3.filter((i) => i[flag] || (!i.stotSEresp && !i.stotSEnarc));
          if (!members.length) return;
          const s = sum(members.map((i) => i.pct));
          const unspec = members.filter((i) => !i.stotSEresp && !i.stotSEnarc);
          H.steps.push(`Cat. 3 – ${lab}: ` + members.map((i) => `${nm(i)} ${fmt(i.pct)} %`).join(' + ') + ` = ${fmt(s)} % ${ge(s, 20) ? '≥' : '<'} 20 % (additive, 3.8.3.4.5)`);
          if (unspec.length) H.notes.push(`${unspec.map(nm).join(', ')}: Cat. 3 without a stated effect is counted for both respiratory irritation and narcotic effects. Specify the effect.`);
          if (ge(s, 20)) { H.status = 'classified'; H.outcomes.push(out(`STOT SE 3 (${flag === 'stotSEresp' ? 'respiratory irritation' : 'narcotic effects'})`, [h], 'Warning', ['GHS07'])); }
        });
        if (c3.length) H.notes.push('Cat. 3 is an expert-judgement call: the 20 % generic limit "may be higher or lower depending on the Category 3 ingredient(s)"; narcotic effects may occur below 20 % (3.8.3.4.5). Treat the result as a screening value.');
      }
      if (!H.steps.length) H.steps.push('No ingredient carries this classification.');
      if (H.outcomes.length > 1 && k === 'SE' && H.outcomes.filter((o) => o.label.includes('STOT SE 3')).length === 2) H.notes.push('Both H335 and H336 triggered – the label may use both statements.');
      res.push(H);
    });
    return res;
  }

  function aspiration(mix, ings) {
    const H = hz('asp', 'Aspiration hazard', 'Annex I 3.10.3.3.1 (cons. p.201); label Table 3.10.2 (p.201)');
    const rel = ings.filter((i) => i.asp && ge(i.pct, 1));
    if (!rel.length) { H.steps.push('No Aspiration Cat. 1 ingredient at ≥ 1 % (relevant-ingredient threshold, 3.10.3.3.1.1).'); return H; }
    const s = sum(rel.map((i) => i.pct)), v = num(mix.viscosity40);
    H.steps.push('Σ Cat. 1 ingredients = ' + rel.map((i) => `${nm(i)} ${fmt(i.pct)} %`).join(' + ') + ` = ${fmt(s)} %`);
    if (!ge(s, 10)) { H.steps.push('Σ < 10 % → not classified.'); return H; }
    if (!has(v)) { H.status = 'incomplete'; H.steps.push('Σ ≥ 10 %: classification depends on kinematic viscosity at 40 °C (≤ 20.5 mm²/s). Enter the viscosity to conclude.'); return H; }
    if (le(v, 20.5)) { H.status = 'classified'; H.steps.push(`Σ ≥ 10 % and kinematic viscosity ${fmt(v)} mm²/s ≤ 20.5 at 40 °C → Category 1`); H.outcomes.push(out('Asp. Tox. 1', ['H304'], 'Danger', ['GHS08'])); }
    else H.steps.push(`Viscosity ${fmt(v)} mm²/s > 20.5 → not classified.`);
    H.notes.push('Mixtures that separate into layers: the whole mixture is Category 1 if any distinct layer has Σ ≥ 10 % and viscosity ≤ 20.5 mm²/s (3.10.3.3.1.3). Dynamic viscosity (mPa·s) ÷ density (g/cm³) = kinematic viscosity (mm²/s).');
    return H;
  }

  function aquatic(mix, ings, ctx) {
    const H = hz('aquatic', 'Hazardous to the aquatic environment', 'Annex I 4.1.3.5 (cons. pp.218–220); Tables 4.1.1–4.1.3 (pp.219–221); relevance 4.1.3.1 (pp.214–215); label Table 4.1.4 (pp.221–222)');
    const validM = (raw) => {
      const value=num(raw);
      return Number.isInteger(value) && value >= 1 ? value : NaN;
    };
    const mA = (i) => has(validM(i.mAcute)) ? validM(i.mAcute) : 1;
    const mC = (i) => has(validM(i.mChronic)) ? validM(i.mChronic) : 1;
    const missingM=ings.filter(i=>
      (i.aquaAcute && !has(validM(i.mAcute))) ||
      (i.aquaChronic==='1' && !has(validM(i.mChronic))));
    if(missingM.length) {
      const names=missingM.map(nm).join(', ');
      H.notes.push('Aquatic M-factor incomplete for '+names+
        '. An interim M=1 lower-bound is used for missing/invalid factors, but the final aquatic classification cannot be confirmed.');
      H.steps.push('PROVISIONAL: M-factor not established for '+names+'. M=1 is a lower-bound screen only.');
    }
    const unk = ings.filter((i) => i.aquaUnknown && ge(i.pct, 1));
    if (unk.length) {
      const u = sum(unk.map((i) => i.pct));
      H.steps.push(`No usable aquatic data for ${unk.map(nm).join(', ')} (${fmt(u)} %).`);
      ctx.supplemental.push(`Contains ${fmt(u)} % of components with unknown hazards to the aquatic environment (4.1.3.6.1; label and SDS).`);
    }
    const a1 = ings.filter((i) => i.aquaAcute && ge(i.pct, 0.1 / mA(i)));
    ings.filter((i) => i.aquaAcute && !ge(i.pct, 0.1 / mA(i))).forEach((i) => H.steps.push(`${nm(i)} [Acute 1, M=${mA(i)}] ${fmt(i.pct)} % < (0.1/M) = ${fmt(0.1 / mA(i))} % → not relevant`));
    const c1 = ings.filter((i) => i.aquaChronic === '1' && ge(i.pct, 0.1 / mC(i)));
    ings.filter((i) => i.aquaChronic === '1' && !ge(i.pct, 0.1 / mC(i))).forEach((i) => H.steps.push(`${nm(i)} [Chronic 1, M=${mC(i)}] ${fmt(i.pct)} % < (0.1/M) = ${fmt(0.1 / mC(i))} % → not relevant`));
    const c2 = ings.filter((i) => i.aquaChronic === '2' && ge(i.pct, 1)), c3 = ings.filter((i) => i.aquaChronic === '3' && ge(i.pct, 1)), c4 = ings.filter((i) => i.aquaChronic === '4' && ge(i.pct, 1));
    ings.filter((i) => ['2', '3', '4'].includes(i.aquaChronic) && !ge(i.pct, 1)).forEach((i) => H.steps.push(`${nm(i)} [Chronic ${i.aquaChronic}] ${fmt(i.pct)} % < 1 % cut-off → not counted`));
    if (!a1.length && !c1.length && !c2.length && !c3.length && !c4.length) {
      if (!H.steps.length) H.steps.push('No ingredient classified for the aquatic environment.');
      else H.steps.push('No relevant aquatic ingredient above its cut-off → not classified.');
      if (missingM.length) H.status='incomplete';
      return H;
    }
    // Acute 1
    if (a1.length) {
      const sA = sum(a1.map((i) => i.pct * mA(i)));
      H.steps.push('Acute 1: Σ(C × M) = ' + a1.map((i) => `${fmt(i.pct)} × ${mA(i)}`).join(' + ') + ` = ${fmt(sA)} % ${ge(sA, 25) ? '≥' : '<'} 25 %`);
      if (ge(sA, 25)) { H.status = 'classified'; H.outcomes.push(out('Aquatic Acute 1', ['H400'], 'Warning', ['GHS09'])); H.steps.push('→ Aquatic Acute 1'); }
    }
    // Chronic
    const S1 = sum(c1.map((i) => i.pct * mC(i))), S2 = sum(c2.map((i) => i.pct)), S3 = sum(c3.map((i) => i.pct)), S4 = sum(c4.map((i) => i.pct));
    let chronic = null;
    const anyChronic = c1.length || c2.length || c3.length || c4.length;
    if (anyChronic) H.steps.push(`Chronic 1: Σ(C × M) = ${c1.length ? c1.map((i) => `${fmt(i.pct)} × ${mC(i)}`).join(' + ') : '0'} = ${fmt(S1)} % ${ge(S1, 25) ? '≥' : '<'} 25 %`);
    if (!anyChronic) { /* acute only */ }
    else if (ge(S1, 25)) chronic = '1';
    else {
      const t2 = 10 * S1 + S2;
      H.steps.push(`Chronic 2: 10 × ${fmt(S1)} + Σ Chronic 2 (${fmt(S2)}) = ${fmt(t2)} % ${ge(t2, 25) ? '≥' : '<'} 25 %`);
      if (ge(t2, 25)) chronic = '2';
      else {
        const t3 = 100 * S1 + 10 * S2 + S3;
        H.steps.push(`Chronic 3: 100 × ${fmt(S1)} + 10 × ${fmt(S2)} + Σ Chronic 3 (${fmt(S3)}) = ${fmt(t3)} % ${ge(t3, 25) ? '≥' : '<'} 25 %`);
        if (ge(t3, 25)) chronic = '3';
        else {
          const t4 = sum(c1.map((i) => i.pct)) + S2 + S3 + S4;
          H.steps.push(`Chronic 4: Σ (Chronic 1+2+3+4, no multipliers) = ${fmt(t4)} % ${ge(t4, 25) ? '≥' : '<'} 25 %`);
          if (ge(t4, 25)) chronic = '4';
        }
      }
    }
    if (chronic) {
      H.status = 'classified';
      const map = { '1': ['H410', 'Warning', ['GHS09']], '2': ['H411', null, ['GHS09']], '3': ['H412', null, []], '4': ['H413', null, []] }[chronic];
      H.outcomes.push(out('Aquatic Chronic ' + chronic, [map[0]], map[1], map[2]));
      H.steps.push('→ Aquatic Chronic ' + chronic);
    }
    if (!H.outcomes.length) H.steps.push('→ no summation limit reached: not classified for the aquatic environment.');
    if (missingM.length && H.status !== 'classified') H.status = 'incomplete';
    H.notes.push('M-factors for Acute/Chronic 1 must be substantiated; missing or invalid M-factors only receive a provisional M=1 lower-bound screen. The aquatic additivity formula for tested ingredients is not implemented.');
    return H;
  }

  function newClasses(mix, ings, ctx) {
    const list = [];
    list.push(thresholdHazard({
      id: 'edHH', name: 'Endocrine disruption – human health', ref: 'Annex I 3.11.3 · Table 3.11.2 (cons. pp.204–205); label p.206',
      get: (i) => i.edHH, order: ['1', '2'], catLabel: (c) => 'ED HH ' + c, gcl: (c) => ({ '1': 0.1, '2': 1.0 }[c]),
      outcome: (c) => out('ED HH ' + c, [c === '1' ? 'EUH380' : 'EUH381'], null, [])
    }, ings, mix));
    list.push(thresholdHazard({
      id: 'edEnv', name: 'Endocrine disruption – environment', ref: 'Annex I 4.2.3 · Table 4.2.2 (cons. p.226); label Table 4.2.3 (p.227)',
      get: (i) => i.edEnv, order: ['1', '2'], catLabel: (c) => 'ED ENV ' + c, gcl: (c) => ({ '1': 0.1, '2': 1.0 }[c]),
      outcome: (c) => out('ED ENV ' + c, [c === '1' ? 'EUH430' : 'EUH431'], c === '1' ? 'Danger' : 'Warning', [])
    }, ings, mix));
    [['pbt', 'PBT', 'EUH440'], ['vpvb', 'vPvB', 'EUH441']].forEach(([f, lab, code]) => list.push(thresholdHazard({
      id: f, name: lab + ' properties', ref: 'Annex I 4.3.3.1 (cons. p.231); label Table 4.3.1 (p.232)',
      get: (i) => (i[f] ? 'Y' : ''), order: ['Y'], catLabel: () => lab, gcl: () => 0.1, outcome: () => out(lab, [code], 'Danger', [])
    }, ings, mix)));
    [['pmt', 'PMT', 'EUH450'], ['vpvm', 'vPvM', 'EUH451']].forEach(([f, lab, code]) => list.push(thresholdHazard({
      id: f, name: lab + ' properties', ref: 'Annex I 4.4.3.1 (cons. p.236); label Table 4.4.1 (p.237)',
      get: (i) => (i[f] ? 'Y' : ''), order: ['Y'], catLabel: () => lab, gcl: () => 0.1, outcome: () => out(lab, [code], 'Danger', [])
    }, ings, mix)));
    list.push(thresholdHazard({
      id: 'ozone', name: 'Hazardous to the ozone layer', ref: 'Annex I 5.1.3 · Table 5.1 (cons. p.238); label Table 5.2 (p.238)',
      get: (i) => (i.ozone ? 'Y' : ''), order: ['Y'], catLabel: () => 'Ozone 1', gcl: () => 0.1,
      outcome: () => out('Ozone 1', ['H420'], 'Warning', ['GHS07'])
    }, ings, mix));
    ings.forEach((i) => {
      if (i.edHH === '2' && ge(i.pct, 0.1)) ctx.sds.push(`SDS available on request: ED HH Cat. 2 ingredient ${nm(i)} ≥ 0.1 % (Table 3.11.2 note 1).`);
      if (i.edEnv === '2' && ge(i.pct, 0.1)) ctx.sds.push(`SDS available on request: ED ENV Cat. 2 ingredient ${nm(i)} ≥ 0.1 % (Table 4.2.2 note 1).`);
    });
    return list;
  }

  /* Article 27 / Annex III Part 1: optional hazard-statement redundancy rules.
     This is a LABEL decision only; it must not modify classification or source statements.
     Explicit cases in Annex III Part 1 (including Regulation EU 2023/707 Annex III):
       H410 > H400; H314 > H318; EUH441 > EUH440; EUH451 > EUH450.
     Other potential duplications are surfaced for review, not silently deleted. */
  const ARTICLE27_RULES = Object.freeze([
    { keep: 'H410', omit: 'H400', basis: 'CLP Annex III Part 1(a)', reason: 'H410 covers the aquatic acute wording of H400 and adds long-lasting effects.' },
    { keep: 'H314', omit: 'H318', basis: 'CLP Annex III Part 1(b)', reason: 'H314 includes severe eye damage in addition to skin burns.' },
    { keep: 'EUH441', omit: 'EUH440', basis: 'CLP Annex III Part 1(c), Regulation (EU) 2023/707', reason: 'The stronger vPvB accumulation statement covers the PBT accumulation statement.' },
    { keep: 'EUH451', omit: 'EUH450', basis: 'CLP Annex III Part 1(d), Regulation (EU) 2023/707', reason: 'The stronger vPvM water-contamination statement covers the PMT statement.' }
  ]);

  function selectArticle27(hazardStatements, euhStatements, options) {
    const omitOptional = !options || options.omitOptional !== false;
    const hazard = (hazardStatements || []).map((x) => Object.assign({}, x));
    const euh = (euhStatements || []).map((x) => Object.assign({}, x));
    const all = hazard.concat(euh);
    const present = new Set(all.map((x) => x.code));
    const decisions = [], omitted = [], selectedHazard = [], selectedEuh = [];
    all.forEach((entry) => {
      const availableRule = ARTICLE27_RULES.find((r) => r.omit === entry.code && present.has(r.keep));
      const rule = omitOptional ? availableRule : null;
      const decision = Object.assign({}, entry, {
        decision: rule ? 'omitted' : 'retained',
        reason: rule ? rule.reason : availableRule && !omitOptional
          ? 'User elected to retain this statement despite the optional Annex III omission permitted when ' + availableRule.keep + ' is assigned.'
          : 'No explicit Annex III omission rule applied; retained pending any case-specific Article 27 review.',
        basis: availableRule ? availableRule.basis : 'CLP Article 27',
        overriddenBy: rule ? rule.keep : null,
        optionalOmissionAvailable: !rule && !!availableRule
      });
      decisions.push(decision);
      if (rule) omitted.push(decision);
      else if (entry.code.startsWith('EUH')) selectedEuh.push(entry);
      else selectedHazard.push(entry);
    });
    const review = [];
    if (present.has('H335') && present.has('EUH071'))
      review.push({ codes: ['H335', 'EUH071'], basis: 'CLP Article 27, case-specific redundancy', reason: 'EUH071 (corrosive to the respiratory tract) may make H335 redundant. Check the context and supporting guidance before omitting H335.' });
    if (present.has('H314') && present.has('H319'))
      review.push({ codes: ['H314', 'H319'], basis: 'CLP Article 27, case-specific redundancy', reason: 'H314 and H319 are both present. Check the mixture classification and whether the H319 wording is redundant; no automatic omission applied.' });
    if (present.has('H360') && all.some((x) => /^H360(?:F|D)/.test(x.code)))
      review.push({ codes: ['H360', 'differentiated H360'], basis: 'CLP Article 27, case-specific redundancy', reason: 'Generic and differentiated reproductive hazard statements are present. Assess effect overlap before final label release; none was automatically removed.' });
    return {
      hazardStatements: selectedHazard, euhStatements: selectedEuh,
      triggeredHazardStatements: hazard, triggeredEuhStatements: euh,
      omittedHazardStatements: omitted.filter((x) => !x.code.startsWith('EUH')),
      omittedEuhStatements: omitted.filter((x) => x.code.startsWith('EUH')),
      decisions, review, omitOptional
    };
  }

  /* CLP Article 26 pictogram selection: operate on hazard-specific contributions.
     In particular GHS05/GHS08 do NOT suppress unrelated GHS07 hazards.
     Physical-hazard optional omissions are opt-in; manual Type B exceptions are protected. */
  function selectArticle26(outcomes, options) {
    const omitOptional = !!(options && options.omitOptional);
    const sources = [];
    (outcomes || []).filter((o) => !o.omitOnLabel).forEach((o) => {
      (o.picto || []).forEach((code) => {
        if (!PICTO[code]) return;
        sources.push({
          code, from: o.label, hazardId: o.hazardId || '',
          h: Array.isArray(o.h) ? o.h.slice() : [],
          isManual: /^manual/.test(o.hazardId || '')
        });
      });
    });
    const grouped = {};
    sources.forEach((s) => ((grouped[s.code] = grouped[s.code] || []).push(s)));
    const has = (c) => !!grouped[c];
    const respirSens = (grouped.GHS08 || []).some((s) =>
      s.h.includes('H334') || /^Resp(?:iratory)?\.?\s*Sens/i.test(s.from));
    const ghs05HCodes = new Set((grouped.GHS05 || []).flatMap((s) => s.h));
    const ghs05Cause = ghs05HCodes.has('H314') ? 'H314 (skin corrosion)' :
      ghs05HCodes.has('H318') ? 'H318 (serious eye damage)' :
      'a GHS05-classified hazard';
    const protectedTypeB = sources.some((s) =>
      (s.code === 'GHS01' || s.code === 'GHS02') &&
      /(?:Self[-\s]*react(?:ive)?\.?|Org(?:anic)?\.?\s*Perox(?:ide)?\.?)\s*(?:Type\s*)?B\b/i.test(s.from));
    const decisions = [], omitted = [], retained = [], review = [];

    Object.keys(grouped).sort().forEach((code) => {
      const contributions = grouped[code].map((s) => {
        let decision = 'retained', basis = 'CLP Article 26', reason = 'Required for this classification; no precedence rule removes its pictogram.';
        const irritation = s.h.some((h) => h === 'H315' || h === 'H319') ||
          /^Skin Irrit\.|^Eye Irrit\./i.test(s.from);
        const skinSens = s.h.includes('H317') || /^Skin Sens\./i.test(s.from);
        if (code === 'GHS07' && has('GHS06')) {
          decision = 'omitted'; basis = 'CLP Article 26(1)(b)';
          reason = 'GHS06 applies; GHS07 shall not appear on the label, regardless of the GHS07 hazard.';
        } else if (code === 'GHS07' && has('GHS05') && irritation) {
          decision = 'omitted'; basis = 'CLP Article 26(1)(c)';
          const irritationCode = s.h.includes('H319') ? 'H319 (eye irritation)' :
            s.h.includes('H315') ? 'H315 (skin irritation)' :
            'the skin/eye irritation classification';
          reason = 'The GHS07 (exclamation mark) contribution from ' + irritationCode +
            ' is omitted because ' + ghs05Cause +
            ' requires GHS05 (corrosion). Article 26(1)(c) changes only the pictogram selection; the mixture classification and H-statement decisions remain separate.';
        } else if (code === 'GHS07' && respirSens && (irritation || skinSens)) {
          decision = 'omitted'; basis = 'CLP Article 26(1)(d)';
          reason = 'GHS08 applies for respiratory sensitisation; GHS07 shall not appear for skin sensitisation or skin/eye irritation.';
        } else if ((code === 'GHS02' || code === 'GHS03') && has('GHS01')) {
          if (code === 'GHS02' && protectedTypeB) {
            basis = 'CLP Article 26(1)(a), exception for mandatory physical pictograms';
            reason = 'GHS01 and GHS02 are both mandatory for the identified Self-reactive Type B / Organic Peroxide Type B classification; GHS02 is retained.';
          } else if (omitOptional) {
            decision = 'omitted'; basis = 'CLP Article 26(1)(a)';
            reason = 'GHS01 also applies. This GHS02/GHS03 pictogram is optionally omitted; verify any mandatory co-pictogram exceptions for the physical classification.';
          } else {
            basis = 'CLP Article 26(1)(a)';
            reason = 'GHS01 also applies. Omission is optional; retained by the current user preference.';
          }
        } else if (code === 'GHS04' && (has('GHS02') || has('GHS06'))) {
          if (omitOptional) {
            decision = 'omitted'; basis = 'CLP Article 26(1)(e)';
            reason = 'GHS02 or GHS06 also applies; optional omission of GHS04 selected.';
          } else {
            basis = 'CLP Article 26(1)(e)';
            reason = 'GHS02 or GHS06 also applies; GHS04 may be omitted but is retained by the user preference.';
          }
        }
        return {
          from: s.from, hazardId: s.hazardId, hazardStatements: s.h,
          decision, basis, reason
        };
      });
      const visible = contributions.some((s) => s.decision === 'retained');
      const d = {
        code, name: PICTO[code], from: [...new Set(grouped[code].map((s) => s.from))],
        decision: visible ? 'retained' : 'omitted',
        contributions,
        basis: [...new Set(contributions.map((s) => s.basis))].join('; '),
        reason: visible
          ? contributions.some((s) => s.decision === 'omitted')
            ? 'Retained because at least one classification still requires this pictogram after precedence.'
            : contributions.map((s) => s.reason).filter((v,i,a)=>a.indexOf(v)===i).join(' ')
          : contributions.map((s) => s.reason).filter((v,i,a)=>a.indexOf(v)===i).join(' ')
      };
      decisions.push(d);
      (visible ? retained : omitted).push(d);
    });

    if (has('GHS01') && has('GHS02') && !protectedTypeB)
      review.push({
        codes: ['GHS01', 'GHS02'], basis: 'CLP Article 26(1)(a)',
        reason: 'Verify whether the physical hazard is a Self-reactive Type B or Organic Peroxide Type B or has another mandatory co-pictogram requirement before omitting GHS02. Manual classifications require supporting data.'
      });
    if (has('GHS01') && has('GHS03'))
      review.push({
        codes: ['GHS01', 'GHS03'], basis: 'CLP Article 26(1)(a)',
        reason: 'Check whether an exception makes multiple physical pictograms compulsory; otherwise GHS03 omission is optional.'
      });
    if (sources.some((s) => s.isManual && s.code))
      review.push({
        codes: [...new Set(sources.filter((s) => s.isManual).map((s) => s.code))],
        basis: 'CLP Article 26(2)',
        reason: 'Manual physical or health hazard entries are not independently validated for severity within a hazard class. Confirm required pictograms and the most severe applicable hazard category.'
      });

    return {
      pictograms: retained.map(({code,name,from})=>({code,name,from})),
      triggeredPictograms: Object.keys(grouped).sort().map((code)=>({
        code, name: PICTO[code], from: [...new Set(grouped[code].map((s) => s.from))]
      })),
      omittedPictograms: omitted,
      pictogramDecisions: decisions, pictogramReview: review,
      omitOptionalPictograms: omitOptional
    };
  }


  /* ARTICLE 22 + ARTICLE 28 / ANNEX IV.
     This is a conservative, explicitly PARTIAL candidate selector, not a final
     regulatory P-statement database. It keeps candidate and review trails separate.
     No individual P-code is automatically labelled "mandatory" solely by H-code.
     Article 28(2) does impose a qualified CONSUMER DISPOSAL statement requirement.
     Annex IV Part 1 tables 6.1-6.5 are the selection source; Part 2 is wording.
  */
  const P28_RULES = Object.freeze([
    {code:'P101', text:'If medical advice is needed, have product container or label at hand.', consumer:true, priority:30, group:'general', basis:'Annex IV Table 6.1, consumer products'},
    {code:'P102', text:'Keep out of reach of children.', consumer:true, priority:80, group:'general', basis:'Annex IV Table 6.1, consumer products'},
    {code:'P103', text:'Read carefully and follow all instructions.', consumer:true, priority:25, group:'general', basis:'Annex IV Table 6.1, consumer products; omit if P202 is used'},
    {code:'P210', text:'Keep away from heat, hot surfaces, sparks, open flames and other ignition sources. No smoking.', h:['H224','H225','H226'], priority:95, group:'prevention', basis:'Annex IV Table 6.2, flammable liquids 1-3'},
    {code:'P202', text:'Do not handle until all safety precautions have been read and understood.', h:['H340','H341','H350','H350i','H351','H360*','H361*','H362'], priority:86, group:'prevention', basis:'Annex IV Table 6.2, CMR / lactation'},
    {code:'P280', text:'Wear protective gloves/protective clothing/eye protection/face protection/…', h:['H224','H225','H226','H314','H315','H317','H318','H319','H340','H341','H350','H350i','H351','H360*','H361*'], priority:65, group:'prevention', needs:'ppe', basis:'Annex IV Table 6.2; specify suitable protective equipment'},
    {code:'P273', text:'Avoid release to the environment.', h:['H400','H410','H411','H412','H413'], priority:64, group:'prevention', condition:'only where release is not the intended use', basis:'Annex IV Table 6.2, aquatic hazard; intended use'},
    {code:'P261', text:'Avoid breathing dust/fume/gas/mist/vapours/spray.', h:['H317','H334','H335','H336','H332'], priority:57, group:'prevention', needs:'exposure', basis:'Annex IV Table 6.2; specify exposure medium'},
    {code:'P260', text:'Do not breathe dust/fume/gas/mist/vapours/spray.', h:['H330','H370','H371','H372','H373','H362'], priority:79, group:'prevention', needs:'exposure', basis:'Annex IV Table 6.2; check exact category/exposure medium'},
    {code:'P301+P330+P331', text:'IF SWALLOWED: Rinse mouth. Do NOT induce vomiting.', h:['H314'], priority:90, group:'response', basis:'Annex IV Table 6.3, skin corrosion'},
    {code:'P305+P351+P338', text:'IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses, if present and easy to do. Continue rinsing.', h:['H314','H318','H319'], priority:95, group:'response', basis:'Annex IV Table 6.3, skin corrosion / eye damage or irritation'},
    {code:'P303+P361+P353', text:'IF ON SKIN (or hair): Take off immediately all contaminated clothing. Rinse skin with water [or shower].', h:['H314','H224','H225','H226'], priority:71, group:'response', basis:'Annex IV Table 6.3, skin corrosion / flammable liquids', condition:'square-bracket alternatives require review'},
    {code:'P302+P352', text:'IF ON SKIN: Wash with plenty of water/…', h:['H315','H317'], priority:62, group:'response', needs:'wash', basis:'Annex IV Table 6.3, irritation/sensitisation'},
    {code:'P333+P313', text:'If skin irritation or rash occurs: Get medical advice/attention.', h:['H317'], priority:62, group:'response', basis:'Annex IV Table 6.3, skin sensitisation'},
    {code:'P337+P313', text:'If eye irritation persists: Get medical advice/attention.', h:['H319'], priority:50, group:'response', basis:'Annex IV Table 6.3, eye irritation 2'},
    {code:'P301+P310', text:'IF SWALLOWED: Immediately call a POISON CENTER/doctor/…', h:['H300','H301','H304'], priority:94, group:'response', needs:'emergency', basis:'Annex IV Table 6.3, acute oral 1-3 / aspiration 1'},
    {code:'P301+P312', text:'IF SWALLOWED: Call a POISON CENTER/doctor/… if you feel unwell.', h:['H302'], priority:78, group:'response', needs:'emergency', basis:'Annex IV Table 6.3, acute oral 4'},
    {code:'P331', text:'Do NOT induce vomiting.', h:['H304'], priority:86, group:'response', basis:'Annex IV Table 6.3, aspiration hazard 1'},
    {code:'P304+P340', text:'IF INHALED: Remove person to fresh air and keep comfortable for breathing.', h:['H330','H331','H332','H334','H335','H336'], priority:78, group:'response', basis:'Annex IV Table 6.3, acute inhalation / respiratory sensitisation / STOT SE3'},
    {code:'P308+P313', text:'IF exposed or concerned: Get medical advice/attention.', h:['H340','H341','H350','H350i','H351','H360*','H361*','H362'], priority:81, group:'response', basis:'Annex IV Table 6.3, CMR / lactation'},
    {code:'P501', text:'Dispose of contents/container to …', h:['H224','H225','H226','H300','H301','H302','H310','H311','H312','H314','H317','H330','H331','H334','H340','H341','H350','H350i','H351','H360*','H361*','H370','H371','H372','H373','H304','H335','H336','H400','H410','H411','H412','H413'], priority:65, group:'disposal', needs:'disposal', basis:'Annex IV Table 6.5; Article 28(2) for the general public, subject to Article 22'}
  ]);
  const P28_MAP = Object.freeze(Object.fromEntries(P28_RULES.map((r) => [r.code, r])));
  const P28_REVIEW_LIMIT = 6;

  function selectArticle28(outcomes, settings) {
    const m = settings || {};
    const audience = ['consumer','professional','industrial'].includes(m.audience) ? m.audience : 'unknown';
    const hazards = (outcomes || []).filter((o) => !o.omitOnLabel)
      .flatMap((o) => (o.h || []).filter((h) => /^H\d{3}(?:[A-Za-z]*)$/.test(h))
        .map((h) => ({h, from:o.label})));
    const hs = [...new Set(hazards.map((h) => h.h))];
    const matches = (pattern, h) => pattern.endsWith('*') ? h.startsWith(pattern.slice(0,-1)) : pattern === h;
    const active = new Map(), review = [], warnings = [];
    const add = (rule, why, manual) => {
      const existing = active.get(rule.code);
      if (existing) {
        if (why && !existing.triggeredBy.includes(why)) existing.triggeredBy.push(why);
      } else active.set(rule.code, {
        code:rule.code,text:rule.text || '',
        basis:rule.basis || 'Manual entry — independently verify against Annex IV',
        reason:rule.consumer ? 'Annex IV general precautionary statement for consumer products; include as appropriate.'
          : 'Eligible for the identified hazard classification under Annex IV. Select by use, packaging and relevance.',
        triggeredBy:why ? [why] : [], group:rule.group || 'manual',
        priority:rule.priority || 0, needs:rule.needs || '',
        condition:rule.condition || '', manual:!!manual, legalStatus:'candidate'
      });
    };
    P28_RULES.forEach((rule) => {
      if (rule.consumer && audience === 'consumer' && hs.length) add(rule,'consumer products (where relevant)');
      if (rule.h) hazards.forEach(({h,from}) => {
        if (rule.h.some((x) => matches(x,h))) add(rule,from + ' (' + h + ')');
      });
    });

    const supplied = (text) => String(text || '').trim();
    const parseCodes = (raw) => supplied(raw).split(/[,;\n]+/).map((x) => x.trim().toUpperCase().replace(/\s*\+\s*/g,'+')).filter(Boolean);
    const explicitCodes = [...new Set(parseCodes(m.manualPExtra))];
    const exclusions = new Set(parseCodes(m.manualPExcluded));
    const reasonText = supplied(m.manualPReason);
    explicitCodes.forEach((code) => {
      if (!/^P\d{3}(?:\+P\d{3})*$/.test(code)) {
        warnings.push('Invalid manual P-statement code: '+code+'. Use codes such as P280 or P305+P351+P338.');
        return;
      }
      const rule=P28_MAP[code];
      if (!rule) {
        add({code,text:'[Official Annex IV wording must be verified before use]',group:'manual',priority:110},'manual selection',true);
        warnings.push('Manual '+code+' has no verified wording in this limited catalogue: check Annex IV Part 2 and eligibility.');
        review.push({severity:'blocker',code,reason:'Manual P-code '+code+' has no independently verified Annex IV wording/eligibility in this catalogue. Do not print as a final statement until checked.'});
      } else {
        add(rule,'manual selection',true);
        if (rule.h && !hs.some(h => rule.h.some(pattern => matches(pattern,h))))
          review.push({severity:'review',code,reason:'Manually added '+code+' does not match any mapped classification for this mixture. Confirm applicability against Annex I and IV.'});
      }
      const entry=active.get(code);
      if (entry) { entry.manual=true; entry.priority=Math.max(entry.priority,110); }
    });

    const publicSupply = audience === 'consumer';
    const P501 = active.get('P501');
    const consumerDisposalApplies = publicSupply && hs.length>0 && !!P501;
    if (consumerDisposalApplies) {
      P501.legalStatus='conditional statutory disposal obligation';
      P501.reason='Consumer supply: Article 28(2) generally requires a disposal precaution addressing both contents and packaging, subject to Article 22. P501 is the available Annex IV Table 6.5 statement for this classification; text must be completed by the supplier.';
      P501.priority=1000;
      const dest=supplied(m.disposalDestination);
      if (dest) P501.text='Dispose of contents and container to '+dest.replace(/\.+$/,'')+'.';
      else {
        P501.text='Dispose of contents and container to [SPECIFY APPROPRIATE DISPOSAL ROUTE].';
        review.push({severity:'blocker',code:'P501',
          reason:'Consumer disposal wording is incomplete. Specify the correct destination/route before approving a label. Confirm Article 22 applicability.'});
      }
    } else if (publicSupply && hs.length>0) {
      review.push({severity:'blocker',code:'disposal',
        reason:'Article 28(2) generally requires a disposal statement for consumer supply unless not required under Article 22. No P501 eligibility was matched in this partial ruleset; manually verify Annex IV P501/P502/P503 and any applicable exception.'});
    }
    if (audience==='unknown' && hs.length)
      review.push({severity:'blocker',code:'audience',
        reason:'Supply audience not selected: cannot determine whether the consumer-disposal obligation and consumer-only general precautions apply.'});
    if (!supplied(m.intendedUse) && hs.length)
      review.push({severity:'review',code:'intendedUse',
        reason:'Intended or identified use is missing. Article 22(3) and Annex IV require use-specific selection; verify candidates against actual product use and packaging.'});

    const candidates=[...active.values()];
    for(const c of candidates) {
      if(c.needs==='ppe') {
        const ppe=supplied(m.ppeDescription);
        c.text=ppe ? 'Wear '+ppe.replace(/\.+$/,'')+'.' : '[Specify protective gloves/clothing/eye/face protection appropriate for the product]';
        if(!ppe) review.push({severity:'review',code:c.code,reason:'P280 protective equipment type has not been specified; Annex IV requires supplier selection.'});
      }
      if(c.needs==='disposal' && !consumerDisposalApplies) {
        const dest=supplied(m.disposalDestination);
        if(dest) c.text='Dispose of contents and container to '+dest.replace(/\.+$/,'')+'.';
        else review.push({severity:'review',code:c.code,reason:'P501 requires a supplier-specified disposal destination and contents/container scope.'});
      }
      if(c.needs==='emergency') review.push({severity:'review',code:c.code,
        reason:c.code+' requires supplier choice of suitable poison-centre/medical-advice wording. The stored text contains unresolved alternatives.'});
      if(c.needs==='exposure') review.push({severity:'review',code:c.code,
        reason:c.code+' requires supplier choice of relevant dust/fume/gas/mist/vapour/spray forms.'});
      if(c.condition && c.code==='P273') review.push({severity:'review',code:c.code,
        reason:'P273 is conditional: if environmental release is the intended use, applicability must be reconsidered.'});
      if(c.condition && c.condition.includes('square-bracket'))
        review.push({severity:'review',code:c.code,reason:'Bracketed Annex IV wording alternatives are conditional and must be chosen by the supplier; do not print the brackets verbatim.'});
    }

    // Annex IV table 6.1 and 6.2 explicitly allow these redundancies.
    const explicitPairs=[['P103','P202','Annex IV Table 6.1: P103 may be omitted when P202 is used'],
                         ['P261','P260','Annex IV Table 6.2: P261 may be omitted where P260 is used']];
    const omittedByRedundancy=new Map();
    for(const [weaker,stronger,basis] of explicitPairs)
      if(active.has(weaker)&&active.has(stronger)&&!explicitCodes.includes(weaker)) omittedByRedundancy.set(weaker,{stronger,basis});
    // The consumer-only optional P201 statement is not generated; P202 is used
    // as a candidate when relevant, and P103 is excluded if redundant.
    const manualExclusions=[];
    for(const code of exclusions){
      if(!active.has(code)) {warnings.push('Manual exclusion '+code+' does not match a candidate.');continue;}
      if(code==='P501' && consumerDisposalApplies){
        review.push({severity:'blocker',code,reason:'Manual exclusion of consumer disposal statement is not automatically allowed. Article 28(2) obligation must be addressed or an Article 22 exception justified.'});
        continue;
      }
      if(!reasonText) review.push({severity:'blocker',code,reason:'Excluding '+code+' requires a documented regulatory reason; the exclusion has not been applied.'});
      else manualExclusions.push(code);
    }
    const validExclusions=new Set(manualExclusions);
    const eligible=candidates.filter(c=>!omittedByRedundancy.has(c.code)&&!validExclusions.has(c.code))
      .sort((a,b)=>b.priority-a.priority || a.code.localeCompare(b.code));
    const selected=eligible.slice(0,P28_REVIEW_LIMIT);
    const picked=new Set(selected.map(x=>x.code));
    const decisions=candidates.map((c)=>{
      const redundant=omittedByRedundancy.get(c.code);
      const manualExcluded=validExclusions.has(c.code);
      const selectedNow=picked.has(c.code);
      const reason=selectedNow ? c.reason
        : redundant ? 'Omitted as redundant with '+redundant.stronger+'; '+redundant.basis+'.'
        : manualExcluded ? 'Manually excluded with justification: '+reasonText
        : 'Not selected in six-statement draft; review product-specific priority and whether more than six are necessary.';
      return {...c,decision:selectedNow?'proposed':redundant?'redundant':manualExcluded?'excluded':'not selected',
        decisionReason:reason, redundancyBasis:redundant?redundant.basis:null};
    });
    if(eligible.length>6) review.push({severity:'blocker',code:'six-statements',
      reason:eligible.length+' eligible P-statement candidates exceed the six-statement default. The proposed six are a provisional priority shortlist, NOT a legally determined final set. Verify all requirements; Article 28(3) permits more when needed.'});
    const unresolved=decisions.filter(d=>d.decision==='proposed' &&
      (d.text.includes('…')||d.text.includes('[')||d.text.includes('/doctor/')||d.text.includes('/…')));
    if(unresolved.length) review.push({severity:'blocker',code:'wording',
      reason:'Selected P statements with supplier choices/unfinished wording: '+unresolved.map(x=>x.code).join(', ')+'. Complete Annex IV wording before release.'});
    const matchedHS=new Set();
    P28_RULES.filter(r=>r.h).forEach(r=>hs.forEach(h=>{if(r.h.some(v=>matches(v,h)))matchedHS.add(h)}));
    const uncovered=hs.filter(h=>!matchedHS.has(h));
    if(uncovered.length) review.push({severity:'blocker',code:'unmapped',
      reason:'Partial Annex IV coverage: no candidate mapping yet for '+uncovered.join(', ')+'. Assess the full Annex I/IV selection tables; absence of a candidate is not proof of no P-statements.'});
    if(!hs.length && outcomes.some(o=>(o.h||[]).some(h=>/^EUH/.test(h))))
      review.push({severity:'review',code:'supplemental',reason:'Supplemental-only hazard statements may need case-specific labelling assessment. No P-statement is inferred solely from an EUH code.'});
    const requiredObligations=[];
    if (consumerDisposalApplies)requiredObligations.push({id:'consumer-disposal',status:P501&&picked.has('P501')&&supplied(m.disposalDestination)?'satisfied-draft':'unresolved',
      basis:'CLP Article 28(2), subject to Article 22',description:'Disposal precautionary statement addressing product contents and packaging for consumer supply.'});
    else if(publicSupply&&hs.length)requiredObligations.push({id:'consumer-disposal',status:'requires-review',
      basis:'CLP Article 28(2), subject to Article 22',description:'Check an eligible Annex IV disposal statement and any legal exception.'});
    return {
      audience, intendedUse:supplied(m.intendedUse), selected:decisions.filter(x=>x.decision==='proposed'),
      candidates:decisions, manualOverrides:{extra:explicitCodes,excluded:[...exclusions]},
      requiredObligations, review, warnings, uncovered,
      limit:P28_REVIEW_LIMIT, excessCandidateCount:Math.max(0,eligible.length-6),
      readyForFinalLabel:false,
      scope:'Partial verified Annex IV catalogue: decision support; must validate full Annex I/IV tables, conditions, all selected text and product uses before release.'
    };
  }

  /* ---------------- main ---------------- */
  function normalise(mix) {
    const m = Object.assign({ state: 'liquid' }, mix || {});
    const warnings = [];
    const ings = (m.ingredients || []).map((raw) => {
      const i = Object.assign(blankIngredient(), raw);
      const id = (raw.name || raw.cas || 'Unnamed ingredient').trim();
      const invalid = (field, value, units) => warnings.push('DATA VALIDATION: '+id+
        ' — invalid '+field+' '+JSON.stringify(value)+'. '+units+
        ' Result may be unreliable until corrected.');
      ['oral','dermal','inh'].forEach((route) => {
        const a = (raw.acute || {})[route] || {};
        if (entered(a.ate) && !validPositive(a.ate))
          invalid(route+' ATE',a.ate,'ATE must be a positive finite number in the selected route units.');
        if (entered(a.cat) && !['1','2','3','4'].includes(String(a.cat)))
          invalid(route+' acute category',a.cat,'Use Category 1, 2, 3 or 4.');
        if(a.unknown && (entered(a.cat) || entered(a.ate)))
          warnings.push('DATA REVIEW: '+id+' — '+route+' route marked unknown but an ATE/category is also entered. Known route information takes precedence; verify the flag.');
      });
      if (raw.aquaAcute && !entered(raw.mAcute))
        warnings.push('DATA GAP: '+id+' — Aquatic Acute 1 M-factor is missing. M=1 is a lower-bound scenario only; classification is provisional.');
      if (raw.aquaChronic === '1' && !entered(raw.mChronic))
        warnings.push('DATA GAP: '+id+' — Aquatic Chronic 1 M-factor is missing. M=1 is a lower-bound scenario only; classification is provisional.');
      for(const [field,applicable] of [['mAcute',!!raw.aquaAcute],['mChronic',raw.aquaChronic==='1']]) {
        if (!entered(raw[field])) continue;
        const mFactor = num(raw[field]);
        if (!has(mFactor) || mFactor < 1 || !Number.isInteger(mFactor))
          invalid(field,raw[field],'M-factor must be an integer of at least 1; do not use a silent default.');
        if (!applicable)
          warnings.push('INPUT REVIEW: '+id+' — '+field+' supplied but the corresponding aquatic Category 1 classification is not selected.');
      }
      for (const [field,value] of Object.entries(raw.scl || {})) {
        if (!entered(value)) continue;
        const n=num(value);
        if (!has(n) || n <= 0 || n > 100) invalid('SCL '+field,value,'SCL must be a percentage greater than 0 and at most 100.');
      }
      if (raw.acute && raw.acute.unknown &&
          ['oral','dermal','inh'].some((route)=>{
            const a=raw.acute[route] || {};
            return entered(a.cat) || entered(a.ate);
          })) warnings.push('DATA REVIEW: '+id+
          ' is marked unknown acute toxicity but also has route-specific ATE/category data. Confirm which routes are unknown; the current unknown flag is ingredient-wide.');
      i.acute = Object.assign({}, blankIngredient().acute, raw.acute || {});
      ['oral', 'dermal', 'inh'].forEach((r) => (i.acute[r] = Object.assign({}, blankIngredient().acute[r], (raw.acute || {})[r] || {})));
      i.scl = Object.assign({}, raw.scl || {});
      i.pct = num(raw.pct);
      // Re-derive source H-code differentiations without overwriting manual category edits.
      i.hcodeDetails = parseHCodeTokens(i.hcodes).codes;
      // Recover differentiated effects from legacy saved formulations, preserving a
      // generic category where the original H-code did not identify a specific effect.
      if (!Object.prototype.hasOwnProperty.call(raw, 'reproFert') &&
          !Object.prototype.hasOwnProperty.call(raw, 'reproDev') &&
          raw.repro && i.hcodeDetails.some((d) => d.fertility || d.development)) {
        const inferred = blankIngredient();
        applyHCodes(inferred, i.hcodes);
        i.reproFert = inferred.reproFert;
        i.reproDev = inferred.reproDev;
        if (raw.repro === '1A') {
          if (i.reproFert === '1B') i.reproFert = '1A';
          if (i.reproDev === '1B') i.reproDev = '1A';
        }
        i.repro = inferred.repro;
      }
      return i;
    }).filter((i) => {
      if (!has(i.pct) || i.pct <= 0) { if ((i.name || '').trim() || i.pct === 0) warnings.push(`Ingredient "${nm(i)}" has no concentration > 0 and is ignored.`); return false; }
      return true;
    });
    return { m, ings, warnings };
  }

  function classify(mixture) {
    const { m, ings, warnings } = normalise(mixture);
    const ctx = { supplemental: [], euh: [], sds: [], warnings };
    const total = sum(ings.map((i) => i.pct));
    if (!ings.length) warnings.push('No ingredients with a concentration were entered.');
    else if (Math.abs(total - 100) > 0.5) warnings.push(`Concentrations add up to ${fmt(total)} %, not 100 %. Classification uses the percentages as entered.`);
    if(total>100+EPS) warnings.push('DATA VALIDATION: Total mixture concentration exceeds 100%; SCL, ATE and aquatic summation results may be misleading. Correct the formulation.');
    const hazards = [];
    hazards.push(flammability(m));
    hazards.push(acute(m, ings, ctx));
    hazards.push(...corrosionHazards(m, ings));
    hazards.push(...sensitisation(m, ings, ctx));
    hazards.push(...cmr(m, ings, ctx));
    hazards.push(...stot(m, ings, ctx));
    hazards.push(aspiration(m, ings));
    hazards.push(aquatic(m, ings, ctx));
    hazards.push(...newClasses(m, ings, ctx));
    (m.manual || []).forEach((x, k) => {
      if (!x || !(x.label || x.h)) return;
      const H = hz('manual' + k, 'Manual entry: ' + (x.label || x.h), 'Entered by user (e.g. from test data)');
      H.status = 'classified';
      H.steps.push('User-entered classification (not calculated).');
      H.outcomes.push(out(x.label || x.h, x.h ? String(x.h).split(/[\s,;+]+/).filter(Boolean) : [], x.signal || null, x.picto ? [x.picto] : []));
      hazards.push(H);
    });
    /* label summary */
    const classified = hazards.filter((h) => h.status === 'classified');
    const outcomes = [];
    classified.forEach((h) => h.outcomes.forEach((o) => outcomes.push(Object.assign({}, o, { hazardId: h.id, hazard: h.name }))));
    const art26 = selectArticle26(outcomes, { omitOptional: m.article26Mode === 'omitOptional' });
    const hs = [];
    const seen = new Set();
    outcomes.filter((o) => !o.omitOnLabel).forEach((o) => o.h.forEach((c) => { if (!seen.has(c)) { seen.add(c); hs.push({ code: c, text: HTEXT[c] || '', from: o.label }); } else { const e = hs.find((x) => x.code === c); if (e && !e.from.includes(o.label)) e.from += ', ' + o.label; } }));
    const art27 = selectArticle27(
      hs.filter((x) => !/^EUH/.test(x.code)),
      [...hs.filter((x) => /^EUH/.test(x.code)), ...ctx.euh.map((x) => ({ code: x.code, text: x.text, from: x.why }))],
      { omitOptional: m.article27Mode !== 'keepAll' }
    );
    /* A source ingredient's H319 does not itself trigger GHS07 for the MIXTURE.
       Record that distinction explicitly; do not falsely report an Article 26 omission. */
    const pictogramExplanations = [];
    const mixtureH314 = outcomes.some((o) => o.h.includes('H314'));
    const mixtureH319 = outcomes.some((o) => o.h.includes('H319'));
    const ingredientH319 = ings.some((i) =>
      i.eye === '2' || i.hcodeDetails.some((d) => d.code === 'H319'));
    const h319Contribution = art26.pictogramDecisions
      .flatMap((d) => d.contributions)
      .find((c) => c.hazardStatements.includes('H319') && c.decision === 'omitted');
    if (mixtureH314 && mixtureH319 && h319Contribution) {
      const ghs07Retained = art26.pictograms.some((p) => p.code === 'GHS07');
      pictogramExplanations.push({
        kind: 'omittedByArticle26', code: 'H319',
        basis: 'CLP Article 26(1)(c)',
        reason: 'H319 is classified for the mixture and would trigger GHS07. Because H314 requires GHS05, the H319-derived GHS07 contribution is omitted under Article 26(1)(c). ' +
          (ghs07Retained
            ? 'GHS07 is nevertheless retained because a different classified hazard also requires it.'
            : 'No other classification requires GHS07, so the exclamation-mark pictogram is absent from the proposed label.') +
          ' The H319 classification remains; Article 27 governs any H-statement omission.'
      });
    } else if (mixtureH314 && ingredientH319 && !mixtureH319) {
      pictogramExplanations.push({
        kind: 'ingredientOnly', code: 'H319',
        basis: 'CLP mixture classification and Article 26(1)(c)',
        reason: 'H319 appears in an ingredient classification, but it was not assigned to the mixture. The mixture is classified with H314 and GHS05 instead. The mixture therefore never triggered GHS07 for H319: this is not an Article 26 omission. Check the mixture calculation trail for the eye-hazard result.'
      });
    }
    const art28 = selectArticle28(outcomes, m);
    const hasDanger = outcomes.some((o) => !o.omitOnLabel && o.signal === 'Danger'), hasWarn = outcomes.some((o) => !o.omitOnLabel && o.signal === 'Warning');
    const incomplete = hazards.filter((h) => h.status === 'incomplete');
    const nodata = hazards.filter((h) => h.status === 'nodata');
    const notes = [];
    if (ings.some((i) => i.carcRoute === 'inhalation'))
      notes.push('H350i in an ingredient does not automatically establish an inhalation-only hazard for the mixture; H350 is retained pending route-specific evidence.');
    notes.push('Article 26 pictogram precedence applied with per-hazard contributions and explanations; physical pictogram omissions are optional and off by default. Article 26(2) severity for manual entries requires review.');
    if (art26.pictogramReview.length) notes.push('Article 26 human review required for: ' + art26.pictogramReview.map((r) => r.codes.join(' / ')).join('; ') + '.');
    notes.push('Articles 26 and 27 label precedence are applied with audits. Article 28 P-statement selection is now implemented as a PARTIAL candidate catalogue: Annex I/IV selection coverage, supplier-specific wording, and final label approval remain outstanding.');
    if (art27.review.length) notes.push('Article 27 case-specific statement review required: ' + art27.review.map((x) => x.codes.join(' / ')).join('; ') + '.');
    if (art28.review.some((x) => x.severity === 'blocker'))
      notes.push('Article 28 P-statement selection is provisional and has blocking gaps (audience, disposal, wording, coverage, or six-statement prioritisation). Review the Article 28 audit.');
    else if (art28.review.length)
      notes.push('Article 28 P-statements require confirmation of uses, relevant conditional wording and omissions before release.');
    if (outcomes.some((o) => ['ED HH 1', 'ED HH 2', 'ED ENV 1', 'ED ENV 2', 'PBT', 'vPvB', 'PMT', 'vPvM'].includes(o.label)))
      notes.push('New hazard classes: mixtures placed on the market before 1 May 2026 need not be classified/labelled for these classes until 1 May 2028 (3.11.3.4, 4.2.3.4, 4.3.3.2, 4.4.3.2).');
    return {
      total, ingredientsUsed: ings.length, hazards, outcomes,
      label: {
        signal: hasDanger ? 'Danger' : hasWarn ? 'Warning' : null,
        ...art26,
        pictogramExplanations,
        ...art27,
        precautionaryStatements: art28.selected,
        article28: art28,
        supplemental: ctx.supplemental
      },
      sds: [...new Set(ctx.sds)], notes, warnings, incomplete: incomplete.map((h) => h.name), nodata: nodata.map((h) => h.name)
    };
  }

  /* plain-text report (also used as the Gemini review payload) */
  function report(mixture, result, opts) {
    opts = opts || {};
    const { m, ings } = normalise(mixture);
    const L = [];
    const anon = opts.anonymise;
    const label = (i, k) => (anon ? `Ingredient ${String.fromCharCode(65 + k)}` : nm(i));
    L.push(`CLP MIXTURE CLASSIFICATION – ${anon ? '(name withheld)' : (m.name || '(unnamed mixture)')}`);
    L.push('Rules: Regulation (EC) 1272/2008 Annex I, consolidated 01.07.2026, ingredient-based (additivity / summation / generic concentration limits).');
    L.push(`Physical state: ${m.state}. Flash point: ${m.flashPoint || 'n/a'} °C; IBP: ${m.ibp || 'n/a'} °C; viscosity@40 °C: ${m.viscosity40 || 'n/a'} mm²/s; pH: ${m.pH || 'n/a'}${m.pHReserveOk ? ' (reserve marked non-corrosive)' : ''}.`);
    L.push('', 'INGREDIENTS (% w/w or v/v) and assumed ingredient classifications:');
    ings.forEach((i, k) => {
      const c = [];
      ['oral', 'dermal'].forEach((r) => { if (i.acute[r].cat || i.acute[r].ate) c.push(`Acute ${r} ${i.acute[r].ate ? 'ATE ' + i.acute[r].ate : 'Cat ' + i.acute[r].cat}`); });
      if (i.acute.inh.cat || i.acute.inh.ate) c.push(`Acute inhalation (${i.acute.inh.form}) ${i.acute.inh.ate ? 'ATE ' + i.acute.inh.ate : 'Cat ' + i.acute.inh.cat}`);
      if (i.acute.unknown) c.push('acute data unavailable');
      if (i.skinCorr) c.push(i.skinCorr === '2' ? 'Skin Irrit. 2' : 'Skin Corr. ' + i.skinCorr);
      if (i.eye) c.push(i.eye === '1' ? 'Eye Dam. 1' : 'Eye Irrit. 2');
      if (i.nonAdditive) c.push('additivity not applicable');
      if (i.skinSens) c.push('Skin Sens. ' + i.skinSens); if (i.respSens) c.push('Resp. Sens. ' + i.respSens);
      if (i.muta) c.push('Muta. ' + i.muta);
      if (i.carc) c.push('Carc. ' + i.carc + (i.carcRoute === 'inhalation' ? ' (source H350i)' : ''));
      if (i.reproFert) c.push('Fertility ' + i.reproFert);
      if (i.reproDev) c.push('Development ' + i.reproDev);
      if (i.repro) c.push('Repr. ' + i.repro + ' (effect unspecified)');
      if (i.lact) c.push('Lact.');
      if (i.stotSE) c.push('STOT SE ' + i.stotSE + (i.stotSE === '3' ? ` (${[i.stotSEresp && 'resp.', i.stotSEnarc && 'narc.'].filter(Boolean).join('/') || 'effect n/s'})` : ''));
      if (i.stotRE) c.push('STOT RE ' + i.stotRE); if (i.asp) c.push('Asp. Tox. 1');
      if (i.aquaAcute) c.push('Aquatic Acute 1' + (i.mAcute ? ` (M=${i.mAcute})` : '')); if (i.aquaChronic) c.push('Aquatic Chronic ' + i.aquaChronic + (i.mChronic && i.aquaChronic === '1' ? ` (M=${i.mChronic})` : ''));
      if (i.aquaUnknown) c.push('aquatic data unavailable');
      if (i.edHH) c.push('ED HH ' + i.edHH); if (i.edEnv) c.push('ED ENV ' + i.edEnv);
      ['pbt', 'vpvb', 'pmt', 'vpvm', 'ozone'].forEach((f) => { if (i[f]) c.push({ pbt: 'PBT', vpvb: 'vPvB', pmt: 'PMT', vpvm: 'vPvM', ozone: 'Ozone 1' }[f]); });
      const scl = Object.entries(i.scl).filter(([, v]) => v !== '' && v !== null && v !== undefined).map(([k2, v]) => `SCL ${k2} ${v} %`);
      const differentiated = (i.hcodeDetails || []).filter((d) => d.suffix).map((d) => d.code);
      if (differentiated.length) c.push('source H differentiations: ' + differentiated.join(', '));
      L.push(`- ${label(i, k)}: ${fmt(i.pct)} % — ${c.concat(scl).join('; ') || 'not classified'}`);
    });
    L.push('', `RESULT – classification of the mixture:`);
    if (!result.outcomes.length) L.push('Not classified in any hazard class covered by the calculator.');
    result.outcomes.forEach((o) => L.push(`- ${o.label}${o.h.length ? ' — ' + o.h.join(', ') : ''}${o.omitOnLabel ? ' (may be omitted on the label)' : ''}`));
    L.push('', 'LABEL ELEMENTS (Article 26/27 applied; Article 28 P statements are provisional, NOT a final label): ',
      `Signal word: ${result.label.signal || 'none'}`,
      `Pictograms (Article 26 selected): ${result.label.pictograms.map((p) => p.code + ' (' + p.name + ')').join(', ') || 'none'}`,
      `Retained H statements: ${result.label.hazardStatements.map((x) => x.code).join(', ') || 'none'}`,
      `Retained EUH / supplemental: ${[...result.label.euhStatements.map((x) => x.code), ...result.label.supplemental].join(' | ') || 'none'}`);
    L.push('', 'ARTICLE 26 PICTOGRAM AUDIT:',
      'Physical pictogram optional omissions: ' + (result.label.omitOptionalPictograms ? 'enabled' : 'disabled (retained)'));
    (result.label.pictogramDecisions || []).forEach((d) => {
      L.push('- ' + d.code + ': ' + d.decision + '. ' + d.reason + ' [' + d.basis + ']');
      d.contributions.forEach((c) =>
        L.push('  - ' + c.from + ': ' + c.decision + ' — ' + c.reason + ' [' + c.basis + ']'));
    });
    (result.label.pictogramReview || []).forEach((r) =>
      L.push('- REVIEW ' + r.codes.join(' / ') + ': ' + r.reason + ' [' + r.basis + ']'));
    (result.label.pictogramExplanations || []).forEach((d) =>
      L.push('- H319 / GHS07 CLARIFICATION (' + d.kind + '): ' + d.reason + ' [' + d.basis + ']'));
    L.push('', 'ARTICLE 27 H/EUH STATEMENT AUDIT:',
      'Optional Annex III omissions: ' + (result.label.omitOptional ? 'enabled' : 'disabled (keep all triggered statements)'));
    (result.label.decisions || []).forEach((d) => {
      L.push('- ' + d.code + ': ' + d.decision +
        (d.overriddenBy ? ' (covered by ' + d.overriddenBy + ')' : '') +
        ' — ' + d.reason + ' [' + d.basis + ']');
    });
    (result.label.review || []).forEach((r) =>
      L.push('- REVIEW ' + r.codes.join(' / ') + ': ' + r.reason + ' [' + r.basis + ']'));
    L.push('', 'ARTICLE 28 PRECAUTIONARY-STATEMENT AUDIT (PROVISIONAL):',
      'Audience: ' + result.label.article28.audience,
      'Proposed P statements: ' + (result.label.precautionaryStatements.map((x)=>x.code).join(', ') || 'none'));
    result.label.article28.requiredObligations.forEach((o) =>
      L.push('- OBLIGATION '+o.id+' ('+o.status+'): '+o.description+' ['+o.basis+']'));
    result.label.article28.candidates.forEach((c) =>
      L.push('- '+c.code+' '+c.decision+': '+c.text+
        ' — '+c.decisionReason+' ['+c.basis+']' +
        (c.triggeredBy.length ? ' triggered by '+c.triggeredBy.join('; ') : '')));
    result.label.article28.review.forEach((r) =>
      L.push('- '+r.severity.toUpperCase()+' '+r.code+': '+r.reason));
    result.label.article28.warnings.forEach((w) => L.push('- INPUT: '+w));
    L.push('', 'CALCULATION TRAIL:');
    result.hazards.filter((h) => h.status !== 'na' && (h.status !== 'not' || h.steps.some((s) => !/No ingredient carries|No ingredient classified|No Aspiration|No skin-corrosive|No eye-damaging/.test(s)))).forEach((h) => {
      L.push(`[${h.name}] (${h.ref})`);
      h.steps.forEach((s) => L.push('  ' + (anon ? anonymiseText(s, ings) : s)));
      h.notes.forEach((s) => L.push('  note: ' + s));
    });
    if (result.sds.length) { L.push('', 'SDS-on-request triggers:'); result.sds.forEach((s) => L.push('- ' + s)); }
    if (result.warnings.length) { L.push('', 'Warnings:'); result.warnings.forEach((s) => L.push('- ' + s)); }
    L.push('', 'Not modelled: bridging principles, tested-mixture data, aquatic additivity formula for tested ingredients, specific concentration limits for skin/eye/acute, physical hazards other than flammable liquids, complete Article 28 Annex I/IV coverage and final P-statement approval, unvalidated manual Article 26(2) severity, and case-specific Article 27 label reviews.');
    return L.join('\n');
  }
  function anonymiseText(s, ings) {
    let t = s;
    ings.forEach((i, k) => { const n = nm(i); if (n && n !== '(unnamed ingredient)') t = t.split(n).join(`Ingredient ${String.fromCharCode(65 + k)}`); });
    return t;
  }

  return { classify, report, applyHCodes, parseHCodeTokens, selectArticle26, selectArticle27, selectArticle28, P28_RULES, ARTICLE27_RULES, blankIngredient, normalise, AT, HTEXT, PICTO, catFromATE, num, fmt };
});
