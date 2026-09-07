from django.urls import path

from . import views

app_name = 'performance'

urlpatterns = [
    path('risk-profiles/', views.risk_profiles, name='risk-profiles'),
    path('accounts/', views.accounts, name='accounts'),
    path('trades/', views.trades, name='trades'),
]
