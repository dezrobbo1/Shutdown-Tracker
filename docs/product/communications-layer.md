# Communications Layer

The communications layer is not a generic chat product.

Shutdown Tracker should eventually support entity-linked operational discussion where it improves execution review, blocker/action management, handover, and import review. It should not become a WhatsApp-style thread, private messenger, or broad channel system.

The final Project export contract is deferred under [ADR-012](../adr/ADR-012-product-trial-foundation-and-export-deferral.md). Any discussion attached to retained export or verification records is experimental compatibility context, not current product authority.

## Product decision

Build structured operational records first. Add entity-linked Discussion later where it supports those records.

Recommended labels:

- Discussion;
- Operational Updates;
- Mentions;
- Needs Response;
- Announcements;
- Handover Notes;
- Import Review Comments;
- Experimental Project-interchange Notes.

Avoid labels:

- Chat;
- Messenger;
- Direct Messages;
- Channels;
- Inbox, unless specifically used as `Needs Response` rather than general mail/chat.

## Product boundary

A communication record supports execution decisions. It is not the source of execution state by itself.

Rules:

- A comment is not task progress.
- A comment is not a blocker unless promoted into a blocker/problem.
- A comment is not an action unless promoted into an action.
- A comment is not evidence unless linked to an evidence record.
- A comment is not handover unless flagged or promoted into handover.
- Import review comments do not change an imported source or activate a snapshot.
- A comment or operational review does not authorise a Project export.
- Experimental Project-interchange notes do not save or update the master `.mpp`.
- Important shutdown information must not disappear into unstructured chat.

## Why generic chat is risky

| Risk | Why it matters | Product control |
| --- | --- | --- |
| Critical decisions buried in text | Blockers, approvals, and handover items become hard to find | Promote to structured record |
| Duplicate WhatsApp plus app communication | Conflicting sources of truth | App records must be structured and auditable |
| Private side channels | Safety, handover, and accountability gaps | Do not build private DMs in MVP |
| Notification overload | Users stop noticing real issues | Use Needs Response and visual queues before push |
| Assignment visibility errors | Restricted information leaks | Tier plus explicit task/reporting assignment |
| Project-interchange misunderstanding | Comments mistaken for a Project update | Persistent export-deferral and `.mpp` boundary copy |
| Offline message confusion | Local-only note mistaken as submitted | Explicit sync states |

## Entity-linked Discussion model

Discussion should attach to an operational object.

| Entity | Purpose | Default stage | Report/audit behaviour |
| --- | --- | --- | --- |
| Task | Clarify progress, evidence gap, blocker context | Later visual shell before backend | Audit-visible if created; not export state |
| Problem / blocker | Discuss recovery, owner, close-out evidence | Later | Audit-visible; linked to problem history |
| Action | Status update, close-out clarification | Later | Audit-visible; action state remains structured |
| Evidence item | Review note or rejection reason | Later | Linked to evidence metadata/audit |
| Handover item | Shift-transfer clarification | Later | Included only if handover item remains open/flagged |
| Import source/snapshot | Clarify validation, structure, mapping, or lineage | Later | Import-review audit context; does not alter source facts |
| Experimental export/verification record | Preserve technical-investigation context where retained | Compatibility only | Not an approved product workflow; no `.mpp` save implied |
| Critical item / work pack | Reporting clarification | Later | Reporting context; no scheduling effect |
| Area / shift / discipline | Context marker for filtering, not a free-form channel | Later | Display/filter context only; no access authority |

## Structured record promotion rules

The app should make the structured path easier than dumping important information into comments.

| Message content | Prompt user to create | Reason |
| --- | --- | --- |
| Scaffold not available | Blocker/problem | Work is physically stopped |
| Permit not issued | Blocker/problem | Permit readiness is safety/operational constraint |
| Isolation not complete | Blocker/problem | Work cannot proceed safely |
| Material missing | Blocker/problem | Recovery ownership needed |
| Crane delayed | Blocker/problem plus action | Lift dependency needs owner/time |
| John to follow up by 14:00 | Action | Needs owner and due time |
| Completion photo uploaded | Evidence record/link | Evidence must be metadata-controlled |
| Night shift to watch permit expiry | Handover item | Incoming shift needs explicit record |
| Why was this import source rejected? | Import Review Comment | Tier 1 clarification attached to the source/snapshot decision |
| What did this experimental Project output show? | Experimental Project-interchange Note | Technical context only; no product decision or master update implied |

## Communication surfaces

### Console

Entity-linked communication should appear inside the approved surfaces:

| Surface | Communication placement |
| --- | --- |
| Today | Needs Response queue and controlled announcements |
| Tasks | Discussion and related Problem, Action, Evidence, and History sections inside Task Dashboard |
| Critical | Reporting context linked to the selected task or summary-work-pack dashboard |
| Import / Export | Tier 1 Import Review Comments; clearly labelled experimental notes only where retained infrastructure is shown |

Do not create a top-level `Chat` area.

### Mobile

Mobile communication should be low-typing, assignment-bounded, and entity-first inside Assigned Tasks / Task Detail:

- task comment from Task Detail;
- quick reply to a mention/request;
- mark needs response;
- log blocker from a comment;
- create action from a comment;
- include in handover;
- queued/failed local state visible.

Do not create a dense channel list or private chat inbox.

## Needs Response

Needs Response is a work queue, not a mail inbox.

Items that may appear:

- direct mention on a task/problem/action/import-review record;
- response requested by Tier 1 or the responsible Tier 2;
- assigned action comment requiring update;
- import review clarification assigned to the relevant Tier 1 reviewer;
- handover acknowledgement required;
- failed offline comment/progress submission.

Items that should not appear:

- every comment;
- every status change;
- general channel chatter;
- dashboard updates;
- casual acknowledgements.

## Mentions

Mentions should be constrained:

| Mention type | Decision |
| --- | --- |
| Named user mention | Allowed when user can see the entity |
| Tier-wide mention | Not exposed in the initial product; use a named user or assigned-task audience |
| Broad `@everyone` | Do not build for MVP |
| Named Tier 2/Tier 3 mention | Allowed only when both users have access through the same task assignment context |
| External user mention | Defer until auth/tenant model supports it |

Mentions should create an attention record, not a hidden approval or status change.

## Announcements

Announcements are controlled broadcast records.

Allowed uses:

- project-control notice;
- shift-wide safety notice;
- import/report availability notice;
- sync/deployment maintenance notice.

Rules:

- Only Tier 1 creates announcements.
- Announcements are not open discussion channels.
- Acknowledgement may be requested for critical notices.
- Announcements should not replace handover, blockers, or actions.

## Offline communication rules

Offline comments and replies are allowed only if the UI is explicit.

Required copy:

```text
Queued on this device. Not yet sent.
Could not send. Still saved on this device.
Server received.
Thread may be out of date. Last synced at [time].
```

Use `Thread may be out of date` for discussion threads. Use progress-specific wording for task progress updates.

## Permissions model

| Capability | Default authority |
| --- | --- |
| View task discussion | Tier 1 for every project task; Tier 2/Tier 3 for explicitly assigned tasks |
| Create task discussion comment | Tier 1 on any task; Tier 2/Tier 3 on explicitly assigned tasks |
| Create related Problem/Action discussion | Same authority as the linked task and structured record |
| Mention named user | Only when the target can access the same task/record |
| Mark needs response | Tier 1 on any task; Tier 2/Tier 3 on explicitly assigned tasks |
| Promote comment to delay/problem/action/evidence/handover | Tier 1 on any task; Tier 2/Tier 3 on explicitly assigned tasks, subject to the structured record's rules |
| Comment on import review | Tier 1 only |
| Add experimental Project-interchange note | Tier 1 only; technical context, not export authority |
| Create announcement | Tier 1 only |
| Hide/redact from ordinary view | Tier 1 under project policy; audit retained |
| View audit history | Tier 1 project-wide; Tier 2/Tier 3 only for history exposed on assigned tasks |

Tier 2/Tier 3 visibility is conservative by default and cannot be widened by discipline, contractor, work group, area, WBS, categories, saved views, or Critical membership.

## Audit events

Minimum communications audit events:

- `discussion_comment_created`;
- `discussion_comment_edited`;
- `discussion_comment_deleted_from_view`;
- `discussion_comment_promoted_to_problem`;
- `discussion_comment_promoted_to_action`;
- `discussion_comment_flagged_for_handover`;
- `discussion_comment_removed_from_handover`;
- `mention_created`;
- `response_requested`;
- `response_resolved`;
- `announcement_created`;
- `announcement_acknowledged`;
- `import_review_comment_created`;
- experimental export/verification compatibility events only where retained infrastructure requires them;
- `offline_comment_server_received_later`.

Edited/deleted comments should retain audit history. Delete should mean deleted from ordinary view unless legal/security policy permits hard deletion.

## Visual review scope

A future communications visual shell may include:

- Task Discussion panel;
- Problem / Blocker thread;
- Action Update Log;
- Handover Communication Summary;
- Import Review Comments;
- clearly labelled experimental Project-interchange Notes where compatibility records are retained;
- Needs Response queue;
- Mobile Task Discussion;
- Mobile queued comment state;
- Announcement banner mock;
- audit row examples.

These should be visual-only or read-only until production messaging data model and permissions are approved.

## What not to build

Do not build in MVP:

- generic chat;
- private DMs;
- broad channels;
- WhatsApp import/export as source of truth;
- arbitrary chat attachments;
- voice messages;
- read receipts on every message;
- push notification system for every comment;
- AI-generated handover/chat summary;
- external Teams/Slack integration as source of truth.

## Acceptance criteria

Future communications work is acceptable only if:

- users can tell which entity the discussion belongs to;
- users can tell whether a message is only a comment or a structured record;
- blockers/actions/handover/evidence remain structured objects;
- import comments do not imply source acceptance or activation;
- experimental Project-interchange notes do not imply export authority or `.mpp` save;
- queued messages are visibly not sent;
- Tier 2/Tier 3 visibility remains assignment-bounded;
- no top-level Chat area appears in the MVP IA;
- the feature reduces operational ambiguity rather than adding another message stream.
