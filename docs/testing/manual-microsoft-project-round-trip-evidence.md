# Historical Manual Microsoft Project Candidate-Schedule Evidence

Status: superseded technical test procedure; not current product authority, a delivery prerequisite, or an active acceptance gate.

This document preserves the manual diagnostic procedure developed for the earlier candidate-schedule design. [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md) defers the final Project export, candidate, recalculation, adoption, merge, and re-import contract until after operational frontend trials.

The procedure may still inform a future separately approved design, but running or passing it does not approve that design. Historic `planner` wording and fields such as `planner_project_edit` describe the earlier test vocabulary; they do not define an application role. Current application authority uses Tier 1, Tier 2, and Tier 3 only.

## Important distinction

The test is not “did no schedule field change?”

Microsoft Project is expected to recalculate dependent schedule state.

The test asks:

1. Were the exact approved inputs applied?
2. Did the handoff produce a separate complete updated Project candidate?
3. Could Microsoft Project open/import and recalculate that candidate?
4. Did the accepted source remain unchanged?
5. Can the source-versus-candidate differences be classified and reviewed?
6. Can the planner reject the candidate without affecting the source/master?
7. Can the reviewed candidate be used as a new schedule if the planner chooses?
8. If merge/import is a supported mode, can Microsoft Project merge/import the candidate into a disposable existing schedule with traceable before/after evidence?

## Evidence objects

Record separately:

- accepted source file/snapshot identity and SHA-256;
- approved-input manifest identity and SHA-256;
- generated candidate identity and SHA-256;
- Microsoft Project application/version/build;
- Project-calculated candidate identity/hash if Project saves/re-saves it;
- semantic delta identity/hash where generated;
- planner decision;
- destination-before and result-after identities/hashes for merge/import testing;
- later master-adoption metadata, if adoption occurs.

Generated Project/XML files and screenshots must remain outside Git. Repository evidence should be text-only and synthetic/sanitized.

## Delta classification

Every material source-versus-candidate difference should be classified as:

- `approved_input` — exact planner-approved Shutdown Tracker fact;
- `project_calculated_consequence` — dependent value created/recalculated by Microsoft Project;
- `planner_project_edit` — explicit manual change made by the planner in Microsoft Project during review;
- `unexpected_difference` — unexplained change requiring investigation.

Do not treat a Project-calculated planned-date/duration/summary/work/slack change as an automatic failure merely because Shutdown Tracker was not allowed to directly author that field.

The following test modes are preserved as the earlier technical procedure. They are not current product requirements.

## Test mode A — standalone updated candidate

This mode proves the candidate can function as a complete updated Project schedule in its own right.

1. Use a fully synthetic or explicitly approved sanitized accepted source.
2. Calculate and record the source hash.
3. Build a sealed approved-input manifest from exact reviewed candidate/approval identities.
4. Include any authorised planner Console inputs with their actor/time provenance.
5. Calculate and record the manifest hash.
6. Generate a **complete updated MSPDI/XML candidate** from the accepted source plus approved inputs.
7. Confirm the candidate is a new file/artifact and the accepted source/master path is unchanged.
8. Calculate and record the pre-Project candidate hash.
9. Open/import the candidate in Microsoft Project.
10. Let Microsoft Project perform its normal recalculation.
11. Record warnings/dialogs and the Microsoft Project version/build.
12. Confirm each approved input is present with the intended value/semantics.
13. Save a separate Project-reviewed candidate only when required for the diagnostic; never overwrite the accepted source.
14. Calculate and record any Project-saved candidate hash.
15. Compare source and candidate semantically.
16. Classify approved inputs, Project-calculated consequences, planner Project edits, and unexplained differences.
17. Review project finish movement, task planned-date/duration changes, summary changes, assignment/work effects, and Project-reported slack/criticality where present.
18. Confirm no Shutdown Tracker CPM/float/levelling/recovery calculation was used.
19. Confirm the candidate can be rejected without changing the source/master.
20. Record planner disposition: rejected / retained_for_review / suitable_as_next_schedule / needs_follow_up.

A standalone candidate passes when the exact approved inputs survive, the complete updated schedule is usable/reviewable in Project, the source is unchanged, and unexplained differences do not prevent safe planner review.

## Test mode B — merge/import into an existing schedule

This is a separate acceptance test. A standalone pass does not prove merge/import behaviour.

Run this mode only when merge/import is intended to be supported.

1. Start from a fresh synthetic existing destination schedule or a fresh disposable copy of the accepted schedule.
2. Record the destination file identity/hash before merge.
3. Keep the real/current master untouched.
4. Open the destination copy in Microsoft Project.
5. Use Microsoft Project's own supported import/merge workflow to apply the reviewed candidate.
6. Record the exact merge/import option used.
7. Record all Project warnings, task matching/UID behaviour, duplicate/conflict handling, and user choices.
8. Review the merged result before saving.
9. Save the merged result under a new path.
10. Calculate and record the result hash.
11. Confirm the exact approved inputs and intended Project-calculated consequences are present in the correct tasks.
12. Identify unexpected overwritten, duplicated, dropped, renumbered, or remapped task data.
13. Confirm the destination-before file and accepted source/master remain unchanged.
14. Record planner decision: merge_accepted / merge_rejected / needs_follow_up.

The first production-capable merge/import workflow must be proven against disposable/backed-up schedules before it is used with an operational master.

## Historical reviewer outcomes

The manual evidence may support these product outcomes:

- `rejected` — candidate not used;
- `retained_for_review` — candidate kept separate;
- `adopted_as_new_master` — planner chooses the candidate as the next controlled schedule;
- `merged_into_existing` — planner uses Microsoft Project to merge/import the candidate and accepts the merged result.

Candidate acceptance is not evidence that adoption or merge occurred. Record those outcomes separately.

## Failure conditions

The manual gate fails when:

- an approved input is dropped, altered, or applied to the wrong task;
- the accepted source/master is overwritten;
- a merge/import test mutates the only destination master without a recoverable/disposable copy;
- candidate/source/destination/result identity or hashes cannot be established;
- the handoff silently injects unapproved direct input values rather than letting Project calculate consequences;
- unexpected differences cannot be explained or reviewed safely;
- task identity/merge behaviour makes the result unsafe or ambiguous;
- the process requires hidden unattended adoption of the master.

It does **not** fail solely because Microsoft Project recalculates dependent schedule fields in the disposable candidate.

## Evidence note template

```text
evidence_id:
review_date:
reviewer_role:
synthetic_or_sanitized:
contains_real_project_data: false
source_snapshot_id:
source_file_uri:
source_file_hash:
approved_input_manifest_id:
approved_input_manifest_hash:
authoritative_candidate_ids:
captured_approval_event_ids:
input_origins:
handoff_mechanism:
microsoft_project_application:
microsoft_project_version:
candidate_file_uri:
candidate_file_hash_before_project:
candidate_file_hash_after_project:
candidate_generated_as_separate_copy: yes/no
source_file_unchanged: yes/no
approved_inputs_checked:
project_calculated_consequences_observed:
planner_project_edits:
unexpected_differences:
project_finish_delta:
standalone_candidate_decision: rejected/retained_for_review/suitable_as_next_schedule/needs_follow_up
merge_import_test_performed: yes/no
merge_destination_uri:
merge_destination_hash_before:
merge_import_mode:
merge_warnings_or_conflicts:
merge_result_uri:
merge_result_hash:
merge_import_decision: merge_accepted/merge_rejected/needs_follow_up/not_tested
final_planner_disposition: rejected/retained_for_review/adopted_as_new_master/merged_into_existing/not_adopted
master_adoption_reference:
generated_artifacts_committed: false
notes:
```

## Historical result and current status

The manual diagnostics performed during export-handoff investigation showed that minimal field-isolated MSPDI patches do not reliably reproduce the same tracking transaction as entering the fact through Microsoft Project. Those diagnostics are useful evidence against the sparse patch mechanism. They are not a permanent prohibition on the execution facts themselves and they do not test the full earlier candidate concept described above.

If a future approved export design reuses this mechanism, its own ADR and validation plan must decide which synthetic Microsoft Project checks are required. This historical manual procedure is not a current product gate and does not define or block the browser-local Tier 1 Project round-trip evidence workflow.
