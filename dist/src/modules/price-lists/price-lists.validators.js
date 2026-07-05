import { z } from "zod";
import { PRICE_LIST_IMPORT_STATUSES, PRICE_LIST_ROW_MAPPING_STATUSES, PRICE_LIST_ROW_VALIDATION_STATUSES, } from "./price-lists.constants.js";
import { SUPPLIER_MATERIAL_EQUIVALENCE_CONFIDENCE_LEVELS } from "../materials/materials.behavior.js";
import { integerQueryParamSchema } from "@/utils/query-schemas.js";
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
const optionalBooleanSchema = z
    .union([z.boolean(), z.enum(["true", "false"]), z.undefined()])
    .transform((value) => {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value === "boolean") {
        return value;
    }
    return value === "true";
});
const nullablePositiveNumberSchema = (label) => z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) {
            return null;
        }
        return Number(trimmedValue);
    }
    return value;
})
    .refine((value) => value === null || Number.isFinite(value), {
    message: `${label} must be a valid number.`,
})
    .refine((value) => value === null || value > 0, {
    message: `${label} must be greater than zero.`,
});
const dateFilterSchema = z
    .union([z.string(), z.undefined()])
    .transform((value) => value?.trim() || undefined)
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Dates must use YYYY-MM-DD format.",
});
export const priceListImportStatusSchema = z.enum(PRICE_LIST_IMPORT_STATUSES);
export const priceListRowMappingStatusSchema = z.enum(PRICE_LIST_ROW_MAPPING_STATUSES);
export const priceListRowValidationStatusSchema = z.enum(PRICE_LIST_ROW_VALIDATION_STATUSES);
export const priceListImportIdParamSchema = z.object({
    id: z.uuid(),
});
export const priceListImportRowParamsSchema = z.object({
    id: z.uuid(),
    rowId: z.uuid(),
});
export const materialIdParamSchema = z.object({
    id: z.uuid(),
});
export const supplierIdParamSchema = z.object({
    id: z.uuid(),
});
export const priceListFileUploadSchema = z.object({
    mimetype: z
        .union([z.string(), z.null(), z.undefined()])
        .transform((value) => trimOrNull(value))
        .refine((value) => value === null || value.length <= 191, {
        message: "MIME type must be 191 characters or fewer.",
    }),
    originalName: z
        .string()
        .trim()
        .min(1, "A file name is required.")
        .max(255, "File name must be 255 characters or fewer."),
    size: z.coerce.number().int().positive().max(25 * 1024 * 1024),
});
export const importPriceListSchema = z.object({
    currency: z
        .union([z.string(), z.undefined()])
        .transform((value) => value?.trim().toUpperCase() || "BOB")
        .refine((value) => value.length > 0 && value.length <= 16, {
        message: "Currency must be between 1 and 16 characters.",
    }),
    supplierId: z.uuid({
        message: "Supplier is required.",
    }),
});
export const listPriceListImportsQuerySchema = z.object({
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    search: z.string().trim().default(""),
    sortBy: z.enum(["approvedAt", "createdAt", "fileName", "status"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: priceListImportStatusSchema.optional(),
    supplierId: z.union([z.uuid(), z.undefined()]).optional(),
});
export const listPriceListImportRowsQuerySchema = z.object({
    attentionOnly: optionalBooleanSchema.default(false),
    mappingStatus: priceListRowMappingStatusSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 25, min: 1, max: 200 }),
    search: z.string().trim().default(""),
    sortBy: z
        .enum(["mappingStatus", "price", "rowNumber", "supplierName", "validationStatus"])
        .default("rowNumber"),
    sortDirection: z.enum(["asc", "desc"]).default("asc"),
    validationStatus: priceListRowValidationStatusSchema.optional(),
});
export const mapPriceListImportRowSchema = z.object({
    confidence: z
        .union([
        z.enum(SUPPLIER_MATERIAL_EQUIVALENCE_CONFIDENCE_LEVELS),
        z.undefined(),
    ])
        .default("VERIFIED"),
    conversionFactor: nullablePositiveNumberSchema("Conversion factor"),
    createOrUpdateEquivalence: optionalBooleanSchema.default(true),
    materialId: z.uuid({
        message: "Material is required.",
    }),
    notes: nullableStringSchema(4000, "Notes"),
});
export const listPriceHistoryQuerySchema = z.object({
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
    materialId: z.union([z.uuid(), z.undefined()]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 20, min: 1, max: 100 }),
    supplierId: z.union([z.uuid(), z.undefined()]).optional(),
});
//# sourceMappingURL=price-lists.validators.js.map