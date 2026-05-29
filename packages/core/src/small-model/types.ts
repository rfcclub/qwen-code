/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared types for the Small-Model Optimization Layer.
 *
 * This module defines the interfaces used across all components of the
 * compensating infrastructure that makes 7B-35B local models viable.
 */

// ─── Token Budget ──────────────────────────────────────────────

export interface TokenBudget {
  maxTokens: number;
  reservedForResponse: number;
  reservedForTools: number;
  availableForContext: number;
}

// ─── Tool Parsing ──────────────────────────────────────────────

export interface ParsedToolCall {
  name: string;
  params: Record<string, unknown>;
  confidence: number; // 0-1
  raw: string;
}

// ─── Patch Editing ─────────────────────────────────────────────

export interface Patch {
  type: 'replace' | 'insert' | 'delete';
  search: string;
  replace?: string;
  lineRange?: { start: number; end: number };
  fuzzy?: boolean;
}

export interface PatchResult {
  success: boolean;
  patchCount: number;
  confidence: number;
  error?: string;
}

// ─── TODO Planning ─────────────────────────────────────────────

export interface Todo {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed';
  turnCount: number;
}

// ─── Quality Monitoring ────────────────────────────────────────

export type QualityIssueType =
  | 'empty_turn'
  | 'hallucinated_tool'
  | 'repeat_call'
  | 'infinite_loop'
  | 'syntax_error';

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  type: QualityIssueType;
  message: string;
  toolName?: string;
}

// ─── Tool Trust ────────────────────────────────────────────────

export interface ToolTrustEntry {
  name: string;
  successCount: number;
  failCount: number;
  lastFailure?: string;
  disabled: boolean;
}

// ─── Configuration ────────────────────────────────────────────

export interface SmallModelConfig {
  enabled: boolean;
  tokenBudgetReservedForResponse: number;
  tokenBudgetReservedForTools: number;
  toolResultMaxChars: number;
  fuzzyPatchEnabled: boolean;
  readGuardEnabled: boolean;
  readBeforeWriteGuard: boolean;
  qualityMonitorEnabled: boolean;
  retryTemperatureStart: number;
  retryTemperatureStep: number;
  dedupWindowSize: number;
  enableTodoPlanning: boolean;
  enableToolDedup: boolean;
}

export const DEFAULT_SMALL_MODEL_CONFIG: SmallModelConfig = {
  enabled: true,
  tokenBudgetReservedForResponse: 4096,
  tokenBudgetReservedForTools: 4096,
  toolResultMaxChars: 4096,
  fuzzyPatchEnabled: true,
  readGuardEnabled: true,
  readBeforeWriteGuard: true,
  qualityMonitorEnabled: true,
  retryTemperatureStart: 0.1,
  retryTemperatureStep: 0.4,
  dedupWindowSize: 20,
  enableTodoPlanning: true,
  enableToolDedup: true,
};
