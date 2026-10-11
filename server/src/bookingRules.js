import { DateTime } from "luxon";

export function isOnTutorLocalHour(start, timeZone) {
  const localStart = DateTime.fromJSDate(start, { zone: timeZone });
  return localStart.isValid && localStart.minute === 0 && localStart.second === 0 && localStart.millisecond === 0;
}

export function isTutorSessionDateReached(now, timeZone, sessionStartDate) {
  if (!sessionStartDate) return true;
  const tutorToday = DateTime.fromJSDate(now, { zone: timeZone }).toISODate();
  return Boolean(tutorToday && tutorToday >= sessionStartDate);
}

export function isStartOnOrAfterSessionDate(start, timeZone, sessionStartDate) {
  if (!sessionStartDate) return true;
  const localStartDate = DateTime.fromJSDate(start, { zone: timeZone }).toISODate();
  return Boolean(localStartDate && localStartDate >= sessionStartDate);
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
