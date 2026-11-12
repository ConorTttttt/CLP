# CLP Assistant — Separate EU and GB Systems (Starter)

This is a deterministic CLP labelling and packaging prototype, not a legally validated compliance tool.

## Architecture

- User manually supplies and approves the product's CLP classification; the engine does not classify substances or mixtures.
- EU and GB have separate rulebooks and separate entry points, with no cross-jurisdiction fallback.
- The shared engine evaluates conditions but does not supply legal rules.
- Each decision records its rule ID, evidence, legal section, source URL, and hashes of the input and rulebook.
- Incomplete demonstration rules never establish an exemption or a general compliance verdict.

## Run

Python 3.10 or newer, without external packages.

    python eu/run.py examples/eu_product.json
    python gb/run.py examples/gb_product.json
    python -m unittest discover -s tests -v

## Rulebook sources

- EU: https://eur-lex.europa.eu/eli/reg/2008/1272
- GB: https://www.legislation.gov.uk/eur/2008/1272
- HSE's GB / Northern Ireland distinction: https://www.hse.gov.uk/chemical-classification/brexit.htm

The demo rulebooks specify 12 November 2026 as their assessment snapshot. They are NOT certified exhaustive snapshots of all applicable law and transition dates. Legal references, exceptions, dates, and applicability must be validated against binding legislation before production use. ECHA guidance from 2021 is only supporting material.

## Manual inputs

An input specifies the selected jurisdiction, assessment date, approved hazard classes/categories, H statements, market, consumer/professional use, package capacity, and concentrations relevant to special packaging rules.

For precedence demonstrations, users also supply approved pictogram and signal-word candidates. A production implementation should derive these label elements from verified jurisdiction-specific Annex I lookup tables rather than requiring that manual step.

Missing inputs return INSUFFICIENT_DATA, not guessed answers. The demonstration covers only selected child-resistant fastening, pictogram-precedence, signal-word-precedence, and GB language rules.

## Next steps

1. Build independent, legally reviewed EU and GB law-state snapshots with effective-date and transition handling.
2. Add complete classification-to-label-element tables for each system.
3. Implement all required packaging, warning, UFI, exemption, transport, and supplemental labelling rules.
4. Implement a documented precautionary-statement selection policy and complete decision trace.
5. Add member-state language rules, completeness checking, and human approval workflows.
6. Produce distinct EU and GB reports without a blended compliance verdict.

**DO NOT USE THIS DEMONSTRATION TO CERTIFY A LABEL OR PACKAGE AS COMPLIANT.**
