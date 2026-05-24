"""Compare labeled export feature distributions against training baseline."""
import json
import os
import sys
from pathlib import Path

import numpy as np

FEATURES = [
    "amount",
    "velocity_5m",
    "velocity_1h",
    "amount_ratio",
    "device_known",
    "hour_of_day",
]

BASELINE = {
    "amount": 90.0,
    "velocity_5m": 1.2,
    "velocity_1h": 8.0,
    "amount_ratio": 1.0,
    "device_known": 0.5,
    "hour_of_day": 12.0,
}


def load_rows(path: Path):
    if not path.is_file():
        return []
    rows = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            features = payload.get("features") or {}
            if features:
                rows.append(features)
    return rows


def main():
    repo_root = Path(__file__).resolve().parents[2]
    export_path = repo_root / "backend" / "data" / "training" / "labeled_transactions.jsonl"
    rows = load_rows(export_path)

    if len(rows) < 20:
        result = {
            "status": "skipped",
            "reason": "insufficient labeled rows",
            "rowCount": len(rows),
            "alert": False,
        }
        print(json.dumps(result, indent=2))
        return 0

    drift_scores = {}
    for feature in FEATURES:
        values = [float(r.get(feature, 0)) for r in rows if feature in r]
        if not values:
            continue
        current_mean = float(np.mean(values))
        baseline = BASELINE[feature]
        drift_scores[feature] = abs(current_mean - baseline) / max(abs(baseline), 1e-6)

    max_drift = max(drift_scores.values()) if drift_scores else 0.0
    threshold = float(os.getenv("DRIFT_ALERT_THRESHOLD", "0.25"))
    alert = max_drift > threshold

    result = {
        "status": "ok",
        "rowCount": len(rows),
        "driftByFeature": drift_scores,
        "maxDrift": max_drift,
        "threshold": threshold,
        "alert": alert,
    }
    print(json.dumps(result, indent=2))

    webhook = os.getenv("DRIFT_ALERT_WEBHOOK") or os.getenv("ALERT_WEBHOOK_URL")
    if alert and webhook:
        import urllib.request

        req = urllib.request.Request(
            webhook,
            data=json.dumps({"text": f"FraudShield drift alert: maxDrift={max_drift:.2f}"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            urllib.request.urlopen(req, timeout=10)
        except Exception as exc:
            print(f"Webhook notify failed: {exc}", file=sys.stderr)

    return 1 if alert else 0


if __name__ == "__main__":
    raise SystemExit(main())
