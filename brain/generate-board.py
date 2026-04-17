#!/usr/bin/env python3
"""Read BOARD.md and generate an HTML dashboard."""

import re
from pathlib import Path

import sys

BOARD_PATH = Path(__file__).resolve().parent / "BOARD.md"
OUTPUT_PATH = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "board.html"

# Brandon's preferred display order
STATUS_ORDER = ["Code Review", "In Progress", "Todo", "Backlog", "Done"]

PRIORITY_LABELS = {"U": "Urgent", "H": "High", "M": "Medium", "L": "Low"}
PRIORITY_COLORS = {
    "U": "#dc2626",
    "H": "#ea580c",
    "M": "#2563eb",
    "L": "#6b7280",
}

ITEM_RE = re.compile(
    r"^- \*\*(?P<id>[A-Z]+-\d+)\*\*\s+"
    r"\[(?P<priority>[UHML])\]\s+"
    r"(?P<title>.+?)(?:\s+\(est:\s*(?P<estimate>\d+)\))?(?:\s+(?P<labels>#\S+(?:\s+#\S+)*))?$"
)
SUB_BULLET_RE = re.compile(r"^\s+- (.+)$")


def parse_board(text: str) -> dict[str, list[dict]]:
    sections: dict[str, list[dict]] = {}
    current_section = None
    current_item = None

    for line in text.splitlines():
        if line.startswith("## "):
            current_section = line[3:].strip()
            sections.setdefault(current_section, [])
            current_item = None
            continue

        m = ITEM_RE.match(line)
        if m and current_section is not None:
            current_item = {
                "id": m.group("id"),
                "priority": m.group("priority"),
                "title": m.group("title").strip(),
                "estimate": m.group("estimate"),
                "labels": m.group("labels").split() if m.group("labels") else [],
                "notes": [],
            }
            sections[current_section].append(current_item)
            continue

        sm = SUB_BULLET_RE.match(line)
        if sm and current_item is not None:
            current_item["notes"].append(sm.group(1))

    return sections


def render_item(item: dict) -> str:
    p = item["priority"]
    color = PRIORITY_COLORS.get(p, "#6b7280")
    label = PRIORITY_LABELS.get(p, p)

    labels_html = ""
    for lb in item["labels"]:
        labels_html += f'<span class="label">{lb}</span>'

    est_html = ""
    if item["estimate"]:
        est_html = f'<span class="estimate">{item["estimate"]}pt</span>'

    notes_html = ""
    if item["notes"]:
        notes_html = '<div class="notes">'
        for note in item["notes"]:
            notes_html += f"<div class='note'>{note}</div>"
        notes_html += "</div>"

    return f"""<div class="card">
  <div class="card-header">
    <span class="ticket-id">{item["id"]}</span>
    <span class="priority" style="background:{color}">{label}</span>
    {est_html}
    {labels_html}
  </div>
  <div class="card-title">{item["title"]}</div>
  {notes_html}
</div>"""


STATUS_COLORS = {
    "Code Review": "#7c3aed",
    "In Progress": "#2563eb",
    "Todo": "#0891b2",
    "Backlog": "#6b7280",
    "Done": "#16a34a",
}


def render_section(name: str, items: list[dict]) -> str:
    color = STATUS_COLORS.get(name, "#6b7280")
    cards = "\n".join(render_item(i) for i in items)
    return f"""<div class="status-group">
  <div class="status-header">
    <span class="status-dot" style="background:{color}"></span>
    <span class="status-name">{name}</span>
    <span class="status-count">{len(items)}</span>
  </div>
  {cards if cards else '<div class="empty">No items</div>'}
</div>"""


def generate_html(sections: dict[str, list[dict]]) -> str:
    from datetime import datetime

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    groups = ""
    total = 0
    for status in STATUS_ORDER:
        items = sections.get(status, [])
        total += len(items)
        groups += render_section(status, items)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Brain Board</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8fafc;
    color: #1e293b;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }}
  .header h1 {{ font-size: 1.5rem; font-weight: 600; }}
  .meta {{ font-size: 0.8rem; color: #94a3b8; }}
  .status-group {{ margin-bottom: 1.5rem; }}
  .status-header {{
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding: 0.25rem 0;
  }}
  .status-dot {{
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }}
  .status-name {{ font-weight: 600; font-size: 0.9rem; }}
  .status-count {{
    font-size: 0.75rem;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 0.1rem 0.5rem;
    border-radius: 10px;
  }}
  .card {{
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    margin-bottom: 0.4rem;
    margin-left: 1.25rem;
  }}
  .card:hover {{ border-color: #cbd5e1; }}
  .card-header {{
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
    flex-wrap: wrap;
  }}
  .ticket-id {{
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
  }}
  .priority {{
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }}
  .estimate {{
    font-size: 0.7rem;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }}
  .label {{
    font-size: 0.65rem;
    color: #7c3aed;
    background: #f5f3ff;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }}
  .card-title {{ font-size: 0.85rem; line-height: 1.4; }}
  .notes {{
    margin-top: 0.4rem;
    padding-top: 0.4rem;
    border-top: 1px solid #f1f5f9;
  }}
  .note {{
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.4;
    padding-left: 0.5rem;
    border-left: 2px solid #e2e8f0;
    margin-bottom: 0.2rem;
  }}
  .empty {{
    font-size: 0.8rem;
    color: #cbd5e1;
    padding: 0.5rem 0 0.5rem 1.25rem;
    font-style: italic;
  }}
</style>
</head>
<body>
  <div class="header">
    <h1>Brain Board</h1>
    <div class="meta">{total} items &middot; generated {timestamp}</div>
  </div>
  {groups}
</body>
</html>"""


def main():
    text = BOARD_PATH.read_text()
    sections = parse_board(text)
    html = generate_html(sections)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(html)
    print(f"Dashboard written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
