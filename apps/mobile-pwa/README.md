# Mobile App

Purpose: React/Vite mobile-first PWA satellite for Tier 2 and Tier 3 assigned work.

Current status: empty `Assigned Tasks` application frame. It has no fictional operational data and does not enable assignment, execution, end-of-shift progress, Critical reporting, or sync behaviour.

## Approved application target

```text
Assigned Tasks
  Task Detail
```

Assigned Tasks remains the only top-level operational destination. The current frame shows an honest zero-task state because production identity, assignment, and task APIs are not connected.

The approved future boundary remains:

- Tier 2 sees tasks explicitly assigned by Tier 1 for tracking.
- Tier 2 may assign those tasks to direct-report Tier 3 while retaining tracking responsibility.
- Tier 3 sees tasks explicitly assigned by Tier 2 as `WORKING_ON` or `FIELD_CONTROL`.
- Neither tier may browse the whole project.
- Discussion, Delays / Problems, Actions, Evidence, History, and assigned Critical reporting obligations belong inside Task Detail.
- Sync remains transport/recovery state inside assigned work, not a separate destination.

## Current application frame

- `Assigned Tasks` is the only top-level operational destination.
- No persona selector, example project, fictional task, task event, progress record, Critical report, or sync state is supplied.
- Task Detail is not implemented in the current application frame.
- No write-like controls are exposed.
- Reloading does not create or restore task data.

## Implementation boundary

The current Mobile App does not implement:

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

There is no service worker, IndexedDB store, replay client, background sync implementation, or Mobile API wiring. The web manifest supplies install/display metadata only.

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
