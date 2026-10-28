import { Request, Response, NextFunction } from "express";
import { PrescribeTest } from "../models/PrescribeTest.js";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import { PaginatedRequest } from "../middlewares/pagination.js";

export const prescribeTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { data, patientId, doctorId } = req.body;

    if (!patientId || !data || !Array.isArray(data) || data.length === 0) {
      res.status(400).json({
        success: false,
        message:
          "patientId and non-empty data array with diagnosis IDs are required.",
      });
      return;
    }

    const patient = await Patient.findOne({ patientId: Number(patientId) });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: `Patient with patientId #${patientId} not found.`,
      });
      return;
    }

    const testRecord = new PrescribeTest({
      data: data.map((id: string) => String(id).trim()),
      patientId: Number(patientId),
      doctorId: doctorId !== undefined ? Number(doctorId) : undefined,
      created: Date.now(),
      updated: Date.now(),
    });

    await testRecord.save();

    // Mark patient hasTest: true and update doctorId if provided
    patient.hasTest = true;
    if (doctorId !== undefined) {
      patient.doctorId = Number(doctorId);
    }
    patient.updated = Date.now();
    await patient.save();

    res.status(201).json({
      success: true,
      message: "Diagnostic tests recorded for patient successfully.",
      data: testRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getTests = async (
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
    const patientId = req.query.patientId as string;
    const doctorId = req.query.doctorId as string;
    const diagnosisId = req.query.diagnosisId as string;
    const search = (req.query.search as string)?.trim();

    const query: any = {};
    if (patientId) {
      query.patientId = Number(patientId);
    }
    if (doctorId) {
      query.doctorId = Number(doctorId);
    }
    if (diagnosisId) {
      query.data = diagnosisId;
    }
    if (search) {
      const numSearch = Number(search);
      const orConditions: any[] = [];
      if (!isNaN(numSearch)) {
        orConditions.push({ patientId: numSearch }, { doctorId: numSearch });
      }

      const [matchingDoctors, matchingPatients] = await Promise.all([
        Doctor.find({
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
          ],
        })
          .select("doctorId")
          .lean(),
        Patient.find({
          name: { $regex: search, $options: "i" },
        })
          .select("patientId")
          .lean(),
      ]);

      if (matchingDoctors.length > 0) {
        orConditions.push({
          doctorId: { $in: matchingDoctors.map((d) => d.doctorId) },
        });
      }

      if (matchingPatients.length > 0) {
        orConditions.push({
          patientId: { $in: matchingPatients.map((p) => p.patientId) },
        });
      }

      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    }

    const [total, list] = await Promise.all([
      PrescribeTest.countDocuments(query),
      PrescribeTest.find(query, "-_id")
        .sort({ created: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pids = [...new Set(list.map((r: any) => r.patientId))];
    const docIds = [...new Set(list.map((r: any) => r.doctorId).filter(Boolean))];

    const [patients, doctors] = await Promise.all([
      Patient.find({ patientId: { $in: pids } }, "patientId name").lean(),
      Doctor.find({ doctorId: { $in: docIds } }, "doctorId firstName lastName").lean(),
    ]);

    const pMap: Record<number, string> = {};
    patients.forEach((p) => {
      pMap[p.patientId] = p.name;
    });

    const dMap: Record<number, string> = {};
    doctors.forEach((d) => {
      dMap[d.doctorId] = `Dr. ${d.firstName} ${d.lastName}`;
    });

    const enrichedList = list.map((item: any) => ({
      ...item,
      patientName: pMap[item.patientId] || `Patient #${item.patientId}`,
      doctorName: dMap[item.doctorId] || `Dr. #${item.doctorId}`,
    }));

    res.status(200).json({
      success: true,
      data: enrichedList,
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

export const getTestById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await PrescribeTest.findOne({ id }, "-_id").lean();

    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Test record not found." });
      return;
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, patientId, doctorId } = req.body;

    const testRecord = await PrescribeTest.findOne({ id });
    if (!testRecord) {
      res
        .status(404)
        .json({ success: false, message: "Test record not found." });
      return;
    }

    if (data) testRecord.data = data;
    if (patientId) testRecord.patientId = Number(patientId);
    if (doctorId !== undefined) testRecord.doctorId = Number(doctorId);
    testRecord.updated = Date.now();
    await testRecord.save();

    res.status(200).json({
      success: true,
      message: "Test record updated successfully.",
      data: testRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await PrescribeTest.findOneAndDelete({ id });
    if (!result) {
      res
        .status(404)
        .json({ success: false, message: "Test record not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Test record deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
