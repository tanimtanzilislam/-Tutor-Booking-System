import { Router } from "express";
import { DateTime } from "luxon";
import mongoose from "mongoose";
import Tutor from "../models/Tutor.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

router.get("/featured", async (_req, res, next) => {
  try {
    const tutors = await Tutor.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 6 },
      {
        $project: {
          name: 1,
          photoUrl: 1,
          subject: 1,
          institution: 1,
          experience: 1,
          location: 1,
          teachingMode: 1,
          hourlyRate: 1,
          totalSlots: 1,
          sessionStartDate: 1,
          timeZone: 1,
          availability: 1
        }
      }
    ]);
    return res.json({ tutors });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    for (const [queryKey, field] of [["subject", "subject"], ["location", "location"]]) {
      if (typeof req.query[queryKey] === "string" && req.query[queryKey].trim()) {
        const value = req.query[queryKey].trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const matcher = { $regex: value, $options: "i" };
        if (field === "subject") {
          filter.$or = [
            { subject: matcher },
            { name: matcher },
            { institution: matcher }
          ];
        } else {
          filter[field] = matcher;
        }
      }
    }
    if (req.query.teachingMode !== undefined) {
      if (!["Online", "Offline", "Both"].includes(req.query.teachingMode)) {
        return res.status(400).json({ message: "Choose a valid teaching mode filter." });
      }
      filter.teachingMode = req.query.teachingMode;
    }
    const minHourlyRate = req.query.minHourlyRate === undefined ? undefined : Number(req.query.minHourlyRate);
    const maxHourlyRate = req.query.maxHourlyRate === undefined ? undefined : Number(req.query.maxHourlyRate);
    if (
      (minHourlyRate !== undefined && (!Number.isFinite(minHourlyRate) || minHourlyRate < 0)) ||
      (maxHourlyRate !== undefined && (!Number.isFinite(maxHourlyRate) || maxHourlyRate < 0)) ||
      (minHourlyRate !== undefined && maxHourlyRate !== undefined && minHourlyRate > maxHourlyRate)
    ) {
      return res.status(400).json({ message: "Enter a valid minimum and maximum hourly fee." });
    }
    if (minHourlyRate !== undefined || maxHourlyRate !== undefined) {
      filter.hourlyRate = {};
      if (minHourlyRate !== undefined) filter.hourlyRate.$gte = minHourlyRate;
      if (maxHourlyRate !== undefined) filter.hourlyRate.$lte = maxHourlyRate;
    }
    const tutors = await Tutor.find(filter).sort({ createdAt: -1 });
    return res.json({ tutors });
  } catch (error) {
    return next(error);
  }
});

router.get("/:tutorId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.tutorId)) {
      return res.status(404).json({ message: "Tutor not found." });
    }
    const tutor = await Tutor.findById(req.params.tutorId);
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });
    return res.json({ tutor });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
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
    } = req.body;
    const rate = Number(hourlyRate);
    const slotCount = Number(totalSlots);
    const yearsExperience = Number(experience);
    if (
      typeof name !== "string" || !name.trim() ||
      typeof photoUrl !== "string" || !photoUrl.trim() ||
      typeof subject !== "string" || !subject.trim() ||
      typeof institution !== "string" || !institution.trim() ||
      typeof location !== "string" || !location.trim() ||
      !Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 80 ||
      !Number.isFinite(rate) || rate <= 0 ||
      !Number.isSafeInteger(slotCount) || slotCount < 1 ||
      !["Online", "Offline", "Both"].includes(teachingMode)
    ) {
      return res.status(400).json({ message: "Complete all tutor details with valid hourly fee, experience, and total slots." });
    }
    try {
      const parsedPhotoUrl = new URL(photoUrl);
      if (!["http:", "https:"].includes(parsedPhotoUrl.protocol)) throw new Error("Unsupported URL protocol");
    } catch {
      return res.status(400).json({ message: "Provide a valid HTTP or HTTPS tutor photo URL." });
    }
    if (typeof timeZone !== "string" || !DateTime.now().setZone(timeZone).isValid) {
      return res.status(400).json({ message: "Provide a valid tutor timezone." });
    }
    if (typeof sessionStartDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(sessionStartDate)) {
      return res.status(400).json({ message: "Choose a valid session start date." });
    }
    const parsedStartDate = DateTime.fromISO(sessionStartDate, { zone: timeZone });
    if (
      !parsedStartDate.isValid ||
      parsedStartDate.toISODate() !== sessionStartDate ||
      sessionStartDate < DateTime.now().setZone(timeZone).toISODate()
    ) {
      return res.status(400).json({ message: "Choose a valid session start date." });
    }
    if (!Array.isArray(availability) || availability.length === 0) {
      return res.status(400).json({ message: "Add at least one weekly availability window." });
    }
    const days = new Set();
    for (const window of availability) {
      if (
        !Number.isInteger(window.dayOfWeek) || window.dayOfWeek < 0 || window.dayOfWeek > 6 ||
        days.has(window.dayOfWeek) ||
        typeof window.startTime !== "string" || !timePattern.test(window.startTime) ||
        typeof window.endTime !== "string" || !timePattern.test(window.endTime) ||
        window.startTime >= window.endTime
      ) {
        return res.status(400).json({ message: "Each weekday must have one valid start/end availability window." });
      }
      const startMinute = Number(window.startTime.slice(0, 2)) * 60 + Number(window.startTime.slice(3));
      const endMinute = Number(window.endTime.slice(0, 2)) * 60 + Number(window.endTime.slice(3));
      if (startMinute % 60 !== 0 || endMinute % 60 !== 0) {
        return res.status(400).json({
          message: "Each weekly availability window must start and end on the hour."
        });
      }
      days.add(window.dayOfWeek);
    }

    const tutor = await Tutor.create({
      createdBy: req.userId,
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
      availability
    });
    return res.status(201).json({ tutor });
  } catch (error) {
    return next(error);
  }
});

export default router;
