from django.contrib import admin
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.db.models import Avg, Count, Sum
from django.utils import timezone

from .models import EngagementLog

DASHBOARD_STATS_CACHE_KEY = 'kriyo:admin_dashboard_stats'
DASHBOARD_STATS_CACHE_SECONDS = 60


def _compute_dashboard_stats():
    """Aggregate metrics shown at the top of /admin/. The session-scan loop
    below costs more as active-session count grows, so the result is cached
    for DASHBOARD_STATS_CACHE_SECONDS by the caller rather than recomputed on
    every page load -- acceptable staleness for a stats panel."""
    from accounts.models import User
    from education.models import EducationProgress
    from gate.models import GateAttempt
    from performance.models import Trade, TradingAccount

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    last_7d = now - timezone.timedelta(days=7)
    last_30d = now - timezone.timedelta(days=30)

    connected_user_ids = set()
    for session in Session.objects.filter(expire_date__gt=now).iterator():
        uid = session.get_decoded().get('_auth_user_id')
        if uid is not None:
            connected_user_ids.add(uid)

    gate_decided = GateAttempt.objects.exclude(status='in_progress')
    gate_decided_count = gate_decided.count()
    gate_passed_count = gate_decided.filter(status='passed').count()

    trades_by_status = dict(Trade.objects.values_list('status').annotate(n=Count('id')))
    accounts_by_profile = list(
        TradingAccount.objects.values('risk_profile__label').annotate(n=Count('id')).order_by('-n')
    )

    return {
        'users_total': User.objects.count(),
        'users_new_today': User.objects.filter(date_joined__gte=today_start).count(),
        'users_new_7d': User.objects.filter(date_joined__gte=last_7d).count(),
        'users_new_30d': User.objects.filter(date_joined__gte=last_30d).count(),
        'users_connected_now': len(connected_user_ids),
        'dau': GateAttempt.objects.filter(started_at__gte=today_start).values('user').distinct().count(),
        'gate_decided_count': gate_decided_count,
        'gate_pass_rate': round(gate_passed_count / gate_decided_count * 100, 1) if gate_decided_count else None,
        'gate_avg_score': GateAttempt.objects.filter(overall_score__isnull=False).aggregate(avg=Avg('overall_score'))['avg'],
        'accounts_total': TradingAccount.objects.count(),
        'accounts_by_profile': accounts_by_profile,
        'trades_total': Trade.objects.count(),
        'trades_en_cours': trades_by_status.get('EN_COURS', 0),
        'trades_cloture': trades_by_status.get('CLOTURE', 0),
        'trades_verrouille': trades_by_status.get('VERROUILLE', 0),
        'trades_total_pnl': Trade.objects.filter(pnl__isnull=False).aggregate(total=Sum('pnl'))['total'] or 0,
        'engagement_today': EngagementLog.objects.filter(accepted_at__gte=today_start).count(),
        'education_modules_read_total': EducationProgress.objects.count(),
        'education_users_with_progress': EducationProgress.objects.values('user').distinct().count(),
    }


_original_index = admin.site.index


def _index_with_stats(request, extra_context=None):
    extra_context = dict(extra_context or {})
    stats = cache.get(DASHBOARD_STATS_CACHE_KEY)
    if stats is None:
        stats = _compute_dashboard_stats()
        cache.set(DASHBOARD_STATS_CACHE_KEY, stats, DASHBOARD_STATS_CACHE_SECONDS)
    extra_context['kriyo_stats'] = stats
    return _original_index(request, extra_context)


admin.site.index = _index_with_stats


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
