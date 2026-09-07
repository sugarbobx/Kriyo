from django.contrib import admin

from .models import Criterion, CriterionResult, GateAttempt, Question, QuestionAnswer


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    ordering = ['order']


@admin.register(Criterion)
class CriterionAdmin(admin.ModelAdmin):
    list_display = ['order', 'key', 'label', 'category', 'weight_in_gate']
    inlines = [QuestionInline]


@admin.register(GateAttempt)
class GateAttemptAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'overall_score', 'started_at', 'completed_at', 'locked_until']
    list_filter = ['status']
    search_fields = ['user__email']
    readonly_fields = ['started_at']


@admin.register(CriterionResult)
class CriterionResultAdmin(admin.ModelAdmin):
    list_display = ['gate_attempt', 'criterion', 'score', 'validated', 'completed_at']
    list_filter = ['criterion', 'validated']


@admin.register(QuestionAnswer)
class QuestionAnswerAdmin(admin.ModelAdmin):
    list_display = ['criterion_result', 'question', 'answer', 'answered_at']
