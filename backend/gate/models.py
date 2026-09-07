from django.conf import settings
from django.db import models


class Criterion(models.Model):
    CATEGORY_CHOICES = [('psych', 'Psych'), ('tech', 'Tech')]

    key = models.SlugField(unique=True)
    label = models.CharField(max_length=64)
    category = models.CharField(max_length=8, choices=CATEGORY_CHOICES)
    weight_in_gate = models.FloatField(default=0.20)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.label


class Question(models.Model):
    criterion = models.ForeignKey(Criterion, related_name='questions', on_delete=models.CASCADE)
    order = models.PositiveSmallIntegerField()
    text = models.CharField(max_length=255)
    weight = models.FloatField(default=1 / 6)

    class Meta:
        ordering = ['order']
        unique_together = [('criterion', 'order')]

    def __str__(self):
        return f'{self.criterion.key} #{self.order}'


class GateAttempt(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'in_progress'),
        ('passed', 'passed'),
        ('locked', 'locked'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='gate_attempts', on_delete=models.CASCADE)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    overall_score = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='in_progress')
    locked_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.user_id} · {self.status} · {self.started_at:%Y-%m-%d %H:%M}'


class CriterionResult(models.Model):
    """Created on the first answer of a criterion; score/validated/completed_at are
    only set once the 6th answer finalizes it — until then it represents an
    in-progress attempt at that criterion, not a scored result."""

    gate_attempt = models.ForeignKey(GateAttempt, related_name='criterion_results', on_delete=models.CASCADE)
    criterion = models.ForeignKey(Criterion, on_delete=models.CASCADE)
    score = models.FloatField(null=True, blank=True)
    validated = models.BooleanField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('gate_attempt', 'criterion')]

    def __str__(self):
        return f'{self.gate_attempt_id} · {self.criterion.key} · {self.score}'


class QuestionAnswer(models.Model):
    criterion_result = models.ForeignKey(CriterionResult, related_name='answers', on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    answer = models.BooleanField()
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('criterion_result', 'question')]
