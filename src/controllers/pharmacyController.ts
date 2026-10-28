import { Request, Response, NextFunction } from "express";
import { Pharmacy } from "../models/Pharmacy.js";
import { PrescribeMeds } from "../models/PrescribeMeds.js";
import { PaginatedRequest } from "../middlewares/pagination.js";
import { cache } from "../config/redis.js";

export const createPharmacy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, qty } = req.body;
    if (!name) {
      res
        .status(400)
        .json({ success: false, message: "Medicine name is required." });
      return;
    }

    const item = new Pharmacy({
      name: name.trim(),
      qty: qty !== undefined ? Number(qty) : 0,
      created: Date.now(),
      updated: Date.now(),
    });

    await item.save();
    await cache.delPattern("pharmacy:*");

    res.status(201).json({
      success: true,
      message: "Pharmacy medicine item added successfully.",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const getPharmacy = async (
  req: PaginatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isAll = req.query.all === "true" || req.query.limit === "all" || Number(req.query.limit) >= 100;
    const search = ((req.query.seach || req.query.search) as string)?.trim();
    const sortBy = (req.query.sortBy as string)?.trim();
    const order = (req.query.order?.toString().toLowerCase() === "asc") ? 1 : -1;

    let sortObj: any = { created: order };
    if (sortBy === "qty") {
      sortObj = { qty: order };
    } else if (sortBy === "name") {
      sortObj = { name: (req.query.order?.toString().toLowerCase() === "desc") ? -1 : 1 };
    } else if (sortBy === "lastModified" || sortBy === "updated") {
      sortObj = { updated: order };
    }

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (isAll) {
      const items = await Pharmacy.find(query, "-_id")
        .sort(sortObj)
        .lean();

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
    const cacheKey = `pharmacy:list:${page}:${limit}:${sortBy || "default"}:${order}:${search || "all"}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    const [total, items] = await Promise.all([
      Pharmacy.countDocuments(query),
      Pharmacy.find(query, "-_id").sort(sortObj).skip(skip).limit(limit).lean(),
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

export const getPharmacyById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await Pharmacy.findOne({ id }, "-_id").lean();

    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Pharmacy item not found." });
      return;
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const patchPharmacy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Support qty passed via header (as per user specs) or request body
    const headerQty = req.headers["qty"];
    const bodyQty = req.body?.qty;
    const newQty =
      headerQty !== undefined
        ? Number(headerQty)
        : bodyQty !== undefined
          ? Number(bodyQty)
          : undefined;

    if (newQty === undefined || isNaN(newQty)) {
      res.status(400).json({
        success: false,
        message: "Quantity (qty) is required in headers or request body.",
      });
      return;
    }

    const item = await Pharmacy.findOne({ id });
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Pharmacy item not found." });
      return;
    }

    item.qty = newQty;
    item.updated = Date.now();
    await item.save();

    await cache.delPattern("pharmacy:*");

    res.status(200).json({
      success: true,
      message: "Pharmacy stock quantity updated successfully.",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePharmacy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, qty } = req.body;

    const item = await Pharmacy.findOne({ id });
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Pharmacy item not found." });
      return;
    }

    if (name) item.name = name.trim();
    if (qty !== undefined) item.qty = Number(qty);
    item.updated = Date.now();
    await item.save();

    await cache.delPattern("pharmacy:*");

    res.status(200).json({
      success: true,
      message: "Pharmacy item updated successfully.",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePharmacy = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await Pharmacy.findOne({
      $or: [{ id }, { name: id }],
    });
    if (!item) {
      res
        .status(404)
        .json({ success: false, message: "Pharmacy item not found." });
      return;
    }

    const prescriptionCount = await PrescribeMeds.countDocuments({
      "data.id": item.id,
    });
    if (prescriptionCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete medication "${item.name}" because it is currently linked to ${prescriptionCount} patient prescription record(s).`,
      });
      return;
    }

    await Pharmacy.deleteOne({ _id: item._id });
    await cache.delPattern("pharmacy:*");

    res.status(200).json({
      success: true,
      message: "Pharmacy item deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
