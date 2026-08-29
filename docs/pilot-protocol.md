# NORA Pilot Protocol — Self-Test Before Real Sessions

Companion to [`draftplan.md`](../draftplan.md). This is the concrete procedure for B to dry-run the instrumentation solo before running the real 3-user within-subject pilot, and the counterbalancing schedule for the real sessions.

## What was built

- **Memory-free baseline toggle** — `Ctrl/Cmd+Alt+Shift+M` flips `AppState.memoryBaselineMode` at runtime. Clears the ghost-text buffer and suggestion cache on toggle (the cache is keyed on typed text only, so a stale suggestion from the other condition can't leak across the toggle). Console logs the new state.
- **Suggestion logging** — every ghost-text suggestion shown is logged with a timestamp, and its outcome (`accepted` / `dismissed_explicit` / `dismissed_implicit`) plus time-to-decision is recorded the moment the user acts. Accepted suggestions additionally get a short post-acceptance edit-capture window (see Limitations below) to distinguish accepted-as-is from accepted-and-corrected, with an approximate edit distance.
- **Memory-type tagging** — each suggestion's log entry now includes `memoryTypes`: the classifier labels (`EPISODIC`/`SEMANTIC`/`PROCEDURAL`/etc., from `backend/main.py`'s `MemoryClassifier`) of whatever memories were retrieved for it, pulled from Mem0's `metadata.memory_type` on the matching search results. On the normal (cached-memories) path this lookup runs concurrently with the LLM call via `Promise.all`-style awaiting, not before it, so it doesn't add serial latency to suggestion generation.
- Log file: JSONL, one line per suggestion, written to `{userData}/suggestion-log.jsonl`. The exact resolved path is printed to the console the first time a suggestion is logged — look for `[SuggestionLogger] Logging suggestions to: ...`.
- Analysis: `frontend/electron/scripts/analyze-suggestion-log.js <path-to-log>` prints acceptance rate, accepted-as-is vs. accepted-edited counts, dismissal counts, time-to-decision (mean/median), edit distance (mean/median), and which memory types most often underlie accepted suggestions — split by memory condition.
- Isolation check: `frontend/electron/scripts/isolation-sanity-check.js [memoryApiUrl]` seeds two throwaway `user_id`s with distinguishing marker facts directly against the memory backend, confirms each only retrieves its own marker, and cleans both up afterward. Requires the memory backend running (default `http://localhost:8000`).

## Self-test procedure (run this before scheduling the real 3 users)

0. **Run the isolation check first**, before touching the app: `node frontend/electron/scripts/isolation-sanity-check.js` (memory backend must already be running on `:8000`). It must print `ISOLATION OK` — if it reports cross-user leakage, stop and fix that before doing anything else in this protocol, since the entire pilot design depends on per-user memory isolation holding.
1. Launch the app in dev mode (`pnpm dev` from repo root, or `cd frontend && pnpm dev`), sign in with your own account so `AppState.currentUserId` is set and some real memories exist.
2. Enable ghost text (`Ctrl+Alt+G` or however it's normally toggled) and type in any text field for a couple minutes, letting suggestions appear.
3. Exercise all three outcomes at least once each:
   - **Accept** a suggestion with `Shift+Tab`, then immediately backspace part of it and retype something different — this is what the edit-capture window is measuring.
   - **Accept** a suggestion with `Shift+Tab` and change nothing afterward — this should log as accepted-as-is (`editDistance: 0`).
   - **Dismiss explicitly** with `Shift+Escape` while a suggestion is showing.
   - **Dismiss implicitly** by continuing to type through a shown suggestion without pressing either shortcut.
4. Toggle the baseline with `Ctrl/Cmd+Alt+Shift+M`, confirm the console log shows the mode flip, and repeat step 3 in the memory-free condition.
5. Open `suggestion-log.jsonl` (path from the console) and sanity-check: every entry has a `shownAt`, entries you explicitly decided on have `decisionAt`/`timeToDecisionMs`, accepted entries have `editDistance` (0 or the reconstructed distance), `memoryBaselineMode` correctly reflects which condition was active when each suggestion was shown, and memory-ON entries have a non-empty `memoryTypes` array whenever you have matching memories seeded (memory-OFF entries should always have `memoryTypes: []`).
6. Run `node frontend/electron/scripts/analyze-suggestion-log.js <path>` and confirm the printed table matches what you did by hand in steps 3-4 (e.g. if you accepted 2 and dismissed 1 explicitly under memory-ON, the table should say so).
7. Only after this matches your expectations, move to the real 3-user sessions.

## Known limitation to carry into the paper

Edit-distance capture is a **proxy**, not a read-back of the target application's actual text: it reconstructs the "final" text by replaying the keystrokes typed in the few seconds right after acceptance against the accepted suggestion, assuming the cursor never moves elsewhere. If a user accepts a suggestion, clicks elsewhere, and edits a different part of the document, that edit will not be captured. State this plainly in Limitations rather than presenting edit distance as ground truth.

## Counterbalancing schedule for the real pilot (3 users)

Within-subject: each user does both conditions. Order is counterbalanced so condition order isn't confounded with practice/fatigue effects.

| User | Session 1 | Session 2 |
|---|---|---|
| U1 | KG-grounded (memory ON) | Memory-free baseline |
| U2 | Memory-free baseline | KG-grounded (memory ON) |
| U3 | KG-grounded (memory ON) | Memory-free baseline |

(With only 3 users a perfectly balanced 3-vs-3 split isn't possible — 2-vs-1 is the best available and should be named as a pilot limitation, not silently absorbed.)

Toggle the condition with `Ctrl/Cmd+Alt+Shift+M` at the start of each session (confirm the console log matches the intended condition before the user starts typing). Use the same task list across both sessions per user so the comparison is within-subject on matched material, not just matched people.
