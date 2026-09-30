"""
Proves each provider actually works, from wherever you run it.

Written because a config file that *looks* right tells you nothing: the key can be wrong, the model id
can be one that reads plausibly and does not exist, the free tier can be exhausted, and every one of
those fails differently. This makes one real call per capability and says what happened.

It also prints the measured token cost of a turn, taken from the API's own usage field rather than an
estimate, because the free tier is 8000 tokens a minute and that number decides whether this is usable.

    python scripts/doctor.py           # everything configured in .env
    python scripts/doctor.py --models  # also list every model each key can see

Safe to run: a handful of tiny requests, well under a minute's allowance.
"""

import argparse
import asyncio
import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import httpx  # noqa: E402

from app import tools  # noqa: E402
from app.agent import SYSTEM_PROMPT  # noqa: E402
from app.config import get_settings  # noqa: E402

GROQ = "https://api.groq.com/openai/v1"
GEMINI = "https://generativelanguage.googleapis.com/v1beta"

# A 1x1 PNG, so the vision check needs no fixture file on disk.
PIXEL = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
    "00000049454e44ae426082"
)

OK, BAD, SKIP, WARN = "  ok  ", " fail ", " skip ", " warn "
_failures = 0


def say(mark: str, label: str, detail: str = "") -> None:
    global _failures
    if mark == BAD:
        _failures += 1
    print(f"[{mark}] {label}" + (f"\n         {detail}" if detail else ""))


async def check_groq_key(settings) -> list[str]:
    """Returns the model ids this key can see, or [] if the key is unusable."""
    if settings.groq_api_key == "":
        say(SKIP, "Groq key", "GROQ_API_KEY is empty")
        return []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"{GROQ}/models", headers={"Authorization": f"Bearer {settings.groq_api_key}"}
            )
    except httpx.RequestError as err:
        say(BAD, "Groq key", f"could not reach api.groq.com: {err}")
        return []

    if response.status_code == 401:
        say(BAD, "Groq key", "rejected (401). The key is wrong or has been revoked.")
        return []
    if response.status_code >= 400:
        say(BAD, "Groq key", f"{response.status_code}: {response.text[:160]}")
        return []

    ids = sorted(m["id"] for m in response.json().get("data", []))
    say(OK, "Groq key", f"accepted, {len(ids)} models visible")
    return ids


async def check_groq_chat(settings, available: list[str]) -> None:
    model = settings.groq_text_model
    if model not in available:
        say(BAD, f"Groq chat model ({model})", "this key cannot see that model id — see --models")
        return

    body = {
        "model": model,
        "messages": [{"role": "user", "content": "Reply with the single word: ready"}],
        "max_completion_tokens": 8,
        "temperature": 0,
    }
    started = time.perf_counter()
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{GROQ}/chat/completions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json=body,
        )
    took = (time.perf_counter() - started) * 1000

    if response.status_code == 429:
        say(WARN, f"Groq chat ({model})", f"rate limited; retry-after {response.headers.get('retry-after', '?')}s")
        return
    if response.status_code >= 400:
        say(BAD, f"Groq chat ({model})", f"{response.status_code}: {response.text[:200]}")
        return

    payload = response.json()
    reply = (payload["choices"][0]["message"].get("content") or "").strip()
    say(OK, f"Groq chat ({model})", f"{took:.0f}ms, replied {reply!r}")


async def measure_turn(settings, available: list[str]) -> None:
    """One real tool-calling request, to get the exact input token count from the API.

    This is the number that decides whether the free tier is usable, and it is the one thing an estimate
    genuinely cannot give you — tokenisers differ, and the tool schemas are most of the payload.
    """
    model = settings.groq_text_model
    if model not in available:
        return

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT.format(username="ali", today="2026-01-01")},
            {"role": "user", "content": "What did I miss?"},
        ],
        "tools": tools.schemas(),
        "tool_choice": "auto",
        "max_completion_tokens": 64,
        "temperature": 0,
    }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{GROQ}/chat/completions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json=body,
        )
    if response.status_code >= 400:
        say(WARN, "Turn cost", f"could not measure: {response.status_code}")
        return

    payload = response.json()
    usage = payload.get("usage", {})
    prompt_tokens = usage.get("prompt_tokens", 0)
    chose = (payload["choices"][0]["message"].get("tool_calls") or [{}])[0].get("function", {}).get("name")

    # The answer round re-sends the system prompt and the conversation, but not the tool list.
    answer_round = prompt_tokens - _schema_tokens(prompt_tokens) + 320
    turn = prompt_tokens + max(answer_round, 400)

    say(OK, "Turn cost", f"{prompt_tokens} input tokens for round one; it chose {chose or 'no tool'}")
    print(f"         a whole tool-using turn is roughly {turn} tokens")
    print(f"         free tier is 8000/min and 200000/day -> about {8000 // turn} turns a minute,"
          f" {200000 // turn} a day")
    if 8000 // turn < 2:
        print("         that is tight: expect to hit the per-minute limit in normal use")


def _schema_tokens(prompt_tokens: int) -> int:
    """Rough split of how much of the prompt was the tool list, for the second-round estimate."""
    schema_chars = len(json.dumps(tools.schemas()))
    total_chars = schema_chars + len(SYSTEM_PROMPT) + 40
    return int(prompt_tokens * (schema_chars / total_chars))


async def check_groq_audio(settings, available: list[str]) -> None:
    model = settings.groq_audio_model
    if model not in available:
        say(BAD, f"Groq audio model ({model})", "this key cannot see that model id")
        return
    # A fraction of a second of silence: enough for the API to accept the file and answer.
    wav = _silence()
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{GROQ}/audio/transcriptions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            files={"file": ("silence.wav", wav, "audio/wav")},
            data={"model": model, "response_format": "text"},
        )
    if response.status_code >= 400:
        say(BAD, f"Groq audio ({model})", f"{response.status_code}: {response.text[:200]}")
        return
    say(OK, f"Groq audio ({model})", f"accepted the upload, transcript {response.text.strip()[:40]!r}")


def _silence(seconds: float = 0.4, rate: int = 16000) -> bytes:
    import struct

    frames = int(seconds * rate)
    data = b"\x00\x00" * frames
    header = b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVEfmt "
    header += struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
    header += b"data" + struct.pack("<I", len(data))
    return header + data


async def check_gemini(settings, list_models: bool) -> None:
    if settings.google_api_key == "":
        say(SKIP, "Google key", "GOOGLE_API_KEY is empty")
        return

    headers = {"x-goog-api-key": settings.google_api_key}
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.get(f"{GEMINI}/models", headers=headers)
    except httpx.RequestError as err:
        say(BAD, "Google key", f"could not reach generativelanguage.googleapis.com: {err}")
        return

    if response.status_code >= 400:
        say(BAD, "Google key", f"{response.status_code}: {response.text[:200]}")
        return

    names = [m["name"].removeprefix("models/") for m in response.json().get("models", [])]
    say(OK, "Google key", f"accepted, {len(names)} models visible")
    if list_models:
        for name in sorted(names):
            print(f"           {name}")

    # ---- vision
    model = settings.gemini_vision_model
    if model not in names:
        near = [n for n in names if "flash" in n][:6]
        say(BAD, f"Gemini vision model ({model})", f"not in this key's list. Flash models available: {', '.join(near) or 'none'}")
    else:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{GEMINI}/models/{model}:generateContent",
                headers=headers,
                json={
                    "contents": [{"parts": [
                        {"text": "Reply with one word describing this image."},
                        {"inline_data": {"mime_type": "image/png", "data": _b64(PIXEL)}},
                    ]}],
                    "generationConfig": {"maxOutputTokens": 16, "temperature": 0},
                },
            )
        if response.status_code >= 400:
            say(BAD, f"Gemini vision ({model})", f"{response.status_code}: {response.text[:200]}")
        else:
            candidates = response.json().get("candidates") or []
            parts = (candidates[0].get("content", {}).get("parts") if candidates else []) or []
            text = " ".join(p.get("text", "") for p in parts).strip()
            say(OK, f"Gemini vision ({model})", f"answered {text[:60]!r}")

    # ---- embeddings
    embed = settings.gemini_embed_model
    if embed not in names:
        say(BAD, f"Gemini embedding model ({embed})", "not in this key's list")
        return

    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{GEMINI}/models/{embed}:batchEmbedContents",
            headers=headers,
            json={"requests": [
                {"model": f"models/{embed}", "content": {"parts": [{"text": t}]},
                 "outputDimensionality": settings.embed_dimensions}
                for t in ("a sunrise hike above the valley", "walking in the mountains at dawn", "quarterly tax filing")
            ]},
        )
    if response.status_code >= 400:
        say(BAD, f"Gemini embeddings ({embed})", f"{response.status_code}: {response.text[:200]}")
        return

    vectors = [e.get("values", []) for e in response.json().get("embeddings", [])]
    if len(vectors) != 3 or any(len(v) != settings.embed_dimensions for v in vectors):
        say(BAD, f"Gemini embeddings ({embed})",
            f"expected 3 vectors of {settings.embed_dimensions}, got {[len(v) for v in vectors]}")
        return

    # The dimension has to match the vector(768) column in migration 6, and the vectors should actually
    # encode meaning — two ways of saying the same thing must land closer than two unrelated sentences.
    near = _cosine(vectors[0], vectors[1])
    far = _cosine(vectors[0], vectors[2])
    say(OK, f"Gemini embeddings ({embed})", f"{settings.embed_dimensions} dimensions, matches the database column")
    verdict = "good" if near > far else "SUSPECT — unrelated text scored closer"
    print(f"         similar sentences {near:.3f} vs unrelated {far:.3f} — {verdict}")
    if near <= far:
        globals()["_failures"] = _failures + 1


def _b64(data: bytes) -> str:
    import base64

    return base64.b64encode(data).decode()


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5 or 1.0
    nb = sum(y * y for y in b) ** 0.5 or 1.0
    return dot / (na * nb)


async def check_backend(settings) -> None:
    """The assistant reads everything through the Node API, so if that is down nothing else matters."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(f"{settings.api_base}/moderation/reasons")
    except httpx.RequestError as err:
        say(WARN, "Backend API", f"{settings.api_base} did not answer ({err}). Start it before using the assistant.")
        return
    # Unauthenticated, so 401 is a perfectly good sign of life.
    if response.status_code in (200, 401, 403):
        say(OK, "Backend API", f"{settings.api_base} is up")
    else:
        say(WARN, "Backend API", f"{settings.api_base} answered {response.status_code}")


async def main() -> int:
    parser = argparse.ArgumentParser(description="Check that the assistant's providers actually work.")
    parser.add_argument("--models", action="store_true", help="list every model each key can see")
    args = parser.parse_args()

    settings = get_settings()
    print(f"\nproviders: text={settings.text_provider} vision={settings.vision_provider} "
          f"audio={settings.audio_provider} embed={settings.embed_provider}\n")

    await check_backend(settings)

    if settings.text_provider == "groq" or settings.audio_provider == "groq":
        ids = await check_groq_key(settings)
        if ids and args.models:
            for name in ids:
                print(f"           {name}")
        if ids and settings.text_provider == "groq":
            await check_groq_chat(settings, ids)
            await measure_turn(settings, ids)
        if ids and settings.audio_provider == "groq":
            await check_groq_audio(settings, ids)
    else:
        say(SKIP, "Groq", "not selected; chat and voice are using the offline stand-in")

    if settings.vision_provider == "gemini" or settings.embed_provider == "gemini":
        await check_gemini(settings, args.models)
    else:
        say(SKIP, "Gemini", "not selected; alt text and embeddings are using the offline stand-in")

    print()
    if _failures:
        print(f"{_failures} problem(s). Nothing above is guesswork — each line is a real call.\n")
        return 1
    print("Everything configured answered correctly.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
