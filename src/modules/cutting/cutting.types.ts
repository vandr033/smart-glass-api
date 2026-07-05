import type { z } from "zod";

import type {
  approveCuttingPlanSchema,
  cuttingOptimizationModeSchema,
  cuttingOptimizationRunStatusSchema,
  cuttingPieceInputSchema,
  cuttingPlanRemnantOutputStatusSchema,
  cuttingPlanSheetSourceSchema,
  cuttingPlanStatusSchema,
  listCuttingOptimizationsQuerySchema,
  listCuttingPlansQuerySchema,
  quotationGlassOptimizationSchema,
  runGlassOptimizationSchema,
} from "./cutting.validators.js";

export type CuttingOptimizationRunStatus = z.infer<
  typeof cuttingOptimizationRunStatusSchema
>;
export type CuttingOptimizationMode = z.infer<
  typeof cuttingOptimizationModeSchema
>;
export type CuttingPlanStatus = z.infer<typeof cuttingPlanStatusSchema>;
export type CuttingPlanSheetSource = z.infer<
  typeof cuttingPlanSheetSourceSchema
>;
export type CuttingPlanRemnantOutputStatus = z.infer<
  typeof cuttingPlanRemnantOutputStatusSchema
>;

export type CuttingOptimizationInputPiece = z.infer<
  typeof cuttingPieceInputSchema
>;

export type ListCuttingOptimizationsQuery = z.infer<
  typeof listCuttingOptimizationsQuerySchema
>;
export type RunGlassOptimizationInput = z.infer<
  typeof runGlassOptimizationSchema
>;
export type QuotationGlassOptimizationInput = z.infer<
  typeof quotationGlassOptimizationSchema
>;
export type ListCuttingPlansQuery = z.infer<typeof listCuttingPlansQuerySchema>;
export type ApproveCuttingPlanInput = z.infer<typeof approveCuttingPlanSchema>;

export type CuttingUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type CuttingMaterialSummary = {
  code: string;
  id: string;
  name: string;
  thicknessMm: number | null;
};

export type CuttingWarehouseSummary = {
  code: string;
  id: string;
  name: string;
} | null;

export type CuttingQuotationSummary = {
  code: string;
  id: string;
  status: string;
} | null;

export type CuttingProjectSummary = {
  code: string;
  id: string;
  title: string;
} | null;

export type CuttingOptimizationPiecePlacement = {
  areaM2: number;
  heightMm: number;
  label: string;
  materialId: string;
  metadata: unknown;
  pieceId: string;
  quotationItemId: string | null;
  rotated: boolean;
  widthMm: number;
  xMm: number;
  yMm: number;
};

export type CuttingOptimizationRemnantZone = {
  areaM2: number;
  heightMm: number;
  shouldCreateRemnant: boolean;
  widthMm: number;
  xMm: number;
  yMm: number;
};

export type CuttingOptimizationResultSheet = {
  heightMm: number;
  inventoryStockId: string | null;
  pieces: CuttingOptimizationPiecePlacement[];
  remnantOutputs: CuttingOptimizationRemnantZone[];
  remnantPieceId: string | null;
  sheetAreaM2: number;
  sheetSource: CuttingPlanSheetSource;
  sourceCode: string | null;
  sourceId: string | null;
  thicknessMm: number | null;
  usedAreaM2: number;
  warnings: string[];
  wasteAreaM2: number;
  wastePercent: number;
  widthMm: number;
};

export type CuttingOptimizationUnplacedPiece = {
  heightMm: number;
  label: string;
  quantity: number;
  reason: string;
  widthMm: number;
};

export type CuttingOptimizationResultGroup = {
  defaultSheetHeightMm: number;
  defaultSheetWidthMm: number;
  groupKey: string;
  materialCode: string;
  materialId: string;
  materialName: string;
  piecesRequested: number;
  sheets: CuttingOptimizationResultSheet[];
  thicknessMm: number | null;
  totals: {
    requiredAreaM2: number;
    sheetAreaM2: number;
    sheetCount: number;
    wasteAreaM2: number;
    wastePercent: number;
  };
  unplacedPieces: CuttingOptimizationUnplacedPiece[];
  warnings: string[];
};

export type CuttingOptimizationResult = {
  allowRotation: boolean;
  generatedAt: string;
  groups: CuttingOptimizationResultGroup[];
  mode: CuttingOptimizationMode;
  preferRemnants: boolean;
  totals: {
    requiredAreaM2: number;
    sheetAreaM2: number;
    sheetCount: number;
    wasteAreaM2: number;
    wastePercent: number;
  };
  warnings: string[];
};

export type GlassRequirementCollection = {
  pieces: CuttingOptimizationInputPiece[];
  warnings: string[];
};

export type CuttingPlanPieceRecord = {
  areaM2: number;
  createdAt: string;
  cuttingPlanSheetId: string;
  heightMm: number;
  id: string;
  label: string;
  material: CuttingMaterialSummary;
  materialId: string;
  metadataJson: unknown;
  quantity: number;
  quotationItemId: string | null;
  rotated: boolean;
  updatedAt: string;
  widthMm: number;
  xMm: number | null;
  yMm: number | null;
};

export type CuttingPlanRemnantOutputRecord = {
  areaM2: number;
  createdAt: string;
  cuttingPlanSheetId: string;
  heightMm: number;
  id: string;
  material: CuttingMaterialSummary;
  materialId: string;
  remnantPieceId: string | null;
  shouldCreateRemnant: boolean;
  status: CuttingPlanRemnantOutputStatus;
  thicknessMm: number | null;
  updatedAt: string;
  widthMm: number;
};

export type CuttingPlanSheetLayout = {
  heightMm: number;
  pieces: CuttingOptimizationPiecePlacement[];
  remnantOutputs: CuttingOptimizationRemnantZone[];
  warnings: string[];
  widthMm: number;
};

export type CuttingPlanSheetRecord = {
  createdAt: string;
  cuttingPlanId: string;
  heightMm: number;
  id: string;
  inventoryStockId: string | null;
  layoutJson: CuttingPlanSheetLayout;
  pieces: CuttingPlanPieceRecord[];
  remnantOutputs: CuttingPlanRemnantOutputRecord[];
  remnantPieceId: string | null;
  sheetAreaM2: number;
  sheetSource: CuttingPlanSheetSource;
  sortOrder: number;
  thicknessMm: number | null;
  updatedAt: string;
  usedAreaM2: number;
  wasteAreaM2: number;
  wastePercent: number;
  widthMm: number;
};

export type CuttingPlanSummary = {
  code: string;
  id: string;
  material: CuttingMaterialSummary;
  materialId: string;
  sheetCount: number;
  status: CuttingPlanStatus;
  wastePercent: number;
};

export type CuttingOptimizationRunListItem = {
  approvedAt: string | null;
  approvedByUser: CuttingUserSummary;
  code: string;
  createdAt: string;
  createdByUser: CuttingUserSummary;
  errorMessage: string | null;
  estimatedWasteAreaM2: number;
  id: string;
  material: CuttingMaterialSummary | null;
  materialId: string | null;
  mode: CuttingOptimizationMode;
  project: CuttingProjectSummary;
  projectId: string | null;
  quotation: CuttingQuotationSummary;
  quotationId: string | null;
  status: CuttingOptimizationRunStatus;
  totalRequiredAreaM2: number;
  totalSheetAreaM2: number;
  updatedAt: string;
  warehouse: CuttingWarehouseSummary;
  warehouseId: string | null;
  wastePercent: number;
};

export type CuttingOptimizationRunRecord = CuttingOptimizationRunListItem & {
  cuttingPlans: CuttingPlanSummary[];
  inputJson: {
    allowRotation: boolean;
    mode: CuttingOptimizationMode;
    pieces: CuttingOptimizationInputPiece[];
    preferRemnants: boolean;
  };
  resultJson: CuttingOptimizationResult | null;
};

export type CuttingPlanListItem = {
  code: string;
  createdAt: string;
  id: string;
  material: CuttingMaterialSummary;
  materialId: string;
  notes: string | null;
  optimizationRun: Pick<
    CuttingOptimizationRunListItem,
    "code" | "id" | "mode" | "quotation" | "quotationId" | "project" | "projectId" | "status"
  >;
  optimizationRunId: string;
  sheetCount: number;
  status: CuttingPlanStatus;
  totalRequiredAreaM2: number;
  totalWasteAreaM2: number;
  updatedAt: string;
  warehouse: CuttingWarehouseSummary;
  warehouseId: string | null;
  wastePercent: number;
};

export type CuttingPlanRecord = CuttingPlanListItem & {
  sheets: CuttingPlanSheetRecord[];
};
