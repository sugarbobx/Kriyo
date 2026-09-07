from django.urls import path

from . import views

app_name = 'core'

urlpatterns = [
    path('health/', views.health, name='health'),
    path('engagement/accept/', views.accept_engagement, name='engagement-accept'),
]
