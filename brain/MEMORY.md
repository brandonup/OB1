# Brain — Project Memory

## Tracking

- **System:** Markdown Board
- **Workflow:** `agents/board-workflow.md`
- **Board:** `projects/brain/BOARD.md`
- **ID prefix:** BRA

## Overview

Brain is Brandon's personal AI memory system built on Open Brain (OB1). Single `thoughts` table with pgvector embeddings, 4 MCP tools (capture_thought, search_thoughts, list_thoughts, thought_stats), deployed as a Supabase Edge Function. Every AI client connects to the same brain via MCP.

**Repo:** `projects/brain/` (cloned OB1 repo)
**Build guide:** `projects/brain/docs/builderguide/01-getting-started.md`
**Server (canonical):** `projects/brain/server/index-openai.ts` — OpenAI direct calls + dedup via `upsert_thought` RPC + CORS + Claude Desktop Accept header patch. Deployed to `supabase/functions/open-brain-mcp/`.
**Supabase project ref:** yueqgweyyajtymfarswm
**MCP endpoint:** `https://yueqgweyyajtymfarswm.supabase.co/functions/v1/open-brain-mcp`

## Current State

**Phase:** Phase 1 complete, Phase 2 in progress. 82 thoughts imported from Claude + ChatGPT.

- Phase 1 (Core Deploy): Complete. BRA-1 through BRA-4 + BRA-2a done.
- Phase 2 (Companion Prompts + Daily Capture): BRA-5 done (82 thoughts imported). BRA-6 and BRA-7 in Todo.
- Phase 3 (Weekly Review + Extension Gate): BRA-8, BRA-9 in Backlog
- Phase 5 (Next.js Dashboard): BRA-10a, BRA-10b, BRA-11 in Backlog — requires building open-brain-rest Edge Function (not in repo). Gilfoyle flagged schema mismatch between dashboard types and core table.

## Decisions

- 2026-04-05: Use OpenAI directly (not OpenRouter) for embeddings and metadata extraction.
- 2026-04-05: Use Next.js dashboard (not SvelteKit). Requires building `open-brain-rest` REST API gateway Edge Function.
- 2026-04-05: Use Markdown Board for tracking (not Linear). Board at `projects/brain/BOARD.md`.
- 2026-04-05: Kinetic Brain MCP is separate/unrelated. Brain is a fresh deploy.
- 2026-04-05: Lowered `match_thoughts` SQL default threshold from 0.7 to 0.5 to match MCP tool default.
