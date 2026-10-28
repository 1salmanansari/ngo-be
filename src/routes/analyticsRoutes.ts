import { Router } from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getAnalytics);

export default router;
