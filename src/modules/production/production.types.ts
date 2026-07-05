import type { z } from "zod";

import type {
  assignProductionJobSchema,
  consumeMaterialForTaskSchema,
  createProductionJobSchema,
  cuttingPlanIdParamSchema,
  generateProductionTasksSchema,
  listProductionJobsQuerySchema,
  productionJobIdParamSchema,
  productionTaskIdParamSchema,
  qualityCheckMutationSchema,
  quotationIdParamSchema,
  updateProductionJobSchema,
  updateProductionTaskSchema,
} from "./production.validators.js";

import type {
  MATERIAL_CONSUMPTION_SOURCE_TYPES,
  MATERIAL_CONSUMPTION_TYPES,
  PRODUCTION_JOB_ITEM_STATUSES,
  PRODUCTION_JOB_PRIORITIES,
  PRODUCTION_JOB_STATUSES,
  PRODUCTION_TASK_STATUSES,
  PRODUCTION_TASK_TYPES,
  QUALITY_CHECK_STATUSES,
} from "./production.constants.js";

export type ProductionJobStatus = (typeof PRODUCTION_JOB_STATUSES)[number];
export type ProductionJobPriority = (typeof PRODUCTION_JOB_PRIORITIES)[number];
export type ProductionJobItemStatus = (typeof PRODUCTION_JOB_ITEM_STATUSES)[number];
export type ProductionTaskType = (typeof PRODUCTION_TASK_TYPES)[number];
export type ProductionTaskStatus = (typeof PRODUCTION_TASK_STATUSES)[number];
export type MaterialConsumptionType = (typeof MATERIAL_CONSUMPTION_TYPES)[number];
export type MaterialConsumptionSourceType =
  (typeof MATERIAL_CONSUMPTION_SOURCE_TYPES)[number];
export type QualityCheckStatus = (typeof QUALITY_CHECK_STATUSES)[number];

export type ProductionUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type ProductionProjectSummary = {
  code: string;
  id: string;
  title: string;
} | null;

export type ProductionQuotationSummary = {
  code: string;
  id: string;
  status: string;
} | null;

export type ProductionCuttingPlanSummary = {
  code: string;
  id: string;
  sheetCount: number;
  status: string;
  wastePercent: number;
} | null;

export type ProductionWarehouseSummary = {
  code: string;
  id: string;
  name: string;
} | null;

export type ProductionMaterialSummary = {
  code: string;
  id: string;
  materialType: "LINEAR" | "PACKAGE" | "SERVICE" | "SHEET" | "UNIT";
  name: string;
} | null;

export type ProductionInventoryStockSummary = {
  batchNumber: string | null;
  condition:
    | "AVAILABLE"
    | "CONSUMED"
    | "DAMAGED"
    | "RESERVED_FIRM"
    | "RESERVED_SOFT"
    | "SCRAPPED";
  heightMm: number | null;
  id: string;
  lengthMm: number | null;
  locationCode: string | null;
  quantity: number;
  stockType: "DAMAGED" | "QUARANTINE" | "REMNANT" | "RESERVED" | "STANDARD";
  thicknessMm: number | null;
  unit: string;
  warehouse: ProductionWarehouseSummary;
  widthMm: number | null;
} | null;

export type ProductionRemnantSummary = {
  code: string;
  id: string;
  lengthMm: number | null;
  quantity: number;
  status: "AVAILABLE" | "CONSUMED" | "RESERVED" | "SCRAPPED";
  thicknessMm: number | null;
  unit: string;
  usableAreaM2: number | null;
  warehouse: ProductionWarehouseSummary;
  widthMm: number | null;
} | null;

export type ProductionJobItemRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  material: ProductionMaterialSummary;
  metadataJson: unknown;
  name: string;
  quantity: number;
  quotationItemId: string | null;
  status: ProductionJobItemStatus;
  updatedAt: string;
};

export type ProductionTaskRecord = {
  assignedToUser: ProductionUserSummary;
  completedAt: string | null;
  createdAt: string;
  description: string | null;
  id: string;
  productionJobId: string;
  productionJobItemId: string | null;
  sortOrder: number;
  startedAt: string | null;
  status: ProductionTaskStatus;
  taskType: ProductionTaskType;
  title: string;
  updatedAt: string;
};

export type MaterialConsumptionRecord = {
  consumedAt: string;
  consumedByUser: ProductionUserSummary;
  consumptionType: MaterialConsumptionType;
  createdAt: string;
  id: string;
  inventoryStock: ProductionInventoryStockSummary;
  material: ProductionMaterialSummary;
  notes: string | null;
  productionJobId: string;
  productionTaskId: string | null;
  quantity: number;
  remnantPiece: ProductionRemnantSummary;
  sourceType: MaterialConsumptionSourceType;
  unit: string;
};

export type ProductionStatusHistoryRecord = {
  changedByUser: ProductionUserSummary;
  createdAt: string;
  fromStatus: ProductionJobStatus | null;
  id: string;
  notes: string | null;
  toStatus: ProductionJobStatus;
};

export type QualityCheckRecord = {
  checkedAt: string | null;
  checkedByUser: ProductionUserSummary;
  createdAt: string;
  evidenceJson: unknown;
  id: string;
  notes: string | null;
  productionJobId: string;
  productionTaskId: string | null;
  status: QualityCheckStatus;
  updatedAt: string;
};

export type ProductionWasteReportRecord = {
  actualWasteAreaM2: number;
  actualWastePercent: number;
  createdAt: string;
  cuttingPlan: ProductionCuttingPlanSummary;
  hasActualWasteData: boolean;
  id: string;
  notes: string | null;
  productionJobId: string;
  theoreticalWasteAreaM2: number;
  theoreticalWastePercent: number;
  updatedAt: string;
  varianceAreaM2: number;
  variancePercent: number;
};

export type ProductionJobListItem = {
  actualEndDate: string | null;
  actualStartDate: string | null;
  assignedToUser: ProductionUserSummary;
  code: string;
  completedTaskCount: number;
  consumptionCount: number;
  createdAt: string;
  createdByUser: ProductionUserSummary;
  cuttingPlan: ProductionCuttingPlanSummary;
  id: string;
  itemCount: number;
  notes: string | null;
  pendingTaskCount: number;
  plannedEndDate: string | null;
  plannedStartDate: string | null;
  priority: ProductionJobPriority;
  project: ProductionProjectSummary;
  quotation: ProductionQuotationSummary;
  qualityCheckCount: number;
  status: ProductionJobStatus;
  taskCount: number;
  updatedAt: string;
  wasteReport: ProductionWasteReportRecord | null;
};

export type ProductionJobDetailRecord = ProductionJobListItem & {
  deletedAt: string | null;
  items: ProductionJobItemRecord[];
  materialConsumptions: MaterialConsumptionRecord[];
  qualityChecks: QualityCheckRecord[];
  statusHistory: ProductionStatusHistoryRecord[];
  tasks: ProductionTaskRecord[];
};

export type CreateProductionJobInput = z.infer<typeof createProductionJobSchema>;
export type UpdateProductionJobInput = z.infer<typeof updateProductionJobSchema>;
export type ListProductionJobsQuery = z.infer<typeof listProductionJobsQuerySchema>;
export type ProductionJobIdParams = z.infer<typeof productionJobIdParamSchema>;
export type ProductionTaskIdParams = z.infer<typeof productionTaskIdParamSchema>;
export type QuotationIdParams = z.infer<typeof quotationIdParamSchema>;
export type CuttingPlanIdParams = z.infer<typeof cuttingPlanIdParamSchema>;
export type AssignProductionJobInput = z.infer<typeof assignProductionJobSchema>;
export type GenerateProductionTasksInput = z.infer<
  typeof generateProductionTasksSchema
>;
export type UpdateProductionTaskInput = z.infer<typeof updateProductionTaskSchema>;
export type ConsumeMaterialForTaskInput = z.infer<
  typeof consumeMaterialForTaskSchema
>;
export type QualityCheckMutationInput = z.infer<typeof qualityCheckMutationSchema>;
