from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import EngagementLog


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_engagement(request):
    log = EngagementLog.objects.create(user=request.user)
    return Response({'accepted_at': log.accepted_at}, status=status.HTTP_201_CREATED)
