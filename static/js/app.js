
// Driver Rating Application JavaScript

// Global variables
let currentRatings = {};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeStarRatings();
    initializeCommentForms();
    initializeVotingButtons();
    initializeAdminButtons();
    initializeSearchForm();
});

// Initialize star rating systems
function initializeStarRatings() {
    console.log('Initializing star ratings...');
    
    const ratingContainers = document.querySelectorAll('.star-rating');
    
    ratingContainers.forEach(container => {
        const licensePlate = container.dataset.vehicle;
        const currentRating = parseInt(container.dataset.rating) || 0;
        const readonly = container.dataset.readonly === 'true';
        
        console.log(`Found rating element for ${licensePlate} with ${currentRating} stars`);
        
        // Store current rating
        currentRatings[licensePlate] = currentRating;
        
        // Create stars
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.dataset.rating = i;
            star.innerHTML = '★';
            
            // Set initial state
            if (i <= currentRating) {
                star.classList.add('filled');
            }
            
            if (!readonly) {
                // Add hover effects
                star.addEventListener('mouseenter', () => {
                    highlightStars(container, i);
                });
                
                star.addEventListener('mouseleave', () => {
                    highlightStars(container, currentRatings[licensePlate] || 0);
                });
                
                // Add click handler
                star.addEventListener('click', () => {
                    console.log(`Star ${i} clicked for ${licensePlate}`);
                    submitRating(licensePlate, i);
                });
            }
            
            container.appendChild(star);
        }
    });
}

// Highlight stars up to given rating
function highlightStars(container, rating) {
    const stars = container.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });
}

// Submit rating to server
async function submitRating(licensePlate, rating) {
    try {
        showLoading(true);
        
        const response = await fetch('/api/rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                license_plate: licensePlate,
                rating: rating
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            currentRatings[licensePlate] = rating;
            showMessage(data.message || 'Ocena została zapisana!', 'success');
            
            // Update rating display
            updateRatingDisplay(licensePlate, rating);
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas zapisywania oceny', 'error');
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showMessage('Wystąpił błąd podczas zapisywania oceny', 'error');
    } finally {
        showLoading(false);
    }
}

// Update rating display after successful submission
function updateRatingDisplay(licensePlate, rating) {
    const container = document.querySelector(`[data-vehicle="${licensePlate}"]`);
    if (container) {
        currentRatings[licensePlate] = rating;
        highlightStars(container, rating);
        
        // Update average rating if displayed
        const avgElement = document.querySelector(`#avg-rating-${licensePlate}`);
        if (avgElement) {
            // Refresh page to show updated average
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }
}

// Initialize comment forms
function initializeCommentForms() {
    const commentForms = document.querySelectorAll('[data-comment-form]');
    
    commentForms.forEach(form => {
        const submitBtn = form.querySelector('[data-submit-comment]');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const licensePlate = this.dataset.vehicle;
                submitComment(licensePlate);
            });
        }
    });
}

// Submit comment function
async function submitComment(licensePlate) {
    console.log('submitComment called for:', licensePlate);
    
    const textarea = document.querySelector(`#comment-${licensePlate}`);
    const commentText = textarea ? textarea.value.trim() : '';
    
    if (!commentText) {
        showMessage('Wprowadź treść komentarza', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                license_plate: licensePlate,
                comment: commentText
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage(data.message || 'Komentarz został dodany!', 'success');
            
            // Clear textarea
            if (textarea) {
                textarea.value = '';
            }
            
            // Reload page to show new comment
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas dodawania komentarza', 'error');
        }
    } catch (error) {
        console.error('Error submitting comment:', error);
        showMessage('Wystąpił błąd podczas dodawania komentarza', 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize voting buttons
function initializeVotingButtons() {
    const voteButtons = document.querySelectorAll('[data-vote-type]');
    
    voteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const commentId = this.dataset.commentId;
            const voteType = this.dataset.voteType;
            voteComment(commentId, voteType);
        });
    });
}

// Vote on comment function
async function voteComment(commentId, voteType) {
    try {
        showLoading(true);
        
        const response = await fetch('/api/vote_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                comment_id: commentId,
                vote_type: voteType
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage(data.message || 'Głos został zapisany!', 'success');
            
            // Update vote counts
            updateVoteDisplay(commentId, voteType);
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas głosowania', 'error');
        }
    } catch (error) {
        console.error('Error voting on comment:', error);
        showMessage('Wystąpił błąd podczas głosowania', 'error');
    } finally {
        showLoading(false);
    }
}

// Update vote display after voting
function updateVoteDisplay(commentId, voteType) {
    const button = document.querySelector(`[data-comment-id="${commentId}"][data-vote-type="${voteType}"]`);
    if (button) {
        button.classList.add('voted');
        
        // Reload page to show updated vote counts
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

// Initialize admin buttons
function initializeAdminButtons() {
    // Block/Unblock vehicle buttons
    const blockButtons = document.querySelectorAll('[data-toggle-block]');
    blockButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const licensePlate = this.dataset.vehicle;
            toggleVehicleBlock(licensePlate);
        });
    });
    
    // Delete comment buttons
    const deleteButtons = document.querySelectorAll('[data-delete-comment]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const commentId = this.dataset.commentId;
            deleteComment(commentId);
        });
    });
    
    // Report comment buttons
    const reportButtons = document.querySelectorAll('[data-report-comment]');
    reportButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const commentId = this.dataset.commentId;
            reportComment(commentId);
        });
    });
}

// Toggle vehicle block status
async function toggleVehicleBlock(licensePlate) {
    if (!confirm('Czy na pewno chcesz zmienić status blokady tego pojazdu?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/block_vehicle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                license_plate: licensePlate
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage(data.message || 'Status pojazdu został zmieniony!', 'success');
            
            // Reload page to show updated status
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas zmiany statusu', 'error');
        }
    } catch (error) {
        console.error('Error toggling vehicle block:', error);
        showMessage('Wystąpił błąd podczas zmiany statusu', 'error');
    } finally {
        showLoading(false);
    }
}

// Delete comment function
async function deleteComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/delete_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage(data.message || 'Komentarz został usunięty!', 'success');
            
            // Remove comment from DOM
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`).closest('.comment-box');
            if (commentElement) {
                commentElement.remove();
            }
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas usuwania komentarza', 'error');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showMessage('Wystąpił błąd podczas usuwania komentarza', 'error');
    } finally {
        showLoading(false);
    }
}

// Delete own comment function
async function deleteMyComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć swój komentarz?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/delete_my_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage(data.message || 'Komentarz został usunięty!', 'success');
            
            // Remove comment from DOM
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`).closest('.comment-box');
            if (commentElement) {
                commentElement.remove();
            }
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas usuwania komentarza', 'error');
        }
    } catch (error) {
        console.error('Error deleting own comment:', error);
        showMessage('Wystąpił błąd podczas usuwania komentarza', 'error');
    } finally {
        showLoading(false);
    }
}

// Report comment function
async function reportComment(commentId) {
    if (!confirm('Czy na pewno chcesz zgłosić ten komentarz?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/report_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage(data.message || 'Komentarz został zgłoszony!', 'success');
            
            // Disable report button
            const reportButton = document.querySelector(`[data-report-comment][data-comment-id="${commentId}"]`);
            if (reportButton) {
                reportButton.disabled = true;
                reportButton.textContent = 'Zgłoszono';
            }
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas zgłaszania komentarza', 'error');
        }
    } catch (error) {
        console.error('Error reporting comment:', error);
        showMessage('Wystąpił błąd podczas zgłaszania komentarza', 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize search form
function initializeSearchForm() {
    const searchInput = document.querySelector('#search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim().toUpperCase();
            console.log('Search query:', query);
            
            // Real-time search suggestions can be implemented here
            if (query.length >= 2) {
                // Optional: implement live search suggestions
            }
        });
    }
}

// Admin delete comment function
async function adminDeleteComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/delete_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showAlert(data.message || 'Komentarz został usunięty!', 'success');
            
            // Remove comment from DOM
            const commentElement = document.getElementById(`admin-comment-${commentId}`);
            if (commentElement) {
                commentElement.remove();
            }
        } else {
            showAlert(data.error || 'Wystąpił błąd podczas usuwania komentarza', 'danger');
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showAlert('Wystąpił błąd podczas usuwania komentarza', 'danger');
    } finally {
        showLoading(false);
    }
}

// Show alert function (compatible with Bootstrap alerts)
function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of main content
    const container = document.querySelector('.container') || document.body;
    const firstChild = container.firstElementChild;
    container.insertBefore(alertDiv, firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Utility functions
function showMessage(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert at top of main content
    const container = document.querySelector('.container') || document.body;
    const firstChild = container.firstElementChild;
    container.insertBefore(alertDiv, firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showLoading(show) {
    const buttons = document.querySelectorAll('button[type="submit"], .btn');
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

// Format license plate
function formatLicensePlate(plate) {
    // Remove spaces and convert to uppercase
    plate = plate.replace(/\s+/g, '').toUpperCase();
    
    // Add space after letters (Polish format)
    if (plate.length >= 3) {
        const letters = plate.substring(0, 2);
        const numbers = plate.substring(2);
        return `${letters} ${numbers}`;
    }
    
    return plate;
}

// Validate license plate format
function validateLicensePlate(plate) {
    // Polish license plate validation
    const cleanPlate = plate.replace(/\s+/g, '').toUpperCase();
    return /^[A-Z0-9]+$/.test(cleanPlate) && cleanPlate.length >= 4 && cleanPlate.length <= 8;
}

// Clear reports function for admin
async function clearReports(commentId) {
    if (!confirm('Czy na pewno chcesz wyczyścić zgłoszenia tego komentarza?')) {
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/clear_reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                comment_id: commentId
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showAlert(data.message || 'Zgłoszenia zostały wyczyszczone!', 'success');
            
            // Remove comment from admin view
            const commentElement = document.getElementById(`admin-comment-${commentId}`);
            if (commentElement) {
                commentElement.style.opacity = '0.5';
                setTimeout(() => {
                    commentElement.remove();
                }, 500);
            }
        } else {
            showAlert(data.error || 'Wystąpił błąd podczas czyszczenia zgłoszeń', 'danger');
        }
    } catch (error) {
        console.error('Error clearing reports:', error);
        showAlert('Wystąpił błąd podczas czyszczenia zgłoszeń', 'danger');
    } finally {
        showLoading(false);
    }
}

// Add incident function (for map functionality)
async function addIncident(licensePlate, latitude, longitude, type, description, severity = 1) {
    try {
        showLoading(true);
        
        const response = await fetch('/api/add_incident', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                license_plate: licensePlate,
                latitude: latitude,
                longitude: longitude,
                incident_type: type,
                description: description,
                severity: severity
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage(data.message || 'Zdarzenie zostało dodane!', 'success');
            return true;
        } else {
            showMessage(data.error || 'Wystąpił błąd podczas dodawania zdarzenia', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error adding incident:', error);
        showMessage('Wystąpił błąd podczas dodawania zdarzenia', 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

// CSS animations for loading state
const style = document.createElement('style');
style.textContent = `
    .loading {
        position: relative;
        pointer-events: none;
    }
    
    .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        border: 2px solid #ffffff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
    
    .star {
        cursor: pointer;
        color: #ddd;
        transition: color 0.2s ease;
    }
    
    .star.filled {
        color: #ffc107;
    }
    
    .star:hover {
        color: #ffed4a;
    }
    
    .vote-button.voted {
        background-color: var(--primary-color);
        color: white;
    }
`;

document.head.appendChild(style);

// Export functions for global access
window.submitComment = submitComment;
window.voteComment = voteComment;
window.toggleVehicleBlock = toggleVehicleBlock;
window.deleteComment = deleteComment;
window.deleteMyComment = deleteMyComment;
window.reportComment = reportComment;
window.addIncident = addIncident;
