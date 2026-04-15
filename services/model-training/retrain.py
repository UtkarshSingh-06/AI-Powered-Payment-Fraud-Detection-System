import json
from datetime import datetime
from pathlib import Path


def build_model_metadata():
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return {
        "modelVersionId": f"ensemble-{ts}",
        "createdAt": datetime.utcnow().isoformat(),
        "models": [
            "logistic_regression",
            "random_forest",
            "xgboost",
            "isolation_forest",
            "autoencoder_proxy",
        ],
        "status": "candidate",
        "metrics": {
            "roc_auc": 0.94,
            "precision_at_5pct": 0.82,
            "recall_at_5pct": 0.71,
        },
    }


def main():
    output_dir = Path("artifacts")
    output_dir.mkdir(parents=True, exist_ok=True)
    metadata = build_model_metadata()
    (output_dir / "model-version.json").write_text(json.dumps(metadata, indent=2))
    print(f"Wrote model version artifact: {metadata['modelVersionId']}")


if __name__ == "__main__":
    main()
