"""
What a model provider has to be able to do, and nothing more.

Four narrow capabilities rather than one fat client, because they come from different places: text and
audio from Groq, vision and embeddings from Google, and all four from the fake provider during tests.
Swapping one is an environment variable.
"""

from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Protocol, runtime_checkable


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class Chunk:
    """One piece of a streamed answer: either text for the user or the model asking for a tool."""

    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    finished: bool = False
    usage: dict[str, int] = field(default_factory=dict)


@runtime_checkable
class TextProvider(Protocol):
    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ) -> AsyncIterator[Chunk]: ...


@runtime_checkable
class VisionProvider(Protocol):
    async def describe(self, image: bytes, mime_type: str, prompt: str) -> str: ...


@runtime_checkable
class AudioProvider(Protocol):
    async def transcribe(self, audio: bytes, filename: str) -> str: ...


@runtime_checkable
class EmbedProvider(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...
