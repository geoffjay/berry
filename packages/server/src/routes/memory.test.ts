import { describe, expect, test } from "bun:test";
import type { MemoryType, CreateMemoryRequest, SearchMemoriesRequest } from "../types";

/**
 * Validate memory type (copied from memory.ts for testing)
 */
function isValidMemoryType(type: unknown): type is MemoryType {
  return type === "question" || type === "request" || type === "information";
}

/**
 * Validate create memory request (copied from memory.ts for testing)
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
  }

  return { valid: true, data };
}

/**
 * Validate search request (copied from memory.ts for testing)
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

describe("isValidMemoryType", () => {
  test("accepts 'question' as valid", () => {
    expect(isValidMemoryType("question")).toBe(true);
  });

  test("accepts 'request' as valid", () => {
    expect(isValidMemoryType("request")).toBe(true);
  });

  test("accepts 'information' as valid", () => {
    expect(isValidMemoryType("information")).toBe(true);
  });

  test("rejects invalid string types", () => {
    expect(isValidMemoryType("invalid")).toBe(false);
    expect(isValidMemoryType("")).toBe(false);
    expect(isValidMemoryType("QUESTION")).toBe(false);
  });

  test("rejects non-string types", () => {
    expect(isValidMemoryType(null)).toBe(false);
    expect(isValidMemoryType(undefined)).toBe(false);
    expect(isValidMemoryType(123)).toBe(false);
    expect(isValidMemoryType({})).toBe(false);
    expect(isValidMemoryType([])).toBe(false);
  });
});

describe("validateCreateRequest", () => {
  test("validates a correct request", () => {
    const result = validateCreateRequest({
      content: "test content",
      type: "information",
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.content).toBe("test content");
      expect(result.data.type).toBe("information");
    }
  });

  test("rejects null body", () => {
    const result = validateCreateRequest(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("Request body is required");
    }
  });

  test("rejects undefined body", () => {
    const result = validateCreateRequest(undefined);
    expect(result.valid).toBe(false);
  });

  test("rejects missing content", () => {
    const result = validateCreateRequest({ type: "information" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("content is required and must be a string");
    }
  });

  test("rejects non-string content", () => {
    const result = validateCreateRequest({ content: 123, type: "information" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("content is required and must be a string");
    }
  });

  test("rejects missing type", () => {
    const result = validateCreateRequest({ content: "test" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("type is required");
    }
  });

  test("rejects invalid type", () => {
    const result = validateCreateRequest({ content: "test", type: "invalid" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("type is required");
    }
  });

  test("accepts valid metadata", () => {
    const result = validateCreateRequest({
      content: "test content",
      type: "information",
      metadata: {
        createdBy: "user1",
        tags: ["tag1", "tag2"],
        references: ["ref1"],
      },
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.metadata?.createdBy).toBe("user1");
      expect(result.data.metadata?.tags).toEqual(["tag1", "tag2"]);
      expect(result.data.metadata?.references).toEqual(["ref1"]);
    }
  });

  test("rejects non-string createdBy", () => {
    const result = validateCreateRequest({
      content: "test",
      type: "information",
      metadata: { createdBy: 123 },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("metadata.createdBy must be a string");
    }
  });

  test("rejects non-array tags", () => {
    const result = validateCreateRequest({
      content: "test",
      type: "information",
      metadata: { tags: "not-an-array" },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("metadata.tags must be an array of strings");
    }
  });

  test("rejects tags with non-string elements", () => {
    const result = validateCreateRequest({
      content: "test",
      type: "information",
      metadata: { tags: ["valid", 123] },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("metadata.tags must be an array of strings");
    }
  });

  test("rejects non-array references", () => {
    const result = validateCreateRequest({
      content: "test",
      type: "information",
      metadata: { references: "not-an-array" },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("metadata.references must be an array of strings");
    }
  });

  test("rejects references with non-string elements", () => {
    const result = validateCreateRequest({
      content: "test",
      type: "information",
      metadata: { references: ["valid", 456] },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("metadata.references must be an array of strings");
    }
  });
});

describe("validateSearchRequest", () => {
  test("accepts empty object", () => {
    const result = validateSearchRequest({});
    expect(result.valid).toBe(true);
  });

  test("accepts valid query string", () => {
    const result = validateSearchRequest({ query: "test query" });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.query).toBe("test query");
    }
  });

  test("rejects non-string query", () => {
    const result = validateSearchRequest({ query: 123 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("query must be a string");
    }
  });

  test("accepts valid limit", () => {
    const result = validateSearchRequest({ limit: 10 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.limit).toBe(10);
    }
  });

  test("rejects non-number limit", () => {
    const result = validateSearchRequest({ limit: "ten" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("limit must be a positive number");
    }
  });

  test("rejects zero limit", () => {
    const result = validateSearchRequest({ limit: 0 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("limit must be a positive number");
    }
  });

  test("rejects negative limit", () => {
    const result = validateSearchRequest({ limit: -5 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("limit must be a positive number");
    }
  });

  test("rejects null body", () => {
    const result = validateSearchRequest(null);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("Request body is required");
    }
  });

  test("rejects undefined body", () => {
    const result = validateSearchRequest(undefined);
    expect(result.valid).toBe(false);
  });

  test("rejects non-object filters", () => {
    const result = validateSearchRequest({ filters: "invalid" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters must be an object");
    }
  });

  test("rejects null filters", () => {
    const result = validateSearchRequest({ filters: null });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters must be an object");
    }
  });

  test("accepts valid type filter", () => {
    const result = validateSearchRequest({ filters: { type: "question" } });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.filters?.type).toBe("question");
    }
  });

  test("rejects invalid type filter", () => {
    const result = validateSearchRequest({ filters: { type: "invalid" } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("filters.type must be");
    }
  });

  test("accepts valid createdBy filter", () => {
    const result = validateSearchRequest({ filters: { createdBy: "user1" } });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.filters?.createdBy).toBe("user1");
    }
  });

  test("rejects non-string createdBy filter", () => {
    const result = validateSearchRequest({ filters: { createdBy: 123 } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.createdBy must be a string");
    }
  });

  test("accepts valid tags filter", () => {
    const result = validateSearchRequest({ filters: { tags: ["tag1", "tag2"] } });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.filters?.tags).toEqual(["tag1", "tag2"]);
    }
  });

  test("rejects non-array tags filter", () => {
    const result = validateSearchRequest({ filters: { tags: "tag1" } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.tags must be an array of strings");
    }
  });

  test("rejects tags filter with non-string elements", () => {
    const result = validateSearchRequest({ filters: { tags: ["tag1", 123] } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.tags must be an array of strings");
    }
  });

  test("accepts valid references filter", () => {
    const result = validateSearchRequest({ filters: { references: ["ref1"] } });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.filters?.references).toEqual(["ref1"]);
    }
  });

  test("rejects non-array references filter", () => {
    const result = validateSearchRequest({ filters: { references: "ref1" } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.references must be an array of strings");
    }
  });

  test("rejects references filter with non-string elements", () => {
    const result = validateSearchRequest({ filters: { references: ["ref1", 456] } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.references must be an array of strings");
    }
  });

  test("accepts valid dateRange filter", () => {
    const result = validateSearchRequest({
      filters: {
        dateRange: {
          from: "2024-01-01",
          to: "2024-12-31",
        },
      },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.filters?.dateRange?.from).toBe("2024-01-01");
      expect(result.data.filters?.dateRange?.to).toBe("2024-12-31");
    }
  });

  test("accepts dateRange with only from", () => {
    const result = validateSearchRequest({
      filters: { dateRange: { from: "2024-01-01" } },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.filters?.dateRange?.from).toBe("2024-01-01");
      expect(result.data.filters?.dateRange?.to).toBeUndefined();
    }
  });

  test("accepts dateRange with only to", () => {
    const result = validateSearchRequest({
      filters: { dateRange: { to: "2024-12-31" } },
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.filters?.dateRange?.from).toBeUndefined();
      expect(result.data.filters?.dateRange?.to).toBe("2024-12-31");
    }
  });

  test("rejects non-object dateRange", () => {
    const result = validateSearchRequest({ filters: { dateRange: "invalid" } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.dateRange must be an object");
    }
  });

  test("rejects null dateRange", () => {
    const result = validateSearchRequest({ filters: { dateRange: null } });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.dateRange must be an object");
    }
  });

  test("rejects non-string dateRange.from", () => {
    const result = validateSearchRequest({
      filters: { dateRange: { from: 20240101 } },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.dateRange.from must be an ISO date string");
    }
  });

  test("rejects non-string dateRange.to", () => {
    const result = validateSearchRequest({
      filters: { dateRange: { to: 20241231 } },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("filters.dateRange.to must be an ISO date string");
    }
  });

  test("accepts complete search request", () => {
    const result = validateSearchRequest({
      query: "test query",
      limit: 20,
      filters: {
        type: "information",
        createdBy: "user1",
        tags: ["important"],
        references: ["ref1"],
        dateRange: {
          from: "2024-01-01",
          to: "2024-12-31",
        },
      },
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.query).toBe("test query");
      expect(result.data.limit).toBe(20);
      expect(result.data.filters?.type).toBe("information");
      expect(result.data.filters?.createdBy).toBe("user1");
      expect(result.data.filters?.tags).toEqual(["important"]);
      expect(result.data.filters?.references).toEqual(["ref1"]);
      expect(result.data.filters?.dateRange?.from).toBe("2024-01-01");
      expect(result.data.filters?.dateRange?.to).toBe("2024-12-31");
    }
  });
});
