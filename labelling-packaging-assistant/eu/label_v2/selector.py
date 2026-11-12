"""EU-only mapping from approved CLP classes to *draft* label elements.

All regulatory choices are deterministic and independently traceable to source
sections. The P-statement selector is intentionally NOT COMPLETE. Missing
context and unsupported categories always block regulatory sign-off.

No external packages, no model decisions, and no GB rulebook fallbacks.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent


class InvalidInput(ValueError):
    pass


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def stable_hash(value: Any) -> str:
    content = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def _flag(context: dict, field: str):
    val = context.get(field)
    return val if type(val) is bool else None


def _wording(input_data: dict, field: str):
    value = input_data.get('supplier_wording', {}).get(field)
    approved = _flag(input_data.get('supplier_wording', {}), 'approved_by_user')
    if approved is True and isinstance(value, str) and value.strip() and len(value) <= 300:
        return value.strip()
    return None


def _condition(code: str, entry: dict, product: dict, class_names: set[str]):
    """Return (True/False/None, reason, text). None means data missing.

    'ALWAYS' here means admitted by this demo selection *policy*, not a legal
    conclusion that the particular precaution is invariably mandatory.
    """
    kind = entry['condition']
    temp = entry['english_template']
    ctx = product.get('use_context', {})
    packaged = product.get('packaging', {})
    if kind == 'ALWAYS':
        return True, 'Included by versioned policy for an Annex I candidate.', temp
    if kind == 'CONSUMER_GENERAL':
        public = _flag(packaged, 'general_public')
        return (public, 'General precaution appropriate for consumer products; internal default policy.', temp)
    if kind == 'PROFESSIONAL_ONLY':
        public = _flag(packaged, 'general_public')
        return (None if public is None else not public, 'Workplace-specific precaution; requires professional-use context.', temp)
    if kind == 'FLAG_LOW_IGNITION_ENERGY':
        volatile = _flag(ctx, 'volatile_explosive_atmosphere')
        low_energy = _flag(ctx, 'very_low_ignition_energy_lt_0_1_mJ')
        if volatile is False or low_energy is False:
            return False, 'Annex IV P242: volatile/explosive-atmosphere and <0.1 mJ ignition-energy conditions not both met.', temp
        if volatile is None or low_energy is None:
            return None, 'Annex IV P242: requires verified explosive-atmosphere and very-low-ignition-energy facts.', None
        return True, 'Both conditional flammable-liquid P242 criteria are present.', temp
    if kind == 'FLAG_VOLATILE':
        value = _flag(ctx, 'volatile_explosive_atmosphere')
        return value, 'Annex IV: for liquids volatile enough to form an explosive atmosphere.', temp
    if kind == 'FLAMMABLE_STORAGE':
        if 'Flam. Liq. 1' in class_names:
            return True, 'Annex IV: P403+P235 applies to flammable liquids category 1.', temp
        value = _flag(ctx, 'volatile_explosive_atmosphere')
        return value, 'Annex IV: other flammable liquids only when volatile and may form an explosive atmosphere.', temp
    if kind == 'FLAG_WATER_AND_WORDING':
        value = _flag(ctx, 'water_increases_fire_risk')
        if value is None or value is False:
            return value, 'Annex IV: P370+P378 if water increases the risk.', None if value is None else temp
        v = _wording(product, 'extinguishing_media')
        return (True, 'Appropriate extinguishing medium supplied and user-approved.', temp.format(extinguishing_media=v)) if v else (None, 'Supplier-approved extinguishing medium missing.', None)
    substitutions = {
        'WORDING_PPE': ('ppe', None),
        'WORDING_DISPOSAL': ('disposal_route', 'disposal_route'),
        'WORDING_WASH': ('wash_after_handling', 'wash_after_handling'),
        'WORDING_INHALATION': ('inhalation_forms', 'inhalation_forms'),
        'WORDING_EMERGENCY': ('emergency_contact', 'emergency_contact'),
        'WORDING_NO_BREATHE': ('no_breathe_forms', 'no_breathe_forms'),
    }
    if kind in substitutions:
        key, slot = substitutions[kind]
        value = _wording(product, key)
        if value is None:
            return None, f'Annex IV wording requires user-approved supplier input: {key}.', None
        if kind == 'WORDING_PPE':
            return True, 'Supplier-approved PPE wording. Legal acceptability still requires review.', f'Wear {value}.'
        return True, 'Supplier-approved wording for Annex IV placeholder; legal acceptability still requires review.', temp.replace('{' + slot + '}', value)
    raise InvalidInput(f'Unknown selection condition: {kind}')


def assess(product: dict, mapping: dict | None = None, policy: dict | None = None) -> dict:
    mapping = mapping if mapping is not None else load_json(ROOT/'annex_i_mapping.json')
    policy = policy if policy is not None else load_json(ROOT/'annex_iv_policy.json')
    if any(x.get('jurisdiction') != 'EU' for x in (product, mapping, policy)):
        raise InvalidInput('EU-only. GB must be assessed by its own separate system.')
    if product.get('as_of') != mapping.get('as_of') or product.get('as_of') != policy.get('as_of'):
        raise InvalidInput('Snapshot/date mismatch; do not silently apply a different version of the law.')
    c = product.get('classification')
    if not isinstance(c, dict) or c.get('approved_by_user') is not True:
        raise InvalidInput('Manual classification must be approved by the user.')
    classes = c.get('hazard_categories')
    if not isinstance(classes, list) or any(not isinstance(s, str) for s in classes) or len(set(classes)) != len(classes):
        raise InvalidInput('Provide unique canonical CLP hazard categories as a string list.')
    if not isinstance(product.get('packaging'), dict) or not isinstance(product.get('use_context'), dict):
        raise InvalidInput('Packaging and use_context objects are mandatory, even if some fields are unknown.')

    look = {e['classification']: e for e in mapping['entries']}
    unknown = sorted(set(classes)-set(look))
    supported = [look[k] for k in sorted(set(classes)&set(look))]
    warnings = []
    blocking = []
    if unknown:
        blocking.append({'code':'UNSUPPORTED_HAZARD_CATEGORIES','details':unknown,
                         'effect':'Partial data only. No complete label determination.'})
    if not classes:
        blocking.append({'code':'NO_CLASSES','effect':'Cannot determine if product is hazardous or unclassified without separate reviewed scope logic.'})

    conflicts = {
        'Flam. Liq.': [x for x in classes if x.startswith('Flam. Liq.')],
        'Skin Corr.': [x for x in classes if x.startswith('Skin Corr.')],
        'Skin Sens.': [x for x in classes if x.startswith('Skin Sens.')],
    }
    for grp, hits in conflicts.items():
        if len(hits) > 1:
            blocking.append({'code':'CONFLICTING_MANUAL_CLASSIFICATIONS','hazard_class':grp,'details':sorted(hits)})
    if 'Eye Dam. 1' in classes and 'Eye Irrit. 2' in classes:
        blocking.append({'code':'CONFLICTING_MANUAL_CLASSIFICATIONS','hazard_class':'Eye damage / irritation'})
    if any(x.startswith('Skin Corr.') for x in classes) and 'Skin Irrit. 2' in classes:
        blocking.append({'code':'CONFLICTING_MANUAL_CLASSIFICATIONS','hazard_class':'Skin corrosion / irritation'})
    if not isinstance(product.get('market_member_state'), str) or not product['market_member_state'].strip():
        blocking.append({'code':'EU_MEMBER_STATE_MISSING','effect':'Cannot resolve legal label language.'})
    else:
        warnings.append('Member-State official language(s) and local exceptions NOT validated. English text below is illustrative only.')

    signal_candidates = sorted({e['signal_word'] for e in supported})
    signal = 'Danger' if 'Danger' in signal_candidates else ('Warning' if 'Warning' in signal_candidates else None)
    pictogram_by_source = {}
    for e in supported:
        pictogram_by_source.setdefault(e['pictogram'], []).append(e['classification'])
    pictograms = set(pictogram_by_source)
    pictogram_decisions=[]
    if 'GHS05' in pictograms and 'GHS07' in pictograms:
        from_g07 = set(pictogram_by_source['GHS07'])
        if from_g07 <= {'Skin Irrit. 2', 'Eye Irrit. 2'}:
            pictograms.discard('GHS07')
            pictogram_decisions.append({'rule':'EU CLP Article 26(1)(c)','action':'OMIT_GHS07',
                                        'reason':'GHS07 solely due to skin or eye irritation; GHS05 applies.',
                                        'classification_evidence':sorted(from_g07)})
        else:
            pictogram_decisions.append({'rule':'EU CLP Article 26(1)(c)','action':'RETAIN_GHS07',
                                        'reason':'Skin sensitisation also requires GHS07; GHS05 only suppresses it for irritation.',
                                        'classification_evidence':sorted(from_g07)})
    hazard_statements=[]
    omitted_hazard=[]
    corrosion = any(x.startswith('Skin Corr.') for x in classes)
    for e in supported:
        if corrosion and e['classification']=='Eye Dam. 1':
            omitted_hazard.append({'code':'H318','source_classification':'Eye Dam. 1',
              'reason':'Omitted by explicit project policy using the optional overlap provision: H314 already covers eye damage.',
              'legal_reference':'EU CLP Annex I Table 3.3.5 footnote (a); Article 27', 'pdf_page':154})
        elif e['hazard_code'] not in [x['code'] for x in hazard_statements]:
            hazard_statements.append({'code':e['hazard_code'], 'english_text':e['hazard_text_en'],
                'source_classification':e['classification'], 'legal_reference':e['source']['legal_reference'],
                'pdf_page':e['source']['pdf_page']})
    hazard_statements.sort(key=lambda e:e['code'])
    if 'hazard_statements' in c:
        declared = c['hazard_statements']
        expected = {e['hazard_code'] for e in supported}
        if not isinstance(declared,list) or set(declared)!=expected:
            blocking.append({'code':'APPROVED_CLASSIFICATION_H_STATEMENT_MISMATCH',
                             'given':declared, 'expected_from_supported_categories':sorted(expected),
                             'effect':'User-supplied classification is not changed; request review.'})

    p_sources={}
    for e in supported:
        for code in e['annex_i_precautionary_candidates']:
            p_sources.setdefault(code,[]).append({'classification':e['classification'],
                'annex_i_table':e['source']['legal_reference'],'pdf_page':e['source']['pdf_page']})
    public=_flag(product['packaging'],'general_public')
    if public is True:
        p_sources.setdefault('P102',[]).append({'classification':'general consumer precaution',
            'annex_i_table':'EU CLP Annex IV Part 1, Table 6.1, as appropriate','pdf_page':365})
    elif public is None:
        blocking.append({'code':'CONSUMER_OR_PROFESSIONAL_UNKNOWN','effect':'General and disposal statement applicability may change.'})

    entries=[]
    eligible=[]
    for code in sorted(p_sources):
        row=policy['policy'].get(code)
        if row is None:
            entries.append({'code':code,'status':'REQUIRES_POLICY_IMPLEMENTATION',
              'reason':'Candidate listed in Annex I but Annex IV conditions not yet encoded.',
              'source_classifications':p_sources[code], 'legal_reference':'EU CLP Article 22; Annex I/IV',
              'annex_iv_pdf_page':None, 'english_text':None})
            blocking.append({'code':'UNIMPLEMENTED_PRECAUTIONARY_RULE','statement':code})
            continue
        chosen, why, text=_condition(code,row,product,set(classes))
        item={'code':code,'status':None,'reason':why,'source_classifications':p_sources[code],
              'legal_reference':row['annex_iv_reference'], 'annex_iv_pdf_page':row['pdf_page'],
              'english_text':text,'priority':row['priority']}
        if chosen is False:
            item['status']='OMITTED_CONDITION_NOT_MET'
        elif chosen is None:
            item['status']='NEEDS_INPUT'
            blocking.append({'code':'PRECAUTIONARY_INPUT_REQUIRED','statement':code,'reason':why})
        else:
            eligible.append(item)
        entries.append(item)

    # Annex IV Part 1, Table 6.3, p.386: P332+P313 may be omitted if P333+P313 is used.
    bycode={e['code']:e for e in eligible}
    if 'P333+P313' in bycode and 'P332+P313' in bycode:
        redundant=bycode['P332+P313']
        redundant['status']='OMITTED_AS_REDUNDANT_UNDER_ANNEX_IV'
        redundant['reason']='P333+P313 is selected; Annex IV permits omitting P332+P313.'
        redundant['legal_reference']='EU CLP Annex IV Part 1, Table 6.3; Article 28(1)'
        redundant['annex_iv_pdf_page']=386
        eligible.remove(redundant)

    cap=policy['max_statements_default']
    for i,item in enumerate(sorted(eligible,key=lambda x:(x['priority'],x['code']))):
        item['status']='SELECTED_BY_DRAFT_POLICY' if i<cap else 'OMITTED_BY_DRAFT_SIX_STATEMENT_POLICY'
        if i>=cap:
            blocking.append({'code':'P_STATEMENT_PRIORITY_OVERFLOW','statement':item['code'],
                'effect':'Priority-based omission requires expert justification under Articles 22 and 28.'})
    entries.sort(key=lambda x:x['code'])
    selected=[{'code':e['code'],'english_text':e['english_text'],'legal_reference':e['legal_reference'],
               'reason':e['reason']} for e in entries if e['status']=='SELECTED_BY_DRAFT_POLICY']
    selected.sort(key=lambda e:(policy['policy'][e['code']]['priority'],e['code']))

    return {'jurisdiction':'EU','as_of':product['as_of'],
      'module':'ANNEX_I_ANNEX_IV_DETERMINISTIC_PARTIAL_V1',
      'source_pdf_sha256':'602529287cbdbbb80f4bc17404fef58041ce5edf30646509b3cdb6991b7fc8a7',
      'rulebook_id':mapping['id'],'selection_policy_id':policy['id'],
      'input_sha256':stable_hash(product),'mapping_sha256':stable_hash(mapping),'policy_sha256':stable_hash(policy),
      'classification_provenance':'USER_APPROVED_NOT_DERIVED',
      'mapped_classifications':[{'classification':e['classification'],'source':e['source']} for e in supported],
      'unsupported_classifications':unknown,
      'label_elements_draft':{'hazard_pictograms':sorted(pictograms),'pictogram_source_trace':pictogram_by_source,
        'pictogram_precedence_decisions':pictogram_decisions,
        'signal_word':signal,'signal_word_reference':'EU CLP Article 20(3); Annex I class label tables',
        'hazard_statements_en':hazard_statements,'omitted_hazard_statements':omitted_hazard,
        'selected_precautionary_statements_en':selected},
      'precautionary_candidate_decisions':entries,
      'blockers':blocking,
      'warnings':warnings+['This is a non-certified, partial rulebook. No market-language or transition assessment has been completed.',
          'Annex IV criteria and the internal P-statement priority policy require regulatory review for each use case.'],
      'label_ready_for_use':False,
      'full_clp_compliance_verdict':'NOT_ASSESSED'}


def main():
    import sys
    if len(sys.argv)!=2:
        raise SystemExit('Usage: python eu/label_v2/selector.py examples/eu_label_v2_product.json')
    print(json.dumps(assess(load_json(Path(sys.argv[1]))),indent=2,ensure_ascii=False))

if __name__=='__main__':
    main()
