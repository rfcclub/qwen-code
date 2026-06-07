/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Session {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  createdAt: string;
  lastActiveAt: string;
  workingDirectory: string;
  history: Array<{ role: string; content: string }>;
  context: Record<string, unknown>;
}

export interface SessionMessage {
  from: string;
  type: 'notification' | 'request' | 'result';
  payload: unknown;
}
