import os
import requests


class FraudShieldClient:
    def __init__(self, base_url: str, api_key: str, tenant_id: str = "default"):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.tenant_id = tenant_id

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "x-tenant-id": self.tenant_id,
        }

    def score(self, payload: dict):
        response = requests.post(
            f"{self.base_url}/api/score/score",
            json=payload,
            headers=self._headers(),
            timeout=5,
        )
        response.raise_for_status()
        return response.json()
