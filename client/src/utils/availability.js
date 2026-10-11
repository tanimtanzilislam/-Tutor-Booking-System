import { DateTime } from "luxon";

export function availableStarts(tutor) {
  const now = DateTime.now();
  const tutorNow = now.setZone(tutor.timeZone);
  const choices = [];

  for (let offset = 0; offset < 21; offset += 1) {
    const day = tutorNow.plus({ days: offset });
    const weekday = day.weekday % 7;
    const availability = tutor.availability.find((window) => window.dayOfWeek === weekday);
    if (!availability) continue;

    const startMinute = Number(availability.startTime.slice(0, 2)) * 60 + Number(availability.startTime.slice(3));
    const endMinute = Number(availability.endTime.slice(0, 2)) * 60 + Number(availability.endTime.slice(3));
    const startHour = Math.ceil(startMinute / 60);
    const endHourExclusive = Math.floor(endMinute / 60);

    for (let hour = startHour; hour < endHourExclusive; hour += 1) {
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
