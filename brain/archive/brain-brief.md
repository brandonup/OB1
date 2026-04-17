# Brain — Product Brief

**Status:** Draft
**Last Updated:** 2026-04-04

---

## Product Vision

Brain is a private, AI-powered personal operating system that lets a single user quickly capture information — eventually by voice, initially by text — store it as durable raw artifacts, and interact with a single intelligent agent that adapts its behavior and access scope depending on what the user needs — without causing context bleed across information domains.

**Note on "voice-first":** The long-term vision is voice-first capture, but V1 scope explicitly excludes voice input to reduce initial complexity. The architecture should not preclude voice, but the V1 capture experience is text-based. This tension is intentional — voice is the aspiration, text is the pragmatic starting point.

It captures what's happening across your work and life, makes that knowledge retrievable through evidence-seeking retrieval, and — over time — aims to surface relevant context before the user asks for it. The goal: eliminate the friction of forgetting and reduce time spent searching, context-switching, or re-creating information you've already encountered.

This is not just a place to store notes. It is a structured personal memory and action system designed to:

- Reduce capture friction
- Preserve clean boundaries between different kinds of information
- Support retrieval and action later
- Continuously improve the system using signals from tools like email, calendar, and Slack
- Get simpler — not more complex — as AI models improve

The product is designed for **one user only**, with no multi-user sharing or collaboration requirements in scope.

---

## Design Principles

These guide every product and technical decision. Never violate them.

### 1. Low Friction Capture
If capturing is hard, the system fails. If it requires more than 2 steps, it won't be used.

### 2. No Context Bleed
Different information domains must not leak into one another unless explicitly intended.

Examples:
- Therapist-style reflections should not show up in the task list
- Stored documents should not become tasks unless explicitly extracted
- Tasks should not clutter the coaching interface unless purposely included
- Relationship context should not appear in unrelated interfaces without reason

This is enforced at the **tool and retrieval permission** level: the agent's access scope changes depending on the active mode, not through separate agents or separate codebases.

**[UNDECIDED] Tension with Cross-Domain Bridging.** This principle and Contextual Intelligence Behavior #8 (Cross-Domain Bridging) are in direct tension. No-context-bleed says domains stay separated. Cross-domain bridging says the highest-value intelligence comes from connecting information *across* domains the user hasn't explicitly linked (e.g., "your reflection about feeling overwhelmed maps to the 4 tasks you added with the same deadline"). Both are correct impulses pointed in opposite directions. If Brain can't bridge domains, it's seven separate databases with a chat interface. If it can, context bleed becomes a design feature, not a bug. The resolution likely requires an explicit **bridging permission model** — the agent can *read* across domains for synthesis when certain conditions are met (user-initiated query, high-confidence connection, clear provenance), but never *surfaces* cross-domain information unprompted without user opt-in. This model needs to be designed before V1, not deferred to V2 when bridging ships, because the domain scoping architecture must accommodate it from the start.

### 3. Honest Recall
Never surface a guess as a fact. Show uncertainty. If Brain doesn't know, it says so. Every answer must include source attribution. Every inference must be labeled as inference, distinct from observed facts.

### 4. Read-Default, Write-Gated
The agent can freely read, retrieve, and synthesize across any domain it has access to in the current mode. But any action that **changes state** — creating a task, sending a message, scheduling an event, persisting a new memory, triggering a downstream automation — requires explicit, scoped user authorization.

The system should suggest task completion, merges, new entities, goal-task links, and updates based on email/calendar/Slack activity. Direct automatic action should happen only when:
- The rule is explicit
- Confidence is high
- The action is low risk
- The scope is narrow (single domain, single record)

Over-automation will reduce trust quickly. The risk boundary is **reads vs. writes**, and this principle applies to all integrations.

### 5. User Owns Everything
Full data portability and privacy are non-negotiable. No training on user data. The user can export, edit, delete, or contest any record — including AI-generated inferences stored as memories.

### 6. Augment, Don't Replace
Brain makes existing tools smarter — it is not a task manager, calendar, or project manager replacement.

**Tension to acknowledge:** This principle creates a design challenge. Brain has a task domain with capture, status tracking, and completion detection — which looks a lot like a task manager. The coaching mode provides structured reflection and goal tracking — which looks like a coaching app. The intended distinction is that Brain is the *memory and intelligence layer* behind these activities, not the primary interface for executing them. Whether this distinction holds in practice — or whether users naturally treat Brain as their task manager anyway — is an open question that will be tested in V1.

**[UNDECIDED] Expert review flagged this tension as potentially a design flaw, not just an open question.** If Brain captures tasks but isn't where you manage them, you now have two systems — Brain and your actual task manager — that need to stay in sync. That synchronization cost is the opposite of "augment." Either Brain becomes the task manager (violating this principle) or it becomes a secondary record that drifts from reality (violating the value proposition). The clean middle ground may not exist. Three possible resolutions: **(a)** accept that Brain *is* the task manager for a single user and drop the "augment, don't replace" framing for the task domain specifically, **(b)** integrate with an existing task manager (Todoist, Linear, etc.) as the source of truth and treat Brain's task domain as a read-mostly mirror enriched with context, or **(c)** scope V1 tasks to capture and recall only — no status tracking or completion detection — so Brain stays clearly in "memory layer" territory. Each option has tradeoffs that need to be evaluated against actual usage.

### 7. Get Simpler as Models Improve
The architecture should be designed so that model upgrades are **deletion events**, not complexity accumulation. Prompt scaffolding, retrieval heuristics, classification rules, and verification steps that exist only to compensate for current model limitations should be tagged as temporary workarounds and removed when no longer needed.

---

## Information Domains

Brain organizes all personal information into 7 structured domains, each with its own schema, retrieval rules, and interface boundaries. These domain tables are **derived views** on top of raw captured artifacts — not the sole representation of stored data.

**Assumption:** The choice of 7 domains and their boundaries is a design hypothesis based on one user's mental model, not validated through user research. The domain structure may need to change — some domains may merge (e.g., Memory and Learning), others may split, and edge cases (e.g., "is this a decision or a reflection?") will surface in practice. The raw capture log ensures this is recoverable: if the domain structure changes, entries can be reclassified without data loss.

**[UNDECIDED] Domain count and V1 validation strategy.** Expert review flagged that seven domains creates a classification burden that the raw capture log only technically mitigates — not experientially. If a capture lands in the wrong domain, and the active mode's context bleed rules prevent the agent from seeing it, the data is *functionally* lost even though it's *technically* recoverable. The recovery path (notice the misclassification → switch modes → reclassify manually) violates the low-friction principle. Two options under consideration: **(a)** ship all 7 domains in V1 and measure misclassification rates empirically, accepting the UX risk, or **(b)** prove the capture → recall → cite loop on a single domain first (likely Tasks, which has the clearest external signals from email/calendar/Slack) before expanding to additional domains. Option (b) also addresses the cold start problem — a single-domain system accumulates useful density faster than a seven-domain system where each domain is sparse.

### 1. Tasks
To-dos, follow-ups, reminders, appointments, action items.

### 2. Memory
Documents, records, reference information, important things to remember that are not tasks (e.g., health insurance docs, personal records).

### 3. Personal Reflections
Emotional logs, internal thoughts, feedback received, wins, struggles, self-observations, recurring patterns.

Reflection subtypes: challenge, win, gratitude, feedback, negative thought, emotional reaction, insight.

This domain includes both difficult and positive moments — "wins" are not a separate category.

### 4. Goals
Personal goals, professional goals, behavior changes, long-term outcomes. Goals inform the coaching interface and help align advice to what the user is trying to accomplish.

### 5. Relationships
Information about people — important relationship context, recurring names, interactions, relevant personal/professional details. Helps the system recognize people across domains and maintain continuity.

**Special consideration:** Relationship data is especially vulnerable to inference errors. All AI-generated relationship entries (e.g., "Bob is your manager") must be surfaced as proposals and confirmed by the user before being persisted.

### 6. Learning / Resources
Articles, books, frameworks, ideas, knowledge worth revisiting, useful information for professional or personal growth.

### 7. Decisions
Important choices, decision rationale, tradeoffs, context, outcomes. Creates a record of how and why decisions were made — useful for self-reflection and improving judgment.

---

## Contextual Intelligence — Brain's Core Differentiator

All of Brain's "smart" behaviors are expressions of a single underlying capability: **contextual intelligence** — the system uses what it already knows to make the user's current action better, without being asked. What varies across the nine expressions is timing, tone, and what gets surfaced.

These nine behaviors define what Brain must eventually support. They are ordered roughly from most tractable (well-understood, production-proven patterns exist) to most experimental (open research problems, high false-positive risk).

**1. Proactive Recall** — Surfacing a stored fact the user forgot they had, at the moment it's relevant. The fact already exists; the system recognizes its relevance to the current action. *Example: You're writing an email about the widget project and list 3 items. Brain surfaces a 4th item from yesterday's email scan.*

**2. Contextual Surfacing** — Enriching the user's current activity with relevant knowledge, triggered by what they're doing. *Example: You mention "Sarah" — Brain surfaces her role, your last interaction, and open items without you asking "Who is Sarah?"*

**3. Contextual Priming** — Pre-loading relevant context before the user begins a task. The daily email/Slack scan is the primary example: context is fresh when you sit down. *Production-proven pattern: Cursor's codebase indexing, Claude Projects' pre-loaded knowledge bases.*

**4. Gentle Correction** — Noticing the user missed something or made a minor error and volunteering the correction without being pushy. *Example: You say "as discussed in our Monday meeting" — Brain notes the calendar shows it was Tuesday.* Best delivered inside workflows (drafting, reviewing) rather than as ambient interruptions.

**5. Contradiction Detection** — Noticing when two stored facts conflict and flagging the inconsistency. *Example: "You recorded a decision to go with Vendor A on March 15, but yesterday's email discusses onboarding Vendor B."* Requires strong entity resolution, provenance, and a decision rule for what to do next. Production implementations are rare outside code (GitHub Copilot Memory's branch-aware validation is the clearest example).

**6. Temporal Awareness** — Understanding that facts have a shelf life and adjusting confidence accordingly. Without this, proactive recall surfaces stale context with false confidence. *Best production pattern: explicit TTL + revalidation (Copilot's 28-day expiry with citation-based re-validation), not vague recency bias.*

**7. Gap Detection** — Recognizing that something *absent* from the user's request should be there. *Example: You're preparing for a client call and list talking points — Brain notices you didn't mention last week's pricing change.* Research (AbsenceBench) shows this is structurally hard for transformers — absences have no "keys" to attend to. Likely requires task schemas, checklists, and external validators.

**8. Cross-Domain Bridging** — Connecting information across domains the user hasn't explicitly linked. Highest-value and most sensitive form — it intentionally crosses the domain boundaries Brain otherwise enforces. *Example: "Your reflection about feeling overwhelmed maps to the 4 tasks you added with the same deadline."* Should only fire when the connection is genuinely useful and clearly cited.

**9. Proactive Insights** — Synthesizing across multiple stored facts to surface a pattern the user hasn't noticed. Goes beyond single-fact recall to generate new observations. *Example: "You've added 4 tasks with Friday deadlines, but your calendar shows back-to-back meetings Thursday and Friday."* Highest false-positive risk. Best supported by graph-structured indexing and multi-stage summarization (Microsoft GraphRAG pattern), not per-query snippet retrieval.

### Design Implications

All nine behaviors depend on the same foundation: a queryable knowledge substrate, structured retrieval tools, provenance on every record, and a model that can reason about what's relevant. The investment isn't in building nine separate features — it's in building the substrate well enough that these behaviors emerge reliably from the agent's reasoning over good tools.

**V1 targets behaviors 1–3** (proactive recall, contextual surfacing, contextual priming) as designed capabilities, with behaviors 4–6 (gentle correction, contradiction detection, temporal awareness) as progressive enhancements. **Behaviors 7–9 are V2+** and should be gated behind explicit user controls and strong evaluation.

See `brain-contextual-intelligence.md` for the standalone framework with detailed examples.

---

## Primary Use Cases

### Task Capture and Management
The user says or types things like "I need to do this," "Set up an appointment," "Follow up with Bob next week." The system stores the raw input, classifies the item as a task, shows it on a task list, optionally attaches dates/people/context, and later detects signals from email, calendar, or Slack suggesting the task may be complete — recommending completion for user confirmation. Task extraction should remain **confirm-before-commit**: the system proposes, the user approves.

### Memory & Reference Storage
The user stores useful information that may be needed later — personal records, documents, reference info, important notes that are not actionable tasks. The system accepts quick notes and uploads, stores them in a structured and retrievable way, and keeps them separate from tasks and reflections.

### Personal Reflection / Coaching
The user logs negative thoughts, emotional reactions, personal wins, feedback, recurring struggles, and self-observations. The coaching mode accesses those reflections over time, notices patterns, provides advice with continuity, and uses the user's goals as context for guidance.

**Grounding requirement:** Every coaching insight must be grounded in specific cited source memories and clearly labeled as inference. The coaching mode should surface *what drove* a reflection or recommendation, and the user must be able to contest it. As model reasoning improves, this mode can evolve toward deeper cross-document analysis — "What beliefs have changed?", "What open loops recur?", "What decisions are pending evidence?" — but only with full provenance.

---

## Core Capabilities

### 1. Capture & Store Context

**What it must do:**
- Ingest inputs from multiple sources: typed notes, uploaded documents, conversation transcripts, URLs, emails, and connected app data
- **Store all raw inputs as immutable artifacts** in an append-only capture log — timestamped, source-attributed, and reprocessable
- Derive classified domain entries (tasks, memories, reflections, etc.) from raw artifacts — these are views, not the source of truth
- Support both structured inputs (forms, templates) and unstructured inputs (free-form text, brain dumps)
- Extract and store key entities automatically: people, projects, decisions, deadlines, commitments
- Deduplicate information across sources — same fact from two places should resolve to one memory
- Version memories when they change (e.g., a decision that gets updated)
- Support manual tagging, but not require it — auto-tagging should handle the default case
- **Regenerate derived views** (summaries, embeddings, entity extraction, classifications) as models improve, without losing the original input

**Non-negotiables:**
- Capture must be low-friction (2 steps max)
- Everything stored must be attributable to a source and timestamp
- Raw artifacts are never deleted by the system — only by the user

### 2. Recall & Surface Memories

**What it must do:**
- Answer natural language questions against stored knowledge ("What did I decide about X?", "Who is Sarah?", "What's the status of the Acme project?")
- Return answers with source attribution — Brain should always show where it got its answer
- Handle fuzzy/partial queries — user shouldn't need exact phrasing to get a result
- Differentiate between high-confidence and low-confidence recalls; surface uncertainty honestly
- **Support multi-step, evidence-seeking retrieval** — the agent can search, read, refine its query, fetch counterevidence, and synthesize, rather than returning only a single-shot top-k result
- Allow the user to correct or invalidate a memory ("That's wrong, here's what actually happened")

**Non-negotiables:**
- **Minimize hallucination.** No current model can guarantee zero hallucination. The design goal is that Brain should abstain rather than guess — saying "I don't have information on that" rather than fabricating an answer. Citation requirements and provenance tracking are the primary enforcement mechanisms, not model reliability alone.
- Recall must feel fast — latency targets are discussed in Non-Functional Requirements but the right thresholds need to be validated through actual use.
- Every answer must cite specific source artifacts.
- Cross-domain retrieval (when the user's question spans domains) is permitted but governed by the active mode's access scope.

### 3. Proactive Insights & Contextual Surfacing

**What it must do:**
- Surface relevant memories before the user asks, based on current context (e.g., if they mention a person's name, Brain surfaces what it knows about that person)
- When chatting about a project, automatically recall and surface related facts from connected tools that the user may have forgotten
- Detect patterns over time: recurring topics, unresolved action items, upcoming deadlines
- Send nudges for stale commitments ("You said you'd follow up with Alex by last week")
- Identify contradictions in stored knowledge and flag them for the user to resolve
- Allow the user to set explicit triggers for proactive alerts (e.g., "always remind me when X is mentioned")

**Non-negotiables:**
- Proactive surfacing must be opt-in or easily dismissible — it should not feel intrusive
- Every nudge must be traceable to a specific memory with a clear reason it was triggered
- Proactive features should ship as **bounded, reviewable experiences** (e.g., weekly review draft, open loops list) rather than fully autonomous behavior

---

## Capture Experience

### Main UX Goal: Extremely Low Friction

The capture flow should feel very fast:
1. Open the app
2. Hit record (or start typing)
3. Say or type something
4. Have it classified and saved

Optimize for: minimal taps, voice-first input, optional typing, fast confirmation when needed, low interruption to the user's day.

### Capture Modes

**Explicit Capture Mode:** The user starts with a category keyword (task, memory, reflection, goal, relationship, etc.). This increases classification accuracy and gives the user more control.

**Implicit Capture Mode:** If the user doesn't specify a category, the system classifies automatically using signals:
- Action language → task
- Emotional language → reflection
- Person-centric language → relationship
- Future-outcome language → goal
- Reference/document language → memory
- Resource/knowledge language → learning
- Reasoning/choice language → decision

**Assumption:** These classification heuristics are intuitive but untested. Real user input will frequently blend categories ("I decided to follow up with Sarah about the project by Friday" touches tasks, decisions, relationships, and potentially goals). Classification accuracy and the right handling of ambiguous inputs need to be validated empirically. The raw capture log mitigates the risk — misclassification is correctable, not destructive.

### Save Flow
1. Capture voice or text input
2. **Store the raw input immediately** (append-only capture log)
3. Classify automatically and generate derived domain entry
4. Show the category and extracted metadata
5. Allow a quick correction if wrong
6. Save the domain entry

This gives speed without fully trusting automation, and preserves the raw input regardless of classification accuracy.

---

## External Tool Integrations

### V1 Target Integrations

Focus V1 on **depth over breadth** — fewer integrations done well, with proper audit trails and provenance, will teach more than many integrations done shallowly.

| Tool | What Brain Pulls | What Brain Can Write Back |
|------|-----------------|--------------------------|
| Gmail | Emails, threads, attachments | Draft emails (with user confirmation) |
| Google Calendar | Events, attendees, agendas | Create events (with user confirmation) |
| Slack | Messages, threads, DMs | Send messages, draft replies (with user confirmation) |

Google Drive integration can be added after the core capture → store → retrieve → cite loop is proven.

### V2 Planned Integrations

| Tool | What Brain Pulls | Constraints |
|------|-----------------|-------------|
| Google Drive | Documents, files, shared content | Standard OAuth; add after core loop is proven |
| iMessage | Message text, timestamps, sender/recipient, group chat metadata | **macOS only.** No Apple API exists — requires direct read of the local SQLite database (`~/Library/Messages/chat.db`) with Full Disk Access permission. Read-only (no sending). Schema is undocumented and may break on macOS updates. Runs as a local daemon on the user's Mac, not from a server. Cannot work on iOS. |

iMessage capture is a power-user feature that provides high-value personal context (relationship signals, commitments, decisions made over text) but carries maintenance cost due to Apple's unsupported schema. Ingestion follows the same pattern as other integrations: a local scheduled script reads new messages since the last checkpoint, writes each as a raw capture with `source: imessage` metadata, and the system derives domain entries via the standard proposal workflow.

### Integration Requirements

- All integrations must use OAuth — no storing raw credentials
- Each integration should have a configurable sync frequency (real-time, hourly, daily)
- User must be able to selectively include/exclude sources per integration (e.g., "sync Slack but only the #projects channel")
- Brain must surface which integration a memory came from
- Integrations must degrade gracefully — if one source is unavailable, others continue working
- **All write-back actions require explicit user confirmation** — no silent writes to external systems
- **All integration activity is logged** in the event log for auditability

### Ingestion Workflow

Beyond manual capture, Brain passively scans connected tools and updates the internal system.

**Email:** Detect task completions, appointment confirmations, useful updates to tasks/memory/relationships. Example: a confirmation email implies an appointment was scheduled — the system recommends marking a related task complete.

**Calendar:** Detect completed appointments, scheduled commitments, task completion confirmations, link captured items to real events.

**Slack:** Identify new tasks, detect completed work, surface relationship context, infer updates to memory or decisions.

**Scan cadence:** Daily scan of the prior 24 hours via a recurring ingestion workflow that reads recent activity, classifies candidate updates, maps them to domain tables, and either makes safe low-risk updates (reads only) or presents recommendations for approval (any writes).

---

## Data Model

### Architecture: Four Layers

The data model is organized into four conceptual layers that separate durable assets from model-dependent logic.

#### Layer 1: Raw Capture Log (durable, model-independent)
An **append-only, immutable event log** of every input — voice transcripts, typed notes, uploaded documents, integration sync events, and AI-generated write proposals. Every entry is timestamped, source-attributed, and preserved regardless of how the system later classifies or summarizes it.

This is the long-lived asset. It does not depend on any single model's classification or summarization quality. As models improve, derived artifacts can be regenerated from this layer.

Key tables:
- `raw_captures` — every user input, with source, timestamp, and content
- `event_log` — every system action: ingestion syncs, classification decisions, memory write proposals, user confirmations, deletions

#### Layer 2: Domain Tables (derived, structured)
Separate tables for each domain, derived from raw captures and enriched by AI processing:

- `tasks`
- `memory_items`
- `reflections`
- `goals`
- `relationships`
- `learning_resources`
- `decisions`

Why separate tables:
- Reduces accidental cross-domain mixing
- Makes querying cleaner
- Allows domain-specific schemas
- Supports clearer boundaries between modes
- Better matches the no-context-bleed principle

Every domain record links back to the raw capture(s) that generated it. Labels or subtypes can exist within each table, but labels are not the primary separation mechanism.

#### Layer 3: Indexes & Retrieval Tools (modular, policy-governed)
Search primitives exposed as tools: full-text search, semantic search, filtered metadata queries. Business rules live here: permission checks per mode, freshness constraints, and audit logs.

Retrieval intelligence (query rewriting, routing heuristics) should be minimal and tagged as **workaround** in the compensating complexity registry. As models improve at directing their own retrieval, these heuristics should be removable.

#### Layer 4: Trust & Controls (durable, gets stricter as models improve)
Permission prompts, tool scoping, risk-based action gating, and user review flows. This layer does not get simpler over time — it gets more important as model capabilities increase.

### Memory Write Proposals

All AI-generated writes to domain tables — not just dedup merges, but new entries, entity extractions, relationship inferences, goal links — follow a proposal workflow:

1. The agent generates a proposed write with provenance (source artifacts), confidence level, and a flag distinguishing **observed fact** from **inference**
2. The proposal is shown to the user
3. The user confirms, edits, or rejects
4. Only confirmed proposals are persisted to domain tables
5. All proposals (accepted and rejected) are logged in the event log

This applies especially to the Relationships domain, where inference errors can corrupt downstream coaching and surfacing.

### Goals: Structured Table, Not Markdown

Goals should live in a **structured table**, not only in a markdown file. The coaching mode needs to reference them dynamically, goals need fields like status/category/priority/time horizon, and they may link to tasks, reflections, or decisions. A markdown summary can exist for readability, but the source of truth should be structured.

### Supporting Tables

- `memory_write_proposals` — pending, accepted, and rejected AI-generated writes
- `ingestion_events` — integration sync history
- `duplicate_candidates` — dedup proposals
- `entity_links` — cross-domain references
- `source_references` — provenance links from domain records to raw captures

---

## Architecture Decision: Brain as MCP Server

Brain should be built as an **MCP (Model Context Protocol) server** that exposes the knowledge substrate as tools. The interface layer — Cowork, Claude Code, a Slack bot, a custom web app, or any other MCP-compatible client — becomes interchangeable.

### What the MCP Server Exposes

Tools like `search_memories`, `get_tasks`, `write_proposal`, `log_reflection`, `get_person`, `search_decisions`. Any client that can call MCP tools gets access to the same knowledge substrate with the same permission enforcement.

### Why This Architecture

The four-layer data model maps cleanly onto this: **Layers 1 and 2** (raw capture log, domain tables) and **Layer 4** (trust and controls) live inside the MCP server. **Layer 3** (the agent) is whatever client the user is talking to. This means:

- **No frontend to build for V1.** Cowork already provides a conversational interface, file access, tool execution, and MCP connections. Brain-as-MCP means Cowork IS the agent layer for V1.
- **Model upgrades flow through automatically.** When the underlying model improves, every client benefits without retuning an agent layer.
- **Future portability.** The same MCP server works with Cowork today, Claude Code tomorrow, a custom React app later, or a Slack bot for quick capture.
- **Multi-client access.** The user can interact with their Brain from any MCP-compatible tool — not just one dedicated app.

### Multi-MCP Orchestration

Brain's MCP server doesn't operate in isolation — it sits alongside other MCP servers (Gmail, Calendar, Slack, Google Drive, etc.) that the agent can call in the same session. This has three architectural implications:

**Ingestion as orchestration, not pipeline.** The daily scan doesn't need to be a monolithic script. It can be a lightweight scheduled task where the agent calls Gmail MCP → reads emails → calls Brain MCP → searches for related existing context → reasons about what's new → calls Brain MCP's write-proposal tool → proposes updates. The intelligence lives in the agent's reasoning across multiple MCP calls, not in a custom ingestion pipeline.

**Query-time enrichment across sources.** When the user asks "what's the latest on the Acme project?", the agent can call Brain's `search_tasks` and `search_memories` for stored context AND call Gmail MCP for recent emails AND call Slack MCP for recent messages — all in one response. Multi-step retrieval should explicitly include cross-MCP retrieval, not just cross-domain retrieval within Brain's own tables.

**Brain stores derived intelligence, not raw duplicates.** If the agent can query Gmail directly at any time, Brain doesn't need to ingest and duplicate every email. Brain stores the extracted tasks, relationship signals, and decision context while the raw data stays in the source system. This reduces storage complexity and avoids the stale-copy problem.

**Latency constraint:** Multi-MCP orchestration at query time means latency can stack. Brain should distinguish between **fast queries** (single-domain, Brain MCP only, sub-3-second target) and **deep queries** (multi-MCP, cross-source synthesis, user expects to wait). The UX should signal which type is running.

See `research/cowork-features.md` Pattern 6 for the detailed analysis.

### Critical Constraint

If Brain is callable from multiple interfaces, the **MCP server itself must enforce permissions and write-gating.** Authorization cannot live in the client's system prompt — it must live in Layer 4 (trust and controls) on the server side. This is already the right instinct from the data model design, but it becomes non-negotiable in a multi-client world.

### Risks of This Architecture Bet

**MCP protocol maturity.** MCP is still evolving — the spec, client support, and authentication model are all in active development. Betting Brain's architecture on MCP means accepting some coupling to a protocol that may change. Mitigation: Brain's MCP tools are thin wrappers around standard Postgres queries. If MCP evolves or a better protocol emerges, the tool interface can be rewritten without touching the data layer.

**Cowork as V1 agent layer.** Using Cowork as the V1 interface means Brain's initial user experience depends on Anthropic's product roadmap and Cowork's capabilities/limitations. If Cowork changes how it handles MCP connections, scheduled tasks, or auto-memory, Brain is affected. Mitigation: Brain's value lives in the MCP server, not the client. Cowork is the V1 convenience choice, not a permanent dependency. Claude Code, a custom web app, or any MCP client can replace it.

**[RISK — ELEVATED] Cowork dependency is deeper than the mitigation suggests.** The mitigation ("Brain's value lives in the MCP server, not the client") only holds if there's a usable client available. Cowork is in research preview — it could change scheduled task behavior, restructure MCP handling, or sunset entirely. Brain's daily briefing, ingestion workflows, and the entire conversational interface all run through Cowork. If Cowork breaks or changes, Brain needs a new client layer from scratch — which means building the frontend this architecture was designed to avoid. For a single-user personal tool this risk is manageable (the builder can adapt). But if Brain has any commercial ambition, this dependency is a hard constraint on shipping a consistent experience. **Recommended mitigation:** identify the minimum viable fallback client (likely Claude Code + a simple CLI capture script) and validate that Brain's MCP server works cleanly through it before V1 ships. Don't discover the Cowork dependency is load-bearing after launch.

---

## Reference Architecture: Lessons from Cowork

Cowork (Anthropic's desktop AI tool) serves as Brain's reference architecture because it already achieves a primitive version of proactive recall through three independent systems. Understanding how it works — and where it breaks — directly informed Brain's design.

### How Cowork Achieves Proactive Recall Today

Cowork does not have a "proactive recall" feature. The behavior emerges from three systems:

**System 1: Auto-Memory.** Writes markdown files to an `.auto-memory/` folder. An index file (`MEMORY.md`, first 200 lines) loads automatically at session start. Topic-specific files are read on-demand via pointers in the index. No database, no embeddings, no vector search — just flat files and the model's judgment about when to read them.

**System 2: Scheduled Tasks.** Self-contained prompts that fire on a cron schedule, spawning completely fresh sessions with no inherited state. A typical daily task calls Gmail/Slack/Calendar via MCP, processes results, writes updated markdown files to the workspace, then the session ends.

**System 3: Context Assembly.** When the user makes a request, the model assembles context from auto-memory pointers, workspace files, and MCP tools. The "reminding" behavior happens here — the model notices something in a scheduled task's output that the user didn't mention.

The full chain: `Scheduled Task → writes files → session ends → Auto-Memory → MEMORY.md points to files → next session → Model reads pointer → reads file → notices relevant fact → surfaces it.`

### Where Cowork Breaks Down

- No semantic search over memories or workspace files — retrieval depends on pointer chains and filename guessing
- No relevance scoring — the model picks files based on names and its own judgment
- No domain scoping — the model can read anything in the workspace
- No provenance — when surfacing context, it doesn't cite which email or sync event produced it
- No review step for scheduled task outputs — if the task misinterprets an email, the wrong summary is consumed silently
- Output is unstructured markdown with no schema, confidence levels, or fact-vs-inference distinction

### What Brain Takes from Cowork

The core patterns are right: durable persistence, periodic enrichment, and intent-aware context assembly. Brain upgrades every layer:

| Cowork | Brain |
|---|---|
| Flat markdown files, 200-line index, no search | Structured domain tables exposed as MCP tools with search, filtering, and provenance |
| Isolated sessions writing unstructured markdown, no review | Scheduled ingestion writing to structured tables via memory write proposals, with user review and event logging |
| Model follows memory pointers or guesses by filename | Agent calls structured retrieval tools with scoped access per mode |
| Emergent proactive recall from pointer chains | Designed proactive recall from structured, queryable knowledge substrate |

The model's job shifts from "figure out where to look" to "ask the right question" — which is what models are good at.

See `research/cowork-features.md` for the full technical breakdown.

---

## Interface / Agent Model

Brain uses a **single primary agent** that operates in different **modes**, each with its own retrieval scope and tool permissions. This is simpler, more maintainable, and more likely to benefit from model upgrades than separate specialized agents.

### Task Mode
**Can access:** Tasks, calendar signals, email signals, Slack signals.
**Can write:** Task creation, status updates (all with user confirmation).
**Cannot access:** Reflections, coaching history, unless the user explicitly asks.

### Memory Mode
**Can access:** Memory items, documents, reference information.
**Can write:** New memory entries, tags, updates (all with user confirmation).
**Cannot:** Automatically create tasks from memories unless the user explicitly requests extraction.

### Coaching Mode
**Can access:** Reflections, goals, and optionally selected decisions and relationship context.
**Can write:** Reflection entries, goal updates (all with user confirmation).
**Cannot:** Access general task noise unless there is a specific therapeutic reason.
**Must:** Ground every insight in cited source memories. Label all inferences as inferences. Allow the user to contest any recommendation.

### Modes as Editable Skill Files

Brain's modes should be implemented as **user-editable skill files**, not hardcoded configurations. Each mode definition is a self-contained document specifying: which domain tables the agent can access, which MCP tools it can call, how it should reason, and how it should format output. The MCP server enforces **permissions** (tool access, domain scoping). The skill files define **behavior** (reasoning approach, priorities, output format).

This separation means:
- **Iteration without architecture changes.** If the coaching mode isn't asking the right questions, the user edits the skill file — no MCP server changes needed.
- **New modes as new files.** A "meeting prep mode" that pulls relationship context, recent interactions, and open items for a specific person is a new skill file, not new code.
- **Transparency.** The user can read exactly what each mode does, aligning with the "user owns everything" principle — the user owns the agent's behavior definitions, not just the data.

See `research/cowork-features.md` Pattern 5 for the detailed analysis of Cowork's skill system as a model.

### Cross-Domain Queries
When a user's question naturally spans domains (e.g., "What's going on with the Acme project?" which touches tasks, decisions, and relationships), the agent can perform multi-step retrieval across domains — but access is governed by the active mode's permissions. If the query requires a scope the current mode doesn't have, the agent asks the user to confirm the expanded access.

---

## Deduplication & Entity Resolution

### Scope
Duplicate detection across all 7 domain tables.

### Domain-Specific Matching Logic

- **Tasks:** Similar wording, due date, linked person, semantic similarity
- **Relationships:** Same name, same email, same organization, overlapping context
- **Memory:** Same uploaded file, similar title, overlapping content
- **Goals:** Similar phrasing, overlapping intent
- **Reflections:** Likely clustering or linking instead of hard deduplication
- **Decisions:** Same topic, same choice context, similar rationale
- **Learning/Resources:** Similar resource URL, overlapping title or content

### Merge Workflow
1. Detect likely duplicates
2. Show confidence and rationale
3. Let the user confirm the merge
4. Preserve history where useful

Blind auto-merging is not recommended. All merge proposals follow the same memory write proposal workflow.

---

## Security & Trust

Security is a **first-class product concern**, not a non-functional footnote. A second brain that connects to a user's email, calendar, Slack, and files is a high-value target. As model capabilities increase, the blast radius of a compromised or misbehaving agent increases proportionally.

### Core Security Requirements

- **Scoped tool access:** The agent can only use tools appropriate to the active mode. Tool permissions are enforced at the system level, not by prompt instruction alone.
- **Read-default, write-gated:** All external writes (sending emails, creating calendar events, posting to Slack) require explicit user confirmation. No silent mutations.
- **Audit trail:** Every agent action — tool calls, retrieval queries, memory write proposals, user confirmations — is logged in the event log with timestamps and provenance.
- **Anomaly detection:** Monitor for unusual patterns: bulk reads, unexpected cross-domain access, high-volume write proposals. Flag for user review.
- **Safe mode:** A fallback mode where the agent operates read-only across all domains and integrations. Can be triggered manually or automatically on anomaly detection.
- **End-to-end encryption** for all stored data.
- **OAuth** for all external integrations — no stored credentials.
- **Data portability:** User can export all data (raw captures, domain tables, event logs) in a portable format (JSON or Markdown) at any time.

---

## Memory Architecture

The data model (above) defines the logical layers. This section specifies how persistent memory should work in practice, informed by the state-of-the-art survey and production implementations analyzed during discovery.

### Three Memory Tiers

Brain's persistent memory operates across three tiers with different time horizons and management strategies:

**Working Context (minutes–hours).** Transient summaries of the current conversation or task. Should be aggressively compacted and curated to avoid context rot — research shows that attention and relevance degrade with context length ("lost in the middle"), even with frontier models. This tier lives in the client session, not in the MCP server.

**Episodic Memory (days–months).** Time-stamped events, interactions, and artifacts: meeting transcripts, decisions, commitments, email signals, Slack threads. Stored as immutable logs in the raw capture layer plus derived embeddings. The retrieval layer should incorporate **temporal priors** — recency-weighted scoring so that recent events rank higher when freshness matters. This is the tier that daily ingestion populates.

**Semantic/Preferences (months–years).** Stable user preferences, identity facts, relationship context, and long-term goals. Stored with **explicit confidence and expiry**. The production-proven pattern is GitHub Copilot Memory's approach: each memory includes citations to evidence, is validated before use, and is automatically expired after a TTL (28 days) unless re-validated through use. For Brain, this means preferences and facts should decay in confidence over time unless reinforced by new evidence from integrations or user confirmation.

### Recommended Storage Substrate: Open Brain (OB1)

Research during discovery evaluated several 3rd-party options for Brain's persistent memory layer. The recommendation is **Open Brain (OB1)** — a self-hosted personal knowledge infrastructure built on Supabase (Postgres + pgvector) with an MCP server interface.

**Why OB1:** It's self-hosted (satisfies Design Principle #5: user owns everything), MCP-native (aligns with Brain-as-MCP-server), supports semantic similarity search via pgvector, stores metadata as JSON (supports provenance and domain tags), and costs effectively nothing at personal scale. The architecture is "one database, one AI gateway — any AI plugs in," which matches Brain's multi-client design.

**Risk to acknowledge:** OB1 is a community/open-source project, not a production-grade commercial platform. It has no SLA, no dedicated support, and its long-term maintenance depends on its creator and community. The actual recommendation is less "use OB1" and more "use the OB1 pattern" — Supabase + pgvector + MCP tools is the architecture, and OB1 provides a validated starting template. If OB1 stalls, the underlying stack (Postgres, pgvector, Supabase Edge Functions) is standard and independently maintained.

**How OB1 fits the four-layer model:** OB1's `thoughts` table becomes Layer 1 (raw capture log) — the append-only, reprocessable store. Brain's structured domain tables (Layer 2) sit on top, either as Postgres views/tables in the same Supabase instance or as a separate schema referencing raw thoughts. Brain's MCP server calls OB1's search internally but adds domain scoping, write-gating, and provenance enforcement that OB1 doesn't have natively.

**What OB1 doesn't solve (Brain must build):**
- **Temporal decay and TTL** — OB1 has timestamps but no confidence scoring or automatic expiry. Brain's Layer 2 must implement this.
- **Contradiction detection** — Flat vector search can't find conflicts. This is where a future graph augmentation (Zep/Graphiti or a custom temporal knowledge graph on the same Postgres instance) becomes the upgrade path.
- **Cross-domain bridging with permissions** — OB1's extension model is undifferentiated (all agents share one brain). Brain's "no context bleed" principle requires scoped access enforced at the database/tool level.

**Strategic sequencing: vector-first now, graph-augmented later.** Use vectors to ship quickly. Design schemas so entities and relations can later be extracted into a temporal knowledge graph for contradiction detection and cross-domain bridging. This aligns with the research consensus across Microsoft GraphRAG, Zep/Graphiti, and the contextual intelligence survey.

### Relationship to Cowork's Auto-Memory

OB1 and Cowork's auto-memory system complement each other — they operate at different time horizons. Auto-memory is a **session-bridging system** optimized for what the model needs to know right now to behave correctly (preferences, corrections, active project context). OB1 is a **knowledge accumulation system** that handles the long tail — decisions from months ago, people met at conferences, insights from books.

The operating model: **auto-memory shapes intent → OB1 provides evidence → the model synthesizes.** Auto-memory should be treated as a cache derived from OB1, not a parallel store that can drift. Behavioral feedback ("don't summarize at the end of responses") stays in auto-memory permanently — it's instructions to the model, not knowledge to retrieve.

**Hard scope boundary (added from expert review).** Auto-memory and Brain's domain tables must have **non-overlapping responsibilities** to prevent drift. Auto-memory stores **instructions to the model**: behavioral preferences, formatting rules, corrections, active project focus, session-bridging context. Brain's domain tables store **knowledge to retrieve**: facts, decisions, relationships, tasks, reflections, goals, history. Auto-memory should NOT contain facts, relationships, or domain knowledge. Brain's domain tables should NOT contain behavioral instructions or formatting preferences. If auto-memory drifts and contains stale knowledge (e.g., an old project summary), the model may use it instead of querying Brain's up-to-date domain table — because auto-memory is loaded first and the model may not realize it needs to verify against the database. This is a subtle but real failure mode. See `research/cowork-features.md` Pattern 7 for the detailed scope boundary table.

See `research/OneBrainDocs/` for full OB1 documentation and `research/OneBrain_Ideas_For_Kinetic.md` for the comparative analysis.

---

## Retrieval Architecture

Brain's retrieval strategy is informed by the contextual intelligence survey's finding that **retrieval is becoming multi-step and self-refining** in production systems, and that **verification beats curation for freshness**.

### Agentic Multi-Step Retrieval

For complex or multi-domain questions, Brain should use an **iterative retrieval loop** rather than single-shot top-k:

1. **Decompose** the query into sub-questions (query decomposition / Self-Ask pattern)
2. **Retrieve** initial evidence from relevant domain tables
3. **Read and reason** over retrieved results
4. **Refine** the query based on what was found (or what's missing)
5. **Fetch counterevidence** when the question is sensitive or the initial evidence is one-sided
6. **Synthesize** a grounded answer with citations to specific source artifacts

For simple, single-domain questions ("What's Sarah's role?"), single-shot retrieval is fine. The decision of when to escalate to multi-step should initially be model-directed, with retrieval heuristics tagged as workarounds in the compensating complexity registry.

### Verification and Citation

Every answer that draws on stored knowledge must include **citations to specific source artifacts** — not just "I found this in your memories." The production-proven pattern (from GitHub Copilot Memory) is **"citations as anchors"**: store memories with pointers to evidence (document IDs, timestamps, source integration), and re-validate at read time when possible.

For gentle correction and proactive insights (higher false-positive risk), add an explicit **verification stage** inspired by Chain-of-Verification (CoVe): draft the response → generate fact-check questions about it → independently verify against stored evidence → revise if needed. This prevents the system from confidently surfacing wrong information.

**Caveat on pattern transfers:** Several patterns in this brief are drawn from code-focused tools (Copilot's TTL + branch validation, Cursor's codebase indexing, CoVe research). Code has a verifiable substrate — you can check whether a function still exists or a convention still holds. Personal knowledge (preferences, relationships, goals) has no equivalent verification oracle. A fact like "Bob is your manager" can't be checked against a compiler. These patterns are directionally useful, but the verification and confidence mechanisms will need to be adapted — likely toward user confirmation as the primary validation signal rather than automated re-checking.

### Context Engineering as Infrastructure

Research is clear that **context windows are growing, but context stuffing remains brittle** — attention degrades with length. Brain should treat context engineering as core infrastructure:

- **Caching** for stable system policies, user profile summaries, and frequently referenced corpora (reduces cost and latency)
- **Deferred tool loading** to avoid paying the token cost of large tool catalogs (Brain's MCP server should expose only the tools relevant to the active mode)
- **Pre-filtering** search results before injecting them into context (relevance threshold, freshness filter, domain scope)

The goal is to keep active context small and high-signal, even as the total knowledge base grows to 100k+ records.

---

## Proactive Surfacing — Design Constraints

Proactive surfacing (volunteering information the user didn't ask for) is the hardest product frontier in contextual intelligence. The research consensus is clear: **the most "proactive" systems in 2026 are still UI-scoped** (IDE inline suggestions, priority notification stacks), and the cost of false positives is high (annoyance, trust erosion).

### Design Rules for Brain

**Opt-in, low-interruption, high-precision.** The safest proactive design is "suggestions in a bounded surface" rather than voice interruptions, unless confidence is extremely high. In a voice-first system, default to **quiet surfacing** — a subtle indicator plus a one-line summary — and escalate only when the user confirms they want detail.

**V1 proactive features are review-and-approve only.** Concrete V1 proactive experiences:
- **Daily briefing** — generated from overnight ingestion, presented as a reviewable summary the user reads at session start
- **Weekly review draft** — synthesizes the week's captures, flags open loops, surfaces patterns, presented as a document the user edits
- **Suggested priorities** — based on task deadlines, calendar density, and stale commitments
- **Open loops list** — commitments and follow-ups that haven't been closed

These are all **bounded, reviewable experiences** — generated artifacts the user can read, edit, or ignore. They are not interruptions.

**The Two-Door Principle: Artifacts, Not Conversations.** Expert review identified that these proactive experiences should be **generated files** (markdown, HTML, structured documents), not conversational responses. A chat message is ephemeral — the user reads it once and it scrolls away. A file persists. The daily briefing should be a document the user opens and reads at their own pace. The weekly review should be a document the user can edit — adding notes, crossing things off, disagreeing with the agent's synthesis — and the edited version becomes input for next week's review. The open loops list should be a persistent artifact that updates incrementally.

The principle: every Brain output that the user needs to review, reference, or act on should exist as a file in the workspace, not just a conversation turn. The agent enters the data through MCP tool calls; the user enters through the file system. Both sides operate on the same information through different interfaces. This is what turns Brain from a chatbot with a database into an operating system with two doors.

See `research/cowork-features.md` Pattern 4 for the full analysis of this pattern in Cowork.

**Fully autonomous proactive insights (behavior #9) are V2+** and should be gated behind:
- Explicit user opt-in per behavior
- High-confidence thresholds (the system should abstain rather than guess)
- Clear provenance (every proactive surfacing must cite what triggered it)
- Strong evaluation (measure false-positive rates before expanding)

---

## Compensating Complexity Registry

Every piece of prompt scaffolding, retrieval heuristic, classification rule, or verification step should be tagged as one of two types:

**Policy (durable):** Exists for trust, safety, privacy, or UX reasons. Examples: write-gating, permission scopes, provenance requirements, honest-recall rules. These persist regardless of model quality.

**Workaround (temporary):** Exists because the current model can't do something reliably. Examples: hardcoded classification heuristics, manual query rewriting, retrieval routing logic, redundant verification steps for common misclassifications.

### Operating Discipline

- Maintain a registry of all workarounds with the specific model limitation they compensate for
- When a new model ships, run **deletion tests**: remove each workaround, measure whether outcomes degrade, and delete what's no longer needed
- Measure **interception rates** for verification steps — how often does a check actually change the outcome? If rarely, it's a deletion candidate
- The goal is that model upgrades make the system simpler, not more complex

---

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Privacy** | All data stored locally or in user-controlled cloud storage by default; no training on user data |
| **Latency** | Recall responses should feel fast for standard single-domain queries (target: under 3 seconds, but this threshold needs validation through use). Multi-step retrieval will take longer and should show incremental progress. |
| **Reliability** | Core recall functionality should be highly available. For a single-user self-hosted system on Supabase, specific uptime targets (e.g., 99.5%) depend on the hosting tier and are premature to specify before infrastructure decisions are finalized. |
| **Scalability** | Should handle a growing personal knowledge base without noticeable degradation. The 100k+ record target is a rough estimate based on ~10 captures/day over 25+ years — actual scaling needs depend on usage patterns that haven't been observed yet. |
| **Portability** | User can export all data in a portable format (JSON or Markdown) at any time |
| **Explainability** | Every answer surfaces the source artifacts and reasoning behind what was retrieved; inferences are labeled as such |
| **Model-agnosticism** | The agent layer, retrieval tools, and memory schemas should not depend on a specific model provider; model-swap should be possible without data migration |

---

## UX Considerations

**Capture friction** — If capture takes too long, usage falls off quickly.

**Classification trust** — If the system misclassifies too often, the user stops trusting it. But because raw artifacts are preserved, misclassification is recoverable — not data loss.

**Retrieval quality** — Not enough to store information; the system must surface the right thing in the right context. Multi-step retrieval should feel natural, not slow.

**Clean compartmentalization** — Each mode should feel intentional and focused, not one giant mixed bucket.

**Passive intelligence without noise** — Email, Slack, and calendar scanning should feel helpful, not noisy or invasive.

**Merge/review usability** — Duplicate review and memory write proposals need a simple, understandable flow or they become burdensome.

**Proposal fatigue** — If the system surfaces too many write proposals, the user will start auto-approving or ignoring them. Proposals should be batched, prioritized, and easy to bulk-accept or dismiss.

**Review queue as a primary surface** — Cowork has no review step for scheduled task outputs. Brain improves on this with the memory write proposal workflow — but expert review identified that the review experience itself needs to be a **first-class UX surface**, not a background feature. Brain needs a single place where the user sees everything the system wants to write, change, or flag — and can approve, edit, or reject each item. Think of it as a pull request for your personal knowledge base. This should be a **generated artifact** (a file or structured view in the workspace), not a conversational prompt. The review queue is where the user exercises judgment over the system's intelligence. If it's buried or friction-heavy, the user will either auto-approve everything (defeating the purpose of write-gating) or stop reviewing entirely (defeating the purpose of ingestion).

**Long-term trust** — Even for a single user, behavior must be reliable and predictable. Trust is harder to rebuild than to maintain.

**Cold start problem** — Brain's value compounds over time as the knowledge base grows, but the first 48 hours are nearly empty. A system that needs weeks of accumulated data before it can do anything useful will fail before it proves itself. The brief defines the capture flow and daily briefing, but doesn't address what the user *experiences* in week one — what they see when they open Brain on a Tuesday morning with 12 captures total, what the first daily briefing looks like when there's barely anything to brief on, and how the system earns trust before it has meaningful density. **This is an open design problem that should be addressed before V1 ships.** Possible approaches: seed the knowledge base from an initial integration sync (pull the last 30 days of email/calendar/Slack before the user's first session), provide a guided onboarding that front-loads high-value captures, or scope V1 to a single domain where density accumulates faster.

---

## V1 Scope

### In Scope
- Single user only (no multi-user, no sharing)
- Web or desktop first (no mobile-native)
- Text and document ingestion (voice is a goal, not a hard V1 requirement)
- **Raw capture log** with append-only storage and source attribution
- 7 domain tables derived from raw captures, with separate schemas and retrieval rules
- **Memory write proposal workflow** for all AI-generated domain entries
- **Event log** tracking all system actions
- Integrations: Gmail, Google Calendar, Slack (depth over breadth)
- Daily scan ingestion workflow for email, Slack, calendar
- Duplicate detection with user-confirmed merge flow
- Single agent with mode-based access scoping (Task, Memory, Coaching)
- **Compensating complexity registry** from day one
- **Audit trail** for all agent actions
- Multi-step retrieval with source citations

**[EXPERT REVIEW NOTE] Consider narrowing V1 to a single-domain proof of concept.** The current V1 scope includes 7 domain tables, 3 agent modes, multi-step retrieval, daily scan ingestion, and duplicate detection — all at once. Expert review recommends proving the capture → recall → cite loop for **one domain first** (likely Tasks, which has the clearest external signals and the most testable value proposition) before expanding. The architecture supports this — the raw capture log, MCP server, and retrieval tools all work the same whether there's one domain table or seven. What changes is the classification burden, the cold start density problem, and the surface area for things to go wrong. A single-domain V1 also provides a cleaner test of whether Brain's recall is materially better than Cowork auto-memory + OB1 + a good system prompt — which is the actual competitive bar.

### Out of Scope
- Team / shared Brain
- Real-time collaboration
- Brain as a task manager or project manager
- Mobile-native app
- Voice input (can be V2)
- Google Drive integration (V2 — after core loop is proven)
- iMessage capture (V2 — macOS only, local daemon, unsupported Apple schema)
- Fully autonomous proactive actions (V1 proactive features are review-and-approve only)

---

## Implementation Sequencing

This phasing is informed by the Mythos research brief's recommendation to "ship value now, establish upgradeability" and the contextual intelligence survey's findings on what's production-proven versus experimental.

**Assumption:** These timelines assume a single builder working with AI-assisted development tools. They have not been validated against actual implementation effort. The sequencing (what comes before what) is higher-confidence than the specific day counts. An expert should treat the 30/90/180 framing as a prioritization sequence, not a committed schedule.

### 30 Days — Durable Core + Measurement Harness

Build the foundational loop before chasing sophisticated agent choreography:

- **High-quality capture pipeline** — voice/text input → raw capture log → domain classification → user confirmation
- **Query → retrieve → answer loop with citations** — single-shot retrieval against domain tables, every answer cites source artifacts
- **Auditable memory write path** — all AI-generated writes go through the proposal workflow, even if initially manual approval only
- **OB1 deployment** — Supabase + pgvector instance, MCP server exposing capture and search tools
- **Compensating complexity registry** — tag every prompt block, retrieval heuristic, and validator as policy (durable) or workaround (temporary)
- **Event log** operational from day one

The goal at 30 days: a working capture → store → retrieve → cite loop that proves the core value proposition.

### 90 Days — Agentic Retrieval + Structured Memory

- **Multi-step retrieval** — upgrade from single-shot top-k to agentic evidence-seeking loops (search → read → refine → synthesize) for complex queries
- **Structured memory schemas** — people, projects, decisions, open loops — with provenance links for every record
- **Ingestion integrations** — Gmail, Calendar, Slack syncing via scheduled tasks, writing to structured tables through the proposal workflow
- **Mode-based access scoping** — Task, Memory, Coaching modes with different tool permissions enforced at the MCP server level
- **Daily briefing and weekly review** — first proactive experiences, bounded and reviewable
- **Risk-based controls** — read-only by default, scoped tool access, human confirmation on any external write

### 180 Days — Proactive Intelligence + Step-Change Readiness

- **Temporal decay** — confidence scoring on stored facts, TTL-based expiry for unreinforced memories
- **Contradiction detection** — flag conflicting stored facts for user resolution (may require graph augmentation of the storage layer)
- **Proactive surfacing expansion** — suggested priorities, open loops, stale commitment nudges
- **Step-change drills** — swap in stronger models, execute deletion tests on workarounds, measure interception rates, simplify
- **Security hardening** — secrets isolation, connector sandboxing, anomaly detection, policy-as-code for tool scopes
- **V2 integrations** — Google Drive, iMessage capture (macOS local daemon)

---

## Open Research Problems

These are capabilities Brain needs that **no production system has reliably solved**. They inform where to invest cautiously and where to expect iteration.

**High-precision proactivity.** The core open problem is learning triggers and timing that minimize interruption cost while maximizing benefit. Production-grade evaluations for "helpful without annoying" are limited. Brain's voice-first constraint makes this harder — audio interruptions are costlier than visual suggestions.

**Personal truth maintenance.** There is no widely adopted system for maintaining a "personal knowledge graph" with provenance, conflict policies, and user-understandable confidence decay. GitHub Copilot Memory is strong because code provides a verifiable substrate — translating this to personal life (preferences, relationships, goals) requires new primitives that don't exist yet.

**Gap detection at scale.** Models structurally struggle with detecting omissions — absences have no "keys" to attend to. AbsenceBench shows this empirically. Building "missing but important" detection likely requires task schemas, external validators, and meta-reasoning that operates outside pure next-token prediction.

**Long-context understanding remains brittle.** Scaling context length does not eliminate the need for retrieval, summaries, and filtering. "Lost in the middle" and context rot mean that even with million-token windows, curated retrieval outperforms context stuffing for most real-world queries.

**Cross-domain bridging at personal scale.** Linking information across life domains (work, health, relationships, finances) raises privacy and consent challenges beyond what enterprise systems face. Over-personalization and accidental linkage are real risks. Designing explainable, controllable linking that makes provenance and permissions legible in everyday use is unsolved.

---

## Open Questions

- [ ] What is the primary interface? Chat, sidebar, ambient widget?
- [ ] How does Brain handle sensitive/personal information the user doesn't want indexed?
- [ ] What's the retention policy — does Brain forget old memories or accumulate indefinitely?
- [ ] Does Brain have an identity/persona, or is it purely functional?
- [ ] What's the pricing model — flat subscription, usage-based, freemium?
- [ ] What is the V1 MVP — minimum slice that proves the core loop?
- [ ] How should proposal batching work — real-time, daily digest, or user-configured?
- [ ] What triggers a reprocessing pass when models are upgraded — manual, automatic, or incremental?
- [ ] What is the safe mode UX — manual toggle, automatic trigger, or both?
- [ ] **[Added from expert review]** Is Brain a personal tool or a product? If personal, the architecture is overengineered for one user. If a product, the brief is missing market positioning, willingness-to-pay analysis, and a theory of distribution.
- [ ] **[Added from expert review]** What does Brain offer that Open Brain (OB1) + good prompts + Cowork auto-memory doesn't? This is the real competitive benchmark — not Notion AI or other second-brain startups. If Brain can't meaningfully beat that stack for a single domain, the multi-domain vision doesn't matter.
- [ ] **[Added from expert review]** How does Brain earn trust in the first 48 hours before the knowledge base has meaningful density? What does the user see on day one?
- [ ] **[Added from expert review]** Should V1 prove the core loop on a single domain before committing to seven? (See UNDECIDED note in Information Domains section.)

---

## Related Documents

These documents contain the detailed research, analysis, and frameworks that informed this brief. An expert reviewing Brain should read the brief first, then consult these for depth on specific topics.

| Document | Location | What It Contains |
|---|---|---|
| **Contextual Intelligence Framework** | `brain-contextual-intelligence.md` | The 9 behaviors that define Brain's smart capabilities, with detailed examples |
| **Research Compendium** | `research/brain-research.md` | Aggregated findings from all discovery research — the evidence base for design decisions |
| **Contextual Intelligence Survey** | `research/Contextual Intelligence in Production and Research-Grade AI Systems.md` | State-of-the-art survey: production implementations, memory architectures, retrieval patterns, and open problems across GPT, Claude, Gemini, Cursor, Perplexity, Notion AI, and Copilot |
| **Mythos Research Brief** | `research/Mythos Research Brief and Second-Brain Product Implications.md` | Analysis of the coming capability jump and its implications for second-brain architecture — source of the "get simpler as models improve" principle and 30/90/180 day framing |
| **Cowork Technical Analysis** | `research/cowork-features.md` | Full breakdown of Cowork's three backend systems (auto-memory, scheduled tasks, context assembly) and where they break down |
| **Open Brain (OB1) Documentation** | `research/OneBrainDocs/` | Setup guides, companion prompts, MCP tool audit, and product architecture for the recommended storage substrate |
| **OB1 Comparative Analysis** | `research/OneBrainDocs/OneBrain_Ideas_For_Kinetic.md` | Feature extraction comparing OB1's architecture philosophy to Kinetic's SaaS approach |
