import { DateTime } from "luxon";

function normalizedSessionStartDate(sessionStartDate) {
  if (typeof sessionStartDate !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(sessionStartDate);
  if (!match) return null;

  const parsedDate = DateTime.fromISO(match[1]);
  return parsedDate.isValid && parsedDate.toISODate() === match[1] ? match[1] : null;
}

export function availableStarts(tutor) {
  const now = DateTime.now();
  const tutorNow = now.setZone(tutor.timeZone);
  const choices = [];
  const sessionStartDate = normalizedSessionStartDate(tutor.sessionStartDate);
  const availableFrom = sessionStartDate
    ? DateTime.fromISO(sessionStartDate, { zone: tutor.timeZone }).startOf("day")
    : tutorNow.startOf("day");
  if (tutor.sessionStartDate && !sessionStartDate) return choices;
  const firstOffset = Math.max(0, Math.ceil(availableFrom.diff(tutorNow.startOf("day"), "days").days));

  for (let offset = firstOffset; offset < firstOffset + 21; offset += 1) {
    const day = tutorNow.plus({ days: offset });
    if (sessionStartDate && day.toISODate() < sessionStartDate) continue;
    const weekday = day.weekday % 7;
    const availability = tutor.availability.find((window) => window.dayOfWeek === weekday);
    if (!availability) continue;

    const startMinute = Number(availability.startTime.slice(0, 2)) * 60 + Number(availability.startTime.slice(3));
    const endMinute = Number(availability.endTime.slice(0, 2)) * 60 + Number(availability.endTime.slice(3));
    const startHour = startMinute / 60;

    for (let slot = 0; startMinute + (slot + 1) * 60 <= endMinute; slot += 1) {
      const hour = startHour + slot;
      const tutorLocalStart = DateTime.fromObject(
        { year: day.year, month: day.month, day: day.day, hour },
        { zone: tutor.timeZone }
      );
      if (!tutorLocalStart.isValid || tutorLocalStart <= now) continue;
      choices.push({
        value: tutorLocalStart.toUTC().toISO(),
        label: tutorLocalStart.toLocal().toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)
      });
    }
  }

  return choices;
}
