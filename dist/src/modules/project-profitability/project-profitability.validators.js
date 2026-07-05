import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { PROJECT_PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from "../projects/projects.constants.js";
const dateFilterSchema = z
    .union([z.string(), z.undefined()])
    .transform((value) => value?.trim() || undefined)
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Dates must use YYYY-MM-DD format.",
});
export const projectProfitabilityProjectIdParamSchema = z.object({
    id: z.uuid(),
});
export const projectProfitabilitySortBySchema = z.enum([
    "calculadoEn",
    "diferenciaContraPresupuesto",
    "ingresoReal",
    "margenBruto",
    "utilidadBruta",
]);
export const listProjectProfitabilityDashboardQuerySchema = z.object({
    clientId: z.union([z.uuid(), z.undefined()]).optional(),
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
    priority: z.enum(PROJECT_PRIORITIES).optional(),
    projectType: z.enum(PROJECT_TYPES).optional(),
    salesUserId: z.union([z.uuid(), z.undefined()]).optional(),
    search: z.string().trim().default(""),
    status: z.enum(PROJECT_STATUSES).optional(),
});
export const listProjectProfitabilityQuerySchema = listProjectProfitabilityDashboardQuerySchema.extend({
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    sortBy: projectProfitabilitySortBySchema.default("calculadoEn"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
//# sourceMappingURL=project-profitability.validators.js.map