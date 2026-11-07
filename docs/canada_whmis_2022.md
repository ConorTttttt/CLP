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

## Implementation

- Browser pilot: `canada_whmis_calculator.html`.
- Core engine: `verification/whmis_engine.js` — no EU CLP code reused.
- Skin/eye additive module: `verification/whmis_skin_eye.js`.
- Verification: `verification/test_whmis.js` and `verification/test_whmis_skin_eye.js`; `npm test` executes both and all EU CLP tests.

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

### Chemicals Under Pressure — reference crosswalk (not implemented)

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

**Implementation safeguard:** Do not classify a product when required pressure, mass percentages or heat-of-combustion evidence is missing; return **undetermined / needs review**. Also check all HPR hazard-class exclusions rather than assuming mutual exclusion with unrelated health hazards. The current pilot does **not** yet classify chemicals under pressure.

## Next work

1. Implement whole-mixture/bridging and section 2.4–2.6 evidence precedence.
2. Implement HPR 8.1 inhalation, including form, units, four-hour LC50 conversion and water-activated toxicants.
3. Implement and test special chemistry under 8.2.11(3) and 8.3.11(3).
4. Implement sensitisation, CMR, STOT, aspiration and the remaining physical hazards.
5. Integrate Canadian Schedule 4, labels, bilingual content and SDS requirements after rule validation.

The extracted regulatory reference package was also created as a downloadable ZIP in this ChatGPT conversation. The raw XML and extracted section/table XML should be preserved as source material when implementing further rules.
