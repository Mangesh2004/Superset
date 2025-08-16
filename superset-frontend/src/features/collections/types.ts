/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export type CollectionItemType = 'dashboard' | 'chart' | 'dataset';

export interface Collection {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  is_official: boolean;
  item_count: number;
  created_on: string;
  changed_on: string;
  created_by_fk?: number;
  changed_by_fk?: number;
  is_root: boolean;
  depth: number;
  breadcrumb_path: string;
  total_item_count: number;
}

export interface CollectionTreeNode {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  description?: string;
  is_official: boolean;
  item_count: number;
  total_item_count: number;
  depth: number;
  children: CollectionTreeNode[];
}

export interface CollectionTree {
  collections: CollectionTreeNode[];
  total_count: number;
}

export interface CollectionItem {
  id: number;
  type: CollectionItemType;
  name: string;
  url?: string;
  created_on: string;
  
  // Dashboard fields
  dashboard_title?: string;
  slug?: string;
  
  // Chart fields
  slice_name?: string;
  viz_type?: string;
  
  // Dataset fields
  table_name?: string;
  schema?: string;
  database_name?: string;
}

export interface CollectionItems {
  dashboards: CollectionItem[];
  charts: CollectionItem[];
  datasets: CollectionItem[];
  total_count: number;
}

export interface CreateCollectionRequest {
  name: string;
  slug: string;
  description?: string;
  parent_id?: number;
  is_official?: boolean;
}

export interface UpdateCollectionRequest {
  name?: string;
  slug?: string;
  description?: string;
  parent_id?: number;
  is_official?: boolean;
}

export interface ItemToAdd {
  type: CollectionItemType;
  id: number;
}

export interface AddItemsRequest {
  items: ItemToAdd[];
}

export interface ItemToRemove {
  type: CollectionItemType;
  id: number;
}

export interface RemoveItemsRequest {
  items: ItemToRemove[];
}

export interface CollectionPermission {
  id: number;
  collection_id: number;
  role_id: number;
  role_name: string;
  can_view: boolean;
  can_curate: boolean;
  created_on: string;
  created_by_fk?: number;
}

export interface PermissionToSet {
  role_id: number;
  can_view: boolean;
  can_curate: boolean;
}

export interface SetPermissionsRequest {
  permissions: PermissionToSet[];
}

export interface ApiResponse<T = any> {
  result?: T;
  message?: string;
  error_type?: string;
  details?: Record<string, any>;
}

export interface ApiError {
  message: string;
  error_type?: string;
  details?: Record<string, any>;
}

// UI State Types
export interface CollectionsState {
  tree: CollectionTreeNode[];
  selectedCollection: Collection | null;
  selectedItems: CollectionItems | null;
  loading: boolean;
  error: string | null;
  expandedNodes: Set<number>;
}

export interface CollectionFormData {
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  is_official: boolean;
}

export interface BulkMoveState {
  isOpen: boolean;
  selectedItems: Array<{
    id: number;
    type: CollectionItemType;
    name: string;
  }>;
  targetCollection: CollectionTreeNode | null;
}

// Component Props Types
export interface CollectionTreeProps {
  tree: CollectionTreeNode[];
  selectedCollectionId?: number;
  onSelectCollection: (collection: CollectionTreeNode) => void;
  onCreateCollection?: (parentId?: number) => void;
  onDeleteCollection?: (collection: CollectionTreeNode) => void;
  expandedNodes: Set<number>;
  onToggleNode: (nodeId: number) => void;
  loading?: boolean;
}

export interface CollectionItemGridProps {
  items: CollectionItems;
  loading?: boolean;
  onRefresh?: () => void;
  onMoveItems?: (items: ItemToRemove[]) => void;
  onAddItems?: () => void;
}

export interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCollectionRequest) => void;
  parentCollection?: CollectionTreeNode;
  tree: CollectionTreeNode[];
}

export interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targetCollectionId: number, items: ItemToAdd[]) => void;
  items: Array<{
    id: number;
    type: CollectionItemType;
    name: string;
  }>;
  tree: CollectionTreeNode[];
}

// Hook Return Types
export interface UseCollectionsTree {
  tree: CollectionTreeNode[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseCollectionItems {
  items: CollectionItems | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseCollectionActions {
  createCollection: (data: CreateCollectionRequest) => Promise<Collection>;
  updateCollection: (id: number, data: UpdateCollectionRequest) => Promise<Collection>;
  deleteCollection: (id: number) => Promise<void>;
  addItems: (collectionId: number, items: ItemToAdd[]) => Promise<void>;
  removeItems: (collectionId: number, items: ItemToRemove[]) => Promise<void>;
  loading: boolean;
  error: string | null;
}
