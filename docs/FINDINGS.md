# Findings

## Confirmed

- A complete Microsoft Project XML file can contain mutually contradictory task, assignment and timephased progress state.
- Setting only task `PercentComplete`, `ActualStart` and `ActualFinish` was not sufficient to complete assigned BOILER tasks coherently.
- XML validity, source preservation, task identity, MPXJ readback and successful file generation do not prove Microsoft Project semantic compatibility.
- Microsoft Project-authored progress can change task, assignment, work, timephased, summary and wider schedule facts.
- User-authorised execution input must be distinguished from the dependent XML transaction and from later Project-calculated consequences.

## Current profile status

| Profile | Status | Use |
|---|---|---|
| Intent log only | Baseline | Measure native open/save normalization without progress edits |
| Task scalar diagnostic | Disproved for assigned-task completion | Reproduce and compare the failed three-field mechanism |
| Native semantic profile | Not yet defined | Must be derived from controlled Project-authored evidence |

## Working hypothesis

A Project progress operation is a multi-entity transaction rather than an isolated task-field patch. The exact required closure may differ by task type, assignment state, work model and native Project operation. This remains a hypothesis until bounded native comparisons establish reproducible profiles.
