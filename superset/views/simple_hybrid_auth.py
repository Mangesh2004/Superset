# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

"""
Simple Hybrid Authentication Views for Superset.
Works with standard security manager to add Google OAuth support.
"""

import logging
from typing import Any, Optional

from flask import current_app, flash, g, redirect, request, url_for
from flask_appbuilder import expose
from flask_appbuilder.security.decorators import no_cache
from flask_login import login_user
from werkzeug.wrappers import Response as WerkzeugResponse

from superset.views.base import BaseSupersetView

logger = logging.getLogger(__name__)

try:
    from authlib.integrations.flask_client import OAuth
    from authlib.common.errors import AuthlibBaseError
    AUTHLIB_AVAILABLE = True
except ImportError:
    OAuth = None
    AuthlibBaseError = Exception
    AUTHLIB_AVAILABLE = False
if not AUTHLIB_AVAILABLE:
    logger.error("Authlib is NOT available in the environment. OAuth will NOT be initialized.")


class SimpleHybridAuthView(BaseSupersetView):
    """
    Simple hybrid authentication view that adds Google OAuth to standard DB auth.
    """
    
    route_base = "/oauth"
    
    def __init__(self):
        super().__init__()
        self.oauth_clients = {}
        self._oauth_initialized = False
    
    def _init_oauth(self):
        """Initialize OAuth clients lazily when needed."""
        if self._oauth_initialized or not AUTHLIB_AVAILABLE:
            return
            
        try:
            oauth_providers = current_app.config.get('OAUTH_PROVIDERS', {})
            logger.info(f"OAuth providers found: {list(oauth_providers.keys())}")
            
            if oauth_providers:
                oauth = OAuth(current_app)
                for provider_name, provider_config in oauth_providers.items():
                    try:
                        client = oauth.register(
                            name=provider_name,
                            **provider_config.get('remote_app', {})
                        )
                        self.oauth_clients[provider_name] = client
                        logger.info(f"Registered OAuth client: {provider_name}")
                    except Exception as e:
                        logger.error(f"Failed to register OAuth client {provider_name}: {e}")
                        
            self._oauth_initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize OAuth: {e}")
            
    def _get_oauth_client(self, provider: str):
        """Get OAuth client for provider, initializing if needed."""
        self._init_oauth()
        return self.oauth_clients.get(provider)
    
    @expose("/login/<provider>")
    @no_cache
    def oauth_login(self, provider: str) -> WerkzeugResponse:
        """Redirect to OAuth provider for authentication."""
        logger.info(f"🔑 Starting OAuth login for provider: {provider}")
        
        # Check if user is already authenticated (safely)
        try:
            if hasattr(g, 'user') and g.user and hasattr(g.user, 'is_authenticated') and g.user.is_authenticated:
                logger.info("👤 User already authenticated, redirecting to dashboard")
                return redirect(self.appbuilder.get_url_for_index)
        except (AttributeError, RuntimeError):
            # Ignore errors accessing g.user during OAuth flow
            pass
        
        client = self._get_oauth_client(provider)
        logger.info(f"OAuth client found for {provider}: {bool(client)}")
        
        if not client:
            logger.error(f'OAuth provider "{provider}" not configured')
            flash(f'OAuth provider "{provider}" not configured', 'error')
            return redirect('/login/')
        
        try:
            redirect_uri = url_for('SimpleHybridAuthView.oauth_callback', 
                                 provider=provider, _external=True)
            logger.info(f"🔗 Redirect URI: {redirect_uri}")
            return client.authorize_redirect(redirect_uri)
        except Exception as e:
            logger.error(f"OAuth login error for {provider}: {e}")
            flash('OAuth login failed', 'error')
            return redirect('/login/')
    
    @expose("/callback/<provider>")
    @no_cache
    def oauth_callback(self, provider: str) -> WerkzeugResponse:
        """Handle OAuth callback from provider."""
        logger.info(f"🔄 OAuth callback for provider: {provider}")
        
        # Check if user is already authenticated (safely)
        try:
            if hasattr(g, 'user') and g.user and hasattr(g.user, 'is_authenticated') and g.user.is_authenticated:
                return redirect(self.appbuilder.get_url_for_index)
        except (AttributeError, RuntimeError):
            # Ignore errors accessing g.user during OAuth flow
            pass
        
        client = self._get_oauth_client(provider)
        if not client:
            flash(f'OAuth provider "{provider}" not configured', 'error')
            return redirect('/login/')
        
        try:
            # Get the authorization token
            token = client.authorize_access_token()
            logger.info(f"OAuth token received for {provider}: {bool(token)}")
            if not token:
                flash('Access denied', 'error')
                return redirect('/login/')
            
            # Get user info from the provider
            # For Google OAuth, we'll use the userinfo endpoint instead of parse_id_token
            # since parse_id_token requires a nonce parameter that we don't have
            try:
                resp = client.get('https://www.googleapis.com/oauth2/v2/userinfo', token=token)
                user_info = resp.json()
            except Exception as e:
                logger.error(f"Failed to get userinfo from {provider}: {e}")
                user_info = None
            
            logger.info(f"Google user_info for {provider}: {user_info}")
            
            if not user_info or not user_info.get('email'):
                logger.error(f"No user info or email from {provider}: {user_info}")
                flash('Failed to get user information from OAuth provider', 'error')
                return redirect('/login/')
            
            # Find or create user
            user = self._find_or_create_user(provider, user_info)
            logger.info(f"User found/created for {provider}: {bool(user)} - {user}")
            if user:
                login_result = login_user(user, remember=True)
                logger.info(f"Login user result for {provider}: {login_result}")
                return redirect(self.appbuilder.get_url_for_index)
            else:
                logger.error(f"Failed to find/create user for {provider}")
                flash('Failed to authenticate user', 'error')
                return redirect('/login/')
                
        except AuthlibBaseError as e:
            logger.error(f"OAuth callback error for {provider}: {e}")
            flash('OAuth authentication failed', 'error')
            return redirect('/login/')
        except Exception as e:
            logger.error(f"Unexpected error in OAuth callback for {provider}: {e}", exc_info=True)
            flash(f'Authentication failed: {str(e)}', 'error')
            return redirect('/login/')
    
    def _find_or_create_user(self, provider: str, user_info: dict) -> Optional[Any]:
        """Find existing user or create new one from OAuth info."""
        try:
            email = user_info.get('email')
            logger.info(f"Finding/creating user for {provider} with email: {email}")
            if not email:
                logger.error("No email in user_info")
                return None
            
            # Try to find existing user by email
            user = self.appbuilder.sm.find_user(email=email)
            logger.info(f"Existing user found: {bool(user)}")
            
            if user:
                logger.info(f"Found existing user: {user.username} ({user.email})")
                # Note: OAuth fields may not exist in the user model, which is fine
                # We'll just use the user as-is for login
                try:
                    if hasattr(user, 'oauth_provider'):
                        if not user.oauth_provider:
                            user.oauth_provider = provider
                            user.oauth_id = user_info.get('sub') or user_info.get('id')
                            self.appbuilder.sm.get_session.commit()
                            logger.info(f"Updated OAuth info for existing user: {user.username}")
                except Exception as e:
                    logger.warning(f"Could not update OAuth info (this is fine): {e}")
                return user
            else:
                # Create new user
                username = user_info.get('preferred_username') or email.split('@')[0]
                first_name = user_info.get('given_name', '')
                last_name = user_info.get('family_name', '')
                
                logger.info(f"Creating new user: {username} ({email}) - {first_name} {last_name}")
                
                # Find the default role
                role = self.appbuilder.sm.find_role('Gamma')
                if not role:
                    role = self.appbuilder.sm.find_role('Public')
                
                logger.info(f"Using role: {role.name if role else 'None'}")
                
                user = self.appbuilder.sm.add_user(
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    role=role
                )
                
                logger.info(f"User creation result: {bool(user)}")
                
                if user:
                    # Try to add OAuth info (may not be supported by the user model)
                    try:
                        if hasattr(user, 'oauth_provider'):
                            user.oauth_provider = provider
                            user.oauth_id = user_info.get('sub') or user_info.get('id')
                            self.appbuilder.sm.get_session.commit()
                            logger.info(f"Created new user with OAuth info: {user.username}")
                        else:
                            logger.info(f"Created new user (OAuth fields not available): {user.username}")
                    except Exception as e:
                        logger.warning(f"Could not add OAuth info to new user (this is fine): {e}")
                
                return user
                
        except Exception as e:
            logger.error(f"Error creating/finding user: {e}", exc_info=True)
            return None
    
    @expose("/providers")
    def get_providers(self) -> dict:
        """Get available OAuth providers for the frontend."""
        self._init_oauth()  # Ensure OAuth is initialized
        providers = []
        for name in self.oauth_clients.keys():
            providers.append({
                'name': name,
                'display_name': name.title(),
                'login_url': url_for('SimpleHybridAuthView.oauth_login', provider=name)
            })
        
        return {
            'oauth_enabled': len(providers) > 0,
            'providers': providers
        } 