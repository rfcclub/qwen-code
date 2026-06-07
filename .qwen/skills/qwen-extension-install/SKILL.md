---
name: qwen-extension-install
description: Install a local project or third-party tool as a Qwen Code extension. Maps external skill/command formats to Qwen's extension structure (qwen-extension.json, commands/, skills/, QWEN.md).
source: auto-skill
extracted_at: '2026-06-07T14:26:46.098Z'
---

# Install Local Project as Qwen Extension

## When to Use

- When a local project (e.g., `~/work/loomkit`) needs to be used inside Qwen Code as commands/skills
- When a third-party tool has skills/commands that should be callable via Qwen slash commands
- When the user says "install X into Qwen" or "make X available as a Qwen extension"

## Prerequisites

- The project must have skill or command content that can be mapped to Qwen's format
- Qwen Code must be built (`npm run build` or `npm run bundle`) so the CLI is available

## Step 1: Understand the Extension Format

Qwen extensions live in `~/.qwen/extensions/<name>/` with this structure:

```
<name>/
├── qwen-extension.json     # Metadata: name, version, commands, skills, agents
├── QWEN.md               # Context file appended to system prompt
├── commands/             # Slash commands (.md files with YAML frontmatter)
│   └── my-command.md
├── skills/               # Agent skills (directories with SKILL.md)
│   └── my-skill/
│       └── SKILL.md
└── agents/               # Subagents (.yaml or .md files)
```

### `qwen-extension.json` Format

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "description": "...",
  "commands": "commands",
  "skills": "skills",
  "agents": "agents",
  "contextFileName": "QWEN.md"
}
```

### Command Format (Markdown)

```markdown
---
description: Optional description shown in /help
---

# /command-name

Prompt content here. Use {{args}} for parameter injection.
```

### Skill Format (Markdown with YAML frontmatter)

```markdown
---
name: skill-name
description: When to use this skill
---

# Skill Title

## Instructions

1. Step one
2. Step two
```

## Step 2: Map the Source Project to Qwen Format

1. **Read the source project's structure** — understand what it calls "skills", "commands", "phases", etc.
2. **Identify mappable content** — anything that is a prompt/instruction can become a command or skill
3. **Map naming conventions** — the source may use different terminology (e.g., LoomKit uses `/lk:spec`, Qwen uses `/spec`)

### Common Mappings

| Source Format  | Qwen Format              | Notes                                   |
| -------------- | ------------------------ | --------------------------------------- |
| SKILL.md       | `skills/<name>/SKILL.md` | Copy as-is if frontmatter is compatible |
| Command prompt | `commands/<name>.md`     | Wrap in markdown with YAML frontmatter  |
| README.md      | `QWEN.md`                | Copy as extension context               |
| Config file    | —                        | Often not needed in Qwen extension      |

## Step 3: Create the Extension Directory

```bash
mkdir -p ~/.qwen/extensions/<name>/{commands,skills,agents}
```

Copy or create the mapped files. Then write `qwen-extension.json` and `QWEN.md`.

### `QWEN.md` Content

Write a brief description of:

- What the extension provides
- Available commands
- How to use them
- Any workflow (e.g., "Run /lk:spec then /lk:plan then /lk:apply")

## Step 4: Install the Extension

```bash
# If the extension is in ~/.qwen/extensions/<name> (already there)
qwen extensions enable <name>

# If installing from a local path
qwen extensions install /path/to/extension

# Confirm when prompted
```

### Installation Output to Verify

After install, the CLI will list:

- Commands added (e.g., `/spec`, `/plan`, `/apply`)
- Skills added (e.g., `spec`, `plan`, `tdd`)
- Context files (e.g., `QWEN.md`)

## Step 5: Verify Installation

```bash
qwen extensions list
```

Should show the extension with:

- Name and version
- Path
- Enabled status
- Commands list
- Skills list

## Troubleshooting

### "No extensions installed" after enabling

The extension must be **installed** (not just placed in `~/.qwen/extensions/`). Use `qwen extensions install <path>`.

### Commands not showing

- Check that `commands/` files end in `.md`
- Check that YAML frontmatter is valid (no tabs, proper `---` delimiters)
- Check `qwen-extension.json` has `"commands": "commands"` (matching the directory name)

### Skills not showing

- Check that skill directories contain `SKILL.md`
- Check that `SKILL.md` has YAML frontmatter with `name:` and `description:`
- Check `qwen-extension.json` has `"skills": "skills"`

### Build required before install

If the CLI is `dist/cli.js`, ensure `npm run build` has succeeded before running extension commands.

## Example: LoomKit Installation

LoomKit (`~/work/loomkit`) has `skills/` with `SKILL.md` files. Map to Qwen extension:

```bash
# 1. Create structure
mkdir -p ~/.qwen/extensions/loomkit/{commands,skills,agents}

# 2. Copy skills
cp -r ~/work/loomkit/skills/* ~/.qwen/extensions/loomkit/skills/

# 3. Write commands (e.g., commands/spec.md, commands/plan.md, commands/apply.md)
#    Each wraps the skill's workflow as a slash command

# 4. Write qwen-extension.json
# 5. Write QWEN.md

# 6. Install
echo "Y" | qwen extensions install ~/.qwen/extensions/loomkit

# 7. Verify
qwen extensions list
```

## Anti-Patterns

- **Don't manually copy to `~/.qwen-lyra/extensions/`** — use the CLI install command
- **Don't skip `QWEN.md`** — it provides context to the agent about the extension
- **Don't use TOML for commands** — Markdown with YAML frontmatter is the current format
- **Don't forget `description` in frontmatter** — it shows in `/help` and skill listings
