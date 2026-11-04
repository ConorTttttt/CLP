# Ingredient contribution indicators and REACH SDS Section 3 screening

## Purpose

The calculator displays two different assessments:

1. **Mixture hazard relevance:** Does a raw material have a recorded hazard input for a calculated CLP hazard class? The interface labels these **potential contributor** or **no contributor identified**. This is not a numerical allocation of the final hazard and does not prove that any particular ingredient individually caused a threshold to be met. Refer to the classification engine's calculation trail for the assessment and cut-offs. Manual mixture classifications are not attributed to ingredients.
2. **SDS Section 3.2 screening:** Does the entered constituent-substance information indicate disclosure under REACH Annex II, §§3.2.1–3.2.4? The interface says **Disclose — indicated** or **Review** and lists each identified reason. This is provisional, not a finished Section 3 statement.

## Authoritative legal references

- REACH Regulation (EC) No 1907/2006 Annex II, as amended by Commission Regulation (EU) 2020/878: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0878
- §§3.2.1 and Table 1.1: classified mixtures; hazard-class cut-offs, GCLs, SCLs, M-adjusted aquatic cut-offs, and EU occupational exposure limits.
- §3.2.2: unclassified mixtures; typically 1% by weight (non-gas) / 0.2% by volume (gas) for health/environment hazards or EU OELs, with lower thresholds for sensitisation, reproductive hazards, specified CMR and other regulatory statuses.
- §§3.2.3–3.2.4: classification, registration number, identifiers, and applicable substance ATE, SCL, M-factor and nanoform information.

## Required reviews before an SDS decision

- **A raw material is not necessarily a substance.** If it is a premix, MIM or other multicomponent raw material, its constituent substance concentrations must be determined before Section 3 is decided.
- Confirm actual substance identity, CAS/EC/registration numbers and any supplier-approved alternative chemical name.
- Verify EU occupational exposure limits, Article 59 Candidate List status, REACH Annex XIII PBT/vPvB, and endocrine-disruptor criteria under EU 2017/2100 or EU 2018/605 using substance-level evidence; absent checkboxes are **unknown**, not evidence of absence.
- Check which concentration limits and M-factors apply and the applicable regulation date. Some substance-specific cut-offs and exceptions cannot be resolved from the present ingredient data.
- This implementation does not automatically determine nanoform disclosure, confidential names, classifications of all constituents of multicomponent raw materials, or every Section 3.2 obligation. **No trigger found** must never be taken as permission to omit a substance.
- The CLP hazard classification engine is unchanged. SDS screening is a separate, provisional presentation aid.

## Testing

`node verification/test_ingredient_insights.js` exercises 15 scenarios including sensitiser thresholds, skin SCLs, aquatic M-factors, EU OELs, Candidate List/PBT flags, classified versus unclassified mixtures, and relevance indicators. The normal `npm test` suite also includes these tests.
