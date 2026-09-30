"""Writing help. The through-line of every test here: it suggests, it never sends."""

import dataclasses

import pytest
from fastapi.testclient import TestClient

from app import compose, main
from app.config import get_settings
from app.main import app
from app.providers.base import Chunk

from .conftest import StubApi
from .test_http import bearer

client = TestClient(app)

CONVERSATION = {
    "/chats/4/messages": {
        "items": [
            {"sender": {"username": "sara"}, "text": "are we still on for saturday?", "createdAt": "2"},
            {"sender": {"username": "ali"}, "text": "yeah planning to", "createdAt": "1"},
        ]
    },
    "/auth/me": {"id": 7},
    "/posts": {"items": [{"id": 1, "content": "went up the ridge before sunrise", "createdAt": "1"}]},
}


def _use(monkeypatch, api: StubApi) -> StubApi:
    monkeypatch.setattr(main, "SocialApi", lambda _token: api)
    return api


def _model(monkeypatch, text: str) -> None:
    class Canned:
        async def chat(self, *_args, **_kwargs):
            yield Chunk(text=text)
            yield Chunk(finished=True)

    monkeypatch.setattr(compose, "text_provider", lambda: Canned())
    monkeypatch.setattr(compose, "get_settings", lambda: dataclasses.replace(get_settings(), text_provider="groq"))


# --------------------------------------------------------------------------- replies

def test_replies_come_back_as_three_suggestions_and_nothing_is_sent(monkeypatch):
    api = _use(monkeypatch, StubApi(CONVERSATION))
    body = client.post("/compose/replies", json={"conversation_id": 4}, headers=bearer()).json()

    assert len(body["replies"]) == 3
    assert all(r.strip() for r in body["replies"])
    # The only thing that matters: it read, it did not write.
    assert {method for method, _p, _b in api.calls} == {"GET"}


def test_replies_refuse_a_conversation_the_user_is_not_in(monkeypatch):
    from app.social_api import SocialApiError

    class Forbidden(StubApi):
        async def get(self, path, **params):
            raise SocialApiError(403, "You are not in this conversation")

    _use(monkeypatch, Forbidden())
    response = client.post("/compose/replies", json={"conversation_id": 99}, headers=bearer())
    assert response.status_code == 403
    assert "not in this conversation" in response.json()["detail"]


def test_replies_need_a_token():
    assert client.post("/compose/replies", json={"conversation_id": 4}).status_code == 401


def test_a_conversation_id_must_be_positive():
    assert client.post("/compose/replies", json={"conversation_id": 0}, headers=bearer()).status_code == 422


@pytest.mark.asyncio
async def test_more_than_three_replies_from_a_model_are_trimmed(monkeypatch):
    _model(monkeypatch, '{"replies": ["a", "b", "c", "d", "e"]}')
    result = await compose.replies([{"from": "sara", "text": "hi"}], "ali", [])
    assert result["replies"] == ["a", "b", "c"]


@pytest.mark.asyncio
async def test_an_unparseable_reply_answer_is_an_empty_list_not_a_crash(monkeypatch):
    _model(monkeypatch, "Sure! Here are some ideas you could use.")
    result = await compose.replies([{"from": "sara", "text": "hi"}], "ali", [])
    assert result["replies"] == []


@pytest.mark.asyncio
async def test_an_empty_conversation_asks_no_model_at_all(monkeypatch):
    called = False

    class Counting:
        async def chat(self, *_args, **_kwargs):
            nonlocal called
            called = True
            yield Chunk(finished=True)

    monkeypatch.setattr(compose, "text_provider", lambda: Counting())
    assert (await compose.replies([], "ali", []))["replies"] == []
    assert called is False


@pytest.mark.asyncio
async def test_the_persons_own_posts_are_put_in_the_prompt_to_match_their_voice(monkeypatch):
    seen = {}

    class Recording:
        async def chat(self, messages, *_args, **_kwargs):
            seen["prompt"] = messages[0]["content"]
            yield Chunk(text='{"replies":["ok"]}')
            yield Chunk(finished=True)

    monkeypatch.setattr(compose, "text_provider", lambda: Recording())
    monkeypatch.setattr(compose, "get_settings", lambda: dataclasses.replace(get_settings(), text_provider="groq"))

    await compose.replies([{"from": "sara", "text": "hi"}], "ali", ["went up the ridge before sunrise"])
    assert "went up the ridge before sunrise" in seen["prompt"]
    assert "Thrilled to announce" in seen["prompt"]  # as an instruction to avoid it


# --------------------------------------------------------------------------- polish

def test_polish_tidies_a_draft(monkeypatch):
    _use(monkeypatch, StubApi(CONVERSATION))
    body = client.post("/compose/polish", json={"draft": "went   up the  ridge"}, headers=bearer()).json()
    assert body["text"] == "Went up the ridge"
    assert body["changed"] is True


def test_polish_rejects_an_empty_draft():
    assert client.post("/compose/polish", json={"draft": ""}, headers=bearer()).status_code == 422


@pytest.mark.asyncio
async def test_polish_refuses_to_turn_two_lines_into_an_essay(monkeypatch):
    """A model that "improves" a short post into a long one is not polishing it."""
    essay = "I am thrilled to share " + ("a wonderful reflection on the journey " * 20)
    _model(monkeypatch, f'{{"text": "{essay}", "changed": true, "note": "expanded it"}}')

    result = await compose.polish("went up the ridge", [])
    assert result["text"] == "went up the ridge"
    assert result["changed"] is False


@pytest.mark.asyncio
async def test_polish_hands_back_the_original_when_the_model_returns_nothing(monkeypatch):
    _model(monkeypatch, '{"text": "", "changed": true}')
    result = await compose.polish("went up the ridge", [])
    assert result["text"] == "went up the ridge"
    assert result["changed"] is False


@pytest.mark.asyncio
async def test_polish_keeps_a_genuine_correction(monkeypatch):
    _model(monkeypatch, '{"text": "went up the ridge", "changed": true, "note": "fixed a typo"}')
    result = await compose.polish("went up teh ridge", [])
    assert result["text"] == "went up the ridge"
    assert result["changed"] is True
    assert result["note"] == "fixed a typo"


# --------------------------------------------------------------------------- hashtags

def test_hashtags_come_back_clean():
    body = client.post(
        "/compose/hashtags", json={"text": "sunrise hike above the valley"}, headers=bearer()
    ).json()
    assert body["hashtags"]
    assert all(t == t.lower() and t.isalnum() for t in body["hashtags"])


def test_hashtag_count_is_bounded():
    assert client.post("/compose/hashtags", json={"text": "a", "count": 0}, headers=bearer()).status_code == 422
    assert client.post("/compose/hashtags", json={"text": "a", "count": 99}, headers=bearer()).status_code == 422


@pytest.mark.asyncio
async def test_hashtags_are_stripped_of_hashes_spaces_and_duplicates(monkeypatch):
    _model(monkeypatch, '{"hashtags": ["#Hiking", "hiking", "Sun Rise", "!!!", "trail"]}')
    result = await compose.hashtags("anything")
    assert result["hashtags"] == ["hiking", "sunrise", "trail"]


@pytest.mark.asyncio
async def test_an_absurdly_long_tag_is_dropped(monkeypatch):
    _model(monkeypatch, '{"hashtags": ["' + "x" * 40 + '", "ok"]}')
    result = await compose.hashtags("anything")
    assert result["hashtags"] == ["ok"]


def test_alt_text_does_not_spend_a_second_model_call_unless_asked():
    body = client.post(
        "/media/alt-text", files={"file": ("p.jpg", b"bytes", "image/jpeg")}, headers=bearer()
    ).json()
    assert body["hashtags"] == []

    with_tags = client.post(
        "/media/alt-text",
        files={"file": ("p.jpg", b"bytes", "image/jpeg")},
        data={"with_hashtags": "true"},
        headers=bearer(),
    ).json()
    assert with_tags["alt"]
    assert with_tags["hashtags"]
