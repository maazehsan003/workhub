// Toast Notification Function
function showToast(type, title, message) {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.professional-toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Icon mapping
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `professional-toast ${type} show`;
    toast.style.cssText = 'padding: 15px 20px; margin-bottom: 10px; border-radius: 8px;';
    toast.innerHTML = `
        <div class="toast-content" style="display: flex; align-items: center; gap: 10px;">
            <div class="toast-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div style="flex: 1;">
                <div class="toast-title" style="font-weight: 600; margin-bottom: 4px;">${title}</div>
                <div class="toast-message" style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
            </div>
            <button type="button" class="btn-close btn-close-white toast-close" aria-label="Close" style="opacity: 0.7;"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Make showToast available globally
window.showToast = showToast;

// Review Form Functionality
function initReviewForm() {
    const reviewForm = document.querySelector('.review-form');
    if (!reviewForm) return;
    
    // Get all the necessary elements
    const starInputs = document.querySelectorAll('.star-input');
    const starLabels = document.querySelectorAll('.star-label');
    const ratingLabels = document.querySelectorAll('.rating-label');
    const selectedRatingText = document.querySelector('.selected-rating-text');
    const feedbackTextarea = document.getElementById('feedback');
    const charCount = document.getElementById('char-count');
    
    // Star rating functionality
    function updateStarDisplay(rating) {
        if (!starLabels.length) return;
        
        starLabels.forEach((label, index) => {
            if (index < rating) {
                label.classList.add('active');
            } else {
                label.classList.remove('active');
            }
        });
        
        // Update rating labels
        if (ratingLabels.length) {
            ratingLabels.forEach((label, index) => {
                if (index === rating - 1) {
                    label.classList.add('active');
                } else {
                    label.classList.remove('active');
                }
            });
        }
        
        // Update selected rating text
        if (selectedRatingText) {
            const ratingTexts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
            selectedRatingText.textContent = `${rating} Star${rating !== 1 ? 's' : ''} - ${ratingTexts[rating]}`;
        }
    }
    
    // Handle star clicks
    starLabels.forEach((label, index) => {
        label.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            if (starInputs[rating - 1]) {
                starInputs[rating - 1].checked = true;
            }
            updateStarDisplay(rating);
        });
        
        // Hover effect
        label.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            starLabels.forEach((l, i) => {
                if (i < rating) {
                    l.style.color = '#ffc107';
                } else {
                    l.style.color = '#ddd';
                }
            });
        });
    });
    
    // Reset hover effect
    const starRatingInput = document.querySelector('.star-rating-input');
    if (starRatingInput) {
        starRatingInput.addEventListener('mouseleave', function() {
            const checkedInput = document.querySelector('.star-input:checked');
            if (checkedInput) {
                updateStarDisplay(parseInt(checkedInput.value));
            } else {
                starLabels.forEach(label => {
                    label.style.color = '#ddd';
                });
            }
        });
    }
    
    // Initialize star display
    const checkedInput = document.querySelector('.star-input:checked');
    if (checkedInput) {
        updateStarDisplay(parseInt(checkedInput.value));
    }
    
    // Character count functionality
    function updateCharCount() {
        if (!feedbackTextarea || !charCount) return;
        
        const count = feedbackTextarea.value.length;
        charCount.textContent = count;
        
        const counterElement = charCount.parentElement;
        counterElement.classList.remove('text-warning', 'text-danger');
        
        if (count > 900) {
            counterElement.classList.add('text-warning');
        } else if (count >= 1000) {
            counterElement.classList.add('text-danger');
        }
    }
    
    if (feedbackTextarea) {
        feedbackTextarea.addEventListener('input', updateCharCount);
        updateCharCount(); // Initialize count
    }
    
    // Form validation
    reviewForm.addEventListener('submit', function(e) {
        const rating = document.querySelector('.star-input:checked');
        const feedback = feedbackTextarea ? feedbackTextarea.value.trim() : '';
        
        console.log('Form submitted - Rating:', rating, 'Feedback length:', feedback.length);
        
        if (!rating) {
            e.preventDefault();
            console.log('Showing toast for missing rating');
            showToast('error', 'Rating Required', 'Please select a star rating before submitting your review.');
            return;
        }
        
        if (feedback.length < 10) {
            e.preventDefault();
            console.log('Showing toast for short review');
            showToast('error', 'Review Too Short', 'Please provide a more detailed review (at least 10 characters).');
            if (feedbackTextarea) feedbackTextarea.focus();
            return;
        }
        
        if (feedback.length > 1000) {
            e.preventDefault();
            console.log('Showing toast for long review');
            showToast('error', 'Review Too Long', 'Please keep your review under 1000 characters.');
            if (feedbackTextarea) feedbackTextarea.focus();
            return;
        }
    });
}

// Initialize review interactions
function initReviewInteractions() {
    // Add hover effects to review cards
    const reviewCards = document.querySelectorAll('.review-card');
    reviewCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
            this.style.transition = 'all 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
    });
    
    // Initialize review form if it exists
    initReviewForm();
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing review interactions');
    initReviewInteractions();
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showToast,
        initReviewForm,
        initReviewInteractions
    };
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
    
    const csrftoken = getCookie('csrftoken');
    
    fetch('/api/unread-count/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': csrftoken
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Network error');
        return response.json();
    })
    .then(data => {
        updateNavbarBadge(data.unread_count);
    })
    .catch(error => {
        // Silently fail
    });
}

/**
 * Helper function to get cookie
 */
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

/**
 * Initialize - Add to your DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', function() {
    const inboxLink = document.querySelector('.navbar a[href*="inbox"]');
    if (inboxLink) {
        checkUnreadMessages();
        setInterval(checkUnreadMessages, 5000);
    }
});