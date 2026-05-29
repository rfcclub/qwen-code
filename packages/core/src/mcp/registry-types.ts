/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A single MCP server entry in the registry index.
 */
export interface MCPRegistryServer {
  /** Unique name (used as server ID in settings) */
  name: string;
  /** Human-readable title */
  title: string;
  /** Short description */
  description: string;
  /** Categories for browsing */
  categories: string[];
  /** Install command (npm, pip, etc.) */
  installCommand: string;
  /** Command to run the server */
  command: string;
  /** Arguments */
  args: string[];
  /** Default environment variables */
  env?: Record<string, string>;
  /** Homepage URL */
  homepage?: string;
  /** Repository URL */
  repository?: string;
}

/**
 * The registry index format (JSON file served from a URL or bundled).
 */
export interface MCPRegistryIndex {
  version: string;
  updated: string;
  servers: MCPRegistryServer[];
}
