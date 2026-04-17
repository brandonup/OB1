# Brain (OB1) Implementation Plan

## Context

Brandon wants to deploy Brain — his personal AI memory system built on OB1. The repo at `projects/brain/` is fully implemented. We're starting fresh (new Supabase project, no existing infrastructure). The build guide at `docs/builderguide/01-getting-started.md` is the authoritative source.

Per the project's CLAUDE.md, the current phase is **validation through use**: deploy, use daily, keep a failure log, let that log drive whether domain structure or extensions are needed.

**Tracking:** Markdown Board at `projects/brain/BOARD.md` (workflow: `agents/board-workflow.md`, prefix: BRA).

---

## Phase 1: Core Deploy (Steps 1-8 from Build Guide)

Based on `docs/builderguide/01-getting-started.md` with modifications: using OpenAI directly instead of OpenRouter, and merging the dedup logic from `server/index.ts` into the OpenAI-based server.

**Step 1 — Supabase project.** Create a new Supabase project. Save project ref and database password.

**Step 2 — Database schema.** Run SQL in Supabase SQL Editor:
- Enable pgvector extension
- Create `thoughts` table (id, content, embedding VECTOR(1536), metadata JSONB, content_fingerprint, timestamps)
- Create HNSW index (vector search), GIN index (metadata), unique index (fingerprint dedup)
- Create `match_thoughts()` function (semantic search)
- Create `upsert_thought()` function (insert/merge with SHA-256 dedup)
- Enable RLS + grant service_role permissions
- (All SQL is in the getting-started doc)

**Step 3 — Save credentials.** Supabase Project URL + Service Role API Key (from Settings > API).

**Step 4 — OpenAI API key.** Use an existing OpenAI API key or create one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys). Models used: `text-embedding-3-small` (embeddings) and `gpt-4o-mini` (metadata extraction).

**Step 5 — Access key.** Generate via `openssl rand -hex 32`.

**Step 6 — Modify server + Deploy Edge Function.**
- The repo has two server variants: `server/index.ts` (OpenRouter + dedup) and `supabase/functions/open-brain-mcp/index.ts` (OpenAI, no dedup). We need to combine them: OpenAI calls from the Edge Function version + dedup logic (`upsert_thought` RPC) from the server version. This is BRA-2a.
- Install Supabase CLI
- `supabase login`, `supabase init`, `supabase link --project-ref yueqgweyyajtymfarswm`
- Set secrets: `MCP_ACCESS_KEY`, `OPENAI_API_KEY`
- Create function: `supabase functions new open-brain-mcp`
- Copy modified `index.ts` and `deno.json` into the function folder
- Deploy: `supabase functions deploy open-brain-mcp --no-verify-jwt --project-ref yueqgweyyajtymfarswm`

**Step 7 — Connect AI clients.**
- Claude Desktop: Settings > Connectors > Add custom connector > paste URL with `?key=`
- ChatGPT: Developer Mode > Apps & Connectors > Create connector
- Claude Code: CLI command with `x-brain-key` header
- Cursor/Codex: via `supergateway` or `mcp-remote` bridges

**Step 8 — Test.** Capture a thought, search for it, verify stats.

**Key files:**
- `projects/brain/docs/builderguide/01-getting-started.md` — all SQL + deployment steps
- `projects/brain/server/index.ts` — dedup logic reference (`upsert_thought` RPC call)
- `projects/brain/supabase/functions/open-brain-mcp/index.ts` — OpenAI calls reference
- `projects/brain/server/deno.json` — dependencies

**Board items:**
- **BRA-1** [U] Create Supabase project and run Brain schema SQL (est: 1)
- **BRA-2** [U] Get OpenAI API key and generate MCP access key (est: 1)
- **BRA-2a** [U] Merge server variants — OpenAI calls + dedup logic into one Edge Function (est: 2)
- **BRA-3** [U] Deploy open-brain-mcp Edge Function (est: 1)
- **BRA-4** [H] Connect Brain MCP to Claude Desktop, ChatGPT, Claude Code (est: 1)

**Done-when:** `capture_thought` stores a row, duplicate capture merges (not duplicates), `search_thoughts` returns relevant results, `thought_stats` shows correct count.

---

## Phase 2: Companion Prompts + Daily Capture (Weeks 1-2)

Follow `docs/builderguide/02-companion-prompts.md`.

**Prompt 1 — Memory Migration.** Run on each AI platform (Claude, ChatGPT) to extract what they already know about Brandon and save it to Brain.

**Prompt 3 — Open Brain Spark.** Interview-style discovery of personalized use cases across 5 patterns (Save This, Before I Forget, Cross-Pollinate, Build the Thread, People Context).

**Prompt 4 — Quick Capture Templates.** 5 sentence starters optimized for clean metadata extraction (decisions, people, insights, meetings, AI saves).

**Daily practice:** Capture 3-5 thoughts per day for 2 weeks. Keep a **failure log** of what goes wrong (bad search results, wrong metadata, dedup misses).

**Optional:** Install `resources/second-brain-prompt.md` as a system prompt in the primary AI client for proactive capture/search behavior (not in the build guide but available in the repo).

**Board items:**
- **BRA-5** [H] Run Memory Migration on Claude and ChatGPT (est: 2)
- **BRA-6** [M] Run Open Brain Spark for use-case discovery (est: 1)
- **BRA-7** [H] 2-week daily capture with failure log (est: 2)

**Done-when:** Brain has 50+ thoughts from mixed sources, failure log exists, Brandon can ask connected AI about past context and get a Brain-sourced answer.

---

## Phase 3: Weekly Review + Extension Gate (End of Week 2)

**Prompt 5 — Weekly Review.** Friday ritual using `list_thoughts(days=7)` + `search_thoughts` to surface themes, forgotten action items, patterns, connections, gaps.

**Gate decision:** Review the failure log. Classify entries:
- (a) Fixable with better capture habits — no extension needed
- (b) Needs structured data (contacts, schedules, etc.) — deploy matching extension
- (c) Fundamental OB1 limitation — document for future Brain architecture work

**Board items:**
- **BRA-8** [M] Run first Weekly Review (est: 1)
- **BRA-9** [H] Phase 3 gate — classify failure log and decide extension scope (est: 1)

**Done-when:** Weekly Review output exists, failure log classified, extension decision documented.

---

## Phase 4: Extensions (Weeks 3-4, conditional)

Deploy only what the failure log justifies. Each extension has its own `schema.sql`, `index.ts`, `deno.json`, and README with step-by-step instructions.

**Available extensions (learning path order):**
1. Household Knowledge Base — `extensions/household-knowledge/` (beginner, 30 min)
2. Home Maintenance Tracker — `extensions/home-maintenance/` (beginner, 30 min)
3. Family Calendar — `extensions/family-calendar/` (intermediate, 45 min)
4. Meal Planning — `extensions/meal-planning/` (intermediate, 1 hr, introduces RLS)
5. Professional CRM — `extensions/professional-crm/` (intermediate, 45 min)
6. Job Hunt Pipeline — `extensions/job-hunt/` (advanced, 1 hr)

**Per extension:** Run schema.sql, create Edge Function, deploy, connect MCP URL. Each is independent.

**Board items:** Created per extension as the gate decision dictates.

---

## Phase 5: Next.js Dashboard (Weeks 3-4)

**Goal:** Deploy the full-featured Next.js dashboard for web-based browsing, search, capture, audit, and duplicate management.

**Prerequisite — Build `open-brain-rest` Edge Function.** The Next.js dashboard talks to a REST API gateway, not the MCP endpoint directly. This gateway does not exist in the repo and must be built.

> **Gilfoyle review note (2026-04-05):** This is NOT a thin wrapper around existing MCP operations. The dashboard's TypeScript types (`dashboards/open-brain-dashboard-next/lib/types.ts`) expect columns that do not exist in OB1's core schema: `quality_score`, `importance`, `sensitivity_tier`, `source_type`, and `id` as `number` (core uses `uuid`). BRA-10a must include a schema gap analysis before writing any endpoint code — decide whether to (a) add columns via ALTER TABLE, (b) synthesize from metadata JSONB at the gateway layer, or (c) accept partial dashboard functionality.

**REST endpoints — split into two mandatory phases:**

**BRA-10a: Core CRUD endpoints (est: 3)**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Login validation |
| `/thoughts` | GET | Browse (paginated, filtered) |
| `/thought/:id` | GET | Detail view |
| `/thought/:id` | PUT | Inline edit |
| `/thought/:id` | DELETE | Delete thought |
| `/search` | POST | Semantic + full-text search |
| `/stats` | GET | Dashboard stats |
| `/capture` | POST | Quick capture (single thought) |

Prerequisite: Schema gap analysis (core `thoughts` table vs dashboard `Thought` type).

**BRA-10b: Advanced endpoints (est: 3)**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/duplicates` | GET | Semantic duplicate detection |
| `/thought/:id/reflection` | GET | Linked reflections |
| `/ingest` | POST | Smart ingest / extraction |
| `/ingestion-jobs` | GET | Ingest job history |

**Dashboard deploy steps:**
1. Complete BRA-10a (core REST gateway)
2. `cd dashboards/open-brain-dashboard-next && npm install`
3. Configure `.env`: `NEXT_PUBLIC_API_URL`, `SESSION_SECRET`
4. Test locally: `npm run dev`
5. Deploy to Vercel via **Vercel web dashboard** (not CLI — `npx` is hard-blocked per security rules)

**Key files:**
- `projects/brain/dashboards/open-brain-dashboard-next/` — full Next.js dashboard
- `projects/brain/dashboards/open-brain-dashboard-next/lib/types.ts` — schema expectations to reconcile
- `projects/brain/server/index.ts` — reference for gateway logic

**Board items:**
- **BRA-10a** [H] Schema gap analysis + build core REST endpoints (est: 3)
  - Blocked by BRA-1, BRA-2, BRA-3
- **BRA-10b** [H] Build advanced REST endpoints (duplicates, ingest) (est: 3)
  - Blocked by BRA-10a
- **BRA-11** [H] Deploy Next.js Brain dashboard to Vercel (est: 2)
  - Blocked by BRA-10a. Deploy via Vercel web dashboard (not CLI).

**Done-when:** Dashboard is live, login works with MCP access key, browse/search/capture/audit/duplicates pages functional.

---

## Phase 6: Data Imports + Skill Packs (Week 5+, ongoing)

**Data imports (recipes):**
- ChatGPT conversation import — `recipes/chatgpt-conversation-import/` (Python, requires ChatGPT data export)
- Perplexity, Obsidian, Google Activity, Email, X/Twitter imports available in `recipes/`

**Skill packs:** Auto-Capture, Panning for Gold, etc. in `skills/` — install as needed.

**Board items:** Created as Brandon identifies what data sources to import.

---

## Summary: 13 Initial Board Items

| ID | Priority | Title | Est |
|----|----------|-------|-----|
| BRA-1 | [U] | Create Supabase project and run Brain schema SQL | 1 |
| BRA-2 | [U] | Get OpenAI API key and generate MCP access key | 1 |
| BRA-2a | [U] | Merge server variants — OpenAI calls + dedup logic into one Edge Function | 2 |
| BRA-3 | [U] | Deploy open-brain-mcp Edge Function | 1 |
| BRA-4 | [H] | Connect Brain MCP to Claude Desktop, ChatGPT, Claude Code | 1 |
| BRA-5 | [H] | Run Memory Migration on Claude and ChatGPT | 2 |
| BRA-6 | [M] | Run Open Brain Spark for use-case discovery | 1 |
| BRA-7 | [H] | 2-week daily capture with failure log | 2 |
| BRA-8 | [M] | Run first Weekly Review | 1 |
| BRA-9 | [H] | Phase 3 gate — classify failure log and decide extension scope | 1 |
| BRA-10a | [H] | Schema gap analysis + build core REST endpoints | 3 |
| BRA-10b | [H] | Build advanced REST endpoints (duplicates, ingest) | 3 |
| BRA-11 | [H] | Deploy Next.js Brain dashboard to Vercel | 2 |

BRA-1 through BRA-4 (including BRA-2a) start in **Todo**. BRA-5 through BRA-9 start in **Backlog** (blocked by Phase 1). BRA-10a, BRA-10b, and BRA-11 start in **Backlog**.

## Gilfoyle Review (2026-04-05)

**Verdict:** APPROVED WITH NOTES. Phases 1-3 clean and ready. Two important findings incorporated:
1. Dashboard schema mismatch — `lib/types.ts` expects columns not in core OB1. BRA-10a now includes schema gap analysis as prerequisite.
2. REST gateway scope — split BRA-10 into BRA-10a (core CRUD, est: 3) and BRA-10b (advanced, est: 3). Made mandatory.
3. Added `--project-ref` to deploy command (defensive habit).
4. Noted `npx` is hard-blocked — BRA-11 uses Vercel web dashboard for deployment.

## Verification

After Phase 1:
- `capture_thought` → row appears in Supabase
- Duplicate capture → merge, not new row
- `search_thoughts` → semantically relevant results
- `thought_stats` → accurate count

After Phase 2:
- Ask any connected AI about previously captured context → Brain-sourced answer
- Failure log has entries after week 1

After Phase 5:
- Dashboard login works with MCP access key
- Browse page shows paginated thoughts with filters
- Search returns results with similarity scores
- Capture from web UI persists to database
- Audit page surfaces low-quality thoughts
- Duplicates page detects semantic duplicates
