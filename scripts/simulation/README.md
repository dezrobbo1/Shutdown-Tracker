# Simulation Trial Harness

This directory contains development/test tooling for a controlled shutdown simulation trial. It is not production task-execution logic and it does not replace Microsoft Project, the API review workflow, MPXJ worker generation, or manual Project verification.

## Purpose

The harness is designed to answer one narrow question before broader live-execution APIs are built:

> Can a real local MSPDI/XML schedule survive a seeded 60-shift execution simulation while preserving all protected Project structure and changing only explicitly allowlisted leaf-task progress fields?

The harness deliberately keeps AI away from raw XML. Future AI agents may emit structured task-progress proposals, but deterministic code must validate task identity, role/department ownership, leaf-task status, value ranges, and the XML write allowlist before any mutation is applied.

## Actor topology

The trial derives execution ownership from the imported Microsoft Project custom task field:

- field name: `Text30`
- alias: `Assigned Department`

For each distinct nonblank Assigned Department on executable leaf tasks, the harness creates:

- one supervisor;
- zero to two field-user delegates, default two.

Summary tasks and leaf tasks without Assigned Department do not create supervisors. Unassigned executable work should be treated as a separate data-quality concern rather than silently assigned.

The prototype authority chain is:

```text
field user proposal
-> assigned-department supervisor acceptance
-> planner approval
-> deterministic allowlisted XML patch
-> structural integrity validation
-> next shift
```

The deterministic accept/approve steps are placeholders for trial orchestration. Replacing them with OpenAI/Codex agents must preserve the same structured boundary; agents must never write raw XML.

## Authorized XML fields

Only these task fields may change:

- `PercentComplete`
- `ActualStart`
- `ActualFinish`

Direct summary-task progress writes fail closed. The harness fingerprints the complete XML with only those three task values masked, then checks the protected fingerprint after every shift. It also verifies that the task UID set is unchanged and reparses every generated snapshot before continuing.

This does **not** calculate CPM, critical path, float, resource levelling, recovery schedules, or Microsoft Project recalculation. A PASS means the simulation harness preserved its protected XML invariants; it is not proof that Microsoft Project would calculate the same schedule result.

## Run a local trial

Use a local XML file outside Git. Real schedules must not be committed.

```text
python scripts/simulation/simulation_trial.py /path/to/local-project.xml \
  --output-dir simulation-runs/calciner-trial \
  --shifts 60 \
  --seed 20260809 \
  --max-field-users 2
```

Generated output contains:

- `shift-00.xml` through `shift-60.xml`;
- `simulation-ledger.jsonl`;
- `manifest.json`.

The output directory is local test evidence only. Do not commit generated XML or real schedule data.

## Replayability

The seed controls all deterministic progress decisions. Running the same input XML with the same seed, shift count, and field-user cap must produce the same event ledger and protected XML fingerprint.

The ledger records separate field, supervisor, planner, patch, and integrity events so future agent-driven trials can be compared with deterministic baseline runs.

## Tests

The unit tests use a synthetic inline MSPDI fixture only:

```text
python -m unittest discover -s scripts/simulation/tests -p "test_*.py"
```

They verify:

- `Text30 / Assigned Department` routing;
- one supervisor per department;
- a maximum of two field users;
- summary-task progress rejection;
- unauthorized schedule mutation rejection;
- allowlisted progress mutation;
- deterministic replay;
- one generated XML snapshot per shift.

## Deliberately not included

This first trial harness does not add:

- production task-progress persistence;
- supervisor/planner API endpoints;
- OpenAI credentials or API calls;
- automatic Microsoft Project opening or verification;
- native `.mpp` writes;
- scheduler calculations;
- real Project fixtures;
- generated trial artifacts in Git.

Those remain separate production or experimental work. The harness exists to prove the simulation mechanics and XML-safety assumptions before that expansion.
