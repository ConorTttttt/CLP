# Automation-first, human-accountable CLP classification roadmap

## Status of current v0.2

- Deterministic mixture thresholds and numerical P/vP/B/vB/M/vM/one T criterion: implemented with tests; candidates only.
- Evidence-guided human reviews with sign-off and source note: implemented locally, no authentication.
- Local reviewed-substance library with exact valid CAS/EC match, conflict preservation and provenance checks: implemented.
- Whole-mixture ED and bridging route: checklist only, NOT automated classification.
- Official data lookups and full evidence extraction: NOT implemented.

## Priority 1 — Official substance identification and regulatory status

- Build a **versioned reference database** containing identifiers, substance compositions/variants, source provenance, exact source URLs, publication and application dates and jurisdiction.
- Ingest **legally binding EU harmonised classifications** from the current Annex VI as amended by all applicable ATPs, with an auditable map of hazard class/differentiation, entries and legally binding scope. Only assert harmonised values if verified from authoritative legal data.
- Add **ECHA CHEM C&L Inventory** retrieval only through an available, permitted, supported service/export pathway, observing rate limits/licensing. Distinguish ECHA harmonised from industry self-notifications. ECHA does not verify the accuracy of industry submissions; they are evidence leads, not confirmed truth.
- Add ECHA REACH dossier, SVHC Candidate List, and authoritative scientific opinions as *source evidence*, not as automatic CLP classifications without verifying the applicable classification criterion.
- Resolve ambiguous substances, UVCB/isomer grades, additives, impurities and relevant constituents via human identity check. Never use name-only synonym matching to auto-approve.
- For every source: store URL/document, retrieval date, legal status, version, substance identity scope, hazard class, source-of-truth rank and confidence. Cached data must expire or be refreshed.

## Priority 2 — Machine-readable evidence and numeric decision support

- Provide importers for supplier SDS (Sections 2, 3, 11, 12, 15), regulatory dossier exports and structured study data. Use extraction with quoted source snippets, unit validation, measurements, endpoints, test conditions, evidence provenance and uncertainty.
- Expand numerical CLP screens for alternative toxicity endpoints: CMR, STOT RE, ED Category 1 and environmental long-term ECx/NOEC. Check the precise applicability and semantics of each legal criterion.
- Build complete criteria-oriented review for Annex I 3.11 and 4.2 ED: adverse effects, endocrine mode of action, plausible biological linkage, evidence quality, consistency, human/environment relevance, Category 1 versus 2.
- Add PBT/PMT assessment of degradation media, test conditions, BCF, adsorption and pH behaviour, relevant metabolites, transformation products, uncertainties, and weight-of-evidence review. Numerical thresholds alone do not confer a classification.
- Propose an expert conclusion, with **explicit evidence trail and a reason for every criterion**. Unknown/contradictory results are escalated, not treated as negative.

## Priority 3 — Real-world mixture engine and regulatory release

- Link approved substance reviews to bill-of-materials/imported formulations and SDS versions. Model raw materials that are mixtures, not automatically one substance.
- Validate substance classifications within **their applicability dates**. Change detection / reclassification should identify affected mixtures and generate a review queue.
- Implement the full legal provisions for complete-mixture ED evidence and bridging principles with human confirmation where scientific interpretation is needed.
- Support unit-appropriate gas mixtures if feasible, including volume-percent ED vs weight-percent PBT/PMT.
- Add label / SDS / EUH / P-statement outputs and controlled export into the existing CLP classification system.
- Use a controlled database (PostgreSQL/SQLite) and authenticated users, reviewer permissions, protected revisions, signed approvals, change logs, approval revocation and user-facing explanation of every classification.

## Acceptance gates before production

1. Every automated decision has a rule identifier, legal source and a versioned test fixture.
2. No 'not classified' is inferred from an absent notification, absent test, unmatched CAS or unknown applicability.
3. Every signed-off substance group has evidence, identity scope, date, reviewer and an explicit classification/negative conclusion.
4. Historical assessments are reproducible under their recorded rule/data versions.
5. Official/legal classifications take precedence over potentially contradictory self-notifications where the Annex VI hazard differentiation is legally binding.
6. Whole-mixture evidence cannot silently negate ingredient-triggered classifications.
7. New legal amendments generate an impact report and fresh approval requirements.
8. A domain expert independently verifies the datasets, decision trees, source hierarchy, boundary tests, and sampled assessments before release.
