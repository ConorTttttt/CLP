"""Selected legal and safety regression tests for partial EU CLP rulebook."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'eu' / 'legal'))
from engine import InvalidAssessment, assess  # noqa:E402

RULES = json.loads((ROOT/'eu/legal/requirements.json').read_text())
PRODUCT = json.loads((ROOT/'examples/eu_assessment.json').read_text())


def status(output, rule_id):
    return next(d['status'] for d in output['decisions'] if d['id'] == rule_id)


class EULegalTests(unittest.TestCase):
    def test_same_input_same_output(self):
        self.assertEqual(assess(PRODUCT, RULES), assess(PRODUCT, RULES))

    def test_gb_product_rejected(self):
        p = copy.deepcopy(PRODUCT)
        p['jurisdiction'] = 'GB'
        with self.assertRaises(InvalidAssessment):
            assess(p, RULES)

    def test_gb_rulebook_rejected(self):
        r = copy.deepcopy(RULES)
        r['jurisdiction'] = 'GB'
        with self.assertRaises(InvalidAssessment):
            assess(PRODUCT, r)

    def test_classification_must_be_approved(self):
        p = copy.deepcopy(PRODUCT)
        p['classification']['approved_by_user'] = False
        with self.assertRaises(InvalidAssessment):
            assess(p, RULES)

    def test_classification_missing_is_rejected(self):
        p = copy.deepcopy(PRODUCT)
        del p['classification']['hazard_categories']
        with self.assertRaises(InvalidAssessment):
            assess(p, RULES)

    def test_snapshot_date_guard(self):
        p = copy.deepcopy(PRODUCT)
        p['as_of'] = '2027-01-01'
        with self.assertRaises(InvalidAssessment):
            assess(p, RULES)

    def test_methanol_at_three_percent_requires_crf(self):
        out = assess(PRODUCT, RULES)
        self.assertEqual(status(out, 'EU-ANII-3.1.1.3-METHANOL'), 'REQUIRED')
        self.assertEqual(out['child_resistant_fastening'], 'REQUIRED_BY_ONE_OR_MORE_RULES')

    def test_methanol_below_threshold_not_an_exemption(self):
        p = copy.deepcopy(PRODUCT)
        p['ingredients']['67-56-1'] = 2.999
        out = assess(p, RULES)
        self.assertEqual(status(out, 'EU-ANII-3.1.1.3-METHANOL'), 'NOT_TRIGGERED_BY_THIS_RULE')
        self.assertEqual(out['child_resistant_fastening'], 'UNDETERMINED_RULESET_NOT_EXHAUSTIVE')

    def test_dichloromethane_threshold_one_percent(self):
        p = copy.deepcopy(PRODUCT)
        p['ingredients']['67-56-1'] = 0.0
        p['ingredients']['75-09-2'] = 1.0
        self.assertEqual(status(assess(p, RULES),'EU-ANII-3.1.1.3-DCM'), 'REQUIRED')

    def test_missing_concentration_never_means_exempt(self):
        p = copy.deepcopy(PRODUCT)
        del p['ingredients']['67-56-1']
        out = assess(p, RULES)
        self.assertEqual(status(out,'EU-ANII-3.1.1.3-METHANOL'),'INSUFFICIENT_DATA')
        self.assertEqual(out['child_resistant_fastening'],'UNDETERMINED_MISSING_FACTS_AND_PARTIAL_RULESET')

    def test_skin_corr_trigger(self):
        p = copy.deepcopy(PRODUCT)
        p['classification']['hazard_categories'].append('Skin Corr. 1A')
        out = assess(p, RULES)
        self.assertEqual(status(out,'EU-ANII-3.1.1.1'),'REQUIRED')
        self.assertEqual(status(out,'EU-ANII-3.2.1.1-OTHER'),'REQUIRED')

    def test_aspiration_aerosol_exemption_in_both_issue_rules(self):
        p = copy.deepcopy(PRODUCT)
        p['classification']['hazard_categories']=['Asp. Tox. 1']
        p['ingredients']['67-56-1']=0
        p['packaging']['is_aerosol']=True
        out=assess(p,RULES)
        self.assertEqual(status(out,'EU-ANII-3.1.1.2'),'NOT_TRIGGERED_BY_THIS_RULE')
        self.assertEqual(status(out,'EU-ANII-3.2.1.1-ASP'),'NOT_TRIGGERED_BY_THIS_RULE')

    def test_twd_flam_liq_two(self):
        self.assertEqual(status(assess(PRODUCT,RULES),'EU-ANII-3.2.1.1-OTHER'),'REQUIRED')

    def test_twd_transportable_gas_exception(self):
        p=copy.deepcopy(PRODUCT)
        p['packaging']['transportable_gas_receptacle']=True
        out=assess(p,RULES)
        self.assertEqual(status(out,'EU-ANII-3.2.1.1-OTHER'),'NOT_TRIGGERED_BY_THIS_RULE')

    def test_quantity_elsewhere_on_pack(self):
        p=copy.deepcopy(PRODUCT)
        p['packaging']['quantity_elsewhere_on_package']=True
        out=assess(p,RULES)
        self.assertEqual(status(out,'EU-17-1-B'),'NOT_TRIGGERED_BY_THIS_RULE')

    def test_warning_suppressed_when_danger(self):
        self.assertEqual(status(assess(PRODUCT,RULES),'EU-20-3'),'PROHIBITED')

    def test_ghs06_excludes_ghs07(self):
        p=copy.deepcopy(PRODUCT)
        p['classification']['pictogram_candidates']=['GHS06','GHS07']
        self.assertEqual(status(assess(p,RULES),'EU-26-1-B'),'PROHIBITED')

    def test_euh206_above_one_not_at_one(self):
        p=copy.deepcopy(PRODUCT)
        p['active_chlorine_percent']=1.0
        self.assertEqual(status(assess(p,RULES),'EU-ANII-2.6-CHLORINE'),'NOT_TRIGGERED_BY_THIS_RULE')
        p['active_chlorine_percent']=1.0001
        self.assertEqual(status(assess(p,RULES),'EU-ANII-2.6-CHLORINE'),'REQUIRED')

    def test_euh202(self):
        p=copy.deepcopy(PRODUCT)
        p['product_flags']['cyanoacrylate_adhesive']=True
        self.assertEqual(status(assess(p,RULES),'EU-ANII-2.2-CYANO'),'REQUIRED')

    def test_euh204_missing_exception_fact_is_unknown(self):
        p=copy.deepcopy(PRODUCT)
        p['product_flags']['contains_isocyanates']=True
        del p['product_flags']['isocyanates_already_identified_on_label']
        self.assertEqual(status(assess(p,RULES),'EU-ANII-2.4-ISOCYANATES'),'INSUFFICIENT_DATA')

    def test_source_references_present(self):
        out=assess(PRODUCT,RULES)
        self.assertTrue(all(x['source_pdf_page'] and x['legal_reference'] for x in out['decisions']))
        self.assertEqual(out['whole_label_compliance_verdict'], 'NOT_ASSESSED')

    def test_concentration_basis_guard(self):
        p=copy.deepcopy(PRODUCT)
        p['ingredient_concentration_basis']='percent_v_v'
        with self.assertRaises(InvalidAssessment):
            assess(p,RULES)


if __name__=='__main__':
    unittest.main()
