/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { TodoPlanner } from './todo-planner.js';

describe('todo-planner re-export', () => {
  const planner = new TodoPlanner();

  it('creates a plan from a task description', () => {
    const todos = planner.createPlan(
      'Implement feature X\n1. Read config\n2. Edit code',
    );
    expect(todos.length).toBeGreaterThan(0);
    expect(todos[0]!.description).toBe('Read config');
  });

  it('injects TODO context into messages', () => {
    planner.createPlan('Fix bug');
    const ctx = planner.getTodoContext();
    expect(ctx).toContain('Plan');
    expect(ctx).toContain('Fix bug');
  });
});
