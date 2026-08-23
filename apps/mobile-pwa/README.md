# Mobile App

Purpose: React/Vite mobile-first PWA satellite for Tier 2 and Tier 3 assigned work.

Current status: static/synthetic `Assigned Tasks -> Task Detail` visual shell. It contains hard-coded Tier 2 and Tier 3 assignment examples, task-owned execution and operational sections, an assigned Tier 2 Critical reporting example, and compact sync/recovery states. It has no production assignment, execution, offline queue, discussion, evidence, Critical reporting, or review writes.

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

## Implemented visual shell

- `Assigned Tasks` is the only top-level operational destination.
- A local visual-review persona selector distinguishes Tier 2 tracking responsibility from Tier 3 `WORKING_ON` and `FIELD_CONTROL` assignments.
- Opening a synthetic assigned task uses local React view state and reveals its Task Detail. This transition is not routing, authentication, project membership, or assignment persistence.
- Task Detail keeps Execution, People, Discussion, Delays / Problems, Actions, Evidence, History, and assigned Critical context attached to the task.
- Execution state and schedule attention are presented separately. The visual `Not Started` / `Late to Start` example has no Tracker Start/Resume event, no imported Actual Start, and imported progress of zero.
- Sync is a compact status with embedded recovery examples, not a navigation destination.
- All write-like controls are disabled. Only visual persona selection and local list/detail navigation are interactive.

## Implementation boundary

The current Mobile App does not implement:

- OIDC/login;
- Tier 2/Tier 3 project membership;
- direct-report relationships;
- explicit Tracker task assignments;
- task execution-event persistence or APIs;
- event-derived task state;
- production comments/discussion;
- production delays/problems, actions, or evidence;
- IndexedDB/offline queue;
- service-worker/background sync correctness;
- Tier 2 tracking validation writes;
- Tier 1 Project-input review;
- production Critical reporting;
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
- `docs/product/offline-audit-sync-rules.md`
- `docs/product/ux-anti-slop-rules.md`
- `docs/product/design-language-and-status-semantics.md`

## Local commands

```text
npm run dev
npm test
npm run build
```
