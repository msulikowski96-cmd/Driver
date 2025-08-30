from app import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    ratings = db.relationship('Rating', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    reports = db.relationship('Report', backref='user', lazy='dynamic', cascade='all, delete-orphan')

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    license_plate = db.Column(db.String(20), unique=True, nullable=False)
    is_blocked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    ratings = db.relationship('Rating', backref='vehicle', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='vehicle', lazy='dynamic', cascade='all, delete-orphan')
    
    def get_average_rating(self):
        ratings = self.ratings.all()
        if not ratings:
            return 0
        return sum(r.rating for r in ratings) / len(ratings)
    
    def get_rating_count(self):
        return self.ratings.count()

class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('vehicle_id', 'user_id', name='unique_user_vehicle_rating'),)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    reports = db.Column(db.Integer, default=0)
    helpful_votes = db.Column(db.Integer, default=0)
    unhelpful_votes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    report_entries = db.relationship('Report', backref='comment', lazy='dynamic', cascade='all, delete-orphan')
    votes = db.relationship('CommentVote', backref='comment', lazy='dynamic', cascade='all, delete-orphan')
    
    def get_vote_score(self):
        return self.helpful_votes - self.unhelpful_votes

class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('comment_id', 'user_id', name='unique_user_comment_report'),)

class Incident(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    license_plate = db.Column(db.String(20), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    incident_type = db.Column(db.String(50), nullable=False)  # 'aggressive_driving', 'poor_parking', 'traffic_violation', 'other'
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.Integer, default=1)  # 1-5 scale
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('incidents', lazy='dynamic'))

class UserStatistics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), unique=True, nullable=False)
    total_ratings = db.Column(db.Integer, default=0)
    total_comments = db.Column(db.Integer, default=0)
    total_reports = db.Column(db.Integer, default=0)
    total_incidents = db.Column(db.Integer, default=0)
    helpful_votes = db.Column(db.Integer, default=0)
    reputation_score = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('statistics', uselist=False))
    
    def update_statistics(self):
        """Update user statistics based on their activity"""
        user = self.user
        self.total_ratings = user.ratings.count()
        self.total_comments = user.comments.count()
        self.total_reports = user.reports.count()
        self.total_incidents = user.incidents.count()
        
        # Calculate reputation score
        self.reputation_score = (
            self.total_ratings * 1 +
            self.total_comments * 2 +
            self.total_incidents * 3 +
            self.helpful_votes * 5
        )
        
        self.last_updated = datetime.utcnow()
        db.session.commit()

class CommentVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    vote_type = db.Column(db.String(10), nullable=False)  # 'helpful' or 'unhelpful'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('comment_id', 'user_id', name='unique_user_comment_vote'),)

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)  # User's personal notes about this vehicle
    
    # Relationships
    user = db.relationship('User', backref=db.backref('favorites', lazy='dynamic'))
    vehicle = db.relationship('Vehicle', backref=db.backref('favorited_by', lazy='dynamic'))
    
    __table_args__ = (db.UniqueConstraint('user_id', 'vehicle_id', name='unique_user_vehicle_favorite'),)
