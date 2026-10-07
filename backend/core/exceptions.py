from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class KriyoApiError(Exception):
    """Base for service-layer exceptions that map directly to an HTTP
    response. Subclasses set status_code/detail (or pass detail= at raise
    time); views.py just lets these propagate -- kriyo_exception_handler
    (wired via REST_FRAMEWORK['EXCEPTION_HANDLER']) turns them into the
    Response, instead of every app's views.py hand-rolling the same
    try/except-per-exception mapping.
    """
    status_code = 400
    detail = 'Invalid request.'

    def __init__(self, detail=None, **extra):
        self.detail = detail or self.detail
        self.extra = extra
        super().__init__(self.detail)


def kriyo_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    if isinstance(exc, KriyoApiError):
        payload = {'detail': exc.detail}
        payload.update(exc.extra)
        return Response(payload, status=exc.status_code)

    return None
