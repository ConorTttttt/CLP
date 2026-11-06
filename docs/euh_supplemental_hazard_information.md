# Supplemental hazard information (EUH statements) for mixtures

**State:** implemented in `verification/engine.js` (`supplementalEUH`) and the embedded engine copy, with UI inputs and `verification/test_euh.js` (62 checks). Output is decision support; verify against the current consolidated CLP text before release.

## Legal basis

- **Article 25(1) + Annex II Part 1** – EUH statements for physical and health properties.
- **Article 25(6) + Annex II Part 2** – special labelling rules for certain mixtures.
- **Annex II Part 4** – plant protection products.
- **Annex III Part 2/3** – statement wording.

EUH380–EUH451 (ED, PBT, vPvB, PMT, vPvM) are hazard *classes* calculated in `newClasses()`; EUH208 is calculated with sensitisation (Table 3.4.6). Both are unchanged, except that EUH208 is now de-duplicated and may be replaced by EUH204/EUH205.

## Rules implemented

| Code | Rule | Mixture trigger in the engine |
|---|---|---|
| EUH014, 018, 019, 044, 029, 031, 032, 066 | Annex II 1.1.1–1.1.4, 1.2.1–1.2.4 | **No concentration rule exists.** Assigned only when the user confirms the mixture property from data. An ingredient carrying the code raises a review item. EUH066 is suppressed when the mixture is Skin Corr./Irrit.; EUH018 when it is flammable. A non-flammable mixture with flammable ingredients (H220–H226) raises an EUH018 review. |
| EUH070 | Annex II 1.2.5 | Ingredient labelled EUH070 at **≥ 0.1 %** (or the Annex VI Part 3 value entered as SCL `euh070`), or confirmed data. |
| EUH071 | Annex II 1.2.6 | Mixture classified **Skin Corr.**, **may be inhaled**, and **no acute inhalation test data** → assigned. Inhalability not stated → review. First criterion (corrosive mechanism of inhalation toxicity) by confirmation. An ingredient's EUH071 does not transfer by concentration; it raises a review. |
| EUH201 / 201A | Annex II 2.1 | Paint or varnish with total lead **> 0.15 %** (ISO 6503). EUH201A only for packages **< 125 ml** when chosen. |
| EUH202 | Annex II 2.2 | Cyanoacrylate-based adhesive (product flag). Ingredient name containing "cyanoacryl" raises a review. |
| EUH203 | Annex II 2.3 | Cement / cement mixture with soluble Cr(VI) **> 2 ppm** (0.0002 %) of dry cement, unless labelled H317. Reducing-agent packing-date notice added when ticked. |
| EUH204 | Annex II 2.4 | Any ingredient flagged isocyanate, any concentration. |
| EUH205 | Annex II 2.5 | Any ingredient flagged epoxy constituent with average MW ≤ 700. |
| EUH208 omission | Annex II 2.8, last paragraph | EUH208 for a substance already covered by EUH204/EUH205 is omitted and audited. |
| EUH206 | Annex II 2.6 | Supplied to the general public and active chlorine **> 1 %**. Audience not set → review. |
| EUH207 | Annex II 2.7 | Cadmium alloy for brazing or soldering (product flag). |
| EUH209 / 209A | Annex II 2.9 | Liquid, no flash point or **60 °C < FP ≤ 93 °C**, contains a halogenated hydrocarbon, and **> 5 %** flammable substances. EUH209 if any are highly flammable (H220/H222/H224/H225), otherwise EUH209A. |
| EUH210 | Annex II 2.10 | Mixture **not classified**, supplied to professional/industrial users, and any trigger: existing SDS-on-request triggers (sensitisers, Carc. 2, Repr., Lact., STOT 2, ED cat. 2), any ingredient ≥ 1 % w/w (≥ 0.2 % v/v for gases) classified for a health/environmental hazard or with a Union OEL, or EUH211/EUH212 assigned. |
| EUH211 | Annex II 2.12 | Liquid with **≥ 1 %** TiO2 particles of aerodynamic diameter ≤ 10 μm. TiO2 of unknown size ≥ 1 % → review. |
| EUH212 | Annex II 2.12 | Solid with **≥ 1 %** TiO2. |
| EUH401 | Annex II Part 4 | Plant protection product (product flag). |
| Aerosols | Annex II 2.11 | Note that Directive 75/324/EEC labelling also applies. |

## Inputs

- **Mixture → Supplemental hazard information panel:** inhalability, acute inhalation test data, no flash point, paint/varnish, lead %, pack volume, EUH201A choice, cyanoacrylate adhesive, cement, soluble Cr(VI) ppm, reducing agent, active chlorine %, Cd brazing alloy, plant protection product, aerosol, and confirmations for the property-based Part 1 statements (`euhConfirmed`).
- **Ingredient → Annex II supplemental labelling group:** isocyanate, epoxy MW ≤ 700, halogenated hydrocarbon, TiO2 (present / respirable).
- **Existing fields reused:** supply audience (EUH206, EUH210), EU workplace exposure limit flag (EUH210), physical state and flash point.
- Ingredient EUH codes from the hazard search (now including EUH014–EUH071) are read from `hcodeDetails`.

## Output

- Assigned statements join `label.euhStatements` and go through Article 27 selection.
- `label.supplementalHazardInformation` = `{ assigned, review, omitted }`; review items are shown as alerts in the label card and in the text report, and summarised in `notes`.
- A calculation-trail panel "Supplemental hazard information (EUH statements)" shows every step. It is marked *Classified* when a statement is assigned; review items never mark a hazard class *incomplete*.

## Limitations

- Property-based statements require expert judgement; the engine never infers them from ingredient concentration.
- EUH201, EUH202, EUH203, EUH207 and EUH401 depend on product-type facts the user must state.
- "Not required if already on the label" (EUH204/EUH205) is not modelled: the statement is proposed and the supplier decides.
- The 2024 CLP revision (Regulation (EU) 2024/2865) formatting and refill rules are out of scope.
