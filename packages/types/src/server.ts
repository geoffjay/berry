import type { MemoryType, VisibilityLevel } from "./memory.js";

/**
 * Server memory metadata format
 */
export interface ServerMemoryMetadata {
  createdAt: string;
  createdBy?: string;
  respondedBy?: string;
  response?: string;
  respondedAt?: string;
  tags?: string[];
  owner?: string;
  visibility?: VisibilityLevel;
  sharedWith?: string[];
}

/**
 * Memory format returned from the server
 */
export interface ServerMemory {
  id: string;
  content: string;
  type: MemoryType;
  metadata: ServerMemoryMetadata;
}

/**
 * Server search request format
 */
export interface ServerSearchRequest {
  query?: string;
  filters?: {
    type?: MemoryType;
    createdBy?: string;
    tags?: string[];
    references?: string[];
    dateRange?: {
      from?: string;
      to?: string;
    };
  };
  limit?: number;
  asActor?: string;
  adminAccess?: boolean;
}
