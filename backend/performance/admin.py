from django.contrib import admin

from .models import RiskProfile, Trade, TradingAccount


@admin.register(RiskProfile)
class RiskProfileAdmin(admin.ModelAdmin):
    list_display = ['type', 'label', 'daily_dd', 'max_dd', 'plafond_tp']


@admin.register(TradingAccount)
class TradingAccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'capital', 'payout_type', 'risk_profile', 'created_at']
    list_filter = ['payout_type', 'risk_profile']
    search_fields = ['name', 'user__email']


@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ['account', 'score_total', 'status', 'pnl', 'opened_at', 'closed_at']
    list_filter = ['status']
