from django.urls import path

from . import views

app_name = 'education'

urlpatterns = [
    path('progress/', views.progress, name='progress'),
]
