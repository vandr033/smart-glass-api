import type { z } from "zod";

import type {
  listProfileCuttingPlansQuerySchema,
  listProfileOptimizationsQuerySchema,
  profileCutInputSchema,
  profileCuttingBarSourceSchema,
  profileCuttingPlanStatusSchema,
  profileOptimizationModeSchema,
  profileOptimizationRunStatusSchema,
  profileRemnantOutputStatusSchema,
  quotationProfileOptimizationSchema,
  runProfileOptimizationSchema,
} from "./profile-optimization.validators.js";

export type ProfileOptimizationRunStatus = z.infer<
  typeof profileOptimizationRunStatusSchema
>;
export type ProfileOptimizationMode = z.infer<
  typeof profileOptimizationModeSchema
>;
export type ProfileCuttingPlanStatus = z.infer<
  typeof profileCuttingPlanStatusSchema
>;
export type ProfileCuttingBarSource = z.infer<
  typeof profileCuttingBarSourceSchema
>;
export type ProfileRemnantOutputStatus = z.infer<
  typeof profileRemnantOutputStatusSchema
>;

export type ProfileOptimizationCutInput = z.infer<typeof profileCutInputSchema>;
export type ListProfileOptimizationsQuery = z.infer<
  typeof listProfileOptimizationsQuerySchema
>;
export type RunProfileOptimizationInput = z.infer<
  typeof runProfileOptimizationSchema
>;
export type QuotationProfileOptimizationInput = z.infer<
  typeof quotationProfileOptimizationSchema
>;
export type ListProfileCuttingPlansQuery = z.infer<
  typeof listProfileCuttingPlansQuerySchema
>;

export type ProfileUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type ProfileMaterialSummary = {
  code: string;
  id: string;
  name: string;
  standardLengthMm: number | null;
};

export type ProfileQuotationSummary = {
  code: string;
  id: string;
  status: string;
} | null;

export type ProfileProjectSummary = {
  code: string;
  id: string;
  title: string;
} | null;

export type ProfileRequirementGroup = {
  cuts: ProfileOptimizationCutInput[];
  material: ProfileMaterialSummary;
  materialId: string;
  totalCuts: number;
  totalRequiredLengthMm: number;
};

export type ProfileRequirementCollection = {
  groups: ProfileRequirementGroup[];
  warnings: string[];
};

export type ProfileOptimizationBarCut = {
  cutId: string;
  label: string;
  lengthMm: number;
  materialId: string;
  metadata: unknown;
  positionMm: number;
  quotationItemId: string | null;
};

export type ProfileOptimizationBarResult = {
  cuts: ProfileOptimizationBarCut[];
  inventoryStockId: string | null;
  originalLengthMm: number;
  remnantOutput: {
    remainingLengthMm: number;
    shouldCreateRemnant: boolean;
  };
  remnantPieceId: string | null;
  sourceCode: string | null;
  sourceType: ProfileCuttingBarSource;
  usedLengthMm: number;
  wasteLengthMm: number;
  wastePercent: number;
};

export type ProfileOptimizationInventoryBarSummary = {
  batchNumber: string | null;
  id: string;
  lengthMm: number;
  locationCode: string | null;
  quantityBars: number;
};

export type ProfileOptimizationRemnantSummary = {
  code: string;
  id: string;
  lengthMm: number;
};

export type ProfileOptimizationPurchaseRequirement = {
  barLengths: Array<{
    lengthMm: number;
    quantity: number;
  }>;
  totalBars: number;
  totalLengthMm: number;
};

export type ProfileOptimizationResult = {
  availableInventoryBars: ProfileOptimizationInventoryBarSummary[];
  availableRemnants: ProfileOptimizationRemnantSummary[];
  bars: ProfileOptimizationBarResult[];
  efficiencyPercent: number;
  generatedAt: string;
  mode: ProfileOptimizationMode;
  purchaseRequirement: ProfileOptimizationPurchaseRequirement | null;
  totals: {
    inventoryLengthMm: number;
    purchasedLengthMm: number;
    remnantLengthMm: number;
    totalBarLengthMm: number;
    totalRequiredLengthMm: number;
    totalWasteLengthMm: number;
    wastePercent: number;
  };
  warnings: string[];
};

export type ProfileCutPieceRecord = {
  createdAt: string;
  cuttingBarId: string;
  id: string;
  label: string;
  lengthMm: number;
  material: ProfileMaterialSummary;
  materialId: string;
  metadataJson: unknown;
  positionMm: number;
  quantity: number;
  quotationItemId: string | null;
};

export type ProfileRemnantOutputRecord = {
  createdAt: string;
  cuttingBarId: string;
  id: string;
  material: ProfileMaterialSummary;
  materialId: string;
  remainingLengthMm: number;
  remnantPieceId: string | null;
  shouldCreateRemnant: boolean;
  status: ProfileRemnantOutputStatus;
};

export type ProfileCuttingBarRecord = {
  createdAt: string;
  cutPieces: ProfileCutPieceRecord[];
  cuttingPlanId: string;
  id: string;
  inventoryStockId: string | null;
  originalLengthMm: number;
  remnantOutputs: ProfileRemnantOutputRecord[];
  remnantPieceId: string | null;
  sortOrder: number;
  sourceType: ProfileCuttingBarSource;
  usedLengthMm: number;
  wasteLengthMm: number;
  wastePercent: number;
};

export type ProfileCuttingPlanSummary = {
  code: string;
  id: string;
  material: ProfileMaterialSummary;
  materialId: string;
  status: ProfileCuttingPlanStatus;
  totalBars: number;
  wastePercent: number;
};

export type ProfileOptimizationRunListItem = {
  code: string;
  createdAt: string;
  createdByUser: ProfileUserSummary;
  id: string;
  material: ProfileMaterialSummary;
  materialId: string;
  mode: ProfileOptimizationMode;
  project: ProfileProjectSummary;
  projectId: string | null;
  quotation: ProfileQuotationSummary;
  quotationId: string | null;
  status: ProfileOptimizationRunStatus;
  totalBarLengthMm: number;
  totalRequiredLengthMm: number;
  totalWasteLengthMm: number;
  updatedAt: string;
  wastePercent: number;
};

export type ProfileOptimizationRunRecord = ProfileOptimizationRunListItem & {
  cuttingPlans: ProfileCuttingPlanSummary[];
  inputJson: {
    cuts: ProfileOptimizationCutInput[];
    materialId: string;
    mode: ProfileOptimizationMode;
    preferRemnants: boolean;
  };
  resultJson: ProfileOptimizationResult | null;
};

export type ProfileCuttingPlanListItem = {
  code: string;
  createdAt: string;
  id: string;
  material: ProfileMaterialSummary;
  materialId: string;
  optimizationRun: Pick<
    ProfileOptimizationRunListItem,
    | "code"
    | "id"
    | "mode"
    | "project"
    | "projectId"
    | "quotation"
    | "quotationId"
    | "status"
  >;
  optimizationRunId: string;
  status: ProfileCuttingPlanStatus;
  totalBars: number;
  totalRequiredLengthMm: number;
  totalWasteLengthMm: number;
  updatedAt: string;
  wastePercent: number;
};

export type ProfileCuttingPlanRecord = ProfileCuttingPlanListItem & {
  bars: ProfileCuttingBarRecord[];
};
