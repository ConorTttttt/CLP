# EU CLP — Annex I / Annex IV label-element prototype (phase 2)

**Status: source-backed but partial, experimental, NOT legally validated, and NOT suitable for producing approved labels.** This module runs independently of the pre-existing EU packaging rule engine and the separate GB CLP module. It is not yet integrated into a single full-assessment report.

## What it does

Given **manually entered, explicitly user-approved** hazard categories, this deterministic module:

- Retrieves the EU Annex I **pictogram, signal word, H code, English H text, and P-statement candidate codes** for each of **13 supported classification/category entries**.
- Applies a narrow set of documented label-element precedence and redundancy choices: Article 20(3), Article 26(1)(c), and Annex I Table 3.3.5 footnote (a).
- Evaluates a **partial, versioned Annex IV P-statement policy**: explicit applicability conditions for P233, P240–P243, P370+P378, P403+P235; required supplier-provided choices for PPE, washing, disposal, breathing hazards, emergency contacts, etc.
- Applies the P332+P313 / P333+P313 permitted redundancy and a **draft six-statement priority cap**. Statements omitted due to the internal priority policy remain review blockers, not approved omissions.
- Returns an individual trace for **every candidate**: source classification, section/table, source PDF page, eligibility, chosen/omitted/pending status, and missing facts.
- Fails closed on other hazard categories, conflicting classifications, unapproved inputs, and unknown use conditions.
- Never declares a complete CLP label or package compliant.

## Supported inputs

Current Annex I mappings: Flam. Liq. 1, 2, 3; Skin Corr. 1, 1A, 1B, 1C; Skin Irrit. 2; Eye Dam. 1; Eye Irrit. 2; Skin Sens. 1, 1A, 1B.

**All other categories, including the recent EU endocrine-disruptor, PBT/vPvB and PMT/vPvM categories, remain unsupported here and are blocked**. This is a coverage limitation, not an indication that those categories have no label obligations.

Example JSON:

```json
{
  "jurisdiction": "EU",
  "as_of": "2026-11-12",
  "product_id": "DEMO-IRRITATING-FLAMMABLE-LIQUID",
  "market_member_state": "IE",
  "classification": {
    "approved_by_user": true,
    "hazard_categories": ["Flam. Liq. 2", "Eye Irrit. 2"],
    "hazard_statements": ["H225", "H319"]
  },
  "packaging": {"general_public": true, "capacity_ml": 500},
  "use_context": {
    "volatile_explosive_atmosphere": true,
    "water_increases_fire_risk": false,
    "very_low_ignition_energy_lt_0_1_mJ": false
  },
  "supplier_wording": {
    "approved_by_user": true,
    "ppe": "protective gloves and eye protection",
    "disposal_route": "an approved hazardous waste collection point",
    "wash_after_handling": "hands",
    "extinguishing_media": "dry powder"
  }
}
```

`approved_by_user` confirms provenance, **not legal correctness**. The input should additionally include all other known classifications; omitting one may produce an incomplete or unsafe draft. Hazard-statements supplied in the classification are checked for consistency with supported mappings; they are **not silently corrected**.

## Running

From the repository root:

```sh
python labelling-packaging-assistant/eu/label_v2/selector.py \
  labelling-packaging-assistant/examples/eu_label_v2_product.json
python -m unittest discover \
  -s labelling-packaging-assistant/tests -p 'test_eu_label_v2.py' -v
```

## Primary sources and traceability

- **Your uploaded 1 July 2026 consolidation**: `CELEX_02008R1272-20260701_EN_TXT.pdf`; SHA-256 `602529287cbdbbb80f4bc17404fef58041ce5edf30646509b3cdb6991b7fc8a7`.
- Annex I Table 2.6.2 (PDF page 102): flammable liquids.
- Annex I Table 3.2.5 (PDF page 148): skin corrosion/irritation.
- Annex I Table 3.3.5 (PDF page 154): serious eye damage/irritation; the explicit overlap footnote.
- Annex I Table 3.4.7 (PDF page 163): skin sensitisation.
- Annex IV Part 1 (PDF pages 365–394): precautionary-statement selection, conditions, and optional omission rules.
- Annex IV Part 2 (PDF page 395 onward): exact multilingual P-statement text.
- Articles 17, 19–22, 26–28: label content, precedence and precautionary selection.

Official legal entry: https://eur-lex.europa.eu/eli/reg/2008/1272/2026-07-01

**Caution:** the consolidated PDF expressly says it is an informational tool with no legal effect. Cross-check every adopted rule with the corresponding authentic Official Journal acts. In particular, [Regulation (EU) 2025/2439](https://eur-lex.europa.eu/eli/reg/2025/2439/oj) amended the dates on which changes in Regulation (EU) 2024/2865 apply. This module does **not** yet decide transition or stock-placement applicability.

## Explicit limitations / remaining work

1. **Only 13 individual classification entries are mapped.** Complete all Annex I tables and newly introduced hazard classes for each legally effective date.
2. **P-statement priority is a provisional internal policy, not law.** More than six may be required by Article 28(3) for hazard severity, and any omitted statement requires competent review. Do not interpret an `OMITTED_BY_DRAFT_SIX_STATEMENT_POLICY` status as permission to omit the statement.
3. **Placeholder wording has not been legally approved**, even when the user supplies it. The source often requires very specific choices. E.g. for P280, P501 and P310, only suitable supplier-approved and legally validated wording may appear on a final label.
4. **Exact official translated H/P phrases, supplier identification, UFI, EUH, small-pack exceptions, label sizes, multilayer packaging, market-language rules, transport combinations and the full packaging rulebook are not integrated here.** English wording is illustrative only; Member-State language obligations still need independent implementation.
5. Only selected Article 26 precedence cases are encoded. In particular, the other pictogram rules under Article 26 require further implementation.
6. The input specification, category canonicalisation, and contradiction checks need to be broadened before production deployment.
7. Output has `label_ready_for_use: false` and `full_clp_compliance_verdict: NOT_ASSESSED` **unconditionally**.

## Suggested phase 3

1. Expand the Annex I hazard-to-label mapping to all relevant categories and new 2023/707 hazard classes, with effective-date guards.
2. Implement Annex IV conditions fully, with a regulator-approved ranked selection policy and human exceptions, plus official multilingual text.
3. Merge EU labels and existing EU packaging rule outputs under one report without mixing rulebooks or legal dates.
4. Create an independent GB mapping/selector backed by GB law; **do not copy EU amendment changes across**.
5. Add product-level golden tests from expert-reviewed labels, and a source-document review register.
