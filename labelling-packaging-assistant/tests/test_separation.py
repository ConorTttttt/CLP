import copy
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from shared.engine import evaluate, load_json, UnsupportedAssessment

class SeparationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.eu = load_json(ROOT / 'eu' / 'rules.json')
        cls.gb = load_json(ROOT / 'gb' / 'rules.json')
        cls.eu_product = load_json(ROOT / 'examples' / 'eu_product.json')
        cls.gb_product = load_json(ROOT / 'examples' / 'gb_product.json')

    def test_eu_uses_only_eu_rules(self):
        result = evaluate(self.eu_product, self.eu, 'EU')
        self.assertTrue(all(x['rule_id'].startswith('EU-') for x in result['decisions']))

    def test_gb_uses_only_gb_rules(self):
        result = evaluate(self.gb_product, self.gb, 'GB')
        self.assertTrue(all(x['rule_id'].startswith('GB-') for x in result['decisions']))

    def test_cross_system_product_rejected(self):
        with self.assertRaises(UnsupportedAssessment):
            evaluate(self.gb_product, self.eu, 'EU')

    def test_cross_system_rulebook_rejected(self):
        with self.assertRaises(UnsupportedAssessment):
            evaluate(self.eu_product, self.gb, 'EU')

    def test_non_approved_classification_rejected(self):
        p = copy.deepcopy(self.eu_product)
        p['classification']['confirmed_by_user'] = False
        with self.assertRaises(UnsupportedAssessment):
            evaluate(p, self.eu, 'EU')

    def test_methanol_threshold(self):
        p = copy.deepcopy(self.eu_product)
        p['ingredients_w_w_percent']['67-56-1'] = 3.0
        result = evaluate(p, self.eu, 'EU')
        meth = next(x for x in result['decisions'] if x['rule_id'] == 'EU-CRF-METHANOL-3')
        self.assertEqual(meth['status'], 'REQUIRED')

    def test_below_threshold_does_not_mean_not_required(self):
        p = copy.deepcopy(self.eu_product)
        p['ingredients_w_w_percent']['67-56-1'] = 2.999
        result = evaluate(p, self.eu, 'EU')
        self.assertEqual(result['child_resistant_fastening_summary'], 'UNDETERMINED_OTHER_TRIGGERS_NOT_IMPLEMENTED')

    def test_missing_concentration_blocks_negative_conclusion(self):
        p = copy.deepcopy(self.gb_product)
        del p['ingredients_w_w_percent']['67-56-1']
        result = evaluate(p, self.gb, 'GB')
        self.assertEqual(result['child_resistant_fastening_summary'], 'UNDETERMINED_MISSING_INPUTS_AND_INCOMPLETE_RULES')

    def test_gb_english_rule_only_in_gb(self):
        eu = evaluate(self.eu_product, self.eu, 'EU')
        gb = evaluate(self.gb_product, self.gb, 'GB')
        self.assertFalse(any(x['issue'] == 'label_language' for x in eu['decisions']))
        language = next(x for x in gb['decisions'] if x['issue'] == 'label_language')
        self.assertEqual(language['output']['language'], 'English')

    def test_same_inputs_same_outputs(self):
        a = evaluate(self.gb_product, self.gb, 'GB')
        b = evaluate(self.gb_product, self.gb, 'GB')
        self.assertEqual(a, b)

    def test_mismatched_date_rejected(self):
        p = copy.deepcopy(self.gb_product)
        p['as_of'] = '2027-01-01'
        with self.assertRaises(UnsupportedAssessment):
            evaluate(p, self.gb, 'GB')

if __name__ == '__main__':
    unittest.main()
