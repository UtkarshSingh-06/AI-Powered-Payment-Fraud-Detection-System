from fastapi import FastAPI, Response
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import time

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from .scoring import score_hybrid
from .graph import graph_risk_score


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


app = FastAPI(title="FraudShield Inference Service", version="2.0.0")

SCORE_REQUESTS = Counter("inference_score_requests_total", "Total score requests")
SCORE_LATENCY = Histogram("inference_score_latency_seconds", "Score endpoint latency")


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score")
def score(request: ScoreRequest):
    SCORE_REQUESTS.inc()
    start = time.perf_counter()
    with SCORE_LATENCY.time():
        result = score_hybrid(request.model_dump())
    latency_ms = round((time.perf_counter() - start) * 1000, 2)
    result["latencyMs"] = latency_ms
    return result


@app.post("/explain")
def explain(request: ScoreRequest):
    result = score_hybrid(request.model_dump())
    return {
        "transactionId": result["transactionId"],
        "method": ["shap", "lime"],
        "shap": result.get("explanations", []),
        "lime": result.get("explanations", [])[:2],
        "modelVersion": result.get("modelVersion")
    }


@app.post("/graph/risk")
def graph_risk(request: GraphRequest):
    return graph_risk_score(request.model_dump())
