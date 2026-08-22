# Project Export Contract

Shared Java request and response records for API-to-worker Microsoft Project candidate generation.

This package contains contract types only. It does not generate files, call MPXJ, persist metadata, calculate schedules, or write back to Microsoft Project.

## Candidate request

`ProjectExportArtifactRequest` represents one approved candidate-generation request as:

- the accepted source schedule identity, storage URI and recorded SHA-256 (`ProjectExportArtifactSource`); and
- the exact approved leaf-task direct inputs to apply to that source.

The worker uses the source identity/hash to prove the generated pre-Project candidate derives from the reviewed source rather than rebuilding an unrelated sparse schedule.

The current direct-input contract allows only:

- `percent_complete`;
- `actual_start`;
- `actual_finish`.

It rejects physical percent, unknown fields, summary-task candidates, duplicate imported-task/field candidates, inconsistent repeated imported-task identity, and duplicate Microsoft Project UID or ID mappings.

The request `projectName` is an audit/worker label. It is not authority to rename the source Project schedule.

## Value normalization

`ProjectExportValueNormalizer` is the canonical proposed-value boundary shared by the API and worker.

Whole-number percent equivalents such as `75`, `75.0`, and `075` canonicalize to `75`. Fractional and out-of-range percentages are rejected.

Proposed actual dates require ISO-8601 minute- or second-precision values with an explicit offset and canonicalize to whole seconds while preserving the reviewed Microsoft Project local wall-clock component. Omitted seconds become `:00`. A fractional component is accepted only when it contains one through six digits and every digit is zero; that zero-valued fraction canonicalizes away. Non-zero fractions, fractions outside the one-to-six-digit input range, offset-free values, and invalid values are rejected.

The worker validates normalized values again before applying them. Imported baseline timestamps do not cross this contract as proposed values; the API preserves their available precision separately for freshness comparison.

## Artifact summary

`ProjectExportArtifactSummary` distinguishes the number of approved/updated tasks from the total source task count and records the exported field count, artifact size, SHA-256 and notes. This supports evidence that a complete source-derived candidate was produced rather than a sparse task-only patch.

The direct-input allowlist applies before Microsoft Project opens the candidate. It does not constrain the legitimate schedule consequences Microsoft Project may calculate afterward.
