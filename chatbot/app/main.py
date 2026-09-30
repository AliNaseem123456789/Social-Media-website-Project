"""
The HTTP surface.

Small on purpose: a streaming chat endpoint, a confirm endpoint for the writes chat proposes, and two
media endpoints that exist because they are genuinely useful on their own — a voice note becoming a
draft, and a photo getting alt text before it is posted. Everything about a person is read through the
Node API with their own token, so this service holds no database credentials and no copy of the
permission rules.
"""

import logging
from typing import Any, AsyncIterator

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import agent, compose, evals_api, internal, tools
from .config import get_settings
from .providers import audio_provider, vision_provider
from .security import Caller, current_caller
from .social_api import SocialApi

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("assistant")

app = FastAPI(title="Assistant", version="1.0.0", docs_url="/docs" if settings.env == "development" else None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(internal.router)
app.include_router(evals_api.router)

# 8 MB. Whisper and the vision model both cope with far more, but a social app does not need to accept
# a 200 MB upload into memory to find out the model will reject it.
MAX_UPLOAD = 8 * 1024 * 1024

ALT_TEXT_PROMPT = (
    "Write alt text for this image for someone using a screen reader. One or two sentences. Say what is "
    "in the picture and what matters about it. Do not begin with 'image of' or 'photo of'. No adjectives "
    "that a sighted person would not need either."
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=40)


class ConfirmRequest(BaseModel):
    tool: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class ReplyRequest(BaseModel):
    conversation_id: int = Field(gt=0)


class PolishRequest(BaseModel):
    draft: str = Field(min_length=1, max_length=5000)


class HashtagRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    count: int = Field(default=4, ge=1, le=8)


@app.get("/health")
async def health() -> dict[str, Any]:
    """Liveness, plus which providers are actually wired, which is the first thing to check on a bad day."""
    return {
        "ok": True,
        "env": settings.env,
        "providers": {
            "text": settings.text_provider,
            "vision": settings.vision_provider,
            "audio": settings.audio_provider,
            "embed": settings.embed_provider,
        },
        "tools": len(tools.REGISTRY),
    }


@app.get("/capabilities")
async def capabilities(caller: Caller = Depends(current_caller)) -> dict[str, Any]:
    """What the assistant can do, for the interface to show without hard-coding a second list."""
    return {
        "tools": [
            {"name": t.name, "description": t.description, "needs_confirmation": t.confirms}
            for t in tools.REGISTRY.values()
        ],
        "voice": settings.audio_provider != "fake" or settings.env == "development",
        "vision": settings.vision_provider != "fake" or settings.env == "development",
    }


@app.post("/chat")
async def chat(request: ChatRequest, caller: Caller = Depends(current_caller)) -> StreamingResponse:
    history = [m.model_dump() for m in request.messages]

    async def stream() -> AsyncIterator[bytes]:
        try:
            async for event in agent.run_turn(caller, history):
                yield event.sse().encode()
        except Exception:
            # The response has already begun, so the only honest thing left is an error event.
            log.exception("turn failed for user %s", caller.user_id)
            yield agent.Event("error", {"message": "Something broke on our side mid-answer."}).sse().encode()

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@app.post("/chat/confirm")
async def chat_confirm(request: ConfirmRequest, caller: Caller = Depends(current_caller)) -> dict[str, Any]:
    result = await agent.confirm(caller, request.tool, request.arguments)
    if result.get("error"):
        raise HTTPException(status_code=result.get("status", 400), detail=result["error"])
    return result


async def _recent_posts(api: SocialApi, limit: int = 5) -> list[str]:
    """The person's own recent posts, so a draft can be written in their voice instead of a model's.

    Best effort: if this fails the prompt falls back to plain rules about voice. Losing the samples makes
    a suggestion blander, which is not worth failing a request over.
    """
    try:
        result = await tools.run("list_my_posts", {"limit": limit}, api)
        return [str(item.get("summary") or "") for item in result.get("items", [])]
    except Exception:
        log.debug("could not read recent posts for voice matching", exc_info=True)
        return []


@app.post("/compose/replies")
async def suggest_replies(request: ReplyRequest, caller: Caller = Depends(current_caller)) -> dict[str, Any]:
    """Three things they could say next. The conversation is read with their token, so this only works
    for conversations they are in — and nothing is sent."""
    async with SocialApi(caller.token) as api:
        conversation = await tools.run(
            "read_conversation", {"conversation_id": request.conversation_id, "limit": 12}, api
        )
        if conversation.get("error"):
            raise HTTPException(status_code=conversation.get("status", 400), detail=conversation["error"])
        recent = await _recent_posts(api)

    messages = [{"from": m.get("from"), "text": m.get("summary")} for m in conversation.get("items", [])]
    return await compose.replies(messages, caller.username, recent)


@app.post("/compose/polish")
async def polish_draft(request: PolishRequest, caller: Caller = Depends(current_caller)) -> dict[str, Any]:
    async with SocialApi(caller.token) as api:
        recent = await _recent_posts(api)
    return await compose.polish(request.draft, recent)


@app.post("/compose/hashtags")
async def suggest_hashtags(request: HashtagRequest, caller: Caller = Depends(current_caller)) -> dict[str, Any]:
    return await compose.hashtags(request.text, request.count)


@app.post("/media/transcribe")
async def transcribe(
    file: UploadFile = File(...), caller: Caller = Depends(current_caller)
) -> dict[str, Any]:
    """A voice note in, text out. The draft goes to the composer; nothing is posted here."""
    audio = await _read_upload(file)
    text = await audio_provider().transcribe(audio, file.filename or "note.webm")
    return {"text": text, "ui": {"action": "compose", "content": text}}


@app.post("/media/alt-text")
async def alt_text(
    file: UploadFile = File(...),
    with_hashtags: bool = Form(default=False),
    caller: Caller = Depends(current_caller),
) -> dict[str, Any]:
    image = await _read_upload(file)
    mime = file.content_type or "image/jpeg"
    if not mime.startswith("image/"):
        raise HTTPException(status_code=415, detail="That is not an image.")

    described = (await vision_provider().describe(image, mime, ALT_TEXT_PROMPT)).strip().strip('"')

    # Off by default: it is a second model call, and free quotas are per-minute. The composer asks for it
    # when the person is actually attaching a photo to a post.
    tags = (await compose.hashtags(described)).get("hashtags", []) if with_hashtags and described else []
    return {"alt": described, "hashtags": tags}


async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The upload was empty.")
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=413, detail="That file is larger than 8 MB.")
    return data
