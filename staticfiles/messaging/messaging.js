/**
 * Real-time Messaging Application
 * Handles live updates, notifications, and UI interactions
 */

const MessagingApp = (function() {
    'use strict';

    let config = {
        unreadCountUrl: null,
        checkNewMessagesUrl: null,
        conversationId: null,
        currentPage: null,
        refreshInterval: 2000, // 2 seconds
        lastMessageId: null,
        isActive: true
    };

    let intervals = [];

    /**
     * Initialize the messaging app
     */
    function init(options) {
        config = { ...config, ...options };
        
        // Get CSRF token
        const csrfToken = getCSRFToken();
        if (!csrfToken) {
            console.error('CSRF token not found');
            return;
        }

        // Set up based on current page
        if (config.currentPage === 'conversation') {
            initConversationPage();
        } else if (config.currentPage === 'inbox') {
            initInboxPage();
        }

        // Always check for unread count
        startUnreadCountPolling();

        // Handle page visibility
        handlePageVisibility();

        // Set up textarea auto-resize
        setupTextareaAutoResize();

        // Set up file attachment preview
        setupFileAttachment();
    }

    /**
     * Initialize conversation page functionality
     */
    function initConversationPage() {
        // Get last message ID
        const messages = document.querySelectorAll('[data-message-id]');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            config.lastMessageId = lastMessage.getAttribute('data-message-id');
        }

        // Scroll to bottom on load
        scrollToBottom();

        // Start polling for new messages
        startNewMessagesPolling();

        // Handle form submission with AJAX
        setupAjaxMessageSubmit();
    }

    /**
     * Initialize inbox page functionality
     */
    function initInboxPage() {
        // Start polling for conversation updates
        startInboxPolling();
    }

    /**
     * Poll for unread message count
     */
    function startUnreadCountPolling() {
        if (!config.unreadCountUrl) return;

        const checkUnreadCount = () => {
            if (!config.isActive) return;

            fetch(config.unreadCountUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCSRFToken()
                }
            })
            .then(response => response.json())
            .then(data => {
                updateUnreadBadge(data.unread_count);
            })
            .catch(error => console.error('Error checking unread count:', error));
        };

        // Check immediately
        checkUnreadCount();

        // Then poll every 2 seconds
        const intervalId = setInterval(checkUnreadCount, config.refreshInterval);
        intervals.push(intervalId);
    }

    /**
     * Poll for new messages in conversation
     */
    function startNewMessagesPolling() {
        if (!config.checkNewMessagesUrl) return;

        const checkNewMessages = () => {
            if (!config.isActive) return;

            fetch(config.checkNewMessagesUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCSRFToken()
                }
            })
            .then(response => response.text())
            .then(html => {
                // Parse the HTML response
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newMessages = doc.querySelectorAll('[data-message-id]');
                
                if (newMessages.length > 0) {
                    const lastNewMessage = newMessages[newMessages.length - 1];
                    const lastNewMessageId = lastNewMessage.getAttribute('data-message-id');
                    
                    // Check if there are new messages
                    if (config.lastMessageId !== lastNewMessageId) {
                        // Find messages newer than our last message
                        let foundNew = false;
                        const container = document.getElementById('messages-container');
                        
                        Array.from(newMessages).forEach(messageEl => {
                            const messageId = messageEl.getAttribute('data-message-id');
                            
                            if (foundNew || messageId > config.lastMessageId) {
                                foundNew = true;
                                
                                // Check if message already exists
                                if (!document.querySelector(`[data-message-id="${messageId}"]`)) {
                                    // Clone and append the message
                                    const clonedMessage = messageEl.cloneNode(true);
                                    container.appendChild(clonedMessage);
                                }
                            }
                        });
                        
                        config.lastMessageId = lastNewMessageId;
                        scrollToBottom(true);
                    }
                }
            })
            .catch(error => console.error('Error checking new messages:', error));
        };

        const intervalId = setInterval(checkNewMessages, config.refreshInterval);
        intervals.push(intervalId);
    }

    /**
     * Poll for inbox updates
     */
    function startInboxPolling() {
        const checkInboxUpdates = () => {
            if (!config.isActive) return;

            // Reload the page content to update conversations
            const currentUrl = window.location.href;
            
            fetch(currentUrl, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCSRFToken()
                }
            })
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newConversationsList = doc.getElementById('conversations-list');
                const currentConversationsList = document.getElementById('conversations-list');
                
                if (newConversationsList && currentConversationsList) {
                    // Only update if content has changed
                    if (newConversationsList.innerHTML !== currentConversationsList.innerHTML) {
                        currentConversationsList.innerHTML = newConversationsList.innerHTML;
                    }
                }
            })
            .catch(error => console.error('Error updating inbox:', error));
        };

        const intervalId = setInterval(checkInboxUpdates, config.refreshInterval);
        intervals.push(intervalId);
    }

    /**
     * Update unread badge in navbar and inbox
     */
    function updateUnreadBadge(count) {
        // Update inbox badge
        const inboxBadge = document.getElementById('unread-badge');
        if (inboxBadge) {
            inboxBadge.textContent = count;
            
            if (count > 0) {
                inboxBadge.classList.add('bg-danger');
                inboxBadge.classList.remove('bg-primary');
            } else {
                inboxBadge.classList.remove('bg-danger');
                inboxBadge.classList.add('bg-primary');
            }
        }

        // Update navbar dot indicator
        updateNavbarBadge(count);
    }

    /**
     * Update navbar notification dot
     */
    function updateNavbarBadge(count) {
        // Find the inbox/messages link in navbar
        const navLinks = document.querySelectorAll('.navbar a[href*="inbox"]');
        
        navLinks.forEach(link => {
            // Remove existing dot
            let dot = link.querySelector('.unread-dot');
            
            if (count > 0) {
                if (!dot) {
                    dot = document.createElement('span');
                    dot.className = 'unread-dot';
                    link.appendChild(dot);
                }
            } else {
                if (dot) {
                    dot.remove();
                }
            }
        });
    }

    /**
     * Set up AJAX message submission
     */
    function setupAjaxMessageSubmit() {
        const form = document.getElementById('message-form');
        const input = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (!form || !input) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const content = input.value.trim();
            const formData = new FormData(form);
            
            if (!content && !formData.get('attachment')) {
                return;
            }

            // Disable form
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            fetch(form.action || window.location.href, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (response.ok) {
                    // Clear form
                    input.value = '';
                    input.style.height = 'auto';
                    
                    // Clear attachment
                    const attachmentInput = document.getElementById('attachment-input');
                    if (attachmentInput) {
                        attachmentInput.value = '';
                    }
                    
                    const attachmentPreview = document.getElementById('attachment-preview');
                    if (attachmentPreview) {
                        attachmentPreview.innerHTML = '';
                        attachmentPreview.classList.remove('active');
                    }

                    // Reload page to show new message
                    window.location.reload();
                } else {
                    throw new Error('Failed to send message');
                }
            })
            .catch(error => {
                console.error('Error sending message:', error);
                alert('Failed to send message. Please try again.');
            })
            .finally(() => {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
            });
        });
    }

    /**
     * Set up textarea auto-resize
     */
    function setupTextareaAutoResize() {
        const textarea = document.getElementById('message-input');
        
        if (!textarea) return;

        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        // Handle Enter key (send on Enter, new line on Shift+Enter)
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const form = document.getElementById('message-form');
                if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        });
    }

    /**
     * Set up file attachment preview
     */
    function setupFileAttachment() {
        const attachmentInput = document.getElementById('attachment-input');
        const attachmentPreview = document.getElementById('attachment-preview');
        
        if (!attachmentInput || !attachmentPreview) return;

        attachmentInput.addEventListener('change', function() {
            const file = this.files[0];
            
            if (file) {
                attachmentPreview.innerHTML = `
                    <div class="d-flex align-items-center justify-content-between">
                        <div>
                            <i class="fas fa-file"></i> ${file.name} (${formatFileSize(file.size)})
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="MessagingApp.clearAttachment()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                attachmentPreview.classList.add('active');
            } else {
                attachmentPreview.innerHTML = '';
                attachmentPreview.classList.remove('active');
            }
        });
    }

    /**
     * Clear attachment
     */
    function clearAttachment() {
        const attachmentInput = document.getElementById('attachment-input');
        const attachmentPreview = document.getElementById('attachment-preview');
        
        if (attachmentInput) attachmentInput.value = '';
        if (attachmentPreview) {
            attachmentPreview.innerHTML = '';
            attachmentPreview.classList.remove('active');
        }
    }

    /**
     * Scroll messages container to bottom
     */
    function scrollToBottom(smooth = false) {
        const container = document.getElementById('messages-container');
        if (!container) return;

        if (smooth) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            container.scrollTop = container.scrollHeight;
        }
    }

    /**
     * Handle page visibility changes
     */
    function handlePageVisibility() {
        document.addEventListener('visibilitychange', function() {
            config.isActive = !document.hidden;
        });

        window.addEventListener('focus', function() {
            config.isActive = true;
        });

        window.addEventListener('blur', function() {
            config.isActive = false;
        });
    }

    /**
     * Get CSRF token
     */
    function getCSRFToken() {
        // Try to get from meta tag first
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }

        // Fall back to cookie
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    /**
     * Format file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Clean up intervals on page unload
     */
    window.addEventListener('beforeunload', function() {
        intervals.forEach(id => clearInterval(id));
    });

    // Public API
    return {
        init: init,
        clearAttachment: clearAttachment,
        scrollToBottom: scrollToBottom
    };
})();

// Make MessagingApp available globally
window.MessagingApp = MessagingApp;