/**
 * Memory types supported by Berry
 */
export type MemoryType = "question" | "request" | "information";

/**
 * Visibility levels for memory access control
 */
export type VisibilityLevel = "private" | "shared" | "public";

/**
 * Memory object returned from the API (client format)
 */
export interface Memory {
  id: string;
  content: string;
  type: MemoryType;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  visibility?: VisibilityLevel;
  sharedWith?: string[];
}

/**
 * Request payload for creating a memory
 */
export interface CreateMemoryRequest {
  content: string;
  type?: MemoryType;
  tags?: string[];
  createdBy?: string;
  references?: string[];
  visibility?: VisibilityLevel;
  sharedWith?: string[];
}

/**
 * Request payload for searching memories
 */
export interface SearchMemoriesRequest {
  query: string;
  asActor?: string;
  type?: MemoryType;
  tags?: string[];
  references?: string[];
  limit?: number;
  from?: string;
  to?: string;
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  memory: Memory;
  score: number;
}
