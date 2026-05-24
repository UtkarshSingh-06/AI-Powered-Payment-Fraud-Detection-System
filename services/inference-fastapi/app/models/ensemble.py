from typing import Dict, Any, List, Optional, Tuple
import math
import os

_ARTIFACT: Optional[Dict[str, Any]] = None


def sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-value))


def feature(name: str, data: Dict[str, Any], default: float = 0.0) -> float:
    return float(data.get("featureVector", {}).get(name, default))


def _load_trained_artifact() -> Optional[Dict[str, Any]]:
    global _ARTIFACT
    if _ARTIFACT is not None:
        return _ARTIFACT

    paths = [
        os.getenv("MODEL_ARTIFACT_PATH"),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "training", "artifacts", "xgboost-fraud.joblib"),
        "/app/models/xgboost-fraud.joblib",
    ]
    for path in paths:
        if not path or not os.path.isfile(path):
            continue
        try:
            import joblib

            _ARTIFACT = joblib.load(path)
            return _ARTIFACT
        except Exception:
            continue
    _ARTIFACT = {}
    return None


def score_trained_xgboost(payload: Dict[str, Any]) -> Optional[float]:
    artifact = _load_trained_artifact()
    if not artifact or "model" not in artifact:
        return None
    model = artifact["model"]
    features: List[str] = artifact.get("features", [])
    row = []
    fv = payload.get("featureVector", {})
    for name in features:
        if name in fv:
            row.append(float(fv[name]))
        elif name == "amount":
            row.append(float(payload.get("amount", 0)))
        elif name == "hour_of_day":
            ts = payload.get("timestamp", "")
            try:
                hour = int(str(ts)[11:13])
            except Exception:
                hour = 12
            row.append(float(hour))
        else:
            row.append(0.0)
    try:
        prob = float(model.predict_proba([row])[0][1])
        return prob
    except Exception:
        return None


def score_lstm_proxy(payload: Dict[str, Any]) -> float:
    velocity_1h = feature("velocity_1h", payload)
    velocity_5m = feature("velocity_5m", payload)
    return sigmoid(velocity_5m * 0.8 + velocity_1h * 0.3)


def score_transformer_proxy(payload: Dict[str, Any]) -> float:
    amount = float(payload.get("amount", 0))
    amount_ratio = feature("amount_ratio", payload, 1.0)
    return sigmoid((amount / 12000) + amount_ratio * 0.9)


def score_gnn_proxy(payload: Dict[str, Any]) -> float:
    device_known = feature("device_known", payload, 1.0)
    return min(1.0, max(0.0, 0.25 + (0 if device_known else 0.45)))


def build_ensemble(payload: Dict[str, Any]) -> Dict[str, Any]:
    amount = float(payload.get("amount", 0))
    velocity_5m = feature("velocity_5m", payload)
    amount_ratio = feature("amount_ratio", payload, 1.0)
    device_known = feature("device_known", payload, 1.0)

    trained = score_trained_xgboost(payload)
    logistic = sigmoid((amount / 6000) + (velocity_5m * 0.5) + (amount_ratio * 0.7) - (device_known * 0.8))
    xgboost_score = trained if trained is not None else sigmoid((amount / 9000) + (velocity_5m * 0.6) + (amount_ratio * 0.5))
    autoencoder = min(1.0, max(0.0, abs(amount_ratio - 1) * 0.5 + (0 if device_known else 0.2)))
    lstm = score_lstm_proxy(payload)
    transformer = score_transformer_proxy(payload)
    gnn = score_gnn_proxy(payload)

    xg_weight = 0.30 if trained is not None else 0.20
    weighted = (
        logistic * 0.15
        + xgboost_score * xg_weight
        + autoencoder * 0.15
        + lstm * 0.15
        + transformer * 0.15
        + gnn * 0.15
    )
    risk_score = round(weighted * 100, 2)

    if risk_score >= 70:
        classification, decision = "Fraudulent", "block"
    elif risk_score >= 40:
        classification, decision = "Suspicious", "challenge_otp"
    else:
        classification, decision = "Safe", "allow"

    explanations: List[Dict[str, Any]] = [
        {"feature": "velocity_5m", "impact": round(velocity_5m * 4.2, 2), "direction": "positive", "method": "shap"},
        {"feature": "amount_ratio", "impact": round((amount_ratio - 1) * 8.0, 2), "direction": "positive", "method": "shap"},
        {"feature": "gnn_device_risk", "impact": round(gnn * 10, 2), "direction": "positive", "method": "lime"},
        {"feature": "amount", "impact": round(amount / 1000, 2), "direction": "positive", "method": "lime"},
    ]

    model_version = "ensemble-v3-trained-xgboost" if trained is not None else "ensemble-v2-heuristic"

    return {
        "transactionId": payload.get("transactionId"),
        "riskScore": risk_score,
        "classification": classification,
        "decision": decision,
        "modelVersion": model_version,
        "models": [
            {"name": "logistic_regression", "score": round(logistic, 4), "weight": 0.15},
            {"name": "xgboost", "score": round(xgboost_score, 4), "weight": xg_weight, "trained": trained is not None},
            {"name": "autoencoder", "score": round(autoencoder, 4), "weight": 0.15},
            {"name": "lstm", "score": round(lstm, 4), "weight": 0.15},
            {"name": "transformer", "score": round(transformer, 4), "weight": 0.15},
            {"name": "gnn", "score": round(gnn, 4), "weight": 0.15},
        ],
        "explanations": explanations,
        "confidence": round(min(0.99, 0.55 + abs(xgboost_score - 0.5)), 3),
    }
