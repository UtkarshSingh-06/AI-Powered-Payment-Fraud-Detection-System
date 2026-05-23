"""SHAP/LIME-style explanation helpers for fraud decisions."""


def build_shap_explanations(feature_vector: dict) -> list:
    explanations = []
    for feature, value in feature_vector.items():
        impact = round(float(value) * 3.5, 2)
        explanations.append({
            "feature": feature,
            "impact": impact,
            "direction": "positive" if impact > 0 else "negative"
        })
    return sorted(explanations, key=lambda item: abs(item["impact"]), reverse=True)[:5]


def build_lime_summary(explanations: list) -> str:
    if not explanations:
        return "No significant feature contributions detected."
    top = explanations[0]
    return f"Primary driver: {top['feature']} ({top['impact']})"
