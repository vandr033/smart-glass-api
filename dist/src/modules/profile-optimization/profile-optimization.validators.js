import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { PROFILE_CUTTING_BAR_SOURCE_TYPES, PROFILE_CUTTING_PLAN_STATUSES, PROFILE_OPTIMIZATION_MODES, PROFILE_OPTIMIZATION_RUN_STATUSES, PROFILE_REMNANT_OUTPUT_STATUSES, } from "./profile-optimization.constants.js";
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
export const profileOptimizationRunStatusSchema = z.enum(PROFILE_OPTIMIZATION_RUN_STATUSES);
export const profileOptimizationModeSchema = z.enum(PROFILE_OPTIMIZATION_MODES);
export const profileCuttingPlanStatusSchema = z.enum(PROFILE_CUTTING_PLAN_STATUSES);
export const profileCuttingBarSourceSchema = z.enum(PROFILE_CUTTING_BAR_SOURCE_TYPES);
export const profileRemnantOutputStatusSchema = z.enum(PROFILE_REMNANT_OUTPUT_STATUSES);
export const profileOptimizationRunIdParamSchema = z.object({
    id: z.uuid(),
});
export const profileCuttingPlanIdParamSchema = z.object({
    id: z.uuid(),
});
export const quotationIdParamSchema = z.object({
    id: z.uuid(),
});
export const profileCutInputSchema = z.object({
    label: z.string().trim().min(1, "Cut label is required.").max(191),
    lengthMm: positiveNumberSchema("Cut length"),
    materialId: z.uuid({
        message: "Material is required.",
    }),
    metadata: nullableJsonObjectSchema,
    quotationItemId: nullableUuidSchema,
    quantity: positiveIntegerSchema("Cut quantity"),
});
export const listProfileOptimizationsQuerySchema = z.object({
    materialId: optionalUuidSchema,
    mode: profileOptimizationModeSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    projectId: optionalUuidSchema,
    quotationId: optionalUuidSchema,
    search: z.string().trim().default(""),
    sortBy: z.enum(["createdAt", "updatedAt", "wastePercent"]).default("updatedAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: profileOptimizationRunStatusSchema.optional(),
});
export const runProfileOptimizationSchema = z.object({
    materialId: nullableUuidSchema,
    mode: profileOptimizationModeSchema,
    cuts: z.array(profileCutInputSchema).min(1, "At least one cut is required."),
    preferRemnants: z.boolean().optional(),
    projectId: nullableUuidSchema,
    quotationId: nullableUuidSchema,
});
export const quotationProfileOptimizationSchema = z.object({
    mode: profileOptimizationModeSchema.default("COMMERCIAL_ESTIMATION"),
    preferRemnants: z.boolean().optional(),
});
export const listProfileCuttingPlansQuerySchema = z.object({
    materialId: optionalUuidSchema,
    optimizationRunId: optionalUuidSchema,
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    search: z.string().trim().default(""),
    sortBy: z.enum(["createdAt", "updatedAt", "wastePercent"]).default("updatedAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: profileCuttingPlanStatusSchema.optional(),
});
export const profilePlanActionNotesSchema = z.object({
    notes: nullableStringSchema(4000, "Notes").optional(),
});
//# sourceMappingURL=profile-optimization.validators.js.map