/**
 * Memory type definitions for the Berry server
 */

/**
 * The type of memory being stored
 */
export type MemoryType = "question" | "request" | "information";

/**
 * Metadata associated with a memory
 */
export interface MemoryMetadata {
  /** ISO timestamp when the memory was created */
  createdAt: string;
  /** Who created this memory */
  createdBy?: string;
  /** Who responded (for two-way types like questions/requests) */
  respondedBy?: string;
  /** The response content (for questions/requests) */
  response?: string;
  /** ISO timestamp when the response was provided */
  respondedAt?: string;
  /** Optional categorization tags */
  tags?: string[];
  /** References to other memory IDs that this memory relates to */
  references?: string[];
}

/**
 * A memory stored in the system
 */
export interface Memory {
  /** Unique identifier (ChromaDB document ID) */
  id: string;
  /** The actual memory content (embedded for vector search) */
  content: string;
  /** The type of memory */
  type: MemoryType;
  /** Additional metadata about the memory */
  metadata: MemoryMetadata;
}

/**
 * Request body for creating a new memory
 */
export interface CreateMemoryRequest {
  content: string;
  type: MemoryType;
  metadata?: {
    createdBy?: string;
    tags?: string[];
    references?: string[];
  };
}

/**
 * Date range filter for search queries
 */
export interface DateRangeFilter {
  /** ISO date string for the start of the range */
  from?: string;
  /** ISO date string for the end of the range */
  to?: string;
}

/**
 * Search filters for querying memories
 */
export interface SearchFilters {
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by creator */
  createdBy?: string;
  /** Filter by tags (matches if any tag is present) */
  tags?: string[];
  /** Filter by references (matches if any reference is present) */
  references?: string[];
  /** Filter by date range */
  dateRange?: DateRangeFilter;
}

/**
 * Request body for searching memories
 */
export interface SearchMemoriesRequest {
  /** Query string for vector search (optional) */
  query?: string;
  /** Filters to apply to the search */
  filters?: SearchFilters;
  /** Maximum number of results to return (default: 10) */
  limit?: number;
}

/**
 * Response for API operations
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
