from django.urls import path
from . import views

urlpatterns = [
    path('inbox/', views.inbox, name='inbox'),
    path('conversation/<int:conversation_id>/', views.conversation_detail, name='conversation_detail'),
    path('conversation/<int:conversation_id>/delete/', views.delete_conversation, name='delete_conversation'),
    path('start-conversation/<int:user_id>/', views.start_conversation_with_user, name='start_conversation_with_user'),
    path('api/unread-count/', views.unread_count, name='unread_count'),
    path('api/message/<int:message_id>/mark-read/', views.mark_as_read, name='mark_message_read'),
]