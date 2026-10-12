import { Router } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import Tutor from "../models/Tutor.js";
import requireAuth, { requireRole } from "../middleware/requireAuth.js";

const router = Router();

router.get("/mine", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("student", "name email profileImage")
        .populate("booking", "status")
        .lean(),
      Notification.countDocuments({ recipient: req.userId, readAt: null })
    ]);
    return res.json({ notifications, unreadCount });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:notificationId/decision", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId)) {
      return res.status(404).json({ message: "Notification not found." });
    }
    const { decision } = req.body;
    if (!["confirm", "decline"].includes(decision)) {
      return res.status(400).json({ message: "Choose whether to confirm or decline this booking." });
    }
    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: req.userId
    });
    if (!notification) return res.status(404).json({ message: "Notification not found." });

    const nextStatus = decision === "confirm" ? "confirmed" : "rejected";
    const booking = await Booking.findOneAndUpdate(
      {
        _id: notification.booking,
        tutor: notification.tutor,
        status: "pending"
      },
      { $set: { status: nextStatus } },
      { new: true, runValidators: true }
    );
    if (!booking) {
      const currentBooking = await Booking.findOne({
        _id: notification.booking,
        tutor: notification.tutor
      }).select("status");
      if (!currentBooking) return res.status(404).json({ message: "Booking not found." });
      return res.status(409).json({
        message: `This booking is already ${currentBooking.status}.`
      });
    }

    let capacityRestored = false;
    try {
      if (decision === "decline") {
        const capacityResult = await Tutor.updateOne(
          { _id: notification.tutor },
          { $inc: { totalSlots: 1 } }
        );
        if (capacityResult.matchedCount !== 1) {
          throw new Error("The tutor capacity could not be restored after declining this booking.");
        }
        capacityRestored = true;
      }
      const updatedNotification = await Notification.findOneAndUpdate(
        { _id: notification._id, recipient: req.userId },
        { $set: { readAt: notification.readAt || new Date() } },
        { new: true, runValidators: true }
      )
        .populate("student", "name email profileImage")
        .populate("booking", "status")
        .lean();
      return res.json({
        notification: updatedNotification,
        message: decision === "confirm" ? "Booking confirmed." : "Booking declined."
      });
    } catch (error) {
      const rollbackErrors = [];
      if (capacityRestored) {
        try {
          const capacityReservationRestored = await Tutor.updateOne(
            { _id: notification.tutor, totalSlots: { $gt: 0 } },
            { $inc: { totalSlots: -1 } }
          );
          if (capacityReservationRestored.modifiedCount !== 1) {
            rollbackErrors.push(new Error("The tutor capacity reservation could not be restored."));
          }
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      try {
        const bookingRestored = await Booking.updateOne(
          { _id: booking._id, status: nextStatus },
          { $set: { status: "pending" } }
        );
        if (bookingRestored.modifiedCount !== 1) {
          rollbackErrors.push(new Error("The booking decision could not be rolled back."));
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (rollbackErrors.length) {
        return next(new AggregateError(
          [error, ...rollbackErrors],
          "Booking decision failed and its state could not be restored."
        ));
      }
      return next(error);
    }
  } catch (error) {
    return next(error);
  }
});

router.patch("/:notificationId/read", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId)) {
      return res.status(404).json({ message: "Notification not found." });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.userId, readAt: null },
      { $set: { readAt: new Date() } },
      { new: true, runValidators: true }
    ).lean();
    if (notification) return res.json({ notification });

    const existing = await Notification.findOne({
      _id: req.params.notificationId,
      recipient: req.userId
    }).lean();
    if (!existing) return res.status(404).json({ message: "Notification not found." });
    return res.json({ notification: existing });
  } catch (error) {
    return next(error);
  }
});

export default router;
