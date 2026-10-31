# CLP Article 26 — Hazard-pictogram precedence and decision audit

**Status:** Implemented in the classification calculator, with a separate trace of triggered pictograms, final selections, excluded pictograms, and the hazard classifications contributing to each decision.

**Scope:** EU CLP mixture labels, Regulation (EC) No 1272/2008, Article 26. This module selects pictograms **after** the mixture has been classified; it never changes a classification or an H/EUH statement.

## Finding from the original repository

Before this update, `result.label.pictograms` was simply a sorted collection of all pictograms triggered by the mixture outcomes. The engine included a note about Article 26 but did **not** apply any pictogram precedence. This caused cases such as GHS06 + GHS07 to display both.

## Verified rules

| Article | Condition | Outcome |
| --- | --- | --- |
| 26(1)(a) | GHS01 with GHS02 and/or GHS03 | GHS02/GHS03 **may** be omitted, except if more than one pictogram is compulsory (notably Self-reactive Type B and Organic Peroxide Type B). |
| 26(1)(b) | GHS06 and GHS07 | GHS07 **must not** appear. |
| 26(1)(c) | GHS05 and GHS07 triggered by skin/eye irritation | Omit the skin/eye irritation contribution to GHS07. GHS07 may still be needed for another hazard. |
| 26(1)(d) | GHS08 **for respiratory sensitisation** plus GHS07 for skin sensitisation or skin/eye irritation | Omit only these GHS07 contributions. GHS07 from other hazards can remain. |
| 26(1)(e) | GHS02 or GHS06 with GHS04 | GHS04 **may** be omitted. |
| 26(2) | More than one pictogram triggered for different categories of the same hazard class | The most severe hazard-category pictogram applies. The calculator's normal classified-hazard outputs generally consolidate categories; independently supplied manual classifications still require review. |

### Important safeguards

- **GHS05 does not automatically cancel GHS07** for Acute Tox. 4, STOT SE 3 or ozone.
- **GHS08 does not automatically cancel GHS07** unless GHS08 is required for *respiratory sensitisation*, and then only for the specified GHS07 triggers.
- **GHS06 cancels GHS07** irrespective of the triggering hazard.
- Multiple contributors to GHS07 are assessed **independently**. If any non-suppressed contributor remains, GHS07 remains visible.
- Any optional physical-hazard pictogram omission is **off by default** and can be enabled explicitly in the Mixture panel.
- The explicit Type B physical hazard exception is protected where the manual classification identifies Self-reactive Type B or Organic Peroxide Type B. Since the application does not independently classify most physical hazards, manual physical entries must be reviewed to exclude exceptions and confirm category severity.
- The result is a **draft label-element selection**, not a substitute for a complete CLP labelling assessment.

## H314/H319 explanation — important distinction

- **Both H314 and H319 assigned to the mixture:** H314 requires GHS05. If Eye Irrit. 2 (H319)
  separately triggers GHS07, its **GHS07 contribution is omitted** under Article 26(1)(c).
  The Article 26 panel calls this out with the exact H314 and H319 codes, and retains
  the underlying classifications. The text report also records the decision.
- **H319 appears only in an ingredient:** H319 does **not** necessarily become an H319
  classification of the mixture. If the mixture instead has Skin Corr. 1 (H314) and
  Eye Dam. 1 (H318), only GHS05 is triggered. The Article 26 panel explicitly states
  that **no GHS07 omission took place**, rather than inaccurately claiming it was
  removed by precedence. The mixture calculation trail shows the actual outcome.
- **Other GHS07 hazard remains:** If H314/H319 plus an unrelated hazard such as Acute
  Tox. 4 (H302) requires GHS07, the eye-irritation **contribution** is omitted but
  the GHS07 pictogram remains on the proposed label for the unrelated hazard.
- **Article 27 independence:** Whether H319 is displayed as a hazard **statement**
  is a distinct Article 27 question. Article 26 affects only the pictogram.

## UI behaviour

The main **Label elements** panel now shows only the selected Article 26 pictograms. An **Article 26 — pictogram decisions** panel follows it, providing:

- Every triggered pictogram and whether it was **Retained** or **Omitted**.
- The reason and legal basis for that decision.
- Each underlying hazard class contributing the pictogram, its independent precedence decision and reason.
- Review flags for physical-hazard exceptions and manual classifications.
- A checkbox in the Mixture panel to opt into optional physical pictogram omissions under Article 26(1)(a) and (e).

The H/EUH statement audit under **Article 27** is unchanged.

## Data model

| Output | Meaning |
| --- | --- |
| `result.label.pictograms` | Final **selected** pictograms for provisional labelling |
| `result.label.triggeredPictograms` | Every initially triggered pictogram, prior to Article 26 |
| `result.label.omittedPictograms` | Pictograms omitted after Article 26, with explanations |
| `result.label.pictogramDecisions` | One decision per pictogram and per triggering classification |
| `result.label.pictogramReview` | Cases requiring verification by the user |
| `result.label.omitOptionalPictograms` | Boolean: optional physical omissions enabled |
| `mix.article26Mode` | `retainOptional` (default) or `omitOptional` (saved in mixture JSON) |

## Worked examples

| Classification outcomes | Triggered | Selected under default | Explanation |
| --- | --- | --- | --- |
| Acute Tox. 3 + Skin Irrit. 2 | GHS06, GHS07 | GHS06 | GHS07 prohibited when GHS06 is used (26(1)(b)) |
| Skin Corr. 1 + Skin Irrit. 2 | GHS05, GHS07 | GHS05 | Irritation-related GHS07 suppressed by GHS05 (26(1)(c)) |
| Skin Corr. 1 + Acute Tox. 4 | GHS05, GHS07 | GHS05, GHS07 | GHS07 remains necessary for Acute Tox. 4 |
| Resp. Sens. 1 + Skin Sens. 1 | GHS08, GHS07 | GHS08 | GHS07 for skin sensitisation prohibited by 26(1)(d) |
| Carc. 1B + Skin Sens. 1 | GHS08, GHS07 | GHS08, GHS07 | GHS08 is not for respiratory sensitisation; 26(1)(d) does not apply |
| Resp. Sens. 1 + STOT SE 3 | GHS08, GHS07 | GHS08, GHS07 | GHS07 needed for the STOT SE 3 hazard |
| GHS01 + GHS02 (manual physical classes) | GHS01, GHS02 | GHS01, GHS02 | Optional omission **not enabled** by default |
| Self-reactive Type B (manual GHS01/GHS02 entries) | GHS01, GHS02 | GHS01, GHS02 | Both mandatory for Type B; do not suppress GHS02 |

## Verification

Run at the repository root:

```bash
node verification/test_engine.js
node verification/test_article26.js
node verification/test_ui_structure.js
```

The specific Article 26 suite also distinguishes H314/H319 mixture classification from ingredient-only H319 and confirms that the UI report provides the precise reason. It covers the rules, exceptions, mixed-hazard GHS07 triggers, default-versus-optional behaviour, preservation of classifications, generated audit and report. The UI suite verifies source integration and syntax. **The UI suite is not an interactive browser test.**

## Regulatory sources

- [Consolidated Regulation (EC) No 1272/2008, Article 26 (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A02008R1272-20250901)
- [ECHA Guidance on Labelling and Packaging (Section 4.3.3 — Precedence rules)](https://echa.europa.eu/guidance-documents/guidance-on-clp)
- [ECHA Guidance on the Application of CLP Criteria](https://echa.europa.eu/guidance-documents/guidance-on-clp)

**Regulatory review requirement:** Verify the actual mandatory pictograms for all manually entered physical-hazard classes and the applicability of Article 26(2) before approving any label.
