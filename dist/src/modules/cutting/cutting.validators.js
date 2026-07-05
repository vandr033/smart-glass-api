import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { CUTTING_OPTIMIZATION_MODES, CUTTING_OPTIMIZATION_RUN_STATUSES, CUTTING_PLAN_REMNANT_OUTPUT_STATUSES, CUTTING_PLAN_SHEET_SOURCES, CUTTING_PLAN_STATUSES } from "./cutting.constants.js";
const trimOrNull = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};
const nullableStringSchema = (maxLength, label) => z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => trimOrNull(value))
    .refine((value) => value === null || value.length <= maxLength, {
    message: `${label} must be ${maxLength} characters or fewer.`,
});
const nullableUuidSchema = z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => value ?? null);
const optionalUuidSchema = z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => value ?? undefined);
const positiveNumberSchema = (label) => z.coerce.number().refine((value) => Number.isFinite(value), {
    message: `${label} must be a valid number.`,
}).refine((value) => value > 0, {
    message: `${label} must be greater than zero.`,
});
const positiveIntegerSchema = (label) => z.coerce.number().int({
    message: `${label} must be a whole number.`,
}).min(1, {
    message: `${label} must be at least 1.`,
});
const jsonLikeSchema = z.lazy(() => z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonLikeSchema),
    z.record(z.string(), jsonLikeSchema),
]));
const nullableJsonObjectSchema = z
    .union([z.record(z.string(), jsonLikeSchema), z.null(), z.undefined()])
    .transform((value) => value ?? null);
export const cuttingOptimizationRunStatusSchema = z.enum(CUTTING_OPTIMIZATION_RUN_STATUSES);
export const cuttingOptimizationModeSchema = z.enum(CUTTING_OPTIMIZATION_MODES);
export const cuttingPlanStatusSchema = z.enum(CUTTING_PLAN_STATUSES);
export const cuttingPlanSheetSourceSchema = z.enum(CUTTING_PLAN_SHEET_SOURCES);
export const cuttingPlanRemnantOutputStatusSchema = z.enum(CUTTING_PLAN_REMNANT_OUTPUT_STATUSES);
export const cuttingOptimizationRunIdParamSchema = z.object({
    id: z.uuid(),
});
export const cuttingPlanIdParamSchema = z.object({
    id: z.uuid(),
});
export const quotationIdParamSchema = z.object({
    id: z.uuid(),
});
export const cuttingPieceInputSchema = z.object({
    allowRotation: z.boolean().optional(),
    heightMm: positiveNumberSchema("Piece height"),
    label: z.string().trim().min(1, "Piece label is required.").max(191),
    materialId: z.uuid({
        message: "Material is required.",
    }),
    metadata: nullableJsonObjectSchema,
    quotationItemId: nullableUuidSchema,
    quantity: positiveIntegerSchema("Piece quantity"),
    thicknessMm: z.coerce.number().nullable().optional().transform((value) => {
        if (value === null || value === undefined) {
            return null;
        }
        return Number.isFinite(value) ? value : null;
    }),
    widthMm: positiveNumberSchema("Piece width"),
});
export const listCuttingOptimizationsQuerySchema = z.object({
    materialId: optionalUuidSchema,
    mode: cuttingOptimizationModeSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    projectId: optionalUuidSchema,
    quotationId: optionalUuidSchema,
    search: z.string().trim().default(""),
    sortBy: z.enum(["createdAt", "updatedAt", "wastePercent"]).default("updatedAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: cuttingOptimizationRunStatusSchema.optional(),
    warehouseId: optionalUuidSchema,
});
export const runGlassOptimizationSchema = z.object({
    allowRotation: z.boolean().optional(),
    materialId: nullableUuidSchema,
    mode: cuttingOptimizationModeSchema,
    pieces: z.array(cuttingPieceInputSchema).min(1, "At least one piece is required."),
    preferRemnants: z.boolean().optional(),
    projectId: nullableUuidSchema,
    quotationId: nullableUuidSchema,
    warehouseId: nullableUuidSchema,
});
export const quotationGlassOptimizationSchema = z.object({
    allowRotation: z.boolean().optional(),
    materialId: nullableUuidSchema,
    mode: cuttingOptimizationModeSchema.default("COMMERCIAL_ESTIMATION"),
    preferRemnants: z.boolean().optional(),
    warehouseId: nullableUuidSchema,
});
export const listCuttingPlansQuerySchema = z.object({
    materialId: optionalUuidSchema,
    optimizationRunId: optionalUuidSchema,
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    search: z.string().trim().default(""),
    sortBy: z.enum(["createdAt", "updatedAt", "wastePercent"]).default("updatedAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: cuttingPlanStatusSchema.optional(),
    warehouseId: optionalUuidSchema,
});
export const approveCuttingPlanSchema = z.object({
    notes: nullableStringSchema(4000, "Approval notes").optional(),
});
//# sourceMappingURL=cutting.validators.js.map