# Active Goal — PR #48 Complete-Source Project Handoff

## Status

Active.

Pull request [#48](https://github.com/dezrobbo1/Shutdown-Tracker/pull/48) remains **draft** and must not be merged or marked ready without explicit instruction.

Expected branch:

`backend/enforce-export-integrity`

PR #61 has been merged into this branch. PR #60 has been reconciled into this branch as the complete-source candidate implementation workstream and should be closed as superseded only after the final PR #48 head is green.

## Outcome

Finish one coherent Microsoft Project handoff path that combines:

- the hardened exact-candidate, exact-approval and export-lifecycle controls from PR #48;
- the browser round-trip acceptance harness from PR #61; and
- complete-source MSPDI/XML candidate generation reconciled from PR #60.

The resulting local acceptance path is:

```text
choose Project XML/MSPDI or MPP
-> upload source
-> project worker parses imported task facts
-> API persists a reviewable snapshot
-> planner accepts snapshot
-> select leaf task and direct input
-> create exact candidate
-> approve exact candidate
-> create sealed preview
-> approve batch
-> generate complete-source MSPDI/XML candidate
-> download candidate from browser
-> open in Microsoft Project
-> Microsoft Project recalculates
-> planner reviews source-versus-candidate impact
-> record Project-open and verification metadata
```

## Authority model

### Shutdown Tracker — execution/input authority

Shutdown Tracker may capture, review, approve and audit exact Project-bound execution inputs under the active policy.

Current direct-input authority is limited to approved leaf-task:

- `percent_complete`;
- `actual_start`;
- `actual_finish`.

This is a direct-input boundary, not a post-Project difference allowlist.

### Microsoft Project — calculation authority

Microsoft Project owns schedule calculation. After the approved input is applied to a complete candidate, Project may legitimately recalculate dependent values including planned dates, durations, summary roll-ups, work/assignments, timephased data, slack, criticality and project finish.

Those are `project_calculated_consequence` values. Do not reject them merely because Shutdown Tracker was not authorised to author those fields directly.

### Planner — candidate/adoption authority

The planner reviews the recalculated candidate and decides whether to reject it, retain it, adopt it as the next controlled schedule, or later merge/import it using Microsoft Project.

Candidate generation, Project open and verification do not silently overwrite the accepted master.

## Implemented automated path

The branch now includes:

- immutable authoritative input candidates;
- exact candidate-bound approval events;
- sealed preview membership and generation-time revalidation;
- current policy-1 lifecycle immutability and provenance controls;
- V006 historical preservation;
- browser upload/import/review/candidate/approval/generation/download controls;
- project-worker parsing for the browser acceptance path;
- hash-verified local artifact download;
- complete-source candidate generation from the accepted Project XML/MSPDI source;
- accepted-source SHA-256 verification before mutation;
- exact task UID/ID/name/leaf checks;
- approved-field-only pre-Project mutation;
- pre-Project semantic/source-order differencing that rejects unapproved structural change;
- ordinary `.xml` and explicit `.mspdi.xml` source filenames proceeding to worker MSPDI content validation.

MPP may be imported for review, but the current complete-source candidate mechanism requires Microsoft Project XML/MSPDI as the source. MPP-native candidate generation would require a separately reviewed Project-native/COM mechanism.

## Critical safety distinction

The source-versus-generated-candidate invariant is a **pre-Microsoft-Project** proof that Shutdown Tracker changed only approved direct inputs.

It must never be reused as a post-Project invariant. After Microsoft Project opens the candidate and recalculates it, legitimate Project-calculated schedule consequences are expected and must be reviewed rather than automatically rejected.

## Remaining gate

The remaining external product gate is a human Microsoft Project round trip using the browser-generated complete-source candidate.

The manual check must establish that:

1. the candidate downloads and opens successfully in Microsoft Project;
2. the exact approved input lands on the intended task UID/ID;
3. Microsoft Project performs its normal recalculation;
4. Project-calculated consequences are reviewable and distinguishable from approved inputs;
5. unexpected differences can be investigated;
6. the accepted source/master remains unchanged; and
7. the planner can reject the candidate without affecting the source/master.

Do not claim this manual gate has passed until it is actually performed and recorded.

## Required automated validation

Before considering the automated scope complete, the final branch head must pass:

```text
mvn test
npm ci
npm test
npm run build
python -m unittest discover -s scripts/simulation/tests -p "test_*.py"
bash scripts/db/validate-migrations.sh
```

The PostgreSQL/export-integrity suite must continue to prove exact candidate/approval binding, stale-data rejection, lifecycle immutability, rollback, concurrency and legacy preservation.

## Safety constraints

- Do not weaken exact candidate/approval binding, stale-data checks, batch sealing, provenance, worker direct-input allowlists or V006 preservation.
- Do not calculate CPM, critical path, float, resource levelling, recovery scheduling or dependency consequences in Shutdown Tracker.
- Do not treat native Microsoft Project recalculation as an unauthorized side effect.
- Do not silently overwrite or adopt the accepted master schedule.
- Do not implement a server-side native `.mpp` writer.
- Keep real schedules, generated candidates, local databases and operational data out of Git.
- Do not rewrite history, rebase, amend or force-push.
- Keep PR #48 draft until the manual Microsoft Project gate is complete and explicit review/merge instruction is given.
