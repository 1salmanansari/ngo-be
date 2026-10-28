import { Router } from "express";
import {
  prescribeTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest,
} from "../controllers/testController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), prescribeTest);
router.get("/", extractPagination, getTests);
router.get("/:id", getTestById);
router.put("/:id", authorize(["ADMIN", "TEAM"]), updateTest);
router.delete("/:id", authorize(["ADMIN"]), deleteTest);

export default router;
