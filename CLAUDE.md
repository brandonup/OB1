# CLAUDE.md — Brain Project Instructions

This file helps AI coding tools (Claude Code, Codex, Cursor, etc.) work effectively in this project.

## What Brain Is

Brain is Brandon's private personal OS — a persistent AI memory system built on top of Open Brain (OB1). It uses OB1's architecture (Supabase + pgvector, one MCP protocol, any AI client) as the substrate. We call it Brain, but the implementation is OB1.

**Why OB1 as-is:** Instead of building a custom 7-domain architecture upfront, we're deploying OB1's single `thoughts` table with simple tags and using it through Cowork for 2-3 weeks to validate where structure is actually needed. The full Brain brief (`planning/brain-brief.md`) describes the long-term vision — structured domains, mode-based access scoping, domain classification — but we're proving the core loop first before committing to that complexity.

**What we're validating:**
- Does OB1 + good prompts + Cowork auto-memory solve persistent memory and context compounding?
- Where does the lack of domain structure actually hurt?
- What does Brain need to offer beyond what OB1 gives you out of the box?

## Current Phase

**Validation through use.** Deploy OB1, use it daily, keep a failure log of what goes wrong. That log drives the next round of design decisions.

## OB1 Repo Structure

```
extensions/     — Curated, ordered learning path (6 builds). Do NOT add without maintainer approval.
primitives/     — Reusable concept guides (must be referenced by 2+ extensions). Curated.
recipes/        — Standalone capability builds. Open for community contributions.
schemas/        — Database table extensions. Open.
dashboards/     — Frontend templates (Vercel/Netlify). Open.
integrations/   — MCP extensions, webhooks, capture sources. Open.
skills/         — Reusable AI client skills and prompt packs. Open.
docs/           — Setup guides, FAQ, companion prompts.
resources/      — Official companion files and packaged exports.
```

## Brain Directory

`brain/` contains all Brain-specific files (board, use cases, memory, scripts). This is Brandon's space — upstream OB1 will never touch it.

- **`brain/archive/`** — Past research, old PRDs, and reference docs. **Do NOT read, reference, or surface content from this folder unless Brandon explicitly asks for it.** Treat it as cold storage.

## Guard Rails

- **Never modify the core `thoughts` table structure.** Adding columns is fine; altering or dropping existing ones is not.
- **No credentials, API keys, or secrets in any file.** Use environment variables.
- **No binary blobs** over 1MB. No `.exe`, `.dmg`, `.zip`, `.tar.gz`.
- **No `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, or unqualified `DELETE FROM`** in SQL files.
- **MCP servers must be remote (Supabase Edge Functions), not local.** Never use `claude_desktop_config.json`, `StdioServerTransport`, or local Node.js servers. All extensions deploy as Edge Functions and connect via Claude Desktop's custom connectors UI (Settings → Connectors → Add custom connector → paste URL). See `docs/01-getting-started.md` Step 7 for the pattern.

## Key Context

- **Brain brief:** `planning/brain-brief.md` — the full long-term vision (7 domains, modes, contextual intelligence). Reference design, not current implementation scope.
- **License:** FSL-1.1-MIT. No commercial derivative works.
- **OB1 key files:** `CONTRIBUTING.md`, `.github/workflows/ob1-review.yml`, `.github/metadata.schema.json`, `LICENSE.md`
