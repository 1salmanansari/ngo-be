import { Request, Response, NextFunction } from "express";
import { Referral } from "../models/Referral.js";
import { Patient } from "../models/Patient.js";
import { Doctor } from "../models/Doctor.js";
import { PaginatedRequest } from "../middlewares/pagination.js";

export const createReferral = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { patientId, doctorId, description, details, destails } = req.body;
    const finalDetails = details || destails;

    if (!patientId || !doctorId || !description || !finalDetails) {
      res.status(400).json({
        success: false,
        message: "patientId, doctorId, description, and details are required.",
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

    const referral = new Referral({
      patientId: Number(patientId),
      doctorId: Number(doctorId),
      description: description.trim(),
      details: finalDetails.trim(),
      created: Date.now(),
      updated: Date.now(),
    });

    await referral.save();

    // Mark patient hasReferral: true and update doctorId if provided
    patient.hasReferral = true;
    if (doctorId !== undefined) {
      patient.doctorId = Number(doctorId);
    }
    patient.updated = Date.now();
    await patient.save();

    res.status(201).json({
      success: true,
      message: "Referral created successfully.",
      data: referral,
    });
  } catch (error) {
    next(error);
  }
};

export const getReferrals = async (
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
    const search = (req.query.search as string)?.trim();

    const query: any = {};
    if (patientId) query.patientId = Number(patientId);
    if (doctorId) query.doctorId = Number(doctorId);

    if (search) {
      const numSearch = Number(search);
      const orConditions: any[] = [
        { description: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
      ];

      if (!isNaN(numSearch)) {
        orConditions.push({ patientId: numSearch }, { doctorId: numSearch });
      }

      // Also search doctors and patients matching name
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

      query.$or = orConditions;
    }

    const [total, list] = await Promise.all([
      Referral.countDocuments(query),
      Referral.find(query, "-_id")
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

export const getReferralById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await Referral.findOne({ id }, "-_id").lean();

    if (!item) {
      res.status(404).json({ success: false, message: "Referral not found." });
      return;
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateReferral = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { patientId, doctorId, description, details, destails } = req.body;
    const finalDetails = details || destails;

    const referral = await Referral.findOne({ id });
    if (!referral) {
      res.status(404).json({ success: false, message: "Referral not found." });
      return;
    }

    if (patientId !== undefined) referral.patientId = Number(patientId);
    if (doctorId !== undefined) referral.doctorId = Number(doctorId);
    if (description) referral.description = description.trim();
    if (finalDetails) referral.details = finalDetails.trim();
    referral.updated = Date.now();
    await referral.save();

    res.status(200).json({
      success: true,
      message: "Referral updated successfully.",
      data: referral,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReferral = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await Referral.findOneAndDelete({ id });
    if (!result) {
      res.status(404).json({ success: false, message: "Referral not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Referral deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
