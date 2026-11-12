# ECHA Part 3 follow-up: Skin/eye, sensitisation, STOT-SE

**Reference:** ECHA, *Guidance on the Application of the CLP Criteria*, Part 3: Health Hazards, Version 5.0, November 2024.

## Corrected numerical and evidence-state handling

### Extreme pH plus acid/alkaline reserve — ECHA pp. 78–80, 106–108

For a mixture with pH **≤2** or **≥11.5**, ECHA says to apply **Skin Corr. 1** and **Eye Dam. 1** in the absence of adequate contradictory data. Reserve suggesting reduced corrosivity is **not enough by itself** to dispense with these classifications; appropriate validated testing and total weight-of-evidence review must support a different conclusion.

The existing `mix.pHReserveOk` checkbox had previously **prevented** both classifications. The flag is retained for compatibility but now adds a **prominent evidence warning only**. Extreme-pH classifications remain in place and are described as provisional screening outcomes. The checkbox wording now explains that it is not an override.

**Important exception:** ECHA p. 79 and p. 107 allow classification by a substance's SCL rather than re-applying pH where the *only* corrosive/irritant ingredient is an **acid or base** with an applicable SCL. The current data model cannot prove that compositional condition, and acid/base reserve testing and validated-mixture study results are not encoded. A separate warning is emitted when an extreme-pH mixture includes a corrosive ingredient SCL. An expert should evaluate the exception rather than the calculator suppressing the conservative classification automatically.

### Sensitiser elicitation — ECHA Table 3.4.6, p. 142

The previous formula used **SCL / 10 for every positive SCL**, which erroneously raised or lowered the special labelling threshold for sensitisers having an SCL of **0.1% or more**. ECHA's note states that the one-tenth rule applies only where the sensitiser SCL is **below 0.1%**.

The engine now uses the following elicitation limits for EUH208 and corresponding supplemental/SDS rules:

- Normal Category 1 and 1B: **0.1%**
- Normal Category 1A: **0.01%**
- When an applicable SCL is **less than 0.1%**: **SCL / 10**

These are elicitation thresholds, not mixture-classification GCLs. They are checked separately for each skin/respiratory sensitiser.

### Unspecified STOT-SE Category 3 — ECHA pp. 239–241

ECHA requires **separate** additive assessment of respiratory tract irritation (H335) and narcotic effects (H336). Previously, an ingredient marked `stotSE = '3'` without specifying either effect counted toward **both** sums, potentially generating both hazard statements without supporting evidence.

Now the engine does **not** presume either effect when the effect is unspecified. It flags an incomplete evidence assessment for the unqualified ingredient and asks the user to specify the supported effect(s). Inputs with explicit H335/H336 effects continue to sum independently, as required by the guidance.

## Verification

`verification/test_echa_part3_health_followup.js` adds 12 targeted tests on extreme-pH handling, high and low sensitiser SCL elicitation limits, and STOT-SE effect specificity. The existing `test_engine.js` expected a reserve-only override; that test is changed to expect the proper corrosion/eye-damage outcome.

Run `npm test` (the repository's GitHub Actions workflow uses the same command).

## Limitations

This changes the **ingredient/pH screening engine**, not the complete CLP evidence hierarchy. Validated tested-mixture data, bridging principles, substance-level SCL exceptions, and full WoE cannot yet be automatically resolved. A scientifically supported result different from the conservative extreme-pH screen requires expert assessment outside the calculator. ECHA guidance is interpretive; the applicable CLP legal text is authoritative.