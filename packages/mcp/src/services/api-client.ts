import { getConfig } from './config';

/**
 * Memory types supported by Berry
 */
export type MemoryType = 'question' | 'request' | 'information';

/**
 * Server memory metadata format
 */
interface ServerMemoryMetadata {
  createdAt: string;
  createdBy?: string;
  respondedBy?: string;
  response?: string;
  respondedAt?: string;
  tags?: string[];
}

/**
 * Memory format returned from the server
 */
interface ServerMemory {
  id: string;
  content: string;
  type: MemoryType;
  metadata: ServerMemoryMetadata;
}

/**
 * Server API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server search request format
 */
interface ServerSearchRequest {
  query?: string;
  filters?: {
    type?: MemoryType;
    createdBy?: string;
    tags?: string[];
    dateRange?: {
      from?: string;
      to?: string;
    };
  };
  limit?: number;
}

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
}

/**
 * Request payload for creating a memory
 */
export interface CreateMemoryRequest {
  content: string;
  type?: MemoryType;
  tags?: string[];
  createdBy?: string;
}

/**
 * Request payload for searching memories
 */
export interface SearchMemoriesRequest {
  query: string;
  type?: MemoryType;
  tags?: string[];
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

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Get API client configuration from the Berry config file
 * Falls back to environment variables for backwards compatibility
 */
function getApiConfig() {
  const config = getConfig();
  return {
    serverUrl: process.env.BERRY_SERVER_URL || config.server.url,
    timeout: process.env.BERRY_TIMEOUT ? parseInt(process.env.BERRY_TIMEOUT, 10) : config.server.timeout,
  };
}

/**
 * HTTP client for Berry API communication
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    const config = getApiConfig();
    this.baseUrl = config.serverUrl.replace(/\/$/, '');
    this.timeout = config.timeout;
  }

  /**
   * Create a new memory
   */
  async createMemory(request: CreateMemoryRequest): Promise<Memory> {
    const body = {
      content: request.content,
      type: request.type || 'information',
      metadata: {
        createdBy: request.createdBy,
        tags: request.tags,
      },
    };

    const response = await this.request<ApiResponse<ServerMemory>>('/v1/memory', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.success || !response.data) {
      throw new ApiClientError(response.error || 'Failed to create memory');
    }

    return this.transformMemory(response.data);
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string): Promise<Memory> {
    const response = await this.request<ApiResponse<ServerMemory>>(
      `/v1/memory/${encodeURIComponent(id)}`
    );

    if (!response.success || !response.data) {
      throw new ApiClientError(response.error || 'Memory not found', 404);
    }

    return this.transformMemory(response.data);
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: string): Promise<void> {
    const response = await this.request<ApiResponse<{ id: string }>>(
      `/v1/memory/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );

    if (!response.success) {
      throw new ApiClientError(response.error || 'Failed to delete memory');
    }
  }

  /**
   * Search memories using vector similarity
   */
  async searchMemories(request: SearchMemoriesRequest): Promise<SearchResult[]> {
    const body: ServerSearchRequest = {
      query: request.query,
      limit: request.limit,
      filters: {},
    };

    if (request.type) {
      body.filters!.type = request.type;
    }
    if (request.tags && request.tags.length > 0) {
      body.filters!.tags = request.tags;
    }
    if (request.from || request.to) {
      body.filters!.dateRange = {
        from: request.from,
        to: request.to,
      };
    }

    const response = await this.request<ApiResponse<ServerMemory[]>>('/v1/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.success || !response.data) {
      throw new ApiClientError(response.error || 'Search failed');
    }

    return response.data.map((memory, index) => ({
      memory: this.transformMemory(memory),
      score: 1 - index * 0.1, // Approximate score based on position
    }));
  }

  /**
   * Transform server memory format to client format
   */
  private transformMemory(serverMemory: ServerMemory): Memory {
    return {
      id: serverMemory.id,
      content: serverMemory.content,
      type: serverMemory.type,
      tags: serverMemory.metadata.tags || [],
      createdBy: serverMemory.metadata.createdBy || 'unknown',
      createdAt: serverMemory.metadata.createdAt,
      updatedAt: serverMemory.metadata.respondedAt || serverMemory.metadata.createdAt,
    };
  }

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorBody = (await response.json()) as { message?: string };
          if (errorBody.message) {
            errorMessage = errorBody.message;
          }
        } catch {
          // Ignore JSON parse errors for error response
        }

        throw new ApiClientError(errorMessage, response.status);
      }

      // Handle empty responses (e.g., DELETE)
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiClientError(
            `Request timed out after ${this.timeout}ms`,
            undefined,
            'TIMEOUT'
          );
        }

        // Handle network errors
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new ApiClientError(
            `Failed to connect to server at ${this.baseUrl}. Is the server running?`,
            undefined,
            'CONNECTION_ERROR'
          );
        }

        throw new ApiClientError(error.message);
      }

      throw new ApiClientError(String(error));
    }
  }
}

// Singleton instance
let apiClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient();
  }
  return apiClient;
}
