"""Partial EU-only CLP physical labelling/packaging decisions.

Use independently user-approved classifications and packaging descriptions.
Never infer a complete label exemption from small-pack category permissions.
No compliance certification or change to a user's artwork is performed.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent


class PhysicalLabelInputError(ValueError):
    pass


def _field(obj, key, typ):
    val = obj.get(key)
    if val is not None and type(val) is not typ:
        raise PhysicalLabelInputError(f'{key} must be {typ.__name__} or absent/null')
    return val


def _positive(obj, key):
    val = obj.get(key)
    if val is not None and (type(val) not in (int, float) or not math.isfinite(val) or val <= 0):
        raise PhysicalLabelInputError(f'{key} must be positive numeric or absent/null')
    return val


def _decision(section, status, reference, page, reason, **details):
    return {'section': section, 'status': status, 'legal_reference': reference,
            'source_pdf_page': page, 'reason': reason, **details}


def _layers(pack, rules):
    structure = pack.get('structure')
    if structure not in ('single', 'outer_and_inner', None):
        raise PhysicalLabelInputError('packaging.structure must be single or outer_and_inner')
    cite, page = rules['article33']['legal_reference'], rules['article33']['source_pdf_page']
    decisions = []
    if structure is None:
        return [_decision('package_structure', 'REQUIRES_REVIEW', cite, page,
                          'Package structure was not supplied; Article 33 layer obligations cannot be assigned.',
                          missing_fields=['packaging.structure'])]
    if structure == 'single':
        transport = _field(pack, 'single_transport_label_meets_rules', bool)
        decisions.append(_decision('single_packaging', 'REQUIRED',
                                  'EU CLP Articles 17 and 33(3)' if transport is True else 'EU CLP Article 17',
                                  page, 'A single packaged product must carry the applicable CLP label elements.',
                                  layer='single'))
        if transport is True:
            decisions.append(_decision('transport_label', 'REQUIRED', 'EU CLP Article 33(3)', page,
                                      'When the single package meets dangerous-goods transport labelling provisions, both transport and CLP labelling apply.',
                                      layer='single'))
            decisions.append(_decision('duplicate_pictograms', 'PERMITTED_WITH_CONDITIONS',
                                      'EU CLP Article 33(3)', page,
                                      'Only CLP pictograms covering the same hazard as transport pictograms may be omitted; equivalence must be verified independently. No pictograms are removed automatically.',
                                      layer='single'))
        elif transport is None:
            decisions.append(_decision('transport_status', 'REQUIRES_REVIEW', 'EU CLP Article 33(3)', page,
                                      'Transport labelling status is unknown; assess both CLP and any transport obligations.',
                                      missing_fields=['packaging.single_transport_label_meets_rules']))
        return decisions

    required = _field(pack, 'outer_transport_labelling_required', bool)
    met = _field(pack, 'outer_transport_label_meets_rules', bool)
    intermediate = _field(pack, 'has_intermediate_packaging', bool)
    decisions.append(_decision('inner_packaging', 'REQUIRED', 'EU CLP Article 33(1)–(2)', page,
                              'CLP labelling of inner packaging is required for packages with outer and inner layers.', layer='inner'))
    if intermediate is True:
        decisions.append(_decision('intermediate_packaging', 'REQUIRED', 'EU CLP Article 33(1)–(2)', page,
                                  'Intermediate packaging must carry applicable CLP labelling.', layer='intermediate'))
    if intermediate is None:
        decisions.append(_decision('intermediate_presence', 'REQUIRES_REVIEW', 'EU CLP Article 33(1)–(2)', page,
                                  'Whether intermediate packaging exists was not supplied.',
                                  missing_fields=['packaging.has_intermediate_packaging']))
    if required is True and met is True:
        decisions.append(_decision('outer_packaging', 'PERMITTED_NOT_REQUIRED_BY_ARTICLE_33_1',
                                  'EU CLP Article 33(1)', page,
                                  'When outer packaging meets dangerous-goods transport labelling provisions, an additional CLP label is optional; inner/intermediate CLP labels remain required.', layer='outer'))
        decisions.append(_decision('duplicate_pictograms', 'PERMITTED_WITH_CONDITIONS',
                                  'EU CLP Article 33(1)', page,
                                  'If CLP pictograms appear on the outer package, only those corresponding to the same transport hazard may be omitted; equivalence is not checked here.',layer='outer'))
    elif required is False:
        visible = _field(pack, 'inner_label_clearly_visible_through_outer', bool)
        if visible is True:
            decisions.append(_decision('outer_packaging', 'NOT_REQUIRED_BY_THIS_PROVISION',
                                      'EU CLP Article 33(2)', page,
                                      'A visible inner/intermediate CLP label permits the outer packaging to remain without a separate CLP label; all other conditions must be satisfied.',layer='outer'))
        elif visible is False:
            decisions.append(_decision('outer_packaging', 'REQUIRED', 'EU CLP Article 33(2)', page,
                                      'When no dangerous-goods transport label is required and the inner label is not clearly visible, the outer packaging requires CLP labelling.',layer='outer'))
        else:
            decisions.append(_decision('outer_packaging', 'REQUIRES_REVIEW', 'EU CLP Article 33(2)', page,
                                      'Cannot decide outer CLP label exception without clear visibility fact.',
                                      missing_fields=['packaging.inner_label_clearly_visible_through_outer'],layer='outer'))
    else:
        decisions.append(_decision('outer_packaging', 'REQUIRES_REVIEW', 'EU CLP Article 33(1)–(2)', page,
                                  'Transport labelling requirements and/or their satisfaction must be established before applying either Article 33 branch.',
                                  missing_fields=[f'packaging.{x}' for x, v in [('outer_transport_labelling_required',required),('outer_transport_label_meets_rules',met)] if v is None],layer='outer'))
    return decisions


def _small_pack(pack, categories, rules):
    cap = _positive(pack, 'capacity_ml')
    public = _field(pack, 'general_public', bool)
    items = {r['classification']:r for r in rules['small_pack']['categories']}
    output = []
    for c in categories:
        rule = items.get(c)
        if cap is None:
            status, why = 'REQUIRES_REVIEW', 'Pack content volume was not provided; no 125 ml exemption can be established.'
        elif cap > 125:
            status, why = 'NOT_PERMITTED_BY_THIS_PROVISION', 'Contents exceed the 125 ml maximum for these exemptions.'
        elif rule is None:
            status, why = 'REQUIRES_REVIEW', 'Category is not indexed in this partial small-pack register; no exemption can be inferred.'
        elif rule.get('general_public_must_be') is False and public is None:
            status, why = 'REQUIRES_REVIEW', 'This hazard category may use the exemption only for supply other than to the general public.'
        elif rule.get('general_public_must_be') is False and public is True:
            status, why = 'NOT_PERMITTED_BY_THIS_PROVISION', 'The non-public-only condition is not met.'
        else:
            status, why = 'PERMITTED_FOR_LINKED_ELEMENTS_ONLY', 'The listed elements linked to THIS classification may be omitted; no change is authorised for other hazard categories or general label information.'
        output.append(_decision('small_pack_classification',status,
                                rule['legal_reference'] if rule else rules['small_pack']['legal_reference'],
                                rule['source_pdf_page'] if rule else 74,
                                why,classification=c,
                                permitted_elements=rule['permitted_omissions'] if status=='PERMITTED_FOR_LINKED_ELEMENTS_ONLY' else [],
                                no_automatic_omission=True))
    if not categories:
        output.append(_decision('small_pack_classification','REQUIRES_REVIEW',
                                rules['small_pack']['legal_reference'],74,
                                'No approved hazard classes were supplied: cannot determine category-specific small-pack exemptions.'))
    return output


def _dimensions(pack,rules):
    size=rules['dimensions']; cite=size['legal_reference']
    cap=_positive(pack,'capacity_ml')
    if cap is None:
        return [_decision('label_dimensions','REQUIRES_REVIEW',cite,70,
                          'Package volume required to select minimum label and pictogram dimensions.',
                          missing_fields=['packaging.capacity_ml'])]
    row=next(r for r in size['capacity_rows'] if cap>r['min_ml_exclusive'] and (r['max_ml_inclusive'] is None or cap<=r['max_ml_inclusive']))
    label=pack.get('physical_label')
    label=label if label is not None else {}
    if not isinstance(label,dict):
        raise PhysicalLabelInputError('packaging.physical_label must be an object or absent')
    w=_positive(label,'width_mm');h=_positive(label,'height_mm'); pict=_positive(label,'pictogram_side_mm')
    ref={'capacity_ml':cap,'reference_label_dimensions_mm':row['label_mm'],
         'reference_pictogram_min_side_mm':row['pictogram_min_side_mm'],
         'capacity_row_qualifier':row['label_size_qualifier'],'artwork_standards_verified':False}
    output=[_decision('dimensional_reference','REFERENCE_ONLY_NOT_APPROVED',cite,row['pdf_pages'][0],
                      'This is the Annex I Table 1.3 size row, not approval of actual artwork.',**ref)]
    if w is None or h is None:
        output.append(_decision('label_dimensions','REQUIRES_REVIEW',cite,row['pdf_pages'][0],
                                'Physical label measurements not supplied.',
                                missing_fields=[f'packaging.physical_label.{n}' for n, v in [('width_mm',w),('height_mm',h)] if v is None]))
    else:
        meets=min(w,h)>=row['label_mm'][0] and max(w,h)>=row['label_mm'][1]
        if meets:
            status='MEETS_DECLARED_TABLE_SIZE_REFERENCE'
            why='Provided dimensions meet the Table 1.3 row; other CLP format requirements remain unassessed.'
        elif row['label_size_qualifier']=='IF_POSSIBLE':
            status='REQUIRES_REVIEW_IF_POSSIBLE'
            why='For packages ≤3 L, the 52×74 mm label dimension is qualified “if possible”; absence of space/evidence must be reviewed.'
        else:
            status='POTENTIAL_DIMENSION_DEFICIENCY_REQUIRES_REVIEW'
            why='Declared dimensions fall below the applicable Table 1.3 minimum; verify measurements and any applicable derogation.'
        output.append(_decision('label_dimensions',status,cite,row['pdf_pages'][0],why,
                                declared_width_mm=w,declared_height_mm=h))
    if pict is None:
        output.append(_decision('pictogram_dimensions','REQUIRES_REVIEW',cite,row['pdf_pages'][0],
                                'Pictogram size and original artwork must be verified.',
                                missing_fields=['packaging.physical_label.pictogram_side_mm']))
    else:
        meets=pict>=row['pictogram_min_side_mm']
        output.append(_decision('pictogram_dimensions',
                                'MEETS_DECLARED_TABLE_SIZE_REFERENCE' if meets else 'POTENTIAL_DIMENSION_DEFICIENCY_REQUIRES_REVIEW',
                                cite,row['pdf_pages'][0],
                                'Declared pictogram side meets the table reference, subject to shape/colour/area/artwork checks.' if meets else 'Declared pictogram side is smaller than the table minimum.',
                                declared_side_mm=pict,
                                preferred_side_mm=row.get('preferred_pictogram_side_mm')))
    return output


def assess(product,rules):
    if not isinstance(product,dict) or not isinstance(rules,dict):
        raise PhysicalLabelInputError('Product and ruleset must both be objects')
    if product.get('jurisdiction')!='EU' or rules.get('jurisdiction')!='EU':
        raise PhysicalLabelInputError('EU physical-label rules cannot be used for GB.')
    if product.get('as_of')!=rules.get('as_of'):
        raise PhysicalLabelInputError('Assessment date must match EU rulebook snapshot.')
    cls=product.get('classification')
    if not isinstance(cls,dict) or cls.get('approved_by_user') is not True:
        raise PhysicalLabelInputError('User-approved classification is required.')
    cat=cls.get('hazard_categories')
    if not isinstance(cat,list) or any(not isinstance(x,str) or not x for x in cat):
        raise PhysicalLabelInputError('Explicit hazard_categories string list is required.')
    pack=product.get('packaging')
    if not isinstance(pack,dict) or pack.get('packaged') is not True:
        raise PhysicalLabelInputError('Only packaged product input is supported in this module.')
    output={'jurisdiction':'EU','as_of':product['as_of'],'ruleset_id':rules['id'],
            'legal_validation_status':'PARTIAL_NOT_APPROVED','whole_label_compliance':'NOT_ASSESSED',
            'outer_inner_decisions':_layers(pack,rules),
            'small_pack_decisions':_small_pack(pack,cat,rules),
            'dimension_decisions':_dimensions(pack,rules),
            'limitations':rules['scope_notes']}
    return output


def main():
    import argparse
    p=argparse.ArgumentParser(description='EU physical labelling and packaging audit (partial).')
    p.add_argument('product',type=Path)
    args=p.parse_args()
    product=json.loads(args.product.read_text(encoding='utf-8'))
    rules=json.loads((HERE/'rules.json').read_text(encoding='utf-8'))
    print(json.dumps(assess(product,rules),indent=2,ensure_ascii=False))

if __name__=='__main__':main()
