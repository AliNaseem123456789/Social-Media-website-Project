"""Picks the implementation each capability uses, from the environment."""

from functools import lru_cache

from ..config import get_settings
from .base import AudioProvider, EmbedProvider, TextProvider, VisionProvider
from .fake import FakeAudioProvider, FakeEmbedProvider, FakeTextProvider, FakeVisionProvider


@lru_cache
def text_provider() -> TextProvider:
    name = get_settings().text_provider
    if name == "groq":
        from .groq import GroqTextProvider

        return GroqTextProvider()
    return FakeTextProvider()


@lru_cache
def vision_provider() -> VisionProvider:
    name = get_settings().vision_provider
    if name == "gemini":
        from .gemini import GeminiVisionProvider

        return GeminiVisionProvider()
    return FakeVisionProvider()


@lru_cache
def audio_provider() -> AudioProvider:
    name = get_settings().audio_provider
    if name == "groq":
        from .groq import GroqAudioProvider

        return GroqAudioProvider()
    return FakeAudioProvider()


@lru_cache
def embed_provider() -> EmbedProvider:
    settings = get_settings()
    if settings.embed_provider == "gemini":
        from .gemini import GeminiEmbedProvider

        return GeminiEmbedProvider()
    return FakeEmbedProvider(settings.embed_dimensions)


def guard_provider() -> TextProvider:
    """The moderation model, kept separate so triage can use a safety-tuned model while chat does not."""
    settings = get_settings()
    if settings.text_provider == "groq":
        from .groq import GroqTextProvider

        return GroqTextProvider(model=settings.groq_guard_model)
    return FakeTextProvider()
