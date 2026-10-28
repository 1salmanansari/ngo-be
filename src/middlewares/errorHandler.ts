import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error("[Unhandled Error]:", err);

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(err.errors).map((e: any) => e.message),
    });
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
};
