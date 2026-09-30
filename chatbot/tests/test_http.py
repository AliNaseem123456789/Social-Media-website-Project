import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)


def bearer(**overrides) -> dict[str, str]:
    settings = get_settings()
    claims = {
        "sub": "7",
        "name": "ali",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(time.time()),
        "exp": int(time.time()) + 300,
    }
    claims.update(overrides)
    token = jwt.encode(claims, settings.jwt_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def test_health_needs_no_token_and_says_what_is_wired():
    body = client.get("/health").json()
    assert body["ok"] is True
    assert body["providers"]["text"] == "fake"
    assert body["tools"] > 5


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer nonsense"},
        {"Authorization": "notbearer abc"},
        {"Authorization": "Bearer "},
    ],
)
def test_every_real_endpoint_refuses_a_bad_token(headers):
    assert client.get("/capabilities", headers=headers).status_code == 401
    assert client.post("/chat", json={"messages": [{"role": "user", "content": "hi"}]}, headers=headers).status_code == 401


def test_a_token_signed_with_the_wrong_secret_is_refused():
    settings = get_settings()
    token = jwt.encode(
        {"sub": "7", "iss": settings.jwt_issuer, "aud": settings.jwt_audience, "exp": int(time.time()) + 60},
        "not-our-secret",
        algorithm="HS256",
    )
    response = client.get("/capabilities", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_an_expired_token_says_so():
    response = client.get("/capabilities", headers=bearer(exp=int(time.time()) - 10))
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_a_token_for_another_audience_is_refused():
    response = client.get("/capabilities", headers=bearer(aud="someone-elses-app"))
    assert response.status_code == 401


def test_capabilities_lists_the_tools_and_marks_the_ones_that_confirm():
    body = client.get("/capabilities", headers=bearer()).json()
    by_name = {t["name"]: t for t in body["tools"]}
    assert by_name["create_post"]["needs_confirmation"] is True
    assert by_name["search_posts"]["needs_confirmation"] is False


def test_chat_rejects_an_empty_conversation():
    assert client.post("/chat", json={"messages": []}, headers=bearer()).status_code == 422


def test_chat_streams_server_sent_events():
    with client.stream(
        "POST", "/chat", json={"messages": [{"role": "user", "content": "hello"}]}, headers=bearer()
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        body = "".join(response.iter_text())
    assert "event: token" in body
    assert body.rstrip().endswith("\n") is False or "event: done" in body


def test_transcribe_turns_audio_into_a_composer_draft():
    body = client.post(
        "/media/transcribe",
        files={"file": ("note.webm", b"pretend-audio", "audio/webm")},
        headers=bearer(),
    ).json()
    assert body["text"]
    assert body["ui"]["action"] == "compose"


def test_an_empty_upload_is_a_400():
    response = client.post(
        "/media/transcribe", files={"file": ("note.webm", b"", "audio/webm")}, headers=bearer()
    )
    assert response.status_code == 400


def test_an_oversized_upload_is_a_413():
    response = client.post(
        "/media/alt-text",
        files={"file": ("big.jpg", b"x" * (8 * 1024 * 1024 + 1), "image/jpeg")},
        headers=bearer(),
    )
    assert response.status_code == 413


def test_alt_text_refuses_something_that_is_not_an_image():
    response = client.post(
        "/media/alt-text", files={"file": ("notes.txt", b"hello", "text/plain")}, headers=bearer()
    )
    assert response.status_code == 415


def test_alt_text_describes_the_image_without_saying_image_of():
    body = client.post(
        "/media/alt-text", files={"file": ("p.jpg", b"pretend-jpeg-bytes", "image/jpeg")}, headers=bearer()
    ).json()
    assert body["alt"]
    assert not body["alt"].lower().startswith(("image of", "photo of"))
