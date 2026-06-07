/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BenchmarkSuite,
  BenchmarkReport,
  BenchmarkResult,
} from './types.js';
import { validateResult } from './validation.js';

export class BenchmarkRunner {
  async run(suite: BenchmarkSuite, model: string): Promise<BenchmarkReport> {
    const results: BenchmarkResult[] = [];
    let totalDuration = 0;

    for (const task of suite.tasks) {
      const start = Date.now();
      let passed = false;
      let error: string | undefined;
      const retries = 0;

      try {
        passed = await validateResult(task.validation);
      } catch (e) {
        error = (e as Error).message;
        passed = false;
      }

      const duration = Date.now() - start;
      totalDuration += duration;

      results.push({
        taskId: task.id,
        passed,
        duration,
        retries,
        error,
      });
    }

    const passedCount = results.filter((r) => r.passed).length;
    const passRate =
      suite.tasks.length > 0 ? (passedCount / suite.tasks.length) * 100 : 100;
    const avgDuration =
      suite.tasks.length > 0 ? totalDuration / suite.tasks.length : 0;

    return {
      model,
      timestamp: new Date().toISOString(),
      results,
      passRate,
      avgDuration,
    };
  }

  async runAll(
    suites: BenchmarkSuite[],
    model: string,
  ): Promise<BenchmarkReport> {
    const allResults: BenchmarkResult[] = [];
    let totalDuration = 0;
    let totalTasks = 0;

    for (const suite of suites) {
      const report = await this.run(suite, model);
      allResults.push(...report.results);
      totalDuration += report.avgDuration * suite.tasks.length;
      totalTasks += suite.tasks.length;
    }

    const passedCount = allResults.filter((r) => r.passed).length;
    const passRate = totalTasks > 0 ? (passedCount / totalTasks) * 100 : 100;
    const avgDuration = totalTasks > 0 ? totalDuration / totalTasks : 0;

    return {
      model,
      timestamp: new Date().toISOString(),
      results: allResults,
      passRate,
      avgDuration,
    };
  }
}
