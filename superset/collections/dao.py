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
"""Data Access Object for Collections."""
from __future__ import annotations

import logging
from typing import Any, Optional, TYPE_CHECKING

from flask_appbuilder.security.sqla.models import Role, User
from sqlalchemy import and_, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, selectinload

from superset import db
from superset.daos.base import BaseDAO
from superset.collections.constants import CollectionItemType
from superset.collections.exceptions import (
    CollectionCycleError,
    CollectionItemAlreadyExistsError,
    CollectionItemNotFoundError,
    CollectionNotFoundError,
    CollectionSlugExistsError,
)
from superset.collections.models import (
    SpCollection,
    SpCollectionChart,
    SpCollectionDashboard,
    SpCollectionDataset,
    SpCollectionPermission,
)

if TYPE_CHECKING:
    from superset.models.dashboard import Dashboard
    from superset.models.slice import Slice
    from superset.connectors.sqla.models import SqlaTable

logger = logging.getLogger(__name__)


class CollectionDAO(BaseDAO[SpCollection]):
    """Data Access Object for Collections."""

    model_cls = SpCollection

    @classmethod
    def find_by_slug(cls, slug: str) -> Optional[SpCollection]:
        """Find a collection by its slug."""
        return db.session.query(SpCollection).filter(SpCollection.slug == slug).first()

    @classmethod
    def find_root_collections(cls) -> list[SpCollection]:
        """Find all root collections (collections without parents)."""
        return (
            db.session.query(SpCollection)
            .filter(SpCollection.parent_id.is_(None))
            .order_by(SpCollection.name)
            .all()
        )

    @classmethod
    def find_children(cls, parent_id: int) -> list[SpCollection]:
        """Find all direct children of a collection."""
        return (
            db.session.query(SpCollection)
            .filter(SpCollection.parent_id == parent_id)
            .order_by(SpCollection.name)
            .all()
        )

    @classmethod
    def get_tree(
        cls,
        root_id: Optional[int] = None,
        max_depth: Optional[int] = None,
        user: Optional[User] = None,
    ) -> list[dict[str, Any]]:
        """
        Get the collection tree structure.
        
        Args:
            root_id: Start from this collection (None for all roots)
            max_depth: Maximum depth to traverse
            user: Filter by user permissions
            
        Returns:
            List of collection dictionaries with nested children
        """
        if root_id:
            roots = [cls.find_by_id(root_id)]
            if not roots[0]:
                return []
        else:
            roots = cls.find_root_collections()

        def build_tree_node(collection: SpCollection, current_depth: int = 0) -> dict[str, Any]:
            node = {
                "id": collection.id,
                "uuid": collection.uuid,
                "name": collection.name,
                "slug": collection.slug,
                "description": collection.description,
                "is_official": collection.is_official,
                "item_count": collection.item_count,
                "total_item_count": collection.total_item_count,
                "depth": current_depth,
                "children": [],
            }

            # Add children if we haven't reached max depth
            if max_depth is None or current_depth < max_depth:
                children = cls.find_children(collection.id)
                
                # Filter by user permissions if provided
                if user:
                    children = cls.filter_by_user_permissions(children, user, "view")
                
                for child in children:
                    child_node = build_tree_node(child, current_depth + 1)
                    node["children"].append(child_node)

            return node

        tree = []
        for root in roots:
            if user and not cls.user_can_access_collection(user, root, "view"):
                continue
            tree.append(build_tree_node(root))

        return tree

    @classmethod
    def create_collection(
        cls,
        name: str,
        slug: str,
        description: Optional[str] = None,
        parent_id: Optional[int] = None,
        is_official: bool = False,
        created_by: Optional[User] = None,
    ) -> SpCollection:
        """
        Create a new collection.
        
        Args:
            name: Collection name
            slug: URL-friendly identifier
            description: Optional description
            parent_id: Parent collection ID
            is_official: Whether this is an official collection
            created_by: User creating the collection
            
        Returns:
            Created collection
            
        Raises:
            CollectionSlugExistsError: If slug already exists
            CollectionCycleError: If parent would create a cycle
        """
        # Check if slug already exists
        if cls.find_by_slug(slug):
            raise CollectionSlugExistsError(f"Collection with slug '{slug}' already exists")

        # Validate parent doesn't create cycle
        if parent_id:
            parent = cls.find_by_id(parent_id)
            if not parent:
                raise CollectionNotFoundError(f"Parent collection {parent_id} not found")

        # Create collection
        collection = SpCollection(
            name=name,
            slug=slug,
            description=description,
            parent_id=parent_id,
            is_official=is_official,
            created_by_fk=created_by.id if created_by else None,
        )

        # Additional cycle check using the model method
        if parent_id and collection.has_cycle_with_parent(parent_id):
            raise CollectionCycleError("Creating this collection would create a cycle")

        try:
            db.session.add(collection)
            db.session.commit()
            logger.info("Created collection: %s (slug: %s)", name, slug)
            return collection
        except IntegrityError as ex:
            db.session.rollback()
            if "slug" in str(ex):
                raise CollectionSlugExistsError(f"Collection with slug '{slug}' already exists") from ex
            raise

    @classmethod
    def update_collection(
        cls,
        collection_id: int,
        name: Optional[str] = None,
        slug: Optional[str] = None,
        description: Optional[str] = None,
        parent_id: Optional[int] = None,
        is_official: Optional[bool] = None,
        changed_by: Optional[User] = None,
    ) -> SpCollection:
        """Update an existing collection."""
        collection = cls.find_by_id(collection_id)
        if not collection:
            raise CollectionNotFoundError(f"Collection {collection_id} not found")

        # Validate slug uniqueness if changing
        if slug and slug != collection.slug:
            existing = cls.find_by_slug(slug)
            if existing and existing.id != collection_id:
                raise CollectionSlugExistsError(f"Collection with slug '{slug}' already exists")

        # Validate parent change doesn't create cycle
        if parent_id is not None and parent_id != collection.parent_id:
            if parent_id and not collection.can_be_moved_to(parent_id):
                raise CollectionCycleError("Moving collection would create a cycle")

        # Update fields
        if name is not None:
            collection.name = name
        if slug is not None:
            collection.slug = slug
        if description is not None:
            collection.description = description
        if parent_id is not None:
            collection.parent_id = parent_id
        if is_official is not None:
            collection.is_official = is_official
        if changed_by:
            collection.changed_by_fk = changed_by.id

        try:
            db.session.commit()
            logger.info("Updated collection: %s", collection.name)
            return collection
        except IntegrityError as ex:
            db.session.rollback()
            if "slug" in str(ex):
                raise CollectionSlugExistsError(f"Collection with slug '{slug}' already exists") from ex
            raise

    @classmethod
    def delete_collection(cls, collection_id: int) -> bool:
        """
        Delete a collection and all its relationships.
        
        Args:
            collection_id: ID of collection to delete
            
        Returns:
            True if deleted, False if not found
        """
        collection = cls.find_by_id(collection_id)
        if not collection:
            return False

        try:
            # Move children to parent (or make them root collections)
            children = cls.find_children(collection_id)
            for child in children:
                child.parent_id = collection.parent_id

            # Delete the collection (cascades will handle links and permissions)
            db.session.delete(collection)
            db.session.commit()
            
            logger.info("Deleted collection: %s (id: %d)", collection.name, collection_id)
            return True
        except Exception as ex:
            db.session.rollback()
            logger.error("Failed to delete collection %d: %s", collection_id, str(ex))
            raise

    @classmethod
    def add_item_to_collection(
        cls,
        collection_id: int,
        item_type: CollectionItemType,
        item_id: int,
        created_by: Optional[User] = None,
    ) -> bool:
        """
        Add an item to a collection.
        
        Args:
            collection_id: Collection to add item to
            item_type: Type of item (dashboard, chart, dataset)
            item_id: ID of the item
            created_by: User adding the item
            
        Returns:
            True if added, raises exception if error
            
        Raises:
            CollectionNotFoundError: If collection doesn't exist
            CollectionItemAlreadyExistsError: If item already in collection
        """
        collection = cls.find_by_id(collection_id)
        if not collection:
            raise CollectionNotFoundError(f"Collection {collection_id} not found")

        # Check if item already exists in collection
        if cls.item_exists_in_collection(collection_id, item_type, item_id):
            raise CollectionItemAlreadyExistsError(
                f"{item_type.value} {item_id} already exists in collection {collection_id}"
            )

        # Create the appropriate link
        link_model = None
        if item_type == CollectionItemType.DASHBOARD:
            link_model = SpCollectionDashboard(
                collection_id=collection_id,
                dashboard_id=item_id,
                created_by_fk=created_by.id if created_by else None,
            )
        elif item_type == CollectionItemType.CHART:
            link_model = SpCollectionChart(
                collection_id=collection_id,
                chart_id=item_id,
                created_by_fk=created_by.id if created_by else None,
            )
        elif item_type == CollectionItemType.DATASET:
            link_model = SpCollectionDataset(
                collection_id=collection_id,
                dataset_id=item_id,
                created_by_fk=created_by.id if created_by else None,
            )

        if not link_model:
            raise ValueError(f"Invalid item type: {item_type}")

        try:
            db.session.add(link_model)
            
            # Update item count
            collection.item_count = collection.item_count + 1
            
            db.session.commit()
            logger.info(
                "Added %s %d to collection %s (id: %d)",
                item_type.value,
                item_id,
                collection.name,
                collection_id,
            )
            return True
        except IntegrityError as ex:
            db.session.rollback()
            if "uq_collection_" in str(ex):
                raise CollectionItemAlreadyExistsError(
                    f"{item_type.value} {item_id} already exists in collection {collection_id}"
                ) from ex
            raise

    @classmethod
    def remove_item_from_collection(
        cls,
        collection_id: int,
        item_type: CollectionItemType,
        item_id: int,
    ) -> bool:
        """
        Remove an item from a collection.
        
        Args:
            collection_id: Collection to remove item from
            item_type: Type of item
            item_id: ID of the item
            
        Returns:
            True if removed
            
        Raises:
            CollectionNotFoundError: If collection doesn't exist
            CollectionItemNotFoundError: If item not in collection
        """
        collection = cls.find_by_id(collection_id)
        if not collection:
            raise CollectionNotFoundError(f"Collection {collection_id} not found")

        # Find and delete the link
        link_query = None
        if item_type == CollectionItemType.DASHBOARD:
            link_query = db.session.query(SpCollectionDashboard).filter(
                and_(
                    SpCollectionDashboard.collection_id == collection_id,
                    SpCollectionDashboard.dashboard_id == item_id,
                )
            )
        elif item_type == CollectionItemType.CHART:
            link_query = db.session.query(SpCollectionChart).filter(
                and_(
                    SpCollectionChart.collection_id == collection_id,
                    SpCollectionChart.chart_id == item_id,
                )
            )
        elif item_type == CollectionItemType.DATASET:
            link_query = db.session.query(SpCollectionDataset).filter(
                and_(
                    SpCollectionDataset.collection_id == collection_id,
                    SpCollectionDataset.dataset_id == item_id,
                )
            )

        if not link_query:
            raise ValueError(f"Invalid item type: {item_type}")

        link = link_query.first()
        if not link:
            raise CollectionItemNotFoundError(
                f"{item_type.value} {item_id} not found in collection {collection_id}"
            )

        try:
            db.session.delete(link)
            
            # Update item count
            collection.item_count = max(0, collection.item_count - 1)
            
            db.session.commit()
            logger.info(
                "Removed %s %d from collection %s (id: %d)",
                item_type.value,
                item_id,
                collection.name,
                collection_id,
            )
            return True
        except Exception as ex:
            db.session.rollback()
            logger.error("Failed to remove item from collection: %s", str(ex))
            raise

    @classmethod
    def item_exists_in_collection(
        cls,
        collection_id: int,
        item_type: CollectionItemType,
        item_id: int,
    ) -> bool:
        """Check if an item exists in a collection."""
        if item_type == CollectionItemType.DASHBOARD:
            return db.session.query(
                db.session.query(SpCollectionDashboard).filter(
                    and_(
                        SpCollectionDashboard.collection_id == collection_id,
                        SpCollectionDashboard.dashboard_id == item_id,
                    )
                ).exists()
            ).scalar()
        elif item_type == CollectionItemType.CHART:
            return db.session.query(
                db.session.query(SpCollectionChart).filter(
                    and_(
                        SpCollectionChart.collection_id == collection_id,
                        SpCollectionChart.chart_id == item_id,
                    )
                ).exists()
            ).scalar()
        elif item_type == CollectionItemType.DATASET:
            return db.session.query(
                db.session.query(SpCollectionDataset).filter(
                    and_(
                        SpCollectionDataset.collection_id == collection_id,
                        SpCollectionDataset.dataset_id == item_id,
                    )
                ).exists()
            ).scalar()
        
        return False

    @classmethod
    def get_collection_items(
        cls,
        collection_id: int,
        item_type: Optional[CollectionItemType] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> dict[str, Any]:
        """
        Get items in a collection.
        
        Args:
            collection_id: Collection ID
            item_type: Filter by item type
            limit: Limit results
            offset: Offset for pagination
            
        Returns:
            Dictionary with items and metadata
        """
        collection = cls.find_by_id(collection_id)
        if not collection:
            raise CollectionNotFoundError(f"Collection {collection_id} not found")

        items = {
            "dashboards": [],
            "charts": [],
            "datasets": [],
            "total_count": 0,
        }

        if not item_type or item_type == CollectionItemType.DASHBOARD:
            dashboard_query = (
                db.session.query(SpCollectionDashboard)
                .filter(SpCollectionDashboard.collection_id == collection_id)
                .options(joinedload(SpCollectionDashboard.dashboard))
            )
            
            if limit:
                dashboard_query = dashboard_query.limit(limit)
            if offset:
                dashboard_query = dashboard_query.offset(offset)
                
            dashboard_links = dashboard_query.all()
            items["dashboards"] = [
                {
                    "id": link.dashboard.id,
                    "dashboard_title": link.dashboard.dashboard_title,
                    "slug": link.dashboard.slug,
                    "url": link.dashboard.url,
                    "created_on": link.created_on,
                }
                for link in dashboard_links
                if link.dashboard  # Safety check
            ]

        if not item_type or item_type == CollectionItemType.CHART:
            chart_query = (
                db.session.query(SpCollectionChart)
                .filter(SpCollectionChart.collection_id == collection_id)
                .options(joinedload(SpCollectionChart.chart))
            )
            
            if limit:
                chart_query = chart_query.limit(limit)
            if offset:
                chart_query = chart_query.offset(offset)
                
            chart_links = chart_query.all()
            items["charts"] = [
                {
                    "id": link.chart.id,
                    "slice_name": link.chart.slice_name,
                    "viz_type": link.chart.viz_type,
                    "url": link.chart.url,
                    "created_on": link.created_on,
                }
                for link in chart_links
                if link.chart  # Safety check
            ]

        if not item_type or item_type == CollectionItemType.DATASET:
            dataset_query = (
                db.session.query(SpCollectionDataset)
                .filter(SpCollectionDataset.collection_id == collection_id)
                .options(joinedload(SpCollectionDataset.dataset))
            )
            
            if limit:
                dataset_query = dataset_query.limit(limit)
            if offset:
                dataset_query = dataset_query.offset(offset)
                
            dataset_links = dataset_query.all()
            items["datasets"] = [
                {
                    "id": link.dataset.id,
                    "table_name": link.dataset.table_name,
                    "schema": link.dataset.schema,
                    "database_name": link.dataset.database.database_name if link.dataset.database else None,
                    "created_on": link.created_on,
                }
                for link in dataset_links
                if link.dataset  # Safety check
            ]

        items["total_count"] = len(items["dashboards"]) + len(items["charts"]) + len(items["datasets"])
        
        return items

    @classmethod
    def update_item_counts(cls, collection_id: int) -> None:
        """Update cached item counts for a collection and its ancestors."""
        collection = cls.find_by_id(collection_id)
        if not collection:
            return

        # Calculate actual count
        actual_count = (
            len(collection.dashboard_links) +
            len(collection.chart_links) +
            len(collection.dataset_links)
        )

        # Update if different
        if collection.item_count != actual_count:
            collection.item_count = actual_count
            db.session.commit()

        # Recursively update parent
        if collection.parent_id:
            cls.update_item_counts(collection.parent_id)

    # Permission-related methods (placeholder implementations)
    @classmethod
    def filter_by_user_permissions(
        cls,
        collections: list[SpCollection],
        user: User,
        permission: str = "view",
    ) -> list[SpCollection]:
        """Filter collections by user permissions."""
        # TODO: Implement actual permission filtering
        # For now, return all collections
        return collections

    @classmethod
    def user_can_access_collection(
        cls,
        user: User,
        collection: SpCollection,
        permission: str = "view",
    ) -> bool:
        """Check if user can access a collection."""
        # TODO: Implement actual permission checking
        # For now, return True
        return True
