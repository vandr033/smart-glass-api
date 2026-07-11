import { z } from "zod";

import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { materialUnitSchema } from "../materials/materials.validators.js";
import {
  MATERIAL_CONSUMPTION_SOURCE_TYPES,
  MATERIAL_CONSUMPTION_TYPES,
  PRODUCTION_JOB_ITEM_STATUSES,
  PRODUCTION_JOB_PRIORITIES,
  PRODUCTION_JOB_STATUSES,
  PRODUCTION_TASK_STATUSES,
  PRODUCTION_TASK_TYPES,
  QUALITY_CHECK_STATUSES,
  PRODUCTION_WORKFLOW_STATUSES,
  PRODUCTION_WORK_CENTER_TYPES,
  PRODUCTION_WORK_CENTER_STATUSES,
  PRODUCTION_BLOCK_TYPES,
  PRODUCTION_BLOCK_SEVERITIES,
  PRODUCTION_BLOCK_STATUSES,
  PRODUCTION_TASK_DEPENDENCY_TYPES,
  PRODUCTION_WASTE_ENTRY_TYPES,
  PRODUCTION_WASTE_REASONS,
} from "./production.constants.js";

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

const nullableNumberSchema = ({
  integer = false,
  label,
  max,
  min,
}: {
  integer?: boolean;
  label: string;
  max?: number;
  min?: number;
}) =>
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
    .refine((value) => value === null || !integer || Number.isInteger(value), {
      message: `${label} must be a whole number.`,
    })
    .refine((value) => value === null || min === undefined || value >= min, {
      message: `${label} must be at least ${min}.`,
    })
    .refine((value) => value === null || max === undefined || value <= max, {
      message: `${label} must be at most ${max}.`,
    });

const positiveNumberSchema = (label: string) =>
  z
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

      const normalizedValue =
        /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
          ? `${trimmedValue}T00:00:00.000Z`
          : trimmedValue;
      const parsedDate = new Date(normalizedValue);

      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    })
    .refine((value) => value === null || value instanceof Date, {
      message: `${label} must be a valid date.`,
    });

const jsonLikeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonLikeSchema),
    z.record(z.string(), jsonLikeSchema),
  ]),
);

const nullableJsonObjectSchema = z
  .union([z.record(z.string(), jsonLikeSchema), z.null(), z.undefined()])
  .transform((value) => value ?? null);

const nullableUuidSchema = z
  .union([z.uuid(), z.null(), z.undefined()])
  .transform((value) => value ?? null);

export const productionJobStatusSchema = z.enum(PRODUCTION_JOB_STATUSES);
export const productionJobPrioritySchema = z.enum(PRODUCTION_JOB_PRIORITIES);
export const productionJobItemStatusSchema = z.enum(PRODUCTION_JOB_ITEM_STATUSES);
export const productionTaskTypeSchema = z.enum(PRODUCTION_TASK_TYPES);
export const productionTaskStatusSchema = z.enum(PRODUCTION_TASK_STATUSES);
export const materialConsumptionTypeSchema = z.enum(MATERIAL_CONSUMPTION_TYPES);
export const materialConsumptionSourceTypeSchema = z.enum(
  MATERIAL_CONSUMPTION_SOURCE_TYPES,
);
export const qualityCheckStatusSchema = z.enum(QUALITY_CHECK_STATUSES);
export const productionWorkflowStatusSchema = z.enum(PRODUCTION_WORKFLOW_STATUSES);
export const productionWorkCenterTypeSchema = z.enum(PRODUCTION_WORK_CENTER_TYPES);
export const productionWorkCenterStatusSchema = z.enum(PRODUCTION_WORK_CENTER_STATUSES);
export const productionBlockTypeSchema = z.enum(PRODUCTION_BLOCK_TYPES);
export const productionBlockSeveritySchema = z.enum(PRODUCTION_BLOCK_SEVERITIES);
export const productionBlockStatusSchema = z.enum(PRODUCTION_BLOCK_STATUSES);
export const productionTaskDependencyTypeSchema = z.enum(PRODUCTION_TASK_DEPENDENCY_TYPES);
export const productionWasteEntryTypeSchema = z.enum(PRODUCTION_WASTE_ENTRY_TYPES);
export const productionWasteReasonSchema = z.enum(PRODUCTION_WASTE_REASONS);

export const productionJobIdParamSchema = z.object({
  id: z.uuid(),
});

export const productionTaskIdParamSchema = z.object({
  taskId: z.uuid(),
});

export const quotationIdParamSchema = z.object({
  quotationId: z.uuid(),
});

export const cuttingPlanIdParamSchema = z.object({
  cuttingPlanId: z.uuid(),
});

export const profileCuttingPlanIdParamSchema = z.object({
  profileCuttingPlanId: z.uuid(),
});

export const productionJobItemInputSchema = z.object({
  description: nullableStringSchema(4000, "Item description"),
  materialId: nullableUuidSchema,
  metadataJson: nullableJsonObjectSchema,
  name: z.string().trim().min(1, "Item name is required.").max(191),
  quantity: positiveNumberSchema("Item quantity").default(1),
  quotationItemId: nullableUuidSchema,
  status: productionJobItemStatusSchema.default("PENDING"),
});

export const productionTaskInputSchema = z.object({
  assignedToUserId: nullableUuidSchema,
  description: nullableStringSchema(4000, "Task description"),
  productionJobItemId: nullableUuidSchema,
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: productionTaskStatusSchema.default("PENDING"),
  taskType: productionTaskTypeSchema,
  title: z.string().trim().min(1, "Task title is required.").max(191),
});

export const createProductionJobSchema = z.object({
  assignedToUserId: nullableUuidSchema,
  cuttingPlanId: nullableUuidSchema,
  items: z.array(productionJobItemInputSchema).default([]),
  notes: nullableStringSchema(4000, "Notes"),
  plannedEndDate: nullableDateSchema("Planned end date"),
  plannedStartDate: nullableDateSchema("Planned start date"),
  priority: productionJobPrioritySchema.default("NORMAL"),
  projectId: nullableUuidSchema,
  quotationId: nullableUuidSchema,
  tasks: z.array(productionTaskInputSchema).default([]),
});

export const updateProductionJobSchema = z.object({
  assignedToUserId: nullableUuidSchema,
  notes: nullableStringSchema(4000, "Notes"),
  plannedEndDate: nullableDateSchema("Planned end date"),
  plannedStartDate: nullableDateSchema("Planned start date"),
  priority: productionJobPrioritySchema,
});

export const listProductionJobsQuerySchema = z.object({
  assignedToUserId: z.union([z.uuid(), z.undefined()]).optional(),
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  priority: productionJobPrioritySchema.optional(),
  projectId: z.union([z.uuid(), z.undefined()]).optional(),
  quotationId: z.union([z.uuid(), z.undefined()]).optional(),
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["actualStartDate", "createdAt", "plannedEndDate", "plannedStartDate", "updatedAt"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: productionJobStatusSchema.optional(),
});

export const assignProductionJobSchema = z.object({
  assignedToUserId: nullableUuidSchema,
});

export const generateProductionTasksSchema = z.object({
  replaceExisting: z.boolean().default(false),
});

export const updateProductionTaskSchema = z.object({
  assignedToUserId: nullableUuidSchema,
  description: nullableStringSchema(4000, "Task description"),
  sortOrder: z.coerce.number().int().min(0),
  status: productionTaskStatusSchema,
  title: z.string().trim().min(1, "Task title is required.").max(191),
});

const remnantOutputSchema = z.object({
  code: nullableStringSchema(100, "Remnant code"),
  lengthMm: nullableNumberSchema({
    label: "Remnant length",
    min: 0,
  }),
  notes: nullableStringSchema(4000, "Remnant notes"),
  quantity: positiveNumberSchema("Remnant quantity").default(1),
  thicknessMm: nullableNumberSchema({
    label: "Remnant thickness",
    min: 0,
  }),
  unit: materialUnitSchema,
  warehouseId: z.uuid({
    message: "Remnant warehouse is required.",
  }),
  widthMm: nullableNumberSchema({
    label: "Remnant width",
    min: 0,
  }),
});

export const consumeMaterialForTaskSchema = z
  .object({
    actualWasteAreaM2: nullableNumberSchema({
      label: "Actual waste area",
      min: 0,
    }),
    consumptionType: materialConsumptionTypeSchema.default("ACTUAL"),
    consumedAt: nullableDateSchema("Consumed at"),
    inventoryStockId: nullableUuidSchema,
    materialId: nullableUuidSchema,
    notes: nullableStringSchema(4000, "Consumption notes"),
    quantity: positiveNumberSchema("Consumption quantity"),
    remnantOutput: z.union([remnantOutputSchema, z.null(), z.undefined()]).transform(
      (value) => value ?? null,
    ),
    remnantPieceId: nullableUuidSchema,
    scrapQuantity: nullableNumberSchema({
      label: "Scrap quantity",
      min: 0,
    }),
    scrapUnit: z.union([materialUnitSchema, z.null(), z.undefined()]).transform(
      (value) => value ?? null,
    ),
    sourceType: materialConsumptionSourceTypeSchema.optional(),
    unit: materialUnitSchema,
  })
  .superRefine((value, context) => {
    if (!value.inventoryStockId && !value.remnantPieceId && !value.materialId) {
      context.addIssue({
        code: "custom",
        message: "Select an inventory stock, remnant piece, or material.",
        path: ["inventoryStockId"],
      });
    }

    if (value.remnantPieceId && value.inventoryStockId) {
      context.addIssue({
        code: "custom",
        message: "Select either an inventory stock or a remnant piece, not both.",
        path: ["remnantPieceId"],
      });
    }

    if (value.scrapQuantity !== null && value.scrapQuantity > 0 && !value.scrapUnit) {
      context.addIssue({
        code: "custom",
        message: "Scrap unit is required when scrap quantity is provided.",
        path: ["scrapUnit"],
      });
    }
  });

export const qualityCheckMutationSchema = z.object({
  evidenceJson: nullableJsonObjectSchema,
  notes: nullableStringSchema(4000, "Quality notes"),
  productionTaskId: nullableUuidSchema,
  status: qualityCheckStatusSchema.default("PENDING"),
});

export const productionBoardQuerySchema = z.object({
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  priority: productionJobPrioritySchema.optional(),
  search: z.string().trim().default(""),
});

export const productionTransitionSchema = z.object({
  expectedVersion: z.coerce.number().int().min(1).optional(),
  reason: nullableStringSchema(4000, "Motivo"),
  toStatus: productionWorkflowStatusSchema,
});

export const productionTaskTransitionSchema = z.object({
  reason: nullableStringSchema(4000, "Motivo"),
  toStatus: z.enum(["IN_PROGRESS", "PAUSED", "BLOCKED", "COMPLETED", "PENDING"]),
});

export const productionScheduleSchema = z.object({
  currentWorkCenterId: nullableUuidSchema,
  expectedVersion: z.coerce.number().int().min(1).optional(),
  plannedEndDate: nullableDateSchema("Fecha requerida"),
  plannedStartDate: nullableDateSchema("Fecha de inicio"),
  reason: nullableStringSchema(4000, "Motivo"),
});

export const productionTaskAssignmentSchema = z.object({
  assignedToUserId: nullableUuidSchema,
  currentWorkCenterId: nullableUuidSchema,
  expectedVersion: z.coerce.number().int().min(1).optional(),
});

export const productionBlockCreateSchema = z.object({
  description: z.string().trim().min(1).max(4000),
  estimatedImpactMinutes: nullableNumberSchema({ label: "Impacto estimado", min: 0, integer: true }),
  productionJobId: nullableUuidSchema,
  productionTaskId: nullableUuidSchema,
  severity: productionBlockSeveritySchema.default("MEDIUM"),
  type: productionBlockTypeSchema,
});

export const productionBlockResolveSchema = z.object({
  resolution: z.string().trim().min(1).max(4000),
});

export const productionWasteEntrySchema = z.object({
  areaM2: nullableNumberSchema({ label: "Área", min: 0 }),
  entryType: productionWasteEntryTypeSchema,
  heightMm: nullableNumberSchema({ label: "Alto", min: 0 }),
  lengthMm: nullableNumberSchema({ label: "Largo", min: 0 }),
  materialId: nullableUuidSchema,
  notes: nullableStringSchema(4000, "Notas"),
  productionJobId: z.uuid(),
  productionTaskId: nullableUuidSchema,
  quantity: positiveNumberSchema("Cantidad"),
  reason: productionWasteReasonSchema,
  recoverable: z.boolean().default(false),
  unit: materialUnitSchema,
  widthMm: nullableNumberSchema({ label: "Ancho", min: 0 }),
});
