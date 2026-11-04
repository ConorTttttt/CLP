# CLP Compass — New Hazard Classes (v0.2 automation-first prototype)

**Jurisdiction:** EU CLP (Regulation (EC) 1272/2008), including Delegated Regulation (EU) 2023/707. **Rules snapshot:** 4 November 2026.

Local-first, browser-based application for *screening and documenting* the four new hazard groups (ED human health, ED environment, PBT/vPvB, PMT/vPvM). It is not a certified classifier, and user-entered regulatory decisions have not been independently checked by this software.

## Open it immediately

- Best for a desktop with no installation: open `CLP-New-Hazard-Checker-Automated.html`, provided separately alongside this source ZIP. It includes all CSS and JS and needs no server, account or subscription.
- For local development, unpack this ZIP, then from the folder run `python3 -m http.server 8080` and visit `http://localhost:8080/`.
- For a phone on the same network, start `python3 -m http.server 8080 --bind 0.0.0.0` on the computer and open `http://<computer-local-ip>:8080/` on the phone, provided the firewall permits it. Or host the static folder on a private or public HTTPS static host (treat stored chemical formulations as confidential).
- All work is stored in the current browser's `localStorage`. Information does not automatically synchronise between desktop, phone or browsers. Export the JSON assessment and reviewed library for backups; local browser storage can be cleared or become inaccessible.

## Workflows

### 1. Review and record a substance

1. Open **Substance screening** and enter the name, validated CAS or EC identifier, date and regulatory reviewer.
2. Review the scientific flags. **Automatic numerical criteria screening** accepts selected degradation half-lives, BCF, log Koc and long-term aquatic NOEC/ECx, and displays strict threshold comparisons. These only create candidate indicators. Evidence reliability, all other legal criteria, relevant constituents/impurities and transformation products, and full weight-of-evidence remain manual expert decisions.
3. Open the **Guided regulatory decisions** panel. For each hazard group that can be resolved: verify Annex VI scope and substance identity, select classification (or justified 'not classified'), choose 'harmonised' or 'expert assessment' basis, record traceable sources and scientific reasons, check both confirmation boxes. Leave other groups unresolved.
4. Select **Save reviewed decisions to library**. Only explicitly signed-off hazard groups are stored. The system is not verifying that sources or scientific conclusions are correct.

### 2. Classify a mixture using reviewed substances

1. Open **Mixture calculator** and enter the complete weight-percent composition. Gas mixtures remain unsupported.
2. Enter verified CAS or EC identifiers. Select **Apply reviewed library** to reuse only matching, signed-off hazard-group decisions (including justified negative outcomes). Manual conflicts will not be overwritten.
3. Review the automatic ingredient-by-ingredient concentration thresholds, EUH outputs and separate Category 2 SDS-on-request flag. Ingredient concentrations are **not summed** for these CLP hazard-group trigger rules.
4. Complete **Guided expert checks** for relevant whole-mixture endocrine evidence and similar tested-mixture bridging information. Positive ingredient triggers are never silently cancelled.
5. Work through **Required actions before regulatory sign-off**. The queue catches missing inputs, unresolved classifications, unlinked manual claims, and stale/mismatched library provenance.
6. Export the JSON file, which includes rule version, inputs, classification results, review actions and local audit history.

### 3. Import reviewed library records

Use **Export reviewed library** and **Import reviewed library**. The importer checks the structure, chemical identifier and recorded approval fields; it **does not independently validate source documents, the identity of a human reviewer, harmonised Annex VI applicability or legal currency**. Import only your own trusted records. Re-check on updated rulesets.

## What the calculations do—and do not do

**Automated:** CAS check-digit validation, EC identifier format checks, exact identifier matching, strict individual-component percentage thresholds, SDS-on-request flag for ED Category 2 at >=0.1%, transition-date prompts, provisional numerical checks for persistence (P/vP), bioaccumulation (B/vB), mobility (M/vM), one aquatic toxicity (T) criterion, combination candidates, evidence-gap queue, approved-record reuse, provenance checks, JSON exports.

**Not automated:** ECHA CHEM download or harmonised ATP verification, full scientific weight-of-evidence, endocrine Category 1 versus Category 2 scientific adjudication, full T alternatives (e.g., CMR, STOT RE and ED Category 1), assessment of whole-mixture studies and bridging rules, property relevance / test reliability, specific substance variants and impurities, other CLP hazard classes, full SDS/label authoring, legal sign-off.

**Important numerical boundaries:** P and vP half-life criteria and BCF criteria use `>` (strictly greater than). Mobility and long-term aquatic T thresholds use `<` (strictly less than). A missing result, an insufficient result, or a non-triggering number is not proof of non-classification.

**Important substance identity limitation:** Exact CAS/EC matching alone does not establish equivalence of grades, isomer compositions, UVCBs, nanoforms, relevant constituents, impurities, or transformation products. That determination remains a regulatory review step.

**Security/audit limitation:** Browser `localStorage` and JSON audit logs are editable and are **not a tamper-proof electronic signature**. Use a controlled database and authenticated approvals before operational release.

## Test and edit

Requires Node.js 18+ for tests:

```bash
npm test
```

Project structure:

- `index.html`: interface
- `styles.css`: responsive design
- `app.js`: UI and local storage
- `rules.js`: basic CLP mixture rules, transition logic, substance evidence flag screen
- `metrics.js`: numerical regulatory criteria screen
- `workflow.js`: guided review, local library, sign-off checks and review queues
- `tests/`: boundary and workflow tests
- `docs/AUTOMATION-ROADMAP.md`: next steps toward genuine automated EU source retrieval

## Primary sources

- [Official Regulation 2023/707](https://eur-lex.europa.eu/eli/reg_del/2023/707/oj/eng) (Annex I §§3.11, 4.2, 4.3, 4.4)
- [ECHA Guidance on CLP criteria](https://echa.europa.eu/guidance-documents/guidance-on-clp)
- [ECHA C&L Inventory / ECHA CHEM](https://echa.europa.eu/regulations/clp/cl-inventory)
- [ECHA Harmonised classification](https://echa.europa.eu/regulations/clp/harmonised-classification-and-labelling)

**Note:** Review consolidated CLP text and subsequent ATPs before real-world reliance. This v0.2 is a robust *screening and evidence workflow prototype*, not a final regulatory classifier.
