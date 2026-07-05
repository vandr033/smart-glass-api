import { z } from "zod";

import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import type { JsonLike, MaterialBehaviorInput } from "./materials.behavior.js";
import {
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
  MATERIAL_UNITS,
  SUPPLIER_MATERIAL_EQUIVALENCE_CONFIDENCE_LEVELS,
  SUPPLIER_MATERIAL_EQUIVALENCE_STATUSES,
  validateMaterialBehavior,
} from "./materials.behavior.js";

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

const optionalBooleanFilterSchema = z
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

const jsonLikeSchema: z.ZodType<JsonLike> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonLikeSchema),
    z.record(z.string(), jsonLikeSchema),
  ]),
);

const nullableJsonLikeSchema = z
  .union([jsonLikeSchema, z.undefined()])
  .transform((value) => value ?? null);

export const materialTypeSchema = z.enum(MATERIAL_TYPES);
export const materialUnitSchema = z.enum(MATERIAL_UNITS);
export const materialStatusSchema = z.enum(MATERIAL_STATUSES);
export const supplierMaterialEquivalenceConfidenceSchema = z.enum(
  SUPPLIER_MATERIAL_EQUIVALENCE_CONFIDENCE_LEVELS,
);
export const supplierMaterialEquivalenceStatusSchema = z.enum(
  SUPPLIER_MATERIAL_EQUIVALENCE_STATUSES,
);

export const materialCategoryIdParamSchema = z.object({
  id: z.uuid(),
});

export const materialIdParamSchema = z.object({
  id: z.uuid(),
});

export const materialDimensionPresetParamsSchema = z.object({
  id: z.uuid(),
  presetId: z.uuid(),
});

export const supplierMaterialEquivalenceIdParamSchema = z.object({
  id: z.uuid(),
});

export const materialCategoryMutationSchema = z.object({
  description: nullableStringSchema(255, "Description"),
  isActive: z.boolean().default(true),
  name: z.string().trim().min(1, "Category name is required.").max(191),
  parentId: z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value : null)),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const createMaterialCategorySchema = materialCategoryMutationSchema;
export const updateMaterialCategorySchema = materialCategoryMutationSchema;

export const listMaterialCategoriesQuerySchema = z.object({
  search: z.string().trim().default(""),
});

export const materialMutationSchema = z
  .object({
    allowsRotation: z.boolean().default(false),
    baseUnit: materialUnitSchema,
    brand: nullableStringSchema(191, "Brand"),
    categoryId: z.uuid({
      message: "Category is required.",
    }),
    code: z.string().trim().min(1, "Code is required.").max(100),
    color: nullableStringSchema(191, "Color"),
    consumptionUnit: materialUnitSchema,
    defaultWastePercent: nullableNumberSchema({
      label: "Default waste percent",
      max: 100,
      min: 0,
    }),
    description: nullableStringSchema(4000, "Description"),
    finish: nullableStringSchema(191, "Finish"),
    isCuttable: z.boolean().default(false),
    isPurchasable: z.boolean().default(true),
    isRemnantEligible: z.boolean().default(false),
    isSellable: z.boolean().default(false),
    isStockable: z.boolean().default(true),
    materialType: materialTypeSchema,
    minimumReusableHeightMm: nullableNumberSchema({
      label: "Minimum reusable height",
      min: 0,
    }),
    minimumReusableLengthMm: nullableNumberSchema({
      label: "Minimum reusable length",
      min: 0,
    }),
    minimumReusableWidthMm: nullableNumberSchema({
      label: "Minimum reusable width",
      min: 0,
    }),
    name: z.string().trim().min(1, "Name is required.").max(191),
    notes: nullableStringSchema(4000, "Notes"),
    purchaseUnit: materialUnitSchema,
    standardHeightMm: nullableNumberSchema({
      label: "Standard height",
      min: 0,
    }),
    standardLengthMm: nullableNumberSchema({
      label: "Standard length",
      min: 0,
    }),
    standardWidthMm: nullableNumberSchema({
      label: "Standard width",
      min: 0,
    }),
    status: materialStatusSchema.default("ACTIVE"),
    stockUnit: materialUnitSchema,
    thicknessMm: nullableNumberSchema({
      label: "Thickness",
      min: 0,
    }),
    unitConversionJson: nullableJsonLikeSchema,
  })
  .superRefine((value, context) => {
    const validation = validateMaterialBehavior(value as MaterialBehaviorInput);

    validation.errors.forEach((issue) => {
      context.addIssue({
        code: "custom",
        message: issue.message,
        path: [issue.path],
      });
    });
  });

export const createMaterialSchema = materialMutationSchema;
export const updateMaterialSchema = materialMutationSchema;

export const listMaterialsQuerySchema = z.object({
  categoryId: z.union([z.uuid(), z.undefined()]).optional(),
  isCuttable: optionalBooleanFilterSchema,
  isRemnantEligible: optionalBooleanFilterSchema,
  isStockable: optionalBooleanFilterSchema,
  materialType: materialTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["category", "code", "createdAt", "materialType", "name"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: materialStatusSchema.optional(),
});

export const materialDimensionPresetMutationSchema = z.object({
  heightMm: nullableNumberSchema({
    label: "Height",
    min: 0,
  }),
  isDefault: z.boolean().default(false),
  label: z.string().trim().min(1, "Preset label is required.").max(191),
  lengthMm: nullableNumberSchema({
    label: "Length",
    min: 0,
  }),
  thicknessMm: nullableNumberSchema({
    label: "Thickness",
    min: 0,
  }),
  widthMm: nullableNumberSchema({
    label: "Width",
    min: 0,
  }),
});

export const createMaterialDimensionPresetSchema =
  materialDimensionPresetMutationSchema;
export const updateMaterialDimensionPresetSchema =
  materialDimensionPresetMutationSchema;

export const supplierMaterialEquivalenceMutationSchema = z.object({
  confidence: supplierMaterialEquivalenceConfidenceSchema.default("PENDING"),
  conversionFactor: nullableNumberSchema({
    label: "Conversion factor",
    min: 0,
  }),
  materialId: z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value : null)),
  notes: nullableStringSchema(4000, "Notes"),
  status: supplierMaterialEquivalenceStatusSchema.default("ACTIVE"),
  supplierDescription: nullableStringSchema(4000, "Supplier description"),
  supplierId: z.uuid({
    message: "Supplier is required.",
  }),
  supplierName: z.string().trim().min(1, "Supplier material name is required.").max(191),
  supplierSku: nullableStringSchema(100, "Supplier SKU"),
  supplierUnit: nullableStringSchema(50, "Supplier unit"),
});

export const createSupplierMaterialEquivalenceSchema =
  supplierMaterialEquivalenceMutationSchema;
export const updateSupplierMaterialEquivalenceSchema =
  supplierMaterialEquivalenceMutationSchema;

export const mapSupplierMaterialEquivalenceSchema = z.object({
  materialId: z.uuid({
    message: "Material is required.",
  }),
});

export const listSupplierMaterialEquivalencesQuerySchema = z.object({
  confidence: supplierMaterialEquivalenceConfidenceSchema.optional(),
  materialId: z.union([z.uuid(), z.undefined()]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["confidence", "createdAt", "status", "supplierName", "supplierSku"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: supplierMaterialEquivalenceStatusSchema.optional(),
  supplierId: z.union([z.uuid(), z.undefined()]).optional(),
});
