import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/User.js";
import { AuthenticatedRequest } from "../middlewares/auth.js";

dotenv.config();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "pragati_foundation_camp_jwt_secret_key_2026_super_secure";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: "Username and password are required.",
      });
      return;
    }

    const user = await User.findOne({ username }).lean();
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid username or credentials.",
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
      return;
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const { password: _, _id, ...safeUser } = user;

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthenticated." });
      return;
    }
    const user = await User.findOne({ id: req.user.id }).lean();
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }
    const { password, _id, ...safeUser } = user;
    res.status(200).json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
};
