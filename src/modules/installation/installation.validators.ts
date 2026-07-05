import { z } from "zod";

import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import {
  INSTALLATION_DEFAULT_TYPE,
  INSTALLATION_EVIDENCE_TYPES,
  INSTALLATION_ISSUE_SEVERITIES,
  INSTALLATION_ISSUE_STATUSES,
  INSTALLATION_ISSUE_TYPES,
  INSTALLATION_ORDER_STATUSES,
  INSTALLATION_PRIORITIES,
  INSTALLATION_TASK_STATUSES,
  INSTALLATION_TEAM_STATUSES,
} from "./installation.constants.js";

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const nullableStringSchema = (maxLength: number, label: string) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => trimOrNull(value))
    .refine((value) => value === null || value.length <= maxLength, {
      message: `${label} debe tener ${maxLength} caracteres o menos.`,
    });

const nullableUuidSchema = z
  .union([z.uuid(), z.null(), z.undefined()])
  .transform((value) => value ?? null);

const nullableIntegerSchema = (label: string) =>
  z
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
    .refine((value) => value === null || Number.isInteger(value), {
      message: `${label} debe ser un numero entero.`,
    })
    .refine((value) => value === null || value >= 0, {
      message: `${label} no puede ser negativo.`,
    });

const timeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => trimOrNull(value))
  .refine((value) => value === null || /^\d{2}:\d{2}$/.test(value), {
    message: "La hora debe usar el formato HH:mm.",
  });

const requiredDateSchema = z
  .union([z.string(), z.date()])
  .transform((value) => {
    if (value instanceof Date) {
      return value;
    }

    const normalizedValue = value.trim();
    const parsedDate = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
        ? `${normalizedValue}T00:00:00.000Z`
        : normalizedValue,
    );

    return parsedDate;
  })
  .refine((value) => !Number.isNaN(value.getTime()), {
    message: "La fecha programada es obligatoria.",
  });

const dateFilterSchema = z
  .union([z.string(), z.undefined()])
  .transform((value) => value?.trim() || undefined)
  .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Las fechas deben usar el formato YYYY-MM-DD.",
  });

export const installationPrioritySchema = z.enum(INSTALLATION_PRIORITIES);
export const installationOrderStatusSchema = z.enum(INSTALLATION_ORDER_STATUSES);
export const installationTeamStatusSchema = z.enum(INSTALLATION_TEAM_STATUSES);
export const installationTaskStatusSchema = z.enum(INSTALLATION_TASK_STATUSES);
export const installationEvidenceTypeSchema = z.enum(INSTALLATION_EVIDENCE_TYPES);
export const installationIssueTypeSchema = z.enum(INSTALLATION_ISSUE_TYPES);
export const installationIssueSeveritySchema = z.enum(INSTALLATION_ISSUE_SEVERITIES);
export const installationIssueStatusSchema = z.enum(INSTALLATION_ISSUE_STATUSES);

export const installationOrderIdParamSchema = z.object({
  id: z.uuid(),
});

export const installationTeamIdParamSchema = z.object({
  teamId: z.uuid(),
});

export const installationTaskIdParamSchema = z.object({
  taskId: z.uuid(),
});

export const installationIssueIdParamSchema = z.object({
  issueId: z.uuid(),
});

export const projectIdParamSchema = z.object({
  projectId: z.uuid(),
});

export const quotationIdParamSchema = z.object({
  quotationId: z.uuid(),
});

export const installationTaskInputSchema = z.object({
  description: nullableStringSchema(4000, "La descripcion de la tarea"),
  estimatedMinutes: nullableIntegerSchema("Los minutos estimados"),
  status: installationTaskStatusSchema.default("PENDING"),
  title: z.string().trim().min(1, "El titulo de la tarea es obligatorio.").max(191),
});

export const createInstallationOrderSchema = z.object({
  addressId: nullableUuidSchema,
  assignedSupervisorId: nullableUuidSchema,
  assignedTeamId: nullableUuidSchema,
  clientId: nullableUuidSchema,
  installationType: z.string().trim().min(1).max(100).default(INSTALLATION_DEFAULT_TYPE),
  notes: nullableStringSchema(4000, "Las notas"),
  priority: installationPrioritySchema.default("NORMAL"),
  projectId: nullableUuidSchema,
  quotationId: nullableUuidSchema,
  scheduledDate: requiredDateSchema,
  scheduledEndTime: timeSchema,
  scheduledStartTime: timeSchema,
  status: installationOrderStatusSchema.default("SCHEDULED"),
  tasks: z.array(installationTaskInputSchema).default([]),
});

export const updateInstallationOrderSchema = z.object({
  addressId: nullableUuidSchema,
  assignedSupervisorId: nullableUuidSchema,
  assignedTeamId: nullableUuidSchema,
  installationType: z.string().trim().min(1).max(100).default(INSTALLATION_DEFAULT_TYPE),
  notes: nullableStringSchema(4000, "Las notas"),
  priority: installationPrioritySchema.default("NORMAL"),
  scheduledDate: requiredDateSchema,
  scheduledEndTime: timeSchema,
  scheduledStartTime: timeSchema,
});

export const assignInstallationOrderSchema = z.object({
  assignedSupervisorId: nullableUuidSchema,
  assignedTeamId: nullableUuidSchema,
});

export const rescheduleInstallationOrderSchema = z.object({
  reason: z.string().trim().min(1, "El motivo de reprogramacion es obligatorio.").max(4000),
  scheduledDate: requiredDateSchema,
  scheduledEndTime: timeSchema,
  scheduledStartTime: timeSchema,
});

export const changeInstallationStatusSchema = z.object({
  notes: nullableStringSchema(4000, "Las notas"),
  status: installationOrderStatusSchema,
});

export const updateInstallationTaskSchema = z.object({
  description: nullableStringSchema(4000, "La descripcion de la tarea"),
  estimatedMinutes: nullableIntegerSchema("Los minutos estimados"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: installationTaskStatusSchema.default("PENDING"),
  title: z.string().trim().min(1, "El titulo de la tarea es obligatorio.").max(191),
});

export const createInstallationIssueSchema = z.object({
  description: z.string().trim().min(1, "La descripcion de la incidencia es obligatoria.").max(4000),
  severity: installationIssueSeveritySchema.default("MEDIUM"),
  type: installationIssueTypeSchema.default("OTHER"),
});

export const resolveInstallationIssueSchema = z.object({
  notes: nullableStringSchema(4000, "Las notas"),
  status: z.enum(["IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const installationEvidenceMetadataSchema = z.object({
  description: nullableStringSchema(4000, "La descripcion"),
  mimetype: nullableStringSchema(191, "El tipo de archivo"),
  originalName: z.string().trim().min(1, "El archivo es obligatorio.").max(255),
  size: z.coerce.number().int().min(1, "El archivo es obligatorio."),
  taskId: nullableUuidSchema,
  type: installationEvidenceTypeSchema.default("PHOTO"),
});

export const installationTeamMemberInputSchema = z.object({
  active: z.boolean().default(true),
  role: z.string().trim().min(1, "El rol del integrante es obligatorio.").max(100),
  userId: z.uuid(),
});

export const installationTeamMutationSchema = z.object({
  members: z.array(installationTeamMemberInputSchema).default([]),
  name: z.string().trim().min(1, "El nombre de la cuadrilla es obligatorio.").max(191),
  notes: nullableStringSchema(4000, "Las notas"),
  status: installationTeamStatusSchema.default("ACTIVE"),
  supervisorId: nullableUuidSchema,
});

export const listInstallationOrdersQuerySchema = z.object({
  clientId: z.union([z.uuid(), z.undefined()]).optional(),
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 20, min: 1, max: 100 }),
  projectId: z.union([z.uuid(), z.undefined()]).optional(),
  search: z.string().trim().default(""),
  sortBy: z.enum(["createdAt", "priority", "scheduledDate", "status"]).default("scheduledDate"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  status: installationOrderStatusSchema.optional(),
  teamId: z.union([z.uuid(), z.undefined()]).optional(),
});

export const installationCalendarQuerySchema = z.object({
  clientId: z.union([z.uuid(), z.undefined()]).optional(),
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  projectId: z.union([z.uuid(), z.undefined()]).optional(),
  status: installationOrderStatusSchema.optional(),
  teamId: z.union([z.uuid(), z.undefined()]).optional(),
  view: z.enum(["day", "week", "month"]).default("month"),
});
