"""
Triage for the report queue.

This does not decide anything. It reads a reported piece of text and puts it in one of three trays so
the person working the queue sees the twelve reports that need a human before the four hundred that do
not. `remove` still means "a human should look at this first", it just means look at it first.

A model is used for the nuance — sarcasm, context, a slur spelled sideways — but a small set of plain
rules runs first and wins, because some things should not depend on a model being reachable or in a good
mood. Threats and self-harm go to the top of the queue whether or not the model agrees.
"""

import json
import logging
import re
from typing import Any

from .config import get_settings
from .providers import guard_provider

log = logging.getLogger("assistant.moderation")

ALLOW, REVIEW, REMOVE = "allow", "review", "remove"
VERDICTS = {ALLOW, REVIEW, REMOVE}

PROMPT = """You are triaging a report on a social app so a human moderator sees the urgent ones first.

Reported text:
---
{text}
---
The reporter's stated reason: {reason}

Answer with JSON only, no other words:
{{"verdict": "allow" | "review" | "remove", "confidence": 0.0-1.0, "reason": "one short sentence"}}

  allow  — nothing here breaks a rule. Rudeness, an unpopular opinion, a bad joke, or a reporter who
           simply disagrees all belong here.
  review — it might break a rule and a human should decide. Use this when it turns on context you
           cannot see.
  remove — clearly against the rules: a credible threat, targeted harassment, a slur aimed at someone,
           sexual content involving minors, doxxing, or a scam.

When you are unsure, answer review. Do not guess at remove."""

# Deliberately narrow. Every pattern here has to be something that is nearly always serious regardless
# of context, because a rule cannot read context and a false positive costs a person their post.
URGENT = [
    (re.compile(r"\b(i('m| am) going to|i will|gonna) (kill|hurt|find|beat|stab|shoot) (you|him|her|them)\b", re.I),
     "reads as a direct threat"),
    (re.compile(r"\b(kill your ?self|kys)\b", re.I), "tells someone to kill themselves"),
    (re.compile(r"\b(i want to|i'?m going to) (kill myself|end it all|not be here)\b", re.I),
     "the author may be at risk"),
    (re.compile(r"\b\d{1,5}\s+\w+\s+(street|st|road|rd|avenue|ave|lane|drive)\b.{0,40}\b(lives?|find (him|her|them))\b", re.I),
     "appears to publish someone's address"),
]


def _rules(text: str) -> dict[str, Any] | None:
    for pattern, why in URGENT:
        if pattern.search(text):
            return {"verdict": REMOVE, "confidence": 0.9, "reason": why, "source": "rules"}
    return None


def _parse(raw: str) -> dict[str, Any] | None:
    """Models wrap JSON in prose and fences however they like, so take the first object in the string."""
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        return None
    try:
        payload = json.loads(match.group(0))
    except ValueError:
        return None

    verdict = str(payload.get("verdict", "")).lower().strip()
    if verdict not in VERDICTS:
        return None
    try:
        confidence = min(max(float(payload.get("confidence", 0.5)), 0.0), 1.0)
    except (TypeError, ValueError):
        confidence = 0.5
    return {
        "verdict": verdict,
        "confidence": confidence,
        "reason": str(payload.get("reason", ""))[:200],
        "source": "model",
    }


async def triage(text: str, reason: str = "") -> dict[str, Any]:
    text = (text or "").strip()
    if not text:
        return {"verdict": REVIEW, "confidence": 0.0, "reason": "there was nothing to read", "source": "rules"}

    urgent = _rules(text)
    if urgent:
        return urgent

    settings = get_settings()
    if settings.is_fake:
        # No model: everything the rules did not catch goes to a human, which is the honest answer.
        return {"verdict": REVIEW, "confidence": 0.3, "reason": "no model configured to judge this", "source": "rules"}

    prompt = PROMPT.format(text=text[:4000], reason=reason or "not given")
    collected: list[str] = []
    try:
        async for chunk in guard_provider().chat(
            [{"role": "user", "content": prompt}], None, temperature=0.0, max_tokens=200
        ):
            if chunk.text:
                collected.append(chunk.text)
    except Exception as err:
        log.warning("guard model unavailable: %s", err)
        return {"verdict": REVIEW, "confidence": 0.0, "reason": "the safety model was unreachable", "source": "error"}

    parsed = _parse("".join(collected))
    if parsed is None:
        # An unparseable answer is not a verdict. Never let malformed output read as "allow".
        log.warning("guard model returned something unusable")
        return {"verdict": REVIEW, "confidence": 0.0, "reason": "could not read the model's answer", "source": "error"}
    return parsed
