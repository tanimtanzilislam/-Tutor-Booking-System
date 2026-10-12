import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    profileImage: { type: String, default: "" },
    role: { type: String, enum: ["student", "tutor"], default: "student" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
