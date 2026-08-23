# Mobile App

Purpose: React/Vite mobile-first PWA satellite for Tier 2 and Tier 3 assigned work.

Current status: static/synthetic `Assigned Tasks -> Task Detail` visual shell by default, with an opt-in deterministic operational trial. The trial makes the approved assignment, execution, end-of-shift progress, and contextual Critical reporting flows locally interactive without production persistence or API writes.

## Approved application target

```text
Assigned Tasks
  Task Detail
```

Assigned Tasks is the only top-level operational destination.

- Tier 2 sees tasks explicitly assigned by Tier 1 for tracking.
- Tier 2 may assign those tasks to direct-report Tier 3 while retaining tracking responsibility.
- Tier 3 sees tasks explicitly assigned by Tier 2 as `WORKING_ON` or `FIELD_CONTROL`.
- Neither tier may browse the whole project.

Discussion, Delays / Problems, Actions, Evidence, History, and assigned Critical reporting obligations belong inside Task Detail. There is no separate Mobile Today, Problems, Evidence, Sync, or Critical destination.

Sync is a compact, persistent transport/recovery state. Queued, sending, server-received, failed, and conflict states must remain visible without becoming an operational page.

## Deterministic operational trial

Set the flag to the exact value `true`:

```text
VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true
```

Trial mode is labelled `Synthetic operational trial`, `Deterministic local state`, and `No production persistence`. It uses the same shared fixed scenario and reducer as the Console.

The named persona selector is a product-review tool:

- Tier 2 personas see only tasks/work packs for which they hold tracking responsibility. They can delegate work to a direct-report Tier 3 user as `WORKING_ON` or `FIELD_CONTROL` while retaining tracking responsibility.
- Tier 2 reporting owners see contextual Critical obligations, pre-populated known execution facts, controlled judgement fields, immutable report submission, and correction by supersession.
- Tier 3 personas see only explicitly delegated tasks. They can exercise Can't Start, Start, Pause, Resume, Finish, and end-of-shift unfinished progress with simulated system-captured times.
- Assigned Tier 2/Tier 3 personas can resolve a task-owned trial problem or complete a task-owned trial action; those changes use the same event history as Task Detail and Console Today.

The Mobile trial also provides compact simulated-clock controls and the optional guided checklist. Reset restores the exact fixed state and removes generated actions, assignments, execution events, progress observations, policy changes, obligations, reports, corrections, problems, and history.

When Console opens Mobile as a linked trial window, Mobile receives the Console's canonical in-memory state and sends typed trial actions back through a strictly validated `window.opener`/`postMessage` bridge. The Console origin is carried in the `trialHostOrigin` query parameter. This bridge is ephemeral, uses no browser or server persistence, and is not a production sync/API design. Standalone Mobile trial mode applies the same shared reducer locally.

See [Deterministic Operational Trial](../../docs/product/deterministic-operational-trial.md) for the scenario, clock, guided sequence, and review questions.

## Default visual shell

- `Assigned Tasks` is the only top-level operational destination.
- A local visual-review persona selector distinguishes Tier 2 tracking responsibility from Tier 3 `WORKING_ON` and `FIELD_CONTROL` assignments.
- Opening a synthetic assigned task uses local React view state and reveals its Task Detail. This transition is not routing, authentication, project membership, or assignment persistence.
- Task Detail keeps Execution, People, Discussion, Delays / Problems, Actions, Evidence, History, and assigned Critical context attached to the task.
- Execution state and schedule attention are presented separately. The visual `Not Started` / `Late to Start` example has no Tracker Start/Resume event, no imported Actual Start, and imported progress of zero.
- Execution represents Can't Start, Start, Pause, Resume, and Finish with system-recorded timestamps. It does not provide ordinary editable execution date/time fields or manual backdating.
- Can't Start remains Not Started; Pause is shown separately from any linked adverse delay/problem; Resume does not silently close that problem; Finish uses confirmation/configured-evidence semantics.
- End-of-shift unfinished work is represented as a Tracker field observation asking how much is complete, what remains, what may affect the next shift, and for optional note/evidence.
- Ordinary progress is separate from formal Critical reporting. The Tier 2 example shows a contextual policy version/template, due state, controlled required content, pre-populated task facts, judgement inputs, and history. Tier 3 sees context only.
- Sync is a compact status with embedded recovery examples, not a navigation destination.
- All write-like controls are disabled outside trial mode. Only visual persona selection and local list/detail navigation are interactive in the default shell.

## Implementation boundary

The current Mobile App does not implement these production capabilities, including when the deterministic local trial is enabled:

- OIDC/login;
- Tier 2/Tier 3 project membership;
- direct-report relationships;
- explicit Tracker task assignments;
- task execution-event persistence or APIs;
- audited manual execution-time correction/backdating;
- event-derived task state;
- production comments/discussion;
- production delays/problems, actions, or evidence;
- IndexedDB/offline queue;
- service-worker/background sync correctness;
- Tier 2 tracking validation writes;
- Tier 1 Project-input review;
- production Critical reporting;
- Critical policy/template configuration or arbitrary report schemas;
- import/export or Microsoft Project write-back.

There is no service worker, IndexedDB store, replay client, background sync implementation, or Mobile API wiring. The web manifest supplies install/display metadata only. All displayed task and sync data is synthetic and must not be treated as operational state.

## Required offline copy

```text
Saved locally.
Queued on this device. Not yet sent.
Could not send. Still saved on this device.
Server received.
This progress update is not submitted until the server receives it.
Last synced at [time].
```

Use `Thread may be out of date. Last synced at [time].` only for future Task Detail discussion, not for task progress.

## Product authority

- `docs/product/product-flow-and-software-map.md`
- `docs/product/user-tier-and-assignment-model.md`
- `docs/product/task-operational-model.md`
- `docs/product/critical-reporting-model.md`
- `docs/product/implementation-status-map.md`
- `docs/product/frontend-visual-review-scope.md`
- `docs/product/deterministic-operational-trial.md`
- `docs/product/offline-audit-sync-rules.md`
- `docs/product/ux-anti-slop-rules.md`
- `docs/product/design-language-and-status-semantics.md`

## Local commands

```text
npm run dev
npm test
npm run build
```

From the repository root, trial mode can be started with:

```text
VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true npm run dev --workspace @shutdown-tracker/mobile-pwa
```
