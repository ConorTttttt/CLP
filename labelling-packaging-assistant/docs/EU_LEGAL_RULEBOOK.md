# EU CLP law-to-rules upgrade — Tranche 1

**EU only**; this upgrade does not alter the independent GB engine or its rulebook.

This is a **partial, non-certified regulatory rule engine** based on the user-supplied consolidated text of Regulation (EC) No 1272/2008 dated 1 July 2026 (1,584 PDF pages). The PDF's SHA-256 fingerprint is in `eu/legal/source_manifest.json`.

### Contents

- `eu/legal/source_manifest.json`: versioned bibliographic manifest and page index, including the warning that consolidated text has no legal effect and Regulation (EU) 2025/2439 changes application/transitional dates.
- `eu/legal/requirements.json`: 19 independently inspectable EU labelling/packaging rules with article/annex citation, PDF page, input conditions, outcome and rationale.
- `eu/legal/engine.py`: deterministic, auditable three-valued predicate engine. No LLM decisions.
- `examples/eu_assessment.json`: manually approved EU product classification, packaging context, ingredient facts.
- `tests/test_eu_legal.py`: tests for EU/GB separation, known thresholds, missing facts, exceptions, and reproducibility.

### Run

From the repository root:

```sh
python labelling-packaging-assistant/eu/legal/engine.py \
  labelling-packaging-assistant/examples/eu_assessment.json \
  labelling-packaging-assistant/eu/legal/requirements.json
python -m unittest discover -s labelling-packaging-assistant/tests -p 'test_*.py' -v
```

### Very important limitations

1. The **classification is entered and approved by a user**. No classification is derived, checked, or changed. Hazard category codes are case-sensitive and must be provided in the schema's canonical form.
2. This rulebook is **not exhaustive**. A false condition means only `NOT_TRIGGERED_BY_THIS_RULE`, never `NOT_REQUIRED` for the overall issue.
3. `REQUIRED` or `PROHIBITED` describes what the cited extracted provision says when the input condition matches, **not whether a real product is compliant**.
4. The 1 July 2026 consolidation **does not establish which amendments apply** to every product on 12 November 2026. In particular, [Regulation (EU) 2025/2439](https://eur-lex.europa.eu/eli/reg/2025/2439/oj) amends the application dates and transitions of Regulation (EU) 2024/2865. The engine explicitly does not certify legal applicability, exemptions, market languages or historical placements-on-market.
5. The supplied PDF is **not committed** because it is approximately 22 MB. Its cryptographic fingerprint and bibliographic reference are retained. Any legally operative rule needs review against the authentic Official Journal.
6. Requirements still to implement include class-to-label mappings, Annex III / IV phrase libraries, precautionary-statement selection, EUH208 and other complicated supplemental warnings, tactile and CRF technical standards/certificates, label typography, member-state languages, transport combinations, and EU UFI/PCN assessment.
7. `eu/legal/engine.py` is **not a drop-in replacement** for the earlier `shared/engine.py`; it is an isolated, legally anchored EU module intended for incremental migration.

**Do not use this engine for production regulatory sign-off.**
