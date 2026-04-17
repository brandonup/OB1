# Brain V1 — Product Requirements Document

**Status:** Draft
**Author:** Nate B. Jones (advisory), Brandon Upchurch (owner)
**Date:** 2026-04-05
**Scope:** V1 — Tasks + Reflections domains, personal tool for single user

---

## 1. What This Document Is

This PRD defines what gets built in Brain V1. It is scoped to two domains (Tasks and Reflections), one integration (Gmail), one proactive artifact (daily briefing), and the core infrastructure that makes them work. Everything outside this scope — including five additional domains, additional integrations, autonomous proactive behaviors, and graph-augmented storage — is explicitly deferred.

The brief (`brain-brief.md`) is the vision document. This PRD is the build spec. Where the brief describes nine contextual intelligence behaviors and seven domains, this document describes the subset that ships first and exactly what "ships" means for each one.

**Governing decisions** (see `brain-decision-log.md`):

- **Decision 001:** OB1 pattern (Supabase + pgvector + MCP tools) as storage substrate
- **Decision 002:** Brain as MCP server; Cowork as V1 client
- **Decision 003:** V1 ships Tasks + Reflections simultaneously from day one
- **Decision 004:** Personal tool, not a product — build for speed and personal utility
- **Decision 005:** Competitive bar is OB1 + Cowork auto-memory + scheduled tasks; Brain must beat it on structured recall with provenance, domain-scoped retrieval, and review-and-approve intelligence

---

## 2. Problem Statement

Every AI agent you use forgets you. New sessions start from zero, tool switches wipe the slate, and you're burning your best thinking catching the agent up instead of doing actual work. The tools that try to fix this — auto-memory, vector databases, second-brain apps — store information but don't organize it, don't scope it, don't cite it, and don't let you review what the AI thinks it knows about you before it acts on it.

Brain solves this for one person. It captures tasks and personal reflections, stores them in structured domains with provenance, retrieves them with citations, and gives you a review surface for everything the AI wants to write to your knowledge base. The two domains test two distinct parts of the thesis: Tasks proves "Brain catches what I forgot" using external signals from email. Reflections proves "Brain knows me over time" using manual capture and coaching mode.

---

## 3. Success Criteria

Brain V1 succeeds if, after 30 days of daily use, it demonstrably beats the baseline stack (OB1 + Cowork auto-memory + CLAUDE.md + scheduled tasks) on three dimensions:

**3.1 Structured recall with provenance.** When asked "what did I need to do about X?", Brain returns a specific answer citing the source capture — which email thread, which conversation, which date — not just "I found something about that."

**3.2 Domain-scoped retrieval.** Coaching mode discussions about emotional patterns do not surface task noise. Task mode queries about deadlines do not surface reflections about feeling overwhelmed. The mode boundary is noticeable and useful.

**3.3 Review-and-approve intelligence.** The memory write proposal workflow catches at least one meaningful error in the first two weeks — a misclassified capture, an incorrect entity extraction, a wrong date pulled from email — that the baseline stack would have silently consumed.

**Measurement approach:** These are assessed through daily use journaling, not automated metrics. Brandon evaluates weekly: "Did Brain surface something I wouldn't have found with OB1? Did mode scoping prevent bleed I would have experienced? Did the review queue catch something wrong?" If the answer is no to all three after 30 days, the thesis needs revision before expanding scope.

---

## 4. Architecture Overview

Brain is an MCP server backed by Supabase (Postgres + pgvector). The architecture has four layers, two of which are simplified for a personal tool.

**Layer 1 — Raw Capture Log.** Append-only, immutable. Every input — typed captures, Gmail-extracted signals, AI-generated proposals — is stored as a raw record with source, timestamp, and content. This is the durable asset. Nothing downstream depends on getting classification right on the first pass, because the raw input is always recoverable.

**Layer 2 — Domain Tables.** Two tables for V1: `tasks` and `reflections`. These are derived views on top of raw captures, enriched by AI processing (classification, entity extraction, metadata). Every domain record links back to the raw capture(s) that generated it.

**Layer 3 — Agent Layer.** This is Cowork (or any MCP-compatible client). Brain does not build an agent. The client calls Brain's MCP tools, reasons over the results, and presents them to the user. For V1, Cowork is the only client, with mode-specific behavior defined in Cowork skill files.

**Layer 4 — Trust and Controls.** Simplified for personal tool: write-gating on all AI-generated domain entries (memory write proposals), basic audit logging in the event log, and mode-based tool scoping enforced at the MCP server level. No anomaly detection, no multi-user permissions, no enterprise security hardening.

### 4.1 What the MCP Server Exposes

The MCP server is the entire product. Every interaction with Brain goes through these tools. The server is responsible for enforcing domain scoping — it checks which mode is active and restricts tool access accordingly.

**Capture tools:**
- `capture_raw` — Store a raw input (text, URL, or integration signal) in the capture log with source metadata and timestamp. Returns the raw capture ID.
- `classify_and_store` — Takes a raw capture ID, classifies it into a domain (task or reflection), extracts metadata (entities, dates, people, subtypes), and creates a proposed domain entry. Returns a memory write proposal for user review.

**Task tools (available in Task Mode and unrestricted mode):**
- `search_tasks` — Semantic + metadata search across the tasks table. Accepts filters: status, date range, person, keyword. Returns results with source citations (links back to raw captures and integration sources).
- `get_task` — Retrieve a single task by ID with full provenance chain (raw capture → classification → any updates).
- `list_tasks` — List tasks with filters: open/closed, due date, person, priority. Paginated.
- `update_task` — Propose a status change, edit, or completion for a task. Returns a memory write proposal.
- `create_task` — Propose a new task from a direct user instruction (bypasses classification when the user explicitly says "add a task"). Returns a memory write proposal.

**Reflection tools (available in Coaching Mode and unrestricted mode):**
- `search_reflections` — Semantic + metadata search across reflections. Accepts filters: subtype (challenge, win, gratitude, feedback, negative thought, emotional reaction, insight), date range, keyword.
- `get_reflection` — Retrieve a single reflection by ID with full provenance.
- `log_reflection` — Propose a new reflection entry. Returns a memory write proposal.
- `list_reflections` — List reflections with filters: subtype, date range. Paginated.

**Cross-domain tools (available in all modes):**
- `search_all` — Search across both domains simultaneously. Used when the user's query doesn't fit neatly into one domain. Results are tagged by domain. Available in all modes but results are filtered by the active mode's permissions.
- `get_raw_capture` — Retrieve the original raw capture for any domain entry. Used for provenance verification.

**Proposal management tools:**
- `list_proposals` — List pending memory write proposals (unreviewed AI-generated entries). This powers the review queue.
- `approve_proposal` — Accept a pending proposal, persisting it to the domain table.
- `reject_proposal` — Reject a pending proposal with an optional reason. Logged but not persisted.
- `edit_and_approve_proposal` — Modify a proposed entry before accepting it (e.g., fix the classification, correct a date, change the domain).

**Ingestion tools (called by scheduled tasks, not directly by user):**
- `ingest_email_signals` — Takes processed email data (from the Gmail MCP), identifies task-relevant signals (new commitments, completion indicators, deadline mentions, follow-up requests), and generates memory write proposals for each. Does not write directly to domain tables.

**System tools:**
- `get_event_log` — Retrieve recent system events (captures, classifications, proposals, approvals, rejections). For debugging and trust-building.
- `get_mode` — Returns the currently active mode and its permissions.
- `set_mode` — Switch between Task Mode, Coaching Mode, and Unrestricted Mode.

### 4.2 Mode Definitions

Modes control which tools the agent can call and which domain data it can access. Mode enforcement happens at the MCP server level — if the agent calls a tool it doesn't have access to in the current mode, the server returns an error, not a result.

**Task Mode**
- Can access: `search_tasks`, `get_task`, `list_tasks`, `update_task`, `create_task`, `capture_raw`, `classify_and_store`, `search_all` (tasks results only), `get_raw_capture`, proposal management tools, `get_event_log`
- Cannot access: `search_reflections`, `get_reflection`, `log_reflection`, `list_reflections`
- Behavior: Focused on task capture, recall, status tracking, and acting on integration signals. Does not surface reflections or emotional context unless the user explicitly switches modes.

**Coaching Mode**
- Can access: `search_reflections`, `get_reflection`, `log_reflection`, `list_reflections`, `capture_raw`, `classify_and_store`, `search_all` (reflections results only), `get_raw_capture`, proposal management tools, `get_event_log`
- Cannot access: `search_tasks`, `get_task`, `list_tasks`, `update_task`, `create_task`
- Behavior: Focused on reflections, patterns, emotional processing, and coaching. Grounds every insight in cited source reflections. Labels all inferences as inferences. Does not surface task noise unless the user explicitly switches modes.
- Grounding requirement: Every coaching insight must reference specific prior reflections by date and content. "You seem to be struggling with deadlines" is not acceptable. "In your March 22 reflection, you noted frustration about missing the Henderson deadline, and on March 28 you captured a similar pattern with the Q2 planning tasks" is the standard.

**Unrestricted Mode**
- Can access: All tools.
- Behavior: No domain scoping. Used when the user's question genuinely spans both domains or when they want to work without mode constraints. This is the default mode on session start — the user opts into scoping by switching to Task or Coaching mode.

**Important design note:** Unrestricted is the default because forcing the user to pick a mode on every session creates friction that will kill adoption for a personal tool. The value of modes becomes apparent through use — the user discovers that coaching sessions are better when task noise is filtered out, and switches voluntarily. The architecture supports mode-switching at any point in a conversation.

### 4.3 Tool Scoping Is Not Prompt Instruction

This is a critical architectural requirement that I want to be explicit about because it's the kind of thing that gets compromised during implementation.

Mode-based access control must be enforced by the MCP server, not by the Cowork skill file. The skill file can instruct the agent "you are in Coaching Mode, focus on reflections" — but the MCP server must independently verify that tool calls match the active mode. If the agent in Coaching Mode tries to call `search_tasks`, the server rejects the call. Period.

The reason: prompt instructions are suggestions. Server-side enforcement is policy. For a personal tool with one user, the consequence of a bleed is low. But the design principle is right, and implementing it correctly now means the architecture works if Brain ever serves more than one user or connects to more than one client.

### 4.4 Implementation Stack (Validated by OB1 Reference)

The OB1 repo has 50+ MCP tools in production across 6 extensions, all running on the same stack. Brain uses the same proven stack rather than experimenting:

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Runtime** | Deno | All OB1 extensions and the core MCP server run on Deno. Supabase Edge Functions are Deno-native. |
| **Web Framework** | Hono (`hono@4.9.2`) | Lightweight, fast. OB1 uses it for routing, CORS, and middleware across every extension. |
| **MCP Transport** | `@hono/mcp@0.1.1` + `StreamableHTTPTransport` | HTTP-based MCP transport compatible with Cowork custom connectors. Not stdio — all servers are remote. |
| **MCP SDK** | `@modelcontextprotocol/sdk@1.24.3` | Standard MCP protocol implementation. |
| **Schema Validation** | Zod (`zod@4.1.13`) | All MCP tool inputs validated with Zod schemas. Every tool has a typed input definition. |
| **Database Client** | `@supabase/supabase-js@2.47.10` | Standard Supabase JS client for all database operations. |
| **Vector Search** | pgvector with HNSW index | Cosine similarity via `<=>` operator. 1536-dimensional embeddings. |
| **Embeddings** | `text-embedding-3-small` (OpenAI/OpenRouter) | 1536 dimensions. Confirmed adequate for personal-scale semantic search in OB1 production. |
| **Metadata Extraction** | GPT-4o-mini in JSON schema mode | OB1 uses this for automatic type, topic, people, and action item extraction on every capture. Brain uses the same pattern for classification (Section 6). |
| **Deployment** | Supabase Edge Functions | `supabase functions deploy` is the standard deployment command. No Docker, no external hosting needed. |

**Auth pattern:** OB1 authenticates MCP requests via an `x-access-key` header (or `?key=` query param). Brain uses the same pattern for V1. The MCP server validates the key before processing any tool call. For a personal tool, this is sufficient — the key is a shared secret between the server and Cowork's custom connector configuration.

**CORS handling:** OB1 includes CORS middleware in every MCP server for compatibility with Claude Desktop and Cowork. Brain must do the same. The Hono middleware pattern is consistent across all OB1 extensions and should be copied directly.

**Why this stack matters:** These aren't theoretical recommendations. OB1 has ~2,343 lines of extension code across 6 production extensions, all using these exact versions. The patterns are tested, the error handling is consistent, and the deployment pipeline works. Brain doesn't need to evaluate alternatives — it needs to copy what's proven and focus implementation time on the novel parts (domain scoping, write proposals, mode enforcement).

---

## 5. Data Model

### 5.1 Raw Captures Table

```
raw_captures
├── id                  UUID, primary key
├── content             TEXT, the original input (never modified after creation)
├── source              TEXT, enum: 'manual', 'gmail', 'calendar', 'slack'
├── source_metadata     JSONB, source-specific context:
│                         manual: { input_method: 'typed' | 'voice' }
│                         gmail: { thread_id, message_id, subject, sender, date }
│                         calendar: { event_id, title, date }
│                         slack: { channel, thread_ts, sender, date }
├── created_at          TIMESTAMPTZ, when captured
├── processed           BOOLEAN, whether classification has been attempted
├── embedding           VECTOR(1536), for semantic search over raw captures
└── deleted_by_user     BOOLEAN, default false (user can soft-delete; system never deletes)
```

### 5.2 Tasks Table

```
tasks
├── id                  UUID, primary key
├── raw_capture_ids     UUID[], links to source raw captures (one task can derive from multiple captures)
├── title               TEXT, short task description
├── description         TEXT, full context
├── status              TEXT, enum: 'open', 'completed', 'deferred', 'cancelled'
├── due_date            DATE, nullable
├── people              TEXT[], names of people involved
├── source_integration  TEXT, nullable — which integration surfaced this ('gmail', 'calendar', 'slack', null for manual)
├── source_detail       TEXT, nullable — human-readable source description ("Email from Sarah, March 22")
├── confidence          FLOAT, 0.0–1.0 — classification confidence
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
├── completed_at        TIMESTAMPTZ, nullable
├── embedding           VECTOR(1536)
└── metadata            JSONB, extensible field for tags, priority, project, etc.
```

### 5.3 Reflections Table

```
reflections
├── id                  UUID, primary key
├── raw_capture_ids     UUID[], links to source raw captures
├── content             TEXT, the reflection text
├── subtype             TEXT, enum: 'challenge', 'win', 'gratitude', 'feedback',
│                         'negative_thought', 'emotional_reaction', 'insight'
├── people              TEXT[], names of people mentioned
├── themes              TEXT[], extracted themes (e.g., 'work-life balance', 'deadline pressure')
├── confidence          FLOAT, 0.0–1.0 — classification confidence
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
├── embedding           VECTOR(1536)
└── metadata            JSONB, extensible
```

### 5.4 Memory Write Proposals Table

```
memory_write_proposals
├── id                  UUID, primary key
├── target_domain       TEXT, enum: 'tasks', 'reflections'
├── action_type         TEXT, enum: 'create', 'update', 'complete', 'reclassify'
├── proposed_data       JSONB, the full proposed record
├── raw_capture_ids     UUID[], source captures this proposal derives from
├── source_integration  TEXT, nullable — which integration triggered this
├── confidence          FLOAT, 0.0–1.0
├── rationale           TEXT, why the system is proposing this (human-readable)
├── status              TEXT, enum: 'pending', 'approved', 'rejected', 'edited_and_approved'
├── user_edits          JSONB, nullable — what the user changed before approving
├── rejection_reason    TEXT, nullable
├── created_at          TIMESTAMPTZ
├── resolved_at         TIMESTAMPTZ, nullable
└── batch_id            UUID, nullable — groups proposals from the same ingestion run
```

### 5.5 Event Log Table

```
event_log
├── id                  UUID, primary key
├── event_type          TEXT, enum: 'capture', 'classify', 'proposal_created',
│                         'proposal_approved', 'proposal_rejected', 'proposal_edited',
│                         'task_updated', 'reflection_logged', 'ingestion_run',
│                         'mode_switch', 'search_query'
├── details             JSONB, event-specific payload
├── related_ids         JSONB, { raw_capture_id, proposal_id, task_id, reflection_id } as applicable
├── created_at          TIMESTAMPTZ
└── source              TEXT, 'user' | 'system' | 'ingestion'
```

### 5.6 Database Implementation Details (from OB1 Reference)

OB1's extensions follow consistent Postgres patterns across 6 production schemas (2–5 tables each, all with RLS). Brain adopts these patterns directly:

**Primary keys:** All tables use `id UUID DEFAULT gen_random_uuid()` as PK. No serial integers.

**Timestamps:** Every table includes `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()`. An auto-update trigger fires on every UPDATE:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each table:
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Vector indexing:** OB1 uses HNSW (not IVFFlat) for vector search. HNSW is slower to build but faster to query and doesn't require periodic reindexing. The index configuration:

```sql
CREATE INDEX ON raw_captures
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON tasks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON reflections
  USING hnsw (embedding vector_cosine_ops);
```

**Metadata indexing:** GIN indexes on all JSONB columns for fast filtered queries:

```sql
CREATE INDEX ON raw_captures USING gin (source_metadata);
CREATE INDEX ON tasks USING gin (metadata);
CREATE INDEX ON reflections USING gin (metadata);
```

**Temporal indexing:** Descending index on `created_at` for "most recent first" queries (the most common access pattern):

```sql
CREATE INDEX ON raw_captures (created_at DESC);
CREATE INDEX ON tasks (created_at DESC);
CREATE INDEX ON reflections (created_at DESC);
CREATE INDEX ON event_log (created_at DESC);
CREATE INDEX ON memory_write_proposals (created_at DESC);
```

**Row-Level Security:** OB1 uses RLS for multi-user isolation. Brain is single-user for V1 but should implement RLS from the start (the architecture should not preclude multi-user later). The pattern:

```sql
ALTER TABLE raw_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_isolation" ON raw_captures
  FOR ALL USING (auth.uid() = user_id);
```

This means every Brain table needs a `user_id UUID REFERENCES auth.users(id)` column, even though V1 has exactly one user. The cost is one extra column per table. The benefit is that the schema doesn't need to be rebuilt if Brain ever serves more than one person.

**Composite search pattern (vector + metadata):** OB1's search implementation applies metadata filters as SQL WHERE clauses *before* the vector similarity comparison. This is significantly faster than filtering after — Postgres prunes rows before computing cosine distances:

```sql
SELECT *, 1 - (embedding <=> $1) AS similarity
FROM tasks
WHERE status = 'open'
  AND created_at > now() - interval '30 days'
ORDER BY embedding <=> $1
LIMIT 10;
```

Brain's `search_tasks` and `search_reflections` tools should follow this exact pattern.

### 5.7 Embedding Strategy (Confirmed by OB1 Production)

All embeddings use the same model (recommendation: `text-embedding-3-small` for cost efficiency at personal scale, upgrade to `text-embedding-3-large` if recall quality is insufficient).

Embeddings are generated at write time for raw captures, tasks, and reflections. Semantic search uses cosine similarity via pgvector's `<=>` operator, combined with metadata filters (date range, status, subtype, people) applied as SQL WHERE clauses before the vector comparison.

**Re-embedding on model upgrade:** The raw capture log contains the original text. If a better embedding model ships, regenerate all embeddings from raw content in a batch job. The schema supports this by treating embeddings as derived, not primary.

---

## 6. Classification Logic

When the user captures something without specifying a domain, Brain must classify it. This is one of the most failure-prone parts of the system, and the design reflects that.

### 6.1 Classification Signals

**Task signals:** Action language ("I need to", "follow up with", "schedule", "remind me to"), future dates, deadlines, people + commitments, verbs implying obligation.

**Reflection signals:** Emotional language ("I feel", "I'm frustrated", "proud of", "grateful for"), self-observation ("I noticed that I", "pattern I keep seeing"), past-tense introspection, coaching-adjacent language.

**Ambiguous inputs:** "I'm frustrated that I keep missing deadlines" is both a reflection and a task signal. The classification rule for ambiguous inputs: **classify as the domain with the strongest signal, and include the alternative classification in the proposal rationale.** The user sees "Classified as: Reflection. Also considered: Task (deadline pressure signal detected)" and can reclassify with one action.

### 6.2 Classification Implementation: GPT-4o-mini + JSON Schema Mode

OB1 uses GPT-4o-mini in JSON schema mode for automatic metadata extraction on every captured thought — extracting type, topics, people, and action items in a single structured LLM call. Brain uses the same pattern for classification, with a Brain-specific schema.

**How it works:** When `classify_and_store` is called, the MCP server sends the raw capture content to GPT-4o-mini with a JSON schema that constrains the output to valid classification fields:

```json
{
  "domain": "task | reflection",
  "confidence": 0.0-1.0,
  "alternative_domain": "task | reflection | null",
  "alternative_confidence": 0.0-1.0,
  "title": "short description (for tasks)",
  "subtype": "challenge | win | gratitude | ... (for reflections)",
  "people": ["extracted names"],
  "due_date": "YYYY-MM-DD or null",
  "themes": ["extracted themes (for reflections)"],
  "rationale": "why this classification was chosen"
}
```

**Why GPT-4o-mini, not the primary model:** Classification is a high-volume, low-complexity operation. Every capture triggers it. GPT-4o-mini is fast (~200ms), cheap, and accurate enough for structured extraction when constrained by a JSON schema. The primary model (whatever Cowork uses) handles reasoning over the classified results — the classification itself doesn't need frontier intelligence.

**Why JSON schema mode, not free-text parsing:** Schema mode forces the model to return valid JSON matching the schema. No regex parsing, no extraction errors from malformed output. OB1 has been running this pattern in production across thousands of captures without parsing failures.

**Embedding generation:** The same `classify_and_store` call also generates the embedding (via `text-embedding-3-small`) and stores it alongside the domain entry. Both the raw capture and the derived domain entry get embeddings — the raw capture embedding enables search over original inputs, the domain entry embedding enables search over the classified/enriched version.

### 6.3 Classification Is Always a Proposal

No capture is ever classified and stored silently. Every classification produces a memory write proposal. For manual captures that are clearly one domain (user says "task: follow up with Sarah"), the proposal can be auto-approved — but it still goes through the proposal path so it's logged and auditable. The auto-approval threshold is a configuration toggle, not a hardcoded behavior.

### 6.4 Explicit Capture Mode

The user can prefix their input with a domain keyword to skip classification ambiguity:

- "task: follow up with Sarah about the contract" → classified as task, high confidence
- "reflection: I handled the client call well today" → classified as reflection, high confidence
- "I need to email Bob about the timeline" → no prefix, classified by signal analysis, medium confidence

The Cowork skill file should encourage explicit prefixes in its initial instructions but not require them. Low friction beats classification accuracy — the proposal workflow catches mistakes.

### 6.5 Reclassification

If the user rejects a proposal because of wrong classification, the MCP server supports `edit_and_approve_proposal` with a domain change. The raw capture stays unchanged. A new domain entry is created in the correct table, and the event log records the reclassification with the reason.

---

## 7. Gmail Integration

Gmail is the only V1 integration. It proves that Brain can extract structured intelligence from an external source and present it as reviewable proposals — not silent writes.

### 7.1 What Brain Extracts from Email

The daily ingestion scan processes the prior 24 hours of email and looks for:

**New task signals:**
- Commitments made by the user ("I'll send you the report by Friday")
- Commitments made to the user ("I'll have the numbers to you by end of week")
- Action items from threads the user is on ("Can you review the attached?")
- Scheduling confirmations ("Let's meet Thursday at 2pm" → task: prepare for meeting)

**Task completion signals:**
- Confirmation that a previously captured task is done ("Report sent", "Meeting confirmed", "Invoice paid")
- Delivery receipts for commitments ("Here's the document you requested")

**People signals:**
- New people mentioned in threads (name, role if inferrable, context of interaction)
- These are noted in the proposal metadata but not stored in a separate People table for V1 — they become task.people or reflection.people field values

### 7.2 What Brain Does NOT Extract from Email

- Emotional tone or sentiment → no automated reflection generation from email
- Meeting content or decisions → deferred until Calendar integration ships
- Spam, marketing, or automated emails → filtered by the ingestion prompt, not by Brain's classification
- Anything from email that doesn't relate to tasks → email is a task-domain integration only in V1

### 7.3 Ingestion Workflow

The ingestion runs as a **Cowork scheduled task** on a daily cadence (recommendation: 7:00 AM local time, before the user's first session).

**Step 1 — Fetch.** The scheduled task calls the Gmail MCP to retrieve emails from the last 24 hours. The prompt specifies filtering criteria: skip marketing/promotional, focus on threads the user participated in.

**Step 2 — Analyze.** The agent reads each relevant thread and identifies task signals (new tasks, completion signals, people mentions) using the classification signals from Section 6.1.

**Step 3 — Deduplicate.** For each candidate task signal, the agent calls Brain's `search_tasks` to check whether a similar task already exists. If a match is found, the signal is treated as an update proposal (e.g., completion) rather than a new task proposal.

**Step 4 — Propose.** For each actionable signal, the agent calls Brain's `classify_and_store` or `update_task` to create a memory write proposal. Each proposal includes:
- The source email reference (thread ID, subject, sender, date)
- The extracted signal and proposed action
- Confidence level
- Rationale for why this was flagged

**Step 5 — Write briefing.** The agent generates a daily briefing artifact (see Section 8) summarizing what was found. The scheduled task session ends.

**Step 6 — Review.** When the user opens their next Cowork session, the briefing artifact is available in the workspace, and pending proposals are accessible via `list_proposals`.

### 7.4 Ingestion Prompt Requirements

The scheduled task prompt must:
- Explicitly instruct the agent to only generate proposals, never write directly to domain tables
- Set a confidence threshold below which signals are noted in the briefing but not proposed (recommendation: 0.5)
- Limit the number of proposals per run to prevent proposal fatigue (recommendation: cap at 10 per day; if more signals exist, prioritize by confidence and include a note in the briefing)
- Include example email patterns that should and should not generate proposals, to calibrate the agent's judgment

---

## 8. Daily Briefing

The daily briefing is Brain's first proactive artifact. It is a **generated markdown file** in the Cowork workspace — not a conversation turn. This follows the two-door principle from the brief: the agent enters through MCP tool calls, the user enters through the file system, and both sides operate on the same information.

### 8.1 Briefing Contents

The daily briefing includes:

**Section 1 — New from email.** Summary of what the Gmail ingestion found: new task proposals, completion signals, notable threads. Each item links to the proposal it generated (by proposal ID) so the user can approve/reject from context.

**Section 2 — Open tasks snapshot.** A list of currently open tasks, sorted by due date (soonest first). Stale tasks (open for more than 7 days with no update) are flagged.

**Section 3 — Pending proposals.** Count and summary of unreviewed proposals. This is the user's prompt to review the queue.

**Section 4 — Recent reflections.** If the user has logged reflections in the past 3 days, surface a brief summary. If not, a gentle prompt: "No reflections logged recently. Coaching mode works best with regular input." This section only appears if the user has any reflections at all — no empty section on day one.

### 8.2 Briefing Format

The briefing is written to the workspace as `brain-daily-YYYY-MM-DD.md`. Previous briefings are not deleted — they accumulate as a readable log. The user can review past briefings to see what Brain was surfacing over time.

### 8.3 Cold Start Handling

**Day 1–3 (near-empty knowledge base):** The briefing honestly states what it doesn't have. "This is your first daily briefing. Brain has [N] captures so far. The briefing gets more useful as the knowledge base grows. Today's email scan found: [results or 'nothing actionable']." No filler, no fake insights.

**Day 4–14 (sparse but growing):** The briefing shows what's there without pretending there's more. Task snapshots may have 3–5 items. Reflection summaries may have 1–2 entries. The briefing earns trust by being accurate about its own limitations.

**Day 15+ (meaningful density):** The briefing starts to demonstrate value — surfacing tasks the user forgot, flagging stale commitments, summarizing reflection patterns. This is where the competitive bar gets tested.

### 8.4 Cold Start Seeding

To accelerate time-to-value, the first ingestion run should pull the **last 14 days** of email (not just the last 24 hours). This seeds the task table with recent commitments and open loops before the user's first real session. This is a one-time bootstrap run — subsequent ingestion runs cover the prior 24 hours only.

The bootstrap run will generate more proposals than a normal day (potentially 20–40). These should be batched and presented as a "welcome review" — a one-time artifact that says "Here's what Brain found in your recent email. Review these to seed your knowledge base."

**Additional seeding sources (from OB1 recipes).** OB1's community has built 20+ import recipes that parse and ingest data from ChatGPT exports, Obsidian vaults, Gmail archives, Twitter/X, Instagram, Google Activity (Search, Maps, YouTube, Chrome history), Perplexity, Grok, and Blogger. Each recipe handles parsing, deduplication, embedding, and ingestion into the `thoughts` table.

These recipes write to OB1's flat `thoughts` schema, not Brain's domain tables — but the parsing and deduplication logic transfers. For V2, the highest-value seeding recipes to adapt for Brain would be:
- **Email History Import** (`recipes/email-history-import/`) — pulls Gmail archive into searchable entries. Could seed the tasks domain with historical commitments beyond the 14-day bootstrap window.
- **ChatGPT Import** (`recipes/chatgpt-conversation-import/`) — parses ChatGPT data exports, filters trivial conversations, summarizes via LLM. Could seed reflections with past AI coaching or decision-making conversations.
- **Obsidian Vault Import** (`recipes/obsidian-vault-import/`) — parses markdown notes with full metadata. Relevant if Brandon has an existing notes system.

These are V2 seeding options, not V1 scope. But their existence means Brain's cold start problem has a progressively solvable path beyond the initial email bootstrap.

---

## 9. Review Queue

The review queue is where the user exercises judgment over the system's intelligence. It is the primary mechanism for write-gating and the main way Brain builds trust. If this UX is friction-heavy, the user will auto-approve everything (defeating the purpose) or stop reviewing (defeating the value proposition).

### 9.1 Review Queue as Artifact

The review queue is a **generated markdown file** (`brain-review-queue.md`) that updates whenever new proposals are created. It contains all pending proposals in a scannable format:

```
## Pending Proposals (7 items)

### From Gmail Ingestion (2026-04-05)

1. **New Task (confidence: 0.85)**
   "Follow up with Sarah about Q2 contract renewal"
   Source: Email thread "Re: Q2 Contract" from Sarah Chen, April 4
   → [approve] [reject] [edit]

2. **Task Completion (confidence: 0.72)**
   Mark "Send Henderson report" as complete
   Source: Email "Report attached" sent by you, April 4
   → [approve] [reject]

### From Manual Capture

3. **New Reflection (confidence: 0.91)**
   Subtype: challenge
   "Frustrated that the planning meeting ran over again..."
   → [approve] [reject] [reclassify as task]
```

**Important implementation note:** In V1 with Cowork as the only client, "approve/reject/edit" actions are performed conversationally — the user reads the file and tells the agent "approve items 1 and 3, reject item 2." The MCP tools (`approve_proposal`, `reject_proposal`, `edit_and_approve_proposal`) handle the actual writes. The review queue file is a read surface, not an interactive UI. A future client could make this interactive, but the MCP tools work the same either way.

### 9.2 V2 Path: Interactive Review Queue (OB1 Dashboard Reference)

OB1 includes a full Next.js 16 dashboard (React 19, iron-session auth, Tailwind 4) with CRUD for thoughts, semantic search, duplicate detection, and an audit log. The dashboard's API routes follow a pattern directly applicable to Brain's future interactive review queue:

- `/api/search` — semantic search with threshold + filters
- `/api/thoughts` — list/CRUD operations
- `/api/duplicates` — find and resolve duplicates
- `/api/audit` — audit log queries
- `/api/ingest` — manual ingestion

For V1, the review queue is a conversational + markdown file experience (Section 9.1). For V2, the OB1 dashboard provides a proven starting point for an interactive web UI where approve/reject/edit are buttons, not conversational instructions. The iron-session auth pattern and Supabase client integration transfer directly. The dashboard code is at `dashboards/open-brain-dashboard-next/` in the OB1 repo.

**Not for V1.** Building a web UI would delay shipping by weeks and the value proposition doesn't depend on it. But knowing the dashboard exists and is architecturally compatible means the V2 path is a fork, not a build-from-scratch.

### 9.3 Batch Operations

The user should be able to say "approve all from today's email scan" or "reject everything below 0.7 confidence." The Cowork skill file should support natural-language batch operations that translate to multiple MCP tool calls. This is not a feature of the MCP server — it's a behavior defined in the skill file.

### 9.4 Proposal Expiry

Proposals that sit unreviewed for 7 days are automatically moved to a "stale" status and excluded from the active review queue. They remain in the proposals table (logged, not deleted) but stop cluttering the review surface. The daily briefing notes when proposals have expired: "3 proposals from March 29 were not reviewed and have been archived."

---

## 10. Coaching Mode

Coaching mode is the agent experience for the Reflections domain. It's defined as a **Cowork skill file** — a self-contained document that instructs the agent how to behave when the user activates coaching mode.

### 10.1 What Coaching Mode Does

The coaching agent helps the user process reflections, notice patterns, and connect current experiences to past ones. It does this by reading the user's reflection history and grounding every observation in specific cited entries.

**Core behaviors:**

**Pattern recognition.** When the user logs a reflection, the coaching agent searches for similar past reflections by theme, subtype, or people. If a pattern exists, it surfaces it: "This is the third time in two weeks you've noted frustration with meeting overruns. The previous entries were March 22 (challenge) and March 28 (emotional reaction)."

**Reframing.** When the user logs a negative thought or challenge, the agent can offer a reframe — but must distinguish between the user's stated experience (fact) and the agent's interpretation (inference). "You described this as a failure. Looking at your March 15 reflection, you handled a similar situation and later noted it as a win. That's not a pattern of failure — it might be a pattern of initial self-criticism."

**Theme tracking.** The agent tracks recurring themes across reflections (extracted into the `themes` field). Over time, it can surface: "Your most common reflection themes this month are deadline pressure (5 entries), meeting management (3 entries), and positive feedback from clients (2 entries)."

**Gentle prompting.** If the user hasn't logged a reflection recently, the coaching agent can ask a low-friction opening question: "What's been on your mind this week?" or "Anything you want to capture from today?" This happens only if the user opens coaching mode — never as an interruption.

### 10.2 What Coaching Mode Must Not Do

- Surface task information unless the user explicitly asks for it
- Generate reflections automatically from email or Slack signals
- Provide clinical advice, diagnoses, or therapeutic interventions — it is a structured reflection tool, not a therapist
- Store its own observations as reflections — only the user's inputs become reflection entries
- Present inferences as facts — every pattern observation must cite specific source reflections

### 10.3 Coaching Mode Skill File Structure

The Cowork skill file for coaching mode should include:

**System instructions:** You are operating in Brain's Coaching Mode. Your role is to help the user process personal reflections and notice patterns over time. You have access to the reflections domain only. Every observation you make must cite specific reflections by date and content. When you notice a pattern, present it as an observation for the user to evaluate, not as a conclusion. If the user's input touches task territory ("I need to stop overcommitting"), acknowledge the reflection dimension first, then offer to switch to task mode if they want to capture an action item.

**Tool allowlist:** `search_reflections`, `get_reflection`, `log_reflection`, `list_reflections`, `capture_raw`, `classify_and_store`, `get_raw_capture`, proposal management tools.

**Grounding examples:** 2–3 examples of grounded vs. ungrounded coaching observations, so the model understands the citation standard.

---

## 11. Cowork Skill Files

Brain's agent behavior is defined in three Cowork skill files — one for each mode. These are user-editable markdown documents that instruct the agent. They are the "behavior layer" that sits on top of the MCP server's "permission layer."

### 11.1 Task Mode Skill

**File:** `brain-task-mode.md` (in Cowork skills folder)

**Defines:**
- Agent persona for task-focused work (direct, efficient, action-oriented)
- Instructions to call `set_mode('task')` at activation
- Tool usage patterns: when to search vs. list, when to create vs. update
- How to present task search results with citations
- How to handle ambiguous inputs that might be reflections ("I'm overwhelmed by my to-do list" — acknowledge the feeling, offer coaching mode, but respond in task context first)
- Instructions for daily briefing consumption: when the user opens a session, check for today's briefing and pending proposals

### 11.2 Coaching Mode Skill

**File:** `brain-coaching-mode.md` (in Cowork skills folder)

**Defines:** Everything in Section 10.3 above, plus:
- Agent persona for coaching (warm, curious, grounded, non-judgmental)
- Instructions to call `set_mode('coaching')` at activation
- Pattern recognition workflow: on new reflection, always search for similar past entries
- How to handle mode boundary requests ("Can you check my tasks?" → "I'm in coaching mode right now. Want to switch to task mode?")

### 11.3 Default/Unrestricted Skill

**File:** `brain-default.md` (in Cowork skills folder, loaded as CLAUDE.md or default skill)

**Defines:**
- Default agent behavior when no specific mode is activated
- Instructions that Brain MCP tools are available and what they do
- How to suggest mode switching based on conversational signals
- Daily briefing check at session start
- Pending proposal reminder if items are waiting

---

## 12. Contextual Intelligence Behaviors — V1 Scope

Of the nine contextual intelligence behaviors defined in the brief, V1 targets three as designed capabilities. The rest are either progressive enhancements that may emerge naturally or explicitly deferred.

### 12.1 V1 Designed Capabilities

**Proactive Recall (Behavior 1).** Surfacing a stored fact the user forgot at the moment it's relevant. In V1, this is delivered through the daily briefing (pre-computed) and through in-session retrieval (when the user mentions something and the agent searches Brain for related context). The agent should be instructed to proactively search Brain when the user mentions a person, project, or topic that might have stored context — not just when the user explicitly asks.

**Contextual Surfacing (Behavior 2).** Enriching the current activity with relevant knowledge. In V1, this means the agent calls `search_tasks` or `search_reflections` when a relevant entity is mentioned, and surfaces what it finds without being asked. The skill files should instruct this behavior explicitly: "When the user mentions a person by name, search Brain for that person across your accessible domains and surface any relevant context."

**Contextual Priming (Behavior 3).** Pre-loading relevant context before the user starts working. In V1, this is the daily briefing — generated overnight so context is fresh at session start. The default skill file should instruct the agent to read today's briefing at the start of every session.

### 12.2 May Emerge Naturally

**Gentle Correction (Behavior 4).** If the user says something that contradicts a stored fact ("I talked to Sarah on Monday" but Brain knows it was Tuesday), the agent may correct it naturally if the skill file instructs it to verify claims against stored data. This is not a designed feature — it's an instruction in the skill file: "If the user states a fact that you can verify against Brain's stored data, check it. If there's a discrepancy, note it gently with the source."

### 12.3 Explicitly Deferred

- Contradiction Detection (Behavior 5) — requires graph-augmented storage or more sophisticated retrieval
- Temporal Awareness (Behavior 6) — requires confidence decay and TTL, not in V1 schema
- Gap Detection (Behavior 7) — structurally hard for current models; needs task schemas
- Cross-Domain Bridging (Behavior 8) — requires the bridging permission model, deferred
- Proactive Insights (Behavior 9) — highest false-positive risk, requires evaluation infrastructure

---

## 13. Compensating Complexity Registry

Every piece of scaffolding that exists because of current model limitations should be tagged. This is a living document maintained alongside the codebase.

### 13.1 Policy (Durable — Keeps Even If Models Are Perfect)

- Write-gating on all domain writes (memory write proposals)
- Mode-based tool scoping at the MCP server level
- Provenance links from domain records to raw captures
- Audit logging in the event log
- Classification confidence scores on all derived entries
- User ability to reclassify, edit, or reject any AI-generated entry

### 13.2 Workaround (Temporary — Delete When Models Improve)

- Classification signal heuristics (action language → task, emotional language → reflection) — a better model may classify accurately from context alone without keyword matching
- Confidence threshold for ingestion proposals (0.5 cutoff) — may become unnecessary with better model calibration
- Proposal cap per ingestion run (10/day) — may become unnecessary if proposal quality improves
- Explicit mode-switching instructions in skill files — a better model may infer the appropriate mode from conversational context
- Deduplication heuristics in the ingestion prompt — may be handled by the model's native reasoning

### 13.3 Operating Discipline

When a new model ships (especially a step-change like Mythos):
1. Run each workaround as a deletion test: remove it, run the same inputs, measure whether outcomes degrade
2. If no degradation: delete the workaround and simplify
3. If degradation: keep it and note the specific failure mode
4. Log every deletion test result in the event log for future reference

---

## 14. What V1 Does NOT Include

Being explicit about what's out prevents scope creep during implementation.

- **Voice input.** Text only for V1. Architecture doesn't preclude voice, but no speech-to-text pipeline.
- **Calendar integration.** Gmail only for V1. Calendar adds event-based task signals but doubles the ingestion complexity.
- **Slack integration.** Same reasoning as Calendar. V2.
- **Goals domain.** Coaching mode references goals conceptually but there is no goals table. Goals are captured as reflections with a "goal" tag in metadata.
- **Relationships domain.** People are extracted as fields on tasks and reflections, not as standalone entities.
- **Decisions, Memory, Learning domains.** Deferred per Decision 003.
- **Multi-step retrieval.** V1 uses single-shot semantic search + metadata filtering. Agentic evidence-seeking loops (search → read → refine → synthesize) are V2.
- **Temporal decay / TTL.** Reflections and tasks don't expire. Confidence scores are set at creation, not adjusted over time.
- **Contradiction detection.** No cross-record conflict checking.
- **Cross-domain bridging.** No designed mechanism for connecting tasks to reflections. This may happen naturally in unrestricted mode but is not a designed behavior.
- **Weekly review artifact.** The daily briefing ships first. Weekly review synthesis is a V2 proactive artifact.
- **Custom proactive triggers.** The user cannot set "always remind me when X is mentioned." The agent's proactive behavior is defined in skill files, not user-configurable triggers.
- **Data export.** The user owns all data in Supabase and can query it directly. A formatted export tool is V2.
- **Anomaly detection, safe mode, security hardening.** Simplified per Decision 004 (personal tool).

---

## 15. Implementation Sequence

This is a recommended build order, not a committed timeline. The sequence is higher-confidence than any day estimates would be.

### Phase 1 — Storage and Core Tools

Set up the Supabase instance. Create all five tables (raw_captures, tasks, reflections, memory_write_proposals, event_log). Deploy the MCP server with the capture tools (`capture_raw`, `classify_and_store`) and the proposal management tools (`list_proposals`, `approve_proposal`, `reject_proposal`, `edit_and_approve_proposal`). Verify end-to-end: manual text capture → raw storage → classification proposal → approval → domain entry.

**Done when:** You can capture text in Cowork, see it classified, approve the proposal, and retrieve it with provenance.

### Phase 2 — Domain Tools and Mode Scoping

Add the task-specific and reflection-specific tools (`search_tasks`, `search_reflections`, `get_task`, `get_reflection`, etc.). Implement mode-based tool scoping at the MCP server level. Create the three Cowork skill files (task mode, coaching mode, default). Verify: switching to coaching mode restricts tool access; task queries in coaching mode are blocked by the server.

**Done when:** Mode switching works, tool scoping is enforced server-side, and both domains are searchable with citations.

### Phase 3 — Gmail Ingestion and Daily Briefing

Build the ingestion scheduled task: Gmail fetch → signal analysis → deduplication against existing tasks → proposal generation. Build the daily briefing generator. Run the cold-start bootstrap (14-day email backfill). Verify: the daily briefing surfaces real task signals from email, proposals appear in the review queue, and approving them creates domain entries with email provenance.

**Done when:** You wake up, read a briefing that found something useful in yesterday's email, review the proposals, and your task list is better for it.

### Phase 4 — Coaching Mode and Reflection Patterns

Build the coaching mode skill file with grounding requirements. Test pattern recognition: log several reflections with overlapping themes, verify the agent surfaces the pattern with citations. Test mode boundary enforcement: verify coaching mode cannot access tasks.

**Done when:** Coaching mode provides grounded, cited observations about reflection patterns, and domain boundaries are clean.

### Phase 5 — Polish and Competitive Bar Test

Run daily for two weeks. Evaluate against the three competitive bar dimensions (Section 3). Identify friction points: where does classification fail? Where does the review queue create drag? Where does the briefing miss something important? Iterate on skill files and ingestion prompts based on real usage.

**Done when:** Brain demonstrably beats the baseline stack on at least 2 of 3 competitive bar dimensions in daily use.

---

## 16. Open Questions for Implementation

These are questions that should be resolved during Phase 1–2, not before coding starts. They are implementation details, not design decisions.

- **Embedding model choice.** `text-embedding-3-small` is recommended for cost. If recall quality is noticeably poor, upgrade to `text-embedding-3-large` and re-embed all records.
- **~~Supabase Edge Functions vs. external MCP server.~~** **Resolved: Edge Functions.** OB1 runs all 50+ MCP tools as Supabase Edge Functions (Deno). The pattern is proven: each extension is a single `index.ts` entry point that creates a Hono app with an MCP server, deployed via `supabase functions deploy`. No Docker, no external hosting, no separate server to maintain. Brain uses the same pattern. If Brain later needs capabilities that Edge Functions can't support (long-running tasks, websockets), a separate server can be added alongside — but the core MCP tools stay in Edge Functions. See Section 4.4 for the full stack.
- **Scheduled task timing.** 7:00 AM is recommended but depends on Brandon's actual routine. The ingestion needs to run before the first session of the day.
- **Cowork skill file deployment.** How skill files are loaded and switched in Cowork may depend on Cowork's current capabilities. Test this early in Phase 1.
- **Auto-approval threshold.** Should high-confidence (>0.95) manual captures with explicit domain prefixes ("task: do X") skip the review queue? Recommended: yes, but log them as auto-approved in the event log.

---

## 17. Related Documents

| Document | What It Contains |
|---|---|
| `brain-brief.md` | Full product vision, all 7 domains, all 9 contextual intelligence behaviors, architecture rationale |
| `brain-decision-log.md` | All strategic decisions with reasoning and alternatives |
| `brain-contextual-intelligence.md` | Detailed framework for the 9 contextual intelligence behaviors |
| `research/brain-research.md` | Evidence base: Mythos analysis, Cowork architecture, contextual intelligence survey, MCP server decision |
| `research/cowork-features.md` | Technical breakdown of Cowork's three backend systems |
| `research/OneBrainDocs/` | OB1 documentation and setup guides |
