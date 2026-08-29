# NORA 2026 Submission — Draft Plan

**Target:** NORA: 3rd Workshop on Knowledge Graphs & Agentic Systems Interplay (AACL-IJCNLP 2026)
**Track:** Short Paper — **2 pages max** ("research topics, works in progress, and practical applications" per the CFP — a small pilot study is explicitly in-scope at this length)
**Deadline:** Regular submission Sept 9, 2026 (AoE) — **~16 days from today (Aug 24)**

## Title & Abstract (locked)

**Title:** *Do You Accept What Your Graph Suggests? Measuring Knowledge-Graph Memory Through Autocomplete Behavior*

**Abstract:** Knowledge-graph memory for personal agents is typically evaluated offline, through question answering or human ratings of retrieved facts. Such measures are infrequent, effortful, and detached from the moment memory is actually used. We argue that inline autocomplete offers a continuous behavioral probe: each suggestion is a trial in which a user implicitly judges whether retrieved memory was relevant. We instrument Tabby, a system-wide AI keyboard layer whose completions are grounded in a per-user Mem0 knowledge graph over Neo4j, and log acceptance rate, post-acceptance edit distance, time-to-decision, and the memory type (episodic, semantic, or procedural) attributed to each suggestion. In a within-subject pilot with three users of differing graph content, we compare KG-grounded completions against a memory-free baseline. We report how acceptance and revision shift with graph grounding, and which memory types most often underlie accepted completions. We release the instrumentation as a reusable harness for behavioral evaluation of agent memory.

---

## Core Experiment (merged framing)

The persona/isolated-memory-graph mechanism from the prior draft is kept, but repurposed: instead of 3-4 *synthetic* personas probed with scripted prompts and scored by completion-text divergence, this version uses **3 real pilot users** (the team, most practically), each with their own genuinely differing Mem0/Neo4j graph content, doing **real live typing** under two conditions:

- **KG-grounded** — normal `/api/suggest-inline` behavior, memory retrieval on.
- **Memory-free baseline** — same model/settings, memory retrieval disabled.

Each user does both conditions (**within-subject**) — order must be **counterbalanced** across the 3 users to avoid learning/fatigue effects contaminating the comparison.

**Reuse of existing infrastructure:** per-user memory isolation already exists via `user_id`-scoped memory (`/memory/user/{id}` semantics) — no new auth UI needed. What's new is **instrumentation**, not infrastructure: timestamping suggestion-shown vs. decision events, logging which memory items (and their classified type) were injected into each suggestion, and logging the accept/edit/reject outcome with the post-edit text for edit-distance scoring.

**Contribution framing (two deliverables, not one):**
1. The pilot result itself (does KG grounding shift acceptance/edit/time behavior, and which memory type dominates accepted completions).
2. **The instrumentation harness**, released as a reusable artifact for behaviorally evaluating agent memory in other systems — this is what elevates a 3-user pilot from "small demo" to a legitimate short-paper contribution. Plan to publish the harness code (anonymized during review — e.g. an anonymous repo link, or "code released upon acceptance") alongside the paper.

---

## Metrics & Instrumentation (owned by A, analyzed by B)

| Metric | What it captures | Logged where |
|---|---|---|
| **Acceptance rate** | accepted-as-is / accepted-with-edit / rejected, per condition | Ghost Overlay accept/dismiss handlers |
| **Post-acceptance edit distance** | how much the user had to fix an accepted suggestion | diff between shown suggestion and final typed text |
| **Time-to-decision** | latency from suggestion shown → accept/reject/edit action (behavioral, not API latency) | timestamp at suggestion render vs. timestamp at decision event |
| **Memory-type attribution** | which of Tabby's classified memory types (episodic / semantic / procedural) were retrieved into an accepted suggestion | tag each retrieved memory item with its existing classifier label at suggestion time |

**Note:** Tabby's backend already classifies memories into five types (`LONG_TERM/SHORT_TERM/EPISODIC/SEMANTIC/PROCEDURAL`); the abstract narrows to three (episodic/semantic/procedural) for a legible 2-page table — confirm with C whether to collapse `LONG_TERM`→semantic and `SHORT_TERM`→episodic, or just report only the three that see enough volume in the pilot.

---

## Team & Roles

| Person | Role | Owns |
|---|---|---|
| **A** | Systems / Instrumentation | Build the logging harness (timestamps, memory-type tagging, edit-distance capture) on top of `/api/suggest-inline` + Ghost Overlay; verify per-user memory isolation; package harness for release; produce one compact architecture/instrumentation figure |
| **B** | Evaluation | Design the pilot protocol (tasks, counterbalancing order across 3 users), run the within-subject sessions, compute all four metrics, produce the main results table + memory-type breakdown |
| **C** | Writing, Positioning & Submission | 2-page ACL draft, Related Work (contrast against offline QA/rating evaluation — LoCoMo/MemAE/MSC as the "infrequent, effortful" comparison the abstract argues against), Limitations/GenAI declaration, anonymization, harness-release note, submission logistics |

---

## Robustness Requirements (non-negotiable)

1. **Counterbalance condition order** across the 3 users (who gets KG-grounded first vs. memory-free first) — otherwise a reviewer can attribute any effect to fatigue/learning rather than memory grounding.
2. **Same model/decoding settings in both conditions** — only memory retrieval toggles. Isolate the one variable being tested.
3. **Isolation sanity check** — confirm no cross-user memory leakage before running real sessions (cheap, and worth one sentence in the paper as a systems-robustness note).
4. **State the pilot honestly** — N=3 users is a pilot/case study, not a powered study. The CFP's "works in progress" language explicitly covers this; say so directly in Limitations rather than overclaiming statistical significance.
5. **Privacy note** — pilot users are the team itself (no external subject recruitment, no IRB needed), but redact any personally sensitive memory content before it appears in paper examples during anonymization.

---

## Page Budget (2 pages — tight)

Pick **two** visual elements, not three — there isn't room for an architecture figure, a main results table, *and* a memory-type breakdown table alongside required text. Recommended: **one compact instrumentation figure** (suggestion → decision event → logged metrics, with memory-type tagging shown inline) that doubles as the architecture explanation, **plus one combined results table** (acceptance rate / edit distance / time-to-decision × condition, with memory-type breakdown as a sub-row or footnote rather than a separate table). Revisit this call once B has real numbers — if the memory-type result is the more interesting one, it may deserve the second visual instead of the figure.

- ~0.4 page motivation (offline eval is infrequent/effortful → behavioral probe via autocomplete)
- ~0.4 page method (instrumentation + pilot protocol) + 1 figure
- ~0.6 page results (1 table, both quantitative metrics and memory-type breakdown)
- ~0.3 page Limitations + brief Related Work + GenAI declaration
- ~0.3 page harness-release note + references

---

## Timeline

### Week 1 — Aug 24 (Mon) → Aug 30 (Sun): Build the Harness

| Day | A (Instrumentation) | B (Evaluation) | C (Writing) |
|---|---|---|---|
| Aug 24–25 | Confirm `user_id` memory isolation; scope exactly what to log (timestamps, memory-type tags, edit distance) | Design pilot protocol: task list, counterbalancing schedule across 3 users, session length | Draft 2-page ACL skeleton; write positioning/abstract intro around the locked abstract; confirm double-blind + dual-submission constraints |
| Aug 26–27 | Build logging on Ghost Overlay accept/dismiss handlers (timestamps + outcome + edit capture) | Finalize memory-free baseline toggle mechanism with A; pilot-test protocol on self before running real sessions | Draft Related Work contrasting offline QA/rating eval (LoCoMo, MemAE, MSC) vs. behavioral evaluation; start Introduction |
| Aug 28–30 | Wire memory-type tagging (retrieved item → classifier label) into the suggestion log; run isolation sanity check | Run within-subject pilot sessions with all 3 users (counterbalanced order) | Draft Method section around A's harness + B's protocol; draft Limitations + GenAI declaration early |

**Checkpoint (Aug 30):** Harness built, isolation verified, pilot sessions run, raw logs collected.

### Week 2 — Aug 31 (Mon) → Sep 6 (Sun): Analyze & Draft

| Day | A (Instrumentation) | B (Evaluation) | C (Writing) |
|---|---|---|---|
| Aug 31–Sep 1 | Package harness for release (clean code, anonymized repo/README); finalize instrumentation figure | Compute all 4 metrics per condition; build the combined results table; decide table vs. figure per the page-budget call above | Write Results section around B's table; continue Introduction/Method integration |
| Sep 2–3 | Review Method/figure for technical accuracy | Sanity-check every number against raw logs | Full draft assembly; first anonymization sweep (including harness repo link) |
| Sep 4–6 | Full-draft review pass | Full-draft review pass — every number traces to a log file | Full-draft review pass; **hard trim to 2 pages** |

**Checkpoint (Sep 6):** Complete 2-page draft, results table in, harness packaged, first anonymization pass done.

### Final Days — Sep 7 (Mon) → Sep 9 (Wed, deadline)

| Day | All 3 |
|---|---|
| Sep 7 | Joint read-through; confirm hard 2-page limit; polish figure/table |
| Sep 8 | Second anonymization pass (fresh eyes per section, including harness release note); verify Limitations + GenAI declaration present; verify dual-submission compliance |
| Sep 9 | Final ACL style-template check; submit before AoE deadline |

---

## Submission Checklist

- [ ] Single PDF, ACL official style template, **2-page hard limit** (references/appendix unlimited but reasonable)
- [ ] Double-blind: no author names, org name, repo URL, or identifying screenshots/logos anywhere (harness link anonymized or withheld until camera-ready)
- [ ] Memory-free baseline condition present and reported, not just KG-grounded results
- [ ] Condition order counterbalanced across the 3 pilot users
- [ ] Isolation sanity check reported (no cross-user memory leakage)
- [ ] Memory-type attribution (episodic/semantic/procedural) reported, tying the result back to the knowledge graph specifically — this is what keeps the paper on-topic for NORA
- [ ] Limitations section explicitly states small-N/pilot framing
- [ ] Generative AI declaration present
- [ ] No concurrent submission to another peer-reviewed venue (archival or non-archival)
- [ ] Interview Copilot / interview-cheating framing absent from the entire paper
- [ ] Every reported number traces back to B's raw pilot logs
