/**
 * Memory API routes
 */

import { Hono, type Context } from "hono";
import { getChromaDBService } from "../services/chromadb";
import { getRouteLogger } from "../services/logger";
import type {
  ApiResponse,
  Memory,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  MemoryType,
  VisibilityLevel,
  VisibilityContext,
} from "../types";
import { HUMAN_OWNER_ID } from "../types";

const memoryRoutes = new Hono();
const logger = getRouteLogger();

/**
 * Validate memory type
 */
function isValidMemoryType(type: unknown): type is MemoryType {
  return type === "question" || type === "request" || type === "information";
}

/**
 * Validate visibility level
 */
function isValidVisibility(visibility: unknown): visibility is VisibilityLevel {
  return visibility === "private" || visibility === "shared" || visibility === "public";
}

/**
 * Validate create memory request
 */
function validateCreateRequest(
  body: unknown
): { valid: true; data: CreateMemoryRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const req = body as Record<string, unknown>;

  if (!req.content || typeof req.content !== "string") {
    return { valid: false, error: "content is required and must be a string" };
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

  if (req.metadata && typeof req.metadata === "object") {
    const meta = req.metadata as Record<string, unknown>;
    data.metadata = {};

    if (meta.createdBy !== undefined) {
      if (typeof meta.createdBy !== "string") {
        return { valid: false, error: "metadata.createdBy must be a string" };
      }
      data.metadata.createdBy = meta.createdBy;
    }

    if (meta.tags !== undefined) {
      if (!Array.isArray(meta.tags) || !meta.tags.every((t) => typeof t === "string")) {
        return {
          valid: false,
          error: "metadata.tags must be an array of strings",
        };
      }
      data.metadata.tags = meta.tags;
    }

    if (meta.references !== undefined) {
      if (!Array.isArray(meta.references) || !meta.references.every((r) => typeof r === "string")) {
        return {
          valid: false,
          error: "metadata.references must be an array of strings",
        };
      }
      data.metadata.references = meta.references;
    }

    if (meta.owner !== undefined) {
      if (typeof meta.owner !== "string" || meta.owner.trim() === "") {
        return { valid: false, error: "metadata.owner must be a non-empty string" };
      }
      data.metadata.owner = meta.owner;
    }

    if (meta.visibility !== undefined) {
      if (!isValidVisibility(meta.visibility)) {
        return {
          valid: false,
          error: "metadata.visibility must be 'private', 'shared', or 'public'",
        };
      }
      data.metadata.visibility = meta.visibility;
    }

    if (meta.sharedWith !== undefined) {
      if (!Array.isArray(meta.sharedWith) || !meta.sharedWith.every((s) => typeof s === "string")) {
        return {
          valid: false,
          error: "metadata.sharedWith must be an array of strings",
        };
      }
      data.metadata.sharedWith = meta.sharedWith;
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
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" };
  }

  const req = body as Record<string, unknown>;
  const data: SearchMemoriesRequest = {};

  if (req.query !== undefined) {
    if (typeof req.query !== "string") {
      return { valid: false, error: "query must be a string" };
    }
    data.query = req.query;
  }

  if (req.limit !== undefined) {
    if (typeof req.limit !== "number" || req.limit < 1) {
      return { valid: false, error: "limit must be a positive number" };
    }
    data.limit = req.limit;
  }

  if (req.filters !== undefined) {
    if (typeof req.filters !== "object" || req.filters === null) {
      return { valid: false, error: "filters must be an object" };
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
      if (typeof filters.createdBy !== "string") {
        return { valid: false, error: "filters.createdBy must be a string" };
      }
      data.filters.createdBy = filters.createdBy;
    }

    if (filters.tags !== undefined) {
      if (!Array.isArray(filters.tags) || !filters.tags.every((t) => typeof t === "string")) {
        return {
          valid: false,
          error: "filters.tags must be an array of strings",
        };
      }
      data.filters.tags = filters.tags;
    }

    if (filters.references !== undefined) {
      if (
        !Array.isArray(filters.references) ||
        !filters.references.every((r) => typeof r === "string")
      ) {
        return {
          valid: false,
          error: "filters.references must be an array of strings",
        };
      }
      data.filters.references = filters.references;
    }

    if (filters.dateRange !== undefined) {
      if (typeof filters.dateRange !== "object" || filters.dateRange === null) {
        return { valid: false, error: "filters.dateRange must be an object" };
      }

      const dateRange = filters.dateRange as Record<string, unknown>;
      data.filters.dateRange = {};

      if (dateRange.from !== undefined) {
        if (typeof dateRange.from !== "string") {
          return { valid: false, error: "filters.dateRange.from must be an ISO date string" };
        }
        data.filters.dateRange.from = dateRange.from;
      }

      if (dateRange.to !== undefined) {
        if (typeof dateRange.to !== "string") {
          return { valid: false, error: "filters.dateRange.to must be an ISO date string" };
        }
        data.filters.dateRange.to = dateRange.to;
      }
    }
  }

  return { valid: true, data };
}

/**
 * GET /v1/memory/:id - Retrieve a single memory by ID
 * Query params:
 *   - asActor: Actor ID for visibility check (optional)
 *   - adminAccess: If true and asActor is human, bypass visibility (optional)
 */
memoryRoutes.get("/v1/memory/:id", async (c: Context) => {
  const id = c.req.param("id");
  const asActor = c.req.query("asActor");
  const adminAccess = c.req.query("adminAccess") === "true";

  try {
    const chromaDB = getChromaDBService();
    const memory = await chromaDB.getMemory(id);

    if (!memory) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Memory not found",
      };
      return c.json(response, 404);
    }

    // Check visibility access if asActor is provided
    if (asActor) {
      const hasAccess = chromaDB.checkMemoryAccess(memory, asActor, adminAccess);
      if (!hasAccess) {
        const response: ApiResponse<null> = {
          success: false,
          error: "Access denied",
        };
        return c.json(response, 403);
      }
    }

    const response: ApiResponse<Memory> = {
      success: true,
      data: memory,
    };
    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to retrieve memory", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retrieve memory",
    };
    return c.json(response, 500);
  }
});

/**
 * POST /v1/memory - Create a new memory
 */
memoryRoutes.post("/v1/memory", async (c: Context) => {
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
    logger.error("Failed to create memory", {
      error: error instanceof Error ? error.message : String(error),
    });
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create memory",
    };
    return c.json(response, 500);
  }
});

/**
 * DELETE /v1/memory/:id - Delete a memory by ID
 * Query params:
 *   - asActor: Actor ID requesting deletion (optional but recommended for access control)
 *   - adminAccess: If true and asActor is human, bypass ownership check (optional)
 */
memoryRoutes.delete("/v1/memory/:id", async (c: Context) => {
  const id = c.req.param("id");
  const asActor = c.req.query("asActor");
  const adminAccess = c.req.query("adminAccess") === "true";

  try {
    const chromaDB = getChromaDBService();

    // If asActor provided, check ownership before deletion
    if (asActor) {
      const memory = await chromaDB.getMemory(id);

      if (!memory) {
        const response: ApiResponse<null> = {
          success: false,
          error: "Memory not found",
        };
        return c.json(response, 404);
      }

      const owner = memory.metadata.owner || memory.metadata.createdBy;
      const isOwner = owner === asActor;
      const isHumanAdmin = asActor === HUMAN_OWNER_ID && adminAccess;

      if (!isOwner && !isHumanAdmin) {
        const response: ApiResponse<null> = {
          success: false,
          error: "Only the owner can delete this memory",
        };
        return c.json(response, 403);
      }
    }

    const deleted = await chromaDB.deleteMemory(id);

    if (!deleted) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Memory not found",
      };
      return c.json(response, 404);
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    };
    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to delete memory", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete memory",
    };
    return c.json(response, 500);
  }
});

/**
 * POST /v1/search - Search memories by content/metadata
 * Body params:
 *   - asActor: Actor ID for visibility filtering (optional)
 *   - adminAccess: If true and asActor is human, bypass visibility (optional)
 */
memoryRoutes.post("/v1/search", async (c: Context) => {
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

    // Extract visibility context from body
    const reqBody = body as Record<string, unknown>;
    let visibilityContext: VisibilityContext | undefined;
    if (reqBody.asActor && typeof reqBody.asActor === "string") {
      visibilityContext = {
        asActor: reqBody.asActor,
        adminAccess: reqBody.adminAccess === true,
      };
    }

    const chromaDB = getChromaDBService();
    const memories = await chromaDB.searchMemories(validation.data, visibilityContext);

    const response: ApiResponse<Memory[]> = {
      success: true,
      data: memories,
    };
    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to search memories", {
      error: error instanceof Error ? error.message : String(error),
    });
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search memories",
    };
    return c.json(response, 500);
  }
});

/**
 * PATCH /v1/memory/:id/visibility - Update memory visibility settings
 * Body params:
 *   - asActor: Actor ID requesting the update (required)
 *   - adminAccess: If true and asActor is human, bypass ownership check (optional)
 *   - visibility: New visibility level (required)
 *   - sharedWith: New shared actor list (optional, for 'shared' visibility)
 */
memoryRoutes.patch("/v1/memory/:id/visibility", async (c: Context) => {
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const reqBody = body as Record<string, unknown>;

    // Validate asActor
    if (!reqBody.asActor || typeof reqBody.asActor !== "string") {
      const response: ApiResponse<null> = {
        success: false,
        error: "asActor is required",
      };
      return c.json(response, 400);
    }

    // Validate visibility
    if (!reqBody.visibility || !isValidVisibility(reqBody.visibility)) {
      const response: ApiResponse<null> = {
        success: false,
        error: "visibility is required and must be 'private', 'shared', or 'public'",
      };
      return c.json(response, 400);
    }

    // Validate sharedWith if provided
    let sharedWith: string[] | undefined;
    if (reqBody.sharedWith !== undefined) {
      if (
        !Array.isArray(reqBody.sharedWith) ||
        !reqBody.sharedWith.every((s) => typeof s === "string")
      ) {
        const response: ApiResponse<null> = {
          success: false,
          error: "sharedWith must be an array of strings",
        };
        return c.json(response, 400);
      }
      sharedWith = reqBody.sharedWith as string[];
    }

    const asActor = reqBody.asActor as string;
    const adminAccess = reqBody.adminAccess === true;
    const visibility = reqBody.visibility as VisibilityLevel;

    const chromaDB = getChromaDBService();

    // Get existing memory
    const memory = await chromaDB.getMemory(id);
    if (!memory) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Memory not found",
      };
      return c.json(response, 404);
    }

    // Check ownership (only owner or human admin can change visibility)
    const owner = memory.metadata.owner || memory.metadata.createdBy;
    const isOwner = owner === asActor;
    const isHumanAdmin = asActor === HUMAN_OWNER_ID && adminAccess;

    if (!isOwner && !isHumanAdmin) {
      const response: ApiResponse<null> = {
        success: false,
        error: "Only the owner can modify visibility",
      };
      return c.json(response, 403);
    }

    // Update visibility
    const updatedMemory = await chromaDB.updateVisibility(id, visibility, sharedWith);

    const response: ApiResponse<Memory> = {
      success: true,
      data: updatedMemory!,
    };
    return c.json(response, 200);
  } catch (error) {
    logger.error("Failed to update visibility", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update visibility",
    };
    return c.json(response, 500);
  }
});

export { memoryRoutes };
