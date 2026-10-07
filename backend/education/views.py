from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .models import EducationProgress
from .serializers import MarkReadSerializer


class EducationProgressRateThrottle(UserRateThrottle):
    """Keyed by user id. Rate set in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['education_progress']."""
    scope = 'education_progress'


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([EducationProgressRateThrottle])
def progress(request):
    if request.method == 'GET':
        keys = list(EducationProgress.objects.filter(user=request.user).values_list('module_key', flat=True))
        return Response({'read_module_keys': keys})

    serializer = MarkReadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    EducationProgress.objects.get_or_create(user=request.user, module_key=serializer.validated_data['module_key'])
    return Response(status=status.HTTP_204_NO_CONTENT)
