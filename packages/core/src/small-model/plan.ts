/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Todo } from './types.js';

/**
 * TODO-Driven Planner — breaks complex tasks into atomic steps
 * and injects the current plan into every turn's context.
 *
 * This prevents task drift in small models by anchoring each
 * turn to a visible, numbered plan.
 */
export class TodoPlanner {
  private todos: Todo[] = [];
  private nextId = 1;
  private maxStuckTurns = 5;

  /**
   * Inject a new plan, replacing any existing one.
   */
  injectPlan(descriptions: string[]): Todo[] {
    this.todos = descriptions.map((d) => ({
      id: String(this.nextId++),
      description: d,
      status: 'pending' as const,
      turnCount: 0,
    }));
    return this.todos;
  }

  /**
   * Create a plan from a single task description by auto-decomposing
   * into numbered steps.
   */
  createPlan(taskDescription: string): Todo[] {
    // Simple heuristic: split by sentences or numbered items
    const lines = taskDescription
      .split(/\n|\. (?=[A-Z])/)
      .map((l) => l.trim())
      .filter((l) => l.length > 10);

    // If already numbered in user input
    const numbered = taskDescription.match(/^\d+[.)]\s+(.+)$/gm);
    if (numbered) {
      return this.injectPlan(
        numbered.map((n) => n.replace(/^\d+[.)]\s+/, '').trim()),
      );
    }

    if (lines.length > 1) {
      return this.injectPlan(lines.slice(0, 5));
    }

    // Single line — just make it one step
    return this.injectPlan([taskDescription]);
  }

  /**
   * Mark a TODO step as in_progress.
   */
  startStep(id: string): void {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.status = 'in_progress';
    }
  }

  /**
   * Mark a TODO step as done.
   */
  completeStep(id: string): void {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.status = 'done';
    }
  }

  /**
   * Mark a TODO step as failed.
   */
  failStep(id: string): void {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      todo.status = 'failed';
    }
  }

  /**
   * Increment turn count for in_progress steps.
   */
  tick(): void {
    for (const todo of this.todos) {
      if (todo.status === 'in_progress') {
        todo.turnCount++;
      }
    }
  }

  /**
   * Check if any step is stuck (>5 turns in progress).
   */
  checkStuck(): Todo | null {
    return (
      this.todos.find(
        (t) => t.status === 'in_progress' && t.turnCount > this.maxStuckTurns,
      ) ?? null
    );
  }

  /**
   * Get the formatted TODO context string to inject into turns.
   */
  getTodoContext(): string {
    if (this.todos.length === 0) return '';

    const header = '📋 **Plan**\n\n';
    const body = this.todos
      .map((t, i) => {
        const status =
          t.status === 'done'
            ? '[x]'
            : t.status === 'failed'
              ? '[!]'
              : t.status === 'in_progress'
                ? '[*]'
                : '[ ]';
        return `${i + 1}. ${status} ${t.description}`;
      })
      .join('\n');
    return header + body;
  }

  /**
   * Get all current TODOs.
   */
  getTodos(): readonly Todo[] {
    return this.todos;
  }

  /**
   * Check if there are any pending steps.
   */
  hasPending(): boolean {
    return this.todos.some(
      (t) => t.status === 'pending' || t.status === 'in_progress',
    );
  }

  /**
   * Reset the planner.
   */
  reset(): void {
    this.todos = [];
    this.nextId = 1;
  }
}
