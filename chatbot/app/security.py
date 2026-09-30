"""
Who is asking.

The browser sends the same access token it uses for the rest of the app. It is verified here with the
backend's own secret, and then handed straight back to the backend on every tool call. That is the
whole authorisation model: the assistant can reach exactly what the person asking could reach by
using the site, and nothing else. Blocking, private profiles and message settings are enforced once,
in the API, rather than re-implemented in Python where they would drift.
"""

from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException, status

from .config import get_settings


@dataclass(frozen=True)
class Caller:
    user_id: int
    username: str
    token: str


def _unauthorised(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


async def current_caller(authorization: str = Header(default="")) -> Caller:
    settings = get_settings()
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _unauthorised("Missing bearer token")

    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
        )
    except jwt.ExpiredSignatureError as err:
        raise _unauthorised("Token has expired") from err
    except jwt.InvalidTokenError as err:
        raise _unauthorised("Token is not valid") from err

    subject = claims.get("sub")
    if subject is None:
        raise _unauthorised("Token has no subject")

    return Caller(user_id=int(subject), username=claims.get("name", ""), token=token)
