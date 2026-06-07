/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TokenCount {
  prompt: number;
  completion: number;
  total: number;
}

export interface Cost {
  input: number;
  output: number;
  total: number;
  currency: string;
}

export interface ModelPricing {
  input: number;
  output: number;
  currency: string;
}

export interface SessionCost {
  sessionId: string;
  startTime: string;
  endTime?: string;
  requests: RequestCost[];
  totalTokens: TokenCount;
  totalCost: Cost;
}

export interface RequestCost {
  timestamp: string;
  model: string;
  tokens: TokenCount;
  cost: Cost;
}
