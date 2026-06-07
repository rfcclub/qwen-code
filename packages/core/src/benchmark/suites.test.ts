/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { smokeSuite, polyglotSuite, toolUseSuite } from './suites.js';

describe('benchmark suites', () => {
  it('smokeSuite has tasks', () => {
    expect(smokeSuite.tasks.length).toBeGreaterThan(0);
    expect(smokeSuite.name).toBe('smoke');
  });

  it('polyglotSuite has tasks', () => {
    expect(polyglotSuite.tasks.length).toBeGreaterThan(0);
    expect(polyglotSuite.name).toBe('polyglot');
  });

  it('toolUseSuite has tasks', () => {
    expect(toolUseSuite.tasks.length).toBeGreaterThan(0);
    expect(toolUseSuite.name).toBe('tool-use');
  });

  it('all tasks have required fields', () => {
    const all = [
      ...smokeSuite.tasks,
      ...polyglotSuite.tasks,
      ...toolUseSuite.tasks,
    ];
    all.forEach((t) => {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.prompt).toBeDefined();
      expect(t.validation).toBeDefined();
      expect(t.timeout).toBeGreaterThan(0);
    });
  });
});
