# Implementation Status Map

This document is primary product authority for distinguishing approved product direction from behaviour verified in the current tree. The guarded schedule-handoff runtime remains stacked on PR #48 base `178bc80976d7be60d349137266c8e18d70278ade`.

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
| Login visual shell | Static visual only | `apps/console/src/ConsoleViews.tsx` represents a review-only Login transition without credential capture or persistence. |
| OIDC / production session | Designed, not built | No OIDC/security dependency or authentication/authorization runtime is present in the API or client applications. |
| Projects Home / project switcher shell | Static visual only | `apps/console/src/ConsoleViews.tsx` represents search, Active/Draft/Closed/Archived groups, project opening, and project switching with synthetic data and local view state. |
| Production project list / switching APIs | Designed, not built | There is no production project list, search, lifecycle grouping, project-selection, or switching service/API. |
| Production project creation | Designed, not built | `ReviewProjectBootstrapController` creates an isolated synthetic acceptance project only; its repository marks the project for `review_bootstrap_only`. |
| Project lifecycle shell | Static visual only | Project Settings represents Draft/Active/Closed/Archived, Close/Reopen/Archive/Restore, and eligible-delete controls; every lifecycle control is disabled. |
| Production project lifecycle | Designed, not built | `infra/migrations/V002__projects_snapshots_and_imports.sql` has partial project status storage but no approved Draft/Active/Closed/Archived lifecycle service/API. |
| Three-tier membership | Designed, not built | There are no Tier 1/Tier 2/Tier 3 membership, entitlement, or authorization runtime records. Generic audit actor fields are not membership. |
| Tier 2-to-Tier 3 relationship shell | Static visual only | Console Users and Mobile synthetic examples show the approved direct-report relationship; no persistence, API, authorization check, or membership runtime exists. |
| Tier 2-to-Tier 3 direct-report runtime | Designed, not built | No direct-report persistence, API, authorization check, or application entitlement exists. |
| Mobile Assigned Tasks / Task Detail | Static visual only | `apps/mobile-pwa/src/App.tsx` represents the assigned-task-only shell, Tier 2 tracking, Tier 3 `WORKING_ON`/`FIELD_CONTROL`, task-owned operational sections, and compact sync state with synthetic data. |
| Task assignments | Static visual only | Assigned mobile work is hard-coded in `apps/mobile-pwa/src/mobileData.ts`; imported Project resource assignments are source snapshot facts, not Tracker operational assignments. |
| Task execution | Static visual only | `task_execution_state` vocabulary exists, but the Mobile controls are read-only/disabled and there is no execution-event persistence, API, or event-derived projection. |
| Console Today | Static visual only | `apps/console/src/ConsoleViews.tsx` represents a configurable 24-hour projection with separate execution state and schedule-attention conditions; data is synthetic. |
| Console Tasks explorer | Static visual only | The WBS table, search, local expand/collapse, and disabled filter/group/column/saved-view affordances have no production task explorer API. |
| Task Dashboard | Static visual only | The Console represents Overview, Execution, People, Discussion, Delays / Problems, Actions, Evidence, History, and Project/import/export context with synthetic data and disabled writes; no aggregate API exists. |
| Console Project Settings shell | Static visual only | General, Users, Operational Mapping, Project History, and Lifecycle sections are represented with synthetic data and disabled production controls. |
| Task comments | Static visual only | Console/Mobile Discussion examples and disabled controls have no discussion/comment persistence or API. |
| Delays / Problems | Static visual only | Task-owned synthetic records and disabled controls exist; a problem-status enum alone is not a production workflow. |
| Actions | Static visual only | Task-owned disabled controls and state vocabulary exist without production action persistence/API/UI writes. |
| Evidence | Static visual only | Task-owned synthetic indicators and disabled controls exist without production evidence metadata/upload workflow. |
| Mobile offline queue | Static visual only | Sync examples are hard-coded; no IndexedDB queue, service worker, replay client, or production submission path exists. |
| Retained Critical schema foundation | Verified in repository | `infra/migrations/V006__critical_watchlists_reporting.sql` contains watchlist/work-pack, `summary_task`/`multi_summary` source, policy, period, immutable update, and supersession records. It has no approved selected-leaf source or explicit Tier 2 reporting-owner model and is retained compatibility, not the approved workflow. |
| Approved Critical schema/model | Designed, not built | The approved selected Project-critical leaf source, explicit Tier 2 reporting owner, and exact first-UX model are not represented end to end. V006 compatibility must be extended only through a future additive migration; V006 itself remains unchanged. |
| Approved Critical API | Designed, not built | No Critical service, controller, repository implementation, API client, reporting-assignment workflow, or authorization path exists. |
| Approved Critical UI shell | Static visual only | Console Critical represents explicit selected leaves, one-summary-plus-descendants work packs, Tier 2 owner, cadence, report state, due state, and condition; Mobile shows an assigned obligation in Task Detail. There are no production writes. |
| Ordinary Console import/export review | Read-only API-wired | `apps/console/src/apiReviewClient.ts` performs configured snapshot list/detail and optional export-preview GETs. Other ordinary Console panels remain synthetic and write controls remain disabled. |
| Import source admission validation | Verified in repository | `SourceFileValidationService` checks filename extension, non-empty size, and a configured size limit. This is placeholder admission validation, not content, malware, or complete MSPDI semantic validation. |
| Import source storage | Verified in repository | `SourceFileUploadService`, `LocalSourceFileStorage`, source metadata, SHA-256, and import-batch creation are wired. Local filesystem storage is development/review only; production object storage is not implemented. |
| Microsoft Project parsing | Verified in repository | Worker `parse-snapshot` uses MPXJ and returns the task subset needed by the acceptance workspace. The current path does not persist full resources, assignments, calendars, custom-field definitions, or timephased data. |
| Acceptance import path (task subset) | Verified in repository | Upload, pending import batch, worker parse, task persistence, and review are connected for the guarded workspace. The handoff supplies empty resource, assignment, and extended-attribute lists and is not the approved complete production import. |
| Approved production import flow | Designed, not built | Operational Mapping validation, current-snapshot comparison, lineage reconciliation as a coordinated gate, activation, full Project-entity persistence, and the ordinary production Console workflow are incomplete. |
| Immutable snapshots | Verified in repository | Import parsing inserts versioned snapshot records through `JdbcImportedProjectRepository`; review changes snapshot decision state rather than replacing source identity. This is application-path evidence, not a claim that arbitrary direct SQL is impossible. |
| Import review | Verified in repository | `ImportReviewController` and `ImportReviewService` list/detail and accept/reject parsed snapshots with audit. The guarded review workspace exposes these controls beneath Import / Export; there is no approved production Operational Mapping activation gate. |
| Lineage review | Verified in repository | `TaskLineageController` and `TaskLineageService` support suggested-link creation and accept/reject decisions with audit, and the shared API client is typed. There is no ordinary Console lineage UI or automatic matching engine. |
| Operational Mapping UI shell | Static visual only | Project Settings represents mapping health and approved classification/query uses with disabled controls. It explicitly does not grant authority. |
| Operational Mapping runtime | Designed, not built | Raw imported source table shapes exist, but there is no Source Catalogue, profile/category mapping, alias, membership-resolution, mapping-health service, API, or production write UI. The acceptance import does not persist resources/assignments/extended attributes required for the full design. |
| Export candidate creation | Verified in repository | `ExportCandidateController`, candidate services and repositories, V007 candidate records, exact approval binding, shared client methods, and tests implement the guarded candidate path. |
| Exact candidate approval binding | Verified in repository | Candidate approval events are append-only and bound to exact candidate identity; current-policy database and service checks revalidate source, task, field, value, fingerprint, lifecycle, and latest approval state. |
| Candidate preview and sealed membership | Verified in repository | `ExportPreviewService` and `JdbcExportPreviewRepository` materialise candidate-ID-only previews, seal line membership, and revalidate captured approvals and eligibility before approval/generation. |
| Complete-source candidate generation | Verified in repository | `MpxjMspdiExportArtifactService` verifies an accepted MSPDI/XML source hash, applies approved inputs to the complete source, writes a separate candidate, and performs pre-Project integrity checks. Native `.mpp` candidate writing is not implemented. |
| Browser round-trip acceptance workspace | Verified in repository | `RoundTripWorkspace` remains feature-flagged and dynamically loaded, but is now entered beneath Console Import / Export. It preserves the guarded acceptance path and is not an ordinary production write workflow. |
| Project-open / verification metadata recording | Verified in repository | API and workspace controls record Project-open and verification metadata. The acceptance workspace uses a manually supplied actor UUID because OIDC is absent. Recording metadata does not prove Microsoft Project verification occurred correctly. |
| Real-human Microsoft Project round trip | Designed, not built | The manual procedure and evidence fields exist, but the external PR #48 gate has not been performed and recorded. Repository automation cannot satisfy this gate. |
| Native `.mpp` output | Explicitly excluded | MPXJ is used for import and MSPDI/XML output; server-side native `.mpp` writing is outside the approved boundary. Microsoft Project may save a reviewed candidate externally. |
| Scheduler / CPM functionality | Explicitly excluded | Shutdown Tracker does not calculate CPM, critical path, float, resource levelling, schedule optimisation, or Project recalculation. The worker applies reviewed inputs and Microsoft Project remains calculation authority. |

## Interpretation rules

- A **Verified in repository** row proves only the bounded capability described in that row.
- The guarded round-trip acceptance workspace does not prove the ordinary Console is production-ready.
- V006 proves a retained Critical reporting schema foundation, not a built Critical workflow.
- Imported Project resource assignments do not prove Tier 2/Tier 3 operational assignments.
- Recording Project-open or verification metadata does not satisfy the pending real-human Microsoft Project gate.
- Product authority documents define what should be built; source, migrations, and tests determine what is built.
