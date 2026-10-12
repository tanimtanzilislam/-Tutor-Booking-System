import "dotenv/config";
import mongoose from "mongoose";
import Booking from "./models/Booking.js";
import Notification from "./models/Notification.js";
import Tutor from "./models/Tutor.js";
import User from "./models/User.js";

let initialization;

async function initialize() {
  const { MONGODB_URI, JWT_SECRET } = process.env;
  if (!MONGODB_URI || !JWT_SECRET) {
    throw new Error("MONGODB_URI and JWT_SECRET must be set before starting the server.");
  }

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
  const notificationCollectionExists = await mongoose.connection.db
    .listCollections({ name: Notification.collection.collectionName }, { nameOnly: true })
    .toArray();
  if (notificationCollectionExists.length) {
    const notificationIndexes = await Notification.collection.indexes();
    const legacyBookingIndex = notificationIndexes.find(
      (index) => index.unique && index.key?.booking === 1 && Object.keys(index.key).length === 1
    );
    if (legacyBookingIndex) {
      await Notification.collection.dropIndex(legacyBookingIndex.name);
    }
    await Notification.updateMany(
      { eventType: { $exists: false } },
      { $set: { eventType: "booking_request" } }
    );
  }
  await Promise.all([User.init(), Notification.init()]);
  await Booking.createIndexes();
}

export function initializeDatabase() {
  if (!initialization) {
    initialization = initialize().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}
