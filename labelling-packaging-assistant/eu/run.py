"""EU system entry point. Always uses EU legislation and EU rulebook only."""
from pathlib import Path
import json
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from shared.engine import evaluate, load_json  # noqa: E402

def run(input_path: Path) -> dict:
    return evaluate(load_json(input_path), load_json(ROOT / "eu" / "rules.json"), "EU")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python eu/run.py examples/eu_product.json")
    print(json.dumps(run(Path(sys.argv[1])), indent=2, ensure_ascii=False))
