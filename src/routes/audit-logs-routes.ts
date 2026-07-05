import { Router } from "express";

import { asyncHandler } from "../middleware/async-handler.js";
import { requirePermission } from "../middleware/authorization-middleware.js";
import { auditLogService } from "../services/audit-log-service.js";
import { sendPaginated } from "../utils/response.js";
import { listAuditLogsQuerySchema } from "../validators/audit-logs-validator.js";

const getQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return undefined;
};

export const auditLogsRouter = Router();

auditLogsRouter.get(
  "/audit-logs",
  requirePermission("system.audit.read"),
  asyncHandler(async (request, response) => {
    const query = listAuditLogsQuerySchema.parse({
      action: getQueryValue(request.query["filter.action"]),
      actorUserId: getQueryValue(request.query["filter.actorUserId"]),
      dateFrom: getQueryValue(request.query["filter.dateFrom"]),
      dateTo: getQueryValue(request.query["filter.dateTo"]),
      entityType: getQueryValue(request.query["filter.entityType"]),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      search: getQueryValue(request.query.search),
    });

    const result = await auditLogService.listAuditLogs(query);
    sendPaginated(response, result.data, result.pagination);
  }),
);
