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
  List, 
  Modal, 
  Input,
  Empty,
} from '@superset-ui/core/components';
import { Radio } from '@superset-ui/core/components/Radio';
import { Icons } from '@superset-ui/core/components';
import { useCollectionActions } from '../hooks/useCollectionActions';
import { AddToCollectionModalProps, CollectionTreeNode } from '../types';

const ModalContent = styled.div`
  ${({ theme }) => css`
    .ant-list {
      max-height: 400px;
      overflow-y: auto;
    }
  `}
`;

const SearchContainer = styled.div`
  ${({ theme }) => css`
    margin-bottom: 16px;
  `}
`;

const SelectedItemsList = styled.div`
  ${({ theme }) => css`
    background: ${theme.colors.grayscale.light4};
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    max-height: 120px;
    overflow-y: auto;
  `}
`;

const SelectedItem = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    padding: 4px 0;
    font-size: 13px;
    color: ${theme.colors.grayscale.dark1};
    
    .item-icon {
      margin-right: 8px;
      color: ${theme.colors.primary.base};
    }
  `}
`;

const CollectionItem = styled.div<{ selected: boolean }>`
  ${({ theme, selected }) => css`
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    
    ${selected && css`
      background: ${theme.colors.primary.light4};
      border: 1px solid ${theme.colors.primary.base};
    `}
    
    &:hover {
      background: ${selected ? theme.colors.primary.light4 : theme.colors.grayscale.light4};
    }
  `}
`;

const CollectionIcon = styled.div`
  ${({ theme }) => css`
    margin-right: 12px;
    color: ${theme.colors.primary.base};
    display: flex;
    align-items: center;
  `}
`;

const CollectionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CollectionName = styled.div`
  ${({ theme }) => css`
    font-weight: 500;
    color: ${theme.colors.grayscale.dark1};
    margin-bottom: 2px;
  `}
`;

const CollectionMeta = styled.div`
  ${({ theme }) => css`
    font-size: 12px;
    color: ${theme.colors.grayscale.base};
  `}
`;

const OfficialBadge = styled.span`
  ${({ theme }) => css`
    background: ${theme.colors.success.light1};
    color: ${theme.colors.success.dark1};
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 6px;
    margin-left: 8px;
    font-weight: 500;
  `}
`;

const getItemIcon = (type: string) => {
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

// Helper function to flatten tree for searching
const flattenTree = (nodes: CollectionTreeNode[], level = 0): Array<CollectionTreeNode & { level: number }> => {
  const flattened: Array<CollectionTreeNode & { level: number }> = [];
  
  nodes.forEach(node => {
    flattened.push({ ...node, level });
    if (node.children.length > 0) {
      flattened.push(...flattenTree(node.children, level + 1));
    }
  });
  
  return flattened;
};

const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  items,
  tree,
}) => {
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { addItems, loading } = useCollectionActions();

  // Flatten tree for display and filtering
  const flatCollections = useMemo(() => flattenTree(tree), [tree]);

  // Filter collections based on search term
  const filteredCollections = useMemo(() => {
    if (!searchTerm) return flatCollections;
    
    return flatCollections.filter(collection =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [flatCollections, searchTerm]);

  const handleSubmit = async () => {
    if (!selectedCollectionId) return;
    
    try {
      const itemsToAdd = items.map(item => ({
        type: item.type,
        id: item.id,
      }));
      
      await addItems(selectedCollectionId, itemsToAdd);
      onSubmit(selectedCollectionId, itemsToAdd);
      handleClose();
    } catch (error) {
      console.error('Failed to add items to collection:', error);
    }
  };

  const handleClose = () => {
    setSelectedCollectionId(null);
    setSearchTerm('');
    onClose();
  };

  const selectedCollection = flatCollections.find(c => c.id === selectedCollectionId);

  return (
    <Modal
      title={t('Add to Collection')}
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
          disabled={!selectedCollectionId}
          onClick={handleSubmit}
        >
          {t('Add to Collection')}
        </Button>,
      ]}
      width={600}
    >
      <ModalContent>
        <SelectedItemsList>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            {t('Selected items (%s):', items.length)}
          </div>
          {items.map((item, index) => (
            <SelectedItem key={`${item.type}-${item.id}-${index}`}>
              <span className="item-icon">
                {getItemIcon(item.type)}
              </span>
              {item.name}
            </SelectedItem>
          ))}
        </SelectedItemsList>

        <SearchContainer>
          <Input
            placeholder={t('Search collections...')}
            prefix={<Icons.SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </SearchContainer>

        {filteredCollections.length === 0 ? (
          <Empty
            description={searchTerm ? t('No collections match your search') : t('No collections available')}
          />
        ) : (
          <List
            dataSource={filteredCollections}
            renderItem={(collection) => (
              <List.Item style={{ padding: 0, border: 'none' }}>
                <CollectionItem
                  selected={collection.id === selectedCollectionId}
                  onClick={() => setSelectedCollectionId(collection.id)}
                >
                  <Radio checked={collection.id === selectedCollectionId} />
                  
                  <CollectionIcon style={{ marginLeft: 8 + collection.level * 16 }}>
                    <Icons.FileOutlined />
                  </CollectionIcon>
                  
                  <CollectionInfo>
                    <CollectionName>
                      {collection.name}
                      {collection.is_official && (
                        <OfficialBadge>{t('Official')}</OfficialBadge>
                      )}
                    </CollectionName>
                    <CollectionMeta>
                      {collection.total_item_count} {t('items')}
                      {collection.description && ` • ${collection.description}`}
                    </CollectionMeta>
                  </CollectionInfo>
                </CollectionItem>
              </List.Item>
            )}
          />
        )}

        {selectedCollection && (
          <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
            <strong>{t('Selected:')}</strong> {selectedCollection.name}
            {selectedCollection.description && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {selectedCollection.description}
              </div>
            )}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};

export default AddToCollectionModal;
