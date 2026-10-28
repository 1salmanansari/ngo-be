import { Request, Response, NextFunction } from "express";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
import { PaginatedRequest } from "../middlewares/pagination.js";
import { cache } from "../config/redis.js";

export const createDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res
        .status(400)
        .json({ success: false, message: "Department name is required." });
      return;
    }

    const dept = new Department({
      name: name.trim(),
      created: Date.now(),
      updated: Date.now(),
    });

    await dept.save();
    await cache.delPattern("departments:*");

    res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: dept,
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (
  req: PaginatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAll = req.query.all === "true" || req.query.limit === "all" || Number(req.query.limit) >= 100;
    const search = ((req.query.search || req.query.seach) as string)?.trim();

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (isAll) {
      const departments = await Department.find(query, "-_id")
        .sort({ name: 1 })
        .lean();
      res.status(200).json({
        success: true,
        data: departments,
        total: departments.length,
      });
      return;
    }

    const {
      page = 1,
      limit = 10,
      skip = 0,
    } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const cacheKey = `departments:list:${page}:${limit}:${search || "all"}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const [total, departments] = await Promise.all([
      Department.countDocuments(query),
      Department.find(query, "-_id")
        .sort({ created: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const response = {
      success: true,
      data: departments,
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

export const getDepartmentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const dept = await Department.findOne(
      {
        $or: [{ id }, { name: id }],
      },
      "-_id",
    ).lean();

    if (!dept) {
      res
        .status(404)
        .json({ success: false, message: "Department not found." });
      return;
    }

    res.status(200).json({ success: true, data: dept });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const dept = await Department.findOne({ id });
    if (!dept) {
      res
        .status(404)
        .json({ success: false, message: "Department not found." });
      return;
    }

    if (name) dept.name = name.trim();
    dept.updated = Date.now();
    await dept.save();

    await cache.delPattern("departments:*");

    res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: dept,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const dept = await Department.findOne({
      $or: [{ id }, { name: id }],
    });
    if (!dept) {
      res
        .status(404)
        .json({ success: false, message: "Department not found." });
      return;
    }

    const [doctorCount, patientCount] = await Promise.all([
      Doctor.countDocuments({ department: dept.name }),
      Patient.countDocuments({ department: dept.name }),
    ]);

    if (doctorCount > 0 || patientCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete department "${dept.name}" because it is currently assigned to ${doctorCount} doctor(s) and ${patientCount} patient(s).`,
      });
      return;
    }

    await Department.deleteOne({ _id: dept._id });
    await cache.delPattern("departments:*");

    res.status(200).json({
      success: true,
      message: "Department deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
