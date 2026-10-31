# CLP Article 27 — H/EUH label statement precedence

**Status:** Implemented for the four explicit optional Annex III Part 1 omission pairs; other case-specific redundancy reviews remain manual.  
**Project scope:** EU CLP mixture-classification calculator; this module operates on *labelling*, not classification.

## Regulatory principle

Regulation (EC) No 1272/2008, Article 27 requires relevant hazard statements resulting from classification on the label except when there is evident duplication or redundancy. Annex III Part 1 explicitly permits the following omissions:

| Retained statement | May omit | Annex III legal basis | Application |
| --- | --- | --- | --- |
| H410 | H400 | Part 1(a) | Aquatic Chronic 1 alongside Aquatic Acute 1 |
| H314 | H318 | Part 1(b) | Skin corrosion alongside serious eye damage |
| EUH441 | EUH440 | Part 1(c), inserted by Delegated Regulation (EU) 2023/707 | vPvB alongside PBT |
| EUH451 | EUH450 | Part 1(d), inserted by Delegated Regulation (EU) 2023/707 | vPvM alongside PMT |

These rules say **may be omitted**, not **must be omitted**. The calculator applies them by default, and the **Apply optional Article 27 Annex III H/EUH statement omissions** checkbox in the Mixture panel can be unticked to retain all triggered statements.

## Implementation

The classification engine calls `selectArticle27(hazardStatements, euhStatements, options)` after the mixture has been classified. It does not modify any `result.outcomes` or `result.hazards` objects.

| Output property on `result.label` | Meaning |
| --- | --- |
| `hazardStatements` / `euhStatements` | H/EUH statements retained for a provisional label |
| `triggeredHazardStatements` / `triggeredEuhStatements` | Complete pre-precedence lists |
| `omittedHazardStatements` / `omittedEuhStatements` | Omitted entries with their overriding statement, reason and regulatory basis |
| `decisions` | Every retained or omitted statement, including its source and justification |
| `review` | Cases for human redundancy review; no automatic suppression |
| `omitOptional` | Boolean reflecting whether optional omission is enabled |

`article27Mode: "keepAll"` in the saved mixture disables optional suppression. The default is `"apply"` and also applies to legacy saved JSON without this field.

## Cases not automatically simplified

- EUH071 together with H335: review whether the respiratory corrosion wording makes H335 redundant, as described in regulatory guidance.
- H314 together with H319: no explicit Annex III H319 omission is specified; the current code preserves H319 pending review.
- Generic H360 alongside differentiated H360F/D/FD/Fd/Df: assess whether effects overlap. Do not remove one without evidence.
- H400 alongside H411, H412 or H413: do not automatically omit or replace with a different severity category.
- Other evidently redundant or duplicative statements: consider Article 27 case by case; do not infer universal removal rules from similar wording.
- Combined hazard statements permitted in Annex III: a separate enhancement, not silently generated here.

## Important separation

**Classification** remains complete, even where a statement is omitted from the label. The displayed pictograms are still triggered outputs, not the final Article 26 selection. P-statements (Article 28), other final label components and packaging requirements are not implemented.

## Verification

Run at the repository root:

```bash
node verification/test_engine.js
node verification/test_ui_structure.js
```

The engine tests exercise each pair, absent overriding codes, audit reasons, opt-out, generated aquatic and skin/eye classifications, PBT/vPvB, PMT/vPvM, manual entries, and unsupported pair retention. UI checks validate script syntax, embedded engine consistency and the visible Article 27 audit. The UI checks are source checks, not browser automation.

## Source texts

- [Regulation (EC) No 1272/2008, Article 27](https://eur-lex.europa.eu/eli/reg/2008/1272/oj/eng)
- [Commission Delegated Regulation (EU) 2023/707 — Annex III amendments (c) and (d)](https://eur-lex.europa.eu/eli/reg_del/2023/707/oj/eng)
- [EU CLP consolidated texts and amendments — ECHA](https://echa.europa.eu/regulations/clp/legislation)
- [ECHA mixture classification and labelling support](https://echa.europa.eu/en-GB/web/guest/support/mixture-classification/decide-on-classification-and-labelling)

**Regulatory caution:** The current code is decision-support only; confirm the applicable consolidated amendment and version, and review the label in full before approval.
