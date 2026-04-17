# Brain — Research Compendium

This document aggregates all foundational research, analysis, and frameworks produced during Brain's discovery phase. It serves as the evidence base for design and architecture decisions — the "why we believe what we believe" behind the product brief.

**Last Updated:** 2026-04-04

---

## 1. Mythos and the Coming Capability Jump

### Key Findings

**A meaningful capability jump in agentic competence is coming.** Anthropic confirmed it is testing a new model called Claude Mythos, describing it as a "step change" with advances in reasoning, coding, and cybersecurity. This is not a minor revision — it implies a new performance tier above Opus. For Brain, this means the set of tasks a single well-structured agent can handle expands significantly. Complex routing graphs and multi-agent choreographies become harder to justify.

**The intelligence is shifting from your orchestration layer to the model.** The most builder-relevant change is a rebalancing: less intelligence in scaffolding, more in the model's ability to self-direct tool use and maintain coherent state across multi-step work. Anthropic's own engineering guidance draws a clear line between workflows (predefined code paths) and agents (model-directed tool usage) and recommends starting with the simplest approach.

**Context is finite and degrades.** Despite potential improvements in context length, Anthropic's context engineering guidance is explicit: naive "stuff everything" strategies degrade precision and focus. Retrieval and memory need to be curated and measured, not expanded indefinitely. This directly counters the temptation to kill retrieval in favor of long context ("RAG is dead").

**Stronger models make security more important, not less.** Anthropic's own cyber-espionage case study describes real attackers using agentic loops with tools for extended operations, with AI handling 80-90% of tasks. Anthropic is privately warning government officials that Mythos increases the likelihood of large-scale cyberattacks. Any product that connects to a user's files, email, and accounts — which Brain does — must assume stricter security expectations: scoped tools, audit logs, anomaly detection, and safe mode.

**Accumulated scaffolding becomes a liability.** Major model jumps tend to invalidate brittle prompt scaffolding, over-specified workflows, and workaround-heavy orchestration. The "Bitter Lesson" (Sutton) applies: general methods that scale with computation ultimately outperform hand-engineered domain hacks. Treat procedural scaffolding as a temporary hedge, not a permanent asset.

### What This Changed in the Brief

These findings triggered 10 specific updates to the product brief:

1. **Raw capture as the durable asset.** Added an immutable, append-only capture log (Layer 1) beneath the domain tables. Domain entries are now derived views, not the source of truth. This ensures classification and summarization can be regenerated as models improve.

2. **Memory writes as proposals.** All AI-generated writes to domain tables — not just dedup merges — now follow a proposal workflow: the system proposes with provenance and confidence, the user confirms, and everything is logged.

3. **Evidence-seeking retrieval.** Recall was upgraded from single-shot top-k to multi-step agentic retrieval: the model searches, reads, refines its query, fetches counterevidence, and synthesizes.

4. **Single agent with scoped modes.** Replaced separate specialized interfaces (Task Interface, Memory Interface, Coach Interface) with one agent operating in different modes, each with different tool and retrieval permissions.

5. **Event log as foundational data layer.** Added an event log tracking every system action: ingestion syncs, classification decisions, memory write proposals, user confirmations, deletions.

6. **Read-default / write-gated policy.** Sharpened Design Principle #4. The risk boundary is reads vs. writes. Reading and synthesizing can be increasingly model-directed; any state change requires explicit, scoped user authorization.

7. **V1 scope narrowed for depth.** Integrations cut from five (Gmail, Drive, Linear, Slack, Calendar) to three (Gmail, Calendar, Slack). Drive deferred to V2. Focus V1 on proving the core capture → store → retrieve → cite loop.

8. **Compensating complexity registry.** New section requiring all prompt scaffolding, retrieval heuristics, and verification steps to be tagged as either "policy" (durable) or "workaround" (temporary). Model upgrades become deletion events.

9. **Security elevated to first-class concern.** Moved from a row in the NFR table to a dedicated section with scoped tool access, audit trails, anomaly detection, and safe mode.

10. **Coaching grounding requirement.** Every coaching insight must be grounded in cited source memories, clearly labeled as inference, and contestable by the user.

### Key Risks from the Mythos Analysis

- Mythos may underdeliver on general reasoning (the jump may be cyber-specialized). Hedge: Brain's core value must work well on current models; treat advanced proactivity as progressive enhancement.
- Availability may be constrained (differential access, enterprise-only). Hedge: multi-model support and model-agnostic tool abstraction.
- Long context improvements may tempt killing retrieval. Hedge: retrieval and context curation are first-class forever.
- Stronger agents increase the blast radius of a connected second brain. Hedge: treat tool access as a security product.
- Over-investment in brittle orchestration that becomes counterproductive after new models ship. Hedge: compensating complexity registry and deletion mindset.

### Source
Analysis of the Mythos Research Brief, which synthesizes reporting from Fortune, Axios, Quartz, and Anthropic's own engineering and safety publications.

**Full report:** `research/Mythos Research Brief and Second-Brain Product Implications.md`

---

## 2. Cowork as Reference Architecture

### The Three Systems Behind Proactive Recall

Cowork does not have a "proactive recall" feature. The behavior — where it reminds you of something you forgot or surfaces relevant context you didn't ask for — emerges from three independent systems working together.

**System 1: Auto-Memory.** Cowork writes markdown files to an `.auto-memory/` folder. An index file (`MEMORY.md`, first 200 lines) is loaded automatically at session start. Topic-specific files are read on-demand if the model follows a pointer in the index. There is no database, no embeddings, no vector search — just flat files and the model's own judgment about when to read them.

**System 2: Scheduled Tasks.** Self-contained prompts that fire on a cron schedule, spawning completely fresh sessions with no inherited state. The typical pattern: a daily task calls Gmail/Slack/Calendar MCPs, processes results, and writes updated markdown files to the workspace. Then the session ends. It does not push anything into the next conversation.

**System 3: Context Assembly at Query Time.** When the user makes a request, the model assembles context from auto-memory, workspace files, and MCP tools. The "reminding" behavior happens here — the model has context from the scheduled task's output (loaded via a memory pointer) and notices something relevant the user didn't mention.

### The Pointer Chain

The full chain that creates proactive recall:

```
Scheduled Task → writes files to workspace → session ends
Auto-Memory → MEMORY.md contains pointers to those files → loaded at next session start
Context Assembly → model sees pointer → reads file → notices relevant fact → surfaces it
```

This is an emergent behavior, not a designed feature. It works when the pointer chain is intact. It breaks when: the scheduled task didn't run, the memory pointer is missing or vague, the model doesn't recognize the relevance, or the file name doesn't suggest its content.

### Why the Model Reads a File — The Three Triggers

There are only three reasons the model reads workspace files the user didn't ask for:

1. **A memory pointer directed it there.** The auto-loaded `MEMORY.md` references a file. This is the most reliable trigger.
2. **A system prompt or skill instructed it.** CLAUDE.md or an active skill says "before writing emails, always review the project summary."
3. **The model's own initiative.** The model decides to look, runs `ls`, picks a file by name. Least reliable — no index, no relevance scoring, just filename guessing.

### Limitations of the Cowork Approach

- No semantic search over memories or workspace files
- No relevance scoring — the model guesses based on file names
- No domain scoping — the model can read anything in the workspace
- No provenance — when surfacing context, it doesn't cite which email or sync event produced it
- No review step for scheduled task outputs — if the task misinterprets an email, the wrong summary gets consumed silently
- Output is unstructured markdown with no schema, confidence levels, or fact-vs-inference distinction

### What Brain Takes from Cowork

The core patterns are right: durable persistence (auto-memory), periodic enrichment (scheduled tasks), and intent-aware context assembly. But Brain upgrades every layer:

| Cowork | Brain |
|---|---|
| Flat markdown files, 200-line index, no search | Structured domain tables exposed as MCP tools with search, filtering, and provenance |
| Isolated sessions writing unstructured markdown, no review | Scheduled ingestion writing to structured tables via memory write proposals, with user review and event logging |
| Model follows memory pointers or guesses by filename | Agent calls structured retrieval tools with scoped access per mode |
| Emergent proactive recall from pointer chains | Designed proactive recall from structured, queryable knowledge substrate |

The model's job shifts from "figure out where to look" to "ask the right question" — which is what models are good at.

### Source
Direct analysis of Cowork's backend systems through exploration of its auto-memory folder, skills, scheduled tasks, and MCP connections.

**Full report:** `cowork-features.md`

---

## 3. Contextual Intelligence in Production and Research-Grade Systems

### Key Findings

**Retrieval is becoming multi-step and self-refining.** Single-shot retrieve-then-read is being replaced by iterative retrieval interleaved with reasoning. Perplexity Pro Search runs multiple searches per query; Claude's web search tool can repeat searches within a single request; GitHub Copilot's connector runs multiple searches to locate relevant code. Research (IRCoT, Self-Ask) confirms this pattern improves multi-hop QA significantly. For Brain, this validates the "evidence-seeking retrieval" decision already in the brief.

**Verification beats curation for freshness.** The most decision-useful production advance is GitHub Copilot Memory's approach: store memories with citations to specific code locations, validate those citations against the current branch before using them, and auto-delete memories after 28 days unless re-validated through use. This "claims with provenance + TTL + just-in-time verification" pattern is directly aligned with Brain's temporal awareness, contradiction handling, and safe proactivity needs. It suggests Brain should treat memories as claims with expiry, not static facts.

**Context windows are growing, but context stuffing remains brittle.** Despite 1M+ token windows, research consistently shows attention degrades with length ("lost in the middle," "context rot"). Production systems are responding with context engineering primitives — prompt caching, deferred tool loading, pre-filtering — to keep active context small and high-signal. This reinforces the brief's position that retrieval and context curation are first-class forever.

**Proactive surfacing is the hardest product frontier.** The most "proactive" contextual intelligence in production is still UI-scoped: IDE inline suggestions, PR review comments, and OS-level priority stacks (Apple Intelligence). Truly proactive personal assistants remain constrained by interruption risk, privacy scaffolding, and the absence of reliable "personal truth maintenance." For Brain's voice-first interface, this means defaulting to quiet surfacing (subtle chime + one-line card) and escalating only on high confidence.

**No production system has solved personal truth maintenance.** Copilot Memory works because code provides a verifiable substrate. Translating TTL + verification to personal life (preferences, relationships, goals) requires new primitives: provenance capture, conflict policies, and user-understandable confidence decay. This is Brain's hardest open problem and its biggest potential differentiator.

**Gap detection is fundamentally hard for transformers.** AbsenceBench shows models break down on "what's missing" tasks because absences have no "keys" to attend to. Building reliable gap detection likely requires task schemas, external validators, and meta-reasoning outside pure next-token prediction — not just better prompting.

**Graph-structured knowledge unlocks cross-domain bridging and global sensemaking.** Microsoft GraphRAG demonstrates that entity graphs with community-level summaries improve comprehensiveness over baseline vector RAG for corpus-level questions. For Brain, this suggests starting vector-first to ship quickly but designing schemas so entities and relations can later be extracted into a temporal knowledge graph for contradiction detection and cross-domain bridging.

### What This Changed in the Brief

1. **Memory as claims with provenance + expiry.** Copilot's TTL + verification pattern validates and sharpens the brief's "memory writes as proposals" decision. Every stored fact should carry a source pointer, a confidence level, and an expiry policy — not just a text blob.

2. **Quiet-first proactivity model.** Production evidence confirms that proactive surfacing should default to low-interruption, high-precision suggestions in a bounded surface. Voice interruptions only when confidence is extremely high and the item is time-sensitive.

3. **Vector-first, graph-augmented-later storage strategy.** Ship V1 on vector + metadata for speed. Design schemas to support later extraction into a temporal knowledge graph (Graphiti/Zep pattern) for contradiction detection and cross-domain bridging.

4. **Verification stage in retrieval pipeline.** Add an explicit Chain-of-Verification-style step for any proactive surface or gentle correction. Draft → generate fact-check questions → independently verify → revise. This is the production-proven pattern for reducing hallucinated proactive insights.

5. **Gap detection gated behind schemas.** Don't rely on the model to detect omissions freeform. Use structured task schemas (slots, checklists) and clarification question generation for V1. General-purpose gap detection is experimental and should be flagged accordingly.

6. **Context engineering as core infrastructure.** Prompt caching for stable system policies and user profile summaries. Deferred tool loading for the MCP tool catalog. Pre-filtering for retrieval results. These aren't optimizations — they're requirements for keeping context small and high-signal at scale.

### Key Risks from the Contextual Intelligence Survey

- Personal truth maintenance has no production precedent outside code. Copilot's model works because code is verifiable; personal facts are not. Hedge: start with explicit user confirmation for all memory writes; add automated decay only after evaluating accuracy.
- Proactive insights carry high false-positive risk. Google explicitly notes over-personalization as a known issue in Gemini. Hedge: gate proactive insights behind explicit user opt-in and strong evaluation.
- Gap detection is structurally weak in current models. Hedge: use schema-driven detection, not freeform omission-finding; treat as experimental.
- Cross-domain bridging risks privacy boundary violations. Hedge: explicit opt-in per domain pair, provenance on every bridged surface, and user-controllable linking policies.
- Graph-augmented storage adds complexity. Hedge: vector-first V1 with clean entity schemas; graph layer is a V2 enhancement, not a launch requirement.

### Source
Deep research survey of production implementations and academic literature across all major AI platforms (ChatGPT, Claude, Gemini, Copilot, Cursor, Perplexity, Notion AI, Apple Intelligence) and relevant research (IRCoT, Self-RAG, GraphRAG, MemGPT/Letta, AbsenceBench, Chain-of-Verification, and others).

**Full report:** `Contextual Intelligence in Production and Research-Grade AI Systems.md`

---

## 4. Architecture Decision: Brain as MCP Server

### Decision

Brain should be built as an **MCP server** that exposes the knowledge substrate as tools. The interface layer — Cowork, Claude Code, a Slack bot, a custom web app, GPT, or any other MCP-compatible client — becomes interchangeable.

### What the MCP Server Exposes

Tools like `search_memories`, `get_tasks`, `write_proposal`, `log_reflection`, `get_person`, `search_decisions`. Any client that can call MCP tools gets access to the same knowledge substrate.

### Why This Works

- Cowork already provides a conversational interface, file access, tool execution, and MCP connections. Brain-as-MCP means Cowork IS the agent layer for V1 — no need to build a frontend or agent orchestration system.
- The four-layer architecture from the brief maps cleanly: Layers 1 and 2 (raw capture log, domain tables) and Layer 4 (trust and controls) live inside the MCP server. Layer 3 (the agent) is whatever client the user is talking to.
- Model upgrades flow through automatically — no agent layer to retune.
- Future portability: the same MCP server works with Cowork today, Claude Code tomorrow, a custom React app later, or a Slack bot for quick capture.

### Critical Constraint

If Brain is callable from multiple interfaces, the MCP server itself must enforce permissions and write-gating. Authorization cannot live in the client's system prompt — it must live in Layer 4 (trust and controls) on the server side. This is already the right instinct from the brief, but it becomes non-negotiable in a multi-client world.

### Source
Discussion during the discovery phase about using Cowork (or any MCP-compatible client) as Brain's interface layer.

---

## 5. Open Research — Pending

No items currently pending.

---

## Document Index

| Document | Purpose |
|---|---|
| `brain-brief.md` | Product vision, design principles, data model, scope — the "what and why" |
| `brain-contextual-intelligence.md` | The 9 behaviors that define Brain's smart capabilities |
| `Contextual Intelligence in Production and Research-Grade AI Systems.md` | Deep research paper: production techniques, memory architectures, retrieval, and proactive AI |
| `cowork-features.md` | Technical analysis of Cowork's three backend systems — the reference architecture |
| `brain-research.md` | This document — the evidence base for all design decisions |
| `research/Mythos Research Brief and Second-Brain Product Implications.md` | Full Mythos analysis with evidence table and citations |
