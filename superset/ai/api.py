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
"""AI SQL API endpoints."""
from __future__ import annotations

import logging
from typing import List

from flask import request, Response
from flask_appbuilder.api import BaseApi, expose, protect
from marshmallow import ValidationError

from superset import app
from superset.daos.database import DatabaseDAO
from superset.views.base_api import BaseSupersetApi, handle_api_exception, requires_json

from superset.ai.llm_provider import generate_sql_from_nl
from superset.ai.schemas import AISQLRequestSchema, AISQLResponseSchema
from superset.ai.exceptions import AIException

logger = logging.getLogger(__name__)

# Configuration
ASK_AI_MAX_TABLES = int(app.config.get("ASK_AI_MAX_TABLES", 8))
ASK_AI_MAX_COLUMNS_PER_TABLE = int(app.config.get("ASK_AI_MAX_COLUMNS_PER_TABLE", 25))
ASK_AI_CONTEXT_MAX_CHARS = int(app.config.get("ASK_AI_CONTEXT_MAX_CHARS", 15000))


class AISQLApi(BaseSupersetApi):
    """API for AI-powered SQL generation."""
    
    resource_name = "ai"
    allow_browser_login = True
    class_permission_name = "AI"
    method_permission_name = {
        "generate_sql": "read",
    }
    openapi_spec_tag = "AI SQL"
    
    @expose("/sql", methods=["POST"])
    @protect()
    @requires_json
    @handle_api_exception
    def generate_sql(self) -> Response:
        """
        Generate SQL query from natural language question.
        ---
        post:
          summary: Generate SQL from natural language
          requestBody:
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/AISQLRequestSchema'
          responses:
            200:
              description: SQL generated successfully
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/AISQLResponseSchema'
            400:
              $ref: '#/components/responses/400'
            401:
              $ref: '#/components/responses/401'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        # Parse and validate request
        try:
            request_schema = AISQLRequestSchema()
            data = request_schema.load(request.get_json(force=True) or {})
        except ValidationError as e:
            return self.response(400, message=f"Invalid request: {e.messages}")
        
        database_id = data["database_id"]
        schema_name = data["schema"]
        question = data["question"]
        
        # Get database
        database = DatabaseDAO.find_by_id(database_id)
        if not database:
            return self.response(404, message="Database not found")
        
        try:
            with database.get_inspector(schema=schema_name) as inspector:
                context_lines = self._extract_schema_context(inspector, schema_name)
        except Exception as e:
            logger.error(f"Failed to connect to database {database_id}: {e}")
            return self.response(400, message=f"Failed to connect to database: {e}")
        
        # Generate SQL using LLM
        try:
            sql = generate_sql_from_nl(
                dialect=database.get_dialect().name,
                database_name=database.database_name,
                schema_name=schema_name,
                schema_context_lines=context_lines,
                question=question,
            )
        except AIException as e:
            logger.error(f"AI SQL generation failed: {e}")
            return self.response(502, message=f"AI service error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in SQL generation: {e}")
            return self.response(500, message="Internal server error")
        
        # Return response
        response_schema = AISQLResponseSchema()
        return self.response(200, **response_schema.dump({"result": {"sql": sql}}))
    
    def _extract_schema_context(self, inspector: any, schema_name: str) -> List[str]:
        """Extract database schema context for LLM."""
        context_lines: List[str] = []
        
        try:
            # Get table names
            table_names = sorted(inspector.get_table_names(schema=schema_name))[:ASK_AI_MAX_TABLES]
        except Exception:
            logger.warning(f"Failed to get table names for schema {schema_name}")
            table_names = []
        
        # Extract table and column information
        for table_name in table_names:
            try:
                columns = []
                column_info = inspector.get_columns(table_name, schema=schema_name)
                
                for col in column_info[:ASK_AI_MAX_COLUMNS_PER_TABLE]:
                    col_name = col.get("name", "unknown")
                    col_type = str(col.get("type", "unknown"))
                    
                    # Simplify common type names
                    col_type = col_type.lower()
                    if "varchar" in col_type or "text" in col_type or "char" in col_type:
                        col_type = "text"
                    elif "int" in col_type or "number" in col_type or "numeric" in col_type:
                        col_type = "number"
                    elif "timestamp" in col_type or "datetime" in col_type:
                        col_type = "timestamp"
                    elif "date" in col_type:
                        col_type = "date"
                    elif "bool" in col_type:
                        col_type = "boolean"
                    
                    columns.append(f"{col_name} {col_type}")
                
                if columns:
                    context_lines.append(f"- {table_name}({', '.join(columns)})")
                    
            except Exception as e:
                logger.warning(f"Failed to get columns for table {table_name}: {e}")
                # Add table without column info
                context_lines.append(f"- {table_name}")
        
        # Trim context if too long
        context_text = "\n".join(context_lines)
        if len(context_text) > ASK_AI_CONTEXT_MAX_CHARS:
            # Truncate and add notice
            context_text = context_text[:ASK_AI_CONTEXT_MAX_CHARS]
            # Find last complete line
            last_newline = context_text.rfind("\n")
            if last_newline > 0:
                context_text = context_text[:last_newline]
            context_text += "\n... (more tables available but truncated for context limit)"
            context_lines = context_text.split("\n")
        
        return context_lines
