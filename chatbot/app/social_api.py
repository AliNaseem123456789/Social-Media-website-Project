"""
The only way this service reads or writes anything belonging to a person: the public REST API, called
as them. No database connection, no service-role key, no second copy of the permission rules.
"""

import logging
from typing import Any

import httpx

from .config import get_settings

log = logging.getLogger("assistant.api")


class SocialApiError(RuntimeError):
    """A call the assistant made on the user's behalf was refused or failed."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class SocialApi:
    def __init__(self, token: str):
        settings = get_settings()
        self._client = httpx.AsyncClient(
            base_url=settings.api_base,
            timeout=settings.api_timeout,
            headers={"Authorization": f"Bearer {token}"},
        )

    async def __aenter__(self) -> "SocialApi":
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self._client.aclose()

    async def _send(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            response = await self._client.request(method, path, **kwargs)
        except httpx.RequestError as err:
            log.warning("api unreachable: %s %s (%s)", method, path, err)
            raise SocialApiError(503, "The app's API did not answer") from err

        if response.status_code >= 400:
            body = {}
            try:
                body = response.json()
            except ValueError:
                pass
            message = (body.get("error") or {}).get("message") or response.text[:200]
            # 403 and 404 here are usually the permission rules doing their job, which the model
            # should hear about in words rather than as a stack trace.
            raise SocialApiError(response.status_code, message or "That request was refused")

        if not response.content:
            return None
        payload = response.json()
        return payload.get("data", payload)

    async def get(self, path: str, **params: Any) -> Any:
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._send("GET", path, params=clean)

    async def post(self, path: str, body: dict[str, Any] | None = None) -> Any:
        return await self._send("POST", path, json=body or {})

    async def put(self, path: str, body: dict[str, Any] | None = None) -> Any:
        return await self._send("PUT", path, json=body or {})

    async def patch(self, path: str, body: dict[str, Any] | None = None) -> Any:
        return await self._send("PATCH", path, json=body or {})
