import test from "node:test";
import assert from "node:assert/strict";
import { EXECUTION_EVENT_TYPES, createExecutionEvent, deriveExecutionState, eventsForTask } from "../src/execution.js";

test("same-minute execution events remain deterministic by sequence", () => {
  const effective = new Date(2026, 0, 5, 8, 0);
  const events = [
    createExecutionEvent({ taskUid: "43", type: EXECUTION_EVENT_TYPES.START, timestamp: effective, sequence: 1, recordedAt: new Date("2026-01-05T00:00:01Z") }),
    createExecutionEvent({ taskUid: "43", type: EXECUTION_EVENT_TYPES.FINISH, timestamp: effective, sequence: 2, recordedAt: new Date("2026-01-05T00:00:02Z") })
  ];
  assert.equal(deriveExecutionState(events, "43"), "Completed");
  assert.deepEqual(eventsForTask(events, "43").map((event) => event.type), ["START", "FINISH"]);
});

test("execution events preserve recorded and effective time provenance", () => {
  const event = createExecutionEvent({
    taskUid: "43",
    type: EXECUTION_EVENT_TYPES.PROGRESS_TO_SHIFT_END,
    timestamp: new Date(2026, 0, 5, 18, 0),
    recordedAt: new Date("2026-01-05T05:40:12.000Z"),
    sequence: 7,
    expectedPercent: 80
  });
  assert.equal(event.sequence, 7);
  assert.equal(event.recordedAtUtc, "2026-01-05T05:40:12.000Z");
  assert.equal(event.effectiveProjectLocalTime, "2026-01-05T18:00:00");
  assert.equal(typeof event.recordedTimeZone, "string");
  assert.equal(typeof event.recordedOffsetMinutes, "number");
});
