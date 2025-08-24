#!/usr/bin/env python3
"""
Test script for AI SQL integration in Superset.
Run this script to test the AI functionality before full Superset startup.
"""
import os
import sys
from unittest.mock import patch, MagicMock

# Add superset to path
sys.path.insert(0, '/home/mangesh/superset')

def test_imports():
    """Test that all AI modules can be imported."""
    print("Testing imports...")
    
    try:
        from superset.ai.exceptions import AIException, LLMConfigError
        print("✅ AI exceptions imported successfully")
        
        from superset.ai.llm_provider import GeminiProvider, generate_sql_from_nl
        print("✅ LLM provider imported successfully")
        
        from superset.ai.schemas import AISQLRequestSchema, AISQLResponseSchema
        print("✅ AI schemas imported successfully")
        
        from superset.ai.api import AISQLApi
        print("✅ AI API imported successfully")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_llm_provider():
    """Test LLM provider functionality."""
    print("\nTesting LLM provider...")
    
    # Test without API key
    with patch.dict(os.environ, {}, clear=True):
        try:
            from superset.ai.llm_provider import GeminiProvider
            GeminiProvider()
            print("❌ Should have failed without API key")
            return False
        except Exception as e:
            print(f"✅ Correctly failed without API key: {e}")
    
    # Test with API key (but don't actually call API)
    with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}):
        try:
            from superset.ai.llm_provider import GeminiProvider
            provider = GeminiProvider()
            print(f"✅ Provider created with API key: {provider.model}")
            
            # Test safety checks
            sql = provider._apply_safety_checks("SELECT * FROM users;")
            print(f"✅ Safety check passed for SELECT: {sql[:30]}...")
            
            try:
                provider._apply_safety_checks("DROP TABLE users;")
                print("❌ Should have blocked DROP statement")
                return False
            except Exception:
                print("✅ Correctly blocked DROP statement")
            
            return True
        except Exception as e:
            print(f"❌ Provider test failed: {e}")
            return False

def test_api_schemas():
    """Test API request/response schemas."""
    print("\nTesting API schemas...")
    
    try:
        from superset.ai.schemas import AISQLRequestSchema, AISQLResponseSchema
        
        # Test request schema
        request_schema = AISQLRequestSchema()
        valid_data = {
            "database_id": 1,
            "schema": "public",
            "question": "Show me all users"
        }
        result = request_schema.load(valid_data)
        print(f"✅ Request schema validation passed: {result}")
        
        # Test response schema
        response_schema = AISQLResponseSchema()
        response_data = {"result": {"sql": "SELECT * FROM users;"}}
        result = response_schema.dump(response_data)
        print(f"✅ Response schema serialization passed: {result}")
        
        return True
    except Exception as e:
        print(f"❌ Schema test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Testing AI SQL Integration for Apache Superset\n")
    
    tests = [
        test_imports,
        test_llm_provider,
        test_api_schemas,
    ]
    
    passed = 0
    for test in tests:
        if test():
            passed += 1
        print()
    
    print(f"📊 Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! Ready for integration.")
        print("\nNext steps:")
        print("1. Set environment: export GEMINI_API_KEY='your-key'")
        print("2. Enable feature flag: FEATURE_FLAGS = {'ASK_AI_IN_SQLLAB': True}")
        print("3. Build frontend: pnpm build")
        print("4. Start Superset: superset run -p 8088")
    else:
        print("❌ Some tests failed. Check the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
