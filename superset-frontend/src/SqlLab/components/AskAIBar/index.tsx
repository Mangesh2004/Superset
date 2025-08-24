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
import { styled, SupersetClient, t } from '@superset-ui/core';
import { Button, Input } from '@superset-ui/core/components';

const StyledContainer = styled.div`
  ${({ theme }) => `
    display: flex;
    gap: ${theme.sizeUnit * 2}px;
    align-items: center;
    margin-bottom: ${theme.sizeUnit * 2}px;
    padding: ${theme.sizeUnit * 2}px;
    background-color: ${theme.colors.grayscale.light4};
    border-radius: ${theme.borderRadius}px;
    border: 1px solid ${theme.colors.grayscale.light2};
  `}
`;

const StyledInput = styled(Input)`
  ${({ theme }) => `
    flex: 1;
    min-width: 300px;
    
    &::placeholder {
      color: ${theme.colors.grayscale.light1};
    }
  `}
`;

const StyledButton = styled(Button)`
  ${({ theme }) => `
    min-width: ${theme.sizeUnit * 20}px;
  `}
`;

interface AskAIBarProps {
  databaseId?: number;
  schema?: string;
  onSQLReady: (sql: string) => void;
  isEnabled: boolean;
}

const AskAIBar: React.FC<AskAIBarProps> = ({
  databaseId,
  schema,
  onSQLReady,
  isEnabled,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = !isEnabled || !databaseId || !schema || loading || !question.trim();

  const handleSubmit = useCallback(async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('AskAI: Button clicked!', { databaseId, schema, question, isDisabled });
    
    if (isDisabled) {
      console.log('AskAI: Button disabled, not submitting');
      return;
    }

    setLoading(true);
    setError(null);

    console.log('AskAI: Making API call to /api/v1/ai/sql');

    try {
      const { json } = await SupersetClient.post({
        endpoint: '/api/v1/ai/sql',
        jsonPayload: {
          database_id: databaseId,
          schema,
          question: question.trim(),
        },
      });

      const sql = json?.result?.sql || '-- AI did not return SQL';
      console.log('AskAI: Received response:', { sql: sql.substring(0, 100) + '...' });
      onSQLReady(sql);
      
      // Clear the question on successful generation
      setQuestion('');
      
    } catch (error: any) {
      console.error('AskAI: API call failed:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      setError(errorMessage);
      
      // Show error as SQL comment
      const errorSQL = `-- AI Error: ${errorMessage}\n-- Please try rephrasing your question or check your database connection.`;
      onSQLReady(errorSQL);
      
    } finally {
      setLoading(false);
    }
  }, [databaseId, schema, question, onSQLReady, isDisabled]);



  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(event.target.value);
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  }, [error]);

  if (!isEnabled) {
    return null;
  }

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        // Call submit without passing the keyboard event (so it treats like click)
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <StyledContainer>
      <StyledInput
        placeholder={t('Ask AI: e.g., "Show total sales by product for the last 6 months"')}
        value={question}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={loading}
        autoComplete="off"
        data-test="ask-ai-input"
      />
      <StyledButton
        buttonStyle="primary"
        buttonSize="small"
        disabled={isDisabled}
        loading={loading}
        onClick={handleSubmit}
        data-test="ask-ai-button"
      >
        {loading ? t('Thinking...') : t('Ask AI')}
      </StyledButton>
    </StyledContainer>
  );
};

export default AskAIBar;
