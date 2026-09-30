import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Set before anything imports config, which reads the environment once at import.
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-secret-for-signing-only")
os.environ.setdefault("TEXT_PROVIDER", "fake")
os.environ.setdefault("VISION_PROVIDER", "fake")
os.environ.setdefault("AUDIO_PROVIDER", "fake")
os.environ.setdefault("EMBED_PROVIDER", "fake")
os.environ.setdefault("INTERNAL_SECRET", "an-internal-secret-long-enough")

import pytest

from app.security import Caller


class StubApi:
    """Stands in for the Node API. Records what was asked so tests can assert the tool called the
    endpoint it claims to, not merely that it returned something shaped right."""

    def __init__(self, responses: dict[str, object] | None = None):
        self.responses = responses or {}
        self.calls: list[tuple[str, str, object]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return None

    def _answer(self, method: str, path: str, payload: object = None):
        self.calls.append((method, path, payload))
        for key, value in self.responses.items():
            if path.startswith(key):
                return value
        return {"items": []}

    async def get(self, path: str, **params):
        return self._answer("GET", path, params)

    async def post(self, path: str, body=None):
        return self._answer("POST", path, body)

    async def put(self, path: str, body=None):
        return self._answer("PUT", path, body)

    async def patch(self, path: str, body=None):
        return self._answer("PATCH", path, body)


@pytest.fixture
def caller() -> Caller:
    return Caller(user_id=7, username="ali", token="stub-token")


@pytest.fixture
def api() -> StubApi:
    return StubApi()
