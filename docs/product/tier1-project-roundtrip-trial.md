# Tier 1 Project Round-Trip Trial

This document describes an opt-in, frontend-only evidence trial. It is subordinate to the [Project Lifecycle and Import / Export](project-lifecycle-and-import-export.md) authority and does not approve a final Microsoft Project export contract.

## Purpose and boundary

The trial lets a Tier 1 reviewer exercise an imported Microsoft Project XML/MSPDI schedule, review proposed mappings from Tracker facts, create a separate complete-source candidate, perform a manual Microsoft Project recalculation, and compare the returned XML. It is labelled:

```text
Tier 1 Project round-trip trial
Browser-local experimental workflow
No production persistence
No approved export contract
```

It is not the superseded PR #48 workflow. It has no candidate approval lifecycle, sealed preview, batch approval, backend candidate API, production adoption gate, native `.mpp` writer, scheduling engine, or CPM calculation.

## Activation

Enable the Console trial only with the exact value `true`:

```text
VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true
```

The existing fixed deterministic trial remains independently available through `VITE_SHUTDOWN_TRACKER_TRIAL_MODE=true`. Outside the explicit round-trip mode, ordinary Export remains not finalised.

## Source import and temporary project

The Import view accepts Microsoft Project XML/MSPDI only. Native `.mpp` is unsupported. The selected file is read locally as bytes, decoded with fatal UTF-8 handling, and both the original bytes and exact losslessly decoded XML text are retained unchanged in browser memory. A UTF-8 byte-order mark is retained; invalid or non-UTF-8 bytes fail closed. Nothing is uploaded or persisted.

The inspector extracts the bounded source facts it can support safely, including project identity/status date and task UID, ID, WBS/outline, summary status, planned dates, imported Actual Start/Finish, `% Complete`, `Physical % Complete`, and Project Critical context where supplied. Starting the trial adapts those facts into a temporary schedule while preserving source identity and hierarchy. Project resources never create application authority. A clearly synthetic Tier 1 reviewer may operate every executable leaf task.

This first adapter requires every imported task row used by the temporary hierarchy to have one unique UID and a valid, continuous Outline Level. Planned Start and Finish remain nullable imported facts; the adapter does not invent them. Contradictory supplied dates, unsupported values, duplicate identity, or discontinuous hierarchy stop the trial with an explicit error rather than being inferred. That bounded admission rule is not a claim of complete MSPDI semantic support.

The controllable clock starts from Project Status Date where present, otherwise the earliest supported planned start, otherwise a labelled synthetic fallback. All generated Tracker events use that trial time.

## Tier 1 execution evidence

From an imported leaf Task Dashboard, Tier 1 may exercise Can't Start, Start, Pause, Resume, Finish, and a plain-language field-progress observation. The approved semantics remain unchanged: planned dates alone do not establish In Progress, Can't Start remains Not Started, Pause need not be an adverse delay, Resume does not silently close a linked problem, and progress alone does not silently create Start.

These events are temporary Tracker evidence. They do not update the imported source or establish production execution persistence.

## Experimental mapping review

No mapping is included by default. Start and Finish show pre-populated experimental field proposals that still require explicit inclusion; a progress observation requires the reviewer to choose between the supported experimental progress fields:

- Tracker Start -> `Actual Start`;
- Tracker Finish -> `Actual Finish`; and
- Tracker progress observation -> either `% Complete` or `Physical % Complete`.

The mapping view shows the source value, proposed value, exact task identity, proposed or selected field, and include/exclude state. These are evidence-gathering proposals, not automatic mappings or final product authority.

## Complete-source candidate

The browser patcher starts from the complete losslessly decoded UTF-8 XML string and creates a separate candidate. It targets one exact Task UID, checks optional ID/name/WBS/summary identity and expected source values, and applies only explicitly selected supported fields. Untouched XML text is copied verbatim from the retained source string. Existing scalar-field attributes are retained. An absent field is inserted only at supported adjacent MSPDI Task-order anchors; a missing, duplicate, summary, stale, or unsafe target fails closed rather than guessing. SHA-256 values cover the original source bytes and the UTF-8 candidate bytes.

This source-preserving browser patcher does not use the retained patch-shaped backend compatibility writer and does not calculate Project consequences.

## Manual Microsoft Project step

1. Download the experimental candidate as a new XML file.
2. Open it in Microsoft Project.
3. Confirm the intended task by UID/ID/name/WBS and the selected Tracker input.
4. Allow Microsoft Project to recalculate normally and inspect the consequences.
5. Save/export the result as a new XML file without overwriting the original source.
6. Return to the Console and select that result XML.

This is a product-trial instruction, not a mandatory production acceptance gate.

## Result comparison and disposition

The returned XML is inspected locally. The comparison confirms comparable project/task identity and the selected Tracker inputs. Other supported-field or document differences remain `Unclassified difference — manual review required` until the reviewer classifies them as a Microsoft Project-calculated consequence, a human Project edit, or an unexplained difference. The Console does not guess that arbitrary differences are valid recalculation consequences.

The reviewer may record an in-memory disposition: Works as expected, Mapping needs revision, Candidate generation problem, Project compatibility problem, Unexplained differences, or Not suitable, with optional notes. This is evidence only and never production approval.

## Reset and disposal

Reset returns the temporary session to its imported-source baseline and removes generated execution facts, mappings, candidates, comparisons, annotations, and dispositions without changing the retained source text. Discard or reload removes the browser-memory project entirely. No trial history is written to a backend, database, `localStorage`, or master Project file.

## Questions this trial can inform

The evidence can inform which Tracker facts are useful Project inputs, whether `% Complete` or `Physical % Complete` is meaningful for field observations, whether the source-preserving patch is Project-compatible, which recalculation differences need semantic support, and what review/adoption contract should be designed later. It does not answer those questions as product authority.
