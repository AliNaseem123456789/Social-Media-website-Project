"""
The turn loop.

A turn is: send the conversation to the model with the tool list, let it ask for tools, run the ones
that only read, and stop at the ones that write. Everything the loop learns is emitted as an event as
it happens, so the interface can show the answer arriving and show which tools ran rather than
presenting a finished paragraph after ten silent seconds.

Two rules shape the whole thing:

  * A tool marked `confirms=True` is never executed here. The loop reports it as a proposal and tells
    the model it is waiting, which ends the turn. The person presses the button; the interface calls
    the confirm endpoint; only then does the write happen.
  * There is a hard ceiling on tool rounds. A model that keeps calling tools instead of answering is
    a loop that costs money, so after the ceiling the tool list is withdrawn and it has to reply with
    what it already has.
"""

import json
import logging
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Any, AsyncIterator

from . import tools
from .config import get_settings
from .providers import text_provider
from .security import Caller
from .social_api import SocialApi

log = logging.getLogger("assistant.agent")

SYSTEM_PROMPT = """You are the assistant inside a social app, helping {username}.

You see only what {username} can see: their own posts and saved items, accounts they can view, and
conversations they are part of. When a tool comes back with a refusal, that is the app's privacy
rules working — say so plainly and move on. Never guess at content you could not read.

How to answer:
- Short. Two or three sentences unless they asked for something longer.
- Say what you did, not how you did it. "Found three posts about the hike" — not "I called search".
- No emoji unless they use them first. No exclamation marks stacked up. Do not call anything amazing.
- If a tool returns nothing, say nothing was there. Do not fill the gap with invention.

Doing things:
- Asked to write a post? Draft it and use open_composer so they can edit it before posting. Only use
  create_post if they clearly want it published as-is.
- Asked to go somewhere in the app, use go_to.
- Anything that posts, saves or follows needs their confirmation. Propose it; do not assume.
- Write in {username}'s own voice when drafting for them. Read their recent posts first if you need
  to hear it.

Today is {today}."""


# Tools whose result is usually a step rather than an answer: they hand back ids that the next call
# needs. Everything else — a digest, a list, a page change — is the end of the job.
#
# This matters because of money, not elegance. The tool schemas are most of every request, they are
# re-sent in full on each round, and the free tier allows 8000 tokens a minute in total. Withdrawing
# them once the model has what it asked for roughly halves the cost of an ordinary turn. The trade is
# that a model cannot chain two non-chaining tools in one turn; in practice it does not want to, and a
# turn it cannot finish is better than a turn nobody can afford to send.
CHAINING = {"find_people", "list_conversations", "search_posts"}


@dataclass
class Event:
    """One thing worth telling the interface about."""

    type: str
    data: dict[str, Any] = field(default_factory=dict)

    def sse(self) -> str:
        return f"event: {self.type}\ndata: {json.dumps(self.data)}\n\n"


def build_messages(caller: Caller, history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    system = SYSTEM_PROMPT.format(username=caller.username or "them", today=date.today().isoformat())
    # Only role and content survive from the client's history: anything else it sends is ignored, so a
    # crafted request cannot smuggle in fake tool results and make the model believe it read something.
    clean = [
        {"role": m["role"], "content": str(m.get("content", ""))}
        for m in history
        if m.get("role") in {"user", "assistant"} and m.get("content")
    ]
    return [{"role": "system", "content": system}, *clean[-12:]]


async def run_turn(caller: Caller, history: list[dict[str, Any]]) -> AsyncIterator[Event]:
    settings = get_settings()
    provider = text_provider()
    messages = build_messages(caller, history)
    schemas = tools.schemas()
    started = time.monotonic()
    usage = {"input_tokens": 0, "output_tokens": 0}

    offer_tools = True

    async with SocialApi(caller.token) as api:
        for round_number in range(settings.max_tool_rounds + 1):
            # Tools go out while there is still a reason to call one. On the last pass they are taken
            # away regardless, which forces an answer instead of another call.
            offered = schemas if offer_tools and round_number < settings.max_tool_rounds else None
            answer_parts: list[str] = []
            requested: list[Any] = []

            try:
                async for chunk in provider.chat(
                    messages, offered, max_tokens=settings.max_output_tokens
                ):
                    if chunk.text:
                        answer_parts.append(chunk.text)
                        yield Event("token", {"text": chunk.text})
                    if chunk.tool_calls:
                        requested.extend(chunk.tool_calls)
                    for key, value in chunk.usage.items():
                        usage[key] = usage.get(key, 0) + value
            except Exception as err:  # a provider outage should read as a sentence, not a 500
                log.exception("provider failed during turn")
                yield Event("error", {"message": _provider_message(err)})
                return

            if not requested:
                yield Event(
                    "done",
                    {
                        "usage": usage,
                        "ms": int((time.monotonic() - started) * 1000),
                        "text": "".join(answer_parts).strip(),
                    },
                )
                return

            # The model's own turn has to go into the history before the results, or the next request
            # is rejected for having tool replies with nothing to reply to.
            messages.append(
                {
                    "role": "assistant",
                    "content": "".join(answer_parts),
                    "tool_calls": [
                        {
                            "id": call.id,
                            "type": "function",
                            "function": {"name": call.name, "arguments": json.dumps(call.arguments)},
                        }
                        for call in requested
                    ],
                }
            )

            waiting = False
            for call in requested:
                entry = tools.REGISTRY.get(call.name)

                if entry and entry.confirms:
                    yield Event(
                        "confirm",
                        {
                            "id": call.id,
                            "tool": call.name,
                            "label": entry.confirm_label or "Go ahead",
                            "arguments": call.arguments,
                        },
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": call.id,
                            "content": json.dumps(
                                {
                                    "status": "awaiting_confirmation",
                                    "note": "Shown to the user for approval. Tell them what you are about"
                                    " to do and that you are waiting, then stop.",
                                }
                            ),
                        }
                    )
                    waiting = True
                    continue

                yield Event("tool", {"id": call.id, "name": call.name, "status": "running"})
                result = await tools.run(call.name, call.arguments, api)
                yield Event(
                    "tool",
                    {
                        "id": call.id,
                        "name": call.name,
                        "status": "error" if result.get("error") else "done",
                        "summary": _summarise(result),
                    },
                )
                if isinstance(result.get("ui"), dict):
                    yield Event("ui", result["ui"])
                messages.append(
                    {"role": "tool", "tool_call_id": call.id, "content": json.dumps(result)[:4000]}
                )

            if waiting:
                # One more pass so the model can say what it is proposing, then the turn is over.
                async for event in _final_word(provider, messages, usage, started):
                    yield event
                return

            # Nothing left to chain to, so the next round is the answer and does not need the tool list.
            offer_tools = any(call.name in CHAINING for call in requested)

    yield Event("done", {"usage": usage, "ms": int((time.monotonic() - started) * 1000), "text": ""})


async def _final_word(
    provider: Any, messages: list[dict[str, Any]], usage: dict[str, int], started: float
) -> AsyncIterator[Event]:
    parts: list[str] = []
    try:
        async for chunk in provider.chat(messages, None, max_tokens=200):
            if chunk.text:
                parts.append(chunk.text)
                yield Event("token", {"text": chunk.text})
            for key, value in chunk.usage.items():
                usage[key] = usage.get(key, 0) + value
    except Exception:
        log.exception("provider failed while describing a proposal")
    yield Event(
        "done",
        {"usage": usage, "ms": int((time.monotonic() - started) * 1000), "text": "".join(parts).strip()},
    )


async def confirm(caller: Caller, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Run a write tool now that the person has pressed the button."""
    entry = tools.REGISTRY.get(name)
    if entry is None:
        return {"error": f"There is no tool called {name}."}
    if not entry.confirms:
        # Read tools go through the loop. Letting them in here would be a second, unaudited door.
        return {"error": f"{name} is not a tool that needs confirming."}
    async with SocialApi(caller.token) as api:
        return await tools.run(name, arguments, api)


def _summarise(result: dict[str, Any]) -> str:
    if result.get("error"):
        return str(result["error"])[:160]
    items = result.get("items")
    if isinstance(items, list):
        return f"{len(items)} result{'' if len(items) == 1 else 's'}"
    if result.get("text"):
        return str(result["text"])[:160]
    return "done"


def _provider_message(err: Exception) -> str:
    # The free tier is 8000 tokens a minute, so hitting the limit is ordinary and the reply should say
    # what to do about it rather than reading like a fault.
    seconds = getattr(err, "seconds", None)
    if type(err).__name__ == "RateLimited" or "429" in str(err):
        if seconds:
            return f"That's the model's rate limit — it frees up in about {round(seconds)} seconds."
        return "That's the model's rate limit. Give it a minute and ask again."

    text = str(err)
    if "401" in text or "403" in text:
        return "The model rejected our key. That is a configuration problem on our side, not yours."
    return "The model did not answer. Try again in a moment."
