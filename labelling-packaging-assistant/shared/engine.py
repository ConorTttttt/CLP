"""Partial deterministic CLP labelling/packaging demo.

IMPORTANT: The rulebooks are NOT complete or legally certified. No negative
compliance conclusion can follow from rules that are merely not triggered.
Classification is supplied and explicitly approved by the user, not calculated.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from typing import Any

class UnsupportedAssessment(ValueError):
    pass


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_field(data: dict[str, Any], path: str) -> tuple[bool, Any]:
    obj: Any = data
    for key in path.split("."):
        if not isinstance(obj, dict) or key not in obj:
            return False, None
        obj = obj[key]
    return obj is not None, obj


def condition(data: dict[str, Any], test: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    exists, actual = get_field(data, test["field"])
    evidence = {
        "field": test["field"], "operator": test["op"],
        "expected": test["value"], "actual": actual if exists else "<missing>"
    }
    if not exists:
        return "UNKNOWN", evidence
    op, expected = test["op"], test["value"]
    if op == "eq":
        result = type(actual) is type(expected) and actual == expected
    elif op == "gte":
        if type(actual) not in (int, float) or type(expected) not in (int, float):
            return "UNKNOWN", evidence
        result = actual >= expected
    elif op == "contains":
        if not isinstance(actual, list):
            return "UNKNOWN", evidence
        result = expected in actual
    else:
        raise ValueError(f"Unrecognised operator {op}")
    return ("TRUE" if result else "FALSE"), evidence


def evaluate(product: dict[str, Any], rulebook: dict[str, Any], expected_jurisdiction: str) -> dict[str, Any]:
    if expected_jurisdiction not in {"EU", "GB"}:
        raise UnsupportedAssessment("No rulebook has been approved for this system.")
    if product.get("jurisdiction") != expected_jurisdiction:
        raise UnsupportedAssessment(f"This is the {expected_jurisdiction} system. Cross-system assessments are forbidden.")
    if rulebook.get("jurisdiction") != expected_jurisdiction:
        raise UnsupportedAssessment("The loaded rulebook belongs to a different legal jurisdiction.")
    if product.get("as_of") != rulebook.get("effective_snapshot"):
        raise UnsupportedAssessment("Assessment date does not match this demonstration's approved rulebook snapshot.")
    if product.get("classification", {}).get("confirmed_by_user") is not True:
        raise UnsupportedAssessment("The classification must be explicitly supplied and approved by the user.")
    if product.get("ingredient_concentration_basis") != "percent_w_w":
        raise UnsupportedAssessment("Demo concentration inputs must be in verified percent w/w.")

    decisions = []
    for rule in rulebook["rules"]:
        tests = [condition(product, x) for x in rule["conditions"]["all"]]
        outcomes = [status for status, _ in tests]
        if "FALSE" in outcomes:
            state = "FALSE"
        elif "UNKNOWN" in outcomes:
            state = "UNKNOWN"
        else:
            state = "TRUE"
        status = (rule["status_if_matched"] if state == "TRUE" else
                  "INSUFFICIENT_DATA" if state == "UNKNOWN" else
                  "NOT_TRIGGERED_BY_THIS_RULE")
        entry = {
            "rule_id": rule["id"],
            "issue": rule["issue"],
            "status": status,
            "rationale": rule["rationale"] if state == "TRUE" else (
                "Required input missing or invalid." if state == "UNKNOWN" else
                "Conditions for this one rule were not all met; this does not establish an exemption."),
            "legal_basis": rule["legal_basis"],
            "source_url": rulebook["legal_source_url"],
            "evidence": [evidence for _, evidence in tests],
        }
        if state == "TRUE" and "output" in rule:
            entry["output"] = rule["output"]
        decisions.append(entry)

    child_closures = [d for d in decisions if d["issue"] == "child_resistant_fastening"]
    if any(d["status"] == "REQUIRED" for d in child_closures):
        closure_result = "REQUIRED_BY_DEMONSTRATED_RULE"
    elif any(d["status"] == "INSUFFICIENT_DATA" for d in child_closures):
        closure_result = "UNDETERMINED_MISSING_INPUTS_AND_INCOMPLETE_RULES"
    else:
        closure_result = "UNDETERMINED_OTHER_TRIGGERS_NOT_IMPLEMENTED"

    return {
        "system": expected_jurisdiction,
        "product_id": product.get("product_id"),
        "as_of": product["as_of"],
        "classification_provenance": "MANUALLY_SUPPLIED_AND_APPROVED_BY_USER",
        "ruleset_id": rulebook["ruleset_id"],
        "input_sha256": canonical_hash(product),
        "rulebook_sha256": canonical_hash(rulebook),
        "scope": "DEMONSTRATION ONLY: partial rules; NOT a compliance certificate",
        "child_resistant_fastening_summary": closure_result,
        "decisions": decisions,
    }


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))
