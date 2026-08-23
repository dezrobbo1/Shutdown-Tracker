# Shutdown Tracker

Shutdown Tracker is a shutdown, turnaround, outage, and major-overhaul execution-control platform. It uses exactly three project user tiers across a Tier 1 Master Console and a Tier 2/Tier 3 assigned-task Mobile App while Microsoft Project remains schedule calculation and master-file authority.

## Product boundary

Shutdown Tracker owns execution truth and reviewed Project inputs. Microsoft Project owns schedule recalculation. The Tier 1 schedule owner controls what happens to the resulting updated candidate schedule.

The core product handoff is:

```text
Tier 2/Tier 3 assigned-task execution information
+ authorised Tier 1 Console input
-> Tier 2 tracking validation where required
-> Tier 1 Project-input review
-> approved input manifest / preview
-> complete updated MSPDI/XML candidate generated from accepted source
-> candidate opened/imported in Microsoft Project
-> Microsoft Project recalculates candidate
-> source-versus-candidate delta reviewed
-> Tier 1 chooses:
     reject
     retain for further review
     use as next schedule/master
     merge/import into another existing Project schedule
-> Shutdown Tracker records provenance, decision, and audit
```

The point of the handoff is to produce a useful **updated Project schedule candidate**, not merely a sparse field patch.

Shutdown Tracker must not independently calculate CPM, critical path, float, resource levelling, recovery scheduling, dependency consequences, planned dates, or other schedule results. It must not silently update, overwrite, or merge into the accepted master `.mpp`, and it does not provide a server-side native `.mpp` writer.

Microsoft Project is expected to recalculate a disposable candidate after approved inputs are applied. Changes to planned dates, durations, summary roll-ups, work, assignment values, slack, criticality, and related fields may therefore appear in the candidate. Those values are **Project-calculated consequences**, not hidden Shutdown Tracker-authored inputs, and must be visible to Tier 1 in candidate review.

A Tier 1 schedule owner may ultimately use the candidate as the next controlled schedule or use Microsoft Project to merge/import it into an existing schedule. Those are explicit Tier 1-controlled outcomes and are recorded separately from candidate generation.

See [Project Candidate Schedule Handoff](docs/product/project-candidate-schedule-handoff.md) for the durable handoff contract.

## Applications

- **Master Console** — Tier 1-only project-control application with Projects Home and the top-level sections Today, Tasks, Critical, Import / Export, and Project Settings.
- **Mobile App** — Tier 2/Tier 3 assigned-task satellite application. Assigned Tasks is its only top-level operational destination; sync remains visible state rather than navigation.

Problems, discussion, actions, evidence, and history live in the relevant Task Dashboard. The Mobile App is not a responsive version of the Console.

## Current maturity

Implemented and experimental areas vary by branch. The durable product direction includes:

- Java 21 Spring Boot API and project-worker architecture;
- PostgreSQL and migration-managed persistence;
- immutable Project source/snapshot handling;
- MPXJ-based Project parsing and MSPDI/XML interchange;
- reviewed candidate/approval/export-integrity foundations;
- Master Console and Mobile App React/Vite applications;
- Project Operational Mapping, Critical reporting, task-owned Delays / Problems, Actions, Evidence, Discussion, History, and offline execution as product domains;
- append-only audit and explicit Tier 1 review boundaries.

Do not infer runtime completeness from this overview. App/service READMEs, source code, migrations, tests, and the current branch/PR define implemented behaviour.

## Architecture

- Monorepo.
- Frontend: React + Vite.
- Field delivery: mobile-first PWA, with installable delivery allowed without forking the product model.
- Backend: Java Spring Boot.
- Database: PostgreSQL.
- Microsoft Project processing: MPXJ plus Microsoft Project itself where Project-native recalculation is required.
- Interchange: MSPDI/XML remains the primary open format; native `.mpp` writing by the server is out of scope.
- Candidate schedule: always separate from the accepted source/master until the Tier 1 schedule owner explicitly adopts or merges it.
- Merge/import: Tier 1-controlled Microsoft Project operation, proven first against disposable/backed-up schedules.
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

- [Product Flow and Software Map](docs/product/product-flow-and-software-map.md), [User Tier and Assignment Model](docs/product/user-tier-and-assignment-model.md), [Task Operational Model](docs/product/task-operational-model.md), [Critical Reporting Model](docs/product/critical-reporting-model.md), [Project Lifecycle and Import / Export](docs/product/project-lifecycle-and-import-export.md), and [Implementation Status Map](docs/product/implementation-status-map.md) — primary product authority.
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
