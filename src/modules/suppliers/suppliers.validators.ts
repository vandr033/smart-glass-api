import { z } from "zod";

import { integerQueryParamSchema } from "../../utils/query-schemas.js";

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const nullableStringSchema = (
  maxLength: number,
  label: string,
) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => trimOrNull(value))
    .refine((value) => value === null || value.length <= maxLength, {
      message: `${label} must be ${maxLength} characters or fewer.`,
    });

const nullableEmailSchema = (label: string) =>
  nullableStringSchema(191, label).refine(
    (value) => value === null || z.email().safeParse(value).success,
    {
      message: `${label} must be a valid email address.`,
    },
  );

const nullableUrlSchema = (label: string) =>
  nullableStringSchema(255, label).refine((value) => {
    if (value === null) {
      return true;
    }

    try {
      const parsedUrl = new URL(value);
      return ["http:", "https:"].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }, {
    message: `${label} must be a valid URL.`,
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

const uniqueSortedIds = (values: string[]) => {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
};

const uniqueContactIds = (values: Array<{ id?: string | undefined }>) => {
  const seenIds = new Set<string>();

  for (const value of values) {
    if (!value.id) {
      continue;
    }

    if (seenIds.has(value.id)) {
      return false;
    }

    seenIds.add(value.id);
  }

  return true;
};

const uniqueCriterionIds = (values: Array<{ criterionId: string }>) => {
  const seenIds = new Set<string>();

  for (const value of values) {
    if (seenIds.has(value.criterionId)) {
      return false;
    }

    seenIds.add(value.criterionId);
  }

  return true;
};

const hasOnlyOnePrimaryContact = (
  values: Array<{ isPrimary: boolean }>,
) => values.filter((value) => value.isPrimary).length <= 1;

const totalWeights = (weights: Array<{ weight: number }>) => {
  return weights.reduce((sum, weight) => sum + weight.weight, 0);
};

export const supplierStatusSchema = z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]);
export const supplierScoringScopeSchema = z.enum(["GLOBAL", "CATEGORY"]);

export const supplierIdParamSchema = z.object({
  id: z.uuid(),
});

export const supplierContactParamsSchema = z.object({
  contactId: z.uuid(),
  id: z.uuid(),
});

export const supplierCategoryIdParamSchema = z.object({
  id: z.uuid(),
});

export const supplierScoringConfigIdParamSchema = z.object({
  id: z.uuid(),
});

export const supplierContactInputSchema = z.object({
  email: nullableEmailSchema("Contact email"),
  id: z.uuid().optional(),
  isPrimary: z.boolean().default(false),
  name: z.string().trim().min(1, "Contact name is required.").max(191),
  notes: nullableStringSchema(4000, "Contact notes"),
  phone: nullableStringSchema(50, "Contact phone"),
  position: nullableStringSchema(191, "Contact position"),
  whatsapp: nullableStringSchema(50, "Contact WhatsApp"),
});

export const supplierMutationSchema = z.object({
  address: nullableStringSchema(255, "Address"),
  categoryIds: z.array(z.uuid()).default([]).transform(uniqueSortedIds),
  code: nullableStringSchema(100, "Code"),
  commercialName: nullableStringSchema(191, "Commercial name"),
  contactEmail: nullableEmailSchema("Main contact email"),
  contactName: nullableStringSchema(191, "Main contact name"),
  contactPhone: nullableStringSchema(50, "Main contact phone"),
  contactPosition: nullableStringSchema(191, "Main contact position"),
  contacts: z
    .array(supplierContactInputSchema)
    .default([])
    .refine(uniqueContactIds, {
      message: "Contacts cannot contain duplicate ids.",
    })
    .refine(hasOnlyOnePrimaryContact, {
      message: "Only one supplier contact can be marked as primary.",
    }),
  country: z.string().trim().min(1).max(100).default("Bolivia"),
  creditAvailable: z.boolean().default(false),
  creditLimit: nullableNumberSchema({
    label: "Credit limit",
    min: 0,
  }),
  defaultLeadTimeDays: nullableNumberSchema({
    integer: true,
    label: "Plazo de entrega predeterminado",
    min: 0,
  }),
  email: nullableEmailSchema("Supplier email"),
  legalName: z.string().trim().min(1, "Legal name is required.").max(191),
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
  notes: nullableStringSchema(4000, "Notes"),
  paymentTerms: nullableStringSchema(255, "Payment terms"),
  phone: nullableStringSchema(50, "Phone"),
  preferenceScore: nullableNumberSchema({
    label: "Preference score",
    max: 100,
    min: 0,
  }),
  reliabilityScore: nullableNumberSchema({
    label: "Reliability score",
    max: 100,
    min: 0,
  }),
  status: supplierStatusSchema.default("ACTIVE"),
  taxId: nullableStringSchema(100, "Tax id"),
  website: nullableUrlSchema("Website"),
  whatsapp: nullableStringSchema(50, "WhatsApp"),
  city: nullableStringSchema(100, "City"),
});

export const createSupplierSchema = supplierMutationSchema;
export const updateSupplierSchema = supplierMutationSchema;

export const listSuppliersQuerySchema = z.object({
  categoryId: z.union([z.uuid(), z.undefined()]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
  search: z.string().trim().default(""),
  sortBy: z.enum(["createdAt", "name", "reliabilityScore", "status"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: supplierStatusSchema.optional(),
});

export const createSupplierContactSchema = supplierContactInputSchema.omit({
  id: true,
});

export const updateSupplierContactSchema = supplierContactInputSchema.omit({
  id: true,
});

export const createSupplierCategorySchema = z.object({
  description: nullableStringSchema(255, "Descripción"),
  name: z.string().trim().min(1, "Category name is required.").max(191),
});

export const updateSupplierCategorySchema = createSupplierCategorySchema;

export const listSupplierCategoriesQuerySchema = z.object({
  search: z.string().trim().default(""),
});

export const supplierCategoryDeleteQuerySchema = z.object({
  force: z
    .union([z.enum(["false", "true"]), z.boolean(), z.undefined()])
    .transform((value) => {
      if (typeof value === "boolean") {
        return value;
      }

      return value === "true";
    })
    .default(false),
});

export const supplierScoringConfigWeightSchema = z.object({
  criterionId: z.uuid(),
  weight: z.coerce.number().min(0, "Weights cannot be negative.").max(100),
});

export const supplierScoringConfigMutationSchema = z
  .object({
    categoryId: z.union([z.uuid(), z.null(), z.undefined()]).transform((value) => {
      if (typeof value !== "string") {
        return null;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length > 0 ? trimmedValue : null;
    }),
    isActive: z.boolean().default(true),
    isDefault: z.boolean().default(false),
    name: z.string().trim().min(1, "Configuration name is required.").max(191),
    scope: supplierScoringScopeSchema,
    weights: z
      .array(supplierScoringConfigWeightSchema)
      .min(1, "At least one scoring weight is required.")
      .refine(uniqueCriterionIds, {
        message: "Weights cannot contain duplicate criteria.",
      }),
  })
  .superRefine((value, context) => {
    if (value.scope === "CATEGORY" && !value.categoryId) {
      context.addIssue({
        code: "custom",
        message: "categoryId is required when scope is CATEGORY.",
        path: ["categoryId"],
      });
    }

    if (value.scope === "GLOBAL" && value.categoryId !== null) {
      context.addIssue({
        code: "custom",
        message: "categoryId must be null when scope is GLOBAL.",
        path: ["categoryId"],
      });
    }

    if (value.scope === "CATEGORY" && value.isDefault) {
      context.addIssue({
        code: "custom",
        message: "Only GLOBAL scoring configs can be marked as default.",
        path: ["isDefault"],
      });
    }

    const weightTotal = totalWeights(value.weights);

    if (Math.abs(weightTotal - 100) > 0.0001) {
      context.addIssue({
        code: "custom",
        message: "Weights must total exactly 100.",
        path: ["weights"],
      });
    }
  });

export const createSupplierScoringConfigSchema = supplierScoringConfigMutationSchema;
export const updateSupplierScoringConfigSchema = supplierScoringConfigMutationSchema;

export const listSupplierScoringConfigsQuerySchema = z.object({
  isActive: z
    .union([z.enum(["false", "true"]), z.boolean(), z.undefined()])
    .transform((value) => {
      if (typeof value === "boolean") {
        return value;
      }

      if (value === undefined) {
        return undefined;
      }

      return value === "true";
    })
    .optional(),
  scope: supplierScoringScopeSchema.optional(),
});

const manualCriterionScoreSchema = nullableNumberSchema({
  label: "Manual criterion score",
  max: 100,
  min: 0,
});

export const manualSupplierScoresSchema = z.object({
  availability: manualCriterionScoreSchema.optional(),
  credit: manualCriterionScoreSchema.optional(),
  delivery_time: manualCriterionScoreSchema.optional(),
  preference: manualCriterionScoreSchema.optional(),
  price: manualCriterionScoreSchema.optional(),
  reliability: manualCriterionScoreSchema.optional(),
});

export const simulateSupplierScoringSchema = z.object({
  categoryId: z.union([z.uuid(), z.null(), z.undefined()]).transform((value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
  }),
  manualScores: z.record(z.string(), manualSupplierScoresSchema).default({}),
  supplierIds: z.array(z.uuid()).min(1).transform(uniqueSortedIds),
});
