import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { isStartWithinAvailability, oneHourSessionsOverlap } from "../src/bookingRules.js";

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
