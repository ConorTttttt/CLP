# Ingredient classification relevance and cut-off drill-down

The indicator in each ingredient row now reads **Relevant to N mixture hazards**, where N is the number of calculated mixture hazard outcomes whose hazard class matches at least one classified ingredient endpoint. The badge is a button. Expanding it shows all recorded ingredient hazard endpoints, even when the mixture has no matching classification.

The drill-down reports **At/above cut-off**, **Below cut-off**, or **Review**. The displayed concentration is compared with the relevant threshold in the existing CLP calculation engine where that threshold can be stated safely. Some rows use a *classification threshold* (GCL/SCL) rather than a general relevance cut-off; the source text must be read. Inclusion at a threshold is not proof that an ingredient alone determines the mixture classification.

## Important limitations

- For acute toxicity, measured/derived ATE takes precedence over an entered category. The screen flags those cases for review rather than guessing the resulting category; consult the ATE calculation trail.
- Aquatic Acute/Chronic Category 1 relevance depends on `0.1% / M`. Missing or invalid M-factors are shown as **Review**; no unverified default is treated as final.
- Skin/eye additive rules can include positive amounts below 1% where the entered SCL is lower than 1%. Specific evidence may require consideration at lower levels in exceptional cases.
- Individual ingredients marked **Below cut-off** are excluded only from the *modelled pathway concerned*. This is **not** a legal finding that they are harmless, and **not** an exemption from Section 3 of the SDS.
- The indicator is **not** a quantitative apportionment or counterfactual removal calculation. Weighted aquatic contributions and route-specific acute toxicity contributions remain in the separate calculation trail.
- The mixture's physical hazards and manual/test-based classifications cannot generally be attributed to an ingredient using its H-code alone.

Relevant legal provisions: Regulation (EC) No 1272/2008, Annex I §§ 1.1, 3.1, 3.2, 3.3, 3.8, 3.9, 3.10, and 4.1, including Table 1.1. A separate REACH Annex II screening is available for SDS Section 3.

Tests: `node verification/test_ingredient_insights.js`; complete regression suite `npm test`.
