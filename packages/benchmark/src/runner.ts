/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BenchmarkSuite,
  BenchmarkReport,
  BenchmarkResult,
  BenchmarkTask,
} from './types.js';
import { validateResult } from './validation.js';

export interface BenchmarkRunnerOptions {
  model?: string;
  tokenUsage?: number;
  costPerToken?: number;
}

export class BenchmarkRunner {
  async run(
    suite: BenchmarkSuite,
    model: string,
    options?: BenchmarkRunnerOptions,
  ): Promise<BenchmarkReport> {
    const results: BenchmarkResult[] = [];
    let totalDuration = 0;
    let totalCost = 0;

    for (const task of suite.tasks) {
      const result = await this.runTask(task, options);
      results.push(result);
      totalDuration += result.duration;
      if (result.cost) {
        totalCost += result.cost;
      }
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
      totalCost: totalCost > 0 ? totalCost : undefined,
    };
  }

  private async runTask(
    task: BenchmarkTask,
    options?: BenchmarkRunnerOptions,
  ): Promise<BenchmarkResult> {
    const start = Date.now();
    let passed = false;
    let error: string | undefined;
    const retries = 0;
    let tokenUsage: number | undefined;

    try {
      if (task.setup) {
        await this.runWithTimeout(task.setup(), task.timeout);
      }

      passed = await this.runWithTimeout(
        validateResult(task.validation),
        task.timeout,
      );

      if (options?.tokenUsage) {
        tokenUsage = options.tokenUsage;
      }
    } catch (e) {
      error = (e as Error).message;
      passed = false;
    }

    const duration = Date.now() - start;
    const cost =
      tokenUsage && options?.costPerToken
        ? tokenUsage * options.costPerToken
        : undefined;

    return {
      taskId: task.id,
      passed,
      duration,
      tokenUsage,
      cost,
      error,
      retries,
    };
  }

  private async runWithTimeout<T>(
    promise: Promise<T>,
    timeoutSeconds: number,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutSeconds}s`));
      }, timeoutSeconds * 1000);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  async runAll(
    suites: BenchmarkSuite[],
    model: string,
    options?: BenchmarkRunnerOptions,
  ): Promise<BenchmarkReport> {
    const allResults: BenchmarkResult[] = [];
    let totalDuration = 0;
    let totalTasks = 0;
    let totalCost = 0;

    for (const suite of suites) {
      const report = await this.run(suite, model, options);
      allResults.push(...report.results);
      totalDuration += report.avgDuration * suite.tasks.length;
      totalTasks += suite.tasks.length;
      if (report.totalCost) {
        totalCost += report.totalCost;
      }
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
      totalCost: totalCost > 0 ? totalCost : undefined,
    };
  }
}
