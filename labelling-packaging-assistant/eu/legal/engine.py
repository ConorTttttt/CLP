"""EU-only, deterministic evaluator for a *partial* provision-backed CLP rulebook.

The engine does not classify products, inspect packaging, establish compliance,
or apply GB law. Every answer is a rule-level determination, not a whole-label
assessment. Missing inputs produce INSUFFICIENT_DATA, not negative findings.
"""
import hashlib
import json
from pathlib import Path


class InvalidAssessment(ValueError):
    pass


def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def lookup(data, path):
    current = data
    for key in path.split('.'):
        if not isinstance(current, dict) or key not in current:
            return False, None
        current = current[key]
    return current is not None, current


def same_kind(actual, expected):
    """True when the values can be compared: numbers with numbers (a bool is not a
    number here), anything else only with exactly the same type."""
    def number(x):
        return type(x) in (int, float)
    return (number(actual) and number(expected)) or type(actual) is type(expected)


def predicate(data, clause):
    valid, actual = lookup(data, clause['field'])
    evidence = {'field': clause['field'], 'operator': clause['op'], 'expected': clause['value'], 'actual': actual if valid else '<missing>'}
    if not valid:
        return 'UNKNOWN', evidence
    op, expected = clause['op'], clause['value']
    if op == 'eq':
        # A value of the wrong type (e.g. the string "true" for true) is missing
        # information, not a "no": it must never turn a REQUIRED rule into
        # NOT_TRIGGERED.
        if not same_kind(actual, expected):
            evidence['type_mismatch'] = f'expected {type(expected).__name__}, got {type(actual).__name__}'
            return 'UNKNOWN', evidence
        result = actual == expected
    elif op in ('gt', 'gte'):
        if type(actual) not in (int, float) or type(expected) not in (int, float):
            return 'UNKNOWN', evidence
        result = actual > expected if op == 'gt' else actual >= expected
    elif op in ('contains', 'any_of'):
        if not isinstance(actual, list):
            return 'UNKNOWN', evidence
        if op == 'contains':
            result = expected in actual
        else:
            result = any(item in actual for item in expected)
    else:
        raise InvalidAssessment(f'Invalid operator in rulebook: {op}')
    return ('TRUE' if result else 'FALSE'), evidence


def assess(product, ruleset):
    if product.get('jurisdiction') != 'EU' or ruleset.get('jurisdiction') != 'EU':
        raise InvalidAssessment('EU-only evaluator; GB rules and inputs may not be used.')
    if product.get('as_of') != ruleset.get('as_of'):
        raise InvalidAssessment('Assessment date must match the rulebook snapshot.')
    cls = product.get('classification')
    if not isinstance(cls, dict) or cls.get('approved_by_user') is not True:
        raise InvalidAssessment('User-approved classification is mandatory.')
    if not isinstance(cls.get('hazard_categories'), list) or not all(isinstance(x, str) for x in cls['hazard_categories']):
        raise InvalidAssessment('Approved hazard_categories list is required (empty is allowed).')
    if not isinstance(cls.get('hazard_statements'), list):
        raise InvalidAssessment('Approved hazard_statements list is required.')
    if not isinstance(cls.get('pictogram_candidates'), list) or not isinstance(cls.get('signal_word_candidates'), list):
        raise InvalidAssessment('Approved candidate pictograms and signal words are required in this prototype.')
    if product.get('ingredient_concentration_basis') != 'percent_w_w':
        raise InvalidAssessment('Ingredient concentrations must be percentage by weight (w/w).')

    results = []
    for rule in ruleset['rules']:
        evaluations = [predicate(product, c) for c in rule['when']['all']]
        statuses = [s for s, _ in evaluations]
        if 'FALSE' in statuses:
            condition_result = 'FALSE'
        elif 'UNKNOWN' in statuses:
            condition_result = 'UNKNOWN'
        else:
            condition_result = 'TRUE'
        status = (rule['result'] if condition_result == 'TRUE' else
                  'INSUFFICIENT_DATA' if condition_result == 'UNKNOWN' else
                  'NOT_TRIGGERED_BY_THIS_RULE')
        results.append({
            'id': rule['id'], 'issue': rule['issue'], 'status': status,
            'legal_reference': rule['legal_reference'],
            'source_pdf_page': rule['source_pdf_page'],
            'source_eli': ruleset['source']['eli'],
            'reason': rule['reason'],
            'conditions': [e for _, e in evaluations],
            'effect_if_triggered': rule['effect'] if condition_result == 'TRUE' else None,
        })

    def summary(issue):
        subset = [r for r in results if r['issue'] == issue]
        if any(r['status'] == 'REQUIRED' for r in subset):
            return 'REQUIRED_BY_ONE_OR_MORE_RULES'
        if any(r['status'] == 'INSUFFICIENT_DATA' for r in subset):
            return 'UNDETERMINED_MISSING_FACTS_AND_PARTIAL_RULESET'
        return 'UNDETERMINED_RULESET_NOT_EXHAUSTIVE'

    return {
        'jurisdiction': 'EU', 'as_of': ruleset['as_of'],
        'rulebook_id': ruleset['id'], 'input_sha256': digest(product),
        'rulebook_sha256': digest(ruleset),
        'classification_source': 'USER_APPROVED_NO_CLASSIFICATION_CALCULATION',
        'legal_review_status': 'EXTRACTED_FROM_CONSOLIDATION_NOT_INDEPENDENTLY_LEGALLY_VALIDATED',
        'whole_label_compliance_verdict': 'NOT_ASSESSED',
        'child_resistant_fastening': summary('child_resistant_fastening'),
        'tactile_warning': summary('tactile_warning'),
        'decisions': results,
    }


def main():
    import sys
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python eu/legal/engine.py product.json eu/legal/requirements.json')
    product = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    rules = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
    print(json.dumps(assess(product, rules), indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
