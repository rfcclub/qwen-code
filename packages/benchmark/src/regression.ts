/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import type { BenchmarkReport, BenchmarkComparison } from './types.js';
export type { BenchmarkComparison } from './types.js';

const BENCHMARK_DIR = join(process.cwd(), '.qwen', 'benchmarks');

export class RegressionTracker {
  save(report: BenchmarkReport): string {
    mkdirSync(BENCHMARK_DIR, { recursive: true });
    const fileName = `${report.timestamp.replace(/[:.]/g, '-')}-${report.model}.json`;
    const filePath = join(BENCHMARK_DIR, fileName);
    writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    return filePath;
  }

  compare(
    current: BenchmarkReport,
    baselineTimestamp: string,
  ): BenchmarkComparison {
    const baselinePath = this.findBaseline(baselineTimestamp, current.model);
    if (!baselinePath) {
      throw new Error(`Baseline not found for ${baselineTimestamp}`);
    }

    const baseline: BenchmarkReport = JSON.parse(
      readFileSync(baselinePath, 'utf-8'),
    );

    const currentPassed = current.results
      .filter((r) => r.passed)
      .map((r) => r.taskId);
    const baselinePassed = baseline.results
      .filter((r) => r.passed)
      .map((r) => r.taskId);

    const newFailures = baselinePassed.filter(
      (id) => !currentPassed.includes(id),
    );
    const fixedFailures = currentPassed.filter(
      (id) => !baselinePassed.includes(id),
    );

    const passRateDelta = current.passRate - baseline.passRate;
    const performanceDelta = current.avgDuration - baseline.avgDuration;

    return {
      previousRun: baseline.timestamp,
      passRateDelta,
      newFailures,
      fixedFailures,
      performanceDelta,
    };
  }

  private findBaseline(timestamp: string, model: string): string | null {
    if (!existsSync(BENCHMARK_DIR)) return null;

    const files = readdirSync(BENCHMARK_DIR).filter((f) => f.endsWith('.json'));

    // Exact match first
    const exact = files.find((f) => f.includes(timestamp) && f.includes(model));
    if (exact) return join(BENCHMARK_DIR, exact);

    // Fallback: date-only match
    const dateMatch = files.find(
      (f) => f.includes(timestamp) && f.includes(model),
    );
    if (dateMatch) return join(BENCHMARK_DIR, dateMatch);

    // Fallback: newest baseline for this model
    const modelFiles = files
      .filter((f) => f.includes(model))
      .sort()
      .reverse();
    if (modelFiles.length > 0) return join(BENCHMARK_DIR, modelFiles[0]);

    return null;
  }
}
