# Shutdown Tracker XML Round-Trip Lab

## Purpose

Prove Microsoft Project XML progress round trips through direct user trials before rebuilding the wider product.

## Current milestone

A user can import Microsoft Project XML in the browser, record execution intent, export a separate experimental candidate, open and save that candidate in Microsoft Project, then re-import the Project-saved result for comparison.

## Rules

- Browser-local only. Do not add a backend, database, authentication, roles, approvals, Mobile app, Critical reporting, messaging, production offline architecture, CPM, native MPP writing, or automatic Microsoft Project control.
- Never overwrite the imported source. Always generate a separate candidate.
- Target tasks by Microsoft Project UID and verify task identity before patching.
- Do not assume which XML fields form a valid Project transaction.
- Native Microsoft Project-authored evidence overrides prior documentation, code, and assumptions.
- A file opening successfully is not proof of semantic correctness.
- Every export profile must be labelled as baseline, diagnostic, or native-evidence-derived.
- Keep experiments independently selectable and preserve source, candidate, result, and execution-intent provenance.
- Real customer schedules and generated trial artifacts remain outside Git.
- Keep the active tree small. New infrastructure requires explicit user approval.

## Validation

Run:

```text
npm run check
npm test
npm run build
git diff --check
```
