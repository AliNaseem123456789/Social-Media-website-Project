"""
Google, for the two things Groq does not cover here: looking at an image and turning text into vectors.

Alt text is the reason vision is in this service at all, so the prompt asks for what a screen reader
needs — what is in the picture and what matters about it — rather than a caption with adjectives.
"""

import base64
import logging
from typing import Any

import httpx

from ..config import get_settings

log = logging.getLogger("assistant.gemini")

BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiVisionProvider:
    def __init__(self, model: str | None = None):
        settings = get_settings()
        self.model = model or settings.gemini_vision_model
        self._key = settings.google_api_key

    async def describe(self, image: bytes, mime_type: str, prompt: str) -> str:
        body: dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(image).decode()}},
                    ]
                }
            ],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200},
        }
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{BASE}/models/{self.model}:generateContent",
                headers={"x-goog-api-key": self._key},
                json=body,
            )
        if response.status_code >= 400:
            log.error("gemini vision refused: %s %s", response.status_code, response.text[:200])
            raise RuntimeError(f"Vision request failed ({response.status_code})")

        payload = response.json()
        candidates = payload.get("candidates") or []
        if not candidates:
            return ""
        parts = (candidates[0].get("content") or {}).get("parts") or []
        return " ".join(part.get("text", "") for part in parts).strip()


class GeminiEmbedProvider:
    def __init__(self, model: str | None = None, dimensions: int | None = None):
        settings = get_settings()
        self.model = model or settings.gemini_embed_model
        self.dimensions = dimensions or settings.embed_dimensions
        self._key = settings.google_api_key

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        requests = [
            {
                "model": f"models/{self.model}",
                "content": {"parts": [{"text": text[:8000]}]},
                "outputDimensionality": self.dimensions,
            }
            for text in texts
        ]
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{BASE}/models/{self.model}:batchEmbedContents",
                headers={"x-goog-api-key": self._key},
                json={"requests": requests},
            )
        if response.status_code >= 400:
            log.error("gemini embed refused: %s %s", response.status_code, response.text[:200])
            raise RuntimeError(f"Embedding request failed ({response.status_code})")

        payload = response.json()
        return [item.get("values", []) for item in payload.get("embeddings", [])]
