import { describe, expect, test } from 'bun:test';
import type { MemoryType } from '../types';

/**
 * Validate memory type (copied from memory.ts for testing)
 */
function isValidMemoryType(type: unknown): type is MemoryType {
  return type === 'question' || type === 'request' || type === 'information';
}

/**
 * Validate create memory request (simplified for testing)
 */
function validateCreateRequest(
  body: unknown
): { valid: true; data: { content: string; type: MemoryType } } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const req = body as Record<string, unknown>;

  if (!req.content || typeof req.content !== 'string') {
    return { valid: false, error: 'content is required and must be a string' };
  }

  if (!req.type || !isValidMemoryType(req.type)) {
    return {
      valid: false,
      error: "type is required and must be 'question', 'request', or 'information'",
    };
  }

  return {
    valid: true,
    data: {
      content: req.content,
      type: req.type,
    },
  };
}

describe('isValidMemoryType', () => {
  test("accepts 'question' as valid", () => {
    expect(isValidMemoryType('question')).toBe(true);
  });

  test("accepts 'request' as valid", () => {
    expect(isValidMemoryType('request')).toBe(true);
  });

  test("accepts 'information' as valid", () => {
    expect(isValidMemoryType('information')).toBe(true);
  });

  test('rejects invalid string types', () => {
    expect(isValidMemoryType('invalid')).toBe(false);
    expect(isValidMemoryType('')).toBe(false);
    expect(isValidMemoryType('QUESTION')).toBe(false);
  });

  test('rejects non-string types', () => {
    expect(isValidMemoryType(null)).toBe(false);
    expect(isValidMemoryType(undefined)).toBe(false);
    expect(isValidMemoryType(123)).toBe(false);
    expect(isValidMemoryType({})).toBe(false);
    expect(isValidMemoryType([])).toBe(false);
  });
});

describe('validateCreateRequest', () => {
  test('validates a correct request', () => {
    const result = validateCreateRequest({
      content: 'test content',
      type: 'information',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.content).toBe('test content');
      expect(result.data.type).toBe('information');
    }
  });

  test('rejects null body', () => {
    const result = validateCreateRequest(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('Request body is required');
    }
  });

  test('rejects undefined body', () => {
    const result = validateCreateRequest(undefined);
    expect(result.valid).toBe(false);
  });

  test('rejects missing content', () => {
    const result = validateCreateRequest({ type: 'information' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('content is required and must be a string');
    }
  });

  test('rejects non-string content', () => {
    const result = validateCreateRequest({ content: 123, type: 'information' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('content is required and must be a string');
    }
  });

  test('rejects missing type', () => {
    const result = validateCreateRequest({ content: 'test' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('type is required');
    }
  });

  test('rejects invalid type', () => {
    const result = validateCreateRequest({ content: 'test', type: 'invalid' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain('type is required');
    }
  });
});
