import { Router } from "express";
import unauthRoutes from "./unauthRoutes.js";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import departmentRoutes from "./departmentRoutes.js";
import pharmacyRoutes from "./pharmacyRoutes.js";
import diagnosisRoutes from "./diagnosisRoutes.js";
import doctorRoutes from "./doctorRoutes.js";
import patientRoutes from "./patientRoutes.js";
import medsRoutes from "./medsRoutes.js";
import testRoutes from "./testRoutes.js";
import referralRoutes from "./referralRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import volunteerRoutes from "./volunteerRoutes.js";

const router = Router();

// Health check endpoint
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "UP",
    timestamp: Date.now(),
    service: "Pragati Foundation Medical Camp API edit",
  });
});

// Mount Public / Unauthenticated routes
router.use("/unauth", unauthRoutes);
router.use("/auth", authRoutes);

// Mount Authenticated RBAC routes
router.use("/users", userRoutes);
router.use("/departments", departmentRoutes);
router.use("/pharmacy", pharmacyRoutes);
router.use("/diagnosis", diagnosisRoutes);
router.use("/doctors", doctorRoutes);
router.use("/patients", patientRoutes);
router.use("/meds", medsRoutes);
router.use("/tests", testRoutes);
router.use("/referrals", referralRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/volunteers", volunteerRoutes);

export default router;
