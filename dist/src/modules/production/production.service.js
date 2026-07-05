import { randomUUID } from "node:crypto";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { buildDateRangeFilter, toLogJsonValue } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { convertMaterialUnit } from "../materials/materials.behavior.js";
import { REMNANT_PIECE_ENTITY_TYPE } from "../inventory/inventory.constants.js";
import { PRODUCTION_ENTITY_TYPES } from "./production.constants.js";
const userSummarySelect = {
    email: true,
    id: true,
    name: true,
};
const projectSummarySelect = {
    code: true,
    id: true,
    title: true,
};
const quotationSummarySelect = {
    code: true,
    id: true,
    status: true,
};
const cuttingPlanSummarySelect = {
    code: true,
    id: true,
    sheetCount: true,
    status: true,
    totalWasteAreaM2: true,
    wastePercent: true,
};
const warehouseSummarySelect = {
    code: true,
    id: true,
    name: true,
};
const materialSummarySelect = {
    code: true,
    id: true,
    materialType: true,
    name: true,
};
const inventoryStockSummarySelect = {
    batchNumber: true,
    condition: true,
    heightMm: true,
    id: true,
    lengthMm: true,
    locationCode: true,
    quantity: true,
    stockType: true,
    thicknessMm: true,
    unit: true,
    warehouse: {
        select: warehouseSummarySelect,
    },
    widthMm: true,
};
const remnantSummarySelect = {
    code: true,
    id: true,
    lengthMm: true,
    quantity: true,
    status: true,
    thicknessMm: true,
    unit: true,
    usableAreaM2: true,
    warehouse: {
        select: warehouseSummarySelect,
    },
    widthMm: true,
};
const materialForConversionSelect = {
    code: true,
    deletedAt: true,
    id: true,
    isRemnantEligible: true,
    materialType: true,
    minimumReusableHeightMm: true,
    minimumReusableLengthMm: true,
    minimumReusableWidthMm: true,
    name: true,
    stockUnit: true,
    unitConversionJson: true,
};
const productionTaskInclude = {
    assignedToUser: {
        select: userSummarySelect,
    },
};
const productionJobItemInclude = {
    material: {
        select: materialSummarySelect,
    },
};
const materialConsumptionInclude = {
    consumedByUser: {
        select: userSummarySelect,
    },
    inventoryStock: {
        select: inventoryStockSummarySelect,
    },
    material: {
        select: materialSummarySelect,
    },
    remnantPiece: {
        select: remnantSummarySelect,
    },
};
const qualityCheckInclude = {
    checkedByUser: {
        select: userSummarySelect,
    },
};
const productionStatusHistoryInclude = {
    changedByUser: {
        select: userSummarySelect,
    },
};
const productionWasteReportInclude = {
    cuttingPlan: {
        select: cuttingPlanSummarySelect,
    },
};
const productionJobListInclude = {
    _count: {
        select: {
            items: true,
            materialConsumptions: true,
            qualityChecks: true,
            tasks: true,
        },
    },
    assignedToUser: {
        select: userSummarySelect,
    },
    createdByUser: {
        select: userSummarySelect,
    },
    cuttingPlan: {
        select: cuttingPlanSummarySelect,
    },
    project: {
        select: projectSummarySelect,
    },
    quotation: {
        select: quotationSummarySelect,
    },
    tasks: {
        select: {
            status: true,
        },
    },
    wasteReports: {
        include: productionWasteReportInclude,
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
        take: 1,
    },
};
const productionJobDetailInclude = {
    ...productionJobListInclude,
    items: {
        include: productionJobItemInclude,
        orderBy: [
            {
                createdAt: "asc",
            },
        ],
    },
    materialConsumptions: {
        include: materialConsumptionInclude,
        orderBy: [
            {
                consumedAt: "desc",
            },
            {
                createdAt: "desc",
            },
        ],
    },
    qualityChecks: {
        include: qualityCheckInclude,
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
    statusHistory: {
        include: productionStatusHistoryInclude,
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
    tasks: {
        include: productionTaskInclude,
        orderBy: [
            {
                sortOrder: "asc",
            },
            {
                createdAt: "asc",
            },
        ],
    },
};
const cuttingPlanForJobInclude = {
    material: {
        select: {
            ...materialSummarySelect,
            stockUnit: true,
        },
    },
    optimizationRun: {
        select: {
            projectId: true,
            quotationId: true,
        },
    },
    sheets: {
        include: {
            pieces: {
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
};
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
const toIsoString = (value) => {
    return value ? value.toISOString() : null;
};
const roundQuantity = (value) => {
    return Number(value.toFixed(4));
};
const toInputJsonValue = (value) => {
    const serializedValue = toLogJsonValue(value);
    return serializedValue === null ? PrismaNamespace.JsonNull : serializedValue;
};
const mapUserSummary = (user) => {
    return user
        ? {
            email: user.email,
            id: user.id,
            name: user.name,
        }
        : null;
};
const mapWarehouseSummary = (warehouse) => {
    return warehouse
        ? {
            code: warehouse.code,
            id: warehouse.id,
            name: warehouse.name,
        }
        : null;
};
const mapProjectSummary = (project) => {
    return project
        ? {
            code: project.code,
            id: project.id,
            title: project.title,
        }
        : null;
};
const mapQuotationSummary = (quotation) => {
    return quotation
        ? {
            code: quotation.code,
            id: quotation.id,
            status: quotation.status,
        }
        : null;
};
const mapCuttingPlanSummary = (plan) => {
    return plan
        ? {
            code: plan.code,
            id: plan.id,
            sheetCount: plan.sheetCount,
            status: plan.status,
            wastePercent: Number(plan.wastePercent),
        }
        : null;
};
const mapMaterialSummary = (material) => {
    return material
        ? {
            code: material.code,
            id: material.id,
            materialType: material.materialType,
            name: material.name,
        }
        : null;
};
const mapInventoryStockSummary = (stock) => {
    return stock
        ? {
            batchNumber: stock.batchNumber,
            condition: stock.condition,
            heightMm: decimalToNumber(stock.heightMm),
            id: stock.id,
            lengthMm: decimalToNumber(stock.lengthMm),
            locationCode: stock.locationCode,
            quantity: Number(stock.quantity),
            stockType: stock.stockType,
            thicknessMm: decimalToNumber(stock.thicknessMm),
            unit: stock.unit,
            warehouse: mapWarehouseSummary(stock.warehouse),
            widthMm: decimalToNumber(stock.widthMm),
        }
        : null;
};
const mapRemnantSummary = (remnant) => {
    return remnant
        ? {
            code: remnant.code,
            id: remnant.id,
            lengthMm: decimalToNumber(remnant.lengthMm),
            quantity: Number(remnant.quantity),
            status: remnant.status,
            thicknessMm: decimalToNumber(remnant.thicknessMm),
            unit: remnant.unit,
            usableAreaM2: decimalToNumber(remnant.usableAreaM2),
            warehouse: mapWarehouseSummary(remnant.warehouse),
            widthMm: decimalToNumber(remnant.widthMm),
        }
        : null;
};
const mapProductionJobItem = (item) => {
    return {
        createdAt: item.createdAt.toISOString(),
        description: item.description,
        id: item.id,
        material: mapMaterialSummary(item.material),
        metadataJson: item.metadataJson,
        name: item.name,
        quantity: Number(item.quantity),
        quotationItemId: item.quotationItemId,
        status: item.status,
        updatedAt: item.updatedAt.toISOString(),
    };
};
const mapProductionTask = (task) => {
    return {
        assignedToUser: mapUserSummary(task.assignedToUser),
        completedAt: toIsoString(task.completedAt),
        createdAt: task.createdAt.toISOString(),
        description: task.description,
        id: task.id,
        productionJobId: task.productionJobId,
        productionJobItemId: task.productionJobItemId,
        sortOrder: task.sortOrder,
        startedAt: toIsoString(task.startedAt),
        status: task.status,
        taskType: task.taskType,
        title: task.title,
        updatedAt: task.updatedAt.toISOString(),
    };
};
const mapMaterialConsumption = (consumption) => {
    return {
        consumedAt: consumption.consumedAt.toISOString(),
        consumedByUser: mapUserSummary(consumption.consumedByUser),
        consumptionType: consumption.consumptionType,
        createdAt: consumption.createdAt.toISOString(),
        id: consumption.id,
        inventoryStock: mapInventoryStockSummary(consumption.inventoryStock),
        material: mapMaterialSummary(consumption.material),
        notes: consumption.notes,
        productionJobId: consumption.productionJobId,
        productionTaskId: consumption.productionTaskId,
        quantity: Number(consumption.quantity),
        remnantPiece: mapRemnantSummary(consumption.remnantPiece),
        sourceType: consumption.sourceType,
        unit: consumption.unit,
    };
};
const mapQualityCheck = (check) => {
    return {
        checkedAt: toIsoString(check.checkedAt),
        checkedByUser: mapUserSummary(check.checkedByUser),
        createdAt: check.createdAt.toISOString(),
        evidenceJson: check.evidenceJson,
        id: check.id,
        notes: check.notes,
        productionJobId: check.productionJobId,
        productionTaskId: check.productionTaskId,
        status: check.status,
        updatedAt: check.updatedAt.toISOString(),
    };
};
const mapProductionStatusHistory = (entry) => {
    return {
        changedByUser: mapUserSummary(entry.changedByUser),
        createdAt: entry.createdAt.toISOString(),
        fromStatus: entry.fromStatus,
        id: entry.id,
        notes: entry.notes,
        toStatus: entry.toStatus,
    };
};
const mapWasteReport = (report) => {
    if (!report) {
        return null;
    }
    return {
        actualWasteAreaM2: Number(report.actualWasteAreaM2),
        actualWastePercent: Number(report.actualWastePercent),
        createdAt: report.createdAt.toISOString(),
        cuttingPlan: mapCuttingPlanSummary(report.cuttingPlan),
        hasActualWasteData: Number(report.actualWasteAreaM2) > 0,
        id: report.id,
        notes: report.notes,
        productionJobId: report.productionJobId,
        theoreticalWasteAreaM2: Number(report.theoreticalWasteAreaM2),
        theoreticalWastePercent: Number(report.theoreticalWastePercent),
        updatedAt: report.updatedAt.toISOString(),
        varianceAreaM2: Number(report.varianceAreaM2),
        variancePercent: Number(report.variancePercent),
    };
};
const mapProductionJobListItem = (job) => {
    const completedTaskCount = job.tasks.filter((task) => task.status === "COMPLETED").length;
    const pendingTaskCount = job.tasks.filter((task) => ["BLOCKED", "IN_PROGRESS", "PENDING"].includes(task.status)).length;
    return {
        actualEndDate: toIsoString(job.actualEndDate),
        actualStartDate: toIsoString(job.actualStartDate),
        assignedToUser: mapUserSummary(job.assignedToUser),
        code: job.code,
        completedTaskCount,
        consumptionCount: job._count.materialConsumptions,
        createdAt: job.createdAt.toISOString(),
        createdByUser: mapUserSummary(job.createdByUser),
        cuttingPlan: mapCuttingPlanSummary(job.cuttingPlan),
        id: job.id,
        itemCount: job._count.items,
        notes: job.notes,
        pendingTaskCount,
        plannedEndDate: toIsoString(job.plannedEndDate),
        plannedStartDate: toIsoString(job.plannedStartDate),
        priority: job.priority,
        project: mapProjectSummary(job.project),
        qualityCheckCount: job._count.qualityChecks,
        quotation: mapQuotationSummary(job.quotation),
        status: job.status,
        taskCount: job._count.tasks,
        updatedAt: job.updatedAt.toISOString(),
        wasteReport: mapWasteReport(job.wasteReports[0] ?? null),
    };
};
const mapProductionJobDetail = (job) => {
    const base = mapProductionJobListItem(job);
    return {
        ...base,
        deletedAt: toIsoString(job.deletedAt),
        items: job.items.map(mapProductionJobItem),
        materialConsumptions: job.materialConsumptions.map(mapMaterialConsumption),
        qualityChecks: job.qualityChecks.map(mapQualityCheck),
        statusHistory: job.statusHistory.map(mapProductionStatusHistory),
        tasks: job.tasks.map(mapProductionTask),
    };
};
const materialBehaviorFromRecord = (material) => {
    return {
        code: material.code,
        materialType: material.materialType,
        name: material.name,
        unitConversionJson: material.unitConversionJson ?? null,
    };
};
const convertQuantity = (material, quantity, fromUnit, toUnit) => {
    return roundQuantity(convertMaterialUnit({
        fromUnit,
        material: materialBehaviorFromRecord(material),
        quantity,
        toUnit,
    }));
};
const buildProductionJobsWhereClause = (query) => {
    const plannedWindow = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
        deletedAt: null,
        ...(query.assignedToUserId
            ? {
                assignedToUserId: query.assignedToUserId,
            }
            : {}),
        ...(query.priority
            ? {
                priority: query.priority,
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
        ...(plannedWindow
            ? {
                plannedStartDate: plannedWindow,
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
                        notes: {
                            contains: query.search,
                        },
                    },
                    {
                        assignedToUser: {
                            name: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        project: {
                            OR: [
                                {
                                    code: {
                                        contains: query.search,
                                    },
                                },
                                {
                                    title: {
                                        contains: query.search,
                                    },
                                },
                            ],
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
                        cuttingPlan: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const auditProductionAction = async (input) => {
    await auditLogService.create({
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        after: input.after,
        before: input.before,
        entityId: input.entityId,
        entityType: input.entityType,
        metadata: input.metadata,
    }, input.db
        ? {
            db: input.db,
        }
        : undefined);
};
const generateProductionJobCode = async (db, value = new Date()) => {
    const year = value.getUTCFullYear();
    const prefix = `PRD-${year}-`;
    const latest = await db.productionJob.findFirst({
        orderBy: {
            code: "desc",
        },
        select: {
            code: true,
        },
        where: {
            code: {
                startsWith: prefix,
            },
        },
    });
    const latestSequence = latest?.code.match(/(\d+)$/)?.[1];
    const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;
    return `${prefix}${String(nextSequence).padStart(4, "0")}`;
};
const getMaterialOrThrow = async (db, materialId) => {
    const material = await db.material.findUnique({
        select: materialForConversionSelect,
        where: {
            id: materialId,
        },
    });
    if (!material || material.deletedAt) {
        throw new AppError("Material not found.", 404);
    }
    return material;
};
const getInventoryStockOrThrow = async (db, inventoryStockId) => {
    const stock = await db.inventoryStock.findUnique({
        include: {
            warehouse: {
                select: warehouseSummarySelect,
            },
        },
        where: {
            id: inventoryStockId,
        },
    });
    if (!stock || stock.deletedAt) {
        throw new AppError("Inventory stock not found.", 404);
    }
    return stock;
};
const getRemnantOrThrow = async (db, remnantPieceId) => {
    const remnant = await db.remnantPiece.findUnique({
        include: {
            warehouse: {
                select: warehouseSummarySelect,
            },
        },
        where: {
            id: remnantPieceId,
        },
    });
    if (!remnant) {
        throw new AppError("Remnant piece not found.", 404);
    }
    return remnant;
};
const getProductionJobByIdOrThrow = async (db, productionJobId) => {
    const job = await db.productionJob.findUnique({
        include: productionJobDetailInclude,
        where: {
            id: productionJobId,
        },
    });
    if (!job || job.deletedAt) {
        throw new AppError("Production job not found.", 404);
    }
    return job;
};
const getProductionTaskByIdOrThrow = async (db, productionTaskId) => {
    const task = await db.productionTask.findUnique({
        include: {
            assignedToUser: {
                select: userSummarySelect,
            },
            productionJob: {
                include: productionJobDetailInclude,
            },
        },
        where: {
            id: productionTaskId,
        },
    });
    if (!task) {
        throw new AppError("Production task not found.", 404);
    }
    return task;
};
const assertSourceIsAvailable = (job) => {
    if (["CANCELLED", "COMPLETED"].includes(job.status)) {
        throw new AppError("Cannot consume material for a completed or cancelled production job.", 400);
    }
};
const createStatusHistory = async (db, input) => {
    return db.productionStatusHistory.create({
        data: {
            changedByUserId: input.changedByUserId ?? null,
            fromStatus: input.fromStatus,
            notes: input.notes ?? null,
            productionJobId: input.productionJobId,
            toStatus: input.toStatus,
        },
    });
};
const createInventoryMovement = async (db, input) => {
    await db.inventoryMovement.create({
        data: {
            createdByUserId: input.createdByUserId ?? null,
            inventoryStockId: input.inventoryStockId ?? null,
            materialId: input.materialId,
            movementType: input.movementType,
            quantity: input.quantity,
            reason: input.reason ?? null,
            referenceId: input.referenceId ?? null,
            referenceType: input.referenceType ?? null,
            unit: input.unit,
            warehouseId: input.warehouseId,
        },
    });
};
const closeInventoryStock = async (db, stockId, condition) => {
    await db.inventoryStock.update({
        data: {
            condition,
            deletedAt: new Date(),
            quantity: new PrismaNamespace.Decimal(0),
        },
        where: {
            id: stockId,
        },
    });
};
const updateRemnantStatus = async (db, remnantId, status) => {
    await db.remnantPiece.update({
        data: {
            status,
        },
        where: {
            id: remnantId,
        },
    });
};
const createProductionRemnantOutput = async (db, input) => {
    if (!input.material.isRemnantEligible) {
        throw new AppError("This material is not eligible for remnant output.", 400);
    }
    if (input.material.minimumReusableLengthMm !== null &&
        input.lengthMm !== null &&
        input.lengthMm < Number(input.material.minimumReusableLengthMm)) {
        throw new AppError("Remnant length is below the minimum reusable length configured for this material.", 400);
    }
    if (input.material.minimumReusableWidthMm !== null &&
        input.widthMm !== null &&
        input.widthMm < Number(input.material.minimumReusableWidthMm)) {
        throw new AppError("Remnant width is below the minimum reusable width configured for this material.", 400);
    }
    const remnant = await db.remnantPiece.create({
        data: {
            code: input.code?.trim() || `RMN-${randomUUID().slice(0, 8).toUpperCase()}`,
            lengthMm: input.lengthMm,
            materialId: input.material.id,
            notes: input.notes ?? null,
            parentInventoryStockId: input.parentInventoryStockId ?? null,
            quantity: input.quantity,
            sourceType: "PRODUCTION_RETURN",
            thicknessMm: input.thicknessMm,
            unit: input.unit,
            usableAreaM2: input.lengthMm !== null && input.widthMm !== null
                ? roundQuantity((input.lengthMm * input.widthMm) / 1_000_000)
                : null,
            warehouseId: input.warehouseId,
            widthMm: input.widthMm,
        },
        include: {
            material: {
                select: materialSummarySelect,
            },
            warehouse: {
                select: warehouseSummarySelect,
            },
        },
    });
    const stock = await db.inventoryStock.create({
        data: {
            condition: "AVAILABLE",
            heightMm: input.lengthMm,
            lengthMm: input.lengthMm,
            materialId: input.material.id,
            notes: input.notes ?? null,
            quantity: input.quantity,
            sourceId: remnant.id,
            sourceType: "REMNANT_GENERATED",
            stockType: "REMNANT",
            thicknessMm: input.thicknessMm,
            unit: input.unit,
            warehouseId: input.warehouseId,
            widthMm: input.widthMm,
        },
    });
    await createInventoryMovement(db, {
        createdByUserId: input.userId,
        inventoryStockId: stock.id,
        materialId: input.material.id,
        movementType: "IN",
        quantity: input.quantity,
        reason: input.notes ?? "Production remnant output created.",
        referenceId: remnant.id,
        referenceType: "remnant_piece",
        unit: input.unit,
        warehouseId: input.warehouseId,
    });
    await auditProductionAction({
        action: "production.remnant_output_created",
        actorUserId: input.userId,
        after: {
            code: remnant.code,
            id: remnant.id,
            quantity: Number(remnant.quantity),
            warehouseId: remnant.warehouseId,
        },
        before: null,
        db,
        entityId: remnant.id,
        entityType: REMNANT_PIECE_ENTITY_TYPE,
    });
    return remnant;
};
const syncJobItemStatuses = async (db, productionJobId) => {
    const items = await db.productionJobItem.findMany({
        include: {
            tasks: {
                select: {
                    status: true,
                },
            },
        },
        where: {
            productionJobId,
        },
    });
    for (const item of items) {
        if (item.tasks.length === 0) {
            continue;
        }
        const statuses = item.tasks.map((task) => task.status);
        let nextStatus = "PENDING";
        if (statuses.every((status) => status === "CANCELLED")) {
            nextStatus = "CANCELLED";
        }
        else if (statuses.every((status) => status === "COMPLETED" || status === "CANCELLED")) {
            nextStatus = "COMPLETED";
        }
        else if (statuses.some((status) => ["BLOCKED", "COMPLETED", "IN_PROGRESS"].includes(status))) {
            nextStatus = "IN_PROGRESS";
        }
        if (item.status !== nextStatus) {
            await db.productionJobItem.update({
                data: {
                    status: nextStatus,
                },
                where: {
                    id: item.id,
                },
            });
        }
    }
};
const assertNoSourceConflict = async (db, input) => {
    if (!input.quotationId && !input.cuttingPlanId) {
        return;
    }
    const existing = await db.productionJob.findFirst({
        select: {
            code: true,
            id: true,
        },
        where: {
            deletedAt: null,
            ...(input.productionJobId
                ? {
                    id: {
                        not: input.productionJobId,
                    },
                }
                : {}),
            OR: [
                input.quotationId
                    ? {
                        quotationId: input.quotationId,
                        status: {
                            not: "CANCELLED",
                        },
                    }
                    : undefined,
                input.cuttingPlanId
                    ? {
                        cuttingPlanId: input.cuttingPlanId,
                        status: {
                            not: "CANCELLED",
                        },
                    }
                    : undefined,
            ].filter(Boolean),
        },
    });
    if (existing) {
        throw new AppError(`Production job ${existing.code} already exists for this source record.`, 409);
    }
};
const buildProfilePlanSourceMarker = (profileCuttingPlanId) => {
    return `[PROFILE_CUTTING_PLAN_ID=${profileCuttingPlanId}]`;
};
const assertNoProfilePlanConflict = async (db, profileCuttingPlanId) => {
    const sourceMarker = buildProfilePlanSourceMarker(profileCuttingPlanId);
    const existing = await db.productionJob.findFirst({
        select: {
            code: true,
            id: true,
        },
        where: {
            deletedAt: null,
            notes: {
                contains: sourceMarker,
            },
            status: {
                not: "CANCELLED",
            },
        },
    });
    if (existing) {
        throw new AppError(`Production job ${existing.code} already exists for this profile cutting plan.`, 409);
    }
};
const createJobWithUniqueCode = async (run) => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
            return await prisma.$transaction(async (db) => {
                const code = await generateProductionJobCode(db);
                return run(db, code);
            });
        }
        catch (error) {
            if (error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                continue;
            }
            throw error;
        }
    }
    throw new AppError("Unable to generate a unique production job code.", 500);
};
const createPlannedConsumptionsFromQuotation = async (db, input) => {
    for (const item of input.quotationItems) {
        for (const materialLine of item.materials) {
            if (!materialLine.materialId) {
                continue;
            }
            await db.materialConsumption.create({
                data: {
                    consumedAt: new Date(),
                    consumedByUserId: input.createdByUserId,
                    consumptionType: "PLANNED",
                    materialId: materialLine.materialId,
                    notes: `Planned from quotation item ${item.id}.`,
                    productionJobId: input.productionJobId,
                    quantity: roundQuantity(Number(materialLine.requiredQuantity) * Number(item.quantity)),
                    sourceType: "MANUAL",
                    unit: materialLine.unit,
                },
            });
        }
    }
};
const createPlannedConsumptionsFromCuttingPlan = async (db, input) => {
    for (const sheet of input.sheets) {
        const sourceType = sheet.sheetSource === "REMNANT"
            ? "REMNANT"
            : sheet.sheetSource === "INVENTORY_SHEET"
                ? "INVENTORY_STOCK"
                : "MANUAL";
        await db.materialConsumption.create({
            data: {
                consumedAt: new Date(),
                consumedByUserId: input.createdByUserId,
                consumptionType: "PLANNED",
                inventoryStockId: sheet.inventoryStockId,
                materialId: input.materialId,
                notes: "Planned from cutting plan sheet allocation.",
                productionJobId: input.productionJobId,
                quantity: input.stockUnit === "M2"
                    ? Number(sheet.sheetAreaM2)
                    : 1,
                remnantPieceId: sheet.remnantPieceId,
                sourceType,
                unit: input.stockUnit,
            },
        });
    }
};
const createPlannedConsumptionsFromProfileCuttingPlan = async (db, input) => {
    for (const bar of input.bars) {
        const sourceType = bar.sourceType === "REMNANT"
            ? "REMNANT"
            : bar.sourceType === "INVENTORY_BAR"
                ? "INVENTORY_STOCK"
                : "MANUAL";
        const plannedQuantity = input.material.stockUnit === "UNIT"
            ? 1
            : roundQuantity(convertMaterialUnit({
                fromUnit: "MM",
                material: {
                    materialType: input.material.materialType,
                    unitConversionJson: input.material.unitConversionJson,
                    ...(input.material.code
                        ? {
                            code: input.material.code,
                        }
                        : {}),
                    ...(input.material.name
                        ? {
                            name: input.material.name,
                        }
                        : {}),
                },
                quantity: Number(bar.originalLengthMm),
                toUnit: input.material.stockUnit,
            }));
        await db.materialConsumption.create({
            data: {
                consumedAt: new Date(),
                consumedByUserId: input.createdByUserId,
                consumptionType: "PLANNED",
                inventoryStockId: bar.inventoryStockId,
                materialId: input.materialId,
                notes: "Planned from profile cutting plan bar allocation.",
                productionJobId: input.productionJobId,
                quantity: plannedQuantity,
                remnantPieceId: bar.remnantPieceId,
                sourceType,
                unit: input.material.stockUnit,
            },
        });
    }
};
export const productionService = {
    async listProductionJobs(query) {
        const where = buildProductionJobsWhereClause(query);
        const [total, jobs] = await prisma.$transaction([
            prisma.productionJob.count({
                where,
            }),
            prisma.productionJob.findMany({
                include: productionJobListInclude,
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
            data: jobs.map(mapProductionJobListItem),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getProductionJobById(productionJobId) {
        const job = await getProductionJobByIdOrThrow(prisma, productionJobId);
        return mapProductionJobDetail(job);
    },
    async createProductionJobManually(input, userId) {
        await assertNoSourceConflict(prisma, {
            cuttingPlanId: input.cuttingPlanId,
            quotationId: input.quotationId,
        });
        const productionJobId = await createJobWithUniqueCode(async (db, code) => {
            const job = await db.productionJob.create({
                data: {
                    assignedToUserId: input.assignedToUserId,
                    code,
                    createdByUserId: userId,
                    cuttingPlanId: input.cuttingPlanId,
                    notes: input.notes,
                    plannedEndDate: input.plannedEndDate,
                    plannedStartDate: input.plannedStartDate,
                    priority: input.priority,
                    projectId: input.projectId,
                    quotationId: input.quotationId,
                    status: input.items.length > 0 || input.tasks.length > 0 || input.cuttingPlanId
                        ? "READY"
                        : "DRAFT",
                },
                select: {
                    id: true,
                    status: true,
                },
            });
            for (const item of input.items) {
                await db.productionJobItem.create({
                    data: {
                        description: item.description,
                        materialId: item.materialId,
                        metadataJson: toInputJsonValue(item.metadataJson),
                        name: item.name,
                        productionJobId: job.id,
                        quantity: item.quantity,
                        quotationItemId: item.quotationItemId,
                        status: item.status,
                    },
                });
            }
            for (const task of input.tasks) {
                await db.productionTask.create({
                    data: {
                        assignedToUserId: task.assignedToUserId,
                        description: task.description,
                        productionJobId: job.id,
                        productionJobItemId: task.productionJobItemId,
                        sortOrder: task.sortOrder,
                        status: task.status,
                        taskType: task.taskType,
                        title: task.title,
                    },
                });
            }
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: null,
                notes: "Production job created manually.",
                productionJobId: job.id,
                toStatus: job.status,
            });
            await auditProductionAction({
                action: "production.job_created",
                actorUserId: userId,
                after: {
                    code,
                    cuttingPlanId: input.cuttingPlanId,
                    itemCount: input.items.length,
                    projectId: input.projectId,
                    quotationId: input.quotationId,
                    status: job.status,
                    taskCount: input.tasks.length,
                },
                before: null,
                db,
                entityId: job.id,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return job.id;
        });
        return this.getProductionJobById(productionJobId);
    },
    async createProductionJobFromQuotation(quotationId, userId) {
        await assertNoSourceConflict(prisma, {
            quotationId,
        });
        const productionJobId = await createJobWithUniqueCode(async (db, code) => {
            const quotation = await db.quotation.findUnique({
                include: {
                    items: {
                        include: {
                            materials: {
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
                        where: {
                            quotationVersionId: null,
                        },
                    },
                },
                where: {
                    id: quotationId,
                },
            });
            if (!quotation || quotation.deletedAt) {
                throw new AppError("Quotation not found.", 404);
            }
            if (quotation.status !== "ACCEPTED") {
                throw new AppError("Production jobs can only be created from accepted quotations.", 400);
            }
            const cuttingPlan = await db.cuttingPlan.findFirst({
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
                select: {
                    id: true,
                },
                where: {
                    optimizationRun: {
                        quotationId,
                    },
                    status: {
                        in: ["APPROVED", "COMPLETED", "SENT_TO_PRODUCTION"],
                    },
                },
            });
            const job = await db.productionJob.create({
                data: {
                    code,
                    createdByUserId: userId,
                    cuttingPlanId: cuttingPlan?.id ?? null,
                    notes: `Created from quotation ${quotation.code}.`,
                    priority: "NORMAL",
                    projectId: quotation.projectId,
                    quotationId,
                    status: "READY",
                },
                select: {
                    id: true,
                },
            });
            for (const item of quotation.items.filter((entry) => !["DISCOUNT", "NOTE"].includes(entry.itemType))) {
                await db.productionJobItem.create({
                    data: {
                        description: item.description,
                        materialId: item.materials.length === 1 ? item.materials[0]?.materialId ?? null : null,
                        metadataJson: toInputJsonValue({
                            itemType: item.itemType,
                            materialCount: item.materials.length,
                            quotationItemId: item.id,
                        }),
                        name: item.name,
                        productionJobId: job.id,
                        quantity: Number(item.quantity),
                        quotationItemId: item.id,
                    },
                });
            }
            await createPlannedConsumptionsFromQuotation(db, {
                createdByUserId: userId,
                productionJobId: job.id,
                quotationItems: quotation.items.map((item) => ({
                    id: item.id,
                    materials: item.materials.map((materialLine) => ({
                        materialId: materialLine.materialId,
                        requiredQuantity: materialLine.requiredQuantity,
                        unit: materialLine.unit,
                    })),
                    quantity: item.quantity,
                })),
            });
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: null,
                notes: `Production job created from quotation ${quotation.code}.`,
                productionJobId: job.id,
                toStatus: "READY",
            });
            await auditProductionAction({
                action: "production.job_created_from_quotation",
                actorUserId: userId,
                after: {
                    code,
                    cuttingPlanId: cuttingPlan?.id ?? null,
                    quotationCode: quotation.code,
                    quotationId,
                    status: "READY",
                },
                before: null,
                db,
                entityId: job.id,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return job.id;
        });
        await this.generateProductionTasks(productionJobId, userId, {
            replaceExisting: false,
        });
        return this.getProductionJobById(productionJobId);
    },
    async createProductionJobFromCuttingPlan(cuttingPlanId, userId) {
        await assertNoSourceConflict(prisma, {
            cuttingPlanId,
        });
        const productionJobId = await createJobWithUniqueCode(async (db, code) => {
            const cuttingPlan = await db.cuttingPlan.findUnique({
                include: cuttingPlanForJobInclude,
                where: {
                    id: cuttingPlanId,
                },
            });
            if (!cuttingPlan) {
                throw new AppError("Cutting plan not found.", 404);
            }
            const job = await db.productionJob.create({
                data: {
                    code,
                    createdByUserId: userId,
                    cuttingPlanId,
                    notes: `Created from cutting plan ${cuttingPlan.code}.`,
                    priority: "NORMAL",
                    projectId: cuttingPlan.optimizationRun.projectId,
                    quotationId: cuttingPlan.optimizationRun.quotationId,
                    status: "READY",
                },
                select: {
                    id: true,
                },
            });
            for (const sheet of cuttingPlan.sheets) {
                for (const piece of sheet.pieces) {
                    await db.productionJobItem.create({
                        data: {
                            description: `Cutting plan sheet ${sheet.sortOrder + 1}.`,
                            materialId: piece.materialId,
                            metadataJson: toInputJsonValue({
                                areaM2: Number(piece.areaM2),
                                cuttingPlanSheetId: sheet.id,
                                heightMm: Number(piece.heightMm),
                                rotated: piece.rotated,
                                widthMm: Number(piece.widthMm),
                                xMm: decimalToNumber(piece.xMm),
                                yMm: decimalToNumber(piece.yMm),
                            }),
                            name: piece.label,
                            productionJobId: job.id,
                            quantity: piece.quantity,
                            quotationItemId: piece.quotationItemId,
                        },
                    });
                }
            }
            await createPlannedConsumptionsFromCuttingPlan(db, {
                createdByUserId: userId,
                materialId: cuttingPlan.materialId,
                productionJobId: job.id,
                sheets: cuttingPlan.sheets.map((sheet) => ({
                    inventoryStockId: sheet.inventoryStockId,
                    remnantPieceId: sheet.remnantPieceId,
                    sheetAreaM2: sheet.sheetAreaM2,
                    sheetSource: sheet.sheetSource,
                })),
                stockUnit: cuttingPlan.material.stockUnit,
            });
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: null,
                notes: `Production job created from cutting plan ${cuttingPlan.code}.`,
                productionJobId: job.id,
                toStatus: "READY",
            });
            await auditProductionAction({
                action: "production.job_created_from_cutting_plan",
                actorUserId: userId,
                after: {
                    code,
                    cuttingPlanCode: cuttingPlan.code,
                    cuttingPlanId,
                    status: "READY",
                },
                before: null,
                db,
                entityId: job.id,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return job.id;
        });
        await this.generateProductionTasks(productionJobId, userId, {
            replaceExisting: false,
        });
        return this.getProductionJobById(productionJobId);
    },
    async createProductionJobFromProfileCuttingPlan(profileCuttingPlanId, userId) {
        await assertNoProfilePlanConflict(prisma, profileCuttingPlanId);
        const sourceMarker = buildProfilePlanSourceMarker(profileCuttingPlanId);
        const productionJobId = await createJobWithUniqueCode(async (db, code) => {
            const profileCuttingPlan = await db.profileCuttingPlan.findUnique({
                include: {
                    bars: {
                        include: {
                            cutPieces: {
                                orderBy: [
                                    {
                                        positionMm: "asc",
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
                    material: {
                        select: {
                            ...materialSummarySelect,
                            stockUnit: true,
                            unitConversionJson: true,
                        },
                    },
                    optimizationRun: {
                        select: {
                            projectId: true,
                            quotationId: true,
                        },
                    },
                },
                where: {
                    id: profileCuttingPlanId,
                },
            });
            if (!profileCuttingPlan) {
                throw new AppError("Profile cutting plan not found.", 404);
            }
            const job = await db.productionJob.create({
                data: {
                    code,
                    createdByUserId: userId,
                    notes: `Created from profile cutting plan ${profileCuttingPlan.code}. ${sourceMarker}`,
                    priority: "NORMAL",
                    projectId: profileCuttingPlan.optimizationRun.projectId,
                    quotationId: profileCuttingPlan.optimizationRun.quotationId,
                    status: "READY",
                },
                select: {
                    id: true,
                },
            });
            for (const bar of profileCuttingPlan.bars) {
                for (const cut of bar.cutPieces) {
                    await db.productionJobItem.create({
                        data: {
                            description: `Profile cutting bar ${bar.sortOrder + 1}.`,
                            materialId: cut.materialId,
                            metadataJson: toInputJsonValue({
                                lengthMm: Number(cut.lengthMm),
                                positionMm: Number(cut.positionMm),
                                profileCuttingBarId: bar.id,
                            }),
                            name: cut.label,
                            productionJobId: job.id,
                            quantity: cut.quantity,
                            quotationItemId: cut.quotationItemId,
                        },
                    });
                }
            }
            await createPlannedConsumptionsFromProfileCuttingPlan(db, {
                bars: profileCuttingPlan.bars.map((bar) => ({
                    inventoryStockId: bar.inventoryStockId,
                    originalLengthMm: bar.originalLengthMm,
                    remnantPieceId: bar.remnantPieceId,
                    sourceType: bar.sourceType,
                })),
                createdByUserId: userId,
                material: {
                    code: profileCuttingPlan.material.code,
                    materialType: "LINEAR",
                    name: profileCuttingPlan.material.name,
                    stockUnit: profileCuttingPlan.material.stockUnit,
                    unitConversionJson: profileCuttingPlan.material.unitConversionJson,
                },
                materialId: profileCuttingPlan.material.id,
                productionJobId: job.id,
            });
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: null,
                notes: `Production job created from profile cutting plan ${profileCuttingPlan.code}.`,
                productionJobId: job.id,
                toStatus: "READY",
            });
            let sortOrder = 0;
            for (const bar of profileCuttingPlan.bars) {
                await db.productionTask.create({
                    data: {
                        description: `Execute profile bar ${bar.sortOrder + 1} using the generated cut sequence.`,
                        productionJobId: job.id,
                        sortOrder,
                        taskType: "CUT_PROFILE",
                        title: `Cut profile bar ${bar.sortOrder + 1}`,
                    },
                    include: productionTaskInclude,
                });
                sortOrder += 1;
            }
            for (const sharedTask of [
                {
                    taskType: "QUALITY_CHECK",
                    title: "Quality check",
                },
                {
                    taskType: "PACK",
                    title: "Pack finished work",
                },
            ]) {
                await db.productionTask.create({
                    data: {
                        productionJobId: job.id,
                        sortOrder,
                        taskType: sharedTask.taskType,
                        title: sharedTask.title,
                    },
                    include: productionTaskInclude,
                });
                sortOrder += 1;
            }
            await auditProductionAction({
                action: "production.job_created_from_profile_cutting_plan",
                actorUserId: userId,
                after: {
                    code,
                    profileCuttingPlanCode: profileCuttingPlan.code,
                    profileCuttingPlanId,
                    status: "READY",
                },
                before: null,
                db,
                entityId: job.id,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return job.id;
        });
        return this.getProductionJobById(productionJobId);
    },
    async updateProductionJob(productionJobId, input, userId) {
        return prisma.$transaction(async (db) => {
            const existing = await getProductionJobByIdOrThrow(db, productionJobId);
            if (["CANCELLED", "COMPLETED"].includes(existing.status)) {
                throw new AppError("Completed or cancelled production jobs cannot be edited.", 400);
            }
            await db.productionJob.update({
                data: {
                    assignedToUserId: input.assignedToUserId,
                    notes: input.notes,
                    plannedEndDate: input.plannedEndDate,
                    plannedStartDate: input.plannedStartDate,
                    priority: input.priority,
                },
                where: {
                    id: productionJobId,
                },
            });
            const current = await getProductionJobByIdOrThrow(db, productionJobId);
            await auditProductionAction({
                action: "production.job_updated",
                actorUserId: userId,
                after: mapProductionJobDetail(current),
                before: mapProductionJobDetail(existing),
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return mapProductionJobDetail(current);
        });
    },
    async deleteProductionJob(productionJobId, userId) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            if (job.materialConsumptions.length > 0) {
                throw new AppError("Cannot delete a production job with consumption records.", 400);
            }
            await db.productionJob.update({
                data: {
                    deletedAt: new Date(),
                },
                where: {
                    id: productionJobId,
                },
            });
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: job.status,
                notes: "Production job archived.",
                productionJobId,
                toStatus: "CANCELLED",
            });
            await auditProductionAction({
                action: "production.job_deleted",
                actorUserId: userId,
                after: {
                    deletedAt: new Date().toISOString(),
                },
                before: mapProductionJobDetail(job),
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return {
                deleted: true,
                id: productionJobId,
            };
        });
    },
    async startProductionJob(productionJobId, userId) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            if (job.status === "IN_PROGRESS") {
                throw new AppError("Production job is already in progress.", 400);
            }
            if (["CANCELLED", "COMPLETED"].includes(job.status)) {
                throw new AppError("Cannot start a completed or cancelled production job.", 400);
            }
            if (job.tasks.length === 0) {
                throw new AppError("Generate at least one production task before starting the job.", 400);
            }
            await db.productionJob.update({
                data: {
                    actualStartDate: job.actualStartDate ?? new Date(),
                    status: "IN_PROGRESS",
                },
                where: {
                    id: productionJobId,
                },
            });
            if (job.cuttingPlanId) {
                await db.cuttingPlan.update({
                    data: {
                        status: "SENT_TO_PRODUCTION",
                    },
                    where: {
                        id: job.cuttingPlanId,
                    },
                });
            }
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: job.status,
                notes: "Production job started.",
                productionJobId,
                toStatus: "IN_PROGRESS",
            });
            const current = await getProductionJobByIdOrThrow(db, productionJobId);
            await auditProductionAction({
                action: "production.job_started",
                actorUserId: userId,
                after: {
                    actualStartDate: toIsoString(current.actualStartDate),
                    status: current.status,
                },
                before: {
                    actualStartDate: toIsoString(job.actualStartDate),
                    status: job.status,
                },
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return mapProductionJobDetail(current);
        });
    },
    async pauseProductionJob(productionJobId, userId) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            if (job.status !== "IN_PROGRESS") {
                throw new AppError("Only in-progress production jobs can be paused.", 400);
            }
            await db.productionJob.update({
                data: {
                    status: "PAUSED",
                },
                where: {
                    id: productionJobId,
                },
            });
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: job.status,
                notes: "Production job paused.",
                productionJobId,
                toStatus: "PAUSED",
            });
            const current = await getProductionJobByIdOrThrow(db, productionJobId);
            await auditProductionAction({
                action: "production.job_paused",
                actorUserId: userId,
                after: {
                    status: current.status,
                },
                before: {
                    status: job.status,
                },
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return mapProductionJobDetail(current);
        });
    },
    async completeProductionJob(productionJobId, userId) {
        await this.calculateProductionWaste(productionJobId, userId);
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            if (job.status === "CANCELLED") {
                throw new AppError("Cancelled production jobs cannot be completed.", 400);
            }
            if (job.tasks.some((task) => !["CANCELLED", "COMPLETED"].includes(task.status))) {
                throw new AppError("Cannot complete the production job while required tasks are still pending.", 400);
            }
            await db.productionJob.update({
                data: {
                    actualEndDate: new Date(),
                    status: "COMPLETED",
                },
                where: {
                    id: productionJobId,
                },
            });
            if (job.cuttingPlanId) {
                await db.cuttingPlan.update({
                    data: {
                        status: "COMPLETED",
                    },
                    where: {
                        id: job.cuttingPlanId,
                    },
                });
            }
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: job.status,
                notes: "Production job completed.",
                productionJobId,
                toStatus: "COMPLETED",
            });
            const current = await getProductionJobByIdOrThrow(db, productionJobId);
            await auditProductionAction({
                action: "production.job_completed",
                actorUserId: userId,
                after: {
                    actualEndDate: toIsoString(current.actualEndDate),
                    status: current.status,
                },
                before: {
                    actualEndDate: toIsoString(job.actualEndDate),
                    status: job.status,
                },
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return mapProductionJobDetail(current);
        });
    },
    async cancelProductionJob(productionJobId, userId) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            if (job.status === "COMPLETED") {
                throw new AppError("Completed production jobs cannot be cancelled.", 400);
            }
            await db.productionTask.updateMany({
                data: {
                    status: "CANCELLED",
                },
                where: {
                    productionJobId,
                    status: {
                        not: "COMPLETED",
                    },
                },
            });
            await db.productionJobItem.updateMany({
                data: {
                    status: "CANCELLED",
                },
                where: {
                    productionJobId,
                    status: {
                        not: "COMPLETED",
                    },
                },
            });
            await db.productionJob.update({
                data: {
                    status: "CANCELLED",
                },
                where: {
                    id: productionJobId,
                },
            });
            await createStatusHistory(db, {
                changedByUserId: userId,
                fromStatus: job.status,
                notes: "Production job cancelled.",
                productionJobId,
                toStatus: "CANCELLED",
            });
            const current = await getProductionJobByIdOrThrow(db, productionJobId);
            await auditProductionAction({
                action: "production.job_cancelled",
                actorUserId: userId,
                after: {
                    status: current.status,
                },
                before: {
                    status: job.status,
                },
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return mapProductionJobDetail(current);
        });
    },
    async assignProductionJob(productionJobId, assignedToUserId, userId) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            await db.productionJob.update({
                data: {
                    assignedToUserId,
                },
                where: {
                    id: productionJobId,
                },
            });
            const current = await getProductionJobByIdOrThrow(db, productionJobId);
            await auditProductionAction({
                action: "production.job_assigned",
                actorUserId: userId,
                after: {
                    assignedToUserId,
                },
                before: {
                    assignedToUserId: job.assignedToUser?.id ?? null,
                },
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return mapProductionJobDetail(current);
        });
    },
    async generateProductionTasks(productionJobId, userId, input) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            if (job.tasks.length > 0 && !input.replaceExisting) {
                throw new AppError("Production tasks already exist for this job. Set replaceExisting to regenerate them.", 400);
            }
            if (input.replaceExisting &&
                (job.materialConsumptions.some((entry) => entry.productionTaskId !== null) ||
                    job.tasks.some((task) => ["COMPLETED", "IN_PROGRESS"].includes(task.status)))) {
                throw new AppError("Tasks with completed work or material consumption cannot be regenerated.", 400);
            }
            if (input.replaceExisting) {
                await db.qualityCheck.deleteMany({
                    where: {
                        productionJobId,
                        productionTaskId: {
                            not: null,
                        },
                    },
                });
                await db.productionTask.deleteMany({
                    where: {
                        productionJobId,
                    },
                });
            }
            const createdTasks = [];
            let sortOrder = 0;
            if (job.cuttingPlanId) {
                const plan = await db.cuttingPlan.findUnique({
                    include: cuttingPlanForJobInclude,
                    where: {
                        id: job.cuttingPlanId,
                    },
                });
                if (!plan) {
                    throw new AppError("Linked cutting plan could not be found.", 404);
                }
                for (const sheet of plan.sheets) {
                    const task = await db.productionTask.create({
                        data: {
                            description: `Execute sheet ${sheet.sortOrder + 1} using the preserved cutting layout.`,
                            productionJobId,
                            sortOrder,
                            taskType: "CUT_GLASS",
                            title: `Cut glass sheet ${sheet.sortOrder + 1}`,
                        },
                        include: productionTaskInclude,
                    });
                    createdTasks.push(mapProductionTask(task));
                    sortOrder += 1;
                }
            }
            else {
                for (const item of job.items) {
                    const task = await db.productionTask.create({
                        data: {
                            description: item.description,
                            productionJobId,
                            productionJobItemId: item.id,
                            sortOrder,
                            taskType: "ASSEMBLE",
                            title: item.name,
                        },
                        include: productionTaskInclude,
                    });
                    createdTasks.push(mapProductionTask(task));
                    sortOrder += 1;
                }
            }
            for (const sharedTask of [
                {
                    taskType: "QUALITY_CHECK",
                    title: "Quality check",
                },
                {
                    taskType: "PACK",
                    title: "Pack finished work",
                },
            ]) {
                const task = await db.productionTask.create({
                    data: {
                        productionJobId,
                        sortOrder,
                        taskType: sharedTask.taskType,
                        title: sharedTask.title,
                    },
                    include: productionTaskInclude,
                });
                createdTasks.push(mapProductionTask(task));
                sortOrder += 1;
            }
            if (job.status === "DRAFT") {
                await db.productionJob.update({
                    data: {
                        status: "READY",
                    },
                    where: {
                        id: productionJobId,
                    },
                });
                await createStatusHistory(db, {
                    changedByUserId: userId,
                    fromStatus: "DRAFT",
                    notes: "Production tasks generated.",
                    productionJobId,
                    toStatus: "READY",
                });
            }
            await syncJobItemStatuses(db, productionJobId);
            await auditProductionAction({
                action: "production.tasks_generated",
                actorUserId: userId,
                after: {
                    taskCount: createdTasks.length,
                },
                before: null,
                db,
                entityId: productionJobId,
                entityType: PRODUCTION_ENTITY_TYPES.job,
            });
            return createdTasks;
        });
    },
    async listProductionJobTasks(productionJobId) {
        const job = await getProductionJobByIdOrThrow(prisma, productionJobId);
        return job.tasks.map(mapProductionTask);
    },
    async updateProductionTask(productionTaskId, input, userId) {
        return prisma.$transaction(async (db) => {
            const task = await getProductionTaskByIdOrThrow(db, productionTaskId);
            if (input.status === "COMPLETED" &&
                task.taskType === "QUALITY_CHECK") {
                const latestQualityCheck = await db.qualityCheck.findFirst({
                    orderBy: [
                        {
                            createdAt: "desc",
                        },
                    ],
                    where: {
                        productionJobId: task.productionJobId,
                        productionTaskId: task.id,
                    },
                });
                if (!latestQualityCheck || latestQualityCheck.status !== "PASSED") {
                    throw new AppError("A passed quality check is required before completing the quality task.", 400);
                }
            }
            await db.productionTask.update({
                data: {
                    assignedToUserId: input.assignedToUserId,
                    completedAt: input.status === "COMPLETED"
                        ? task.completedAt ?? new Date()
                        : input.status === "PENDING"
                            ? null
                            : task.completedAt,
                    description: input.description,
                    sortOrder: input.sortOrder,
                    startedAt: input.status === "IN_PROGRESS"
                        ? task.startedAt ?? new Date()
                        : task.startedAt,
                    status: input.status,
                    title: input.title,
                },
                where: {
                    id: productionTaskId,
                },
            });
            await syncJobItemStatuses(db, task.productionJobId);
            const current = await db.productionTask.findUnique({
                include: productionTaskInclude,
                where: {
                    id: productionTaskId,
                },
            });
            if (!current) {
                throw new AppError("Production task not found after update.", 404);
            }
            await auditProductionAction({
                action: "production.task_updated",
                actorUserId: userId,
                after: mapProductionTask(current),
                before: mapProductionTask(task),
                db,
                entityId: productionTaskId,
                entityType: PRODUCTION_ENTITY_TYPES.task,
            });
            return mapProductionTask(current);
        });
    },
    async startProductionTask(productionTaskId, userId) {
        return prisma.$transaction(async (db) => {
            const task = await getProductionTaskByIdOrThrow(db, productionTaskId);
            if (task.productionJob.status !== "IN_PROGRESS") {
                throw new AppError("Start the production job before starting tasks.", 400);
            }
            if (["CANCELLED", "COMPLETED"].includes(task.status)) {
                throw new AppError("Completed or cancelled tasks cannot be started.", 400);
            }
            await db.productionTask.update({
                data: {
                    startedAt: task.startedAt ?? new Date(),
                    status: "IN_PROGRESS",
                },
                where: {
                    id: productionTaskId,
                },
            });
            await syncJobItemStatuses(db, task.productionJobId);
            const current = await db.productionTask.findUnique({
                include: productionTaskInclude,
                where: {
                    id: productionTaskId,
                },
            });
            if (!current) {
                throw new AppError("Production task not found after start.", 404);
            }
            await auditProductionAction({
                action: "production.task_started",
                actorUserId: userId,
                after: mapProductionTask(current),
                before: mapProductionTask(task),
                db,
                entityId: productionTaskId,
                entityType: PRODUCTION_ENTITY_TYPES.task,
            });
            return mapProductionTask(current);
        });
    },
    async completeProductionTask(productionTaskId, userId) {
        return prisma.$transaction(async (db) => {
            const task = await getProductionTaskByIdOrThrow(db, productionTaskId);
            if (task.status === "CANCELLED") {
                throw new AppError("Cancelled tasks cannot be completed.", 400);
            }
            if (task.taskType === "QUALITY_CHECK") {
                const latestQualityCheck = await db.qualityCheck.findFirst({
                    orderBy: [
                        {
                            createdAt: "desc",
                        },
                    ],
                    where: {
                        productionJobId: task.productionJobId,
                        productionTaskId: task.id,
                    },
                });
                if (!latestQualityCheck || latestQualityCheck.status !== "PASSED") {
                    throw new AppError("A passed quality check is required before completing the quality task.", 400);
                }
            }
            await db.productionTask.update({
                data: {
                    completedAt: new Date(),
                    status: "COMPLETED",
                },
                where: {
                    id: productionTaskId,
                },
            });
            await syncJobItemStatuses(db, task.productionJobId);
            const current = await db.productionTask.findUnique({
                include: productionTaskInclude,
                where: {
                    id: productionTaskId,
                },
            });
            if (!current) {
                throw new AppError("Production task not found after completion.", 404);
            }
            await auditProductionAction({
                action: "production.task_completed",
                actorUserId: userId,
                after: mapProductionTask(current),
                before: mapProductionTask(task),
                db,
                entityId: productionTaskId,
                entityType: PRODUCTION_ENTITY_TYPES.task,
            });
            return mapProductionTask(current);
        });
    },
    async consumeMaterialForTask(productionTaskId, input, userId) {
        return prisma.$transaction(async (db) => {
            const task = await getProductionTaskByIdOrThrow(db, productionTaskId);
            assertSourceIsAvailable(task.productionJob);
            if (!["COMPLETED", "IN_PROGRESS"].includes(task.status)) {
                throw new AppError("Start the production task before consuming material.", 400);
            }
            let inventoryStockId = input.inventoryStockId;
            let remnantPieceId = input.remnantPieceId;
            let sourceType = input.sourceType ??
                (input.remnantPieceId
                    ? "REMNANT"
                    : input.inventoryStockId
                        ? "INVENTORY_STOCK"
                        : "MANUAL");
            let materialId = input.materialId;
            let movementWarehouseId = null;
            let movementUnit = input.unit;
            let sourceStockForRemnantOutput = null;
            let sourceMaterial = null;
            let quantityForMovement = input.quantity;
            if (input.inventoryStockId) {
                const stock = await getInventoryStockOrThrow(db, input.inventoryStockId);
                if (stock.stockType === "RESERVED") {
                    throw new AppError("Reserved stock rows cannot be consumed directly.", 400);
                }
                if (!["AVAILABLE", "RESERVED_SOFT"].includes(stock.condition)) {
                    throw new AppError("Selected inventory stock is not available to consume.", 400);
                }
                const material = await getMaterialOrThrow(db, stock.materialId);
                const quantityInStockUnit = convertQuantity(material, input.quantity, input.unit, stock.unit);
                if (quantityInStockUnit > Number(stock.quantity)) {
                    throw new AppError("Cannot consume more stock than is currently available.", 400);
                }
                materialId = stock.materialId;
                movementWarehouseId = stock.warehouseId;
                movementUnit = stock.unit;
                quantityForMovement = quantityInStockUnit;
                sourceStockForRemnantOutput = stock.id;
                sourceMaterial = material;
                const nextQuantity = roundQuantity(Number(stock.quantity) - quantityInStockUnit);
                if (nextQuantity === 0) {
                    await closeInventoryStock(db, stock.id, "CONSUMED");
                }
                else {
                    await db.inventoryStock.update({
                        data: {
                            quantity: nextQuantity,
                        },
                        where: {
                            id: stock.id,
                        },
                    });
                }
                if (stock.stockType === "REMNANT" && stock.sourceId) {
                    remnantPieceId = stock.sourceId;
                    sourceType = "REMNANT";
                    if (nextQuantity === 0) {
                        await updateRemnantStatus(db, stock.sourceId, "CONSUMED");
                    }
                    else {
                        await db.remnantPiece.update({
                            data: {
                                quantity: nextQuantity,
                                ...(stock.unit === "M2"
                                    ? {
                                        usableAreaM2: nextQuantity,
                                    }
                                    : {}),
                            },
                            where: {
                                id: stock.sourceId,
                            },
                        });
                    }
                }
            }
            if (input.remnantPieceId) {
                const remnant = await getRemnantOrThrow(db, input.remnantPieceId);
                if (remnant.status === "CONSUMED") {
                    throw new AppError("Cannot consume an already consumed remnant.", 400);
                }
                if (remnant.status === "SCRAPPED") {
                    throw new AppError("Cannot consume a scrapped remnant.", 400);
                }
                const material = await getMaterialOrThrow(db, remnant.materialId);
                const quantityInRemnantUnit = convertQuantity(material, input.quantity, input.unit, remnant.unit);
                if (quantityInRemnantUnit > Number(remnant.quantity)) {
                    throw new AppError("Cannot consume more remnant quantity than available.", 400);
                }
                const remnantStock = await db.inventoryStock.findFirst({
                    where: {
                        deletedAt: null,
                        sourceId: remnant.id,
                        sourceType: "REMNANT_GENERATED",
                        stockType: "REMNANT",
                    },
                });
                if (!remnantStock) {
                    throw new AppError("The remnant inventory stock row could not be found.", 404);
                }
                materialId = remnant.materialId;
                inventoryStockId = remnantStock.id;
                movementWarehouseId = remnant.warehouseId;
                movementUnit = remnant.unit;
                quantityForMovement = quantityInRemnantUnit;
                sourceStockForRemnantOutput = remnantStock.id;
                sourceMaterial = material;
                sourceType = "REMNANT";
                const nextQuantity = roundQuantity(Number(remnant.quantity) - quantityInRemnantUnit);
                if (nextQuantity === 0) {
                    await updateRemnantStatus(db, remnant.id, "CONSUMED");
                    await closeInventoryStock(db, remnantStock.id, "CONSUMED");
                }
                else {
                    await db.remnantPiece.update({
                        data: {
                            quantity: nextQuantity,
                            ...(remnant.unit === "M2"
                                ? {
                                    usableAreaM2: nextQuantity,
                                }
                                : {}),
                        },
                        where: {
                            id: remnant.id,
                        },
                    });
                    await db.inventoryStock.update({
                        data: {
                            quantity: nextQuantity,
                        },
                        where: {
                            id: remnantStock.id,
                        },
                    });
                }
            }
            if (!materialId) {
                throw new AppError("Material is required to record consumption.", 400);
            }
            if (!sourceMaterial) {
                sourceMaterial = await getMaterialOrThrow(db, materialId);
            }
            const consumedAt = input.consumedAt ?? new Date();
            const createdConsumptions = [];
            const actualConsumption = await db.materialConsumption.create({
                data: {
                    consumedAt,
                    consumedByUserId: userId,
                    consumptionType: input.consumptionType,
                    inventoryStockId,
                    materialId,
                    notes: input.notes,
                    productionJobId: task.productionJobId,
                    productionTaskId: task.id,
                    quantity: input.quantity,
                    remnantPieceId,
                    sourceType,
                    unit: input.unit,
                },
                include: materialConsumptionInclude,
            });
            createdConsumptions.push(actualConsumption);
            if (movementWarehouseId && inventoryStockId) {
                await createInventoryMovement(db, {
                    createdByUserId: userId,
                    inventoryStockId,
                    materialId,
                    movementType: "OUT",
                    quantity: quantityForMovement,
                    reason: input.notes ?? `Consumed for production task ${task.title}.`,
                    referenceId: actualConsumption.id,
                    referenceType: PRODUCTION_ENTITY_TYPES.materialConsumption,
                    unit: movementUnit,
                    warehouseId: movementWarehouseId,
                });
            }
            if (input.actualWasteAreaM2 !== null && input.actualWasteAreaM2 > 0) {
                const wasteConsumption = await db.materialConsumption.create({
                    data: {
                        consumedAt,
                        consumedByUserId: userId,
                        consumptionType: "WASTE",
                        inventoryStockId,
                        materialId,
                        notes: input.notes ?? "Actual waste recorded.",
                        productionJobId: task.productionJobId,
                        productionTaskId: task.id,
                        quantity: input.actualWasteAreaM2,
                        remnantPieceId,
                        sourceType,
                        unit: "M2",
                    },
                    include: materialConsumptionInclude,
                });
                createdConsumptions.push(wasteConsumption);
            }
            if (input.scrapQuantity !== null && input.scrapQuantity > 0) {
                const scrapUnit = input.scrapUnit ?? input.unit;
                const scrapConsumption = await db.materialConsumption.create({
                    data: {
                        consumedAt,
                        consumedByUserId: userId,
                        consumptionType: "SCRAP",
                        inventoryStockId,
                        materialId,
                        notes: input.notes ?? "Scrap recorded during production.",
                        productionJobId: task.productionJobId,
                        productionTaskId: task.id,
                        quantity: input.scrapQuantity,
                        remnantPieceId,
                        sourceType,
                        unit: scrapUnit,
                    },
                    include: materialConsumptionInclude,
                });
                createdConsumptions.push(scrapConsumption);
            }
            let remnantOutput = null;
            if (input.remnantOutput) {
                const createdRemnant = await createProductionRemnantOutput(db, {
                    code: input.remnantOutput.code,
                    lengthMm: input.remnantOutput.lengthMm,
                    material: sourceMaterial,
                    notes: input.remnantOutput.notes ??
                        `Created from production task ${task.title}.`,
                    parentInventoryStockId: sourceStockForRemnantOutput,
                    quantity: input.remnantOutput.quantity,
                    thicknessMm: input.remnantOutput.thicknessMm,
                    unit: input.remnantOutput.unit,
                    userId,
                    warehouseId: input.remnantOutput.warehouseId,
                    widthMm: input.remnantOutput.widthMm,
                });
                const remnantOutputConsumption = await db.materialConsumption.create({
                    data: {
                        consumedAt,
                        consumedByUserId: userId,
                        consumptionType: "REMNANT_OUTPUT",
                        inventoryStockId,
                        materialId,
                        notes: input.remnantOutput.notes ?? "Production remnant output recorded.",
                        productionJobId: task.productionJobId,
                        productionTaskId: task.id,
                        quantity: input.remnantOutput.quantity,
                        remnantPieceId: createdRemnant.id,
                        sourceType,
                        unit: input.remnantOutput.unit,
                    },
                    include: materialConsumptionInclude,
                });
                createdConsumptions.push(remnantOutputConsumption);
                remnantOutput = {
                    code: createdRemnant.code,
                    id: createdRemnant.id,
                };
            }
            await auditProductionAction({
                action: "production.material_consumed",
                actorUserId: userId,
                after: createdConsumptions.map(mapMaterialConsumption),
                before: null,
                db,
                entityId: actualConsumption.id,
                entityType: PRODUCTION_ENTITY_TYPES.materialConsumption,
            });
            const refreshedTask = await db.productionTask.findUnique({
                include: productionTaskInclude,
                where: {
                    id: productionTaskId,
                },
            });
            if (!refreshedTask) {
                throw new AppError("Production task not found after consumption.", 404);
            }
            return {
                consumptions: createdConsumptions.map(mapMaterialConsumption),
                remnantOutput,
                task: mapProductionTask(refreshedTask),
            };
        });
    },
    async listQualityChecks(productionJobId) {
        const job = await getProductionJobByIdOrThrow(prisma, productionJobId);
        return job.qualityChecks.map(mapQualityCheck);
    },
    async recordQualityCheck(productionJobId, input, userId) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            assertSourceIsAvailable(job);
            if (input.productionTaskId) {
                const task = job.tasks.find((entry) => entry.id === input.productionTaskId);
                if (!task) {
                    throw new AppError("The specified production task does not belong to this job.", 400);
                }
            }
            const check = await db.qualityCheck.create({
                data: {
                    checkedAt: input.status === "PENDING" ? null : new Date(),
                    checkedByUserId: userId,
                    evidenceJson: toInputJsonValue(input.evidenceJson),
                    notes: input.notes,
                    productionJobId,
                    productionTaskId: input.productionTaskId,
                    status: input.status,
                },
                include: qualityCheckInclude,
            });
            if (input.productionTaskId && ["FAILED", "REWORK_REQUIRED"].includes(input.status)) {
                await db.productionTask.update({
                    data: {
                        status: "BLOCKED",
                    },
                    where: {
                        id: input.productionTaskId,
                    },
                });
            }
            await auditProductionAction({
                action: "production.quality_check_recorded",
                actorUserId: userId,
                after: mapQualityCheck(check),
                before: null,
                db,
                entityId: check.id,
                entityType: PRODUCTION_ENTITY_TYPES.qualityCheck,
            });
            return mapQualityCheck(check);
        });
    },
    async getWasteReport(productionJobId) {
        const report = await prisma.productionWasteReport.findFirst({
            include: productionWasteReportInclude,
            orderBy: [
                {
                    createdAt: "desc",
                },
            ],
            where: {
                productionJobId,
            },
        });
        if (report) {
            return mapWasteReport(report);
        }
        const job = await getProductionJobByIdOrThrow(prisma, productionJobId);
        if (!job.cuttingPlanId) {
            return null;
        }
        const plannedInputAreaM2 = roundQuantity(job.materialConsumptions
            .filter((entry) => entry.consumptionType === "PLANNED" && entry.unit === "M2")
            .reduce((sum, entry) => sum + Number(entry.quantity), 0));
        const theoreticalWastePercent = Number(job.cuttingPlan?.wastePercent ?? 0);
        const theoreticalWasteAreaM2 = job.cuttingPlan
            ? Number(job.cuttingPlan.totalWasteAreaM2)
            : roundQuantity((plannedInputAreaM2 * theoreticalWastePercent) / 100);
        return {
            actualWasteAreaM2: 0,
            actualWastePercent: 0,
            createdAt: job.createdAt.toISOString(),
            cuttingPlan: mapCuttingPlanSummary(job.cuttingPlan),
            hasActualWasteData: false,
            id: `pending-${job.id}`,
            notes: "Actual waste values have not been recorded yet.",
            productionJobId: job.id,
            theoreticalWasteAreaM2,
            theoreticalWastePercent,
            updatedAt: job.updatedAt.toISOString(),
            varianceAreaM2: roundQuantity(0 - theoreticalWasteAreaM2),
            variancePercent: roundQuantity(0 - theoreticalWastePercent),
        };
    },
    async calculateProductionWaste(productionJobId, userId) {
        return prisma.$transaction(async (db) => {
            const job = await getProductionJobByIdOrThrow(db, productionJobId);
            const actualWasteAreaM2 = roundQuantity(job.materialConsumptions
                .filter((entry) => ["SCRAP", "WASTE"].includes(entry.consumptionType) && entry.unit === "M2")
                .reduce((sum, entry) => sum + Number(entry.quantity), 0));
            const plannedInputAreaM2 = roundQuantity(job.materialConsumptions
                .filter((entry) => entry.consumptionType === "PLANNED" && entry.unit === "M2")
                .reduce((sum, entry) => sum + Number(entry.quantity), 0));
            const theoreticalWastePercent = job.cuttingPlan
                ? Number(job.cuttingPlan.wastePercent)
                : 0;
            const theoreticalWasteAreaM2 = job.cuttingPlan
                ? Number(job.cuttingPlan.totalWasteAreaM2)
                : roundQuantity((plannedInputAreaM2 * theoreticalWastePercent) / 100);
            const actualWastePercent = plannedInputAreaM2 > 0
                ? roundQuantity((actualWasteAreaM2 / plannedInputAreaM2) * 100)
                : 0;
            const varianceAreaM2 = roundQuantity(actualWasteAreaM2 - theoreticalWasteAreaM2);
            const variancePercent = roundQuantity(actualWastePercent - theoreticalWastePercent);
            const notes = actualWasteAreaM2 > 0
                ? null
                : "Actual waste values are incomplete. Record actual waste during material consumption.";
            const existing = await db.productionWasteReport.findFirst({
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
                where: {
                    productionJobId,
                },
            });
            const report = existing
                ? await db.productionWasteReport.update({
                    data: {
                        actualWasteAreaM2,
                        actualWastePercent,
                        cuttingPlanId: job.cuttingPlanId,
                        notes,
                        theoreticalWasteAreaM2,
                        theoreticalWastePercent,
                        varianceAreaM2,
                        variancePercent,
                    },
                    include: productionWasteReportInclude,
                    where: {
                        id: existing.id,
                    },
                })
                : await db.productionWasteReport.create({
                    data: {
                        actualWasteAreaM2,
                        actualWastePercent,
                        cuttingPlanId: job.cuttingPlanId,
                        notes,
                        productionJobId,
                        theoreticalWasteAreaM2,
                        theoreticalWastePercent,
                        varianceAreaM2,
                        variancePercent,
                    },
                    include: productionWasteReportInclude,
                });
            await auditProductionAction({
                action: "production.waste_calculated",
                actorUserId: userId,
                after: mapWasteReport(report),
                before: existing
                    ? {
                        actualWasteAreaM2: Number(existing.actualWasteAreaM2),
                        actualWastePercent: Number(existing.actualWastePercent),
                        theoreticalWasteAreaM2: Number(existing.theoreticalWasteAreaM2),
                        theoreticalWastePercent: Number(existing.theoreticalWastePercent),
                        varianceAreaM2: Number(existing.varianceAreaM2),
                        variancePercent: Number(existing.variancePercent),
                    }
                    : null,
                db,
                entityId: report.id,
                entityType: PRODUCTION_ENTITY_TYPES.wasteReport,
            });
            return mapWasteReport(report);
        });
    },
};
//# sourceMappingURL=production.service.js.map