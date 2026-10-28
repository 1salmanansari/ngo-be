import { Request, Response, NextFunction } from "express";
import { PrescribeMeds, IMed } from "../models/PrescribeMeds.js";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import { Pharmacy } from "../models/Pharmacy.js";
import { PaginatedRequest } from "../middlewares/pagination.js";

export const prescribeMeds = async (
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
          "patientId and non-empty data array with medicine id and qty are required.",
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

    const prescription = new PrescribeMeds({
      data: data.map((item: IMed) => ({
        id: String(item.id).trim(),
        qty: Number(item.qty),
      })),
      patientId: Number(patientId),
      doctorId: doctorId !== undefined ? Number(doctorId) : undefined,
      created: Date.now(),
      updated: Date.now(),
    });

    await prescription.save();

    // Mark patient hasMeds: true and update doctorId if provided
    patient.hasMeds = true;
    if (doctorId !== undefined) {
      patient.doctorId = Number(doctorId);
    }
    patient.updated = Date.now();
    await patient.save();

    // Deduct stock from pharmacy in background (non-blocking for throughput)
    for (const item of data) {
      Pharmacy.findOneAndUpdate(
        { id: item.id },
        { $inc: { qty: -Math.abs(Number(item.qty)) } },
      ).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: "Medications prescribed and handed to patient successfully.",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const getMeds = async (
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
    const pharmacyId = req.query.pharmacyId as string;
    const search = (req.query.search as string)?.trim();

    const query: any = {};
    if (patientId) {
      query.patientId = Number(patientId);
    }
    if (doctorId) {
      query.doctorId = Number(doctorId);
    }
    if (pharmacyId) {
      query["data.id"] = pharmacyId;
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
      PrescribeMeds.countDocuments(query),
      PrescribeMeds.find(query, "-_id")
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

export const getMedsById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await PrescribeMeds.findOne({ id }, "-_id").lean();

    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Prescription record not found." });
      return;
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateMeds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { data, patientId, doctorId } = req.body;

    const prescription = await PrescribeMeds.findOne({ id });
    if (!prescription) {
      res
        .status(404)
        .json({ success: false, message: "Prescription record not found." });
      return;
    }

    if (data) prescription.data = data;
    if (patientId) prescription.patientId = Number(patientId);
    if (doctorId !== undefined) prescription.doctorId = Number(doctorId);
    prescription.updated = Date.now();
    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Prescription record updated successfully.",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMeds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await PrescribeMeds.findOneAndDelete({ id });
    if (!result) {
      res
        .status(404)
        .json({ success: false, message: "Prescription record not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Prescription record deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
