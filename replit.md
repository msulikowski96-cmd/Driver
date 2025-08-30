# Driver Rating Application

## Overview

The Driver Rating Application is a Flask-based web platform that allows users to rate and comment on drivers based on their license plates. The system provides a community-driven approach to tracking driver behavior with features for user authentication, vehicle rating (1-5 stars), commenting, and administrative moderation. The application includes a ranking system to showcase the best and worst rated drivers, search functionality, and content moderation tools to maintain a safe and constructive environment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Template Engine**: Jinja2 templates with Bootstrap 5 dark theme for responsive UI
- **CSS Framework**: Bootstrap with custom CSS for star ratings and card animations
- **JavaScript**: Vanilla JavaScript for interactive star ratings and form validation
- **Internationalization**: Polish language interface throughout the application

### Backend Architecture
- **Web Framework**: Flask with SQLAlchemy ORM for database operations
- **Application Structure**: Modular design with separate files for models, authentication, and main application logic
- **Authentication System**: Session-based authentication with password hashing using Werkzeug security utilities
- **Authorization**: Role-based access control with regular users and administrators
- **Input Validation**: Server-side validation for license plates, user registration, and content submission

### Data Storage Solutions
- **Database**: SQLite for development with SQLAlchemy ORM
- **Database Models**: 
  - User model with admin privileges
  - Vehicle model with license plate tracking and blocking capability
  - Rating model with 1-5 star system and unique constraint per user-vehicle pair
  - Comment model with content and report tracking
  - Report model for flagging inappropriate content
- **Relationships**: Proper foreign key relationships with cascade delete options

### Authentication and Authorization
- **Session Management**: Flask sessions for user state management
- **Password Security**: Werkzeug password hashing and verification
- **Access Control**: Decorators for login_required and admin_required route protection
- **User Roles**: Basic user and administrator roles with different permission levels

### Core Features
- **Rating System**: 1-5 star rating system with average calculation
- **Comment System**: User comments on vehicles with moderation capabilities
- **Search Functionality**: License plate search with vehicle creation for new plates
- **Ranking System**: Best/worst driver rankings based on average ratings
- **Administrative Tools**: Content moderation, user management, and vehicle blocking
- **Report System**: Community-driven content flagging and moderation

## External Dependencies

- **Flask**: Web framework for Python applications
- **SQLAlchemy**: ORM for database operations and model definitions
- **Werkzeug**: WSGI utilities including password hashing and proxy handling
- **Bootstrap 5**: CSS framework for responsive design (CDN)
- **Font Awesome 6**: Icon library for UI elements (CDN)
- **SQLite**: Database engine for data persistence