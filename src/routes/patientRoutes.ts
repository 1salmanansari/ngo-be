import { Router } from "express";
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from "../controllers/patientController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), createPatient);
router.get("/", extractPagination, getPatients);
router.get("/:id", getPatientById);
router.put("/:id", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), updatePatient);
router.delete("/:id", authorize(["ADMIN"]), deletePatient);

export default router;
