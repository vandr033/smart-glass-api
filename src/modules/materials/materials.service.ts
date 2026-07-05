import type { Prisma } from "../../../generated/prisma/client.js";

import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";

import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import {
  applyMaterialBehaviorDefaults,
  calculateMaterialConsumptionUnit,
  convertMaterialUnit,
  getMaterialCuttingProfile,
  getMaterialRemnantRules,
  validateMaterialBehavior as validateMaterialBehaviorRules,
  type JsonLike,
  type MaterialBehaviorInput,
} from "./materials.behavior.js";
import type {
  CreateMaterialCategoryInput,
  CreateMaterialDimensionPresetInput,
  CreateMaterialInput,
  CreateSupplierMaterialEquivalenceInput,
  ListMaterialCategoriesQuery,
  ListMaterialsQuery,
  ListSupplierMaterialEquivalencesQuery,
  MapSupplierMaterialEquivalenceInput,
  MaterialCategoryRecord,
  MaterialCategorySummary,
  MaterialDetailRecord,
  MaterialDimensionPresetRecord,
  MaterialListItem,
  SupplierMaterialEquivalenceRecord,
  UpdateMaterialCategoryInput,
  UpdateMaterialDimensionPresetInput,
  UpdateMaterialInput,
  UpdateSupplierMaterialEquivalenceInput,
} from "./materials.types.js";

const materialCategoryListInclude = {
  _count: {
    select: {
      children: true,
      materials: true,
    },
  },
  parent: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.MaterialCategoryInclude;

const materialListInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.MaterialInclude;

const materialDetailInclude = {
  ...materialListInclude,
  attachments: {
    orderBy: {
      createdAt: "desc",
    },
  },
} satisfies Prisma.MaterialInclude;

const supplierMaterialEquivalenceInclude = {
  material: {
    select: {
      code: true,
      id: true,
      name: true,
    },
  },
  supplier: {
    select: {
      code: true,
      id: true,
      legalName: true,
    },
  },
} satisfies Prisma.SupplierMaterialEquivalenceInclude;

type MaterialCategoryEntity = Prisma.MaterialCategoryGetPayload<{
  include: typeof materialCategoryListInclude;
}>;

type MaterialListEntity = Prisma.MaterialGetPayload<{
  include: typeof materialListInclude;
}>;

type MaterialDetailEntity = Prisma.MaterialGetPayload<{
  include: typeof materialDetailInclude;
}>;

type SupplierMaterialEquivalenceEntity = Prisma.SupplierMaterialEquivalenceGetPayload<{
  include: typeof supplierMaterialEquivalenceInclude;
}>;

type MaterialBehaviorCompatibleRecord = Pick<
  MaterialDetailEntity,
  | "allowsRotation"
  | "baseUnit"
  | "consumptionUnit"
  | "isCuttable"
  | "isPurchasable"
  | "isRemnantEligible"
  | "isSellable"
  | "isStockable"
  | "materialType"
  | "minimumReusableHeightMm"
  | "minimumReusableLengthMm"
  | "minimumReusableWidthMm"
  | "purchaseUnit"
  | "standardHeightMm"
  | "standardLengthMm"
  | "standardWidthMm"
  | "stockUnit"
  | "thicknessMm"
  | "unitConversionJson"
>;

const decimalToNumber = (
  value: PrismaNamespace.Decimal | number | null,
): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

const toJsonLike = (value: Prisma.JsonValue | null): JsonLike | null => {
  return (value as JsonLike | null) ?? null;
};

const mapMaterialCategorySummary = (
  record: MaterialCategoryEntity["parent"],
): MaterialCategorySummary | null => {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
  };
};

const materialBehaviorFromRecord = (
  record: MaterialBehaviorCompatibleRecord,
): MaterialBehaviorInput => {
  return {
    allowsRotation: record.allowsRotation,
    baseUnit: record.baseUnit,
    consumptionUnit: record.consumptionUnit,
    isCuttable: record.isCuttable,
    isPurchasable: record.isPurchasable,
    isRemnantEligible: record.isRemnantEligible,
    isSellable: record.isSellable,
    isStockable: record.isStockable,
    materialType: record.materialType,
    minimumReusableHeightMm: decimalToNumber(record.minimumReusableHeightMm),
    minimumReusableLengthMm: decimalToNumber(record.minimumReusableLengthMm),
    minimumReusableWidthMm: decimalToNumber(record.minimumReusableWidthMm),
    purchaseUnit: record.purchaseUnit,
    standardHeightMm: decimalToNumber(record.standardHeightMm),
    standardLengthMm: decimalToNumber(record.standardLengthMm),
    standardWidthMm: decimalToNumber(record.standardWidthMm),
    stockUnit: record.stockUnit,
    thicknessMm: decimalToNumber(record.thicknessMm),
    unitConversionJson: toJsonLike(record.unitConversionJson),
  };
};

const mapMaterialCategory = (record: MaterialCategoryEntity): MaterialCategoryRecord => {
  return {
    childrenCount: record._count.children,
    createdAt: record.createdAt.toISOString(),
    description: record.description,
    id: record.id,
    isActive: record.isActive,
    materialsCount: record._count.materials,
    name: record.name,
    parent: mapMaterialCategorySummary(record.parent),
    parentId: record.parentId,
    slug: record.slug,
    sortOrder: record.sortOrder,
    updatedAt: record.updatedAt.toISOString(),
  };
};

const mapMaterialListItem = (record: MaterialListEntity): MaterialListItem => {
  return {
    allowsRotation: record.allowsRotation,
    baseUnit: record.baseUnit,
    brand: record.brand,
    category: {
      id: record.category.id,
      name: record.category.name,
      slug: record.category.slug,
    },
    categoryId: record.categoryId,
    code: record.code,
    color: record.color,
    consumptionUnit: record.consumptionUnit,
    createdAt: record.createdAt.toISOString(),
    defaultWastePercent: decimalToNumber(record.defaultWastePercent),
    description: record.description,
    finish: record.finish,
    id: record.id,
    isCuttable: record.isCuttable,
    isPurchasable: record.isPurchasable,
    isRemnantEligible: record.isRemnantEligible,
    isSellable: record.isSellable,
    isStockable: record.isStockable,
    materialType: record.materialType,
    name: record.name,
    purchaseUnit: record.purchaseUnit,
    standardLengthMm: decimalToNumber(record.standardLengthMm),
    standardWidthMm: decimalToNumber(record.standardWidthMm),
    status: record.status,
    stockUnit: record.stockUnit,
    thicknessMm: decimalToNumber(record.thicknessMm),
    updatedAt: record.updatedAt.toISOString(),
  };
};

const mapMaterialDetail = (record: MaterialDetailEntity): MaterialDetailRecord => {
  const materialBehavior = materialBehaviorFromRecord(record);
  const behaviorValidation = validateMaterialBehaviorRules(materialBehavior);

  return {
    ...mapMaterialListItem(record),
    attachments: record.attachments.map((attachment) => ({
      createdAt: attachment.createdAt.toISOString(),
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      id: attachment.id,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })),
    behaviorValidation: {
      errors: behaviorValidation.errors.map((issue) => ({
        message: issue.message,
        path: String(issue.path),
      })),
      warnings: behaviorValidation.warnings.map((issue) => ({
        message: issue.message,
        path: String(issue.path),
      })),
    },
    cuttingProfile: getMaterialCuttingProfile(materialBehavior),
    deletedAt: record.deletedAt?.toISOString() ?? null,
    minimumReusableHeightMm: decimalToNumber(record.minimumReusableHeightMm),
    minimumReusableLengthMm: decimalToNumber(record.minimumReusableLengthMm),
    minimumReusableWidthMm: decimalToNumber(record.minimumReusableWidthMm),
    notes: record.notes,
    remnantRules: getMaterialRemnantRules(materialBehavior),
    standardHeightMm: decimalToNumber(record.standardHeightMm),
    unitConversionJson: toJsonLike(record.unitConversionJson),
  };
};

const mapMaterialDimensionPreset = (
  record: {
    createdAt: Date;
    heightMm: PrismaNamespace.Decimal | null;
    id: string;
    isDefault: boolean;
    label: string;
    lengthMm: PrismaNamespace.Decimal | null;
    materialId: string;
    thicknessMm: PrismaNamespace.Decimal | null;
    updatedAt: Date;
    widthMm: PrismaNamespace.Decimal | null;
  },
): MaterialDimensionPresetRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    heightMm: decimalToNumber(record.heightMm),
    id: record.id,
    isDefault: record.isDefault,
    label: record.label,
    lengthMm: decimalToNumber(record.lengthMm),
    materialId: record.materialId,
    thicknessMm: decimalToNumber(record.thicknessMm),
    updatedAt: record.updatedAt.toISOString(),
    widthMm: decimalToNumber(record.widthMm),
  };
};

const mapSupplierMaterialEquivalence = (
  record: SupplierMaterialEquivalenceEntity,
): SupplierMaterialEquivalenceRecord => {
  return {
    confidence: record.confidence,
    conversionFactor: decimalToNumber(record.conversionFactor),
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    material: record.material
      ? {
          code: record.material.code,
          id: record.material.id,
          name: record.material.name,
        }
      : null,
    materialId: record.materialId,
    notes: record.notes,
    status: record.status,
    supplier: {
      code: record.supplier.code,
      id: record.supplier.id,
      legalName: record.supplier.legalName,
    },
    supplierDescription: record.supplierDescription,
    supplierId: record.supplierId,
    supplierName: record.supplierName,
    supplierSku: record.supplierSku,
    supplierUnit: record.supplierUnit,
    updatedAt: record.updatedAt.toISOString(),
  };
};

const buildMaterialCategoryWhereClause = (
  query: ListMaterialCategoriesQuery,
): Prisma.MaterialCategoryWhereInput => {
  return {
    ...(query.search.length > 0
      ? {
          OR: [
            {
              description: {
                contains: query.search,
              },
            },
            {
              name: {
                contains: query.search,
              },
            },
            {
              slug: {
                contains: query.search,
              },
            },
          ],
        }
      : {}),
  };
};

const buildMaterialOrderBy = (
  sortBy: ListMaterialsQuery["sortBy"],
  sortDirection: ListMaterialsQuery["sortDirection"],
): Prisma.MaterialOrderByWithRelationInput => {
  switch (sortBy) {
    case "category":
      return {
        category: {
          name: sortDirection,
        },
      };
    case "code":
      return {
        code: sortDirection,
      };
    case "createdAt":
      return {
        createdAt: sortDirection,
      };
    case "materialType":
      return {
        materialType: sortDirection,
      };
    case "name":
      return {
        name: sortDirection,
      };
  }
};

const buildMaterialsWhereClause = (
  query: ListMaterialsQuery,
): Prisma.MaterialWhereInput => {
  return {
    deletedAt: null,
    ...(query.categoryId
      ? {
          categoryId: query.categoryId,
        }
      : {}),
    ...(query.materialType
      ? {
          materialType: query.materialType,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
    ...(query.isCuttable !== undefined
      ? {
          isCuttable: query.isCuttable,
        }
      : {}),
    ...(query.isStockable !== undefined
      ? {
          isStockable: query.isStockable,
        }
      : {}),
    ...(query.isRemnantEligible !== undefined
      ? {
          isRemnantEligible: query.isRemnantEligible,
        }
      : {}),
    ...(query.search.length > 0
      ? {
          OR: [
            {
              brand: {
                contains: query.search,
              },
            },
            {
              code: {
                contains: query.search,
              },
            },
            {
              color: {
                contains: query.search,
              },
            },
            {
              description: {
                contains: query.search,
              },
            },
            {
              finish: {
                contains: query.search,
              },
            },
            {
              name: {
                contains: query.search,
              },
            },
          ],
        }
      : {}),
  };
};

const buildSupplierMaterialEquivalenceOrderBy = (
  sortBy: ListSupplierMaterialEquivalencesQuery["sortBy"],
  sortDirection: ListSupplierMaterialEquivalencesQuery["sortDirection"],
): Prisma.SupplierMaterialEquivalenceOrderByWithRelationInput => {
  switch (sortBy) {
    case "confidence":
      return {
        confidence: sortDirection,
      };
    case "createdAt":
      return {
        createdAt: sortDirection,
      };
    case "status":
      return {
        status: sortDirection,
      };
    case "supplierName":
      return {
        supplierName: sortDirection,
      };
    case "supplierSku":
      return {
        supplierSku: sortDirection,
      };
  }
};

const buildSupplierMaterialEquivalencesWhereClause = (
  query: ListSupplierMaterialEquivalencesQuery,
): Prisma.SupplierMaterialEquivalenceWhereInput => {
  return {
    ...(query.confidence
      ? {
          confidence: query.confidence,
        }
      : {}),
    ...(query.materialId
      ? {
          materialId: query.materialId,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
    ...(query.supplierId
      ? {
          supplierId: query.supplierId,
        }
      : {}),
    ...(query.search.length > 0
      ? {
          OR: [
            {
              supplierName: {
                contains: query.search,
              },
            },
            {
              supplierSku: {
                contains: query.search,
              },
            },
            {
              supplierDescription: {
                contains: query.search,
              },
            },
          ],
        }
      : {}),
  };
};

const translateUniqueConstraintError = (
  error: unknown,
  labelsByField: Record<string, string>,
): never => {
  if (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target)
      ? String(error.meta?.target[0] ?? "")
      : "";
    const label = labelsByField[target] ?? "record";

    throw new AppError(`A ${label} with the same value already exists.`, 409);
  }

  throw error;
};

const slugifyCategoryName = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 191);
};

const toMaterialJsonValue = (
  value: JsonLike | null,
): Prisma.InputJsonValue | typeof PrismaNamespace.JsonNull => {
  if (value === null) {
    return PrismaNamespace.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

const getMaterialMutationData = (
  input: CreateMaterialInput | UpdateMaterialInput,
): Prisma.MaterialUncheckedCreateInput => {
  const normalizedInput = applyMaterialBehaviorDefaults(input);

  return {
    allowsRotation: normalizedInput.allowsRotation,
    baseUnit: normalizedInput.baseUnit,
    brand: normalizedInput.brand,
    categoryId: normalizedInput.categoryId,
    code: normalizedInput.code,
    color: normalizedInput.color,
    consumptionUnit: normalizedInput.consumptionUnit,
    defaultWastePercent: normalizedInput.defaultWastePercent,
    description: normalizedInput.description,
    finish: normalizedInput.finish,
    isCuttable: normalizedInput.isCuttable,
    isPurchasable: normalizedInput.isPurchasable,
    isRemnantEligible: normalizedInput.isRemnantEligible,
    isSellable: normalizedInput.isSellable,
    isStockable: normalizedInput.isStockable,
    materialType: normalizedInput.materialType,
    minimumReusableHeightMm: normalizedInput.minimumReusableHeightMm,
    minimumReusableLengthMm: normalizedInput.minimumReusableLengthMm,
    minimumReusableWidthMm: normalizedInput.minimumReusableWidthMm,
    name: normalizedInput.name,
    notes: normalizedInput.notes,
    purchaseUnit: normalizedInput.purchaseUnit,
    standardHeightMm: normalizedInput.standardHeightMm,
    standardLengthMm: normalizedInput.standardLengthMm,
    standardWidthMm: normalizedInput.standardWidthMm,
    status: normalizedInput.status,
    stockUnit: normalizedInput.stockUnit,
    thicknessMm: normalizedInput.thicknessMm,
    unitConversionJson: toMaterialJsonValue(normalizedInput.unitConversionJson),
  };
};

const getMaterialDimensionPresetMutationData = (
  materialId: string,
  input:
    | CreateMaterialDimensionPresetInput
    | UpdateMaterialDimensionPresetInput,
): Prisma.MaterialDimensionPresetUncheckedCreateInput => {
  return {
    heightMm: input.heightMm,
    isDefault: input.isDefault,
    label: input.label,
    lengthMm: input.lengthMm,
    materialId,
    thicknessMm: input.thicknessMm,
    widthMm: input.widthMm,
  };
};

const getSupplierMaterialEquivalenceMutationData = (
  input:
    | CreateSupplierMaterialEquivalenceInput
    | UpdateSupplierMaterialEquivalenceInput,
): Prisma.SupplierMaterialEquivalenceUncheckedCreateInput => {
  return {
    confidence: input.confidence,
    conversionFactor: input.conversionFactor,
    materialId: input.materialId,
    notes: input.notes,
    status: input.status,
    supplierDescription: input.supplierDescription,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    supplierSku: input.supplierSku,
    supplierUnit: input.supplierUnit,
  };
};

const ensureMaterialCategoryExists = async (
  categoryId: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<void> => {
  const category = await db.materialCategory.findUnique({
    select: {
      id: true,
    },
    where: {
      id: categoryId,
    },
  });

  if (!category) {
    throw new AppError("Material category not found.", 404);
  }
};

const ensureSupplierExists = async (
  supplierId: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<void> => {
  const supplier = await db.supplier.findFirst({
    select: {
      id: true,
    },
    where: {
      deletedAt: null,
      id: supplierId,
    },
  });

  if (!supplier) {
    throw new AppError("Supplier not found.", 404);
  }
};

const ensureMaterialExists = async (
  materialId: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<void> => {
  const material = await db.material.findFirst({
    select: {
      id: true,
    },
    where: {
      deletedAt: null,
      id: materialId,
    },
  });

  if (!material) {
    throw new AppError("Material not found.", 404);
  }
};

const ensureMaterialCategoryParentAllowed = async (
  categoryId: string,
  parentId: string | null,
): Promise<void> => {
  if (!parentId) {
    return;
  }

  if (parentId === categoryId) {
    throw new AppError("A category cannot be its own parent.", 400);
  }

  let currentParentId: string | null = parentId;

  while (currentParentId) {
    if (currentParentId === categoryId) {
      throw new AppError("A category cannot be nested under one of its descendants.", 400);
    }

    const currentParent: {
      parentId: string | null;
    } | null = await prisma.materialCategory.findUnique({
      select: {
        parentId: true,
      },
      where: {
        id: currentParentId,
      },
    });

    if (!currentParent) {
      throw new AppError("Parent material category not found.", 404);
    }

    currentParentId = currentParent.parentId;
  }
};

const findMaterialCategoryOrThrow = async (
  id: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<MaterialCategoryEntity> => {
  const category = await db.materialCategory.findUnique({
    include: materialCategoryListInclude,
    where: {
      id,
    },
  });

  if (!category) {
    throw new AppError("Material category not found.", 404);
  }

  return category;
};

const findMaterialOrThrow = async (
  id: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<MaterialDetailEntity> => {
  const material = await db.material.findFirst({
    include: materialDetailInclude,
    where: {
      deletedAt: null,
      id,
    },
  });

  if (!material) {
    throw new AppError("Material not found.", 404);
  }

  return material;
};

const findMaterialDimensionPresetOrThrow = async (
  materialId: string,
  presetId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) => {
  const preset = await db.materialDimensionPreset.findFirst({
    where: {
      id: presetId,
      materialId,
    },
  });

  if (!preset) {
    throw new AppError("Material dimension preset not found.", 404);
  }

  return preset;
};

const findSupplierMaterialEquivalenceOrThrow = async (
  id: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<SupplierMaterialEquivalenceEntity> => {
  const record = await db.supplierMaterialEquivalence.findUnique({
    include: supplierMaterialEquivalenceInclude,
    where: {
      id,
    },
  });

  if (!record) {
    throw new AppError("Supplier material equivalence not found.", 404);
  }

  return record;
};

const syncDefaultPreset = async (
  materialId: string,
  isDefault: boolean,
  db: Prisma.TransactionClient,
): Promise<void> => {
  if (!isDefault) {
    return;
  }

  await db.materialDimensionPreset.updateMany({
    data: {
      isDefault: false,
    },
    where: {
      materialId,
    },
  });
};

export const materialsService = {
  calculateMaterialConsumptionUnit,
  convertMaterialUnit,
  getMaterialCuttingProfile,
  getMaterialRemnantRules,
  validateMaterialBehavior: validateMaterialBehaviorRules,

  async listMaterialCategories(
    query: ListMaterialCategoriesQuery,
  ): Promise<MaterialCategoryRecord[]> {
    const categories = await prisma.materialCategory.findMany({
      include: materialCategoryListInclude,
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      where: buildMaterialCategoryWhereClause(query),
    });

    return categories.map(mapMaterialCategory);
  },

  async createMaterialCategory(
    input: CreateMaterialCategoryInput,
  ): Promise<MaterialCategoryRecord> {
    try {
      if (input.parentId) {
        await ensureMaterialCategoryExists(input.parentId, prisma);
      }

      const category = await prisma.materialCategory.create({
        data: {
          description: input.description,
          isActive: input.isActive,
          name: input.name,
          parentId: input.parentId,
          slug: slugifyCategoryName(input.name),
          sortOrder: input.sortOrder,
        },
        include: materialCategoryListInclude,
      });

      return mapMaterialCategory(category);
    } catch (error) {
      translateUniqueConstraintError(error, {
        name: "material category name",
        slug: "material category slug",
      });
      throw error;
    }
  },

  async updateMaterialCategory(
    id: string,
    input: UpdateMaterialCategoryInput,
  ): Promise<{
    current: MaterialCategoryRecord;
    previous: MaterialCategoryRecord;
  }> {
    const existingCategory = await findMaterialCategoryOrThrow(id);

    if (input.parentId) {
      await ensureMaterialCategoryExists(input.parentId, prisma);
    }

    await ensureMaterialCategoryParentAllowed(id, input.parentId);

    try {
      const updatedCategory = await prisma.materialCategory.update({
        data: {
          description: input.description,
          isActive: input.isActive,
          name: input.name,
          parentId: input.parentId,
          slug: slugifyCategoryName(input.name),
          sortOrder: input.sortOrder,
        },
        include: materialCategoryListInclude,
        where: {
          id,
        },
      });

      return {
        current: mapMaterialCategory(updatedCategory),
        previous: mapMaterialCategory(existingCategory),
      };
    } catch (error) {
      translateUniqueConstraintError(error, {
        name: "material category name",
        slug: "material category slug",
      });
      throw error;
    }
  },

  async deleteMaterialCategory(id: string): Promise<MaterialCategoryRecord> {
    const existingCategory = await findMaterialCategoryOrThrow(id);

    if (existingCategory._count.children > 0) {
      throw new AppError(
        "This material category still has child categories and cannot be deleted.",
        400,
      );
    }

    if (existingCategory._count.materials > 0) {
      throw new AppError(
        "This material category still has assigned materials and cannot be deleted.",
        400,
      );
    }

    await prisma.materialCategory.delete({
      where: {
        id,
      },
    });

    return mapMaterialCategory(existingCategory);
  },

  async listMaterials(query: ListMaterialsQuery): Promise<{
    data: MaterialListItem[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
    };
  }> {
    const where = buildMaterialsWhereClause(query);
    const [total, materials] = await prisma.$transaction([
      prisma.material.count({
        where,
      }),
      prisma.material.findMany({
        include: materialListInclude,
        orderBy: buildMaterialOrderBy(query.sortBy, query.sortDirection),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    return {
      data: materials.map(mapMaterialListItem),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async getMaterialById(id: string): Promise<MaterialDetailRecord> {
    const material = await findMaterialOrThrow(id);
    return mapMaterialDetail(material);
  },

  async createMaterial(input: CreateMaterialInput): Promise<MaterialDetailRecord> {
    try {
      await ensureMaterialCategoryExists(input.categoryId, prisma);

      const createdMaterial = await prisma.material.create({
        data: getMaterialMutationData(input),
        include: materialDetailInclude,
      });

      return mapMaterialDetail(createdMaterial);
    } catch (error) {
      translateUniqueConstraintError(error, {
        code: "material code",
      });
      throw error;
    }
  },

  async updateMaterial(
    id: string,
    input: UpdateMaterialInput,
  ): Promise<{
    current: MaterialDetailRecord;
    previous: MaterialDetailRecord;
  }> {
    const existingMaterial = await findMaterialOrThrow(id);
    await ensureMaterialCategoryExists(input.categoryId, prisma);

    try {
      const updatedMaterial = await prisma.material.update({
        data: getMaterialMutationData(input),
        include: materialDetailInclude,
        where: {
          id,
        },
      });

      return {
        current: mapMaterialDetail(updatedMaterial),
        previous: mapMaterialDetail(existingMaterial),
      };
    } catch (error) {
      translateUniqueConstraintError(error, {
        code: "material code",
      });
      throw error;
    }
  },

  async deleteMaterial(id: string): Promise<MaterialDetailRecord> {
    const existingMaterial = await findMaterialOrThrow(id);

    await prisma.material.update({
      data: {
        deletedAt: new Date(),
      },
      where: {
        id,
      },
    });

    return mapMaterialDetail(existingMaterial);
  },

  async listMaterialDimensionPresets(
    materialId: string,
  ): Promise<MaterialDimensionPresetRecord[]> {
    await ensureMaterialExists(materialId, prisma);

    const presets = await prisma.materialDimensionPreset.findMany({
      orderBy: [
        {
          isDefault: "desc",
        },
        {
          label: "asc",
        },
      ],
      where: {
        materialId,
      },
    });

    return presets.map(mapMaterialDimensionPreset);
  },

  async createMaterialDimensionPreset(
    materialId: string,
    input: CreateMaterialDimensionPresetInput,
  ): Promise<MaterialDimensionPresetRecord> {
    await ensureMaterialExists(materialId, prisma);

    const preset = await prisma.$transaction(async (transaction) => {
      await syncDefaultPreset(materialId, input.isDefault, transaction);

      return transaction.materialDimensionPreset.create({
        data: getMaterialDimensionPresetMutationData(materialId, input),
      });
    });

    return mapMaterialDimensionPreset(preset);
  },

  async updateMaterialDimensionPreset(
    materialId: string,
    presetId: string,
    input: UpdateMaterialDimensionPresetInput,
  ): Promise<{
    current: MaterialDimensionPresetRecord;
    previous: MaterialDimensionPresetRecord;
  }> {
    const existingPreset = await findMaterialDimensionPresetOrThrow(
      materialId,
      presetId,
      prisma,
    );

    const updatedPreset = await prisma.$transaction(async (transaction) => {
      await syncDefaultPreset(materialId, input.isDefault, transaction);

      return transaction.materialDimensionPreset.update({
        data: getMaterialDimensionPresetMutationData(materialId, input),
        where: {
          id: presetId,
        },
      });
    });

    return {
      current: mapMaterialDimensionPreset(updatedPreset),
      previous: mapMaterialDimensionPreset(existingPreset),
    };
  },

  async deleteMaterialDimensionPreset(
    materialId: string,
    presetId: string,
  ): Promise<MaterialDimensionPresetRecord> {
    const existingPreset = await findMaterialDimensionPresetOrThrow(
      materialId,
      presetId,
      prisma,
    );

    await prisma.materialDimensionPreset.delete({
      where: {
        id: presetId,
      },
    });

    return mapMaterialDimensionPreset(existingPreset);
  },

  async listSupplierMaterialEquivalences(
    query: ListSupplierMaterialEquivalencesQuery,
  ): Promise<{
    data: SupplierMaterialEquivalenceRecord[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
    };
  }> {
    const where = buildSupplierMaterialEquivalencesWhereClause(query);
    const [total, records] = await prisma.$transaction([
      prisma.supplierMaterialEquivalence.count({
        where,
      }),
      prisma.supplierMaterialEquivalence.findMany({
        include: supplierMaterialEquivalenceInclude,
        orderBy: buildSupplierMaterialEquivalenceOrderBy(
          query.sortBy,
          query.sortDirection,
        ),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    return {
      data: records.map(mapSupplierMaterialEquivalence),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async createSupplierMaterialEquivalence(
    input: CreateSupplierMaterialEquivalenceInput,
  ): Promise<SupplierMaterialEquivalenceRecord> {
    await ensureSupplierExists(input.supplierId, prisma);

    if (input.materialId) {
      await ensureMaterialExists(input.materialId, prisma);
    }

    const record = await prisma.supplierMaterialEquivalence.create({
      data: getSupplierMaterialEquivalenceMutationData(input),
      include: supplierMaterialEquivalenceInclude,
    });

    return mapSupplierMaterialEquivalence(record);
  },

  async updateSupplierMaterialEquivalence(
    id: string,
    input: UpdateSupplierMaterialEquivalenceInput,
  ): Promise<{
    current: SupplierMaterialEquivalenceRecord;
    previous: SupplierMaterialEquivalenceRecord;
  }> {
    const existingRecord = await findSupplierMaterialEquivalenceOrThrow(id, prisma);
    await ensureSupplierExists(input.supplierId, prisma);

    if (input.materialId) {
      await ensureMaterialExists(input.materialId, prisma);
    }

    const updatedRecord = await prisma.supplierMaterialEquivalence.update({
      data: getSupplierMaterialEquivalenceMutationData(input),
      include: supplierMaterialEquivalenceInclude,
      where: {
        id,
      },
    });

    return {
      current: mapSupplierMaterialEquivalence(updatedRecord),
      previous: mapSupplierMaterialEquivalence(existingRecord),
    };
  },

  async deleteSupplierMaterialEquivalence(
    id: string,
  ): Promise<SupplierMaterialEquivalenceRecord> {
    const existingRecord = await findSupplierMaterialEquivalenceOrThrow(id, prisma);

    await prisma.supplierMaterialEquivalence.delete({
      where: {
        id,
      },
    });

    return mapSupplierMaterialEquivalence(existingRecord);
  },

  async verifySupplierMaterialEquivalence(
    id: string,
  ): Promise<{
    current: SupplierMaterialEquivalenceRecord;
    previous: SupplierMaterialEquivalenceRecord;
  }> {
    const existingRecord = await findSupplierMaterialEquivalenceOrThrow(id, prisma);

    const updatedRecord = await prisma.supplierMaterialEquivalence.update({
      data: {
        confidence: "VERIFIED",
      },
      include: supplierMaterialEquivalenceInclude,
      where: {
        id,
      },
    });

    return {
      current: mapSupplierMaterialEquivalence(updatedRecord),
      previous: mapSupplierMaterialEquivalence(existingRecord),
    };
  },

  async mapSupplierMaterialEquivalence(
    id: string,
    input: MapSupplierMaterialEquivalenceInput,
  ): Promise<{
    current: SupplierMaterialEquivalenceRecord;
    previous: SupplierMaterialEquivalenceRecord;
  }> {
    const existingRecord = await findSupplierMaterialEquivalenceOrThrow(id, prisma);
    await ensureMaterialExists(input.materialId, prisma);

    const updatedRecord = await prisma.supplierMaterialEquivalence.update({
      data: {
        materialId: input.materialId,
      },
      include: supplierMaterialEquivalenceInclude,
      where: {
        id,
      },
    });

    return {
      current: mapSupplierMaterialEquivalence(updatedRecord),
      previous: mapSupplierMaterialEquivalence(existingRecord),
    };
  },
};
