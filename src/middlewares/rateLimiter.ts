import rateLimit from "express-rate-limit";

// Configured to allow high throughput (>100 req/sec) while preventing catastrophic abuse
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 12000, // Up to 200 requests per second per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after a minute.",
  },
});
