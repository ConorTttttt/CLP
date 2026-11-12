# CLP Labelling Assistant — gap-first cross-repository roadmap

**Review date:** 12 November 2026. The following coverage assessments describe inspected GitHub code and documentation, not verified legal completeness. Do not conflate a feature branch with committed or deployed production code. None of the external branches were merged.

| Domain | Located elsewhere | What still needs to be built in labelling assistant | Priority |
| --- | --- | --- | --- |
| Articles 26 and 27 precedence | `CLP` main: `verification/engine.js`, `docs/article_26_pictogram_precedence.md`, `docs/article_27_hazard_statement_precedence.md` | Independent legal verification and integration later; do not duplicate now | Defer duplication |
| Article 28/Annex IV P selection | `CLP` branch `feature/complete-annex-iv-p-statements`: 129 indexed P codes/combinations, conditional review and tests | Version-verified exhaustive decision mapping and independent validation later | Defer duplication |
| EUH supplemental warnings | `CLP` branch `feature/euh-supplemental-hazards`: standalone EUH logic and tests | Legal verification, isolated adapter later | Defer duplication |
| EU poison-centre grouping | `PCN-grouping` integration branch has eligibility engine and concentration solver; its own QA ledger labels integration blocked | A **separate** Annex VIII UFI/PCN label-applicability module; don't take unapproved grouping code as final | Later |
| SDS phrase authoring | `SDS-Phrases` has a local licensed English phrase catalogue and deterministic phrase matching | Avoid importing eSDScom phrases as official CLP Annex IV label text | Separate |
| Jurisdiction status | `Regulatory-Playbook` has distinct EU/GB classifications and links | Verified legal snapshots, law-state resolver, Member State language tables | High |
| Physical package layers / transport labels | No corresponding comprehensive code identified in inspected projects | **Phase 4 Article 33 module added** | **Now** |
| ≤125 ml category exemptions, label dimensions | No corresponding comprehensive code identified in inspected projects | **Phase 4 Annex I Table 1.3 and §1.5.2.1 module added** | **Now** |
| Fold-out labels, ≤10 ml and soluble packs | Not found as independently executable, complete legal rules | Next phase after resolving amendment dates | **Next** |
| Label typography, geometry and placement | Existing pictogram assets in `CLP` do not validate physical artwork | Typed label geometry + evidence-driven review | **Next** |
| Closure/tactile certification, refill and special packaging | Existing assistant has some *triggers*, not package-level conformity proof | Evidence schemas, dated EN/ISO versions, rules and tests | **Next** |
| GB standalone comprehensive physical rules | `Regulatory-Playbook` identifies GB as a separate framework; GB starter exists | Source-authenticated GB engine and tests without EU amendment leakage | High |
| Sign-off, audit and change control | Source hashes and draft tests exist in multiple projects | Independent reviewed golden product labels, authentic OJ sources, CI evidence, update policy | High |

**Next proposed tranche:** Annex I §1.5.2.2 and §§1.5.2.4–1.5.2.5 for single-use soluble/≤10 ml inner packages, Article 29/31 fold-out and practical-impossibility cases, **only after verifying exactly which amended provisions apply on the assessment date**.

The manual user classification remains authoritative. Every exemption is scoped narrowly, and missing evidence must yield review rather than a negative compliance finding. GB and EU remain separate.
