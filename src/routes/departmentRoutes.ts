import { Router } from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.post("/", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), createDepartment);
router.get("/", extractPagination, getDepartments);
router.get("/:id", getDepartmentById);
router.put("/:id", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), updateDepartment);
router.delete("/:id", authorize(["ADMIN"]), deleteDepartment);

export default router;
