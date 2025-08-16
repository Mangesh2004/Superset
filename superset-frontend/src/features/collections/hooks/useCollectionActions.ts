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

import { useCallback, useState } from 'react';
import { t } from '@superset-ui/core';
import { addSuccessToast, addDangerToast } from 'src/components/MessageToasts/actions';
import { collectionsApi, CollectionsApi } from '../api';
import {
  Collection,
  CreateCollectionRequest,
  ItemToAdd,
  ItemToRemove,
  UpdateCollectionRequest,
  UseCollectionActions,
} from '../types';

export const useCollectionActions = (): UseCollectionActions => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCollection = useCallback(async (data: CreateCollectionRequest): Promise<Collection> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await collectionsApi.create(data);
      addSuccessToast(t('Collection "%s" created successfully', data.name));
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create collection';
      setError(errorMessage);
      addDangerToast(t('Failed to create collection: %s', errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCollection = useCallback(async (
    id: number,
    data: UpdateCollectionRequest,
  ): Promise<Collection> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await collectionsApi.update(id, data);
      addSuccessToast(t('Collection updated successfully'));
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update collection';
      setError(errorMessage);
      addDangerToast(t('Failed to update collection: %s', errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCollection = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await collectionsApi.delete(id);
      addSuccessToast(t('Collection deleted successfully'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete collection';
      setError(errorMessage);
      addDangerToast(t('Failed to delete collection: %s', errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addItems = useCallback(async (
    collectionId: number,
    items: ItemToAdd[],
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await collectionsApi.addItems(collectionId, { items });
      const itemCount = items.length;
      addSuccessToast(t('Added %s item(s) to collection', itemCount));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add items to collection';
      setError(errorMessage);
      addDangerToast(t('Failed to add items: %s', errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItems = useCallback(async (
    collectionId: number,
    items: ItemToRemove[],
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await collectionsApi.removeItems(collectionId, { items });
      const itemCount = items.length;
      addSuccessToast(t('Removed %s item(s) from collection', itemCount));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove items from collection';
      setError(errorMessage);
      addDangerToast(t('Failed to remove items: %s', errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createCollection,
    updateCollection,
    deleteCollection,
    addItems,
    removeItems,
    loading,
    error,
  };
};
