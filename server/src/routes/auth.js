import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
const passwordResetLifetimeMs = 60 * 60 * 1000;

function clientUrl(path) {
  return `${(process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/+$/, "")}${path}`;
}

function passwordResetMailer() {
  const { SMTP_HOST, SMTP_PORT = "587", SMTP_USER, SMTP_PASSWORD, SMTP_FROM = SMTP_USER } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return {
    from: SMTP_FROM,
    transporter: nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
    })
  };
}

function isSafeReturnPath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

function googleConfiguration() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";
  try {
    new URL(callbackUrl);
  } catch {
    throw new Error("GOOGLE_CALLBACK_URL must be a valid absolute URL.");
  }
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackUrl };
}

function googleStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000,
    path: "/api/auth/google"
  };
}

function googleStateCookieClearOptions() {
  const { httpOnly, sameSite, secure, path } = googleStateCookieOptions();
  return { httpOnly, sameSite, secure, path };
}

function readCookie(req, name) {
  const cookieHeader = req.get("cookie") || "";
  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function redirectGoogleError(res, code) {
  return res.redirect(`${clientUrl("/auth/callback")}?google_error=${encodeURIComponent(code)}`);
}

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
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    return res.json(createSession(user));
  } catch (error) {
    return next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  const mailer = passwordResetMailer();
  if (!mailer) {
    return res.status(503).json({ message: "Password reset email is not configured. Contact the site administrator." });
  }

  try {
    const { email } = req.body;
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Enter the email address for your account." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user) {
      const resetToken = randomBytes(32).toString("hex");
      user.resetPasswordTokenHash = createHash("sha256").update(resetToken).digest("hex");
      user.resetPasswordExpires = new Date(Date.now() + passwordResetLifetimeMs);
      await user.save();

      const resetUrl = new URL("/reset-password", clientUrl("/"));
      resetUrl.searchParams.set("email", user.email);
      resetUrl.searchParams.set("token", resetToken);

      try {
        await mailer.transporter.sendMail({
          from: mailer.from,
          to: user.email,
          subject: "Reset your MediQueue password",
          text: `Use this link within one hour to reset your password:\n\n${resetUrl.toString()}\n\nIf you didn't request a password reset, you can ignore this email.`,
          html: `<p>Use this link within one hour to reset your password:</p><p><a href="${resetUrl.toString()}">Reset your MediQueue password</a></p><p>If you didn't request a password reset, you can ignore this email.</p>`
        });
      } catch (mailError) {
        user.resetPasswordTokenHash = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        console.error("Password reset email delivery failed:", mailError);
        return res.status(502).json({ message: "The reset email could not be sent. Please try again later." });
      }
    }

    return res.json({ message: "If an account exists for that email, a password reset link has been sent." });
  } catch (error) {
    return next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    if (typeof email !== "string" || typeof token !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "The reset link or new password is invalid." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({ message: "The reset link is invalid or has expired." });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    }).select("+resetPasswordTokenHash +resetPasswordExpires");
    if (!user) {
      return res.status(400).json({ message: "The reset link is invalid or has expired." });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ message: "Your password has been reset. You can now log in." });
  } catch (error) {
    return next(error);
  }
});

router.get("/google", (req, res, next) => {
  try {
    const config = googleConfiguration();
    if (!config) return redirectGoogleError(res, "not_configured");

    const returnTo = isSafeReturnPath(req.query.returnTo) ? req.query.returnTo : "/";
    const state = `${randomBytes(24).toString("hex")}.${Buffer.from(returnTo).toString("base64url")}`;
    res.cookie("mediqueue-google-state", state, googleStateCookieOptions());

    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.searchParams.set("client_id", config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", config.callbackUrl);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", "openid email profile");
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("prompt", "select_account");
    return res.redirect(authorizationUrl.toString());
  } catch (error) {
    return next(error);
  }
});

router.get("/google/callback", async (req, res) => {
  const expectedState = readCookie(req, "mediqueue-google-state");
  res.clearCookie("mediqueue-google-state", googleStateCookieClearOptions());
  const { code, state, error } = req.query;
  if (error || typeof code !== "string" || typeof state !== "string" || typeof expectedState !== "string") {
    return redirectGoogleError(res, "cancelled");
  }

  const actualBuffer = Buffer.from(state);
  const expectedBuffer = Buffer.from(expectedState);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return redirectGoogleError(res, "invalid_state");
  }

  const [nonce, encodedReturnTo] = state.split(".");
  if (!/^[a-f0-9]{48}$/.test(nonce) || !encodedReturnTo) {
    return redirectGoogleError(res, "invalid_state");
  }

  let returnTo = "/";
  try {
    const decodedReturnTo = Buffer.from(encodedReturnTo, "base64url").toString("utf8");
    if (isSafeReturnPath(decodedReturnTo)) returnTo = decodedReturnTo;
  } catch {
    return redirectGoogleError(res, "invalid_state");
  }

  try {
    const config = googleConfiguration();
    if (!config) return redirectGoogleError(res, "not_configured");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.callbackUrl,
        grant_type: "authorization_code"
      })
    });
    if (!tokenResponse.ok) {
      console.error("Google OAuth token exchange failed:", tokenResponse.status);
      return redirectGoogleError(res, "exchange_failed");
    }

    const tokenPayload = await tokenResponse.json();
    if (typeof tokenPayload.access_token !== "string") {
      return redirectGoogleError(res, "exchange_failed");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
    });
    if (!profileResponse.ok) {
      console.error("Google OAuth profile request failed:", profileResponse.status);
      return redirectGoogleError(res, "profile_failed");
    }

    const profile = await profileResponse.json();
    if (profile.email_verified !== true || typeof profile.email !== "string" || !profile.email.trim()) {
      return redirectGoogleError(res, "unverified_email");
    }

    const email = profile.email.trim().toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      try {
        user = await User.create({
          name: typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : email,
          email,
          profileImage: typeof profile.picture === "string" ? profile.picture : ""
        });
      } catch (createError) {
        if (createError?.code !== 11000) throw createError;
        user = await User.findOne({ email });
        if (!user) throw createError;
      }
    } else if (!user.profileImage && typeof profile.picture === "string") {
      user.profileImage = profile.picture;
      await user.save();
    }

    const session = createSession(user);
    const redirectUrl = new URL("/auth/callback", clientUrl("/"));
    redirectUrl.hash = new URLSearchParams({
      token: session.token,
      returnTo
    }).toString();
    return res.redirect(redirectUrl.toString());
  } catch (callbackError) {
    console.error("Google OAuth callback failed:", callbackError);
    return redirectGoogleError(res, "callback_failed");
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
