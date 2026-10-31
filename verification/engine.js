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
      acute: { oral: { cat: '', ate: '' }, dermal: { cat: '', ate: '' }, inh: { form: 'vapour', cat: '', ate: '' }, unknown: false },
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
    const unknown = ings.filter((i) => i.acute.unknown && ge(i.pct, 1));
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
      ings.forEach((i) => {
        const r = getter(i); if (!r) return;
        const tested = num(r.ate); const cat0 = parseInt(r.cat, 10) || 0;
        if (!(tested > 0) && !cat0) return;
        let cat, ate, src;
        if (tested > 0) { ate = tested; cat = catFromATE(key, ate); src = 'tested/derived ATE'; }
        else { cat = cat0; ate = T.conv[cat - 1]; src = 'Table 3.1.2 conversion of Category ' + cat; }
        if (!cat) { skipped.push(`${nm(i)}: ATE ${fmt(ate)} is above the Category 4 range → not acutely toxic, ignored (3.1.3.6.1(b),(c)).`); return; }
        const cut = cat <= 3 ? 0.1 : 1;
        if (i.pct < cut - EPS) { skipped.push(`${nm(i)} (Cat. ${cat}) at ${fmt(i.pct)} % is below the Table 1.1 cut-off of ${cut} % → not taken into account.`); return; }
        rows.push({ i, ate, cat, src });
      });
      if (!rows.length) { if (skipped.length) { H.steps.push(`— ${T.label}: ` + skipped.join(' ')); } return; }
      const terms = rows.map((r) => r.i.pct / r.ate);
      const denom = sum(terms), numer = unkSum > 10 + EPS ? 100 - unkSum : 100;
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
    const sRel = ings.filter((i) => i.skinCorr && ge(i.pct, 1));
    ings.filter((i) => i.skinCorr && !ge(i.pct, 1)).forEach((i) => S.notes.push(`${nm(i)} (${i.skinCorr === '2' ? 'Skin Irrit. 2' : 'Skin Corr. ' + i.skinCorr}) at ${fmt(i.pct)} % is below the 1 % cut-off and is not counted. Corrosive ingredients < 1 % can still be relevant (3.2.3.3.1, 3.2.3.3.6) – consider testing.`));
    const sAdd = sRel.filter((i) => !i.nonAdditive), sNon = sRel.filter((i) => i.nonAdditive);
    const by = (list, c) => sum(list.filter((i) => i.skinCorr === c).map((i) => i.pct));
    const s1A = by(sAdd, '1A'), s1B = by(sAdd, '1B'), s1C = by(sAdd, '1C'), s1U = by(sAdd, '1'), s2 = by(sAdd, '2');
    const corr = s1A + s1B + s1C + s1U;
    let sCat = null, sWhy = [];
    if (sAdd.length) {
      S.steps.push(`Additive ingredients (≥ 1 %): ` + sAdd.map((i) => `${nm(i)} ${fmt(i.pct)} % [${i.skinCorr === '2' ? 'Cat. 2' : 'Cat. ' + i.skinCorr}]`).join('; '));
      S.steps.push(`Σ corrosive (1/1A/1B/1C) = ${fmt(corr)} % ; Σ irritant (Cat. 2) = ${fmt(s2)} % ; 10 × corrosive + irritant = ${fmt(10 * corr + s2)} %`);
      if (ge(corr, 5)) {
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
      if (corrI && ge(i.pct, 1)) { S.steps.push(`Non-additive ${nm(i)} (corrosive) ${fmt(i.pct)} % ≥ 1 % → Skin Corr. 1 (Table 3.2.4)`); sCat = '1'; }
      else if (!corrI && ge(i.pct, 3)) { S.steps.push(`Non-additive ${nm(i)} (irritant) ${fmt(i.pct)} % ≥ 3 % → Skin Irrit. 2 (Table 3.2.4)`); if (!sCat) sCat = '2'; }
      else S.steps.push(`Non-additive ${nm(i)} ${fmt(i.pct)} % is below the Table 3.2.4 limit (${corrI ? '1' : '3'} %).`);
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
    const eRelC = eRel.filter((i) => ge(i.pct, 1));
    const eCorr = (i) => (i.skinCorr && i.skinCorr !== '2') || i.eye === '1';
    eRel.filter((i) => !ge(i.pct, 1)).forEach((i) => E.notes.push(`${nm(i)} at ${fmt(i.pct)} % is below the 1 % cut-off and is not counted (3.3.3.3.1, 3.3.3.3.6).`));
    const eAdd = eRelC.filter((i) => !i.nonAdditive), eNon = eRelC.filter((i) => i.nonAdditive);
    const e1 = sum(eAdd.filter(eCorr).map((i) => i.pct)), e2 = sum(eAdd.filter((i) => !eCorr(i) && i.eye === '2').map((i) => i.pct));
    let eCat = null;
    if (eAdd.length) {
      E.steps.push('Additive ingredients (≥ 1 %): ' + eAdd.map((i) => `${nm(i)} ${fmt(i.pct)} % [${eCorr(i) ? 'skin corr./eye dam. 1' : 'eye irrit. 2'}]`).join('; ') + ' (an ingredient that is both skin-corrosive and Eye Dam. 1 is counted once, Table 3.3.3 note a)');
      E.steps.push(`Σ skin corrosive + Eye Dam. 1 = ${fmt(e1)} % ; Σ Eye Irrit. 2 = ${fmt(e2)} % ; 10 × Σ Cat. 1 + Σ Cat. 2 = ${fmt(10 * e1 + e2)} %`);
      if (ge(e1, 3)) { eCat = '1'; E.steps.push(`   Σ Cat. 1 ${fmt(e1)} % ≥ 3 % → Eye Dam. 1`); }
      else if (ge(e1, 1)) { eCat = '2'; E.steps.push(`   Σ Cat. 1 ${fmt(e1)} % is ≥ 1 % but < 3 % → Eye Irrit. 2`); }
      else if (ge(e2, 10)) { eCat = '2'; E.steps.push(`   Σ irritant ${fmt(e2)} % ≥ 10 % → Eye Irrit. 2`); }
      else if (ge(10 * e1 + e2, 10)) { eCat = '2'; E.steps.push(`   10 × Σ Cat. 1 + Σ Cat. 2 = ${fmt(10 * e1 + e2)} % ≥ 10 % → Eye Irrit. 2`); }
      else E.steps.push('   Below all Table 3.3.3 limits.');
      if (e1 > 0 || e2 > 0) E.notes.push('3.3.3.3.4.1: care is needed with acids, bases, inorganic salts, aldehydes, phenols and surfactants (many are damaging at < 1 %). Mark such ingredients "additivity not applicable" to use Table 3.3.4, or use pH.');
    }
    eNon.forEach((i) => {
      if (eCorr(i) && ge(i.pct, 1)) { E.steps.push(`Non-additive ${nm(i)} (corrosive/Eye Dam. 1) ${fmt(i.pct)} % ≥ 1 % → Eye Dam. 1 (Table 3.3.4)`); eCat = '1'; }
      else if (!eCorr(i) && ge(i.pct, 3)) { E.steps.push(`Non-additive ${nm(i)} (eye irritant) ${fmt(i.pct)} % ≥ 3 % → Eye Irrit. 2 (Table 3.3.4)`); if (!eCat) eCat = '2'; }
      else E.steps.push(`Non-additive ${nm(i)} ${fmt(i.pct)} % is below the Table 3.3.4 limit.`);
    });
    if (has(pH)) {
      if (phTrig && !reserveOk) { E.steps.push(`Mixture pH ${fmt(pH)} (≤ 2 or ≥ 11.5) → Eye Dam. 1 in the absence of other information (3.3.3.1.2).`); eCat = '1'; }
      else if (phTrig) E.steps.push(`Mixture pH ${fmt(pH)} extreme, reserve marked non-corrosive → pH criterion not applied (needs confirming data).`);
    }
    if (!eRel.length && !has(pH)) E.steps.push('No eye-damaging/irritant or skin-corrosive ingredient ≥ 1 % and no pH entered.');
    if (eCat === '1') { E.status = 'classified'; E.outcomes.push(out('Eye Dam. 1', ['H318'], 'Danger', ['GHS05'])); }
    else if (eCat === '2') { E.status = 'classified'; E.outcomes.push(out('Eye Irrit. 2', ['H319'], 'Warning', ['GHS07'])); }
    if (S.status === 'classified' && S.outcomes[0].label.startsWith('Skin Corr') && E.outcomes.length) {
      E.outcomes[0].omitOnLabel = true;
      E.notes.push('Table 3.3.5 footnote (a): where the mixture is classified Skin Corr. 1/1A/1B/1C, labelling for serious eye damage/eye irritation can be omitted because H314 already covers it. The label summary omits it.');
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
    const mA = (i) => { const m = num(i.mAcute); return has(m) && m >= 1 ? m : 1; };
    const mC = (i) => { const m = num(i.mChronic); return has(m) && m >= 1 ? m : 1; };
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
    H.notes.push('M-factors must come from Annex VI / the C&L Inventory (or be derived with Table 4.1.3). Blank M-factors are treated as 1. If toxicity data exist for ingredients, the additivity formula (4.1.3.5.2) may be used instead – not implemented here; the more conservative result applies (4.1.3.5.4).');
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

  /* ---------------- main ---------------- */
  function normalise(mix) {
    const m = Object.assign({ state: 'liquid' }, mix || {});
    const warnings = [];
    const ings = (m.ingredients || []).map((raw) => {
      const i = Object.assign(blankIngredient(), raw);
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
    const pict = {};
    outcomes.filter((o) => !o.omitOnLabel).forEach((o) => o.picto.forEach((p) => ((pict[p] = pict[p] || []).push(o.label))));
    const hs = [];
    const seen = new Set();
    outcomes.filter((o) => !o.omitOnLabel).forEach((o) => o.h.forEach((c) => { if (!seen.has(c)) { seen.add(c); hs.push({ code: c, text: HTEXT[c] || '', from: o.label }); } else { const e = hs.find((x) => x.code === c); if (e && !e.from.includes(o.label)) e.from += ', ' + o.label; } }));
    const hasDanger = outcomes.some((o) => !o.omitOnLabel && o.signal === 'Danger'), hasWarn = outcomes.some((o) => !o.omitOnLabel && o.signal === 'Warning');
    const incomplete = hazards.filter((h) => h.status === 'incomplete');
    const nodata = hazards.filter((h) => h.status === 'nodata');
    const notes = [];
    if (ings.some((i) => i.carcRoute === 'inhalation'))
      notes.push('H350i in an ingredient does not automatically establish an inhalation-only hazard for the mixture; H350 is retained pending route-specific evidence.');
    if (pict.GHS07 && (pict.GHS05 || pict.GHS06 || pict.GHS08))
      notes.push('Pictogram precedence (CLP Art. 26 – not in the supplied package): where GHS05, GHS06 or GHS08 apply, GHS07 may be omitted for certain classes (e.g. skin/eye irritation, acute toxicity Cat. 4). Check the Article before dropping GHS07.');
    notes.push('Signal word: "Danger" takes precedence over "Warning" (CLP Art. 20 – not in the supplied package). Hazard-statement precedence/duplication rules (Art. 27) and precautionary-statement selection (Art. 28) are not applied.');
    if (outcomes.some((o) => ['ED HH 1', 'ED HH 2', 'ED ENV 1', 'ED ENV 2', 'PBT', 'vPvB', 'PMT', 'vPvM'].includes(o.label)))
      notes.push('New hazard classes: mixtures placed on the market before 1 May 2026 need not be classified/labelled for these classes until 1 May 2028 (3.11.3.4, 4.2.3.4, 4.3.3.2, 4.4.3.2).');
    return {
      total, ingredientsUsed: ings.length, hazards, outcomes,
      label: {
        signal: hasDanger ? 'Danger' : hasWarn ? 'Warning' : null,
        pictograms: Object.keys(pict).sort().map((c) => ({ code: c, name: PICTO[c], from: pict[c] })),
        hazardStatements: hs.filter((x) => !/^EUH/.test(x.code)),
        euhStatements: [...hs.filter((x) => /^EUH/.test(x.code)), ...ctx.euh.map((e) => ({ code: e.code, text: e.text, from: e.why }))],
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
    L.push('', 'LABEL ELEMENTS (as triggered, before Art. 20/26/27/28 precedence): ',
      `Signal word: ${result.label.signal || 'none'}`,
      `Pictograms: ${result.label.pictograms.map((p) => p.code + ' (' + p.name + ')').join(', ') || 'none'}`,
      `Hazard statements: ${result.label.hazardStatements.map((x) => x.code).join(', ') || 'none'}`,
      `EUH / supplemental: ${[...result.label.euhStatements.map((x) => x.code), ...result.label.supplemental].join(' | ') || 'none'}`);
    L.push('', 'CALCULATION TRAIL:');
    result.hazards.filter((h) => h.status !== 'na' && (h.status !== 'not' || h.steps.some((s) => !/No ingredient carries|No ingredient classified|No Aspiration|No skin-corrosive|No eye-damaging/.test(s)))).forEach((h) => {
      L.push(`[${h.name}] (${h.ref})`);
      h.steps.forEach((s) => L.push('  ' + (anon ? anonymiseText(s, ings) : s)));
      h.notes.forEach((s) => L.push('  note: ' + s));
    });
    if (result.sds.length) { L.push('', 'SDS-on-request triggers:'); result.sds.forEach((s) => L.push('- ' + s)); }
    if (result.warnings.length) { L.push('', 'Warnings:'); result.warnings.forEach((s) => L.push('- ' + s)); }
    L.push('', 'Not modelled: bridging principles, tested-mixture data, aquatic additivity formula for tested ingredients, specific concentration limits for skin/eye/acute, physical hazards other than flammable liquids, Article 20/26/27/28 label precedence, P-statements.');
    return L.join('\n');
  }
  function anonymiseText(s, ings) {
    let t = s;
    ings.forEach((i, k) => { const n = nm(i); if (n && n !== '(unnamed ingredient)') t = t.split(n).join(`Ingredient ${String.fromCharCode(65 + k)}`); });
    return t;
  }

  return { classify, report, applyHCodes, parseHCodeTokens, blankIngredient, normalise, AT, HTEXT, PICTO, catFromATE, num, fmt };
});
