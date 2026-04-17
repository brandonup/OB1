# Slack → Brain Setup Guide

Adapted for your setup: OpenAI direct (not OpenRouter), Supabase project `yueqgweyyajtymfarswm`.

---

## What You're Building

A Slack channel where anything you type gets automatically embedded, classified, and stored in your brain — with a threaded reply confirming how it was categorized. Works from any device, any workspace where you install the app.

---

## Prerequisites

- Your Open Brain Supabase project (already running)
- Supabase CLI installed (`supabase --version` to check)
- A Slack workspace (free tier works)

---

## Credential Tracker

Fill this in as you go:

```
SLACK CAPTURE — CREDENTIAL TRACKER
--------------------------------------

ALREADY HAVE (from your Open Brain setup)
  Supabase project ref: yueqgweyyajtymfarswm
  OPENAI_API_KEY: (already in your Supabase secrets)

GENERATED DURING SETUP
  Slack channel name:    _______________
  Slack channel ID:      C_______________
  Bot OAuth Token:       xoxb-_______________
  Edge Function URL:     https://yueqgweyyajtymfarswm.supabase.co/functions/v1/ingest-thought
```

---

## Step 1: Create a Slack Capture Channel

1. In your Slack workspace, click **+** next to "Channels" → **Create new channel**
2. Name it `capture` (or whatever you prefer)
3. Set it to **Private** (this is your personal thought stream)
4. After creating, right-click the channel name → **View channel details** → scroll to the bottom to find the **Channel ID** (starts with `C`)
5. Write down the Channel ID — you'll need it in Step 3

---

## Step 2: Create the Slack App

### 2a. Create the App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. App Name: `Open Brain` (or whatever you want)
4. Select your workspace
5. Click **Create App**

### 2b. Set Permissions

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll to **Scopes → Bot Token Scopes**
3. Add these three scopes:
   - `channels:history` — read messages in public channels
   - `groups:history` — read messages in private channels
   - `chat:write` — post confirmation replies
4. Scroll back up and click **Install to Workspace** → **Allow**
5. Copy the **Bot User OAuth Token** (starts with `xoxb-`) — you'll need it in Step 3

### 2c. Add the Bot to Your Channel

In Slack, open your `#capture` channel and type:
```
/invite @Open Brain
```

**Don't set up Event Subscriptions yet** — you need the Edge Function URL first (Step 3).

---

## Step 3: Deploy the Edge Function

### 3a. Link Your Project

Open a terminal and run:

```bash
supabase login
supabase link --project-ref yueqgweyyajtymfarswm
```

### 3b. Create the Function

```bash
supabase functions new ingest-thought
```

### 3c. Replace the Code

Open `supabase/functions/ingest-thought/index.ts` and replace the entire contents with:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SLACK_BOT_TOKEN = Deno.env.get("SLACK_BOT_TOKEN")!;
const SLACK_CAPTURE_CHANNEL = Deno.env.get("SLACK_CAPTURE_CHANNEL")!;

const OPENAI_BASE = "https://api.openai.com/v1";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getEmbedding(text: string): Promise<number[]> {
  const r = await fetch(`${OPENAI_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  const d = await r.json();
  return d.data[0].embedding;
}

async function extractMetadata(
  text: string
): Promise<Record<string, unknown>> {
  const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Extract metadata from the user's captured thought. Return JSON with:
- "people": array of people mentioned (empty if none)
- "action_items": array of implied to-dos (empty if none)
- "dates_mentioned": array of dates YYYY-MM-DD (empty if none)
- "topics": array of 1-3 short topic tags (always at least one)
- "type": one of "observation", "task", "idea", "reference", "person_note"
Only extract what's explicitly there.`,
        },
        { role: "user", content: text },
      ],
    }),
  });
  const d = await r.json();
  try {
    return JSON.parse(d.choices[0].message.content);
  } catch {
    return { topics: ["uncategorized"], type: "observation" };
  }
}

async function replyInSlack(
  channel: string,
  threadTs: string,
  text: string
): Promise<void> {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, thread_ts: threadTs, text }),
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const body = await req.json();

    // Slack URL verification (one-time handshake)
    if (body.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: body.challenge }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = body.event;

    // Ignore non-message events, bot messages, and messages from other channels
    if (
      !event ||
      event.type !== "message" ||
      event.subtype ||
      event.bot_id ||
      event.channel !== SLACK_CAPTURE_CHANNEL
    ) {
      return new Response("ok", { status: 200 });
    }

    const messageText: string = event.text;
    const channel: string = event.channel;
    const messageTs: string = event.ts;

    if (!messageText || messageText.trim() === "")
      return new Response("ok", { status: 200 });

    // Deduplicate: Slack retries if response takes >3s
    const { data: existing } = await supabase
      .from("thoughts")
      .select("id")
      .contains("metadata", { slack_ts: messageTs })
      .limit(1);
    if (existing && existing.length > 0)
      return new Response("ok", { status: 200 });

    // Generate embedding and extract metadata in parallel
    const [embedding, metadata] = await Promise.all([
      getEmbedding(messageText),
      extractMetadata(messageText),
    ]);

    // Insert into your brain
    const { error } = await supabase.from("thoughts").insert({
      content: messageText,
      embedding,
      metadata: { ...metadata, source: "slack", slack_ts: messageTs },
    });

    if (error) {
      console.error("Supabase insert error:", error);
      await replyInSlack(
        channel,
        messageTs,
        `Failed to capture: ${error.message}`
      );
      return new Response("error", { status: 500 });
    }

    // Post confirmation reply in thread
    const meta = metadata as Record<string, unknown>;
    let confirmation = `Captured as *${meta.type || "thought"}*`;
    if (Array.isArray(meta.topics) && meta.topics.length > 0)
      confirmation += ` — ${meta.topics.join(", ")}`;
    if (Array.isArray(meta.people) && meta.people.length > 0)
      confirmation += `\nPeople: ${meta.people.join(", ")}`;
    if (Array.isArray(meta.action_items) && meta.action_items.length > 0)
      confirmation += `\nAction items: ${meta.action_items.join("; ")}`;

    await replyInSlack(channel, messageTs, confirmation);
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("Function error:", err);
    return new Response("error", { status: 500 });
  }
});
```

### 3d. Set Secrets

You already have `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in your project. You only need to add the two new Slack secrets:

```bash
supabase secrets set SLACK_BOT_TOKEN=xoxb-your-token-from-step-2
supabase secrets set SLACK_CAPTURE_CHANNEL=C-your-channel-id-from-step-1
```

### 3e. Deploy

```bash
supabase functions deploy ingest-thought --no-verify-jwt
```

The `--no-verify-jwt` flag is required because Slack sends unsigned webhook payloads — they won't have a Supabase JWT.

Your Edge Function URL is:
```
https://yueqgweyyajtymfarswm.supabase.co/functions/v1/ingest-thought
```

---

## Step 4: Connect Slack to the Edge Function

1. Go back to [api.slack.com/apps](https://api.slack.com/apps) → your app
2. Left sidebar → **Event Subscriptions**
3. Toggle **Enable Events** to ON
4. Paste your Edge Function URL into **Request URL**:
   ```
   https://yueqgweyyajtymfarswm.supabase.co/functions/v1/ingest-thought
   ```
5. Slack will verify the URL automatically (the function handles the `url_verification` challenge)
6. Under **Subscribe to bot events**, add: `message.channels` and `message.groups`
   - `message.channels` covers public channels
   - `message.groups` covers private channels (your `#capture` channel is private)
7. Click **Save Changes**
8. Slack may prompt you to **reinstall the app** — do it

---

## Step 5: Test It

1. Go to your `#capture` channel in Slack
2. Type: `Remember to follow up with Sarah about the Q4 budget review next week`
3. Within a few seconds, the bot should reply in a thread with something like:
   ```
   Captured as task — budgeting, meetings
   People: Sarah
   Action items: Follow up with Sarah about Q4 budget review
   ```
4. Verify it landed in your brain by searching in a Cowork `/brain` session or using `search_thoughts`

---

## Troubleshooting

**"Request URL not verified"** when adding the Event Subscription:
- Make sure you deployed with `--no-verify-jwt`
- Check the URL is exact: `https://yueqgweyyajtymfarswm.supabase.co/functions/v1/ingest-thought`

**Messages not triggering the function:**
- Did you `/invite @Open Brain` in the channel?
- Is `message.groups` subscribed? (needed for private channels)
- Check the Logs tab on your `ingest-thought` function in Supabase

**Function runs but nothing in database:**
- Check the Logs tab for insert errors
- Your `thoughts` table needs `content`, `embedding`, and `metadata` columns (these should already exist from your Open Brain setup)

**No confirmation reply in Slack:**
- Verify `SLACK_BOT_TOKEN` is set correctly in secrets
- Make sure the bot has `chat:write` scope

---

## What You Just Built

Type in Slack → embedded + classified + stored in ~5 seconds. No Cowork, no polling, no middleware. Same brain, new entry point.

To capture from a second workspace: install the same Slack app there, create a `#capture` channel, invite the bot, and update `SLACK_CAPTURE_CHANNEL` (or modify the function to accept multiple channel IDs).
