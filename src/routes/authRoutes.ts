import { Router } from "express";
import { login, getCurrentUser } from "../controllers/authController.js";
import { createUser } from "../controllers/userController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Public auth endpoints
router.post("/login", login);
router.post("/register", createUser);

// Authenticated user profile
router.get("/me", authenticate, getCurrentUser);

export default router;
