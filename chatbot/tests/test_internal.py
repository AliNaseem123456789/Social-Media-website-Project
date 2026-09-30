"""The endpoints Node calls. Mostly about the ways they must refuse."""

import dataclasses
import re

import pytest
from fastapi.testclient import TestClient

from app import internal, moderation
from app.config import get_settings
from app.main import app
from app.providers.base import Chunk

client = TestClient(app)

SECRET = "an-internal-secret-long-enough"  # matches conftest


def headers() -> dict[str, str]:
    return {"X-Internal-Secret": SECRET}


def _settings(**changes):
    """Settings is a frozen dataclass, so a variant is a replace, not an attribute poke."""
    return dataclasses.replace(get_settings(), **changes)


def test_no_secret_and_a_wrong_secret_are_both_refused():
    assert client.post("/internal/embed", json={"texts": ["a"]}).status_code == 401
    wrong = {"X-Internal-Secret": "nope"}
    assert client.post("/internal/embed", json={"texts": ["a"]}, headers=wrong).status_code == 401
    assert client.post("/internal/moderate", json={"text": "a"}, headers=wrong).status_code == 401


def test_an_unconfigured_secret_closes_the_endpoint_rather_than_opening_it(monkeypatch):
    """The failure mode that matters: empty config must not mean "no check needed"."""
    monkeypatch.setattr(internal, "get_settings", lambda: _settings(internal_secret=""))
    for sent in ({}, {"X-Internal-Secret": ""}, {"X-Internal-Secret": "anything"}):
        assert client.post("/internal/embed", json={"texts": ["a"]}, headers=sent).status_code == 503


def test_a_user_token_does_not_open_the_internal_api():
    from .test_http import bearer

    assert client.post("/internal/embed", json={"texts": ["a"]}, headers=bearer()).status_code == 401


def test_the_internal_secret_does_not_open_the_user_api():
    """And the reverse: the shared secret must not be a way to reach anyone's data."""
    assert client.get("/capabilities", headers=headers()).status_code == 401
    assert client.post("/chat", json={"messages": [{"role": "user", "content": "hi"}]}, headers=headers()).status_code == 401


def test_embed_returns_one_vector_per_text_at_the_configured_width():
    body = client.post("/internal/embed", json={"texts": ["hello", "world", "hello"]}, headers=headers()).json()
    assert len(body["vectors"]) == 3
    assert all(len(v) == body["dimensions"] for v in body["vectors"])
    # Same text, same vector — the whole premise of caching one and of reproducible evals.
    assert body["vectors"][0] == body["vectors"][2]
    assert body["vectors"][0] != body["vectors"][1]


def test_embed_rejects_an_empty_or_oversized_batch():
    assert client.post("/internal/embed", json={"texts": []}, headers=headers()).status_code == 422
    assert client.post("/internal/embed", json={"texts": ["x"] * 101}, headers=headers()).status_code == 422


def test_a_clear_threat_is_flagged_without_any_model():
    body = client.post(
        "/internal/moderate",
        json={"text": "i'm going to find you and hurt you", "reason": "threat"},
        headers=headers(),
    ).json()
    assert body["verdict"] == "remove"
    assert body["source"] == "rules"


def test_telling_someone_to_kill_themselves_is_flagged():
    body = client.post("/internal/moderate", json={"text": "kys loser"}, headers=headers()).json()
    assert body["verdict"] == "remove"


def test_ordinary_rudeness_is_not_removed_by_the_rules():
    body = client.post(
        "/internal/moderate", json={"text": "this take is awful and you should feel bad"}, headers=headers()
    ).json()
    # With no model configured it goes to a human rather than being waved through OR removed.
    assert body["verdict"] == "review"


def test_an_empty_report_goes_to_a_human_rather_than_being_allowed():
    body = client.post("/internal/moderate", json={"text": "   "}, headers=headers()).json()
    assert body["verdict"] == "review"


# --------------------------------------------------------------------------- the model leg

pytestmark_asyncio = pytest.mark.asyncio


def _with_model(monkeypatch, provider) -> None:
    monkeypatch.setattr(moderation, "guard_provider", lambda: provider)
    monkeypatch.setattr(moderation, "get_settings", lambda: _settings(text_provider="groq"))


@pytest.mark.asyncio
async def test_an_unparseable_model_answer_never_reads_as_allow(monkeypatch):
    class Rambling:
        async def chat(self, *_args, **_kwargs):
            yield Chunk(text="Well, it depends on who you ask, really.")
            yield Chunk(finished=True)

    _with_model(monkeypatch, Rambling())
    result = await moderation.triage("something ambiguous")
    assert result["verdict"] == "review"
    assert result["source"] == "error"


@pytest.mark.asyncio
async def test_a_verdict_is_read_out_of_prose_and_fences(monkeypatch):
    class Fenced:
        async def chat(self, *_args, **_kwargs):
            yield Chunk(text='Here you go:\n```json\n{"verdict":"allow","confidence":1.4,')
            yield Chunk(text='"reason":"just an opinion"}\n```')
            yield Chunk(finished=True)

    _with_model(monkeypatch, Fenced())
    result = await moderation.triage("an unpopular opinion")
    assert result["verdict"] == "allow"
    assert result["confidence"] == 1.0  # clamped, not trusted
    assert result["reason"] == "just an opinion"


@pytest.mark.asyncio
async def test_a_verdict_outside_the_three_is_not_a_verdict(monkeypatch):
    class Inventive:
        async def chat(self, *_args, **_kwargs):
            yield Chunk(text='{"verdict":"ban_the_user","confidence":0.9,"reason":"bad"}')
            yield Chunk(finished=True)

    _with_model(monkeypatch, Inventive())
    result = await moderation.triage("something")
    assert result["verdict"] == "review"


@pytest.mark.asyncio
async def test_rules_win_over_the_model(monkeypatch):
    """A model that says a threat is fine must not overrule the rule that says it isn't."""

    class Permissive:
        async def chat(self, *_args, **_kwargs):
            yield Chunk(text='{"verdict":"allow","confidence":1.0,"reason":"fine"}')
            yield Chunk(finished=True)

    _with_model(monkeypatch, Permissive())
    result = await moderation.triage("i will kill you")
    assert result["verdict"] == "remove"
    assert result["source"] == "rules"


@pytest.mark.asyncio
async def test_an_unreachable_guard_model_means_review_not_allow(monkeypatch):
    class Broken:
        async def chat(self, *_args, **_kwargs):
            raise RuntimeError("503 service unavailable")
            yield  # pragma: no cover - makes this an async generator

    _with_model(monkeypatch, Broken())
    result = await moderation.triage("something")
    assert result["verdict"] == "review"
    assert result["source"] == "error"


@pytest.mark.asyncio
async def test_the_report_text_reaches_the_model_but_is_capped(monkeypatch):
    seen = {}

    class Recording:
        async def chat(self, messages, *_args, **_kwargs):
            seen["prompt"] = messages[0]["content"]
            yield Chunk(text='{"verdict":"review","confidence":0.5,"reason":"unclear"}')
            yield Chunk(finished=True)

    _with_model(monkeypatch, Recording())
    await moderation.triage("x" * 9000, reason="spam")
    assert "spam" in seen["prompt"]
    longest = max(re.findall(r"x+", seen["prompt"]), key=len)
    assert len(longest) == 4000
