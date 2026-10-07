from django.conf import settings
from django.db import models


class EducationProgress(models.Model):
    """One row per (user, module_key) the user has marked as read. module_key
    is a frontend-owned stable id (see frontend/src/Education.tsx) -- not a
    FK, since module content is static i18n text, not a DB-backed model."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='education_progress', on_delete=models.CASCADE)
    module_key = models.SlugField(max_length=64)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'module_key')]
        ordering = ['-read_at']

    def __str__(self):
        return f'{self.user_id} · {self.module_key}'
