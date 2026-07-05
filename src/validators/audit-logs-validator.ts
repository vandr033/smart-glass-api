import { z } from "zod";

import { integerQueryParamSchema } from "../utils/query-schemas.js";

export const listAuditLogsQuerySchema = z.object({
  action: z.string().trim().min(1).max(191).optional(),
  actorUserId: z.uuid().optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  entityType: z.string().trim().min(1).max(191).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
