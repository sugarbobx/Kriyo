from rest_framework import serializers


class CloseTradeSerializer(serializers.Serializer):
    pnl = serializers.FloatField()
