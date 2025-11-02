function getCookie(name) {
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

function getCSRFTokenFromDOM() {
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    if (csrfInput) {
        return csrfInput.value;
    }
    return getCookie('csrftoken');
}

let csrftoken = getCookie('csrftoken');

// Enhanced notification function
function showNotification(type, title, message) {
    if (window.toast) {
        window.toast.show(type, title, message);
    } else {
        alert(`${title}: ${message}`);
    }
}

/**
 * Update navbar notification dot
 */
function updateNavbarBadge(count) {
    const navLinks = document.querySelectorAll('.navbar a[href*="inbox"]');
    
    navLinks.forEach(link => {
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
 * Check unread message count
 */
function checkUnreadMessages() {
    const inboxLink = document.querySelector('.navbar a[href*="inbox"]');
    if (!inboxLink) return;
    
    fetch('/api/unread-count/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrftoken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        updateNavbarBadge(data.unread_count);
    })
    .catch(error => {
        // Silently fail
    });
}

document.addEventListener('DOMContentLoaded', function() {
    csrftoken = getCookie('csrftoken');
    
    // Only start checking for authenticated users
    const inboxLink = document.querySelector('.navbar a[href*="inbox"]');
    if (inboxLink) {
        checkUnreadMessages();
        setInterval(checkUnreadMessages, 5000);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const registerBtn = document.getElementById('registerBtn');
            
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            
            try {
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': csrftoken   
                    },
                    credentials: 'same-origin'
                });

                let data;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    console.error("Unexpected non-JSON response:", text);  
                    showNotification('error', 'Server Error', 'An unexpected error occurred. Please check the logs.');
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                    return;
                }
                
                if (data.success) {
                    if (data.csrfToken) {
                        csrftoken = data.csrfToken;  
                        console.log("Updated CSRF token from backend:", csrftoken);
                        
                        const roleFormCSRF = document.querySelector('#roleForm [name=csrfmiddlewaretoken]');
                        if (roleFormCSRF) {
                            roleFormCSRF.value = csrftoken;
                        }
                    } else {
                        csrftoken = getCookie('csrftoken');
                    }

                    showNotification('success', 'Account Created!', 'Please select your role to continue.');
                    const roleModal = new bootstrap.Modal(document.getElementById('roleModal'));
                    roleModal.show();
                } else {
                    showNotification('error', 'Registration Failed', data.message || 'Please check your information and try again.');
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('error', 'Network Error', 'Please check your connection and try again.');
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
        });
    }
    
    // Add smooth animations to cards on dashboard
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Add click effects to stat cards
    const statCards = document.querySelectorAll('.card.bg-primary, .card.bg-success, .card.bg-info, .card.bg-warning');
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
});

let selectedRoleValue = '';

function selectRole(role, el) {
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    el.classList.add('selected');
    selectedRoleValue = role;
    document.getElementById('selectedRole').value = role;
    document.getElementById('continueBtn').disabled = false;
    
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(0, 123, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    `;
    
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (rect.width - size) / 2 + 'px';
    ripple.style.top = (rect.height - size) / 2 + 'px';
    
    el.style.position = 'relative';
    el.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

async function submitRole() {
    if (!selectedRoleValue) return;

    const continueBtn = document.getElementById('continueBtn');
    continueBtn.disabled = true;
    continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting up...';

    try {
        const roleForm = document.getElementById('roleForm');
        const formData = new FormData(roleForm);

        const currentCSRFToken = getCSRFTokenFromDOM() || csrftoken;
        
        const response = await fetch(roleForm.action, {
            method: 'POST',
            body: formData,
            headers: { 
                'X-CSRFToken': currentCSRFToken 
            },
            credentials: 'same-origin'
        });

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error("Unexpected non-JSON response:", text);
            showNotification('error', 'Server Error', 'An unexpected error occurred. Please check the logs.');
            continueBtn.disabled = false;
            continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue';
            return;
        }

        if (data.success) {
            showNotification('success', 'Welcome to Work Hub!', 'Your account has been set up successfully.');
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1500);
        } else {
            showNotification('error', 'Setup Failed', data.message || 'Failed to save role selection.');
            continueBtn.disabled = false;
            continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue';
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('error', 'Network Error', 'Please check your connection and try again.');
        continueBtn.disabled = false;
        continueBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Continue';
    }
}

if (!document.getElementById('ripple-animation-css')) {
    const style = document.createElement('style');
    style.id = 'ripple-animation-css';
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

class ProfessionalToast {
    constructor(container) {
        this.container = container || document.getElementById('toastContainer');
    }
    
    show(type, title, message, duration = 5000) {
        const toastId = 'toast-' + Date.now();
        const icons = {
            'success': 'fas fa-check-circle',
            'info': 'fas fa-info-circle', 
            'warning': 'fas fa-exclamation-triangle',
            'error': 'fas fa-times-circle'
        };
        
        const toastHtml = `
            <div class="toast professional-toast ${type}" role="alert" id="${toastId}">
                <div class="toast-body">
                    <div class="toast-content">
                        <i class="${icons[type]} toast-icon"></i>
                        <div class="flex-grow-1">
                            <div class="toast-title">${title}</div>
                            <div class="toast-message">${message}</div>
                        </div>
                        <button type="button" class="btn-close toast-close" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            </div>
        `;
        
        this.container.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const bsToast = new bootstrap.Toast(toastElement, {
            delay: duration,
            autohide: true
        });
        
        bsToast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
        
        return bsToast;
    }
    
    success(title, message, duration) {
        return this.show('success', title, message, duration);
    }
    
    error(title, message, duration) {
        return this.show('error', title, message, duration);
    }
    
    warning(title, message, duration) {
        return this.show('warning', title, message, duration);
    }
    
    info(title, message, duration) {
        return this.show('info', title, message, duration);
    }
}

const toast = new ProfessionalToast();

document.addEventListener('DOMContentLoaded', function() {
    const messageElements = document.querySelectorAll('#django-messages > div');
    
    messageElements.forEach(element => {
        const type = element.getAttribute('data-message-type');
        const message = element.getAttribute('data-message-text');
        
        let title = 'Notification';
        let toastType = 'info';
        
        switch(type) {
            case 'success':
                title = 'Success';
                toastType = 'success';
                break;
            case 'error':
                title = 'Error';
                toastType = 'error';
                break;
            case 'warning':
                title = 'Warning';
                toastType = 'warning';
                break;
            case 'info':
                title = 'Information';
                toastType = 'info';
                break;
        }
        
        toast.show(toastType, title, message);
    });
});

window.toast = toast;