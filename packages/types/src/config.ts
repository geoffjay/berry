import type { MemoryType } from "./memory.js";

/**
 * Configuration schema for Berry
 */
export interface BerryConfig {
  server: {
    url: string;
    timeout: number;
  };
  defaults: {
    type: MemoryType;
    createdBy: string;
  };
}
