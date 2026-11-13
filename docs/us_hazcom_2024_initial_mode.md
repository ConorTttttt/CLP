# US OSHA HazCom 2024 — initial classification mode

**Status:** Partial screening implementation: flammable liquids and all Appendix A health classes (A.1–A.10) from ingredient data. NOT a completed OSHA HazCom classification/label/SDS engine. Appendix A cut-off values are **not yet verified** against the regulation text (see below).

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

| Class | Rule implemented | Cut-off keys |
|---|---|---|
| Skin corrosion/irritation (A.2) | Table A.2.3 additivity (≥1 % ingredients), Table A.2.4 where additivity does not apply, extreme pH (≤2 / ≥11.5) unless reserve data; single sub-category carried through | `skinCorrosion*`, `skinIrritation*`, `skinNonAdditive*` |
| Eye damage/irritation (A.3) | Table A.3.3 additivity (skin-corrosive and Eye Cat 1 counted once), Table A.3.4, extreme pH; 2B only when every eye irritant is 2B | `eye*` |
| Sensitizers (A.4) | per-ingredient Table A.4.3; 1A takes precedence | `respiratorySensitizer`, `skinSensitizer` |
| Germ cell mutagenicity (A.5) | Table A.5.3 | `mutagenCategory1/2` |
| Carcinogenicity (A.6) | Table A.6.1 with OSHA note: Category 2 at 0.1 % to <1 % → SDS required, label optional (`labelRequired: false`) | `carcinogenCategory1/2`, `carcinogenCategory2Label` |
| Reproductive toxicity, lactation (A.7) | Table A.7.1 for fertility, development and unspecified effects | `reproCategory1/2`, `lactation` |
| STOT SE / RE (A.8, A.9) | Tables A.8.3 / A.9.4; Category 3 respiratory irritation and narcotic effects summed per effect (20 %) | `stot*` |
| Aspiration (A.10) | Σ Category 1 ≥10 % and kinematic viscosity ≤20.5 mm²/s at 40 °C; no viscosity → not assessed | `aspiration*` |

Missing data give **not assessed**, never "not hazardous". The result has a screen `signal` word (labels where `labelRequired` is false do not set it).

### Cut-off values to verify

All Appendix A mixture cut-offs live in `CUTOFFS` in `verification/hazcom2024.js`, each with its table, whether it is a single GHS value or an **OSHA choice** among GHS options, and `verified: false`. They were written without access to the regulation text (osha.gov / ecfr.gov were not reachable). Every US result and report lists the unverified values. Where OSHA's choice among GHS options was uncertain the more protective value is used:

- sensitizers: 0.1 % for all categories (GHS also allows 1.0 %; 0.2 % for gases);
- carcinogen Category 2: 0.1 % (SDS) and 1 % (label), per OSHA's note;
- reproductive toxicants and lactation: 0.1 % (GHS also allows 0.3 % / 3 %);
- STOT: Category 1 at 10 %, Category 2 at 1.0 % (GHS also allows 1.0 % / 10 %).

To verify: compare each entry with the current 29 CFR 1910.1200 Appendix A, correct the value if needed, set `verified: true`, run `npm run sync:engines`, `npm run build:mobile` and `npm test`.

## Explicitly not implemented

Physical hazards other than flammable liquids (including aerosols, chemicals under pressure and desensitized explosives), combustible dust, simple asphyxiants, HNOCs, hazards from changes in physical form or chemical reactions during use, tested-mixture data and bridging principles, and full Appendix C label/Appendix D SDS outputs. The US result explicitly enumerates omitted groups. No US-compliant final label or SDS is produced.

**OSHA's HazCom does not require environmental hazard classification.** EU CLP aquatic, ED, PBT, PMT and ozone classifications must not automatically appear as US OSHA classifications. Other US environmental legislation may have separate requirements.

## Safety and verification

Run:
```bash
npm test
node verification/test_us_hazcom2024.js
node verification/test_us_hazcom2024_health.js
```

Tested scenarios include flash point/boiling point boundaries, Category 4, unknown ATE >10%, formula conversion, dilution vs undiluted-category edge cases, form-specific inhalation and exclusion of EU-only outcomes.

**Important:** A partial screen with zero outcomes must never be displayed as a final "not classified" result. Any use of OSHA labels or SDS requires a separate complete assessment under 29 CFR 1910.1200 and the applicable version.
