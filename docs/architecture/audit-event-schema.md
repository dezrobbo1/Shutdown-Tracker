# Audit Event Schema

## Purpose and authority

Audit events provide a durable record of security, membership, assignment, operational, import/export, approval, offline-sync, discussion, evidence, and reporting activity. They support accountability, incident review, export traceability, evidence handling, and compliance reporting.

Authorization context follows [User Tier and Assignment Model](../product/user-tier-and-assignment-model.md), [Task Operational Model](../product/task-operational-model.md), and [Authorization Model](../security/authorization-model.md). Job titles, areas, packages, contracts, watchlists, WBS values, and Operational Categories are not authorization scopes.

This document describes the target logical event model. The applied V004 migration uses compatibility columns named `actor_role`, `actor_scope`, and `metadata`. Until an additive migration introduces dedicated fields, new events use those columns to record membership tier and explicit assignment identifiers/context; they must not encode job-title or category-derived authority. Do not rewrite an applied migration.

## Immutable audit-event rule

Audit events are append-only. An audit event must not be edited or deleted in ordinary application workflows. If an event is wrong or incomplete, create a later correction or supersession event that references the original event.

Membership deactivation, tier change, direct-report changes, assignment endings, and project closure or archive never erase the authority context under which an earlier event occurred.

## Baseline event model

| Field | Purpose |
| --- | --- |
| `event_id` | Stable server-generated audit event identifier. |
| `project_id` | Project identity for the event. |
| `event_category` | Broad category from the applied vocabulary, such as `task`, `permission`, or `export`. |
| `event_type` | Specific event type such as `task_progress_submitted`. |
| `event_version` | Schema version for this event shape. |
| `occurred_at` | Time the user or system action occurred. |
| `server_received_at` | Time the server accepted the event. |
| `recorded_at` | Time the audit event was written. |
| `actor_user_id` | Authenticated user, if any. |
| `actor_display_name` | Display name at event time for review convenience. |
| `actor_membership_tier` | Effective `TIER_1`, `TIER_2`, or `TIER_3` membership tier at event time, if applicable; stored in the current `actor_role` compatibility column until an additive migration changes the physical model. |
| `actor_type` | `user`, `service`, `system`, or `integration`. |
| `authorization_context` | Whole-project Tier 1 context or the exact task/reporting assignment and direct-report evidence used for the request; represented by current compatibility fields/metadata until dedicated fields exist. |
| `project_membership_id` | Effective project membership record, if applicable; target logical field. |
| `direct_report_relationship_id` | Tier 2-to-Tier 3 relationship used for an assignment action, if applicable; target logical field. |
| `task_assignment_id` | Explicit Tier 2 tracking or Tier 3 field assignment, if applicable; target logical field. |
| `critical_reporting_assignment_id` | Explicit Tier 2 Critical reporting obligation, if applicable; target logical field. |
| `target_entity_type` | Entity being acted on, such as task, evidence, discussion comment, assignment, or export batch. |
| `target_entity_id` | Identifier of the target entity. |
| `target_display_name` | Human-readable target label at event time. |
| `old_value_summary` | Compact summary of prior value or state. |
| `new_value_summary` | Compact summary of new value or state. |
| `reason` | User reason, correction reason, approval note, or system explanation. |
| `client_context` | Client application, device, connectivity, IP class, user agent, and app version where appropriate. |
| `source_system` | `shutdown_tracker`, `mobile_pwa`, `master_console`, `project_worker`, or external source label. |
| `correlation_id` | Groups related events across a workflow. |
| `request_id` | Server request identifier. |
| `idempotency_key` | Idempotency key for replay-safe operations. |
| `offline_local_id` | Local queued event identifier from offline workflows. |
| `project_snapshot_id` | Imported Project snapshot related to the event, if relevant. |
| `export_batch_id` | Export batch related to the event, if relevant. |
| `evidence_id` | Evidence record related to the event, if relevant. |
| `discussion_thread_id` | Discussion thread related to the event, if relevant. |
| `discussion_message_id` | Discussion/comment related to the event, if relevant. |
| `progress_submission_id` | Task-progress submission related to the event, if relevant. |
| `progress_candidate_id` | Exact Project-input candidate related to the event, if relevant. |

Historical display values are review aids. Authorization decisions must resolve stable membership, relationship, assignment, task, and project identifiers rather than names or imported classifications.

## JSON-like example

```json
{
  "event_id": "aud_01hzzexample",
  "event_version": 2,
  "project_id": "prj_123",
  "event_category": "task",
  "event_type": "task_progress_submitted",
  "occurred_at": "2026-06-18T08:10:00Z",
  "server_received_at": "2026-06-18T08:12:22Z",
  "recorded_at": "2026-06-18T08:12:23Z",
  "actor": {
    "user_id": "usr_456",
    "display_name": "Mobile user",
    "membership_id": "mem_456",
    "membership_tier": "TIER_3",
    "actor_type": "user"
  },
  "authorization_context": {
    "task_assignment_id": "tas_789",
    "assignment_type": "WORKING_ON",
    "assigned_by_tier_2_user_id": "usr_222",
    "direct_report_relationship_id": "drr_222_456"
  },
  "target": {
    "entity_type": "task",
    "entity_id": "task_789",
    "display_name": "Imported leaf task"
  },
  "old_value_summary": {
    "percent_complete": 80
  },
  "new_value_summary": {
    "percent_complete": 100,
    "progress_review_state": "submitted"
  },
  "reason": "Work completed in field",
  "client_context": {
    "app": "mobile_pwa",
    "app_version": "not-implemented-yet",
    "connectivity": "offline_then_synced"
  },
  "source_system": "mobile_pwa",
  "correlation_id": "corr_abc",
  "request_id": "req_def",
  "idempotency_key": "idem_ghi",
  "offline_local_id": "local_jkl",
  "project_snapshot_id": "snap_001",
  "export_batch_id": null,
  "evidence_id": null,
  "discussion_thread_id": null,
  "progress_submission_id": "prog_123"
}
```

## Event categories

The applied V001 category vocabulary remains:

- `auth`
- `permission`
- `project`
- `import`
- `reimport`
- `task`
- `problem`
- `action`
- `evidence`
- `critical_watchlist`
- `critical_update`
- `handover`
- `approval`
- `export`
- `offline_sync`
- `system`

Until a later additive migration expands that enum:

- workspace-entitlement, membership-tier, direct-report, and task/reporting-assignment changes use `permission` with specific event types and identifier-rich metadata;
- `critical_watchlist` is the retained storage-category name for Critical configuration events, not a separate application or permission scope;
- `critical_update` is the retained storage-category name for submitted Critical-report events;
- an event category never establishes application authority.

New category names require a later migration and corresponding runtime support; documentation alone does not add them.

## Required event types

### Project, membership, assignment, and import

- `workspace_project_creation_entitlement_changed`
- `project_created`
- `project_status_changed`
- `project_settings_changed`
- `project_membership_activated`
- `project_membership_deactivated`
- `project_membership_tier_changed`
- `direct_report_relationship_started`
- `direct_report_relationship_ended`
- `tier_2_tracking_assignment_created`
- `tier_2_tracking_assignment_changed`
- `tier_2_tracking_assignment_ended`
- `tier_3_field_assignment_created`
- `tier_3_field_assignment_changed`
- `tier_3_field_assignment_ended`
- `critical_reporting_assignment_changed`
- `source_file_uploaded`
- `import_snapshot_created`
- `import_snapshot_accepted`
- `import_snapshot_rejected`
- `import_warning_reviewed`
- `reimport_lineage_matched`
- `reimport_lineage_link_created`
- `reimport_lineage_link_accepted`
- `reimport_lineage_link_rejected`

Assignment events record task identity, assigning and assigned users, assignment type, effective state/time, reason where required, and before/after state. A bulk Tier 1 operation emits or correlates explicit Tier 2 assignment events; it does not create category-derived access.

### Tasks and execution

- `task_started`
- `task_paused`
- `task_resumed`
- `task_blocked`
- `task_completed`
- `task_execution_corrected`
- `task_completion_reversed`

Execution events retain whether the current projection was imported from a Microsoft Project snapshot or established by a Shutdown Tracker event. A schedule attention condition such as Late to Start is not a task-start event.

### Task progress and Project-input review

- `task_progress_submitted`
- `task_progress_operational_reviewed`
- `task_progress_correction_requested`
- `task_progress_rejected`
- `task_progress_superseded`
- `export_candidate_created`
- `export_candidate_approved_for_export`
- `export_candidate_rejected`
- `export_candidate_correction_requested`
- `export_candidate_superseded`

Operational review and a Tier 1 Project-input decision are separate events. Each exact candidate decision remains bound to its source snapshot, task, field, value, candidate identity, and approval evidence.

### Problems and actions

- `problem_created`
- `problem_owner_assigned`
- `problem_escalated`
- `problem_closed`
- `problem_reopened`
- `action_created`
- `action_assigned`
- `action_completed`
- `action_verified`
- `action_reopened`

### Evidence, Critical reporting, and handover

- `evidence_uploaded`
- `evidence_linked`
- `evidence_unlinked`
- `evidence_superseded`
- `critical_watchlist_created`
- `critical_watchlist_archived`
- `critical_wp_source_added`
- `critical_wp_source_removed`
- `reporting_policy_changed`
- `reporting_period_generated`
- `critical_update_submitted`
- `critical_update_corrected`
- `critical_update_superseded`
- `handover_submitted`
- `handover_item_carried_over`
- `handover_signed_off`

These retained names are V006/event-vocabulary compatibility terms. In product language, `critical_watchlist_*` concerns Critical configuration, `critical_wp_source_*` records source-selection changes, `reporting_policy_changed` records a new policy version such as timing/trigger, required-content, or represented owner changes, `reporting_period_generated` records a due reporting obligation, and `critical_update_*` concerns submitted Critical reports. The compatibility names do not create separate product surfaces, authorise a generic form builder, or limit the approved source types to work packs: a source event must also identify whether the selected source is a Project-critical leaf task or one summary task plus descendants. Obligations and reports retain their policy-version context. Submitted reports are immutable, and corrections and supersessions preserve the earlier report and its reporting-assignment context.

### Communications

- `discussion_comment_created`
- `discussion_comment_edited`
- `discussion_comment_deleted_from_view`
- `discussion_comment_promoted_to_problem`
- `discussion_comment_promoted_to_action`
- `discussion_comment_flagged_for_handover`
- `discussion_comment_removed_from_handover`
- `mention_created`
- `response_requested`
- `response_resolved`
- `announcement_created`
- `announcement_acknowledged`
- `export_review_comment_created`
- `project_verification_note_created`

### Export, Project verification, and offline sync

- `export_preview_created`
- `export_batch_approved`
- `export_batch_rejected`
- `export_file_generated`
- `export_file_opened_in_microsoft_project`
- `export_file_verified`
- `export_file_verification_failed`
- `export_batch_superseded`
- `offline_event_queued`
- `offline_event_synced`
- `offline_event_failed`
- `offline_conflict_created`
- `offline_progress_server_received_later`
- `offline_comment_server_received_later`

## Communications audit rules

- Edited comments preserve prior content in audit or version history.
- Comments deleted from ordinary view retain audit history.
- Promoting a comment to a problem, action, evidence link, or handover item creates both a communication event and a target-record event.
- A comment is not progress, a blocker, an action, evidence, or completion unless the appropriate structured record is created and linked.
- Export-review comments do not update Microsoft Project.
- Project-verification notes do not save or update the master `.mpp`.

## Task-progress audit rules

- Mobile progress submission, any configured operational review, Tier 1 exact Project-input decision, candidate creation, export-preview inclusion, and Microsoft Project verification are separate events.
- Operational review and Tier 1 Project-input approval must not share one event type.
- Local capture time and server-received time are both preserved when offline updates sync later.
- Re-import conflicts remain visible when they block candidate eligibility or conflict with active Tracker execution history.
- Corrections and reversals retain the governing earlier event and state-source provenance.

## Design notes

- Audit event storage should be designed before its related domain write workflow is implemented.
- The baseline SQL migration exists in [infra/migrations/V004__audit_events.sql](../../infra/migrations/V004__audit_events.sql); do not rewrite it. Additive schema changes require a later migration and implementation review.
- The API currently records local-profile audit rows for import snapshot accept/reject decisions, task-lineage link create/accept/reject decisions, export-preview creation, export-batch approval/rejection, generated-artifact metadata, and manual Project reopen/verification metadata. These writes use the existing `audit_events` table and do not establish the designed membership or assignment model.
- Offline events need local capture time and server-received time.
- Export events identify the export batch and imported Project snapshot.
- Evidence events identify evidence metadata even when the original file is stored in object storage.
- Membership, tier, direct-report, assignment, and entitlement changes preserve before/after state, actor, time, and reason where required.
- Communications audit preserves task/entity linkage and assignment-visible context.
- Project-input review audit preserves the source update, any configured operational review, Tier 1 decision, and exact candidate identity.
