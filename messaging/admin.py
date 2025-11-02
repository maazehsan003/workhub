from django.contrib import admin
from .models import Conversation, Message, MessageNotification


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'subject', 'get_participants', 'created_at', 'updated_at')
    search_fields = ('subject', 'participants__username')
    list_filter = ('created_at', 'updated_at')
    filter_horizontal = ('participants', 'deleted_by')
    ordering = ('-updated_at',)

    def get_participants(self, obj):
        return ", ".join([user.username for user in obj.participants.all()])
    get_participants.short_description = 'Participants'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'short_content', 'is_read', 'created_at')
    search_fields = ('sender__username', 'conversation__subject', 'content')
    list_filter = ('is_read', 'created_at')
    ordering = ('-created_at',)

    def short_content(self, obj):
        return (obj.content[:50] + '...') if len(obj.content) > 50 else obj.content
    short_content.short_description = 'Content'


@admin.register(MessageNotification)
class MessageNotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'message', 'is_read', 'created_at')
    search_fields = ('user__username', 'message__content')
    list_filter = ('is_read', 'created_at')
    ordering = ('-created_at',)
