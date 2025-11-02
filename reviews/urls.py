from django.urls import path
from . import views

app_name = 'reviews'

urlpatterns = [
    path('write/<int:job_id>/', views.write_review, name='write_review'),
    path('edit/<int:job_id>/', views.edit_review, name='edit_review'),
    path('view/<int:job_id>/', views.view_review, name='view_review'),
    path('freelancer/<str:username>/', views.freelancer_reviews, name='freelancer_reviews'),
    path('delete/<int:job_id>/', views.delete_review, name='delete_review'),
    path('my-reviews/', views.my_reviews, name='my_reviews'),
    path('api/stats/<str:username>/', views.review_api_stats, name='review_api_stats'),
]