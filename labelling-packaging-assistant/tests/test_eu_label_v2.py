"""Regression tests: explicit source-derived mapping and provisional Annex IV policy."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'eu/label_v2'))
from selector import assess, InvalidInput  # noqa:E402

EXAMPLE=json.loads((ROOT/'examples/eu_label_v2_product.json').read_text())
MAPPING=json.loads((ROOT/'eu/label_v2/annex_i_mapping.json').read_text())
POLICY=json.loads((ROOT/'eu/label_v2/annex_iv_policy.json').read_text())


def product(*classes, general_public=True):
    p=copy.deepcopy(EXAMPLE)
    p['classification']['hazard_categories']=list(classes)
    p['classification'].pop('hazard_statements',None)
    p['packaging']['general_public']=general_public
    return p


def pstatus(report,code):
    return next(r['status'] for r in report['precautionary_candidate_decisions'] if r['code']==code)


class EUAnnexTests(unittest.TestCase):
    def test_thirteen_supported_classifications(self):
        self.assertEqual(len(MAPPING['entries']),13)

    def test_flammable_category_two_elements(self):
        r=assess(product('Flam. Liq. 2'))
        self.assertEqual(r['label_elements_draft']['signal_word'],'Danger')
        self.assertEqual(r['label_elements_draft']['hazard_pictograms'],['GHS02'])
        self.assertEqual([h['code'] for h in r['label_elements_draft']['hazard_statements_en']],['H225'])

    def test_flammable_category_three_warning(self):
        r=assess(product('Flam. Liq. 3'))
        self.assertEqual(r['label_elements_draft']['signal_word'],'Warning')
        self.assertEqual(r['label_elements_draft']['hazard_statements_en'][0]['code'],'H226')

    def test_eye_irritation_label_elements(self):
        r=assess(product('Eye Irrit. 2'))
        self.assertEqual(r['label_elements_draft']['hazard_pictograms'],['GHS07'])
        self.assertEqual(r['label_elements_draft']['hazard_statements_en'][0]['code'],'H319')

    def test_skin_irritation_label_elements(self):
        r=assess(product('Skin Irrit. 2'))
        self.assertEqual(r['label_elements_draft']['hazard_statements_en'][0]['code'],'H315')

    def test_skin_sensitisation_subcategories(self):
        for cat in ('1','1A','1B'):
            self.assertEqual(assess(product('Skin Sens. '+cat))['label_elements_draft']['hazard_statements_en'][0]['code'],'H317')

    def test_danger_precedes_warning(self):
        r=assess(product('Eye Irrit. 2','Flam. Liq. 2'))
        self.assertEqual(r['label_elements_draft']['signal_word'],'Danger')
        self.assertEqual(r['label_elements_draft']['hazard_pictograms'],['GHS02','GHS07'])

    def test_ghs05_suppresses_ghs07_for_skin_eye_irritation(self):
        r=assess(product('Eye Irrit. 2','Skin Corr. 1'))
        self.assertEqual(r['label_elements_draft']['hazard_pictograms'],['GHS05'])
        self.assertEqual(r['label_elements_draft']['pictogram_precedence_decisions'][0]['rule'], 'EU CLP Article 26(1)(c)')

    def test_ghs07_retained_when_skin_sens_requires_it(self):
        r=assess(product('Skin Sens. 1','Skin Corr. 1A'))
        self.assertEqual(r['label_elements_draft']['hazard_pictograms'],['GHS05','GHS07'])

    def test_h318_optional_redundancy_documented(self):
        r=assess(product('Skin Corr. 1','Eye Dam. 1'))
        self.assertEqual([x['code'] for x in r['label_elements_draft']['hazard_statements_en']],['H314'])
        self.assertEqual(r['label_elements_draft']['omitted_hazard_statements'][0]['code'],'H318')

    def test_all_hazard_statements_have_page_and_table(self):
        r=assess(EXAMPLE)
        self.assertTrue(all(x['pdf_page'] and x['legal_reference'] for x in r['label_elements_draft']['hazard_statements_en']))

    def test_eu_gb_separation(self):
        p=product('Flam. Liq. 2')
        p['jurisdiction']='GB'
        with self.assertRaises(InvalidInput):assess(p)

    def test_rulebook_gb_rejected(self):
        r=copy.deepcopy(MAPPING)
        r['jurisdiction']='GB'
        with self.assertRaises(InvalidInput):assess(product('Flam. Liq. 2'),r)

    def test_date_mismatch_rejected(self):
        p=product('Flam. Liq. 2');p['as_of']='2027-01-01'
        with self.assertRaises(InvalidInput):assess(p)

    def test_user_approval_required(self):
        p=product('Flam. Liq. 2');p['classification']['approved_by_user']=False
        with self.assertRaises(InvalidInput):assess(p)

    def test_unsupported_classification_blocks_completeness(self):
        r=assess(product('Resp. Sens. 1'))
        self.assertEqual(r['unsupported_classifications'],['Resp. Sens. 1'])
        self.assertFalse(r['label_ready_for_use'])

    def test_contradictory_eye_categories_blocked(self):
        r=assess(product('Eye Dam. 1','Eye Irrit. 2'))
        self.assertTrue(any(x['code']=='CONFLICTING_MANUAL_CLASSIFICATIONS' for x in r['blockers']))

    def test_mismatch_supplied_H_statement_blocks(self):
        p=product('Flam. Liq. 2');p['classification']['hazard_statements']=['H226']
        r=assess(p)
        self.assertTrue(any(x['code']=='APPROVED_CLASSIFICATION_H_STATEMENT_MISMATCH' for x in r['blockers']))

    def test_volatile_conditional_p233(self):
        p=product('Flam. Liq. 2');p['use_context']['volatile_explosive_atmosphere']=False
        self.assertEqual(pstatus(assess(p),'P233'),'OMITTED_CONDITION_NOT_MET')
        p['use_context']['volatile_explosive_atmosphere']=None
        self.assertEqual(pstatus(assess(p),'P233'),'NEEDS_INPUT')

    def test_p243_is_conditional(self):
        p=product('Flam. Liq. 2');p['use_context']['volatile_explosive_atmosphere']=False
        self.assertEqual(pstatus(assess(p),'P243'),'OMITTED_CONDITION_NOT_MET')

    def test_p242_requires_low_ignition_energy(self):
        p=product('Flam. Liq. 2');p['use_context']['very_low_ignition_energy_lt_0_1_mJ']=False
        self.assertEqual(pstatus(assess(p),'P242'),'OMITTED_CONDITION_NOT_MET')
        p['use_context']['very_low_ignition_energy_lt_0_1_mJ']=True
        self.assertNotEqual(pstatus(assess(p),'P242'),'OMITTED_CONDITION_NOT_MET')
        del p['use_context']['very_low_ignition_energy_lt_0_1_mJ']
        self.assertEqual(pstatus(assess(p),'P242'),'NEEDS_INPUT')

    def test_P370_condition_from_annex_iv(self):
        p=product('Flam. Liq. 2')
        p['use_context']['water_increases_fire_risk']=False
        self.assertEqual(pstatus(assess(p),'P370+P378'),'OMITTED_CONDITION_NOT_MET')
        p['use_context']['water_increases_fire_risk']=True
        p['supplier_wording']['extinguishing_media']='dry powder'
        self.assertNotEqual(pstatus(assess(p),'P370+P378'),'OMITTED_CONDITION_NOT_MET')
        del p['supplier_wording']['extinguishing_media']
        self.assertEqual(pstatus(assess(p),'P370+P378'),'NEEDS_INPUT')

    def test_p501_needs_supplier_wording(self):
        p=product('Flam. Liq. 2')
        del p['supplier_wording']['disposal_route']
        self.assertEqual(pstatus(assess(p),'P501'),'NEEDS_INPUT')

    def test_p280_needs_approved_wording(self):
        p=product('Eye Irrit. 2')
        p['supplier_wording']['approved_by_user']=False
        self.assertEqual(pstatus(assess(p),'P280'),'NEEDS_INPUT')

    def test_consumer_general_p102_is_candidate(self):
        self.assertIn('P102',[x['code'] for x in assess(product('Flam. Liq. 2'))['precautionary_candidate_decisions']])

    def test_pro_lacks_consumer_general_p102(self):
        self.assertNotIn('P102',[x['code'] for x in assess(product('Flam. Liq. 2',general_public=False))['precautionary_candidate_decisions']])

    def test_annex_iv_skin_irritation_redundancy(self):
        r=assess(product('Skin Irrit. 2','Skin Sens. 1'))
        self.assertEqual(pstatus(r,'P332+P313'),'OMITTED_AS_REDUNDANT_UNDER_ANNEX_IV')

    def test_six_statement_draft_cap(self):
        r=assess(EXAMPLE)
        self.assertLessEqual(len(r['label_elements_draft']['selected_precautionary_statements_en']),6)
        self.assertTrue(any(x['status']=='OMITTED_BY_DRAFT_SIX_STATEMENT_POLICY' for x in r['precautionary_candidate_decisions']))

    def test_reordered_hazards_same_decision(self):
        p=product('Eye Irrit. 2','Flam. Liq. 2')
        q=product('Flam. Liq. 2','Eye Irrit. 2')
        a=assess(p);b=assess(q)
        self.assertEqual(a['label_elements_draft'],b['label_elements_draft'])
        self.assertEqual(a['precautionary_candidate_decisions'],b['precautionary_candidate_decisions'])

    def test_repeatable_and_no_compliance_claims(self):
        p=product('Flam. Liq. 2')
        a,b=assess(p),assess(p)
        self.assertEqual(a,b)
        self.assertIs(a['label_ready_for_use'],False)
        self.assertEqual(a['full_clp_compliance_verdict'],'NOT_ASSESSED')

    def test_all_policy_entries_trace_to_annex_iv(self):
        self.assertTrue(all(x['pdf_page'] and x['annex_iv_reference'] for x in POLICY['policy'].values()))


if __name__=='__main__':unittest.main()
