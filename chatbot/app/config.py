"""Settings, read once at import and validated, so a missing key fails at boot rather than mid-request."""

import os
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _list(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    service_name: str = os.getenv("SERVICE_NAME", "assistant")
    env: str = os.getenv("APP_ENV", "development")
    port: int = int(os.getenv("PORT", "8000"))
    log_level: str = os.getenv("LOG_LEVEL", "info")

    # The Node API. Every piece of user data is read through it with the caller's own token, so the
    # assistant inherits blocking, private profiles and message rules instead of re-implementing them.
    api_base: str = os.getenv("API_BASE_URL", "http://localhost:5000/api/v1")
    api_timeout: float = float(os.getenv("API_TIMEOUT_SECONDS", "12"))

    # Service-to-service calls from the Node API (embeddings, moderation triage) carry this instead of a
    # user token, because no user is asking. Empty means the internal endpoints refuse everything.
    internal_secret: str = os.getenv("INTERNAL_SECRET", "")

    # Same secret, issuer and audience as the backend: the token is verified here before it is trusted.
    jwt_secret: str = os.getenv("JWT_ACCESS_SECRET", "")
    jwt_issuer: str = os.getenv("JWT_ISSUER", "social-api")
    jwt_audience: str = os.getenv("JWT_AUDIENCE", "social-web")

    # groq | gemini | fake. "fake" answers deterministically with no network, which is what the tests
    # and a keyless dev machine run against.
    text_provider: str = os.getenv("TEXT_PROVIDER", "fake")
    vision_provider: str = os.getenv("VISION_PROVIDER", "fake")
    audio_provider: str = os.getenv("AUDIO_PROVIDER", "fake")
    embed_provider: str = os.getenv("EMBED_PROVIDER", "fake")

    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_text_model: str = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-20b")
    groq_guard_model: str = os.getenv("GROQ_GUARD_MODEL", "openai/gpt-oss-safeguard-20b")
    groq_audio_model: str = os.getenv("GROQ_AUDIO_MODEL", "whisper-large-v3-turbo")

    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    # A documented, stable id. "gemini-flash-latest" reads like it should work and is not in the model
    # list, so it 404s — scripts/doctor.py prints what this key can actually see.
    gemini_vision_model: str = os.getenv("GEMINI_VISION_MODEL", "gemini-3.5-flash")
    gemini_embed_model: str = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
    embed_dimensions: int = int(os.getenv("EMBED_DIMENSIONS", "768"))

    cors_origins: list[str] = field(default_factory=lambda: _list("CORS_ORIGINS", "http://localhost:5173"))

    # How many times the model may call tools before it has to answer with what it has.
    max_tool_rounds: int = int(os.getenv("MAX_TOOL_ROUNDS", "4"))
    # A hard ceiling per request, so one conversation cannot burn the daily quota.
    max_output_tokens: int = int(os.getenv("MAX_OUTPUT_TOKENS", "700"))

    @property
    def is_fake(self) -> bool:
        return self.text_provider == "fake"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.text_provider == "groq" and not settings.groq_api_key:
        raise RuntimeError("TEXT_PROVIDER=groq needs GROQ_API_KEY")
    if settings.vision_provider == "gemini" and not settings.google_api_key:
        raise RuntimeError("VISION_PROVIDER=gemini needs GOOGLE_API_KEY")
    if settings.env != "development" and not settings.jwt_secret:
        raise RuntimeError("JWT_ACCESS_SECRET is required outside development")
    return settings
