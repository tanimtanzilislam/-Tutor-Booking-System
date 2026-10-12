import { Router } from "express";
import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import requireAuth, { requireRole } from "../middleware/requireAuth.js";

const router = Router();

router.get("/mine", requireAuth, requireRole("tutor"), async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ recipient: req.userId, readAt: null })
    ]);
    return res.json({ notifications, unreadCount });
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
