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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '@superset-ui/core';
import { CollectionsApi } from '../api';

type AvailableItem = {
  id: number;
  type: 'dashboard' | 'chart' | 'dataset';
  name: string;
  description?: string;
};

export function useAvailableItems(search?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AvailableItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboards, charts, datasets] = await Promise.all([
        CollectionsApi.getAllDashboards(search),
        CollectionsApi.getAllCharts(search),
        CollectionsApi.getAllDatasets(search),
      ]);

      const dashboardItems: AvailableItem[] = (dashboards || []).map((d: any) => ({
        id: d.id,
        type: 'dashboard',
        name: d.dashboard_title,
        description: d.description,
      }));
      const chartItems: AvailableItem[] = (charts || []).map((c: any) => ({
        id: c.id,
        type: 'chart',
        name: c.slice_name,
        description: c.viz_type,
      }));
      const datasetItems: AvailableItem[] = (datasets || []).map((ds: any) => ({
        id: ds.id,
        type: 'dataset',
        name: ds.table_name,
        description: ds.schema ? `${ds.schema}.${ds.table_name}` : ds.table_name,
      }));

      setItems([...dashboardItems, ...chartItems, ...datasetItems]);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Failed to load items');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}


