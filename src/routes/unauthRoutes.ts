import { Router } from "express";
import {
  createPatient,
  getPatients,
  getPatientById,
  patchPatient,
} from "../controllers/patientController.js";
import { getDoctors } from "../controllers/doctorController.js";
import { getDepartments } from "../controllers/departmentController.js";
import { getPharmacy } from "../controllers/pharmacyController.js";
import { getDiagnosis } from "../controllers/diagnosisController.js";
import { createReferral } from "../controllers/referralController.js";
import { prescribeMeds } from "../controllers/medsController.js";
import { prescribeTest } from "../controllers/testController.js";
import { extractPagination } from "../middlewares/pagination.js";
import {
  verifyUnauthClient,
  unauthWriteLimiter,
} from "../middlewares/unauthProtection.js";

const router = Router();

// Protect all public counter unauth routes against scraping and flood attacks
router.use(verifyUnauthClient);

// Departments (Public Consultation & Registration List - returns all 25 by default)
router.get(
  "/departments",
  (req, _res, next) => {
    req.query.all = "true";
    next();
  },
  extractPagination,
  getDepartments,
);

// Patients (Public Counter Routes)
router.post("/patients", unauthWriteLimiter, createPatient);
router.get("/patients", extractPagination, getPatients);
router.get("/patients/:id", getPatientById);
router.patch("/patients/:id", unauthWriteLimiter, patchPatient);

// Doctors (Public Consultation Selection - returns all doctors by default for autocomplete)
router.get(
  "/doctors",
  (req, _res, next) => {
    if (!req.query.page) req.query.all = "true";
    next();
  },
  extractPagination,
  getDoctors,
);

// Referrals (Public Referral Counter)
router.post("/referrals", unauthWriteLimiter, createReferral);

// Pharmacy Meds (Public Meds Counter)
router.get(
  "/meds",
  (req, _res, next) => {
    if (!req.query.limit && !req.query.page) req.query.limit = "100";
    next();
  },
  extractPagination,
  getPharmacy,
);
router.post("/meds", unauthWriteLimiter, prescribeMeds);

// Diagnostic Tests (Public Tests Counter)
router.get(
  "/tests",
  (req, _res, next) => {
    if (!req.query.limit && !req.query.page) req.query.limit = "100";
    next();
  },
  extractPagination,
  getDiagnosis,
);
router.post("/tests", unauthWriteLimiter, prescribeTest);

export default router;
