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
    subject: { type: String, required: true, trim: true, maxlength: 100 },
    bio: { type: String, required: true, trim: true, maxlength: 2000 },
    hourlyRate: { type: Number, required: true, min: 0 },
    timeZone: { type: String, required: true },
    availability: { type: [availabilitySchema], required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Tutor", tutorSchema);
