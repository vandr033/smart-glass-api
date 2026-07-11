import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { QUOTATION_APPROVAL_STATUSES, QUOTATION_APPROVAL_TYPES, QUOTATION_ITEM_MATERIAL_RULE_TYPES, QUOTATION_ITEM_MATERIAL_SOURCES, QUOTATION_ITEM_TYPES, QUOTATION_STATUSES, QUOTATION_VERSION_STATUSES, } from "./quotations.constants.js";
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
const nullableNumberSchema = ({ integer = false, label, max, min, }) => z
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
    .refine((value) => value === null || !integer || Number.isInteger(value), {
    message: `${label} must be a whole number.`,
})
    .refine((value) => value === null || min === undefined || value >= min, {
    message: `${label} must be at least ${min}.`,
})
    .refine((value) => value === null || max === undefined || value <= max, {
    message: `${label} must be at most ${max}.`,
});
const positiveNumberSchema = (label) => z
    .union([z.number(), z.string()])
    .transform((value) => {
    if (typeof value === "string") {
        return Number(value.trim());
    }
    return value;
})
    .refine((value) => Number.isFinite(value), {
    message: `${label} must be a valid number.`,
})
    .refine((value) => value > 0, {
    message: `${label} must be greater than zero.`,
});
const dateFilterSchema = z
    .union([z.string(), z.undefined()])
    .transform((value) => value?.trim() || undefined)
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Dates must use YYYY-MM-DD format.",
});
const nullableDateSchema = (label) => z
    .union([z.string(), z.date(), z.null(), z.undefined()])
    .transform((value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
        return null;
    }
    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
        ? `${trimmedValue}T00:00:00.000Z`
        : trimmedValue;
    const parsedDate = new Date(normalizedValue);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
})
    .refine((value) => value === null || value instanceof Date, {
    message: `${label} must be a valid date.`,
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
const nullableUuidSchema = z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => value ?? null);
export const quotationStatusSchema = z.enum(QUOTATION_STATUSES);
export const quotationVersionStatusSchema = z.enum(QUOTATION_VERSION_STATUSES);
export const quotationItemTypeSchema = z.enum(QUOTATION_ITEM_TYPES);
export const quotationItemMaterialRuleTypeSchema = z.enum(QUOTATION_ITEM_MATERIAL_RULE_TYPES);
export const quotationItemMaterialSourceSchema = z.enum(QUOTATION_ITEM_MATERIAL_SOURCES);
export const quotationApprovalTypeSchema = z.enum(QUOTATION_APPROVAL_TYPES);
export const quotationApprovalStatusSchema = z.enum(QUOTATION_APPROVAL_STATUSES);
export const quotationIdParamSchema = z.object({
    id: z.uuid(),
});
export const quotationItemIdParamSchema = z.object({
    itemId: z.uuid(),
});
export const quotationMutationSchema = z.object({
    clientId: z.uuid({
        message: "El cliente es obligatorio.",
    }),
    currency: z.string().trim().min(1, "La moneda es obligatoria.").max(16).default("BOB"),
    discountAmount: nullableNumberSchema({
        label: "Monto de descuento",
        min: 0,
    }).transform((value) => value ?? 0),
    exchangeRate: nullableNumberSchema({
        label: "Tipo de cambio",
        min: 0,
    }),
    internalNotes: nullableStringSchema(4000, "Notas internas"),
    notes: nullableStringSchema(4000, "Notas"),
    projectId: nullableUuidSchema,
    taxAmount: nullableNumberSchema({
        label: "Monto de impuesto",
        min: 0,
    }).transform((value) => value ?? 0),
    validUntil: nullableDateSchema("Fecha de vigencia"),
});
export const listQuotationsQuerySchema = z.object({
    clientId: z.union([z.uuid(), z.undefined()]).optional(),
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    projectId: z.union([z.uuid(), z.undefined()]).optional(),
    search: z.string().trim().default(""),
    sortBy: z.enum(["createdAt", "totalSale", "updatedAt", "validUntil"]).default("updatedAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: quotationStatusSchema.optional(),
});
export const addTemplateQuotationItemSchema = z.object({
    inputValues: z.record(z.string(), jsonLikeSchema).default({}),
    name: z.string().trim().min(1, "El nombre del ítem es obligatorio.").max(191),
    productTemplateVersionId: z.uuid({
        message: "La versión de la plantilla es obligatoria.",
    }),
    quantity: positiveNumberSchema("Cantidad"),
});
const salePricingSchema = z
    .object({
    marginPercent: nullableNumberSchema({
        label: "Porcentaje de margen",
        max: 99.99,
        min: 0,
    }),
    unitSalePrice: nullableNumberSchema({
        label: "Precio unitario de venta",
        min: 0,
    }),
})
    .superRefine((value, context) => {
    if (value.marginPercent === null && value.unitSalePrice === null) {
        context.addIssue({
            code: "custom",
            message: "Proporciona un precio unitario de venta o un porcentaje de margen.",
            path: ["unitSalePrice"],
        });
    }
});
export const addManualMaterialItemSchema = z
    .object({
    description: nullableStringSchema(4000, "Descripción"),
    marginPercent: salePricingSchema.shape.marginPercent,
    materialId: z.uuid({
        message: "El material es obligatorio.",
    }),
    name: nullableStringSchema(191, "Nombre del ítem"),
    quantity: positiveNumberSchema("Cantidad"),
    supplierId: nullableUuidSchema,
    unit: z.string().trim().min(1, "La unidad es obligatoria.").max(50),
    unitCost: positiveNumberSchema("Costo unitario"),
    unitSalePrice: salePricingSchema.shape.unitSalePrice,
})
    .superRefine((value, context) => {
    if (value.marginPercent === null && value.unitSalePrice === null) {
        context.addIssue({
            code: "custom",
            message: "Proporciona un precio unitario de venta o un porcentaje de margen.",
            path: ["unitSalePrice"],
        });
    }
});
export const addManualServiceItemSchema = z
    .object({
    description: nullableStringSchema(4000, "Descripción"),
    marginPercent: salePricingSchema.shape.marginPercent,
    name: z.string().trim().min(1, "El nombre del servicio es obligatorio.").max(191),
    quantity: positiveNumberSchema("Cantidad"),
    unit: z.string().trim().min(1, "La unidad es obligatoria.").max(50).default("service"),
    unitCost: positiveNumberSchema("Costo unitario"),
    unitSalePrice: salePricingSchema.shape.unitSalePrice,
})
    .superRefine((value, context) => {
    if (value.marginPercent === null && value.unitSalePrice === null) {
        context.addIssue({
            code: "custom",
            message: "Proporciona un precio unitario de venta o un porcentaje de margen.",
            path: ["unitSalePrice"],
        });
    }
});
export const updateQuotationItemSchema = z
    .object({
    clearManualOverride: z.boolean().optional(),
    description: nullableStringSchema(4000, "Descripción").optional(),
    inputValues: nullableJsonObjectSchema.optional(),
    marginPercent: nullableNumberSchema({
        label: "Porcentaje de margen",
        max: 99.99,
        min: 0,
    }).optional(),
    materialId: nullableUuidSchema.optional(),
    name: nullableStringSchema(191, "Item name").optional(),
    quantity: positiveNumberSchema("Cantidad").optional(),
    sortOrder: nullableNumberSchema({
        integer: true,
        label: "Orden de clasificación",
        min: 0,
    }).optional(),
    supplierId: nullableUuidSchema.optional(),
    unit: nullableStringSchema(50, "Unidad").optional(),
    unitCost: nullableNumberSchema({
        label: "Costo unitario",
        min: 0,
    }).optional(),
    unitSalePrice: nullableNumberSchema({
        label: "Precio unitario de venta",
        min: 0,
    }).optional(),
})
    .superRefine((value, context) => {
    const hasPricingOverride = value.marginPercent !== undefined ||
        value.unitCost !== undefined ||
        value.unitSalePrice !== undefined;
    if (hasPricingOverride &&
        value.clearManualOverride) {
        context.addIssue({
            code: "custom",
            message: "Choose either updated pricing values or clearManualOverride, not both.",
            path: ["clearManualOverride"],
        });
    }
});
export const quotationDecisionSchema = z.object({
    decisionNotes: nullableStringSchema(4000, "Decision notes"),
});
export const submitQuotationApprovalSchema = z.object({
    forceManualReview: z.boolean().default(false),
    reason: nullableStringSchema(4000, "Reason"),
});
export const changeQuotationStatusSchema = z.object({
    notes: nullableStringSchema(4000, "Notes"),
    toStatus: quotationStatusSchema,
});
//# sourceMappingURL=quotations.validators.js.map