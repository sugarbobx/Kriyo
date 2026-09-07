from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from performance.serializers import TradeSerializer

from . import services
from .serializers import CloseTradeSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def close_trade(request, trade_id):
    serializer = CloseTradeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        trade, outcome = services.close_trade(request.user, trade_id, serializer.validated_data['pnl'])
    except services.TradeNotFoundError:
        return Response({'detail': 'Trade introuvable.'}, status=status.HTTP_404_NOT_FOUND)
    except services.TradeAlreadyClosedError:
        return Response({'detail': 'Ce trade est déjà clôturé.'}, status=status.HTTP_409_CONFLICT)

    return Response({'trade': TradeSerializer(trade).data, 'outcome': outcome})
