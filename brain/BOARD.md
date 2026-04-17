# Brain — Board

## Code Review

## In Progress

- **BRA-7** [H] 2-week daily capture with failure log (est: 2) #feature
  - 2026-04-06: Failure log created at `docs/failure-log.md`. Daily + weekly prompts delivered. Window: 2026-04-06 → 2026-04-20 — Jared
- **BRA-6** [M] Run Open Brain Spark for use-case discovery (est: 1) #feature
  - 2026-04-06: Prompt delivered for Brandon to run in Cowork — Jared

## Todo

## Backlog

- **BRA-8** [M] Run first Weekly Review (est: 1) #feature
  - Blocked by BRA-7
- **BRA-9** [H] Phase 3 gate — classify failure log and decide extension scope (est: 1) #feature
  - Blocked by BRA-7, BRA-8
- **BRA-10a** [H] Schema gap analysis + build core REST endpoints (est: 3) #feature
  - Blocked by BRA-3
  - Reconcile `lib/types.ts` schema expectations vs core `thoughts` table before writing endpoints
- **BRA-10b** [H] Build advanced REST endpoints — duplicates, ingest (est: 3) #feature
  - Blocked by BRA-10a
- **BRA-11** [H] Deploy Next.js Brain dashboard to Vercel (est: 2) #feature
  - Blocked by BRA-10a. Deploy via Vercel web dashboard (npx hard-blocked).

## Done

- **BRA-1** [U] Create Supabase project and run Brain schema SQL (est: 1) #feature (done 2026-04-05)
- **BRA-2** [U] Get OpenAI API key and generate MCP access key (est: 1) #feature (done 2026-04-05)
- **BRA-2a** [U] Merge server variants — OpenAI calls + dedup logic into one Edge Function (est: 2) #feature (done 2026-04-05)
- **BRA-3** [U] Deploy open-brain-mcp Edge Function (est: 1) #feature (done 2026-04-05)
- **BRA-4** [H] Connect Brain MCP to Claude Desktop, ChatGPT, Claude Code (est: 1) #feature (done 2026-04-06)
- **BRA-5** [H] Run Memory Migration on Claude and ChatGPT (est: 2) #feature (done 2026-04-06)

## Archive
