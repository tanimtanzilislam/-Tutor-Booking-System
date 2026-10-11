import { Router } from "express";
import { randomBytes } from "node:crypto";
import Booking from "../models/Booking.js";
import Tutor from "../models/Tutor.js";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  isOnTutorLocalHour,
  isStartOnOrAfterSessionDate,
  isStartWithinAvailability,
  isTutorSessionDateReached,
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
    const { tutorId, startsAt, phone } = req.body;
    if (typeof tutorId !== "string" || typeof startsAt !== "string" || typeof phone !== "string") {
      return res.status(400).json({ message: "Choose a tutor and session start time, and provide your phone number." });
    }
    const normalizedPhone = phone.trim();
    if (
      normalizedPhone.length < 7 ||
      normalizedPhone.length > 20 ||
      !/^[+()\d][+()\d\s.-]*$/.test(normalizedPhone) ||
      (normalizedPhone.match(/\d/g) || []).length < 7
    ) {
      return res.status(400).json({ message: "Enter a valid phone number with at least 7 digits." });
    }
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      return res.status(400).json({ message: "Choose a valid session time in the future." });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });

    if (!isTutorSessionDateReached(new Date(), tutor.timeZone, tutor.sessionStartDate)) {
      return res.status(409).json({ message: "Booking is not available yet for this tutor." });
    }
    if (!Number.isInteger(tutor.totalSlots) || tutor.totalSlots <= 0) {
      return res.status(409).json({ message: "No available slots left." });
    }
    if (!isOnTutorLocalHour(start, tutor.timeZone)) {
      return res.status(400).json({ message: "Sessions must start on the hour." });
    }
    if (!isStartOnOrAfterSessionDate(start, tutor.timeZone, tutor.sessionStartDate)) {
      return res.status(409).json({ message: "Booking is not available yet for this tutor." });
    }
    if (!isStartWithinAvailability(
      start,
      tutor.timeZone,
      tutor.availability,
      tutor.sessionStartDate
    )) {
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

    const student = await User.findById(req.userId).select("name email");
    if (!student) return res.status(401).json({ message: "Student account not found." });

    const reservation = await Tutor.updateOne(
      { _id: tutor._id, totalSlots: { $gt: 0 } },
      { $inc: { totalSlots: -1 } }
    );
    if (reservation.modifiedCount !== 1) {
      return res.status(409).json({ message: "No available slots left." });
    }

    let booking;
    try {
      booking = await Booking.create({
        student: student.id,
        tutor: tutor.id,
        studentName: student.name,
        studentEmail: student.email,
        phone: normalizedPhone,
        startsAt: start,
        sessionToken: randomBytes(12).toString("hex").toUpperCase(),
        status: "Confirmed"
      });
    } catch (error) {
      await Tutor.updateOne({ _id: tutor._id }, { $inc: { totalSlots: 1 } });
      if (error?.code === 11000) {
        return res.status(409).json({ message: "That tutor already has a booking for this time." });
      }
      return next(error);
    }
    await booking.populate("tutor", "name subject hourlyRate timeZone totalSlots");
    return res.status(201).json({ booking });
  } catch (error) {
    return next(error);
  }
});

export default router;
