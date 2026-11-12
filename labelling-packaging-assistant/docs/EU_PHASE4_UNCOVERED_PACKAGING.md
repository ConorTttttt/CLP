# Phase 4 — Gap-first EU packaging and physical labelling

**Status:** deterministic, preliminary, tested against a limited extract of the supplied consolidated EU CLP Regulation (EC) 1272/2008, 1 July 2026. **Not production-ready and not an approved CLP compliance assessment.** This tranche deliberately avoids duplicating existing Article 26/27/28, EUH and PCN code found in other GitHub projects.

## Sources and effective-date guard

- User-supplied `CELEX_02008R1272-20260701_EN_TXT.pdf`, 1,584 pages, SHA-256 `602529287cbdbbb80f4bc17404fef58041ce5edf30646509b3cdb6991b7fc8a7`.
- Article 33(1)–(3), PDF p.29: outer, intermediate, inner and single packages; transport-label interactions.
- Annex I §1.5.2.1.1–1.5.2.1.3, PDF pp.74–75: ≤125 ml, category-specific **permitted** exemptions.
- Annex I §1.2.1.1–1.2.1.4 and Table 1.3, PDF pp.70–71: pictogram shape/colour, area and label-size references.
- [EU CLP consolidated text](https://eur-lex.europa.eu/eli/reg/2008/1272/2026-07-01) — **informational only, not the legally authentic act**.
- [Regulation (EU) 2025/2439](https://eur-lex.europa.eu/eli/reg/2025/2439/oj) — deferred certain obligations of Regulation (EU) 2024/2865, particularly revised formatting, to 1 January 2028; verify relevant current and transitional law per obligation.

**The source PDF's date is not a universal implementation date.** The rule file is pinned to the 12 November 2026 prototype assessment snapshot and does not certify applicable law for specific pre-market stocks or transitional conditions. Especially do not treat all `▼M37` provisions in the consolidation as operative now.

## Scope added — genuinely missing from related repos

### Article 33 package layers

- `packaging.structure = single | outer_and_inner`.
- With outer transport labelling **required and verified as meeting the transport rules**, Article 33(1) permits outer CLP information to be optional; CLP inner and intermediate labels remain required.
- Without a requirement for transport labelling, Article 33(2) requires outer and inner CLP labelling, with a conditional outer-visibility exception.
- For a single package that is also transport-labelled, Article 33(3) requires both regimes. Duplicate CLP pictograms are only potentially omissible for **the same verified hazard**. This evaluator never identifies that equivalence or edits artwork.
- Unknown layering, transport facts and line-of-sight evidence yield `REQUIRES_REVIEW` rather than guessing.

### Small packs — Annex I §1.5.2.1

- **40 indexed hazard-category rows**, including consumer-status conditions for Acute Tox. 4 and relevant STOT categories.
- At ≤125 ml, **permission is per hazard-category and per linked element only**, with distinct permissions for H+P, P only or pictogram/signal/H/P (metals corrosion). A product with multiple classifications retains requirements arising from every other classification.
- This is **not a blanket small-pack exemption** and does not supersede separate child-resistant fastening, tactile warning, supplemental labelling, packaging or other duties.
- The result contains `PERMITTED_FOR_LINKED_ELEMENTS_ONLY`, **never** an automatically removed H/P/pictogram or an approval of the final label.
- Other small-pack scenarios (soluble single-use, ≤10 ml inner packages, aerosols, unusual format/tie-on, Article 29 practical impossibility) are intentionally **not implemented**.

### Label and pictogram dimensions — Annex I Table 1.3

- A capacity-based reference table covers ≤3 L, >3–50 L, >50–500 L, and >500 L.
- The small label 52 × 74 mm benchmark is qualified **“if possible”**. The minimum 10 × 10 mm pictogram for ≤3 L is also recorded, alongside the **if possible** 16 × 16 mm recommendation.
- Actual measured dimensions can be compared to the reference row. A dimension match is **not artwork approval**: pictogram area (≥1/15 of relevant minimum label area and ≥1 cm²), original GHS graphic, shape, colour, contrast, readability, fold-out structure and language still need verification.

## Integration and usage

The new files are:

- `eu/physical_label/rules.json` — separate, source-anchored EU packaging-layer/size/category register.
- `eu/physical_label/engine.py` — auditable deterministic evaluator with missing-fact protection.
- `eu/assessment.py` — now includes `physical_labelling_and_packaging` in its existing combined EU report, source/hash matching, and blockers.
- `examples/eu_phase4_product.json` and `examples/eu_phase4_report.json` — sample 125 ml, consumer Flam. Liq. 2/Eye Irrit. 2 with 3% methanol.
- `tests/test_eu_physical_label.py` — standalone and integrated regression tests.

Run from `labelling-packaging-assistant/`:

```sh
python eu/physical_label/engine.py examples/eu_phase4_product.json
python eu/assessment.py examples/eu_phase4_product.json
python -m unittest discover -s tests -p 'test_*.py' -v
```

The demonstration shows **permitted** category-linked small-pack omissions alongside **required** consumer child-resistant fastening and tactile warnings. That is intentional: exemption from selected label statements does **not** cancel packaging hardware duties. No user hazard classification is inferred or revised.

## Remaining uncovered work

1. Exact Article 29(1) impossibility criteria, tie-on/outer format rules, Art 31 fold-out formats and Annex I §§1.5.1, 1.5.2.2–1.5.2.5; confirm provision-specific application and transitions first.
2. Full physical artwork validation: Annex V pictogram geometry, Table 1.3 label area ratio, border width, readability, language grouping and placement, alternative presentation, and special shape restrictions.
3. Packaging closure/certification evidence under relevant EN/ISO standards, packaging safety performance, refill/soluble laundry detergent rules and any relevant cross-sector regulations.
4. Article 18 identifier/supplier address/telephone and Article 17 nominal quantity accuracy, plus real Member State language checks.
5. Market-placement evidence and law-state version resolver including Regulation (EU) 2024/2865/2025/2439 effects; verify authenticity against Official Journal versions.
6. Full GB physical labelling/packaging implementation from GB CLP only — **nothing here is a GB rule**.

## Known design constraints

- This module is restricted to manually approved classification and packaged EU products. The schema uses canonical category names, not auto-parsed free text; expand aliases through reviewed mappings only.
- The `scope_notes` contain explicit non-coverage. `NOT_REQUIRED_BY_THIS_PROVISION` is not general proof that no other label is needed.
- Structural layer descriptions are user statements. Their accuracy, accessibility and legibility are never measured automatically.
- Examples are synthetic, not expert-approved product or label evidence. Review this code and its source mapping before any customer or regulatory use.
