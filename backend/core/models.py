from django.conf import settings
from django.db import models


class EngagementLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='engagement_logs')
    accepted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-accepted_at']

    def __str__(self):
        return f'{self.user_id} @ {self.accepted_at:%Y-%m-%d %H:%M}'
