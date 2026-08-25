# Trial Foundation Retention Map

This document records how the active product foundation treats work associated with PR #48. It is a retention decision, not an endorsement of the old candidate workflow.

## Retained independently useful capability

| Capability | Treatment on the trial foundation | Reason and limit |
| --- | --- | --- |
| Browser MSPDI/XML inspection | Retained under Console Import review | Pure browser validation and task/hierarchy inspection; no upload, persistence, approval, or export semantics. |
| Source filename/size validation | Retained from `main` | Useful admission foundation; not complete content or malware validation. |
| Source storage, SHA-256, and provenance metadata | Retained from `main` | Independently useful for immutable import identity. Local storage remains development-only. |
| Immutable imported snapshots | Retained from `main` | Core import and re-import foundation. |
| Imported task/resource/assignment storage | Retained from `main` | Read-only Project facts; not Tracker assignment authority. |
| Task UID/ID lineage review | Retained from `main` | Useful for reconciling immutable snapshots. |
| Read-only import review API/client | Retained from `main` | Snapshot list/detail reads support product review without enabling writes. |
| MPXJ summary parsing | Retained from `main` | Useful format/project/count inspection without schedule calculation. |
| Existing export-preview and minimal MSPDI writer code | Left unchanged on `main`, classified experimental | Pre-existing technical infrastructure; not the current product workflow or authority. |

## Deliberately excluded PR #48 additions

| Capability | Treatment | Reason |
| --- | --- | --- |
| V007 export-integrity migration and database suite | Excluded | Implements the superseded exact-candidate policy. |
| Exact candidate creation and candidate-bound approval | Excluded | Final Project-bound input and approval policy is deferred. |
| Sealed preview and batch approval | Excluded | Not a required execution architecture. |
| Complete-source candidate generation changes | Excluded | Coupled to the superseded candidate contract. |
| Narrow direct-input allowlist as product policy | Excluded | Operational trials must first establish the required progress semantics. |
| Browser round-trip acceptance workspace | Excluded | Mixed import inspection with candidate approval, generation, download, and verification. |
| PR #48 synthetic fresh-review bootstrap endpoint/workflow | Excluded | Acceptance-harness support, not product project creation. Main's disabled review runner remains compatibility infrastructure and is not a production create-project path. |
| Candidate download and Project-open/verification controls | Excluded | Belong to the deferred export design. |
| Manual Microsoft Project round-trip gate | Excluded as active prerequisite | Historical acceptance procedure, not a gate for operational frontend trials. |
| PR #48 candidate API-client additions | Excluded | Coupled to exact candidate, approval, preview, and generation endpoints. |
| PR #48 fixture and generated-output expectations | Excluded | Candidate-oriented test state is not needed for the retained browser inspector. |
| Persistent task-snapshot handoff added for the acceptance workspace | Deferred for separate review | The task-only/local-file implementation needs timezone policy and dedicated API/persistence tests before reuse. |

## Obsolete main-branch prototype removed

The earlier Python XML simulation harness was removed from this foundation. It derived application actors from an imported department field, modelled supervisor/planner approvals, and directly patched a narrow set of Project XML values. That model conflicts with explicit Tier 1/Tier 2/Tier 3 assignments and with the decision to validate Tracker execution and progress before approving a replacement Project-bound contract. The retained Tier 1 Project round-trip trial instead keeps the imported source immutable and applies reviewed proposals only to a separate browser-local candidate.

## Interpretation

No retained item makes PR #48 an ancestor or prerequisite of the active branch. Future teams may consult the old work as technical research, but a new export design must be approved on its own evidence.
