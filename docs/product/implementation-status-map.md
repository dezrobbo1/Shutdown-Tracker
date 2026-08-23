# Implementation Status Map

This document is primary product authority for distinguishing approved product direction from behaviour verified in the repository at the stacked branch base `178bc80976d7be60d349137266c8e18d70278ade`.

## Status labels

Only these labels are used:

| Label | Meaning |
| --- | --- |
| Verified in repository | Runtime path, persistence, or guarded acceptance workflow is present and supported by repository evidence. Limits still apply. |
| Read-only API-wired | The surface reads backend data but does not provide the production write workflow. |
| Static visual only | Synthetic/hard-coded UI exists; controls and data do not establish production behaviour. |
| Designed, not built | Product or schema direction exists without the required end-to-end runtime capability. |
| Explicitly excluded | Outside the product boundary. |

Documentation, an enum, a migration table, or a visual shell alone does not prove a production capability.

## Capability map

| Capability | Status | Repository evidence and limit |
| --- | --- | --- |
| Login / OIDC | Designed, not built | No OIDC/security dependency, login surface, or authentication/authorization runtime is present in the API or client applications. |
| Projects Home | Designed, not built | The Console mounts the ordinary review shell or guarded round-trip workspace from `apps/console/src/main.tsx`; there is no production project list, search, lifecycle grouping, or switcher. |
| Production project creation | Designed, not built | `ReviewProjectBootstrapController` creates an isolated synthetic acceptance project only; its repository marks the project for `review_bootstrap_only`. |
| Project lifecycle | Designed, not built | `infra/migrations/V002__project_import_and_snapshot_entities.sql` has partial project status storage but no approved Draft/Active/Closed/Archived lifecycle service or UI. |
| Three-tier membership | Designed, not built | There are no Tier 1/Tier 2/Tier 3 membership, direct-report, entitlement, or authorization runtime records. Generic audit actor fields are not membership. |
| Task assignments | Static visual only | Assigned mobile work is hard-coded in `apps/mobile-pwa/src/mobileData.ts`; imported Project resource assignments are source snapshot facts, not Tracker operational assignments. |
| Task execution | Static visual only | `task_execution_state` vocabulary exists, but the Mobile controls are read-only/disabled and there is no execution-event persistence, API, or event-derived projection. |
| Task Dashboard | Static visual only | The ordinary Console task/progress panels use synthetic data and disabled controls in `apps/console/src/App.tsx`; no production Task Dashboard route or aggregate API exists. |
| Task comments | Static visual only | The Mobile comment input is read-only and no discussion/comment persistence or API exists. |
| Delays / Problems | Static visual only | Synthetic problem cards and disabled blocker controls exist; a problem-status enum alone is not a production workflow. |
| Actions | Static visual only | Disabled action controls and state vocabulary exist without production action persistence/API/UI writes. |
| Evidence | Static visual only | Synthetic evidence indicators and disabled shortcuts exist without production evidence metadata/upload workflow. |
| Mobile offline queue | Static visual only | Sync examples are hard-coded; no IndexedDB queue, service worker, replay client, or production submission path exists. |
| Critical reporting | Designed, not built | `infra/migrations/V006__critical_reporting.sql` is a verified schema foundation, including source, policy, period, report, and supersession records. No Critical service, API client, or application surface exists. |
| Ordinary Console import/export review | Read-only API-wired | `apps/console/src/apiReviewClient.ts` performs configured snapshot list/detail and optional export-preview GETs. Other ordinary Console panels remain synthetic and write controls remain disabled. |
| Project import | Verified in repository | Source upload, worker `parse-snapshot`, MPXJ task parsing, snapshot persistence, and accept/reject review exist. The current acceptance path persists the task facts needed by the harness and supplies empty resource, assignment, and extended-attribute lists; it is not complete production import. |
| Immutable snapshots | Verified in repository | Import parsing inserts versioned snapshot records through `JdbcImportedProjectRepository`; review changes snapshot decision state rather than replacing source identity. This is application-path evidence, not a claim that arbitrary direct SQL is impossible. |
| Lineage review | Verified in repository | `TaskLineageController` and `TaskLineageService` support suggested-link creation and accept/reject decisions with audit, and the shared API client is typed. There is no ordinary Console lineage UI or automatic matching engine. |
| Operational Mapping | Designed, not built | Raw imported source table shapes exist, but there is no Source Catalogue, profile/category mapping, alias, membership-resolution, mapping-health service, API, or production UI. The current acceptance import does not persist resources/assignments/extended attributes required for the full design. |
| Export candidate creation | Verified in repository | `ExportCandidateController`, candidate services/repositories, V007 candidate records, exact approval binding, shared client methods, and tests implement the guarded candidate path. |
| Complete-source candidate generation | Verified in repository | `MpxjMspdiExportArtifactService` verifies an accepted MSPDI/XML source hash, applies approved inputs to the complete source, writes a separate candidate, and performs pre-Project integrity checks. Native `.mpp` candidate writing is not implemented. |
| Browser round-trip acceptance workspace | Verified in repository | `RoundTripWorkspace` is dynamically enabled by `VITE_SHUTDOWN_TRACKER_ROUND_TRIP_MODE` and drives the guarded acceptance path. It is an acceptance workspace, not the ordinary production Console. |
| Manual Microsoft Project verification | Verified in repository | API and workspace controls record Project-open and verification metadata. The acceptance workspace uses a manually supplied actor UUID because OIDC is absent. The external real-human Microsoft Project round-trip is still pending; the repository does not prove that gate complete. |
| Scheduler / CPM functionality | Explicitly excluded | Shutdown Tracker does not calculate CPM, critical path, float, resource levelling, schedule optimisation, or Project recalculation. The worker applies reviewed inputs and Microsoft Project remains calculation authority. |

## Interpretation rules

- A **Verified in repository** row proves only the bounded capability described in that row.
- The guarded round-trip acceptance workspace does not prove the ordinary Console is production-ready.
- V006 proves a retained Critical reporting schema foundation, not a built Critical workflow.
- Imported Project resource assignments do not prove Tier 2/Tier 3 operational assignments.
- Recording manual verification metadata does not satisfy the pending real-human Microsoft Project gate.
- Product authority documents define what should be built; source, migrations, and tests determine what is built.
