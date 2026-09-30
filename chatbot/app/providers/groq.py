"""
Groq, over its OpenAI-compatible endpoint.

Called with httpx rather than an SDK: the surface used here is three fields wide, and a thin client is
easier to reason about than a dependency that changes shape between releases.
"""

import json
import logging
from typing import Any, AsyncIterator

import httpx

from ..config import get_settings
from .base import Chunk, ToolCall

log = logging.getLogger("assistant.groq")

BASE = "https://api.groq.com/openai/v1"


class RateLimited(RuntimeError):
    """The quota, not a failure. Carries how long to wait when the server said."""

    def __init__(self, seconds: float | None):
        self.seconds = seconds
        super().__init__(f"Rate limited{f', retry in {seconds:.0f}s' if seconds else ''}")


def _retry_after(header: str | None) -> float | None:
    """Retry-After is seconds here, but the spec also allows a date, and neither is guaranteed."""
    if not header:
        return None
    try:
        return max(0.0, float(header))
    except ValueError:
        return None


class GroqTextProvider:
    def __init__(self, model: str | None = None):
        settings = get_settings()
        self.model = model or settings.groq_text_model
        self._key = settings.groq_api_key

    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ) -> AsyncIterator[Chunk]:
        body: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if max_tokens:
            body["max_completion_tokens"] = max_tokens
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"

        # Tool calls arrive in fragments across chunks and have to be stitched back together by index.
        pending: dict[int, dict[str, Any]] = {}

        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                f"{BASE}/chat/completions",
                headers={"Authorization": f"Bearer {self._key}"},
                json=body,
            ) as response:
                if response.status_code >= 400:
                    detail = (await response.aread()).decode()[:300]
                    log.error("groq refused the request: %s %s", response.status_code, detail)
                    if response.status_code == 429:
                        # The free tier is 8000 tokens a minute, so this is a normal Tuesday rather than
                        # an outage. The header says how long to wait; passing it up means the person is
                        # told "about 20 seconds" instead of "rate limited", which is actionable.
                        raise RateLimited(_retry_after(response.headers.get("retry-after")))
                    raise RuntimeError(f"Groq returned {response.status_code}: {detail}")

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[6:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        event = json.loads(payload)
                    except ValueError:
                        continue

                    usage = event.get("usage") or {}
                    for choice in event.get("choices", []):
                        delta = choice.get("delta") or {}
                        if delta.get("content"):
                            yield Chunk(text=delta["content"])
                        for fragment in delta.get("tool_calls") or []:
                            slot = pending.setdefault(
                                fragment.get("index", 0),
                                {"id": "", "name": "", "arguments": ""},
                            )
                            if fragment.get("id"):
                                slot["id"] = fragment["id"]
                            function = fragment.get("function") or {}
                            if function.get("name"):
                                slot["name"] = function["name"]
                            if function.get("arguments"):
                                slot["arguments"] += function["arguments"]

                        if choice.get("finish_reason") == "tool_calls" and pending:
                            yield Chunk(tool_calls=_collect(pending))
                            pending = {}

                    if usage:
                        yield Chunk(
                            usage={
                                "input_tokens": usage.get("prompt_tokens", 0),
                                "output_tokens": usage.get("completion_tokens", 0),
                            }
                        )

        if pending:
            yield Chunk(tool_calls=_collect(pending))
        yield Chunk(finished=True)


def _collect(pending: dict[int, dict[str, Any]]) -> list[ToolCall]:
    calls = []
    for index, slot in sorted(pending.items()):
        try:
            arguments = json.loads(slot["arguments"] or "{}")
        except ValueError:
            # A truncated argument string is the model's mistake, not a crash: let the tool reject it.
            arguments = {}
        calls.append(ToolCall(id=slot["id"] or f"call_{index}", name=slot["name"], arguments=arguments))
    return calls


class GroqAudioProvider:
    """Whisper, for a voice note turning into a draft."""

    def __init__(self, model: str | None = None):
        settings = get_settings()
        self.model = model or settings.groq_audio_model
        self._key = settings.groq_api_key

    async def transcribe(self, audio: bytes, filename: str) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{BASE}/audio/transcriptions",
                headers={"Authorization": f"Bearer {self._key}"},
                files={"file": (filename, audio)},
                data={"model": self.model, "response_format": "text"},
            )
        if response.status_code >= 400:
            raise RuntimeError(f"Transcription failed ({response.status_code}): {response.text[:200]}")
        return response.text.strip()
