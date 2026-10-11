import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import {
  isStartWithinAvailability,
  isStartOnOrAfterSessionDate,
  isTutorSessionDateReached,
  oneHourSessionsOverlap
} from "../src/bookingRules.js";

const timezone = "Europe/Paris";
const mondayMorning = [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }];

function tutorLocalStart(day, hour, minute = 0) {
  return DateTime.fromObject({ year: 2026, month: 10, day, hour, minute }, { zone: timezone }).toJSDate();
}

test("accepts a full one-hour session inside tutor-local weekly availability", () => {
  assert.equal(isStartWithinAvailability(tutorLocalStart(12, 10), timezone, mondayMorning), true);
});

test("rejects a session outside the tutor's weekly availability", () => {
  assert.equal(isStartWithinAvailability(tutorLocalStart(12, 12), timezone, mondayMorning), false);
});

test("rejects starts that are not on the hour", () => {
  assert.equal(isStartWithinAvailability(tutorLocalStart(12, 10, 30), timezone, mondayMorning), false);
});

test("uses the tutor timezone when determining the weekday", () => {
  const utcMondayMorning = DateTime.fromObject({ year: 2026, month: 10, day: 12, hour: 7 }, { zone: "UTC" }).toJSDate();
  assert.equal(isStartWithinAvailability(utcMondayMorning, timezone, mondayMorning), true);
});

test("keeps the full weekly schedule available regardless of remaining booking capacity", () => {
  assert.equal(isStartWithinAvailability(tutorLocalStart(12, 9), timezone, mondayMorning, "2026-10-12"), true);
  assert.equal(isStartWithinAvailability(tutorLocalStart(12, 10), timezone, mondayMorning, "2026-10-12"), true);
  assert.equal(isStartWithinAvailability(tutorLocalStart(12, 11), timezone, mondayMorning, "2026-10-12"), true);
});

test("does not offer a recurring weekday before the session start date", () => {
  assert.equal(isStartWithinAvailability(tutorLocalStart(12, 10), timezone, mondayMorning, "2026-10-13"), false);
  assert.equal(isStartWithinAvailability(tutorLocalStart(19, 10), timezone, mondayMorning, "2026-10-13"), true);
  assert.equal(isStartOnOrAfterSessionDate(tutorLocalStart(12, 10), timezone, "2026-10-13"), false);
  assert.equal(isStartOnOrAfterSessionDate(tutorLocalStart(19, 10), timezone, "2026-10-13"), true);
});

test("blocks booking until the tutor-local session start date", () => {
  const beforeStartDate = new Date("2026-10-11T21:30:00.000Z");
  const startDateDay = new Date("2026-10-12T00:00:00.000Z");
  assert.equal(isTutorSessionDateReached(beforeStartDate, timezone, "2026-10-12"), false);
  assert.equal(isTutorSessionDateReached(startDateDay, timezone, "2026-10-12"), true);
  assert.equal(isTutorSessionDateReached(beforeStartDate, timezone, undefined), true);
});

test("treats one-hour sessions that touch at the boundary as non-conflicting", () => {
  const first = new Date("2026-10-12T08:00:00.000Z");
  const next = new Date("2026-10-12T09:00:00.000Z");
  assert.equal(oneHourSessionsOverlap(first, next), false);
});

test("detects simultaneous and partial one-hour booking conflicts", () => {
  const first = new Date("2026-10-12T08:00:00.000Z");
  assert.equal(oneHourSessionsOverlap(first, first), true);
  assert.equal(oneHourSessionsOverlap(first, new Date(first.getTime() + 30 * 60 * 1000)), true);
});
