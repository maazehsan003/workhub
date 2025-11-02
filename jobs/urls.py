from django.urls import path
from . import views

urlpatterns = [
    path('jobs/', views.job_list, name='job_list'),
    path('post/', views.post_job, name='post_job'),
    path('job/<int:job_id>/', views.get_job_detail, name='job_detail'),
    path('apply/<int:job_id>/', views.apply_job, name='apply_job'),
    path('applications/', views.applications, name='applications'),
    path('update-application-status/', views.update_application_status, name='update_application_status'),
    path('submit-work/', views.submit_work, name='submit_work'),
    path('view-work-submission/<int:job_id>/', views.view_work_submission, name='view_work_submission'),
    path('my-jobs/', views.my_jobs, name='my_jobs'),
]