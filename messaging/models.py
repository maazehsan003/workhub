from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import os

class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    subject = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_by = models.ManyToManyField(User, related_name='deleted_conversations', blank=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"Conversation {self.id}: {self.subject or 'No subject'}"
    
    def get_last_message(self):
        return self.messages.first()
    
    def get_other_participant(self, user):
        """Get the other participant in a 2-person conversation"""
        return self.participants.exclude(id=user.id).first()
    
    def mark_as_read(self, user):
        """Mark all messages in conversation as read for a user"""
        self.messages.filter(is_read=False).exclude(sender=user).update(is_read=True)
        # Also mark notifications as read
        MessageNotification.objects.filter(
            user=user,
            message__conversation=self,
            is_read=False
        ).update(is_read=True)
    
    def soft_delete_for_user(self, user):
        """Soft delete conversation for a specific user"""
        self.deleted_by.add(user)
    
    def is_deleted_for_user(self, user):
        """Check if conversation is deleted for a specific user"""
        return self.deleted_by.filter(id=user.id).exists()


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    attachment = models.FileField(upload_to='message_attachments/', blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"
    
    def get_attachment_name(self):
        """Get just the filename without the directory path"""
        if self.attachment:
            return os.path.basename(self.attachment.name)
        return None


class MessageNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_notifications')
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'message']
    
    def __str__(self):
        return f"Notification for {self.user.username}"