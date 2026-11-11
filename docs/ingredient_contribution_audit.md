# Ingredient-level CLP classification audit (v1)

## Purpose
For every **calculated mixture classification**, the results view shows **every entered raw material** alongside the concentration, its relationship to that specific classification, the mathematical comparison or weighted term, and the precise CLP article/Annex I section/table. Each row links to the [CLP consolidated legal text](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02008R1272-20260701).

Statuses: **Included in calculation**, **Direct classification trigger**, **Below cut-off / limit**, **Evaluated, not triggered**, **Does not enter this equation**, **No matching hazard input**, **Requires review**, and **Not attributable to an ingredient**.

This is an **audit of the existing calculation pathways**, not an independent classification engine or a causal ingredient attribution model. It does not change `CLP.classify()`, the classification outcome, label selection, or the separately presented REACH SDS Section 3 screening.

## Interpretation
- **Cut-off (CLP Article 11, Annex I §1.1.2.2, Table 1.1)**: below the generic or properly adjusted applicability value, an ingredient may not be included in a *particular modelled calculation*. A lower SCL, available evidence, or hazard-specific exception can change this. A cut-off is not a GCL and is not an SDS exclusion.
- **GCL/SCL**: concentration at or above which an ingredient may independently trigger a classification (non-additive classes), or affect weighted/additive mixture thresholds. SCLs must be verified against appropriate substance evidence (including harmonised Annex VI entries).
- **ATE / aquatic / skin / eye / aspiration**: 'included' means a numerical contribution to the specified route or method; it does not mean an ingredient alone caused the final classification.
- **STOT SE 3**: the 20% concentration sum is a generic screening method, subject to the hazard-specific expert judgement provision. Category 1/2 use direct thresholds/bands.
- **Aquatic**: Acute 1 and Chronic 1 use 0.1/M cut-offs where a validated M-factor is entered. Chronic 1/2/3 calculations use category-dependent weights. Chronic 4 uses *unweighted* concentrations. Missing M-factors force a review state.
- **Physical and manual classifications**: not ingredient-attributable from H-codes; whole-mixture test/measurements and manual classifications remain separate.
- **No matching hazard input** is a statement about *entered information only*. It must not be interpreted as a finding of nonhazard.

## Scope and remaining work
1. Assess individual **substances** when raw materials are themselves mixtures; current rows use raw-material input and do not expand constituents.
2. Independently validate substance identity, harmonised classification, SCLs/M-factors, substance-specific evidence and the regulatory effective date. General cut-offs never displace stronger contrary evidence.
3. Encode provenance as structured engine-level reason records (rule ID, rule version, inputs, classification pathway, exclusion branch, calculation terms), rather than infer from the presentation layer, before treating this as a regulatory decision record.
4. Expand to **all assessed but unclassified hazard classes** as well as classified outcomes, and consider counterfactual recalculation separately; do not confuse with inclusion.
5. Add explicit audit treatment of mixture-level test data, bridging principles, exceptional hazards, and applicability of newly introduced CLP classes.

## Regression tests
Run `npm test`. `verification/test_ingredient_contribution_audit.js` tests specific numerical thresholds, route scoping, aquatic weighting, SCLs, direct classification, review states, and provenance references. The existing `verification/test_ingredient_insights.js` still checks the separate SDS disclosure screen.
