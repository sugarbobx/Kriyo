from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .serializers import LoginSerializer, SignupSerializer, TimezoneSyncSerializer, UserSerializer


class LoginRateThrottle(AnonRateThrottle):
    """Keyed by client IP (AllowAny view, no user yet). Rate set in
    REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['login']."""
    scope = 'login'


class SignupRateThrottle(AnonRateThrottle):
    scope = 'signup'


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf(request):
    get_token(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([SignupRateThrottle])
def signup_view(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        username=serializer.validated_data['email'],
        password=serializer.validated_data['password'],
    )
    if user is None:
        return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    timezone = serializer.validated_data.get('timezone')
    if timezone and timezone != user.timezone:
        user.timezone = timezone
        user.save(update_fields=['timezone'])

    login(request, user)
    return Response(UserSerializer(user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == 'DELETE':
        user = request.user
        logout(request)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_timezone(request):
    """Re-sends the browser's IANA timezone on each app load (not just at
    login/signup), so a user who travels or crosses a DST change mid-session
    doesn't have what "today" means for the gate's lock/reset silently drift
    until their next login."""
    serializer = TimezoneSyncSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    new_timezone = serializer.validated_data['timezone']
    if new_timezone != request.user.timezone:
        request.user.timezone = new_timezone
        request.user.save(update_fields=['timezone'])
    return Response(status=status.HTTP_204_NO_CONTENT)
