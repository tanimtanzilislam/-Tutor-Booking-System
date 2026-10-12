import { normalizeSessionStartDate } from "./bookingRules.js";

export function serializeTutor(tutor) {
  const serialized = typeof tutor.toObject === "function" ? tutor.toObject() : { ...tutor };
  const sessionStartDate = normalizeSessionStartDate(serialized.sessionStartDate);
  if (sessionStartDate) serialized.sessionStartDate = sessionStartDate;
  return serialized;
}
