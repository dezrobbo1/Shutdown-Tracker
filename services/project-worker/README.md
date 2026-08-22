# Project Worker

Purpose: Spring Boot worker service for bounded Microsoft Project parsing and controlled complete-source MSPDI/XML candidate generation.

## Authority boundary

Microsoft Project remains the schedule calculation authority. The worker does not calculate CPM, critical path, float, resource levelling, recovery schedules, dependency consequences, or project-finish movement.

The worker may apply an exact set of planner-approved direct execution inputs to an accepted Microsoft Project XML/MSPDI source. The resulting pre-Project candidate is then opened in Microsoft Project so Project can perform its normal recalculation.

Current direct-input fields are limited to:

- `percent_complete`;
- `actual_start`;
- `actual_finish`.

This allowlist is a **direct-input boundary**. It is not a rule that the candidate must remain unchanged after Microsoft Project recalculates it.

## Import processing

The worker uses MPXJ `16.4.0` for Project-file reading.

Current import endpoints include:

- `POST /worker/project-import/parse-summary` — returns parser/project/count metadata only;
- `POST /worker/project-import/parse-snapshot` — returns the imported task facts required by the browser round-trip acceptance path.

The API owns persistence, review state, acceptance decisions and audit. The worker does not turn imported schedule facts into live execution state.

MPP, XML and MSPDI may be read for import/review when supported by MPXJ. Real Project files remain local test/operational data and must not be committed.

## Complete-source candidate generation

The worker endpoint is:

- `POST /worker/project-export/generate-artifact`

`MpxjMspdiExportArtifactService` no longer rebuilds a sparse Project file from only the changed task fields. For the complete-source handoff it:

1. receives the exact accepted source identity, local storage URI and recorded SHA-256 from the API;
2. reads the accepted source bytes;
3. verifies the bytes still match the recorded source hash;
4. requires a Microsoft Project MSPDI/XML document with namespace `http://schemas.microsoft.com/project` and root `Project`;
5. resolves every approved task by Project UID and rechecks task ID, name and leaf status;
6. applies only the approved `PercentComplete`, `ActualStart` and/or `ActualFinish` values;
7. inserts new task fields in MSPDI task-element order;
8. writes a separate candidate XML file;
9. reparses source and candidate and verifies that the pre-Project candidate differs only at the exact approved task/field pairs; and
10. returns candidate URI/hash and summary counts.

The accepted source file is never overwritten.

Ordinary `.xml` filenames and `.mspdi.xml` filenames can proceed to candidate generation. Filename classification alone is not trusted as proof of MSPDI: the worker validates the document namespace/root before applying any input.

A source imported from native `.mpp` can be reviewed, but this complete-source generation mechanism currently requires Microsoft Project XML/MSPDI. Native MPP candidate handling would require a separately reviewed Project-native/COM companion or another approved mechanism; the server does not write native MPP files.

## Pre-Project integrity check

`MspdiCandidateDifference` is a pre-Microsoft-Project safety check. It detects unapproved element, attribute, value and sibling/task-order changes while excluding the exact approved direct-input fields.

This check proves that **Shutdown Tracker** did not author anything beyond the reviewed inputs before the candidate reaches Project.

It must not be applied as a post-Project invariant. Once Microsoft Project opens the candidate it may legitimately recalculate dates, durations, summaries, assignment/work values, timephased data, slack, criticality, project finish and other dependent schedule state. Those are Project-calculated consequences for planner review.

## Value normalization

The API and worker share the proposed-value normalizer.

- `percent_complete` canonicalizes whole-number equivalents such as `75`, `75.0` and `075` to `75`; fractional and out-of-range values are rejected.
- Proposed `actual_start` and `actual_finish` require explicit-offset ISO-8601 values and canonicalize to whole seconds while preserving the reviewed Microsoft Project local wall-clock component.
- Unsupported fields, duplicate task/field candidates, inconsistent task identity, summary-task candidates, unknown/numeric enum aliases, unknown/duplicate JSON properties, invalid values and non-XML output paths fail closed.

## Browser acceptance path

The Master Console round-trip mode can now drive source upload, task-snapshot parsing, snapshot acceptance, candidate creation/approval, sealed preview, batch approval, candidate generation and candidate download without manually assembling backend API calls.

Microsoft Project is still opened manually for the external acceptance gate. The planner then records Project-open and verification metadata through the console.

## Runtime and local development

The worker HTTP service defaults to port `8081` or `PORT` when set.

Run from the repository root:

```text
mvn -pl services/project-worker test
mvn -pl services/project-worker spring-boot:run -Dspring-boot.run.profiles=local
```

The local profile uses the repository PostgreSQL/Flyway configuration where required. Future queue/background-job wrapping should reuse the worker-owned parsing and candidate-generation boundaries rather than moving Project processing into the API.

## Data safety

Do not commit real customer/site Project files, generated candidates, screenshots, local databases, secrets, evidence files, or operational data. Synthetic fixtures under the repository fixture policy are the only committed Project-like test assets.
