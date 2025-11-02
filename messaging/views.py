from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.db.models import Q, Count, Max
from django.contrib import messages as django_messages
from .models import Conversation, Message, MessageNotification

@login_required
def inbox(request):
    """Display all conversations for the logged-in user"""
    conversations = Conversation.objects.filter(
        participants=request.user
    ).exclude(
        deleted_by=request.user  # Exclude conversations deleted by this user
    ).annotate(
        unread_count=Count('messages', filter=Q(messages__is_read=False) & ~Q(messages__sender=request.user))
    ).prefetch_related('participants', 'messages').order_by('-updated_at')  # Sort by most recent first
    
    # Add other_participant to each conversation for easier template access
    for conversation in conversations:
        conversation.other_participant = conversation.get_other_participant(request.user)
    
    context = {
        'conversations': conversations,
    }
    return render(request, 'messaging/inbox.html', context)


@login_required
def conversation_detail(request, conversation_id):
    """Display messages in a conversation and handle new message submission"""
    conversation = get_object_or_404(
        Conversation, 
        id=conversation_id, 
        participants=request.user
    )
    
    # Check if conversation is deleted for this user
    if conversation.is_deleted_for_user(request.user):
        django_messages.error(request, 'This conversation has been deleted.')
        return redirect('inbox')
    
    if request.method == 'POST':
        content = request.POST.get('content')
        attachment = request.FILES.get('attachment')
        
        if content or attachment:
            message = Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=content,
                attachment=attachment
            )
            
            # Create notifications for other participants (silently)
            for participant in conversation.participants.exclude(id=request.user.id):
                MessageNotification.objects.create(
                    user=participant,
                    message=message
                )
            
            # If the conversation was deleted by the other participant, restore it
            for participant in conversation.participants.exclude(id=request.user.id):
                if conversation.is_deleted_for_user(participant):
                    conversation.deleted_by.remove(participant)
            
            conversation.updated_at = message.created_at
            conversation.save()
            
            # Clear any Django messages before redirect to prevent notification display
            storage = django_messages.get_messages(request)
            storage.used = True
            
            return redirect('conversation_detail', conversation_id=conversation.id)
    
    # Mark messages as read
    conversation.mark_as_read(request.user)

    # Clear any system-wide notifications, as they are redundant on this page
    storage = django_messages.get_messages(request)
    storage.used = True
    
    messages = conversation.messages.select_related('sender').all()
    other_participant = conversation.get_other_participant(request.user)
    
    context = {
        'conversation': conversation,
        'messages': messages,
        'other_participant': other_participant,
    }
    return render(request, 'messaging/conversation.html', context)

@login_required
def delete_conversation(request, conversation_id):
    """Soft delete a conversation for the current user"""
    conversation = get_object_or_404(Conversation, id=conversation_id, participants=request.user)
    
    if request.method == 'POST':
        # Soft delete for this user only
        conversation.soft_delete_for_user(request.user)
        django_messages.success(request, 'Conversation deleted successfully.')
        return redirect('inbox')

@login_required
def start_conversation_with_user(request, user_id):
    """Start or continue a conversation with a specific user"""
    other_user = get_object_or_404(User, id=user_id)
    
    # Don't allow users to message themselves
    if other_user == request.user:
        django_messages.error(request, 'You cannot message yourself.')
        return redirect('inbox')
    
    # Check if a conversation already exists between these two users
    existing_conversation = Conversation.objects.filter(
        participants=request.user
    ).filter(
        participants=other_user
    ).first()
    
    if existing_conversation:
        # If conversation was deleted by current user, restore it
        if existing_conversation.is_deleted_for_user(request.user):
            existing_conversation.deleted_by.remove(request.user)
        
        # Redirect to existing conversation
        return redirect('conversation_detail', conversation_id=existing_conversation.id)
    
    # Create a new conversation
    conversation = Conversation.objects.create()
    conversation.participants.add(request.user, other_user)
    
    # Redirect to the new conversation
    return redirect('conversation_detail', conversation_id=conversation.id)

@login_required
def unread_count(request):
    """API endpoint to get unread message count"""
    count = Message.objects.filter(
        conversation__participants=request.user,
        is_read=False
    ).exclude(
        sender=request.user
    ).exclude(
        conversation__deleted_by=request.user  # Exclude messages from deleted conversations
    ).count()
    
    return JsonResponse({'unread_count': count})


@login_required
def mark_as_read(request, message_id):
    """Mark a specific message as read"""
    message = get_object_or_404(Message, id=message_id, conversation__participants=request.user)
    
    if message.sender != request.user:
        message.is_read = True
        message.save()
    
    return JsonResponse({'success': True})