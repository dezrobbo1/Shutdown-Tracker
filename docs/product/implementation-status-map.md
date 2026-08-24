# Implementation Status Map

This document is primary product authority for distinguishing approved product direction from behaviour present in the current product-trial foundation. The foundation was established directly from `main`; PR #48 is not its runtime or product-authority base. The opt-in [Deterministic Operational Trial](deterministic-operational-trial.md) is verified frontend product-review capability, not production persistence or an API/data-contract commitment.

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
| Production three-tier membership | Designed, not built | The fixed trial has synthetic Tier 1, Tier 2, and Tier 3 personas, but there are no production membership, entitlement, identity, or authorization records. |
| Production Tier 2-to-Tier 3 direct-report relationships | Designed, not built | The fixed trial model constrains local delegation to synthetic direct reports. There is no production persistence, API, membership validation, or authorization enforcement. |
| Deterministic trial model and reset | Verified in repository | `packages/trial-model/src` provides one fixed fictional scenario, pure action reducer, simulated clock, deterministic IDs, derived projections, event history, and exact reset/replay tests. It is local in-memory product-review code only. |
| Deterministic Console-Mobile trial bridge | Verified in repository | `packages/trial-model/src/bridge.ts` and the clients provide an optional linked-window message channel with expected-window/origin validation. It transports synthetic in-memory state/actions only; it is not persistence, an API contract, or production sync. |
| Production Tracker task assignments | Designed, not built | The approved Tier 1-to-Tier 2 and direct-report Tier 2-to-Tier 3 model has no persistence, API, membership, or authorization enforcement. Imported Microsoft Project resource assignments are source facts, not Tracker authority. |
| Deterministic trial task assignments | Verified in repository | Trial mode applies Tier 1 tracking-owner changes and Tier 2 direct-report field delegation through the shared reducer. Tier 2/Tier 3 projections update immediately in the linked or standalone local state and reset deterministically. |
| Today | Verified in repository | Trial mode derives the configurable 24-hour projection, execution counts, late starts, blockers, planned-finish attention, Critical due/overdue state, problems, actions, and recent activity from shared local state. There is no production query/API. |
| Tasks explorer | Verified in repository | Trial mode uses the synthetic WBS hierarchy and derived task projections with local hierarchy/search interactions. There is no production project-task query, schedule editor, or recalculation. |
| Task Dashboard | Verified in repository | Trial mode derives task state, people, problems/actions, Critical context, and History from shared local task/event state. Discussion and evidence remain placeholders and there is no production record API. |
| Task execution | Verified in repository | Trial mode implements deterministic Can't Start, Start, Pause, Resume, Finish, system-captured simulated timestamps, late-start context, pause/problem separation, and end-of-shift progress. There is no persisted execution API, audited correction path, or production authorization/offline behaviour. |
| Discussion/comments | Static visual only | Task-centred examples exist without discussion/comment persistence or API writes. |
| Delays / Problems | Verified in repository | The trial can create/link/resolve synthetic task problems and keeps adverse delay distinct from a pause interval. No production persistence or API exists. |
| Actions | Verified in repository | The trial can create/link/complete synthetic task actions in local state. No production persistence or API exists. |
| Evidence | Static visual only | Static evidence requirements and indicators exist without production metadata/upload APIs. |
| Mobile offline queue | Static visual only | The compact sync and recovery states are synthetic. There is no IndexedDB queue, service worker replay path, or production submission transport. |
| Retained Critical schema compatibility | Verified in repository | `infra/migrations/V006__critical_watchlists_reporting.sql` contains watchlist/work-pack, reporting policy/version, period, update, and supersession records. Its legacy source and ownership shapes do not implement the approved model. The applied migration remains unchanged as compatibility infrastructure. |
| Approved Critical trial UI | Verified in repository | Trial mode supports local Critical leaf/work-pack selection, Tier 2 owner, template/item override, versioned supported timing/triggers/content, deterministic obligations, known-fact reuse, immutable submission, and superseding correction. Outside trial mode the examples remain static; no Critical API exists. |
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
| PR #48 candidate approval, sealed preview, and browser RoundTripWorkspace | Explicitly excluded | Those changes are not present in the active product foundation and are not prerequisites or active product authority. PR #48 remains a superseded technical/research workstream. |
| Final Microsoft Project export / round trip | Designed, not built | Format, reviewed inputs, comparison, adoption, and verification design will be revisited after operational frontend trials. There is no required real-human PR #48 manual gate on the active foundation. |
| Native `.mpp` output | Explicitly excluded | Shutdown Tracker does not provide a server-side native `.mpp` writer. The final interchange format and external Microsoft Project interaction are intentionally deferred rather than inferred from the compatibility writer. |
| Scheduler / CPM functionality | Explicitly excluded | Shutdown Tracker does not calculate CPM, critical path, float, resource levelling, dependency consequences, schedule optimisation, or Project recalculation. Imported Project Critical remains read-only context. |

## Interpretation rules

- **Verified in repository** proves only the bounded capability stated in its row.
- A verified deterministic-trial row proves local synthetic behaviour only. It does not prove production persistence, authorization, API, offline replay, cross-device synchronization, or a settled backend data model.
- `VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true` enables the trial explicitly. Default/static shells and production implementation status must not be inferred from trial controls.
- Browser MSPDI inspection is a local read-only utility; it does not prove upload, persistence, activation, or round-trip acceptance.
- Main's source/snapshot/import-review capabilities are independently useful foundations and do not make PR #48 a prerequisite.
- V006 proves retained Critical schema compatibility, not the approved Critical workflow.
- Imported Project resource assignments do not prove Tier 2/Tier 3 operational assignments.
- Main's export-preview and minimal-writer code is experimental compatibility, not current product authority.
- The absence of PR #48's candidate pipeline and RoundTripWorkspace is deliberate; no manual Microsoft Project gate remains on the active product path.
- Product authority defines what should be built; runtime source, migrations, and tests determine what is built.
