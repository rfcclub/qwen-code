/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

export type EvidenceType =
  | 'decision'
  | 'workflow'
  | 'gotcha'
  | 'convention'
  | 'fix';

export interface Evidence {
  id: string;
  timestamp: string;
  sessionId: string;
  taskId: string;
  type: EvidenceType;
  title: string;
  description: string;
  context: string;
  outcome: 'success' | 'failure' | 'partial';
  retryStrategy?: string;
  confidence: number;
  tags: string[];
}

export interface EvidenceQuery {
  project?: string;
  file?: string;
  tool?: string;
  type?: EvidenceType;
  minConfidence?: number;
  maxAgeDays?: number;
}
