import { DateTime } from "luxon";

export function normalizeSessionStartDate(sessionStartDate) {
  if (sessionStartDate instanceof Date) {
    return Number.isNaN(sessionStartDate.getTime())
      ? null
      : DateTime.fromJSDate(sessionStartDate, { zone: "UTC" }).toISODate();
  }
  if (typeof sessionStartDate !== "string") return null;
  const value = sessionStartDate.trim();
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value);
  if (match) {
    const parsedDate = DateTime.fromISO(match[1]);
    return parsedDate.isValid && parsedDate.toISODate() === match[1] ? match[1] : null;
  }

  // Older MongoDB documents may contain BSON dates that Mongoose cast to Date.toString().
  if (!/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/.test(value)) return null;
  const legacyDate = new Date(value);
  return Number.isNaN(legacyDate.getTime())
    ? null
    : DateTime.fromJSDate(legacyDate, { zone: "UTC" }).toISODate();
}

export function isOnTutorLocalHour(start, timeZone) {
  const localStart = DateTime.fromJSDate(start, { zone: timeZone });
  return localStart.isValid && localStart.minute === 0 && localStart.second === 0 && localStart.millisecond === 0;
}

export function isStartOnOrAfterSessionDate(start, timeZone, sessionStartDate) {
  if (!sessionStartDate) return true;
  const startDate = DateTime.fromJSDate(start, { zone: timeZone }).toISODate();
  const firstSessionDate = normalizeSessionStartDate(sessionStartDate);
  return Boolean(startDate && firstSessionDate && startDate >= firstSessionDate);
}

export function isStartWithinAvailability(start, timeZone, availability, sessionStartDate) {
  const localStart = DateTime.fromJSDate(start, { zone: timeZone });
  if (!isOnTutorLocalHour(start, timeZone)) return false;
  if (!isStartOnOrAfterSessionDate(start, timeZone, sessionStartDate)) return false;

  const weekday = localStart.weekday % 7;
  const startMinute = localStart.hour * 60;
  return availability.some((window) => {
    const windowStart = Number(window.startTime.slice(0, 2)) * 60 + Number(window.startTime.slice(3));
    const windowEnd = Number(window.endTime.slice(0, 2)) * 60 + Number(window.endTime.slice(3));
    const slotIndex = (startMinute - windowStart) / 60;
    return window.dayOfWeek === weekday &&
      Number.isInteger(slotIndex) &&
      slotIndex >= 0 &&
      startMinute + 60 <= windowEnd;
  });
}

export function oneHourSessionsOverlap(firstStart, secondStart) {
  return Math.abs(new Date(firstStart).getTime() - new Date(secondStart).getTime()) < 60 * 60 * 1000;
}
