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

import { useCallback, useEffect, useState } from 'react';
import { collectionsApi } from '../api';
import { CollectionItems, UseCollectionItems } from '../types';

export const useCollectionItems = (
  collectionId?: number,
  params?: {
    item_type?: 'dashboard' | 'chart' | 'dataset';
    limit?: number;
    offset?: number;
  },
): UseCollectionItems => {
  const [items, setItems] = useState<CollectionItems | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!collectionId) {
      setItems(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await collectionsApi.getItems(collectionId, params);
      setItems(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collection items';
      setError(errorMessage);
      console.error('Error fetching collection items:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionId, params?.item_type, params?.limit, params?.offset]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  };
};
