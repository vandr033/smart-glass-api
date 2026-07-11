import { randomUUID } from "node:crypto";

import type { Prisma } from "../../../generated/prisma/client.js";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";

import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import {
  convertMaterialUnit,
  type JsonLike,
} from "../materials/materials.behavior.js";
import { inventoryService } from "../inventory/inventory.service.js";
import type { ProductTemplateSimulationResult } from "../product-templates/product-templates.types.js";
import type {
  ListProfileCuttingPlansQuery,
  ListProfileOptimizationsQuery,
  ProfileCutPieceRecord,
  ProfileCuttingBarRecord,
  ProfileCuttingPlanListItem,
  ProfileCuttingPlanRecord,
  ProfileCuttingPlanSummary,
  ProfileMaterialSummary,
  ProfileOptimizationBarCut,
  ProfileOptimizationBarResult,
  ProfileOptimizationCutInput,
  ProfileOptimizationInventoryBarSummary,
  ProfileOptimizationResult,
  ProfileOptimizationRunListItem,
  ProfileOptimizationRunRecord,
  ProfileProjectSummary,
  ProfileQuotationSummary,
  ProfileRemnantOutputRecord,
  ProfileRequirementCollection,
  ProfileRequirementGroup,
  ProfileUserSummary,
  QuotationProfileOptimizationInput,
  RunProfileOptimizationInput,
} from "./profile-optimization.types.js";
import {
  PROFILE_CUTTING_PLAN_ENTITY_TYPE,
  PROFILE_OPTIMIZATION_RUN_ENTITY_TYPE,
  PROFILE_REMNANT_OUTPUT_ENTITY_TYPE,
} from "./profile-optimization.constants.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

type ProfileSettings = {
  minimumProfileRemnantMm: number;
  preferProfileRemnants: boolean;
};

type MaterialForOptimization = Prisma.MaterialGetPayload<{
  select: typeof materialForOptimizationSelect;
}>;

type ProfileOptimizationRunEntity = Prisma.ProfileOptimizationRunGetPayload<{
  include: typeof profileOptimizationRunInclude;
}>;

type ProfileCuttingPlanListEntity = Prisma.ProfileCuttingPlanGetPayload<{
  include: typeof profileCuttingPlanListInclude;
}>;

type ProfileCuttingPlanDetailEntity = Prisma.ProfileCuttingPlanGetPayload<{
  include: typeof profileCuttingPlanDetailInclude;
}>;

type ExpandedCut = {
  cutId: string;
  label: string;
  lengthMm: number;
  materialId: string;
  metadata: unknown;
  quotationItemId: string | null;
};

type CandidateInventoryBar = {
  batchNumber: string | null;
  id: string;
  lengthMm: number;
  locationCode: string | null;
};

type CandidateRemnant = {
  code: string;
  id: string;
  lengthMm: number;
};

type MutableBarState = {
  cuts: ProfileOptimizationBarCut[];
  inventoryStockId: string | null;
  originalLengthMm: number;
  remnantPieceId: string | null;
  sourceCode: string | null;
  sourceType: "INVENTORY_BAR" | "PURCHASE_REQUIRED" | "REMNANT" | "VIRTUAL";
  sortOrder: number;
  usedLengthMm: number;
};

type OptimizationComputationResult = ProfileOptimizationResult;

const INVENTORY_PREFER_PROFILE_REMNANTS = "inventory.prefer_profile_remnants";
const INVENTORY_MINIMUM_PROFILE_REMNANT_MM =
  "inventory.minimum_profile_remnant_mm";

const userSummarySelect = {
  email: true,
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

const materialSummarySelect = {
  code: true,
  id: true,
  name: true,
  standardLengthMm: true,
} satisfies Prisma.MaterialSelect;

const materialForOptimizationSelect = {
  code: true,
  deletedAt: true,
  dimensionPresets: {
    orderBy: [
      {
        lengthMm: "asc",
      },
    ],
    select: {
      lengthMm: true,
    },
    where: {
      lengthMm: {
        not: null,
      },
    },
  },
  id: true,
  isRemnantEligible: true,
  materialType: true,
  minimumReusableLengthMm: true,
  name: true,
  purchaseUnit: true,
  standardLengthMm: true,
  stockUnit: true,
  unitConversionJson: true,
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

const profileOptimizationRunInclude = {
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
} satisfies Prisma.ProfileOptimizationRunInclude;

const profileCuttingPlanListInclude = {
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
} satisfies Prisma.ProfileCuttingPlanInclude;

const profileCuttingPlanDetailInclude = {
  ...profileCuttingPlanListInclude,
  bars: {
    include: {
      cutPieces: {
        include: {
          material: {
            select: materialSummarySelect,
          },
        },
        orderBy: [
          {
            positionMm: "asc",
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
    ],
  },
} satisfies Prisma.ProfileCuttingPlanInclude;

const inventoryBarSelect = {
  batchNumber: true,
  id: true,
  lengthMm: true,
  locationCode: true,
  quantity: true,
  unit: true,
} satisfies Prisma.InventoryStockSelect;

const remnantSelect = {
  code: true,
  id: true,
  lengthMm: true,
} satisfies Prisma.RemnantPieceSelect;

const roundTo = (value: number, decimals = 4): number => {
  return Number(value.toFixed(decimals));
};

const decimalToNumber = (
  value: PrismaNamespace.Decimal | number | null,
): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

const toInputJsonValue = (value: unknown): Prisma.InputJsonValue => {
  return value as Prisma.InputJsonValue;
};

const buildCode = (prefix: string): string => {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const asBoolean = (value: unknown): boolean | null => {
  return typeof value === "boolean" ? value : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
};

const mapUserSummary = (
  record: ProfileOptimizationRunEntity["createdByUser"],
): ProfileUserSummary => {
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
): ProfileMaterialSummary | null => {
  if (!record) {
    return null;
  }

  return {
    code: record.code,
    id: record.id,
    name: record.name,
    standardLengthMm: decimalToNumber(record.standardLengthMm),
  };
};

const mapQuotationSummary = (
  record:
    | Prisma.QuotationGetPayload<{
        select: typeof quotationSummarySelect;
      }>
    | null
    | undefined,
): ProfileQuotationSummary => {
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
): ProfileProjectSummary => {
  if (!record) {
    return null;
  }

  return {
    code: record.code,
    id: record.id,
    title: record.title,
  };
};

const parseRunInputJson = (
  value: Prisma.JsonValue,
): ProfileOptimizationRunRecord["inputJson"] => {
  const record = isObjectRecord(value) ? value : {};
  const cuts = Array.isArray(record.cuts)
    ? (record.cuts as ProfileOptimizationCutInput[])
    : [];
  const materialId = typeof record.materialId === "string" ? record.materialId : "";

  return {
    cuts,
    materialId,
    mode:
      record.mode === "COMMERCIAL_ESTIMATION" ||
      record.mode === "OPERATIONAL_EXECUTION"
        ? record.mode
        : "COMMERCIAL_ESTIMATION",
    preferRemnants: asBoolean(record.preferRemnants) ?? true,
  };
};

const parseResultJson = (
  value: Prisma.JsonValue | null,
): ProfileOptimizationResult | null => {
  if (!value || !isObjectRecord(value)) {
    return null;
  }

  return value as unknown as ProfileOptimizationResult;
};

const mapPlanSummary = (
  record: ProfileOptimizationRunEntity["cuttingPlans"][number],
): ProfileCuttingPlanSummary => {
  return {
    code: record.code,
    id: record.id,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    status: record.status,
    totalBars: record.totalBars,
    wastePercent: roundTo(Number(record.wastePercent), 4),
  };
};

const mapOptimizationRunListItem = (
  record: ProfileOptimizationRunEntity,
): ProfileOptimizationRunListItem => {
  return {
    code: record.code,
    createdAt: record.createdAt.toISOString(),
    createdByUser: mapUserSummary(record.createdByUser),
    id: record.id,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    mode: record.mode,
    project: mapProjectSummary(record.project),
    projectId: record.projectId,
    quotation: mapQuotationSummary(record.quotation),
    quotationId: record.quotationId,
    status: record.status,
    totalBarLengthMm: roundTo(Number(record.totalBarLengthMm), 2),
    totalRequiredLengthMm: roundTo(Number(record.totalRequiredLengthMm), 2),
    totalWasteLengthMm: roundTo(Number(record.totalWasteLengthMm), 2),
    updatedAt: record.updatedAt.toISOString(),
    wastePercent: roundTo(Number(record.wastePercent), 4),
  };
};

const mapOptimizationRunRecord = (
  record: ProfileOptimizationRunEntity,
): ProfileOptimizationRunRecord => {
  return {
    ...mapOptimizationRunListItem(record),
    cuttingPlans: record.cuttingPlans.map(mapPlanSummary),
    inputJson: parseRunInputJson(record.inputJson),
    resultJson: parseResultJson(record.resultJson),
  };
};

const mapProfileCutPiece = (
  record: ProfileCuttingPlanDetailEntity["bars"][number]["cutPieces"][number],
): ProfileCutPieceRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    cuttingBarId: record.cuttingBarId,
    id: record.id,
    label: record.label,
    lengthMm: roundTo(Number(record.lengthMm), 2),
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    metadataJson: record.metadataJson,
    positionMm: roundTo(Number(record.positionMm), 2),
    quantity: record.quantity,
    quotationItemId: record.quotationItemId,
  };
};

const mapProfileRemnantOutput = (
  record: ProfileCuttingPlanDetailEntity["bars"][number]["remnantOutputs"][number],
): ProfileRemnantOutputRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    cuttingBarId: record.cuttingBarId,
    id: record.id,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
    remainingLengthMm: roundTo(Number(record.remainingLengthMm), 2),
    remnantPieceId: record.remnantPieceId,
    shouldCreateRemnant: record.shouldCreateRemnant,
    status: record.status,
  };
};

const mapProfileCuttingBar = (
  record: ProfileCuttingPlanDetailEntity["bars"][number],
): ProfileCuttingBarRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    cutPieces: record.cutPieces.map(mapProfileCutPiece),
    cuttingPlanId: record.cuttingPlanId,
    id: record.id,
    inventoryStockId: record.inventoryStockId,
    originalLengthMm: roundTo(Number(record.originalLengthMm), 2),
    remnantOutputs: record.remnantOutputs.map(mapProfileRemnantOutput),
    remnantPieceId: record.remnantPieceId,
    sortOrder: record.sortOrder,
    sourceType: record.sourceType,
    usedLengthMm: roundTo(Number(record.usedLengthMm), 2),
    wasteLengthMm: roundTo(Number(record.wasteLengthMm), 2),
    wastePercent: roundTo(Number(record.wastePercent), 4),
  };
};

const mapProfileCuttingPlanListItem = (
  record: ProfileCuttingPlanListEntity,
): ProfileCuttingPlanListItem => {
  return {
    code: record.code,
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    material: mapMaterialSummary(record.material)!,
    materialId: record.materialId,
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
    status: record.status,
    totalBars: record.totalBars,
    totalRequiredLengthMm: roundTo(Number(record.totalRequiredLengthMm), 2),
    totalWasteLengthMm: roundTo(Number(record.totalWasteLengthMm), 2),
    updatedAt: record.updatedAt.toISOString(),
    wastePercent: roundTo(Number(record.wastePercent), 4),
  };
};

const mapProfileCuttingPlanRecord = (
  record: ProfileCuttingPlanDetailEntity,
): ProfileCuttingPlanRecord => {
  return {
    ...mapProfileCuttingPlanListItem(record),
    bars: record.bars.map(mapProfileCuttingBar),
  };
};

const resolveStandardBarLengths = (material: MaterialForOptimization): number[] => {
  const barLengths = new Set<number>();

  material.dimensionPresets.forEach((preset) => {
    const lengthMm = decimalToNumber(preset.lengthMm);

    if (lengthMm !== null && lengthMm > 0) {
      barLengths.add(lengthMm);
    }
  });

  const standardLengthMm = decimalToNumber(material.standardLengthMm);

  if (standardLengthMm !== null && standardLengthMm > 0) {
    barLengths.add(standardLengthMm);
  }

  return Array.from(barLengths).sort((left, right) => left - right);
};

const collectProfileCutsFromSimulationResult = (
  result: ProductTemplateSimulationResult,
  options?: {
    labelPrefix?: string;
    quotationItemId?: string | null;
    repeatCount?: number;
  },
): ProfileRequirementCollection => {
  const groups = new Map<string, ProfileRequirementGroup>();
  const warnings: string[] = [];
  const repeatCount = Math.max(1, options?.repeatCount ?? 1);

  result.cuts.linear.forEach((linearCut) => {
    if (!linearCut.materialId) {
      warnings.push(`Linear cut "${linearCut.label}" is missing a material and was skipped.`);
      return;
    }

    const label = options?.labelPrefix
      ? `${options.labelPrefix} - ${linearCut.label}`
      : linearCut.label;
    const quantity = Math.max(1, Math.round(linearCut.quantity * repeatCount));
    const lengthMm = roundTo(linearCut.requiredLengthMm, 2);
    const existing = groups.get(linearCut.materialId);
    const cutInput: ProfileOptimizationCutInput = {
      label,
      lengthMm,
      materialId: linearCut.materialId,
      metadata: {
        allowRemnantUse: linearCut.allowRemnantUse,
        quotationItemId: options?.quotationItemId ?? null,
        wastePercent: linearCut.wastePercent,
      },
      quotationItemId: options?.quotationItemId ?? null,
      quantity,
    };

    if (existing) {
      existing.cuts.push(cutInput);
      existing.totalCuts += quantity;
      existing.totalRequiredLengthMm = roundTo(
        existing.totalRequiredLengthMm + lengthMm * quantity,
        2,
      );
      return;
    }

    groups.set(linearCut.materialId, {
      cuts: [cutInput],
      material: {
        code: linearCut.materialId,
        id: linearCut.materialId,
        name: linearCut.label,
        standardLengthMm: null,
      },
      materialId: linearCut.materialId,
      totalCuts: quantity,
      totalRequiredLengthMm: roundTo(lengthMm * quantity, 2),
    });
  });

  return {
    groups: Array.from(groups.values()),
    warnings,
  };
};

const getProfileSettings = async (db: DbClient): Promise<ProfileSettings> => {
  const settings = await db.systemSetting.findMany({
    select: {
      key: true,
      valueJson: true,
    },
    where: {
      key: {
        in: [
          INVENTORY_MINIMUM_PROFILE_REMNANT_MM,
          INVENTORY_PREFER_PROFILE_REMNANTS,
        ],
      },
    },
  });

  const settingsMap = new Map(settings.map((setting) => [setting.key, setting.valueJson]));
  const minimumProfileRemnantMm =
    asNumber(settingsMap.get(INVENTORY_MINIMUM_PROFILE_REMNANT_MM)) ?? 300;
  const preferProfileRemnants =
    asBoolean(settingsMap.get(INVENTORY_PREFER_PROFILE_REMNANTS)) ?? true;

  return {
    minimumProfileRemnantMm,
    preferProfileRemnants,
  };
};

const getMaterialOrThrow = async (
  db: DbClient,
  materialId: string,
): Promise<MaterialForOptimization> => {
  const material = await db.material.findUnique({
    select: materialForOptimizationSelect,
    where: {
      id: materialId,
    },
  });

  if (!material || material.deletedAt) {
    throw new AppError("Material not found.", 404);
  }

  if (material.materialType !== "LINEAR") {
    throw new AppError("Only linear materials can be optimized for profile cutting.", 400);
  }

  const barLengths = resolveStandardBarLengths(material);

  if (barLengths.length === 0) {
    throw new AppError(
      "Linear materials require a standard bar length or dimension preset before optimization.",
      400,
    );
  }

  return material;
};

const sourcePriority = (
  sourceType: MutableBarState["sourceType"],
  preferRemnants: boolean,
): number => {
  if (sourceType === "REMNANT") {
    return preferRemnants ? 0 : 1;
  }

  if (sourceType === "INVENTORY_BAR") {
    return preferRemnants ? 1 : 0;
  }

  if (sourceType === "PURCHASE_REQUIRED") {
    return 2;
  }

  return 3;
};

const calculateBarCountFromStock = (
  material: MaterialForOptimization,
  stock: Prisma.InventoryStockGetPayload<{
    select: typeof inventoryBarSelect;
  }>,
): number => {
  if (!stock.lengthMm || Number(stock.lengthMm) <= 0) {
    return 0;
  }

  if (stock.unit === "UNIT") {
    return Math.max(0, Math.floor(Number(stock.quantity) + 0.0001));
  }

  const quantityPerBar = convertMaterialUnit({
    fromUnit: "MM",
    material: {
      materialType: material.materialType,
      unitConversionJson: material.unitConversionJson as JsonLike,
    },
    quantity: Number(stock.lengthMm),
    toUnit: stock.unit,
  });

  if (!Number.isFinite(quantityPerBar) || quantityPerBar <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(Number(stock.quantity) / quantityPerBar + 0.0001));
};

const computeOptimization = (input: {
  availableInventoryBars: CandidateInventoryBar[];
  availableRemnants: CandidateRemnant[];
  cuts: ProfileOptimizationCutInput[];
  minimumProfileRemnantMm: number;
  mode: "COMMERCIAL_ESTIMATION" | "OPERATIONAL_EXECUTION";
  preferRemnants: boolean;
  standardBarLengths: number[];
}): OptimizationComputationResult => {
  const expandedCuts: ExpandedCut[] = input.cuts.flatMap((cut) =>
    Array.from({ length: cut.quantity }, () => ({
      cutId: randomUUID(),
      label: cut.label,
      lengthMm: cut.lengthMm,
      materialId: cut.materialId,
      metadata: cut.metadata,
      quotationItemId: cut.quotationItemId,
    })),
  );

  expandedCuts.sort((left, right) => right.lengthMm - left.lengthMm);

  const remainingRemnants = [...input.availableRemnants].sort(
    (left, right) => left.lengthMm - right.lengthMm,
  );
  const remainingInventoryBars = [...input.availableInventoryBars].sort(
    (left, right) => left.lengthMm - right.lengthMm,
  );
  const bars: MutableBarState[] = [];
  const warnings: string[] = [];

  const allocateFromStandardLength = (
    cutLengthMm: number,
  ): MutableBarState => {
    const selectedLength = input.standardBarLengths.find(
      (lengthMm) => lengthMm >= cutLengthMm,
    );

    if (!selectedLength) {
      throw new AppError(
        `No standard bar length can satisfy a required cut of ${Math.round(cutLengthMm)} mm.`,
        400,
      );
    }

    return {
      cuts: [],
      inventoryStockId: null,
      originalLengthMm: selectedLength,
      remnantPieceId: null,
      sourceCode: `${Math.round(selectedLength)} mm`,
      sourceType:
        input.mode === "COMMERCIAL_ESTIMATION"
          ? "VIRTUAL"
          : "PURCHASE_REQUIRED",
      sortOrder: bars.length,
      usedLengthMm: 0,
    };
  };

  const openNewBar = (cutLengthMm: number): MutableBarState => {
    const sourceQueues = input.mode === "COMMERCIAL_ESTIMATION"
      ? []
      : input.preferRemnants
        ? [
            {
              sourceType: "REMNANT" as const,
              values: remainingRemnants,
            },
            {
              sourceType: "INVENTORY_BAR" as const,
              values: remainingInventoryBars,
            },
          ]
        : [
            {
              sourceType: "INVENTORY_BAR" as const,
              values: remainingInventoryBars,
            },
            {
              sourceType: "REMNANT" as const,
              values: remainingRemnants,
            },
          ];

    for (const queue of sourceQueues) {
      const matchingIndex = queue.values.findIndex(
        (candidate) => candidate.lengthMm >= cutLengthMm,
      );

      if (matchingIndex === -1) {
        continue;
      }

      const candidate = queue.values.splice(matchingIndex, 1)[0]!;

      if (queue.sourceType === "REMNANT") {
        const remnantCandidate = candidate as CandidateRemnant;

        return {
          cuts: [],
          inventoryStockId: null,
          originalLengthMm: remnantCandidate.lengthMm,
          remnantPieceId: remnantCandidate.id,
          sourceCode: remnantCandidate.code,
          sourceType: queue.sourceType,
          sortOrder: bars.length,
          usedLengthMm: 0,
        };
      }

      const inventoryCandidate = candidate as CandidateInventoryBar;

      return {
        cuts: [],
        inventoryStockId: inventoryCandidate.id,
        originalLengthMm: inventoryCandidate.lengthMm,
        remnantPieceId: null,
        sourceCode:
          inventoryCandidate.batchNumber ??
          inventoryCandidate.locationCode ??
          inventoryCandidate.id,
        sourceType: queue.sourceType,
        sortOrder: bars.length,
        usedLengthMm: 0,
      };
    }

    return allocateFromStandardLength(cutLengthMm);
  };

  for (const cut of expandedCuts) {
    const bestFit = bars
      .map((bar) => ({
        bar,
        remainingAfterPlacement: roundTo(
          bar.originalLengthMm - bar.usedLengthMm - cut.lengthMm,
          2,
        ),
      }))
      .filter((candidate) => candidate.remainingAfterPlacement >= 0)
      .sort((left, right) => {
        if (left.remainingAfterPlacement !== right.remainingAfterPlacement) {
          return left.remainingAfterPlacement - right.remainingAfterPlacement;
        }

        const sourceDiff =
          sourcePriority(left.bar.sourceType, input.preferRemnants) -
          sourcePriority(right.bar.sourceType, input.preferRemnants);

        if (sourceDiff !== 0) {
          return sourceDiff;
        }

        return left.bar.sortOrder - right.bar.sortOrder;
      })[0]?.bar;

    const bar = bestFit ?? openNewBar(cut.lengthMm);

    if (!bestFit) {
      bars.push(bar);
    }

    bar.cuts.push({
      cutId: cut.cutId,
      label: cut.label,
      lengthMm: cut.lengthMm,
      materialId: cut.materialId,
      metadata: cut.metadata,
      positionMm: roundTo(bar.usedLengthMm, 2),
      quotationItemId: cut.quotationItemId,
    });
    bar.usedLengthMm = roundTo(bar.usedLengthMm + cut.lengthMm, 2);
  }

  const resultBars: ProfileOptimizationBarResult[] = bars.map((bar) => {
    const wasteLengthMm = roundTo(bar.originalLengthMm - bar.usedLengthMm, 2);
    return {
      cuts: bar.cuts,
      inventoryStockId: bar.inventoryStockId,
      originalLengthMm: bar.originalLengthMm,
      remnantOutput: {
        remainingLengthMm: wasteLengthMm,
        shouldCreateRemnant: wasteLengthMm >= input.minimumProfileRemnantMm,
      },
      remnantPieceId: bar.remnantPieceId,
      sourceCode: bar.sourceCode,
      sourceType: bar.sourceType,
      usedLengthMm: bar.usedLengthMm,
      wasteLengthMm,
      wastePercent: roundTo(
        bar.originalLengthMm > 0 ? (wasteLengthMm / bar.originalLengthMm) * 100 : 0,
        4,
      ),
    };
  });

  const totalRequiredLengthMm = roundTo(
    expandedCuts.reduce((sum, cut) => sum + cut.lengthMm, 0),
    2,
  );
  const totalBarLengthMm = roundTo(
    resultBars.reduce((sum, bar) => sum + bar.originalLengthMm, 0),
    2,
  );
  const totalWasteLengthMm = roundTo(
    resultBars.reduce((sum, bar) => sum + bar.wasteLengthMm, 0),
    2,
  );
  const remnantLengthMm = roundTo(
    resultBars
      .filter((bar) => bar.sourceType === "REMNANT")
      .reduce((sum, bar) => sum + bar.originalLengthMm, 0),
    2,
  );
  const inventoryLengthMm = roundTo(
    resultBars
      .filter((bar) => bar.sourceType === "INVENTORY_BAR")
      .reduce((sum, bar) => sum + bar.originalLengthMm, 0),
    2,
  );
  const purchasedBars = resultBars.filter((bar) =>
    ["PURCHASE_REQUIRED", "VIRTUAL"].includes(bar.sourceType),
  );
  const purchasedLengthMm = roundTo(
    purchasedBars.reduce((sum, bar) => sum + bar.originalLengthMm, 0),
    2,
  );
  const wastePercent = roundTo(
    totalBarLengthMm > 0 ? (totalWasteLengthMm / totalBarLengthMm) * 100 : 0,
    4,
  );
  const efficiencyPercent = roundTo(
    totalBarLengthMm > 0 ? (totalRequiredLengthMm / totalBarLengthMm) * 100 : 0,
    4,
  );
  const purchaseBarsByLength = Array.from(
    purchasedBars.reduce((map, bar) => {
      const key = String(bar.originalLengthMm);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  ).map(([lengthKey, quantity]) => ({
    lengthMm: Number(lengthKey),
    quantity,
  })).sort((left, right) => left.lengthMm - right.lengthMm);

  return {
    availableInventoryBars: input.availableInventoryBars.map((bar) => ({
      batchNumber: bar.batchNumber,
      id: bar.id,
      lengthMm: bar.lengthMm,
      locationCode: bar.locationCode,
      quantityBars: 1,
    })),
    availableRemnants: input.availableRemnants.map((remnant) => ({
      code: remnant.code,
      id: remnant.id,
      lengthMm: remnant.lengthMm,
    })),
    bars: resultBars,
    efficiencyPercent,
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    purchaseRequirement:
      purchasedBars.length > 0
        ? {
            barLengths: purchaseBarsByLength,
            totalBars: purchasedBars.length,
            totalLengthMm: purchasedLengthMm,
          }
        : null,
    totals: {
      inventoryLengthMm,
      purchasedLengthMm,
      remnantLengthMm,
      totalBarLengthMm,
      totalRequiredLengthMm,
      totalWasteLengthMm,
      wastePercent,
    },
    warnings,
  };
};

const getProfileOptimizationRunOrThrow = async (
  db: DbClient,
  runId: string,
): Promise<ProfileOptimizationRunEntity> => {
  const run = await db.profileOptimizationRun.findUnique({
    include: profileOptimizationRunInclude,
    where: {
      id: runId,
    },
  });

  if (!run) {
    throw new AppError("Profile optimization run not found.", 404);
  }

  return run;
};

const getProfileCuttingPlanOrThrow = async (
  db: DbClient,
  planId: string,
): Promise<ProfileCuttingPlanDetailEntity> => {
  const plan = await db.profileCuttingPlan.findUnique({
    include: profileCuttingPlanDetailInclude,
    where: {
      id: planId,
    },
  });

  if (!plan) {
    throw new AppError("Profile cutting plan not found.", 404);
  }

  return plan;
};

const auditProfileAction = async (input: {
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

export const profileOptimizationService = {
  async collectProfileRequirementsFromQuotation(
    quotationId: string,
  ): Promise<ProfileRequirementCollection> {
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
    const groupedCuts = new Map<string, ProfileRequirementGroup>();
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
        const collection = collectProfileCutsFromSimulationResult(result, {
          labelPrefix: item.name,
          quotationItemId: item.id,
          repeatCount,
        });

        collection.groups.forEach((group) => {
          const existing = groupedCuts.get(group.materialId);

          if (existing) {
            existing.cuts.push(...group.cuts);
            existing.totalCuts += group.totalCuts;
            existing.totalRequiredLengthMm = roundTo(
              existing.totalRequiredLengthMm + group.totalRequiredLengthMm,
              2,
            );
            return;
          }

          groupedCuts.set(group.materialId, group);
        });
        warnings.push(...collection.warnings);
        return;
      }

      if (item.itemType === "MANUAL_MATERIAL") {
        const linearMaterial = item.materials
          .map((material) =>
            material.materialId ? manualMaterialTypes.get(material.materialId) : null,
          )
          .find((material) => material?.materialType === "LINEAR");

        if (linearMaterial) {
          warnings.push(
            `Manual quotation item "${item.name}" references linear material "${linearMaterial.name}" but does not include cut lengths, so it was skipped.`,
          );
        }
      }
    });

    const materialIds = Array.from(groupedCuts.keys());
    const materialsById = new Map(
      (
        await prisma.material.findMany({
          select: materialSummarySelect,
          where: {
            id: {
              in: materialIds,
            },
          },
        })
      ).map((material) => [material.id, material]),
    );

    const groups = materialIds.flatMap((materialId) => {
      const group = groupedCuts.get(materialId);
      const material = materialsById.get(materialId);

      if (!group || !material) {
        warnings.push(
          `Profile requirements were found for material ${materialId}, but the material record could not be loaded.`,
        );
        return [];
      }

      return [
        {
          ...group,
          material: mapMaterialSummary(material)!,
        },
      ];
    });

    return {
      groups,
      warnings,
    };
  },

  async findUsableProfileRemnants(materialId: string) {
    const material = await getMaterialOrThrow(prisma, materialId);

    if (!material.isRemnantEligible) {
      return [] satisfies ProfileOptimizationResult["availableRemnants"];
    }

    const remnants = await prisma.remnantPiece.findMany({
      orderBy: [
        {
          lengthMm: "asc",
        },
      ],
      select: remnantSelect,
      where: {
        lengthMm: {
          not: null,
        },
        materialId,
        status: "AVAILABLE",
      },
    });

    return remnants.map((remnant) => ({
      code: remnant.code,
      id: remnant.id,
      lengthMm: roundTo(Number(remnant.lengthMm!), 2),
    }));
  },

  async findAvailableProfileBars(materialId: string) {
    const material = await getMaterialOrThrow(prisma, materialId);
    const stocks = await prisma.inventoryStock.findMany({
      orderBy: [
        {
          lengthMm: "asc",
        },
      ],
      select: inventoryBarSelect,
      where: {
        condition: {
          in: ["AVAILABLE", "RESERVED_SOFT"],
        },
        deletedAt: null,
        lengthMm: {
          not: null,
        },
        materialId,
        stockType: "STANDARD",
      },
    });

    return stocks.flatMap((stock) => {
      const quantityBars = calculateBarCountFromStock(material, stock);
      const baseBar: ProfileOptimizationInventoryBarSummary = {
        batchNumber: stock.batchNumber,
        id: stock.id,
        lengthMm: roundTo(Number(stock.lengthMm!), 2),
        locationCode: stock.locationCode,
        quantityBars,
      };

      return quantityBars > 0 ? [baseBar] : [];
    });
  },

  calculateProfileWaste(result: ProfileOptimizationResult) {
    return {
      efficiencyPercent: result.efficiencyPercent,
      totalWasteLengthMm: result.totals.totalWasteLengthMm,
      wastePercent: result.totals.wastePercent,
    };
  },

  async runProfileOptimization(
    input: RunProfileOptimizationInput,
    userId: string | null,
  ): Promise<ProfileOptimizationRunRecord> {
    const settings = await getProfileSettings(prisma);
    const preferRemnants = input.preferRemnants ?? settings.preferProfileRemnants;
    const inferredMaterialIds = Array.from(
      new Set(input.cuts.map((cut) => cut.materialId)),
    );
    const materialId = input.materialId ?? inferredMaterialIds[0] ?? null;

    if (!materialId) {
      throw new AppError("A linear material is required for profile optimization.", 400);
    }

    if (inferredMaterialIds.some((candidateMaterialId) => candidateMaterialId !== materialId)) {
      throw new AppError("Profile optimization runs may only contain one material at a time.", 400);
    }

    const material = await getMaterialOrThrow(prisma, materialId);
    const standardBarLengths = resolveStandardBarLengths(material);
    const normalizedInput = {
      cuts: input.cuts,
      materialId,
      mode: input.mode,
      preferRemnants,
    };

    const run = await prisma.profileOptimizationRun.create({
      data: {
        code: buildCode("POPT"),
        createdByUserId: userId,
        inputJson: toInputJsonValue(normalizedInput),
        materialId,
        mode: input.mode,
        projectId: input.projectId,
        quotationId: input.quotationId,
        status: "RUNNING",
      },
      include: profileOptimizationRunInclude,
    });

    try {
      const availableRemnants = input.mode === "OPERATIONAL_EXECUTION"
        ? await this.findUsableProfileRemnants(materialId)
        : [];
      const availableInventoryBars = input.mode === "OPERATIONAL_EXECUTION"
        ? await this.findAvailableProfileBars(materialId)
        : [];
      const inventoryBarCandidates = availableInventoryBars.flatMap((bar) =>
        Array.from({ length: bar.quantityBars }, () => ({
          batchNumber: bar.batchNumber,
          id: bar.id,
          lengthMm: bar.lengthMm,
          locationCode: bar.locationCode,
        })),
      );
      const computationResult = computeOptimization({
        availableInventoryBars: inventoryBarCandidates,
        availableRemnants,
        cuts: input.cuts,
        minimumProfileRemnantMm: settings.minimumProfileRemnantMm,
        mode: input.mode,
        preferRemnants,
        standardBarLengths,
      });

      const updatedRun = await prisma.profileOptimizationRun.update({
        data: {
          resultJson: toInputJsonValue(computationResult),
          status: "COMPLETED",
          totalBarLengthMm: computationResult.totals.totalBarLengthMm,
          totalRequiredLengthMm: computationResult.totals.totalRequiredLengthMm,
          totalWasteLengthMm: computationResult.totals.totalWasteLengthMm,
          wastePercent: computationResult.totals.wastePercent,
        },
        include: profileOptimizationRunInclude,
        where: {
          id: run.id,
        },
      });

      const record = mapOptimizationRunRecord(updatedRun);

      await auditProfileAction({
        action: "profile_optimization.run.completed",
        actorUserId: userId,
        after: record,
        before: mapOptimizationRunRecord(run),
        entityId: updatedRun.id,
        entityType: PROFILE_OPTIMIZATION_RUN_ENTITY_TYPE,
      });

      return record;
    } catch (error) {
      await prisma.profileOptimizationRun.update({
        data: {
          resultJson: PrismaNamespace.JsonNull,
          status: "FAILED",
        },
        where: {
          id: run.id,
        },
      });

      throw error;
    }
  },

  async runQuotationProfileOptimizations(
    quotationId: string,
    input: QuotationProfileOptimizationInput,
    userId: string | null,
  ) {
    const requirements = await this.collectProfileRequirementsFromQuotation(quotationId);

    if (requirements.groups.length === 0) {
      throw new AppError(
        "No linear profile requirements could be extracted from this quotation.",
        400,
      );
    }

    const runs: ProfileOptimizationRunRecord[] = [];

    for (const group of requirements.groups) {
      const run = await this.runProfileOptimization(
        {
          cuts: group.cuts,
          materialId: group.materialId,
          mode: input.mode,
          preferRemnants: input.preferRemnants,
          projectId: null,
          quotationId,
        },
        userId,
      );
      runs.push(run);
    }

    return {
      requirements,
      runs,
    };
  },

  async generateProfileCuttingPlan(
    runId: string,
    userId: string | null,
  ): Promise<ProfileCuttingPlanRecord> {
    return prisma.$transaction(async (db) => {
      const run = await getProfileOptimizationRunOrThrow(db, runId);

      if (run.status !== "COMPLETED") {
        throw new AppError("Only completed profile optimizations can generate a cutting plan.", 400);
      }

      if (run.cuttingPlans.length > 0) {
        throw new AppError("A profile cutting plan has already been generated for this run.", 409);
      }

      const result = parseResultJson(run.resultJson);

      if (!result) {
        throw new AppError("This optimization run does not contain result data.", 400);
      }

      const plan = await db.profileCuttingPlan.create({
        data: {
          code: buildCode("PPLAN"),
          materialId: run.materialId,
          optimizationRunId: run.id,
          status: "DRAFT",
          totalBars: result.bars.length,
          totalRequiredLengthMm: result.totals.totalRequiredLengthMm,
          totalWasteLengthMm: result.totals.totalWasteLengthMm,
          wastePercent: result.totals.wastePercent,
        },
        include: profileCuttingPlanListInclude,
      });

      for (const [barIndex, bar] of result.bars.entries()) {
        const createdBar = await db.profileCuttingBar.create({
          data: {
            cuttingPlanId: plan.id,
            inventoryStockId: bar.inventoryStockId,
            originalLengthMm: bar.originalLengthMm,
            remnantPieceId: bar.remnantPieceId,
            sortOrder: barIndex,
            sourceType: bar.sourceType,
            usedLengthMm: bar.usedLengthMm,
            wasteLengthMm: bar.wasteLengthMm,
            wastePercent: bar.wastePercent,
          },
          select: {
            id: true,
          },
        });

        for (const cut of bar.cuts) {
          await db.profileCutPiece.create({
            data: {
              cuttingBarId: createdBar.id,
              label: cut.label,
              lengthMm: cut.lengthMm,
              materialId: run.materialId,
              metadataJson: toInputJsonValue(cut.metadata),
              positionMm: cut.positionMm,
              quantity: 1,
              quotationItemId: cut.quotationItemId,
            },
          });
        }

        await db.profileRemnantOutput.create({
          data: {
            cuttingBarId: createdBar.id,
            materialId: run.materialId,
            remainingLengthMm: bar.remnantOutput.remainingLengthMm,
            shouldCreateRemnant: bar.remnantOutput.shouldCreateRemnant,
            status: "PLANNED",
          },
        });
      }

      const detailedPlan = await getProfileCuttingPlanOrThrow(db, plan.id);
      const record = mapProfileCuttingPlanRecord(detailedPlan);

      await auditProfileAction({
        action: "profile_cutting_plan.created",
        actorUserId: userId,
        after: record,
        before: null,
        entityId: plan.id,
        entityType: PROFILE_CUTTING_PLAN_ENTITY_TYPE,
        metadata: {
          optimizationRunId: run.id,
        },
      });

      return record;
    });
  },

  async createProfileRemnants(
    planId: string,
    userId: string | null,
  ): Promise<ProfileCuttingPlanRecord> {
    return prisma.$transaction(async (db) => {
      const plan = await getProfileCuttingPlanOrThrow(db, planId);

      if (plan.bars.some((bar) =>
        bar.remnantOutputs.some((output) => output.status === "CREATED"),
      )) {
        throw new AppError("Profile remnants have already been created for this plan.", 400);
      }

      const settings = await getProfileSettings(db);

      for (const bar of plan.bars) {
        const sourceWarehouseId = bar.inventoryStockId
          ? (
              await db.inventoryStock.findUnique({
                select: {
                  warehouseId: true,
                },
                where: {
                  id: bar.inventoryStockId,
                },
              })
            )?.warehouseId ?? null
          : bar.remnantPieceId
            ? (
                await db.remnantPiece.findUnique({
                  select: {
                    warehouseId: true,
                  },
                  where: {
                    id: bar.remnantPieceId,
                  },
                })
              )?.warehouseId ?? null
            : null;

        for (const [outputIndex, output] of bar.remnantOutputs.entries()) {
          const remainingLengthMm = Number(output.remainingLengthMm);

          if (
            !output.shouldCreateRemnant ||
            remainingLengthMm < settings.minimumProfileRemnantMm ||
            !sourceWarehouseId
          ) {
            await db.profileRemnantOutput.update({
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
              code: `${plan.code}-RMN-${String(bar.sortOrder + 1).padStart(2, "0")}-${String(outputIndex + 1).padStart(2, "0")}`,
              lengthMm: remainingLengthMm,
              materialId: plan.materialId,
              notes: `Created from profile cutting plan ${plan.code}.`,
              parentInventoryStockId: bar.inventoryStockId ?? undefined,
              quantity: 1,
              sourceId: output.id,
              sourceType: "CUT_OPTIMIZATION",
              thicknessMm: null,
              unit: "UNIT",
              warehouseId: sourceWarehouseId,
              widthMm: null,
            },
            userId,
          );

          await db.profileRemnantOutput.update({
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

      const updatedPlan = await getProfileCuttingPlanOrThrow(db, planId);
      const current = mapProfileCuttingPlanRecord(updatedPlan);

      await auditProfileAction({
        action: "profile_cutting_plan.remnants_created",
        actorUserId: userId,
        after: current,
        before: mapProfileCuttingPlanRecord(plan),
        entityId: plan.id,
        entityType: PROFILE_REMNANT_OUTPUT_ENTITY_TYPE,
      });

      return current;
    });
  },

  async listProfileOptimizations(query: ListProfileOptimizationsQuery) {
    const where: Prisma.ProfileOptimizationRunWhereInput = {
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
                quotation: {
                  code: {
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
            ],
          }
        : {}),
    };

    const [total, runs] = await prisma.$transaction([
      prisma.profileOptimizationRun.count({
        where,
      }),
      prisma.profileOptimizationRun.findMany({
        include: profileOptimizationRunInclude,
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

  async getProfileOptimizationById(runId: string): Promise<ProfileOptimizationRunRecord> {
    const run = await getProfileOptimizationRunOrThrow(prisma, runId);
    return mapOptimizationRunRecord(run);
  },

  async listProfileCuttingPlans(query: ListProfileCuttingPlansQuery) {
    const where: Prisma.ProfileCuttingPlanWhereInput = {
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
      prisma.profileCuttingPlan.count({
        where,
      }),
      prisma.profileCuttingPlan.findMany({
        include: profileCuttingPlanListInclude,
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
      data: plans.map(mapProfileCuttingPlanListItem),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async getProfileCuttingPlanById(planId: string): Promise<ProfileCuttingPlanRecord> {
    const plan = await getProfileCuttingPlanOrThrow(prisma, planId);
    return mapProfileCuttingPlanRecord(plan);
  },
};
