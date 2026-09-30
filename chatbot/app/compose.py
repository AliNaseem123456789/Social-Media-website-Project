"""
Help with writing, rather than writing instead of the person.

Every function here returns *suggestions*. Nothing is sent, nothing is posted, nothing is saved — the
text comes back to the interface and the person decides. That is not timidity; an assistant that sends
messages in your name and gets the tone wrong costs you a friendship, and no amount of model quality
makes that risk worth taking silently.

The prompts all pull hard in one direction: sound like the person, not like a model. Left alone, these
models write "I'm thrilled to share that...", and a feed full of that is worse than a feed with typos.
"""

import json
import logging
import re
from typing import Any

from .config import get_settings
from .providers import text_provider

log = logging.getLogger("assistant.compose")

VOICE_RULES = """Write the way they write. Specifically:
- Match the length of their own posts. If they write two lines, write two lines.
- No opener like "Excited to share" or "Thrilled to announce". No closing question to drive engagement.
- No emoji unless their own posts use them. No hashtags unless asked.
- Plain words. Nothing is "incredible" or "a game changer".
- Their punctuation habits, including the sloppy ones. Lowercase if they write lowercase."""

REPLY_PROMPT = """Suggest three replies {who} could send next in this conversation.

{conversation}

{voice}

Three distinct options, not three rewordings of one: one warm, one brief, one that asks something. Each
under 200 characters. If the last message needs information only they have, say so in that option rather
than inventing it.

JSON only: {{"replies": ["...", "...", "..."]}}"""

POLISH_PROMPT = """Tidy this draft. Fix spelling, grammar and clumsy phrasing. Do not change what it says,
do not make it longer, and do not make it sound professional.

Draft:
---
{draft}
---

{voice}

If the draft is already fine, return it unchanged.

JSON only: {{"text": "...", "changed": true|false, "note": "one short line on what you changed, or empty"}}"""

HASHTAG_PROMPT = """Suggest up to {count} hashtags for this post.

{text}

Lowercase, no punctuation, no spaces, no # symbol. Tags someone would actually search for — a topic, a
place, an activity. Nothing generic like #love or #instagood, nothing longer than two words joined.
If nothing fits, return an empty list rather than padding it.

JSON only: {{"hashtags": ["...", "..."]}}"""


async def _ask(prompt: str, *, max_tokens: int = 400, temperature: float = 0.6) -> str:
    parts: list[str] = []
    async for chunk in text_provider().chat(
        [{"role": "user", "content": prompt}], None, temperature=temperature, max_tokens=max_tokens
    ):
        if chunk.text:
            parts.append(chunk.text)
    return "".join(parts)


def _json(raw: str) -> dict[str, Any]:
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        return {}
    try:
        payload = json.loads(match.group(0))
    except ValueError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _voice_sample(recent: list[str]) -> str:
    if not recent:
        return VOICE_RULES
    examples = "\n".join(f"  - {post.strip()[:200]}" for post in recent[:5] if post.strip())
    if not examples:
        return VOICE_RULES
    return f"{VOICE_RULES}\n\nTheir recent posts, to hear the voice:\n{examples}"


async def replies(messages: list[dict[str, str]], username: str, recent: list[str]) -> dict[str, Any]:
    """Three things they could say next. Suggestions only — nothing is sent from here."""
    if not messages:
        return {"replies": []}

    if get_settings().is_fake:
        return {"replies": _fake_replies(messages)}

    transcript = "\n".join(
        f"{m.get('from') or 'them'}: {str(m.get('text') or '')[:300]}" for m in messages[-12:]
    )
    prompt = REPLY_PROMPT.format(
        who=username or "they",
        conversation=transcript,
        voice=_voice_sample(recent),
    )
    payload = _json(await _ask(prompt))
    found = [str(r).strip()[:280] for r in payload.get("replies", []) if str(r).strip()]
    # Three is the contract the interface renders; fewer is fine, more is noise.
    return {"replies": found[:3]}


async def polish(draft: str, recent: list[str]) -> dict[str, Any]:
    draft = draft.strip()
    if not draft:
        return {"text": "", "changed": False, "note": ""}

    if get_settings().is_fake:
        tidied = re.sub(r"\s+", " ", draft).strip()
        tidied = tidied[0].upper() + tidied[1:] if tidied else tidied
        return {"text": tidied, "changed": tidied != draft, "note": "tidied the spacing"}

    payload = _json(await _ask(POLISH_PROMPT.format(draft=draft[:3000], voice=_voice_sample(recent))))
    text = str(payload.get("text") or "").strip()
    # A model that returns nothing, or that "improves" a short post into an essay, gets ignored. Better
    # to hand back the original than to quietly replace someone's words with something twice as long.
    if not text or len(text) > max(len(draft) * 2, len(draft) + 120):
        return {"text": draft, "changed": False, "note": ""}
    return {"text": text, "changed": text != draft, "note": str(payload.get("note") or "")[:120]}


async def hashtags(text: str, count: int = 4) -> dict[str, Any]:
    text = text.strip()
    if not text:
        return {"hashtags": []}

    if get_settings().is_fake:
        return {"hashtags": _fake_hashtags(text, count)}

    payload = _json(await _ask(HASHTAG_PROMPT.format(text=text[:2000], count=count), max_tokens=120, temperature=0.4))
    clean = []
    for tag in payload.get("hashtags", []):
        slug = re.sub(r"[^a-z0-9]", "", str(tag).lower())
        if slug and slug not in clean and len(slug) <= 30:
            clean.append(slug)
    return {"hashtags": clean[:count]}


# --------------------------------------------------------------------------- the keyless versions

def _fake_replies(messages: list[dict[str, str]]) -> list[str]:
    last = str(messages[-1].get("text") or "").strip()
    subject = (last[:60] + "…") if len(last) > 60 else last
    return [
        f"Good point about {subject.lower()}" if subject else "Sounds good",
        "On it",
        "When were you thinking?",
    ]


def _fake_hashtags(text: str, count: int) -> list[str]:
    words = [w.lower() for w in re.findall(r"[A-Za-z]{4,}", text)]
    seen: list[str] = []
    for word in words:
        if word not in _COMMON and word not in seen:
            seen.append(word)
    return seen[:count]


_COMMON = {
    "this", "that", "with", "from", "have", "been", "were", "they", "them", "then", "than", "just",
    "about", "would", "could", "should", "there", "their", "what", "when", "where", "which", "while",
    "some", "very", "really", "going", "here", "over", "into", "your", "mine", "like", "also",
}
