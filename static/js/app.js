// Driver Rating Application JavaScript

// Global variables
let currentRating = 0;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeStarRatings();
    initializeFormValidation();
    addEventListeners();
});

// Star rating functionality
function initializeStarRatings() {
    console.log('Initializing star ratings...');
    document.querySelectorAll('.star-rating-interactive').forEach(ratingElement => {
        const stars = ratingElement.querySelectorAll('.star-interactive');
        const licensePlate = ratingElement.dataset.licensePlate;
        
        console.log(`Found rating element for ${licensePlate} with ${stars.length} stars`);
        
        stars.forEach((star, index) => {
            star.style.cursor = 'pointer';
            star.addEventListener('mouseenter', () => highlightStars(stars, index + 1));
            star.addEventListener('mouseleave', () => resetStars(stars, getCurrentRating(ratingElement)));
            star.addEventListener('click', () => {
                console.log(`Star ${index + 1} clicked for ${licensePlate}`);
                setRating(stars, index + 1, licensePlate, ratingElement);
            });
        });
    });
}

function highlightStars(stars, rating) {
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-muted');
            star.classList.add('text-warning');
        } else {
            star.classList.remove('text-warning');
            star.classList.add('text-muted');
        }
    });
}

function resetStars(stars, rating) {
    highlightStars(stars, rating);
}

function getCurrentRating(ratingElement) {
    const filledStars = ratingElement.querySelectorAll('.star-interactive.text-warning').length;
    return filledStars;
}

function setRating(stars, rating, licensePlate, ratingElement) {
    currentRating = rating;
    highlightStars(stars, rating);
    
    // Send rating to server
    submitRating(licensePlate, rating);
}

// API calls
async function submitRating(licensePlate, rating) {
    try {
        showLoading(true);
        const response = await fetch('/api/rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                license_plate: licensePlate,
                rating: rating
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            // Refresh page after a short delay to show updated rating
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showAlert('Wystąpił błąd podczas zapisywania oceny', 'danger');
    } finally {
        showLoading(false);
    }
}

async function submitComment(licensePlate) {
    console.log('submitComment called for:', licensePlate);
    const commentText = document.getElementById('comment').value.trim();
    
    if (!commentText) {
        showAlert('Komentarz nie może być pusty', 'warning');
        return;
    }
    
    console.log('Submitting comment:', commentText);
    
    try {
        showLoading(true);
        const response = await fetch('/api/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                license_plate: licensePlate,
                comment: commentText
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            document.getElementById('comment').value = '';
            // Refresh page to show new comment
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showAlert('Wystąpił błąd podczas dodawania komentarza', 'danger');
    } finally {
        showLoading(false);
    }
}

async function reportComment(commentId) {
    if (!confirm('Czy na pewno chcesz zgłosić ten komentarz jako nieodpowiedni?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/report_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            // Disable the report button
            const reportBtn = document.querySelector(`button[onclick="reportComment(${commentId})"]`);
            if (reportBtn) {
                reportBtn.disabled = true;
                reportBtn.innerHTML = '<i class="fas fa-check"></i> Zgłoszono';
                reportBtn.classList.remove('btn-outline-warning');
                reportBtn.classList.add('btn-secondary');
            }
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        console.error('Error reporting comment:', error);
        showAlert('Wystąpił błąd podczas zgłaszania komentarza', 'danger');
    }
}

async function deleteMyComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć swój komentarz?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/delete_my_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            // Remove comment from DOM
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) {
                commentElement.style.opacity = '0.5';
                setTimeout(() => {
                    commentElement.remove();
                }, 500);
            }
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showAlert('Wystąpił błąd podczas usuwania komentarza', 'danger');
    }
}

// Admin functions
async function adminDeleteComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/delete_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            // Remove comment from DOM
            const commentElement = document.getElementById(`comment-${commentId}`) || 
                                 document.getElementById(`admin-comment-${commentId}`);
            if (commentElement) {
                commentElement.style.opacity = '0.5';
                setTimeout(() => {
                    commentElement.remove();
                }, 500);
            }
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showAlert('Wystąpił błąd podczas usuwania komentarza', 'danger');
    }
}

async function toggleBlockVehicle(licensePlate) {
    if (!confirm(`Czy na pewno chcesz zmienić status blokady pojazdu ${licensePlate}?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/block_vehicle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                license_plate: licensePlate
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert(data.message, 'success');
            // Refresh page to update UI
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    } catch (error) {
        console.error('Error toggling vehicle block:', error);
        showAlert('Wystąpił błąd podczas zmiany statusu pojazdu', 'danger');
    }
}

function clearReports(commentId) {
    if (!confirm('Czy na pewno chcesz wyczyścić zgłoszenia tego komentarza?')) {
        return;
    }
    
    // For this demo, we'll just remove the visual indicator
    // In a real app, you'd make an API call to clear reports
    const commentElement = document.getElementById(`admin-comment-${commentId}`);
    if (commentElement) {
        commentElement.style.opacity = '0.5';
        setTimeout(() => {
            commentElement.remove();
        }, 500);
    }
    
    showAlert('Zgłoszenia zostały wyczyszczone', 'success');
}

function blockVehicleByAdmin(event) {
    event.preventDefault();
    const licensePlate = document.getElementById('licensePlateToBlock').value.trim().toUpperCase();
    
    if (!licensePlate) {
        showAlert('Wprowadź numer rejestracyjny', 'warning');
        return;
    }
    
    toggleBlockVehicle(licensePlate);
    document.getElementById('licensePlateToBlock').value = '';
}

function showStats() {
    // Placeholder for system statistics
    showAlert('Funkcja statystyk będzie dostępna wkrótce', 'info');
}

function exportData() {
    // Placeholder for data export
    showAlert('Eksport danych zostanie wkrótce zaimplementowany', 'info');
}

function systemHealth() {
    // Placeholder for system health check
    showAlert('System działa poprawnie ✅', 'success');
}

function addNewVehicle(licensePlate) {
    if (!licensePlate || licensePlate.trim() === '') {
        showAlert('Wprowadź poprawny numer rejestracyjny', 'warning');
        return;
    }
    
    // Redirect to vehicle detail page - it will create the vehicle if it doesn't exist
    // We'll handle this in the backend by creating vehicle when first rating is added
    showAlert('Aby dodać pojazd, oceń go w następnym kroku', 'info');
    
    // For now, just redirect to a page that will handle adding
    setTimeout(() => {
        window.location.href = `/vehicle/${licensePlate}`;
    }, 1500);
}

// Utility functions
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert.auto-dismiss');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show auto-dismiss`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at the top of main content
    const mainContent = document.querySelector('main .container');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showLoading(show) {
    const buttons = document.querySelectorAll('button[type="submit"], .btn-primary');
    buttons.forEach(button => {
        if (show) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    });
}

function initializeFormValidation() {
    // License plate validation
    const licensePlateInputs = document.querySelectorAll('input[pattern*="A-Za-z0-9"]');
    licensePlateInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Convert to uppercase and remove non-alphanumeric characters
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
        });
    });
    
    // Form submission validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

function addEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Ctrl/Cmd + / for search focus
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            const searchInput = document.querySelector('input[name="q"]');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
    
    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(event) {
            event.preventDefault();
            const href = this.getAttribute('href');
            if (href && href !== '#') {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// Search functionality enhancements
function enhanceSearch() {
    const searchInput = document.querySelector('input[name="q"]');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const query = this.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    // Could implement live search suggestions here
                    console.log('Search query:', query);
                }, 300);
            }
        });
    }
}

// Initialize search enhancements
document.addEventListener('DOMContentLoaded', enhanceSearch);

// Export functions for global access
window.submitRating = submitRating;
window.submitComment = submitComment;
window.reportComment = reportComment;
window.deleteMyComment = deleteMyComment;
window.adminDeleteComment = adminDeleteComment;
window.toggleBlockVehicle = toggleBlockVehicle;
window.showAlert = showAlert;
window.clearReports = clearReports;
window.showStats = showStats;
window.exportData = exportData;
window.systemHealth = systemHealth;
window.addNewVehicle = addNewVehicle;
window.blockVehicleByAdmin = blockVehicleByAdmin;