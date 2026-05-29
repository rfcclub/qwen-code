/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tool Deduplicator — caches read-only tool call results so that
 * identical calls within a sliding window short-circuit without
 * executing the tool again.
 */
export class ToolDeduplicator {
  private cache: Map<string, { result: unknown; createdAt: number }> =
    new Map();
  private window: string[] = [];
  private windowSize: number;

  // Tools whose results can be safely cached
  private readOnlyTools = new Set([
    'read_file',
    'grep_search',
    'glob',
    'list_directory',
    'ls',
    'git_log',
    'git_status',
    'git_diff',
  ]);

  constructor(windowSize = 20) {
    this.windowSize = windowSize;
  }

  /**
   * Check if a tool call should be executed or can use cached result.
   *
   * @returns `false` if cached result exists and should be reused
   */
  shouldExecute(
    toolName: string,
    params: unknown,
  ): { execute: boolean; cached?: unknown } {
    const key = this.makeKey(toolName, params);

    if (this.isReadOnly(toolName) && this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      return { execute: false, cached: entry.result };
    }

    return { execute: true };
  }

  /**
   * Record a tool call result into the cache.
   */
  recordResult(toolName: string, params: unknown, result: unknown): void {
    if (!this.isReadOnly(toolName)) return;

    const key = this.makeKey(toolName, params);

    // Add to window, evict oldest if needed
    this.window.push(key);
    if (this.window.length > this.windowSize) {
      const oldest = this.window.shift()!;
      this.cache.delete(oldest);
    }

    this.cache.set(key, { result, createdAt: Date.now() });
  }

  /**
   * Invalidate cache entries for a specific tool (after write operations).
   */
  invalidate(toolName: string, _params?: unknown): void {
    for (const [key] of this.cache) {
      if (key.startsWith(toolName + ':')) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  reset(): void {
    this.cache.clear();
    this.window = [];
  }

  private isReadOnly(toolName: string): boolean {
    return this.readOnlyTools.has(toolName);
  }

  private makeKey(toolName: string, params: unknown): string {
    return `${toolName}:${JSON.stringify(normalizeParams(params))}`;
  }
}

/**
 * Normalize params for consistent key generation (sort keys).
 */
function normalizeParams(params: unknown): unknown {
  if (params === null || params === undefined) return params;
  if (Array.isArray(params)) return params.map(normalizeParams);
  if (typeof params === 'object') {
    return Object.keys(params as Record<string, unknown>)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = normalizeParams((params as Record<string, unknown>)[key]);
          return acc;
        },
        {} as Record<string, unknown>,
      );
  }
  return params;
}
