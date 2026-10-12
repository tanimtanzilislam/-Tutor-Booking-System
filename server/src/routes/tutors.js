import { Router } from "express";
import mongoose from "mongoose";
import Tutor from "../models/Tutor.js";
import Booking from "../models/Booking.js";
import requireAuth, { requireRole } from "../middleware/requireAuth.js";
import { isStartOnOrAfterSessionDate, isStartWithinAvailability } from "../bookingRules.js";
import { validateTutorPayload } from "../tutorValidation.js";
import { serializeTutor } from "../tutorSerialization.js";

const router = Router();

router.get("/featured", async (_req, res, next) => {
  try {
    const tutors = await Tutor.aggregate([
      { $match: { isActive: { $ne: false } } },
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
    return res.json({ tutors: tutors.map(serializeTutor) });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const filter = { isActive: { $ne: false } };
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
    return res.json({ tutors: tutors.map(serializeTutor) });
  } catch (error) {
    return next(error);
  }
});

router.get("/mine", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    const tutors = await Tutor.find({
      createdBy: req.userId,
      isActive: { $ne: false }
    }).sort({ createdAt: -1 });
    return res.json({ tutors: tutors.map(serializeTutor) });
  } catch (error) {
    return next(error);
  }
});

router.get("/:tutorId", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.tutorId)) {
      return res.status(404).json({ message: "Tutor not found." });
    }
    const tutor = await Tutor.findOne({ _id: req.params.tutorId, isActive: { $ne: false } });
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });
    return res.json({ tutor: serializeTutor(tutor) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:tutorId", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.tutorId)) {
      return res.status(404).json({ message: "Tutor not found." });
    }
    const parsed = validateTutorPayload(req.body, { allowPastStartDate: true, allowZeroSlots: true });
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    const currentTutor = await Tutor.findOne({
      _id: req.params.tutorId,
      createdBy: req.userId,
      isActive: { $ne: false }
    });
    if (!currentTutor) return res.status(404).json({ message: "Tutor not found." });

    const confirmedBookings = await Booking.find({
      tutor: currentTutor._id,
      status: { $in: ["pending", "confirmed"] }
    }).select("startsAt");
    const { availability, timeZone, sessionStartDate } = parsed.value;
    if (confirmedBookings.some(({ startsAt }) => (
      !isStartOnOrAfterSessionDate(startsAt, timeZone, sessionStartDate) ||
      !isStartWithinAvailability(startsAt, timeZone, availability, sessionStartDate)
    ))) {
      return res.status(409).json({
        message: "This update would make an existing confirmed session unavailable. Keep its date and time covered."
      });
    }

    const tutor = await Tutor.findOneAndUpdate(
      { _id: currentTutor._id, createdBy: req.userId, isActive: { $ne: false } },
      { $set: { ...parsed.value, name: req.userName } },
      { new: true, runValidators: true }
    );
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });
    return res.json({ tutor: serializeTutor(tutor), message: "Tutor updated successfully." });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:tutorId", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.tutorId)) {
      return res.status(404).json({ message: "Tutor not found." });
    }
    const currentTutor = await Tutor.findOne({
      _id: req.params.tutorId,
      createdBy: req.userId,
      isActive: { $ne: false }
    }).select("totalSlots pendingBookingReservations");
    if (!currentTutor) return res.status(404).json({ message: "Tutor not found." });

    const confirmedBooking = await Booking.exists({
      tutor: currentTutor._id,
      status: { $in: ["pending", "confirmed"] }
    });
    if (confirmedBooking) {
      return res.status(409).json({
        message: "This tutor has confirmed sessions and cannot be removed until they are cancelled."
      });
    }

    const result = await Tutor.updateOne(
      {
        _id: currentTutor._id,
        createdBy: req.userId,
        isActive: { $ne: false },
        totalSlots: currentTutor.totalSlots,
        pendingBookingReservations: { $in: [0, null] }
      },
      { $set: { isActive: false } }
    );
    if (result.modifiedCount !== 1) {
      return res.status(409).json({ message: "This tutor changed while you were removing it. Refresh and try again." });
    }
    return res.json({ message: "Tutor removed successfully." });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    const parsed = validateTutorPayload(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const tutor = await Tutor.create({
      createdBy: req.userId,
      ...parsed.value,
      name: req.userName
    });
    return res.status(201).json({ tutor: serializeTutor(tutor), message: "Your tutor profile was created successfully." });
  } catch (error) {
    return next(error);
  }
});

export default router;
