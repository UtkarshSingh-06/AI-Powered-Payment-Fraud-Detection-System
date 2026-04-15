from typing import Dict, Any, List
import math


MODEL_VERSION = "ensemble-v1"


def _sigmoid(value: float) -> float:
    return 1 / (1 + math.exp(-value))


def _feature(name: str, data: Dict[str, Any], default: float = 0.0) -> float:
    return float(data.get("featureVector", {}).get(name, default))


def score_hybrid(payload: Dict[str, Any]) -> Dict[str, Any]:
    amount = float(payload.get("amount", 0))
    velocity_5m = _feature("velocity_5m", payload)
    amount_ratio = _feature("amount_ratio", payload, 1.0)
    device_known = _feature("device_known", payload, 1.0)

    # Supervised-style model score proxies
    logistic = _sigmoid((amount / 6000) + (velocity_5m * 0.5) + (amount_ratio * 0.7) - (device_known * 0.8))
    random_forest = min(1.0, 0.15 + (velocity_5m * 0.1) + (amount_ratio * 0.2))
    xgboost = _sigmoid((amount / 9000) + (velocity_5m * 0.6) + (amount_ratio * 0.5))

    # Unsupervised-style anomaly score proxies
    isolation_forest = min(1.0, max(0.0, 0.2 + (amount_ratio * 0.2) + (velocity_5m * 0.1)))
    autoencoder = min(1.0, max(0.0, abs(amount_ratio - 1) * 0.5 + (0 if device_known else 0.2)))

    weighted = (
        logistic * 0.25
        + random_forest * 0.20
        + xgboost * 0.25
        + isolation_forest * 0.15
        + autoencoder * 0.15
    )
    risk_score = round(weighted * 100, 2)

    if risk_score >= 70:
        classification = "Fraudulent"
        decision = "block"
    elif risk_score >= 40:
        classification = "Suspicious"
        decision = "challenge_otp"
    else:
        classification = "Safe"
        decision = "allow"

    explanations: List[Dict[str, Any]] = [
        {"feature": "velocity_5m", "impact": round(velocity_5m * 4.2, 2), "direction": "positive"},
        {"feature": "amount_ratio", "impact": round((amount_ratio - 1) * 8.0, 2), "direction": "positive"},
        {"feature": "device_known", "impact": round((1 - device_known) * 6.0, 2), "direction": "positive"},
    ]
    explanations.sort(key=lambda item: abs(item["impact"]), reverse=True)

    return {
        "transactionId": payload.get("transactionId"),
        "riskScore": risk_score,
        "classification": classification,
        "decision": decision,
        "modelVersion": MODEL_VERSION,
        "models": [
            {"name": "logistic_regression", "score": round(logistic, 4), "weight": 0.25},
            {"name": "random_forest", "score": round(random_forest, 4), "weight": 0.20},
            {"name": "xgboost", "score": round(xgboost, 4), "weight": 0.25},
            {"name": "isolation_forest", "score": round(isolation_forest, 4), "weight": 0.15},
            {"name": "autoencoder_proxy", "score": round(autoencoder, 4), "weight": 0.15},
        ],
        "explanations": explanations[:3],
    }
