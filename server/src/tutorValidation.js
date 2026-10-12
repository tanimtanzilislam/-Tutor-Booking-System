import { DateTime } from "luxon";

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateTutorPayload(body, { allowPastStartDate = false, allowZeroSlots = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Provide valid tutor details." };
  }
  const {
    name,
    photoUrl,
    subject,
    institution,
    experience,
    location,
    teachingMode,
    hourlyRate,
    totalSlots,
    sessionStartDate,
    availability,
    timeZone
  } = body;
  const rate = Number(hourlyRate);
  const slotCount = Number(totalSlots);
  const yearsExperience = Number(experience);
  if (
    typeof name !== "string" || !name.trim() || name.trim().length > 100 ||
    typeof photoUrl !== "string" || !photoUrl.trim() ||
    typeof subject !== "string" || !subject.trim() || subject.trim().length > 100 ||
    typeof institution !== "string" || !institution.trim() || institution.trim().length > 150 ||
    typeof location !== "string" || !location.trim() || location.trim().length > 150 ||
    !Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 80 ||
    !Number.isFinite(rate) || rate <= 0 ||
    !Number.isSafeInteger(slotCount) || slotCount < (allowZeroSlots ? 0 : 1) ||
    !["Online", "Offline", "Both"].includes(teachingMode)
  ) {
    return { error: "Complete all tutor details with valid hourly fee, experience, and total slots." };
  }

  try {
    const parsedPhotoUrl = new URL(photoUrl);
    if (!["http:", "https:"].includes(parsedPhotoUrl.protocol)) {
      return { error: "Provide a valid HTTP or HTTPS tutor photo URL." };
    }
  } catch {
    return { error: "Provide a valid HTTP or HTTPS tutor photo URL." };
  }

  if (typeof timeZone !== "string" || !DateTime.now().setZone(timeZone).isValid) {
    return { error: "Provide a valid tutor timezone." };
  }
  if (typeof sessionStartDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(sessionStartDate)) {
    return { error: "Choose a valid session start date." };
  }
  const parsedStartDate = DateTime.fromISO(sessionStartDate, { zone: timeZone });
  if (
    !parsedStartDate.isValid ||
    parsedStartDate.toISODate() !== sessionStartDate ||
    (!allowPastStartDate && sessionStartDate < DateTime.now().setZone(timeZone).toISODate())
  ) {
    return { error: "Choose a valid session start date." };
  }
  if (!Array.isArray(availability) || availability.length === 0) {
    return { error: "Add at least one weekly availability window." };
  }

  const days = new Set();
  for (const window of availability) {
    if (
      !window || typeof window !== "object" ||
      !Number.isInteger(window.dayOfWeek) || window.dayOfWeek < 0 || window.dayOfWeek > 6 ||
      days.has(window.dayOfWeek) ||
      typeof window.startTime !== "string" || !timePattern.test(window.startTime) ||
      typeof window.endTime !== "string" || !timePattern.test(window.endTime) ||
      window.startTime >= window.endTime
    ) {
      return { error: "Each weekday must have one valid start/end availability window." };
    }
    const startMinute = Number(window.startTime.slice(0, 2)) * 60 + Number(window.startTime.slice(3));
    const endMinute = Number(window.endTime.slice(0, 2)) * 60 + Number(window.endTime.slice(3));
    if (startMinute % 60 !== 0 || endMinute % 60 !== 0) {
      return { error: "Each weekly availability window must start and end on the hour." };
    }
    days.add(window.dayOfWeek);
  }

  return {
    value: {
      name: name.trim(),
      photoUrl: photoUrl.trim(),
      subject: subject.trim(),
      institution: institution.trim(),
      experience: yearsExperience,
      location: location.trim(),
      teachingMode,
      hourlyRate: rate,
      totalSlots: slotCount,
      sessionStartDate,
      timeZone,
      availability: availability.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))
    }
  };
}
