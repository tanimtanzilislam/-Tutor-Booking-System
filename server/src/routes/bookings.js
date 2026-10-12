import { Router } from "express";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import Tutor from "../models/Tutor.js";
import User from "../models/User.js";
import requireAuth, { requireRole } from "../middleware/requireAuth.js";
import {
  isOnTutorLocalHour,
  normalizeSessionStartDate,
  isStartOnOrAfterSessionDate,
  isStartWithinAvailability,
  oneHourSessionsOverlap
} from "../bookingRules.js";

const router = Router();

router.get("/mine", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const bookings = await Booking.find({ student: req.userId })
      .populate("tutor", "name subject hourlyRate timeZone")
      .sort({ startsAt: 1 });
    return res.json({ bookings });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:bookingId/cancel", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.bookingId)) {
      return res.status(404).json({ message: "Booking not found." });
    }
    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.bookingId,
        student: req.userId,
        status: { $in: ["pending", "confirmed"] }
      },
      { $set: { status: "cancelled" } },
      { new: false, runValidators: true }
    );
    if (!booking) {
      const ownedBooking = await Booking.findOne({ _id: req.params.bookingId, student: req.userId });
      if (!ownedBooking) return res.status(404).json({ message: "Booking not found." });
      return res.status(409).json({ message: "Only pending or confirmed bookings can be cancelled." });
    }

    try {
      const capacityRestored = await Tutor.updateOne(
        { _id: booking.tutor },
        { $inc: { totalSlots: 1 } }
      );
      if (capacityRestored.matchedCount !== 1) {
        throw new Error("The tutor capacity could not be restored for this cancellation.");
      }
    } catch (error) {
      const bookingRestored = await Booking.updateOne(
        { _id: booking._id, status: "cancelled" },
        { $set: { status: booking.status } }
      );
      if (bookingRestored.modifiedCount !== 1) {
        return next(new AggregateError(
          [error, new Error("The booking cancellation could not be rolled back.")],
          "Booking cancellation failed and its state could not be restored."
        ));
      }
      return next(error);
    }
    let cancellationNotification;
    try {
      const tutor = await Tutor.findById(booking.tutor).select("createdBy subject timeZone");
      if (!tutor) throw new Error("The tutor could not be found to notify them of this cancellation.");
      cancellationNotification = await Notification.create({
        recipient: tutor.createdBy,
        booking: booking._id,
        eventType: "booking_cancelled",
        tutor: tutor._id,
        student: booking.student,
        studentName: booking.studentName,
        subject: tutor.subject,
        startsAt: booking.startsAt,
        timeZone: tutor.timeZone
      });
    } catch (error) {
      const rollbackErrors = [];
      if (cancellationNotification) {
        try {
          const notificationRemoved = await Notification.deleteOne({ _id: cancellationNotification._id });
          if (notificationRemoved.deletedCount !== 1) {
            rollbackErrors.push(new Error("The failed cancellation notification could not be removed."));
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      try {
        const capacityRestored = await Tutor.updateOne(
          { _id: booking.tutor, totalSlots: { $gt: 0 } },
          { $inc: { totalSlots: -1 } }
        );
        if (capacityRestored.modifiedCount !== 1) {
          rollbackErrors.push(new Error("The tutor's reserved capacity could not be restored."));
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      try {
        const bookingRestored = await Booking.updateOne(
          { _id: booking._id, status: "cancelled" },
          { $set: { status: booking.status } }
        );
        if (bookingRestored.modifiedCount !== 1) {
          rollbackErrors.push(new Error("The booking cancellation could not be rolled back."));
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (rollbackErrors.length) {
        return next(new AggregateError(
          [error, ...rollbackErrors],
          "Cancellation notification failed and the booking cancellation could not be fully rolled back."
        ));
      }
      return next(error);
    }
    booking.status = "cancelled";
    await booking.populate("tutor", "name subject hourlyRate timeZone");
    return res.json({ booking, message: "Your session has been cancelled." });
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, requireRole("student"), async (req, res, next) => {
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

    const tutor = await Tutor.findOne({ _id: tutorId, isActive: { $ne: false } });
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });

    if (!Number.isInteger(tutor.totalSlots) || tutor.totalSlots <= 0) {
      return res.status(409).json({ message: "No available slots left." });
    }
    if (!isOnTutorLocalHour(start, tutor.timeZone)) {
      return res.status(400).json({ message: "Sessions must start on the hour." });
    }
    const sessionStartDate = normalizeSessionStartDate(tutor.sessionStartDate);
    if (!sessionStartDate && tutor.sessionStartDate) {
      return res.status(409).json({
        message: "This tutor's saved session start date is invalid. Ask the tutor to review their profile."
      });
    }
    if (!isStartOnOrAfterSessionDate(start, tutor.timeZone, sessionStartDate)) {
      const selectedDate = DateTime.fromJSDate(start, { zone: tutor.timeZone }).toISODate();
      return res.status(409).json({
        message: `The selected session date (${selectedDate}) is before this tutor's start date (${sessionStartDate}) in ${tutor.timeZone}.`
      });
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
      status: { $in: ["pending", "confirmed"] },
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
      { _id: tutor._id, isActive: { $ne: false }, totalSlots: { $gt: 0 } },
      { $inc: { totalSlots: -1, pendingBookingReservations: 1 } }
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
        status: "pending"
      });
      await Notification.create({
        recipient: tutor.createdBy,
        booking: booking._id,
        tutor: tutor._id,
        student: student._id,
        studentName: student.name,
        subject: tutor.subject,
        startsAt: start,
        timeZone: tutor.timeZone
      });
    } catch (error) {
      const rollbackErrors = [];
      let bookingDeleted = !booking;
      if (booking) {
        try {
          const result = await Booking.deleteOne({ _id: booking._id });
          bookingDeleted = result.deletedCount === 1;
          if (!bookingDeleted) rollbackErrors.push(new Error("The failed booking could not be removed."));
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      try {
        await Notification.deleteOne({ booking: booking?._id });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (bookingDeleted) {
        try {
          const reservationRestored = await Tutor.updateOne(
            { _id: tutor._id, pendingBookingReservations: { $gt: 0 } },
            { $inc: { totalSlots: 1, pendingBookingReservations: -1 } }
          );
          if (reservationRestored.modifiedCount !== 1) {
            rollbackErrors.push(new Error("The tutor booking capacity could not be restored."));
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length) {
        return next(new AggregateError(
          [error, ...rollbackErrors],
          "Booking creation failed and its notification or capacity reservation could not be rolled back."
        ));
      }
      if (error?.code === 11000) {
        return res.status(409).json({ message: "That tutor already has a booking for this time." });
      }
      return next(error);
    }
    const reservationReleased = await Tutor.updateOne(
      { _id: tutor._id, pendingBookingReservations: { $gt: 0 } },
      { $inc: { pendingBookingReservations: -1 } }
    );
    if (reservationReleased.modifiedCount !== 1) {
      return next(new Error("The tutor booking reservation could not be finalized."));
    }
    await booking.populate("tutor", "name subject hourlyRate timeZone totalSlots");
    return res.status(201).json({ booking, message: "Your booking request was sent to the tutor for approval." });
  } catch (error) {
    return next(error);
  }
});

export default router;
