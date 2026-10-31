CLP MIXTURE CLASSIFICATION CALCULATOR
=====================================
Open clp_mixture_calculator.html in any modern browser; keep the pictograms/ folder alongside it. Works offline, no AI or installation required.
Gemini features are optional and only run when you click them, with your own API key.

WHAT IT DOES
Applies the ingredient-based mixture rules of Regulation (EC) 1272/2008 Annex I (consolidated 01.07.2026)
and shows every calculation step with the Annex I table/page reference:
- Acute toxicity: ATEmix, Table 3.1.2 conversion values, unknown-ingredient (>10 %) correction
- Skin corrosion/irritation and serious eye damage/irritation: additivity (Tables 3.2.3, 3.3.3),
  non-additive route (3.2.4, 3.3.4), pH <= 2 / >= 11.5 criterion
- Skin / respiratory sensitisation, CMR, lactation (generic limits or your SCLs), EUH208 elicitation
- STOT single / repeated, aspiration (with viscosity)
- Aquatic acute / chronic summation with M-factors
- New classes: ED HH/ENV, PBT, vPvB, PMT, vPvM, ozone
- Flammable liquid from flash point / initial boiling point
- Label summary: signal word, triggered pictograms, Article 27-selected H/EUH statements with an omission audit, SDS-on-request triggers

HOW TO USE
1. Enter mixture data (flash point, IBP, viscosity at 40 C, pH where known).
2. Add ingredients: name, %, and the ingredient's H/EUH codes (from Annex VI, the C&L Inventory or the SDS).
3. Use Details to set what codes cannot say: Skin Corr. 1A/1B/1C, Acute Tox. 1 vs 2, ATE values,
   M-factors, SCLs, "additivity not applicable" (acids, bases, surfactants...).
   For reproductive toxicity, choose a differentiated H-statement in "Quick-pick" (H360F/D/FD/Fd/Df
   or H361f/d/fd), or choose fertility and developmental categories independently.
   Both endpoints offer 1A (known), 1B (presumed), 2 (suspected) and none. The "effect unspecified"
   category is for genuine H360/H361 cases where the affected endpoint cannot be specified.
   An H360* code initially sets Category 1B; select 1A instead where substantiated by source data.
   Carcinogenicity has a separate source-route selector (H350i), but does not assign the
   inhalation-only statement to the mixture without substantiating route-specific evidence.
4. Read the full classification, selected H/EUH label elements, and the Article 27 statement audit (retained/omitted and reason). Pictograms are currently shown as triggered and require Article 26 review. Save as JSON, print, or copy the report.
Click "Load example" for a worked degreaser.

OPTIONAL GEMINI (Gemini panel at the bottom left)
- Import ingredients from pasted SDS Section 3 text -> rows are appended; check every value.
- Second-opinion review of the calculation (anonymise option; "show exactly what will be sent").
The classification is always computed locally; Gemini never changes it.

NOT MODELLED (do these yourself)
Bridging principles; tested-mixture data (use "Manual classifications"); aquatic additivity formula for
tested ingredients; SCLs for skin/eye/acute toxicity; physical hazards other than flammable liquids;
Article 26 pictogram precedence, Article 28 P-statement selection, and additional case-specific Article 27 redundancy decisions. Four explicit Annex III Article 27 omissions are implemented and tested.
H-codes only give default categories (H300 -> Cat 1, H314 -> Skin Corr. 1 etc.): set sub-categories yourself.
The parser preserves differentiated ingredient codes (H350i, H360F/D/FD/Fd/Df and H361f/d/fd)
in hcodeDetails and rejects ambiguous suffixes. Fertility and developmental endpoints are evaluated
separately against their relevant generic or specific concentration limits, producing the differentiated
H360/H361 statements where the effects are known and triggered. Undifferentiated H360/H361 remain
undifferentiated. The strongest category is retained independently for each effect.
The mixture uses H350 rather than H350i until an inhalation-only conclusion for the mixture is
supported by adequate evidence. Only the four explicit Annex III Article 27 H/EUH omission pairs are implemented; final label review remains necessary.
For older JSON, fertility/development are inferred from source H-codes where possible; check legacy
formulations after loading. Quick-pick changes only reproductive fields and leaves other manually
reviewed category fields intact.

VERIFICATION
Run from repository root:
  node verification/test_engine.js
  node verification/test_ui_structure.js
The engine suite currently has 221 checks. UI structure checks verify that the HTML scripts compile,
the new controls are present and the verification engine matches the inline engine. These are NOT
a replacement for live browser interaction tests. Earlier headless testing was reported during initial
development but no reproducible headless test script is currently included.
Rules are based on a working text extraction, not a legal facsimile: validate against the applicable
official consolidated regulation before relying on the result.

ARTICLE 27 — H/EUH LABEL-STATEMENT DECISIONS
The engine retains the COMPLETE mixture classification (result.outcomes) and maintains the full
triggered H/EUH list (result.label.triggeredHazardStatements and triggeredEuhStatements).
For the provisional label, the following optional Annex III Part 1 omissions are applied:
  H410 overrides H400   [Annex III Part 1(a)]
  H314 overrides H318   [Annex III Part 1(b)]
  EUH441 overrides EUH440 [Annex III Part 1(c), Regulation EU 2023/707]
  EUH451 overrides EUH450 [Annex III Part 1(d), Regulation EU 2023/707]
The decisions (retained/omitted, overriding code, reason, legal basis) appear under Article 27
in the browser and text report. Omitted statements remain discoverable under
result.label.omittedHazardStatements, omittedEuhStatements and decisions.
The Mixture panel has a checkbox for these optional omissions (checked by default). Untick it to
retain every triggered H/EUH statement on the proposed label. This preference is saved to JSON.
The system flags some additional potential redundancies for expert review without automatically
removing them (including EUH071/H335, H314/H319 and generic/differentiated H360).
Article 27 is not a blanket instruction to suppress every related or weaker H-code.
Article 26 pictograms, Article 28 P statements, optional combined Annex III phrases, and
other case-specific redundancy decisions require a separate regulatory review.
Source: Regulation (EC) 1272/2008 Article 27 and Annex III Part 1, as amended by
Commission Delegated Regulation (EU) 2023/707 Annex III.

Regulatory rule details and references: docs/article_27_hazard_statement_precedence.md
