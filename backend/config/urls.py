from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/gate/', include('gate.urls')),
    path('api/performance/', include('performance.urls')),
    path('api/', include('core.urls')),
]
