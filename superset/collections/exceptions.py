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
"""Custom exceptions for the Collections feature."""
from __future__ import annotations

from superset.exceptions import SupersetException


class CollectionException(SupersetException):
    """Base exception for collection-related errors."""


class CollectionNotFoundError(CollectionException):
    """Raised when a collection is not found."""


class CollectionPermissionError(CollectionException):
    """Raised when a user lacks permission to access a collection."""


class CollectionCycleError(CollectionException):
    """Raised when an operation would create a cycle in the collection hierarchy."""


class CollectionSlugExistsError(CollectionException):
    """Raised when trying to create a collection with an existing slug."""


class CollectionItemAlreadyExistsError(CollectionException):
    """Raised when trying to add an item that's already in the collection."""


class CollectionItemNotFoundError(CollectionException):
    """Raised when trying to remove an item that's not in the collection."""


class CollectionDepthExceededError(CollectionException):
    """Raised when the collection hierarchy exceeds maximum depth."""


class CollectionItemLimitExceededError(CollectionException):
    """Raised when trying to add more items than the collection limit."""
