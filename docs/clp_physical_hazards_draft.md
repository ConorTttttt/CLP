# EU / GB CLP physical hazards (Annex I Part 2) — DRAFT, needs review

**Status: `draft-needs-review`. Not approved for `main`.** The CI job `review-gate` fails every
pull request into `main` until this rule set is signed off (see *Sign-off* below).

## What it does

The EU CLP and GB CLP engine (`verification/engine.js`, `physicalCLP` and `PHYSICAL_RULES`)
classifies Annex I Part 2 physical hazards from the mixture test data entered in
**Physical hazard data** (the same `physical` record the US HazCom engine reads):

| Annex I | Class | Classification inputs |
|---|---|---|
| 2.1 | Explosives | screening exemption (2.1.4.3) or UN Part I result (unstable, Divisions 1.1–1.6); known-explosive ingredients (H200–H205) block the exemption |
| 2.2 | Flammable gases | flammability limits, burning velocity, pyrophoric gas (incl. >1 % pyrophoric components untested), chemically unstable gas A/B |
| 2.3 | Aerosols | flammable components (incl. liquids with flash point ≤93 °C), heat of combustion, ignition distance / enclosed space / foam tests; untested → Category 1 (2.3.2.2) |
| 2.4 | Oxidising gases | oxidising power >23.5 % |
| 2.5 | Gases under pressure | group or critical temperature |
| 2.7 | Flammable solids | UN N.1 burning time/rate and wetted zone; metal powders |
| 2.8 / 2.15 | Self-reactive / organic peroxides | Type A–G; exemptions (decomposition energy, SADT, available oxygen) |
| 2.9 / 2.10 | Pyrophoric liquids / solids | 5-minute ignition test |
| 2.11 | Self-heating | cube tests and package volume |
| 2.12 | Water-reactive | spontaneous ignition and gas evolution rates |
| 2.13 / 2.14 | Oxidising liquids / solids | UN O.2 / O.1–O.3 category |
| 2.16 | Corrosive to metals | >6.25 mm/year (a negative needs both metals) |
| 2.17 | Desensitised explosives | corrected burning rate |

Flammable liquids (2.6) were already implemented and are unchanged, except that aerosols and
desensitised explosives are no longer also classified as flammable liquids.

## How it is marked as draft

- `PHYSICAL_RULES.status = 'draft-needs-review'` in `verification/engine.js`.
- Every physical outcome has `draft: true`; the results panel shows a **DRAFT – not reviewed** badge,
  the text report appends `[DRAFT – not reviewed]`, and each calculation-trail entry says
  "DRAFT, needs review".
- A `DRAFT RULES:` warning appears whenever physical data are entered (EU or GB mode).
- The Physical hazard data panel shows a draft banner in EU/GB mode.
- Without physical data, one line says these classes are **not assessed**.
- `node verification/review_gate.js` (`npm run check:review`) fails while the status is draft.

## Source used

GB CLP Annex I Part 2 (retained Regulation (EC) No 1272/2008), legislation.gov.uk `data.xml`,
last modified 2026-06-10, retrieved 2026-11-13. The EU consolidated text could not be retrieved
from EUR-Lex in the session that wrote these rules. Criteria were compared with the GB text;
they match OSHA HazCom 2024 Appendix B except that CLP aerosols count liquids with a flash point
≤93 °C as flammable components, CLP (GB text) has no "chemicals under pressure" class, and CLP
organic peroxide Type B uses H241 "Heating may cause a fire or explosion".

## Review checklist

Each item is also in `PHYSICAL_RULES.reviewItems` and is printed by the gate.

- [ ] **EU text.** Compare with the current consolidated EU CLP Annex I Part 2 (EUR-Lex), including EU amendments to Part 2 after 31 December 2020.
- [ ] **Chemicals under pressure.** Confirm whether EU CLP now has this class (GHS Rev. 7). Currently not applied for EU or GB.
- [ ] **Explosives.** Confirm whether EU CLP still uses Divisions 1.1–1.6 or the GHS Rev. 8 categories.
- [ ] **Aerosol thresholds.** Check the numbers against Figures 2.3.1(a)–(c) (images in the source).
- [ ] **Pictograms.** Check GHS01–GHS05 assignments against the label tables 2.1.2–2.17.2 (images in the source).
- [ ] **Aerosol flammable components.** Confirm users enter unclassified liquids with flash point 60–93 °C (the H-code estimate cannot see them).
- [ ] **Interactions and Article 26.** Aerosol / desensitised explosive / self-reactive / pyrophoric exclusions, and pictogram precedence for the new classes.
- [ ] Run `npm test` and `node verification/test_clp_physical_draft.js`; review the test boundaries.

## Sign-off

After review, edit `PHYSICAL_RULES` in `verification/engine.js`:

```js
status: 'reviewed',
reviewedBy: '<name / role>',
reviewedOn: 'YYYY-MM-DD',
```

then run `npm run sync:engines`, `npm run build:mobile` and `npm test`. `review_gate.js` passes only
with all three fields set. To make the gate binding, mark the `review-gate` check as required in the
repository's branch protection for `main` (GitHub settings).
