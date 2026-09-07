from django.contrib import admin

from .models import EngagementLog


@admin.register(EngagementLog)
class EngagementLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'accepted_at']
    list_filter = ['accepted_at']
    search_fields = ['user__email']
    readonly_fields = ['user', 'accepted_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
