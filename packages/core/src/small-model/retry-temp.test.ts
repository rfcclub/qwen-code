/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { RetryTemperature } from './retry-temp.js';

describe('RetryTemperature', () => {
  it('returns start temp on attempt 0', () => {
    const temp = new RetryTemperature(0.1, 0.4);
    expect(temp.getTemperature(0)).toBe(0.1);
  });

  it('increases by step per attempt', () => {
    const temp = new RetryTemperature(0.1, 0.4);
    expect(temp.getTemperature(1)).toBe(0.5);
    expect(temp.getTemperature(2)).toBe(0.9);
  });

  it('caps at 1.0', () => {
    const temp = new RetryTemperature(0.1, 0.4);
    expect(temp.getTemperature(3)).toBe(1.0);
    expect(temp.getTemperature(10)).toBe(1.0);
  });

  it('uses custom start and step', () => {
    const temp = new RetryTemperature(0.2, 0.3);
    expect(temp.getTemperature(0)).toBe(0.2);
    expect(temp.getTemperature(1)).toBe(0.5);
    expect(temp.getTemperature(2)).toBe(0.8);
  });
});
