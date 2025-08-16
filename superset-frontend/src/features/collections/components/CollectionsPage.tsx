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

import React, { useState, useCallback } from 'react';
import { css, styled, t } from '@superset-ui/core';
import { Breadcrumb } from '@superset-ui/core/components';
import { Icons } from '@superset-ui/core/components';
import { useCollectionsTree } from '../hooks/useCollectionsTree';
import { useCollectionItems } from '../hooks/useCollectionItems';
import { useCollectionActions } from '../hooks/useCollectionActions';
import { CollectionTreeNode, ItemToRemove } from '../types';
import CollectionsTree from './CollectionsTree';
import CollectionItemGrid from './CollectionItemGrid';
import CreateCollectionModal from './CreateCollectionModal';
import AddItemsToCollectionModal from './AddItemsToCollectionModal';
import { useAvailableItems } from '../hooks/useAvailableItems';
import { Modal, Button } from '@superset-ui/core/components';

const PageContainer = styled.div`
  ${({ theme }) => css`
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, ${theme.colors.grayscale.light5} 0%, ${theme.colors.grayscale.light4} 100%);
    animation: fadeIn 0.6s ease-out;
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `}
`;

const PageHeader = styled.div`
  ${({ theme }) => css`
    padding: 20px 32px;
    background: linear-gradient(135deg, white 0%, ${theme.colors.grayscale.light5} 100%);
    border-bottom: 2px solid ${theme.colorBorder};
    border-radius: 0 0 ${theme.borderRadius}px ${theme.borderRadius}px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(10px);
  `}
`;

const PageTitle = styled.h1`
  ${({ theme }) => css`
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(135deg, ${theme.colors.primary.dark1} 0%, ${theme.colorBorder} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  `}
`;

const BreadcrumbContainer = styled.div`
  ${({ theme }) => css`
    padding: 16px 32px;
    background: rgba(255, 255, 255, 0.8);
    border-bottom: 1px solid ${theme.colorBorder};
    border-radius: ${theme.borderRadius}px;
    margin: 8px 16px;
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    animation: slideIn 0.4s ease-out;
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .ant-breadcrumb {
      font-weight: 500;
      font-size: 14px;
      
      .ant-breadcrumb-link {
        color: ${theme.colors.primary.dark1};
        transition: all 0.3s ease;
        
        &:hover {
          color: ${theme.colorBorder};
          transform: translateY(-1px);
        }
      }
    }
  `}
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
  gap: 16px;
  padding: 16px;
`;

const TreePanel = styled.div`
  width: 320px;
  min-width: 320px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid ${({ theme }) => theme.colorBorder};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  animation: slideInLeft 0.5s ease-out;
  
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  &:hover {
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
    transform: translateY(-2px);
  }
`;

const ItemsPanel = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid ${({ theme }) => theme.colorBorder};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  animation: slideInRight 0.5s ease-out;
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  &:hover {
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15);
  }
`;

const EmptyState = styled.div`
  ${({ theme }) => css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 40px;
    text-align: center;
    color: ${theme.colors.grayscale.base};
    animation: floatIn 0.8s ease-out;
    
    @keyframes floatIn {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    h3 {
      font-size: 24px;
      font-weight: 600;
      color: ${theme.colors.grayscale.dark1};
      margin: 16px 0 8px 0;
      font-family: 'Inter', sans-serif;
    }
    
    p {
      font-size: 16px;
      color: ${theme.colors.grayscale.base};
      font-weight: 400;
      line-height: 1.5;
    }
  `}
`;

const CollectionsPage: React.FC = () => {
  console.log('🔍 CollectionsPage component rendering!');
  const [selectedCollection, setSelectedCollection] = useState<CollectionTreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalParent, setCreateModalParent] = useState<CollectionTreeNode | undefined>();
  const [addItemsModalOpen, setAddItemsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<CollectionTreeNode | null>(null);
  const [searchItems, setSearchItems] = useState('');

  // Hooks
  const { tree, loading: treeLoading, refetch: refetchTree } = useCollectionsTree();
  const { items, loading: itemsLoading, refetch: refetchItems } = useCollectionItems(
    selectedCollection?.id
  );
  const { removeItems, addItems, deleteCollection } = useCollectionActions();
  const { items: availableItems, loading: availableLoading, reload: reloadAvailable } = useAvailableItems(searchItems);

  // Build breadcrumb path
  const getBreadcrumbPath = useCallback((collection: CollectionTreeNode): CollectionTreeNode[] => {
    const path: CollectionTreeNode[] = [];
    
    const findPath = (nodes: CollectionTreeNode[], targetId: number, currentPath: CollectionTreeNode[]): boolean => {
      for (const node of nodes) {
        const newPath = [...currentPath, node];
        
        if (node.id === targetId) {
          path.push(...newPath);
          return true;
        }
        
        if (node.children.length > 0 && findPath(node.children, targetId, newPath)) {
          return true;
        }
      }
      return false;
    };
    
    findPath(tree, collection.id, []);
    return path;
  }, [tree]);

  // Event handlers
  const handleSelectCollection = useCallback((collection: CollectionTreeNode) => {
    setSelectedCollection(collection);
    
    // Auto-expand parent nodes
    const path = getBreadcrumbPath(collection);
    const newExpanded = new Set(expandedNodes);
    path.forEach(node => newExpanded.add(node.id));
    setExpandedNodes(newExpanded);
  }, [getBreadcrumbPath, expandedNodes]);

  const handleToggleNode = useCallback((nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  }, [expandedNodes]);

  const handleCreateCollection = useCallback((parentId?: number) => {
    const parent = parentId 
      ? tree.find(node => {
          const findInTree = (nodes: CollectionTreeNode[]): CollectionTreeNode | null => {
            for (const n of nodes) {
              if (n.id === parentId) return n;
              const found = findInTree(n.children);
              if (found) return found;
            }
            return null;
          };
          return findInTree([node]);
        })
      : undefined;
    
    setCreateModalParent(parent);
    setCreateModalOpen(true);
  }, [tree]);

  const handleCreateModalClose = useCallback(() => {
    setCreateModalOpen(false);
    setCreateModalParent(undefined);
  }, []);

  const handleCreateModalSubmit = useCallback(async (data: any) => {
    // This will be handled by the modal component
    refetchTree();
    handleCreateModalClose();
  }, [refetchTree, handleCreateModalClose]);

  const handleRemoveItems = useCallback(async (itemsToRemove: ItemToRemove[]) => {
    if (!selectedCollection) return;
    
    try {
      await removeItems(selectedCollection.id, itemsToRemove);
      refetchItems();
      refetchTree(); // Update item counts in tree
    } catch (error) {
      console.error('Failed to remove items:', error);
    }
  }, [selectedCollection, removeItems, refetchItems, refetchTree]);

  const handleRefresh = useCallback(() => {
    refetchItems();
  }, [refetchItems]);

  const handleAddItems = useCallback(() => {
    if (selectedCollection) {
      setAddItemsModalOpen(true);
    }
  }, [selectedCollection]);

  const handleAddItemsSubmit = useCallback(async (itemsToAdd: any[]) => {
    if (!selectedCollection) return;
    
    try {
      const itemsForAPI = itemsToAdd.map(item => ({ type: item.type, id: item.id }));
      await addItems(selectedCollection.id, itemsForAPI);
      setAddItemsModalOpen(false);
      refetchItems();
      refetchTree(); // Update item counts
    } catch (error) {
      console.error('Error adding items:', error);
    }
  }, [selectedCollection, addItems, refetchItems, refetchTree]);

  const handleDeleteCollection = useCallback((collection: CollectionTreeNode) => {
    setCollectionToDelete(collection);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!collectionToDelete) return;

    try {
      await deleteCollection(collectionToDelete.id);
      setDeleteModalOpen(false);
      setCollectionToDelete(null);
      
      // If we deleted the currently selected collection, clear selection
      if (selectedCollection?.id === collectionToDelete.id) {
        setSelectedCollection(null);
      }
      
      refetchTree();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  }, [collectionToDelete, deleteCollection, selectedCollection, refetchTree]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setCollectionToDelete(null);
  }, []);

  // Render breadcrumb
  const breadcrumbItems = selectedCollection 
    ? getBreadcrumbPath(selectedCollection).map(node => ({
        title: (
          <span 
            style={{ cursor: 'pointer' }}
            onClick={() => handleSelectCollection(node)}
          >
            {node.name}
          </span>
        ),
      }))
    : [];

  return (
    <PageContainer>
      

      {selectedCollection && (
        <BreadcrumbContainer>
          <Breadcrumb
            items={[
              {
                title: (
                  <span 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedCollection(null)}
                  >
                    <Icons.FileOutlined /> {t('Collections')}
                  </span>
                ),
              },
              ...breadcrumbItems,
            ]}
          />
        </BreadcrumbContainer>
      )}

      <ContentContainer>
        <TreePanel>
          <CollectionsTree
            tree={tree}
            selectedCollectionId={selectedCollection?.id}
            onSelectCollection={handleSelectCollection}
            onCreateCollection={handleCreateCollection}
            onDeleteCollection={handleDeleteCollection}
            expandedNodes={expandedNodes}
            onToggleNode={handleToggleNode}
            loading={treeLoading}
          />
        </TreePanel>

        <ItemsPanel>
          {selectedCollection ? (
            <CollectionItemGrid
              items={items || { dashboards: [], charts: [], datasets: [], total_count: 0 }}
              loading={itemsLoading}
              onRefresh={handleRefresh}
              onMoveItems={handleRemoveItems}
              onAddItems={handleAddItems}
            />
          ) : (
            <EmptyState>
              <Icons.FileOutlined 
                style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }} 
              />
              <h3>{t('Select a collection')}</h3>
              <p>{t('Choose a collection from the tree to view its contents')}</p>
            </EmptyState>
          )}
        </ItemsPanel>
      </ContentContainer>

      <CreateCollectionModal
        isOpen={createModalOpen}
        onClose={handleCreateModalClose}
        onSubmit={handleCreateModalSubmit}
        parentCollection={createModalParent}
        tree={tree}
      />

      {selectedCollection && (
        <AddItemsToCollectionModal
          isOpen={addItemsModalOpen}
          onClose={() => setAddItemsModalOpen(false)}
          onSubmit={handleAddItemsSubmit}
          targetCollection={selectedCollection}
          availableItems={availableItems as any}
        />
      )}

      <Modal
        title={t('Delete Collection')}
        show={deleteModalOpen}
        onHide={handleDeleteCancel}
        footer={[
          <Button key="cancel" onClick={handleDeleteCancel}>
            {t('Cancel')}
          </Button>,
          <Button key="delete" type="primary" danger onClick={handleDeleteConfirm}>
            {t('Delete')}
          </Button>,
        ]}
      >
        {collectionToDelete && (
          <div>
            <p>{t('Are you sure you want to delete the collection "%s"?', collectionToDelete.name)}</p>
            {collectionToDelete.total_item_count > 0 && (
              <p style={{ color: '#faad14', marginTop: 16 }}>
                <Icons.ExclamationCircleOutlined style={{ marginRight: 8 }} />
                {t('This collection contains %s items. They will not be deleted, but will be removed from this collection.', collectionToDelete.total_item_count)}
              </p>
            )}
            <p style={{ color: '#ff4d4f', marginTop: 16 }}>
              <Icons.ExclamationCircleOutlined style={{ marginRight: 8 }} />
              {t('This action cannot be undone.')}
            </p>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};

export default CollectionsPage;
