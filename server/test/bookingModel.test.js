import test from "node:test";
import assert from "node:assert/strict";
import Booking from "../src/models/Booking.js";

const validBooking = {
  student: "507f1f77bcf86cd799439011",
  tutor: "507f191e810c19729de860ea",
  studentName: "Student",
  studentEmail: "student@example.com",
  phone: "1234567890",
  startsAt: new Date("2026-10-20T09:00:00.000Z"),
  sessionToken: "0123456789ABCDEF01234567"
};

test("new bookings default to pending tutor approval", () => {
  assert.equal(new Booking(validBooking).status, "pending");
});

test("bookings support pending, confirmed, rejected, and cancelled states", async () => {
  for (const status of ["pending", "confirmed", "rejected", "cancelled"]) {
    const booking = new Booking({ ...validBooking, status });
    await assert.doesNotReject(booking.validate(), `status ${status} should be valid`);
  }
});

test("booking validation rejects unsupported statuses", async () => {
  const booking = new Booking({ ...validBooking, status: "auto-confirmed" });
  await assert.rejects(booking.validate(), /status/);
});
