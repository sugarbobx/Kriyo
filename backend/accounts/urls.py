from django.urls import path

from . import views

app_name = 'accounts'

urlpatterns = [
    path('csrf/', views.csrf, name='csrf'),
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me, name='me'),
    path('timezone/', views.sync_timezone, name='sync-timezone'),
]
