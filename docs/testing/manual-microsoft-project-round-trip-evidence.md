# Manual Microsoft Project Candidate-Schedule Evidence

Manual Microsoft Project evidence exists to prove that reviewed Shutdown Tracker execution inputs can produce a separate, reviewable Project candidate without overwriting the accepted source/master.

## Important distinction

The test is not “did no schedule field change?”

Microsoft Project is expected to recalculate dependent schedule state.

The test asks:

1. Were the exact approved inputs applied?
2. Did Microsoft Project produce a separate candidate schedule?
3. Did the accepted source remain unchanged?
4. Can the source-versus-candidate differences be classified and reviewed?
5. Can the planner reject the candidate without affecting the master?

## Evidence objects

Record separately:

- accepted source file/snapshot identity and SHA-256;
- approved-input manifest identity and SHA-256;
- candidate schedule identity and SHA-256;
- Microsoft Project application/version/build;
- semantic delta identity/hash where generated;
- planner decision;
- later master-adoption metadata, if adoption occurs.

Generated Project/XML files and screenshots must remain outside Git. Repository evidence should be text-only and synthetic/sanitized.

## Delta classification

Every material source-versus-candidate difference should be classified as:

- `approved_input` — exact planner-approved Shutdown Tracker fact;
- `project_calculated_consequence` — dependent value created/recalculated by Microsoft Project;
- `unexpected_difference` — unexplained change requiring investigation.

Do not treat a Project-calculated planned-date/duration/summary/work/slack change as an automatic failure merely because Shutdown Tracker was not allowed to directly author that field.

## Acceptance procedure

1. Use a fully synthetic or explicitly approved sanitized accepted source.
2. Calculate and record the source hash.
3. Build a sealed approved-input manifest from exact reviewed candidate/approval identities.
4. Calculate and record the manifest hash.
5. Apply the manifest through the handoff mechanism under test to a disposable copy only.
6. Ensure the accepted source/master path is not overwritten.
7. Open/process the candidate through Microsoft Project as required by the mechanism.
8. Calculate and record the candidate hash.
9. Compare source and candidate semantically.
10. Confirm each approved input is present with the intended value/semantics.
11. Classify Project-calculated consequences separately from approved inputs.
12. Flag every unexplained difference.
13. Review project finish movement, task planned-date/duration changes, summary changes, assignment/work effects, and Project-reported slack/criticality where present.
14. Confirm no Shutdown Tracker CPM/float/levelling/recovery calculation was used.
15. Confirm the candidate can be rejected without changing the source/master.
16. Record planner decision.
17. Record master adoption only as a later, separate planner-controlled action.

## Failure conditions

The manual gate fails when:

- an approved input is dropped, altered, or applied to the wrong task;
- the accepted source/master is overwritten;
- candidate/source identity or hashes cannot be established;
- the handoff silently injects unapproved input values rather than letting Project calculate consequences;
- unexpected differences cannot be explained or reviewed safely;
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
handoff_mechanism:
microsoft_project_application:
microsoft_project_version:
candidate_file_uri:
candidate_file_hash:
candidate_generated_as_separate_copy: yes/no
source_file_unchanged: yes/no
approved_inputs_checked:
project_calculated_consequences_observed:
unexpected_differences:
project_finish_delta:
planner_candidate_decision: accepted/rejected/needs_follow_up
master_adoption_performed: yes/no
master_adoption_reference:
generated_artifacts_committed: false
notes:
```

## Current status

The manual diagnostics performed during export-handoff investigation showed that minimal field-isolated MSPDI patches do not reliably reproduce the same tracking transaction as entering the fact through Microsoft Project. Those diagnostics are useful mechanism evidence, not a permanent prohibition on the execution facts themselves.

No handoff mechanism should be marked production-ready until a synthetic candidate passes the procedure above.
