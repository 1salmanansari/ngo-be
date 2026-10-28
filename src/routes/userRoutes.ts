import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getVolunteers,
} from "../controllers/userController.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { extractPagination } from "../middlewares/pagination.js";

const router = Router();

router.use(authenticate);

router.get("/volunteers", extractPagination, getVolunteers);
router.post("/", authorize(["ADMIN", "TEAM"]), createUser);
router.get("/", authorize(["ADMIN", "TEAM"]), extractPagination, getUsers);
router.get("/:id", authorize(["ADMIN", "TEAM", "VOLUNTEER"]), getUserById);
router.put("/:id", authorize(["ADMIN", "TEAM"]), updateUser);
router.delete("/:id", authorize(["ADMIN"]), deleteUser);

export default router;
