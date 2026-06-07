/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

export type BenchmarkTaskType =
  | 'smoke'
  | 'polyglot'
  | 'tool-use'
  | 'integration';

export interface BenchmarkTask {
  id: string;
  name: string;
  type: BenchmarkTaskType;
  setup?: () => Promise<void>;
  prompt: string;
  validation: ValidationMethod;
  timeout: number;
  expectedCost?: number;
}

export interface ValidationMethod {
  type: 'file_exists' | 'file_contains' | 'command_succeeds' | 'custom';
  params: Record<string, unknown>;
}

export interface BenchmarkSuite {
  name: string;
  description: string;
  tasks: BenchmarkTask[];
}

export interface BenchmarkResult {
  taskId: string;
  passed: boolean;
  duration: number;
  tokenUsage?: number;
  cost?: number;
  error?: string;
  retries: number;
}

export interface BenchmarkReport {
  model: string;
  timestamp: string;
  results: BenchmarkResult[];
  passRate: number;
  avgDuration: number;
  totalCost?: number;
  comparison?: BenchmarkComparison;
}

export interface BenchmarkComparison {
  previousRun: string;
  passRateDelta: number;
  newFailures: string[];
  fixedFailures: string[];
  performanceDelta: number;
}
