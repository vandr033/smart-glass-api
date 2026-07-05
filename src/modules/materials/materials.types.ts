import type { z } from "zod";

import type {
  JsonLike,
  MaterialStatus,
  MaterialType,
  MaterialUnit,
  SupplierMaterialEquivalenceConfidence,
  SupplierMaterialEquivalenceStatus,
  MaterialCuttingProfile,
  MaterialRemnantRules,
} from "./materials.behavior.js";
import type {
  createMaterialCategorySchema,
  createMaterialDimensionPresetSchema,
  createMaterialSchema,
  createSupplierMaterialEquivalenceSchema,
  listMaterialCategoriesQuerySchema,
  listMaterialsQuerySchema,
  listSupplierMaterialEquivalencesQuerySchema,
  mapSupplierMaterialEquivalenceSchema,
  updateMaterialCategorySchema,
  updateMaterialDimensionPresetSchema,
  updateMaterialSchema,
  updateSupplierMaterialEquivalenceSchema,
} from "./materials.validators.js";

export type MaterialCategorySummary = {
  id: string;
  name: string;
  slug: string;
};

export type SupplierSummary = {
  code: string | null;
  id: string;
  legalName: string;
};

export type MaterialSummary = {
  code: string;
  id: string;
  name: string;
};

export type MaterialCategoryRecord = {
  childrenCount: number;
  createdAt: string;
  description: string | null;
  id: string;
  isActive: boolean;
  materialsCount: number;
  name: string;
  parent: MaterialCategorySummary | null;
  parentId: string | null;
  slug: string;
  sortOrder: number;
  updatedAt: string;
};

export type MaterialAttachmentRecord = {
  createdAt: string;
  fileName: string;
  fileUrl: string;
  id: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type MaterialDimensionPresetRecord = {
  createdAt: string;
  heightMm: number | null;
  id: string;
  isDefault: boolean;
  label: string;
  lengthMm: number | null;
  materialId: string;
  thicknessMm: number | null;
  updatedAt: string;
  widthMm: number | null;
};

export type SupplierMaterialEquivalenceRecord = {
  confidence: SupplierMaterialEquivalenceConfidence;
  conversionFactor: number | null;
  createdAt: string;
  id: string;
  material: MaterialSummary | null;
  materialId: string | null;
  notes: string | null;
  status: SupplierMaterialEquivalenceStatus;
  supplier: SupplierSummary;
  supplierDescription: string | null;
  supplierId: string;
  supplierName: string;
  supplierSku: string | null;
  supplierUnit: string | null;
  updatedAt: string;
};

export type MaterialListItem = {
  allowsRotation: boolean;
  baseUnit: MaterialUnit;
  brand: string | null;
  category: MaterialCategorySummary;
  categoryId: string;
  code: string;
  color: string | null;
  consumptionUnit: MaterialUnit;
  createdAt: string;
  defaultWastePercent: number | null;
  description: string | null;
  finish: string | null;
  id: string;
  isCuttable: boolean;
  isPurchasable: boolean;
  isRemnantEligible: boolean;
  isSellable: boolean;
  isStockable: boolean;
  materialType: MaterialType;
  name: string;
  purchaseUnit: MaterialUnit;
  standardLengthMm: number | null;
  standardWidthMm: number | null;
  status: MaterialStatus;
  stockUnit: MaterialUnit;
  thicknessMm: number | null;
  updatedAt: string;
};

export type MaterialDetailRecord = MaterialListItem & {
  attachments: MaterialAttachmentRecord[];
  behaviorValidation: {
    errors: Array<{
      message: string;
      path: string;
    }>;
    warnings: Array<{
      message: string;
      path: string;
    }>;
  };
  cuttingProfile: MaterialCuttingProfile;
  deletedAt: string | null;
  minimumReusableHeightMm: number | null;
  minimumReusableLengthMm: number | null;
  minimumReusableWidthMm: number | null;
  notes: string | null;
  remnantRules: MaterialRemnantRules;
  standardHeightMm: number | null;
  unitConversionJson: JsonLike | null;
};

export type CreateMaterialCategoryInput = z.infer<
  typeof createMaterialCategorySchema
>;
export type UpdateMaterialCategoryInput = z.infer<
  typeof updateMaterialCategorySchema
>;
export type ListMaterialCategoriesQuery = z.infer<
  typeof listMaterialCategoriesQuerySchema
>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type ListMaterialsQuery = z.infer<typeof listMaterialsQuerySchema>;
export type CreateMaterialDimensionPresetInput = z.infer<
  typeof createMaterialDimensionPresetSchema
>;
export type UpdateMaterialDimensionPresetInput = z.infer<
  typeof updateMaterialDimensionPresetSchema
>;
export type CreateSupplierMaterialEquivalenceInput = z.infer<
  typeof createSupplierMaterialEquivalenceSchema
>;
export type UpdateSupplierMaterialEquivalenceInput = z.infer<
  typeof updateSupplierMaterialEquivalenceSchema
>;
export type MapSupplierMaterialEquivalenceInput = z.infer<
  typeof mapSupplierMaterialEquivalenceSchema
>;
export type ListSupplierMaterialEquivalencesQuery = z.infer<
  typeof listSupplierMaterialEquivalencesQuerySchema
>;
