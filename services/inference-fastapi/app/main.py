from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import time

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


app = FastAPI(title="FraudShield Inference Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score")
def score(request: ScoreRequest):
    start = time.perf_counter()
    result = score_hybrid(request.model_dump())
    latency_ms = round((time.perf_counter() - start) * 1000, 2)
    result["latencyMs"] = latency_ms
    return result


@app.post("/graph/risk")
def graph_risk(request: GraphRequest):
    return graph_risk_score(request.model_dump())
