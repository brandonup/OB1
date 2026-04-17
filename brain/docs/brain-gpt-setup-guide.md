# Brain in ChatGPT — Setup Guide

Connect your Open Brain to a Custom GPT so you can capture and search thoughts from ChatGPT.

---

## Step 1: Deploy the brain-api Edge Function

In your terminal:

```bash
supabase functions new brain-api
```

(Say `n` to both IDE prompts.)

Then write the code to the file. Open `brain-api-index.ts` from your planning folder, copy its contents, and paste into:

```
~/supabase/functions/brain-api/index.ts
```

Or use the command below (copy the file contents to your clipboard first):

```bash
pbpaste > ~/supabase/functions/brain-api/index.ts
```

Deploy:

```bash
supabase functions deploy brain-api --no-verify-jwt
```

Your API URL will be:
```
https://yueqgweyyajtymfarswm.supabase.co/functions/v1/brain-api
```

No new secrets needed — the function reuses `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MCP_ACCESS_KEY` that are already set.

---

## Step 2: Test the API

Verify it works before connecting ChatGPT. Replace `YOUR_MCP_ACCESS_KEY` with your actual key:

```bash
curl -X POST https://yueqgweyyajtymfarswm.supabase.co/functions/v1/brain-api/stats \
  -H "Authorization: Bearer YOUR_MCP_ACCESS_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

You should get back a JSON response with your thought count, types, topics, and people.

---

## Step 3: Create the Custom GPT

1. Go to [chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor)
2. Click **Create a GPT**

### Name & Description
- **Name:** Brain
- **Description:** Your personal second brain — captures, searches, and surfaces your thoughts.

### Instructions

Paste the following into the Instructions field:

```
You are Brandon's personal second brain: a persistent, proactive AI assistant with access to his thought database.

## Core Rules
- Before answering any question about past context, search the thought database first.
- When Brandon shares something worth remembering — a decision, goal, lesson, commitment, preference, idea — capture it proactively. Don't wait to be asked.
- When recalling information, cite the approximate date it was captured.
- If something in memory conflicts with what Brandon just said, flag the conflict.
- Be direct and action-biased. Make recommendations, not option lists.
- Never start with filler. No "Great question!" Just the answer.
- When Brandon mentions a deadline or commitment, capture it immediately.
- Bold key recommendations so they're scannable.
- Keep responses medium length (2-4 paragraphs) unless building a deliverable.

## How to use your tools
- Use searchThoughts before answering questions that might be informed by past context.
- Use captureThought when Brandon shares decisions, goals, lessons, commitments, ideas, or preferences.
- Use listThoughts to browse recent activity or filter by type/topic/person.
- Use getThoughtStats for a high-level overview of what's in the brain.
```

### Actions

1. Click **Create new action**
2. Under **Authentication**, select **API Key**, then:
   - **API Key:** paste your MCP_ACCESS_KEY
   - **Auth Type:** Bearer
3. Under **Schema**, paste the contents of `brain-gpt-openapi.json` from your planning folder
4. Click **Save**

### Privacy

- Set **Web Browsing** to off (not needed)
- Set **DALL-E Image Generation** to off (not needed)
- Set **Code Interpreter** to off (not needed)

---

## Step 4: Test It

Open your new Brain GPT and try:

- "What do I know about AI?" (should trigger searchThoughts)
- "Remember that I decided to focus on Kinetic this quarter" (should trigger captureThought)
- "Show me my recent thoughts" (should trigger listThoughts)
- "How many thoughts do I have?" (should trigger getThoughtStats)

---

## What You Built

Same brain database, new front door. Thoughts captured from ChatGPT are tagged with `source: "gpt"`, so you can tell them apart from Cowork (`source: "mcp"`) and Slack (`source: "slack"`) captures. All three entry points read and write to the same Supabase table.
