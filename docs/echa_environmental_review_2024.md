# ECHA environmental classification review — November 2024 guidance

This change is limited to safeguards supported by **ECHA, *Guidance on the Application of the CLP Criteria, Parts 4 and 5*, version 4.0 (November 2024)**. The legal CLP Regulation is the authentic reference; this guidance is not a substitute for confirming the currently applicable consolidated regulation and any harmonised entries.

## Changes implemented

1. **Aquatic M-factor validation:** Annex I Table 4.1.3 (guidance p. 42) specifies factors in factor-ten intervals. Values such as 2 and 5 are now rejected; only 1, 10, 100, 1000, etc., are used. Missing or invalid factors continue to yield a lower-bound M=1 *screen*, but a prominent result warning now states that the reported hazard category may be less stringent and must not be finalised without the correct M-factor. Reference: §§4.1.3.3.3 and 4.1.4.5 (pp. 42, 66–68).
2. **Check SCL values:** A typed SCL above 100% is invalid, and must not silently override the generic threshold (or the sensitiser elicitation threshold). Such invalid entries remain separately flagged for correction. Valid entered SCLs still take precedence.
3. **Environmental endocrine-disruptor combinations:** For two or more ED ENV ingredients, the result now explicitly flags possible combined effects for expert review. The deterministic classification still uses individual GCLs or valid SCLs; it does not automatically sum ED ENV concentrations. ECHA §4.2.3.1.1 (p. 118) permits additivity to be considered case by case, considering mechanisms and adverse outcomes.
4. **UI consistency:** The REACH SDS Section 3 screening and ingredient relevance cut-off views now use the same M-factor validation as the classification engine, avoiding misleading inclusion/exclusion badges for a non-decade M-factor.\n5. **Regression coverage:** ECHA Example A (pp. 72–73), aquatic M-factor validity, ED ENV concentration and SDS thresholds, and SCL behaviour. The regression suite also verifies that the browser's embedded engine matches the tested module.

## Important limits not silently filled in

- Aquatic classification is currently ingredient-based *summation*. The available-toxicity-data **additivity formulas**, tested-mixture and bridging routes (§§4.1.4.3–4.1.4.6, pp. 63–70) are not automatically implemented. Where these routes are needed, complete an expert assessment; absence of an automatic result is not a finding of no hazard.
- ED ENV evidence from test data on the mixture, additivity and bridging (§4.2.3, pp. 117–120) require expert consideration. The new warning is not a substitute.
- Substance-level aquatic classification, selecting valid ECx/NOEC/EC50 values, degradation and BCF/log Kow evidence, metals and UVCB special handling are outside the current ingredient-classification interface.
- New hazard classes and transition periods must be confirmed against the applicable CLP legal text and effective dates. This work does not certify regulatory compliance.

Run all repository verification suites with `npm test`. Changes are made to both `verification/engine.js` and the identical embedded engine in `clp_mixture_calculator.html`.
