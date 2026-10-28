import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

// Strict rate limiter for public unauth write actions (anti-spam / anti-bot flood)
export const unauthWriteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // max 120 submissions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Rate limit exceeded on public counter. Please slow down.",
  },
});

// Allowed client domains / origins for onsite counters
const TRUSTED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*pragatifoundation\.com(?::\d+)?$/,
];

export const verifyUnauthClient = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const origin = req.headers.origin || req.headers.referer;
  const clientAppHeader = req.headers["x-client-app"];

  // 1. Allow if valid custom client app header is sent by Pragati counter app
  if (clientAppHeader === "pragati-onsite") {
    return next();
  }

  // 2. Allow if origin matches trusted patterns
  if (origin) {
    const isTrusted = TRUSTED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
    if (isTrusted) {
      return next();
    }
  }

  // 3. Allow internal/server-side fetch (no origin) in dev or if user-agent is not a known bot
  const userAgent = (req.headers["user-agent"] || "").toLowerCase();
  const isKnownBot =
    userAgent.includes("python") ||
    userAgent.includes("curl") && process.env.NODE_ENV === "production" ||
    userAgent.includes("wget") ||
    userAgent.includes("postman") && process.env.NODE_ENV === "production";

  if (isKnownBot && !origin && !clientAppHeader) {
    res.status(403).json({
      success: false,
      message: "Access forbidden: untrusted automated client.",
    });
    return;
  }

  next();
};
