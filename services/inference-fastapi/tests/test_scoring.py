from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200


def test_score_returns_risk_score():
    response = client.post(
        "/score",
        json={
            "transactionId": "tx-1",
            "userId": "u-1",
            "amount": 5000,
            "merchantCategory": "Retail",
            "timestamp": "2026-01-01T00:00:00Z",
            "deviceId": "d-1",
            "featureVector": {"velocity_5m": 2, "amount_ratio": 1.5, "device_known": 0}
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "riskScore" in body
    assert body["latencyMs"] >= 0
