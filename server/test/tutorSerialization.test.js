import test from "node:test";
import assert from "node:assert/strict";
import { serializeTutor } from "../src/tutorSerialization.js";

test("serializes legacy BSON date values as date-only tutor start dates", () => {
  const sessionStartDate = "Mon Oct 12 2026 06:00:00 GMT+0600 (Bangladesh Standard Time)";
  const tutor = {
    _id: "tutor-id",
    sessionStartDate,
    toObject() {
      return { _id: this._id, sessionStartDate: this.sessionStartDate };
    }
  };

  assert.deepEqual(serializeTutor(tutor), {
    _id: "tutor-id",
    sessionStartDate: "2026-10-12"
  });
});
