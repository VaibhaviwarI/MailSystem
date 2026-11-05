from django.urls import path
from . import views, teacher_views

urlpatterns = [
    # Mail endpoints
    path('mails/', views.mail_list, name='mail-list'),
    path('mails/stats/', views.mail_stats, name='mail-stats'),
    path('mails/<str:mail_id>/', views.mail_detail, name='mail-detail'),

    # Teacher endpoints
    path('teachers/', teacher_views.teacher_list, name='teacher-list'),
    path('teachers/stats/', teacher_views.teacher_stats, name='teacher-stats'),
    path('teachers/<str:teacher_id>/', teacher_views.teacher_detail, name='teacher-detail'),

    # DB Explorer (Atlas databases overview)
    path('db-explorer/', teacher_views.db_explorer, name='db-explorer'),
]
