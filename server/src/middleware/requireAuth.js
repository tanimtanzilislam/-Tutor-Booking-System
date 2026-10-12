import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default function requireAuth(req, res, next) {
  const authorization = req.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Please log in to continue." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload !== "object" || typeof payload.sub !== "string" || !payload.sub) {
      return res.status(401).json({ message: "Your session is invalid or has expired. Please log in again." });
    }
    req.userId = payload.sub;
    req.userRole = ["student", "tutor"].includes(payload.role) ? payload.role : undefined;
    return next();
  } catch {
    return res.status(401).json({ message: "Your session is invalid or has expired. Please log in again." });
  }
}

export function requireRole(role) {
  return async function authorizeRole(req, res, next) {
    try {
      const user = await User.findById(req.userId).select("name role");
      if (!user) {
        return res.status(401).json({ message: "Your account could not be found. Please log in again." });
      }
      if (user.role !== role) {
        return res.status(403).json({ message: "You do not have permission to perform this action." });
      }
      req.userRole = user.role;
      req.userName = user.name;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
