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

import React, { useState } from 'react';
import { css, styled, t, SupersetClient } from '@superset-ui/core';
import { Button, Card, Empty } from '@superset-ui/core/components';
import Tabs from '@superset-ui/core/components/Tabs';
import { Tooltip, Icons } from '@superset-ui/core/components';
import { CollectionItem, CollectionItemGridProps, CollectionItemType } from '../types';

const StyledTabs = styled(Tabs)`
  ${({ theme }) => css`
    .ant-tabs-nav {
      background: transparent;
      border-bottom: 1px solid ${theme.colors.grayscale.light2};
      padding: 0 24px;
      margin-bottom: 24px;
    }
    
    .ant-tabs-tab {
      padding: 16px 24px;
      margin-right: 16px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      border-radius: ${theme.borderRadius}px;
      transition: all 0.3s ease;
      
      &:hover {
        color: ${theme.colorBorder};
        background: rgba(139, 92, 246, 0.08);
      }
      
      &.ant-tabs-tab-active {
        color: ${theme.colorBorder};
        font-weight: 600;
        
        .ant-tabs-tab-btn {
          color: ${theme.colorBorder};
        }
      }
    }
    
    .ant-tabs-content-holder {
      background: transparent;
    }
    
    .ant-tabs-tabpane {
      padding: 0;
    }
  `}
`;

const StyledButton = styled(Button)`
  ${({ theme }) => css`
    border-radius: 8px;
    border: 1px solid ${theme.colorBorder}40;
    background: rgba(255, 255, 255, 0.9);
    color: ${theme.colorBorder};
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(139, 92, 246, 0.08);
    
    &:hover {
      border-color: ${theme.colorBorder};
      background: ${theme.colorBorder};
      color: white;
      transform: translateY(-1px) scale(1.05);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
    }
    
    &:active {
      transform: translateY(0) scale(1);
      box-shadow: 0 1px 4px rgba(139, 92, 246, 0.15);
    }
    
    &.ant-btn-dangerous {
      border-color: ${theme.colors.error.light2};
      color: ${theme.colors.error.base};
      
      &:hover {
        border-color: ${theme.colors.error.base};
        background: ${theme.colors.error.base};
        color: white;
      }
    }
    
    .anticon {
      transition: transform 0.3s ease;
    }
    
    &:hover .anticon {
      transform: scale(1.1);
    }
  `}
`;

const GridContainer = styled.div`
  ${({ theme }) => css`
    height: 100%;
    display: flex;
    flex-direction: column;
    background: transparent;
  `}
`;

const GridHeader = styled.div`
  ${({ theme }) => css`
    padding: 24px 32px;
    background: linear-gradient(135deg, ${theme.colors.grayscale.light5} 0%, white 100%);
    border-bottom: 2px solid ${theme.colorBorder};
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 32px;
      right: 32px;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, ${theme.colorBorder} 50%, transparent 100%);
    }
  `}
`;

const GridTitle = styled.h3`
  ${({ theme }) => css`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, ${theme.colors.grayscale.dark1} 0%, ${theme.colorBorder} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-family: 'Inter', sans-serif;
    letter-spacing: -0.01em;
  `}
`;

const GridContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colorBorder}40;
    border-radius: 4px;
    transition: background 0.3s ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colorBorder}60;
  }
`;

const ItemsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const ItemCard = styled(Card)`
  ${({ theme }) => css`
    border: 2px solid ${theme.colorBorder}30;
    border-radius: ${theme.borderRadius}px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    animation: cardSlideIn 0.5s ease-out;
    
    @keyframes cardSlideIn {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .ant-card-body {
      padding: 20px;
    }
    
    &:hover {
      border-color: ${theme.colorBorder};
      box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
      transform: translateY(-4px) scale(1.02);
      
      .item-actions {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `}
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const ItemIcon = styled.div`
  ${({ theme }) => css`
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    flex-shrink: 0;
    font-size: 20px;
    transition: all 0.3s ease;
    
    &.dashboard {
      background: linear-gradient(135deg, ${theme.colors.info.light1} 0%, ${theme.colors.info.light2} 100%);
      color: ${theme.colors.info.base};
      border: 2px solid ${theme.colors.info.light2};
    }
    
    &.chart {
      background: linear-gradient(135deg, ${theme.colors.success.light1} 0%, ${theme.colors.success.light2} 100%);
      color: ${theme.colors.success.base};
      border: 2px solid ${theme.colors.success.light2};
    }
    
    &.dataset {
      background: linear-gradient(135deg, ${theme.colors.warning.light1} 0%, ${theme.colors.warning.light2} 100%);
      color: ${theme.colors.warning.base};
      border: 2px solid ${theme.colors.warning.light2};
    }
    
    .ant-card:hover & {
      transform: scale(1.1) rotate(5deg);
    }
  `}
`;

const ItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.h4`
  ${({ theme }) => css`
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: ${theme.colors.grayscale.dark1};
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    letter-spacing: -0.01em;
    transition: color 0.3s ease;
    
    .ant-card:hover & {
      color: ${theme.colors.primary.dark1};
    }
  `}
`;

const ItemMeta = styled.div`
  ${({ theme }) => css`
    font-size: 13px;
    color: ${theme.colors.grayscale.base};
    line-height: 1.3;
    font-family: 'Inter', sans-serif;
    
    .meta-item {
      display: block;
      margin-bottom: 4px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  `}
`;

const ItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  .ant-card:hover & {
    opacity: 1;
    transform: translateY(0);
  }
  
  .ant-btn {
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.colorBorder}40;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: ${({ theme }) => theme.colorBorder};
      transform: scale(1.05);
    }
  }
`;

const LoadingContainer = styled.div`
  ${({ theme }) => css`
    padding: 80px 40px;
    text-align: center;
    color: ${theme.colors.grayscale.base};
    animation: fadeInUp 0.6s ease-out;
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .anticon {
      font-size: 40px;
      color: ${theme.colorBorder};
      margin-bottom: 20px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }
    
    div {
      font-size: 18px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
    }
  `}
`;

const EmptyContainer = styled.div`
  ${({ theme }) => css`
    padding: 80px 40px;
    text-align: center;
    color: ${theme.colors.grayscale.base};
    animation: fadeInUp 0.8s ease-out;
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .anticon {
      margin-bottom: 24px;
      transition: transform 0.3s ease;
      
      &:hover {
        transform: scale(1.1);
      }
    }
    
    h3 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: ${theme.colors.grayscale.dark1};
      font-family: 'Inter', sans-serif;
    }
    
    p {
      font-size: 16px;
      color: ${theme.colors.grayscale.base};
      line-height: 1.5;
      margin: 0;
    }
  `}
`;

const TabContent = styled.div`
  min-height: 300px;
  animation: fadeIn 0.4s ease-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const getItemIcon = (type: CollectionItemType) => {
  switch (type) {
    case 'dashboard':
      return <Icons.DashboardOutlined />;
    case 'chart':
      return <Icons.BarChartOutlined />;
    case 'dataset':
      return <Icons.DatabaseOutlined />;
    default:
      return <Icons.FileOutlined />;
  }
};

const getItemTitle = (item: CollectionItem) => {
  switch (item.type) {
    case 'dashboard':
      return item.dashboard_title || item.name;
    case 'chart':
      return item.slice_name || item.name;
    case 'dataset':
      return item.table_name || item.name;
    default:
      return item.name;
  }
};

const getItemMeta = (item: CollectionItem) => {
  switch (item.type) {
    case 'dashboard':
      return item.slug;
    case 'chart':
      return item.viz_type;
    case 'dataset':
      return `${item.schema ? `${item.schema}.` : ''}${item.database_name || ''}`;
    default:
      return '';
  }
};

const ItemGridCard: React.FC<{
  item: CollectionItem;
  onRemove?: (item: CollectionItem) => void;
}> = ({ item, onRemove }) => {
  const openItem = async () => {
    // Prefer provided URL; otherwise build fallback routes
    if (item.url) {
      window.open(item.url, '_blank');
      return;
    }
    if (item.type === 'dashboard' && item.id) {
      window.open(`/superset/dashboard/${item.id}/`, '_blank');
      return;
    }
    if (item.type === 'chart' && item.id) {
      try {
        const resp = (await SupersetClient.post({
          endpoint: '/api/v1/explore/form_data',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slice_id: item.id }),
        })) as any;
        const key = resp?.json?.key;
        if (key) {
          window.open(`/explore/?form_data_key=${encodeURIComponent(key)}&slice_id=${item.id}`, '_blank');
          return;
        }
      } catch (e) {
        // ignore and fallback
      }
      // Fallback if form_data_key not available
      window.open(`/explore/?slice_id=${item.id}`, '_blank');
      return;
    }
    if (item.type === 'dataset' && item.id) {
      window.open(`/dataset/${item.id}`, '_blank');
      return;
    }
  };
  return (
    <ItemCard size="small">
      <ItemHeader>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <ItemIcon className={item.type}>
            {getItemIcon(item.type)}
          </ItemIcon>
          <ItemInfo>
            <ItemTitle title={getItemTitle(item)}>
              {getItemTitle(item)}
            </ItemTitle>
            <ItemMeta>{getItemMeta(item)}</ItemMeta>
          </ItemInfo>
        </div>
        
        <ItemActions className="item-actions">
          <Tooltip title={t('Open')}>
            <StyledButton
              type="text"
              size="small"
              icon={<Icons.LinkOutlined />}
              onClick={openItem}
            />
          </Tooltip>
          {onRemove && (
            <Tooltip title={t('Remove from collection')}>
              <StyledButton
                type="text"
                size="small"
                icon={<Icons.DeleteOutlined />}
                onClick={() => onRemove(item)}
                danger
              />
            </Tooltip>
          )}
        </ItemActions>
      </ItemHeader>
    </ItemCard>
  );
};

const CollectionItemGrid: React.FC<CollectionItemGridProps> = ({
  items,
  loading = false,
  onRefresh,
  onMoveItems,
  onAddItems,
}) => {
  const [activeTab, setActiveTab] = useState('all');

  if (loading) {
    return (
      <GridContainer>
        <LoadingContainer>
          <Icons.LoadingOutlined spin style={{ fontSize: 24, marginBottom: 16 }} />
          <div>{t('Loading items...')}</div>
        </LoadingContainer>
      </GridContainer>
    );
  }

  if (!items || items.total_count === 0) {
    return (
      <GridContainer>
        <GridHeader>
          <GridTitle>{t('Collection Items')}</GridTitle>
          <div>
            <StyledButton
              type="primary"
              icon={<Icons.PlusOutlined />}
              onClick={onAddItems}
              style={{ marginRight: 8 }}
            >
              {t('Add Items')}
            </StyledButton>
            {onRefresh && (
              <Tooltip title={t('Refresh')}>
                <StyledButton
                  type="text"
                  icon={<Icons.ReloadOutlined />}
                  onClick={onRefresh}
                />
              </Tooltip>
            )}
          </div>
        </GridHeader>
        <EmptyContainer>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('No items in this collection')}
          />
        </EmptyContainer>
      </GridContainer>
    );
  }

  const handleRemoveItem = (item: CollectionItem) => {
    if (onMoveItems) {
      onMoveItems([{ type: item.type, id: item.id }]);
    }
  };

  const allItems = [
    ...items.dashboards.map(item => ({ ...item, type: 'dashboard' as CollectionItemType })),
    ...items.charts.map(item => ({ ...item, type: 'chart' as CollectionItemType })),
    ...items.datasets.map(item => ({ ...item, type: 'dataset' as CollectionItemType })),
  ];

  const tabItems = [
    {
      key: 'all',
      label: `${t('All')} (${items.total_count})`,
      children: (
        <TabContent>
          <ItemsGrid>
            {allItems.map((item, index) => (
              <ItemGridCard
                key={`${item.type}-${item.id}-${index}`}
                item={item}
                onRemove={onMoveItems ? handleRemoveItem : undefined}
              />
            ))}
          </ItemsGrid>
        </TabContent>
      ),
    },
    {
      key: 'dashboards',
      label: `${t('Dashboards')} (${items.dashboards.length})`,
      children: (
        <TabContent>
          {items.dashboards.length > 0 ? (
            <ItemsGrid>
              {items.dashboards.map((item, index) => (
                <ItemGridCard
                  key={`dashboard-${item.id}-${index}`}
                  item={{ ...item, type: 'dashboard' }}
                  onRemove={onMoveItems ? handleRemoveItem : undefined}
                />
              ))}
            </ItemsGrid>
          ) : (
            <Empty description={t('No dashboards')} />
          )}
        </TabContent>
      ),
    },
    {
      key: 'charts',
      label: `${t('Charts')} (${items.charts.length})`,
      children: (
        <TabContent>
          {items.charts.length > 0 ? (
            <ItemsGrid>
              {items.charts.map((item, index) => (
                <ItemGridCard
                  key={`chart-${item.id}-${index}`}
                  item={{ ...item, type: 'chart' }}
                  onRemove={onMoveItems ? handleRemoveItem : undefined}
                />
              ))}
            </ItemsGrid>
          ) : (
            <Empty description={t('No charts')} />
          )}
        </TabContent>
      ),
    },
    {
      key: 'datasets',
      label: `${t('Datasets')} (${items.datasets.length})`,
      children: (
        <TabContent>
          {items.datasets.length > 0 ? (
            <ItemsGrid>
              {items.datasets.map((item, index) => (
                <ItemGridCard
                  key={`dataset-${item.id}-${index}`}
                  item={{ ...item, type: 'dataset' }}
                  onRemove={onMoveItems ? handleRemoveItem : undefined}
                />
              ))}
            </ItemsGrid>
          ) : (
            <Empty description={t('No datasets')} />
          )}
        </TabContent>
      ),
    },
  ];

  return (
    <GridContainer>
      <GridHeader>
        <GridTitle>{t('Collection Items')}</GridTitle>
        <div>
          <StyledButton
            type="primary"
            icon={<Icons.PlusOutlined />}
            onClick={onAddItems}
            style={{ marginRight: 8 }}
          >
            {t('Add Items')}
          </StyledButton>
          {onRefresh && (
            <Tooltip title={t('Refresh')}>
              <StyledButton
                type="text"
                icon={<Icons.ReloadOutlined />}
                onClick={onRefresh}
              />
            </Tooltip>
          )}
        </div>
      </GridHeader>
      
      <GridContent>
        <StyledTabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="small"
        />
      </GridContent>
    </GridContainer>
  );
};

export default CollectionItemGrid;
