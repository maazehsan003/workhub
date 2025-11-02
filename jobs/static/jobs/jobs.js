// Job List + Applications Management JavaScript 

// Declare openSubmitWorkModal globally so it's accessible from HTML
let openSubmitWorkModal;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Job & Applications JavaScript loaded');

    const jobCards = document.querySelectorAll('.job-card');
    const detailPanel = document.getElementById('job-detail-panel');
    const detailContent = document.getElementById('job-detail-content');
    const closeDetailBtn = document.getElementById('close-detail');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Modal elements
    const confirmationModal = document.getElementById('confirmationModal');
    const resultModal = document.getElementById('resultModal');
    let confirmationModalInstance = null;
    let resultModalInstance = null;

    // Initialize Bootstrap modals
    if (typeof bootstrap !== 'undefined') {
        if (confirmationModal) confirmationModalInstance = new bootstrap.Modal(confirmationModal);
        if (resultModal) resultModalInstance = new bootstrap.Modal(resultModal);
    }

    // Initialize all features
    initJobList();
    initSearchFeatures();
    initApplicationsPage();
    initFormHandling();
    initLoadingStates();
    initAlerts();
    initKeyboardShortcuts();
    initPageVisibility();
    handleResponsive();
    initWorkSubmissionModal();

    window.addEventListener('resize', handleResponsive);

    /** ---------------- JOB LIST ---------------- **/
    function initJobList() {
        jobCards.forEach(card => {
            card.addEventListener('click', function() {
                const jobId = this.dataset.jobId;
                loadJobDetail(jobId);

                jobCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        if (closeDetailBtn) {
            closeDetailBtn.addEventListener('click', function() {
                detailPanel.style.display = 'none';
                jobCards.forEach(c => c.classList.remove('selected'));
            });
        }
    }

    function loadJobDetail(jobId) {
        showLoading(true);

        fetch(`/job/${jobId}/`)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                displayJobDetail(data);
                if (detailPanel) detailPanel.style.display = 'block';
                showLoading(false);
            })
            .catch(error => {
                console.error('Error loading job details:', error);
                showResultModal('error', 'Error', 'Failed to load job details. Please try again.');
                showLoading(false);
            });
    }

    function displayJobDetail(job) {
        if (!detailContent) return;

        const applyButton = job.is_owner
            ? ''
            : job.has_applied
                ? '<button class="btn btn-secondary" disabled><i class="fas fa-check"></i> Already Applied</button>'
                : `<a href="/apply/${job.id}/" class="btn btn-success"><i class="fas fa-paper-plane"></i> Apply Now</a>`;

        detailContent.innerHTML = `
            <div class="fade-in">
                <h5 class="mb-3">${escapeHtml(job.title)}</h5>
                <p class="text-muted">${escapeHtml(job.description).replace(/\n/g, '<br>')}</p>
                <div class="d-grid">${applyButton}</div>
                ${job.is_owner ? '<small class="text-muted"><i class="fas fa-info-circle"></i> This is your job posting</small>' : ''}
            </div>
        `;
    }

    /** ---------------- SEARCH (FIXED CATEGORY FILTERING) ---------------- **/
    function initSearchFeatures() {
        const searchInput = document.getElementById('job-search');
        const categoryFilter = document.getElementById('category-filter');
        const clearSearchBtn = document.getElementById('clear-search');
        const resetSearchBtn = document.getElementById('reset-search');
        const noResultsMessage = document.getElementById('no-results-message');
        const searchResultsInfo = document.getElementById('search-results-info');
        const resultsCount = document.getElementById('results-count');
        const searchTermDisplay = document.getElementById('search-term-display');
        const jobListings = document.getElementById('job-listings');

        if (!searchInput || !categoryFilter) return;

        let searchTimeout;
        function performSearch() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const selectedCategory = categoryFilter.value;
            let visibleCount = 0;

            jobCards.forEach(card => {
                const title = card.querySelector('.job-title')?.textContent.toLowerCase() || '';
                const description = card.querySelector('.job-description')?.textContent.toLowerCase() || '';
                const categoryText = card.querySelector('.job-category')?.textContent.toLowerCase() || '';
                const categoryValue = card.getAttribute('data-category') || '';
                const categoryDisplayText = card.querySelector('.job-category')?.textContent || '';

                const textMatch = !searchTerm || 
                    title.includes(searchTerm) || 
                    description.includes(searchTerm) || 
                    categoryText.includes(searchTerm);

                let categoryMatch = true;
                if (selectedCategory) {
                    const directMatch = categoryValue === selectedCategory;
                    const categoryNames = {
                        'web-development': ['web development', 'web dev'],
                        'mobile-development': ['mobile development', 'mobile dev', 'mobile app'],
                        'design': ['design', 'graphic design', 'ui/ux'],
                        'writing': ['writing', 'content writing', 'copywriting'],
                        'marketing': ['marketing', 'digital marketing'],
                        'data-entry': ['data entry', 'data processing'],
                        'other': ['other', 'miscellaneous']
                    };
                    
                    const fallbackMatch = categoryNames[selectedCategory]?.some(name => 
                        categoryDisplayText.toLowerCase().includes(name)
                    ) || false;
                    
                    categoryMatch = directMatch || fallbackMatch;
                }

                if (textMatch && categoryMatch) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Update UI
            if (resultsCount) resultsCount.textContent = visibleCount;

            const hasActiveSearch = searchTerm || selectedCategory;
            if (searchResultsInfo) {
                searchResultsInfo.style.display = hasActiveSearch ? 'block' : 'none';
            }
            
            const shouldShowNoResults = hasActiveSearch && visibleCount === 0;
            if (noResultsMessage) {
                noResultsMessage.style.display = shouldShowNoResults ? 'block' : 'none';
            }
            
            if (jobListings) {
                jobListings.style.display = shouldShowNoResults ? 'none' : 'block';
            }

            // Update search term display
            if (searchTermDisplay) {
                let displayText = '';
                if (searchTerm && selectedCategory) {
                    displayText = ` for "${searchTerm}" in category "${categoryFilter.options[categoryFilter.selectedIndex].text}"`;
                } else if (searchTerm) {
                    displayText = ` for "${searchTerm}"`;
                } else if (selectedCategory) {
                    displayText = ` in category "${categoryFilter.options[categoryFilter.selectedIndex].text}"`;
                }
                searchTermDisplay.textContent = displayText;
            }
        }

        // Event listeners
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performSearch, 300);
        });
        
        categoryFilter.addEventListener('change', performSearch);
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                categoryFilter.value = '';
                performSearch();
            });
        }
        
        if (resetSearchBtn) {
            resetSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                categoryFilter.value = '';
                performSearch();
            });
        }

        // Initial search to set up the display
        performSearch();
    }

    /** ---------------- APPLICATIONS WITH MODAL POPUPS ---------------- **/
    function initApplicationsPage() {
        const applicationCards = document.querySelectorAll('.application-card');
        applicationCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });

        // Add event listeners for accept/decline buttons
        document.addEventListener('click', function(event) {
            const button = event.target.closest('.application-action');
            if (button) {
                event.preventDefault();
                event.stopPropagation();
                
                const action = button.getAttribute('data-action');
                const applicationId = button.getAttribute('data-application-id');
                const freelancer = button.getAttribute('data-freelancer');
                const amount = button.getAttribute('data-amount');
                const jobTitle = button.getAttribute('data-job-title');
                
                if (action && applicationId) {
                    showConfirmationModal(action, applicationId, freelancer, amount, jobTitle, button);
                }
            }
        });

        if (typeof bootstrap !== 'undefined') {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.map(el => new bootstrap.Tooltip(el));
        }
    }

    /** ---------------- WORK SUBMISSION MODAL ---------------- **/
    function initWorkSubmissionModal() {
        const modal = document.getElementById('submitWorkModal');
        const form = document.getElementById('workSubmissionForm');
        const fileInput = document.getElementById('workFiles');
        const filePreview = document.getElementById('filePreview');
        const fileList = document.getElementById('fileList');
        const submitBtn = document.getElementById('submitWorkBtn');
        const modalJobTitle = document.getElementById('modalJobTitle');
        
        if (!modal || !form) {
            console.log('Submit work modal elements not found');
            return;
        }
        
        let selectedFiles = [];
        let currentJobId = null;
        let modalInstance = null;
        
        if (typeof bootstrap !== 'undefined') {
            modalInstance = new bootstrap.Modal(modal);
        }
        
        // Assign to global variable so it's accessible from HTML onclick
        openSubmitWorkModal = function(jobId, jobTitle) {
            console.log('Opening modal for job:', jobId, jobTitle);
            currentJobId = jobId;
            if (modalJobTitle) modalJobTitle.textContent = jobTitle;
            if (modalInstance) {
                modalInstance.show();
            } else {
                console.error('Modal instance not initialized');
            }
        };
        
        // Also expose it on window object for extra safety
        window.openSubmitWorkModal = openSubmitWorkModal;
        
        // File input change handler
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const files = Array.from(e.target.files);
                selectedFiles = [...selectedFiles, ...files];
                updateFilePreview();
            });
        }
        
        // Update file preview
        function updateFilePreview() {
            if (!filePreview || !fileList) return;
            
            if (selectedFiles.length === 0) {
                filePreview.style.display = 'none';
                return;
            }
            
            filePreview.style.display = 'block';
            fileList.innerHTML = '';
            
            selectedFiles.forEach((file, index) => {
                const fileItem = createFileItem(file, index);
                fileList.appendChild(fileItem);
            });
        }
        
        // Create file item element
        function createFileItem(file, index) {
            const div = document.createElement('div');
            div.className = 'file-item';
            
            const fileIcon = getFileIcon(file.name);
            const fileSize = formatFileSize(file.size);
            
            div.innerHTML = `
                <div class="file-info">
                    <i class="fas ${fileIcon.icon} file-icon ${fileIcon.class}"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${fileSize})</span>
                </div>
                <i class="fas fa-times file-remove" onclick="removeFile(${index})" title="Remove file"></i>
            `;
            
            return div;
        }
        
        // Remove file from selection
        window.removeFile = function(index) {
            selectedFiles.splice(index, 1);
            updateFilePreview();
            
            // Update the file input
            const dt = new DataTransfer();
            selectedFiles.forEach(file => dt.items.add(file));
            if (fileInput) fileInput.files = dt.files;
        };
        
        // Get file icon based on extension
        function getFileIcon(filename) {
            const ext = filename.toLowerCase().split('.').pop();
            
            switch(ext) {
                case 'pdf':
                    return { icon: 'fa-file-pdf', class: 'pdf' };
                case 'doc':
                case 'docx':
                    return { icon: 'fa-file-word', class: 'doc' };
                case 'zip':
                case 'rar':
                    return { icon: 'fa-file-archive', class: 'zip' };
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                    return { icon: 'fa-file-image', class: 'image' };
                case 'mp4':
                case 'avi':
                case 'mov':
                    return { icon: 'fa-file-video', class: 'video' };
                case 'txt':
                    return { icon: 'fa-file-alt', class: 'default' };
                default:
                    return { icon: 'fa-file', class: 'default' };
            }
        }
        
        // Format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Validate file size
        function validateFiles() {
            const maxSize = 50 * 1024 * 1024; // 50MB
            
            for (let file of selectedFiles) {
                if (file.size > maxSize) {
                    alert(`File "${file.name}" is too large. Maximum size is 50MB.`);
                    return false;
                }
            }
            
            return true;
        }
        
        // Form submission
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (!validateFiles()) {
                    return;
                }
                
                // Show loading state
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.classList.add('btn-loading');
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                }
                
                // Create FormData
                const formData = new FormData();
                const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
                if (csrfToken) {
                    formData.append('csrfmiddlewaretoken', csrfToken.value);
                }
                
                formData.append('job_id', currentJobId);
                
                const workDescription = document.getElementById('workDescription');
                const additionalNotes = document.getElementById('additionalNotes');
                
                if (workDescription) formData.append('work_description', workDescription.value);
                if (additionalNotes) formData.append('additional_notes', additionalNotes.value);
                
                // Add files
                selectedFiles.forEach((file, index) => {
                    formData.append(`work_files_${index}`, file);
                });
                formData.append('file_count', selectedFiles.length);
                
                // Submit to server
                fetch('/submit-work/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': csrfToken ? csrfToken.value : ''
                    }
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        if (modalInstance) modalInstance.hide();
                        
                        // Show success toast
                        if (window.toast) {
                            const message = `Payment of $${data.payment_released} has been released to your account. Uploaded ${data.files ? data.files.length : 0} file(s).`;
                            window.toast.success('Work Submitted Successfully!', message, 5000);
                        }
                        
                        // Reload page
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000);
                    } else {
                        // Show error toast
                        if (window.toast) {
                            window.toast.error('Submission Failed', data.error || 'Failed to submit work', 5000);
                        }
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    // Show error toast
                    if (window.toast) {
                        window.toast.error('Network Error', 'An error occurred while submitting your work. Please try again.', 5000);
                    }
                })
                .finally(() => {
                    // Reset loading state
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('btn-loading');
                        submitBtn.innerHTML = '<i class="fas fa-upload"></i> Submit Work';
                    }
                });
            });
        }
        
        // Modal show event
        if (modal) {
            modal.addEventListener('shown.bs.modal', function() {
                const workDescription = document.getElementById('workDescription');
                if (workDescription) workDescription.focus();
            });
        }
        
        // Modal hide event - reset form
        if (modal) {
            modal.addEventListener('hidden.bs.modal', function() {
                if (form) form.reset();
                selectedFiles = [];
                if (filePreview) filePreview.style.display = 'none';
                if (fileList) fileList.innerHTML = '';
                const agreeTerms = document.getElementById('agreeTerms');
                if (agreeTerms) agreeTerms.checked = false;
            });
        }
    }

    /** ---------------- MODAL FUNCTIONS ---------------- **/
    function showConfirmationModal(action, applicationId, freelancer, amount, jobTitle, button) {
        if (!confirmationModalInstance) return;

        const modal = document.getElementById('confirmationModal');
        const modalIcon = document.getElementById('modal-icon');
        const modalTitleText = document.getElementById('modal-title-text');
        const modalMessage = document.getElementById('modal-message');
        const modalDetails = document.getElementById('modal-details');
        const confirmBtn = document.getElementById('modal-confirm-btn');

        // Reset modal classes
        modal.className = 'modal fade';
        
        if (action === 'accept') {
            modal.classList.add('modal-accept');
            modalIcon.className = 'fas fa-check-circle me-2 text-success';
            modalTitleText.textContent = 'Accept Application';
            modalMessage.innerHTML = `
                <strong>Are you sure you want to accept this application?</strong>
                <br><small class="text-muted">This action will deduct the payment from your wallet and place it on hold.</small>
            `;
            
            modalDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Freelancer:</span>
                    <span class="detail-value">${escapeHtml(freelancer)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Job:</span>
                    <span class="detail-value">${escapeHtml(jobTitle)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Payment Amount:</span>
                    <span class="detail-value">$${amount}</span>
                </div>
            `;
            
            confirmBtn.className = 'btn btn-success';
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Accept & Pay';
            
        } else if (action === 'decline') {
            modal.classList.add('modal-decline');
            modalIcon.className = 'fas fa-times-circle me-2 text-danger';
            modalTitleText.textContent = 'Decline Application';
            modalMessage.innerHTML = `
                <strong>Are you sure you want to decline this application?</strong>
                <br><small class="text-muted">This action cannot be undone.</small>
            `;
            
            modalDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Freelancer:</span>
                    <span class="detail-value">${escapeHtml(freelancer)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Job:</span>
                    <span class="detail-value">${escapeHtml(jobTitle)}</span>
                </div>
            `;
            
            confirmBtn.className = 'btn btn-danger';
            confirmBtn.innerHTML = '<i class="fas fa-times"></i> Decline';
        }

        // Set up confirmation button click
        confirmBtn.onclick = function() {
            confirmationModalInstance.hide();
            const status = action === 'accept' ? 'accepted' : 'declined';
            updateApplicationStatus(applicationId, status, button);
        };

        confirmationModalInstance.show();
    }

    function showResultModal(type, title, message, autoClose = false) {
        if (!resultModalInstance) return;

        const modal = document.getElementById('resultModal');
        const modalIcon = document.getElementById('result-modal-icon');
        const modalTitle = document.getElementById('result-modal-title');
        const modalMessage = document.getElementById('result-modal-message');

        // Reset modal classes
        modal.className = 'modal fade';
        
        if (type === 'success') {
            modal.classList.add('modal-success');
            modalIcon.className = 'fas fa-check-circle me-2 text-success';
        } else if (type === 'error') {
            modal.classList.add('modal-error');
            modalIcon.className = 'fas fa-exclamation-triangle me-2 text-danger';
        } else {
            modalIcon.className = 'fas fa-info-circle me-2 text-info';
        }

        modalTitle.textContent = title;
        modalMessage.innerHTML = message;

        resultModalInstance.show();

        if (autoClose) {
            setTimeout(() => {
                resultModalInstance.hide();
            }, 3000);
        }
    }

    /** ---------------- UTILS ---------------- **/
    function getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || getCookie('csrftoken') || document.querySelector('input[name="csrfmiddlewaretoken"]')?.value || null;
    }

    function getCookie(name) {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) return decodeURIComponent(cookie.substring(name.length + 1));
        }
        return null;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;'}[m]));
    }

    function showLoading(show) {
        if (loadingOverlay) loadingOverlay.style.display = show ? 'block' : 'none';
    }

    /** ---------------- ACTIONS WITH MODALS ---------------- **/
    function updateApplicationStatus(applicationId, status, button = null) {
        // Add loading state to button
        const originalText = button?.innerHTML;
        if (button) { 
            button.disabled = true; 
            button.classList.add('btn-loading');
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; 
        }

        const csrfToken = getCSRFToken();
        const applicationData = document.getElementById('application-data');
        const updateUrl = applicationData?.dataset.updateUrl || '/update-application-status/';
        const walletUrl = applicationData?.dataset.walletUrl || '/wallet/';

        console.log(`Sending request to ${updateUrl} with applicationId=${applicationId}, status=${status}`);

        fetch(updateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ 
                application_id: parseInt(applicationId), 
                status: status 
            })
        })
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Response data:', data);
            
            // Remove loading state
            if (button) {
                button.disabled = false;
                button.classList.remove('btn-loading');
                button.innerHTML = originalText;
            }
            
            if (data.success) {
                showResultModal(
                    'success', 
                    'Success!', 
                    data.message || `Application ${status} successfully!`
                );
                
                // Reload page after showing success message
                setTimeout(() => window.location.reload(), 2000);
                
            } else if (data.insufficient_funds) {
                const message = `
                    ${data.error || 'Insufficient funds in wallet.'}<br><br>
                    <div class="text-center">
                        <a href="${walletUrl}" class="btn btn-primary btn-sm">
                            <i class="fas fa-wallet"></i> Go to Wallet
                        </a>
                    </div>
                `;
                showResultModal('error', 'Insufficient Funds', message);
                
            } else {
                showResultModal('error', 'Error', data.error || 'Unknown error occurred.');
            }
        })
        .catch(err => {
            console.error('Fetch error:', err);
            
            // Remove loading state
            if (button) {
                button.disabled = false;
                button.classList.remove('btn-loading');
                button.innerHTML = originalText;
            }
            
            showResultModal('error', 'Network Error', 'An error occurred while updating the application. Please check your connection and try again.');
        });
    }

    function refreshApplications() {
        showResultModal('info', 'Refreshing', 'Updating applications list...', true);
        setTimeout(() => window.location.reload(), 1000);
    }

    // Export globally
    window.updateApplicationStatus = updateApplicationStatus;
    window.refreshApplications = refreshApplications;

    /** ---------------- EXTRAS ---------------- **/
    function initFormHandling() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', function() {
                const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                if (submitBtn) {
                    const originalText = submitBtn.innerHTML || submitBtn.value;
                    submitBtn.disabled = true;
                    if (submitBtn.innerHTML !== undefined) submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                    else submitBtn.value = 'Processing...';
                    setTimeout(() => { submitBtn.disabled = false; if (submitBtn.innerHTML !== undefined) submitBtn.innerHTML = originalText; else submitBtn.value = originalText; }, 30000);
                }
            });
        });
    }

    function initLoadingStates() {
        document.querySelectorAll('.wallet-topup-link').forEach(link => {
            link.addEventListener('click', function() {
                const originalText = this.textContent;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
                setTimeout(() => this.textContent = originalText, 5000);
            });
        });
    }

    function initAlerts() {
        // Auto-dismiss alerts after 5 seconds
        const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        alerts.forEach(alert => {
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000);
        });
    }
    
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', e => {
            if (e.altKey && e.key === 'r') { e.preventDefault(); refreshApplications(); }
            if (e.key === 'Escape') {
                // Close modals on Escape
                if (confirmationModalInstance && confirmationModal.classList.contains('show')) {
                    confirmationModalInstance.hide();
                }
                if (resultModalInstance && resultModal.classList.contains('show')) {
                    resultModalInstance.hide();
                }
                // Close other alerts
                document.querySelectorAll('.alert .btn-close').forEach(btn => btn.click());
            }
        });
    }

    function initPageVisibility() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) console.log('Page became visible');
        });
    }

    function handleResponsive() {
        const isMobile = window.innerWidth <= 768;
        document.querySelectorAll('.application-card').forEach(card => {
            if (isMobile) card.classList.add('mobile-card'); 
            else card.classList.remove('mobile-card');
        });
        
        // Adjust modal size for mobile
        if (confirmationModal) {
            if (isMobile) {
                confirmationModal.querySelector('.modal-dialog').classList.add('modal-fullscreen-sm-down');
            } else {
                confirmationModal.querySelector('.modal-dialog').classList.remove('modal-fullscreen-sm-down');
            }
        }
    }

    /** ---------------- ADDITIONAL MODAL ENHANCEMENTS ---------------- **/
    
    // Auto-focus on modal buttons when opened
    if (confirmationModal) {
        confirmationModal.addEventListener('shown.bs.modal', function() {
            const confirmBtn = document.getElementById('modal-confirm-btn');
            if (confirmBtn) confirmBtn.focus();
        });
    }
    
    if (resultModal) {
        resultModal.addEventListener('shown.bs.modal', function() {
            const okBtn = resultModal.querySelector('.modal-footer .btn');
            if (okBtn) okBtn.focus();
        });
    }
    
    // Handle Enter key in modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (confirmationModal && confirmationModal.classList.contains('show')) {
                e.preventDefault();
                const confirmBtn = document.getElementById('modal-confirm-btn');
                if (confirmBtn && !confirmBtn.disabled) {
                    confirmBtn.click();
                }
            }
            if (resultModal && resultModal.classList.contains('show')) {
                e.preventDefault();
                const okBtn = resultModal.querySelector('.modal-footer .btn');
                if (okBtn) {
                    okBtn.click();
                }
            }
        }
    });
    
    // Prevent modal backdrop clicks from closing important modals
    if (confirmationModal) {
        confirmationModal.addEventListener('hide.bs.modal', function(e) {
            // Allow closing only via buttons or escape key
            const isBackdropClick = e.target === confirmationModal;
            if (isBackdropClick) {
                e.preventDefault();
                // Optional: shake animation to indicate modal can't be closed by clicking outside
                confirmationModal.querySelector('.modal-dialog').style.animation = 'shake 0.5s';
                setTimeout(() => {
                    confirmationModal.querySelector('.modal-dialog').style.animation = '';
                }, 500);
            }
        });
    }
});

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

// Check for unread messages on page load
document.addEventListener('DOMContentLoaded', function() {
    const inboxLink = document.querySelector('.navbar a[href*="inbox"]');
    if (inboxLink) {
        checkUnreadMessages();
        setInterval(checkUnreadMessages, 5000);
    }
});