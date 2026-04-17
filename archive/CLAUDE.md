# Brain Project Instructions

These instructions apply to every session in this folder.

---

## What We're Building

**Brain** is a private, voice-first personal AI operating system for a single user. It captures tasks, memories, reflections, goals, relationships, learning, and decisions into separate structured domains, keeps those domains from bleeding into one another, and uses email, calendar, and Slack signals to suggest intelligent updates over time.

---

## Project Phase

We are currently in **Discovery & Definition** and **Planning & Design**. We are NOT yet building. Do not jump to implementation decisions unless I ask.

Work to be done in this phase:
- Sharpen the problem statement and user need
- Define MVP scope and sequence
- Map user journeys and key flows
- Identify open questions and resolve them
- Produce design artifacts: PRDs, user stories, journey maps, architecture briefs

---

## Core Design Principles (never violate these)

1. **Low friction capture.** If it takes more than 2 steps, it fails.
2. **No context bleed.** Domains stay separated unless explicitly bridged.
3. **Honest recall.** Never surface a guess as a fact. Show uncertainty.
4. **Recommend first, automate selectively.** Automation only when rule is explicit, confidence is high, and risk is low.
5. **User owns everything.** Full data portability and privacy. No training on user data.
6. **Augment, don't replace.** Brain makes existing tools smarter; it is not a task manager or calendar replacement.

---

## How to Work With Me on This Project

- **Lead with a recommendation**, not a list of options. Say "Here's what I'd do" and explain why.
- **Flag risks and red flags honestly.** If something is likely to fail or doesn't fit the principles above, say so directly.
- **Use deliverable formats when producing artifacts** — PRDs, user stories, journey maps, architecture briefs should be saved as files in this folder, not just shown inline.
- **Keep responses medium length** in conversation. Go long only when building a deliverable.
- **Bold key decisions and recommendations** so they're scannable.
- **No filler.** Don't start with "Great question!" or "That's a really interesting idea."
- When I say "defer this", create a Linear ticket for the item using the `defer-issue` skill.

---

## Skills to Use for This Project

| Task | Skill |
|------|-------|
| Sharpen problem statement | `problem-statement` or `problem-framing-canvas` |
| Define MVP scope | `prioritization-advisor` |
| Write feature specs / PRDs | `product-management:feature-spec` or `prd-development` |
| User stories | `user-story` or `epic-breakdown-advisor` |
| Journey mapping | `customer-journey-map` |
| Brainstorm features or flows | `brainstorming` |
| Competitive analysis | `product-management:competitive-analysis` |
| Research external context | `brandons-toolkit:research` |
| Roadmap planning | `roadmap-planning` |

---

## File Conventions

- Save all deliverables to `/brain/` folder
- Use clear naming: `brain-prd-[feature].md`, `brain-journey-[flow].md`, `brain-userStories-[domain].md`
- Never edit `.docx` files directly — regenerate from markdown
- `brain-requirements1.md` and `brain-requirements2.md` are read-only source-of-truth docs; don't overwrite them

