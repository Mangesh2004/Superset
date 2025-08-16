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
"""add collections tables

Revision ID: 68daa03e4a41
Revises: cd1fb11291f2
Create Date: 2025-08-08 16:33:00.000000

"""

import sqlalchemy as sa
from alembic import op

from superset.migrations.shared.utils import (
    create_fks_for_table,
    create_table,
    drop_fks_for_table,
    drop_table,
)

# revision identifiers, used by Alembic.
revision = "68daa03e4a41"
down_revision = "cd1fb11291f2"


def upgrade():
    """Create collections tables for organizing dashboards, charts, and datasets."""
    
    # 1. Create sp_collection table (main collections)
    create_table(
        "sp_collection",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("uuid", sa.String(36), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("is_official", sa.Boolean(), nullable=False, default=False),
        sa.Column("item_count", sa.Integer(), nullable=False, default=0),
        sa.Column("created_on", sa.DateTime(), nullable=True),
        sa.Column("changed_on", sa.DateTime(), nullable=True),
        sa.Column("created_by_fk", sa.Integer(), nullable=True),
        sa.Column("changed_by_fk", sa.Integer(), nullable=True),
    )
    
    # Add indexes for sp_collection
    with op.batch_alter_table("sp_collection") as batch_op:
        batch_op.create_index("idx_sp_collection_parent_id", ["parent_id"])
        batch_op.create_index("idx_sp_collection_slug", ["slug"])
        batch_op.create_index("idx_sp_collection_created_by", ["created_by_fk"])
        batch_op.create_index("idx_sp_collection_name", ["name"])
    
    # Add foreign keys for sp_collection
    create_fks_for_table(
        "fk_sp_collection_parent_id_sp_collection",
        "sp_collection",
        "sp_collection",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_created_by_fk_ab_user",
        "sp_collection",
        "ab_user",
        ["created_by_fk"],
        ["id"],
    )
    
    create_fks_for_table(
        "fk_sp_collection_changed_by_fk_ab_user",
        "sp_collection",
        "ab_user",
        ["changed_by_fk"],
        ["id"],
    )
    
    # 2. Create sp_collection_dashboard table (dashboard links)
    create_table(
        "sp_collection_dashboard",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collection_id", sa.Integer(), nullable=False),
        sa.Column("dashboard_id", sa.Integer(), nullable=False),
        sa.Column("created_on", sa.DateTime(), nullable=True),
        sa.Column("changed_on", sa.DateTime(), nullable=True),
        sa.Column("created_by_fk", sa.Integer(), nullable=True),
        sa.Column("changed_by_fk", sa.Integer(), nullable=True),
    )
    
    # Add unique constraint for sp_collection_dashboard
    with op.batch_alter_table("sp_collection_dashboard") as batch_op:
        batch_op.create_unique_constraint("uq_collection_dashboard", ["collection_id", "dashboard_id"])
    
    # Add indexes for sp_collection_dashboard
    with op.batch_alter_table("sp_collection_dashboard") as batch_op:
        batch_op.create_index("idx_sp_collection_dashboard_collection", ["collection_id"])
        batch_op.create_index("idx_sp_collection_dashboard_dashboard", ["dashboard_id"])
    
    # Add foreign keys for sp_collection_dashboard
    create_fks_for_table(
        "fk_sp_collection_dashboard_collection_id_sp_collection",
        "sp_collection_dashboard",
        "sp_collection",
        ["collection_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_dashboard_dashboard_id_dashboards",
        "sp_collection_dashboard",
        "dashboards",
        ["dashboard_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_dashboard_created_by_fk_ab_user",
        "sp_collection_dashboard",
        "ab_user",
        ["created_by_fk"],
        ["id"],
    )
    
    create_fks_for_table(
        "fk_sp_collection_dashboard_changed_by_fk_ab_user",
        "sp_collection_dashboard",
        "ab_user",
        ["changed_by_fk"],
        ["id"],
    )
    
    # 3. Create sp_collection_chart table (chart links)
    create_table(
        "sp_collection_chart",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collection_id", sa.Integer(), nullable=False),
        sa.Column("chart_id", sa.Integer(), nullable=False),
        sa.Column("created_on", sa.DateTime(), nullable=True),
        sa.Column("changed_on", sa.DateTime(), nullable=True),
        sa.Column("created_by_fk", sa.Integer(), nullable=True),
        sa.Column("changed_by_fk", sa.Integer(), nullable=True),
    )
    
    # Add unique constraint for sp_collection_chart
    with op.batch_alter_table("sp_collection_chart") as batch_op:
        batch_op.create_unique_constraint("uq_collection_chart", ["collection_id", "chart_id"])
    
    # Add indexes for sp_collection_chart
    with op.batch_alter_table("sp_collection_chart") as batch_op:
        batch_op.create_index("idx_sp_collection_chart_collection", ["collection_id"])
        batch_op.create_index("idx_sp_collection_chart_chart", ["chart_id"])
    
    # Add foreign keys for sp_collection_chart
    create_fks_for_table(
        "fk_sp_collection_chart_collection_id_sp_collection",
        "sp_collection_chart",
        "sp_collection",
        ["collection_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_chart_chart_id_slices",
        "sp_collection_chart",
        "slices",
        ["chart_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_chart_created_by_fk_ab_user",
        "sp_collection_chart",
        "ab_user",
        ["created_by_fk"],
        ["id"],
    )
    
    create_fks_for_table(
        "fk_sp_collection_chart_changed_by_fk_ab_user",
        "sp_collection_chart",
        "ab_user",
        ["changed_by_fk"],
        ["id"],
    )
    
    # 4. Create sp_collection_dataset table (dataset links)
    create_table(
        "sp_collection_dataset",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collection_id", sa.Integer(), nullable=False),
        sa.Column("dataset_id", sa.Integer(), nullable=False),
        sa.Column("created_on", sa.DateTime(), nullable=True),
        sa.Column("changed_on", sa.DateTime(), nullable=True),
        sa.Column("created_by_fk", sa.Integer(), nullable=True),
        sa.Column("changed_by_fk", sa.Integer(), nullable=True),
    )
    
    # Add unique constraint for sp_collection_dataset
    with op.batch_alter_table("sp_collection_dataset") as batch_op:
        batch_op.create_unique_constraint("uq_collection_dataset", ["collection_id", "dataset_id"])
    
    # Add indexes for sp_collection_dataset
    with op.batch_alter_table("sp_collection_dataset") as batch_op:
        batch_op.create_index("idx_sp_collection_dataset_collection", ["collection_id"])
        batch_op.create_index("idx_sp_collection_dataset_dataset", ["dataset_id"])
    
    # Add foreign keys for sp_collection_dataset
    create_fks_for_table(
        "fk_sp_collection_dataset_collection_id_sp_collection",
        "sp_collection_dataset",
        "sp_collection",
        ["collection_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_dataset_dataset_id_tables",
        "sp_collection_dataset",
        "tables",
        ["dataset_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_dataset_created_by_fk_ab_user",
        "sp_collection_dataset",
        "ab_user",
        ["created_by_fk"],
        ["id"],
    )
    
    create_fks_for_table(
        "fk_sp_collection_dataset_changed_by_fk_ab_user",
        "sp_collection_dataset",
        "ab_user",
        ["changed_by_fk"],
        ["id"],
    )
    
    # 5. Create sp_collection_permission table (ACL)
    create_table(
        "sp_collection_permission",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("collection_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("can_view", sa.Boolean(), nullable=False, default=False),
        sa.Column("can_curate", sa.Boolean(), nullable=False, default=False),
        sa.Column("created_on", sa.DateTime(), nullable=True),
        sa.Column("changed_on", sa.DateTime(), nullable=True),
        sa.Column("created_by_fk", sa.Integer(), nullable=True),
        sa.Column("changed_by_fk", sa.Integer(), nullable=True),
    )
    
    # Add unique constraint for sp_collection_permission
    with op.batch_alter_table("sp_collection_permission") as batch_op:
        batch_op.create_unique_constraint("uq_collection_role", ["collection_id", "role_id"])
    
    # Add indexes for sp_collection_permission
    with op.batch_alter_table("sp_collection_permission") as batch_op:
        batch_op.create_index("idx_sp_collection_permission_collection", ["collection_id"])
        batch_op.create_index("idx_sp_collection_permission_role", ["role_id"])
    
    # Add foreign keys for sp_collection_permission
    create_fks_for_table(
        "fk_sp_collection_permission_collection_id_sp_collection",
        "sp_collection_permission",
        "sp_collection",
        ["collection_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_permission_role_id_ab_role",
        "sp_collection_permission",
        "ab_role",
        ["role_id"],
        ["id"],
        ondelete="CASCADE",
    )
    
    create_fks_for_table(
        "fk_sp_collection_permission_created_by_fk_ab_user",
        "sp_collection_permission",
        "ab_user",
        ["created_by_fk"],
        ["id"],
    )
    
    create_fks_for_table(
        "fk_sp_collection_permission_changed_by_fk_ab_user",
        "sp_collection_permission",
        "ab_user",
        ["changed_by_fk"],
        ["id"],
    )


def downgrade():
    """Drop all collections tables."""
    
    # Drop foreign keys first
    drop_fks_for_table("sp_collection_permission", ["collection_id", "role_id", "created_by_fk"])
    drop_fks_for_table("sp_collection_dataset", ["collection_id", "dataset_id", "created_by_fk"])
    drop_fks_for_table("sp_collection_chart", ["collection_id", "chart_id", "created_by_fk"])
    drop_fks_for_table("sp_collection_dashboard", ["collection_id", "dashboard_id", "created_by_fk"])
    drop_fks_for_table("sp_collection", ["parent_id", "created_by_fk", "changed_by_fk"])
    
    # Drop tables in reverse order
    drop_table("sp_collection_permission")
    drop_table("sp_collection_dataset")
    drop_table("sp_collection_chart")
    drop_table("sp_collection_dashboard")
    drop_table("sp_collection")
