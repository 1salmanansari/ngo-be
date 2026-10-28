import { Request, Response, NextFunction } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedRequest extends Request {
  pagination?: PaginationParams;
}

export const extractPagination = (
  req: PaginatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  // Support both headers (as per specification) and query parameters
  const headerLimit = req.headers["limit"];
  const headerPage = req.headers["page"];

  const rawPage =
    headerPage !== undefined
      ? Number(headerPage)
      : req.query.page !== undefined
        ? Number(req.query.page)
        : 1;
  const rawLimit =
    headerLimit !== undefined
      ? Number(headerLimit)
      : req.query.limit !== undefined
        ? Number(req.query.limit)
        : 10;

  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.max(1, Math.min(100, isNaN(rawLimit) ? 10 : rawLimit));
  const skip = (page - 1) * limit;

  req.pagination = { page, limit, skip };
  next();
};
