import test from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { validateTutorPayload } from "../src/tutorValidation.js";

function validTutor(overrides = {}) {
  return {
    name: "A tutor",
    photoUrl: "https://example.com/tutor.jpg",
    subject: "Mathematics",
    institution: "Learning centre",
    experience: "4",
    location: "Dhaka",
    teachingMode: "Online",
    hourlyRate: "20",
    totalSlots: "3",
    sessionStartDate: DateTime.now().plus({ days: 2 }).toISODate(),
    timeZone: "Asia/Dhaka",
    availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
    ...overrides
  };
}

test("normalizes valid tutor details and the allowed availability fields", () => {
  const result = validateTutorPayload(validTutor());
  assert.equal(result.error, undefined);
  assert.equal(result.value.experience, 4);
  assert.equal(result.value.hourlyRate, 20);
  assert.equal(result.value.totalSlots, 3);
  assert.deepEqual(result.value.availability, [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }]);
});

test("requires at least one booking slot when creating a tutor", () => {
  const result = validateTutorPayload(validTutor({ totalSlots: "0" }));
  assert.match(result.error, /total slots/);
});

test("permits zero remaining slots when editing a tutor", () => {
  const result = validateTutorPayload(validTutor({ totalSlots: "0" }), { allowZeroSlots: true });
  assert.equal(result.error, undefined);
  assert.equal(result.value.totalSlots, 0);
});

test("accepts a valid past start date when editing an existing tutor", () => {
  const result = validateTutorPayload(validTutor({ sessionStartDate: "2000-01-01" }), { allowPastStartDate: true });
  assert.equal(result.error, undefined);
});

test("rejects duplicate weekdays and unsupported photo protocols", () => {
  assert.match(validateTutorPayload(validTutor({
    availability: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
      { dayOfWeek: 1, startTime: "13:00", endTime: "17:00" }
    ]
  })).error, /weekday/);
  assert.match(validateTutorPayload(validTutor({ photoUrl: "javascript:alert(1)" })).error, /HTTP or HTTPS/);
});
