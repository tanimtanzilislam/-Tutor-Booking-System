import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import tutorRoutes from "./routes/tutors.js";
import bookingRoutes from "./routes/bookings.js";
import notificationRoutes from "./routes/notifications.js";
import Booking from "./models/Booking.js";
import Notification from "./models/Notification.js";
import Tutor from "./models/Tutor.js";
import User from "./models/User.js";

const { MONGODB_URI, JWT_SECRET, PORT = 5000, CLIENT_ORIGIN = "http://localhost:5173" } = process.env;
if (!MONGODB_URI || !JWT_SECRET) {
  throw new Error("MONGODB_URI and JWT_SECRET must be set before starting the server.");
}

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ message: "The submitted information is invalid." });
  }
  return res.status(500).json({ message: "The server could not complete your request." });
});

await mongoose.connect(MONGODB_URI);
const existingTutorOwners = await Tutor.distinct("createdBy");
if (existingTutorOwners.length) {
  await User.updateMany(
    { _id: { $in: existingTutorOwners }, role: { $exists: false } },
    { $set: { role: "tutor" } }
  );
}
const bookingCollectionExists = await mongoose.connection.db
  .listCollections({ name: Booking.collection.collectionName }, { nameOnly: true })
  .toArray();
if (bookingCollectionExists.length) {
  const bookingIndexes = await Booking.collection.indexes();
  const legacyBookingIndex = bookingIndexes.find(
    (index) => {
      if (index.name !== "tutor_1_startsAt_1" || !index.unique) return false;
      const indexedStatuses = index.partialFilterExpression?.status?.$in;
      return !Array.isArray(indexedStatuses) ||
        indexedStatuses.length !== 2 ||
        !indexedStatuses.includes("pending") ||
        !indexedStatuses.includes("confirmed");
    }
  );
  if (legacyBookingIndex) {
    await Booking.collection.dropIndex(legacyBookingIndex.name);
  }
  await Booking.updateMany({ status: "Confirmed" }, { $set: { status: "confirmed" } });
  await Booking.updateMany({ status: "Cancelled" }, { $set: { status: "cancelled" } });
}
await Promise.all([User.init(), Notification.init()]);
await Booking.createIndexes();
app.listen(PORT, () => console.log(`MediQueue API listening on port ${PORT}`));
