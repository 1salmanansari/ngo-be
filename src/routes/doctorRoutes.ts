import { Router } from "express";
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctorController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), createDoctor);
router.get("/", extractPagination, getDoctors);
router.get("/:id", getDoctorById);
router.put("/:id", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), updateDoctor);
router.delete("/:id", authorize(["ADMIN"]), deleteDoctor);

export default router;
