"""
Endpoints the Node API calls, not the browser.

No user is asking, so there is no user token — these carry a shared secret instead. They exist because
the model clients live in Python while the database lives behind Node: this service turns text into
vectors and opinions, and Node does all the writing.

Nothing here reads or returns anything belonging to a person. Text comes in as an argument and the
answer goes straight back; there is no path from these endpoints to anyone's posts or messages, which is
what makes a shared secret enough for them and not enough for anything else.
"""

import hmac
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from . import moderation
from .config import get_settings
from .providers import embed_provider

log = logging.getLogger("assistant.internal")


async def require_secret(x_internal_secret: str = Header(default="")) -> None:
    expected = get_settings().internal_secret
    # No secret configured means these endpoints are closed, not open. Getting that backwards is how a
    # service ends up quietly unauthenticated in production.
    if not expected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Internal API is not configured")
    # Constant time, so the response time cannot be used to guess the secret a character at a time.
    if not hmac.compare_digest(x_internal_secret, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bad internal secret")


# On the router rather than on each endpoint, so a new internal endpoint cannot be added unauthenticated.
router = APIRouter(prefix="/internal", tags=["internal"], dependencies=[Depends(require_secret)])


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)
    model: str | None = None


class ModerateRequest(BaseModel):
    text: str = Field(max_length=8000)
    reason: str = Field(default="", max_length=200)


@router.post("/embed")
async def embed(request: EmbedRequest) -> dict:
    settings = get_settings()
    vectors = await embed_provider().embed([text[:8000] for text in request.texts])
    # The caller stores these in a fixed-width column and drops the batch on a mismatch, so returning a
    # short or ragged list would just waste its quota. Fail loudly instead.
    if len(vectors) != len(request.texts):
        log.error("embedder returned %d vectors for %d texts", len(vectors), len(request.texts))
        raise HTTPException(status_code=502, detail="The embedding provider returned the wrong number of vectors")
    return {"vectors": vectors, "dimensions": settings.embed_dimensions, "model": settings.gemini_embed_model}


@router.post("/moderate")
async def moderate(request: ModerateRequest) -> dict:
    return await moderation.triage(request.text, request.reason)
