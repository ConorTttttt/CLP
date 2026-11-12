# ECHA Part 3 health-hazard review: acute-toxicity corrections

**Reference:** European Chemicals Agency, *Guidance on the Application of the CLP Criteria*, Part 3: Health Hazards, Version 5.0 (November 2024). These are guidance examples; the applicable consolidated legal text of Regulation (EC) No 1272/2008 remains authoritative.

## Implemented corrections

### 1. One acute-inhalation decision when ingredient test data use different forms

**ECHA:** section 3.1.3.3.4, page 37; worked Example 13, pages 59–60.

Previously, the calculator calculated separate ATEmix values and emitted separate inhalation classifications for gas, vapour and dust/mist inputs. That approach is not the one described by ECHA for a mixture containing components tested in different forms.

When at least two valid ingredient form types are present, for **each category** calculate the dimensionless toxicity fraction:

```text
fraction(category) = Σ [(form-specific category upper ATE limit / ingredient ATE) × (ingredient concentration % / denominator)]
denominator = 100 unless relevant unknown acute inhalation toxicity exceeds 10 %,
              then 100 − unknown percentage.
```

Find the **most severe** category with combined fraction ≥ 1. The form-specific limits and units remain separate during computation, but their dimensionless fractions are added. Produce **one** inhalation hazard statement rather than duplicate H330/H331/H332 results by physical form. Unlike single-form calculation, no single numerical mixed-form ATEmix is reported, because it would have no meaningful unit.

The inhalation unknown-data flag is route-wide, not limited by the form selector on an ingredient with no data. For a single form, the existing ATE formula is retained.

### 2. Converted point-estimate boundary artefact

**ECHA:** section 3.1.3.3.3, page 38; CLP Annex I 3.1.3.3(c).

Category conversion values in CLP Table 3.1.2 can lie on the boundary of a more severe category. For example, **two components classified Acute Oral Category 2**, with only converted point estimates, would give a numerical ATEmix of 5 mg/kg and incorrectly trigger Category 1 if the classification used that numerical result without the CLP safeguard.

The engine now applies the same-category correction **only if all components of the mixture** (not merely all *relevant toxic contributors*) are in the same category and all were represented using converted ATE point estimates. It does **not** override a legitimately lower classification when the mixture is diluted by inert/non-acutely-toxic ingredients. The calculation trail records the numerical result and the legal classification correction.

### Regression coverage

The suite `verification/test_echa_part3_acute.js` includes:

- Gas + vapour contributions that trigger Category 4 only in combination
- ECHA Example 13 (nicotine mist 1.9 % and diacetyl vapour 6 %; **not classified**)
- Gas + dust/mist contributions jointly reaching Category 3
- Same-category category-conversion boundaries for oral and inhalation cases
- Mixed-form same-category safeguard
- Dilution counterexample to prevent an overly broad same-category override
- Unknown inhalation data above 10 % for single- and mixed-form mixtures

Run with `npm test` to include this suite automatically.

## Limits and remaining expert assessment

This is an **ingredient-based** model. Where reliable testing of the actual mixture or scientifically supported bridging principles is available, the stepwise CLP hierarchy must be used before ingredient calculations (ECHA section 3.1.3.1, page 35). Source harmonised ATE values take precedence over alternate measured estimates (ECHA section 3.1.2.2.1, page 29). The existing calculator relies on the user supplying the applicable source ATE values, categories and correct tested form.

Further areas for review include skin/eye reserve and weight-of-evidence, sensitisation potency and SCLs, reproductive/target-organ effects, and optional new hazard classes. These are **not** claimed to be fully verified by this change.
