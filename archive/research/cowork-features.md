# Cowork Features — Blueprint for Brain

This document breaks down how Cowork achieves proactive recall and related behaviors on the backend. The purpose is to understand these mechanics well enough to design Brain's equivalent features — structured, reliable, and intentional where Cowork's are emergent and ad hoc.

---

## The Three Systems Behind Proactive Recall

Cowork doesn't have a "proactive recall" feature. The behavior — where it reminds you of something you forgot, or surfaces relevant context you didn't ask for — emerges from three independent systems working together.

### System 1: Auto-Memory (Persistence Between Sessions)

**What it does:** Gives the model access to information it learned in previous sessions, so it doesn't start from zero every conversation.

**How it works mechanically:**

- Cowork writes markdown files to a `.auto-memory/` folder on disk.
- There is an index file, `MEMORY.md`, that acts as a table of contents. The first 200 lines of this file are loaded automatically at the start of every session — before the user says anything.
- Additional topic-specific files (e.g., `feedback_testing.md`, `project_widget.md`) live alongside `MEMORY.md`. These are NOT auto-loaded. The model reads them on-demand during a session using the Read tool, but only if something in `MEMORY.md` or the conversation points it there.
- Memory files are plain markdown with YAML frontmatter (name, description, type). No database, no embeddings, no vector search.

**What gets stored:**

- User preferences and behavioral patterns
- Project context and decisions
- Feedback and corrections from the user
- References to external systems and resources

**What does NOT get stored:**

- Code patterns or architecture (derivable from the codebase)
- Git history (derivable from git)
- Ephemeral task state or conversation context
- Debugging solutions (the fix is in the code)

**How the model decides what to remember:**

- The model uses its own judgment during a session to decide if something is worth persisting. Not every session generates a memory write.
- The user can explicitly say "remember this" and the model will save it immediately.
- The user can say "forget this" and the model will find and remove the entry.

**Limitations:**

- Memory is machine-local — doesn't sync across devices.
- There is no semantic search over memories. Retrieval depends on the model reading `MEMORY.md`, recognizing a relevant pointer, and then reading the linked file. If the pointer isn't clear, or the model doesn't make the connection, the memory won't surface.
- The 200-line cap on `MEMORY.md` means the index must stay concise. Verbose entries push useful pointers out of the auto-loaded window.

**What Brain should take from this:**

The core pattern is sound — durable persistence that loads automatically at session start. But the flat-file, no-index, no-search approach is fragile. Brain should replace this with structured domain tables exposed as MCP tools (`search_memories`, `get_person`, `get_project_summary`). The model shouldn't need to guess which file to read based on a markdown pointer — it should call a tool with a query and get structured results with provenance.

---

### System 2: Scheduled Tasks (Periodic Enrichment)

**What it does:** Runs autonomous sessions on a schedule to pull data from external sources (email, Slack, calendar) and write updated summaries to the workspace. This is the "data pipeline" that keeps context fresh without requiring the user to manually update anything.

**How it works mechanically:**

- A scheduled task is a self-contained prompt stored as a skill file. It includes: the objective, specific steps, file paths, MCP connections to use, and expected output.
- Tasks fire on a cron schedule (e.g., `0 8 * * *` for 8am daily) or as a one-time trigger.
- Each run spawns a **completely fresh session**. It has no access to the prior conversation, no auto-memory, no inherited state. The task definition must embed everything the session needs to do its job.
- The task calls MCP tools (Gmail, Slack, Calendar) to read external data, processes it, and writes output files to the workspace folder.
- Then the session ends. It does not "push" anything into the next conversation.

**The connection to auto-memory:**

The scheduled task is a **producer** — it writes files. The next conversation is a **consumer** — it reads files. The link between them is indirect:

1. The scheduled task writes `project-summary.md` to the workspace.
2. A memory entry in `MEMORY.md` says something like: "Widget project summary is in project-summary.md — updated daily by scheduled scan."
3. In the next conversation, the model loads `MEMORY.md`, sees the pointer, and when the user mentions the widget project, the model reads `project-summary.md`.

Without that memory pointer, the model would have to list the directory, scan file names, and guess which one is relevant — which it might or might not do.

**What a typical daily email scan looks like:**

1. Cron fires at 8am.
2. Fresh session starts with the task prompt: "Read the last 24 hours of email via Gmail MCP. Update the project summary at `/path/to/project-summary.md`. Update the task list at `/path/to/tasks.md`. Flag any action items that need attention."
3. The session calls `gmail_search_messages` for recent emails, processes the results, and writes updated markdown files.
4. Session ends.

**Limitations:**

- The task is completely isolated. If the task needs context from the user's last conversation, that context must be embedded in the task prompt or available in files the task can read.
- Output is unstructured markdown. There's no schema, no provenance tracking, no confidence levels, no fact-vs-inference distinction.
- The user has no review step for what the task wrote. If it misinterprets an email and writes a wrong summary, that wrong summary gets consumed by the next conversation without challenge.

**What Brain should take from this:**

The scheduling pattern is the right idea — periodic ingestion keeps the knowledge substrate fresh without user effort. But Brain should improve on it in three ways: (1) ingestion writes to structured domain tables with provenance, not flat markdown files; (2) all AI-generated writes go through the memory write proposal workflow (the user reviews before persistence); (3) the event log captures what was ingested, what was proposed, and what was accepted — creating an audit trail Cowork doesn't have.

---

### System 3: Context Assembly at Query Time (The "Reminding" Part)

**What it does:** When the user makes a request, the model assembles relevant context from auto-memory, workspace files, and MCP tools — and then uses that context while responding. This is where the "proactive recall" behavior actually happens.

**How it works mechanically:**

This is NOT a retrieval engine or a search system. It's the model's own reasoning about what context it needs, using the tools available to it. The sequence looks like this:

1. Session starts. `MEMORY.md` (first 200 lines) is loaded automatically into context.
2. User says: "Write an email to Sam updating him on the widget project. Include these 3 items: item one, item two, item three."
3. The model sees "widget project" and checks its loaded memory. If there's a pointer like "widget project summary in project-summary.md," it reads that file.
4. Now the model has the user's 3 items PLUS the content of the project summary (which the scheduled task updated that morning). It notices something in the summary that's relevant but the user didn't mention.
5. The model drafts the email with the 3 requested items and adds: "You might also want to include X — I saw this in the project summary from this morning's emails."

**Why the model reads a file — the three triggers:**

There are only three reasons the model would read workspace files when you didn't explicitly ask it to:

1. **A memory pointer directed it there.** The auto-loaded `MEMORY.md` contains a reference to a relevant file. This is the most reliable trigger and the one that explains most "proactive recall" experiences.

2. **A system prompt or skill instructed it.** The CLAUDE.md or an active skill says something like "before writing emails, always review the project summary." The model follows the instruction.

3. **The model's own initiative.** The model decides it should look for context, runs `ls` to see what's in the folder, picks a file based on its name, and reads it. This is the least reliable trigger — there's no guarantee it will do this, no guarantee it picks the right file, and no structured mechanism guiding the choice. A file named `project-summary.md` might get read; a file named `notes-march.md` probably won't, even if it contains the same information.

**How the model picks WHICH file to read:**

It doesn't have a good mechanism for this. When directed by a memory pointer, it reads the specific file referenced. When browsing on its own, it's making a judgment call based on file names — no index, no metadata, no relevance scoring. This means proactive recall is reliable only when the pointer chain is intact: scheduled task writes file → memory entry points to file → model follows pointer.

**Limitations:**

- No semantic search over workspace files. The model can only find what it's pointed to or what it stumbles on by browsing.
- No relevance scoring. The model guesses based on file names and its own judgment.
- No domain scoping. The model can read anything in the workspace — there's no equivalent of Brain's mode-based access control.
- No provenance on the surfaced context. When the model says "you might want to include X," it doesn't cite which email or which sync event produced that information.

**What Brain should take from this:**

This is the biggest upgrade opportunity. Brain replaces the "pointer chain + model guessing" pattern with **structured tool-based retrieval**. Instead of the model reading `MEMORY.md`, finding a pointer, and opening a markdown file, it calls `search_tasks(project="widget")` or `get_person("Sam")` and gets structured results with source attribution. The model doesn't need to guess which file to read — it asks Brain a question and gets a scoped, cited answer. This makes proactive recall **designed and reliable** instead of emergent and fragile.

---

## How the Three Systems Create Proactive Recall Together

The full chain looks like this:

```
Scheduled Task (System 2)
  → Calls Gmail/Slack/Calendar MCPs
  → Writes updated files to workspace
  → Session ends

Auto-Memory (System 1)
  → MEMORY.md contains pointers to those files
  → Loaded at start of next session

Context Assembly (System 3)
  → User makes a request
  → Model sees relevant pointer in memory
  → Reads the file the scheduled task produced
  → Notices something the user missed
  → Surfaces it in the response
```

The "proactive recall" is an emergent behavior — not a feature. It works when the pointer chain is intact and the model follows it. It fails when any link breaks: the scheduled task didn't run, the memory pointer is missing or vague, the model doesn't recognize the relevance, or the file name doesn't suggest its content.

---

## Brain's Equivalent: Designed Proactive Recall

Brain should replace each system with a structured, reliable equivalent:

| Cowork System | Cowork Implementation | Brain Equivalent |
|---|---|---|
| **Auto-Memory** | Flat markdown files, 200-line index, no search | Structured domain tables exposed as MCP tools with search, filtering, and provenance |
| **Scheduled Tasks** | Isolated sessions writing unstructured markdown, no review step | Scheduled ingestion writing to structured tables via memory write proposals, with user review and event logging |
| **Context Assembly** | Model follows memory pointers or guesses based on file names | Agent calls structured retrieval tools (`search_tasks`, `get_person`, `get_project_summary`) with scoped access per mode |
| **Proactive Recall** | Emergent behavior from pointer chains — fragile, unreliable | Designed behavior from structured retrieval — the model always has the right tools to find what's relevant |

The key difference: Cowork's proactive recall depends on everything being set up just right (good file names, good memory pointers, the model choosing to look). Brain's proactive recall depends on the knowledge substrate being queryable and the agent having the right tools. The model's job shifts from "figure out where to look" to "ask the right question" — which is what models are good at.

---

## Additional Cowork Patterns Brain Should Adopt

The three systems above (auto-memory, scheduled tasks, context assembly) are the architectural backbone. But Cowork has several additional capabilities and patterns that the original analysis didn't cover. These are worth adopting — some directly, some with modifications.

### Pattern 4: The Two-Door Principle — Visual Artifacts, Not Just Conversation

**What Cowork does today:**

Cowork's workspace folder is a shared surface. Scheduled tasks write files there (project summaries, task lists, briefing documents). The user can open those files in Finder, VS Code, or any text editor. The agent reads them via the Read tool during sessions. Both sides — agent and human — operate on the same data through different interfaces.

This is primitive but important. A chat window is a keyhole into your own data. You can ask one question and get one answer, but you can't see the landscape. The workspace folder gives the user a visual surface — you can scan file names, open summaries, read them at a glance, even share them with someone else. The agent enters through one door (tool calls); you enter through another (the file system).

**What Brain should take from this:**

Brain's brief describes "bounded, reviewable experiences" — daily briefings, weekly reviews, open loops lists, suggested priorities — but frames them as generated text in a conversation. They should be **generated artifacts** — documents, tables, structured files — that persist in the workspace and that both the user and the agent can reference later.

Concretely:
- The **daily briefing** should be a generated markdown or HTML file, not a chat message. The user opens it, reads it, maybe annotates it. The agent references it later when the user asks "what was in this morning's briefing?"
- The **weekly review** should be a document the user can edit — adding their own notes, crossing things off, disagreeing with the agent's synthesis. The edited version becomes input for next week's review.
- The **open loops list** should be a persistent artifact that updates incrementally, not a one-shot generation that disappears after the conversation ends.
- The **review queue** (see below) should be a visual surface, not a conversational back-and-forth.

The principle: **every Brain output that the user needs to review, reference, or act on should exist as a file, not just a conversation turn.** Conversations are ephemeral. Files persist. Brain's value compounds over time — its outputs should too.

---

### Pattern 5: The Skill System — Editable Mode Definitions

**What Cowork does today:**

Cowork's skill system lets you define specialized behaviors as self-contained prompt files. A skill includes instructions, tool access rules, output format expectations, and sometimes example interactions. Skills are plain text files in a `.claude/skills/` directory. The user can read, edit, create, or delete them.

Skills are the mechanism behind Cowork's ability to behave differently depending on the task — brainstorming mode, product management mode, coding mode. Each skill shapes the model's behavior without requiring architectural changes.

**What Brain should take from this:**

Brain's modes (Task, Memory, Coaching) are functionally skills. Each mode defines: which domain tables the agent can access, which tools it can call, what its retrieval scope is, and how it should behave (e.g., coaching mode grounds insights in cited source memories). The brief describes these as architectural constructs — "the agent's access scope changes depending on the active mode."

But the implementation should be **editable skill files**, not hardcoded configurations. Reasons:

- **Iteration speed.** If the coaching mode isn't asking the right questions or surfacing the right context, the user should be able to open the skill file and adjust it — change the prompt, add a new retrieval instruction, modify the output format — without touching the MCP server or the data model.
- **New modes without architecture changes.** The user might want a "planning mode" that accesses tasks, goals, and calendar signals together. Or a "relationship prep mode" before a meeting that pulls relationship context, recent interactions, and open items for a specific person. These should be new skill files, not new code.
- **Transparency.** The user can read exactly what each mode does. No black-box behavior. This aligns with Brain's "user owns everything" principle — the user owns the agent's behavior definitions, not just the data.

The MCP server enforces the **permissions** (which tools each mode can call, what domain tables are accessible). The skill files define the **behavior** (how the agent reasons, what it prioritizes, how it formats output). This separation means the trust layer stays in the server while the UX layer stays editable.

---

### Pattern 6: Multi-MCP Orchestration — The Agent Calls Multiple Servers

**What Cowork does today:**

Cowork can connect to multiple MCP servers simultaneously. In a single session, the agent can call tools from Gmail MCP, Google Calendar MCP, Slack MCP, Linear MCP, OB1, and any other connected server. The agent orchestrates across these servers as needed — reading from one, reasoning, then writing to another.

This is more powerful than it looks. It means the agent isn't limited to a single tool's context. It can read an email via Gmail MCP, check the calendar for related meetings via Calendar MCP, search existing tasks via Brain's MCP server, and then propose a new task with full provenance — all in one reasoning chain.

**What Brain should take from this:**

Brain's brief treats integrations as data pipes — Gmail, Calendar, and Slack "flow data in" during scheduled ingestion. But the multi-MCP pattern means Brain's agent can orchestrate across multiple servers **at query time**, not just during ingestion.

Implications for Brain's architecture:

- **Ingestion tasks become lightweight orchestrators.** The daily scan doesn't need to be a monolithic script that pulls all data, processes it, and writes results. It can be a scheduled task that calls Gmail MCP → reads emails → calls Brain MCP → searches for related existing context → reasons about what's new → calls Brain MCP's write-proposal tool → proposes updates. The intelligence lives in the agent's reasoning across multiple MCP calls, not in a custom ingestion pipeline.
- **Query-time enrichment.** When the user asks "what's the latest on the Acme project?", the agent can call Brain's `search_tasks` and `search_memories` tools for stored context AND call Gmail MCP for recent emails AND call Slack MCP for recent messages — all in one response. The brief's "multi-step retrieval" concept should explicitly include cross-MCP retrieval, not just cross-domain retrieval within Brain's own tables.
- **Brain's MCP server doesn't need to store everything.** If the agent can query Gmail directly at any time, Brain doesn't need to ingest and duplicate every email. Brain stores the *derived intelligence* (extracted tasks, relationship signals, decision context) while the raw data stays in the source system. This reduces storage complexity and avoids the stale-copy problem.

**Design constraint:** Multi-MCP orchestration at query time means latency can stack. Brain should distinguish between **fast queries** (single-domain, Brain MCP only, sub-3-second target) and **deep queries** (multi-MCP, cross-source synthesis, user expects to wait). The UX should signal which type of query is running.

---

### Pattern 7: Auto-Memory Scope Boundary — Instructions vs. Knowledge

**What Cowork does today:**

Auto-memory stores everything the model decides is worth persisting between sessions: user preferences, project context, behavioral corrections, reference pointers, relationship details. It's a flat namespace — all memories are peers, differentiated only by type tags in YAML frontmatter.

**Where this breaks for Brain:**

If Brain uses both auto-memory (Cowork's session-bridging system) and its own MCP-backed domain tables (the structured knowledge substrate), there's a scope overlap problem. The model might write a fact to auto-memory ("Bob is Brandon's manager") AND write a relationship entry to Brain's domain table with slightly different wording ("Bob — manager, met at onboarding"). Now there are two sources of truth that can drift apart. The model doesn't have a reliable mechanism to keep them in sync, and when they conflict, it doesn't know which one wins.

**What Brain should take from this — a hard scope boundary:**

Auto-memory and Brain's domain tables must have **non-overlapping responsibilities**:

| Auto-Memory (Cowork) | Brain Domain Tables (MCP Server) |
|---|---|
| **Instructions to the model** — behavioral preferences, formatting rules, corrections ("don't summarize at end of responses"), active project focus, session-bridging context | **Knowledge to retrieve** — facts, decisions, relationships, tasks, reflections, goals, learning resources, historical context |
| Persists in `.auto-memory/` as markdown files | Persists in Supabase/Postgres via MCP tools |
| Loaded automatically at session start (first 200 lines of MEMORY.md) | Retrieved on-demand via tool calls (`search_memories`, `get_person`, etc.) |
| The user edits directly or via "remember this" / "forget this" | All writes go through the memory write proposal workflow |
| **Should NOT contain facts, relationships, or domain knowledge** | **Should NOT contain behavioral instructions or formatting preferences** |

The operating principle: **auto-memory shapes how the agent behaves; Brain's domain tables provide what the agent knows.** Auto-memory is a cache of intent. Brain is the knowledge substrate. They complement each other only if they don't overlap.

If auto-memory drifts and contains stale knowledge (e.g., an old project summary), the model may use it instead of querying Brain's up-to-date domain table — because auto-memory is loaded first and the model may not realize it needs to verify against the database. This is a subtle but real failure mode that Brain should guard against by keeping auto-memory scoped strictly to behavioral instructions.

---

## Part 2: UX Features & Product Design Decisions

_Research conducted 2026-04-05. Sources cited inline._

The first part of this document reverse-engineers Cowork's backend mechanics. This section maps the **user-facing features and product design decisions** that make Cowork a successful product — the things a user sees, touches, and builds habits around.

---

### Feature 1: Projects — Persistent, Scoped Workspaces

**What it is:** Projects let users organize related tasks into persistent, self-contained workspaces. Each project has its own folder, files, instructions, memory, and scheduled tasks — a complete working environment for ongoing or recurring work.

**How it works:**
- User creates a project, names it, selects a local folder, and adds instructions (tone, formatting, rules)
- Can attach additional context: local folders, linked chat projects, URLs for Claude to reference
- Memory is scoped to the project — what Claude learns in one project doesn't carry to others
- Scheduled tasks can be tied to specific projects
- Files in the project folder are accessible to Claude via the Read tool

**Why it matters:**
Without a project, every Cowork session is relatively isolated — no memory, no custom instructions, no scheduled tasks. The project is the container that turns Cowork from a task runner into a **persistent workspace**. The key insight: projects solve the "re-explaining yourself" problem. Instead of restating context every session, you set it once and Claude carries it forward.

**The design decision:** Project-scoped memory, not global memory. This is deliberate — it prevents context bleed between unrelated work streams and gives the user explicit control over what Claude knows in each context.

_Sources: [Organize your tasks with projects in Cowork](https://support.claude.com/en/articles/14116274-organize-your-tasks-with-projects-in-cowork), [Claude Cowork Just Got Projects](https://artificialcorner.com/p/cowork-projects), [Claude Cowork Projects: The Feature That Turns Cowork Into a Real Business OS](https://nicholasrhodes.substack.com/p/claude-cowork-projects-business-os)_

---

### Feature 2: The Customize Section — Unified Extension Directory

**What it is:** A single left-sidebar menu that groups skills, plugins, connectors, and scheduled tasks in one place. This is the control surface for everything that extends Claude's capabilities.

**Components:**

| Component | What It Does | Invocation Model |
|---|---|---|
| **Skills** | Saved workflows and domain knowledge. Claude auto-invokes when relevant based on task context | Model-invoked (automatic) |
| **Connectors** | MCP connections to external apps (Gmail, Notion, Slack, Calendar, Figma, etc.) | Tool-invoked (Claude calls when needed) |
| **Plugins** | Bundles of skills + connectors + sub-agents, packaged for a specific role or domain | Installed as a unit, components invoke individually |
| **Scheduled Tasks** | Recurring prompts that run on a cron cadence | Time-invoked (automatic) |

**How users interact:**
- Browse and install skills/plugins from a directory (one-click install)
- Toggle skills on/off without uninstalling
- Connectors require authentication setup (OAuth for services like Gmail, Notion)
- Customize any installed plugin by clicking "Customize" — Claude opens a conversation to walk through tailoring

**Why it matters:**
The Customize section solves the discovery problem. Instead of requiring users to know what MCP servers exist, how to configure them, or how to write skills files, it presents a unified storefront. The UX pattern is App Store, not config file. This dramatically lowers the barrier to extending Claude's capabilities.

_Sources: [Browse skills, connectors, and plugins in one directory](https://support.claude.com/en/articles/14328846-browse-skills-connectors-and-plugins-in-one-directory), [Claude Cowork Guide 2026](https://findskill.ai/blog/claude-cowork-guide/)_

---

### Feature 3: The Plugin System — Role-Based Capability Bundles

**What it is:** Plugins bundle skills, connectors, slash commands, and sub-agents into a single installable package tailored for a specific role or domain. Instead of assembling pieces individually, you install one plugin and Claude becomes a specialist.

**Architecture:**
```
plugin-name/
├── .claude-plugin/
│   └── plugin.json      # Plugin manifest (name, version, description)
├── .mcp.json             # MCP tool connections (Notion, Gmail, Slack, etc.)
├── commands/             # Slash commands (explicit user invocation)
└── skills/               # Domain knowledge (auto-triggered by Claude)
```

**Available domains:** Sales, finance, legal, marketing, HR, engineering, design, operations, data analysis, product management, and more. Anthropic maintains an open-source repository of knowledge-work plugins.

**Sub-agents within plugins:** Plugins can spawn parallel workers (sub-agents) that handle pieces of a task. This means a single plugin can orchestrate multi-step workflows — e.g., a finance plugin that pulls data from one connector, analyzes it using a skill, and writes a report using another.

**The design decision:** File-based and fully editable. Every component of a plugin is a plain text file the user can read, modify, or extend. No black-box behavior. This is the same philosophy as Claude Code's skill system — transparency over magic.

**Why it matters:**
Plugins are the distribution mechanism for institutional knowledge. An organization can encode its workflows, best practices, and tool connections into a plugin and deploy it to every employee. The zero-code, install-and-go UX means adoption doesn't require technical literacy.

_Sources: [Customize Cowork with plugins](https://claude.com/blog/cowork-plugins), [Use plugins in Cowork](https://support.claude.com/en/articles/13837440-use-plugins-in-cowork), [anthropics/knowledge-work-plugins on GitHub](https://github.com/anthropics/knowledge-work-plugins), [Claude Cowork Plugins guide](https://aiblewmymind.substack.com/p/claude-cowork-plugins-guide)_

---

### Feature 4: Dispatch — Mobile-to-Desktop Task Assignment

**What it is:** A single continuous conversation thread that spans your phone and desktop. You assign a task from the Claude mobile app; Claude executes it on your desktop using Cowork's full capability set (files, MCP connectors, computer use). You come back to find the work done.

**How it works:**
- User sends a task from the Claude mobile app
- Claude Desktop receives the task and executes it using all available tools — local files, MCP connectors, desktop applications
- The conversation thread persists across devices — context, history, and Claude's understanding carry across seamlessly
- All MCP connectors configured in Claude Desktop are available to Dispatch tasks

**Requirements:** Claude Desktop app running + Claude mobile app. Pro or Max plan. Computer must be awake.

**Why it matters:**
Dispatch solves the "I thought of something but I'm not at my desk" problem. The key insight is the **persistent conversation thread** — it's not "send a task and get a result." It's the same ongoing conversation, just accessed from a different device. This makes it feel like a real assistant that you hand things to, not a stateless API you ping.

**The design decision:** Dispatch inherits the full Cowork environment, not a reduced-capability mobile mode. This means the user doesn't have to think about what Claude can and can't do from their phone — the answer is "everything it can do at your desk."

_Sources: [Assign tasks to Claude from anywhere in Cowork](https://support.claude.com/en/articles/13947068-assign-tasks-to-claude-from-anywhere-in-cowork), [Put Claude to work on your computer](https://claude.com/blog/dispatch-and-computer-use), [Claude Cowork Dispatch 101](https://www.datacamp.com/tutorial/claude-cowork-dispatch)_

---

### Feature 5: Computer Use — Desktop Application Control

**What it is:** Claude can see, navigate, and control desktop applications — clicking buttons, opening apps, filling spreadsheets, navigating dashboards, and completing multi-step workflows without human intervention. Available on Mac and Windows (Windows added April 3, 2026).

**Capabilities:**
- Open and navigate applications (Excel, browsers, internal tools)
- Click UI elements, fill forms, navigate web pages
- Work with local files without configuration
- Execute multi-step workflows across applications
- Available in both Cowork and Claude Code

**Why it matters:**
Computer use bridges the gap between "tools Claude has connectors for" and "tools Claude doesn't." If there's no MCP server for an internal dashboard, Claude can still interact with it by controlling the desktop. This makes Cowork useful for enterprise workflows that rely on proprietary or legacy software.

**Security consideration:** Anthropic cannot remotely disable computer use mid-operation. They advise against use alongside applications handling sensitive data. Researchers have demonstrated prompt injection attacks via file content during computer use sessions.

_Sources: [Let Claude use your computer in Cowork](https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork), [Claude Cowork and Claude Code Can Now Control Your Windows Desktop](https://winbuzzer.com/2026/04/04/anthropic-claude-desktop-control-windows-cowork-dispatch-xcxwbn/)_

---

### Feature 6: Scheduled & Recurring Tasks

**What it is:** Write a prompt once, pick a cadence (daily, weekly, monthly), and Claude runs it automatically. No code or APIs required. Tasks can be standalone or tied to a specific project.

**How it works:**
- User writes a natural-language task prompt
- Sets a cadence (cron schedule or one-time)
- Each run is a fresh, isolated session — no inherited conversation state
- Tasks can call any configured MCP connectors (Gmail, Slack, Calendar)
- Output is written to the project workspace (files, summaries, reports)

**Constraint:** Tasks only run while the computer is awake and Claude Desktop is open.

**Common patterns (from user reports):**
1. Daily email digest — scan inbox, extract action items, write summary
2. Weekly project status report — aggregate across connectors
3. Daily calendar briefing — pull today's meetings, prep context
4. Recurring data monitoring — check dashboards, flag anomalies
5. Content pipeline — draft posts, summaries, or updates on schedule
6. Team sync prep — pull Slack highlights and Linear updates before standup

**Why it matters:**
Scheduled tasks turn Cowork from a reactive tool (you ask, Claude answers) into a **proactive system** (Claude produces value without being asked). The "write once, run forever" pattern is the core habit loop — users set up tasks and then receive value daily without additional effort. This is the single strongest retention mechanism in the product.

_Sources: [Schedule recurring tasks in Cowork](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-cowork), [Claude Cowork scheduled tasks: 6 ways I automated my work](https://aiblewmymind.substack.com/p/claude-cowork-scheduled-tasks-6-ways)_

---

### Feature 7: Memory — Cross-Session Context Persistence

**What it is:** Claude remembers context from past sessions and applies it to future work. Memory is project-scoped — each project has its own memory, preventing cross-contamination.

**How it works:**
- Claude writes markdown files to a `.auto-memory/` directory with a `MEMORY.md` index
- First 200 lines of `MEMORY.md` are loaded automatically at session start
- Topic-specific memory files are read on-demand during sessions
- Users can explicitly say "remember this" or "forget this"
- The model uses its own judgment about what's worth persisting

**What gets remembered:** User preferences, project decisions, behavioral corrections, reference pointers, relationship details.

**What doesn't get remembered:** Code patterns (derivable from codebase), git history, ephemeral task state, debugging solutions.

**Why it matters:**
Memory is what makes Claude feel like **your** assistant rather than **an** assistant. Without it, every session starts from zero and the user must re-establish context. With it, Claude builds a working model of the user's preferences, projects, and priorities over time. The project-scoping decision is critical — it prevents the "Claude mentioned my personal project in a work context" failure mode.

_Sources: [Get started with Cowork](https://support.claude.com/en/articles/13345190-get-started-with-cowork), [How Claude's memory and MCP work (and when to use each)](https://www.mintlify.com/blog/how-claudes-memory-and-mcp-work)_

---

### Feature 8: MCP Connectors — External Tool Integration

**What it is:** Model Context Protocol (MCP) connections that let Claude reach into external services — Gmail, Google Calendar, Notion, Slack, Figma, Google Drive, DocuSign, FactSet, and more.

**How it works:**
- Connectors are configured in the Customize section or within plugins
- Each connector handles authentication (typically OAuth)
- Claude calls connector tools during sessions when the task requires external data
- Multiple connectors can be active simultaneously — Claude orchestrates across them in a single reasoning chain

**Enterprise-specific:** Organizations can deploy custom connectors alongside plugins, encoding institutional tool access patterns across their teams.

**Why it matters:**
Connectors are what make Cowork more than a chatbot. Without them, Claude only knows what you tell it in the conversation. With them, Claude can read your email, check your calendar, search your docs, and pull data from your tools — all within the context of a task. The multi-MCP orchestration pattern (reading from Gmail, cross-referencing with Calendar, writing to Notion) is where the compound value emerges.

_Sources: [Claude Cowork MCP Integration Guide](https://fast.io/resources/claude-cowork-mcp-integration/), [Plugins and Connectors: Extending Cowork's Reach](https://agentfactory.panaversity.org/docs/General-Agents-Foundations/general-agents/plugins-and-connectors)_

---

## Product Design Decisions That Drive Success

Beyond individual features, Cowork makes several high-level design decisions that shape the overall product experience:

### 1. "Describe Outcome, Come Back to Finished Work"

The core UX paradigm shift from Chat: you don't babysit individual steps. You describe what you want done, and Cowork executes autonomously. This changes the user's mental model from "conversation partner" to "capable assistant." The trust required is higher, but the value per interaction is dramatically higher too.

### 2. Context Engineering Over Prompt Engineering

Cowork shifts the user's job from writing clever prompts to **designing the environment** — which files to include, which connectors to enable, what instructions to set, what skills to install. The quality of Claude's output is determined by the quality of its context, not the quality of one prompt. This is a more durable skill for users to develop.

### 3. File-Based Everything

Skills, plugins, memory, connectors, project instructions — all plain text files. Users can read, edit, version, and share them. No database UI, no opaque config screens. This creates transparency (you always know what Claude knows) and composability (you can remix components across plugins).

### 4. Progressive Capability Disclosure

New users start with simple Cowork tasks (no project, no plugins). Then they discover Projects for persistence. Then Plugins for role specialization. Then Scheduled Tasks for automation. Then Dispatch for mobile. Then Computer Use for desktop control. Each layer adds capability without requiring the previous layer to be mastered. The product grows with the user's sophistication.

### 5. Reusable Skills as Distributable Assets

A skill file is a shareable artifact. Write it once, distribute it to anyone — they install it in one click and get the same capability. This turns individual workflow knowledge into organizational infrastructure. For enterprises, this is the mechanism for encoding best practices at scale.

### 6. Local-First, User-Owns-Everything

Files live on the user's machine. Memory is stored locally. Connectors are configured locally. There is no server-side data lake of user behavior. This is a deliberate trust decision — it limits Anthropic's data moat but builds user confidence in the product for sensitive use cases (legal, finance, HR, executive work).

### 7. The "Always Running" Desktop Presence

Cowork requires Claude Desktop to be running. This isn't just a constraint — it's a design choice. It means Claude is always available in the system tray, always ready to accept a Dispatch task, always running scheduled tasks. The desktop app creates the ambient presence that turns Claude from "a tool I open" into "an assistant that's always there."

---

## Summary: Cowork's Feature Stack

| Layer | Features | What It Enables |
|---|---|---|
| **Core** | Agentic task execution, conversation UI | Autonomous multi-step work |
| **Persistence** | Projects, memory, file workspace | Context that compounds over time |
| **Extension** | Skills, connectors, plugins, Customize directory | Domain specialization and external tool access |
| **Automation** | Scheduled tasks, recurring prompts | Proactive value delivery without user effort |
| **Mobility** | Dispatch, persistent conversation threads | Assign work from anywhere |
| **Desktop Control** | Computer use, application navigation | Bridge to tools without MCP connectors |
| **Distribution** | Plugin marketplace, shareable skills, enterprise deployment | Organizational knowledge at scale |

Each layer builds on the previous. The retention flywheel: **Projects create persistence → Memory creates personalization → Plugins create specialization → Scheduled tasks create daily habit → Dispatch creates ubiquity → All of this compounds into switching cost.**
