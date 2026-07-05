import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { MEASUREMENT_EVIDENCE_TYPES, MEASUREMENT_ELEMENT_TYPES, MEASUREMENT_OPENING_STATUSES, MEASUREMENT_REQUEST_STATUSES, MEASUREMENT_VISIT_RESULTS, TECHNICAL_OBSERVATION_SEVERITIES, TECHNICAL_OBSERVATION_STATUSES, TECHNICAL_OBSERVATION_TYPES, } from "./measurements.constants.js";
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
const nullableNumberSchema = ({ integer = false, label, min, }) => z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        return trimmedValue.length === 0 ? null : Number(trimmedValue);
    }
    return value;
})
    .refine((value) => value === null || Number.isFinite(value), {
    message: `${label} debe ser un numero valido.`,
})
    .refine((value) => value === null || !integer || Number.isInteger(value), {
    message: `${label} debe ser un numero entero.`,
})
    .refine((value) => value === null || min === undefined || value >= min, {
    message: `${label} debe ser mayor o igual a ${min}.`,
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
    message: `${label} debe ser un numero valido.`,
})
    .refine((value) => value > 0, {
    message: `${label} debe ser mayor que cero.`,
});
const timeSchema = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => trimOrNull(value))
    .refine((value) => value === null || /^\d{2}:\d{2}$/.test(value), {
    message: "La hora debe usar el formato HH:mm.",
});
const requiredDateSchema = (message) => z
    .union([z.string(), z.date()])
    .transform((value) => {
    if (value instanceof Date) {
        return value;
    }
    const normalizedValue = value.trim();
    const parsedDate = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
        ? `${normalizedValue}T00:00:00.000Z`
        : normalizedValue);
    return parsedDate;
})
    .refine((value) => !Number.isNaN(value.getTime()), {
    message,
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
    message: `${label} debe ser una fecha valida.`,
});
const dateFilterSchema = z
    .union([z.string(), z.undefined()])
    .transform((value) => value?.trim() || undefined)
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Las fechas deben usar el formato YYYY-MM-DD.",
});
export const measurementRequestStatusSchema = z.enum(MEASUREMENT_REQUEST_STATUSES);
export const measurementOpeningStatusSchema = z.enum(MEASUREMENT_OPENING_STATUSES);
export const measurementElementTypeSchema = z.enum(MEASUREMENT_ELEMENT_TYPES);
export const measurementEvidenceTypeSchema = z.enum(MEASUREMENT_EVIDENCE_TYPES);
export const measurementVisitResultSchema = z.enum(MEASUREMENT_VISIT_RESULTS);
export const technicalObservationTypeSchema = z.enum(TECHNICAL_OBSERVATION_TYPES);
export const technicalObservationSeveritySchema = z.enum(TECHNICAL_OBSERVATION_SEVERITIES);
export const technicalObservationStatusSchema = z.enum(TECHNICAL_OBSERVATION_STATUSES);
export const measurementRequestIdParamSchema = z.object({
    id: z.uuid(),
});
export const measurementOpeningIdParamSchema = z.object({
    openingId: z.uuid(),
});
export const technicalObservationIdParamSchema = z.object({
    observationId: z.uuid(),
});
export const createMeasurementRequestSchema = z.object({
    addressId: nullableUuidSchema,
    assignedTechnicianId: nullableUuidSchema,
    clientId: z.uuid({
        message: "El cliente es obligatorio.",
    }),
    observations: nullableStringSchema(4000, "Las observaciones"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    projectId: nullableUuidSchema,
    requestedDate: requiredDateSchema("La fecha solicitada es obligatoria."),
    scheduledDate: nullableDateSchema("La fecha programada"),
    scheduledEndTime: timeSchema,
    scheduledStartTime: timeSchema,
});
export const updateMeasurementRequestSchema = z.object({
    addressId: nullableUuidSchema,
    assignedTechnicianId: nullableUuidSchema,
    clientId: z.uuid({
        message: "El cliente es obligatorio.",
    }),
    observations: nullableStringSchema(4000, "Las observaciones"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    projectId: nullableUuidSchema,
    requestedDate: requiredDateSchema("La fecha solicitada es obligatoria."),
    scheduledDate: nullableDateSchema("La fecha programada"),
    scheduledEndTime: timeSchema,
    scheduledStartTime: timeSchema,
});
export const scheduleMeasurementRequestSchema = z.object({
    assignedTechnicianId: nullableUuidSchema,
    notes: nullableStringSchema(4000, "Las notas de programacion"),
    scheduledDate: requiredDateSchema("La fecha programada es obligatoria."),
    scheduledEndTime: timeSchema,
    scheduledStartTime: timeSchema,
});
export const reprogramMeasurementRequestSchema = z.object({
    assignedTechnicianId: nullableUuidSchema,
    reason: z.string().trim().min(1, "El motivo de reprogramacion es obligatorio.").max(4000),
    scheduledDate: requiredDateSchema("La nueva fecha programada es obligatoria."),
    scheduledEndTime: timeSchema,
    scheduledStartTime: timeSchema,
});
export const cancelMeasurementRequestSchema = z.object({
    notes: nullableStringSchema(4000, "Las notas de cancelacion"),
});
export const startMeasurementVisitSchema = z.object({
    generalObservations: nullableStringSchema(4000, "Las observaciones generales"),
    locationConfirmed: z.boolean().default(true),
});
export const submitMeasurementApprovalSchema = z.object({
    notes: nullableStringSchema(4000, "Las notas de aprobacion"),
    result: measurementVisitResultSchema.default("READY_FOR_APPROVAL"),
});
export const measurementDecisionSchema = z.object({
    notes: nullableStringSchema(4000, "Las notas"),
});
export const createMeasurementOpeningSchema = z.object({
    code: nullableStringSchema(100, "El codigo de la abertura"),
    depthMm: nullableNumberSchema({
        label: "La profundidad",
        min: 0,
    }),
    elementType: measurementElementTypeSchema.default("OTHER"),
    environment: z.string().trim().min(1, "El ambiente es obligatorio.").max(191),
    heightMm: positiveNumberSchema("El alto"),
    observations: nullableStringSchema(4000, "Las observaciones"),
    quantity: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1.").default(1),
    requiresCorrection: z.boolean().default(false),
    status: measurementOpeningStatusSchema.default("REGISTERED"),
    widthMm: positiveNumberSchema("El ancho"),
});
export const updateMeasurementOpeningSchema = createMeasurementOpeningSchema;
export const createTechnicalObservationSchema = z.object({
    description: z.string().trim().min(1, "La descripcion es obligatoria.").max(4000),
    severity: technicalObservationSeveritySchema.default("MEDIUM"),
    status: technicalObservationStatusSchema.default("OPEN"),
    type: technicalObservationTypeSchema.default("OTHER"),
});
export const resolveTechnicalObservationSchema = z.object({
    notes: nullableStringSchema(4000, "Las notas"),
    status: z.enum(["IN_PROGRESS", "RESOLVED", "REJECTED"]).default("RESOLVED"),
});
export const measurementEvidenceMetadataSchema = z.object({
    description: nullableStringSchema(4000, "La descripcion"),
    measurementOpeningId: nullableUuidSchema,
    type: measurementEvidenceTypeSchema.default("PHOTO"),
    visitId: nullableUuidSchema,
});
export const listMeasurementRequestsQuerySchema = z.object({
    clientId: z.union([z.uuid(), z.undefined()]).optional(),
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 12, max: 100, min: 1 }),
    projectId: z.union([z.uuid(), z.undefined()]).optional(),
    search: z.string().trim().default(""),
    sortBy: z
        .enum(["createdAt", "priority", "requestedDate", "scheduledDate", "status"])
        .default("scheduledDate"),
    sortDirection: z.enum(["asc", "desc"]).default("asc"),
    status: measurementRequestStatusSchema.optional(),
    technicianId: z.union([z.uuid(), z.undefined()]).optional(),
});
export const measurementCalendarQuerySchema = z.object({
    clientId: z.union([z.uuid(), z.undefined()]).optional(),
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
    projectId: z.union([z.uuid(), z.undefined()]).optional(),
    status: measurementRequestStatusSchema.optional(),
    technicianId: z.union([z.uuid(), z.undefined()]).optional(),
    view: z.enum(["day", "week", "month"]).default("month"),
});
//# sourceMappingURL=measurements.validators.js.map