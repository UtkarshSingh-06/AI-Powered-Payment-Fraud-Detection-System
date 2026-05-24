"""Invoke real ML training pipeline and emit model metadata."""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TRAIN_SCRIPT = os.path.join(ROOT, "ml", "training", "train.py")
ARTIFACT = os.path.join(ROOT, "ml", "training", "artifacts", "model-version.json")


def main():
    if not os.path.isfile(TRAIN_SCRIPT):
        raise FileNotFoundError(TRAIN_SCRIPT)

    subprocess.check_call([sys.executable, TRAIN_SCRIPT], cwd=os.path.dirname(TRAIN_SCRIPT))

    if os.path.isfile(ARTIFACT):
        with open(ARTIFACT, encoding="utf-8") as handle:
            meta = json.load(handle)
    else:
        meta = {
            "modelVersion": f"ensemble-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}",
            "status": "failed"
        }

    out_path = os.path.join(os.path.dirname(__file__), "model-version.json")
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2)

    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
