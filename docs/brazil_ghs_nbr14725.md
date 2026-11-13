# Brazil — ABNT NBR 14725:2023 (GHS Rev. 7) mixture classification pilot

**Status: limited, provisional decision-support module. It is not a complete Brazilian classification, label (rótulo) or FDS (Ficha com Dados de Segurança).** If this incomplete module reports no hazard, that is **not** evidence that the product is non-hazardous.

## Legal framework

| Instrument | Role | Notes |
| --- | --- | --- |
| **ABNT NBR 14725:2023** — *Produtos químicos — Informações sobre segurança, saúde e meio ambiente* | Classification, labelling and FDS standard | Published 2023-07-03. Replaces the four-part NBR 14725-1/-2/-3/-4 (2009–2019) with one document. Based on **UN GHS Rev. 7**. Mandatory from **2025-07-04**, after a two-year transition. |
| **NR-26** (Ministério do Trabalho e Emprego) — *Sinalização e identificação de segurança* | Makes the standard binding at work | Requires hazardous chemicals at work to be classified, labelled and supplied with an FDS in accordance with ABNT NBR 14725. |
| **UN GHS Rev. 7** (ST/SG/AC.10/30/Rev.7) | Technical criteria | All thresholds in this module come from the GHS Rev. 7 mixture criteria. |

Transport (ANTT), pesticides, ANVISA-regulated products (e.g. sanitisers, cosmetics, medicines) and other sector-specific regimes may add rules or replace these ones. This module does not decide scope.

### Source limitation (read first)

The NBR 14725:2023 text is a paid ABNT publication and **was not available** when this module was written. These facts are taken from secondary regulatory-news sources: publication date, effective date, the GHS Rev. 7 basis and the merger of parts 1–4. The implementation then follows GHS Rev. 7. Two points need checking against the NBR text before anyone relies on the results:

1. **Building blocks.** The former NBR 14725-2 is widely described as adopting *all* GHS building blocks, and this module assumes NBR 14725:2023 does too. It therefore includes Acute Tox. 5, Skin Irrit. 3, Eye Irrit. 2B, Asp. Tox. 2, Aquatic Acute 2/3, Aquatic Chronic 4 and Flam. Liq. 4.
2. **Generic cut-off options.** In several tables (3.4.5, 3.6.1, 3.7.1, 3.8.3, 3.9.4), GHS Rev. 7 gives two alternative cut-off values. The calculator lets the user choose between them (**lower** = most protective, the default; or **upper**) and always shows a review item.

Portuguese hazard-statement wording is **deliberately not included**. The module does not invent legal text. It outputs English GHS reference text with `ptBR: null`. The only Portuguese it outputs is the signal word (Perigo / Atenção).

## Implementation

- Browser page: `brazil_ghs_calculator.html`. It runs offline and loads only `verification/brazil_ghs_engine.js`, plus the existing `pictograms/*.svg`.
- Engine: `verification/brazil_ghs_engine.js`. It is a UMD module (`window.BRAZIL_GHS` / `require`) and reuses no EU CLP or Canadian WHMIS code.
- Tests: `verification/test_brazil_ghs.js` (engine, 32 cases) and `verification/test_brazil_ui.js` (page structure, 12 cases). `npm test` runs both.

### Implemented ingredient-based pathways

| Hazard | GHS Rev. 7 source | Rule |
| --- | --- | --- |
| Acute toxicity: oral and dermal (Cat 1–5) | 3.1.3.6, Tables 3.1.1/3.1.2 | ATEmix additivity over relevant ingredients (≥1 %). Category → converted point estimate. If unknown toxicity is >10 %, the corrected formula (3.1.3.6.2.3) is used. Unknown-toxicity label/FDS statement is flagged. |
| Acute toxicity: inhalation gas / vapour / dust-mist (Cat 1–4) | same | Each form is calculated separately. **Gas uses % v/v** and mass % is never substituted. The label keeps only the most severe inhalation statement. Inhalation Category 5 has no point estimate and is treated as unknown. |
| Skin corrosion/irritation (Cat 1/2/3) | Tables 3.2.3, 3.2.4 | Additive sums including optional Cat 3. Non-additive ingredients (acids, bases, surfactants…): Cat 1 ≥1 %, Cat 2/3 ≥3 %. Extreme pH (≤2 / ≥11.5) is flagged. |
| Serious eye damage/irritation (Cat 1/2A/2B) | Tables 3.3.3, 3.3.4 | Skin Cat 1 counts as Eye Cat 1. Result is 2B only when every contributing irritant is 2B. Non-additive route as for skin. |
| Respiratory / skin sensitisation | Table 3.4.5 | 1A ≥0.1 %. 1B ≥1.0 % (respiratory gas: 0.2 %). Unspecified Cat 1 uses the selected cut-off option. Below the limit but ≥0.1 %, an "FDS information expected" note is added. |
| Germ cell mutagenicity | Table 3.5.1 | Cat 1 ≥0.1 %; Cat 2 ≥1.0 % |
| Carcinogenicity | Table 3.6.1 | Cat 1 ≥0.1 %; Cat 2 ≥0.1 % (lower) or ≥1.0 % (upper) |
| Reproductive toxicity and lactation | Table 3.7.1 | Cat 1 ≥0.1/0.3 %; Cat 2 ≥0.1/3.0 %; lactation ≥0.1/0.3 % |
| STOT SE 1/2 and STOT RE 1/2 | Tables 3.8.3, 3.9.4 | Lower option: Cat 1 ≥1 % → Cat 1. Upper option: Cat 1 ≥10 % → Cat 1, Cat 1 from 1 % to <10 % → Cat 2. Cat 2 ≥1/10 %. |
| STOT SE 3 | 3.8.3.4.5 | Applies the 20 % guidance value separately to respiratory irritation (H335) and narcotic effects (H336). Expert judgement is flagged. |
| Aspiration (Cat 1/2) | 3.10.3.3 | Cat 1: ≥10 % Cat 1 ingredients and ≤20.5 mm²/s at 40 °C. Cat 2: ≥10 % and ≤14 mm²/s. Viscosity is required. |
| Aquatic acute 1–3 / chronic 1–4 | Tables 4.1.1, 4.1.2 | Summation method with M-factors. Cat 1 ingredients count from ≥0.1 %, others from ≥1 %. A missing or non-power-of-10 M-factor is flagged, and M = 1 is used provisionally. |
| Ozone layer | 4.2.3 | Cat 1 ingredient ≥0.1 % |
| Flammable liquids (Cat 1–4) | Table 2.6.1 | From the mixture's flash point and initial boiling point. Not applied to solids or gases. |

### Label elements

- Pictograms follow the precedence rules of **GHS 1.4.10.5.3.1** (a)–(c): GHS06 excludes GHS07; GHS05 excludes GHS07 for skin/eye irritation; GHS08 for respiratory sensitisation excludes GHS07 for skin sensitisation and skin/eye irritation. Every omission is recorded in `label.pictogramDecisions`.
- Signal word: *Danger* overrides *Warning* (1.4.10.5.3.2). Portuguese is shown as **Perigo / Atenção**.
- All assigned H-statements are listed. Possible redundancies (H314 + H318, H400 + H410) are flagged for review, not removed.
- Precautionary statements, supplier identification, emergency telephone, label layout and the 16-section FDS are **not generated**.

### Inputs

Ingredients take H-codes (`hcodes: "H302 H315"`), which set default categories. Explicit fields override them: `acute.{oral,dermal,inhalation}`, `skin`, `eye`, `nonAdditive`, `respSens`, `skinSens`, `state`, `mutagen`, `carcinogen`, `repro`, `lactation`, `stotSE`, `stotSE3Resp`, `stotSE3Narcotic`, `stotRE`, `aspiration`, `aquaticAcute`, `aquaticChronic`, `mAcute`, `mChronic` and `ozone`.

H-codes that cover several categories are flagged and default to the more severe one: H300/H310/H330 (Cat 1 or 2), H314 (1A/1B/1C), H340/H350/H360 (1A/1B). Physical H-codes on an ingredient are recorded as ingredient information only.

`mixture` takes `state`, `flashPoint`, `ibp`, `viscosity40`, `pH` and `cutoffOption` (`"lower"` | `"upper"`). Tested-mixture or bridging conclusions can be passed as `manual: [{key, label, category}]`. These are labelled, but flagged as unvalidated.

## Not assessed

Not assessed by this module:

- physical hazards other than flammable liquids
- whole-mixture test data and bridging principles
- specific concentration limits
- synergistic/antagonistic effects
- the aquatic additivity formula for tested ingredients
- acute inhalation Category 5
- Portuguese label wording and P-statements
- label layout
- the FDS
- product-scope decisions

## Next work

1. Verify building blocks and cut-off options against the purchased NBR 14725:2023 text, and record a SHA-256 and clause references as the Canadian module does.
2. Add the official Portuguese H- and P-statement wording from the NBR annex.
3. Add P-statement selection and FDS section mapping.
4. Add physical hazard classes beyond flammable liquids.
