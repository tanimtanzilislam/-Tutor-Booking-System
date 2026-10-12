import "dotenv/config";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.js";
import tutorRoutes from "./routes/tutors.js";
import bookingRoutes from "./routes/bookings.js";
import notificationRoutes from "./routes/notifications.js";

const { CLIENT_ORIGIN = "http://localhost:5173" } = process.env;

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({
  name: "MediQueue API",
  status: "ok",
  health: "/api/health"
}));
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

export default app;
