# Shutdown Tracker

Shutdown Tracker is a shutdown, turnaround, outage, and major-overhaul execution-control platform. It helps planners, coordinators, supervisors, field teams, inspectors, contractors, and managers control live execution while Microsoft Project remains the schedule calculation and master-file authority.

## Product boundary

Shutdown Tracker owns execution truth and reviewed execution inputs. Microsoft Project owns schedule recalculation. The planner owns adoption of the resulting candidate schedule.

The controlled progress path is:

```text
field execution update
-> supervisor review
-> planner input review
-> approved input manifest / preview
-> disposable candidate schedule prepared
-> Microsoft Project applies inputs and recalculates candidate
-> source-versus-candidate delta reviewed
-> planner accepts or rejects candidate
-> planner may manually adopt a new master schedule
-> Shutdown Tracker records provenance, decision, and audit
```

Shutdown Tracker must not independently calculate CPM, critical path, float, resource levelling, recovery scheduling, dependency consequences, planned dates, or other schedule results. It must not silently update or overwrite the accepted master `.mpp` and does not provide a server-side native `.mpp` writer.

Microsoft Project is expected to recalculate a disposable candidate after approved execution inputs are applied. Changes to planned dates, durations, summary roll-ups, work, slack, criticality, and related fields may therefore appear in the candidate. Those values are **Project-calculated consequences**, not hidden Shutdown Tracker-authored inputs, and must be visible to the planner in the candidate review.

See [Project Candidate Schedule Handoff](docs/product/project-candidate-schedule-handoff.md) for the durable handoff contract.

## Applications

- **Master Console** — desktop-oriented operations workspace for imported Project work, execution status, problems, actions, evidence, handover, review, Critical Watch, operational mapping, and planner-controlled candidate review.
- **Field App** — mobile-oriented application for assigned work, execution actions, progress updates, problems, evidence, handover, and visible sync state.

## Current maturity

Implemented and experimental areas vary by branch. The durable product direction includes:

- Java 21 Spring Boot API and project-worker architecture;
- PostgreSQL and migration-managed persistence;
- immutable Project source/snapshot handling;
- MPXJ-based Project parsing and MSPDI/XML interchange;
- reviewed candidate/approval/export-integrity foundations;
- Master Console and Field App React/Vite applications;
- Project Operational Mapping, Critical Watch, Problems, Actions, Evidence, Handover, and offline execution as product domains;
- append-only audit and explicit planner review boundaries.

Do not infer runtime completeness from this overview. App/service READMEs, source code, migrations, tests, and the current branch/PR define implemented behaviour.

## Architecture

- Monorepo.
- Frontend: React + Vite.
- Field delivery: mobile-first PWA, with installable delivery allowed without forking the product model.
- Backend: Java Spring Boot.
- Database: PostgreSQL.
- Microsoft Project processing: MPXJ plus Microsoft Project itself where Project-native recalculation is required.
- Interchange: MSPDI/XML remains the primary open format; native `.mpp` writing by the server is out of scope.
- Candidate schedule: always separate from the accepted source/master until planner adoption.
- File/evidence architecture: provider-neutral storage abstractions and immutable artifact provenance.
- Offline field direction: IndexedDB queue, service worker, explicit sync state, idempotency keys.
- Communications direction: entity-linked Discussion around structured records, not generic chat as the source of truth.

## Repository structure

```text
apps/
services/
packages/
infra/
scripts/
fixtures/
docs/
```

## Documentation authority

Use documentation by purpose:

- [docs/concept](docs/concept/README.md) — high-level product definition and MVP boundary.
- [docs/product](docs/product/README.md) — current product behavior and workflows.
- [docs/architecture](docs/architecture/README.md) — durable system structure.
- [docs/adr](docs/adr/README.md) — architecture decisions.
- [docs/research](docs/research/README.md) — supporting evidence and provenance.
- [docs/testing](docs/testing/README.md) — verification procedures.
- GitHub pull requests and commit history — implementation chronology.

`AGENTS.md` contains repository-specific implementation guidance for coding agents.

## Development and validation

From the repository root:

```text
mvn test
npm test
npm run build
```

Migration validation:

```text
./scripts/db/validate-migrations.sh
```

The repository must not contain real customer Project files, real schedule archives, generated candidate schedules, evidence uploads, secrets, local databases, or operational artifacts unless an explicit fixture policy permits a fully synthetic asset.
