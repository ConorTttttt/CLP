# Canada WHMIS 2022 — source-linked classification pilot

**Status: limited, provisional decision-support module — not a complete WHMIS classification, label or SDS.** A hazard not reported by an incomplete module is **not** evidence that the product is non-hazardous.

## Regulatory source and version

- Law: Hazardous Products Regulations (HPR), SOR/2015-17.
- Uploaded source: `Canada .xml` (English official-format XML), consolidation **2023-01-01**, last amended **2022-12-15**.
- SHA-256: `5d1388299f7e0bf93f373b02d811e873a652614a82df1cc3601c5c715d01c504`.
- Justice Canada still reported last amended **2022-12-15** when checked on **2026-11-07**.
- Regulatory data: `data/canada/hpr_2022_rule_manifest.json`; preserve original XML and extracted tables when evaluating rule changes.
- Online reference: https://laws-lois.justice.gc.ca/eng/regulations/SOR-2015-17/FullText.html
- General law: HPR 2(2)-(9), 2.2–2.6. Schedule 4 contains prescribed classifications.

## Hazardous Products Act — verified legal scope (uploaded 2026-11-07)

- Source: **Hazardous Products Act**, R.S.C. 1985, c. H-3. User upload `Hazardous products.xml` (English Canada Justice XML), SHA-256 `88c99885aa0869c611accb6265d834e744508e72d7562a2acb252eb045a96a6c`, 146055 bytes; XML compilation `current-date=2023-01-25`, last amended **2023-01-14**.
- Justice Canada website still reports last amended **2023-01-14** (official Schedule 1/2 cross-check on 2026-11-07; official page observed current to 2026-09-30).
- Machine-readable **HPA source map**: `data/canada/hpa_2023_source_map.json`; verified by `verification/test_whmis_hpa_manifest.js`.
- Official Act: https://laws-lois.justice.gc.ca/eng/acts/H-3/FullText.html

### Scope and classification architecture

The HPA **section 2** definition of “hazardous product” depends on classification under the HPR in a category/subcategory of a class listed in **Schedule 2**. **Section 15** authorizes category, classification and label/SDS regulations; these details belong in **SOR/2015-17**, not simply in the HPA master class list.

The uploaded Schedule 2 has **20 active physical** and **12 active health** classes. Physical class item **19 is repealed**, not a selectable classification. Canadian-specific physical classes include *combustible dusts*, *simple asphyxiants*, *physical hazards not otherwise classified* and *chemicals under pressure*. Canadian-specific health classes include *biohazardous infectious materials* and *health hazards not otherwise classified*. UN environmental classes are not included in HPA Schedule 2 and must not be added as Canadian WHMIS hazard classifications simply because they appear in GHS Rev.7/8.

**Section 12** excludes specified product types from **HPA Part II in respect of sale or importation**: radioactive nuclear substances, hazardous waste intended for disposal or sold for recycling/recovery, tobacco/tobacco products, manufactured articles, and the Schedule 1 products. **Schedule 1** has five entries: pest control products; explosives (within the *Explosives Act* definition); cosmetics/devices/drugs/food; consumer products (within the *Canada Consumer Product Safety Act* definition); and wood/wood products. Many entries rely on definitions in other Acts, which must be verified before an automated scope decision.

A scope exclusion is **not** evidence that a chemical is non-hazardous, and does not automatically determine provincial/territorial workplace, transport or other regulatory duties. The classification UI should ultimately distinguish **out of federal supplier scope**, **in federal supplier scope**, and **undetermined/requires review** from **hazard classified**, **not classified** and **hazard not assessed**.

HPA **sections 13–14** prescribe supplier label/SDS duties for covered sales/imports. **Section 14.2** prohibits false or misleading hazard information; **section 14.3** requires copies of labels/SDS and other supplier records, normally retained for six years after the end of the relevant year. Preserve classification evidence and version provenance for these workflows.

**Implementation:** a user-declaration-based federal supplier Part II scope screen is now available in `verification/whmis_extended.js`. Its status is separate from the mixture hazard result; it does not decide legal scope definitively or establish absence of hazards.

## CLP-matched raw-material hazard selection (2026-11-07)

**`canada_whmis_calculator.html` now follows the main CLP calculator's hazard-entry pattern** in each ingredient card, including when **Edit details** is collapsed.

- Type an H-code (e.g. `H314`, `H317`, `H350`), hazard classification name (e.g. *Skin corrosion*, *Respiratory sensitization*) or relevant phrase into **+ Add hazard classification**. Search results show the H-code (where prescribed), exact category, class and phrase. Use **All / Health / Physical** tabs to limit results. Keyboard: arrow keys, Enter and Escape.
- **H-codes are not necessarily unique category identifiers.** `H314` offers Skin Corr. 1, 1A, 1B and 1C separately; `H300` offers oral acute toxicity Categories 1 and 2. The selected exact category writes to the existing Canadian raw-material input field, **not** an EU CLP field. Selecting a different category within the same hazard class replaces it.
- Selected classes display in **removable chips**, with `×` to clear that classification. Click the chip label to edit the original category field. Detailed controls remain available for ATEs, ingredient physical state, gas volume percentages, SCL-like supporting evidence and additional Canadian input requirements.
- An acute hazard selection clears a contradictory evidence-backed **not acutely toxic** checkbox for that route. A measured/entered **ATE/LC₅₀ remains unchanged** and takes precedence over a category estimate when the applicable HPR method requires it; the UI flags the need to reconcile overlapping data.
- **Physical-class entries are raw-material declarations only.** They are recorded on the ingredient, shown as dashed chips and can be removed. They **do not automatically classify the finished mixture** under HPR Part 7; product-specific physical hazard calculations still require independent inputs and verified methods. The physical picker currently covers a limited set of common category/H-code combinations, plus Canadian-specific class declarations, and does not claim every HPR physical subcategory is complete.
- **Environmental GHS hazard classes are not adopted as WHMIS Schedule 2 classes** and therefore are not in the Canadian hazard picker. This does not preclude environmental hazard information being relevant to other regulations or SDS requirements.
- Canadian HHNOC can be selected as `HHNOC 1` without inventing a universal H-code.

The code is isolated in `verification/whmis_hazard_picker.js` and the picker catalog's category mapping is verified by `verification/test_whmis_hazard_picker.js`. It changes the **ingredient-entry experience only**; it does **not** implement additional hazard classes, change mixture calculation thresholds or modify EU CLP. Supplier evidence, national Schedule 4 prescribed classifications and scientific assessment remain the controlling inputs.

## Implementation

- Browser pilot: `canada_whmis_calculator.html`.
- Core engine: `verification/whmis_engine.js` — no EU CLP code reused.
- Health hazard extension HPR 8.4–8.10: `verification/whmis_health.js` (12/32 classes now partially covered in aggregate).
- Skin/eye additive module: `verification/whmis_skin_eye.js`.
- New HPA scope, HPR 8.1 inhalation and HPR 7.21 Chemicals Under Pressure pilot: `verification/whmis_extended.js`.
- The full list of 32 legally active classes and implementation status: `verification/whmis_hazard_catalog.js` (5 partially implemented; 27 unimplemented).
- Verification: `verification/test_whmis.js`, `verification/test_whmis_skin_eye.js`, `verification/test_whmis_extended.js`, `verification/test_whmis_hpa_manifest.js`, `verification/test_whmis_guidance.js`, `verification/test_whmis_ui.js`; `npm test` executes these and existing EU CLP suites.

## Health hazard expansion — HPR 8.4–8.10 (2026-11-07)

**Provisional ingredient-based screening implemented. Not a complete WHMIS classification.** The supplied HPR XML is the legal basis; Health Canada's WHMIS supplier guidance and GHS Revision 7 inform interpretation where adopted.

New module: `verification/whmis_health.js`; source-linked criteria: `data/canada/hpr_health_mix_rule_manifest.json`. New regression tests: `verification/test_whmis_health.js`.

| Hazard | Source | Automatic ingredient candidate | Critical exceptions |
| --- | --- | --- | --- |
| Respiratory sensitisation | HPR 8.4.5(a) | Category 1/1A at ≥0.1%; Category 1B solids/liquids at ≥1.0%, gases at ≥0.2% | Physical state and %v/v for gases required; whole mixture / bridging precede ingredient use |
| Skin sensitisation | HPR 8.4.5(b) | Category 1/1A at ≥0.1%, 1B at ≥1.0% | No 1B if 1A meets triggering threshold; whole mixture/bridging required |
| Germ cell mutagenicity | HPR 8.5.3–8.5.5 | 1A/1B ≥0.1%, Cat 2 ≥1.0% | Scientifically conclusive whole-mixture test evidence may override; restricted bridging |
| Carcinogenicity | HPR 8.6.3–8.6.5 | 1A/1B/2 ≥0.1% | Scientifically conclusive positive/negative whole-mixture studies and restricted bridging |
| Reproductive toxicity | HPR 8.7.3–8.7.6 | 1A/1B/2 ≥0.1%, plus separate effects on or via lactation at ≥0.1% | Lactation can coexist with Cat 1/2; conclusive data / restricted bridging |
| STOT — Single Exposure | HPR 8.8.5 | Cat 1/2 ingredient ≥1%; Cat 3 at ≥20%, or documented lower elicitation concentration, or ≥2 same-effect Cat 3 ingredients each ≥1% whose sum is ≥20% | Cat 3 summation cannot combine narcotic and respiratory effects. Cat 3 alongside Cat 1/2 requires **8.8.5(1)(c)** rather than only (1)(d) |
| STOT — Repeated Exposure | HPR 8.9.5 | Cat 1/2 ingredient ≥1% | No generic ingredient summation rule; mixture/bridging science pending |
| Aspiration hazard | HPR 8.10.5(a) | Category 1 if aspiration ingredients **each ≥1%** sum to **≥10%**, and homogeneous mixture viscosity is **≤20.5 mm²/s at 40°C** | Phase-separated layer rule HPR 8.10.5(b) not automated; requires layer-specific composition and viscosity |

### Input and result workflow

Each ingredient has new CMR, sensitisation, STOT and aspiration fields available using **Edit details**. For respiratory sensitisation, explicitly specify solid, liquid or gas; gas ingredients require their **volume %** rather than silently using mass %. A separate formulation panel records whether relevant whole-mixture or bridging evidence exists and the aspiration mixture's phase behaviour and measured bulk viscosity.

When the user indicates relevant mixture evidence, the new module **withholds ingredient candidates** for expert review rather than issuing a final conflicting classification. The individual ingredient thresholds remain in the audit trail. A negative automated result means only that the limited ingredient method did not establish the class.

The HPR **2(3)–(5) prescribed classifications in Schedule 4**, **2.4 synergy**, **2.5 lower concentration evidence**, **2.6 maximum concentration** and **2.9 biological availability** are not yet fully automated. In particular, HPR 2.5(1) can require classification **below the generic concentration limits** if there is evidence of actual hazard at the ingredient's concentration. These cases must be reviewed even if the new calculator reports no positive candidate.

**Regulatory evidence precedence is hazard-specific:** HPR 8.4, 8.8, 8.9 and 8.10 generally use whole-mixture data and bridging before ingredient calculations. HPR 8.5–8.7 instead contain ingredient-first criteria with specifically defined scientific mixture-study exceptions and restricted bridging. A single global flag is a conservative review hold, not a substitute for the detailed rules.

The complete HPA Schedule 2 list now identifies **12 partially implemented class families** and **20 not implemented**. All HPR 8.4–8.10 class results are provisional; none generates a legally compliant bilingual WHMIS label/SDS.

## New WHMIS 2022 classification work (2026-11-07)

### Canadian supplier applicability (HPA 2, 12, 13–15, Schedules 1–2)

The calculator now accepts **supplier action** (sell/import/internal use), **Canadian workplace intended use**, and a **reviewed exclusion declaration**. It returns one of several *supplier-scope screening* statuses. The results remain separate from the chemical hazard assessments. The user must verify product definitions in other federal Acts and provincial/territorial duties; no algorithm automatically decides legal exemption.

The browser catalogue lists 20 active HPA physical hazard classes plus 12 health classes and marks each **partial** or **not implemented**. The repealed physical item 19 is omitted.

### Acute inhalation toxicity (HPR 8.1.1–8.1.7)

New route-specific candidate classifications for gas, vapour and dust/mist:

| Form | Category 1 ≤ | Category 2 ≤ | Category 3 ≤ | Category 4 ≤ | Unit |
| --- | ---: | ---: | ---: | ---: | --- |
| Gases | 100 | 500 | 2500 | 20000 | ppmV |
| Vapours | 0.5 | 2 | 10 | 20 | mg/L |
| Dusts/mists | 0.05 | 0.5 | 1 | 5 | mg/L |

Values are four-hour LC₅₀ (or four-hour equivalents). Under HPR 8.1.1(4), one-hour gas/vapour LC₅₀ is divided by 2 and one-hour dust/mist LC₅₀ by 4. HPR 8.1.7 category-to-point estimates apply where an ingredient is category-only. Ingredient addition follows HPR 8.1.5/8.1.6 including the **>10% unknown** numerator adjustment; HPR 3(1)(e) unknown-toxicity supplemental wording remains **English review text only**, not a complete label/SDS.

**Concentration bases are distinct:** gas inhalation mixture ATE calculations require a separately entered **% v/v** for every gas component; vapour/dust/mist use ingredient **% w/w**. The calculator never reuses mass percentages as gas volume percentages.

When a user supplies whole-mixture LC₅₀, that provisional candidate is evaluated **before** bridging or ingredient additivity (HPR 8.1.3). A bridging category is only accepted if a supporting evidence reference is entered (HPR 8.1.4). The software does not itself validate study quality or test all applicable bridging conditions, so expert review remains required.

**Not implemented:** water-reactive toxic gas pathways (HPR 8.1.1(2), 3(1)(f)–(g)), inhalation point estimates requiring scientific extrapolation beyond established input methods, inhalation LC₅₀ above category 4 requiring application of the HPR 8.1.5 comparable-range rule, and complete label/SDS selection. The engine returns no negative hazard clearance when data are incomplete.

### Chemicals Under Pressure (HPR 7.21–7.21.1)

The evaluator requires a **liquid or solid**, gas pressurisation, a **non-aerosol receptacle**, confirmation the product is **not a gas under pressure** under HPR 7.5, and a **gauge pressure ≥200 kPa at 20°C**. Category 1/2/3 is assessed from user-entered **flammable component % by mass** and **specific heat of combustion (kJ/g)** according to the exact legal table.

Aerosol and gas-under-pressure exclusions suppress this hazard class; other independent health hazards remain assessable. Missing input yields **requires_data**, never an invented category. Provisional hazard codes H282/H283/H284 and signal words are shown as **reference previews**, not a legally complete bilingual supplier label.

**Tests:** `verification/test_whmis_extended.js` exercises the 200 kPa, 1%, 85%, 20 kJ/g boundaries and exclusion cases, inhalation 1-hour conversions, source HPR category points, whole-mixture/bridging precedence, HPA scope and missing-data safeguards.

### How to run this branch

```bash
git fetch origin
git switch feature/canada-whmis-2022-foundation
git pull --ff-only origin feature/canada-whmis-2022-foundation
npm test
python3 -m http.server 8081
```

Open `http://localhost:8081/canada_whmis_calculator.html`. Use **Load example** for an illustrative vapour inhalation calculation, then expand individual ingredients to enter inhalation LC₅₀ or category. To assess Chemicals Under Pressure, tick its evaluation checkbox and enter *all* relevant package conditions and physical-property evidence. Results remain provisional until legally and scientifically verified.

### Implemented ingredient-based provisional pathways

| Hazard | Governing provisions | Implemented | Not yet addressed |
| --- | --- | --- | --- |
| Oral acute toxicity | HPR 8.1.1–8.1.7 | Oral category thresholds, category ATE point estimates, 1% ingredient cut-off, 10% unknown-data adjustment | Whole-mixture data, bridging, scientific-estimate route |
| Dermal acute toxicity | HPR 8.1.1–8.1.7 | Same pattern with dermal-specific ATE table | Whole-mixture data, bridging |
| Skin corrosion/irritation | HPR 8.2.11(1)–(2) | Additive sums, weighted irritation threshold, specific 1A/1B/1C where legally allowed, sub-1% evidence flag | 8.2.9 tested mixture; 8.2.10 bridging; 8.2.11(3) special-ingredient route |
| Serious eye damage/irritation | HPR 8.3.11(1)–(2) | Severe and irritant additive sums, 2A/2B option, corrosion effects, sub-1% evidence flag | 8.3.9 tested mixture; 8.3.10 bridging; 8.3.11(3) special-ingredient route |
| HHNOC | HPR 8.12.4 | Ingredient HHNOC >=1% trigger | Whole-mixture evidence (8.12.3), expert judgement |

An ingredient flagged as requiring a special skin/eye mixture calculation **suppresses the additive candidate as a final hazard result** and triggers review. Additive totals remain in the calculation trail.

HPR 8.2.11 and 8.3.11 are not identical to EU CLP. Mixed corrosion subcategories produce general Skin Corrosion Category 1; mixtures comprising exclusively one subcategory may be classified specifically in that subcategory when criteria are met. The same concept applies to 2A/2B eye irritation.

For skin/eye, below-1% ingredients enter additive sums **only when there is evidence that the hazard occurs at the actual concentration**. The user must record this explicitly.

## Important limitations

- **The order of evidence is mandatory**: whole-mixture evidence, bridging (when indicated), then ingredient methods (HPR 2.2; each Part 8 subpart). The pilot does not yet accept full tested-mixture or bridging datasets and therefore does not produce a final legally defensible determination.
- Sections 2.4 (synergistic effects), 2.5 (evidence above/below generic concentration limits) and 2.6 (maximum concentration) require regulatory review.
- Special chemistry including acids, bases, inorganic salts, aldehydes, phenols and surfactants (HPR 8.2.11(3) / 8.3.11(3)) is **not calculated**. Checking 'special' only creates a review flag.
- Inhalation toxicity (including water-activated toxicants), other health classes, all physical classes, Schedule 4 prescribed classifications, product exemptions, bilingual labelling and SDS content are not calculated.
- Percentages in the pilot are mass-based. Do not use these pathways for gaseous volume concentration without implementation of HPR requirements.
- Unknown toxicity is not an ATE of zero or evidence of safety. Explicit 'no acute hazard' input requires scientific evidence. Missing data are flagged.
- Absence of an automated result must not be interpreted as a negative hazard assessment.

## Health Canada interpretation guidance (uploaded 2026-11-07)

Additional interpretive source: Health Canada, *Guidance on the WHMIS supplier requirements*, initially issued 2025-05-26, last modified **2026-03-31**. Uploaded HTML snapshot SHA-256: `82dea79000d521979c1126606e92c56efeadbc13225a0b708c33f7d78a1792b0`. Official page: https://www.canada.ca/en/health-canada/services/environmental-workplace-health/occupational-health-safety/workplace-hazardous-materials-information-system/supplier-hazard-communication-requirements-whmis/guidance.html

The guidance is explanatory. **If it differs from the Hazardous Products Act or Hazardous Products Regulations, the legislation prevails.**

### Confirmed guidance-dependent fixes in the pilot

1. **Acute ingredient below 1%:** HPR 8.1.2(2) normally includes ingredients at or above 1%. HPR 2.5(1), as explained in the guidance, requires considering a lower-concentration ingredient if it still presents acute toxicity at that concentration. The `relevantBelow1` flag for each exposure route now includes that ingredient in the corresponding ATE calculation and requires documented supporting evidence. An unmarked ingredient below 1% remains excluded under the normal rule.
2. **Unknown acute toxicity disclosures:** If a route is classified under Acute Toxicity Categories 1–4 and at least 1% of the mixture consists of relevant unknown acute-toxicity ingredients for that route, HPR 3(1)(e) and Schedule 1 paragraph 2(b) require a supplemental disclosure. The calculator now returns separate route-specific English text for **review**, not as a completed Canadian label/SDS. Official bilingual wording still needs verification and implementation.
3. **Critical distinction:** The formula's >10% unknown fraction adjustment (HPR 8.1.6) and the >=1% supplemental disclosure threshold are **different triggers**. Do not conflate them. Missing toxicity data are not treated as evidence of safety.
4. The guiding legal order still requires evaluation of whole-mixture data and applicable bridging principles before the ingredient calculation (HPR 2.2 and 8.1.2).

Automated checks: `verification/test_whmis_guidance.js`. Original HTML is preserved as a user-supplied regulatory research reference; the repository stores its source URL, modification date and SHA-256 rather than committing the full saved web page with unrelated scripts.

### Still subject to verification

The uploaded guidance explains the full HPR classification system, but this PR **does not** yet implement entire Parts 7 and 8. Unimplemented classes remain explicitly unassessed. Priority work includes complete mixture-evidence ordering, inhalation and water-activated toxicants, non-additive skin/eye rules, sensitisation, carcinogenicity, reproductive toxicity, STOT and aspiration, prescribed classifications, Canadian-specific physical hazard classes and compliant bilingual labelling.

## GHS source references for Canadian WHMIS (uploaded 2026-11-07)

- **GHS Revision 7 (2017)**: UN publication `ST/SG/AC.10/30/Rev.7`, source map: `data/canada/ghs_rev7_source_map.json`. Supporting technical foundation for most Canadian WHMIS building blocks, **not** legislation in itself.
- **GHS Revision 8 (2019)**: UN publication `ST/SG/AC.10/30/Rev.8`, 570 PDF pages. Uploaded `GHS8.pdf` SHA-256: `fea9464415289f17a3ca55b27fdea350bb078c25192523bc425cbc7039dd88a8`. Source map: `data/canada/ghs_rev8_source_map.json`.
- Canada adopted the Revision 8 **Chemicals Under Pressure** provisions; other Revision 8 changes are **not automatically Canadian requirements**. Authority: HPR **7.21–7.21.1**, and Health Canada's WHMIS supplier guidance.

### Chemicals Under Pressure — rule crosswalk and provisional implementation

The GHS source is section **2.3.2**, printed pages **61–63**, PDF pages **67–69**:

| Canadian legal requirement | Threshold or requirement | GHS source |
| --- | --- | --- |
| HPR 7.21: eligibility | Liquid/solid with pressurising gas at **>=200 kPa (gauge)** at 20°C in non-aerosol receptacle; not a gas under pressure | 2.3.2.1 |
| HPR 7.21.1(1): exclusion | Do not also classify a product already classified as an aerosol | 2.3.0; note to Table 2.3.3 |
| HPR 7.21.1(2): Category 1 | Flammable components >=85% by mass **and** heat of combustion >=20 kJ/g | Table 2.3.3 |
| HPR 7.21.1(2): Category 2 | Flammable components >1% by mass **and** heat <20 kJ/g; **OR** flammable components <85% **and** heat >=20 kJ/g | Table 2.3.3 |
| HPR 7.21.1(2): Category 3 | Flammable components <=1% by mass **and** heat <20 kJ/g | Table 2.3.3 |
| Calculation method | Heat of combustion is a mass-fraction-weighted sum; input measurements/estimates must be evaluated for validity | 2.3.3.1 |
| Canadian label text | Hazard codes H282/H283/H284; Category 3 wording is specifically prescribed by HPR 3(1)(c.2). Canadian bilingual requirements apply. | GHS Annex 1/3; HPR 3(1)(c.2) |

**Source anomalies worth preserving:** GHS 2.3.2.2.1 refers to Table 2.3.2 even though the actual criteria appear in **Table 2.3.3**. Its diagram 2.3.2 has a **>200 kPa** test, conflicting with the GHS's own **>=200 kPa** definition and HPR 7.21; **Canadian HPR >=200 kPa governs**. The GHS's typical 50% liquids/solids comment is non-binding explanatory guidance, not an extra criterion.

**Implementation safeguard:** Do not classify a product when required pressure, mass percentages or heat-of-combustion evidence is missing; return **undetermined / needs review**. Also check all HPR hazard-class exclusions rather than assuming mutual exclusion with unrelated health hazards. The current pilot **provisionally assesses** Chemicals Under Pressure on explicit user-entered packaging, pressure, flammable fraction and heat data (`verification/whmis_extended.js`). The calculator does not itself measure those parameters, calculate heat from an ingredient list, or generate fully compliant bilingual labels.

## Next work

1. Implement whole-mixture/bridging for oral/dermal, skin/eye and other health hazards and verify HPR 2.4–2.6 evidence precedence; the inhalation panel currently accepts limited whole-mixture LC₅₀ and bridging candidates only.
2. Complete HPR 8.1 inhalation beyond the implemented gas/vapour/dust-mist ATE, 1-hour to 4-hour conversion and limited tested-mixture/bridging routes, particularly water-contact release of toxic gases and further scientific evidence handling.
3. Implement and test special chemistry under 8.2.11(3) and 8.3.11(3).
4. Complete tested-mixture science and bridging under HPR 8.4–8.10, implement 2.5 lower-limit evidence and HPR 8.10.5(b) aspiration layers, then the remaining physical hazards.
5. Integrate Canadian Schedule 4, labels, bilingual content and SDS requirements after rule validation.

The extracted regulatory reference package was also created as a downloadable ZIP in this ChatGPT conversation. The raw XML and extracted section/table XML should be preserved as source material when implementing further rules.
