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

The ordinary Console Import page is the primary activation path. A reviewer selects Microsoft Project XML/MSPDI, waits for local inspection and hashing, reviews the source identity/task rows, and selects `Start round-trip trial`. File selection alone does not activate a project. Explicit Start promotes the exact retained source bytes/text into a temporary browser-memory session and opens the imported Tasks hierarchy.

The exact-value environment flag remains as an optional direct-entry shortcut that opens the Console at the trial source chooser:

```text
VITE_SHUTDOWN_TRACKER_TIER1_ROUNDTRIP_TRIAL=true
```

This is the only interactive frontend trial currently retained. Outside an explicitly started or direct-entry round-trip session, ordinary Export remains not finalised and the ordinary Console/Mobile shells do not gain write behaviour.

## Source import and temporary project

The Import view accepts Microsoft Project XML/MSPDI only. Native `.mpp` is unsupported. The selected file is read locally as bytes, decoded with fatal UTF-8 handling, and both the original bytes and exact losslessly decoded XML text are retained unchanged in browser memory. A UTF-8 byte-order mark is retained; invalid or non-UTF-8 bytes fail closed. The UI announces inspection/hashing progress for larger sources. Nothing is uploaded or persisted.

The inspector extracts the bounded source facts it can support safely, including project identity/status date and task UID, ID, WBS/outline, summary status, planned dates, imported Actual Start/Finish, `% Complete`, `Physical % Complete`, and Project Critical context where supplied. Starting the trial adapts those facts into a temporary schedule while preserving source identity and hierarchy. Project resources never create application authority. A browser-local Tier 1 trial identity may operate every executable leaf task.

This first adapter requires every imported task row used by the temporary hierarchy to have one unique UID and a valid, continuous Outline Level. Planned Start and Finish remain nullable imported facts; the adapter does not invent them. Contradictory supplied dates, unsupported values, duplicate identity, or discontinuous hierarchy stop the trial with an explicit error rather than being inferred. That bounded admission rule is not a claim of complete MSPDI semantic support.

## Current location time

The Console uses the browser/device's current instant in the IANA time zone detected when the trial starts. The displayed clock and `Today`/attention projections refresh from that source, and each Can't Start, Start, Pause, Resume, Finish, progress, problem-resolution, or action-completion submission reads the clock again before recording the event. Timestamps use whole-minute precision because that is the current trial model and candidate policy.

The trial does not use Project `StatusDate`, the earliest planned Start, or a fixed fallback as execution time. Those values remain immutable imported schedule facts. Manual time advance and planned-start jump controls are not provided.

In this browser-only boundary, “location” means the device-configured IANA time zone at session activation. The zone is fixed for that temporary session so its evidence basis cannot change silently; discard and restart after changing device location/time zone. It is not inferred from Project XML, GPS, or IP address and is not verified by a server. Production project/site time-zone and operational-day configuration remain unbuilt; the current `Today` view therefore uses local calendar midnight.

Because the trial records timezone-neutral local wall-clock values, a daylight-saving fall-back can repeat an earlier minute. New updates fail closed while current local time is earlier than existing evidence; the Console preserves prior projections and instructs the reviewer to wait through the repeated interval or reset/discard the temporary session. A future production clock model must preserve an absolute instant separately from the reviewed Project-local field value.

## Tier 1 execution evidence

From an imported leaf Task Dashboard, Tier 1 may exercise Can't Start, Start, Pause, Resume, Finish, and a plain-language field-progress observation. The approved semantics remain unchanged: planned dates alone do not establish In Progress, Can't Start remains Not Started, Pause need not be an adverse delay, Resume does not silently close a linked problem, and progress alone does not silently create Start.

These events are temporary Tracker evidence. They do not update the imported source or establish production execution persistence. If the device clock changes so a new timestamp would precede existing local evidence, the trial fails closed and asks the reviewer to correct the device setting.

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

Reset returns the temporary session to its imported-source baseline at the then-current device time and removes generated execution facts, mappings, candidates, comparisons, annotations, and dispositions without changing the retained source text. Discard or reload removes the browser-memory project entirely. No trial history is written to a backend, database, `localStorage`, or master Project file.

## Questions this trial can inform

The evidence can inform which Tracker facts are useful Project inputs, whether `% Complete` or `Physical % Complete` is meaningful for field observations, whether the source-preserving patch is Project-compatible, which recalculation differences need semantic support, and what review/adoption contract should be designed later. It does not answer those questions as product authority.
