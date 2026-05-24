from typing import Any, Dict, List, Optional

from .models.ensemble import build_ensemble, _load_trained_artifact


def compute_shap_explanations(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    artifact = _load_trained_artifact()
    if not artifact or "model" not in artifact:
        return build_ensemble(payload).get("explanations", [])

    try:
        import shap
        import numpy as np

        model = artifact["model"]
        features: List[str] = artifact.get("features", [])
        row = _feature_row(payload, features)
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(np.array([row]))
        values = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]

        results = []
        for name, impact in zip(features, values):
            results.append({
                "feature": name,
                "impact": round(float(impact), 4),
                "direction": "positive" if float(impact) >= 0 else "negative",
                "method": "shap"
            })
        return sorted(results, key=lambda x: abs(x["impact"]), reverse=True)
    except Exception:
        return build_ensemble(payload).get("explanations", [])


def _feature_row(payload: Dict[str, Any], features: List[str]) -> List[float]:
    fv = payload.get("featureVector", {})
    row = []
    for name in features:
        if name in fv:
            row.append(float(fv[name]))
        elif name == "amount":
            row.append(float(payload.get("amount", 0)))
        elif name == "hour_of_day":
            try:
                row.append(float(str(payload.get("timestamp", ""))[11:13]))
            except Exception:
                row.append(12.0)
        else:
            row.append(0.0)
    return row
