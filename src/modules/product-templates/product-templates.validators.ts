import { z } from "zod";

import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import type { JsonLike } from "../materials/materials.behavior.js";
import {
  PRODUCT_TEMPLATE_INPUT_TYPES,
  PRODUCT_TEMPLATE_LABOR_TYPES,
  PRODUCT_TEMPLATE_MATERIAL_RULE_TYPES,
  PRODUCT_TEMPLATE_STATUSES,
  PRODUCT_TEMPLATE_TYPES,
  PRODUCT_TEMPLATE_VERSION_STATUSES,
} from "./product-templates.constants.js";

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

export const productTemplateTypeSchema = z.enum(PRODUCT_TEMPLATE_TYPES);
export const productTemplateStatusSchema = z.enum(
  PRODUCT_TEMPLATE_STATUSES,
);
export const productTemplateVersionStatusSchema = z.enum(
  PRODUCT_TEMPLATE_VERSION_STATUSES,
);
export const productTemplateInputTypeSchema = z.enum(
  PRODUCT_TEMPLATE_INPUT_TYPES,
);
export const productTemplateMaterialRuleTypeSchema = z.enum(
  PRODUCT_TEMPLATE_MATERIAL_RULE_TYPES,
);
export const productTemplateLaborTypeSchema = z.enum(
  PRODUCT_TEMPLATE_LABOR_TYPES,
);

export const productTemplateIdParamSchema = z.object({
  id: z.uuid(),
});

export const productTemplateVersionIdParamSchema = z.object({
  versionId: z.uuid(),
});

export const listProductTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 12, min: 1, max: 100 }),
  productType: productTemplateTypeSchema.optional(),
  search: z.string().trim().default(""),
  sortBy: z
    .enum(["code", "createdAt", "name", "updatedAt"])
    .default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: productTemplateStatusSchema.optional(),
});

const versionCoreSchema = z.object({
  defaultMarginPercent: nullableNumberSchema({
    label: "Default margin percent",
    max: 100,
    min: 0,
  }),
  defaultWastePercent: nullableNumberSchema({
    label: "Default waste percent",
    max: 100,
    min: 0,
  }),
  description: nullableStringSchema(4000, "Description"),
  name: z.string().trim().min(1, "Version name is required.").max(191),
  notes: nullableStringSchema(4000, "Notes"),
  status: productTemplateVersionStatusSchema.default("DRAFT"),
});

export const createProductTemplateSchema = z.object({
  code: z.string().trim().min(1, "Code is required.").max(100),
  description: nullableStringSchema(4000, "Description"),
  initialVersion: versionCoreSchema.optional(),
  name: z.string().trim().min(1, "Template name is required.").max(191),
  productType: productTemplateTypeSchema,
  status: productTemplateStatusSchema.default("DRAFT"),
});

export const updateProductTemplateSchema = z.object({
  code: z.string().trim().min(1, "Code is required.").max(100),
  description: nullableStringSchema(4000, "Description"),
  name: z.string().trim().min(1, "Template name is required.").max(191),
  productType: productTemplateTypeSchema,
  status: productTemplateStatusSchema,
});

export const createProductTemplateVersionSchema = versionCoreSchema.extend({
  duplicateFromVersionId: z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value : null)),
});

export const updateProductTemplateVersionSchema = versionCoreSchema;

const productTemplateInputMutationSchema = z
  .object({
    defaultValueJson: nullableJsonLikeSchema,
    inputType: productTemplateInputTypeSchema,
    isRequired: z.boolean().default(false),
    key: z
      .string()
      .trim()
      .min(1, "Input key is required.")
      .max(100)
      .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
        message:
          "Input key must start with a letter and contain only letters, numbers, and underscores.",
      }),
    label: z.string().trim().min(1, "Input label is required.").max(191),
    optionsJson: nullableJsonLikeSchema,
    sortOrder: z.coerce.number().int().min(0).default(0),
    unit: nullableStringSchema(50, "Unit"),
    validationJson: nullableJsonLikeSchema,
  })
  .superRefine((value, context) => {
    if (value.inputType === "SELECT" && !Array.isArray(value.optionsJson)) {
      context.addIssue({
        code: "custom",
        message: "SELECT inputs require optionsJson to be an array.",
        path: ["optionsJson"],
      });
    }
  });

const productTemplateMaterialRuleMutationSchema = z.object({
  allowRemnantUse: z.boolean().default(true),
  allowRotation: z.boolean().default(false),
  formulaJson: jsonLikeSchema,
  isActive: z.boolean().default(true),
  label: z.string().trim().min(1, "Rule label is required.").max(191),
  materialId: z.uuid({
    message: "Material is required.",
  }),
  ruleType: productTemplateMaterialRuleTypeSchema,
  sortOrder: z.coerce.number().int().min(0).default(0),
  wastePercent: nullableNumberSchema({
    label: "Waste percent",
    max: 100,
    min: 0,
  }),
});

const productTemplateAccessoryRuleMutationSchema = z.object({
  isActive: z.boolean().default(true),
  isOptional: z.boolean().default(false),
  label: z.string().trim().min(1, "Accessory label is required.").max(191),
  materialId: z.uuid({
    message: "Accessory material is required.",
  }),
  quantityFormulaJson: jsonLikeSchema,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const productTemplateLaborRuleMutationSchema = z.object({
  formulaJson: jsonLikeSchema,
  isActive: z.boolean().default(true),
  label: z.string().trim().min(1, "Labor label is required.").max(191),
  laborType: productTemplateLaborTypeSchema,
  sortOrder: z.coerce.number().int().min(0).default(0),
  unitCost: nullableNumberSchema({
    label: "Unit cost",
    min: 0,
  }),
});

export const updateProductTemplateRulesSchema = z.object({
  accessoryRules: z
    .array(productTemplateAccessoryRuleMutationSchema)
    .default([]),
  inputs: z.array(productTemplateInputMutationSchema).default([]),
  laborRules: z.array(productTemplateLaborRuleMutationSchema).default([]),
  materialRules: z
    .array(productTemplateMaterialRuleMutationSchema)
    .default([]),
});

export const simulateProductTemplateSchema = z.object({
  inputValues: z.record(z.string(), jsonLikeSchema).default({}),
});

export const listProductTemplateSimulationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 20, min: 1, max: 100 }),
});
