from rest_framework import serializers

from .models import PAYOUT_TO_RISK_PROFILE, RiskProfile, Trade, TradingAccount


class RiskProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskProfile
        fields = ['type', 'label', 'daily_dd', 'max_dd', 'plafond_tp', 'note']


class TradingAccountSerializer(serializers.ModelSerializer):
    risk_profile = RiskProfileSerializer(read_only=True)

    class Meta:
        model = TradingAccount
        fields = ['id', 'name', 'capital', 'current_balance', 'payout_type', 'risk_profile', 'created_at']
        read_only_fields = ['id', 'risk_profile', 'created_at']


class CreateAccountSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=64)
    capital = serializers.FloatField(min_value=0.01)
    current_balance = serializers.FloatField(min_value=0)
    payout_type = serializers.ChoiceField(choices=list(PAYOUT_TO_RISK_PROFILE.keys()))


class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = [
            'id', 'account', 'score_vr', 'score_ep', 'score_vp', 'score_total',
            'risk_reward', 'pnl', 'status', 'opened_at', 'closed_at',
        ]
        read_only_fields = fields


class ExecuteTradeSerializer(serializers.Serializer):
    account_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1, max_length=20)
    score_vr = serializers.IntegerField(min_value=0, max_value=3)
    score_ep = serializers.IntegerField(min_value=0, max_value=3)
    score_vp = serializers.IntegerField(min_value=0, max_value=3)

    def validate(self, attrs):
        total = attrs['score_vr'] + attrs['score_ep'] + attrs['score_vp']
        if total != 9:
            raise serializers.ValidationError('Le score doit être parfait (9/9) pour exécuter un trade.')
        attrs['score_total'] = total
        return attrs
