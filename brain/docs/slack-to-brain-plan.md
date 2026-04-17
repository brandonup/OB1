# Slack → Brain: Implementation Plan

**Goal:** DM yourself in Slack → thoughts automatically land in Open Brain with a `via:slack` tag.

---

## How It Works

You message yourself in Slack (your self-DM channel `D07G0242KUJ`). A scheduled task runs every 15 minutes, reads new messages from that channel, and calls `capture_thought` for each one. A watermark file on disk prevents re-capturing the same message twice.

## Architecture

```
You (Slack DM to self)
    ↓
Scheduled Task (every 15 min)
    ↓  slack_read_channel(D07G0242KUJ, oldest=watermark)
    ↓
For each new message:
    ↓  capture_thought(content + " #via:slack")
    ↓
Update watermark file
```

## Implementation Steps

### Step 1: Create the Watermark File

Create `/Users/brandonupchuch/Documents/Claude/Scheduled/slack-brain-sync/last_ts.txt` to store the Slack timestamp of the last processed message. Initialize it empty — the first run will capture the most recent batch and set the watermark going forward.

### Step 2: Create the Scheduled Task

A scheduled task (`slack-brain-sync`) running on cron `*/15 * * * *` (every 15 minutes) with this logic:

1. **Read the watermark** — load the last processed Slack timestamp from `last_ts.txt`. If empty, use a timestamp from 1 hour ago as a reasonable first window.
2. **Poll Slack** — call `slack_read_channel` on channel `D07G0242KUJ` with `oldest` set to the watermark timestamp. Limit 50 messages.
3. **Filter** — only process messages from user `U07FKFAJVTR` (you). Skip bot messages, Slackbot auto-replies, and any message that's a thread reply (has `thread_ts` different from `ts`).
4. **Capture each thought** — for each qualifying message, call `capture_thought` with the message text. Append ` [via:slack]` to the content so it's tagged as a Slack-sourced thought.
5. **Update watermark** — write the highest `ts` value from the batch to `last_ts.txt`. This ensures the next run only picks up newer messages.
6. **Report** — log how many thoughts were captured (or "no new messages").

### Step 3: Test It

1. Send yourself a test message in Slack (e.g., "Testing brain capture from Slack").
2. Manually trigger the scheduled task.
3. Use `search_thoughts` to verify the thought landed in Open Brain with the `via:slack` tag.
4. Confirm the watermark file updated so re-running doesn't duplicate.

## Edge Cases

| Scenario | Handling |
|---|---|
| No new messages | Task completes silently, watermark unchanged |
| Multiple messages in one poll | All captured, watermark set to the latest `ts` |
| Slack API error | Task logs the error, watermark unchanged (retry next cycle) |
| Message is a URL/link only | Captured as-is — Open Brain handles embedding |
| Multiline message | Full text captured as one thought |
| Watermark file missing | Treated as first run, captures last hour |

## What You'll Experience

- Open Slack on your phone → DM yourself a thought → it shows up in Open Brain within 15 minutes
- When you start a Brain session, those thoughts are searchable alongside everything else
- All Slack-sourced thoughts are identifiable by the `[via:slack]` suffix

## Future Enhancements (Not in Scope)

- Hashtag extraction from message text (e.g., `#idea` → tag)
- Shorter poll interval or real-time via Slack Events API
- Emoji-react capture (react with :brain: on any message to save it)
- Slack permalink stored as metadata
