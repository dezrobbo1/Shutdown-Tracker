import test from "node:test";
import assert from "node:assert/strict";
import {
  EXECUTION_EVENT_TYPES,
  allowedExecutionActions,
  buildTaskScalarDiagnosticPatch,
  calculateExpectedPercent,
  createExecutionEvent,
  deriveExecutionState,
  resolveShiftEndInstant,
  toProjectLocalTimestamp
} from "../src/execution.js";

const task = {
  start: "2026-01-05T08:00:00",
  finish: "2026-01-05T16:00:00"
};

test("expected progress is clamped across the planned window", () => {
  assert.equal(calculateExpectedPercent(task, new Date(2026, 0, 5, 6, 0)), 0);
  assert.equal(calculateExpectedPercent(task, new Date(2026, 0, 5, 12, 0)), 50);
  assert.equal(calculateExpectedPercent(task, new Date(2026, 0, 5, 18, 0)), 100);
});

test("shift end rolls into the next day when the configured time has passed", () => {
  const reference = new Date(2026, 0, 5, 22, 0);
  const shiftEnd = resolveShiftEndInstant(reference, "06:00");
  assert.equal(toProjectLocalTimestamp(shiftEnd), "2026-01-06T06:00:00");
});

test("execution state follows Start Pause Resume Finish", () => {
  const events = [];
  assert.equal(deriveExecutionState(events, "43"), "Not started");
  assert.deepEqual(allowedExecutionActions(events, "43"), {
    start: true,
    pause: false,
    resume: false,
    finish: false
  });

  events.push(
    createExecutionEvent({ taskUid: "43", type: EXECUTION_EVENT_TYPES.START, timestamp: new Date(2026, 0, 5, 8, 0) })
  );
  assert.equal(deriveExecutionState(events, "43"), "In progress");

  events.push(
    createExecutionEvent({ taskUid: "43", type: EXECUTION_EVENT_TYPES.PAUSE, timestamp: new Date(2026, 0, 5, 9, 0) })
  );
  assert.equal(deriveExecutionState(events, "43"), "Paused");

  events.push(
    createExecutionEvent({ taskUid: "43", type: EXECUTION_EVENT_TYPES.RESUME, timestamp: new Date(2026, 0, 5, 9, 15) })
  );
  assert.equal(deriveExecutionState(events, "43"), "In progress");

  events.push(
    createExecutionEvent({ taskUid: "43", type: EXECUTION_EVENT_TYPES.FINISH, timestamp: new Date(2026, 0, 5, 15, 30) })
  );
  assert.equal(deriveExecutionState(events, "43"), "Completed");
});

test("diagnostic patch is derived from execution intent without inventing duration or work", () => {
  const events = [
    createExecutionEvent({ taskUid: "43", type: EXECUTION_EVENT_TYPES.START, timestamp: new Date(2026, 0, 5, 8, 0) }),
    createExecutionEvent({
      taskUid: "43",
      type: EXECUTION_EVENT_TYPES.OBSERVED_PROGRESS,
      timestamp: new Date(2026, 0, 5, 12, 0),
      observedPercent: 65
    })
  ];

  assert.deepEqual(buildTaskScalarDiagnosticPatch(events, "43"), {
    ActualStart: "2026-01-05T08:00:00",
    PercentComplete: "65"
  });
});

test("shift end remains on the current day when trial time equals shift end", () => {
  const reference = new Date(2026, 0, 5, 18, 0);
  const shiftEnd = resolveShiftEndInstant(reference, "18:00");
  assert.equal(toProjectLocalTimestamp(shiftEnd), "2026-01-05T18:00:00");
});
