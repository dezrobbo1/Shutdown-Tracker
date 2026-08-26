# Active Goal: Use Current Location Time and Leaf-Only Tracking in the Console Trial

## Outcome

Replace the Tier 1 XML round-trip trial's manually advanced synthetic clock with the browser/device's actual current date and time in the IANA time zone detected when the session starts. Every execution, progress, problem, and action event must capture a fresh current timestamp when the operator submits the action. Show each imported leaf task's Microsoft Project Duration and keep summary rows as non-operational hierarchy context rather than tracked tasks.

## Success criteria

- Starting an imported XML trial reads the current device instant and the browser-reported IANA time zone.
- The Console displays a live current-location date/time to the trial model's supported one-minute precision.
- `Today`, task attention, and late-start context project against current local time without mutating retained trial evidence on passive clock ticks.
- Can't Start, Start, Pause, Resume, Finish, progress observations, problem resolution, and action completion each capture fresh current local time at submission.
- Manual `+15 minutes`, `+1 hour`, and planned-start jump controls are removed.
- Project `StatusDate` and planned dates remain immutable imported schedule facts; neither becomes the execution clock.
- Mapping proposals retain the captured local wall-clock values expected by timezone-neutral MSPDI task fields.
- A device clock change that would place a new event before existing local evidence fails closed.
- Imported Task `Duration` and `DurationFormat` plus the Project duration-display settings are retained and rendered without deriving duration from Start/Finish.
- Tasks, Today, Task Dashboard navigation, operational counts, Critical task counts, mapping proposals, and candidate inputs treat executable leaves as the only tracked tasks.
- Summary rows remain available for immutable source inspection, hierarchy, comparison, and future work-pack/reporting context, but expose no tracked-task state, progress, authority, Dashboard, or action controls in this trial.

## Trial boundary

- In this browser-only trial, “location” means the browser/device's configured IANA time zone at session activation. That zone is fixed for the temporary session so its evidence basis cannot change silently; discard and restart after changing location/time zone. It is not inferred from Project XML, GPS, or IP address and is not verified by a server.
- The current trial uses local calendar midnight as the Today boundary because production project/site time-zone and operational-day settings are not implemented.
- Event time is stored to whole-minute precision, matching the existing trial model and candidate policy.
- A daylight-saving fall-back can repeat local wall-clock minutes. The trial blocks new updates while local time is earlier than existing evidence; wait through the repeated interval or reset/discard the temporary session.

## Non-goals

- Production project/site time-zone configuration, server-authoritative time, GPS location, persistence, backend, API, authentication, database, or migration work.
- Schedule calculation, automatic Microsoft Project operation, or changes to the complete-source candidate contract.
- A final Tracker-to-Project mapping/export contract.
- Mobile changes.
- A production summary-work-pack reporting implementation or change to the approved Critical Work Pack source model.

## Required validation

- Run all repository frontend tests, builds, and TypeScript checks plus `git diff --check`.
- Verify fixed instants in multiple IANA zones, exact per-action timestamps, live projections, mapping output, reset, backward-clock rejection, and the documented daylight-saving limitation.
- Verify duration parsing/default-unit rendering, duration retention, leaf-only operational counts/navigation, summary route guards, and leaf-only Critical counts.
- Smoke-check the three supplied XML schedules without committing them or any generated artifact.
- Validate changed Markdown links and repository paths.
- Confirm no backend Java, worker, migration, API-contract, authentication, real Project data, generated artifact, or Mobile changes.

## Safety constraints

- Do not merge or mark the draft pull request ready.
- Do not modify `main` directly, rewrite history, force-push, rebase, amend, or squash.
- Keep Microsoft Project as schedule calculation and master-file authority.
- Never overwrite an imported source or imply browser/device time is server-verified production time.

## Completion conditions

The slice is complete when the Console trial displays and uses current browser-local date/time, every local action captures its submission time, imported leaf duration is visible, summaries are hierarchy-only rather than tracked tasks, synthetic time controls and stale documentation are gone, validation passes, and draft `frontend/console-location-aware-clock -> main` pull request #72 reports the bounded change accurately.
