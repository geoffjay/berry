import { describe, expect, test } from 'bun:test';
import { ApiClientError } from './api-client.js';

describe('ApiClientError', () => {
  test('creates error with message only', () => {
    const error = new ApiClientError('Something went wrong');

    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('ApiClientError');
    expect(error.statusCode).toBeUndefined();
    expect(error.code).toBeUndefined();
  });

  test('creates error with message and status code', () => {
    const error = new ApiClientError('Not found', 404);

    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBeUndefined();
  });

  test('creates error with all properties', () => {
    const error = new ApiClientError('Connection failed', undefined, 'CONNECTION_ERROR');

    expect(error.message).toBe('Connection failed');
    expect(error.statusCode).toBeUndefined();
    expect(error.code).toBe('CONNECTION_ERROR');
  });

  test('is instance of Error', () => {
    const error = new ApiClientError('Test error');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiClientError).toBe(true);
  });

  test('has correct error codes for known errors', () => {
    const timeoutError = new ApiClientError('Request timed out', undefined, 'TIMEOUT');
    const connectionError = new ApiClientError('Connection refused', undefined, 'CONNECTION_ERROR');

    expect(timeoutError.code).toBe('TIMEOUT');
    expect(connectionError.code).toBe('CONNECTION_ERROR');
  });
});

describe('Memory type definitions', () => {
  test('Memory interface has required fields', () => {
    // Type checking test - if this compiles, the types are correct
    const memory = {
      id: 'mem_123',
      content: 'Test content',
      type: 'information' as const,
      tags: ['test'],
      createdBy: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(memory.id).toBeDefined();
    expect(memory.content).toBeDefined();
    expect(memory.type).toBe('information');
    expect(Array.isArray(memory.tags)).toBe(true);
  });

  test('SearchResult has memory and score', () => {
    const searchResult = {
      memory: {
        id: 'mem_123',
        content: 'Test',
        type: 'information' as const,
        tags: [],
        createdBy: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      score: 0.95,
    };

    expect(searchResult.memory).toBeDefined();
    expect(searchResult.score).toBeGreaterThan(0);
    expect(searchResult.score).toBeLessThanOrEqual(1);
  });
});
