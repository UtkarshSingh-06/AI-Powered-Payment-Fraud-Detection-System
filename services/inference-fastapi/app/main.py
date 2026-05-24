from fastapi import FastAPI, Response, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import os
import time

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from .scoring import score_hybrid
from .graph import graph_risk_score
from .xai import compute_shap_explanations
from .auth import require_internal_auth


class ScoreRequest(BaseModel):
    transactionId: str
    userId: str
    amount: float = Field(ge=0)
    merchantCategory: str
    timestamp: str
    deviceId: str
    currency: Optional[str] = "INR"
    featureVector: Dict[str, float] = Field(default_factory=dict)


class GraphRequest(BaseModel):
    transactionId: str
    userId: str
    deviceId: str
    merchantName: Optional[str] = "unknown"
    beneficiaryId: Optional[str] = "unknown"
    ipAddress: Optional[str] = "unknown"
    historicalEdges: List[Dict[str, str]] = Field(default_factory=list)


app = FastAPI(title="FraudShield Inference Service", version="2.1.0")

SCORE_REQUESTS = Counter("inference_score_requests_total", "Total score requests")
SCORE_LATENCY = Histogram("inference_score_latency_seconds", "Score endpoint latency")


def _model_ready() -> bool:
    paths = [
        os.getenv("MODEL_ARTIFACT_PATH"),
        "/app/models/xgboost-fraud.joblib",
    ]
    return any(p and os.path.isfile(p) for p in paths)


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/health")
def health():
    return {"status": "ok", "modelLoaded": _model_ready()}


@app.post("/score")
def score(request: ScoreRequest, _auth=Depends(require_internal_auth)):
    SCORE_REQUESTS.inc()
    start = time.perf_counter()
    with SCORE_LATENCY.time():
        result = score_hybrid(request.model_dump())
    latency_ms = round((time.perf_counter() - start) * 1000, 2)
    result["latencyMs"] = latency_ms
    return result


@app.post("/explain")
def explain(request: ScoreRequest, _auth=Depends(require_internal_auth)):
    payload = request.model_dump()
    result = score_hybrid(payload)
    shap = compute_shap_explanations(payload)
    graph = graph_risk_score({
        "transactionId": payload["transactionId"],
        "userId": payload["userId"],
        "deviceId": payload["deviceId"],
        "merchantName": payload.get("merchantCategory", "unknown"),
        "historicalEdges": []
    })
    return {
        "transactionId": result["transactionId"],
        "explanations": shap,
        "shap": shap,
        "lime": shap[:3],
        "graphRisk": graph,
        "modelVersion": result.get("modelVersion"),
        "confidence": result.get("confidence")
    }


@app.post("/graph/risk")
def graph_risk(request: GraphRequest, _auth=Depends(require_internal_auth)):
    return graph_risk_score(request.model_dump())
