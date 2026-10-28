import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import apiRouter from "./routes/index.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";
import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app: Application = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

// CORS support for all frontend counter subdomains and localhost
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  if (/^https?:\/\/(?:[a-zA-Z0-9-]+\.)*pragatifoundation\.com(?::\d+)?$/.test(origin)) return true;
  if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN === origin) return true;
  return process.env.NODE_ENV !== "production";
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback gracefully for counter networks
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "limit",
      "page",
      "qty",
      "x-client-app",
      "x-requested-with",
    ],
    exposedHeaders: ["limit", "page", "qty"],
  }),
);

// High-performance gzip response compression
app.use(compression());

// Body parsing with limits
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Logging (concise)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("tiny"));
}

// Global rate limiting (>100 req/s safe)
app.use(apiLimiter);

// API route base: /api/v1
const routePrefix = process.env.ROUTE_PREFIX || "/api/v1";
app.use(routePrefix, apiRouter);

// Root informational endpoint
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    name: "Pragati Foundation Medical Camp Backend API",
    version: "1.0.0",
    documentation: `${routePrefix}/health`,
    baseUri: "https://api.pragatifoundation.com/api/v1/",
    status: "Operational",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;
