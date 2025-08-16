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
"""REST API for Collections."""
from __future__ import annotations

import logging
from typing import Any, Optional

from flask import g, request
from flask_appbuilder.api import BaseApi, expose, protect, rison, safe
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import has_access_api
from marshmallow import ValidationError

from superset import event_logger
from superset.collections.constants import CollectionItemType
from superset.collections.dao import CollectionDAO
from superset.collections.exceptions import (
    CollectionCycleError,
    CollectionItemAlreadyExistsError,
    CollectionItemNotFoundError,
    CollectionNotFoundError,
    CollectionSlugExistsError,
)
from superset.collections.models import SpCollection
from superset.collections.schemas import (
    AddItemsToCollectionSchema,
    CollectionCreateSchema,
    CollectionItemsResponseSchema,
    CollectionPermissionSchema,
    CollectionSchema,
    CollectionTreeSchema,
    CollectionUpdateSchema,
    ErrorSchema,
    RemoveItemsFromCollectionSchema,
    SetCollectionPermissionsSchema,
    SuccessSchema,
)
# Removed unused import

logger = logging.getLogger(__name__)


class CollectionsRestApi(BaseApi):
    """REST API for Collections management."""

    datamodel = SQLAInterface(SpCollection)
    resource_name = "collections"
    allow_browser_login = True

    # Schemas
    add_model_schema = CollectionCreateSchema()
    edit_model_schema = CollectionUpdateSchema()
    show_model_schema = CollectionSchema()
    
    # Custom schemas
    tree_schema = CollectionTreeSchema()
    items_schema = CollectionItemsResponseSchema()
    add_items_schema = AddItemsToCollectionSchema()
    remove_items_schema = RemoveItemsFromCollectionSchema()
    permissions_schema = CollectionPermissionSchema(many=True)
    set_permissions_schema = SetCollectionPermissionsSchema()
    error_schema = ErrorSchema()
    success_schema = SuccessSchema()

    class_permission_name = "Collections"
    method_permission_name = {
        "get_tree": "read",
        "get": "read", 
        "get_items": "read",
        "post": "write",
        "put": "write",
        "delete": "write",
        "add_items": "write",
        "remove_items": "write",
        "get_permissions": "read",
        "set_permissions": "write",
    }

    @expose("/tree", methods=("GET",))
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get_tree",
        log_to_statsd=False,
    )
    def get_tree(self) -> Any:
        """Get the complete collections tree.
        
        ---
        get:
          description: >-
            Get the hierarchical tree of all collections the user has access to.
          parameters:
          - in: query
            schema:
              type: object
              properties:
                root_id:
                  type: integer
                  description: Start from this collection (omit for all roots)
                max_depth:
                  type: integer
                  description: Maximum tree depth to return
          responses:
            200:
              description: Collection tree
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/CollectionTreeSchema'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            # Get query parameters
            root_id = request.args.get("root_id", type=int)
            max_depth = request.args.get("max_depth", type=int)
            
            # Get current user for permission filtering
            user = g.user
            
            # Get tree from DAO
            tree = CollectionDAO.get_tree(
                root_id=root_id,
                max_depth=max_depth,
                user=user,
            )
            
            result = {
                "collections": tree,
                "total_count": len(tree),
            }
            
            return self.response(200, result=result)
            
        except Exception as ex:
            logger.exception("Error getting collections tree: %s", str(ex))
            return self.response_400(message=str(ex))

    @expose("/<int:pk>", methods=["GET"])
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get",
        log_to_statsd=False,
    )
    def get(self, pk: int) -> Any:
        """Get a single collection by ID.
        
        ---
        get:
          description: >-
            Get a collection by its ID.
          parameters:
          - in: path
            schema:
              type: integer
            name: pk
          responses:
            200:
              description: Collection details
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/CollectionSchema'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            collection = CollectionDAO.find_by_id(pk)
            if not collection:
                return self.response_404()
            
            # TODO: Check user permissions for this collection
            
            result = self.show_model_schema.dump(collection)
            return self.response(200, result=result)
            
        except Exception as ex:
            logger.exception("Error getting collection %d: %s", pk, str(ex))
            return self.response_400(message=str(ex))

    @expose("/<int:pk>/items", methods=["GET"])
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.get_items",
        log_to_statsd=False,
    )
    def get_items(self, pk: int) -> Any:
        """Get items in a collection.
        
        ---
        get:
          description: >-
            Get all items (dashboards, charts, datasets) in a collection.
          parameters:
          - in: path
            schema:
              type: integer
            name: pk
          - in: query
            schema:
              type: object
              properties:
                item_type:
                  type: string
                  enum: [dashboard, chart, dataset]
                  description: Filter by item type
                limit:
                  type: integer
                  description: Limit number of results
                offset:
                  type: integer
                  description: Offset for pagination
          responses:
            200:
              description: Collection items
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/CollectionItemsResponseSchema'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            # Get query parameters
            item_type_str = request.args.get("item_type")
            item_type = CollectionItemType(item_type_str) if item_type_str else None
            limit = request.args.get("limit", type=int)
            offset = request.args.get("offset", type=int)
            
            # Get items from DAO
            items = CollectionDAO.get_collection_items(
                collection_id=pk,
                item_type=item_type,
                limit=limit,
                offset=offset,
            )
            
            return self.response(200, result=items)
            
        except CollectionNotFoundError:
            return self.response_404()
        except ValueError as ex:
            return self.response_400(message=str(ex))
        except Exception as ex:
            logger.exception("Error getting items for collection %d: %s", pk, str(ex))
            return self.response_400(message=str(ex))

    @expose("/", methods=["POST"])
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.post",
        log_to_statsd=False,
    )
    def post(self) -> Any:
        """Create a new collection.
        
        ---
        post:
          description: >-
            Create a new collection.
          requestBody:
            description: Collection details
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/CollectionCreateSchema'
          responses:
            201:
              description: Collection created
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/CollectionSchema'
            400:
              $ref: '#/components/responses/400'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            # Validate request data
            json_data = request.get_json()
            if not json_data:
                return self.response_400(message="Request body is required")
            
            try:
                data = self.add_model_schema.load(json_data)
            except ValidationError as ex:
                return self.response_400(message=f"Validation error: {ex.messages}")
            
            # Create collection
            collection = CollectionDAO.create_collection(
                name=data["name"],
                slug=data["slug"],
                description=data.get("description"),
                parent_id=data.get("parent_id"),
                is_official=data.get("is_official", False),
                created_by=g.user,
            )
            
            result = self.show_model_schema.dump(collection)
            return self.response(201, result=result)
            
        except CollectionSlugExistsError as ex:
            return self.response_400(message=str(ex))
        except CollectionCycleError as ex:
            return self.response_400(message=str(ex))
        except CollectionNotFoundError as ex:
            return self.response_404(message=str(ex))
        except Exception as ex:
            logger.exception("Error creating collection: %s", str(ex))
            return self.response_400(message=str(ex))

    @expose("/<int:pk>", methods=["PUT"])
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.put",
        log_to_statsd=False,
    )
    def put(self, pk: int) -> Any:
        """Update an existing collection.
        
        ---
        put:
          description: >-
            Update a collection.
          parameters:
          - in: path
            schema:
              type: integer
            name: pk
          requestBody:
            description: Collection updates
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/CollectionUpdateSchema'
          responses:
            200:
              description: Collection updated
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/CollectionSchema'
            400:
              $ref: '#/components/responses/400'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            # Validate request data
            json_data = request.get_json()
            if not json_data:
                return self.response_400(message="Request body is required")
            
            try:
                data = self.edit_model_schema.load(json_data)
            except ValidationError as ex:
                return self.response_400(message=f"Validation error: {ex.messages}")
            
            # Update collection
            collection = CollectionDAO.update_collection(
                collection_id=pk,
                name=data.get("name"),
                slug=data.get("slug"),
                description=data.get("description"),
                parent_id=data.get("parent_id"),
                is_official=data.get("is_official"),
                changed_by=g.user,
            )
            
            result = self.show_model_schema.dump(collection)
            return self.response(200, result=result)
            
        except CollectionNotFoundError:
            return self.response_404()
        except CollectionSlugExistsError as ex:
            return self.response_400(message=str(ex))
        except CollectionCycleError as ex:
            return self.response_400(message=str(ex))
        except Exception as ex:
            logger.exception("Error updating collection %d: %s", pk, str(ex))
            return self.response_400(message=str(ex))

    @expose("/<int:pk>", methods=["DELETE"])
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.delete",
        log_to_statsd=False,
    )
    def delete(self, pk: int) -> Any:
        """Delete a collection.
        
        ---
        delete:
          description: >-
            Delete a collection. Child collections will be moved to the parent.
          parameters:
          - in: path
            schema:
              type: integer
            name: pk
          responses:
            200:
              description: Collection deleted
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/SuccessSchema'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            success = CollectionDAO.delete_collection(pk)
            if not success:
                return self.response_404()
            
            return self.response(200, message="Collection deleted successfully")
            
        except Exception as ex:
            logger.exception("Error deleting collection %d: %s", pk, str(ex))
            return self.response_400(message=str(ex))

    @expose("/<int:pk>/items", methods=["POST"])
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.add_items",
        log_to_statsd=False,
    )
    def add_items(self, pk: int) -> Any:
        """Add items to a collection.
        
        ---
        post:
          description: >-
            Add items (dashboards, charts, datasets) to a collection.
          parameters:
          - in: path
            schema:
              type: integer
            name: pk
          requestBody:
            description: Items to add
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/AddItemsToCollectionSchema'
          responses:
            200:
              description: Items added successfully
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/SuccessSchema'
            400:
              $ref: '#/components/responses/400'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            # Validate request data
            json_data = request.get_json()
            if not json_data:
                return self.response_400(message="Request body is required")
            
            try:
                data = self.add_items_schema.load(json_data)
            except ValidationError as ex:
                return self.response_400(message=f"Validation error: {ex.messages}")
            
            # Add items
            added_count = 0
            errors = []
            
            for item in data["items"]:
                try:
                    CollectionDAO.add_item_to_collection(
                        collection_id=pk,
                        item_type=CollectionItemType(item["type"]),
                        item_id=item["id"],
                        created_by=g.user,
                    )
                    added_count += 1
                except CollectionItemAlreadyExistsError as ex:
                    errors.append(f"{item['type']} {item['id']}: {str(ex)}")
                except Exception as ex:
                    errors.append(f"{item['type']} {item['id']}: {str(ex)}")
            
            message = f"Added {added_count} items to collection"
            if errors:
                message += f". Errors: {'; '.join(errors)}"
            
            return self.response(200, message=message)
            
        except CollectionNotFoundError:
            return self.response_404()
        except Exception as ex:
            logger.exception("Error adding items to collection %d: %s", pk, str(ex))
            return self.response_400(message=str(ex))

    @expose("/<int:pk>/items", methods=["DELETE"])
    @protect()
    @safe
    @event_logger.log_this_with_context(
        action=lambda self, *args, **kwargs: f"{self.__class__.__name__}.remove_items",
        log_to_statsd=False,
    )
    def remove_items(self, pk: int) -> Any:
        """Remove items from a collection.
        
        ---
        delete:
          description: >-
            Remove items from a collection.
          parameters:
          - in: path
            schema:
              type: integer
            name: pk
          requestBody:
            description: Items to remove
            required: true
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/RemoveItemsFromCollectionSchema'
          responses:
            200:
              description: Items removed successfully
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/SuccessSchema'
            400:
              $ref: '#/components/responses/400'
            404:
              $ref: '#/components/responses/404'
            500:
              $ref: '#/components/responses/500'
        """
        try:
            # Validate request data
            json_data = request.get_json()
            if not json_data:
                return self.response_400(message="Request body is required")
            
            try:
                data = self.remove_items_schema.load(json_data)
            except ValidationError as ex:
                return self.response_400(message=f"Validation error: {ex.messages}")
            
            # Remove items
            removed_count = 0
            errors = []
            
            for item in data["items"]:
                try:
                    CollectionDAO.remove_item_from_collection(
                        collection_id=pk,
                        item_type=CollectionItemType(item["type"]),
                        item_id=item["id"],
                    )
                    removed_count += 1
                except CollectionItemNotFoundError as ex:
                    errors.append(f"{item['type']} {item['id']}: {str(ex)}")
                except Exception as ex:
                    errors.append(f"{item['type']} {item['id']}: {str(ex)}")
            
            message = f"Removed {removed_count} items from collection"
            if errors:
                message += f". Errors: {'; '.join(errors)}"
            
            return self.response(200, message=message)
            
        except CollectionNotFoundError:
            return self.response_404()
        except Exception as ex:
            logger.exception("Error removing items from collection %d: %s", pk, str(ex))
            return self.response_400(message=str(ex))

    # Permission management endpoints (placeholder for now)
    @expose("/<int:pk>/permissions", methods=["GET"])
    @protect()
    @safe
    def get_permissions(self, pk: int) -> Any:
        """Get collection permissions (placeholder)."""
        # TODO: Implement permission management in Phase 3
        return self.response(200, result={"permissions": [], "message": "Permission management coming in Phase 3"})

    @expose("/<int:pk>/permissions", methods=["POST"])
    @protect()
    @safe
    def set_permissions(self, pk: int) -> Any:
        """Set collection permissions (placeholder)."""
        # TODO: Implement permission management in Phase 3
        return self.response(200, message="Permission management coming in Phase 3")
