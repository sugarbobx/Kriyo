from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from performance.serializers import TradeSerializer

from . import services
from .serializers import CloseTradeSerializer


class TradeCloseRateThrottle(UserRateThrottle):
    """Keyed by user id. Rate set in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['trade_close']."""
    scope = 'trade_close'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([TradeCloseRateThrottle])
def close_trade(request, trade_id):
    serializer = CloseTradeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    trade, outcome = services.close_trade(request.user, trade_id, serializer.validated_data['pnl'])
    return Response({'trade': TradeSerializer(trade).data, 'outcome': outcome})
