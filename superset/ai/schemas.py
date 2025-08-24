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
"""Marshmallow schemas for AI API endpoints."""
from __future__ import annotations

from marshmallow import Schema, fields, validate, ValidationError
from typing import Dict, Any


class AISQLRequestSchema(Schema):
    """Schema for AI SQL generation request."""
    
    database_id = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
        metadata={"description": "Database ID to query"}
    )
    
    schema = fields.String(
        required=True,
        validate=validate.Length(min=1, max=256),
        metadata={"description": "Database schema name"}
    )
    
    question = fields.String(
        required=True,
        validate=validate.Length(min=1, max=2000),
        metadata={"description": "Natural language question to convert to SQL"}
    )


class AISQLResponseSchema(Schema):
    """Schema for AI SQL generation response."""
    
    class SQLResultSchema(Schema):
        sql = fields.String(
            required=True,
            metadata={"description": "Generated SQL query"}
        )
    
    result = fields.Nested(
        SQLResultSchema,
        required=True,
        metadata={"description": "Query generation result"}
    )
