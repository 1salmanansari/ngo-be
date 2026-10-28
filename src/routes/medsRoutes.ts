import { Router } from "express";
import {
  prescribeMeds,
  getMeds,
  getMedsById,
  updateMeds,
  deleteMeds,
} from "../controllers/medsController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), prescribeMeds);
router.get("/", extractPagination, getMeds);
router.get("/:id", getMedsById);
router.put("/:id", authorize(["ADMIN", "TEAM"]), updateMeds);
router.delete("/:id", authorize(["ADMIN"]), deleteMeds);

export default router;
