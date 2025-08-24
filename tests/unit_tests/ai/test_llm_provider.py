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
"""Tests for LLM provider module."""
from __future__ import annotations

import pytest
from unittest.mock import Mock, patch
import os

from superset.ai.llm_provider import GeminiProvider, get_llm_provider, generate_sql_from_nl
from superset.ai.exceptions import LLMConfigError, LLMResponseError, SQLSecurityError


class TestGeminiProvider:
    """Test Gemini LLM provider."""

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_init_with_api_key(self):
        """Test provider initialization with API key."""
        provider = GeminiProvider()
        assert provider.api_key == "test-key"
        assert provider.model in ["gemini-2.5-flash"]  # default or user configured

    def test_init_without_api_key(self):
        """Test provider initialization fails without API key."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(LLMConfigError, match="GEMINI_API_KEY"):
                GeminiProvider()

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    @patch('superset.ai.llm_provider.requests.post')
    def test_call_llm_success(self, mock_post):
        """Test successful LLM API call."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": "SELECT * FROM users LIMIT 500;"}]
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        provider = GeminiProvider()
        result = provider._call_llm("system prompt", "user prompt")
        
        assert result == "SELECT * FROM users LIMIT 500;"
        mock_post.assert_called_once()

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    @patch('superset.ai.llm_provider.requests.post')
    def test_call_llm_api_error(self, mock_post):
        """Test LLM API error handling."""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_post.return_value = mock_response

        provider = GeminiProvider()
        with pytest.raises(LLMResponseError, match="Gemini API error 400"):
            provider._call_llm("system prompt", "user prompt")

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_safety_checks_blocks_destructive_sql(self):
        """Test safety checks block destructive SQL."""
        provider = GeminiProvider()
        
        # Test blocked operations
        with pytest.raises(SQLSecurityError, match="Only SELECT queries are allowed"):
            provider._apply_safety_checks("DROP TABLE users;")
            
        with pytest.raises(SQLSecurityError, match="Only SELECT queries are allowed"):
            provider._apply_safety_checks("DELETE FROM users;")

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_safety_checks_allows_select(self):
        """Test safety checks allow SELECT queries."""
        provider = GeminiProvider()
        
        sql = "SELECT * FROM users WHERE id = 1;"
        result = provider._apply_safety_checks(sql)
        assert result == sql

    @patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
    def test_safety_checks_handles_markdown(self):
        """Test safety checks remove markdown formatting."""
        provider = GeminiProvider()
        
        sql_with_markdown = "```sql\nSELECT * FROM users;\n```"
        result = provider._apply_safety_checks(sql_with_markdown)
        assert result == "SELECT * FROM users;"


class TestGetLLMProvider:
    """Test LLM provider factory function."""

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "test-key"})
    def test_get_gemini_provider(self):
        """Test getting Gemini provider."""
        provider = get_llm_provider()
        assert isinstance(provider, GeminiProvider)

    @patch.dict(os.environ, {"LLM_PROVIDER": "unknown"})
    def test_get_unknown_provider(self):
        """Test getting unknown provider raises error."""
        with pytest.raises(LLMConfigError, match="Unknown LLM provider"):
            get_llm_provider()


class TestGenerateSQLFromNL:
    """Test main entry point function."""

    @patch('superset.ai.llm_provider.get_llm_provider')
    def test_generate_sql_from_nl(self, mock_get_provider):
        """Test SQL generation from natural language."""
        # Mock provider
        mock_provider = Mock()
        mock_provider.generate_sql.return_value = "SELECT COUNT(*) FROM orders;"
        mock_get_provider.return_value = mock_provider

        result = generate_sql_from_nl(
            dialect="postgresql",
            database_name="test_db",
            schema_name="public",
            schema_context_lines=["- orders(id int, total decimal)"],
            question="How many orders are there?"
        )

        assert result == "SELECT COUNT(*) FROM orders;"
        mock_provider.generate_sql.assert_called_once_with(
            dialect="postgresql",
            database_name="test_db",
            schema_name="public",
            schema_context_lines=["- orders(id int, total decimal)"],
            question="How many orders are there?"
        )
