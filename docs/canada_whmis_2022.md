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

## Next work

1. Implement whole-mixture/bridging and section 2.4–2.6 evidence precedence.
2. Implement HPR 8.1 inhalation, including form, units, four-hour LC50 conversion and water-activated toxicants.
3. Implement and test special chemistry under 8.2.11(3) and 8.3.11(3).
4. Implement sensitisation, CMR, STOT, aspiration and the remaining physical hazards.
5. Integrate Canadian Schedule 4, labels, bilingual content and SDS requirements after rule validation.

The extracted regulatory reference package was also created as a downloadable ZIP in this ChatGPT conversation. The raw XML and extracted section/table XML should be preserved as source material when implementing further rules.
