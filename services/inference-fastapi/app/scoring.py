from typing import Dict, Any

from .models.ensemble import build_ensemble


def score_hybrid(payload: Dict[str, Any]) -> Dict[str, Any]:
    return build_ensemble(payload)
