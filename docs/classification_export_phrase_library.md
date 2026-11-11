# CLP Classification Export — Draft Phrase Library

**Status:** Draft wording for review. Not approved for automated regulatory use.
**Scope:** Proposed short phrases for a substance-by-substance and mixture-classification export.
**Current implementation:** Documentation only. The calculator's classification logic, UI, reports and tests are unchanged.

These are **phrase templates**, not assertions that a given formulation has a particular classification. Select them only when the existing classification result and supporting calculation establish the stated outcome. In particular, check the applicable SCL/GCL, relevant-ingredient cut-offs, M-factors, specific evidence and exceptions before issuing an exclusion phrase. A mixture hazard classification is distinct from an ingredient's own classification or its contribution to the mixture. The Section 3 SDS disclosure assessment is separate.

## A. Acute Toxicity

### Classified (inhalation examples)

- Classified as Acute Toxicity Cat. 1 H330. See the ATE classification.
- Classified as Acute Toxicity Cat. 2 H330. See the ATE classification.
- Classified as Acute Toxicity Cat. 3 H331. See the ATE classification.
- Classified as Acute Toxicity Cat. 4 H332. See the ATE classification.

### Not classified

- Not classified as Acute Toxicity Cat. 4 H332. See the ATE calculation.

### Ingredient below 1% (Category 4)

- Not deemed a relevant ingredient for Acute Tox. calculation due to low inclusion (<1%) within the mixture (CLP Annex I, Section 3.1.3.3).

### Ingredient below 0.1% (Categories 1–3)

- Not deemed a relevant ingredient for Acute Tox. Category 1–3 calculation due to low inclusion (<0.1%) within the mixture (CLP Annex I, Section 1.1.2.2.2, Table 1.1).

**Implementation note:** These H330/H331/H332 examples are for inhalation. Oral and dermal assessments must use the route's actual mixture H-statement. Below-cut-off wording must not be used if the applicable exception requires consideration of the ingredient.

---

## B. Remaining Health Hazards

## 1. Skin Corrosion / Irritation

**Classified**

- Classified as Skin Corr. Cat. 1A H314. See skin corrosion calculation below.
- Classified as Skin Corr. Cat. 1B H314. See skin corrosion calculation below.
- Classified as Skin Corr. Cat. 1C H314. See skin corrosion calculation below.
- Classified as Skin Corr. Cat. 1 H314. See skin corrosion calculation below.
- Classified as Skin Irrit. Cat. 2 H315. See skin irritation calculation below.

**Not classified**

- Not classified for skin corrosion or irritation. See calculation below.

**Below cut-off**

- Not deemed a relevant ingredient for skin corrosion/irritation calculation due to low inclusion (<1%) within the mixture (CLP Annex I, Table 1.1 and Section 3.2.3.3).

---

## 2. Serious Eye Damage / Eye Irritation

**Classified**

- Classified as Eye Dam. Cat. 1 H318. See eye damage calculation below.
- Classified as Eye Irrit. Cat. 2 H319. See eye irritation calculation below.

**Not classified**

- Not classified for serious eye damage or eye irritation. See calculation below.

**Below cut-off**

- Not deemed a relevant ingredient for eye damage/irritation calculation due to low inclusion (<1%) within the mixture (CLP Annex I, Table 1.1 and Section 3.3.3.3).

---

## 3. Skin Sensitisation

**Classified**

- Classified as Skin Sens. Cat. 1 H317 (CLP Annex I, Section 3.4.3.3).
- Classified as Skin Sens. Cat. 1A H317 (CLP Annex I, Section 3.4.3.3).
- Classified as Skin Sens. Cat. 1B H317 (CLP Annex I, Section 3.4.3.3).

**Not classified**

- Not classified as a skin sensitiser. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.4.5).

**Supplementary labelling**

- Mixture not classified as a skin sensitiser. EUH208 required due to the presence of a sensitising substance above the applicable elicitation limit (CLP Annex I, Table 3.4.6; Annex II, Section 2.8).

---

## 4. Respiratory Sensitisation

**Classified**

- Classified as Resp. Sens. Cat. 1 H334 (CLP Annex I, Section 3.4.3.3).
- Classified as Resp. Sens. Cat. 1A H334 (CLP Annex I, Section 3.4.3.3).
- Classified as Resp. Sens. Cat. 1B H334 (CLP Annex I, Section 3.4.3.3).

**Not classified**

- Not classified as a respiratory sensitiser. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.4.5).

**Supplementary labelling**

- Mixture not classified as a respiratory sensitiser. EUH208 required due to the presence of a respiratory sensitiser above the applicable elicitation limit (CLP Annex I, Table 3.4.6; Annex II, Section 2.8).

---

## 5. Germ Cell Mutagenicity

**Classified**

- Classified as Muta. Cat. 1A H340 (CLP Annex I, Table 3.5.2).
- Classified as Muta. Cat. 1B H340 (CLP Annex I, Table 3.5.2).
- Classified as Muta. Cat. 2 H341 (CLP Annex I, Table 3.5.2).

**Not classified**

- Not classified for germ cell mutagenicity. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.5.2).

---

## 6. Carcinogenicity

**Classified**

- Classified as Carc. Cat. 1A H350 (CLP Annex I, Table 3.6.2).
- Classified as Carc. Cat. 1B H350 (CLP Annex I, Table 3.6.2).
- Classified as Carc. Cat. 2 H351 (CLP Annex I, Table 3.6.2).

**Not classified**

- Not classified for carcinogenicity. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.6.2).

---

## 7. Reproductive Toxicity

**Classified**

- Classified as Repr. Cat. 1A H360 (CLP Annex I, Table 3.7.2).
- Classified as Repr. Cat. 1B H360 (CLP Annex I, Table 3.7.2).
- Classified as Repr. Cat. 2 H361 (CLP Annex I, Table 3.7.2).

**Differentiated effects**

- Classified as Repr. Cat. 1B H360F — fertility (CLP Annex I, Section 3.7).
- Classified as Repr. Cat. 1B H360D — development (CLP Annex I, Section 3.7).
- Classified as Repr. Cat. 1B H360FD — fertility and development (CLP Annex I, Section 3.7).
- Classified as Repr. Cat. 2 H361f — fertility (CLP Annex I, Section 3.7).
- Classified as Repr. Cat. 2 H361d — development (CLP Annex I, Section 3.7).
- Classified as Repr. Cat. 2 H361fd — fertility and development (CLP Annex I, Section 3.7).

**Not classified**

- Not classified for reproductive toxicity. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.7.2).

**Effects on or via lactation**

- Classified for effects on or via lactation H362 (CLP Annex I, Section 3.7.3.1.2).
- Not classified for effects on or via lactation. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.7.2).

---

## 8. Specific Target Organ Toxicity — Single Exposure (STOT SE)

**Classified**

- Classified as STOT SE Cat. 1 H370. See STOT SE classification below.
- Classified as STOT SE Cat. 2 H371. See STOT SE classification below.
- Classified as STOT SE Cat. 3 H335 — respiratory irritation. See STOT SE calculation below.
- Classified as STOT SE Cat. 3 H336 — narcotic effects. See STOT SE calculation below.

**Not classified**

- Not classified for STOT SE Cat. 1 or 2. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.8.3).
- Not classified for STOT SE Cat. 3. See calculation below.

**Below cut-off (Category 3)**

- Not deemed a relevant ingredient for STOT SE Cat. 3 calculation due to low inclusion (<1%) within the mixture (CLP Annex I, Section 3.8.3.4.6).

---

## 9. Specific Target Organ Toxicity — Repeated Exposure (STOT RE)

**Classified**

- Classified as STOT RE Cat. 1 H372. See STOT RE classification below.
- Classified as STOT RE Cat. 2 H373. See STOT RE classification below.

**Not classified**

- Not classified for STOT RE. Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.9.4).

---

## 10. Aspiration Hazard

**Classified**

- Classified as Asp. Tox. Cat. 1 H304. See aspiration hazard calculation below.

**Not classified**

- Not classified for aspiration toxicity. See aspiration hazard calculation below.

**Below cut-off**

- Not deemed a relevant ingredient for aspiration hazard calculation due to low inclusion (<1%) within the mixture (CLP Annex I, Section 3.10.3.3.1.1).

**Further information required**

- Aspiration hazard classification cannot be confirmed. Mixture viscosity data required (CLP Annex I, Section 3.10.3.3.1.2).

---

## 11. Endocrine Disruption — Human Health

**Classified**

- Classified as Endocrine Disruption (Human Health) Cat. 1 EUH380 (CLP Annex I, Section 3.11.3.1).
- Classified as Endocrine Disruption (Human Health) Cat. 2 EUH381 (CLP Annex I, Section 3.11.3.1).

**Not classified**

- Not classified for endocrine disruption (human health). Substance concentration is below the applicable classification limit (CLP Annex I, Table 3.11.2).

---

## 12. Standard Review Wording

**Specific concentration limit**

- Classification assessed using the substance-specific concentration limit (SCL). See calculation below (CLP Article 10).

**Insufficient information**

- Classification cannot be confirmed due to insufficient substance or mixture data. Further assessment required.

**Substance hazard does not trigger mixture classification**

- Substance concentration is below the applicable classification limit. No mixture classification triggered for this hazard under the assessed method (CLP Annex I, relevant hazard-class section).

**Mixture classification determined by other information**

- Classification based on available mixture-specific evidence. See classification justification below.

---

## C. Aquatic Environmental Hazards

### Classified

- Classified as Aquatic Chronic Cat. 3 H412 (See summation calculation below).
- Classified as Aquatic Chronic Cat. 2 H411 (See summation calculation below).
- Classified as Aquatic Chronic Cat. 1 H410 (See summation calculation below).
- Classified as Aquatic Acute Cat. 1 H400 (See summation calculation below).

### Not classified

- Not classified as Aquatic Chronic Cat. 3 H412 (See summation calculation below).
- Not classified as Aquatic Chronic Cat. 2 H411 (See summation calculation below).
- Not classified as Aquatic Chronic Cat. 1 H410 (See summation calculation below).
- Not classified as Aquatic Acute Cat. 1 H400 (See summation calculation below).

**Implementation note:** This section captures the aquatic phrases discussed so far. Ingredient exclusion phrases for general 1%, 0.1% and M-factor-adjusted cut-offs remain to be agreed. The actual summation must be shown independently; a statement should not imply a particular ingredient alone caused the mixture classification.

---

## Notes before implementation

- These phrases are stored for discussion; **none are wired into the export yet**.
- Use the engine's actual hazard/route/category and calculation data, not matching H-codes alone, to select a phrase.
- Do not use a “below cut-off” statement when an SCL, other hazard-specific criterion or evidence makes the ingredient relevant below the generic cut-off.
- “Not classified” describes the assessed mixture hazard outcome; ingredient-level statements must not be mistaken for the mixture's final classification.
- For reported omissions and supplementary labelling, retain the separate CLP Article 27 and Annex II assessments.
- Validate the applicable CLP consolidated edition, legislation dates and substance-specific entries before using these phrases in a regulatory report.
