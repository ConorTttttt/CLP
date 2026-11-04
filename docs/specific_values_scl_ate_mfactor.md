# Substance-specific classification values: SCLs, ATEs and aquatic M-factors

**State:** implemented with unit, input, provenance and data-completeness checks. Output is still **provisional until the supplier substantiates substance-specific data and all applicable CLP criteria**. This implementation makes no claim to be a substitute for experimental whole-mixture data or expert judgement.

## Core regulatory distinctions

- **Specific concentration limits (SCLs)** under Regulation (EC) No 1272/2008 Article 10 apply to the *specified hazard class/differentiation* and supersede the relevant generic concentration limits where applicable. A skin-corrosion SCL does **not automatically establish an eye-damage SCL**. In applicable skin/eye additive cases, use potency-weighted fractions (component concentration ÷ applicable SCL/GCL), not a raw sum compared to one generic threshold. The calculator records which approach was used.
- **ATEs** are acute toxicity estimates, **not SCLs**. An entered ATE (measured/derived and substantiated) takes precedence over the Table 3.1.2 converted estimate for an acute category. An inconsistent entered acute category/ATE combination is highlighted. Oral and dermal ATEs are in mg/kg, vapours and dust/mists in mg/L, gases in ppmV.
- **Unknown acute toxicity** must be handled per exposure route where the information is available. For relevant ingredients lacking usable acute data, a corrected numerator **100 − unknown %** applies when the relevant unknown fraction is **>10%**; otherwise the standard 100 numerator applies. Route-specific unknown checkboxes are provided. The legacy ingredient-wide unknown checkbox is retained and applies to routes with no valid ATE or category; the same ingredient is not counted unknown where it has valid route-specific data.
- **Aquatic M-factors** apply to **Aquatic Acute 1** and **Aquatic Chronic 1** and can differ for acute/chronic hazard. The tool now flags **missing/invalid** M-factors rather than treating M=1 as an established default. It computes a *lower-bound screen only* where missing values require assumptions; a negative aquatic result must not be accepted as definitive in this situation. Positive lower-bound results remain flagged provisional.

## SCL implementation details

The ingredient editor contains **Skin Corr., Skin Irrit., Eye Dam., Eye Irrit.** SCL fields in **%**. Other supported non-additive hazard-class SCLs remain in their own ingredient SCL inputs.

For additive skin/eye calculations when at least one applicable SCL has been entered, the engine uses:

```text
Sum of (component % / applicable SCL or GCL) >= 1
```

Separate *corrosion* and *irritation* weighted sums are evaluated, including relevant subcategories, and the more severe triggered category is retained. When the full mixture uses no individual SCL, the historical Annex I generic Table 3.2.3 / Table 3.3.3 computation is unchanged.

For specified **non-additive** ingredients, the engine applies a validated SCL where present or the applicable non-additive generic criterion otherwise. Low-SCL ingredients below 1% remain eligible to participate in the weighted additive calculation even when individually below the SCL, because their weighted contributions may collectively trigger a result.

**Unresolved scientific/regulatory caveats:** Ingredient relevance and mode of action must be substantiated; pH/reserve data can override simple concentration-based predictions; not every combination of a corrosion SCL and irritation or eye-damage limit can be inferred automatically. The engine explicitly warns when Skin Corr. has an SCL but no separately established Eye Dam. limit and generic eye criteria are used. Verify classification with the applicable Annex I tables and ECHA guidance before final release.

## ATE validation and per-route handling

- Users can enter **a category or an ATE**. A validated positive numeric ATE takes precedence; otherwise a classified category yields an Annex I Table 3.1.2 converted estimate.
- Zero, negative, nonnumeric and nonfinite ATEs trigger prominent `DATA VALIDATION` messages. Where no other acute data are usable, the acute assessment becomes **incomplete**, not a confident negative result.
- When an entered category conflicts with the category implied by an ATE, an explicit `DATA REVIEW` warning describes the inconsistency and which estimate was used.
- Route-specific **unknown data** flags use the appropriate unknown percentage to apply (or not apply) the **>10%** corrected numerator. A known value for one route is not double-counted as unknown for that same route.
- **Limitation:** Route-to-route extrapolation, missing toxicological evidence, mixed exposure forms, source ATEmix for a mixture-in-mixture and tested-mixture bridging still require expert review. The legacy global flag and route-specific flags must be reconciled against actual evidence.

## M-factor validation and provisional logic

- Each Aquatic Acute 1 / Chronic 1 ingredient requires its corresponding **explicit M-factor**. The value must be a finite, safe, positive integer. Missing M-factors, invalid factors and factors supplied for an inapplicable aquatic category trigger `DATA GAP` / `DATA VALIDATION` / `INPUT REVIEW`.
- A missing/invalid M-factor is **never silently approved** as M=1. The calculation uses M=1 for *displayed lower-bound screening only*, flags the aquatic calculation **incomplete** when no positive class is triggered, and always displays a warning even if a hazard was triggered.
- Aquatic Acute 1 and Chronic 1 factors are **independent**, including when both categories apply to the same ingredient.
- **Limitation:** The aquatic component additivity formula for mixtures with tested aquatic toxicity data is not implemented; the ECHA decision process still requires reviewing available data.

## Provenance and quality warnings

A free-text **Source evidence for SCL / ATE / M-factor** field is saved on each ingredient. Enter the relevant Annex VI entry, supplier SDS version, test report or justified data reference. It is included in the plain-text classification report and withheld from the anonymised report. Specific values without a recorded source prompt an `EVIDENCE REVIEW` message. Warnings at the top of the results are visible even when optional Viewer Settings panels are hidden.

This change affects the local classification engine and ingredient editor; **Article 26/27/28 selection rules and current regulatory limitations are unchanged**. Do not treat a label as approved solely because it renders without input warnings.

## Verification

```bash
node verification/test_engine.js
node verification/test_specific_values.js
node verification/test_article26.js
node verification/test_article28.js
node verification/test_ui_structure.js
node verification/test_viewer_settings.js
```

At PR creation: 221 + 56 + 49 + 50 + 71 + 10 = **457 checks passed**, with the offline HTML's embedded engine identical to `verification/engine.js`. Tests are JavaScript functional and UI source checks; a real-browser end-to-end suite and an independent regulatory casebook remain outstanding.

## References

- [Consolidated CLP, Regulation (EC) 1272/2008](https://eur-lex.europa.eu/eli/reg/2008/1272/2026-07-01), Article 10, Annex I sections 1.1, 3.1.3.6, 3.2.3, 3.3.3, 4.1.3.5.
- [ECHA, Identify all available information](https://echa.europa.eu/support/mixture-classification/identify-available-information) — the SCL/GCL precedence, input evidence and acute/chronic aquatic M-factor distinction.
- [ECHA Guidance on the Application of CLP Criteria, Part 1](https://echa.europa.eu/documents/10162/2324906/clp_part1_en.pdf) — SCL/M-factor principles, additivity and source data.
- [CLP Annex I 3.1 acute toxicity, mixture calculations](https://reachlex.eu/en/clp/annex-i-part-3-health-hazards-1-3/).
- [CLP Annex I 3.2/3.3 skin and eye hazards](https://reachlex.eu/en/clp/annex-i-part-3-health-hazards-2-3/).
- [CLP Annex I 4.1 aquatic hazards](https://reachlex.eu/en/clp/annex-i-part-4-environmental-hazards-1/).

**Regulatory check required before use:** Confirm the current jurisdiction and consolidated text, and all SCLs/ATEs/M-factors from primary evidence. Historic formulations should be reviewed after importing the updated calculator because incomplete aquatic data can change what is reported as provisional.

## Banded STOT SCLs (November 2026)

Some Annex VI entries give two ranges for a Category 1 STOT substance, for example
`STOT RE 1; H372: C ≥ 20 %` and `STOT RE 2; H373: 5 % ≤ C < 20 %`. Enter the
Category 1 limit in the `STOT SE` / `STOT RE` SCL field and the lower bound of the
Category 2 range in `STOT SE Cat 2 band` / `STOT RE Cat 2 band` (`scl.stotSE2`,
`scl.stotRE2`). Without a band value the generic Table 3.8.3 / 3.9.4 lower limit of
1 % applies. A band value above the Category 1 limit is flagged for review.
The calculation trail identifies whether the applied Category 1 and Category 2
thresholds are entered SCLs or generic limits. A Category 2 band value entered
on a Category 2 STOT ingredient does not apply to that classification and is
explicitly flagged as ignored; use the ordinary Category 2 SCL field if a
verified substance-specific limit applies.
