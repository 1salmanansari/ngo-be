import { Router } from "express";
import {
  createDiagnosis,
  getDiagnosis,
  getDiagnosisById,
  updateDiagnosis,
  deleteDiagnosis,
} from "../controllers/diagnosisController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), createDiagnosis);
router.get("/", extractPagination, getDiagnosis);
router.get("/:id", getDiagnosisById);
router.put("/:id", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), updateDiagnosis);
router.delete("/:id", authorize(["ADMIN"]), deleteDiagnosis);

export default router;
