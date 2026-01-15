"""
WebSocket authentication middleware for Django Channels.
Authenticates users using JWT tokens passed as query parameters.
"""

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs
import jwt
from django.conf import settings

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token):
    """Decode JWT token and return the corresponding user."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if user_id:
            return User.objects.get(id=user_id)
    except jwt.ExpiredSignatureError:
        return AnonymousUser()
    except jwt.InvalidTokenError:
        return AnonymousUser()
    except User.DoesNotExist:
        return AnonymousUser()
    return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware that authenticates WebSocket connections using JWT.
    Token should be passed as a query parameter: ws://...?token=<jwt_token>
    """

    async def __call__(self, scope, receive, send):
        # Parse query string to get the token
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
