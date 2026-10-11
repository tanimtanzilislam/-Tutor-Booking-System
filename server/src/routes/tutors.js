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
          subject: 1,
          bio: 1,
          hourlyRate: 1,
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
    if (typeof req.query.subject === "string" && req.query.subject.trim()) {
      const subject = req.query.subject.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.subject = { $regex: subject, $options: "i" };
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
    const { name, subject, bio, hourlyRate, availability, timeZone } = req.body;
    const rate = Number(hourlyRate);
    if (
      typeof name !== "string" || !name.trim() ||
      typeof subject !== "string" || !subject.trim() ||
      typeof bio !== "string" || !bio.trim() ||
      !Number.isFinite(rate) || rate <= 0
    ) {
      return res.status(400).json({ message: "Provide a tutor name, subject, bio, and positive hourly rate." });
    }
    if (!Array.isArray(availability) || availability.length === 0) {
      return res.status(400).json({ message: "Add at least one weekly availability window." });
    }
    if (typeof timeZone !== "string" || !DateTime.now().setZone(timeZone).isValid) {
      return res.status(400).json({ message: "Provide a valid tutor timezone." });
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
      days.add(window.dayOfWeek);
    }

    const tutor = await Tutor.create({
      createdBy: req.userId,
      name: name.trim(),
      subject: subject.trim(),
      bio: bio.trim(),
      hourlyRate: rate,
      timeZone,
      availability
    });
    return res.status(201).json({ tutor });
  } catch (error) {
    return next(error);
  }
});

export default router;
