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
"""Marshmallow schemas for Collections API."""
from __future__ import annotations

from marshmallow import fields, post_load, Schema, validates_schema, ValidationError
from marshmallow.validate import Length, OneOf, Range

from superset.collections.constants import CollectionItemType


class CollectionSchema(Schema):
    """Schema for Collection objects."""
    
    id = fields.Integer(dump_only=True)
    uuid = fields.String(dump_only=True)
    name = fields.String(required=True, validate=Length(min=1, max=255))
    slug = fields.String(required=True, validate=Length(min=1, max=255))
    description = fields.String(allow_none=True, validate=Length(max=1000))
    parent_id = fields.Integer(allow_none=True)
    is_official = fields.Boolean(missing=False)
    item_count = fields.Integer(dump_only=True)
    created_on = fields.DateTime(dump_only=True)
    changed_on = fields.DateTime(dump_only=True)
    created_by_fk = fields.Integer(dump_only=True)
    changed_by_fk = fields.Integer(dump_only=True)
    
    # Computed fields
    is_root = fields.Boolean(dump_only=True)
    depth = fields.Integer(dump_only=True)
    breadcrumb_path = fields.String(dump_only=True)
    total_item_count = fields.Integer(dump_only=True)

    @validates_schema
    def validate_slug(self, data: dict, **kwargs) -> None:
        """Validate slug format."""
        slug = data.get("slug")
        if slug:
            # Basic validation - more detailed validation in model
            if not slug.replace("-", "").replace("_", "").replace(" ", "").isalnum():
                raise ValidationError("Slug can only contain letters, numbers, hyphens, underscores, and spaces")


class CollectionTreeNodeSchema(Schema):
    """Schema for tree node representation of collections."""
    
    id = fields.Integer(required=True)
    uuid = fields.String(required=True)
    name = fields.String(required=True)
    slug = fields.String(required=True)
    description = fields.String(allow_none=True)
    is_official = fields.Boolean(required=True)
    item_count = fields.Integer(required=True)
    total_item_count = fields.Integer(required=True)
    depth = fields.Integer(required=True)
    children = fields.List(fields.Nested(lambda: CollectionTreeNodeSchema()), missing=[])


class CollectionCreateSchema(Schema):
    """Schema for creating a new collection."""
    
    name = fields.String(required=True, validate=Length(min=1, max=255))
    slug = fields.String(required=True, validate=Length(min=1, max=255))
    description = fields.String(allow_none=True, validate=Length(max=1000))
    parent_id = fields.Integer(allow_none=True)
    is_official = fields.Boolean(missing=False)

    @validates_schema
    def validate_slug(self, data: dict, **kwargs) -> None:
        """Validate slug format."""
        slug = data.get("slug")
        if slug:
            import re
            if not re.match(r"^[a-z0-9-_]+$", slug.lower()):
                raise ValidationError("Slug can only contain lowercase letters, numbers, hyphens, and underscores")


class CollectionUpdateSchema(Schema):
    """Schema for updating an existing collection."""
    
    name = fields.String(validate=Length(min=1, max=255))
    slug = fields.String(validate=Length(min=1, max=255))
    description = fields.String(allow_none=True, validate=Length(max=1000))
    parent_id = fields.Integer(allow_none=True)
    is_official = fields.Boolean()

    @validates_schema
    def validate_slug(self, data: dict, **kwargs) -> None:
        """Validate slug format."""
        slug = data.get("slug")
        if slug:
            import re
            if not re.match(r"^[a-z0-9-_]+$", slug.lower()):
                raise ValidationError("Slug can only contain lowercase letters, numbers, hyphens, and underscores")


class CollectionItemSchema(Schema):
    """Schema for items within a collection."""
    
    id = fields.Integer(required=True)
    type = fields.String(required=True, validate=OneOf([t.value for t in CollectionItemType]))
    name = fields.String(required=True)
    url = fields.String(allow_none=True)
    created_on = fields.DateTime(dump_only=True)
    
    # Type-specific fields
    # Dashboard fields
    dashboard_title = fields.String(allow_none=True)
    slug = fields.String(allow_none=True)
    
    # Chart fields
    slice_name = fields.String(allow_none=True)
    viz_type = fields.String(allow_none=True)
    
    # Dataset fields
    table_name = fields.String(allow_none=True)
    schema = fields.String(allow_none=True)
    database_name = fields.String(allow_none=True)


class CollectionItemsResponseSchema(Schema):
    """Schema for collection items response."""
    
    dashboards = fields.List(fields.Nested(CollectionItemSchema))
    charts = fields.List(fields.Nested(CollectionItemSchema))
    datasets = fields.List(fields.Nested(CollectionItemSchema))
    total_count = fields.Integer()


class AddItemsToCollectionSchema(Schema):
    """Schema for adding items to a collection."""
    
    items = fields.List(fields.Nested(lambda: ItemToAddSchema()), required=True, validate=Length(min=1))


class ItemToAddSchema(Schema):
    """Schema for individual item to add to collection."""
    
    type = fields.String(required=True, validate=OneOf([t.value for t in CollectionItemType]))
    id = fields.Integer(required=True, validate=Range(min=1))


class RemoveItemsFromCollectionSchema(Schema):
    """Schema for removing items from a collection."""
    
    items = fields.List(fields.Nested(lambda: ItemToRemoveSchema()), required=True, validate=Length(min=1))


class ItemToRemoveSchema(Schema):
    """Schema for individual item to remove from collection."""
    
    type = fields.String(required=True, validate=OneOf([t.value for t in CollectionItemType]))
    id = fields.Integer(required=True, validate=Range(min=1))


class CollectionPermissionSchema(Schema):
    """Schema for collection permissions."""
    
    id = fields.Integer(dump_only=True)
    collection_id = fields.Integer(required=True)
    role_id = fields.Integer(required=True)
    role_name = fields.String(dump_only=True)
    can_view = fields.Boolean(required=True)
    can_curate = fields.Boolean(required=True)
    created_on = fields.DateTime(dump_only=True)
    created_by_fk = fields.Integer(dump_only=True)

    @validates_schema
    def validate_permissions(self, data: dict, **kwargs) -> None:
        """Ensure curate permission implies view permission."""
        if data.get("can_curate") and not data.get("can_view"):
            raise ValidationError("Curate permission requires view permission")


class SetCollectionPermissionsSchema(Schema):
    """Schema for setting collection permissions."""
    
    permissions = fields.List(
        fields.Nested(lambda: PermissionToSetSchema()), 
        required=True,
        validate=Length(min=1)
    )


class PermissionToSetSchema(Schema):
    """Schema for individual permission to set."""
    
    role_id = fields.Integer(required=True, validate=Range(min=1))
    can_view = fields.Boolean(required=True)
    can_curate = fields.Boolean(required=True)

    @validates_schema
    def validate_permissions(self, data: dict, **kwargs) -> None:
        """Ensure curate permission implies view permission."""
        if data.get("can_curate") and not data.get("can_view"):
            raise ValidationError("Curate permission requires view permission")


class CollectionTreeSchema(Schema):
    """Schema for collection tree response."""
    
    collections = fields.List(fields.Nested(CollectionTreeNodeSchema), required=True)
    total_count = fields.Integer(required=True)


class ErrorSchema(Schema):
    """Schema for error responses."""
    
    message = fields.String(required=True)
    error_type = fields.String(allow_none=True)
    details = fields.Dict(allow_none=True)


class SuccessSchema(Schema):
    """Schema for success responses."""
    
    message = fields.String(required=True)
    result = fields.Dict(allow_none=True)
