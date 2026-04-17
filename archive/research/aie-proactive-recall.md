# AI/Evolution Project — Architecture & Proactive Recall

**Date:** 2026-04-08
**Source:** Research session analyzing `/Users/brandonupchuch/Projects/Leakey/AI-Evolution`

---

## What It Is

AI/Evolution is not a software product — it's a project management workspace for an invite-only dinner event (April 14, 2026 at Gordon Getty's SF residence, hosted by The Leakey Foundation). The "product" is the system Brandon built to manage it: a combination of workspace files, a scheduled Claude agent, and Gmail integration — all working together so Claude has enough context to be a genuine project manager, not just a chatbot.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  AI/Evolution Workspace (project folder)                │
│  ├── AI-Evolution_Project_Summary.md  (source of truth) │
│  ├── AI-Evolution_Task_List.xlsx      (task tracker)    │
│  ├── Stakeholders.md                  (contact list)    │
│  ├── Update_Log.md                    (append-only log) │
│  ├── Email Sync Reports/              (daily archives)  │
│  └── CLAUDE.md                        (agent behavior)  │
└─────────────────────────────────────────────────────────┘
         ↑ reads/writes
         │
┌────────┴──────────┐
│ AIE Daily Sync    │
│ (scheduled agent) │
│ scans Gmail →     │
│ updates files     │
└───────────────────┘
```

---

## The AIE Daily Sync — Step by Step

The sync is a scheduled Claude Code agent defined at `~/Documents/Claude/Scheduled/aie-daily-sync/SKILL.md`. It runs daily and does this:

1. **Determines scan window** — reads filenames in `Email Sync Reports/` to find the last report date. That's where it picks up.

2. **Scans Gmail** — searches for emails matching:
   - Any address in `Stakeholders.md` (minus contacts in the "Omit from email scan" section)
   - Subject keywords: "AI/Evolution", "Leakey dinner", "April 14", "Getty", etc.
   - Emails from Brandon himself about the event
   - Filters out: internal scheduling threads, automated fundraising emails (patterns logged in `Email_Filter_Review.md`)

3. **Compiles a sync report** — for each relevant email, extracts decisions, action items, guest list changes, and logistics updates. Writes to `Email Sync Reports/Email_Sync_Report_YYYY-MM-DD.md`.

4. **Updates all project files:**
   - **Project Summary** — adds new information (participants, milestones, open items), updates "Last Updated" date
   - **Update Log** — appends a dated entry (additive, never overwrites the summary's history)
   - **Task List (Excel)** — backs up first (`AI-Evolution_Task_List_backup_YYYY-MM-DD.xlsx`), then updates Status (col G), AI Notes (col I), and Last Updated (col J) columns via openpyxl; adds new task rows for work surfaced in emails

5. **Reports to Brandon** — what's new since last sync, urgent items, guest status, which Excel rows changed, link to the full sync report.

The design is **additive and non-destructive** — it appends to the Update Log rather than modifying the Project Summary's history, and always backs up Excel before writing.

---

## How Proactive Recall Works

This is the key insight: **proactive recall is not a coded feature.** There is no `proactiveRecall()` function, no RAG pipeline, no retrieval algorithm. It is emergent behavior from two layers of context engineering.

### Layer 1: Fresh Context (Daily Sync)

The sync agent keeps project files current. So when Brandon sits down, the Project Summary already contains up-to-date information. For example, after the April 7-8 sync:

- 6 new action items from last night's emails
- "Send AI/Evolution charter to Richard Hsu" (from Sharal's breakfast meeting)
- "Crypto donation wallet setup" (from Sharal/Meredith thread)
- "Wrangham video questions" (Arielle approaching Wrangham)
- Guest list at 8 confirmed, 3 pending leads

This information was extracted from Gmail overnight and written into the project files before Brandon ever opened a session.

### Layer 2: Behavioral Instructions (CLAUDE.md)

The workspace CLAUDE.md tells Claude two things that make proactive recall work:

**1. Always check project files first:**
> `AI-Evolution_Project_Summary.md` — single source of truth for the project. Check this before Gmail or any other source.
> `AI-Evolution_Task_List.xlsx` — the complete, prioritized task list with due dates, owners, and status. Check this at the start of any session focused on the dinner.

**2. Be proactive about surfacing things:**
> Keep Brandon focused on what matters most for a successful event — flag blockers, open items, and upcoming deadlines proactively.

### How the "4th Item" Actually Happens

When Brandon says: *"Draft an email to Sharal. 3 items: seating update, Wrangham video status, reschedule our call."*

Claude does this:

1. **Loads project context** — reads the Project Summary per CLAUDE.md instructions
2. **Sees Sharal's open items** — the summary lists action items from last night's emails, including "Send AI charter to Richard Hsu" (which Sharal promised Hsu that Brandon would send)
3. **Cross-references** — Brandon listed 3 items. The charter-to-Hsu item involves Sharal, is time-sensitive, and Brandon didn't mention it.
4. **Surfaces it** — "You mentioned 3 items. You also have an open item from Sharal's Apr 7 meeting with Richard Hsu — she told him you'd send the AI charter. Want me to add that?"

The proactive recall works because:
- **The daily sync made the information available** (it was in last night's emails, now written into the project files)
- **CLAUDE.md told Claude to check the project files first** (so it reads before drafting)
- **CLAUDE.md told Claude to flag things proactively** (so it doesn't wait to be asked)

No semantic search, no vector retrieval, no Brain MCP. The context is right there in the workspace documents that Claude was instructed to read.

---

## Why This Works

| Component | What it contributes |
|---|---|
| Daily sync agent | Keeps project files fresh from Gmail — no manual updates needed |
| Project Summary | Single source of truth with open items, guest status, decisions |
| Task List (Excel) | Structured tracker with priorities, owners, due dates |
| CLAUDE.md | Behavioral rules: check files first, flag proactively, match tone |
| Update Log | Append-only history so nothing gets silently overwritten |
| Email Sync Reports | Archived daily reports for audit trail and scan window tracking |
| Stakeholders.md | Contact list that drives Gmail search scope |

### The Pattern

The system is **context engineering** — not a retrieval algorithm. It works because:

1. A scheduled agent keeps workspace documents current (daily sync from Gmail)
2. Behavioral instructions tell Claude to read those documents before acting
3. Behavioral instructions tell Claude to proactively surface what it finds

Every session starts with Claude having access to complete, current project state. Proactive recall is just Claude cross-referencing what Brandon says against what the project files already contain.

---

## Most Likely Failure Mode: The Project Summary Outgrows Itself

The proactive recall works because Claude reads one document and cross-references everything in it against what Brandon said. That document is currently 149 lines with a tight Open Items section. It's manageable. But the daily sync only adds — it doesn't prune.

Every sync appends new milestones, new open items, new guest list updates. Some items get struck through when resolved, but they stay in the file. Over weeks:

- **Open Items noise:** The section goes from 6 items to 30. Claude has to distinguish which are still live vs. which are stale-but-not-removed. The "4th item" suggestion starts competing with noise — Claude might surface something that was resolved two weeks ago but never cleaned up.

- **Milestone bloat:** The Milestones section (already the longest part of the file) keeps growing. Context that was important in February is dead weight in April but still consuming attention.

- **Signal degradation:** The signal that makes proactive recall sharp — a small, current set of open items — degrades into a long list where everything looks equally important.

The Update Log was separated out to address exactly this problem (the Project Summary notes: "Chronological update log moved to `Update_Log.md` to reduce context size"). Good instinct. But the same pressure is still building in the Open Items and Milestones sections of the summary itself.

### The Fix: Periodic Pruning in the Daily Sync

Add a pruning step to the daily sync agent that:

1. **Archives resolved Open Items** — struck-through or DONE items get moved to `Archive/Resolved_Items.md` with a one-line resolution summary. Removed from the Project Summary.
2. **Compresses old Milestones** — anything older than 3 weeks gets reduced to a one-liner in the summary, with full detail moved to `Archive/Milestone_History.md`.
3. **Flags stale items** — anything in Open Items for 14+ days with no sync report update gets flagged for manual review (not auto-archived — it might still be live).
4. **Logs what it pruned** — a "Context Pruning" section in the sync report so Brandon can audit.

This keeps the Project Summary focused on current state — the condition that makes proactive recall work — while preserving full history in archive files Claude can read on demand.

---

## Key Files

| File | Location | Purpose |
|---|---|---|
| CLAUDE.md | `AI-Evolution/CLAUDE.md` | Agent behavioral instructions |
| Project Summary | `AI-Evolution/AI-Evolution_Project_Summary.md` | Source of truth |
| Task List | `AI-Evolution/AI-Evolution_Task_List.xlsx` | Structured task tracker |
| Stakeholders | `AI-Evolution/Stakeholders.md` | Contact list + Gmail search scope |
| Update Log | `AI-Evolution/Update_Log.md` | Append-only sync history |
| Daily Sync Skill | `~/Documents/Claude/Scheduled/aie-daily-sync/SKILL.md` | Scheduled agent definition |
| Sync Reports | `AI-Evolution/Email Sync Reports/` | Daily archived reports |
