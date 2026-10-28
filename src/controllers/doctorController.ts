import { Request, Response, NextFunction } from "express";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { PrescribeMeds } from "../models/PrescribeMeds.js";
import { PrescribeTest } from "../models/PrescribeTest.js";
import { Referral } from "../models/Referral.js";
import { getNextSequenceValue } from "../models/Counter.js";
import { PaginatedRequest } from "../middlewares/pagination.js";
import { cache } from "../config/redis.js";

export const createDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { firstName, lastName, department, degree, hospital } = req.body;

    if (!firstName || !lastName || !department || !degree) {
      res.status(400).json({
        success: false,
        message: "firstName, lastName, department, and degree are required.",
      });
      return;
    }

    const doctorId = await getNextSequenceValue("doctorId");

    const doctor = new Doctor({
      doctorId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      department: department.trim(),
      degree: degree.trim(),
      hospital: hospital ? hospital.trim() : "",
      created: Date.now(),
      updated: Date.now(),
    });

    await doctor.save();
    await cache.delPattern("doctors:*");

    res.status(201).json({
      success: true,
      message: "Doctor created successfully.",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctors = async (
  req: PaginatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAll = req.query.all === "true" || req.query.limit === "all" || Number(req.query.limit) >= 100;
    const search = ((req.query.search || req.query.seach) as string)?.trim();
    const departmentFilter = (req.query.department as string)?.trim();

    const query: any = {};
    if (departmentFilter && departmentFilter !== "all") {
      query.department = { $regex: `^${departmentFilter}$`, $options: "i" };
    }

    if (search) {
      const num = Number(search);
      const terms = search.split(/\s+/).filter(Boolean);

      const andConditions: any[] = [];
      for (const term of terms) {
        andConditions.push({
          $or: [
            { firstName: { $regex: term, $options: "i" } },
            { lastName: { $regex: term, $options: "i" } },
            { degree: { $regex: term, $options: "i" } },
            { hospital: { $regex: term, $options: "i" } },
            { department: { $regex: term, $options: "i" } },
          ],
        });
      }
      if (!isNaN(num)) {
        andConditions.push({ $or: [{ doctorId: num }] });
      }
      query.$and = andConditions;
    }

    if (isAll) {
      const doctors = await Doctor.find(query, "-_id")
        .sort({ created: -1, doctorId: -1 })
        .lean();
      res.status(200).json({
        success: true,
        data: doctors,
        total: doctors.length,
      });
      return;
    }

    const {
      page = 1,
      limit = 10,
      skip = 0,
    } = req.pagination || { page: 1, limit: 10, skip: 0 };

    const cacheKey = `doctors:list:${page}:${limit}:${departmentFilter || "all"}:${search || "all"}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const [total, doctors] = await Promise.all([
      Doctor.countDocuments(query),
      Doctor.find(query, "-_id")
        .sort({ created: -1, doctorId: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const response = {
      success: true,
      data: doctors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await cache.set(cacheKey, JSON.stringify(response), 30);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getDoctorById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const isNumeric = !isNaN(Number(id));

    const query = isNumeric
      ? { $or: [{ doctorId: Number(id) }, { id }] }
      : { id };

    const doctor = await Doctor.findOne(query, "-_id").lean();

    if (!doctor) {
      res.status(404).json({ success: false, message: "Doctor not found." });
      return;
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const updateDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, department, degree, hospital } = req.body;

    const isNumeric = !isNaN(Number(id));
    const query = isNumeric
      ? { $or: [{ doctorId: Number(id) }, { id }] }
      : { id };

    const doctor = await Doctor.findOne(query);
    if (!doctor) {
      res.status(404).json({ success: false, message: "Doctor not found." });
      return;
    }

    if (firstName) doctor.firstName = firstName.trim();
    if (lastName) doctor.lastName = lastName.trim();
    if (department) doctor.department = department.trim();
    if (degree) doctor.degree = degree.trim();
    if (hospital !== undefined) doctor.hospital = hospital.trim();

    doctor.updated = Date.now();
    await doctor.save();

    await cache.delPattern("doctors:*");

    res.status(200).json({
      success: true,
      message: "Doctor updated successfully.",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const isNumeric = !isNaN(Number(id));
    const query = isNumeric
      ? { $or: [{ doctorId: Number(id) }, { id }] }
      : { id };

    const doctor = await Doctor.findOne(query);
    if (!doctor) {
      res.status(404).json({ success: false, message: "Doctor not found." });
      return;
    }

    const [patientCount, medsCount, testCount, refCount] = await Promise.all([
      Patient.countDocuments({ doctorId: doctor.doctorId }),
      PrescribeMeds.countDocuments({ doctorId: doctor.doctorId }),
      PrescribeTest.countDocuments({ doctorId: doctor.doctorId }),
      Referral.countDocuments({ doctorId: doctor.doctorId }),
    ]);

    if (patientCount > 0 || medsCount > 0 || testCount > 0 || refCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete Dr. ${doctor.firstName} ${doctor.lastName} because they are actively assigned to ${patientCount} patient(s), ${medsCount} prescription(s), ${testCount} test order(s), and ${refCount} referral(s).`,
      });
      return;
    }

    await Doctor.deleteOne({ _id: doctor._id });
    await cache.delPattern("doctors:*");

    res.status(200).json({
      success: true,
      message: "Doctor deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
