# Canada WHMIS 2022 classifier — first implementation
This is a **limited, independent Canadian rules module**. Not a legally complete WHMIS classification or compliant label/SDS generator. Its negative results are not clearance of a product.

- Entry: `canada_whmis_calculator.html`
- Engine: `verification/whmis_engine.js` (standalone browser/Node UMD; no EU CLP dependency)
- Tests: `verification/test_whmis.js`, automatically picked up by `npm test`.
- Automated: acute oral/dermal ATE categories, mixture formula HPR 8.1.5 and unknown component adjustment HPR 8.1.6 (above 10%), category-to-point estimates HPR 8.1.7; HHNOC ingredient >=1% (HPR 8.12.4).
- All other hazard types explicitly listed as **not assessed**; no transfer of CLP classifications.
- Mixture data / bridging takes priority under HPR 2.2 and 8.1.2. Until these are coded the results always require regulatory review.
- ATE unavailable is not a value of zero, absence of toxicity or an automatic no-classification conclusion. User must explicitly record defensible evidence for non-acute ingredients.
- Input currently assumes percentage mass concentrations, with no gas/v/v treatment. Inhalation is not implemented.
- HHNOC whole-mixture test results under HPR 8.12.3 take precedence; review required.
- Canadian label elements, bilingual content, special product exemptions, physical hazard criteria and all other health classes remain out of scope.

Official regulation: https://laws-lois.justice.gc.ca/eng/regulations/SOR-2015-17/FullText.html
Health Canada supplier guidance: https://www.canada.ca/en/health-canada/services/environmental-workplace-health/occupational-health-safety/workplace-hazardous-materials-information-system/supplier-hazard-communication-requirements-whmis/guidance.html

**Regulatory data profile**: WHMIS 2022, GHS Rev 7 plus selected Rev 8; amended HPR came into force 2022-12-15, transition ended 2025-12-14. Regulatory evidence and criteria must be revalidated before production use.

Next priorities: general source-evidence / whole-mixture workflow, inhalation toxicity, skin/eye and sensitisation, CMR, STOT, aspiration, physical and additional Canadian classes, bilingual labels and SDSs, then shared-formulation jurisdiction comparison.
