from typing import Dict, Any, List
import math


def sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-value))


def feature(name: str, data: Dict[str, Any], default: float = 0.0) -> float:
    return float(data.get("featureVector", {}).get(name, default))


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

    logistic = sigmoid((amount / 6000) + (velocity_5m * 0.5) + (amount_ratio * 0.7) - (device_known * 0.8))
    xgboost = sigmoid((amount / 9000) + (velocity_5m * 0.6) + (amount_ratio * 0.5))
    autoencoder = min(1.0, max(0.0, abs(amount_ratio - 1) * 0.5 + (0 if device_known else 0.2)))
    lstm = score_lstm_proxy(payload)
    transformer = score_transformer_proxy(payload)
    gnn = score_gnn_proxy(payload)

    weighted = (
        logistic * 0.20
        + xgboost * 0.20
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
        {"feature": "velocity_5m", "impact": round(velocity_5m * 4.2, 2), "direction": "positive"},
        {"feature": "amount_ratio", "impact": round((amount_ratio - 1) * 8.0, 2), "direction": "positive"},
        {"feature": "gnn_device_risk", "impact": round(gnn * 10, 2), "direction": "positive"},
    ]

    return {
        "transactionId": payload.get("transactionId"),
        "riskScore": risk_score,
        "classification": classification,
        "decision": decision,
        "modelVersion": "ensemble-v2-lstm-transformer-gnn",
        "models": [
            {"name": "logistic_regression", "score": round(logistic, 4), "weight": 0.20},
            {"name": "xgboost", "score": round(xgboost, 4), "weight": 0.20},
            {"name": "autoencoder", "score": round(autoencoder, 4), "weight": 0.15},
            {"name": "lstm", "score": round(lstm, 4), "weight": 0.15},
            {"name": "transformer", "score": round(transformer, 4), "weight": 0.15},
            {"name": "gnn", "score": round(gnn, 4), "weight": 0.15},
        ],
        "explanations": explanations,
    }
