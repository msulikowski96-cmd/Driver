
// Driver Rating Application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initializeStarRatings();
    initializeFormValidation();
    initializeSearch();
});

function initializeStarRatings() {
    console.log('Initializing star ratings...');
    const ratingContainers = document.querySelectorAll('.star-rating');
    
    ratingContainers.forEach(container => {
        const licensePlate = container.dataset.licensePlate;
        const currentRating = parseInt(container.dataset.currentRating) || 0;
        const stars = container.querySelectorAll('.star');
        
        console.log(`Found rating element for ${licensePlate} with ${currentRating} stars`);
        
        // Set initial rating display
        updateStarDisplay(stars, currentRating);
        
        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                const rating = index + 1;
                console.log(`Star ${rating} clicked for ${licensePlate}`);
                submitRating(licensePlate, rating);
                updateStarDisplay(stars, rating);
            });
            
            star.addEventListener('mouseenter', function() {
                updateStarDisplay(stars, index + 1, true);
            });
        });
        
        container.addEventListener('mouseleave', function() {
            updateStarDisplay(stars, currentRating);
        });
    });
}

function updateStarDisplay(stars, rating, isHover = false) {
    stars.forEach((star, index) => {
        star.classList.remove('filled', 'hover');
        if (index < rating) {
            star.classList.add(isHover ? 'hover' : 'filled');
        }
    });
}

function submitRating(licensePlate, rating) {
    showLoading(true);
    
    fetch('/api/rate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_plate: licensePlate,
            rating: rating
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Ocena została zapisana');
            // Update the current rating in the container
            const container = document.querySelector(`[data-license-plate="${licensePlate}"]`);
            if (container) {
                container.dataset.currentRating = rating;
            }
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas zapisywania oceny');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
}

function submitComment(licensePlate) {
    console.log('submitComment called for:', licensePlate);
    const commentTextarea = document.querySelector(`#comment-${licensePlate.replace(/\s+/g, '-')}`);
    const commentText = commentTextarea ? commentTextarea.value.trim() : '';
    
    if (!commentText) {
        showAlert('warning', 'Komentarz nie może być pusty');
        return;
    }
    
    showLoading(true);
    
    fetch('/api/comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_plate: licensePlate,
            comment: commentText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Komentarz został dodany');
            commentTextarea.value = '';
            // Reload the page to show the new comment
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas dodawania komentarza');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
}

function voteComment(commentId, voteType) {
    showLoading(true);
    
    fetch('/api/vote_comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            comment_id: commentId,
            vote_type: voteType
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Głos został zapisany');
            // Reload to update vote counts
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas głosowania');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
}

function reportComment(commentId) {
    if (!confirm('Czy na pewno chcesz zgłosić ten komentarz?')) {
        return;
    }
    
    showLoading(true);
    
    fetch('/api/report_comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            comment_id: commentId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Komentarz został zgłoszony');
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas zgłaszania');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
}

function deleteMyComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć swój komentarz?')) {
        return;
    }
    
    showLoading(true);
    
    fetch('/api/delete_my_comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            comment_id: commentId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Komentarz został usunięty');
            // Remove the comment element from DOM
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                commentElement.remove();
            }
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas usuwania');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
}

function toggleVehicleBlock(licensePlate) {
    if (!confirm('Czy na pewno chcesz zmienić status blokady tego pojazdu?')) {
        return;
    }
    
    showLoading(true);
    
    fetch('/api/admin/block_vehicle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_plate: licensePlate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Status pojazdu został zmieniony');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas zmiany statusu');
        }
    })
    .catch(error => {
        console.error('Error toggling vehicle block:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
}

function deleteComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
        return;
    }
    
    showLoading(true);
    
    fetch('/api/admin/delete_comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            comment_id: commentId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Komentarz został usunięty');
            // Remove the comment element from DOM
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                commentElement.remove();
            }
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas usuwania');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
}

function initializeSearch() {
    const searchInput = document.querySelector('#search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            console.log('Search query:', query);
            // You can add real-time search functionality here
        });
    }
}

function showAlert(type, message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-hide after 5 seconds
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
                showAlert('warning', 'Proszę wypełnić wszystkie wymagane pola poprawnie');
            }
            form.classList.add('was-validated');
        });
    });
}

// Add incident functionality (if needed)
function addIncident(licensePlate, latitude, longitude, incidentType, description, severity) {
    showLoading(true);
    
    fetch('/api/add_incident', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_plate: licensePlate,
            latitude: latitude,
            longitude: longitude,
            incident_type: incidentType,
            description: description,
            severity: severity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Zdarzenie zostało dodane');
        } else {
            showAlert('danger', data.error || 'Wystąpił błąd podczas dodawania zdarzenia');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Wystąpił błąd podczas komunikacji z serwerem');
    })
    .finally(() => {
        showLoading(false);
    });
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
    
    .star.hover {
        color: #ffed4a;
    }
`;
document.head.appendChild(style);
