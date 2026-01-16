import { getConfig } from "./config";
import { logRequest, logResponse, debug, error as logError } from "./logger";
import type {
  Memory,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  SearchResult,
  ApiResponse,
  ServerMemory,
  ServerSearchRequest,
} from "@berry/types";
import { ApiClientError } from "@berry/types";

// Re-export types for consumers
export type { Memory, CreateMemoryRequest, SearchMemoriesRequest, SearchResult };
export type { VisibilityLevel, MemoryType } from "@berry/types";
export { ApiClientError };

/**
 * Get API client configuration from the Berry config file
 * Falls back to environment variables for backwards compatibility
 */
function getApiConfig() {
  const config = getConfig();
  return {
    serverUrl: process.env.BERRY_SERVER_URL || config.server.url,
    timeout: process.env.BERRY_TIMEOUT
      ? parseInt(process.env.BERRY_TIMEOUT, 10)
      : config.server.timeout,
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
    this.baseUrl = config.serverUrl.replace(/\/$/, "");
    this.timeout = config.timeout;
    debug(`ApiClient initialized with baseUrl: ${this.baseUrl}, timeout: ${this.timeout}ms`);
  }

  /**
   * Create a new memory
   */
  async createMemory(request: CreateMemoryRequest): Promise<Memory> {
    const body = {
      content: request.content,
      type: request.type || "information",
      metadata: {
        createdBy: request.createdBy,
        tags: request.tags,
        owner: request.createdBy, // owner defaults to createdBy
        visibility: request.visibility,
        sharedWith: request.sharedWith,
      },
    };

    const response = await this.request<ApiResponse<ServerMemory>>("/v1/memory", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.success || !response.data) {
      throw new ApiClientError(response.error || "Failed to create memory");
    }

    return this.transformMemory(response.data);
  }

  /**
   * Get a memory by ID
   */
  async getMemory(id: string, asActor?: string): Promise<Memory> {
    let url = `/v1/memory/${encodeURIComponent(id)}`;
    if (asActor) {
      url += `?asActor=${encodeURIComponent(asActor)}`;
    }

    const response = await this.request<ApiResponse<ServerMemory>>(url);

    if (!response.success || !response.data) {
      throw new ApiClientError(response.error || "Memory not found", 404);
    }

    return this.transformMemory(response.data);
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: string, asActor?: string): Promise<void> {
    let url = `/v1/memory/${encodeURIComponent(id)}`;
    if (asActor) {
      url += `?asActor=${encodeURIComponent(asActor)}`;
    }

    const response = await this.request<ApiResponse<{ id: string }>>(url, { method: "DELETE" });

    if (!response.success) {
      throw new ApiClientError(response.error || "Failed to delete memory");
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
      asActor: request.asActor,
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

    const response = await this.request<ApiResponse<ServerMemory[]>>("/v1/search", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.success || !response.data) {
      throw new ApiClientError(response.error || "Search failed");
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
      createdBy: serverMemory.metadata.createdBy || "unknown",
      createdAt: serverMemory.metadata.createdAt,
      updatedAt: serverMemory.metadata.respondedAt || serverMemory.metadata.createdAt,
      owner: serverMemory.metadata.owner,
      visibility: serverMemory.metadata.visibility,
      sharedWith: serverMemory.metadata.sharedWith,
    };
  }

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || "GET";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Log the outgoing request
    const requestBody = options.body ? JSON.parse(options.body as string) : undefined;
    logRequest(method, url, requestBody);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorBody: unknown;

        try {
          errorBody = await response.json();
          if ((errorBody as { message?: string }).message) {
            errorMessage = (errorBody as { message: string }).message;
          }
        } catch {
          // Ignore JSON parse errors for error response
        }

        logResponse(method, url, response.status, errorBody);
        logError(`Request failed: ${errorMessage}`);
        throw new ApiClientError(errorMessage, response.status);
      }

      // Handle empty responses (e.g., DELETE)
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        logResponse(method, url, response.status, "(no body)");
        return undefined as T;
      }

      const text = await response.text();
      if (!text) {
        logResponse(method, url, response.status, "(empty body)");
        return undefined as T;
      }

      const responseBody = JSON.parse(text) as T;
      logResponse(method, url, response.status, responseBody);
      return responseBody;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          const timeoutError = `Request timed out after ${this.timeout}ms`;
          logError(timeoutError);
          throw new ApiClientError(timeoutError, undefined, "TIMEOUT");
        }

        // Handle network errors
        if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
          const connectionError = `Failed to connect to server at ${this.baseUrl}. Is the server running?`;
          logError(connectionError);
          throw new ApiClientError(connectionError, undefined, "CONNECTION_ERROR");
        }

        logError(`Request error: ${error.message}`);
        throw new ApiClientError(error.message);
      }

      logError(`Unknown error: ${String(error)}`);
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
