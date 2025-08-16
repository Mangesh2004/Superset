#!/usr/bin/env python3
"""
Test script for Hybrid Authentication in Superset
"""

import os
import sys

def test_hybrid_auth_setup():
    """Test if the hybrid authentication is properly configured"""
    
    print("🔍 Testing Hybrid Authentication Setup...")
    
    # Test 1: Check if configuration file exists
    config_file = "superset_config_hybrid_google.py"
    if os.path.exists(config_file):
        print(f"✅ Configuration file found: {config_file}")
    else:
        print(f"❌ Configuration file not found: {config_file}")
        return False
    
    # Test 2: Check configuration file syntax
    try:
        import superset_config_hybrid_google as config
        if hasattr(config, 'CUSTOM_SECURITY_MANAGER'):
            print("✅ CUSTOM_SECURITY_MANAGER configured")
        if hasattr(config, 'OAUTH_PROVIDERS'):
            providers = list(config.OAUTH_PROVIDERS.keys())
            print(f"✅ OAuth providers configured: {providers}")
        if hasattr(config, 'GOOGLE_SERVICE_ACCOUNT'):
            print("✅ Google service account configured")
    except ImportError as e:
        print(f"❌ Failed to import configuration: {e}")
        return False
    except Exception as e:
        print(f"❌ Configuration file has errors: {e}")
        return False
    
    # Test 3: Check if core files exist
    hybrid_manager_file = "superset/security/hybrid_manager.py"
    hybrid_view_file = "superset/views/hybrid_auth.py"
    migration_file = "superset/migrations/versions/add_oauth_fields_to_user.py"
    
    files_to_check = [
        (hybrid_manager_file, "HybridSecurityManager"),
        (hybrid_view_file, "HybridAuthView"),
        (migration_file, "Database migration")
    ]
    
    for file_path, description in files_to_check:
        if os.path.exists(file_path):
            print(f"✅ {description} file found: {file_path}")
        else:
            print(f"❌ {description} file not found: {file_path}")
            return False
    
    # Test 4: Check required packages
    try:
        import authlib
        print("✅ authlib package available")
    except ImportError:
        print("⚠️  authlib package not found - install with: pip install authlib")
    
    # Test 5: Check environment variable recommendation
    superset_config_path = os.environ.get('SUPERSET_CONFIG_PATH')
    if superset_config_path:
        print(f"✅ SUPERSET_CONFIG_PATH is set to: {superset_config_path}")
    else:
        print("⚠️  SUPERSET_CONFIG_PATH not set - you'll need to set this")
    
   
    
    return True

if __name__ == "__main__":
    test_hybrid_auth_setup() 