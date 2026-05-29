/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ParsedToolCall } from './types.js';

/**
 * Forgiving tool parser that handles malformed or non-JSON tool calls.
 *
 * Strategy chain (tried in order):
 * 1. JSON parse (strict)
 * 2. JSON parse (repaired — trailing commas, missing brackets)
 * 3. YAML parse (basic)
 * 4. XML parse (<function><name>...</name>)
 * 5. Plain-text regex extraction
 * 6. All fail → empty result (caught by QualityMonitor)
 */
export class ForgivingToolParser {
  /**
   * Parse tool calls from model output text.
   */
  parse(input: string): ParsedToolCall[] {
    // Try strict JSON first
    const strict = this.tryParseJson(input);
    if (strict.length > 0) return strict;

    // Try repaired JSON
    const repaired = this.tryParseRepairedJson(input);
    if (repaired.length > 0) return repaired;

    // Try YAML
    const yaml = this.tryParseBasicYaml(input);
    if (yaml.length > 0) return yaml;

    // Try XML
    const xml = this.tryParseXml(input);
    if (xml.length > 0) return xml;

    // Try plain-text extraction
    const plain = this.tryParsePlainText(input);
    if (plain.length > 0) return plain;

    return [];
  }

  /**
   * Try strict JSON.parse on the input.
   */
  private tryParseJson(input: string): ParsedToolCall[] {
    // Look for JSON array/object in the text
    const jsonMatch = input.match(/\[[\s\S]*\]|\{[\s\S]*"tool"[\s\S]*\}/i);
    if (!jsonMatch) return [];

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      // Single tool call
      if (!Array.isArray(parsed)) {
        if (parsed.tool || parsed.name || parsed.function) {
          const toolName = parsed.tool || parsed.name || parsed.function?.name;
          const params =
            parsed.params ??
            parsed.parameters ??
            parsed.arguments ??
            parsed.function?.arguments ??
            {};
          return [
            {
              name: String(toolName ?? 'unknown'),
              params: typeof params === 'string' ? safeParse(params) : params,
              confidence: 1.0,
              raw: jsonMatch[0],
            },
          ];
        }
      }

      // Array of tool calls
      return parsed
        .filter((t: unknown) => t && typeof t === 'object')
        .map((t: Record<string, unknown>) => ({
          name: String(
            t['tool'] ??
              t['name'] ??
              (t['function'] as Record<string, unknown>)?.['name'] ??
              'unknown',
          ),
          params: (t['params'] ??
            t['parameters'] ??
            t['arguments'] ??
            (t['function'] as Record<string, unknown>)?.['arguments'] ??
            {}) as Record<string, unknown>,
          confidence: 1.0,
          raw: JSON.stringify(t),
        }));
    } catch {
      return [];
    }
  }

  /**
   * Try JSON with auto-repair (fix trailing commas, missing brackets).
   */
  private tryParseRepairedJson(input: string): ParsedToolCall[] {
    const jsonMatch = input.match(/\[[\s\S]*\]|\{[\s\S]*"tool"[\s\S]*\}/i);
    if (!jsonMatch) return [];

    let repaired = jsonMatch[0]
      .replace(/,\s*]/g, ']') // trailing commas in arrays
      .replace(/,\s*}/g, '}') // trailing commas in objects
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // unquoted keys
      .replace(/'/g, '"'); // single quotes → double quotes

    // Balance brackets
    const opens = (repaired.match(/\{/g) ?? []).length;
    const closes = (repaired.match(/\}/g) ?? []).length;
    if (opens > closes) {
      repaired += '}'.repeat(opens - closes);
    }

    try {
      const parsed = JSON.parse(repaired);
      const calls = Array.isArray(parsed) ? parsed : [parsed];
      return calls
        .filter((t: unknown) => t && typeof t === 'object')
        .map((t: Record<string, unknown>) => ({
          name: String(
            t['tool'] ??
              t['name'] ??
              (t['function'] as Record<string, unknown>)?.['name'] ??
              'unknown',
          ),
          params: (t['params'] ??
            t['parameters'] ??
            t['arguments'] ??
            (t['function'] as Record<string, unknown>)?.['arguments'] ??
            {}) as Record<string, unknown>,
          confidence: 0.8,
          raw: repaired,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Basic YAML-like parser (function: name, with: ...).
   */
  private tryParseBasicYaml(input: string): ParsedToolCall[] {
    const sections = input.split(/(?=^- )/m);
    const results: ParsedToolCall[] = [];

    for (const section of sections) {
      const nameMatch = section.match(
        /(?:tool|function|name):\s*['"]?(\w+)['"]?/i,
      );
      if (!nameMatch) continue;

      const params: Record<string, unknown> = {};
      const paramLines = section.match(/^\s+(\w+):\s*(.+)$/gm);
      if (paramLines) {
        for (const line of paramLines) {
          const [, key, value] = line.match(/^\s+(\w+):\s*(.+)$/) ?? [];
          if (key && value) {
            params[key] = value.trim().replace(/^['"]|['"]$/g, '');
          }
        }
      }

      results.push({
        name: nameMatch[1],
        params,
        confidence: 0.6,
        raw: section.trim(),
      });
    }

    return results;
  }

  /**
   * XML-style tool calls: <function><name>...</name><param name="...">...</param></function>
   */
  private tryParseXml(input: string): ParsedToolCall[] {
    const funcRegex =
      /<function>[\s\S]*?<name>\s*(\w+)\s*<\/name>([\s\S]*?)<\/function>/gi;
    const results: ParsedToolCall[] = [];
    let match: RegExpExecArray | null;

    while ((match = funcRegex.exec(input)) !== null) {
      const name = match[1];
      const body = match[2];
      const params: Record<string, unknown> = {};

      const paramRegex =
        /<param\s+name\s*=\s*['"](\w+)['"]>([\s\S]*?)<\/param>/gi;
      let pm: RegExpExecArray | null;
      while ((pm = paramRegex.exec(body)) !== null) {
        params[pm[1]] = pm[2].trim();
      }

      results.push({
        name,
        params,
        confidence: 0.7,
        raw: match[0],
      });
    }

    return results;
  }

  /**
   * Map common natural-language phrases to tool names.
   */
  private toolPhrases: Record<string, string> = {
    search: 'grep_search',
    find: 'grep_search',
    look: 'grep_search',
    read: 'read_file',
    show: 'read_file',
    edit: 'edit',
    write: 'write_file',
    create: 'write_file',
    run: 'run_shell_command',
    execute: 'run_shell_command',
  };

  /**
   * Plain-text tool call extraction from natural language commands.
   */
  private tryParsePlainText(input: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = [];
    const lines = input.split('\n');

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      for (const [phrase, tool] of Object.entries(this.toolPhrases)) {
        if (
          trimmed.startsWith(phrase + ' ') ||
          trimmed.startsWith(phrase + ':')
        ) {
          // Extract what follows as the likely parameter
          const paramText = line
            .slice(line.toLowerCase().indexOf(phrase) + phrase.length)
            .trim()
            .replace(/^[: ]+/, '');

          results.push({
            name: tool,
            params: paramText ? { query: paramText, text: paramText } : {},
            confidence: 0.4,
            raw: line,
          });
          break;
        }
      }
    }

    return results;
  }
}

/**
 * Safely parse a JSON string, returning the parsed object or empty object.
 */
function safeParse(input: string): Record<string, unknown> {
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}
