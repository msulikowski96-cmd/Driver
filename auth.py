"""
Authentication utilities for the Driver Rating Application
Handles user authentication, session management, and authorization checks
"""

from flask import session, request, redirect, url_for, flash
from functools import wraps
from werkzeug.security import check_password_hash, generate_password_hash
from models import User, db
import re


def login_required(f):
    """
    Decorator to require user login for protected routes
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Musisz być zalogowany, aby uzyskać dostęp do tej strony.', 'warning')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """
    Decorator to require admin privileges for protected routes
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Musisz być zalogowany, aby uzyskać dostęp do tej strony.', 'warning')
            return redirect(url_for('login', next=request.url))
        
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            flash('Brak uprawnień administratora!', 'danger')
            return redirect(url_for('index'))
        
        return f(*args, **kwargs)
    return decorated_function


def is_logged_in():
    """
    Check if user is currently logged in
    Returns: bool
    """
    return 'user_id' in session


def get_current_user():
    """
    Get the currently logged in user object
    Returns: User object or None
    """
    if is_logged_in():
        return User.query.get(session['user_id'])
    return None


def is_admin():
    """
    Check if current user has admin privileges
    Returns: bool
    """
    user = get_current_user()
    return user and user.is_admin


def login_user(user):
    """
    Log in a user by setting session data
    Args:
        user: User object to log in
    """
    session['user_id'] = user.id
    session.permanent = True


def logout_user():
    """
    Log out the current user by clearing session data
    """
    session.pop('user_id', None)
    session.clear()


def authenticate_user(username_or_email, password):
    """
    Authenticate user with username/email and password
    Args:
        username_or_email: Username or email string
        password: Plain text password
    Returns:
        User object if authentication successful, None otherwise
    """
    # Try to find user by username first, then by email
    user = User.query.filter_by(username=username_or_email).first()
    if not user:
        user = User.query.filter_by(email=username_or_email).first()
    
    if user and check_password_hash(user.password_hash, password):
        return user
    
    return None


def create_user(username, email, password, is_admin=False):
    """
    Create a new user account
    Args:
        username: Unique username string
        email: Unique email string
        password: Plain text password (will be hashed)
        is_admin: Boolean indicating admin status
    Returns:
        User object if creation successful, None if user already exists
    Raises:
        ValueError: If validation fails
    """
    # Validate input
    if not validate_username(username):
        raise ValueError("Nieprawidłowa nazwa użytkownika")
    
    if not validate_email(email):
        raise ValueError("Nieprawidłowy adres email")
    
    if not validate_password(password):
        raise ValueError("Hasło nie spełnia wymagań bezpieczeństwa")
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        raise ValueError("Nazwa użytkownika jest już zajęta")
    
    if User.query.filter_by(email=email).first():
        raise ValueError("Email jest już zarejestrowany")
    
    # Create new user
    user = User()
    user.username = username
    user.email = email
    user.password_hash = generate_password_hash(password)
    user.is_admin = is_admin
    
    try:
        db.session.add(user)
        db.session.commit()
        return user
    except Exception as e:
        db.session.rollback()
        raise ValueError(f"Błąd podczas tworzenia konta: {str(e)}")


def change_password(user, current_password, new_password):
    """
    Change user's password
    Args:
        user: User object
        current_password: Current plain text password
        new_password: New plain text password
    Returns:
        bool: True if successful, False otherwise
    """
    if not check_password_hash(user.password_hash, current_password):
        return False
    
    if not validate_password(new_password):
        return False
    
    user.password_hash = generate_password_hash(new_password)
    
    try:
        db.session.commit()
        return True
    except Exception:
        db.session.rollback()
        return False


def validate_username(username):
    """
    Validate username format
    Args:
        username: Username string to validate
    Returns:
        bool: True if valid, False otherwise
    """
    if not username or len(username) < 3 or len(username) > 64:
        return False
    
    # Allow letters, numbers, and underscores
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False
    
    return True


def validate_email(email):
    """
    Validate email format
    Args:
        email: Email string to validate
    Returns:
        bool: True if valid, False otherwise
    """
    if not email or len(email) > 120:
        return False
    
    # Basic email validation regex
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None


def validate_password(password):
    """
    Validate password strength
    Args:
        password: Password string to validate
    Returns:
        bool: True if valid, False otherwise
    """
    if not password or len(password) < 6:
        return False
    
    # Add more password requirements if needed
    # For now, just check minimum length
    return True


def get_user_permissions(user):
    """
    Get user permissions as a dictionary
    Args:
        user: User object
    Returns:
        dict: Dictionary of permissions
    """
    if not user:
        return {
            'can_rate': False,
            'can_comment': False,
            'can_report': False,
            'can_delete_own_content': False,
            'can_admin': False
        }
    
    return {
        'can_rate': True,
        'can_comment': True,
        'can_report': True,
        'can_delete_own_content': True,
        'can_admin': user.is_admin
    }


def check_rate_limit(user, action, time_window=300, max_actions=10):
    """
    Check if user has exceeded rate limit for specific action
    Args:
        user: User object
        action: Action type string ('rate', 'comment', 'report')
        time_window: Time window in seconds (default 5 minutes)
        max_actions: Maximum actions allowed in time window
    Returns:
        bool: True if within rate limit, False if exceeded
    """
    # This is a simplified rate limiting implementation
    # In a production environment, you might want to use Redis or another caching solution
    
    # For now, return True (no rate limiting)
    # This can be implemented based on specific requirements
    return True


def sanitize_user_input(text):
    """
    Sanitize user input to prevent XSS attacks
    Args:
        text: Input text to sanitize
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    # Basic HTML entity encoding
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    text = text.replace("'", '&#x27;')
    
    return text.strip()


def create_admin_user():
    """
    Create default admin user if it doesn't exist
    Returns:
        User object or None
    """
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        try:
            admin = create_user(
                username='admin',
                email='admin@example.com',
                password='admin123',
                is_admin=True
            )
            return admin
        except ValueError:
            return None
    return admin


# Context processor to make auth functions available in templates
def auth_context_processor():
    """
    Template context processor to make auth functions available in templates
    """
    return {
        'is_logged_in': is_logged_in,
        'get_current_user': get_current_user,
        'is_admin': is_admin
    }


# Session configuration helpers
def configure_session(app):
    """
    Configure Flask session settings for security
    Args:
        app: Flask application instance
    """
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours


def init_auth(app):
    """
    Initialize authentication system with Flask app
    Args:
        app: Flask application instance
    """
    # Configure session
    configure_session(app)
    
    # Register context processor
    app.context_processor(auth_context_processor)
    
    # Create admin user if it doesn't exist
    with app.app_context():
        create_admin_user()
