import type { z } from "zod";

import type {
  JsonLike,
  MaterialType,
  MaterialUnit,
} from "../materials/materials.behavior.js";
import type {
  createProductTemplateSchema,
  createProductTemplateVersionSchema,
  listProductTemplateSimulationsQuerySchema,
  listProductTemplatesQuerySchema,
  simulateProductTemplateSchema,
  updateProductTemplateRulesSchema,
  updateProductTemplateSchema,
  updateProductTemplateVersionSchema,
} from "./product-templates.validators.js";
import type {
  PRODUCT_TEMPLATE_INPUT_TYPES,
  PRODUCT_TEMPLATE_LABOR_TYPES,
  PRODUCT_TEMPLATE_MATERIAL_RULE_TYPES,
  PRODUCT_TEMPLATE_STATUSES,
  PRODUCT_TEMPLATE_TYPES,
  PRODUCT_TEMPLATE_VERSION_STATUSES,
} from "./product-templates.constants.js";

export type ProductTemplateType =
  (typeof PRODUCT_TEMPLATE_TYPES)[number];

export type ProductTemplateStatus =
  (typeof PRODUCT_TEMPLATE_STATUSES)[number];

export type ProductTemplateVersionStatus =
  (typeof PRODUCT_TEMPLATE_VERSION_STATUSES)[number];

export type ProductTemplateInputType =
  (typeof PRODUCT_TEMPLATE_INPUT_TYPES)[number];

export type ProductTemplateMaterialRuleType =
  (typeof PRODUCT_TEMPLATE_MATERIAL_RULE_TYPES)[number];

export type ProductTemplateLaborType =
  (typeof PRODUCT_TEMPLATE_LABOR_TYPES)[number];

export type ProductTemplateUserSummary = {
  email: string;
  id: string;
  name: string;
};

export type ProductTemplateMaterialSummary = {
  code: string;
  consumptionUnit: MaterialUnit;
  defaultWastePercent: number | null;
  id: string;
  materialType: MaterialType;
  name: string;
  thicknessMm: number | null;
};

export type ProductTemplateValidationResult = {
  errors: string[];
  isValid: boolean;
  warnings: string[];
};

export type ProductTemplateVersionSummary = {
  activatedAt: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  notes: string | null;
  status: ProductTemplateVersionStatus;
  updatedAt: string;
  versionNumber: number;
};

export type ProductTemplateListItem = {
  code: string;
  createdAt: string;
  createdByUser: ProductTemplateUserSummary | null;
  currentVersion: ProductTemplateVersionSummary | null;
  currentVersionId: string | null;
  description: string | null;
  id: string;
  name: string;
  productType: ProductTemplateType;
  status: ProductTemplateStatus;
  updatedAt: string;
};

export type ProductTemplateInputRecord = {
  createdAt: string;
  defaultValueJson: JsonLike | null;
  id: string;
  inputType: ProductTemplateInputType;
  isRequired: boolean;
  key: string;
  label: string;
  optionsJson: JsonLike | null;
  sortOrder: number;
  unit: string | null;
  updatedAt: string;
  validationJson: JsonLike | null;
  versionId: string;
};

export type ProductTemplateMaterialRuleRecord = {
  allowRemnantUse: boolean;
  allowRotation: boolean;
  createdAt: string;
  formulaJson: JsonLike;
  id: string;
  isActive: boolean;
  label: string;
  material: ProductTemplateMaterialSummary;
  materialId: string;
  ruleType: ProductTemplateMaterialRuleType;
  sortOrder: number;
  updatedAt: string;
  versionId: string;
  wastePercent: number | null;
};

export type ProductTemplateAccessoryRuleRecord = {
  createdAt: string;
  id: string;
  isActive: boolean;
  isOptional: boolean;
  label: string;
  material: ProductTemplateMaterialSummary;
  materialId: string;
  quantityFormulaJson: JsonLike;
  sortOrder: number;
  updatedAt: string;
  versionId: string;
};

export type ProductTemplateLaborRuleRecord = {
  createdAt: string;
  formulaJson: JsonLike;
  id: string;
  isActive: boolean;
  label: string;
  laborType: ProductTemplateLaborType;
  sortOrder: number;
  unitCost: number | null;
  updatedAt: string;
  versionId: string;
};

export type ProductTemplateDetailRecord = ProductTemplateListItem & {
  deletedAt: string | null;
  versions: ProductTemplateVersionSummary[];
};

export type ProductTemplateVersionDetailRecord = {
  accessoryRules: ProductTemplateAccessoryRuleRecord[];
  activatedAt: string | null;
  calculationRulesJson: JsonLike | null;
  createdAt: string;
  createdByUser: ProductTemplateUserSummary | null;
  defaultMarginPercent: number | null;
  defaultWastePercent: number | null;
  description: string | null;
  id: string;
  inputSchemaJson: JsonLike;
  inputs: ProductTemplateInputRecord[];
  installationRulesJson: JsonLike | null;
  laborRules: ProductTemplateLaborRuleRecord[];
  laborRulesJson: JsonLike | null;
  materialRules: ProductTemplateMaterialRuleRecord[];
  name: string;
  notes: string | null;
  status: ProductTemplateVersionStatus;
  template: Pick<
    ProductTemplateListItem,
    | "code"
    | "currentVersionId"
    | "description"
    | "id"
    | "name"
    | "productType"
    | "status"
  >;
  templateId: string;
  updatedAt: string;
  validation: ProductTemplateValidationResult;
  versionNumber: number;
};

export type ProductTemplateSimulationLinearCut = {
  allowRemnantUse: boolean;
  cutPieces: Array<{
    lengthMm: number;
  }>;
  label: string;
  materialId: string;
  quantity: number;
  requiredLengthMm: number;
  wastePercent: number;
};

export type ProductTemplateSimulationSheetCut = {
  allowRotation: boolean;
  label: string;
  materialId: string;
  quantity: number;
  requiredHeightMm: number;
  requiredWidthMm: number;
  sheetPieces: Array<{
    heightMm: number;
    widthMm: number;
  }>;
  thicknessMm: number | null;
  wastePercent: number;
};

export type ProductTemplateSimulationMaterialBreakdown = {
  estimatedCost: number;
  estimatedUnitCost: number | null;
  estimatedWasteQuantity: number;
  materialCode: string;
  materialId: string;
  materialName: string;
  requiredQuantity: number;
  ruleType: ProductTemplateMaterialRuleType;
  unit: MaterialUnit | string;
  wastePercent: number;
};

export type ProductTemplateSimulationLaborBreakdown = {
  label: string;
  laborType: ProductTemplateLaborType;
  quantity: number;
  totalCost: number;
  unitCost: number;
};

export type ProductTemplateSimulationResult = {
  cuts: {
    linear: ProductTemplateSimulationLinearCut[];
    sheets: ProductTemplateSimulationSheetCut[];
  };
  inputs: Record<string, JsonLike>;
  labor: ProductTemplateSimulationLaborBreakdown[];
  laborCost: number;
  marginPercent: number;
  materials: ProductTemplateSimulationMaterialBreakdown[];
  subtotalCost: number;
  suggestedSalePrice: number;
  totalCost: number;
  warnings: string[];
  wasteCost: number;
};

export type ProductTemplateSimulationRecord = {
  createdAt: string;
  id: string;
  inputValuesJson: Record<string, JsonLike>;
  resultJson: ProductTemplateSimulationResult;
  simulatedByUser: ProductTemplateUserSummary | null;
  versionId: string;
};

export type CreateProductTemplateInput = z.infer<
  typeof createProductTemplateSchema
>;

export type UpdateProductTemplateInput = z.infer<
  typeof updateProductTemplateSchema
>;

export type ListProductTemplatesQuery = z.infer<
  typeof listProductTemplatesQuerySchema
>;

export type CreateProductTemplateVersionInput = z.infer<
  typeof createProductTemplateVersionSchema
>;

export type UpdateProductTemplateVersionInput = z.infer<
  typeof updateProductTemplateVersionSchema
>;

export type UpdateProductTemplateRulesInput = z.infer<
  typeof updateProductTemplateRulesSchema
>;

export type SimulateProductTemplateInput = z.infer<
  typeof simulateProductTemplateSchema
>;

export type ListProductTemplateSimulationsQuery = z.infer<
  typeof listProductTemplateSimulationsQuerySchema
>;
