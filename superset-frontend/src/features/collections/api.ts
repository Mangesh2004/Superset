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

import { SupersetClient } from '@superset-ui/core';
import rison from 'rison';
import {
  AddItemsRequest,
  ApiResponse,
  Collection,
  CollectionItems,
  CollectionPermission,
  CollectionTree,
  CreateCollectionRequest,
  RemoveItemsRequest,
  SetPermissionsRequest,
  UpdateCollectionRequest,
} from './types';

const API_BASE = '/api/v1/collections';

export class CollectionsApi {
  /**
   * Get the complete collections tree
   */
  static async getTree(params?: {
    root_id?: number;
    max_depth?: number;
  }): Promise<CollectionTree> {
    const queryParams = new URLSearchParams();
    if (params?.root_id) {
      queryParams.append('root_id', params.root_id.toString());
    }
    if (params?.max_depth) {
      queryParams.append('max_depth', params.max_depth.toString());
    }

    const url = `${API_BASE}/tree${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await SupersetClient.get({
      endpoint: url,
    });

    return response.json.result;
  }

  /**
   * Get a single collection by ID
   */
  static async getCollection(id: number): Promise<Collection> {
    const response = await SupersetClient.get({
      endpoint: `${API_BASE}/${id}`,
    });

    return response.json.result;
  }

  /**
   * Get items in a collection
   */
  static async getCollectionItems(
    id: number,
    params?: {
      item_type?: 'dashboard' | 'chart' | 'dataset';
      limit?: number;
      offset?: number;
    },
  ): Promise<CollectionItems> {
    const queryParams = new URLSearchParams();
    if (params?.item_type) {
      queryParams.append('item_type', params.item_type);
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString());
    }

    const url = `${API_BASE}/${id}/items${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await SupersetClient.get({
      endpoint: url,
    });

    return response.json.result;
  }

  /**
   * Fetch all dashboards (optionally filtered by search)
   */
  static async getAllDashboards(search?: string) {
    const query = {
      page: 0,
      page_size: 2000,
      ...(search
        ? { filters: [{ col: 'dashboard_title', opr: 'ct', value: search }] }
        : {}),
      order_column: 'changed_on_delta_humanized',
      order_direction: 'desc' as const,
    };
    const response = await SupersetClient.get({
      endpoint: `/api/v1/dashboard/?q=${rison.encode(query)}`,
    });
    return response.json?.result || [];
  }

  /**
   * Fetch all charts (optionally filtered by search)
   */
  static async getAllCharts(search?: string) {
    const query = {
      page: 0,
      page_size: 2000,
      ...(search
        ? { filters: [{ col: 'slice_name', opr: 'ct', value: search }] }
        : {}),
      order_column: 'changed_on_delta_humanized',
      order_direction: 'desc' as const,
    };
    const response = await SupersetClient.get({
      endpoint: `/api/v1/chart/?q=${rison.encode(query)}`,
    });
    return response.json?.result || [];
  }

  /**
   * Fetch all datasets (optionally filtered by search)
   */
  static async getAllDatasets(search?: string) {
    const query = {
      page: 0,
      page_size: 2000,
      ...(search
        ? { filters: [{ col: 'table_name', opr: 'ct', value: search }] }
        : {}),
      order_column: 'changed_on_delta_humanized',
      order_direction: 'desc' as const,
    };
    const response = await SupersetClient.get({
      endpoint: `/api/v1/dataset/?q=${rison.encode(query)}`,
    });
    return response.json?.result || [];
  }

  /**
   * Create a new collection
   */
  static async createCollection(data: CreateCollectionRequest): Promise<Collection> {
    const response = await SupersetClient.post({
      endpoint: API_BASE,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json.result;
  }

  /**
   * Update an existing collection
   */
  static async updateCollection(
    id: number,
    data: UpdateCollectionRequest,
  ): Promise<Collection> {
    const response = await SupersetClient.put({
      endpoint: `${API_BASE}/${id}`,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json.result;
  }

  /**
   * Delete a collection
   */
  static async deleteCollection(id: number): Promise<void> {
    await SupersetClient.delete({
      endpoint: `${API_BASE}/${id}`,
    });
  }

  /**
   * Add items to a collection
   */
  static async addItemsToCollection(
    id: number,
    data: AddItemsRequest,
  ): Promise<ApiResponse> {
    const response = await SupersetClient.post({
      endpoint: `${API_BASE}/${id}/items`,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json;
  }

  /**
   * Remove items from a collection
   */
  static async removeItemsFromCollection(
    id: number,
    data: RemoveItemsRequest,
  ): Promise<ApiResponse> {
    const response = await SupersetClient.delete({
      endpoint: `${API_BASE}/${id}/items`,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json;
  }

  /**
   * Get collection permissions
   */
  static async getCollectionPermissions(id: number): Promise<CollectionPermission[]> {
    const response = await SupersetClient.get({
      endpoint: `${API_BASE}/${id}/permissions`,
    });

    return response.json.result;
  }

  /**
   * Set collection permissions
   */
  static async setCollectionPermissions(
    id: number,
    data: SetPermissionsRequest,
  ): Promise<ApiResponse> {
    const response = await SupersetClient.post({
      endpoint: `${API_BASE}/${id}/permissions`,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json;
  }
}

// Convenience functions for common operations
export const collectionsApi = {
  // Tree operations
  getTree: CollectionsApi.getTree,
  
  // Collection CRUD
  get: CollectionsApi.getCollection,
  create: CollectionsApi.createCollection,
  update: CollectionsApi.updateCollection,
  delete: CollectionsApi.deleteCollection,
  
  // Items management
  getItems: CollectionsApi.getCollectionItems,
  addItems: CollectionsApi.addItemsToCollection,
  removeItems: CollectionsApi.removeItemsFromCollection,
  
  // Permissions management
  getPermissions: CollectionsApi.getCollectionPermissions,
  setPermissions: CollectionsApi.setCollectionPermissions,
};

export default collectionsApi;
