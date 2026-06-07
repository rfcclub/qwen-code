/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { BenchmarkRunner } from './runner.js';
import { RegressionTracker } from './regression.js';
import {
  smokeSuite,
  polyglotSuite,
  toolUseSuite,
  integrationSuite,
} from './suites/index.js';
import type { BenchmarkSuite, BenchmarkReport } from './types.js';

const suites: Record<string, BenchmarkSuite> = {
  smoke: smokeSuite,
  polyglot: polyglotSuite,
  'tool-use': toolUseSuite,
  integration: integrationSuite,
};

function formatJson(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2);
}

function formatMd(report: BenchmarkReport): string {
  const lines = [
    '# Benchmark Report',
    '',
    `- **Model**: ${report.model}`,
    `- **Timestamp**: ${report.timestamp}`,
    `- **Pass Rate**: ${report.passRate.toFixed(1)}%`,
    `- **Avg Duration**: ${report.avgDuration.toFixed(0)}ms`,
    '',
    '## Results',
    '',
    '| Task | Passed | Duration | Error |',
    '|------|--------|----------|-------|',
  ];

  for (const r of report.results) {
    const errorCol = r.error ? r.error.substring(0, 40) : '';
    lines.push(
      `| ${r.taskId} | ${r.passed ? 'Yes' : 'No'} | ${r.duration}ms | ${errorCol} |`,
    );
  }

  return lines.join('\n');
}

function formatHtml(report: BenchmarkReport): string {
  const rows = report.results
    .map(
      (r) =>
        `<tr><td>${r.taskId}</td><td>${r.passed ? 'Yes' : 'No'}</td><td>${r.duration}ms</td><td>${r.error || ''}</td></tr>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><title>Benchmark Report</title></head>
<body>
<h1>Benchmark Report</h1>
<p>Model: ${report.model}</p>
<p>Timestamp: ${report.timestamp}</p>
<p>Pass Rate: ${report.passRate.toFixed(1)}%</p>
<table border="1">
<tr><th>Task</th><th>Passed</th><th>Duration</th><th>Error</th></tr>
${rows}
</table>
</body>
</html>`;
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('suite', {
      type: 'string',
      description: 'Specific suite to run',
      choices: Object.keys(suites),
    })
    .option('compare', {
      type: 'string',
      description: 'Compare against baseline timestamp (e.g. 2026-05-20)',
    })
    .option('model', {
      type: 'string',
      default: 'qwen-default',
      description: 'Model to benchmark',
    })
    .option('format', {
      type: 'string',
      default: 'json',
      choices: ['json', 'html', 'md'],
      description: 'Output format',
    })
    .option('timeout', {
      type: 'number',
      default: 300,
      description: 'Global timeout in seconds',
    })
    .help().argv;

  const runner = new BenchmarkRunner();
  const tracker = new RegressionTracker();
  let report: BenchmarkReport;

  if (argv.suite) {
    const suite = suites[argv.suite];
    if (!suite) {
      process.stderr.write(`Unknown suite: ${argv.suite}\n`);
      process.exit(1);
    }
    report = await runner.run(suite, argv.model);
  } else {
    report = await runner.runAll(Object.values(suites), argv.model);
  }

  if (argv.compare) {
    try {
      const comparison = tracker.compare(report, argv.compare);
      report.comparison = comparison;
    } catch (e) {
      process.stderr.write(`Comparison failed: ${(e as Error).message}\n`);
    }
  }

  tracker.save(report);

  switch (argv.format) {
    case 'json':
      process.stdout.write(`${formatJson(report)}\n`);
      break;
    case 'md':
      process.stdout.write(`${formatMd(report)}\n`);
      break;
    case 'html':
      process.stdout.write(`${formatHtml(report)}\n`);
      break;
    default:
      process.stdout.write(`${formatJson(report)}\n`);
  }

  const passed = report.results.filter((r) => r.passed).length;
  const total = report.results.length;
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`${String(e)}\n`);
  process.exit(1);
});
