# Phase 3 — Combined EU CLP label and packaging assessment

**Status: tested source-backed prototype, NOT independently legally validated and NOT suitable for regulatory sign-off.** The GB CLP system remains independent and is not modified by this phase.

## Why Phase 3 exists

Phase 1 covered 19 EU regulatory obligations and packaging triggers; Phase 2 derived draft label elements for 13 specified hazard-category entries and applied a provisional 27-entry precautionary statement policy. Those two stages previously used different product-input formats and produced separate reports.

**Phase 3 provides one EU-only input format and one deterministic assessment report.** It does not rewrite EU or GB legislation, classify chemicals, guess ingredient concentrations, certify packaging hardware, or automatically approve any label.

### Included source files

- `eu/assessment.py` — main deterministic coordinator and input adapter.
- `eu/input_schema.json` — machine-readable input contract (JSON Schema 2020-12; runtime also performs core validation).
- `examples/eu_phase3_product.json` — example approved classification and explicitly recorded product/packaging facts.
- `examples/eu_phase3_report.json` — generated illustrative report (stable output, **not a certificate**).
- `tests/test_eu_assessment.py` — integration, security-boundary, missing-fact and reproducibility tests.
- `eu/legal/requirements.json`, `eu/label_v2/annex_i_mapping.json`, and `eu/label_v2/annex_iv_policy.json` — previous independent rulebooks, unchanged.

### Quick start

From `labelling-packaging-assistant/`:

```bash
python eu/assessment.py examples/eu_phase3_product.json \
  --output examples/eu_phase3_report.json
python -m unittest discover -s tests -p 'test_*.py' -v
```

From the parent repository root:

```bash
python labelling-packaging-assistant/eu/assessment.py \
  labelling-packaging-assistant/examples/eu_phase3_product.json
```

Python 3.10+; no additional runtime dependencies.

## Input design

You supply the **already approved classification**, not a composition to calculate classification from. Required fields are:

| Field | Example | Why |
|---|---|---|
| `jurisdiction` | `EU` | GB and EU must never share rulebooks |
| `as_of` | `2026-11-12` | All rulebooks use the same assessment snapshot |
| `classification.approved_by_user` | `true` | Input classification provenance |
| `classification.hazard_categories` | `["Flam. Liq. 2", "Eye Irrit. 2"]` | Annex I label mapping and packaging triggers |
| `classification.hazard_statements` | `["H225", "H319"]` | Verify internal mapping consistency; not overridden |
| `packaging.packaged` | `true` | Currently restricted to packaged products |
| `packaging.general_public` | `true` | Determines which consumer packaging rules may apply |
| `ingredient_concentration_basis` | `percent_w_w` | Special ingredient-based packaging thresholds |
| `ingredients.67-56-1` | `3.0` | Methanol CRF threshold; other CAS numbers likewise explicit |
| `use_context` | object | Annex IV conditional P-statement selection facts |

Missing **optional** facts are not treated as zero/false. The rule-level status is `INSUFFICIENT_DATA` or the condition is left unresolved. The integrated report remains `NOT_ASSESSED` for whole-label/package compliance in every case, even when all provided facts are complete.

Any unsupported hazard category is a **blocking coverage gap**, but positive packaging findings grounded in other known facts are retained. The integrated report does not make *negative precedence claims* if the Annex I mapping is incomplete.

## Report structure

- `label_elements_draft`: candidate pictograms, signal word, H-statements, provisional selected P-statements and their legal trace.
- `precautionary_statement_decisions`: per-code selection, omission or missing-data decision and Annex IV reference.
- `packaging_summary`: positive child-resistant fastening and tactile-warning triggers, or `UNDETERMINED_*`.
- `packaging_and_other_legal_decisions`: all 19 decisions with the exact legal section, source PDF page and evaluated conditions.
- `blocking_items`: missing facts, unknown categories and provisional P-statement choices requiring human review.
- `version_control`: SHA-256 fingerprints for input, adapted input, both rulebooks and selection policy.
- `source`: consolidated-EU-CLP reference and explicit legal-effective-date warning.

## Snapshot restrictions and source validity

Source: user-provided Regulation (EC) No 1272/2008 consolidated text dated 1 July 2026; PDF SHA-256
`602529287cbdbbb80f4bc17404fef58041ce5edf30646509b3cdb6991b7fc8a7`.

Main references include Articles 17–22, 25–29, 35, Annex I hazard-label tables, Annex II child-resistant/tactile/supplemental conditions, Annex III H-statement text and Annex IV P-statements.

The consolidation is only a documentation tool and is **not the legally authentic act**. Changes introduced by EU Regulation 2024/2865 and subsequently deferred/amended by Regulation (EU) 2025/2439 must be reviewed provision by provision, along with application and transitional dates, before legal sign-off.

### Current explicit coverage limits

1. Only **13** Annex I hazard-category mappings are present. Other hazards, including endocrine disruptor and PBT/vPvB/PMT/vPvM classes, are unsupported and block comprehensive assessment.
2. The **27** Annex IV entries have supplier-wording and use-condition limitations; a six-statement ranking remains an internal draft subject to regulatory review, not a blanket lawful omission rule.
3. Legal input requirements and exceptions remain **partial** (19 independent rules); this does not establish a general exemption from child-resistant fastening or tactile warnings.
4. Member State language rules, UFI/PCN, multilingual official texts, transport label interactions, detailed pack/label geometry, exemptions and market-specific transitional arrangements are NOT covered.
5. No GB rules, GB-specific wording or GB amendments are imported or silently substituted.
6. Product/packaging declarations and supplier-selected precautionary text have **not** been independently verified.

## Recommended Phase 4

Expand the EU classification table **category by category**, including GHS06/GHS08 and environmental hazards, and pair every new Annex I mapping with vetted Annex IV conditions, official exact wording, effective-date applicability, and golden example tests. Then independently implement GB using its own authoritative legislation and amendments.

**Never rely on this report as evidence that a product or label complies with CLP.**
