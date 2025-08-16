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
import { css, styled, t, useTheme } from '@superset-ui/core';
import { Button, Tooltip, Icons } from '@superset-ui/core/components';
import { Tree } from 'antd';
import { CollectionTreeNode, CollectionTreeProps } from '../types';

const StyledButton = styled(Button)`
  ${({ theme }) => css`
    border-radius: 10px;
    border: 2px solid ${theme.colorBorder}40;
    background: linear-gradient(135deg, white 0%, ${theme.colors.grayscale.light5} 100%);
    color: ${theme.colorBorder};
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);
    
    &:hover {
      border-color: ${theme.colorBorder};
      background: ${theme.colorBorder};
      color: white;
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.2);
    }
    
    &:active {
      transform: translateY(0) scale(1);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
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

const TreeContainer = styled.div`
  ${({ theme }) => css`
    height: 100%;
    overflow-y: auto;
    
    .ant-tree {
      background: transparent;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      
      .ant-tree-node-content-wrapper {
        padding: 12px 16px;
        border-radius: ${theme.borderRadius}px;
        margin: 4px 8px;
        border: 2px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, ${theme.colorBorder}20 0%, ${theme.colors.primary.light4}30 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: ${theme.borderRadius}px;
        }
        
        &:hover {
          background: transparent;
          border-color: ${theme.colorBorder};
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.15);
          
          &::before {
            opacity: 1;
          }
        }
        
        &.ant-tree-node-selected {
          background: transparent;
          border-color: ${theme.colorBorder};
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.2);
          
          &::before {
            opacity: 1;
            background: linear-gradient(135deg, ${theme.colorBorder}30 0%, ${theme.colors.primary.light3}40 100%);
          }
        }
      }
      
      .ant-tree-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        position: relative;
        z-index: 1;
      }
      
      .ant-tree-switcher {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        transition: all 0.3s ease;
        
        &:hover {
          background: ${theme.colorBorder}20;
          transform: scale(1.1);
        }
        
        .ant-tree-switcher-icon {
          font-size: 12px;
          color: ${theme.colorBorder};
        }
      }
    }
    
    /* Custom scrollbar */
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: ${theme.colorBorder}40;
      border-radius: 3px;
      transition: background 0.3s ease;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background: ${theme.colorBorder}60;
    }
  `}
`;

const TreeHeader = styled.div`
  ${({ theme }) => css`
    padding: 24px 20px;
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
      left: 20px;
      right: 20px;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, ${theme.colorBorder} 50%, transparent 100%);
    }
  `}
`;

const TreeTitle = styled.h3`
  ${({ theme }) => css`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(135deg, ${theme.colors.grayscale.dark1} 0%, ${theme.colorBorder} 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-family: 'Inter', sans-serif;
    letter-spacing: -0.01em;
  `}
`;

const CollectionNode = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  animation: nodeSlideIn 0.4s ease-out;
  
  @keyframes nodeSlideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const NodeContent = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

const NodeIcon = styled.span`
  ${({ theme }) => css`
    margin-right: 12px;
    color: ${theme.colorBorder};
    display: flex;
    align-items: center;
    font-size: 16px;
    transition: all 0.3s ease;
    
    .ant-tree-node-content-wrapper:hover & {
      transform: scale(1.1) rotate(5deg);
      color: ${theme.colors.primary.dark1};
    }
  `}
`;

const NodeLabel = styled.span`
  ${({ theme }) => css`
    font-size: 15px;
    font-weight: 500;
    color: ${theme.colors.grayscale.dark1};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    font-family: 'Inter', sans-serif;
    letter-spacing: -0.01em;
    transition: color 0.3s ease;
    
    .ant-tree-node-content-wrapper:hover & {
      color: ${theme.colors.primary.dark1};
    }
  `}
`;

const NodeBadge = styled.span`
  ${({ theme }) => css`
    background: linear-gradient(135deg, ${theme.colorBorder}20 0%, ${theme.colors.primary.light4}40 100%);
    color: ${theme.colorBorder};
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 12px;
    margin-left: 12px;
    min-width: 24px;
    text-align: center;
    border: 1px solid ${theme.colorBorder}30;
    transition: all 0.3s ease;
    
    .ant-tree-node-content-wrapper:hover & {
      background: ${theme.colorBorder};
      color: white;
      transform: scale(1.05);
    }
  `}
`;

const OfficialBadge = styled.span`
  ${({ theme }) => css`
    background: linear-gradient(135deg, ${theme.colors.success.light1} 0%, ${theme.colors.success.light2} 100%);
    color: ${theme.colors.success.dark1};
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 8px;
    margin-left: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid ${theme.colors.success.light2};
    animation: sparkle 2s ease-in-out infinite;
    
    @keyframes sparkle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `}
`;

const NodeActions = styled.div`
  display: flex;
  align-items: center;
  margin-left: 12px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  .ant-tree-node-content-wrapper:hover & {
    opacity: 1;
    transform: translateX(0);
  }
  
  .ant-btn {
    border: none;
    box-shadow: none;
    border-radius: 8px;
    transition: all 0.3s ease;
    
    &:hover {
      background: ${({ theme }) => theme.colorBorder}20;
      transform: scale(1.1);
    }
    
    &.ant-btn-dangerous:hover {
      background: ${({ theme }) => theme.colors.error.light1};
      color: ${({ theme }) => theme.colors.error.base};
    }
  }
`;

const LoadingContainer = styled.div`
  ${({ theme }) => css`
    padding: 48px 32px;
    text-align: center;
    color: ${theme.colors.grayscale.base};
    
    .anticon {
      font-size: 32px;
      color: ${theme.colorBorder};
      margin-bottom: 16px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }
    
    div {
      font-size: 16px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
    }
  `}
`;

const EmptyContainer = styled.div`
  ${({ theme }) => css`
    padding: 48px 24px;
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
      margin-bottom: 20px;
      transition: transform 0.3s ease;
      
      &:hover {
        transform: scale(1.1);
      }
    }
    
    div {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      color: ${theme.colors.grayscale.dark1};
      font-family: 'Inter', sans-serif;
      
      &:last-child {
        font-size: 14px;
        font-weight: 400;
        line-height: 1.4;
        color: ${theme.colors.grayscale.base};
      }
    }
  `}
`;

interface TreeNodeData {
  key: string;
  title: React.ReactNode;
  children?: TreeNodeData[];
  isLeaf?: boolean;
}

const CollectionsTree: React.FC<CollectionTreeProps> = ({
  tree,
  selectedCollectionId,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  expandedNodes,
  onToggleNode,
  loading = false,
}) => {
  const theme = useTheme();
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const buildTreeData = (nodes: CollectionTreeNode[]): TreeNodeData[] => {
    return nodes.map(node => {
      const nodeTitle = (
        <CollectionNode
          onMouseEnter={() => setHoveredNode(node.id)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <NodeContent>
            <NodeIcon>
              <Icons.FileOutlined />
            </NodeIcon>
            <NodeLabel title={node.name}>
              {node.name}
            </NodeLabel>
            {node.is_official && (
              <OfficialBadge>{t('Official')}</OfficialBadge>
            )}
            <NodeBadge>{node.total_item_count}</NodeBadge>
          </NodeContent>
          
          {hoveredNode === node.id && (
            <NodeActions>
              {onCreateCollection && (
                <Tooltip title={t('Create subcollection')}>
                  <StyledButton
                    type="text"
                    size="small"
                    icon={<Icons.PlusOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateCollection(node.id);
                    }}
                  />
                </Tooltip>
              )}
              <Tooltip title={t('Delete collection')}>
                <StyledButton
                  type="text"
                  size="small"
                  icon={<Icons.DeleteOutlined />}
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCollection?.(node);
                  }}
                />
              </Tooltip>
            </NodeActions>
          )}
        </CollectionNode>
      );

      return {
        key: node.id.toString(),
        title: nodeTitle,
        children: node.children.length > 0 ? buildTreeData(node.children) : undefined,
        isLeaf: node.children.length === 0,
      };
    });
  };

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const nodeId = parseInt(selectedKeys[0] as string, 10);
      const findNode = (nodes: CollectionTreeNode[], id: number): CollectionTreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          const found = findNode(node.children, id);
          if (found) return found;
        }
        return null;
      };
      
      const selectedNode = findNode(tree, nodeId);
      if (selectedNode) {
        onSelectCollection(selectedNode);
      }
    }
  };

  const handleExpand = (expandedKeys: React.Key[]) => {
    // Update expanded nodes set
    const newExpandedNodes = new Set(expandedKeys.map(key => parseInt(key as string, 10)));
    
    // Find nodes that were toggled
    const currentExpanded = Array.from(expandedNodes);
    const newExpanded = Array.from(newExpandedNodes);
    
    // Find the node that was toggled
    const added = newExpanded.find(id => !currentExpanded.includes(id));
    const removed = currentExpanded.find(id => !newExpanded.includes(id));
    
    if (added) onToggleNode(added);
    if (removed) onToggleNode(removed);
  };

  if (loading) {
    return (
      <TreeContainer>
        <TreeHeader>
          <TreeTitle>{t('Collections')}</TreeTitle>
        </TreeHeader>
        <LoadingContainer>
          <Icons.LoadingOutlined spin />
          <div>{t('Loading collections...')}</div>
        </LoadingContainer>
      </TreeContainer>
    );
  }

  if (tree.length === 0) {
    return (
      <TreeContainer>
        <TreeHeader>
          <TreeTitle>{t('Collections')}</TreeTitle>
          {onCreateCollection && (
            <Tooltip title={t('Create collection')}>
              <StyledButton
                type="primary"
                size="small"
                icon={<Icons.PlusOutlined />}
                onClick={() => onCreateCollection()}
              />
            </Tooltip>
          )}
        </TreeHeader>
        <EmptyContainer>
          <Icons.FileOutlined 
            style={{ fontSize: 48, color: theme.colors.grayscale.light1, marginBottom: 16 }} 
          />
          <div>{t('No collections yet')}</div>
          <div style={{ fontSize: 12, marginTop: 8, color: theme.colors.grayscale.base }}>
            {t('Create your first collection to organize your content')}
          </div>
        </EmptyContainer>
      </TreeContainer>
    );
  }

  const treeData = buildTreeData(tree);
  const selectedKeys = selectedCollectionId ? [selectedCollectionId.toString()] : [];
  const expandedKeys = Array.from(expandedNodes).map(id => id.toString());

  return (
    <TreeContainer>
      <TreeHeader>
        <TreeTitle>{t('Collections')}</TreeTitle>
        {onCreateCollection && (
          <Tooltip title={t('Create collection')}>
            <StyledButton
              type="primary"
              size="small"
              icon={<Icons.PlusOutlined />}
              onClick={() => onCreateCollection()}
            />
          </Tooltip>
        )}
      </TreeHeader>
      
      <Tree
        treeData={treeData}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onSelect={handleSelect}
        onExpand={handleExpand}
        showLine={{ showLeafIcon: false }}
        showIcon={false}
        blockNode
      />
    </TreeContainer>
  );
};

export default CollectionsTree;
