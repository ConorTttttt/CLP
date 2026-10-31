# Article 22 and Article 28 — precautionary statements (P-statements)

**Implementation status:** Partial, auditable candidate selector and legal-obligation checks. **NOT a complete Annex IV eligibility database and NOT a final approved label.**

## Regulatory distinction: what is mandatory?

Regulation (EC) 1272/2008:
- **Article 22(1)**: the label **shall** include relevant precautionary statements.
- **Article 22(2)-(4)**: statement selection comes from the label element tables in Annex I Parts 2-5, must use the criteria in **Annex IV Part 1**, account for hazards and intended uses, and use the official wording in **Annex IV Part 2**.
- **Article 28(1)**: precautionary statements that are clearly redundant or unnecessary for the product/packaging **shall** be omitted.
- **Article 28(2)**: where supplied to the **general public**, a disposal precautionary statement addressing the substance/mixture **and packaging** **shall** appear, **unless not required under Article 22**. In other situations disposal is not required when disposal clearly poses no health/environmental hazard.
- **Article 28(3)**: normally **not more than six** P-statements, but more **are allowed when necessary** to reflect the nature and severity of hazards.

**There is NOT a rule that every H-code has one universally mandatory individual P-code.** Annex IV identifies eligibility and conditions for statements, which need a product-specific selection. Some choices are only relevant for consumer products, e.g. P101/P102/P103, which are listed for consumer products **as appropriate**; these should not automatically be labelled "mandatory" for every consumer product.

For disposal, **P501** is an eligible Annex IV Table 6.5 code for the hazard classes listed there. The **legal obligation is to convey appropriate disposal precautions**, not to universally mandate the literal code P501 for every formulation. For ozone hazards and certain explosives Annex IV has different disposal/recovery codes (e.g., P502/P503). If P501 is not eligible for a consumer mixture, the partial engine **flags a blocker for manual review**, rather than inventing P501.

## Current implementation

The engine adds `selectArticle28(outcomes, mixture)` as a **separate layer after classification and Article 26/27 label decisions**. It works from the classified hazard outcomes, rather than incorrectly restricting candidate P statements to the H-codes surviving Article 27.

The Mixture form now has:
- **Audience**: Unknown (default), General public/consumer, Professional, Industrial.
- **Intended use**, **P501 disposal destination**, and **P280 protective equipment**.
- **Manual P-code additions**, **manual exclusions** and **a documented reason** for exclusions.

The draft proposed label includes up to six prioritised statements, and the **Article 28 — precautionary-statement decisions** panel shows:
- **Required legal obligations** (e.g. conditional consumer disposal).
- **Proposed P statements** with precise code, provisional wording, source hazard classes, Annex IV basis, and why selected.
- **All candidates** including nonselected, redundantly omitted, and manually excluded ones, with reasons.
- **Blocking gaps** for unknown consumer status, incomplete disposal wording, unmapped H statements, unreviewed words, and more than six candidates.
- **Supplier choices** (e.g. appropriate protective equipment, exposure form, poison-centre medical advice) marked as requiring review.

`result.label.article28` contains: `selected`, `candidates`, `requiredObligations`, `review`, `uncovered`, `warnings`, `audience`, `excessCandidateCount`, `readyForFinalLabel:false` and `scope`. `result.label.precautionaryStatements` exposes the current draft selection. All underlying mixture classifications and Articles 26/27 decisions remain unchanged.

### Scope of the first-pass candidate catalogue

`P28_RULES` contains a **curated sample of 21 P-codes**, including:
- General consumer precautions P101, P102, P103
- Prevention P210, P202, P260, P261, P273, P280
- Response P301+P330+P331, P305+P351+P338, P303+P361+P353, P302+P352, P333+P313, P337+P313, P301+P310, P301+P312, P331, P304+P340, P308+P313
- Disposal P501

**The catalogue is NOT an exhaustive list of all relevant or eligible statements**. There are many more codes, hazard categories and conditions in the full Annex IV tables 6.1-6.5 and Annex I. No P statement from the limited catalogue should be interpreted as legally sufficient without reviewing the complete tables. The primary next task is to expand the P-statement mapping from an authoritative regulation-derived data table (ideally a versioned complete Annex I/IV mapping), then implement conflict/priority logic and confirm selected official wordings.

### Redundancy and six-statement policy

Two explicitly documented Annex IV redundancies are supported:
- **P103** may be omitted where **P202** is used.
- **P261** may be omitted where **P260** is used.

The proposed list is capped at six for initial display. When more candidates qualify, the engine **does not claim** that the six priority-ranked suggestions are the right final choice; instead it issues an **Article 28(3) blocker** and preserves all alternatives. Additional statements may be needed for severity, and the label needs human review.

Manual exclusions require a documented reason. The conditional consumer disposal statement is **not automatically removed** even when the user requests its exclusion; the attempted exclusion is flagged.

### Wording completion is necessary

Annex IV Part 1 requires a supplier to choose bracketed/diagonal alternatives and fill **…** placeholders according to the conditions for use. For example:
- P501 requires a destination and whether the precautions concern contents and/or packaging.
- P280 requires the appropriate protective equipment type.
- Some medical response codes require an appropriate source of medical advice.
- P273 should be selected with reference to intended use (especially where release is the intended use).

The engine treats unresolved choices as review/blocking items and never marks the full output approved.

## Verification

Run from repository root:

```bash
node verification/test_engine.js
node verification/test_article26.js
node verification/test_article28.js
node verification/test_ui_structure.js
```

The Article 28 suite tests consumer disposal, applicability, unknown audience, wording placeholders, six-statement overflow, Annex IV redundancy, manual additions and exclusions, deduplication and report outputs. UI tests are **source checks**, not live-browser interaction tests.

## Primary legal references

- [CLP Regulation (EC) No 1272/2008 — Articles 22 and 28](https://eur-lex.europa.eu/eli/reg/2008/1272/oj/eng).
- [CLP Annex IV, Part 1 Tables 6.1–6.5 and Part 2 wording (consolidated reference)](https://reachlex.eu/en/clp/annex-iv-list-of-precautionary-statements/).
- [ECHA — Decide on classification and labelling](https://echa.europa.eu/en/support/mixture-classification/decide-on-classification-and-labelling).
- [ECHA — CLP Guidance on Labelling and Packaging, Chapter 7](https://echa.europa.eu/guidance-documents/guidance-on-clp).

**Before professional use:** Verify the current official EU consolidated version, all applicable Annex I and Annex IV conditions, the chosen language and exact wording, and the intended use, disposal and packaging information.
