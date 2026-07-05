import { z } from "zod";

import { MATERIAL_UNITS } from "../materials/materials.behavior.js";
import {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_REQUEST_ITEM_STATUSES,
  PURCHASE_REQUEST_SOURCE_TYPES,
  PURCHASE_REQUEST_STATUSES,
  SUPPLIER_COMPARISON_STATUSES,
} from "./purchasing.constants.js";

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

const nullableNumberSchema = (label: string) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return null;
      }

      if (typeof value === "string") {
        const trimmedValue = value.trim();
        return trimmedValue.length > 0 ? Number(trimmedValue) : null;
      }

      return value;
    })
    .refine((value) => value === null || Number.isFinite(value), {
      message: `${label} must be a valid number.`,
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

const optionalUuidSchema = z
  .union([z.uuid(), z.null(), z.undefined()])
  .transform((value) => value ?? undefined);

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

const pageSchema = z
  .union([z.number(), z.string(), z.undefined()])
  .transform((value) => {
    if (value === undefined) {
      return 1;
    }

    return typeof value === "string" ? Number(value.trim()) : value;
  })
  .refine((value) => Number.isInteger(value) && value > 0, {
    message: "Page must be a positive integer.",
  });

const perPageSchema = z
  .union([z.number(), z.string(), z.undefined()])
  .transform((value) => {
    if (value === undefined) {
      return 20;
    }

    return typeof value === "string" ? Number(value.trim()) : value;
  })
  .refine((value) => Number.isInteger(value) && value > 0 && value <= 100, {
    message: "Per-page must be between 1 and 100.",
  });

const dateFilterSchema = z
  .union([z.string(), z.undefined()])
  .transform((value) => value?.trim() || undefined)
  .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Dates must use YYYY-MM-DD format.",
  });

const metadataJsonSchema = z
  .record(z.string(), z.unknown())
  .or(z.array(z.unknown()))
  .or(z.null())
  .optional();

export const materialUnitSchema = z.enum(MATERIAL_UNITS);
export const purchaseRequestStatusSchema = z.enum(PURCHASE_REQUEST_STATUSES);
export const purchaseRequestSourceTypeSchema = z.enum(PURCHASE_REQUEST_SOURCE_TYPES);
export const purchaseRequestItemStatusSchema = z.enum(PURCHASE_REQUEST_ITEM_STATUSES);
export const supplierComparisonStatusSchema = z.enum(SUPPLIER_COMPARISON_STATUSES);
export const purchaseOrderStatusSchema = z.enum(PURCHASE_ORDER_STATUSES);

export const purchaseRequestIdParamSchema = z.object({
  id: z.uuid(),
});

export const supplierComparisonIdParamSchema = z.object({
  id: z.uuid(),
});

export const purchaseOrderIdParamSchema = z.object({
  id: z.uuid(),
});

export const purchaseReceiptIdParamSchema = z.object({
  id: z.uuid(),
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

export const purchaseRequestItemInputSchema = z.object({
  description: nullableStringSchema(4000, "Description"),
  estimatedUnitCost: nullableNumberSchema("Estimated unit cost"),
  id: optionalUuidSchema,
  materialId: z.uuid({
    message: "Material is required.",
  }),
  metadataJson: metadataJsonSchema,
  preferredSupplierId: optionalUuidSchema,
  quantity: positiveNumberSchema("Quantity"),
  requiredDate: nullableDateSchema("Required date"),
  selectedSupplierId: optionalUuidSchema,
  status: purchaseRequestItemStatusSchema.optional(),
  unit: materialUnitSchema,
});

export const createPurchaseRequestSchema = z.object({
  items: z.array(purchaseRequestItemInputSchema).default([]),
  notes: nullableStringSchema(4000, "Notes"),
  sourceId: nullableStringSchema(191, "Source reference"),
  sourceType: purchaseRequestSourceTypeSchema.default("MANUAL"),
});

export const updatePurchaseRequestSchema = z.object({
  items: z.array(purchaseRequestItemInputSchema).optional(),
  notes: nullableStringSchema(4000, "Notes").optional(),
  sourceId: nullableStringSchema(191, "Source reference").optional(),
  sourceType: purchaseRequestSourceTypeSchema.optional(),
});

export const createInventoryShortagePurchaseRequestSchema = z.object({
  materialIds: z
    .array(
      z.uuid({
        message: "Material id must be a valid UUID.",
      }),
    )
    .min(1, "Select at least one material."),
  notes: nullableStringSchema(4000, "Notes"),
});

export const purchaseRequestDecisionSchema = z.object({
  notes: nullableStringSchema(4000, "Notes"),
});

export const supplierComparisonRunSchema = z.object({
  scoringConfigId: optionalUuidSchema,
});

export const supplierComparisonApprovalSchema = z.object({
  notes: nullableStringSchema(4000, "Notes"),
});

export const listPurchaseRequestsQuerySchema = z.object({
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  page: pageSchema,
  perPage: perPageSchema,
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["approvedAt", "code", "createdAt", "status"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  sourceType: purchaseRequestSourceTypeSchema.optional(),
  status: purchaseRequestStatusSchema.optional(),
});

export const listSupplierComparisonsQuerySchema = z.object({
  page: pageSchema,
  perPage: perPageSchema,
  purchaseRequestId: optionalUuidSchema,
  search: z.string().trim().default(""),
  sortBy: z.enum(["approvedAt", "createdAt", "status"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: supplierComparisonStatusSchema.optional(),
});

export const purchaseOrderItemInputSchema = z.object({
  description: nullableStringSchema(4000, "Description"),
  id: optionalUuidSchema,
  materialId: z.uuid({
    message: "Material is required.",
  }),
  metadataJson: metadataJsonSchema,
  quantity: positiveNumberSchema("Quantity"),
  unit: materialUnitSchema,
  unitPrice: positiveNumberSchema("Unit price"),
});

export const createPurchaseOrderSchema = z.object({
  currency: z.string().trim().min(1).max(16).default("BOB"),
  discountAmount: nullableNumberSchema("Discount amount").transform(
    (value) => value ?? 0,
  ),
  expectedDeliveryDate: nullableDateSchema("Expected delivery date"),
  items: z.array(purchaseOrderItemInputSchema).min(1, "Add at least one item."),
  notes: nullableStringSchema(4000, "Notes"),
  orderDate: nullableDateSchema("Order date"),
  purchaseRequestId: optionalUuidSchema,
  supplierId: z.uuid({
    message: "Supplier is required.",
  }),
  taxAmount: nullableNumberSchema("Tax amount").transform((value) => value ?? 0),
});

export const updatePurchaseOrderSchema = z.object({
  currency: z.string().trim().min(1).max(16).optional(),
  discountAmount: nullableNumberSchema("Discount amount").optional(),
  expectedDeliveryDate: nullableDateSchema("Expected delivery date").optional(),
  items: z.array(purchaseOrderItemInputSchema).optional(),
  notes: nullableStringSchema(4000, "Notes").optional(),
  orderDate: nullableDateSchema("Order date").optional(),
  taxAmount: nullableNumberSchema("Tax amount").optional(),
});

export const purchaseOrderStatusNoteSchema = z.object({
  notes: nullableStringSchema(4000, "Notes"),
});

export const purchaseReceiptItemInputSchema = z.object({
  batchNumber: nullableStringSchema(100, "Batch number"),
  heightMm: nullableNumberSchema("Height"),
  lengthMm: nullableNumberSchema("Length"),
  locationCode: nullableStringSchema(100, "Location code"),
  notes: nullableStringSchema(4000, "Notes"),
  purchaseOrderItemId: z.uuid({
    message: "Purchase order item is required.",
  }),
  receivedQuantity: positiveNumberSchema("Received quantity"),
  thicknessMm: nullableNumberSchema("Thickness"),
  widthMm: nullableNumberSchema("Width"),
});

export const receivePurchaseOrderSchema = z.object({
  items: z
    .array(purchaseReceiptItemInputSchema)
    .min(1, "Add at least one receipt item."),
  notes: nullableStringSchema(4000, "Notes"),
  receivedAt: nullableDateSchema("Received at"),
  warehouseId: z.uuid({
    message: "Warehouse is required.",
  }),
});

export const listPurchaseOrdersQuerySchema = z.object({
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  page: pageSchema,
  perPage: perPageSchema,
  purchaseRequestId: optionalUuidSchema,
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["code", "createdAt", "expectedDeliveryDate", "orderDate", "status"])
    .default("orderDate"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: purchaseOrderStatusSchema.optional(),
  supplierId: optionalUuidSchema,
});

export const listPurchaseReceiptsQuerySchema = z.object({
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  page: pageSchema,
  perPage: perPageSchema,
  purchaseOrderId: optionalUuidSchema,
  search: z.string().trim().default(""),
  sortBy: z.enum(["code", "createdAt", "receivedAt"]).default("receivedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  warehouseId: optionalUuidSchema,
});
