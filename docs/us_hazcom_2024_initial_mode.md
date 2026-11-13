# US OSHA HazCom 2024 — initial classification mode

**Status:** Partial screening implementation: flammable liquids and all Appendix A health classes (A.1–A.10) from ingredient data, using the HazCom 2024 text of 29 CFR 1910.1200 Appendix A (verified 2026-11-13, see the verification record). NOT a completed OSHA HazCom classification/label/SDS engine.

## Authoritative legal sources

- 29 CFR 1910.1200 (Hazard Communication Standard): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200
- Appendix A (health): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200AppA
- Appendix B (physical): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200AppB
- Appendix C (allocation of label elements): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200AppC
- Appendix D (SDS): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200AppD
- OSHA 2024 final rule and corrections: https://www.osha.gov/hazcom/HCS-Final-RegText
- January 15, 2026 compliance-date extension, Federal Register document 2026-00653: https://www.federalregister.gov/documents/2026/01/15/2026-00653/hazard-communication-standard

## Regulatory version and transition

OSHA HazCom 2024 is primarily aligned with UN GHS Revision 7, **not** directly interchangeable with EU CLP. The January 2026 rule extended compliance dates by four months:
- Substance manufacturers/importers/distributors: 19 May 2026
- Employers updating substance labels/programs/training: 20 November 2026
- Mixture manufacturers/importers/distributors: 19 November 2027
- Employers updating mixture labels/programs/training: 19 May 2028

HazCom 2012 and HazCom 2024 can be used during the applicable transition. This tool screens **HazCom 2024 only**; it does not implement a HazCom 2012 mode.

## Architecture

- Separate pure rules module: `verification/hazcom2024.js`, **not** a filter over EU CLP results. It reads the shared ingredient fields only.
- Selected with **Jurisdiction (market) → US OSHA HazCom 2024** in *1. Mixture information* (saved with the formulation, alongside EU CLP and GB CLP).
- The single-file calculator embeds a copy of the engine between `BEGIN/END EMBEDDED` markers. Edit `verification/hazcom2024.js`, then run `npm run sync:engines` (tests fail if the copy is stale). Then run `npm run build:mobile`.
- EU Article 26–28 viewer settings and the EU ingredient-contribution markers are hidden in US mode: they are EU/GB CLP calculations.
- **No automatic conversion of EU-specific SCLs or EUH statements to OSHA classifications.** If EU SCLs are entered, the US result says they were not applied.
- Ingredients recorded as EU *Eye Irrit. 2* are treated as Category **2A**; mark an ingredient `eye: "2B"` only where its source says so.

## Implemented screening rules

### Flammable liquids

Appendix B.6 Table B.6.1, based on **mixture** flash point and initial boiling point:
- Category 1: FP < 23°C, IBP <=35°C
- Category 2: FP < 23°C, IBP >35°C
- Category 3: 23°C <= FP <= 60°C
- Category 4: 60°C < FP <= 93°C

Appendix C.4.19: Category 4 uses the hazard statement **Combustible liquid**, Warning signal word and **no pictogram**. The alphanumeric H227 reference is for comparison only; verify the mandatory OSHA label text. If FP <23°C and IBP is missing, the category remains unassessed rather than guessed. Other physical hazard classes are NOT assessed.

### Acute toxicity (oral, dermal, inhalation by gas/vapour/dust-mist)

Appendix A.1 Tables A.1.1 and A.1.2, with route-specific category limits and point estimates. Results record each ingredient term, corrected/uncorrected numerator, calculated ATE and resulting provisional category.
- Unknown acute toxicity on a route at >=1% is flagged; unknown concentration >10% adjusts the ATE formula numerator per A.1.3.6.2.4.
- Known ingredient contributions below 1% are included conservatively, flagged for review under A.1.3.3(a).
- Table A.1.3.3(c) special all-same-category rule is only applied where the full mixture is represented by converted-category ingredients. If mixture contains other components/diluents, the dilution formula is not overridden.
- When source data are missing, a route is **not assessed**, not designated non-hazardous.
- Inhalation physical forms and units are kept separate. Expert evaluation of vapour/mist distinctions and other route evidence is still needed.
- This screen does not replace tested-mixture data, bridging principles, or expert weight-of-evidence.

### Health classes from ingredient data (Appendix A.2–A.10)

| Class | Rule implemented |
|---|---|
| Skin corrosion/irritation (A.2) | Table A.2.3 additivity over relevant ingredients (≥1 %), with the note's cumulative sub-categories (Σ1A, else Σ1A+1B, else Σ1A+1B+1C ≥5 %; any Category 1 ingredient without sub-category → Category 1); Table A.2.4 where additivity does not apply; pH ≤2 / ≥11.5 → Category 1 unless acid/alkaline reserve data (A.2.3.1.3) |
| Eye damage/irritation (A.3) | Table A.3.3 (skin-corrosive and Eye Category 1 counted once), 2B only when all relevant ingredients are 2B (note b), Table A.3.4, pH (A.3.3.1.2). Category 2 ingredients without sub-category use the 2A criteria (A.3.2.1.2) |
| Sensitizers (A.4) | per-ingredient, Table A.4.5: Category 1 / 1A at 0.1 %; 1B at 1.0 % (respiratory, gas mixtures: 0.2 %). The mixture is classified **Category 1** |
| Germ cell mutagenicity (A.5) | Table A.5.1: 1A/1B 0.1 %, 2 at 1.0 % → mixture Category 1 or 2 |
| Carcinogenicity (A.6) | Table A.6.1: Category 1 and 2 at 0.1 %; Category 2 at 0.1 % to <1 % → SDS required, label optional (`labelRequired: false`). A.6.4: NTP/IARC listings may establish an ingredient as a carcinogen |
| Reproductive toxicity, lactation (A.7) | Table A.7.1: Category 1, Category 2 and lactation all at 0.1 %, per effect (fertility, development, unspecified) |
| STOT SE / RE (A.8, A.9) | Tables A.8.2 / A.9.3: Category 1 ingredient ≥1.0 % → **Category 1**; Category 2 ingredient ≥1.0 % → Category 2. Category 3: relevant ingredients (≥1 %) summed per effect, 20 % (A.8.3.4.5–6) |
| Aspiration (A.10) | Σ Category 1 ingredients (≥1 %) ≥10 % and kinematic viscosity ≤20.5 mm²/s at 40 °C (A.10.3.3); no viscosity → not assessed |

Missing data give **not assessed**, never "not hazardous". The result has a screen `signal` word (outcomes with `labelRequired: false` do not set it). Signal words, pictograms and hazard statements follow Appendix C.4.4–C.4.13 (checked against the same text).

### Physical hazards from mixture test data (Appendix B) and OSHA-defined hazards

Physical hazards are classified from data on the mixture as supplied, entered in **Physical hazard data** (shown in US mode; stored as `physical` on the formulation, so other jurisdictions can reuse it). Blank data → *not assessed*.

| Class | Rule implemented |
|---|---|
| Aerosols (B.3.1) | Considered for Categories 1/2 when >1 % flammable components or heat of combustion ≥20 kJ/g. Category 1: ≥85 % and ≥30 kJ/g, spray ignition distance ≥75 cm, or foam ≥20 cm/≥2 s or ≥4 cm/≥7 s. Category 2: spray ≥15 cm or enclosed-space time equivalent ≤300 s/m³ or deflagration density ≤300 g/m³; foam ≥4 cm/≥2 s. Otherwise Category 3; ≤1 % and <20 kJ/g → Category 3. **Note 3:** not submitted to the flammability tests → Category 1. Not additionally classified as flammable liquid/gas or gas under pressure (note 2) |
| Chemicals under pressure (B.3.2, new in HazCom 2024) | ≥200 kPa gauge. Category 1: ≥85 % flammable and ≥20 kJ/g; Category 3: ≤1 % and <20 kJ/g; otherwise Category 2 |
| Flammable gases (B.2) | Category 1A: LFL ≤13 % or range ≥12 points; 1B when also LFL >6 % or burning velocity <10 cm/s and not pyrophoric/unstable (default 1A, note 2); otherwise Category 2. Pyrophoric gas by test, or untested with >1 % pyrophoric components (note 4). Chemically unstable gas A/B |
| Oxidizing gases (B.4) | Oxidizing power >23.5 % (ISO 10156) → Category 1 |
| Gases under pressure (B.5) | Compressed / liquefied (high or low pressure by critical temperature −50 °C / +65 °C) / refrigerated liquefied / dissolved |
| Corrosive to metals (B.16) | Corrosion rate >6.25 mm/year at 55 °C on steel or aluminium → Category 1; a negative needs both metals |
| Simple asphyxiant, combustible dust (1910.1200(c), C.4.31) | As recorded; combustible dust wording depends on whether it is shipped as dust or may form in processing |
| Respiratory tract corrosivity (A.1.2.4) | Lethal effect → corrosion pictogram and statement in addition to acute inhalation toxicity; non-lethal → address under STOT (or skin/eye) |
| HNOC (1910.1200(c), (f)(1), C.2.3.3) | One per line; SDS required, not required on the shipped-container label |

"Flammable components" is the entered value, otherwise estimated from ingredient H-codes H220/H221/H224–H228 (pyrophoric, self-heating and water-reactive components excluded). Label elements follow Appendix C.4.15–C.4.18, C.4.29 and C.4.31.

### Verification record

Source: 29 CFR 1910.1200 Appendix A (Mandatory), osha.gov, as amended through 91 FR 566-594 (Jan. 8, 2026) — the HazCom 2024 rule is 89 FR 44360 (May 20, 2024). Retrieved 2026-11-13; SHA-256 of the retrieved page begins `8d338a736dc14160`. Every value in `CUTOFFS` (`verification/hazcom2024.js`) was compared with these rows and has `verified: true`:

| Table | Row (as published) | Engine key(s) |
|---|---|---|
| A.2.3 | Skin Category 1: ≥5 % → Category 1; ≥1 % but <5 % → Category 2. Skin Category 2: ≥10 %. (10 × Skin Category 1) + Skin Category 2: ≥10 % | `skinCorrosionSum`, `skinCorrosionToIrritation`, `skinIrritationSum` |
| A.2.4 | Acid pH ≤2, base pH ≥11.5, other corrosive: ≥1 % → Category 1; other irritant incl. acids and bases: ≥3 % → Category 2 | `skinNonAdditive*` |
| A.3.3 | Skin Category 1 + Eye Category 1: ≥3 % → Category 1; ≥1 % but <3 % → Category 2/2A. Eye Category 2: ≥10 %. 10 × (Skin 1 + Eye 1) + Eye 2: ≥10 % | `eyeDamageSum`, `eyeDamageToIrritation`, `eyeIrritationSum` |
| A.3.4 | Acid, base, other skin corrosive / Eye Category 1: ≥1 % → Category 1; other eye irritant: ≥3 % → Category 2 | `eyeNonAdditive*` |
| A.4.5 | Respiratory Category 1 and 1A: ≥0.1 % (solid/liquid and gas); 1B: ≥1.0 % solid/liquid, ≥0.2 % gas. Skin Category 1 and 1A: ≥0.1 %; 1B: ≥1.0 % | `respiratorySensitizer*`, `skinSensitizer*` |
| A.5.1 | Category 1A/B mutagen ≥0.1 %; Category 2 mutagen ≥1.0 % | `mutagenCategory1/2` |
| A.6.1 | Category 1 carcinogen ≥0.1 %; Category 2 ≥0.1 % (note: 0.1–1 % SDS required, label optional; ≥1 % SDS and label) | `carcinogenCategory*` |
| A.7.1 | Category 1, Category 2 and lactation: each ≥0.1 % | `reproCategory1/2`, `lactation` |
| A.8.2 / A.9.3 | Category 1 target organ toxicant ≥1.0 % → Category 1; Category 2 ≥1.0 % → Category 2 | `stotCategory1/2` |
| A.8.3.4.5 | Category 3: 20 % additive per endpoint, relevant ingredients ≥1 % | `stotCategory3Sum` |
| A.10.3.3 | Σ Category 1 ≥10 % and kinematic viscosity ≤20.5 mm²/s at 40 °C | `aspiration*` |

Appendix B and C rows checked against the same retrieval (osha.gov Appendices B and C; main section definitions from eCFR, current text):

| Table / paragraph | Row (as published) |
|---|---|
| B.2.1 | 1A: ignitable at ≤13 % in air or range ≥12 points; pyrophoric gas ≤54 °C; chemically unstable A (20 °C, 101.3 kPa) / B (higher T or p). 1B: meets 1A, not pyrophoric or unstable, LFL >6 % or burning velocity <10 cm/s. 2: other flammable range. Notes 2 and 4 |
| B.3.1 (Table B.3.1, notes 1–3) | as in the table above |
| B.3.2 (Table B.3.2) | Category 1 ≥85 % and ≥20 kJ/g; 2: >1 % and <20 kJ/g, or <85 % and ≥20 kJ/g; 3: ≤1 % and <20 kJ/g; 200 kPa gauge |
| B.4.1 | oxidizing power >23.5 % (ISO 10156) |
| B.5.1 | compressed (critical temperature ≤−50 °C), liquefied high (−50 to +65 °C) / low (>+65 °C), refrigerated, dissolved |
| B.16.1 | >6.25 mm/year at 55 °C on steel or aluminium |
| C.4.15–C.4.18, C.4.29, C.4.31 | signal words, pictograms and hazard statements as implemented (e.g. Aerosol 3 and Flammable Gas 2: no pictogram; Chemical under pressure 3: gas cylinder) |
| 1910.1200(c) | definitions of combustible dust, simple asphyxiant, HNOC; (f)(1) HNOCs need not be on shipped-container labels |

Two apparent typographical errors in the published tables are read in line with the surrounding text: Table A.3.3 prints "≥1% but >3%" (read as <3 %), and Table A.3.4 prints "Acid with pH >2" (read as ≤2, as in A.3.3.1.2 and Table A.2.4).

Corrections made when the text was checked (the earlier provisional values were written without access to it): sensitizer Sub-category 1B 1.0 % (gas 0.2 %), not 0.1 %; STOT Category 1 ingredients classify the mixture as Category 1 from 1.0 %, not 10 %; skin sub-categories are cumulative; sensitizer and CMR mixtures are classified "Category 1", not by ingredient sub-category.

To re-verify after an OSHA amendment: compare each table above with the amended text, update `CUTOFFS` and `SOURCE`, then run `npm run sync:engines`, `npm run build:mobile` and `npm test`.

## Explicitly not implemented

Explosives (B.1), flammable solids (B.7), self-reactive chemicals (B.8), pyrophoric liquids and solids (B.9–B.10), self-heating chemicals (B.11), water-reactive chemicals (B.12), oxidizing liquids and solids (B.13–B.14), organic peroxides (B.15) and desensitized explosives (B.17); hazards from changes in physical form or chemical reactions during use, tested-mixture data and bridging principles, and full Appendix C label/Appendix D SDS outputs. The US result explicitly enumerates omitted groups. No US-compliant final label or SDS is produced.

**OSHA's HazCom does not require environmental hazard classification.** EU CLP aquatic, ED, PBT, PMT and ozone classifications must not automatically appear as US OSHA classifications. Other US environmental legislation may have separate requirements.

## Safety and verification

Run:
```bash
npm test
node verification/test_us_hazcom2024.js
node verification/test_us_hazcom2024_health.js
node verification/test_us_hazcom2024_physical.js
```

Tested scenarios include flash point/boiling point boundaries, Category 4, unknown ATE >10%, formula conversion, dilution vs undiluted-category edge cases, form-specific inhalation and exclusion of EU-only outcomes.

**Important:** A partial screen with zero outcomes must never be displayed as a final "not classified" result. Any use of OSHA labels or SDS requires a separate complete assessment under 29 CFR 1910.1200 and the applicable version.
