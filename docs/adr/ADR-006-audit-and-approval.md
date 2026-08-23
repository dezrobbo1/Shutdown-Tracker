# ADR-006: Audit and Approval

Status: Accepted for audit; export-approval portion superseded by [ADR-012](ADR-012-product-trial-foundation-and-export-deferral.md)

Append-only audit remains active authority. Approval batches and export-eligible field rules in this record are retained as technical history, not as the current Project export contract.

## Context

Execution updates, evidence, handover notes, Critical reports, imports, and any future Project-bound exchange require traceability.

## Decision

Record append-only audit events for material state changes. Any future export design must define its own approval boundary through a new decision; the historical approval-batch model is not inherited by the active product foundation.

## Consequences

- Audit schema must be designed early.
- Execution, assignment, Critical-policy, Critical-report, import, correction, and lifecycle events remain attributable and interpretable over time.
- Existing export approval tables and services are experimental compatibility infrastructure only.
