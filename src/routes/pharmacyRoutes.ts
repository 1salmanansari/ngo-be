import { Router } from "express";
import {
  createPharmacy,
  getPharmacy,
  getPharmacyById,
  patchPharmacy,
  updatePharmacy,
  deletePharmacy,
} from "../controllers/pharmacyController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), createPharmacy);
router.get("/", extractPagination, getPharmacy);
router.get("/:id", getPharmacyById);
router.patch("/:id", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), patchPharmacy);
router.put("/:id", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), updatePharmacy);
router.delete("/:id", authorize(["ADMIN"]), deletePharmacy);

export default router;
