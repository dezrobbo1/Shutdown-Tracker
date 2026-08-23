# Correction and Supersession Rules

Submitted operational records should generally be corrected by superseding records, not overwritten in place.

Existing export records are experimental compatibility infrastructure under [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md). Their retention rules below preserve technical history; they do not establish the final Project export product contract.

## Draft Edits

- Draft records may be edited in place by their owner or by Tier 1.
- Draft edits should not imply submitted operational truth.
- Submitting a draft creates an auditable operational record.

## Submitted Update Correction

- Submitted field updates should not be silently overwritten.
- Corrections should create a new correction record or superseding record linked to the original.
- The correction must capture actor, timestamp, reason, old value summary, and new value summary.
- Reviewers may request correction instead of editing a user's submitted update directly.

## Critical Report Correction

- Critical reports are immutable after submission.
- Corrections create `critical_update_corrected` or `critical_update_superseded` audit events.
- Corrected Critical reports must preserve the original report and show which report is current.
- The assigned Tier 2 reporter may submit a correction where policy allows.
- Tier 1 may review or create a correcting/superseding report without rewriting the original.

## Task Completion Reversal

- Completion reversal is a distinct auditable action, not an edit to hide the original completion.
- Reversal should require a reason.
- Reversal may return a task to an appropriate prior state such as In Progress or Paused while preserving any linked blocked/delayed condition and review state.
- Reversal does not alter an already generated experimental export artifact; retained compatibility records preserve their own history.

## Problem Reopen

- Reopening a problem creates an audit event.
- The prior closed state, reopen actor, reason, and new owner/escalation state should be visible.
- Reopening does not erase closure history.

## Action Reopen

- Reopening an action creates an audit event.
- The prior completed/verified state, reopen actor, reason, and new due/owner state should be visible.
- Reopening does not erase completion or verification history.

## Evidence Unlink and Supersede

- Evidence should not be silently deleted from operational history.
- Unlinking removes an association but preserves evidence metadata and audit history.
- Superseding marks newer evidence as replacing older evidence for operational use.
- Original file deletion, if ever supported, requires separate retention and legal-hold rules.

## Experimental Export Batch Compatibility

- Existing generated export batches and artifacts are retained as immutable technical records.
- If the compatibility workflow supersedes a batch, it creates a new batch and links back to the earlier record.
- Superseded compatibility batches remain visible in technical history.
- Existing open/verification metadata remains historical evidence only; it is not an active product gate or proof that the master schedule changed.

## Who Can Correct What

| Record type | Tier 1 | Tier 2 | Tier 3 |
| --- | --- | --- | --- |
| Draft task update | Any project task | Own update on assigned tracked task | Own update on assigned task |
| Submitted task update | Correct/supersede with reason | Request/correct on assigned tracked task | Submit correction to own update where policy allows |
| Task completion | Correct/reverse any task with reason | Correct/reverse assigned tracked task where policy allows | Request correction/reversal on assigned task |
| Critical report | Review/correct/supersede | Correct own assigned formal report | No formal reporting authority |
| Delay/problem/action | Correct/reopen on any task | Correct/reopen on assigned tracked task | Update own/assigned record where policy allows |
| Evidence link | Unlink/supersede on any task under retention policy | Unlink/supersede on assigned tracked task | Request or update own link on assigned task |
| Experimental export batch | Supersede within retained compatibility workflow | No | No |

## Must Never Be Silently Overwritten

- Submitted field updates.
- Critical reports.
- Approved task completions.
- Retained experimental export batch contents.
- Retained generated export artifacts.
- Audit events.
- Evidence metadata/history.
- Project membership, direct-report, and assignment changes.
- Microsoft Project source file import records.
