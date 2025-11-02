function releasePayment(jobId) {
    if (!confirm('Are you sure you want to claim this payment?')) return;

    const url = document.getElementById('releasePaymentUrl').value;
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ job_id: jobId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (window.toast) {
                window.toast.success('Success', data.message);
            } else {
                alert(data.message);
            }
            setTimeout(() => location.reload(), 1500);
        } else {
            if (window.toast) {
                window.toast.error('Error', data.error);
            } else {
                alert('Error: ' + data.error);
            }
        }
    })
    .catch(error => {
        if (window.toast) {
            window.toast.error('Error', 'An error occurred. Please try again.');
        } else {
            alert('An error occurred. Please try again.');
        }
        console.error('Error:', error);
    });
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