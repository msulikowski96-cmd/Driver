import os
import logging
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
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
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///driver_ratings.db"
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the app with the extension
db.init_app(app)

# Import models after db initialization
from models import User, Vehicle, Rating, Comment, Report

# Helper functions
def is_logged_in():
    return 'user_id' in session

def get_current_user():
    if is_logged_in():
        return User.query.get(session['user_id'])
    return None

def is_admin():
    user = get_current_user()
    return user and user.is_admin

def validate_license_plate(plate):
    # Polish license plate validation - only letters and numbers
    return bool(re.match(r'^[A-Z0-9]+$', plate.upper().replace(' ', '')))

# Routes
@app.route('/')
def index():
    # Get recently rated vehicles
    recent_ratings = db.session.query(Rating).order_by(Rating.created_at.desc()).limit(10).all()
    recent_vehicles = []
    seen_plates = set()
    
    for rating in recent_ratings:
        if rating.vehicle.license_plate not in seen_plates:
            recent_vehicles.append(rating.vehicle)
            seen_plates.add(rating.vehicle.license_plate)
            if len(recent_vehicles) >= 5:
                break
    
    return render_template('index.html', recent_vehicles=recent_vehicles)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
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
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if User.query.filter_by(username=username).first():
            flash('Nazwa użytkownika jest już zajęta!', 'danger')
            return render_template('register.html')
        
        if User.query.filter_by(email=email).first():
            flash('Email jest już zarejestrowany!', 'danger')
            return render_template('register.html')
        
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        
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
    vehicle = Vehicle.query.filter_by(license_plate=license_plate.upper()).first()
    if not vehicle:
        flash('Pojazd nie został znaleziony!', 'warning')
        return redirect(url_for('index'))
    
    if vehicle.is_blocked and not is_admin():
        flash('Ten pojazd został zablokowany!', 'danger')
        return redirect(url_for('index'))
    
    ratings = Rating.query.filter_by(vehicle_id=vehicle.id).all()
    comments = Comment.query.filter_by(vehicle_id=vehicle.id).order_by(Comment.created_at.desc()).all()
    
    avg_rating = sum(r.rating for r in ratings) / len(ratings) if ratings else 0
    
    # Check if current user has already rated this vehicle
    user_rating = None
    if is_logged_in():
        user_rating = Rating.query.filter_by(
            vehicle_id=vehicle.id, 
            user_id=session['user_id']
        ).first()
    
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
                Vehicle.license_plate.like(f'%{query}%')
            ).all()
            
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
    vehicles_with_ratings.sort(key=lambda x: x['avg_rating'], reverse=reverse_order)
    
    return render_template('ranking.html', 
                         vehicles_with_ratings=vehicles_with_ratings,
                         sort_order=sort_order)

@app.route('/admin')
def admin():
    if not is_admin():
        flash('Brak uprawnień administratora!', 'danger')
        return redirect(url_for('index'))
    
    reported_comments = Comment.query.filter(Comment.reports > 0).order_by(Comment.reports.desc()).all()
    blocked_vehicles = Vehicle.query.filter_by(is_blocked=True).all()
    
    return render_template('admin.html', 
                         reported_comments=reported_comments,
                         blocked_vehicles=blocked_vehicles)

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
        vehicle = Vehicle(license_plate=license_plate)
        db.session.add(vehicle)
        db.session.flush()
    
    if vehicle.is_blocked:
        return jsonify({'error': 'Ten pojazd został zablokowany'}), 403
    
    # Check if user already rated this vehicle
    existing_rating = Rating.query.filter_by(
        vehicle_id=vehicle.id, 
        user_id=session['user_id']
    ).first()
    
    if existing_rating:
        existing_rating.rating = rating_value
        existing_rating.created_at = datetime.utcnow()
    else:
        rating = Rating(
            vehicle_id=vehicle.id,
            user_id=session['user_id'],
            rating=rating_value
        )
        db.session.add(rating)
    
    db.session.commit()
    
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
    
    comment = Comment(
        vehicle_id=vehicle.id,
        user_id=session['user_id'],
        content=comment_text
    )
    
    db.session.add(comment)
    db.session.commit()
    
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
        comment_id=comment_id,
        user_id=session['user_id']
    ).first()
    
    if existing_report:
        return jsonify({'error': 'Już zgłosiłeś ten komentarz'}), 400
    
    report = Report(
        comment_id=comment_id,
        user_id=session['user_id']
    )
    
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

@app.route('/api/delete_my_comment', methods=['POST'])
def api_delete_my_comment():
    if not is_logged_in():
        return jsonify({'error': 'Musisz być zalogowany'}), 401
    
    data = request.get_json()
    comment_id = data.get('comment_id')
    
    comment = Comment.query.filter_by(id=comment_id, user_id=session['user_id']).first()
    if not comment:
        return jsonify({'error': 'Komentarz nie został znaleziony lub nie masz uprawnień'}), 404
    
    db.session.delete(comment)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Komentarz został usunięty'})

# Create tables
with app.app_context():
    db.create_all()
    
    # Create admin user if doesn't exist
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            email='admin@example.com',
            password_hash=generate_password_hash('admin123'),
            is_admin=True
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created: username=admin, password=admin123")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
