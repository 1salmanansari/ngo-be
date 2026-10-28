import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Patient } from "../models/Patient.js";
import { formatVolunteerCredentials } from "../utils/volunteerHelper.js";
import { PaginatedRequest } from "../middlewares/pagination.js";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      name,
      role,
      mobile,
      username: rawUsername,
      password: rawPassword,
    } = req.body;

    if (!name) {
      res.status(400).json({ success: false, message: "Name is required." });
      return;
    }

    const credentials = formatVolunteerCredentials({
      name,
      role,
      mobile,
      username: rawUsername,
      password: rawPassword,
    });

    const existingUser = await User.findOne({ username: credentials.username });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: `Username '${credentials.username}' is already registered.`,
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(credentials.password, salt);

    const user = new User({
      name,
      username: credentials.username,
      password: hashedPassword,
      role: credentials.role,
      created: Date.now(),
      updated: Date.now(),
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
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

    const { search, role } = req.query;
    const filter: any = {};
    if (role && typeof role === "string" && role !== "ALL") {
      filter.role = role;
    }
    if (search && typeof search === "string" && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { name: { $regex: s, $options: "i" } },
        { username: { $regex: s, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter, "-password -_id")
        .sort({ created: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: users,
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

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findOne(
      {
        $or: [{ id }, { username: id }],
      },
      "-password -_id",
    ).lean();

    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, username, password, role } = req.body;

    const user = await User.findOne({ id });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (username) {
      const conflict = await User.findOne({ username, id: { $ne: id } });
      if (conflict) {
        res
          .status(409)
          .json({ success: false, message: "Username already in use." });
        return;
      }
      user.username = username;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    user.updated = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await User.findOneAndDelete({ id });
    if (!result) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const getVolunteers = async (
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
    const search = ((req.query.search || req.query.seach) as string)?.trim();
    const order = (req.query.order?.toString().toLowerCase() === "desc") ? -1 : 1;

    const query: any = { role: "VOLUNTEER", username: { $ne: "self_patient" } };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const [total, volunteers] = await Promise.all([
      User.countDocuments(query),
      User.find(query, "-password -_id")
        .sort({ name: order })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Aggregate patient counts per volunteer author
    const volIds = volunteers.map((v) => v.id);
    const volUsernames = volunteers.map((v) => v.username);

    const counts = await Patient.aggregate([
      {
        $match: {
          $or: [
            { author: { $in: volIds } },
            { author: { $in: volUsernames } },
          ],
        },
      },
      { $group: { _id: "$author", count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    counts.forEach((c) => {
      countMap[c._id] = c.count;
    });

    const enriched = volunteers.map((v) => ({
      ...v,
      patientCount: countMap[v.id] || countMap[v.username] || 0,
    }));

    res.status(200).json({
      success: true,
      data: enriched,
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
