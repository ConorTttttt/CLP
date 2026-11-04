# US OSHA HazCom 2024 — initial classification mode

**Status:** Initial, bounded screening implementation. NOT a completed OSHA HazCom classification/label/SDS engine.

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

- Separate pure rules module: `verification/hazcom2024.js`, **not** a filter over EU CLP results.
- Inlined copy included in `clp_mixture_calculator.html` so the standalone HTML continues to work offline.
- The regulation selector is a display preference; stored formulations and ingredient data are not overwritten when the regulation is switched.
- The EU CLP result renderer/report remains unchanged when EU CLP is selected.
- The existing ingredient contribution markers are calculated by the EU CLP engine and are **not US HazCom assessments**; they remain EU CLP-only. Do not infer US relevance from those markers.
- Some ingredient categories were entered for EU CLP; verify that they are supported by sources relevant to US OSHA HCS. **No automatic conversion of EU-specific SCLs or EUH statements to OSHA classifications.**

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

## Explicitly not implemented

Skin and eye, sensitization, CMR, STOT, aspiration, other physical hazards (including aerosols, chemicals under pressure and desensitized explosives), combustible dust, simple asphyxiants, HNOCs, hazards from changes in physical form or chemical reactions during use, and full Appendix C label/Appendix D SDS outputs. The US result explicitly enumerates omitted groups. No US-compliant final label or SDS is produced.

**OSHA's HazCom does not require environmental hazard classification.** EU CLP aquatic, ED, PBT, PMT and ozone classifications must not automatically appear as US OSHA classifications. Other US environmental legislation may have separate requirements.

## Safety and verification

Run:
```bash
npm test
node verification/test_us_hazcom2024.js
```

Tested scenarios include flash point/boiling point boundaries, Category 4, unknown ATE >10%, formula conversion, dilution vs undiluted-category edge cases, form-specific inhalation and exclusion of EU-only outcomes.

**Important:** A partial screen with zero outcomes must never be displayed as a final "not classified" result. Any use of OSHA labels or SDS requires a separate complete assessment under 29 CFR 1910.1200 and the applicable version.
