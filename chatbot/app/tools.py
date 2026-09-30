"""
What the assistant is allowed to do.

Every tool is a call to the public API as the person asking, so a tool cannot reach anything they
could not reach themselves. Tools that write are declared `confirms=True`: the agent never runs those,
it proposes them and the interface asks first. An assistant that can post, follow and send messages on
someone's behalf without asking is a liability, not a feature.

Some tools also return a `ui` intent — open a page, put text in the composer — which the frontend
carries out. That is what makes the assistant move the interface instead of only describing it.

Every path and field name here matches the Node API's routes and presenters. When a route changes, this
file is where it has to change too; the tests pin the paths so a rename shows up as a failure rather
than as an assistant that quietly 404s.
"""

# The descriptions below are deliberately terse — trimmed for the token budget. They go out on every
# single request, so their length is a cost paid on every turn forever, and the free tier allows 8000
# tokens a minute in total. What a model needs is what the tool does and when to reach for it; the
# reasoning about why a tool is shaped this way lives in the comments here, where it costs nothing.

import inspect
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from .social_api import SocialApi, SocialApiError

Handler = Callable[..., Awaitable[dict[str, Any]]]


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Handler
    confirms: bool = False
    # Shown to the person on the confirmation card, in their words rather than the function's.
    confirm_label: str = ""


REGISTRY: dict[str, Tool] = {}


def tool(
    name: str,
    description: str,
    parameters: dict[str, Any] | None = None,
    *,
    confirms: bool = False,
    confirm_label: str = "",
) -> Callable[[Handler], Handler]:
    def register(handler: Handler) -> Handler:
        REGISTRY[name] = Tool(
            name=name,
            description=description,
            parameters=parameters or {"type": "object", "properties": {}},
            handler=handler,
            confirms=confirms,
            confirm_label=confirm_label,
        )
        return handler

    return register


def schemas() -> list[dict[str, Any]]:
    """The tool list in the shape the chat completions API expects."""
    return [
        {
            "type": "function",
            "function": {"name": t.name, "description": t.description, "parameters": t.parameters},
        }
        for t in REGISTRY.values()
    ]


async def run(name: str, arguments: dict[str, Any], api: SocialApi) -> dict[str, Any]:
    entry = REGISTRY.get(name)
    if entry is None:
        return {"error": f"There is no tool called {name}."}
    try:
        signature = inspect.signature(entry.handler)
        accepted = {k: v for k, v in arguments.items() if k in signature.parameters}
        return await entry.handler(api=api, **accepted)
    except SocialApiError as err:
        # 403 and 404 are usually the privacy rules working. Say so plainly; the model relays it.
        return {"error": err.message, "status": err.status_code}
    except (TypeError, ValueError) as err:
        return {"error": f"Those arguments did not fit {name}: {err}"}


def _clamp(value: Any, low: int, high: int, default: int) -> int:
    try:
        return max(low, min(int(value), high))
    except (TypeError, ValueError):
        return default


def _cut(text: Any, length: int) -> str:
    return str(text or "")[:length]


# --------------------------------------------------------------------------- people

@tool(
    "suggest_people",
    "Accounts worth following, with a reason each. Use for: who should I follow, who to add.",
    {
        "type": "object",
        "properties": {"limit": {"type": "integer", "default": 5}},
    },
)
async def suggest_people(api: SocialApi, limit: int = 5) -> dict[str, Any]:
    data = await api.get("/suggestions/people", limit=_clamp(limit, 1, 10, 5))
    items = [
        {
            "id": person.get("id"),
            "username": person.get("username"),
            "summary": person.get("reason") or "suggested for you",
            "mutuals": person.get("mutualFollows", 0),
            "bio": _cut(person.get("bio"), 120),
        }
        for person in (data or {}).get("items", [])
    ]
    return {"items": items}


@tool(
    "find_people",
    "Look up accounts by name. Use first when you need someone's id; other tools take ids, not names.",
    {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "limit": {"type": "integer", "default": 5},
        },
        "required": ["name"],
    },
)
async def find_people(api: SocialApi, name: str, limit: int = 5) -> dict[str, Any]:
    if len(name.strip()) < 2:
        return {"error": "A name needs at least two characters to search for."}
    data = await api.get("/search", q=name.strip(), type="users", limit=_clamp(limit, 1, 10, 5))
    items = [
        {
            "id": person.get("id"),
            "username": person.get("username"),
            "following": person.get("followedByMe", False),
        }
        for person in (data or {}).get("users", [])
    ]
    return {"items": items}


# --------------------------------------------------------------------------- posts

@tool(
    "search_posts",
    "Search posts the user can see. Pass hashtag instead of query to list one tag.",
    {
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "hashtag": {"type": "string", "description": "one tag, no #"},
            "limit": {"type": "integer", "default": 5},
        },
    },
)
async def search_posts(
    api: SocialApi, query: str = "", hashtag: str = "", limit: int = 5
) -> dict[str, Any]:
    count = _clamp(limit, 1, 10, 5)

    if hashtag.strip():
        data = await api.get("/posts", hashtag=hashtag.strip().lstrip("#"), limit=count)
        rows = (data or {}).get("items", [])
    else:
        # The search endpoint rejects anything shorter, so say why rather than relaying a 400.
        if len(query.strip()) < 2:
            return {"error": "Search needs at least two characters. Ask them what to look for."}
        data = await api.get("/search", q=query.strip(), type="posts", limit=count)
        rows = (data or {}).get("posts", [])

    items = [
        {
            "id": post.get("id"),
            "author": (post.get("author") or {}).get("username"),
            "summary": _cut(post.get("content"), 200),
            "likes": post.get("likeCount", 0),
            "at": post.get("createdAt"),
        }
        for post in rows
    ]
    return {"items": items, "query": hashtag or query}


@tool(
    "list_my_posts",
    "The user's own recent posts. Read before drafting for them, to match their voice.",
    {"type": "object", "properties": {"limit": {"type": "integer", "default": 5}}},
)
async def list_my_posts(api: SocialApi, limit: int = 5) -> dict[str, Any]:
    me = await api.get("/auth/me")
    data = await api.get("/posts", author=(me or {}).get("id"), limit=_clamp(limit, 1, 10, 5))
    items = [
        {
            "id": p.get("id"),
            "summary": _cut(p.get("content"), 300),
            "likes": p.get("likeCount", 0),
            "at": p.get("createdAt"),
        }
        for p in (data or {}).get("items", [])
    ]
    return {"items": items}


@tool(
    "list_saved_posts",
    "Posts the user saved or bookmarked.",
    {"type": "object", "properties": {"limit": {"type": "integer", "default": 10}}},
)
async def list_saved_posts(api: SocialApi, limit: int = 10) -> dict[str, Any]:
    data = await api.get("/posts/saved", limit=_clamp(limit, 1, 20, 10))
    items = [
        {
            "id": p.get("id"),
            "author": (p.get("author") or {}).get("username"),
            "summary": _cut(p.get("content"), 200),
            "at": p.get("createdAt"),
        }
        for p in (data or {}).get("items", [])
    ]
    return {"items": items}


@tool(
    "list_drafts",
    "The user's unpublished and scheduled drafts.",
    {"type": "object", "properties": {}},
)
async def list_drafts(api: SocialApi) -> dict[str, Any]:
    data = await api.get("/posts/drafts")
    items = [
        {
            "id": d.get("id"),
            "summary": _cut(d.get("content"), 200),
            "scheduled_for": d.get("scheduledFor"),
        }
        for d in (data or {}).get("items", [])
    ]
    return {"items": items}


@tool(
    "trending_hashtags",
    "Which tags are busy right now.",
    {
        "type": "object",
        "properties": {
            "days": {"type": "integer", "default": 7},
            "limit": {"type": "integer", "default": 10},
        },
    },
)
async def trending_hashtags(api: SocialApi, days: int = 7, limit: int = 10) -> dict[str, Any]:
    data = await api.get(
        "/posts/hashtags/trending", days=_clamp(days, 1, 90, 7), limit=_clamp(limit, 1, 20, 10)
    )
    items = [
        {"summary": f"#{t.get('tag')}", "posts": t.get("postCount") or t.get("count") or 0}
        for t in (data or {}).get("items", [])
    ]
    return {"items": items}


# --------------------------------------------------------------------------- what happened while they were away

@tool(
    "catch_me_up",
    "What the user missed: recent notifications and the unread message count.",
    {"type": "object", "properties": {"limit": {"type": "integer", "default": 10}}},
)
async def catch_me_up(api: SocialApi, limit: int = 10) -> dict[str, Any]:
    notifications = await api.get("/notifications", limit=_clamp(limit, 1, 20, 10))
    unread = await api.get("/chats/unread")
    items = [
        {
            "summary": f"{(n.get('actor') or {}).get('username') or 'someone'} — {n.get('content') or n.get('type')}",
            "at": n.get("createdAt"),
            "read": n.get("read"),
            "link": n.get("link"),
        }
        for n in (notifications or {}).get("items", [])
    ]
    return {"items": items, "unread_messages": (unread or {}).get("total", 0)}


@tool(
    "list_conversations",
    "The user's conversations, with unread counts. Use to find a conversation id.",
    {"type": "object", "properties": {}},
)
async def list_conversations(api: SocialApi) -> dict[str, Any]:
    data = await api.get("/chats")
    items = [
        {
            "id": c.get("id"),
            "summary": c.get("title") or "conversation",
            "kind": c.get("type"),
            "unread": c.get("unreadCount", 0),
            "last": _cut((c.get("lastMessage") or {}).get("text"), 140),
        }
        for c in (data or {}).get("items", [])
    ]
    return {"items": items}


@tool(
    "read_conversation",
    "Messages in one conversation, oldest first. Only conversations the user is in.",
    {
        "type": "object",
        "properties": {
            "conversation_id": {"type": "integer"},
            "limit": {"type": "integer", "default": 20},
        },
        "required": ["conversation_id"],
    },
)
async def read_conversation(api: SocialApi, conversation_id: int, limit: int = 20) -> dict[str, Any]:
    data = await api.get(f"/chats/{int(conversation_id)}/messages", limit=_clamp(limit, 1, 40, 20))
    items = [
        {
            "from": (m.get("sender") or {}).get("username"),
            "summary": _cut(m.get("text"), 400),
            "at": m.get("createdAt"),
        }
        for m in (data or {}).get("items", [])
    ]
    # The API returns newest first, which is right for a chat window and wrong for reading.
    return {"items": list(reversed(items))}


@tool(
    "pending_friend_requests",
    "Friend requests waiting on the user.",
    {"type": "object", "properties": {}},
)
async def pending_friend_requests(api: SocialApi) -> dict[str, Any]:
    data = await api.get("/friends/requests", direction="incoming")
    items = [
        {
            "id": r.get("id"),
            "username": ((r.get("sender") or r.get("user")) or {}).get("username"),
            "summary": "wants to be friends",
            "at": r.get("createdAt"),
        }
        for r in (data or {}).get("items", [])
    ]
    return {"items": items}


# --------------------------------------------------------------------------- writing, with a prompt first

@tool(
    "create_post",
    "Publish a post now. Needs confirmation. Prefer open_composer unless they want it published as written.",
    {
        "type": "object",
        "properties": {"content": {"type": "string"}},
        "required": ["content"],
    },
    confirms=True,
    confirm_label="Post this",
)
async def create_post(api: SocialApi, content: str) -> dict[str, Any]:
    post = await api.post("/posts", {"content": content})
    return {
        "id": post.get("id"),
        "text": "Posted.",
        "ui": {"action": "navigate", "to": f"/posts/{post.get('id')}"},
    }


@tool(
    "save_draft",
    "Save a draft, optionally scheduled. Needs confirmation.",
    {
        "type": "object",
        "properties": {
            "content": {"type": "string"},
            "scheduled_for": {"type": "string", "description": "ISO-8601, or omit for a plain draft"},
        },
        "required": ["content"],
    },
    confirms=True,
    confirm_label="Save this draft",
)
async def save_draft(api: SocialApi, content: str, scheduled_for: str | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"content": content}
    if scheduled_for:
        body["scheduledFor"] = scheduled_for
    draft = await api.post("/posts/drafts", body)
    return {"id": draft.get("id"), "text": "Saved to your drafts.", "ui": {"action": "navigate", "to": "/drafts"}}


@tool(
    "follow_person",
    "Follow an account. Needs confirmation. Use find_people first for the id.",
    {"type": "object", "properties": {"user_id": {"type": "integer"}}, "required": ["user_id"]},
    confirms=True,
    confirm_label="Follow them",
)
async def follow_person(api: SocialApi, user_id: int) -> dict[str, Any]:
    await api.put(f"/users/{int(user_id)}/follow")
    return {"text": "Followed.", "ui": {"action": "navigate", "to": f"/u/{int(user_id)}"}}


@tool(
    "send_message",
    "Send a message in a conversation the user is in. Needs confirmation.",
    {
        "type": "object",
        "properties": {
            "conversation_id": {"type": "integer"},
            "text": {"type": "string"},
        },
        "required": ["conversation_id", "text"],
    },
    confirms=True,
    confirm_label="Send it",
)
async def send_message(api: SocialApi, conversation_id: int, text: str) -> dict[str, Any]:
    if not text.strip():
        return {"error": "There is nothing to send."}
    await api.post(f"/chats/{int(conversation_id)}/messages", {"text": text.strip()[:4000]})
    return {"text": "Sent.", "ui": {"action": "navigate", "to": f"/messages/{int(conversation_id)}"}}


@tool(
    "save_post",
    "Save a post. Needs confirmation.",
    {"type": "object", "properties": {"post_id": {"type": "integer"}}, "required": ["post_id"]},
    confirms=True,
    confirm_label="Save it",
)
async def save_post(api: SocialApi, post_id: int) -> dict[str, Any]:
    await api.put(f"/posts/{int(post_id)}/save")
    return {"text": "Saved."}


@tool(
    "like_post",
    "Like a post. Needs confirmation.",
    {"type": "object", "properties": {"post_id": {"type": "integer"}}, "required": ["post_id"]},
    confirms=True,
    confirm_label="Like it",
)
async def like_post(api: SocialApi, post_id: int) -> dict[str, Any]:
    await api.put(f"/posts/{int(post_id)}/like")
    return {"text": "Liked."}


# --------------------------------------------------------------------------- moving the interface

@tool(
    "open_composer",
    "Put text in the composer without publishing, for the user to edit and post. Use whenever they ask you to write a post.",
    {
        "type": "object",
        "properties": {"content": {"type": "string"}},
        "required": ["content"],
    },
)
async def open_composer(api: SocialApi, content: str) -> dict[str, Any]:
    return {"text": "Put it in the composer for you.", "ui": {"action": "compose", "content": content}}


@tool(
    "go_to",
    "Open a page in the app.",
    {
        "type": "object",
        "properties": {
            "page": {
                "type": "string",
                "enum": [
                    "home",
                    "messages",
                    "notifications",
                    "saved",
                    "drafts",
                    "settings",
                    "friends",
                    "calls",
                    "profile",
                    "hashtag",
                ],
            },
            "user_id": {"type": "integer", "description": "for page=profile"},
            "tag": {"type": "string", "description": "for page=hashtag, no #"},
        },
        "required": ["page"],
    },
)
async def go_to(
    api: SocialApi, page: str, user_id: int | None = None, tag: str | None = None
) -> dict[str, Any]:
    routes = {
        "home": "/home",
        "messages": "/messages",
        "notifications": "/notifications",
        "saved": "/saved",
        "drafts": "/drafts",
        "settings": "/settings",
        "friends": "/friends",
        "calls": "/calls",
    }
    if page == "profile" and user_id:
        return {"text": "Opening their profile.", "ui": {"action": "navigate", "to": f"/u/{int(user_id)}"}}
    if page == "hashtag" and tag:
        clean = tag.strip().lstrip("#")
        return {"text": f"Opening #{clean}.", "ui": {"action": "navigate", "to": f"/tags/{clean}"}}
    # An unknown page, or profile/hashtag without what it needs, lands on home rather than a 404.
    destination = routes.get(page, "/home")
    return {"text": f"Opening {page}.", "ui": {"action": "navigate", "to": destination}}
