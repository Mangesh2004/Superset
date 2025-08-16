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
"""SQLAlchemy models for the Collections feature."""
from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Optional, TYPE_CHECKING

from flask_appbuilder import Model
from flask_appbuilder.models.decorators import renders
from flask_appbuilder.security.sqla.models import User
from markupsafe import escape, Markup
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func

from superset.models.helpers import AuditMixinNullable, ImportExportMixin, UUIDMixin

if TYPE_CHECKING:
    from superset.models.dashboard import Dashboard
    from superset.models.slice import Slice
    from superset.connectors.sqla.models import SqlaTable

logger = logging.getLogger(__name__)


class SpCollection(Model, AuditMixinNullable, ImportExportMixin, UUIDMixin):
    """A collection for organizing dashboards, charts, and datasets hierarchically.
    
    Collections form a tree structure where each collection can have:
    - A parent collection (except root collections)
    - Multiple child collections
    - Multiple items (dashboards, charts, datasets)
    - Role-based permissions for view/curate access
    """

    __tablename__ = "sp_collection"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("sp_collection.id", ondelete="CASCADE"))
    is_official = Column(Boolean, nullable=False, default=False)
    item_count = Column(Integer, nullable=False, default=0)

    # Relationships
    parent = relationship(
        "SpCollection",
        remote_side=[id],
        backref="children",
    )
    
    # Item relationships (use string names to avoid circular imports)
    dashboard_links = relationship(
        "SpCollectionDashboard",
        back_populates="collection",
        cascade="all, delete-orphan",
    )
    
    chart_links = relationship(
        "SpCollectionChart",
        back_populates="collection",
        cascade="all, delete-orphan",
    )
    
    dataset_links = relationship(
        "SpCollectionDataset",
        back_populates="collection",
        cascade="all, delete-orphan",
    )
    
    permissions = relationship(
        "SpCollectionPermission",
        back_populates="collection",
        cascade="all, delete-orphan",
    )

    # Validation
    @validates("name")
    def validate_name(self, key: str, name: str) -> str:
        """Validate collection name."""
        if not name or not name.strip():
            raise ValueError("Collection name cannot be empty")
        
        name = name.strip()
        if len(name) > 255:
            raise ValueError("Collection name cannot exceed 255 characters")
        
        return name

    @validates("slug")
    def validate_slug(self, key: str, slug: str) -> str:
        """Validate and normalize collection slug."""
        if not slug or not slug.strip():
            raise ValueError("Collection slug cannot be empty")
        
        slug = slug.strip().lower()
        
        # Ensure slug contains only valid characters
        if not re.match(r"^[a-z0-9-_]+$", slug):
            raise ValueError(
                "Collection slug can only contain lowercase letters, numbers, hyphens, and underscores"
            )
        
        if len(slug) > 255:
            raise ValueError("Collection slug cannot exceed 255 characters")
        
        return slug

    @validates("description")
    def validate_description(self, key: str, description: Optional[str]) -> Optional[str]:
        """Validate collection description."""
        if description and len(description) > 1000:
            raise ValueError("Collection description cannot exceed 1000 characters")
        return description

    @validates("parent_id")
    def validate_parent_id(self, key: str, parent_id: Optional[int]) -> Optional[int]:
        """Validate parent_id to prevent self-reference."""
        if parent_id is not None and self.id is not None and parent_id == self.id:
            raise ValueError("Collection cannot be its own parent")
        return parent_id

    # Properties
    @hybrid_property
    def is_root(self) -> bool:
        """Check if this is a root collection (no parent)."""
        return self.parent_id is None

    @property
    def path(self) -> list[SpCollection]:
        """Get the path from root to this collection."""
        path = []
        current = self
        while current:
            path.insert(0, current)
            current = current.parent
        return path

    @property
    def breadcrumb_path(self) -> str:
        """Get a breadcrumb-style path string."""
        return " > ".join(collection.name for collection in self.path)

    @property
    def depth(self) -> int:
        """Get the depth of this collection in the tree (root = 0)."""
        depth = 0
        current = self.parent
        while current:
            depth += 1
            current = current.parent
        return depth

    @property
    def total_item_count(self) -> int:
        """Get the total count of all items in this collection and its descendants."""
        # This would be calculated dynamically or cached
        return (
            len(self.dashboard_links) +
            len(self.chart_links) +
            len(self.dataset_links)
        )

    # Methods
    def has_cycle_with_parent(self, potential_parent_id: int) -> bool:
        """Check if setting the given parent would create a cycle."""
        if potential_parent_id == self.id:
            return True
        
        # Walk up the tree from the potential parent
        current_id = potential_parent_id
        visited = set()
        
        while current_id:
            if current_id in visited:
                # Found a cycle in the existing tree
                return True
            if current_id == self.id:
                # Would create a cycle
                return True
            
            visited.add(current_id)
            
            # Get parent of current collection
            from superset.collections.dao import CollectionDAO
            parent = CollectionDAO.find_by_id(current_id)
            current_id = parent.parent_id if parent else None
        
        return False

    def can_be_moved_to(self, new_parent_id: Optional[int]) -> bool:
        """Check if this collection can be moved to the given parent."""
        if new_parent_id is None:
            return True  # Can always become a root collection
        
        if new_parent_id == self.id:
            return False  # Cannot be its own parent
        
        return not self.has_cycle_with_parent(new_parent_id)

    @renders("name")
    def name_link(self) -> Markup:
        """Render collection name as a link."""
        return Markup(f'<a href="/collections/{self.slug}">{escape(self.name)}</a>')

    def __repr__(self) -> str:
        return f"<SpCollection {self.name} ({self.slug})>"

    def __str__(self) -> str:
        return self.name


class SpCollectionDashboard(Model, AuditMixinNullable):
    """Link table connecting collections to dashboards."""

    __tablename__ = "sp_collection_dashboard"
    __table_args__ = (
        UniqueConstraint("collection_id", "dashboard_id", name="uq_collection_dashboard"),
    )

    id = Column(Integer, primary_key=True)
    collection_id = Column(
        Integer,
        ForeignKey("sp_collection.id", ondelete="CASCADE"),
        nullable=False,
    )
    dashboard_id = Column(
        Integer,
        ForeignKey("dashboards.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    collection = relationship("SpCollection", back_populates="dashboard_links")
    dashboard = relationship("Dashboard")  # Import handled by SQLAlchemy

    def __repr__(self) -> str:
        return f"<SpCollectionDashboard collection_id={self.collection_id} dashboard_id={self.dashboard_id}>"


class SpCollectionChart(Model, AuditMixinNullable):
    """Link table connecting collections to charts."""

    __tablename__ = "sp_collection_chart"
    __table_args__ = (
        UniqueConstraint("collection_id", "chart_id", name="uq_collection_chart"),
    )

    id = Column(Integer, primary_key=True)
    collection_id = Column(
        Integer,
        ForeignKey("sp_collection.id", ondelete="CASCADE"),
        nullable=False,
    )
    chart_id = Column(
        Integer,
        ForeignKey("slices.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    collection = relationship("SpCollection", back_populates="chart_links")
    chart = relationship("Slice")  # Import handled by SQLAlchemy

    def __repr__(self) -> str:
        return f"<SpCollectionChart collection_id={self.collection_id} chart_id={self.chart_id}>"


class SpCollectionDataset(Model, AuditMixinNullable):
    """Link table connecting collections to datasets."""

    __tablename__ = "sp_collection_dataset"
    __table_args__ = (
        UniqueConstraint("collection_id", "dataset_id", name="uq_collection_dataset"),
    )

    id = Column(Integer, primary_key=True)
    collection_id = Column(
        Integer,
        ForeignKey("sp_collection.id", ondelete="CASCADE"),
        nullable=False,
    )
    dataset_id = Column(
        Integer,
        ForeignKey("tables.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    collection = relationship("SpCollection", back_populates="dataset_links")
    dataset = relationship("SqlaTable")  # Import handled by SQLAlchemy

    def __repr__(self) -> str:
        return f"<SpCollectionDataset collection_id={self.collection_id} dataset_id={self.dataset_id}>"


class SpCollectionPermission(Model, AuditMixinNullable):
    """Role-based permissions for collections."""

    __tablename__ = "sp_collection_permission"
    __table_args__ = (
        UniqueConstraint("collection_id", "role_id", name="uq_collection_role"),
    )

    id = Column(Integer, primary_key=True)
    collection_id = Column(
        Integer,
        ForeignKey("sp_collection.id", ondelete="CASCADE"),
        nullable=False,
    )
    role_id = Column(
        Integer,
        ForeignKey("ab_role.id", ondelete="CASCADE"),
        nullable=False,
    )
    can_view = Column(Boolean, nullable=False, default=False)
    can_curate = Column(Boolean, nullable=False, default=False)

    # Relationships
    collection = relationship("SpCollection", back_populates="permissions")
    # Note: Role relationship will be handled by string name to avoid imports

    @validates("can_view", "can_curate")
    def validate_permissions(self, key: str, value: bool) -> bool:
        """Ensure curate permission implies view permission."""
        if key == "can_curate" and value and not getattr(self, "can_view", False):
            # If setting curate to True, also set view to True
            self.can_view = True
        return value

    def __repr__(self) -> str:
        permissions = []
        if self.can_view:
            permissions.append("view")
        if self.can_curate:
            permissions.append("curate")
        perm_str = ",".join(permissions) if permissions else "none"
        return f"<SpCollectionPermission collection_id={self.collection_id} role_id={self.role_id} permissions={perm_str}>"
