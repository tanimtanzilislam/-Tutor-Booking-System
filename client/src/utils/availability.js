import { DateTime } from "luxon";

export function availableStarts(tutor) {
  const now = DateTime.now();
  const tutorNow = now.setZone(tutor.timeZone);
  const choices = [];
  const availableFrom = tutor.sessionStartDate
    ? DateTime.fromISO(tutor.sessionStartDate, { zone: tutor.timeZone }).startOf("day")
    : tutorNow.startOf("day");
  const firstOffset = Math.max(0, Math.ceil(availableFrom.diff(tutorNow.startOf("day"), "days").days));

  for (let offset = firstOffset; offset < firstOffset + 21; offset += 1) {
    const day = tutorNow.plus({ days: offset });
    if (day.toISODate() < tutor.sessionStartDate) continue;
    const weekday = day.weekday % 7;
    const availability = tutor.availability.find((window) => window.dayOfWeek === weekday);
    if (!availability) continue;

    const startMinute = Number(availability.startTime.slice(0, 2)) * 60 + Number(availability.startTime.slice(3));
    const endMinute = Number(availability.endTime.slice(0, 2)) * 60 + Number(availability.endTime.slice(3));
    const slotCount = tutor.totalSlots ?? Math.floor((endMinute - startMinute) / 60);
    const startHour = startMinute / 60;

    for (let slot = 0; slot < slotCount; slot += 1) {
      const hour = startHour + slot;
      if ((hour + 1) * 60 > endMinute) break;
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
