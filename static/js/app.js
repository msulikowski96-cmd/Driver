// Rating functionality
function initializeRating() {
    const stars = document.querySelectorAll('.star-rating .star');
    const ratingInput = document.getElementById('rating-input');

    if (stars.length === 0) return;

    stars.forEach((star, index) => {
        star.addEventListener('click', function() {
            const rating = index + 1;
            updateStarDisplay(rating);
            if (ratingInput) {
                ratingInput.value = rating;
            }
        });

        star.addEventListener('mouseover', function() {
            const rating = index + 1;
            highlightStars(rating);
        });
    });

    const starContainer = document.querySelector('.star-rating');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', function() {
            const currentRating = ratingInput ? ratingInput.value : 0;
            updateStarDisplay(currentRating);
        });
    }
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.star-rating .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('hover');
        } else {
            star.classList.remove('hover');
        }
    });
}

// Rate vehicle function
function rateVehicle(licensePlate) {
    const ratingInput = document.getElementById('rating-input');
    if (!ratingInput || !ratingInput.value) {
        showAlert('Wybierz ocenę!', 'warning');
        return;
    }

    const rating = parseInt(ratingInput.value);
    if (rating < 1 || rating > 5) {
        showAlert('Ocena musi być w przedziale 1-5!', 'warning');
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas zapisywania oceny!', 'danger');
    });
}

// Comment function
function addComment(licensePlate) {
    const commentInput = document.getElementById('comment-input');
    if (!commentInput || !commentInput.value.trim()) {
        showAlert('Wprowadź treść komentarza!', 'warning');
        return;
    }

    const comment = commentInput.value.trim();

    fetch('/api/comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_plate: licensePlate,
            comment: comment
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            commentInput.value = '';
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas dodawania komentarza!', 'danger');
    });
}

// Add new vehicle function
function addNewVehicle(licensePlate) {
    if (!licensePlate || licensePlate.trim() === '') {
        showAlert('Wprowadź poprawny numer rejestracyjny', 'warning');
        return;
    }
    
    // Redirect to vehicle detail page - it will show rating form for new vehicle
    showAlert('Przekierowywanie do strony pojazdu...', 'info');
    
    setTimeout(() => {
        window.location.href = `/vehicle/${licensePlate}`;
    }, 1000);
}

// Report comment function
function reportComment(commentId) {
    if (!confirm('Czy na pewno chcesz zgłosić ten komentarz?')) {
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas zgłaszania komentarza!', 'danger');
    });
}

// Delete my comment function
function deleteMyComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas usuwania komentarza!', 'danger');
    });
}

// Admin functions
function toggleBlockVehicle(licensePlate) {
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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd!', 'danger');
    });
}

function deleteComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas usuwania komentarza!', 'danger');
    });
}nality
function addComment(licensePlate) {
    const commentInput = document.getElementById('comment-input');
    if (!commentInput) {
        showAlert('Nie znaleziono pola komentarza!', 'danger');
        return;
    }

    const comment = commentInput.value.trim();
    if (!comment) {
        showAlert('Wprowadź komentarz!', 'warning');
        return;
    }

    fetch('/api/comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            license_plate: licensePlate,
            comment: comment
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            commentInput.value = '';
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas dodawania komentarza!', 'danger');
    });
}

// Report comment
function reportComment(commentId) {
    if (!confirm('Czy na pewno chcesz zgłosić ten komentarz?')) {
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas zgłaszania komentarza!', 'danger');
    });
}

// Delete own comment
function deleteMyComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć swój komentarz?')) {
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas usuwania komentarza!', 'danger');
    });
}

// Admin functions
function adminDeleteComment(commentId) {
    if (!confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas usuwania komentarza!', 'danger');
    });
}

function blockVehicle(licensePlate) {
    if (!confirm('Czy na pewno chcesz zmienić status blokady tego pojazdu?')) {
        return;
    }

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
            showAlert(data.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showAlert(data.error, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('Wystąpił błąd podczas zmiany statusu pojazdu!', 'danger');
    });
}

function clearReports(commentId) {
    if (!confirm('Czy na pewno chcesz wyczyścić zgłoszenia dla tego komentarza?')) {
        return;
    }

    // This would need a new API endpoint to clear reports
    showAlert('Funkcja w przygotowaniu!', 'info');
}

// Search functionality
function handleSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    console.log('Search query:', query);

    if (query.length > 0) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
}

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const inputs = form.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('is-invalid');
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
        }
    });

    return isValid;
}

// Alert system
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert.alert-floating');
    existingAlerts.forEach(alert => alert.remove());

    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-floating`;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    alertDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button type="button" class="btn-close btn-close-white" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;

    document.body.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeRating();

    // Search input handler
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }

    // Form validation on submit
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const formId = this.id;
            if (formId && !validateForm(formId)) {
                e.preventDefault();
                showAlert('Wypełnij wszystkie wymagane pola!', 'warning');
            }
        });
    });

    // Initialize tooltips if Bootstrap is available
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
});