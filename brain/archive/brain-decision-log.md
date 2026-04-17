# Brain — Decision Log

This document tracks all major design and strategy decisions made during Brain's discovery, planning, and build phases. Each entry records the decision, the reasoning, alternatives considered, and the date.

**Convention:** New decisions are added at the top. Each entry is numbered sequentially. Decisions that override or refine earlier decisions should reference the original entry.

---

## Decision 005 — Competitive Bar Definition
**Date:** 2026-04-05
**Status:** Accepted
**Context:** Brain needs a concrete benchmark to validate whether the custom build justifies its complexity over an off-the-shelf stack.

**Decision:** The competitive baseline is **OB1 + Cowork auto-memory + a well-crafted CLAUDE.md + scheduled tasks pulling Gmail/Calendar/Slack**. Brain must demonstrably beat this baseline on three dimensions within 30 days of use:

1. **Structured recall with provenance** — Brain returns cited, source-attributed, timestamped answers, not just "I found something about that" from flat vector search.
2. **Domain-scoped retrieval that prevents bleed** — Mode scoping (Task vs. Coaching) materially changes the user experience by keeping emotional context out of task queries and vice versa.
3. **Review-and-approve intelligence** — The memory write proposal workflow catches errors that the baseline's silent scheduled-task writes would miss.

**Rationale:** The real competition isn't Notion AI or second-brain startups — it's the stack a technically capable user can assemble today without writing custom code. If Brain can't beat that, the multi-domain vision doesn't earn the right to expand.

**Alternatives considered:**
- Benchmarking against commercial second-brain products (Mem, Notion AI, Reflect) — rejected because those target different users and workflows; not the actual substitute for a builder
- No explicit benchmark, just "build and see" — rejected because it invites scope creep without a forcing function for quality

---

## Decision 004 — Personal Tool, Not a Product
**Date:** 2026-04-05
**Status:** Accepted
**Context:** The brief's architecture (MCP server with Layer 4 trust controls, multi-client portability, security hardening, anomaly detection) is significantly more complex than a single-user personal tool requires. Expert review flagged the question: is Brain a personal tool or a product?

**Decision:** Brain is a **personal tool** built for one user (Brandon). No commercial ambition in V1 scope.

**Implications:**
- Strip the brief of product-only concerns: multi-client portability testing, anomaly detection, security hardening beyond basic sanity, pricing model, distribution strategy
- Cowork dependency risk is downgraded — if Cowork breaks, the single user/builder adapts
- Layer 4 trust controls simplify to basic write-gating and audit logging, not enterprise-grade permission enforcement
- No need for onboarding UX, documentation, or support flows

**Rationale:** Simplifies every downstream decision. The architecture should be clean enough that it *could* become a product later, but V1 is built for speed and personal utility, not for shipping to others.

**Alternatives considered:**
- Build as a product from day one — rejected because it doubles the scope without a validated market or distribution channel
- Hybrid (personal tool with product-ready architecture) — rejected as the worst of both worlds; adds complexity without the forcing function of actual users

---

## Decision 003 — V1 Domains: Tasks + Reflections (Simultaneous)
**Date:** 2026-04-05
**Status:** Accepted (revised same day — removed sequencing, both ship from day one)
**Context:** The brief defined 7 information domains. Expert review recommended proving the core loop on a single domain before expanding. The question: which domain(s) ship in V1?

**Decision:** V1 ships with **two domains from day one: Tasks and Reflections**. Both are available immediately — no sequencing.

- **Tasks** is fed by integration signals (Gmail, Calendar, Slack) and proves the capture → recall → cite loop with external data.
- **Reflections** runs on manual capture only for V1 — no automated inference from email tone or Slack sentiment. Proves the personal/emotional thesis through capture discipline and coaching mode utility.

**Rationale:**
- Tasks has the clearest external signals and the most testable value prop ("did Brain catch something I forgot?").
- Reflections is what makes Brain feel personal from day one, not just a smarter to-do list. Without it, there's no reason to come back beyond task management.
- Infrastructure cost of two domains is near-zero — same MCP server, same architecture, just a second table and mode.
- User (Brandon) specifically wants both from the start to maintain engagement and test both dimensions of the thesis simultaneously.

**Key constraint:** The classification boundary between Tasks and Reflections will be tested early ("I'm frustrated that I keep missing deadlines" is both). The raw capture log mitigates misclassification risk, but the UX for correcting domain assignment needs to be low-friction.

**Risks:**
- Reflections depends entirely on user discipline for capture — no integration signals to bootstrap density
- Two domains doubles the classification surface area vs. single-domain V1
- Coaching mode needs meaningful reflection density to be useful; may feel sparse in early weeks

**Alternatives considered:**
- Tasks only — simpler, but doesn't test the personal/emotional dimension
- Tasks first, Reflections in week 2–3 — rejected by user; both domains needed from day one to sustain engagement
- All 7 domains — rejected per expert review; too much surface area, cold start problem across all domains

---

## Decision 002 — Brain as MCP Server Architecture
**Date:** 2026-04-04 (documented in brief)
**Status:** Accepted
**Context:** Brain needs an interface layer. Options ranged from building a custom frontend to using an existing MCP-compatible client.

**Decision:** Brain is built as an **MCP server** exposing the knowledge substrate as tools. The interface layer (Cowork for V1) is interchangeable. Layers 1, 2, and 4 live inside the MCP server. Layer 3 (the agent) is whatever client the user talks to.

**Rationale:** No frontend to build for V1 (Cowork provides the conversational interface). Model upgrades flow through automatically. Future portability to any MCP-compatible client.

**Risks:** MCP protocol maturity, Cowork dependency (downgraded per Decision 004).

**Source:** Product brief, Section "Architecture Decision: Brain as MCP Server"

---

## Decision 001 — OB1 Pattern as Storage Substrate
**Date:** 2026-04-04 (documented in brief)
**Status:** Accepted
**Context:** Brain needs a persistent storage layer for the raw capture log and domain tables. Options included custom Postgres, third-party memory platforms, and the Open Brain (OB1) pattern.

**Decision:** Use the **OB1 pattern** — Supabase + pgvector + MCP tools — as the storage substrate. OB1 provides a validated starting template; the actual commitment is to the underlying stack (Postgres, pgvector, Supabase Edge Functions), not to OB1 as a dependency.

**Rationale:** Self-hosted (user owns everything), MCP-native, supports semantic search via pgvector, costs near-zero at personal scale. Vector-first now, with schemas designed to support graph augmentation later.

**Risks:** OB1 is community/open-source with no SLA. Mitigated by the underlying stack being independently maintained.

**Source:** Product brief, Section "Recommended Storage Substrate: Open Brain (OB1)"
