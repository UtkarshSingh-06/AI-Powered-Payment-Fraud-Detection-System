"""Train XGBoost fraud classifier on synthetic data; log to MLflow when configured."""
import json
import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd

try:
    import mlflow
except ImportError:
    mlflow = None

try:
    import joblib
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score
    from xgboost import XGBClassifier
except ImportError as exc:
    raise SystemExit(f"Training dependencies missing: {exc}") from exc


FEATURES = [
    "amount",
    "velocity_5m",
    "velocity_1h",
    "amount_ratio",
    "device_known",
    "hour_of_day",
]


def generate_synthetic(n: int = 50000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    amount = rng.lognormal(mean=4.5, sigma=1.2, size=n)
    velocity_5m = rng.poisson(lam=2, size=n)
    velocity_1h = rng.poisson(lam=8, size=n)
    amount_ratio = rng.normal(loc=1.0, scale=0.35, size=n).clip(0.1, 5)
    device_known = rng.integers(0, 2, size=n)
    hour_of_day = rng.integers(0, 24, size=n)

    logit = (
        0.00008 * amount
        + 0.45 * velocity_5m
        + 0.18 * velocity_1h
        + 1.2 * np.abs(amount_ratio - 1)
        - 1.4 * device_known
        + 0.05 * ((hour_of_day >= 1) & (hour_of_day <= 5))
    )
    prob = 1 / (1 + np.exp(-logit))
    label = (prob + rng.normal(0, 0.08, size=n) > 0.55).astype(int)

    return pd.DataFrame(
        {
            "amount": amount,
            "velocity_5m": velocity_5m,
            "velocity_1h": velocity_1h,
            "amount_ratio": amount_ratio,
            "device_known": device_known,
            "hour_of_day": hour_of_day,
            "label": label,
        }
    )


def load_training_frame():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    export_path = os.path.join(repo_root, "backend", "data", "training", "labeled_transactions.jsonl")
    rows = []
    if os.path.isfile(export_path):
        with open(export_path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                payload = json.loads(line)
                features = payload.get("features") or {}
                if not features:
                    continue
                row = {name: features.get(name, 0) for name in FEATURES}
                row["label"] = int(payload.get("target", payload.get("label") == "fraud"))
                rows.append(row)
    if len(rows) >= 100:
        return pd.DataFrame(rows)
    return generate_synthetic()


def train_and_register():
    df = load_training_frame()
    X = df[FEATURES]
    y = df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = XGBClassifier(
        n_estimators=120,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    prob = model.predict_proba(X_test)[:, 1]

    metrics = {
        "auc": float(roc_auc_score(y_test, prob)),
        "precision": float(precision_score(y_test, preds, zero_division=0)),
        "recall": float(recall_score(y_test, preds, zero_division=0)),
        "f1": float(f1_score(y_test, preds, zero_division=0)),
    }

    version = f"ensemble-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
    artifact_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(artifact_dir, exist_ok=True)
    model_path = os.path.join(artifact_dir, "xgboost-fraud.joblib")
    meta_path = os.path.join(artifact_dir, "model-version.json")

    joblib.dump({"model": model, "features": FEATURES}, model_path)

    artifact = {
        "modelVersion": version,
        "models": ["xgboost"],
        "features": FEATURES,
        "metrics": metrics,
        "artifactPath": model_path,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
    }
    with open(meta_path, "w", encoding="utf-8") as handle:
        json.dump(artifact, handle, indent=2)

    if mlflow and os.getenv("MLFLOW_TRACKING_URI"):
        mlflow.set_experiment(os.getenv("MLFLOW_EXPERIMENT", "fraudshield"))
        with mlflow.start_run(run_name="xgboost-retrain"):
            mlflow.log_metrics(metrics)
            mlflow.log_artifact(model_path)
            mlflow.log_dict(artifact, "model-version.json")
            mlflow.set_tag("stage", os.getenv("MODEL_STAGE", "staging"))

    print(json.dumps(artifact, indent=2))
    return artifact


if __name__ == "__main__":
    train_and_register()
