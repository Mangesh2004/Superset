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
"""Security and permission helpers for Collections."""
from __future__ import annotations

import logging
from functools import wraps
from typing import Any, Callable, Optional

from flask import g
from flask_appbuilder.security.sqla.models import User

from superset.collections.constants import CollectionPermission
from superset.collections.exceptions import CollectionPermissionError
from superset.collections.models import SpCollection

logger = logging.getLogger(__name__)


def require_collection_access(permission: str = "view") -> Callable:
    """Decorator to require collection access permission.
    
    Args:
        permission: Required permission level ('view' or 'curate')
    
    Raises:
        CollectionPermissionError: If user lacks required permission
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs) -> Any:
            # Get collection ID from URL parameters
            collection_id = kwargs.get("pk") or kwargs.get("collection_id")
            if not collection_id:
                raise CollectionPermissionError("Collection ID is required")
            
            # Get current user
            user = getattr(g, "user", None)
            if not user:
                raise CollectionPermissionError("Authentication required")
            
            # Check permission
            if not check_collection_permission(user, collection_id, permission):
                raise CollectionPermissionError(
                    f"User lacks {permission} permission for collection {collection_id}"
                )
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def check_collection_permission(
    user: User,
    collection_id: int,
    permission: str = "view"
) -> bool:
    """Check if user has permission to access a collection.
    
    Args:
        user: User to check permissions for
        collection_id: Collection ID to check
        permission: Permission level to check ('view' or 'curate')
    
    Returns:
        True if user has permission, False otherwise
    """
    try:
        # For Phase 2, we'll implement basic permission checking
        # Full RBAC integration will come in Phase 3
        
        # Admin users have all permissions
        if user.is_admin:
            return True
        
        # TODO: Implement actual permission checking with roles and ACL
        # For now, allow all authenticated users to have view access
        # and admins to have curate access
        if permission == "view":
            return True
        elif permission == "curate":
            return user.is_admin
        
        return False
        
    except Exception as ex:
        logger.exception("Error checking collection permission: %s", str(ex))
        return False


def filter_collections_by_permission(
    collections: list[SpCollection],
    user: User,
    permission: str = "view"
) -> list[SpCollection]:
    """Filter collections by user permissions.
    
    Args:
        collections: List of collections to filter
        user: User to check permissions for
        permission: Permission level to check
    
    Returns:
        Filtered list of collections user can access
    """
    if not collections:
        return []
    
    try:
        # For Phase 2, return all collections for authenticated users
        # Full permission filtering will come in Phase 3
        if user and user.is_authenticated:
            return collections
        
        return []
        
    except Exception as ex:
        logger.exception("Error filtering collections by permission: %s", str(ex))
        return []


def get_user_accessible_collection_ids(
    user: User,
    permission: str = "view"
) -> list[int]:
    """Get list of collection IDs user can access.
    
    Args:
        user: User to check permissions for
        permission: Permission level to check
    
    Returns:
        List of collection IDs user can access
    """
    try:
        # For Phase 2, return empty list (will be implemented in Phase 3)
        # This would query the sp_collection_permission table
        return []
        
    except Exception as ex:
        logger.exception("Error getting accessible collection IDs: %s", str(ex))
        return []


def can_create_collection(user: User, parent_id: Optional[int] = None) -> bool:
    """Check if user can create a collection.
    
    Args:
        user: User to check permissions for
        parent_id: Parent collection ID (if creating a child collection)
    
    Returns:
        True if user can create collection, False otherwise
    """
    try:
        # For Phase 2, allow authenticated users to create collections
        # Full permission checking will come in Phase 3
        if not user or not user.is_authenticated:
            return False
        
        # If creating a child collection, check parent access
        if parent_id:
            return check_collection_permission(user, parent_id, "curate")
        
        # For root collections, allow authenticated users
        return True
        
    except Exception as ex:
        logger.exception("Error checking collection creation permission: %s", str(ex))
        return False


def can_modify_collection(user: User, collection_id: int) -> bool:
    """Check if user can modify a collection.
    
    Args:
        user: User to check permissions for
        collection_id: Collection ID to check
    
    Returns:
        True if user can modify collection, False otherwise
    """
    return check_collection_permission(user, collection_id, "curate")


def can_delete_collection(user: User, collection_id: int) -> bool:
    """Check if user can delete a collection.
    
    Args:
        user: User to check permissions for
        collection_id: Collection ID to check
    
    Returns:
        True if user can delete collection, False otherwise
    """
    return check_collection_permission(user, collection_id, "curate")


def can_manage_collection_items(user: User, collection_id: int) -> bool:
    """Check if user can add/remove items from a collection.
    
    Args:
        user: User to check permissions for
        collection_id: Collection ID to check
    
    Returns:
        True if user can manage items, False otherwise
    """
    return check_collection_permission(user, collection_id, "curate")


def can_manage_collection_permissions(user: User, collection_id: int) -> bool:
    """Check if user can manage collection permissions.
    
    Args:
        user: User to check permissions for
        collection_id: Collection ID to check
    
    Returns:
        True if user can manage permissions, False otherwise
    """
    # Only admins can manage permissions for now
    # In Phase 3, we might allow collection owners/curators
    return user and user.is_admin


class CollectionSecurityManager:
    """Security manager for Collections feature."""
    
    @staticmethod
    def register_permissions() -> None:
        """Register Collections permissions with Flask-AppBuilder.
        
        This will be called during app initialization to set up
        the necessary permissions in Superset's security system.
        """
        try:
            from superset import appbuilder
            
            # Register the Collection resource with permissions
            # This creates the basic CRUD permissions in FAB
            sm = appbuilder.sm
            view_menu = sm.find_view_menu("Collection") or sm.add_view_menu("Collection")
            
            # Add basic permissions
            sm.add_permission_view_menu("can_read", "Collection")
            sm.add_permission_view_menu("can_write", "Collection")
            
            logger.info("Registered Collections permissions with Flask-AppBuilder")
            
        except Exception as ex:
            logger.exception("Error registering Collections permissions: %s", str(ex))
    
    @staticmethod
    def setup_default_roles() -> None:
        """Set up default role permissions for Collections.
        
        This will be called during app initialization to set up
        reasonable default permissions for existing roles.
        """
        try:
            from superset import appbuilder
            
            # Get security manager
            sm = appbuilder.sm
            
            # Give Admin role all Collection permissions
            admin_role = sm.find_role("Admin")
            if admin_role:
                view_menu = sm.find_view_menu("Collection")
                if view_menu:
                    collection_perms = sm.find_permissions_view_menu(view_menu)
                for perm in collection_perms:
                    sm.add_permission_role(admin_role, perm)
            
            # Give Alpha role read permissions
            alpha_role = sm.find_role("Alpha")
            if alpha_role:
                read_perm = sm.find_permission_view_menu("can_read", "Collection")
                if read_perm:
                    sm.add_permission_role(alpha_role, read_perm)
            
            # Give Gamma role read permissions
            gamma_role = sm.find_role("Gamma")
            if gamma_role:
                read_perm = sm.find_permission_view_menu("can_read", "Collection")
                if read_perm:
                    sm.add_permission_role(gamma_role, read_perm)
            
            logger.info("Set up default role permissions for Collections")
            
        except Exception as ex:
            logger.exception("Error setting up default role permissions: %s", str(ex))
