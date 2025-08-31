import os
import logging
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv not installed, continue without it
    pass
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import re

# Configure logging
logging.basicConfig(level=logging.DEBUG)


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
# Configuration from environment variables
app.config['SECRET_KEY'] = os.environ.get(
    "SESSION_SECRET", "dev-secret-key-change-in-production")
app.config['FLASK_ENV'] = os.environ.get("FLASK_ENV", "development")
app.config['DEBUG'] = os.environ.get("FLASK_DEBUG", "True").lower() == "true"
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
# Use PostgreSQL if DATABASE_URL is available (Replit), otherwise SQLite for development
database_url = os.environ.get("DATABASE_URL")
if database_url:
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
else:
    # SQLite for local development
    app.config[
        "SQLALCHEMY_DATABASE_URI"] = "sqlite:///instance/driver_ratings.db"
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

from models import User, Vehicle, Rating, Comment, Report, Incident, UserStatistics, CommentVote, Favorite

# Initialize the app with the extension
db.init_app(app)


# Helper functions for authentication
def is_logged_in():
    return 'user_id' in session


def get_current_user():
    if is_logged_in():
        try:
            user_id = session.get('user_id')
            if user_id:
                return User.query.get(user_id)
        except Exception as e:
            print(f"Error getting current user: {e}")
            session.clear()
    return None


def is_admin():
    user = get_current_user()
    return user and user.is_admin


tomtom_api_key = os.getenv("TOMTOM_API_KEY")


# Initialize authentication system
def init_auth(app):

    @app.context_processor
    def inject_auth_functions():
        return {
            'get_current_user': get_current_user,
            'is_logged_in': is_logged_in,
            'is_admin': is_admin
        }


# Function to create admin user
def create_admin_user():
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = User()
        admin_user.username = 'admin'
        admin_user.email = 'admin@example.com'
        admin_user.password_hash = generate_password_hash('admin123')
        admin_user.is_admin = True
        db.session.add(admin_user)
        db.session.commit()
        print("Admin user created: username=admin, password=admin123")


# Initialize authentication system and create admin user
init_auth(app)

# Create database tables
with app.app_context():
    db.create_all()
    # Create admin user if it doesn't exist
    create_admin_user()


# Routes
@app.route('/')
def index():
    # Get recently rated vehicles
    recent_ratings = db.session.query(Rating).order_by(
        Rating.created_at.desc()).limit(10).all()
    recent_vehicles = []
    seen_plates = set()

    for rating in recent_ratings:
        vehicle = Vehicle.query.get(rating.vehicle_id)
        if vehicle and vehicle.license_plate not in seen_plates:
            recent_vehicles.append(vehicle)
            seen_plates.add(vehicle.license_plate)
            if len(recent_vehicles) >= 5:
                break

    return render_template('index.html', recent_vehicles=recent_vehicles)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')

        if not username or not password:
            flash('Wprowadź login i hasło!', 'danger')
            return render_template('login.html')

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            flash('Zalogowano pomyślnie!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Nieprawidłowy login lub hasło!', 'danger')

    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')

        if not username or not email or not password:
            flash('Wszystkie pola są wymagane!', 'danger')
            return render_template('register.html')

        if User.query.filter_by(username=username).first():
            flash('Nazwa użytkownika jest już zajęta!', 'danger')
            return render_template('register.html')

        if User.query.filter_by(email=email).first():
            flash('Email jest już zarejestrowany!', 'danger')
            return render_template('register.html')

        user = User()
        user.username = username
        user.email = email
        user.password_hash = generate_password_hash(password)

        db.session.add(user)
        db.session.commit()

        session['user_id'] = user.id
        flash('Rejestracja przebiegła pomyślnie!', 'success')
        return redirect(url_for('index'))

    return render_template('register.html')


@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('Wylogowano pomyślnie!', 'info')
    return redirect(url_for('index'))


@app.route('/vehicle/<license_plate>')
def vehicle_detail(license_plate):
    # Validate license plate format
    if not validate_license_plate(license_plate):
        flash('Nieprawidłowy format numeru rejestracyjnego!', 'warning')
        return redirect(url_for('index'))

    vehicle = Vehicle.query.filter_by(
        license_plate=license_plate.upper()).first()

    # Create vehicle if it doesn't exist
    if not vehicle:
        vehicle = Vehicle()
        vehicle.license_plate = license_plate.upper()
        db.session.add(vehicle)
        db.session.commit()
        flash(f'Pojazd {license_plate.upper()} został dodany do bazy danych!',
              'success')

    if vehicle.is_blocked and not is_admin():
        flash('Ten pojazd został zablokowany!', 'danger')
        return redirect(url_for('index'))

    ratings = Rating.query.filter_by(vehicle_id=vehicle.id).all()
    comments = Comment.query.filter_by(vehicle_id=vehicle.id).order_by(
        Comment.created_at.desc()).all()

    avg_rating = sum(r.rating
                     for r in ratings) / len(ratings) if ratings else 0

    # Check if current user has already rated this vehicle
    user_rating = None
    if is_logged_in():
        user_rating = Rating.query.filter_by(
            vehicle_id=vehicle.id, user_id=session['user_id']).first()

    return render_template('vehicle_detail.html',
                           vehicle=vehicle,
                           ratings=ratings,
                           comments=comments,
                           avg_rating=avg_rating,
                           user_rating=user_rating)


@app.route('/search')
def search():
    query = request.args.get('q', '').strip().upper()
    vehicles = []

    if query:
        if validate_license_plate(query):
            vehicles = Vehicle.query.filter(
                Vehicle.license_plate.like(f'%{query}%')).all()

            if not is_admin():
                vehicles = [v for v in vehicles if not v.is_blocked]
        else:
            flash('Nieprawidłowy format numeru rejestracyjnego!', 'warning')

    return render_template('search.html', vehicles=vehicles, query=query)


@app.route('/ranking')
def ranking():
    sort_order = request.args.get('sort', 'best')  # best or worst

    # Get all vehicles with their average ratings
    vehicles_with_ratings = []
    vehicles = Vehicle.query.all()

    for vehicle in vehicles:
        if vehicle.is_blocked and not is_admin():
            continue

        ratings = Rating.query.filter_by(vehicle_id=vehicle.id).all()
        if ratings:
            avg_rating = sum(r.rating for r in ratings) / len(ratings)
            vehicles_with_ratings.append({
                'vehicle': vehicle,
                'avg_rating': avg_rating,
                'rating_count': len(ratings)
            })

    # Sort by average rating
    reverse_order = sort_order == 'best'
    vehicles_with_ratings.sort(key=lambda x: x['avg_rating'],
                               reverse=reverse_order)

    return render_template('ranking.html',
                           vehicles_with_ratings=vehicles_with_ratings,
                           sort_order=sort_order)


@app.route('/admin')
def admin():
    if not is_admin():
        flash('Brak uprawnień administratora!', 'danger')
        return redirect(url_for('index'))

    reported_comments = Comment.query.filter(Comment.reports > 0).order_by(
        Comment.reports.desc()).all()
    blocked_vehicles = Vehicle.query.filter_by(is_blocked=True).all()

    return render_template('admin.html',
                           reported_comments=reported_comments,
                           blocked_vehicles=blocked_vehicles)


@app.route('/dashboard')
def dashboard():
    if not is_admin():
        flash('Brak uprawnień administratora!', 'danger')
        return redirect(url_for('index'))

    return render_template('dashboard.html')


# Routes for traffic information
@app.route('/traffic')
def traffic():
    """Traffic map page"""
    return render_template('traffic.html')


# API Routes
@app.route('/api/rate', methods=['POST'])
def api_rate():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    license_plate = data.get('license_plate', '').strip().upper()
    rating_value = data.get('rating')

    if not validate_license_plate(license_plate):
        return jsonify({'error': 'Nieprawidłowy numer rejestracyjny'}), 400

    if not rating_value or rating_value < 1 or rating_value > 5:
        return jsonify({'error': 'Ocena musi być w przedziale 1-5'}), 400

    # Get or create vehicle
    vehicle = Vehicle.query.filter_by(license_plate=license_plate).first()
    if not vehicle:
        vehicle = Vehicle()
        vehicle.license_plate = license_plate
        db.session.add(vehicle)
        db.session.flush()

    if vehicle.is_blocked:
        return jsonify({'error': 'Ten pojazd został zablokowany'}), 403

    # Check if user already rated this vehicle
    existing_rating = Rating.query.filter_by(
        vehicle_id=vehicle.id, user_id=session['user_id']).first()

    if existing_rating:
        existing_rating.rating = rating_value
        existing_rating.created_at = datetime.utcnow()
    else:
        rating = Rating()
        rating.vehicle_id = vehicle.id
        rating.user_id = session['user_id']
        rating.rating = rating_value
        db.session.add(rating)

    db.session.commit()

    # Update user statistics
    user_stats = UserStatistics.query.filter_by(
        user_id=session['user_id']).first()
    if not user_stats:
        user_stats = UserStatistics(user_id=session['user_id'])

        db.session.add(user_stats)
        db.session.commit()
    user_stats.update_statistics()

    return jsonify({'success': True, 'message': 'Ocena została zapisana'})


@app.route('/api/comment', methods=['POST'])
def api_comment():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    license_plate = data.get('license_plate', '').strip().upper()
    comment_text = data.get('comment', '').strip()

    if not validate_license_plate(license_plate):
        return jsonify({'error': 'Nieprawidłowy numer rejestracyjny'}), 400

    if not comment_text:
        return jsonify({'error': 'Komentarz nie może być pusty'}), 400

    vehicle = Vehicle.query.filter_by(license_plate=license_plate).first()
    if not vehicle:
        return jsonify({'error': 'Pojazd nie został znaleziony'}), 404

    if vehicle.is_blocked:
        return jsonify({'error': 'Ten pojazd został zablokowany'}), 403

    comment = Comment()
    comment.vehicle_id = vehicle.id
    comment.user_id = session['user_id']
    comment.content = comment_text

    db.session.add(comment)
    db.session.commit()

    # Update user statistics
    user_stats = UserStatistics.query.filter_by(
        user_id=session['user_id']).first()
    if not user_stats:
        user_stats = UserStatistics(user_id=session['user_id'])
        db.session.add(user_stats)
        db.session.commit()
    user_stats.update_statistics()

    return jsonify({'success': True, 'message': 'Komentarz został dodany'})


@app.route('/api/report_comment', methods=['POST'])
def api_report_comment():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    comment_id = data.get('comment_id')

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Komentarz nie został znaleziony'}), 404

    # Check if user already reported this comment
    existing_report = Report.query.filter_by(
        comment_id=comment_id, user_id=session['user_id']).first()

    if existing_report:
        return jsonify({'error': 'Już zgłosiłeś ten komentarz'}), 400

    report = Report()
    report.comment_id = comment_id
    report.user_id = session['user_id']

    comment.reports += 1

    db.session.add(report)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Komentarz został zgłoszony'})


@app.route('/api/admin/delete_comment', methods=['POST'])
def api_admin_delete_comment():
    if not is_admin():
        return jsonify({'error': 'Brak uprawnień'}), 403

    data = request.get_json()
    comment_id = data.get('comment_id')

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Komentarz nie został znaleziony'}), 404

    db.session.delete(comment)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Komentarz został usunięty'})


@app.route('/api/admin/block_vehicle', methods=['POST'])
def api_admin_block_vehicle():
    if not is_admin():
        return jsonify({'error': 'Brak uprawnień'}), 403

    data = request.get_json()
    license_plate = data.get('license_plate', '').strip().upper()

    vehicle = Vehicle.query.filter_by(license_plate=license_plate).first()
    if not vehicle:
        return jsonify({'error': 'Pojazd nie został znaleziony'}), 404

    vehicle.is_blocked = not vehicle.is_blocked
    db.session.commit()

    status = 'zablokowany' if vehicle.is_blocked else 'odblokowany'
    return jsonify({'success': True, 'message': f'Pojazd został {status}'})


@app.route('/api/admin/clear_reports', methods=['POST'])
def api_admin_clear_reports():
    if not is_admin():
        return jsonify({'error': 'Brak uprawnień'}), 403

    data = request.get_json()
    comment_id = data.get('comment_id')

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Komentarz nie został znaleziony'}), 404

    # Clear reports for this comment
    comment.reports = 0
    # Delete all report entries for this comment
    Report.query.filter_by(comment_id=comment_id).delete()
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Zgłoszenia zostały wyczyszczone'
    })


@app.route('/api/admin/stats', methods=['GET'])
def api_admin_stats():
    if not is_admin():
        return jsonify({'error': 'Brak uprawnień'}), 403

    # Calculate comprehensive statistics
    total_users = User.query.count()
    total_vehicles = Vehicle.query.count()
    total_ratings = Rating.query.count()
    total_comments = Comment.query.count()
    total_reports = Report.query.count()
    blocked_vehicles = Vehicle.query.filter_by(is_blocked=True).count()

    # Monthly registration stats (last 6 months)
    from sqlalchemy import extract, func
    monthly_users = db.session.query(
        extract('month', User.created_at).label('month'),
        extract('year', User.created_at).label('year'),
        func.count(User.id).label('count')).group_by(
            extract('year', User.created_at),
            extract('month', User.created_at)).order_by(
                extract('year', User.created_at),
                extract('month', User.created_at)).limit(6).all()

    # Top rated vehicles
    top_vehicles = db.session.query(
        Vehicle.license_plate,
        func.avg(Rating.rating).label('avg_rating'),
        func.count(Rating.id).label('rating_count')).join(Rating).group_by(
            Vehicle.id).having(func.count(Rating.id) >= 3).order_by(
                func.avg(Rating.rating).desc()).limit(10).all()

    # Rating distribution
    rating_distribution = db.session.query(
        Rating.rating,
        func.count(Rating.id).label('count')).group_by(Rating.rating).order_by(
            Rating.rating).all()

    return jsonify({
        'success': True,
        'stats': {
            'total_users':
            total_users,
            'total_vehicles':
            total_vehicles,
            'total_ratings':
            total_ratings,
            'total_comments':
            total_comments,
            'total_reports':
            total_reports,
            'blocked_vehicles':
            blocked_vehicles,
            'monthly_users': [{
                'month': row.month,
                'year': row.year,
                'count': row.count
            } for row in monthly_users],
            'top_vehicles': [{
                'license_plate': row.license_plate,
                'avg_rating': float(row.avg_rating),
                'rating_count': row.rating_count
            } for row in top_vehicles],
            'rating_distribution': [{
                'rating': row.rating,
                'count': row.count
            } for row in rating_distribution]
        }
    })


@app.route('/api/tomtom-traffic', methods=['GET'])
def api_tomtom_traffic():
    """Proxy endpoint for TomTom Traffic API to handle CORS and API key security"""
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)
        zoom = request.args.get('zoom', type=int, default=12)
        bbox = request.args.get('bbox', '')
        
        if not lat or not lng:
            return jsonify({'error': 'Missing latitude or longitude'}), 400
            
        # TomTom Traffic Incidents API - simpler and more reliable
        tomtom_url = f"https://api.tomtom.com/traffic/services/4/incidentDetails/s3/{lat},{lng},{lat + 0.01},{lng + 0.01}/10/-1/json"
        
        import requests
        headers = {
            'User-Agent': 'Driver-Rating-App/1.0'
        }
        params = {
            'key': tomtom_api_key
        }
        
        # Add bounding box if provided for better traffic coverage
        if bbox:
            bbox_coords = bbox.split(',')
            if len(bbox_coords) == 4:
                # TomTom uses different bbox format, but for flow data we use point-based requests
                pass
        
        response = requests.get(tomtom_url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"TomTom API success: Retrieved {len(data.get('incidents', []))} incidents")
            return jsonify(data)
        else:
            print(f"TomTom API error: {response.status_code} - {response.text}")
            return jsonify({
                'error': 'TomTom API error',
                'status_code': response.status_code
            }), response.status_code
            
    except Exception as e:
        print(f"TomTom proxy error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/delete_my_comment', methods=['POST'])
def api_delete_my_comment():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    comment_id = data.get('comment_id')

    comment = Comment.query.filter_by(id=comment_id,
                                      user_id=session['user_id']).first()
    if not comment:
        return jsonify({
            'error':
            'Komentarz nie został znaleziony lub nie masz uprawnień'
        }), 404

    db.session.delete(comment)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Komentarz został usunięty'})


@app.route('/map')
def map_view():
    incidents = Incident.query.order_by(
        Incident.created_at.desc()).limit(50).all()
    return render_template('map.html', incidents=incidents)


@app.route('/statistics')
def statistics():
    if not is_logged_in():
        flash('Musisz być zalogowany, aby zobaczyć statystyki!', 'warning')
        return redirect(url_for('login'))

    user = get_current_user()
    if not user:
        flash('Błąd sesji użytkownika. Zaloguj się ponownie.', 'danger')
        return redirect(url_for('login'))

    user_stats = UserStatistics.query.filter_by(user_id=user.id).first()

    if not user_stats:
        user_stats = UserStatistics(user_id=user.id)
        db.session.add(user_stats)
        db.session.commit()
        user_stats.update_statistics()

    # Get top users for comparison
    top_users = db.session.query(UserStatistics, User).join(User).order_by(
        UserStatistics.reputation_score.desc()).limit(10).all()

    return render_template('statistics.html',
                           user_stats=user_stats,
                           top_users=top_users)


@app.route('/ranking_users')
def ranking_users():
    sort_by = request.args.get(
        'sort', 'reputation')  # reputation, ratings, comments, incidents

    if sort_by == 'reputation':
        top_users = db.session.query(UserStatistics, User).join(User).order_by(
            UserStatistics.reputation_score.desc()).limit(50).all()
    elif sort_by == 'ratings':
        top_users = db.session.query(UserStatistics, User).join(User).order_by(
            UserStatistics.total_ratings.desc()).limit(50).all()
    elif sort_by == 'comments':
        top_users = db.session.query(UserStatistics, User).join(User).order_by(
            UserStatistics.total_comments.desc()).limit(50).all()
    elif sort_by == 'incidents':
        top_users = db.session.query(UserStatistics, User).join(User).order_by(
            UserStatistics.total_incidents.desc()).limit(50).all()
    else:
        top_users = db.session.query(UserStatistics, User).join(User).order_by(
            UserStatistics.reputation_score.desc()).limit(50).all()

    return render_template('ranking_users.html',
                           top_users=top_users,
                           sort_by=sort_by)


@app.route('/api/add_incident', methods=['POST'])
def api_add_incident():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    license_plate = data.get('license_plate', '').strip().upper()
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    incident_type = data.get('incident_type')
    description = data.get('description', '').strip()
    severity = data.get('severity', 1)

    if not license_plate or not validate_license_plate(license_plate):
        return jsonify({'error': 'Nieprawidłowy numer rejestracyjny'}), 400

    if not latitude or not longitude:
        return jsonify({'error': 'Lokalizacja jest wymagana'}), 400

    if not incident_type or incident_type not in [
            'aggressive_driving', 'poor_parking', 'traffic_violation', 'other'
    ]:
        return jsonify({'error': 'Nieprawidłowy typ zdarzenia'}), 400

    if not description:
        return jsonify({'error': 'Opis zdarzenia jest wymagany'}), 400

    incident = Incident()
    incident.user_id = session['user_id']
    incident.license_plate = license_plate
    incident.latitude = float(latitude)
    incident.longitude = float(longitude)
    incident.incident_type = incident_type
    incident.description = description
    incident.severity = int(severity)

    db.session.add(incident)
    db.session.commit()

    # Update user statistics
    user_stats = UserStatistics.query.filter_by(
        user_id=session['user_id']).first()
    if user_stats:
        user_stats.update_statistics()

    return jsonify({'success': True, 'message': 'Zdarzenie zostało dodane'})


@app.route('/api/vote_comment', methods=['POST'])
def api_vote_comment():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    comment_id = data.get('comment_id')
    vote_type = data.get('vote_type')  # 'helpful' or 'unhelpful'

    if vote_type not in ['helpful', 'unhelpful']:
        return jsonify({'error': 'Nieprawidłowy typ głosu'}), 400

    comment = Comment.query.get(comment_id)
    if not comment:
        return jsonify({'error': 'Komentarz nie został znaleziony'}), 404

    # Check if user already voted
    existing_vote = CommentVote.query.filter_by(
        comment_id=comment_id, user_id=session['user_id']).first()

    if existing_vote:
        # Update existing vote
        if existing_vote.vote_type != vote_type:
            # Remove old vote count
            if existing_vote.vote_type == 'helpful':
                comment.helpful_votes -= 1
            else:
                comment.unhelpful_votes -= 1

            # Add new vote count
            if vote_type == 'helpful':
                comment.helpful_votes += 1
            else:
                comment.unhelpful_votes += 1

            existing_vote.vote_type = vote_type
            existing_vote.created_at = datetime.utcnow()
        else:
            return jsonify({'error': 'Już oddałeś ten głos'}), 400
    else:
        # Create new vote
        vote = CommentVote()
        vote.comment_id = comment_id
        vote.user_id = session['user_id']
        vote.vote_type = vote_type

        if vote_type == 'helpful':
            comment.helpful_votes += 1
        else:
            comment.unhelpful_votes += 1

        db.session.add(vote)

    db.session.commit()

    # Update comment author's statistics
    comment_author_stats = UserStatistics.query.filter_by(
        user_id=comment.user_id).first()
    if comment_author_stats and vote_type == 'helpful':
        comment_author_stats.helpful_votes = CommentVote.query.join(
            Comment).filter(Comment.user_id == comment.user_id,
                            CommentVote.vote_type == 'helpful').count()
        comment_author_stats.update_statistics()

    return jsonify({'success': True, 'message': 'Głos został zapisany'})


@app.route('/profile')
def profile():
    if not is_logged_in():
        flash('Musisz być zalogowany, aby zobaczyć profil!', 'warning')
        return redirect(url_for('login'))

    user = get_current_user()
    if not user:
        flash('Błąd sesji użytkownika. Zaloguj się ponownie.', 'danger')
        return redirect(url_for('login'))

    # Get user's activity
    user_ratings = Rating.query.filter_by(user_id=user.id).order_by(
        Rating.created_at.desc()).limit(10).all()
    user_comments = Comment.query.filter_by(user_id=user.id).order_by(
        Comment.created_at.desc()).limit(10).all()
    user_favorites = Favorite.query.filter_by(user_id=user.id).order_by(
        Favorite.created_at.desc()).all()

    # Get user statistics
    user_stats = UserStatistics.query.filter_by(user_id=user.id).first()
    if not user_stats:
        user_stats = UserStatistics(user_id=user.id)
        db.session.add(user_stats)
        db.session.commit()
        user_stats.update_statistics()

    return render_template('profile.html',
                           user=user,
                           user_ratings=user_ratings,
                           user_comments=user_comments,
                           user_favorites=user_favorites,
                           user_stats=user_stats)


@app.route('/api/favorite', methods=['POST'])
def api_add_favorite():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    license_plate = data.get('license_plate', '').strip().upper()
    notes = data.get('notes', '').strip()

    if not validate_license_plate(license_plate):
        return jsonify({'error': 'Nieprawidłowy numer rejestracyjny'}), 400

    # Get or create vehicle
    vehicle = Vehicle.query.filter_by(license_plate=license_plate).first()
    if not vehicle:
        vehicle = Vehicle()
        vehicle.license_plate = license_plate
        db.session.add(vehicle)
        db.session.flush()

    # Check if already favorited
    existing_favorite = Favorite.query.filter_by(
        user_id=session['user_id'], vehicle_id=vehicle.id).first()

    if existing_favorite:
        return jsonify({'error':
                        'Ten pojazd jest już w Twoich ulubionych'}), 400

    # Create favorite
    favorite = Favorite()
    favorite.user_id = session['user_id']
    favorite.vehicle_id = vehicle.id
    favorite.notes = notes

    db.session.add(favorite)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Pojazd został dodany do ulubionych'
    })


@app.route('/api/favorite', methods=['DELETE'])
def api_remove_favorite():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401

    data = request.get_json()
    license_plate = data.get('license_plate', '').strip().upper()

    vehicle = Vehicle.query.filter_by(license_plate=license_plate).first()
    if not vehicle:
        return jsonify({'error': 'Pojazd nie został znaleziony'}), 404

    favorite = Favorite.query.filter_by(user_id=session['user_id'],
                                        vehicle_id=vehicle.id).first()

    if not favorite:
        return jsonify({'error':
                        'Ten pojazd nie jest w Twoich ulubionych'}), 404

    db.session.delete(favorite)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Pojazd został usunięty z ulubionych'
    })


@app.route('/api/favorite/<license_plate>', methods=['GET'])
def api_check_favorite(license_plate):
    if not is_logged_in():
        return jsonify({'is_favorite': False})

    vehicle = Vehicle.query.filter_by(
        license_plate=license_plate.upper()).first()
    if not vehicle:
        return jsonify({'is_favorite': False})

    favorite = Favorite.query.filter_by(user_id=session['user_id'],
                                        vehicle_id=vehicle.id).first()

    return jsonify({'is_favorite': favorite is not None})


@app.route('/manifest.json')
def manifest():
    return app.send_static_file('manifest.json')


def validate_license_plate(plate):
    # Polish license plate validation - only letters and numbers
    return bool(re.match(r'^[A-Z0-9]+$', plate.upper().replace(' ', '')))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
