import { randomUUID } from "node:crypto";

import type { Prisma } from "../../../generated/prisma/client.js";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";

import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { inventoryService } from "../inventory/inventory.service.js";
import type { ProductTemplateSimulationResult } from "../product-templates/product-templates.types.js";
import type {
  ApproveCuttingPlanInput,
  CuttingMaterialSummary,
  CuttingOptimizationInputPiece,
  CuttingOptimizationMode,
  CuttingOptimizationPiecePlacement,
  CuttingOptimizationRemnantZone,
  CuttingOptimizationResult,
  CuttingOptimizationResultGroup,
  CuttingOptimizationResultSheet,
  CuttingOptimizationRunListItem,
  CuttingOptimizationRunRecord,
  CuttingPlanListItem,
  CuttingPlanPieceRecord,
  CuttingPlanRecord,
  CuttingPlanRemnantOutputRecord,
  CuttingPlanSheetLayout,
  CuttingPlanSheetRecord,
  CuttingPlanSummary,
  CuttingProjectSummary,
  CuttingQuotationSummary,
  CuttingUserSummary,
  CuttingWarehouseSummary,
  GlassRequirementCollection,
  ListCuttingOptimizationsQuery,
  ListCuttingPlansQuery,
  RunGlassOptimizationInput,
} from "./cutting.types.js";
import {
  CUTTING_OPTIMIZATION_RUN_ENTITY_TYPE,
  CUTTING_PLAN_ENTITY_TYPE,
  CUTTING_PLAN_REMNANT_OUTPUT_ENTITY_TYPE,
} from "./cutting.constants.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

type CuttingSettings = {
  defaultAllowRotation: boolean;
  defaultSheetHeightMm: number;
  defaultSheetWidthMm: number;
  maxRuntimeSeconds: number;
  minimumRemnantAreaM2: number;
  preferRemnants: boolean;
};

type CuttingMaterialEntity = Prisma.MaterialGetPayload<{
  select: typeof cuttingMaterialSelect;
}>;

type CandidateSheet = {
  areaM2: number;
  code: string | null;
  heightMm: number;
  inventoryStockId: string | null;
  remnantPieceId: string | null;
  sheetSource: "INVENTORY_SHEET" | "PURCHASE_REQUIRED" | "REMNANT" | "VIRTUAL";
  sourceId: string | null;
  thicknessMm: number | null;
  widthMm: number;
};

type CandidateSearchResult = {
  candidates: CandidateSheet[];
  warnings: string[];
};

type ExpandedPiece = {
  allowRotation: boolean;
  areaM2: number;
  heightMm: number;
  label: string;
  materialId: string;
  metadata: unknown;
  pieceId: string;
  quotationItemId: string | null;
  widthMm: number;
};

type ShelfState = {
  heightMm: number;
  usedWidthMm: number;
  yMm: number;
};

type MutableSheetState = CandidateSheet & {
  pieces: CuttingOptimizationPiecePlacement[];
  shelves: ShelfState[];
  usedAreaM2: number;
  warnings: string[];
};

type PlacementOrientation = {
  heightMm: number;
  rotated: boolean;
  widthMm: number;
};

type PlacementCandidate = {
  addsShelf: boolean;
  orientation: PlacementOrientation;
  score: number;
  shelfIndex: number | null;
  xMm: number;
  yMm: number;
};

type RunGroupInput = {
  allowRotation: boolean;
  candidateSheets: CandidateSheet[];
  defaultSheetHeightMm: number;
  defaultSheetWidthMm: number;
  material: CuttingMaterialEntity;
  minimumRemnantAreaM2: number;
  mode: CuttingOptimizationMode;
  pieces: ExpandedPiece[];
  preferRemnants: boolean;
  runtimeStartedAt: number;
  runtimeSeconds: number;
  thicknessMm: number | null;
  warnings: string[];
};

type CuttingOptimizationRunEntity = Prisma.CuttingOptimizationRunGetPayload<{
  include: typeof cuttingOptimizationRunInclude;
}>;

type CuttingPlanListEntity = Prisma.CuttingPlanGetPayload<{
  include: typeof cuttingPlanListInclude;
}>;

type CuttingPlanDetailEntity = Prisma.CuttingPlanGetPayload<{
  include: typeof cuttingPlanDetailInclude;
}>;

const CUTTING_DEFAULT_SHEET_WIDTH_MM = "cutting.default_sheet_width_mm";
const CUTTING_DEFAULT_SHEET_HEIGHT_MM = "cutting.default_sheet_height_mm";
const CUTTING_DEFAULT_ALLOW_ROTATION = "cutting.default_allow_rotation";
const CUTTING_PREFER_REMNANTS = "cutting.prefer_remnants";
const CUTTING_MINIMUM_REMNANT_AREA_M2 = "cutting.minimum_remnant_area_m2";
const CUTTING_MAX_RUNTIME_SECONDS = "cutting.max_optimization_runtime_seconds";

const LEGACY_INVENTORY_PREFER_REMNANTS = "inventory.prefer_remnants_for_cutting";
const LEGACY_INVENTORY_MINIMUM_REMNANT_AREA_M2 =
  "inventory.minimum_remnant_area_m2";

const userSummarySelect = {
  email: true,
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

const materialSummarySelect = {
  code: true,
  id: true,
  name: true,
  thicknessMm: true,
} satisfies Prisma.MaterialSelect;

const warehouseSummarySelect = {
  code: true,
  id: true,
  name: true,
} satisfies Prisma.WarehouseSelect;

const cuttingMaterialSelect = {
  allowsRotation: true,
  code: true,
  consumptionUnit: true,
  dimensionPresets: {
    select: {
      heightMm: true,
      isDefault: true,
      lengthMm: true,
      thicknessMm: true,
      widthMm: true,
    },
    take: 1,
    where: {
      isDefault: true,
    },
  },
  id: true,
  isCuttable: true,
  isRemnantEligible: true,
  materialType: true,
  name: true,
  standardHeightMm: true,
  standardLengthMm: true,
  standardWidthMm: true,
  stockUnit: true,
  thicknessMm: true,
} satisfies Prisma.MaterialSelect;

const quotationSummarySelect = {
  code: true,
  id: true,
  status: true,
} satisfies Prisma.QuotationSelect;

const projectSummarySelect = {
  code: true,
  id: true,
  title: true,
} satisfies Prisma.ProjectSelect;

const candidateSheetStockSelect = {
  batchNumber: true,
  heightMm: true,
  id: true,
  lengthMm: true,
  locationCode: true,
  quantity: true,
  thicknessMm: true,
  unit: true,
  widthMm: true,
} satisfies Prisma.InventoryStockSelect;

const candidateRemnantSelect = {
  code: true,
  id: true,
  lengthMm: true,
  quantity: true,
  thicknessMm: true,
  unit: true,
  usableAreaM2: true,
  widthMm: true,
} satisfies Prisma.RemnantPieceSelect;

const cuttingOptimizationRunInclude = {
  approvedByUser: {
    select: userSummarySelect,
  },
  createdByUser: {
    select: userSummarySelect,
  },
  cuttingPlans: {
    include: {
      material: {
        select: materialSummarySelect,
      },
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  },
  material: {
    select: materialSummarySelect,
  },
  project: {
    select: projectSummarySelect,
  },
  quotation: {
    select: quotationSummarySelect,
  },
  warehouse: {
    select: warehouseSummarySelect,
  },
} satisfies Prisma.CuttingOptimizationRunInclude;

const cuttingPlanListInclude = {
  material: {
    select: materialSummarySelect,
  },
  optimizationRun: {
    include: {
      project: {
        select: projectSummarySelect,
      },
      quotation: {
        select: quotationSummarySelect,
      },
    },
  },
  warehouse: {
    select: warehouseSummarySelect,
  },
} satisfies Prisma.CuttingPlanInclude;

const cuttingPlanDetailInclude = {
  ...cuttingPlanListInclude,
  sheets: {
    include: {
      pieces: {
        include: {
          material: {
            select: materialSummarySelect,
          },
        },
        orderBy: [
          {
            createdAt: "asc",
          },
        ],
      },
      remnantOutputs: {
        include: {
          material: {
            select: materialSummarySelect,
          },
        },
        orderBy: [
          {
            createdAt: "asc",
          },
        ],
      },
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  },
} satisfies Prisma.CuttingPlanInclude;

const decimalToNumber = (
  value: PrismaNamespace.Decimal | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
};

const toIsoString = (value: Date | null): string | null => {
  return value?.toISOString() ?? null;
};

const roundTo = (value: number, decimals = 4): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const areaFromDimensions = (widthMm: number, heightMm: number): number => {
  return roundTo((widthMm * heightMm) / 1_000_000, 4);
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const asNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const toInputJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return value as Prisma.InputJsonValue;
};

const buildCode = (prefix: string): string => {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
};

const mapUserSummary = (
  record: Prisma.CuttingOptimizationRunGetPayload<{
    include: typeof cuttingOptimizationRunInclude;
  }>["createdByUser"],
): CuttingUserSummary => {
  if (!record) {
    return null;
  }

  return {
    email: record.email,
    id: record.id,
    name: record.name,
  };
};

const mapMaterialSummary = (
  record:
    | Prisma.MaterialGetPayload<{
        select: typeof materialSummarySelect;
      }>
    | null
    | undefined,
): CuttingMaterialSummary | null => {
  if (!record) {
    return null;
  }

  return {
    code: record.code,
    id: record.id,
    name: record.name,
    thicknessMm: decimalToNumber(record.thicknessMm),
  };
};

const mapWarehouseSummary = (
  record:
    | Prisma.WarehouseGetPayload<{
        select: typeof warehouseSummarySelect;
      }>
    | null
    | undefined,
): CuttingWarehouseSummary => {
  if (!record) {
    return null;
  }

  return {
    code: record.code,
    id: record.id,
    name: record.name,
  };
};

const mapQuotationSummary = (
  record:
    | Prisma.QuotationGetPayload<{
        select: typeof quotationSummarySelect;
      }>
    | null
    | undefined,
): CuttingQuotationSummary => {
  if (!record) {
    return null;
  }

  return {
    code: record.code,
    id: record.id,
    status: record.status,
  };
};

const mapProjectSummary = (
  record:
    | Prisma.ProjectGetPayload<{
        select: typeof projectSummarySelect;
      }>
    | null
    | undefined,
): CuttingProjectSummary => {
  if (!record) {
    return null;
  }

  return {
    code: record.code,
    id: record.id,
    title: record.title,
  };
};

const mapPlanSummary = (
  record: CuttingOptimizationRunEntity["cuttingPlans"][number],
): CuttingPlanSummary => {
  return {
    code: record.code,
    id: record.id,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    sheetCount: record.sheetCount,
    status: record.status,
    wastePercent: roundTo(Number(record.wastePercent), 4),
  };
};

const parseRunInputJson = (value: Prisma.JsonValue): CuttingOptimizationRunRecord["inputJson"] => {
  const record = isObjectRecord(value) ? value : {};
  const pieces = Array.isArray(record.pieces)
    ? (record.pieces as CuttingOptimizationInputPiece[])
    : [];

  return {
    allowRotation: asBoolean(record.allowRotation) ?? true,
    mode:
      record.mode === "COMMERCIAL_ESTIMATION" ||
      record.mode === "OPERATIONAL_PURCHASE"
        ? record.mode
        : "COMMERCIAL_ESTIMATION",
    pieces,
    preferRemnants: asBoolean(record.preferRemnants) ?? true,
  };
};

const parseOptimizationResultJson = (
  value: Prisma.JsonValue | null,
): CuttingOptimizationResult | null => {
  if (!value || !isObjectRecord(value)) {
    return null;
  }

  return value as unknown as CuttingOptimizationResult;
};

const parseSheetLayoutJson = (value: Prisma.JsonValue): CuttingPlanSheetLayout => {
  if (!isObjectRecord(value)) {
    return {
      heightMm: 0,
      pieces: [],
      remnantOutputs: [],
      warnings: [],
      widthMm: 0,
    };
  }

  return value as unknown as CuttingPlanSheetLayout;
};

const mapOptimizationRunListItem = (
  record: CuttingOptimizationRunEntity,
): CuttingOptimizationRunListItem => {
  return {
    approvedAt: toIsoString(record.approvedAt),
    approvedByUser: mapUserSummary(record.approvedByUser),
    code: record.code,
    createdAt: record.createdAt.toISOString(),
    createdByUser: mapUserSummary(record.createdByUser),
    errorMessage: record.errorMessage,
    estimatedWasteAreaM2: roundTo(Number(record.estimatedWasteAreaM2), 4),
    id: record.id,
    material: mapMaterialSummary(record.material),
    materialId: record.materialId,
    mode: record.mode,
    project: mapProjectSummary(record.project),
    projectId: record.projectId,
    quotation: mapQuotationSummary(record.quotation),
    quotationId: record.quotationId,
    status: record.status,
    totalRequiredAreaM2: roundTo(Number(record.totalRequiredAreaM2), 4),
    totalSheetAreaM2: roundTo(Number(record.totalSheetAreaM2), 4),
    updatedAt: record.updatedAt.toISOString(),
    warehouse: mapWarehouseSummary(record.warehouse),
    warehouseId: record.warehouseId,
    wastePercent: roundTo(Number(record.wastePercent), 4),
  };
};

const mapOptimizationRunRecord = (
  record: CuttingOptimizationRunEntity,
): CuttingOptimizationRunRecord => {
  return {
    ...mapOptimizationRunListItem(record),
    cuttingPlans: record.cuttingPlans.map(mapPlanSummary),
    inputJson: parseRunInputJson(record.inputJson),
    resultJson: parseOptimizationResultJson(record.resultJson),
  };
};

const mapCuttingPlanPiece = (
  record: CuttingPlanDetailEntity["sheets"][number]["pieces"][number],
): CuttingPlanPieceRecord => {
  return {
    areaM2: roundTo(Number(record.areaM2), 4),
    createdAt: record.createdAt.toISOString(),
    cuttingPlanSheetId: record.cuttingPlanSheetId,
    heightMm: roundTo(Number(record.heightMm), 2),
    id: record.id,
    label: record.label,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    metadataJson: record.metadataJson,
    quantity: record.quantity,
    quotationItemId: record.quotationItemId,
    rotated: record.rotated,
    updatedAt: record.updatedAt.toISOString(),
    widthMm: roundTo(Number(record.widthMm), 2),
    xMm: decimalToNumber(record.xMm),
    yMm: decimalToNumber(record.yMm),
  };
};

const mapCuttingPlanRemnantOutput = (
  record: CuttingPlanDetailEntity["sheets"][number]["remnantOutputs"][number],
): CuttingPlanRemnantOutputRecord => {
  return {
    areaM2: roundTo(Number(record.areaM2), 4),
    createdAt: record.createdAt.toISOString(),
    cuttingPlanSheetId: record.cuttingPlanSheetId,
    heightMm: roundTo(Number(record.heightMm), 2),
    id: record.id,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    remnantPieceId: record.remnantPieceId,
    shouldCreateRemnant: record.shouldCreateRemnant,
    status: record.status,
    thicknessMm: decimalToNumber(record.thicknessMm),
    updatedAt: record.updatedAt.toISOString(),
    widthMm: roundTo(Number(record.widthMm), 2),
  };
};

const mapCuttingPlanSheet = (
  record: CuttingPlanDetailEntity["sheets"][number],
): CuttingPlanSheetRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    cuttingPlanId: record.cuttingPlanId,
    heightMm: roundTo(Number(record.heightMm), 2),
    id: record.id,
    inventoryStockId: record.inventoryStockId,
    layoutJson: parseSheetLayoutJson(record.layoutJson),
    pieces: record.pieces.map(mapCuttingPlanPiece),
    remnantOutputs: record.remnantOutputs.map(mapCuttingPlanRemnantOutput),
    remnantPieceId: record.remnantPieceId,
    sheetAreaM2: roundTo(Number(record.sheetAreaM2), 4),
    sheetSource: record.sheetSource,
    sortOrder: record.sortOrder,
    thicknessMm: decimalToNumber(record.thicknessMm),
    updatedAt: record.updatedAt.toISOString(),
    usedAreaM2: roundTo(Number(record.usedAreaM2), 4),
    wasteAreaM2: roundTo(Number(record.wasteAreaM2), 4),
    wastePercent: roundTo(Number(record.wastePercent), 4),
    widthMm: roundTo(Number(record.widthMm), 2),
  };
};

const mapCuttingPlanListItem = (
  record: CuttingPlanListEntity,
): CuttingPlanListItem => {
  return {
    code: record.code,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    notes: record.notes,
    optimizationRun: {
      code: record.optimizationRun.code,
      id: record.optimizationRun.id,
      mode: record.optimizationRun.mode,
      project: mapProjectSummary(record.optimizationRun.project),
      projectId: record.optimizationRun.projectId,
      quotation: mapQuotationSummary(record.optimizationRun.quotation),
      quotationId: record.optimizationRun.quotationId,
      status: record.optimizationRun.status,
    },
    optimizationRunId: record.optimizationRunId,
    sheetCount: record.sheetCount,
    status: record.status,
    totalRequiredAreaM2: roundTo(Number(record.totalRequiredAreaM2), 4),
    totalWasteAreaM2: roundTo(Number(record.totalWasteAreaM2), 4),
    updatedAt: record.updatedAt.toISOString(),
    warehouse: mapWarehouseSummary(record.warehouse),
    warehouseId: record.warehouseId,
    wastePercent: roundTo(Number(record.wastePercent), 4),
  };
};

const mapCuttingPlanRecord = (
  record: CuttingPlanDetailEntity,
): CuttingPlanRecord => {
  return {
    ...mapCuttingPlanListItem(record),
    sheets: record.sheets.map(mapCuttingPlanSheet),
  };
};

const getSheetCountFromQuantity = (
  quantity: number,
  unit: string,
  areaM2: number,
): number => {
  if (quantity <= 0) {
    return 0;
  }

  if (unit === "M2" && areaM2 > 0) {
    return Math.max(1, Math.floor(quantity / areaM2 + 0.0001));
  }

  if (Number.isInteger(quantity)) {
    return Math.max(1, Math.floor(quantity));
  }

  return 1;
};

const sourcePriority = (
  sheetSource: CandidateSheet["sheetSource"],
  preferRemnants: boolean,
): number => {
  if (sheetSource === "REMNANT") {
    return preferRemnants ? 0 : 1;
  }

  if (sheetSource === "INVENTORY_SHEET") {
    return preferRemnants ? 1 : 0;
  }

  if (sheetSource === "PURCHASE_REQUIRED") {
    return 2;
  }

  return 3;
};

const getPieceOrientations = (
  piece: ExpandedPiece,
  allowRotation: boolean,
): PlacementOrientation[] => {
  const orientations: PlacementOrientation[] = [
    {
      heightMm: piece.heightMm,
      rotated: false,
      widthMm: piece.widthMm,
    },
  ];

  if (
    allowRotation &&
    piece.allowRotation &&
    piece.widthMm !== piece.heightMm
  ) {
    orientations.push({
      heightMm: piece.widthMm,
      rotated: true,
      widthMm: piece.heightMm,
    });
  }

  return orientations;
};

const canFitOnRectangle = (
  piece: ExpandedPiece,
  widthMm: number,
  heightMm: number,
  allowRotation: boolean,
): boolean => {
  return getPieceOrientations(piece, allowRotation).some(
    (orientation) =>
      orientation.widthMm <= widthMm && orientation.heightMm <= heightMm,
  );
};

const getSheetUsedHeight = (sheet: MutableSheetState): number => {
  return sheet.shelves.reduce((total, shelf) => total + shelf.heightMm, 0);
};

const findBestPlacement = (
  sheet: MutableSheetState,
  piece: ExpandedPiece,
  allowRotation: boolean,
): PlacementCandidate | null => {
  const candidates: PlacementCandidate[] = [];

  for (const orientation of getPieceOrientations(piece, allowRotation)) {
    sheet.shelves.forEach((shelf, shelfIndex) => {
      if (
        orientation.heightMm <= shelf.heightMm &&
        shelf.usedWidthMm + orientation.widthMm <= sheet.widthMm
      ) {
        const remainingWidth =
          sheet.widthMm - (shelf.usedWidthMm + orientation.widthMm);
        const remainingHeight = shelf.heightMm - orientation.heightMm;

        candidates.push({
          addsShelf: false,
          orientation,
          score: remainingWidth + remainingHeight,
          shelfIndex,
          xMm: shelf.usedWidthMm,
          yMm: shelf.yMm,
        });
      }
    });

    const usedHeight = getSheetUsedHeight(sheet);

    if (usedHeight + orientation.heightMm <= sheet.heightMm) {
      const remainingWidth = sheet.widthMm - orientation.widthMm;
      const remainingHeight = sheet.heightMm - (usedHeight + orientation.heightMm);

      candidates.push({
        addsShelf: true,
        orientation,
        score: remainingHeight + remainingWidth,
        shelfIndex: null,
        xMm: 0,
        yMm: usedHeight,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }

    if (left.addsShelf !== right.addsShelf) {
      return left.addsShelf ? 1 : -1;
    }

    return left.orientation.heightMm - right.orientation.heightMm;
  })[0]!;
};

const placePieceOnSheet = (
  sheet: MutableSheetState,
  piece: ExpandedPiece,
  allowRotation: boolean,
): boolean => {
  const placement = findBestPlacement(sheet, piece, allowRotation);

  if (!placement) {
    return false;
  }

  if (placement.addsShelf) {
    sheet.shelves.push({
      heightMm: placement.orientation.heightMm,
      usedWidthMm: placement.orientation.widthMm,
      yMm: placement.yMm,
    });
  } else if (placement.shelfIndex !== null) {
    sheet.shelves[placement.shelfIndex] = {
      ...sheet.shelves[placement.shelfIndex]!,
      usedWidthMm:
        sheet.shelves[placement.shelfIndex]!.usedWidthMm +
        placement.orientation.widthMm,
    };
  }

  sheet.pieces.push({
    areaM2: piece.areaM2,
    heightMm: placement.orientation.heightMm,
    label: piece.label,
    materialId: piece.materialId,
    metadata: piece.metadata,
    pieceId: piece.pieceId,
    quotationItemId: piece.quotationItemId,
    rotated: placement.orientation.rotated,
    widthMm: placement.orientation.widthMm,
    xMm: placement.xMm,
    yMm: placement.yMm,
  });
  sheet.usedAreaM2 = roundTo(sheet.usedAreaM2 + piece.areaM2, 4);

  return true;
};

const calculateSheetWaste = (sheet: {
  sheetAreaM2: number;
  usedAreaM2: number;
}) => {
  const wasteAreaM2 = roundTo(
    Math.max(sheet.sheetAreaM2 - sheet.usedAreaM2, 0),
    4,
  );
  const wastePercent =
    sheet.sheetAreaM2 > 0
      ? roundTo((wasteAreaM2 / sheet.sheetAreaM2) * 100, 4)
      : 0;

  return {
    usedAreaM2: roundTo(sheet.usedAreaM2, 4),
    wasteAreaM2,
    wastePercent,
  };
};

const buildRemnantZones = (
  sheet: MutableSheetState,
  minimumRemnantAreaM2: number,
): CuttingOptimizationRemnantZone[] => {
  const zones: CuttingOptimizationRemnantZone[] = [];

  sheet.shelves.forEach((shelf) => {
    const leftoverWidth = roundTo(sheet.widthMm - shelf.usedWidthMm, 2);

    if (leftoverWidth <= 0 || shelf.heightMm <= 0) {
      return;
    }

    const areaM2 = areaFromDimensions(leftoverWidth, shelf.heightMm);

    zones.push({
      areaM2,
      heightMm: roundTo(shelf.heightMm, 2),
      shouldCreateRemnant: areaM2 >= minimumRemnantAreaM2,
      widthMm: leftoverWidth,
      xMm: roundTo(shelf.usedWidthMm, 2),
      yMm: roundTo(shelf.yMm, 2),
    });
  });

  const usedHeight = getSheetUsedHeight(sheet);
  const leftoverHeight = roundTo(sheet.heightMm - usedHeight, 2);

  if (leftoverHeight > 0) {
    const areaM2 = areaFromDimensions(sheet.widthMm, leftoverHeight);

    zones.push({
      areaM2,
      heightMm: leftoverHeight,
      shouldCreateRemnant: areaM2 >= minimumRemnantAreaM2,
      widthMm: roundTo(sheet.widthMm, 2),
      xMm: 0,
      yMm: roundTo(usedHeight, 2),
    });
  }

  return zones;
};

const assertRuntimeLimit = (startedAt: number, maxRuntimeSeconds: number) => {
  const elapsedMs = Date.now() - startedAt;

  if (elapsedMs > maxRuntimeSeconds * 1000) {
    throw new AppError(
      `Optimization exceeded the configured runtime limit of ${maxRuntimeSeconds} seconds.`,
      408,
    );
  }
};

const buildSheetState = (candidate: CandidateSheet): MutableSheetState => {
  return {
    ...candidate,
    pieces: [],
    shelves: [],
    usedAreaM2: 0,
    warnings: [],
  };
};

const getDefaultSheetDimensions = (
  material: CuttingMaterialEntity,
  settings: CuttingSettings,
): {
  heightMm: number;
  thicknessMm: number | null;
  warnings: string[];
  widthMm: number;
} => {
  const warnings: string[] = [];
  const defaultPreset = material.dimensionPresets[0];

  const widthMm =
    decimalToNumber(material.standardWidthMm) ??
    decimalToNumber(defaultPreset?.widthMm) ??
    settings.defaultSheetWidthMm;
  const heightMm =
    decimalToNumber(material.standardHeightMm) ??
    decimalToNumber(material.standardLengthMm) ??
    decimalToNumber(defaultPreset?.heightMm) ??
    decimalToNumber(defaultPreset?.lengthMm) ??
    settings.defaultSheetHeightMm;
  const thicknessMm =
    decimalToNumber(material.thicknessMm) ??
    decimalToNumber(defaultPreset?.thicknessMm);

  if (
    decimalToNumber(material.standardWidthMm) === null &&
    decimalToNumber(defaultPreset?.widthMm) === null
  ) {
    warnings.push(
      `Material "${material.name}" is missing a configured standard sheet width. The cutting default setting was used instead.`,
    );
  }

  if (
    decimalToNumber(material.standardHeightMm) === null &&
    decimalToNumber(material.standardLengthMm) === null &&
    decimalToNumber(defaultPreset?.heightMm) === null &&
    decimalToNumber(defaultPreset?.lengthMm) === null
  ) {
    warnings.push(
      `Material "${material.name}" is missing a configured standard sheet height. The cutting default setting was used instead.`,
    );
  }

  return {
    heightMm,
    thicknessMm: thicknessMm ?? null,
    warnings,
    widthMm,
  };
};

const getCuttingSettings = async (db: DbClient): Promise<CuttingSettings> => {
  const settingKeys = [
    CUTTING_DEFAULT_SHEET_WIDTH_MM,
    CUTTING_DEFAULT_SHEET_HEIGHT_MM,
    CUTTING_DEFAULT_ALLOW_ROTATION,
    CUTTING_PREFER_REMNANTS,
    CUTTING_MINIMUM_REMNANT_AREA_M2,
    CUTTING_MAX_RUNTIME_SECONDS,
    LEGACY_INVENTORY_PREFER_REMNANTS,
    LEGACY_INVENTORY_MINIMUM_REMNANT_AREA_M2,
  ];
  const settings = await db.systemSetting.findMany({
    where: {
      key: {
        in: settingKeys,
      },
    },
  });

  const byKey = new Map(settings.map((setting) => [setting.key, setting.valueJson]));

  const readNumber = (key: string, fallback: number, legacyKey?: string): number => {
    const primary = byKey.get(key);
    const raw = primary ?? (legacyKey ? byKey.get(legacyKey) : undefined);
    const value = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const readBoolean = (
    key: string,
    fallback: boolean,
    legacyKey?: string,
  ): boolean => {
    const primary = byKey.get(key);
    const raw = primary ?? (legacyKey ? byKey.get(legacyKey) : undefined);

    if (typeof raw === "boolean") {
      return raw;
    }

    if (typeof raw === "string") {
      if (raw === "true") {
        return true;
      }

      if (raw === "false") {
        return false;
      }
    }

    return fallback;
  };

  return {
    defaultAllowRotation: readBoolean(
      CUTTING_DEFAULT_ALLOW_ROTATION,
      true,
    ),
    defaultSheetHeightMm: readNumber(
      CUTTING_DEFAULT_SHEET_HEIGHT_MM,
      2250,
    ),
    defaultSheetWidthMm: readNumber(
      CUTTING_DEFAULT_SHEET_WIDTH_MM,
      3210,
    ),
    maxRuntimeSeconds: readNumber(CUTTING_MAX_RUNTIME_SECONDS, 10),
    minimumRemnantAreaM2: readNumber(
      CUTTING_MINIMUM_REMNANT_AREA_M2,
      0.1,
      LEGACY_INVENTORY_MINIMUM_REMNANT_AREA_M2,
    ),
    preferRemnants: readBoolean(
      CUTTING_PREFER_REMNANTS,
      true,
      LEGACY_INVENTORY_PREFER_REMNANTS,
    ),
  };
};

const getMaterialMapOrThrow = async (
  db: DbClient,
  materialIds: string[],
): Promise<Map<string, CuttingMaterialEntity>> => {
  const materials = await db.material.findMany({
    select: cuttingMaterialSelect,
    where: {
      deletedAt: null,
      id: {
        in: materialIds,
      },
    },
  });

  const materialMap = new Map(materials.map((material) => [material.id, material]));
  const missingMaterialId = materialIds.find((materialId) => !materialMap.has(materialId));

  if (missingMaterialId) {
    throw new AppError(`Material ${missingMaterialId} was not found.`, 404);
  }

  materialMap.forEach((material) => {
    if (material.materialType !== "SHEET") {
      throw new AppError(
        `Material "${material.name}" is not a sheet material and cannot be optimized here.`,
        400,
      );
    }

    if (!material.isCuttable) {
      throw new AppError(
        `Material "${material.name}" is not marked as cuttable.`,
        400,
      );
    }
  });

  return materialMap;
};

const buildExpandedPieces = (
  pieces: CuttingOptimizationInputPiece[],
  materialMap: Map<string, CuttingMaterialEntity>,
  allowRotation: boolean,
): Map<string, { material: CuttingMaterialEntity; pieces: ExpandedPiece[]; thicknessMm: number | null }> => {
  const groups = new Map<
    string,
    { material: CuttingMaterialEntity; pieces: ExpandedPiece[]; thicknessMm: number | null }
  >();

  pieces.forEach((piece) => {
    const material = materialMap.get(piece.materialId);

    if (!material) {
      return;
    }

    const resolvedThickness =
      piece.thicknessMm ?? decimalToNumber(material.thicknessMm);
    const groupKey = `${piece.materialId}:${resolvedThickness ?? "none"}`;
    const group = groups.get(groupKey) ?? {
      material,
      pieces: [],
      thicknessMm: resolvedThickness ?? null,
    };

    for (let index = 0; index < piece.quantity; index += 1) {
      group.pieces.push({
        allowRotation:
          allowRotation &&
          material.allowsRotation &&
          (piece.allowRotation ?? true),
        areaM2: areaFromDimensions(piece.widthMm, piece.heightMm),
        heightMm: piece.heightMm,
        label:
          piece.quantity > 1 ? `${piece.label} (${index + 1}/${piece.quantity})` : piece.label,
        materialId: piece.materialId,
        metadata: piece.metadata,
        pieceId: randomUUID(),
        quotationItemId: piece.quotationItemId,
        widthMm: piece.widthMm,
      });
    }

    groups.set(groupKey, group);
  });

  return groups;
};

const collectPiecesFromSimulationResult = (
  simulationResult: ProductTemplateSimulationResult,
  options?: {
    labelPrefix?: string;
    metadata?: Record<string, unknown>;
    quotationItemId?: string | null;
    repeatCount?: number;
  },
): GlassRequirementCollection => {
  const pieces: CuttingOptimizationInputPiece[] = [];
  const warnings: string[] = [];
  const repeatCount = options?.repeatCount ?? 1;

  simulationResult.cuts.sheets.forEach((sheetCut, sheetCutIndex) => {
    const pieceTemplates =
      sheetCut.sheetPieces.length > 0
        ? sheetCut.sheetPieces
        : Array.from({ length: sheetCut.quantity }, () => ({
            heightMm: sheetCut.requiredHeightMm,
            widthMm: sheetCut.requiredWidthMm,
          }));

    if (pieceTemplates.length === 0) {
      warnings.push(
        `Sheet cut "${sheetCut.label}" did not provide any piece geometry and was skipped.`,
      );
      return;
    }

    for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
      pieceTemplates.forEach((pieceTemplate, pieceIndex) => {
        pieces.push({
          allowRotation: sheetCut.allowRotation,
          heightMm: pieceTemplate.heightMm,
          label: `${options?.labelPrefix ? `${options.labelPrefix} - ` : ""}${sheetCut.label} #${pieceIndex + 1}${repeatCount > 1 ? ` / item ${repeatIndex + 1}` : ""}`,
          materialId: sheetCut.materialId,
          metadata: {
            ...options?.metadata,
            sheetCutIndex,
            sheetCutLabel: sheetCut.label,
            simulationPieceIndex: pieceIndex,
          },
          quotationItemId: options?.quotationItemId ?? null,
          quantity: 1,
          thicknessMm: sheetCut.thicknessMm,
          widthMm: pieceTemplate.widthMm,
        });
      });
    }
  });

  return {
    pieces,
    warnings,
  };
};

const sortPiecesByArea = (pieces: ExpandedPiece[]): ExpandedPiece[] => {
  return [...pieces].sort((left, right) => {
    if (right.areaM2 !== left.areaM2) {
      return right.areaM2 - left.areaM2;
    }

    if (right.heightMm !== left.heightMm) {
      return right.heightMm - left.heightMm;
    }

    return right.widthMm - left.widthMm;
  });
};

const optimizeGroup = (input: RunGroupInput): CuttingOptimizationResultGroup => {
  const mutableSheets = input.candidateSheets
    .map(buildSheetState)
    .sort((left, right) => {
      const priorityDelta =
        sourcePriority(left.sheetSource, input.preferRemnants) -
        sourcePriority(right.sheetSource, input.preferRemnants);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.areaM2 - right.areaM2;
    });
  const groupWarnings = [...input.warnings];
  const unplacedPieces: CuttingOptimizationResultGroup["unplacedPieces"] = [];
  let generatedSheetCounter = 0;

  const sortedPieces = sortPiecesByArea(input.pieces);

  for (const piece of sortedPieces) {
    assertRuntimeLimit(input.runtimeStartedAt, input.runtimeSeconds);

    let placed = false;
    const orderedSheets = [...mutableSheets].sort((left, right) => {
      const priorityDelta =
        sourcePriority(left.sheetSource, input.preferRemnants) -
        sourcePriority(right.sheetSource, input.preferRemnants);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      if (left.areaM2 !== right.areaM2) {
        return left.areaM2 - right.areaM2;
      }

      return left.usedAreaM2 - right.usedAreaM2;
    });

    for (const sheet of orderedSheets) {
      if (placePieceOnSheet(sheet, piece, input.allowRotation)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (
        !canFitOnRectangle(
          piece,
          input.defaultSheetWidthMm,
          input.defaultSheetHeightMm,
          input.allowRotation,
        )
      ) {
        unplacedPieces.push({
          heightMm: piece.heightMm,
          label: piece.label,
          quantity: 1,
          reason:
            "The piece exceeds the configured default or material sheet dimensions even after considering rotation.",
          widthMm: piece.widthMm,
        });
        continue;
      }

      generatedSheetCounter += 1;
      const virtualSheet = buildSheetState({
        areaM2: areaFromDimensions(
          input.defaultSheetWidthMm,
          input.defaultSheetHeightMm,
        ),
        code:
          input.mode === "COMMERCIAL_ESTIMATION"
            ? `VIRTUAL-${generatedSheetCounter}`
            : `PURCHASE-${generatedSheetCounter}`,
        heightMm: input.defaultSheetHeightMm,
        inventoryStockId: null,
        remnantPieceId: null,
        sheetSource:
          input.mode === "COMMERCIAL_ESTIMATION" ? "VIRTUAL" : "PURCHASE_REQUIRED",
        sourceId: null,
        thicknessMm: input.thicknessMm,
        widthMm: input.defaultSheetWidthMm,
      });

      if (!placePieceOnSheet(virtualSheet, piece, input.allowRotation)) {
        unplacedPieces.push({
          heightMm: piece.heightMm,
          label: piece.label,
          quantity: 1,
          reason:
            "The piece could not be placed even after provisioning a new virtual sheet.",
          widthMm: piece.widthMm,
        });
        continue;
      }

      mutableSheets.push(virtualSheet);
    }
  }

  const resultSheets = mutableSheets
    .filter((sheet) => sheet.pieces.length > 0)
    .map<CuttingOptimizationResultSheet>((sheet) => {
      const waste = calculateSheetWaste({
        sheetAreaM2: sheet.areaM2,
        usedAreaM2: sheet.usedAreaM2,
      });

      return {
        heightMm: roundTo(sheet.heightMm, 2),
        inventoryStockId: sheet.inventoryStockId,
        pieces: sheet.pieces,
        remnantOutputs: buildRemnantZones(sheet, input.minimumRemnantAreaM2),
        remnantPieceId: sheet.remnantPieceId,
        sheetAreaM2: sheet.areaM2,
        sheetSource: sheet.sheetSource,
        sourceCode: sheet.code,
        sourceId: sheet.sourceId,
        thicknessMm: sheet.thicknessMm,
        usedAreaM2: waste.usedAreaM2,
        warnings: sheet.warnings,
        wasteAreaM2: waste.wasteAreaM2,
        wastePercent: waste.wastePercent,
        widthMm: roundTo(sheet.widthMm, 2),
      };
    });
  const requiredAreaM2 = roundTo(
    input.pieces.reduce((total, piece) => total + piece.areaM2, 0),
    4,
  );
  const sheetAreaM2 = roundTo(
    resultSheets.reduce((total, sheet) => total + sheet.sheetAreaM2, 0),
    4,
  );
  const wasteAreaM2 = roundTo(
    resultSheets.reduce((total, sheet) => total + sheet.wasteAreaM2, 0),
    4,
  );
  const wastePercent =
    sheetAreaM2 > 0 ? roundTo((wasteAreaM2 / sheetAreaM2) * 100, 4) : 0;

  if (unplacedPieces.length > 0) {
    groupWarnings.push(
      `${unplacedPieces.length} piece(s) could not be placed for material "${input.material.name}".`,
    );
  }

  return {
    defaultSheetHeightMm: roundTo(input.defaultSheetHeightMm, 2),
    defaultSheetWidthMm: roundTo(input.defaultSheetWidthMm, 2),
    groupKey: `${input.material.id}:${input.thicknessMm ?? "none"}`,
    materialCode: input.material.code,
    materialId: input.material.id,
    materialName: input.material.name,
    piecesRequested: input.pieces.length,
    sheets: resultSheets,
    thicknessMm: input.thicknessMm,
    totals: {
      requiredAreaM2,
      sheetAreaM2,
      sheetCount: resultSheets.length,
      wasteAreaM2,
      wastePercent,
    },
    unplacedPieces,
    warnings: groupWarnings,
  };
};

const findCandidateSheetsWithWarnings = async (
  db: DbClient,
  materialId: string,
  warehouseId: string | null,
  requiredPieces: CuttingOptimizationInputPiece[],
): Promise<CandidateSearchResult> => {
  if (!warehouseId) {
    return {
      candidates: [],
      warnings: [
        "No warehouse was provided, so inventory sheet candidates were skipped.",
      ],
    };
  }

  const records = await db.inventoryStock.findMany({
    select: candidateSheetStockSelect,
    where: {
      condition: {
        in: ["AVAILABLE", "RESERVED_SOFT"],
      },
      deletedAt: null,
      materialId,
      stockType: "STANDARD",
      warehouseId,
    },
  });
  const warnings: string[] = [];
  const candidates: CandidateSheet[] = [];

  records.forEach((record) => {
    const widthMm = decimalToNumber(record.widthMm);
    const heightMm = decimalToNumber(record.heightMm) ?? decimalToNumber(record.lengthMm);
    const thicknessMm = decimalToNumber(record.thicknessMm);

    if (widthMm === null || heightMm === null) {
      warnings.push(
        `Inventory stock ${record.id} is missing width or height and was ignored for cutting optimization.`,
      );
      return;
    }

    const baseCandidate: CandidateSheet = {
      areaM2: areaFromDimensions(widthMm, heightMm),
      code: record.locationCode ?? record.batchNumber ?? record.id,
      heightMm,
      inventoryStockId: record.id,
      remnantPieceId: null,
      sheetSource: "INVENTORY_SHEET",
      sourceId: record.id,
      thicknessMm,
      widthMm,
    };

    if (
      !requiredPieces.some((piece) =>
        canFitOnRectangle(
          {
            allowRotation: piece.allowRotation ?? true,
            areaM2: areaFromDimensions(piece.widthMm, piece.heightMm),
            heightMm: piece.heightMm,
            label: piece.label,
            materialId: piece.materialId,
            metadata: piece.metadata,
            pieceId: record.id,
            quotationItemId: piece.quotationItemId,
            widthMm: piece.widthMm,
          },
          widthMm,
          heightMm,
          true,
        ),
      )
    ) {
      return;
    }

    const quantity = Number(record.quantity);
    const copies = getSheetCountFromQuantity(quantity, record.unit, baseCandidate.areaM2);

    for (let index = 0; index < copies; index += 1) {
      candidates.push({
        ...baseCandidate,
        sourceId: `${record.id}:${index + 1}`,
      });
    }
  });

  return {
    candidates,
    warnings,
  };
};

const findCandidateRemnantsWithWarnings = async (
  db: DbClient,
  materialId: string,
  warehouseId: string | null,
  requiredPieces: CuttingOptimizationInputPiece[],
): Promise<CandidateSearchResult> => {
  if (!warehouseId) {
    return {
      candidates: [],
      warnings: [
        "No warehouse was provided, so remnant candidates were skipped.",
      ],
    };
  }

  const records = await db.remnantPiece.findMany({
    select: candidateRemnantSelect,
    where: {
      materialId,
      status: "AVAILABLE",
      warehouseId,
    },
  });
  const warnings: string[] = [];
  const candidates: CandidateSheet[] = [];

  records.forEach((record) => {
    const widthMm = decimalToNumber(record.widthMm);
    const heightMm = decimalToNumber(record.lengthMm);
    const thicknessMm = decimalToNumber(record.thicknessMm);
    const areaM2 = decimalToNumber(record.usableAreaM2);

    if (widthMm === null || heightMm === null) {
      warnings.push(
        `Remnant ${record.code} is missing width or length and was ignored for cutting optimization.`,
      );
      return;
    }

    const baseCandidate: CandidateSheet = {
      areaM2: areaM2 ?? areaFromDimensions(widthMm, heightMm),
      code: record.code,
      heightMm,
      inventoryStockId: null,
      remnantPieceId: record.id,
      sheetSource: "REMNANT",
      sourceId: record.id,
      thicknessMm,
      widthMm,
    };

    if (
      !requiredPieces.some((piece) =>
        canFitOnRectangle(
          {
            allowRotation: piece.allowRotation ?? true,
            areaM2: areaFromDimensions(piece.widthMm, piece.heightMm),
            heightMm: piece.heightMm,
            label: piece.label,
            materialId: piece.materialId,
            metadata: piece.metadata,
            pieceId: record.id,
            quotationItemId: piece.quotationItemId,
            widthMm: piece.widthMm,
          },
          widthMm,
          heightMm,
          true,
        ),
      )
    ) {
      return;
    }

    candidates.push(baseCandidate);
  });

  return {
    candidates,
    warnings,
  };
};

const getOptimizationRunOrThrow = async (
  db: DbClient,
  runId: string,
): Promise<CuttingOptimizationRunEntity> => {
  const run = await db.cuttingOptimizationRun.findUnique({
    include: cuttingOptimizationRunInclude,
    where: {
      id: runId,
    },
  });

  if (!run) {
    throw new AppError("Cutting optimization run not found.", 404);
  }

  return run;
};

const getCuttingPlanOrThrow = async (
  db: DbClient,
  cuttingPlanId: string,
): Promise<CuttingPlanDetailEntity> => {
  const plan = await db.cuttingPlan.findUnique({
    include: cuttingPlanDetailInclude,
    where: {
      id: cuttingPlanId,
    },
  });

  if (!plan) {
    throw new AppError("Cutting plan not found.", 404);
  }

  return plan;
};

const auditCuttingAction = async (input: {
  action: string;
  actorUserId: string | null;
  after: unknown;
  before: unknown;
  entityId: string;
  entityType: string;
  metadata?: unknown;
}) => {
  await auditLogService.create({
    action: input.action,
    actorUserId: input.actorUserId,
    after: input.after,
    before: input.before,
    entityId: input.entityId,
    entityType: input.entityType,
    metadata: input.metadata,
  });
};

export const cuttingService = {
  async collectGlassRequirementsFromQuotation(
    quotationId: string,
  ): Promise<GlassRequirementCollection> {
    const quotation = await prisma.quotation.findUnique({
      select: {
        code: true,
        id: true,
        items: {
          select: {
            calculationResultJson: true,
            id: true,
            itemType: true,
            materials: {
              select: {
                materialId: true,
              },
            },
            name: true,
            quantity: true,
          },
          where: {
            quotationVersionId: null,
          },
        },
      },
      where: {
        id: quotationId,
      },
    });

    if (!quotation) {
      throw new AppError("Quotation not found.", 404);
    }

    const warnings: string[] = [];
    const pieces: CuttingOptimizationInputPiece[] = [];
    const manualMaterialIds = Array.from(
      new Set(
        quotation.items.flatMap((item) =>
          item.itemType === "MANUAL_MATERIAL"
            ? item.materials
                .map((material) => material.materialId)
                .filter((materialId): materialId is string => Boolean(materialId))
            : [],
        ),
      ),
    );
    const manualMaterialTypes = new Map(
      (
        await prisma.material.findMany({
          select: {
            id: true,
            materialType: true,
            name: true,
          },
          where: {
            id: {
              in: manualMaterialIds,
            },
          },
        })
      ).map((material) => [material.id, material]),
    );

    quotation.items.forEach((item) => {
      const calculationContainer = isObjectRecord(item.calculationResultJson)
        ? item.calculationResultJson
        : null;
      const requestedQuantity =
        asNumber(calculationContainer?.requestedQuantity) ??
        Number(item.quantity);
      const repeatCount = Math.max(1, Math.round(requestedQuantity));

      if (
        calculationContainer?.kind === "template_simulation" &&
        isObjectRecord(calculationContainer.result)
      ) {
        const result = calculationContainer.result as ProductTemplateSimulationResult;
        const collection = collectPiecesFromSimulationResult(result, {
          labelPrefix: item.name,
          metadata: {
            quotationCode: quotation.code,
          },
          quotationItemId: item.id,
          repeatCount,
        });

        pieces.push(...collection.pieces);
        warnings.push(...collection.warnings);
        return;
      }

      if (item.itemType === "MANUAL_MATERIAL") {
        const sheetMaterial = item.materials
          .map((material) =>
            material.materialId ? manualMaterialTypes.get(material.materialId) : null,
          )
          .find((material) => material?.materialType === "SHEET");

        if (sheetMaterial) {
          warnings.push(
            `Manual quotation item "${item.name}" references sheet material "${sheetMaterial.name}" but does not include cut-piece dimensions, so it was skipped.`,
          );
        }
      }
    });

    return {
      pieces,
      warnings,
    };
  },

  collectGlassRequirementsFromTemplateSimulation(
    simulationResult: ProductTemplateSimulationResult,
  ): GlassRequirementCollection {
    return collectPiecesFromSimulationResult(simulationResult);
  },

  async findCandidateSheets(
    materialId: string,
    warehouseId: string | null,
    requiredPieces: CuttingOptimizationInputPiece[],
  ) {
    const result = await findCandidateSheetsWithWarnings(
      prisma,
      materialId,
      warehouseId,
      requiredPieces,
    );

    return result.candidates;
  },

  async findCandidateRemnants(
    materialId: string,
    warehouseId: string | null,
    requiredPieces: CuttingOptimizationInputPiece[],
  ) {
    const result = await findCandidateRemnantsWithWarnings(
      prisma,
      materialId,
      warehouseId,
      requiredPieces,
    );

    return result.candidates;
  },

  calculateSheetWaste,

  async runGlassOptimization(
    input: RunGlassOptimizationInput,
    userId: string | null,
  ): Promise<CuttingOptimizationRunRecord> {
    const settings = await getCuttingSettings(prisma);
    const allowRotation = input.allowRotation ?? settings.defaultAllowRotation;
    const preferRemnants = input.preferRemnants ?? settings.preferRemnants;
    const normalizedInput = {
      allowRotation,
      mode: input.mode,
      pieces: input.pieces,
      preferRemnants,
    };
    const run = await prisma.cuttingOptimizationRun.create({
      data: {
        code: buildCode("COPT"),
        createdByUserId: userId,
        inputJson: toInputJsonValue(normalizedInput),
        materialId: input.materialId,
        mode: input.mode,
        projectId: input.projectId,
        quotationId: input.quotationId,
        status: "RUNNING",
        warehouseId: input.warehouseId,
      },
      include: cuttingOptimizationRunInclude,
    });

    await auditCuttingAction({
      action: "cutting.optimization_run.created",
      actorUserId: userId,
      after: mapOptimizationRunRecord(run),
      before: null,
      entityId: run.id,
      entityType: CUTTING_OPTIMIZATION_RUN_ENTITY_TYPE,
      metadata: {
        code: run.code,
      },
    });

    try {
      const materialIds = Array.from(
        new Set(input.pieces.map((piece) => piece.materialId)),
      );

      if (input.materialId && materialIds.some((materialId) => materialId !== input.materialId)) {
        throw new AppError(
          "All optimized pieces must match the selected material when materialId is provided.",
          400,
        );
      }

      const materialMap = await getMaterialMapOrThrow(prisma, materialIds);
      const groupedPieces = buildExpandedPieces(
        input.pieces,
        materialMap,
        allowRotation,
      );
      const warnings: string[] = [];
      const groups: CuttingOptimizationResultGroup[] = [];
      const runtimeStartedAt = Date.now();

      if (input.mode === "OPERATIONAL_PURCHASE" && !input.warehouseId) {
        warnings.push(
          "Operational purchase mode was executed without a warehouse, so inventory and remnant candidates were skipped.",
        );
      }

      for (const [, group] of groupedPieces) {
        assertRuntimeLimit(runtimeStartedAt, settings.maxRuntimeSeconds);
        const defaultSheet = getDefaultSheetDimensions(group.material, settings);
        const piecesForCandidateSearch = input.pieces.filter(
          (piece) => piece.materialId === group.material.id,
        );
        const remnantSearch = preferRemnants
          ? await findCandidateRemnantsWithWarnings(
              prisma,
              group.material.id,
              input.mode === "OPERATIONAL_PURCHASE" ? input.warehouseId : null,
              piecesForCandidateSearch,
            )
          : { candidates: [], warnings: [] as string[] };
        const inventorySearch =
          input.mode === "OPERATIONAL_PURCHASE"
            ? await findCandidateSheetsWithWarnings(
                prisma,
                group.material.id,
                input.warehouseId,
                piecesForCandidateSearch,
              )
            : { candidates: [], warnings: [] as string[] };
        const groupWarnings = [
          ...defaultSheet.warnings,
          ...remnantSearch.warnings,
          ...inventorySearch.warnings,
        ];
        const groupResult = optimizeGroup({
          allowRotation,
          candidateSheets: [
            ...remnantSearch.candidates,
            ...inventorySearch.candidates,
          ],
          defaultSheetHeightMm: defaultSheet.heightMm,
          defaultSheetWidthMm: defaultSheet.widthMm,
          material: group.material,
          minimumRemnantAreaM2: settings.minimumRemnantAreaM2,
          mode: input.mode,
          pieces: group.pieces,
          preferRemnants,
          runtimeSeconds: settings.maxRuntimeSeconds,
          runtimeStartedAt,
          thicknessMm: group.thicknessMm,
          warnings: groupWarnings,
        });

        groups.push(groupResult);
      }

      const totals = groups.reduce(
        (aggregate, group) => {
          aggregate.requiredAreaM2 = roundTo(
            aggregate.requiredAreaM2 + group.totals.requiredAreaM2,
            4,
          );
          aggregate.sheetAreaM2 = roundTo(
            aggregate.sheetAreaM2 + group.totals.sheetAreaM2,
            4,
          );
          aggregate.sheetCount += group.totals.sheetCount;
          aggregate.wasteAreaM2 = roundTo(
            aggregate.wasteAreaM2 + group.totals.wasteAreaM2,
            4,
          );

          return aggregate;
        },
        {
          requiredAreaM2: 0,
          sheetAreaM2: 0,
          sheetCount: 0,
          wasteAreaM2: 0,
        },
      );
      const totalWastePercent =
        totals.sheetAreaM2 > 0
          ? roundTo((totals.wasteAreaM2 / totals.sheetAreaM2) * 100, 4)
          : 0;

      if (totals.sheetCount === 0) {
        throw new AppError(
          "Optimization could not place any piece into available or virtual sheets.",
          400,
        );
      }

      const resultJson: CuttingOptimizationResult = {
        allowRotation,
        generatedAt: new Date().toISOString(),
        groups,
        mode: input.mode,
        preferRemnants,
        totals: {
          requiredAreaM2: totals.requiredAreaM2,
          sheetAreaM2: totals.sheetAreaM2,
          sheetCount: totals.sheetCount,
          wasteAreaM2: totals.wasteAreaM2,
          wastePercent: totalWastePercent,
        },
        warnings: [
          ...warnings,
          ...groups.flatMap((group) => group.warnings),
        ],
      };

      const updatedRun = await prisma.cuttingOptimizationRun.update({
        data: {
          errorMessage: null,
          estimatedWasteAreaM2: resultJson.totals.wasteAreaM2,
          resultJson: toInputJsonValue(resultJson),
          status: "COMPLETED",
          totalRequiredAreaM2: resultJson.totals.requiredAreaM2,
          totalSheetAreaM2: resultJson.totals.sheetAreaM2,
          wastePercent: resultJson.totals.wastePercent,
        },
        include: cuttingOptimizationRunInclude,
        where: {
          id: run.id,
        },
      });
      const current = mapOptimizationRunRecord(updatedRun);

      await auditCuttingAction({
        action: "cutting.optimization_run.completed",
        actorUserId: userId,
        after: current,
        before: mapOptimizationRunRecord(run),
        entityId: updatedRun.id,
        entityType: CUTTING_OPTIMIZATION_RUN_ENTITY_TYPE,
      });

      return current;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Optimization failed unexpectedly.";
      const failedRun = await prisma.cuttingOptimizationRun.update({
        data: {
          errorMessage: message,
          status: "FAILED",
        },
        include: cuttingOptimizationRunInclude,
        where: {
          id: run.id,
        },
      });

      await auditCuttingAction({
        action: "cutting.optimization_run.failed",
        actorUserId: userId,
        after: mapOptimizationRunRecord(failedRun),
        before: mapOptimizationRunRecord(run),
        entityId: failedRun.id,
        entityType: CUTTING_OPTIMIZATION_RUN_ENTITY_TYPE,
        metadata: {
          errorMessage: message,
        },
      });

      throw error;
    }
  },

  async listCuttingOptimizations(query: ListCuttingOptimizationsQuery) {
    const where: Prisma.CuttingOptimizationRunWhereInput = {
      ...(query.materialId
        ? {
            materialId: query.materialId,
          }
        : {}),
      ...(query.mode
        ? {
            mode: query.mode,
          }
        : {}),
      ...(query.projectId
        ? {
            projectId: query.projectId,
          }
        : {}),
      ...(query.quotationId
        ? {
            quotationId: query.quotationId,
          }
        : {}),
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),
      ...(query.warehouseId
        ? {
            warehouseId: query.warehouseId,
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                code: {
                  contains: query.search,
                },
              },
              {
                material: {
                  name: {
                    contains: query.search,
                  },
                },
              },
              {
                project: {
                  code: {
                    contains: query.search,
                  },
                },
              },
              {
                quotation: {
                  code: {
                    contains: query.search,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, runs] = await prisma.$transaction([
      prisma.cuttingOptimizationRun.count({
        where,
      }),
      prisma.cuttingOptimizationRun.findMany({
        include: cuttingOptimizationRunInclude,
        orderBy: [
          {
            [query.sortBy]: query.sortDirection,
          },
        ],
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    return {
      data: runs.map(mapOptimizationRunListItem),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async getCuttingOptimizationRunById(
    runId: string,
  ): Promise<CuttingOptimizationRunRecord> {
    const run = await getOptimizationRunOrThrow(prisma, runId);
    return mapOptimizationRunRecord(run);
  },

  async cancelOptimizationRun(
    runId: string,
    userId: string | null,
  ): Promise<CuttingOptimizationRunRecord> {
    return prisma.$transaction(async (db) => {
      const run = await getOptimizationRunOrThrow(db, runId);

      if (run.status === "APPROVED") {
        throw new AppError("Approved optimization runs cannot be cancelled.", 400);
      }

      if (run.status === "CANCELLED") {
        throw new AppError("Optimization run is already cancelled.", 400);
      }

      const blockingPlan = run.cuttingPlans.find((plan) =>
        ["APPROVED", "COMPLETED", "SENT_TO_PRODUCTION"].includes(plan.status),
      );

      if (blockingPlan) {
        throw new AppError(
          "Cannot cancel an optimization run that already has an approved or completed cutting plan.",
          400,
        );
      }

      const cancelledPlans = await Promise.all(
        run.cuttingPlans
          .filter((plan) => plan.status !== "CANCELLED")
          .map((plan) =>
            db.cuttingPlan.update({
              data: {
                status: "CANCELLED",
              },
              include: cuttingPlanListInclude,
              where: {
                id: plan.id,
              },
            }),
          ),
      );
      const updatedRun = await db.cuttingOptimizationRun.update({
        data: {
          status: "CANCELLED",
        },
        include: cuttingOptimizationRunInclude,
        where: {
          id: run.id,
        },
      });

      for (const cancelledPlan of cancelledPlans) {
        await auditCuttingAction({
          action: "cutting.plan.cancelled",
          actorUserId: userId,
          after: mapCuttingPlanListItem(cancelledPlan),
          before: mapPlanSummary(
            run.cuttingPlans.find((plan) => plan.id === cancelledPlan.id)!,
          ),
          entityId: cancelledPlan.id,
          entityType: CUTTING_PLAN_ENTITY_TYPE,
        });
      }

      await auditCuttingAction({
        action: "cutting.optimization_run.cancelled",
        actorUserId: userId,
        after: mapOptimizationRunRecord(updatedRun),
        before: mapOptimizationRunRecord(run),
        entityId: updatedRun.id,
        entityType: CUTTING_OPTIMIZATION_RUN_ENTITY_TYPE,
      });

      return mapOptimizationRunRecord(updatedRun);
    });
  },

  async generateCuttingPlanFromOptimizationRun(
    runId: string,
    userId: string | null,
  ): Promise<CuttingPlanRecord[]> {
    return prisma.$transaction(async (db) => {
      const run = await getOptimizationRunOrThrow(db, runId);

      if (run.status === "FAILED") {
        throw new AppError("Cannot generate a cutting plan from a failed optimization run.", 400);
      }

      if (run.status === "CANCELLED") {
        throw new AppError("Cannot generate a cutting plan from a cancelled optimization run.", 400);
      }

      if (run.cuttingPlans.some((plan) => plan.status !== "CANCELLED")) {
        throw new AppError("A cutting plan has already been generated for this run.", 400);
      }

      const resultJson = parseOptimizationResultJson(run.resultJson);

      if (!resultJson) {
        throw new AppError("Optimization run does not contain result data.", 400);
      }

      const groupsWithSheets = resultJson.groups.filter((group) => group.sheets.length > 0);

      if (groupsWithSheets.length === 0) {
        throw new AppError("Optimization run does not contain any sheet layouts to plan.", 400);
      }

      const createdPlans: CuttingPlanRecord[] = [];

      for (const [groupIndex, group] of groupsWithSheets.entries()) {
        const notes =
          group.unplacedPieces.length > 0
            ? `${group.unplacedPieces.length} piece(s) remained unplaced during optimization.`
            : null;
        const cuttingPlan = await db.cuttingPlan.create({
          data: {
            code: `${run.code}-PLAN-${String(groupIndex + 1).padStart(2, "0")}`,
            materialId: group.materialId,
            notes,
            optimizationRunId: run.id,
            sheetCount: group.totals.sheetCount,
            totalRequiredAreaM2: group.totals.requiredAreaM2,
            totalWasteAreaM2: group.totals.wasteAreaM2,
            wastePercent: group.totals.wastePercent,
            warehouseId: run.warehouseId,
          },
          include: cuttingPlanListInclude,
        });

        for (const [sheetIndex, sheet] of group.sheets.entries()) {
          const createdSheet = await db.cuttingPlanSheet.create({
            data: {
              cuttingPlanId: cuttingPlan.id,
              heightMm: sheet.heightMm,
              inventoryStockId: sheet.inventoryStockId,
              layoutJson: toInputJsonValue({
                heightMm: sheet.heightMm,
                pieces: sheet.pieces,
                remnantOutputs: sheet.remnantOutputs,
                warnings: sheet.warnings,
                widthMm: sheet.widthMm,
              }),
              remnantPieceId: sheet.remnantPieceId,
              sheetAreaM2: sheet.sheetAreaM2,
              sheetSource: sheet.sheetSource,
              sortOrder: sheetIndex,
              thicknessMm: sheet.thicknessMm,
              usedAreaM2: sheet.usedAreaM2,
              wasteAreaM2: sheet.wasteAreaM2,
              wastePercent: sheet.wastePercent,
              widthMm: sheet.widthMm,
            },
          });

          for (const piece of sheet.pieces) {
            await db.cuttingPlanPiece.create({
              data: {
                areaM2: piece.areaM2,
                cuttingPlanSheetId: createdSheet.id,
                heightMm: piece.heightMm,
                label: piece.label,
                materialId: piece.materialId,
                metadataJson:
                  piece.metadata === undefined || piece.metadata === null
                    ? PrismaNamespace.JsonNull
                    : toInputJsonValue(piece.metadata),
                quantity: 1,
                quotationItemId: piece.quotationItemId,
                rotated: piece.rotated,
                widthMm: piece.widthMm,
                xMm: piece.xMm,
                yMm: piece.yMm,
              },
            });
          }

          for (const remnantOutput of sheet.remnantOutputs) {
            await db.cuttingPlanRemnantOutput.create({
              data: {
                areaM2: remnantOutput.areaM2,
                cuttingPlanSheetId: createdSheet.id,
                heightMm: remnantOutput.heightMm,
                materialId: group.materialId,
                shouldCreateRemnant: remnantOutput.shouldCreateRemnant,
                status: "PLANNED",
                thicknessMm: sheet.thicknessMm,
                widthMm: remnantOutput.widthMm,
              },
            });
          }
        }

        const detailedPlan = await getCuttingPlanOrThrow(db, cuttingPlan.id);
        const planRecord = mapCuttingPlanRecord(detailedPlan);
        createdPlans.push(planRecord);

        await auditCuttingAction({
          action: "cutting.plan.generated",
          actorUserId: userId,
          after: planRecord,
          before: null,
          entityId: cuttingPlan.id,
          entityType: CUTTING_PLAN_ENTITY_TYPE,
          metadata: {
            optimizationRunCode: run.code,
          },
        });
      }

      return createdPlans;
    });
  },

  async listCuttingPlans(query: ListCuttingPlansQuery) {
    const where: Prisma.CuttingPlanWhereInput = {
      ...(query.materialId
        ? {
            materialId: query.materialId,
          }
        : {}),
      ...(query.optimizationRunId
        ? {
            optimizationRunId: query.optimizationRunId,
          }
        : {}),
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),
      ...(query.warehouseId
        ? {
            warehouseId: query.warehouseId,
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                code: {
                  contains: query.search,
                },
              },
              {
                material: {
                  name: {
                    contains: query.search,
                  },
                },
              },
              {
                optimizationRun: {
                  code: {
                    contains: query.search,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, plans] = await prisma.$transaction([
      prisma.cuttingPlan.count({
        where,
      }),
      prisma.cuttingPlan.findMany({
        include: cuttingPlanListInclude,
        orderBy: [
          {
            [query.sortBy]: query.sortDirection,
          },
        ],
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    return {
      data: plans.map(mapCuttingPlanListItem),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async getCuttingPlanById(cuttingPlanId: string): Promise<CuttingPlanRecord> {
    const plan = await getCuttingPlanOrThrow(prisma, cuttingPlanId);
    return mapCuttingPlanRecord(plan);
  },

  async approveCuttingPlan(
    cuttingPlanId: string,
    userId: string | null,
    input?: ApproveCuttingPlanInput,
  ): Promise<CuttingPlanRecord> {
    return prisma.$transaction(async (db) => {
      const plan = await getCuttingPlanOrThrow(db, cuttingPlanId);

      if (plan.optimizationRun.status === "FAILED") {
        throw new AppError("Cannot approve a cutting plan from a failed optimization run.", 400);
      }

      if (plan.sheets.length === 0 || plan.sheetCount === 0) {
        throw new AppError("Cannot approve an empty cutting plan.", 400);
      }

      if (plan.status === "APPROVED") {
        throw new AppError("Cutting plan is already approved.", 400);
      }

      const updatedPlan = await db.cuttingPlan.update({
        data: {
          notes: input?.notes ?? plan.notes,
          status: "APPROVED",
        },
        include: cuttingPlanDetailInclude,
        where: {
          id: plan.id,
        },
      });
      const siblingPlans = await db.cuttingPlan.findMany({
        select: {
          status: true,
        },
        where: {
          optimizationRunId: plan.optimizationRunId,
        },
      });
      const allPlansApproved = siblingPlans.every((siblingPlan) =>
        ["APPROVED", "COMPLETED", "SENT_TO_PRODUCTION"].includes(siblingPlan.status),
      );

      if (allPlansApproved) {
        await db.cuttingOptimizationRun.update({
          data: {
            approvedAt: new Date(),
            approvedByUserId: userId,
            status: "APPROVED",
          },
          where: {
            id: plan.optimizationRunId,
          },
        });
      }

      const current = mapCuttingPlanRecord(updatedPlan);

      await auditCuttingAction({
        action: "cutting.plan.approved",
        actorUserId: userId,
        after: current,
        before: mapCuttingPlanRecord(plan),
        entityId: plan.id,
        entityType: CUTTING_PLAN_ENTITY_TYPE,
      });

      return current;
    });
  },

  async createRemnantsFromCuttingPlan(
    cuttingPlanId: string,
    userId: string | null,
  ): Promise<CuttingPlanRecord> {
    return prisma.$transaction(async (db) => {
      const plan = await getCuttingPlanOrThrow(db, cuttingPlanId);

      if (plan.status !== "APPROVED") {
        throw new AppError("Cutting plan remnants can only be created after approval.", 400);
      }

      if (plan.sheets.some((sheet) =>
        sheet.remnantOutputs.some((output) => output.status === "CREATED"),
      )) {
        throw new AppError("Remnants have already been created for this plan.", 400);
      }

      const settings = await getCuttingSettings(db);
      const material = await db.material.findUnique({
        select: cuttingMaterialSelect,
        where: {
          id: plan.materialId,
        },
      });

      if (!material) {
        throw new AppError("Material not found for the selected cutting plan.", 404);
      }

      const targetWarehouseId = plan.warehouseId ?? plan.optimizationRun.warehouseId;

      if (!targetWarehouseId) {
        throw new AppError(
          "A warehouse is required before remnants can be created from this cutting plan.",
          400,
        );
      }

      const remnantUnit =
        material.stockUnit === "M2" ? "M2" : material.stockUnit;

      for (const sheet of plan.sheets) {
        for (const [index, output] of sheet.remnantOutputs.entries()) {
          if (
            !output.shouldCreateRemnant ||
            Number(output.areaM2) < settings.minimumRemnantAreaM2
          ) {
            await db.cuttingPlanRemnantOutput.update({
              data: {
                status: "DISCARDED",
              },
              where: {
                id: output.id,
              },
            });
            continue;
          }

          const createdRemnant = await inventoryService.createRemnantPiece(
            {
              code: `${plan.code}-RMN-${String(sheet.sortOrder + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
              lengthMm: Number(output.heightMm),
              materialId: plan.materialId,
              notes: `Created from cutting plan ${plan.code}. Source sheet inventory was not consumed yet.`,
              parentInventoryStockId: sheet.inventoryStockId ?? undefined,
              quantity:
                remnantUnit === "M2" ? Number(output.areaM2) : 1,
              sourceId: output.id,
              sourceType: "CUT_OPTIMIZATION",
              thicknessMm: decimalToNumber(output.thicknessMm),
              unit: remnantUnit,
              warehouseId: targetWarehouseId,
              widthMm: Number(output.widthMm),
            },
            userId,
          );

          await db.cuttingPlanRemnantOutput.update({
            data: {
              remnantPieceId: createdRemnant.id,
              status: "CREATED",
            },
            where: {
              id: output.id,
            },
          });
        }
      }

      const updatedPlan = await getCuttingPlanOrThrow(db, cuttingPlanId);
      const current = mapCuttingPlanRecord(updatedPlan);

      await auditCuttingAction({
        action: "cutting.plan.remnants_created",
        actorUserId: userId,
        after: current,
        before: mapCuttingPlanRecord(plan),
        entityId: plan.id,
        entityType: CUTTING_PLAN_REMNANT_OUTPUT_ENTITY_TYPE,
      });

      return current;
    });
  },

  async getPrintableCuttingPlan(
    cuttingPlanId: string,
    userId: string | null,
  ): Promise<CuttingPlanRecord> {
    const plan = await this.getCuttingPlanById(cuttingPlanId);

    await auditCuttingAction({
      action: "cutting.plan.printed",
      actorUserId: userId,
      after: {
        printedAt: new Date().toISOString(),
      },
      before: null,
      entityId: cuttingPlanId,
      entityType: CUTTING_PLAN_ENTITY_TYPE,
    });

    return plan;
  },
};
