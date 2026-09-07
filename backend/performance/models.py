from django.conf import settings
from django.db import models


class RiskProfile(models.Model):
    TYPE_CHOICES = [
        ('AGRESSIF', 'Agressif'),
        ('MODERE', 'Modéré'),
        ('CONSERVATEUR', 'Conservateur'),
    ]

    type = models.CharField(max_length=16, choices=TYPE_CHOICES, unique=True)
    label = models.CharField(max_length=32)
    daily_dd = models.FloatField(null=True, blank=True)
    max_dd = models.FloatField(null=True, blank=True)
    plafond_tp = models.FloatField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.label


PAYOUT_TO_RISK_PROFILE = {
    'ON_DEMAND': 'AGRESSIF',
    'DEUX_SEMAINES': 'MODERE',
    'UN_MOIS': 'CONSERVATEUR',
}


class TradingAccount(models.Model):
    PAYOUT_CHOICES = [
        ('ON_DEMAND', 'On-Demand'),
        ('DEUX_SEMAINES', '2 Semaines'),
        ('UN_MOIS', '1 Mois'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='trading_accounts', on_delete=models.CASCADE)
    name = models.CharField(max_length=64)
    capital = models.FloatField()
    payout_type = models.CharField(max_length=16, choices=PAYOUT_CHOICES)
    risk_profile = models.ForeignKey(RiskProfile, related_name='accounts', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.user_id})'


class Trade(models.Model):
    STATUS_CHOICES = [
        ('EN_COURS', 'En cours'),
        ('CLOTURE', 'Clôturé'),
        ('VERROUILLE', 'Verrouillé'),
    ]

    account = models.ForeignKey(TradingAccount, related_name='trades', on_delete=models.CASCADE)
    score_vr = models.PositiveSmallIntegerField()
    score_ep = models.PositiveSmallIntegerField()
    score_vp = models.PositiveSmallIntegerField()
    score_total = models.PositiveSmallIntegerField()
    risk_reward = models.FloatField(null=True, blank=True)
    pnl = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='EN_COURS')
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-opened_at']

    def __str__(self):
        return f'{self.account_id} · {self.score_total}/9 · {self.status}'
