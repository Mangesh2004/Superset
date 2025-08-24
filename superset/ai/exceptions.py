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
"""AI module exceptions."""
from __future__ import annotations

from superset.exceptions import SupersetException


class AIException(SupersetException):
    """Base exception for AI module."""


class LLMConfigError(AIException):
    """Raised when LLM configuration is invalid."""


class LLMResponseError(AIException):
    """Raised when LLM returns invalid response."""


class LLMTimeoutError(AIException):
    """Raised when LLM request times out."""


class SQLSecurityError(AIException):
    """Raised when generated SQL violates security rules."""
