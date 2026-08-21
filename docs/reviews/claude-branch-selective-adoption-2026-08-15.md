# Claude branch selective adoption review — 2026-08-15

## Scope

This review records what should and should not be carried from `claude-branch` into `main` without merging the branch wholesale.

At review time, `claude-branch` was 28 commits ahead of `main` and 0 commits behind, with merge base equal to the then-current `main` head. The branch contains a mixed set of changes: Design C review documentation, export-integrity/V007 authority work, API/client changes, worker security and storage hardening, Docker/CI work, database validation/concurrency suites, test changes, and documentation updates.

The branch therefore must not be treated as a single safe feature to copy into `main` piecemeal.

## Classification

### Adopt now

#### Design C review area

Adopt the Design C review directory and its review-only framing:

- `docs/design/prototypes/design-c/README.md`
- separate Master Console and Mobile Field App prototype artifacts when available

Reason: these are non-production design review artifacts. The README explicitly preserves the Microsoft Project authority boundary, treats console and mobile as separate application surfaces, distinguishes Critical Watch from Project critical-path status, and distinguishes locally queued data from server-confirmed data.

### Adopt through a separate bounded PR, not by file copy

#### Project-worker shared-secret authentication

`claude-branch` contains a worker request filter using a configured bearer shared secret and constant-time comparison, plus configuration and tests. This is directionally useful hardening, but it spans worker configuration, API worker clients, application configuration, tests, and deployment settings. It should be reviewed and adopted as one bounded worker-authentication change, not by copying only the filter class.

#### Project-worker storage-root confinement

`claude-branch` contains a storage path resolver that confines source and export paths to configured roots, resolves real paths for existing ancestors, and rejects unsupported URI schemes. This is useful hardening, but it is coupled to worker storage properties, worker handoff services, configuration, tests, and deployment paths. Adopt only as a complete bounded storage-hardening change.

#### Strict API JSON parsing

`claude-branch` adds API-wide rejection of unknown properties, numeric enum aliases, and duplicate JSON properties. This is a strong fail-closed boundary for authority-bearing requests, but it is API-wide behavior and may affect endpoints beyond export integrity. Adopt only after compatibility tests across the complete API surface.

#### Worker/API HTTP timeout configuration

The branch adds configurable worker client properties and related tests. This is appropriate operational hardening, but should be reviewed with the worker-authentication and handoff configuration rather than copied independently.

#### Docker / CI hardening

The branch adds a project-worker Dockerfile, `.dockerignore` changes, API Dockerfile changes, compose changes, and CI expansion. These are useful candidates, but they alter build/deployment behavior and should enter through a dedicated infrastructure/CI review with clean builds from `main`.

### Keep with the export-integrity authority change set

Do not selectively cherry-pick the following classes of change. They are tightly coupled and must move together through their reviewed export-integrity integration path:

- `infra/migrations/V007__enforce_export_candidate_integrity.sql`
- export candidate creation and approval event model
- export preview lifecycle and immutability changes
- JDBC export preview repository changes
- project-export-contract normalization/authority changes
- artifact handoff changes tied to the new integrity policy
- export audit taxonomy changes
- migration assertions and V006→V007 preservation fixtures
- deterministic PostgreSQL concurrency scripts
- export-integrity PostgreSQL/Spring integration tests
- export smoke-script changes tied to the new candidate/approval lifecycle
- documentation whose correctness depends on that lifecycle being active

Reason: these changes jointly define database policy, Java authority checks, API contracts, worker requests, tests, and migration behavior. Copying individual files risks creating an internally inconsistent authority model.

### Do not adopt into main as current product state

#### `docs/goals/ACTIVE.md`

Do not copy the branch's active-goal file into `main` unless the goal is explicitly reconciled with the current main branch and current PR state. Active-goal instructions are branch/workstream control material, not reusable product documentation.

#### Prototype interactions as implemented capability

Do not treat Design C prototype controls, queues, review states, evidence flows, Problems/Actions workflows, operational mappings, or mobile execution actions as proof that corresponding backend endpoints or persistence already exist.

## Product/design decisions worth retaining from the branch

Even where implementation is deferred, retain these principles in future work:

- Microsoft Project remains schedule authority.
- Approved Shutdown Tracker export state never means the master `.mpp` has been updated.
- The Master Console and Mobile Field App are separate application surfaces sharing domain/backend concepts, not a single responsive application.
- Project-derived classification must not become authorization automatically.
- Critical Watch is operationally selected critical work, not Project critical path.
- Offline/local queue state must be explicit and must not imply server receipt.
- Important blockers and commitments should be represented as structured Problems and Actions rather than buried in generic chat.

## Recommended next integration order

1. Keep Design C review artifacts in `main` as non-production references.
2. Complete the export-integrity authority work through its existing reviewed path; do not reconstruct it from individual branch files.
3. After that integration is settled, open a bounded worker hardening PR containing authentication, storage-root confinement, HTTP timeout configuration, Docker/runtime changes, and their tests.
4. Review strict JSON parsing separately because it changes API-wide request behavior.
5. Review CI/Docker changes from a clean `main` baseline rather than assuming the branch's build context remains current.

## Decision

`claude-branch` should remain an independent working branch. `main` should adopt reviewed outcomes selectively, not become a fast-forward or wholesale merge of the branch.
