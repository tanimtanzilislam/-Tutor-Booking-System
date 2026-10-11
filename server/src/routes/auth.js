import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

function createSession(user) {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage
    }
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, profileImage = "" } = req.body;
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Name and email are required." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (typeof profileImage !== "string") {
      return res.status(400).json({ message: "Profile image must be a URL." });
    }
    if (profileImage.trim()) {
      try {
        const imageUrl = new URL(profileImage);
        if (!["http:", "https:"].includes(imageUrl.protocol)) throw new Error("Unsupported URL protocol");
      } catch {
        return res.status(400).json({ message: "Enter a valid HTTP or HTTPS profile image URL." });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      profileImage: profileImage.trim()
    });
    return res.status(201).json(createSession(user));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    return res.json(createSession(user));
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("name email profileImage");
    if (!user) return res.status(401).json({ message: "Your account could not be found. Please log in again." });
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
