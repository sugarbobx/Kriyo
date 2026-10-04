from django.urls import path

from . import views

app_name = 'gate'

urlpatterns = [
    path('current/', views.current, name='current'),
    path('criteria/<slug:criterion_key>/questions/', views.questions, name='questions'),
    path('criteria/<slug:criterion_key>/review/', views.criterion_review, name='criterion-review'),
    path('criteria/<slug:criterion_key>/answers/', views.submit_answer, name='submit-answer'),
]
