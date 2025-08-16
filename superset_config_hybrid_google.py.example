# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# for additional information.

import os
from datetime import timedelta
from flask_appbuilder.security.manager import AUTH_DB

# ===========================================
# HYBRID AUTHENTICATION SETUP
# ===========================================

AUTH_TYPE = AUTH_DB
AUTH_USER_REGISTRATION = True
AUTH_USER_REGISTRATION_ROLE = "Admin"

RECAPTCHA_PUBLIC_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
RECAPTCHA_PRIVATE_KEY = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"


FEATURE_FLAGS = {
    "HORIZONTAL_FILTER_BAR": True,
    "THUMBNAILS": True,
    "LISTVIEWS_DEFAULT_CARD_VIEW": True,
   
}


# ===========================================
# GOOGLE OAUTH WITH SERVICE ACCOUNT
# ===========================================

OAUTH_PROVIDERS = {
    "google": {
        "name": "google",
        "icon": "fa-google",
        "display_name": "Google",
        "remote_app": {
            "client_id": "170804927432-seob0n68j5a9crln00m3h8mfs8082m7u.apps.googleusercontent.com",
            "client_secret": "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",
            "server_metadata_url": "https://accounts.google.com/.well-known/openid-configuration",
            "client_kwargs": {
                "scope": "openid email profile"
            }
        }
    }
}

def register_oauth_view(app):
    from superset.views.simple_hybrid_auth import SimpleHybridAuthView
    app.appbuilder.add_view_no_menu(SimpleHybridAuthView)

FLASK_APP_MUTATOR = register_oauth_view

# ===========================================
# BASIC CONFIGURATION
# ===========================================

# ✅ Use a secure, randomly-generated secret key in production
SECRET_KEY = "bPFVrzKvoJQv1f7csGvwheKveJr/CvYxDF8tJM3nuVO5V5cn1y9eRKXs"

# ✅ Set DB connection string (PostgreSQL)
SQLALCHEMY_DATABASE_URI = "postgresql://superset:superset123@localhost:5432/superset"

# ✅ Session security settings
SESSION_COOKIE_SECURE = False  # Change to True if using HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
PERMANENT_SESSION_LIFETIME = timedelta(hours=24)

# ===========================================
# CSP & Security Configuration
# ===========================================

# ✅ Enable CSP via Flask-Talisman
TALISMAN_ENABLED = True

TALISMAN_CONFIG = {
    "content_security_policy": {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
    },
    "force_https": False,  # Set to True in production with HTTPS
}

# ✅ Suppress CSP warning if TALISMAN is enabled
CONTENT_SECURITY_POLICY_WARNING = False
