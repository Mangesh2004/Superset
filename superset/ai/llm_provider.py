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
"""LLM Provider abstraction layer - swap Gemini/OpenAI by editing this file only."""
from __future__ import annotations

import os
import logging
from typing import Protocol, List
from abc import ABC, abstractmethod

import requests

from superset.ai.exceptions import (
    LLMConfigError,
    LLMResponseError, 
    LLMTimeoutError,
    SQLSecurityError,
)

logger = logging.getLogger(__name__)

# Safety rails - block destructive SQL operations
BANNED_SQL_PREFIXES = ("DROP ", "TRUNCATE ", "DELETE ", "UPDATE ", "ALTER ", "INSERT ", "CREATE ", "GRANT ", "REVOKE ")

SYSTEM_PROMPT = """You are a senior data analyst and SQL expert.
Return ONLY a valid SQL query for the specified SQL dialect. No prose, no markdown, no explanations.

CRITICAL CONSTRAINTS:
- Use ONLY the provided tables/columns (case sensitive).
- Generate READ-ONLY SELECT queries only (no DDL/DML).
- If the question is ambiguous, choose a reasonable interpretation.
- Always include LIMIT 500 to prevent large result sets.
- Use proper SQL syntax for the specified dialect.
- Join tables when needed to answer the question fully."""

USER_TEMPLATE = """Target SQL dialect: {dialect}
Database: {database_name}
Schema: {schema_name}

Available tables and columns:
{schema_context}

User question: {question}

Return only the SQL query:"""


class LLMProvider(Protocol):
    """Protocol for LLM providers."""
    
    def generate_sql(
        self,
        dialect: str,
        database_name: str,
        schema_name: str,
        schema_context_lines: List[str],
        question: str,
    ) -> str:
        """Generate SQL query from natural language question."""
        ...


class BaseLLMProvider(ABC):
    """Base class for LLM providers."""
    
    @abstractmethod
    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call the specific LLM API."""
        ...
    
    def generate_sql(
        self,
        dialect: str,
        database_name: str,
        schema_name: str,
        schema_context_lines: List[str],
        question: str,
    ) -> str:
        """Generate SQL query from natural language question."""
        schema_context = "\n".join(schema_context_lines) if schema_context_lines else "(no tables found)"
        
        user_prompt = USER_TEMPLATE.format(
            dialect=dialect,
            database_name=database_name,
            schema_name=schema_name,
            schema_context=schema_context,
            question=question.strip(),
        )
        
        logger.info(f"Generating SQL for question: {question[:100]}...")
        sql = self._call_llm(SYSTEM_PROMPT, user_prompt)
        
        # Apply safety checks
        safe_sql = self._apply_safety_checks(sql)
        logger.info(f"Generated SQL (safe): {safe_sql[:200]}...")
        
        return safe_sql
    
    def _apply_safety_checks(self, sql: str) -> str:
        """Apply security checks to generated SQL."""
        sql = sql.strip()
        
        # Remove markdown formatting if present
        if sql.startswith("```"):
            lines = sql.split("\n")
            sql = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
            sql = sql.strip()
        
        # Check for banned operations
        sql_upper = sql.upper()
        for banned_prefix in BANNED_SQL_PREFIXES:
            if sql_upper.startswith(banned_prefix):
                logger.warning(f"Blocked non-SELECT SQL: {sql[:100]}")
                raise SQLSecurityError(f"Only SELECT queries are allowed. Blocked: {banned_prefix.strip()}")
        
        # Ensure it starts with SELECT
        if not sql_upper.startswith("SELECT"):
            logger.warning(f"Non-SELECT SQL generated: {sql[:100]}")
            return f"-- Generated SQL was not a SELECT query\nSELECT 'Please ask for data retrieval queries only' AS message;"
        
        return sql


class GeminiProvider(BaseLLMProvider):
    """Google Gemini LLM provider using direct HTTP API."""
    
    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        
        if not self.api_key:
            raise LLMConfigError("GEMINI_API_KEY environment variable is required")
    
    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call Gemini API directly via HTTP."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        
        payload = {
            "systemInstruction": {
                "role": "system",
                "parts": [{"text": system_prompt}],
            },
            "contents": [
                {
                    "role": "user", 
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1000,
            },
            "safetySettings": [
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE"
                }
            ]
        }
        
        try:
            response = requests.post(
                url, 
                json=payload, 
                timeout=60,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                logger.error(f"Gemini API error {response.status_code}: {response.text}")
                raise LLMResponseError(f"Gemini API error {response.status_code}: {response.text}")
            
            data = response.json()
            
            # Extract response text
            try:
                candidates = data.get("candidates", [])
                if not candidates:
                    raise LLMResponseError("No candidates in Gemini response")
                
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                
                if not parts:
                    raise LLMResponseError("No parts in Gemini response")
                
                text = parts[0].get("text", "").strip()
                
                if not text:
                    raise LLMResponseError("Empty text in Gemini response")
                    
                return text
                
            except (KeyError, IndexError, TypeError) as e:
                logger.error(f"Error parsing Gemini response: {e}, response: {data}")
                raise LLMResponseError(f"Invalid Gemini response format: {e}")
                
        except requests.Timeout:
            raise LLMTimeoutError("Gemini API request timed out")
        except requests.RequestException as e:
            raise LLMResponseError(f"Gemini API request failed: {e}")


class OpenAIProvider(BaseLLMProvider):
    """OpenAI provider (placeholder for future implementation)."""
    
    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")
        
        if not self.api_key:
            raise LLMConfigError("OPENAI_API_KEY environment variable is required")
    
    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call OpenAI API."""
        # TODO: Implement OpenAI API call
        # This is a placeholder - implement when switching from Gemini
        raise NotImplementedError("OpenAI provider not yet implemented")


def get_llm_provider() -> LLMProvider:
    """Factory function to get the configured LLM provider."""
    provider_name = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "openai":
        return OpenAIProvider()
    else:
        raise LLMConfigError(f"Unknown LLM provider: {provider_name}")


# Main entry point - the only function other modules should call
def generate_sql_from_nl(
    *,
    dialect: str,
    database_name: str,
    schema_name: str,
    schema_context_lines: List[str],
    question: str,
) -> str:
    """
    Generate SQL query from natural language question.
    
    This is the main entry point used by the API.
    To switch LLM providers, just change the LLM_PROVIDER env var or modify get_llm_provider().
    """
    provider = get_llm_provider()
    return provider.generate_sql(
        dialect=dialect,
        database_name=database_name,
        schema_name=schema_name,
        schema_context_lines=schema_context_lines,
        question=question,
    )
