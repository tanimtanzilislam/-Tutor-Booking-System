import { Router } from "express";
import { randomBytes } from "node:crypto";
import Booking from "../models/Booking.js";
import Tutor from "../models/Tutor.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  isOnTutorLocalHour,
  isStartWithinAvailability,
  oneHourSessionsOverlap
} from "../bookingRules.js";

const router = Router();

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ student: req.userId })
      .populate("tutor", "name subject hourlyRate timeZone")
      .sort({ startsAt: 1 });
    return res.json({ bookings });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { tutorId, startsAt } = req.body;
    if (typeof tutorId !== "string" || typeof startsAt !== "string") {
      return res.status(400).json({ message: "Choose a tutor and session start time." });
    }
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      return res.status(400).json({ message: "Choose a valid session time in the future." });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });

    if (!isOnTutorLocalHour(start, tutor.timeZone)) {
      return res.status(400).json({ message: "Sessions must start on the hour." });
    }
    if (!isStartWithinAvailability(start, tutor.timeZone, tutor.availability)) {
      return res.status(409).json({ message: "That time is outside this tutor's weekly availability." });
    }

    const possibleConflict = await Booking.findOne({
      tutor: tutor.id,
      startsAt: {
        $gt: new Date(start.getTime() - 60 * 60 * 1000),
        $lt: new Date(start.getTime() + 60 * 60 * 1000)
      }
    });
    if (possibleConflict && oneHourSessionsOverlap(possibleConflict.startsAt, start)) {
      return res.status(409).json({ message: "That tutor already has a booking for this time." });
    }

    const booking = await Booking.create({
      student: req.userId,
      tutor: tutor.id,
      startsAt: start,
      sessionToken: randomBytes(12).toString("hex").toUpperCase()
    });
    await booking.populate("tutor", "name subject hourlyRate timeZone");
    return res.status(201).json({ booking });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "That tutor already has a booking for this time." });
    }
    return next(error);
  }
});

export default router;
