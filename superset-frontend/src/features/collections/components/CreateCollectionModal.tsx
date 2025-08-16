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

import React, { useState, useEffect } from 'react';
import { css, styled, t } from '@superset-ui/core';
import { 
  Button, 
  Form, 
  Input, 
  Modal, 
  Select, 
  Switch
} from '@superset-ui/core/components';
import { Input as AntdInput } from 'antd';
const { TextArea } = AntdInput;
import { useCollectionActions } from '../hooks/useCollectionActions';
import { CreateCollectionModalProps, CreateCollectionRequest, CollectionTreeNode } from '../types';

const FormContainer = styled.div`
  ${({ theme }) => css`
    .ant-form-item {
      margin-bottom: 16px;
    }
    
    .ant-form-item-label > label {
      font-weight: 500;
    }
  `}
`;

const ParentInfo = styled.div`
  ${({ theme }) => css`
    padding: 12px;
    background: ${theme.colors.grayscale.light4};
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 13px;
    color: ${theme.colors.grayscale.dark1};
  `}
`;

const SlugPreview = styled.div`
  ${({ theme }) => css`
    font-size: 12px;
    color: ${theme.colors.grayscale.base};
    margin-top: 4px;
  `}
`;

// Helper function to generate slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Helper function to build tree options for parent selection
const buildTreeOptions = (nodes: CollectionTreeNode[], level = 0): Array<{ value: number; label: string }> => {
  const options: Array<{ value: number; label: string }> = [];
  
  nodes.forEach(node => {
    const indent = '  '.repeat(level);
    options.push({
      value: node.id,
      label: `${indent}${node.name}`,
    });
    
    if (node.children.length > 0) {
      options.push(...buildTreeOptions(node.children, level + 1));
    }
  });
  
  return options;
};

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  parentCollection,
  tree,
}) => {
  const [form] = Form.useForm();
  const { createCollection, loading } = useCollectionActions();
  const [autoSlug, setAutoSlug] = useState(true);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setAutoSlug(true);
      
      // Set parent if provided
      if (parentCollection) {
        form.setFieldsValue({ parent_id: parentCollection.id });
      }
    }
  }, [isOpen, parentCollection, form]);

  // Auto-generate slug when name changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (autoSlug) {
      const slug = generateSlug(name);
      form.setFieldsValue({ slug });
    }
  };

  // Handle manual slug editing
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
  };

  const handleSubmit = async (values: any) => {
    try {
      const data: CreateCollectionRequest = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description?.trim(),
        parent_id: values.parent_id || null,
        is_official: values.is_official || false,
      };

      const result = await createCollection(data);
      onSubmit(result);
      form.resetFields();
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to create collection:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const parentOptions = buildTreeOptions(tree);
  const currentSlug = form.getFieldValue('slug') || '';

  return (
    <Modal
      title={parentCollection 
        ? t('Create Subcollection in "%s"', parentCollection.name)
        : t('Create Collection')
      }
      show={isOpen}
      onHide={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {t('Cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={() => form.submit()}
        >
          {t('Create Collection')}
        </Button>,
      ]}
      width={600}
    >
      <FormContainer>
        {parentCollection && (
          <ParentInfo>
            <strong>{t('Parent Collection:')}</strong> {parentCollection.name}
          </ParentInfo>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label={t('Collection Name')}
            rules={[
              { required: true, message: t('Please enter a collection name') },
              { max: 255, message: t('Name must be less than 255 characters') },
            ]}
          >
            <Input
              placeholder={t('Enter collection name')}
              onChange={handleNameChange}
              autoFocus
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label={t('URL Slug')}
            rules={[
              { required: true, message: t('Please enter a URL slug') },
              { max: 255, message: t('Slug must be less than 255 characters') },
              { 
                pattern: /^[a-z0-9-_]+$/, 
                message: t('Slug can only contain lowercase letters, numbers, hyphens, and underscores') 
              },
            ]}
          >
            <Input
              placeholder={t('url-friendly-name')}
              onChange={handleSlugChange}
            />
          </Form.Item>

          {currentSlug && (
            <SlugPreview>
              {t('URL: /collections/%s', currentSlug)}
            </SlugPreview>
          )}

          <Form.Item
            name="description"
            label={t('Description')}
            rules={[
              { max: 1000, message: t('Description must be less than 1000 characters') },
            ]}
          >
            <TextArea
              rows={3}
              placeholder={t('Optional description for this collection')}
            />
          </Form.Item>

          {parentOptions.length > 0 && (
            <>

              <Form.Item
                name="parent_id"
                label={t('Parent Collection')}
              >
              <Select
                placeholder={t('Select parent collection (optional)')}
                allowClear
                showSearch
                filterOption={(input, option) => 
                  String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                options={parentOptions}

              />
            </Form.Item>
            </>
          )}

          <Form.Item
            name="is_official"
            label={t('Official Collection')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <div style={{ fontSize: 12, color: '#666', marginTop: -8 }}>
            {t('Official collections are highlighted and appear at the top of lists')}
          </div>
        </Form>
      </FormContainer>
    </Modal>
  );
};

export default CreateCollectionModal;
