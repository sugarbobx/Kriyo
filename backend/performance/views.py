from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .models import RiskProfile, Trade, TradingAccount
from .serializers import (
    CreateAccountSerializer,
    ExecuteTradeSerializer,
    RiskProfileSerializer,
    TradeSerializer,
    TradingAccountSerializer,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def risk_profiles(request):
    return Response(RiskProfileSerializer(RiskProfile.objects.all(), many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
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
def trades(request):
    if request.method == 'GET':
        qs = Trade.objects.filter(account__user=request.user)
        return Response(TradeSerializer(qs, many=True).data)

    serializer = ExecuteTradeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        created = services.execute_trade(
            request.user,
            data['account_ids'],
            data['score_vr'],
            data['score_ep'],
            data['score_vp'],
            data['score_total'],
        )
    except services.AccountNotOwnedError:
        return Response({'detail': 'One or more accounts do not belong to you.'}, status=status.HTTP_403_FORBIDDEN)

    return Response(TradeSerializer(created, many=True).data, status=status.HTTP_201_CREATED)
