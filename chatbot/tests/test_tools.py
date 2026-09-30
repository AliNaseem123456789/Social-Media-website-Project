import pytest

from app import tools
from app.social_api import SocialApiError

from .conftest import StubApi

pytestmark = pytest.mark.asyncio


async def test_every_tool_has_a_schema_the_api_will_accept():
    for entry in tools.schemas():
        function = entry["function"]
        assert function["description"], f"{function['name']} has no description"
        assert function["parameters"]["type"] == "object"
        for name, spec in function["parameters"].get("properties", {}).items():
            assert "type" in spec, f"{function['name']}.{name} has no type"


async def test_writes_are_the_only_tools_that_confirm():
    confirming = {name for name, t in tools.REGISTRY.items() if t.confirms}
    assert confirming == {
        "create_post",
        "save_draft",
        "follow_person",
        "send_message",
        "save_post",
        "like_post",
    }
    for name in confirming:
        assert tools.REGISTRY[name].confirm_label, f"{name} needs a label for the button"


async def test_no_read_tool_can_change_anything():
    """The safety property in one assertion: a tool that does not confirm only ever issues GETs."""
    for name, entry in tools.REGISTRY.items():
        if entry.confirms:
            continue
        api = StubApi()
        await tools.run(name, _plausible_arguments(entry), api)
        methods = {method for method, _path, _payload in api.calls}
        assert methods <= {"GET"}, f"{name} issued {methods - {'GET'}}"


def _plausible_arguments(entry: tools.Tool) -> dict:
    """Fill each declared parameter with something of the right type, so the handler actually runs."""
    filler = {"integer": 1, "number": 1, "string": "something", "boolean": True}
    arguments = {}
    for name, spec in entry.parameters.get("properties", {}).items():
        if spec.get("enum"):
            arguments[name] = spec["enum"][0]
        else:
            arguments[name] = filler.get(spec.get("type"), "something")
    return arguments


async def test_suggest_people_reads_the_suggestions_endpoint():
    api = StubApi(
        {"/suggestions": {"items": [{"id": 3, "username": "sara", "mutualFollows": 2, "reason": "two"}]}}
    )
    result = await tools.run("suggest_people", {"limit": 3}, api)
    assert result["items"][0] == {
        "id": 3,
        "username": "sara",
        "summary": "two",
        "mutuals": 2,
        "bio": "",
    }
    method, path, params = api.calls[0]
    assert (method, path) == ("GET", "/suggestions/people")
    assert params["limit"] == 3


async def test_find_people_reads_the_users_half_of_search():
    api = StubApi({"/search": {"users": [{"id": 9, "username": "sara", "followedByMe": False}], "posts": []}})
    result = await tools.run("find_people", {"name": "sara"}, api)
    assert result["items"] == [{"id": 9, "username": "sara", "following": False}]
    assert api.calls[0][2]["type"] == "users"


async def test_a_one_letter_search_is_refused_here_rather_than_by_the_api():
    """The endpoint requires two characters, so a 400 would be relayed as noise."""
    api = StubApi()
    assert "two characters" in (await tools.run("find_people", {"name": "s"}, api))["error"]
    assert "two characters" in (await tools.run("search_posts", {"query": "a"}, api))["error"]
    assert api.calls == []


async def test_search_posts_by_hashtag_lists_the_tag_instead_of_searching():
    api = StubApi({"/posts": {"items": [{"id": 1, "content": "climbed it", "author": {"username": "ali"}}]}})
    result = await tools.run("search_posts", {"hashtag": "#hiking"}, api)
    assert api.calls[0][1] == "/posts"
    assert api.calls[0][2]["hashtag"] == "hiking"
    assert result["items"][0]["summary"] == "climbed it"


async def test_list_my_posts_asks_who_the_user_is_first():
    api = StubApi({"/auth/me": {"id": 7}, "/posts": {"items": []}})
    await tools.run("list_my_posts", {}, api)
    assert api.calls[0][1] == "/auth/me"
    assert api.calls[1][2]["author"] == 7


async def test_send_message_trims_and_caps_the_text():
    api = StubApi({"/chats": {}})
    await tools.run("send_message", {"conversation_id": 3, "text": "  hi  "}, api)
    assert api.calls[0] == ("POST", "/chats/3/messages", {"text": "hi"})

    api = StubApi({"/chats": {}})
    await tools.run("send_message", {"conversation_id": 3, "text": "x" * 5000}, api)
    assert len(api.calls[0][2]["text"]) == 4000


async def test_send_message_refuses_an_empty_message():
    api = StubApi()
    assert "nothing to send" in (await tools.run("send_message", {"conversation_id": 3, "text": " "}, api))["error"]
    assert api.calls == []


async def test_an_id_arriving_as_a_string_still_builds_a_valid_path():
    """Models hand back "3" as often as 3; the path must not become /chats/3.0/messages or worse."""
    api = StubApi({"/chats": {}})
    await tools.run("send_message", {"conversation_id": "3", "text": "hi"}, api)
    assert api.calls[0][1] == "/chats/3/messages"


async def test_a_nonsense_id_is_an_error_not_a_crash():
    result = await tools.run("follow_person", {"user_id": "sara"}, StubApi())
    assert "error" in result


async def test_limits_are_clamped_rather_than_trusted():
    api = StubApi()
    await tools.run("suggest_people", {"limit": 500}, api)
    assert api.calls[0][2]["limit"] == 10


async def test_a_refusal_comes_back_as_words_not_an_exception():
    class Refusing(StubApi):
        async def get(self, path, **params):
            raise SocialApiError(403, "You cannot see this profile")

    result = await tools.run("search_posts", {"query": "hike"}, Refusing())
    assert result == {"error": "You cannot see this profile", "status": 403}


async def test_unknown_tool_is_reported_not_raised():
    result = await tools.run("delete_everything", {}, StubApi())
    assert "no tool called" in result["error"]


async def test_arguments_the_model_invented_are_dropped():
    api = StubApi()
    result = await tools.run("catch_me_up", {"limit": 5, "nonsense": True}, api)
    assert "error" not in result


async def test_read_conversation_puts_oldest_first():
    api = StubApi(
        {
            "/chats/4/messages": {
                "items": [
                    {"sender": {"username": "b"}, "text": "second", "createdAt": "2"},
                    {"sender": {"username": "a"}, "text": "first", "createdAt": "1"},
                ]
            }
        }
    )
    result = await tools.run("read_conversation", {"conversation_id": 4}, api)
    assert [m["summary"] for m in result["items"]] == ["first", "second"]


async def test_open_composer_never_touches_the_api():
    api = StubApi()
    result = await tools.run("open_composer", {"content": "hello"}, api)
    assert api.calls == []
    assert result["ui"] == {"action": "compose", "content": "hello"}


async def test_go_to_falls_back_to_home_for_a_page_that_does_not_exist():
    result = await tools.run("go_to", {"page": "wherever"}, StubApi())
    assert result["ui"]["to"] == "/home"


async def test_go_to_profile_needs_an_id_to_be_a_profile():
    assert (await tools.run("go_to", {"page": "profile"}, StubApi()))["ui"]["to"] == "/home"
    assert (await tools.run("go_to", {"page": "profile", "user_id": 9}, StubApi()))["ui"]["to"] == "/u/9"


async def test_go_to_a_hashtag_strips_the_hash():
    result = await tools.run("go_to", {"page": "hashtag", "tag": "#hiking"}, StubApi())
    assert result["ui"]["to"] == "/tags/hiking"


@pytest.mark.parametrize("page", ["home", "messages", "notifications", "saved", "drafts", "settings", "friends", "calls"])
async def test_every_destination_go_to_offers_is_a_route_the_app_has(page):
    """These are the frontend's own paths. If a route is renamed, this is where it should fail."""
    known = {"/home", "/messages", "/notifications", "/saved", "/drafts", "/settings", "/friends", "/calls"}
    result = await tools.run("go_to", {"page": page}, StubApi())
    assert result["ui"]["to"] in known
