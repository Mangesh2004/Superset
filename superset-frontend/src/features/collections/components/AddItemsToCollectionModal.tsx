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

import React, { useState, useMemo } from 'react';
import { css, styled, t } from '@superset-ui/core';
import { 
  Button, 
  Modal, 
  Input,
  Empty,
  Checkbox,
} from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components';
import { CollectionItemType, CollectionTreeNode } from '../types';

interface AvailableItem {
  id: number;
  type: CollectionItemType;
  name: string;
  description?: string;
}

interface AddItemsToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: AvailableItem[]) => void;
  targetCollection: CollectionTreeNode;
  availableItems: AvailableItem[];
  loading?: boolean;
}

const ModalContent = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `}
`;

const SearchContainer = styled.div`
  ${({ theme }) => css`
    margin-bottom: 16px;
  `}
`;

const ItemsList = styled.div`
  ${({ theme }) => css`
    max-height: 400px;
    overflow-y: auto;
    border: 1px solid ${theme.colors.grayscale.light2};
    border-radius: 4px;
  `}
`;

const ItemRow = styled.div<{ selected?: boolean }>`
  ${({ theme, selected }) => css`
    padding: 12px 16px;
    border-bottom: 1px solid ${theme.colors.grayscale.light2};
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    background: ${selected ? theme.colors.primary.light5 : 'transparent'};
    
    &:hover {
      background: ${theme.colors.grayscale.light4};
    }
    
    &:last-child {
      border-bottom: none;
    }
  `}
`;

const ItemIcon = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: ${theme.colors.grayscale.base};
  `}
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemName = styled.div`
  ${({ theme }) => css`
    font-weight: 500;
    margin-bottom: 4px;
  `}
`;

const ItemDescription = styled.div`
  ${({ theme }) => css`
    font-size: 12px;
    color: ${theme.colors.grayscale.base};
  `}
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

const AddItemsToCollectionModal: React.FC<AddItemsToCollectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  targetCollection,
  availableItems,
  loading = false,
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return availableItems;
    
    const term = searchTerm.toLowerCase();
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term)
    );
  }, [availableItems, searchTerm]);

  const handleItemToggle = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSubmit = () => {
    const itemsToAdd = availableItems.filter(item => selectedItems.has(item.id));
    onSubmit(itemsToAdd);
    setSelectedItems(new Set());
    setSearchTerm('');
  };

  const handleClose = () => {
    setSelectedItems(new Set());
    setSearchTerm('');
    onClose();
  };

  return (
    <Modal
      title={t('Add Items to "%s"', targetCollection.name)}
      show={isOpen}
      onHide={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          {t('Cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={selectedItems.size === 0}
          onClick={handleSubmit}
        >
          {t('Add %s Items', selectedItems.size)}
        </Button>,
      ]}
      width={600}
    >
      <ModalContent>
        <div style={{ marginBottom: 16, color: '#666' }}>
          {t('Select items to add to the "%s" collection:', targetCollection.name)}
        </div>

        <SearchContainer>
          <Input
            placeholder={t('Search items...')}
            prefix={<Icons.SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </SearchContainer>

        <ItemsList>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <ItemRow
                key={`${item.type}-${item.id}`}
                selected={selectedItems.has(item.id)}
                onClick={() => handleItemToggle(item.id)}
              >
                <Checkbox
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleItemToggle(item.id)}
                />
                <ItemIcon>
                  {getItemIcon(item.type)}
                </ItemIcon>
                <ItemInfo>
                  <ItemName>{item.name}</ItemName>
                  {item.description && (
                    <ItemDescription>{item.description}</ItemDescription>
                  )}
                  <ItemDescription style={{ textTransform: 'capitalize' }}>
                    {item.type}
                  </ItemDescription>
                </ItemInfo>
              </ItemRow>
            ))
          ) : (
            <div style={{ padding: 24 }}>
              <Empty description={t('No items found')} />
            </div>
          )}
        </ItemsList>
      </ModalContent>
    </Modal>
  );
};

export default AddItemsToCollectionModal;
