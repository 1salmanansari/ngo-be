import { Router } from "express";
import {
  createReferral,
  getReferrals,
  getReferralById,
  updateReferral,
  deleteReferral,
} from "../controllers/referralController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), createReferral);
router.get("/", extractPagination, getReferrals);
router.get("/:id", getReferralById);
router.put("/:id", authorize(["ADMIN", "TEAM"]), updateReferral);
router.delete("/:id", authorize(["ADMIN"]), deleteReferral);

export default router;
