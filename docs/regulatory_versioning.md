# EU CLP regulatory versioning — phase 1

## Implemented
Branch `feature/regulatory-versioning-v1` introduces a **per-formulation regulatory version audit** in the main single-file HTML calculator. The assessment date, fixed EU ruleset ID and market-placement evidence are stored with each formulation, browser workspace, duplicated tab and exported `.clpmix.json`.

The result view and plain-text report show the version audit and outstanding applicability warnings. Earlier imports lacking an assessment date remain **unverified** (the app does not invent a historical date). New formulations default to today's date.

**Implemented calculation ruleset:** `eu-clp-2026-07-01` (the engine's existing 1 July 2026 CLP consolidation snapshot). No other EU version is claimed or simulated. The dropdown deliberately has only one selectable option.

## New classes: transition prompt
For mixtures, Delegated Regulation (EU) 2023/707 generally applies from **1 May 2026**. For mixtures placed on the market before 1 May 2026, transitional arrangements can extend until **1 May 2028**. The user records whether the mixture was already placed on the market before 1 May 2026; the application warns about possible derogations and the need to verify evidence.

**Important:** The engine does not disable any hazard class for a chosen date or transition status. These fields are an audit record, not an automatic legal determination, and the user must verify effective classification, labelling and transitional obligations.

## Other amendments
Regulation (EU) 2024/2865 has staggered application dates, some amended by Regulation (EU) 2025/2439. The app does **not** attempt to derive a single EU legal regime from the assessment date alone, nor does it select ATP-specific Annex VI entries. The audit clearly warns that legal version applicability has not been independently validated.

## Regulatory sources
- EU CLP consolidated 1 July 2026: https://eur-lex.europa.eu/eli/reg/2008/1272/2026-07-01
- Regulation (EU) 2023/707 transitional mixture provisions: https://eur-lex.europa.eu/eli/reg_del/2023/707/oj/eng
- Regulation (EU) 2024/2865, Article 2 and Article 61: https://eur-lex.europa.eu/eli/reg/2024/2865/oj/eng
- Regulation (EU) 2025/2439: https://eur-lex.europa.eu/eli/reg/2025/2439/oj/eng

## Verification
`npm test` includes `verification/test_regulatory_versioning.js`. It covers threshold dates, unknown placement, historical/invalid dates, legacy imports, profile rejection, output links and embedded engine parity.

## Phase 2 (not implemented)
A genuine ruleset switch requires independently verified, immutable regulation datasets and separate deterministic engines for each supported revision, amendment effective-date logic, substance-specific ATP/Annex VI versions, transitional relief applicability and independently approved cross-version expected outcomes.
