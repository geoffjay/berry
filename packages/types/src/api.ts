/**
 * API error response
 */
export interface ApiError {
  message: string;
  code?: string;
}

/**
 * Server API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
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
    this.name = "ApiClientError";
  }
}
