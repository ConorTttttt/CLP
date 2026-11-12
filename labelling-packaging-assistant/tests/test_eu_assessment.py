"""Phase 3: integrated EU-only label/packaging deterministic audit tests."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eu.assessment import assess, adapt_for_packaging, validate_inputs, IntegratedAssessmentError  # noqa:E402
from eu.label_v2.selector import assess as assess_label  # noqa:E402
from eu.legal.engine import assess as assess_legal  # noqa:E402

SAMPLE = json.loads((ROOT/'examples/eu_phase3_product.json').read_text())
MAPPING = json.loads((ROOT/'eu/label_v2/annex_i_mapping.json').read_text())
POLICY = json.loads((ROOT/'eu/label_v2/annex_iv_policy.json').read_text())
LEGAL = json.loads((ROOT/'eu/legal/requirements.json').read_text())


def copy_sample():
    return copy.deepcopy(SAMPLE)


def decision(result, rule):
    return next(x for x in result['packaging_and_other_legal_decisions'] if x['id'] == rule)


class CombinedEUTests(unittest.TestCase):
    def test_combined_uses_both_modules_and_preserves_label_result(self):
        r = assess(SAMPLE)
        source = assess_label(SAMPLE)
        self.assertEqual(r['label_elements_draft'], source['label_elements_draft'])
        self.assertEqual(r['precautionary_statement_decisions'], source['precautionary_candidate_decisions'])
        self.assertEqual(r['system'], 'EU_CLP_ONLY')

    def test_packaging_result_matches_independent_packaging_engine(self):
        lab = assess_label(SAMPLE)
        original = assess_legal(adapt_for_packaging(SAMPLE, lab, MAPPING), LEGAL)
        integrated = assess(SAMPLE)
        self.assertEqual(integrated['packaging_summary']['child_resistant_fastening'], original['child_resistant_fastening'])
        self.assertEqual(integrated['packaging_summary']['tactile_warning'], original['tactile_warning'])

    def test_threshold_methanol_at_three(self):
        r = assess(SAMPLE)
        self.assertEqual(decision(r, 'EU-ANII-3.1.1.3-METHANOL')['status'], 'REQUIRED')
        self.assertEqual(r['packaging_summary']['child_resistant_fastening'], 'REQUIRED_BY_ONE_OR_MORE_RULES')
        self.assertEqual(r['packaging_summary']['tactile_warning'], 'REQUIRED_BY_ONE_OR_MORE_RULES')

    def test_below_methanol_threshold_is_not_overall_exemption(self):
        p = copy_sample()
        p['ingredients']['67-56-1'] = 2.999
        r = assess(p)
        self.assertEqual(decision(r,'EU-ANII-3.1.1.3-METHANOL')['status'], 'NOT_TRIGGERED_BY_THIS_RULE')
        self.assertEqual(r['packaging_summary']['child_resistant_fastening'], 'UNDETERMINED_RULESET_NOT_EXHAUSTIVE')

    def test_missing_ingredient_fact_cannot_silently_be_zero(self):
        p = copy_sample()
        p['ingredients'].pop('67-56-1')
        r = assess(p)
        self.assertEqual(decision(r,'EU-ANII-3.1.1.3-METHANOL')['status'], 'INSUFFICIENT_DATA')
        self.assertEqual(r['packaging_summary']['child_resistant_fastening'], 'UNDETERMINED_MISSING_FACTS_AND_PARTIAL_RULESET')
        self.assertTrue(any(x.get('rule_id')=='EU-ANII-3.1.1.3-METHANOL' for x in r['blocking_items']))

    def test_classification_is_not_mutated(self):
        p = copy_sample()
        cls = copy.deepcopy(p['classification'])
        assess(p)
        self.assertEqual(cls, p['classification'])

    def test_repeated_input_identical_output(self):
        self.assertEqual(assess(SAMPLE), assess(copy_sample()))

    def test_input_order_independent_label_selection(self):
        p = copy_sample()
        p['classification']['hazard_categories'].reverse()
        a, b = assess(p), assess(SAMPLE)
        self.assertEqual(a['label_elements_draft'], b['label_elements_draft'])
        self.assertEqual(a['precautionary_statement_decisions'], b['precautionary_statement_decisions'])

    def test_gb_input_rejected(self):
        p = copy_sample(); p['jurisdiction'] = 'GB'
        with self.assertRaises(IntegratedAssessmentError): assess(p)

    def test_gb_mapping_rejected(self):
        mapping = copy.deepcopy(MAPPING); mapping['jurisdiction'] = 'GB'
        with self.assertRaises(IntegratedAssessmentError): assess(SAMPLE, mapping=mapping)

    def test_gb_packaging_rules_rejected(self):
        rules = copy.deepcopy(LEGAL); rules['jurisdiction'] = 'GB'
        with self.assertRaises(IntegratedAssessmentError): assess(SAMPLE, legal=rules)

    def test_bad_snapshot_date_rejected(self):
        p=copy_sample(); p['as_of'] = '2027-01-01'
        with self.assertRaises(IntegratedAssessmentError): assess(p)

    def test_wrong_regulatory_eli_rejected(self):
        mapping = copy.deepcopy(MAPPING); mapping['source']['eli'] = 'https://example.invalid/'
        with self.assertRaises(IntegratedAssessmentError): assess(SAMPLE, mapping=mapping)

    def test_rulebook_fingerprint_mismatch_rejected(self):
        rules = copy.deepcopy(LEGAL); rules['source']['source_sha256'] = '0' * 64
        with self.assertRaises(IntegratedAssessmentError): assess(SAMPLE, legal=rules)

    def test_classification_approval_required(self):
        p=copy_sample();p['classification']['approved_by_user']=False
        with self.assertRaises(IntegratedAssessmentError):assess(p)

    def test_invalid_ingredient_concentration_rejected(self):
        for bad in (-0.01,100.01,True,'3'):
            p=copy_sample();p['ingredients']['67-56-1']=bad
            with self.subTest(bad=bad):
                with self.assertRaises(IntegratedAssessmentError):assess(p)

    def test_ingredient_basis_must_be_explicit(self):
        p=copy_sample();p.pop('ingredient_concentration_basis')
        with self.assertRaises(IntegratedAssessmentError):assess(p)

    def test_no_default_consumer_use(self):
        p=copy_sample();p['packaging'].pop('general_public')
        r=assess(p)
        self.assertEqual(decision(r,'EU-ANII-3.1.1.3-METHANOL')['status'],'INSUFFICIENT_DATA')
        self.assertTrue(any(x['code']=='CONSUMER_OR_PROFESSIONAL_UNKNOWN' for x in r['blocking_items']))

    def test_professional_use_methanol_not_consumer_trigger(self):
        p=copy_sample();p['packaging']['general_public']=False
        r=assess(p)
        self.assertEqual(decision(r,'EU-ANII-3.1.1.3-METHANOL')['status'],'NOT_TRIGGERED_BY_THIS_RULE')
        self.assertEqual(r['packaging_summary']['child_resistant_fastening'],'UNDETERMINED_RULESET_NOT_EXHAUSTIVE')

    def test_requires_packaged_product(self):
        p=copy_sample();p['packaging']['packaged']=False
        with self.assertRaises(IntegratedAssessmentError):assess(p)

    def test_rejects_top_level_consumer_flag(self):
        p=copy_sample();p['general_public']=False
        with self.assertRaises(IntegratedAssessmentError):assess(p)

    def test_rejects_manual_candidate_shortcut(self):
        p=copy_sample();p['classification']['pictogram_candidates']=['GHS01']
        with self.assertRaises(IntegratedAssessmentError):assess(p)

    def test_rejects_false_hazardous_when_classified(self):
        p=copy_sample();p['classification']['is_hazardous']=False
        with self.assertRaises(IntegratedAssessmentError):assess(p)

    def test_unknown_category_can_still_trigger_known_packaging_rule(self):
        p=copy_sample();p['classification']['hazard_categories'].append('Resp. Sens. 1')
        # Preserve all user H declarations; label module will flag mismatch.
        r=assess(p)
        self.assertIn('Resp. Sens. 1',r['unsupported_hazard_categories'])
        self.assertEqual(decision(r,'EU-ANII-3.1.1.3-METHANOL')['status'],'REQUIRED')
        self.assertTrue(any(x['code']=='UNSUPPORTED_HAZARD_CATEGORIES' for x in r['blocking_items']))

    def test_unknown_category_disables_negative_precedence_inference(self):
        p=copy_sample();p['classification']['hazard_categories']=['Resp. Sens. 1']
        p['classification']['hazard_statements']=['H334']
        r=assess(p)
        self.assertEqual(decision(r,'EU-20-3')['status'],'INSUFFICIENT_DATA')
        self.assertEqual(decision(r,'EU-26-1-B')['status'],'INSUFFICIENT_DATA')

    def test_no_classes_does_not_certify_unclassified(self):
        p=copy_sample();p['classification']['hazard_categories']=[]
        p['classification']['hazard_statements']=[]
        r=assess(p)
        self.assertEqual(decision(r,'EU-20-3')['status'],'INSUFFICIENT_DATA')
        self.assertTrue(any(x['code']=='NO_CLASSES' for x in r['blocking_items']))
        self.assertEqual(r['whole_label_and_package_compliance_verdict'],'NOT_ASSESSED')

    def test_all_legally_bound_decisions_have_source_and_reason(self):
        r=assess(SAMPLE)
        for d in r['packaging_and_other_legal_decisions']:
            self.assertTrue(d['legal_reference'])
            self.assertGreater(d['source_pdf_page'],0)
            self.assertTrue(d['reason'])
            self.assertEqual(d['source_eli'],LEGAL['source']['eli'])
        for d in r['precautionary_statement_decisions']:
            self.assertTrue(d['legal_reference'])
            self.assertTrue(d['reason'])

    def test_total_rule_coverage_explicitly_partial(self):
        r=assess(SAMPLE)
        self.assertEqual(r['coverage']['annex_i_categories_implemented'],13)
        self.assertEqual(r['coverage']['annex_iv_policy_statements_implemented'],27)
        self.assertEqual(r['coverage']['eu_packaging_and_other_requirements_implemented'],19)
        self.assertFalse(r['coverage']['assessment_is_exhaustive'])
        self.assertIs(r['label_ready_for_use'],False)
        self.assertEqual(r['whole_label_and_package_compliance_verdict'],'NOT_ASSESSED')


if __name__ == '__main__':
    unittest.main()
