# Shutdown Tracker

Shutdown Tracker is a shutdown, turnaround, outage, and major-overhaul execution-control platform. It uses exactly three project user tiers across a Tier 1 Master Console and a Tier 2/Tier 3 assigned-task Mobile App while Microsoft Project remains schedule calculation and master-file authority.

## Product boundary

Shutdown Tracker owns operational execution truth, assignments, Critical reporting, task-owned records, and immutable imported Project snapshots. Microsoft Project remains the schedule calculation and master-file authority.

The active product path is:

```text
import immutable Project schedule
-> validate product structure and operational mappings
-> assign tracking responsibility
-> validate Tier 1, Tier 2, and Tier 3 workflows
-> validate execution, progress, Today, task, and Critical reporting behaviour
-> revisit the Project export/round-trip contract with trial evidence
```

Shutdown Tracker must not independently calculate CPM, critical path, float, resource levelling, recovery scheduling, dependency consequences, planned dates, or other schedule results. It must not silently update, overwrite, or merge into the accepted master `.mpp`, and it does not provide a server-side native `.mpp` writer.

The exact Project export, approval, candidate, adoption, and round-trip workflow is intentionally **not finalised**. Earlier PR #48 candidate/export work is retained only in its original branch and as explicitly identified technical research or pre-existing infrastructure; it is not a prerequisite or current product authority. See [ADR-012](docs/adr/ADR-012-product-trial-foundation-and-export-deferral.md) and the [Trial Foundation Retention Map](docs/product/trial-foundation-retention-map.md).

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
- browser-only MSPDI/XML inspection for import review;
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
- Export/candidate processing already present on main is experimental technical infrastructure, not the settled product workflow.
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
