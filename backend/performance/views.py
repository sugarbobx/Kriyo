from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from . import services
from .models import RiskProfile, Trade, TradingAccount
from .serializers import (
    CreateAccountSerializer,
    ExecuteTradeSerializer,
    RiskProfileSerializer,
    TradeSerializer,
    TradingAccountSerializer,
)


class AccountCreateRateThrottle(UserRateThrottle):
    """Keyed by user id. Rate set in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['account_create'].

    Applies to GET too (DRF throttles per-view, not per-method) -- the rate is
    generous enough to not affect normal listing on screen mount.
    """
    scope = 'account_create'


class TradeExecuteRateThrottle(UserRateThrottle):
    """Keyed by user id. Rate set in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['trade_execute'].

    Applies to GET too (DRF throttles per-view, not per-method) -- the rate is
    generous enough to not affect normal listing on screen mount.
    """
    scope = 'trade_execute'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def risk_profiles(request):
    return Response(RiskProfileSerializer(RiskProfile.objects.all(), many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AccountCreateRateThrottle])
def accounts(request):
    if request.method == 'GET':
        qs = TradingAccount.objects.filter(user=request.user)
        return Response(TradingAccountSerializer(qs, many=True).data)

    serializer = CreateAccountSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    account = services.create_account(request.user, **serializer.validated_data)
    return Response(TradingAccountSerializer(account).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([TradeExecuteRateThrottle])
def trades(request):
    if request.method == 'GET':
        qs = Trade.objects.filter(account__user=request.user)
        return Response(TradeSerializer(qs, many=True).data)

    serializer = ExecuteTradeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    created = services.execute_trade(
        request.user,
        data['account_ids'],
        data['score_vr'],
        data['score_ep'],
        data['score_vp'],
        data['score_total'],
    )
    return Response(TradeSerializer(created, many=True).data, status=status.HTTP_201_CREATED)
