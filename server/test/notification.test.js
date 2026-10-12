import test from "node:test";
import assert from "node:assert/strict";
import Notification from "../src/models/Notification.js";

test("requires a recipient, booking, tutor, student name, subject, session date, and timezone", async () => {
  const notification = new Notification({});
  const error = await notification.validate().catch((validationError) => validationError);

  assert.ok(error);
  for (const field of ["recipient", "booking", "tutor", "studentName", "subject", "startsAt", "timeZone"]) {
    assert.ok(error.errors[field], `${field} should be required`);
  }
});

test("defaults booking notifications to unread", () => {
  const notification = new Notification({
    recipient: "507f1f77bcf86cd799439011",
    booking: "507f191e810c19729de860ea",
    tutor: "507f1f77bcf86cd799439012",
    studentName: "Student",
    subject: "Mathematics",
    startsAt: new Date("2026-10-20T09:00:00.000Z"),
    timeZone: "Asia/Dhaka"
  });

  assert.equal(notification.readAt, null);
});
