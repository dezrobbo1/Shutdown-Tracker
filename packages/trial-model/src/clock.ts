import { GUIDED_TRIAL_STEPS, TRIAL_DAY_END_MINUTE, TRIAL_START_MINUTE } from "./scenario";
import type { TrialState } from "./types";

const MONTH = "Aug";
const YEAR = 2026;

export function formatTrialTime(minute: number) {
  const minuteInDay = modulo(minute, 1440);
  const hours = Math.floor(minuteInDay / 60).toString().padStart(2, "0");
  const minutes = (minuteInDay % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatTrialDateTime(minute: number) {
  const day = 24 + Math.floor(minute / 1440);
  return `${day} ${MONTH} ${YEAR} · ${formatTrialTime(minute)}`;
}

export function formatTrialWindow(start: number, finish: number) {
  const startDay = 24 + Math.floor(start / 1440);
  const finishDay = 24 + Math.floor(finish / 1440);
  if (startDay === finishDay) return `${startDay} ${MONTH} · ${formatTrialTime(start)}–${formatTrialTime(finish)}`;
  return `${startDay} ${MONTH} ${formatTrialTime(start)} – ${finishDay} ${MONTH} ${formatTrialTime(finish)}`;
}

export function nextGuidedEventMinute(state: TrialState) {
  return GUIDED_TRIAL_STEPS.find((step) => step.minute > state.now)?.minute ?? null;
}

export function nextReportDueMinute(state: TrialState) {
  const submittedObligationIds = new Set(state.criticalReports.map((report) => report.obligationId));
  let next: number | null = null;
  for (const obligation of state.criticalObligations) {
    if (submittedObligationIds.has(obligation.id) || obligation.satisfiedByEventIds.length > 0 || obligation.supersededByPolicyVersionId) continue;
    if (obligation.dueAt <= state.now) continue;
    if (next === null || obligation.dueAt < next) next = obligation.dueAt;
  }
  return next;
}

export function nextShiftBoundaryMinute(state: TrialState) {
  const candidates: number[] = [];
  const currentDay = Math.floor(state.now / 1440);
  for (const day of [currentDay, currentDay + 1, currentDay + 2]) {
    for (const minute of state.project.shiftBoundaryMinutes) {
      const candidate = day * 1440 + modulo(minute, 1440);
      if (candidate > state.now) candidates.push(candidate);
    }
  }
  return candidates.sort((left, right) => left - right)[0] ?? TRIAL_DAY_END_MINUTE;
}

export function operationalDayWindow(state: TrialState) {
  const startMinute = modulo(state.project.operationalDayStartMinute, 1440);
  const day = Math.floor((state.now - startMinute) / 1440);
  const start = day * 1440 + startMinute;
  return { start, end: start + 1440 };
}

export function isTrialMinute(value: number) {
  return Number.isInteger(value) && value >= TRIAL_START_MINUTE && value <= TRIAL_DAY_END_MINUTE;
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}
