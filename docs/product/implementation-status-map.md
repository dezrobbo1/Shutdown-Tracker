# Implementation Status Map

This document is primary product authority for distinguishing approved product direction from behaviour present in the `product/trial-foundation` tree. That tree is based directly on main at `c6f4cdf86355c5d2a9c16df485271e48675af109`; PR #48 is not its runtime or product-authority base.

## Status labels

Only these labels are used:

| Label | Meaning |
| --- | --- |
| Verified in repository | A bounded runtime path or independently useful technical capability is present and supported by repository evidence. Limits still apply. |
| Read-only API-wired | The surface reads backend data but does not provide the production write workflow. |
| Static visual only | Synthetic or hard-coded UI exists; controls and data do not establish production behaviour. |
| Designed, not built | Product direction exists without the required end-to-end runtime capability. |
| Explicitly excluded | Outside the active product boundary. |

A document, visual shell, enum, migration table, disabled control, or compatibility component alone does not prove an end-to-end production capability.

## Capability map

| Capability | Status | Repository evidence and limit |
| --- | --- | --- |
| Login visual flow | Static visual only | `apps/console/src/ConsoleViews.tsx` provides the review-only Login transition. It does not establish a session or identity. |
| OIDC and production authorization | Designed, not built | There is no production identity provider integration or Tier 1/Tier 2/Tier 3 authorization enforcement in either client or `services/api`. |
| Projects Home and project switching | Static visual only | `apps/console/src/App.tsx`, `ConsoleViews.tsx`, and `consoleData.ts` provide synthetic project search, lifecycle groupings, and switching for visual review only. |
| Project creation | Static visual only | Create Project is represented as disabled/static product direction. No production create-project client workflow is wired. Main retains `services/api/src/main/java/com/shutdowntracker/api/project/ReviewProjectBootstrapRunner.java` as a synthetic review utility; it is not project creation authority. |
| Project lifecycle | Static visual only | Project Settings represents Draft, Active, Closed, Archived, Close, Reopen, Archive, Restore, and eligible draft/test deletion. `infra/migrations/V002__projects_snapshots_and_imports.sql` has partial status storage, but no approved lifecycle service or client write path exists. |
| Three-tier membership | Static visual only | The Console Users surface explains Tier 1, Tier 2, and Tier 3. There are no membership, entitlement, or authorization runtime records. |
| Tier 2-to-Tier 3 direct-report relationships | Static visual only | The relationship and disabled assignment affordances are represented in the clients; there is no persistence, API, or authorization enforcement. |
| Tracker task assignments | Static visual only | `apps/mobile-pwa/src/mobileData.ts` and Console synthetic data show the approved assignment concepts. Imported Microsoft Project resource assignments are source facts, not Tracker authority. |
| Today | Static visual only | `TodayView` in `apps/console/src/ConsoleViews.tsx` represents the configurable 24-hour project projection and keeps execution state separate from attention conditions. It is not query/API-backed. |
| Tasks explorer | Static visual only | `TasksView` and `consoleData.ts` provide a synthetic WBS table, hierarchy, filters, grouping, columns, and saved-view affordances. There is no production project-task query or schedule editor. |
| Task Dashboard | Static visual only | `TaskDashboard` represents Overview, Execution, People, Discussion, Delays / Problems, Actions, Evidence, History, and Project context. Its records and controls are synthetic/disabled. |
| Task execution | Static visual only | Mobile Task Detail represents Can't Start, Start, Pause, Resume, Finish, system-captured timestamps, late-start context, pause/problem separation, and end-of-shift progress. There is no execution-event persistence, API, audited correction path, or event-derived state projection. |
| Discussion/comments | Static visual only | Task-centred examples exist without discussion/comment persistence or API writes. |
| Delays / Problems | Static visual only | Task-centred pause, blocker, and structured-problem examples exist without production persistence or APIs. |
| Actions | Static visual only | Disabled task-centred action controls exist without production persistence or APIs. |
| Evidence | Static visual only | Static evidence requirements and indicators exist without production metadata/upload APIs. |
| Mobile offline queue | Static visual only | The compact sync and recovery states are synthetic. There is no IndexedDB queue, service worker replay path, or production submission transport. |
| Retained Critical schema compatibility | Verified in repository | `infra/migrations/V006__critical_watchlists_reporting.sql` contains watchlist/work-pack, reporting policy/version, period, update, and supersession records. Its legacy source and ownership shapes do not implement the approved model. The applied migration remains unchanged as compatibility infrastructure. |
| Approved Critical UI | Static visual only | Console Critical and contextual Tier 2 Mobile reporting show versioned per-item policy, owner, templates, cadence/triggers, controlled content, known-fact reuse, due state, and history. Configuration/submission controls are disabled. |
| Approved Critical API and persistence | Designed, not built | No approved selected-leaf/work-pack service, Tier 2 reporting-owner workflow, policy-template API, obligation scheduler, submission API, or authorization path exists. A future additive migration must reconcile V006 compatibility with the approved model. |
| Browser MSPDI/XML inspection | Verified in repository | `apps/console/src/projectXmlPreview.ts` validates XML, confirms the Microsoft Project MSPDI namespace, and extracts Project/task identity and task facts for local read-only inspection. It does not parse `.mpp`, persist an import, or calculate a schedule. |
| Import source admission validation | Verified in repository | `services/api/src/main/java/com/shutdowntracker/api/sourcefile/SourceFileValidationService.java` checks supported filename/extension, non-empty content, and configured size. This is admission validation, not malware scanning or complete MSPDI semantic validation. |
| Import source storage, hash, and provenance | Verified in repository | `services/api/src/main/java/com/shutdowntracker/api/sourcefile/SourceFileUploadService.java`, `services/api/src/main/java/com/shutdowntracker/api/sourcefile/storage/LocalSourceFileStorage.java`, and `services/api/src/main/java/com/shutdowntracker/api/sourcefile/metadata/SourceFileMetadataService.java` store a versioned upload reference, SHA-256 content hash, and create a pending import batch with audit. Local filesystem storage is development/review infrastructure, not a production object-store implementation. |
| Microsoft Project parse summary | Verified in repository | `services/project-worker/src/main/java/com/shutdowntracker/projectworker/importer/MpxjProjectImportSummaryService.java` uses MPXJ to report bounded project/task/resource/assignment/calendar/custom-field counts without calculating the schedule. It does not return or persist a full task/entity snapshot. |
| Imported entity and snapshot storage | Verified in repository | `infra/migrations/V002__projects_snapshots_and_imports.sql`, `infra/migrations/V003__imported_project_entities.sql`, and `services/api/src/main/java/com/shutdowntracker/api/importedproject` provide versioned snapshot and imported task/resource/assignment/extended-attribute persistence. No connected production parser currently fills the complete model. |
| Immutable snapshot model | Verified in repository | New imports create versioned snapshot identities and imported entity rows; review state changes do not replace source identity. This is repository/application-path evidence, not a claim that arbitrary direct SQL mutation is impossible. |
| Import snapshot review API | Verified in repository | `services/api/src/main/java/com/shutdowntracker/api/importreview/ImportReviewController.java` and `services/api/src/main/java/com/shutdowntracker/api/importreview/ImportReviewService.java` provide snapshot list/detail plus audited accept/reject endpoints. They do not provide the approved mapping, reconciliation, and activation workflow. |
| Ordinary Console import review | Read-only API-wired | `apps/console/src/apiReviewClient.ts` and `apps/console/src/ImportExportView.tsx` can read configured snapshot list/detail data. The ordinary Console does not invoke import acceptance, rejection, upload, parse, mapping, reconciliation, or activation writes. |
| Task UID/ID lineage | Verified in repository | `services/api/src/main/java/com/shutdowntracker/api/tasklineage` and `packages/api-client/src/index.ts` provide suggested-link creation and accept/reject decisions over stored snapshots. There is no automatic matching engine or ordinary Console lineage UI. |
| Operational Mapping | Static visual only | Project Settings represents mapping health and its classification/filter/group/display/bulk-selection purpose. No Source Catalogue, profile/category mapping, membership resolution, mapping-health service, API, or production UI write path exists. |
| Retained export-preview compatibility | Verified in repository | Main retains `infra/migrations/V005__approval_and_export_batches.sql`, `services/api/src/main/java/com/shutdowntracker/api/exportpreview`, `packages/project-export-contract`, and `services/project-worker/src/main/java/com/shutdowntracker/projectworker/exporter/MpxjMspdiExportArtifactService.java`. This is experimental technical compatibility only: the writer creates a patch-shaped ProjectFile from selected task fields and is not the approved final export or round-trip design. |
| Ordinary Console Export | Static visual only | Import / Export marks export as not finalised. It must not present main's compatibility preview/writer or PR #48's candidate pipeline as the required product workflow. |
| PR #48 candidate approval, sealed preview, and browser RoundTripWorkspace | Explicitly excluded | Those changes are not present in `product/trial-foundation` and are not prerequisites or active product authority. PR #48 remains a superseded technical/research workstream. |
| Final Microsoft Project export / round trip | Designed, not built | Format, reviewed inputs, comparison, adoption, and verification design will be revisited after operational frontend trials. There is no required real-human PR #48 manual gate on this branch. |
| Native `.mpp` output | Explicitly excluded | Shutdown Tracker does not provide a server-side native `.mpp` writer. The final interchange format and external Microsoft Project interaction are intentionally deferred rather than inferred from the compatibility writer. |
| Scheduler / CPM functionality | Explicitly excluded | Shutdown Tracker does not calculate CPM, critical path, float, resource levelling, dependency consequences, schedule optimisation, or Project recalculation. Imported Project Critical remains read-only context. |

## Interpretation rules

- **Verified in repository** proves only the bounded capability stated in its row.
- Browser MSPDI inspection is a local read-only utility; it does not prove upload, persistence, activation, or round-trip acceptance.
- Main's source/snapshot/import-review capabilities are independently useful foundations and do not make PR #48 a prerequisite.
- V006 proves retained Critical schema compatibility, not the approved Critical workflow.
- Imported Project resource assignments do not prove Tier 2/Tier 3 operational assignments.
- Main's export-preview and minimal-writer code is experimental compatibility, not current product authority.
- The absence of PR #48's candidate pipeline and RoundTripWorkspace is deliberate; no manual Microsoft Project gate remains on the active product path.
- Product authority defines what should be built; runtime source, migrations, and tests determine what is built.
