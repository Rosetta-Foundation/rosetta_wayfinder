# Wayfinder Demo Script

**Audience:** Product stakeholders and new users  
**Goal:** Show a working product in under 3 minutes. No setup friction. The product speaks.  
**Format:** Live demo on a laptop, Wayfinder already running.

---

## Before the Demo

### Primary setup: your own data

The strongest demo uses real data from your actual chronicle. It's more credible,
more personal, and requires no setup beyond what you already have running.

```bash
# 1. Anthropic API key is available
export ANTHROPIC_API_KEY=sk-ant-...

# 2. Wayfinder is already pointed at your chronicle
# (~/.wayfinder/config.json has your path — no action needed)

# 3. Start Wayfinder
cd rosetta_wayfinder && bun run tauri:dev
```

The org knowledge path is pre-filled to `rosetta_docs` — no typing needed before
the org query demo step.

---

### Fallback: seeded demo data

Only needed if demoing on a machine without your personal chronicle. Keep this
for future handoffs, conference demos, or onboarding new team members.

If you're demoing without your personal chronicle, seed a demo chronicle:

```bash
# Create a demo chronicle repo
mkdir -p ~/Wayfinder/demo-chronicle/chronicles/notes
cd ~/Wayfinder/demo-chronicle
git init -b main

# Seed yesterday's daily chronicle
cat > chronicles/2026-07-25.md << 'EOF'
# Daily Chronicle — 2026-07-25

## Claude Code Sessions

### Session — 09:14 → 11:32
- Reviewed PRD-0006 Artifact Capture
- Opened issue #6 for demo polish work
- Merged PR #14: personal queue GUI with auto-commit
- Decision: persist chronicle path in ~/.wayfinder/config.json, not env var

### Session — 14:05 → 15:45
- Built standup service with 7-day lookback
- Fixed daily chronicle inclusion (both notes/ and top-level chronicles/)
- 79 tests passing, opened PR #16
EOF

# Seed a note
cat > chronicles/notes/2026-07-25.md << 'EOF'
### 2026-07-25T09:30:00Z

Finished the queue GUI. The invisible ledger approach is working well — non-engineers
don't need to know it's git under the hood.

### 2026-07-25T14:10:00Z

Standup fix: had to scan back 7 days because the strict date lookup was missing
older chronicle entries. Now reads both daily chronicle and notes files.
EOF

# Seed the queue
cat > chronicles/queue.md << 'EOF'
# Work Queue

## Active
- [ ] Demo polish — branding, onboarding, visual pass [prd:0010/1]
- [ ] Docs: tighten Wayfinder getting-started guide

## Next Up
- [ ] PRD-0012 Wayfinder AI Workspace — Phase 1 [due:2026-09-01]
- [ ] Multi-silo org knowledge (federated RAG) [prd:0009]

## Inbox
- [ ] Consider voice input for mobile/tablet demo
- [ ] Proactive morning briefing mode
EOF

git add -A
git commit -m "init: seed demo chronicle"
```

Then, in Wayfinder's **Chronicle** panel, click **Change** and enter `~/Wayfinder/demo-chronicle`.

---

## The 3-Minute Demo

### Opening (30 sec)

> "This is Wayfinder. It's running locally on this machine. Nothing is in the cloud
> except the AI — that routes through the Claude API.
> Every note, every queue item, every AI interaction is stored locally in a git repo.
> Let me show you what it does."

**Screen:** The Wayfinder app is open, showing the queue with items checked/unchecked.

---

### Act 1 — Queue (30 sec)

> "This is my work queue. These are the things I'm actively working on right now.
> Watch what happens when I check one off."

**Action:** Check "Docs: tighten Wayfinder getting-started guide."

> "That checkbox is now a commit in my knowledge ledger — permanently recorded,
> with a timestamp. No separate project management tool. The work and the record
> of the work are the same thing."

---

### Act 2 — Standup (45 sec)

> "Every morning I open Wayfinder and click one button."

**Action:** Click **Generate standup**.

> "It reads everything I did yesterday — the auto-generated activity log, my own
> notes, what's on my queue — and writes my standup for me. I paste it into Slack
> and I'm done. This is what I actually worked on. It's not AI making things up —
> it's AI reading my own records."

**Show the result.** Point at the citations / token count footer.

> "Claude API. Credentials never leave the local process."

---

### Act 3 — Org Knowledge (45 sec)

> "Now watch this. I can ask questions about our team's entire knowledge base —
> all our PRDs, our architecture decisions, our chronicles."

**Action:** In Ask Wayfinder, set mode to "Ask about Rosetta." Type:

> _"What's the status of the artifact capture and promotion work?"_

**Show the response + citations.**

> "It found the answer in PRD-0006 and surfaced the source. It didn't guess —
> it read the document. Any new engineer can ask this question on day one and get
> a real answer with a citation they can verify."

---

### Closing (30 sec)

> "Wayfinder is running on my laptop right now. It took about 15 minutes to set up.
> The AI costs roughly a penny per standup. The knowledge base grows automatically
> from the work people are already doing — there's no separate data entry.
>
> Imagine what happens when engineering adopts Chronicle as a standard practice —
> and Wayfinder puts that same capability in front of every PM, product owner,
> and stakeholder on the team."

---

## Anticipated questions

**"What about data security?"**
Everything stays on the user's machine. AI calls go through the Claude API;
the key never leaves the local native process.

**"Who would use this?"**
Engineers, PMs, product owners, team leads — anyone who needs to remember what
happened, communicate it, or ask questions of accumulated team knowledge.

**"What would it cost to roll this out?"**
Wayfinder is open-source. Claude API usage at current scale is cents per user per day.
The only new cost is the time to point Wayfinder at your Chronicle repo.

**"Is this ready?"**
The core loops are working and tested. We're in demo-polish mode.
