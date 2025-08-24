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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupersetClient } from '@superset-ui/core';

import AskAIBar from 'src/SqlLab/components/AskAIBar';
import { createWrapper } from 'spec/helpers/testing-library';

// Mock SupersetClient
jest.mock('@superset-ui/core', () => ({
  ...jest.requireActual('@superset-ui/core'),
  SupersetClient: {
    post: jest.fn(),
  },
}));

const mockSupersetClient = SupersetClient as jest.Mocked<typeof SupersetClient>;

const defaultProps = {
  databaseId: 1,
  schema: 'public',
  onSQLReady: jest.fn(),
  isEnabled: true,
};

describe('AskAIBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders when enabled', () => {
    render(<AskAIBar {...defaultProps} />, { wrapper: createWrapper() });
    
    expect(screen.getByTestId('ask-ai-input')).toBeInTheDocument();
    expect(screen.getByTestId('ask-ai-button')).toBeInTheDocument();
    expect(screen.getByText('Ask AI')).toBeInTheDocument();
  });

  test('does not render when disabled', () => {
    render(<AskAIBar {...defaultProps} isEnabled={false} />, {
      wrapper: createWrapper(),
    });
    
    expect(screen.queryByTestId('ask-ai-input')).not.toBeInTheDocument();
  });

  test('button is disabled when required props missing', () => {
    render(
      <AskAIBar {...defaultProps} databaseId={undefined} />,
      { wrapper: createWrapper() }
    );
    
    const button = screen.getByTestId('ask-ai-button');
    expect(button).toBeDisabled();
  });

  test('button is disabled when question is empty', () => {
    render(<AskAIBar {...defaultProps} />, { wrapper: createWrapper() });
    
    const button = screen.getByTestId('ask-ai-button');
    expect(button).toBeDisabled();
  });

  test('button is enabled when question is provided', async () => {
    const user = userEvent;
    render(<AskAIBar {...defaultProps} />, { wrapper: createWrapper() });
    
    const input = screen.getByTestId('ask-ai-input');
    const button = screen.getByTestId('ask-ai-button');
    
    await user.type(input, 'Show me all users');
    
    expect(button).not.toBeDisabled();
  });

  test('submits question and calls onSQLReady with result', async () => {
    const user = userEvent;
    const onSQLReady = jest.fn();
    
    mockSupersetClient.post.mockResolvedValue({
      json: {
        result: {
          sql: 'SELECT * FROM users LIMIT 500;',
        },
      },
    } as any);

    render(
      <AskAIBar {...defaultProps} onSQLReady={onSQLReady} />,
      { wrapper: createWrapper() }
    );
    
    const input = screen.getByTestId('ask-ai-input');
    const button = screen.getByTestId('ask-ai-button');
    
    await user.type(input, 'Show me all users');
    await user.click(button);
    
    expect(mockSupersetClient.post).toHaveBeenCalledWith({
      endpoint: '/api/v1/ai/sql',
      jsonPayload: {
        database_id: 1,
        schema: 'public',
        question: 'Show me all users',
      },
    });

    await waitFor(() => {
      expect(onSQLReady).toHaveBeenCalledWith('SELECT * FROM users LIMIT 500;');
    });
  });

  test('handles API error and shows error message', async () => {
    const user = userEvent;
    const onSQLReady = jest.fn();
    
    mockSupersetClient.post.mockRejectedValue(new Error('API Error'));

    render(
      <AskAIBar {...defaultProps} onSQLReady={onSQLReady} />,
      { wrapper: createWrapper() }
    );
    
    const input = screen.getByTestId('ask-ai-input');
    const button = screen.getByTestId('ask-ai-button');
    
    await user.type(input, 'Show me all users');
    await user.click(button);

    await waitFor(() => {
      expect(onSQLReady).toHaveBeenCalledWith(
        expect.stringContaining('-- AI Error: API Error')
      );
    });
  });

  test('submits on Enter key press', async () => {
    const user = userEvent;
    
    mockSupersetClient.post.mockResolvedValue({
      json: {
        result: {
          sql: 'SELECT * FROM users LIMIT 500;',
        },
      },
    } as any);

    render(<AskAIBar {...defaultProps} />, { wrapper: createWrapper() });
    
    const input = screen.getByTestId('ask-ai-input');
    
    await user.type(input, 'Show me all users');
    await user.keyboard('{Enter}');
    
    expect(mockSupersetClient.post).toHaveBeenCalled();
  });

  test('shows loading state during API call', async () => {
    const user = userEvent;
    
    // Create a promise that we can control
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    mockSupersetClient.post.mockReturnValue(pendingPromise as any);

    render(<AskAIBar {...defaultProps} />, { wrapper: createWrapper() });
    
    const input = screen.getByTestId('ask-ai-input');
    const button = screen.getByTestId('ask-ai-button');
    
    await user.type(input, 'Show me all users');
    await user.click(button);
    
    // Check loading state
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    // Resolve the promise
    resolvePromise!({
      json: {
        result: {
          sql: 'SELECT * FROM users LIMIT 500;',
        },
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('Ask AI')).toBeInTheDocument();
    });
  });
});
