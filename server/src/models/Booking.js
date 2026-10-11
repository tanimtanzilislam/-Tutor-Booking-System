import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true },
    startsAt: { type: Date, required: true },
    sessionToken: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

bookingSchema.index({ tutor: 1, startsAt: 1 }, { unique: true });

export default mongoose.model("Booking", bookingSchema);
