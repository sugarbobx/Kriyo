from django.contrib import admin

from .models import EducationProgress


@admin.register(EducationProgress)
class EducationProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'module_key', 'read_at']
    list_filter = ['module_key', 'read_at']
    search_fields = ['user__email', 'module_key']
    readonly_fields = ['user', 'module_key', 'read_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
