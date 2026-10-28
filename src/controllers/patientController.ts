import { Request, Response, NextFunction } from "express";
import { Patient } from "../models/Patient.js";
import { User } from "../models/User.js";
import { getNextSequenceValue } from "../models/Counter.js";
import { calculateAge } from "../utils/ageCalculator.js";
import { PaginatedRequest } from "../middlewares/pagination.js";
import { cache } from "../config/redis.js";

export const createPatient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      name,
      dob,
      age: rawAge,
      mobile,
      gender,
      address,
      complaint,
      department,
      doctorId,
      author,
      vitals,
      ratings,
    } = req.body;

    const effectiveAuthor = String(author || "self_patient").trim();

    if (!name || !mobile || !gender || !complaint || !department || !effectiveAuthor) {
      res.status(400).json({
        success: false,
        message:
          "name, mobile, gender, complaint, department, and author are required.",
      });
      return;
    }

    const calculatedAge = calculateAge(dob, rawAge);
    if (!calculatedAge && calculatedAge !== 0) {
      res.status(400).json({
        success: false,
        message: "Age or valid DOB timestamp is required.",
      });
      return;
    }

    const patientId = await getNextSequenceValue("patientId");

    const patient = new Patient({
      name: name.trim(),
      patientId,
      age: calculatedAge,
      dob: dob ? Number(dob) : 0,
      mobile: Number(mobile),
      gender: gender.toUpperCase(),
      address: address ? address.trim() : "",
      complaint: complaint.trim(),
      department: department.trim(),
      doctorId: doctorId ? Number(doctorId) : undefined,
      author: effectiveAuthor,
      vitals: vitals || {},
      ratings: ratings !== undefined ? Number(ratings) : undefined,
      hasTest: false,
      hasMeds: false,
      hasReferral: false,
      created: Date.now(),
      updated: Date.now(),
    });

    await patient.save();
    await cache.delPattern("patients:*");

    res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

export const getPatients = async (
  req: PaginatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      skip = 0,
    } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const departmentFilter = req.query.department as string;
    const authorFilter = req.query.author as string;
    const doctorFilter = req.query.doctorId as string;
    const genderFilter = req.query.gender as string;
    const search = ((req.query.search || req.query.name || req.query.seach) as string)?.trim();

    const query: any = {};
    if (departmentFilter && departmentFilter !== "all") {
      query.department = { $regex: `^${departmentFilter}$`, $options: "i" };
    }
    if (authorFilter) {
      const user = await User.findOne({
        $or: [{ id: authorFilter }, { username: authorFilter }],
      }).lean();
      if (user) {
        query.author = { $in: [user.id, user.username, authorFilter] };
      } else {
        query.author = authorFilter;
      }
    }
    if (doctorFilter) {
      query.doctorId = Number(doctorFilter);
    }
    if (genderFilter) {
      query.gender = genderFilter.toUpperCase();
    }
    if (search) {
      const isNum = !isNaN(Number(search));
      if (isNum) {
        query.$or = [{ patientId: Number(search) }, { mobile: Number(search) }];
      } else {
        query.name = { $regex: search, $options: "i" };
      }
    }

    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query, "-_id")
        .sort({ created: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: patients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const isNumeric = !isNaN(Number(id));

    const query = isNumeric
      ? { $or: [{ patientId: Number(id) }, { id }] }
      : { id };

    const patient = await Patient.findOne(query, "-_id").lean();

    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

export const patchPatient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { vitals, doctorId, ratings, hasTest, hasMeds, hasReferral } =
      req.body;

    const isNumeric = !isNaN(Number(id));
    const query = isNumeric
      ? { $or: [{ patientId: Number(id) }, { id }] }
      : { id };

    const patient = await Patient.findOne(query);
    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    if (vitals) {
      patient.vitals = {
        ...patient.vitals,
        ...vitals,
      };
    }

    if (doctorId !== undefined) {
      patient.doctorId = Number(doctorId);
    }

    if (ratings !== undefined) {
      const r = Number(ratings);
      if (r < 1 || r > 10) {
        res
          .status(400)
          .json({
            success: false,
            message: "Ratings must be between 1 and 10.",
          });
        return;
      }
      patient.ratings = r;
    }

    if (hasTest !== undefined) patient.hasTest = Boolean(hasTest);
    if (hasMeds !== undefined) patient.hasMeds = Boolean(hasMeds);
    if (hasReferral !== undefined) patient.hasReferral = Boolean(hasReferral);

    patient.updated = Date.now();
    await patient.save();

    res.status(200).json({
      success: true,
      message: "Patient profile updated successfully.",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      dob,
      age,
      mobile,
      gender,
      address,
      complaint,
      department,
      doctorId,
      author,
      vitals,
      ratings,
      hasTest,
      hasMeds,
      hasReferral,
    } = req.body;

    const isNumeric = !isNaN(Number(id));
    const query = isNumeric
      ? { $or: [{ patientId: Number(id) }, { id }] }
      : { id };

    const patient = await Patient.findOne(query);
    if (!patient) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    if (name) patient.name = name.trim();
    if (dob !== undefined) {
      patient.dob = Number(dob);
      patient.age = calculateAge(patient.dob, age || patient.age);
    } else if (age !== undefined) {
      patient.age = Number(age);
    }
    if (mobile !== undefined) patient.mobile = Number(mobile);
    if (gender) patient.gender = gender.toUpperCase();
    if (address !== undefined) patient.address = address.trim();
    if (complaint) patient.complaint = complaint.trim();
    if (department) patient.department = department.trim();
    if (doctorId !== undefined) patient.doctorId = Number(doctorId);
    if (author) patient.author = String(author).trim();
    if (vitals) patient.vitals = vitals;
    if (ratings !== undefined) patient.ratings = Number(ratings);
    if (hasTest !== undefined) patient.hasTest = Boolean(hasTest);
    if (hasMeds !== undefined) patient.hasMeds = Boolean(hasMeds);
    if (hasReferral !== undefined) patient.hasReferral = Boolean(hasReferral);

    patient.updated = Date.now();
    await patient.save();

    res.status(200).json({
      success: true,
      message: "Patient updated successfully.",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const isNumeric = !isNaN(Number(id));
    const query = isNumeric
      ? { $or: [{ patientId: Number(id) }, { id }] }
      : { id };

    const result = await Patient.findOneAndDelete(query);
    if (!result) {
      res.status(404).json({ success: false, message: "Patient not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
