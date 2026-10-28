import { Request, Response, NextFunction } from "express";
import { Diagnosis } from "../models/Diagnosis.js";
import { PrescribeTest } from "../models/PrescribeTest.js";
import { PaginatedRequest } from "../middlewares/pagination.js";
import { cache } from "../config/redis.js";

export const createDiagnosis = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res
        .status(400)
        .json({ success: false, message: "Diagnosis name is required." });
      return;
    }

    const item = new Diagnosis({
      name: name.trim(),
      created: Date.now(),
      updated: Date.now(),
    });

    await item.save();
    await cache.delPattern("diagnosis:*");

    res.status(201).json({
      success: true,
      message: "Diagnosis test created successfully.",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const getDiagnosis = async (
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
      const items = await Diagnosis.find(query, "-_id").sort({ name: 1 }).lean();
      res.status(200).json({
        success: true,
        data: items,
        total: items.length,
      });
      return;
    }

    const {
      page = 1,
      limit = 10,
      skip = 0,
    } = req.pagination || { page: 1, limit: 10, skip: 0 };
    const cacheKey = `diagnosis:list:${page}:${limit}:${search || "all"}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const [total, items] = await Promise.all([
      Diagnosis.countDocuments(query),
      Diagnosis.find(query, "-_id")
        .sort({ created: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const response = {
      success: true,
      data: items,
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

export const getDiagnosisById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await Diagnosis.findOne({ id }, "-_id").lean();

    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Diagnosis item not found." });
      return;
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateDiagnosis = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const item = await Diagnosis.findOne({ id });
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Diagnosis item not found." });
      return;
    }

    if (name) item.name = name.trim();
    item.updated = Date.now();
    await item.save();

    await cache.delPattern("diagnosis:*");

    res.status(200).json({
      success: true,
      message: "Diagnosis item updated successfully.",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDiagnosis = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await Diagnosis.findOne({
      $or: [{ id }, { name: id }],
    });
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Diagnosis item not found." });
      return;
    }

    const testCount = await PrescribeTest.countDocuments({ data: item.id });
    if (testCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete diagnostic test "${item.name}" because it is currently linked to ${testCount} patient test order(s).`,
      });
      return;
    }

    await Diagnosis.deleteOne({ _id: item._id });
    await cache.delPattern("diagnosis:*");

    res.status(200).json({
      success: true,
      message: "Diagnosis item deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
