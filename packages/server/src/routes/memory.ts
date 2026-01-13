/**
 * Memory API routes
 */

import { Hono, type Context } from 'hono';
import { getChromaDBService } from '../services/chromadb';
import type {
  ApiResponse,
  Memory,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  MemoryType,
} from '../types';

const memoryRoutes = new Hono();

/**
 * Validate memory type
 */
function isValidMemoryType(type: unknown): type is MemoryType {
  return type === 'question' || type === 'request' || type === 'information';
}

/**
 * Validate create memory request
 */
function validateCreateRequest(
  body: unknown
): { valid: true; data: CreateMemoryRequest } | { valid: false; error: string } {
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

  const data: CreateMemoryRequest = {
    content: req.content,
    type: req.type,
  };

  if (req.metadata && typeof req.metadata === 'object') {
    const meta = req.metadata as Record<string, unknown>;
    data.metadata = {};

    if (meta.createdBy !== undefined) {
      if (typeof meta.createdBy !== 'string') {
        return { valid: false, error: 'metadata.createdBy must be a string' };
      }
      data.metadata.createdBy = meta.createdBy;
    }

    if (meta.tags !== undefined) {
      if (!Array.isArray(meta.tags) || !meta.tags.every((t) => typeof t === 'string')) {
        return {
          valid: false,
          error: 'metadata.tags must be an array of strings',
        };
      }
      data.metadata.tags = meta.tags;
    }
  }

  return { valid: true, data };
}

/**
 * Validate search request
 */
function validateSearchRequest(
  body: unknown
): { valid: true; data: SearchMemoriesRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const req = body as Record<string, unknown>;
  const data: SearchMemoriesRequest = {};

  if (req.query !== undefined) {
    if (typeof req.query !== 'string') {
      return { valid: false, error: 'query must be a string' };
    }
    data.query = req.query;
  }

  if (req.limit !== undefined) {
    if (typeof req.limit !== 'number' || req.limit < 1) {
      return { valid: false, error: 'limit must be a positive number' };
    }
    data.limit = req.limit;
  }

  if (req.filters !== undefined) {
    if (typeof req.filters !== 'object' || req.filters === null) {
      return { valid: false, error: 'filters must be an object' };
    }

    const filters = req.filters as Record<string, unknown>;
    data.filters = {};

    if (filters.type !== undefined) {
      if (!isValidMemoryType(filters.type)) {
        return {
          valid: false,
          error: "filters.type must be 'question', 'request', or 'information'",
        };
      }
      data.filters.type = filters.type;
    }

    if (filters.createdBy !== undefined) {
      if (typeof filters.createdBy !== 'string') {
        return { valid: false, error: 'filters.createdBy must be a string' };
      }
      data.filters.createdBy = filters.createdBy;
    }

    if (filters.tags !== undefined) {
      if (!Array.isArray(filters.tags) || !filters.tags.every((t) => typeof t === 'string')) {
        return {
          valid: false,
          error: 'filters.tags must be an array of strings',
        };
      }
      data.filters.tags = filters.tags;
    }

    if (filters.dateRange !== undefined) {
      if (typeof filters.dateRange !== 'object' || filters.dateRange === null) {
        return { valid: false, error: 'filters.dateRange must be an object' };
      }

      const dateRange = filters.dateRange as Record<string, unknown>;
      data.filters.dateRange = {};

      if (dateRange.from !== undefined) {
        if (typeof dateRange.from !== 'string') {
          return { valid: false, error: 'filters.dateRange.from must be an ISO date string' };
        }
        data.filters.dateRange.from = dateRange.from;
      }

      if (dateRange.to !== undefined) {
        if (typeof dateRange.to !== 'string') {
          return { valid: false, error: 'filters.dateRange.to must be an ISO date string' };
        }
        data.filters.dateRange.to = dateRange.to;
      }
    }
  }

  return { valid: true, data };
}

/**
 * GET /v1/memory/:id - Retrieve a single memory by ID
 */
memoryRoutes.get('/v1/memory/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const chromaDB = getChromaDBService();
    const memory = await chromaDB.getMemory(id);

    if (!memory) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Memory not found',
      };
      return c.json(response, 404);
    }

    const response: ApiResponse<Memory> = {
      success: true,
      data: memory,
    };
    return c.json(response, 200);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve memory',
    };
    return c.json(response, 500);
  }
});

/**
 * POST /v1/memory - Create a new memory
 */
memoryRoutes.post('/v1/memory', async (c: Context) => {
  try {
    const body = await c.req.json();
    const validation = validateCreateRequest(body);

    if (!validation.valid) {
      const response: ApiResponse<null> = {
        success: false,
        error: validation.error,
      };
      return c.json(response, 400);
    }

    const chromaDB = getChromaDBService();
    const memory = await chromaDB.addMemory(validation.data);

    const response: ApiResponse<Memory> = {
      success: true,
      data: memory,
    };
    return c.json(response, 201);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create memory',
    };
    return c.json(response, 500);
  }
});

/**
 * DELETE /v1/memory/:id - Delete a memory by ID
 */
memoryRoutes.delete('/v1/memory/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const chromaDB = getChromaDBService();
    const deleted = await chromaDB.deleteMemory(id);

    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Memory not found',
      };
      return c.json(response, 404);
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    };
    return c.json(response, 200);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete memory',
    };
    return c.json(response, 500);
  }
});

/**
 * POST /v1/search - Search memories by content/metadata
 */
memoryRoutes.post('/v1/search', async (c: Context) => {
  try {
    const body = await c.req.json();
    const validation = validateSearchRequest(body);

    if (!validation.valid) {
      const response: ApiResponse<null> = {
        success: false,
        error: validation.error,
      };
      return c.json(response, 400);
    }

    const chromaDB = getChromaDBService();
    const memories = await chromaDB.searchMemories(validation.data);

    const response: ApiResponse<Memory[]> = {
      success: true,
      data: memories,
    };
    return c.json(response, 200);
  } catch (error) {
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search memories',
    };
    return c.json(response, 500);
  }
});

export { memoryRoutes };
