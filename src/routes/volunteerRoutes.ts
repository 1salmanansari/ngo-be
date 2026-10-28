import { Router } from "express";
import { getVolunteers } from "../controllers/userController.js";
import { authenticate } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.get("/", extractPagination, getVolunteers);

export default router;
