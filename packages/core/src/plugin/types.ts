/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

export type HookName =
  | 'session-start'
  | 'session-end'
  | 'pre-request'
  | 'post-request'
  | 'pre-tool'
  | 'post-tool'
  | 'error'
  | 'command';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  entry: string;
  hooks: HookName[];
  provides?: {
    tools?: string[];
    commands?: string[];
    providers?: string[];
    mcpServers?: string[];
  };
  requires?: string[];
  compatibleWith?: string;
}

export interface HookContext {
  sessionId: string;
  config?: Record<string, unknown>;
}

export type HookHandler = (
  context: HookContext,
  data: unknown,
) => Promise<void> | void;
