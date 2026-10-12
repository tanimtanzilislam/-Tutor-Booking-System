import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true },
    studentName: { type: String, required: true, trim: true, maxlength: 80 },
    studentEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    startsAt: { type: Date, required: true },
    sessionToken: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "confirmed", "rejected", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true, autoIndex: false }
);

bookingSchema.index(
  { tutor: 1, startsAt: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } }
  }
);

export default mongoose.model("Booking", bookingSchema);
