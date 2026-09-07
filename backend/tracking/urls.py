from django.urls import path

from . import views

app_name = 'tracking'

urlpatterns = [
    path('trades/<int:trade_id>/close/', views.close_trade, name='close-trade'),
]
