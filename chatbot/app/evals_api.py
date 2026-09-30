"""
Reading, and kicking off, eval runs.

Runs are files on disk rather than rows in a table, for the same reason this service has no database
credentials: a JSON file per run is enough, it survives a redeploy if the directory is mounted, and it
keeps the "no database here" rule intact.

Triggering a run from a web page needs care. Against a real model a run is ~60 requests, which on a free
tier is most of a minute's allowance, so only one can be in flight at a time and the response always says
which provider it used. A button that can quietly spend the day's quota because someone clicked it twice
is a bad button.
"""

import asyncio
import json
import logging
import pathlib
import sys
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from .config import get_settings
from .security import Caller, current_caller
from .social_api import SocialApi, SocialApiError

log = logging.getLogger("assistant.evals")

_ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNS_DIR = _ROOT / "evals" / "runs"

# The service is started as `app.main`, so the repo root is not necessarily importable. The eval package
# lives beside `app/`, and the run endpoint needs it.
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

async def require_moderator(caller: Caller = Depends(current_caller)) -> Caller:
    """Only moderators, and the backend decides who that is.

    Hiding the page in the frontend is not access control — the endpoints are reachable with any valid
    token. Rather than keeping a second list of admin ids here, which would drift, this asks the API the
    same question the moderation queue asks, with the caller's own token.
    """
    try:
        async with SocialApi(caller.token) as api:
            access = await api.get("/moderation/access")
    except SocialApiError as err:
        # If the API cannot answer, refuse. A failure to confirm is not a confirmation.
        log.warning("could not check moderator access: %s", err.message)
        raise HTTPException(status_code=503, detail="Could not check your access right now.") from err

    allowed = access is True or (isinstance(access, dict) and access.get("moderator") is True)
    if not allowed:
        raise HTTPException(status_code=403, detail="Eval runs are for moderators.")
    return caller


router = APIRouter(prefix="/evals", tags=["evals"], dependencies=[Depends(require_moderator)])

_running = asyncio.Lock()


def _runs() -> list[pathlib.Path]:
    if not RUNS_DIR.exists():
        return []
    return sorted(RUNS_DIR.glob("*.json"), reverse=True)


def _load(path: pathlib.Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        log.warning("could not read eval run %s", path.name)
        return None


@router.get("/latest")
async def latest() -> dict[str, Any]:
    """The most recent run in full, for the page's detail view."""
    for path in _runs():
        run = _load(path)
        if run:
            return {"run": path.stem, **run}
    return {"run": None, "summary": None, "results": []}


@router.get("/history")
async def history(limit: int = 20) -> dict[str, Any]:
    """Summaries only, oldest last — enough to see the day something got worse."""
    items = []
    for path in _runs()[: max(1, min(limit, 50))]:
        run = _load(path)
        if run and run.get("summary"):
            items.append({"run": path.stem, **run["summary"]})
    return {"items": items}


@router.post("/run")
async def run(full: bool = False, caller: Caller = Depends(require_moderator)) -> dict[str, Any]:
    if _running.locked():
        raise HTTPException(status_code=409, detail="A run is already in progress.")

    settings = get_settings()
    async with _running:
        # Imported here rather than at module load: the eval package pulls in the case set and the stub
        # API, which the service itself has no use for.
        from evals.cases import CASES
        from evals.runner import RUNS_DIR as OUT, SAMPLE_SIZE, run_case, select, summarise

        # A full run against a real model is about a day's free-tier tokens. A button should not be able
        # to spend that by accident, so it samples unless the caller asks for everything.
        sample = None if full or settings.is_fake else SAMPLE_SIZE
        cases = select(CASES, sample)

        log.info(
            "eval run started by user %s: %d cases against %s",
            caller.user_id, len(cases), settings.text_provider,
        )
        results = [await run_case(case) for case in cases]
        summary = summarise(results)

        OUT.mkdir(parents=True, exist_ok=True)
        stamp = summary["at"].replace("-", "").replace(":", "").replace("+0000", "")
        path = OUT / f"{stamp}.json"
        path.write_text(json.dumps({"summary": summary, "results": results}, indent=2), encoding="utf-8")

    return {"run": path.stem, "summary": summary}
