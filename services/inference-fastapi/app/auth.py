import os
from typing import Optional

from fastapi import Header, HTTPException


def require_internal_auth(
    x_gateway_auth: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None),
):
    if os.getenv("INFERENCE_REQUIRE_AUTH", "false").lower() != "true":
        return

    secret = os.getenv("GATEWAY_INTERNAL_SECRET") or os.getenv("JWT_SECRET")
    if secret and x_gateway_auth == secret:
        return

    if authorization and authorization.startswith("Bearer "):
        return

    raise HTTPException(status_code=401, detail="Unauthorized")
