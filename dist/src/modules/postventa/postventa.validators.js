import { z } from "zod";
import { MATERIAL_UNITS } from "../materials/materials.behavior.js";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { POSTVENTA_ACTIVITY_STATUSES, POSTVENTA_ACTIVITY_TYPES, POSTVENTA_CASE_STATUSES, POSTVENTA_CASE_TYPES, POSTVENTA_COST_CATEGORIES, POSTVENTA_COST_ORIGINS, POSTVENTA_EVIDENCE_TYPES, POSTVENTA_PRIORITIES, PRODUCT_WARRANTY_STATUSES, } from "./postventa.constants.js";
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
    message: `${label} debe tener ${maxLength} caracteres o menos.`,
});
const nullableUuidSchema = z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => value ?? null);
const parseDateValue = (value) => {
    if (value instanceof Date) {
        return value;
    }
    const trimmedValue = value.trim();
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
        ? `${trimmedValue}T00:00:00.000Z`
        : trimmedValue);
};
const requiredDateSchema = (message) => z
    .union([z.string(), z.date()])
    .transform((value) => parseDateValue(value))
    .refine((value) => !Number.isNaN(value.getTime()), {
    message,
});
const nullableDateSchema = (message) => z
    .union([z.string(), z.date(), z.null(), z.undefined()])
    .transform((value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "string" && value.trim().length === 0) {
        return null;
    }
    return parseDateValue(value);
})
    .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message,
});
const dateFilterSchema = z
    .union([z.string(), z.undefined()])
    .transform((value) => value?.trim() || undefined)
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Las fechas deben usar el formato YYYY-MM-DD.",
});
const booleanQuerySchema = z
    .union([z.string(), z.boolean(), z.undefined()])
    .transform((value) => {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value !== "string") {
        return undefined;
    }
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true") {
        return true;
    }
    if (normalizedValue === "false") {
        return false;
    }
    return undefined;
});
const amountSchema = z.coerce.number().positive("El monto debe ser mayor a cero.");
export const postventaCaseTypeSchema = z.enum(POSTVENTA_CASE_TYPES);
export const postventaCaseStatusSchema = z.enum(POSTVENTA_CASE_STATUSES);
export const postventaCaseStatusChangeSchema = z.enum(POSTVENTA_CASE_STATUSES.filter((status) => status !== "CERRADO"));
export const postventaPrioritySchema = z.enum(POSTVENTA_PRIORITIES);
export const productWarrantyStatusSchema = z.enum(PRODUCT_WARRANTY_STATUSES);
export const postventaActivityTypeSchema = z.enum(POSTVENTA_ACTIVITY_TYPES);
export const postventaActivityStatusSchema = z.enum(POSTVENTA_ACTIVITY_STATUSES);
export const postventaEvidenceTypeSchema = z.enum(POSTVENTA_EVIDENCE_TYPES);
export const postventaCostCategorySchema = z.enum(POSTVENTA_COST_CATEGORIES);
export const postventaCostOriginSchema = z.enum(POSTVENTA_COST_ORIGINS);
export const inventoryReservationTypeSchema = z.enum(["SOFT", "FIRM"]);
export const materialUnitSchema = z.enum(MATERIAL_UNITS);
export const postventaCaseIdParamSchema = z.object({
    id: z.uuid(),
});
export const postventaActivityIdParamSchema = z.object({
    activityId: z.uuid(),
});
export const productWarrantyIdParamSchema = z.object({
    warrantyId: z.uuid(),
});
export const postventaReservationLinkIdParamSchema = z.object({
    reservationLinkId: z.uuid(),
});
export const clientIdParamSchema = z.object({
    clientId: z.uuid(),
});
export const projectIdParamSchema = z.object({
    projectId: z.uuid(),
});
export const installationIdParamSchema = z.object({
    installationId: z.uuid(),
});
export const createPostventaCaseSchema = z.object({
    clientId: nullableUuidSchema,
    commitmentDate: nullableDateSchema("La fecha compromiso no es valida."),
    description: z
        .string()
        .trim()
        .min(1, "La descripcion del problema es obligatoria.")
        .max(4000),
    installationId: nullableUuidSchema,
    internalNotes: nullableStringSchema(4000, "Las notas internas"),
    outsideWarranty: z.boolean().default(false),
    priority: postventaPrioritySchema.default("MEDIA"),
    projectId: nullableUuidSchema,
    proposedSolution: nullableStringSchema(4000, "La solucion propuesta"),
    quotationId: nullableUuidSchema,
    reportedAt: requiredDateSchema("La fecha de reporte es obligatoria."),
    responsibleId: nullableUuidSchema,
    type: postventaCaseTypeSchema.default("RECLAMO"),
    warrantyId: nullableUuidSchema,
});
export const updatePostventaCaseSchema = z.object({
    commitmentDate: nullableDateSchema("La fecha compromiso no es valida.").optional(),
    description: z
        .union([z.string(), z.undefined()])
        .transform((value) => value?.trim())
        .refine((value) => value === undefined || value.length > 0, {
        message: "La descripcion del problema no puede quedar vacia.",
    })
        .refine((value) => value === undefined || value.length <= 4000, {
        message: "La descripcion del problema debe tener 4000 caracteres o menos.",
    }),
    internalNotes: nullableStringSchema(4000, "Las notas internas").optional(),
    outsideWarranty: z.boolean().optional(),
    priority: postventaPrioritySchema.optional(),
    proposedSolution: nullableStringSchema(4000, "La solucion propuesta").optional(),
    type: postventaCaseTypeSchema.optional(),
    warrantyId: nullableUuidSchema.optional(),
});
export const assignPostventaCaseSchema = z.object({
    responsibleId: nullableUuidSchema,
});
export const changePostventaCaseStatusSchema = z.object({
    notes: nullableStringSchema(4000, "Las notas"),
    status: postventaCaseStatusChangeSchema,
});
export const closePostventaCaseSchema = z.object({
    notes: nullableStringSchema(4000, "Las notas de cierre"),
    proposedSolution: nullableStringSchema(4000, "La solucion propuesta"),
});
export const listPostventaCasesQuerySchema = z.object({
    clientId: z.union([z.uuid(), z.undefined()]).optional(),
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 20, min: 1, max: 100 }),
    priority: postventaPrioritySchema.optional(),
    projectId: z.union([z.uuid(), z.undefined()]).optional(),
    responsibleId: z.union([z.uuid(), z.undefined()]).optional(),
    search: z.string().trim().default(""),
    sortBy: z
        .enum(["commitmentDate", "priority", "reportedAt", "status", "updatedAt"])
        .default("reportedAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: postventaCaseStatusSchema.optional(),
});
export const createProductWarrantySchema = z
    .object({
    clientId: nullableUuidSchema,
    conditions: nullableStringSchema(4000, "Las condiciones"),
    endDate: requiredDateSchema("La fecha fin de la garantia es obligatoria."),
    productType: z
        .string()
        .trim()
        .min(1, "El tipo de producto es obligatorio.")
        .max(100),
    projectId: z.uuid(),
    startDate: requiredDateSchema("La fecha inicio de la garantia es obligatoria."),
    status: productWarrantyStatusSchema.default("VIGENTE"),
})
    .refine((value) => value.endDate >= value.startDate, {
    message: "La fecha fin no puede ser anterior a la fecha inicio.",
    path: ["endDate"],
});
export const updateProductWarrantySchema = z
    .object({
    clientId: nullableUuidSchema.optional(),
    conditions: nullableStringSchema(4000, "Las condiciones").optional(),
    endDate: requiredDateSchema("La fecha fin de la garantia es obligatoria.").optional(),
    productType: z.string().trim().min(1).max(100).optional(),
    projectId: z.uuid().optional(),
    startDate: requiredDateSchema("La fecha inicio de la garantia es obligatoria.").optional(),
    status: productWarrantyStatusSchema.optional(),
})
    .refine((value) => !value.startDate ||
    !value.endDate ||
    value.endDate >= value.startDate, {
    message: "La fecha fin no puede ser anterior a la fecha inicio.",
    path: ["endDate"],
});
export const listProductWarrantiesQuerySchema = z.object({
    clientId: z.union([z.uuid(), z.undefined()]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 20, min: 1, max: 100 }),
    projectId: z.union([z.uuid(), z.undefined()]).optional(),
    search: z.string().trim().default(""),
    sortBy: z.enum(["endDate", "startDate", "status", "updatedAt"]).default("endDate"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: productWarrantyStatusSchema.optional(),
    vigente: booleanQuerySchema,
});
export const createPostventaActivitySchema = z.object({
    description: z
        .string()
        .trim()
        .min(1, "La descripcion de la actividad es obligatoria.")
        .max(4000),
    executedAt: nullableDateSchema("La fecha de ejecucion no es valida."),
    responsibleId: nullableUuidSchema,
    scheduledAt: nullableDateSchema("La fecha programada no es valida."),
    status: postventaActivityStatusSchema.optional(),
    type: postventaActivityTypeSchema,
});
export const updatePostventaActivitySchema = z.object({
    description: z
        .union([z.string(), z.undefined()])
        .transform((value) => value?.trim())
        .refine((value) => value === undefined || value.length > 0, {
        message: "La descripcion de la actividad no puede quedar vacia.",
    })
        .refine((value) => value === undefined || value.length <= 4000, {
        message: "La descripcion de la actividad debe tener 4000 caracteres o menos.",
    }),
    executedAt: nullableDateSchema("La fecha de ejecucion no es valida.").optional(),
    responsibleId: nullableUuidSchema.optional(),
    scheduledAt: nullableDateSchema("La fecha programada no es valida.").optional(),
    status: postventaActivityStatusSchema.optional(),
    type: postventaActivityTypeSchema.optional(),
});
export const postventaEvidenceMetadataSchema = z.object({
    activityId: nullableUuidSchema,
    description: nullableStringSchema(4000, "La descripcion"),
    mimetype: nullableStringSchema(191, "El tipo de archivo"),
    originalName: z
        .string()
        .trim()
        .min(1, "El archivo es obligatorio.")
        .max(255),
    size: z.coerce.number().int().min(1, "El archivo es obligatorio."),
    type: postventaEvidenceTypeSchema.default("FOTO"),
});
export const createPostventaCostSchema = z.object({
    amount: amountSchema,
    category: postventaCostCategorySchema,
    costDate: requiredDateSchema("La fecha del costo es obligatoria."),
    description: z
        .string()
        .trim()
        .min(1, "La descripcion del costo es obligatoria.")
        .max(4000),
    origin: postventaCostOriginSchema.default("MANUAL"),
    referenceId: nullableStringSchema(191, "La referencia"),
});
export const createPostventaReservationSchema = z.object({
    expiresAt: nullableDateSchema("La fecha de vencimiento no es valida."),
    inventoryStockId: nullableUuidSchema,
    materialId: z.uuid(),
    notes: nullableStringSchema(4000, "Las notas"),
    quantity: z.coerce.number().positive("La cantidad debe ser mayor a cero."),
    reservationType: inventoryReservationTypeSchema.default("FIRM"),
    unit: materialUnitSchema,
    warehouseId: z.uuid(),
});
export const consumePostventaReservationSchema = z.object({
    amount: amountSchema,
    category: postventaCostCategorySchema.default("REPOSICION"),
    costDate: requiredDateSchema("La fecha del consumo es obligatoria."),
    description: z
        .string()
        .trim()
        .min(1, "La descripcion del consumo es obligatoria.")
        .max(4000),
});
//# sourceMappingURL=postventa.validators.js.map