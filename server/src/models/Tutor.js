import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { _id: false }
);

const tutorSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    photoUrl: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 100 },
    institution: { type: String, required: true, trim: true, maxlength: 150 },
    experience: { type: Number, required: true, min: 0, max: 80 },
    location: { type: String, required: true, trim: true, maxlength: 150 },
    teachingMode: { type: String, required: true, enum: ["Online", "Offline", "Both"] },
    hourlyRate: { type: Number, required: true, min: 0.01 },
    totalSlots: { type: Number, required: true, min: 1, max: 24 },
    sessionStartDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    timeZone: { type: String, required: true },
    availability: { type: [availabilitySchema], required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Tutor", tutorSchema);
