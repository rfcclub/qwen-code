# Small-Model Optimization Specification

## Purpose

The small-model optimization layer enables Qwen-lyra to work reliably with local models in the 7B-35B parameter range by compensating for their smaller context windows, less reliable tool calling, and higher sensitivity to prompt complexity.

## Requirements

### Requirement: Context Window Enforcement

The SHALL system enforce a token budget that never exceeds the model's context window.

#### Scenario: Prevent context overflow

- **GIVEN** a model with 32K context window (e.g., Qwen 14B)
- **WHEN** accumulated conversation + tool results exceed 24K tokens (reserving 8K for response + tools)
- **THEN** the system evicts oldest non-essential messages
- **AND** evicted messages are summarized into 1-line placeholder entries

#### Scenario: Cap tool result size

- **GIVEN** a tool returns a large result (e.g., read_file returns 100K content)
- **WHEN** the result exceeds 4K characters
- **THEN** the result is truncated to 4K characters
- **AND** a truncation notice is appended

#### Scenario: Semantic compression during eviction

- **GIVEN** the system must evict messages
- **WHEN** evicting messages older than the last 5 turns
- **THEN** they are compressed into a single-line summary preserving: user intent, what was tried, result
- **AND** the summary is inserted in place of the evicted messages

### Requirement: Forgiving Tool Call Parsing

The SHALL system parse tool calls from non-JSON output formats used by small models.

#### Scenario: Parse JSON tool call

- **WHEN** a model outputs a JSON-formatted tool call
- **THEN** the system parses it as a valid tool call

#### Scenario: Parse YAML tool call

- **WHEN** a model outputs a YAML-formatted tool call
- **THEN** the system parses it as a valid tool call

#### Scenario: Parse XML tool call

- **WHEN** a model outputs an XML-formatted tool call (e.g., `<function name="read_file"><param name="path">/file.txt</param></function>`)
- **THEN** the system parses it as a valid tool call

#### Scenario: Parse plain-text tool call

- **WHEN** a model outputs plain text like "search for X in the codebase"
- **THEN** the system maps it to the appropriate tool (e.g., `grep_search` with X as pattern)

#### Scenario: Auto-repair malformed JSON

- **WHEN** the model outputs JSON with trailing commas or missing closing brackets
- **THEN** the system auto-repairs the output before parsing
- **AND** logs the repair to help diagnose model quality issues

### Requirement: Patch-First Editing

The SHALL system prefer search-and-replace editing over full-file rewrites for models under 35B.

#### Scenario: Apply search-and-replace patch

- **GIVEN** a model proposes a patch with search and replace text
- **WHEN** the search string matches exactly in the target file
- **THEN** the system replaces the matched text with the replacement
- **AND** the patch is applied with no model intervention

#### Scenario: Fuzzy-match when exact match fails

- **GIVEN** a model proposes a patch with search text
- **WHEN** exact match fails but fuzzy match (ignoring whitespace differences) succeeds
- **THEN** the system applies the patch with fuzzy match
- **AND** reports the match confidence to the user

#### Scenario: Support multi-line patches

- **WHEN** a model proposes a patch spanning multiple lines
- **THEN** the system applies the multi-line patch as a single atomic operation

### Requirement: TODO-Driven Planning

The SHALL system decompose complex tasks into atomic TODO steps visible to the model each turn.

#### Scenario: Create plan from task

- **WHEN** a user gives a complex multi-step task
- **THEN** the system creates a numbered TODO plan with atomic steps
- **AND** the plan is injected into the context at the start of each turn

#### Scenario: Track step completion

- **GIVEN** a numbered TODO plan exists
- **WHEN** a step is completed
- **THEN** its status is updated to "done"
- **AND** it remains visible in context (prevents re-do)

#### Scenario: Auto-decompose complex steps

- **GIVEN** a TODO step that is still in progress after 5 turns
- **WHEN** the step is not yet completed
- **THEN** the system asks the model to self-decompose the step into smaller sub-steps

### Requirement: Tool Call Deduplication

The SHALL system short-circuit identical read-only tool calls to save tokens and time.

#### Scenario: Cache read-only tool results

- **WHEN** the model makes a read-only tool call (grep_search, read_file)
- **AND** an identical call was made within the last 20 calls
- **THEN** the system returns the cached result without executing the tool

#### Scenario: Execute write tool calls fresh

- **WHEN** the model makes a write tool call (edit, write_file, shell_command with side effects)
- **THEN** the system always executes the call fresh (no caching)

### Requirement: Context-Aware File Reading

The SHALL system read files intelligently within token budget, not full reads.

#### Scenario: Read file with head-tail truncation

- **GIVEN** a file that exceeds the remaining token budget
- **WHEN** the user or model requests read_file
- **THEN** the system returns the first 30% and last 30% of the file
- **AND** indicates the number of characters omitted in the middle

### Requirement: Read-Before-Write Guard

The SHALL system prevent overwriting files the model has not read.

#### Scenario: Block unread file writes

- **WHEN** the model attempts to write or edit a file
- **AND** the file was not read in the current session
- **THEN** the system blocks the write operation
- **AND** instructs the model to first read the file

### Requirement: Quality Monitoring

The SHALL system detect and flag quality issues in model outputs automatically.

#### Scenario: Detect empty tool calls

- **WHEN** the model produces a tool call with no output or meaningless content
- **THEN** the system flags it as a low-quality turn
- **AND** requests the model to retry

#### Scenario: Detect hallucinated tool names

- **WHEN** the model calls a tool name not in the available tool schema
- **THEN** the system ignores the call
- **AND** informs the model which tools are available

### Requirement: Adaptive Retry Temperature

The SHALL system vary temperature per retry attempt.

#### Scenario: First attempt uses low temperature

- **WHEN** the model first attempts a task
- **THEN** temperature is 0.1 (deterministic)

#### Scenario: Subsequent attempts increase temperature

- **GIVEN** the model's first attempt failed
- **WHEN** the model retries
- **THEN** temperature increases by 0.4 per attempt (0.1 → 0.5 → 0.9)

### Requirement: Per-Tool Trust Score

The SHALL system track tool reliability and disable unreliable tools.

#### Scenario: Disable repeatedly failing tool

- **WHEN** a tool fails 3 times consecutively
- **THEN** the system removes the tool from the available tools schema
- **AND** notifies the model the tool is unavailable

#### Scenario: Auto-enable tool after recovery

- **GIVEN** a tool was disabled for failures
- **WHEN** 2 turns pass without failure on other tools
- **THEN** the tool is re-enabled
