import { z } from "zod";

import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { MATERIAL_UNITS } from "../materials/materials.behavior.js";
import {
  DAMAGE_SEVERITIES,
  DAMAGE_TYPES,
  DAMAGED_MATERIAL_STATUSES,
  INVENTORY_CONDITIONS,
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_RESERVATION_STATUSES,
  INVENTORY_RESERVATION_TYPES,
  INVENTORY_SOURCE_TYPES,
  INVENTORY_STOCK_TYPES,
  REMNANT_PIECE_SOURCE_TYPES,
  REMNANT_PIECE_STATUSES,
  WAREHOUSE_STATUSES,
} from "./inventory.constants.js";

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

        if (!trimmedValue) {
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

const nonZeroNumberSchema = (label: string) =>
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
    .refine((value) => value !== 0, {
      message: `${label} must be different from zero.`,
    });

const optionalUuidSchema = z
  .union([z.uuid(), z.null(), z.undefined()])
  .transform((value) => value ?? undefined);

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

      if (!trimmedValue) {
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

export const warehouseStatusSchema = z.enum(WAREHOUSE_STATUSES);
export const materialUnitSchema = z.enum(MATERIAL_UNITS);
export const inventoryStockTypeSchema = z.enum(INVENTORY_STOCK_TYPES);
export const inventoryConditionSchema = z.enum(INVENTORY_CONDITIONS);
export const inventorySourceTypeSchema = z.enum(INVENTORY_SOURCE_TYPES);
export const inventoryMovementTypeSchema = z.enum(INVENTORY_MOVEMENT_TYPES);
export const inventoryReservationTypeSchema = z.enum(INVENTORY_RESERVATION_TYPES);
export const inventoryReservationStatusSchema = z.enum(
  INVENTORY_RESERVATION_STATUSES,
);
export const remnantPieceStatusSchema = z.enum(REMNANT_PIECE_STATUSES);
export const remnantPieceSourceTypeSchema = z.enum(REMNANT_PIECE_SOURCE_TYPES);
export const damageTypeSchema = z.enum(DAMAGE_TYPES);
export const damageSeveritySchema = z.enum(DAMAGE_SEVERITIES);
export const damagedMaterialStatusSchema = z.enum(DAMAGED_MATERIAL_STATUSES);

export const warehouseIdParamSchema = z.object({
  id: z.uuid(),
});

export const inventoryStockIdParamSchema = z.object({
  id: z.uuid(),
});

export const inventoryReservationIdParamSchema = z.object({
  id: z.uuid(),
});

export const remnantPieceIdParamSchema = z.object({
  id: z.uuid(),
});

export const damagedMaterialIdParamSchema = z.object({
  id: z.uuid(),
});

export const materialIdParamSchema = z.object({
  materialId: z.uuid(),
});

export const warehouseMutationSchema = z.object({
  address: nullableStringSchema(255, "Address"),
  code: z.string().trim().min(1, "Warehouse code is required.").max(100),
  description: nullableStringSchema(4000, "Description"),
  latitude: nullableNumberSchema({
    label: "Latitude",
    max: 90,
    min: -90,
  }),
  longitude: nullableNumberSchema({
    label: "Longitude",
    max: 180,
    min: -180,
  }),
  name: z.string().trim().min(1, "Warehouse name is required.").max(191),
  status: warehouseStatusSchema.default("ACTIVE"),
});

export const listWarehousesQuerySchema = z.object({
  search: z.string().trim().default(""),
  status: warehouseStatusSchema.optional(),
});

export const stockEntrySchema = z.object({
  batchNumber: nullableStringSchema(100, "Batch number"),
  condition: inventoryConditionSchema.default("AVAILABLE"),
  heightMm: nullableNumberSchema({
    label: "Height",
    min: 0,
  }),
  lengthMm: nullableNumberSchema({
    label: "Length",
    min: 0,
  }),
  locationCode: nullableStringSchema(100, "Location code"),
  materialId: z.uuid({
    message: "Material is required.",
  }),
  notes: nullableStringSchema(4000, "Notes"),
  quantity: positiveNumberSchema("Quantity"),
  sourceId: nullableStringSchema(191, "Source reference"),
  sourceType: inventorySourceTypeSchema.default("MANUAL"),
  stockType: inventoryStockTypeSchema.default("STANDARD"),
  thicknessMm: nullableNumberSchema({
    label: "Thickness",
    min: 0,
  }),
  unit: materialUnitSchema,
  warehouseId: z.uuid({
    message: "Warehouse is required.",
  }),
  widthMm: nullableNumberSchema({
    label: "Width",
    min: 0,
  }),
});

export const listInventoryStockQuerySchema = z.object({
  categoryId: optionalUuidSchema,
  condition: inventoryConditionSchema.optional(),
  materialId: optionalUuidSchema,
  maxHeightMm: nullableNumberSchema({
    label: "Maximum height",
    min: 0,
  }).transform((value) => value ?? undefined),
  maxLengthMm: nullableNumberSchema({
    label: "Maximum length",
    min: 0,
  }).transform((value) => value ?? undefined),
  maxWidthMm: nullableNumberSchema({
    label: "Maximum width",
    min: 0,
  }).transform((value) => value ?? undefined),
  minHeightMm: nullableNumberSchema({
    label: "Minimum height",
    min: 0,
  }).transform((value) => value ?? undefined),
  minLengthMm: nullableNumberSchema({
    label: "Minimum length",
    min: 0,
  }).transform((value) => value ?? undefined),
  minWidthMm: nullableNumberSchema({
    label: "Minimum width",
    min: 0,
  }).transform((value) => value ?? undefined),
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["createdAt", "material", "quantity", "warehouse"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  stockType: inventoryStockTypeSchema.optional(),
  thicknessMm: nullableNumberSchema({
    label: "Thickness",
    min: 0,
  }).transform((value) => value ?? undefined),
  warehouseId: optionalUuidSchema,
});

export const adjustStockSchema = z.object({
  inventoryStockId: z.uuid({
    message: "Inventory stock is required.",
  }),
  notes: nullableStringSchema(4000, "Notes"),
  quantityDelta: nonZeroNumberSchema("Adjustment quantity"),
  reason: nullableStringSchema(4000, "Reason"),
});

export const transferStockSchema = z.object({
  inventoryStockId: z.uuid({
    message: "Inventory stock is required.",
  }),
  locationCode: nullableStringSchema(100, "Destination location"),
  quantity: positiveNumberSchema("Transfer quantity"),
  reason: nullableStringSchema(4000, "Reason"),
  toWarehouseId: z.uuid({
    message: "Destination warehouse is required.",
  }),
});

export const listInventoryMovementsQuerySchema = z.object({
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  materialId: optionalUuidSchema,
  movementType: inventoryMovementTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
  sortBy: z.enum(["createdAt", "movementType", "quantity"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  warehouseId: optionalUuidSchema,
});

export const reservationMutationSchema = z.object({
  expiresAt: nullableDateSchema("Expiration"),
  inventoryStockId: optionalUuidSchema,
  materialId: z.uuid({
    message: "Material is required.",
  }),
  projectId: optionalUuidSchema,
  quantity: positiveNumberSchema("Quantity"),
  quotationId: optionalUuidSchema,
  unit: materialUnitSchema,
  warehouseId: z.uuid({
    message: "Warehouse is required.",
  }),
});

export const listReservationsQuerySchema = z.object({
  materialId: optionalUuidSchema,
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  projectId: optionalUuidSchema,
  quotationId: optionalUuidSchema,
  reservationType: inventoryReservationTypeSchema.optional(),
  search: z.string().trim().default(""),
  sortBy: z.enum(["createdAt", "expiresAt", "quantity"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: inventoryReservationStatusSchema.optional(),
  warehouseId: optionalUuidSchema,
});

export const remnantPieceMutationSchema = z.object({
  code: nullableStringSchema(100, "Remnant code"),
  lengthMm: nullableNumberSchema({
    label: "Length",
    min: 0,
  }),
  materialId: z.uuid({
    message: "Material is required.",
  }),
  notes: nullableStringSchema(4000, "Notes"),
  parentInventoryStockId: optionalUuidSchema,
  quantity: positiveNumberSchema("Quantity").default(1),
  sourceId: nullableStringSchema(191, "Source reference"),
  sourceType: remnantPieceSourceTypeSchema.default("MANUAL"),
  thicknessMm: nullableNumberSchema({
    label: "Thickness",
    min: 0,
  }),
  unit: materialUnitSchema,
  warehouseId: z.uuid({
    message: "Warehouse is required.",
  }),
  widthMm: nullableNumberSchema({
    label: "Width",
    min: 0,
  }),
});

export const listRemnantsQuerySchema = z.object({
  materialId: optionalUuidSchema,
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
  sortBy: z.enum(["code", "createdAt", "usableAreaM2"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: remnantPieceStatusSchema.optional(),
  thicknessMm: nullableNumberSchema({
    label: "Thickness",
    min: 0,
  }).transform((value) => value ?? undefined),
  warehouseId: optionalUuidSchema,
});

export const usableRemnantsQuerySchema = z.object({
  materialId: z.uuid({
    message: "Material is required.",
  }),
  requiredHeightMm: positiveNumberSchema("Required height"),
  requiredWidthMm: positiveNumberSchema("Required width"),
  thicknessMm: nullableNumberSchema({
    label: "Thickness",
    min: 0,
  }).transform((value) => value ?? undefined),
  warehouseId: optionalUuidSchema,
});

export const damagedMaterialMutationSchema = z.object({
  damageType: damageTypeSchema,
  description: nullableStringSchema(4000, "Description"),
  inventoryStockId: optionalUuidSchema,
  materialId: z.uuid({
    message: "Material is required.",
  }),
  quantity: positiveNumberSchema("Quantity"),
  severity: damageSeveritySchema,
  unit: materialUnitSchema,
  warehouseId: z.uuid({
    message: "Warehouse is required.",
  }),
});

export const listDamagedMaterialsQuerySchema = z.object({
  materialId: optionalUuidSchema,
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
  severity: damageSeveritySchema.optional(),
  sortBy: z.enum(["createdAt", "severity", "status"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: damagedMaterialStatusSchema.optional(),
  warehouseId: optionalUuidSchema,
});

export const reviewDamagedMaterialSchema = z.object({
  description: nullableStringSchema(4000, "Description"),
  status: z.enum(["REVIEWED", "REUSABLE"]),
});

export const scrapMaterialSchema = z.object({
  reason: nullableStringSchema(4000, "Reason"),
});

export const returnToSupplierSchema = z.object({
  reason: nullableStringSchema(4000, "Reason"),
});

export const availabilityMaterialQuerySchema = z.object({
  quantity: nullableNumberSchema({
    label: "Quantity",
    min: 0,
  }).transform((value) => value ?? undefined),
  unit: materialUnitSchema.optional(),
  warehouseId: optionalUuidSchema,
});

export const availabilityGlassQuerySchema = z.object({
  heightMm: positiveNumberSchema("Height"),
  materialId: z.uuid({
    message: "Material is required.",
  }),
  thicknessMm: nullableNumberSchema({
    label: "Thickness",
    min: 0,
  }).transform((value) => value ?? undefined),
  warehouseId: optionalUuidSchema,
  widthMm: positiveNumberSchema("Width"),
});

export const availabilityLinearQuerySchema = z.object({
  materialId: z.uuid({
    message: "Material is required.",
  }),
  requiredLengthMm: positiveNumberSchema("Required length"),
  warehouseId: optionalUuidSchema,
});
