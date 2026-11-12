"""Combined EU CLP label + packaging assessment (partial, deterministic).

A single *manually approved classification* is evaluated using two separately
versioned EU-only rulebooks.  Legacy packaging rules receive an explicit,
validated adapter output; missing facts stay missing.  The evaluator never
infers a compliant label/package or falls back to the GB system.

Run: python eu/assessment.py examples/eu_phase3_product.json
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from eu.label_v2.selector import assess as assess_label, load_json, stable_hash, InvalidInput  # noqa: E402
from eu.legal.engine import assess as assess_legal, InvalidAssessment  # noqa: E402

MAPPING_PATH = ROOT / 'eu/label_v2/annex_i_mapping.json'
POLICY_PATH = ROOT / 'eu/label_v2/annex_iv_policy.json'
LEGAL_PATH = ROOT / 'eu/legal/requirements.json'


class IntegratedAssessmentError(ValueError):
    """Input/rulebook incompatibility: abort rather than approximate."""


def validate_inputs(product: dict[str, Any], mapping: dict, policy: dict, legal: dict) -> None:
    if not isinstance(product, dict):
        raise IntegratedAssessmentError('Product input must be a JSON object.')
    if any(obj.get('jurisdiction') != 'EU' for obj in (product, mapping, policy, legal)):
        raise IntegratedAssessmentError('EU-only assessment. GB inputs/rules must be assessed separately.')
    dates = [obj.get('as_of') for obj in (product, mapping, policy, legal)]
    if not dates[0] or len(set(dates)) != 1:
        raise IntegratedAssessmentError('Product date and all three EU source snapshots must match exactly.')
    if mapping.get('source', {}).get('eli') != legal.get('source', {}).get('eli'):
        raise IntegratedAssessmentError('EU label and packaging regulatory source URLs differ.')
    if mapping.get('source', {}).get('pdf_sha256') not in (None, legal.get('source', {}).get('source_sha256')):
        raise IntegratedAssessmentError('EU label and packaging sources have different PDF fingerprints.')
    if not isinstance(product.get('classification'), dict) or product['classification'].get('approved_by_user') is not True:
        raise IntegratedAssessmentError('A manually supplied, explicitly user-approved classification is mandatory.')
    classes = product['classification'].get('hazard_categories')
    if not isinstance(classes, list) or any(not isinstance(x, str) for x in classes):
        raise IntegratedAssessmentError('classification.hazard_categories must be an explicit list of strings.')
    if not isinstance(product.get('packaging'), dict):
        raise IntegratedAssessmentError('A packaging information object is required.')
    if product['packaging'].get('packaged') is not True:
        raise IntegratedAssessmentError('This initial integrated workflow supports packaged products only; unpackaged/refill products require different EU rules.')
    if product.get('ingredient_concentration_basis') != 'percent_w_w':
        raise IntegratedAssessmentError('Declare ingredient_concentration_basis=percent_w_w; concentrations are not converted or guessed.')
    ingredients = product.get('ingredients')
    if ingredients is not None and not isinstance(ingredients, dict):
        raise IntegratedAssessmentError('ingredients must be a CAS-to-percent-w/w object or omitted if unknown.')
    if isinstance(ingredients, dict) and any(type(v) not in (int,float) or not 0 <= v <= 100 for v in ingredients.values()):
        raise IntegratedAssessmentError('Ingredient concentrations must be numbers between 0 and 100, not booleans.')
    if product.get('general_public') is not None:
        raise IntegratedAssessmentError('Use packaging.general_public, not a conflicting top-level general_public field.')
    cls = product['classification']
    if classes and cls.get('is_hazardous') is False:
        raise IntegratedAssessmentError('Cannot assert non-hazardous for an approved hazardous-category input.')
    if 'pictogram_candidates' in cls or 'signal_word_candidates' in cls:
        raise IntegratedAssessmentError('This combined workflow derives pictogram/signal-word candidates from approved categories; do not supply legacy candidates.')
    if product.get('product_flags') is not None and not isinstance(product['product_flags'], dict):
        raise IntegratedAssessmentError('product_flags must be an object if provided.')
    if product.get('label') is not None and not isinstance(product['label'], dict):
        raise IntegratedAssessmentError('label must be an object if provided.')


def adapt_for_packaging(product: dict, label_report: dict, mapping: dict) -> dict:
    """Project to the older EU packaging schema WITHOUT inserting assumed facts.

    A true hazardous classification may be derived from an approved, non-empty
    list of hazard categories; no negative classification may be derived from an
    empty list. Candidate icons/words must not be asserted when any category is
    unsupported by the current mapping.
    """
    cls = copy.deepcopy(product['classification'])
    classes = cls['hazard_categories']
    if classes:
        cls['is_hazardous'] = True
    # No 'is_hazardous=False' default when classes are absent.
    by_class = {e['classification']: e for e in mapping['entries']}
    covered = set(classes) & set(by_class)
    # These lists can be partial if a category is unsupported.  Once the
    # packaging engine has evaluated them, this adapter must convert any
    # non-triggered precedence outcome into INSUFFICIENT_DATA (see below).
    cls['pictogram_candidates'] = sorted({by_class[x]['pictogram'] for x in covered})
    cls['signal_word_candidates'] = sorted({by_class[x]['signal_word'] for x in covered})
    adapted = {
        'jurisdiction': 'EU',
        'as_of': product['as_of'],
        'product_id': product.get('product_id'),
        'market_member_state': product.get('market_member_state'),
        'classification': cls,
        'ingredient_concentration_basis': product['ingredient_concentration_basis'],
    }
    packaging = product['packaging']
    for key in ('packaged', 'general_public', 'is_aerosol', 'sealed_spray',
                'transportable_gas_receptacle', 'capacity_ml',
                'quantity_elsewhere_on_package', 'child_attractive_design'):
        if key in packaging:
            adapted.setdefault('packaging', {})[key] = packaging[key]
    if 'general_public' in packaging:
        adapted['general_public'] = packaging['general_public']
    for key in ('ingredients', 'product_flags', 'label', 'lead_metal_percent_w_w',
                'active_chlorine_percent'):
        if key in product:
            adapted[key] = copy.deepcopy(product[key])
    return adapted


def _unique_blockers(label_report: dict, legal_report: dict) -> list[dict]:
    blockers: list[dict] = [{'module': 'EU_LABEL', **x} for x in label_report['blockers']]
    for entry in legal_report['decisions']:
        if entry['status'] == 'INSUFFICIENT_DATA':
            missing = [x['field'] for x in entry['conditions'] if x['actual'] == '<missing>']
            blockers.append({'module': 'EU_PACKAGING', 'code': 'MISSING_RULE_FACTS',
                             'rule_id': entry['id'], 'legal_reference': entry['legal_reference'],
                             'fields': sorted(missing), 'reason': 'Rule cannot be evaluated from supplied facts.'})
    # No artificial 'legal clearance' blocker: all reports are unconditionally
    # NOT_ASSESSED, regardless of whether this list is empty.
    return blockers


def assess(product: dict[str, Any], *, mapping: dict | None = None,
           policy: dict | None = None, legal: dict | None = None) -> dict[str, Any]:
    mapping = copy.deepcopy(mapping) if mapping is not None else load_json(MAPPING_PATH)
    policy = copy.deepcopy(policy) if policy is not None else load_json(POLICY_PATH)
    legal = copy.deepcopy(legal) if legal is not None else load_json(LEGAL_PATH)
    validate_inputs(product, mapping, policy, legal)

    # Independent module evaluations; no shared rule selection or GB fallback.
    try:
        label_report = assess_label(product, mapping, policy)
        if label_report.get('source_pdf_sha256') != legal.get('source', {}).get('source_sha256'):
            raise IntegratedAssessmentError('Module-extracted EU label and packaging source fingerprints differ.')
        adapted = adapt_for_packaging(product, label_report, mapping)
        legal_report = assess_legal(adapted, legal)
        if label_report['unsupported_classifications'] or not product['classification']['hazard_categories']:
            # The legacy engine accepts candidate lists but cannot tell that
            # ours are incomplete. NEVER turn an absent *known* candidate into
            # a negative finding when another category is unmapped.
            for decision in legal_report['decisions']:
                if (decision['issue'] in ('pictogram_precedence', 'signal_word_precedence')
                        and decision['status'] == 'NOT_TRIGGERED_BY_THIS_RULE'):
                    decision['status'] = 'INSUFFICIENT_DATA'
                    decision['reason'] = ('Precedence cannot be excluded: one or more approved hazard categories '
                                          'have no complete Annex I mapping in the current EU rulebook.')
    except (InvalidAssessment, InvalidInput) as err:
        raise IntegratedAssessmentError(str(err)) from err

    blockers = _unique_blockers(label_report, legal_report)
    return {
        'system': 'EU_CLP_ONLY',
        'assessment_kind': 'DETERMINISTIC_PARTIAL_LABELLING_AND_PACKAGING',
        'product_id': product.get('product_id'),
        'as_of': product['as_of'],
        'classification_provenance': 'MANUALLY_SUPPLIED_AND_APPROVED_BY_USER',
        'classification_is_never_modified': True,
        'source': {
            'regulation': 'Regulation (EC) No 1272/2008 (EU CLP)',
            'consolidation_date': '2026-07-01',
            'pdf_sha256': legal['source']['source_sha256'],
            'eli': legal['source']['eli'],
            'regulatory_status': 'SOURCE_EXTRACTED_NOT_ALL_PROVISIONS_LEGALLY_VALIDATED',
            'application_and_transition_dates_verified': False,
        },
        'version_control': {
            'input_sha256': stable_hash(product),
            'adapted_legal_input_sha256': stable_hash(adapted),
            'annex_i_mapping_id': mapping['id'],
            'annex_i_mapping_sha256': stable_hash(mapping),
            'annex_iv_policy_id': policy['id'],
            'annex_iv_policy_sha256': stable_hash(policy),
            'eu_packaging_rulebook_id': legal['id'],
            'eu_packaging_rulebook_sha256': stable_hash(legal),
        },
        'label_elements_draft': label_report['label_elements_draft'],
        'label_mapping_trace': label_report['mapped_classifications'],
        'unsupported_hazard_categories': label_report['unsupported_classifications'],
        'precautionary_statement_decisions': label_report['precautionary_candidate_decisions'],
        'packaging_summary': {
            'child_resistant_fastening': legal_report['child_resistant_fastening'],
            'tactile_warning': legal_report['tactile_warning'],
        },
        'packaging_and_other_legal_decisions': legal_report['decisions'],
        'blocking_items': blockers,
        'coverage': {
            'annex_i_categories_implemented': len(mapping['entries']),
            'eu_packaging_and_other_requirements_implemented': len(legal['rules']),
            'annex_iv_policy_statements_implemented': len(policy['policy']),
            'assessment_is_exhaustive': False,
        },
        'warnings': sorted(set(label_report['warnings'] + [
            'No full EU CLP compliance decision: mappings, special cases, date transitions, wording and law-state remain incomplete.',
            'Existing EU packaging and EU labelling modules have not been independently legally validated.',
        ])),
        'label_ready_for_use': False,
        'whole_label_and_package_compliance_verdict': 'NOT_ASSESSED',
    }


def main() -> None:
    p = argparse.ArgumentParser(description='EU-only CLP preliminary label + packaging assessment.')
    p.add_argument('product', type=Path, help='JSON containing manually approved classifications and packaging facts')
    p.add_argument('--output', type=Path, help='Optional output report path')
    args = p.parse_args()
    report = assess(load_json(args.product))
    content = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
    if args.output:
        args.output.write_text(content, encoding='utf-8')
    else:
        print(content, end='')


if __name__ == '__main__':
    main()
