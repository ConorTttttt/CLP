"""EU packaging layout and category-scoped exemptions: independent regression tests."""
import copy
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from eu.physical_label.engine import assess, PhysicalLabelInputError
from eu.assessment import assess as combined, IntegratedAssessmentError

RULES=json.loads((ROOT/'eu/physical_label/rules.json').read_text())
SAMPLE=json.loads((ROOT/'examples/eu_phase3_product.json').read_text())

def case():
    p=copy.deepcopy(SAMPLE)
    p['packaging'].update({'structure':'outer_and_inner','outer_transport_labelling_required':False,
                           'has_intermediate_packaging':False,'inner_label_clearly_visible_through_outer':False,
                           'physical_label':{'width_mm':52,'height_mm':74,'pictogram_side_mm':16}})
    return p

def dec(report,section):
    return next(x for x in report['outer_inner_decisions'] if x['section']==section)

def sm(report,c):
    return next(x for x in report['small_pack_decisions'] if x['classification']==c)

class PhysicalLabelTests(unittest.TestCase):
    def test_article33_without_transport_outer_and_inner_required(self):
        r=assess(case(),RULES)
        self.assertEqual(dec(r,'outer_packaging')['status'],'REQUIRED')
        self.assertEqual(dec(r,'inner_packaging')['status'],'REQUIRED')

    def test_article33_visible_inner_makes_outer_optional(self):
        p=case();p['packaging']['inner_label_clearly_visible_through_outer']=True
        r=assess(p,RULES)
        self.assertEqual(dec(r,'outer_packaging')['status'],'NOT_REQUIRED_BY_THIS_PROVISION')
        self.assertEqual(dec(r,'inner_packaging')['status'],'REQUIRED')

    def test_article33_transport_outer_labelled(self):
        p=case(); p['packaging'].update({'outer_transport_labelling_required':True,'outer_transport_label_meets_rules':True})
        r=assess(p,RULES)
        self.assertEqual(dec(r,'outer_packaging')['status'],'PERMITTED_NOT_REQUIRED_BY_ARTICLE_33_1')
        self.assertEqual(dec(r,'inner_packaging')['status'],'REQUIRED')
        self.assertEqual(dec(r,'duplicate_pictograms')['status'],'PERMITTED_WITH_CONDITIONS')

    def test_article33_unknown_transport_fails_closed(self):
        p=case(); p['packaging'].pop('outer_transport_labelling_required')
        r=assess(p,RULES)
        self.assertEqual(dec(r,'outer_packaging')['status'],'REQUIRES_REVIEW')

    def test_article33_required_transport_unverified_not_assumed(self):
        p=case();p['packaging']['outer_transport_labelling_required']=True
        self.assertEqual(dec(assess(p,RULES),'outer_packaging')['status'],'REQUIRES_REVIEW')

    def test_article33_intermediate_packaging(self):
        p=case();p['packaging']['has_intermediate_packaging']=True
        self.assertEqual(dec(assess(p,RULES),'intermediate_packaging')['status'],'REQUIRED')

    def test_article33_single_package(self):
        p=case();p['packaging']['structure']='single';p['packaging']['single_transport_label_meets_rules']=True
        sections={d['section']:d['status'] for d in assess(p,RULES)['outer_inner_decisions']}
        self.assertEqual(sections['single_packaging'],'REQUIRED')
        self.assertEqual(sections['transport_label'],'REQUIRED')

    def test_125ml_is_inclusive_and_126_is_not(self):
        p=case();p['packaging']['capacity_ml']=125
        self.assertEqual(sm(assess(p,RULES),'Flam. Liq. 2')['status'],'PERMITTED_FOR_LINKED_ELEMENTS_ONLY')
        p['packaging']['capacity_ml']=125.01
        self.assertEqual(sm(assess(p,RULES),'Flam. Liq. 2')['status'],'NOT_PERMITTED_BY_THIS_PROVISION')

    def test_125ml_permission_does_not_cover_full_label(self):
        p=case();p['packaging']['capacity_ml']=100
        r=assess(p,RULES)
        self.assertEqual(sm(r,'Flam. Liq. 2')['permitted_elements'],
                         ['H_STATEMENTS_LINKED_TO_THIS_CATEGORY','P_STATEMENTS_LINKED_TO_THIS_CATEGORY'])
        self.assertEqual(r['whole_label_compliance'],'NOT_ASSESSED')
        self.assertTrue(all(d['no_automatic_omission'] for d in r['small_pack_decisions']))

    def test_mixed_eligible_and_unindexed_category_no_blanket_exemption(self):
        p=case();p['packaging']['capacity_ml']=100
        p['classification']['hazard_categories']=['Flam. Liq. 2','Resp. Sens. 1']
        r=assess(p,RULES)
        self.assertEqual(sm(r,'Flam. Liq. 2')['status'],'PERMITTED_FOR_LINKED_ELEMENTS_ONLY')
        self.assertEqual(sm(r,'Resp. Sens. 1')['status'],'REQUIRES_REVIEW')

    def test_public_acute_tox_four_cannot_use_125ml_exception(self):
        p=case();p['packaging']['capacity_ml']=125
        p['classification']['hazard_categories']=['Acute Tox. 4']
        self.assertEqual(sm(assess(p,RULES),'Acute Tox. 4')['status'],'NOT_PERMITTED_BY_THIS_PROVISION')

    def test_professional_acute_tox_four_can(self):
        p=case();p['packaging']['capacity_ml']=125;p['packaging']['general_public']=False
        p['classification']['hazard_categories']=['Acute Tox. 4']
        self.assertEqual(sm(assess(p,RULES),'Acute Tox. 4')['status'],'PERMITTED_FOR_LINKED_ELEMENTS_ONLY')

    def test_unknown_audience_prevents_acute_tox_four_exemption(self):
        p=case();p['packaging']['capacity_ml']=125;p['packaging'].pop('general_public')
        p['classification']['hazard_categories']=['Acute Tox. 4']
        self.assertEqual(sm(assess(p,RULES),'Acute Tox. 4')['status'],'REQUIRES_REVIEW')

    def test_chronic3_smallpack_only_precautions(self):
        p=case();p['packaging']['capacity_ml']=125
        p['classification']['hazard_categories']=['Aquatic Chronic 3']
        self.assertEqual(sm(assess(p,RULES),'Aquatic Chronic 3')['permitted_elements'],
                         ['P_STATEMENTS_LINKED_TO_THIS_CATEGORY'])

    def test_metal_corrosion_all_linked_elements(self):
        p=case();p['packaging']['capacity_ml']=125
        p['classification']['hazard_categories']=['Met. Corr. 1']
        self.assertEqual(len(sm(assess(p,RULES),'Met. Corr. 1')['permitted_elements']),4)

    def test_volume_boundary_3000_if_possible(self):
        p=case();p['packaging']['capacity_ml']=3000
        r=assess(p,RULES)
        self.assertEqual(r['dimension_decisions'][0]['capacity_row_qualifier'],'IF_POSSIBLE')
        p['packaging']['capacity_ml']=3001
        self.assertEqual(assess(p,RULES)['dimension_decisions'][0]['reference_label_dimensions_mm'],[74,105])

    def test_dimensions_missing_review_not_pass(self):
        p=case();p['packaging'].pop('physical_label')
        statuses=[x['status'] for x in assess(p,RULES)['dimension_decisions']]
        self.assertIn('REQUIRES_REVIEW',statuses)
        self.assertNotIn('COMPLIANT',statuses)

    def test_dimensions_bad_larger_pack_require_review(self):
        p=case();p['packaging']['capacity_ml']=4000
        r=assess(p,RULES)
        self.assertIn('POTENTIAL_DIMENSION_DEFICIENCY_REQUIRES_REVIEW',
                      [x['status'] for x in r['dimension_decisions']])

    def test_dimensions_3l_minimum_10_pict(self):
        p=case();p['packaging']['physical_label']['pictogram_side_mm']=9.99
        r=assess(p,RULES)
        self.assertEqual(r['dimension_decisions'][-1]['status'],'POTENTIAL_DIMENSION_DEFICIENCY_REQUIRES_REVIEW')

    def test_no_gb_cross_contamination(self):
        p=case();p['jurisdiction']='GB'
        with self.assertRaises(PhysicalLabelInputError):assess(p,RULES)
        r=copy.deepcopy(RULES);r['jurisdiction']='GB'
        with self.assertRaises(PhysicalLabelInputError):assess(case(),r)

    def test_source_trace(self):
        r=assess(case(),RULES)
        for section in ('outer_inner_decisions','small_pack_decisions','dimension_decisions'):
            for d in r[section]:
                self.assertTrue(d['legal_reference'])
                self.assertGreater(d['source_pdf_page'],0)

    def test_invalid_input_rejected(self):
        for key,val in [('capacity_ml',0),('capacity_ml',True),('general_public','yes')]:
            p=case();p['packaging'][key]=val
            with self.subTest(key=key,val=val),self.assertRaises(PhysicalLabelInputError):
                assess(p,RULES)

    def test_combined_phase3_contains_physical_decisions(self):
        r=combined(case())
        self.assertEqual(r['physical_labelling_and_packaging']['outer_inner_decisions'][0]['status'],'REQUIRED')
        self.assertFalse(r['label_ready_for_use'])

    def test_combined_missing_structure_is_a_blocker(self):
        r=combined(SAMPLE)
        self.assertTrue(any(x.get('module')=='EU_PHYSICAL_LABEL' and
                            x.get('section')=='package_structure' for x in r['blocking_items']))

    def test_combined_rejects_gb_physical_rulebook(self):
        bad=copy.deepcopy(RULES);bad['jurisdiction']='GB'
        with self.assertRaises(IntegratedAssessmentError):combined(case(),physical=bad)

    def test_deterministic(self):
        self.assertEqual(assess(case(),RULES),assess(case(),RULES))
        self.assertEqual(combined(case()),combined(case()))

if __name__=='__main__':unittest.main()
