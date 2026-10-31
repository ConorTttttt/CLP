CLP MIXTURE CLASSIFICATION CALCULATOR
=====================================
Open clp_mixture_calculator.html in any modern browser. One file, works offline, no AI, no install.
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
- Label summary: signal word, pictograms, H/EUH statements, SDS-on-request triggers

HOW TO USE
1. Enter mixture data (flash point, IBP, viscosity at 40 C, pH where known).
2. Add ingredients: name, %, and the ingredient's H/EUH codes (from Annex VI, the C&L Inventory or the SDS).
3. Use Details to set what codes cannot say: Skin Corr. 1A/1B/1C, Acute Tox. 1 vs 2, ATE values,
   M-factors, SCLs, "additivity not applicable" (acids, bases, surfactants...).
4. Read the classification, label elements and calculation trail. Save as JSON, print, or copy the report.
Click "Load example" for a worked degreaser.

OPTIONAL GEMINI (Gemini panel at the bottom left)
- Import ingredients from pasted SDS Section 3 text -> rows are appended; check every value.
- Second-opinion review of the calculation (anonymise option; "show exactly what will be sent").
The classification is always computed locally; Gemini never changes it.

NOT MODELLED (do these yourself)
Bridging principles; tested-mixture data (use "Manual classifications"); aquatic additivity formula for
tested ingredients; SCLs for skin/eye/acute toxicity; physical hazards other than flammable liquids;
label precedence (Art. 20/26/27/28) and P-statements (not in the supplied package).
H-codes only give default categories (H300 -> Cat 1, H314 -> Skin Corr. 1 etc.): set sub-categories yourself.

VERIFICATION
verification/test_engine.js (node test_engine.js): 126 checks of limits, boundaries, and the worked example.
The browser UI was tested headlessly (44 checks, Gemini mocked). Rules come from a text extraction of the
package, not a legal facsimile: check results against the official Regulation before relying on them.
