import { randomUUID } from "node:crypto";

import { prisma } from "../src/utils/prisma.js";
import { cuttingService } from "../src/modules/cutting/cutting.service.js";
import { inventoryService } from "../src/modules/inventory/inventory.service.js";
import type { ProductTemplateSimulationResult } from "../src/modules/product-templates/product-templates.types.js";

const ensure = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const requireValue = <T>(value: T | null | undefined, message: string): T => {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
};

const roundTo = (value: number, decimals = 4): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const areaFromDimensions = (widthMm: number, heightMm: number): number => {
  return roundTo((widthMm * heightMm) / 1_000_000, 4);
};

const main = async () => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const warehouseCode = `WH-CUT-${suffix}`;
  const clientCode = `CLI-CUT-${suffix}`;
  const projectCode = `PRJ-CUT-${suffix}`;
  const quotationCode = `QTN-CUT-${suffix}`;

  const actor = requireValue(
    await prisma.user.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        email: true,
        id: true,
        name: true,
      },
      where: {
        deletedAt: null,
      },
    }),
    "No active user was found for smoke verification.",
  );

  const material = requireValue(
    await prisma.material.findUnique({
      select: {
        allowsRotation: true,
        code: true,
        id: true,
        isCuttable: true,
        materialType: true,
        name: true,
        stockUnit: true,
        thicknessMm: true,
      },
      where: {
        code: "VID-CLR-006",
      },
    }),
    'Expected seeded glass material "VID-CLR-006" to exist.',
  );

  ensure(
    material.materialType === "SHEET",
    `Material ${material.code} must be a sheet material for this smoke test.`,
  );
  ensure(
    material.isCuttable,
    `Material ${material.code} must be marked as cuttable for this smoke test.`,
  );

  const thicknessMm = Number(material.thicknessMm ?? 6);
  const stockWidthMm = 3210;
  const stockHeightMm = 2250;
  const remnantWidthMm = 1600;
  const remnantHeightMm = 1200;
  const stockAreaM2 = areaFromDimensions(stockWidthMm, stockHeightMm);
  const remnantAreaM2 = areaFromDimensions(remnantWidthMm, remnantHeightMm);
  const stockQuantity = material.stockUnit === "M2" ? stockAreaM2 : 1;
  const remnantQuantity = material.stockUnit === "M2" ? remnantAreaM2 : 1;

  const warehouse = await inventoryService.createWarehouse(
    {
      address: null,
      code: warehouseCode,
      description: "Temporary Module 9 smoke verification warehouse.",
      latitude: null,
      longitude: null,
      name: `Cutting Smoke ${suffix}`,
      status: "ACTIVE",
    },
    actor.id,
  );

  const fullSheetStock = await inventoryService.createStockEntry(
    {
      batchNumber: `BATCH-${suffix}`,
      condition: "AVAILABLE",
      heightMm: stockHeightMm,
      lengthMm: stockHeightMm,
      locationCode: `CUT-${suffix}`,
      materialId: material.id,
      notes: "Seed full sheet for Module 9 smoke verification.",
      quantity: stockQuantity,
      sourceId: suffix,
      sourceType: "MANUAL",
      stockType: "STANDARD",
      thicknessMm,
      unit: material.stockUnit,
      warehouseId: warehouse.id,
      widthMm: stockWidthMm,
    },
    actor.id,
  );

  const seedRemnant = await inventoryService.createRemnantPiece(
    {
      code: `RMN-SEED-${suffix}`,
      lengthMm: remnantHeightMm,
      materialId: material.id,
      notes: "Seed remnant for Module 9 smoke verification.",
      parentInventoryStockId: fullSheetStock.id,
      quantity: remnantQuantity,
      sourceId: suffix,
      sourceType: "MANUAL",
      thicknessMm,
      unit: material.stockUnit,
      warehouseId: warehouse.id,
      widthMm: remnantWidthMm,
    },
    actor.id,
  );

  const client = await prisma.client.create({
    data: {
      clientType: "COMPANY",
      code: clientCode,
      commercialName: `Cutting Smoke ${suffix}`,
      country: "Bolivia",
      email: `cutting-smoke-${suffix.toLowerCase()}@example.com`,
      legalName: `Cutting Smoke ${suffix} SRL`,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      code: projectCode,
      priority: "NORMAL",
      projectType: "WINDOW",
      status: "QUOTATION_PENDING",
      title: `Cutting Smoke ${suffix}`,
    },
    select: {
      id: true,
    },
  });

  const simulationResult: ProductTemplateSimulationResult = {
    cuts: {
      linear: [],
      sheets: [
        {
          allowRotation: true,
          label: "Panel A",
          materialId: material.id,
          quantity: 1,
          requiredHeightMm: 1000,
          requiredWidthMm: 1500,
          sheetPieces: [
            {
              heightMm: 1000,
              widthMm: 1500,
            },
          ],
          thicknessMm,
          wastePercent: 8,
        },
        {
          allowRotation: false,
          label: "Panel B",
          materialId: material.id,
          quantity: 3,
          requiredHeightMm: 1000,
          requiredWidthMm: 2100,
          sheetPieces: [
            {
              heightMm: 1000,
              widthMm: 2100,
            },
            {
              heightMm: 1000,
              widthMm: 2100,
            },
            {
              heightMm: 1000,
              widthMm: 2100,
            },
          ],
          thicknessMm,
          wastePercent: 8,
        },
      ],
    },
    inputs: {
      panelCount: 4,
    },
    labor: [],
    laborCost: 0,
    marginPercent: 0,
    materials: [],
    subtotalCost: 0,
    suggestedSalePrice: 0,
    totalCost: 0,
    warnings: [],
    wasteCost: 0,
  };

  const quotation = await prisma.quotation.create({
    data: {
      clientId: client.id,
      code: quotationCode,
      createdByUserId: actor.id,
      currency: "BOB",
      projectId: project.id,
      status: "DRAFT",
    },
    select: {
      id: true,
    },
  });

  const quotationItem = await prisma.quotationItem.create({
    data: {
      calculationResultJson: {
        kind: "template_simulation",
        requestedQuantity: 1,
        result: simulationResult,
      },
      itemType: "TEMPLATE_PRODUCT",
      name: "Glass Assembly",
      quantity: 1,
      quotationId: quotation.id,
      sortOrder: 0,
      subtotalCost: 0,
      subtotalSale: 0,
    },
    select: {
      id: true,
    },
  });

  const requirementsFromSimulation =
    cuttingService.collectGlassRequirementsFromTemplateSimulation(simulationResult);
  ensure(
    requirementsFromSimulation.pieces.length === 4,
    "Template simulation requirement collection should yield 4 cut pieces.",
  );

  const requirementsFromQuotation =
    await cuttingService.collectGlassRequirementsFromQuotation(quotation.id);
  ensure(
    requirementsFromQuotation.warnings.length === 0,
    "Quotation requirement extraction should not emit warnings in the smoke scenario.",
  );
  ensure(
    requirementsFromQuotation.pieces.length === 4,
    "Quotation requirement extraction should yield 4 cut pieces.",
  );
  ensure(
    requirementsFromQuotation.pieces.every(
      (piece) => piece.quotationItemId === quotationItem.id,
    ),
    "Quotation requirement extraction should preserve quotationItemId links.",
  );

  const remnantCandidates = await cuttingService.findCandidateRemnants(
    material.id,
    warehouse.id,
    requirementsFromQuotation.pieces,
  );
  ensure(
    remnantCandidates.some((candidate) => candidate.remnantPieceId === seedRemnant.id),
    "Expected the seeded remnant to appear as a candidate.",
  );

  const sheetCandidates = await cuttingService.findCandidateSheets(
    material.id,
    warehouse.id,
    requirementsFromQuotation.pieces,
  );
  ensure(
    sheetCandidates.some(
      (candidate) => candidate.inventoryStockId === fullSheetStock.id,
    ),
    "Expected the seeded full sheet to appear as a candidate.",
  );

  const commercialRun = await cuttingService.runGlassOptimization(
    {
      allowRotation: true,
      materialId: material.id,
      mode: "COMMERCIAL_ESTIMATION",
      pieces: requirementsFromQuotation.pieces,
      preferRemnants: true,
      projectId: project.id,
      quotationId: quotation.id,
      warehouseId: null,
    },
    actor.id,
  );

  ensure(
    commercialRun.status === "COMPLETED",
    "Commercial estimation optimization should complete successfully.",
  );
  const commercialResult = requireValue(
    commercialRun.resultJson,
    "Commercial estimation optimization should return result data.",
  );

  const commercialSources = new Set(
    commercialResult.groups.flatMap((group) =>
      group.sheets.map((sheet) => sheet.sheetSource),
    ),
  );
  ensure(
    commercialSources.size === 1 && commercialSources.has("VIRTUAL"),
    "Commercial estimation should use virtual sheets only in the smoke scenario.",
  );

  const operationalRun = await cuttingService.runGlassOptimization(
    {
      allowRotation: true,
      materialId: material.id,
      mode: "OPERATIONAL_PURCHASE",
      pieces: requirementsFromQuotation.pieces,
      preferRemnants: true,
      projectId: project.id,
      quotationId: quotation.id,
      warehouseId: warehouse.id,
    },
    actor.id,
  );

  ensure(
    operationalRun.status === "COMPLETED",
    "Operational purchase optimization should complete successfully.",
  );
  const operationalResult = requireValue(
    operationalRun.resultJson,
    "Operational purchase optimization should return result data.",
  );

  const operationalGroup = requireValue(
    operationalResult.groups[0],
    "Expected a cutting result group for the smoke scenario.",
  );

  const operationalSources = new Set(
    operationalGroup.sheets.map((sheet) => sheet.sheetSource),
  );
  ensure(
    operationalSources.has("REMNANT"),
    "Operational purchase optimization should consume remnants first.",
  );
  ensure(
    operationalSources.has("INVENTORY_SHEET"),
    "Operational purchase optimization should consume available full sheets.",
  );
  ensure(
    operationalSources.has("PURCHASE_REQUIRED"),
    "Operational purchase optimization should create purchase-required sheets when stock is insufficient.",
  );
  ensure(
    operationalGroup.sheets.every((sheet) =>
      sheet.pieces.every(
        (piece) => typeof piece.xMm === "number" && typeof piece.yMm === "number",
      ),
    ),
    "Operational purchase optimization should emit layout coordinates for all placed pieces.",
  );

  const createdPlans = await cuttingService.generateCuttingPlanFromOptimizationRun(
    operationalRun.id,
    actor.id,
  );
  ensure(
    createdPlans.length === 1,
    "Expected a single cutting plan for the single-material smoke scenario.",
  );

  const generatedPlan = requireValue(
    createdPlans[0],
    "Expected a generated cutting plan.",
  );
  ensure(
    generatedPlan.sheetCount >= 3,
    "Generated cutting plan should include remnant, inventory, and purchase-required sheets.",
  );

  const approvedPlan = await cuttingService.approveCuttingPlan(
    generatedPlan.id,
    actor.id,
    {
      notes: "Module 9 smoke verification approval.",
    },
  );
  ensure(
    approvedPlan.status === "APPROVED",
    "Generated cutting plan should be approvable.",
  );

  const approvedRun = await cuttingService.getCuttingOptimizationRunById(
    operationalRun.id,
  );
  ensure(
    approvedRun.status === "APPROVED",
    "Optimization run should move to APPROVED once its cutting plan is approved.",
  );

  const planWithRemnants = await cuttingService.createRemnantsFromCuttingPlan(
    generatedPlan.id,
    actor.id,
  );
  const createdRemnantOutputs = planWithRemnants.sheets.flatMap((sheet) =>
    sheet.remnantOutputs.filter((output) => output.status === "CREATED"),
  );
  ensure(
    createdRemnantOutputs.length > 0,
    "Approving the plan should allow remnant creation for qualifying waste zones.",
  );

  let duplicateRemnantCreationBlocked = false;

  try {
    await cuttingService.createRemnantsFromCuttingPlan(generatedPlan.id, actor.id);
  } catch (error) {
    duplicateRemnantCreationBlocked =
      error instanceof Error &&
      /already been created/i.test(error.message);
  }

  ensure(
    duplicateRemnantCreationBlocked,
    "Creating plan remnants twice should be blocked.",
  );

  const printablePlan = await cuttingService.getPrintableCuttingPlan(
    generatedPlan.id,
    actor.id,
  );
  ensure(
    printablePlan.sheets.length === approvedPlan.sheets.length,
    "Printable plan should expose the same sheet count as the approved plan.",
  );

  const failedRunStartedAt = new Date();
  let oversizedOptimizationFailed = false;

  try {
    await cuttingService.runGlassOptimization(
      {
        allowRotation: false,
        materialId: material.id,
        mode: "COMMERCIAL_ESTIMATION",
        pieces: [
          {
            allowRotation: false,
            heightMm: 5000,
            label: "Oversized smoke-test panel",
            materialId: material.id,
            metadata: {
              suffix,
            },
            quantity: 1,
            quotationItemId: null,
            thicknessMm,
            widthMm: 5000,
          },
        ],
        preferRemnants: false,
        projectId: project.id,
        quotationId: quotation.id,
        warehouseId: null,
      },
      actor.id,
    );
  } catch (error) {
    oversizedOptimizationFailed =
      error instanceof Error &&
      /could not place any piece|exceeds/i.test(error.message);
  }

  ensure(
    oversizedOptimizationFailed,
    "Oversized optimization should fail with a clear validation error.",
  );

  const failedRun = requireValue(
    await prisma.cuttingOptimizationRun.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
      },
      where: {
        createdAt: {
          gte: failedRunStartedAt,
        },
        quotationId: quotation.id,
        status: "FAILED",
      },
    }),
    "Expected a failed optimization run record to be persisted.",
  );

  let failedPlanGenerationBlocked = false;

  try {
    await cuttingService.generateCuttingPlanFromOptimizationRun(
      failedRun.id,
      actor.id,
    );
  } catch (error) {
    failedPlanGenerationBlocked =
      error instanceof Error &&
      /failed optimization run/i.test(error.message);
  }

  ensure(
    failedPlanGenerationBlocked,
    "Generating a cutting plan from a failed optimization run should be blocked.",
  );

  const auditActions = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      action: true,
    },
    where: {
      action: {
        startsWith: "cutting.",
      },
      entityId: {
        in: [
          commercialRun.id,
          operationalRun.id,
          generatedPlan.id,
          failedRun.id,
        ],
      },
    },
  });

  const auditActionSet = new Set(auditActions.map((entry) => entry.action));

  [
    "cutting.optimization_run.created",
    "cutting.optimization_run.completed",
    "cutting.optimization_run.failed",
    "cutting.plan.generated",
    "cutting.plan.approved",
    "cutting.plan.remnants_created",
    "cutting.plan.printed",
  ].forEach((action) => {
    ensure(auditActionSet.has(action), `Expected audit log action ${action}.`);
  });

  const summary = {
    actor: actor.email,
    auditActions: Array.from(auditActionSet).sort(),
    commercialRun: {
      code: commercialRun.code,
      sheetCount: commercialRun.resultJson?.totals.sheetCount ?? 0,
      sources: Array.from(commercialSources).sort(),
      wastePercent: commercialRun.wastePercent,
    },
    failedRun: {
      id: failedRun.id,
      status: failedRun.status,
    },
    operationalRun: {
      code: operationalRun.code,
      sheetCount: operationalGroup.sheets.length,
      sources: Array.from(operationalSources).sort(),
      wastePercent: operationalRun.wastePercent,
    },
    printablePlan: {
      code: printablePlan.code,
      remnantOutputsCreated: createdRemnantOutputs.length,
      sheetCount: printablePlan.sheets.length,
      status: printablePlan.status,
    },
    quotation: quotationCode,
    warehouse: warehouseCode,
  };

  console.log(JSON.stringify(summary, null, 2));
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
