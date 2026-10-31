CLP MIXTURE CLASSIFICATION CALCULATOR
=====================================
Open clp_mixture_calculator.html in any modern browser; keep the pictograms/ folder alongside it. Works offline, no AI or installation required.
Gemini features are optional and only run when you click them, with your own API key.

WHAT IT DOES
Applies the ingredient-based mixture rules of Regulation (EC) 1272/2008 Annex I (consolidated 01.07.2026)
and shows every calculation step with the Annex I table/page reference:
- Acute toxicity: route-specific ATEmix, Table 3.1.2 category conversions, input ATE
  precedence and mismatch alerts, per-route unknown (>10 %) correction; oral/dermal
  values are mg/kg, gas ppmV and vapour/dust/mist mg/l
- Skin corrosion/irritation and serious eye damage/irritation: SCL-aware potency-weighted
  additivity (Tables 3.2.3, 3.3.3), SCL-aware non-additive routes (3.2.4, 3.3.4),
  pH <= 2 / >= 11.5 criterion; category- and evidence-specific review remains required
- Skin / respiratory sensitisation, CMR, lactation (generic limits or your SCLs), EUH208 elicitation
- STOT single / repeated, aspiration (with viscosity)
- Aquatic acute / chronic summation with independently entered Acute/Chronic 1 M-factors;
  missing/invalid M values trigger prominent provisional classification warnings
- New classes: ED HH/ENV, PBT, vPvB, PMT, vPvM, ozone
- Flammable liquid from flash point / initial boiling point
- Label summary: signal word, Article 26-selected pictograms with a per-hazard audit, Article 27-selected H/EUH statements with an omission audit, PARTIAL Article 28 P-statement candidates with a required/conditional audit, SDS-on-request triggers

VIEWER SETTINGS
Open the collapsible "Viewer Settings — show / hide results" panel in the right-hand
results viewer. Tick or untick:
- Full results sections: mixture classification, label elements, Article 26 pictograms,
  Article 27 H/EUH precedence, Article 28 P-statement decisions, SDS-on-request triggers,
  calculation trail, notes/limitations and the plain-text report panel.
- Individual label components: signal word, GHS pictograms, H-statements, EUH statements,
  supplemental information, P-statements and not-assessed notices.
Use "Hide Article explanations" for a compact results view, "Show all" to display
everything, or "Reset to defaults" to restore the original full display.
These preferences are saved in the browser's localStorage under
clp_calc_viewer_settings_v1, independent of the mixture and its JSON export.
This only changes visibility; it does NOT modify classifications, Article 26/27/28
selection calculations, the complete text report, or saved formulation data.
Top-level validation warnings and incomplete-input alerts ALWAYS remain visible,
even when every optional results section is hidden.
The Viewer Settings panel does not appear in printed results.

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
4. Read the full classification, Article 26-selected pictograms and their audit (retained/omitted and contributing classifications), the Article 27 H/EUH audit, and the Article 28 proposed P statements with legal obligation, candidate, redundancy and completeness checks. Optional Article 26 physical-pictogram omissions can be enabled in the Mixture panel; mandatory GHS07 precedence is always enforced. Save as JSON, print, or copy the report.
Click "Load example" for a worked degreaser.

OPTIONAL GEMINI (Gemini panel at the bottom left)
- Import ingredients from pasted SDS Section 3 text -> rows are appended; check every value.
- Second-opinion review of the calculation (anonymise option; "show exactly what will be sent").
The classification is always computed locally; Gemini never changes it.

NOT MODELLED (do these yourself)
Bridging principles; tested-mixture data (use "Manual classifications"); aquatic additivity
formula for tested ingredients; full SCL category and scientifically justified
skin/eye weight-of-evidence pathways; physical hazards other than flammable liquids;
Article 26(2) severity for unverified manual classifications, complete Annex I/IV P-statement coverage / final Article 28 selection and approved wording, and additional case-specific Article 27 redundancy decisions. Four explicit Annex III Article 27 omissions are implemented and tested.
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
  node verification/test_specific_values.js
  node verification/test_article26.js
  node verification/test_article28.js
  node verification/test_ui_structure.js
  node verification/test_viewer_settings.js
The original engine suite currently has 221 checks; the Article 26 suite has 49 checks and the initial Article 28 suite has 50 checks. UI structure checks verify that the HTML scripts compile,
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
Article 26 pictograms are applied separately with an audit. Article 28 partial P-statement selection now has its own audit; full Annex IV mapping, optional combined Annex III phrases, and
other case-specific redundancy decisions require a separate regulatory review.
Source: Regulation (EC) 1272/2008 Article 27 and Annex III Part 1, as amended by
Commission Delegated Regulation (EU) 2023/707 Annex III.

Regulatory rule details and references: docs/article_27_hazard_statement_precedence.md

ARTICLE 26 — PICTOGRAM DECISIONS
Previously all triggered pictograms were displayed; Article 26 was only mentioned in a note.
The calculator now determines selected pictograms from underlying classified-hazard contributions.
It preserves the full mixture classification and stores the originally triggered pictograms for audit.
Mandatory and conditional rules:
  26(1)(b) GHS06 present -> GHS07 must not appear.
  26(1)(c) GHS05 present -> suppress only GHS07 contributions from skin/eye irritation.
  26(1)(d) GHS08 required for respiratory sensitisation -> suppress only GHS07 contributions
           from skin sensitisation and skin/eye irritation.
  If GHS07 is still required for e.g. Acute Tox. 4, STOT SE 3 or ozone, it remains visible.
Optional physical rules, OFF by default:
  26(1)(a) GHS01 present -> GHS02 and GHS03 may be omitted; do not omit mandatory
           GHS02 in Self-reactive Type B or Organic Peroxide Type B cases.
  26(1)(e) GHS02 or GHS06 present -> GHS04 may be omitted.
The user can turn on optional physical omission in the Mixture panel. Manual physical hazard
entries are not validated by this tool; check the Type B exception and Article 26(2) most-severe
category requirements against actual physical test data before approving the final pictograms.
The Article 26 audit lists retained/omitted pictograms and the individual hazard contributions
with the legal basis for each decision. It explicitly identifies H319-derived GHS07 when it is
omitted because H314 requires GHS05 (Article 26(1)(c)). If H319 is only an INGREDIENT hazard and
the mixture itself is not classified H319, it explains that GHS07 was never triggered by the
mixture and therefore no pictogram omission occurred. If another hazard (e.g. Acute Tox. 4)
requires GHS07, the exclamation mark remains despite the omitted H319-specific contribution.
This pictogram decision must not be confused with Article 27 H-statement precedence.
Output: result.label.pictograms (selected), triggeredPictograms (original), omittedPictograms,
pictogramDecisions (including per-hazard contributions), pictogramReview (manual review cases),
omitOptionalPictograms (user preference). Article 27 label fields remain unchanged.
Source: Regulation (EC) No 1272/2008, Article 26(1)(a)-(e) and 26(2).
Detailed reference: docs/article_26_pictogram_precedence.md

ARTICLE 28 — P-STATEMENT CANDIDATES / MANDATORY OBLIGATIONS
The calculator now has a separate Articles 22/28 selector using a LIMITED initial catalogue
of 21 verified Annex IV P-statement codes. It includes consumer-only general precautions,
CMR/flammability/prevention/emergency response, and P501 disposal for mapped hazard classes.
The proposed label shows at most six ranked candidates, but any overflow is explicitly flagged:
do not treat the six suggestions as the legally correct final choice without review.
Legal distinction: Article 22 requires relevant P-statements selected according to Annex I/IV;
Article 28(2) generally requires a consumer disposal statement covering contents AND packaging,
unless not required by Article 22. This does NOT universally make an individual P-code mandatory.
Other P statements are flagged as eligible candidates, not inherently mandatory.
For general public products, the tool explicitly checks P501 eligibility and disposal destination.
If an eligible P501 code is missing, it blocks approval for review of other Annex IV disposal
codes/Article 22 exceptions. P501 and P280 supplier-specific wording must be completed.
Select consumer/professional/industrial supply, use, disposal route and PPE on the new
Article 28 form. Add/exclude P codes manually with a documented justification.
Unmapped hazards, unresolved supplier wording and case-specific selection are flagged.
The output is NEVER described as final/approved. Full Annex IV is still to be incorporated.
Regulatory reference: docs/article_28_precautionary_statement_selection.md

SCL / ATE / M-FACTOR RELIABILITY IMPROVEMENTS
Skin/eye ingredient Details now contain separate SCL fields for Skin Corr.,
Skin Irrit., Eye Dam. and Eye Irrit. Generic additivity is retained where
no SCL is assigned; when SCLs are entered the engine evaluates potency-weighted
sum-of-fractions against the applicable GCL/SCL. The non-additive pathway also
accepts supported individual SCLs; low SCLs can trigger classification or
jointly contribute to an additive result below the usual 1% screening level.
Do not assume a Skin Corr. SCL is automatically an Eye Dam. SCL; distinct
endpoint evidence is required and cross-endpoint use triggers review notes.
ATE handling now distinguishes oral, dermal and inhalation exposure forms,
validates numeric inputs and category mismatches, applies category-conversion
values where a usable ATE is absent, and uses a per-route unknown-fraction
correction. Old ingredient-wide unknown flags still import, but are applied
only where a particular route actually lacks known values; new per-route
unknown checkboxes are provided.
Aquatic Acute 1 and Chronic 1 now require explicitly recorded M-factors
(or a provisional warning). A missing/invalid M uses M=1 solely as a
conservative lower-bound screen, not as an established final result.
Entered factors must be safe positive integers; values outside the relevant
aquatic hazard category trigger a data review.
The Details panel also offers a source-reference field for ingredient-specific
ATE/SCL/M-factor evidence. The classification report records the value source,
omitting it in anonymised reports. Missing provenance prompts a review alert.
DATA VALIDATION, DATA GAP, DATA REVIEW and EVIDENCE REVIEW warnings appear
in the viewer independently of its optional visibility settings.
This feature improves reliability; it does not replace expert review of
specific substance evidence, experimental mixture data or complex CLP cases.
