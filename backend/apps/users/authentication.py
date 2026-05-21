from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        self._request = request
        try:
            return super().authenticate(request)
        finally:
            self._request = None

    def get_raw_token(self, header):
        request = getattr(self, '_request', None)
        if request is not None:
            raw_token = request.COOKIES.get(settings.JWT_ACCESS_COOKIE_NAME)
            if raw_token:
                return raw_token.encode('utf-8')
        return super().get_raw_token(header)
