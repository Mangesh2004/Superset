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
"""Constants for the Collections feature."""
from __future__ import annotations

from enum import Enum
from typing import Final

# Collection item types
class CollectionItemType(str, Enum):
    """Types of items that can be stored in collections."""
    DASHBOARD = "dashboard"
    CHART = "chart"
    DATASET = "dataset"

# Collection permissions
class CollectionPermission(str, Enum):
    """Collection permission levels."""
    VIEW = "view"
    CURATE = "curate"

# Default collection settings
DEFAULT_ROOT_COLLECTION_NAME: Final[str] = "Our Analytics"
DEFAULT_ROOT_COLLECTION_SLUG: Final[str] = "our-analytics"
MAX_COLLECTION_NAME_LENGTH: Final[int] = 255
MAX_COLLECTION_SLUG_LENGTH: Final[int] = 255
MAX_COLLECTION_DESCRIPTION_LENGTH: Final[int] = 1000

# Tree traversal limits
MAX_TREE_DEPTH: Final[int] = 10
MAX_ITEMS_PER_COLLECTION: Final[int] = 1000
