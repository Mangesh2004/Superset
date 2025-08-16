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
"""Collections module for organizing dashboards, charts, and datasets."""
from __future__ import annotations

# Import models to ensure they are registered with SQLAlchemy
from superset.collections.models import (  # noqa: F401
    SpCollection,
    SpCollectionChart,
    SpCollectionDashboard,
    SpCollectionDataset,
    SpCollectionPermission,
)

def register_collections_api(app) -> None:
    """Register Collections API with Superset."""
    try:
        from superset import appbuilder
        from superset.collections.api import CollectionsRestApi
        from superset.collections.security import CollectionSecurityManager
        
        # Check if collections tables exist
        from sqlalchemy import inspect
        from superset import db
        
        inspector = inspect(db.engine)
        if not inspector.has_table("sp_collection"):
            print("⚠ Collections tables not found. Run 'superset db upgrade' first.")
            return

        # Register the API
        appbuilder.add_api(CollectionsRestApi)

        # Create Collections permissions if they don't exist
        try:
            from flask_appbuilder.security.sqla.models import Permission, PermissionView, ViewMenu
            
            # Create Collections view menu if it doesn't exist
            view_menu = appbuilder.sm.find_view_menu("Collections")
            if not view_menu:
                view_menu = appbuilder.sm.add_view_menu("Collections")
            
            # Create read permission if it doesn't exist
            read_perm = appbuilder.sm.find_permission("can_read")
            if not read_perm:
                read_perm = appbuilder.sm.add_permission("can_read")
                
            # Create write permission if it doesn't exist  
            write_perm = appbuilder.sm.find_permission("can_write")
            if not write_perm:
                write_perm = appbuilder.sm.add_permission("can_write")
            
            # Add permissions to view menu
            appbuilder.sm.add_permission_view_menu("can_read", "Collections")
            appbuilder.sm.add_permission_view_menu("can_write", "Collections")
            
            # Add permissions to Admin role
            admin_role = appbuilder.sm.find_role("Admin")
            if admin_role:
                read_pv = appbuilder.sm.find_permission_view_menu("can_read", "Collections")
                write_pv = appbuilder.sm.find_permission_view_menu("can_write", "Collections")
                if read_pv and read_pv not in admin_role.permissions:
                    admin_role.permissions.append(read_pv)
                if write_pv and write_pv not in admin_role.permissions:
                    admin_role.permissions.append(write_pv)
                    
            db.session.commit()
            
        except Exception as ex:
            print(f"Warning: Could not set up Collections permissions: {ex}")

        # Register permissions
        try:
            CollectionSecurityManager.register_permissions()
            CollectionSecurityManager.setup_default_roles()
        except Exception as ex:
            print(f"Warning: Could not register collection security: {ex}")

        print("✓ Collections API registered successfully")

    except Exception as ex:
        print(f"✗ Error registering Collections API: {str(ex)}")
        raise
