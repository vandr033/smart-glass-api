import { z } from "zod";

import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import {
  PROJECT_ATTACHMENT_TYPES,
  PROJECT_NOTE_VISIBILITIES,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
} from "./projects.constants.js";

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
      message: `${label} must be ${maxLength} characters or fewer.`,
    });

const nullablePositiveNumberSchema = (label: string) =>
  z
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

const nullableLatitudeSchema = (label: string) =>
  z
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
    .refine((value) => value === null || value >= -90, {
      message: `${label} must be greater than or equal to -90.`,
    })
    .refine((value) => value === null || value <= 90, {
      message: `${label} must be less than or equal to 90.`,
    });

const nullableLongitudeSchema = (label: string) =>
  z
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
    .refine((value) => value === null || value >= -180, {
      message: `${label} must be greater than or equal to -180.`,
    })
    .refine((value) => value === null || value <= 180, {
      message: `${label} must be less than or equal to 180.`,
    });

const dateFilterSchema = z
  .union([z.string(), z.undefined()])
  .transform((value) => value?.trim() || undefined)
  .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Dates must use YYYY-MM-DD format.",
  });

const nullableDateSchema = (label: string) =>
  z
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

const nullableJsonObjectSchema = z
  .union([z.record(z.string(), z.unknown()), z.null(), z.undefined()])
  .transform((value) => value ?? null);

export const projectTypeSchema = z.enum(PROJECT_TYPES);
export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const projectPrioritySchema = z.enum(PROJECT_PRIORITIES);
export const projectNoteVisibilitySchema = z.enum(PROJECT_NOTE_VISIBILITIES);
export const projectAttachmentTypeSchema = z.enum(PROJECT_ATTACHMENT_TYPES);

export const projectIdParamSchema = z.object({
  id: z.uuid(),
});

export const projectNoteParamsSchema = z.object({
  id: z.uuid(),
  noteId: z.uuid(),
});

export const projectAttachmentParamsSchema = z.object({
  attachmentId: z.uuid(),
  id: z.uuid(),
});

export const projectMeasurementParamsSchema = z.object({
  id: z.uuid(),
  measurementId: z.uuid(),
});

export const projectMutationSchema = z.object({
  clientId: z.uuid({
    message: "Client is required.",
  }),
  city: nullableStringSchema(100, "City"),
  description: nullableStringSchema(4000, "Descripción"),
  expectedDeliveryDate: nullableDateSchema("Expected delivery date"),
  expectedInstallationDate: nullableDateSchema("Expected installation date"),
  expectedMeasurementDate: nullableDateSchema("Expected measurement date"),
  latitude: nullableLatitudeSchema("Latitude"),
  longitude: nullableLongitudeSchema("Longitude"),
  notes: nullableStringSchema(4000, "Notes"),
  priority: projectPrioritySchema.default("NORMAL"),
  projectType: projectTypeSchema,
  responsibleUserId: z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => value ?? null),
  salesUserId: z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => value ?? null),
  siteAddress: nullableStringSchema(255, "Site address"),
  status: projectStatusSchema.default("LEAD"),
  title: z.string().trim().min(1, "Project title is required.").max(191),
});

export const listProjectsQuerySchema = z.object({
  clientId: z.union([z.uuid(), z.undefined()]).optional(),
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  priority: projectPrioritySchema.optional(),
  projectType: projectTypeSchema.optional(),
  responsibleUserId: z.union([z.uuid(), z.undefined()]).optional(),
  salesUserId: z.union([z.uuid(), z.undefined()]).optional(),
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["createdAt", "expectedDeliveryDate", "priority", "status"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: projectStatusSchema.optional(),
});

export const projectTransitionSchema = z
  .object({
    metadata: nullableJsonObjectSchema.optional(),
    reason: nullableStringSchema(4000, "Reason"),
    toStatus: projectStatusSchema,
  })
  .superRefine((value, context) => {
    if (
      (value.toStatus === "CANCELLED" || value.toStatus === "ON_HOLD") &&
      !value.reason
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Reason is required when moving a project to cancelled or on hold.",
        path: ["reason"],
      });
    }
  });

export const projectNoteInputSchema = z.object({
  note: z.string().trim().min(1, "Note is required.").max(4000),
  visibility: projectNoteVisibilitySchema.default("INTERNAL"),
});

export const projectMeasurementInputSchema = z.object({
  depthMm: nullablePositiveNumberSchema("Depth"),
  heightMm: nullablePositiveNumberSchema("Height"),
  locationDescription: nullableStringSchema(255, "Descripción de ubicación"),
  measurementDate: nullableDateSchema("Measurement date"),
  notes: nullableStringSchema(4000, "Measurement notes"),
  quantity: z.coerce.number().int().min(1).default(1),
  rawJson: nullableJsonObjectSchema,
  widthMm: nullablePositiveNumberSchema("Width"),
});

export const projectAttachmentInputSchema = z.object({
  attachmentType: projectAttachmentTypeSchema.default("OTHER"),
  description: nullableStringSchema(4000, "Descripción del archivo adjunto"),
});

export const projectFileUploadSchema = z.object({
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
  size: z.coerce
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
