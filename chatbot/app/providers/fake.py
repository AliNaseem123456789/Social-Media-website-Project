"""
A provider that answers without a network or a key.

This is not a stub that returns "ok". It reads the conversation and decides, with plain rules, which
tool a real model would reach for, which makes the whole path — tool loop, streaming, UI intents,
error handling — testable and developable before anyone has an API key. The eval suite runs against it
too, so a run costs nothing and its numbers are reproducible.
"""

import hashlib
import json
import re
from typing import Any, AsyncIterator

from .base import Chunk, ToolCall

# Ordered, and the order is the design: the first pattern that matches wins, so anything specific has to
# come before anything general. "show me my saved posts" contains "my posts", and a rule table that puts
# list_my_posts first will answer the wrong question every time.
#
# These are written as the plainest general phrasings for each tool, not tuned against the eval set —
# tuning them would turn the evals into a measurement of this table rather than of the assistant, and the
# score that matters is the one a real model gets.
_TRIGGERS: list[tuple[re.Pattern[str], str, dict[str, Any]]] = [
    # A refusal has to come first, or "delete all my posts" matches "my posts" and lists them.
    (re.compile(r"\b(delete|remove|wipe|clear)\b", re.I), None, {}),

    # An explicit "take me to X" is a navigation intent whatever X is, so it has to beat the rules that
    # match on the noun alone — otherwise "take me to my saved posts" lists them instead of going there.
    (re.compile(r"\b(open|go to|take me to|show me)\s+(my\s+)?"
                r"(home|feed|messages?|notifications?|settings|friends|saved|drafts?|profile)\b", re.I),
     "go_to", {}),

    # Likewise an explicit search beats "post about", which otherwise catches "my post about the hike"
    # and offers to write one.
    (re.compile(r"\b(find|search|look for)\b.{0,40}\b(post|posts)\b", re.I), "search_posts", {}),

    (re.compile(r"\b(saved|bookmark(ed)?)\b|\bdid i save\b", re.I), "list_saved_posts", {}),
    (re.compile(r"\bdrafts?\b(?!\s+(a|an|the)\b)", re.I), "list_drafts", {}),
    # "what's trending" and "any hashtags", but not "show me the hiking tag", which is one specific tag
    # and belongs in a search.
    (re.compile(r"\b(trending|popular)\b|\bhashtags?\b", re.I), "trending_hashtags", {}),
    (re.compile(r"\bthe \w+ (tag|hashtag)\b|#\w+", re.I), "search_posts", {}),
    (re.compile(r"\b(friend|follow)\s+requests?\b|\brequests?\s+waiting\b", re.I), "pending_friend_requests", {}),


    (re.compile(r"\b(who|anyone).{0,24}(follow|friend|add)|suggest.{0,20}(people|friends)"
                r"|\b(find|help me find)\s+(me\s+)?(friends|people)\b|who to (follow|add)", re.I),
     "suggest_people", {"limit": 3}),
    (re.compile(r"\b(find|look up|search for|is there)\b.{0,30}\b(account|user|profile|called|named)\b"
                r"|\bfind\s+\w+'s\b", re.I),
     "find_people", {}),

    (re.compile(r"\b(what did i miss|catch me up|what'?s new|missed|anything new|what'?s going on"
                r"|haven'?t read|since yesterday|anything important)\b", re.I),
     "catch_me_up", {}),

    (re.compile(r"\b(schedule|publish)\b.{0,30}\b(later|tomorrow|tonight|at \d{1,2})", re.I),
     "save_draft", {}),
    (re.compile(r"\b(draft|write|compose)\b.{0,24}\bpost\b|\bpost (that|about)\b", re.I), "open_composer", {}),

    (re.compile(r"\b(unread|messages?|conversations?|chats?|dms?)\b", re.I), "list_conversations", {}),
    (re.compile(r"\b(find|search|look for|show me)\b.{0,40}\b(post|posts|about|mentioning)\b"
                r"|\b(say|said|saying)\s+about\b", re.I),
     "search_posts", {}),
    (re.compile(r"\b(my|i)\b.{0,20}\b(posts?|posted)\b|\brecent\b.{0,16}\bposts?\b", re.I),
     "list_my_posts", {"limit": 5}),
]

# Tools that read the person's own things. If the question is about someone else's — "my boss's drafts",
# "sara's saved posts" — none of them is the right answer, and firing one produces a confident reply about
# entirely the wrong account. A real model is expected to notice this from the sentence; the rules need it
# spelled out.
_PERSONAL = {"list_drafts", "list_saved_posts", "list_my_posts", "catch_me_up", "list_conversations"}
_SOMEONE_ELSE = re.compile(r"\b(\w+'s|his|her|their|everyone'?s|someone'?s)\s+\w*\s*"
                           r"(draft|post|message|chat|saved|bookmark|notification|dm)", re.I)


def _last_user_message(messages: list[dict[str, Any]]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            content = message.get("content")
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                return " ".join(part.get("text", "") for part in content if isinstance(part, dict))
    return ""


class FakeTextProvider:
    async def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        *,
        temperature: float = 0.4,
        max_tokens: int | None = None,
    ) -> AsyncIterator[Chunk]:
        question = _last_user_message(messages)
        already_called = {
            call["function"]["name"]
            for message in messages
            if message.get("role") == "assistant"
            for call in message.get("tool_calls") or []
        }
        names = {tool["function"]["name"] for tool in tools or []}

        for pattern, tool_name, arguments in _TRIGGERS:
            if not pattern.search(question):
                continue
            # A None entry is a deliberate "no tool fits this": stop looking rather than falling through
            # to a broader pattern that would answer a different question.
            if tool_name is None:
                break
            if tool_name in _PERSONAL and _SOMEONE_ELSE.search(question):
                break
            if tool_name in names and tool_name not in already_called:
                payload = dict(arguments)
                if tool_name == "search_posts":
                    payload["query"] = _keywords(question)
                if tool_name in {"open_composer", "save_draft"}:
                    payload["content"] = _draft(question)
                yield Chunk(tool_calls=[ToolCall(id=f"call_{tool_name}", name=tool_name, arguments=payload)])
                yield Chunk(finished=True, usage={"input_tokens": len(question) // 4, "output_tokens": 12})
                return

        # No tool wanted, or the tools already ran: answer from whatever is in the conversation.
        answer = _compose_answer(messages, question)
        for word in answer.split(" "):
            yield Chunk(text=word + " ")
        yield Chunk(
            finished=True,
            usage={"input_tokens": sum(len(str(m)) for m in messages) // 4, "output_tokens": len(answer) // 4},
        )


def _keywords(question: str) -> str:
    words = [w for w in re.findall(r"[a-zA-Z']{3,}", question) if w.lower() not in _STOP]
    return " ".join(words[-3:]) or question[:40]


def _draft(question: str) -> str:
    """Not writing, exactly — enough of a sentence that the composer path can be tested end to end."""
    subject = re.sub(r"^\s*(please\s+)?(draft|write|compose)\s+(me\s+)?(a\s+)?post\s*(about|on|for)?\s*", "", question, flags=re.I)
    subject = subject.strip(" .?!") or "today"
    return subject[0].upper() + subject[1:] + "."


_STOP = {
    "find", "search", "show", "look", "for", "the", "about", "posts", "post", "any", "with", "that",
    "please", "can", "you", "and", "from", "what", "was", "were", "have",
}


def _compose_answer(messages: list[dict[str, Any]], question: str) -> str:
    """Summarise whatever the tools returned, so the fake path exercises the same shape as a real one."""
    results = [m for m in messages if m.get("role") == "tool"]
    if not results:
        return "I can look through your posts, find people worth following, catch you up on what you missed, or draft something for you. Which would help?"

    try:
        payload = json.loads(results[-1].get("content") or "{}")
    except (TypeError, ValueError):
        payload = {}

    if isinstance(payload, dict) and payload.get("error"):
        # A real model relays a refusal in words; the fake one has to as well, or the tests would pass
        # against behaviour the live path does not have.
        return f"That didn't work: {payload['error']}"

    items = payload.get("items") if isinstance(payload, dict) else None
    if isinstance(items, list) and items:
        listed = "; ".join(head for head in (_head(item) for item in items[:3]) if head)
        return f"Found {len(items)}: {listed}."
    if isinstance(payload, dict) and payload.get("text"):
        return str(payload["text"])
    return "That's everything I could find for you."


def _head(item: dict[str, Any]) -> str:
    """Whoever it is, then what it says — a suggestion is useless without the name."""
    if not isinstance(item, dict):
        return str(item)[:60]
    who = item.get("username") or item.get("author") or item.get("from") or ""
    what = str(item.get("summary") or item.get("content") or item.get("last") or "")[:60]
    return f"{who} ({what})" if who and what else (who or what)


class FakeVisionProvider:
    async def describe(self, image: bytes, mime_type: str, prompt: str) -> str:
        # Deterministic per image, so tests can assert on it without a network.
        digest = hashlib.sha256(image).hexdigest()[:6]
        return f"A photograph ({mime_type.split('/')[-1]}, ref {digest}) showing an outdoor scene with people."


class FakeAudioProvider:
    async def transcribe(self, audio: bytes, filename: str) -> str:
        return "sunrise hike on saturday, seven at the trailhead, bringing the good thermos"


class FakeEmbedProvider:
    def __init__(self, dimensions: int = 768):
        self.dimensions = dimensions

    async def embed(self, texts: list[str]) -> list[list[float]]:
        # Hash-based, so the same text always lands in the same place and similar strings do not collide.
        vectors = []
        for text in texts:
            digest = hashlib.sha256(text.lower().encode()).digest()
            raw = [(digest[i % len(digest)] / 255.0) - 0.5 for i in range(self.dimensions)]
            length = sum(value * value for value in raw) ** 0.5 or 1.0
            vectors.append([value / length for value in raw])
        return vectors
