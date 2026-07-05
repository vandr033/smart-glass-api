import { randomUUID } from "node:crypto";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { convertMaterialUnit, } from "../materials/materials.behavior.js";
import { DAMAGED_MATERIAL_ENTITY_TYPE, INVENTORY_RESERVATION_ENTITY_TYPE, INVENTORY_STOCK_ENTITY_TYPE, REMNANT_PIECE_ENTITY_TYPE, WAREHOUSE_ENTITY_TYPE, } from "./inventory.constants.js";
const warehouseSummarySelect = {
    code: true,
    id: true,
    name: true,
};
const inventoryMaterialSummarySelect = {
    category: {
        select: {
            id: true,
            name: true,
            slug: true,
        },
    },
    code: true,
    id: true,
    materialType: true,
    name: true,
};
const inventoryUserSummarySelect = {
    email: true,
    id: true,
    name: true,
};
const inventoryStockInclude = {
    material: {
        select: inventoryMaterialSummarySelect,
    },
    warehouse: {
        select: warehouseSummarySelect,
    },
};
const inventoryMovementInclude = {
    createdByUser: {
        select: inventoryUserSummarySelect,
    },
    fromWarehouse: {
        select: warehouseSummarySelect,
    },
    material: {
        select: inventoryMaterialSummarySelect,
    },
    toWarehouse: {
        select: warehouseSummarySelect,
    },
    warehouse: {
        select: warehouseSummarySelect,
    },
};
const inventoryReservationInclude = {
    inventoryStock: {
        select: {
            condition: true,
            id: true,
            locationCode: true,
            stockType: true,
        },
    },
    material: {
        select: inventoryMaterialSummarySelect,
    },
    project: {
        select: {
            code: true,
            id: true,
            title: true,
        },
    },
    quotation: {
        select: {
            code: true,
            id: true,
            status: true,
        },
    },
    reservedByUser: {
        select: inventoryUserSummarySelect,
    },
    warehouse: {
        select: warehouseSummarySelect,
    },
};
const remnantInclude = {
    material: {
        select: inventoryMaterialSummarySelect,
    },
    warehouse: {
        select: warehouseSummarySelect,
    },
};
const damagedMaterialInclude = {
    inventoryStock: {
        select: {
            condition: true,
            id: true,
            locationCode: true,
            stockType: true,
        },
    },
    material: {
        select: inventoryMaterialSummarySelect,
    },
    reportedByUser: {
        select: inventoryUserSummarySelect,
    },
    warehouse: {
        select: warehouseSummarySelect,
    },
};
const SYSTEM_SETTING_SOFT_RESERVATION_HOURS = "inventory.soft_reservation_hours";
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
const toJsonLike = (value) => {
    return value ?? null;
};
const toIsoString = (value) => {
    return value ? value.toISOString() : null;
};
const roundQuantity = (value) => {
    return Number(value.toFixed(4));
};
const addHours = (date, hours) => {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
};
const isPositiveQuantity = (value) => {
    return value !== null && Number(value) > 0;
};
const materialBehaviorFromRecord = (material) => {
    return {
        code: material.code,
        materialType: material.materialType,
        name: material.name,
        unitConversionJson: toJsonLike(material.unitConversionJson),
    };
};
const mapWarehouseSummary = (warehouse) => {
    return {
        code: warehouse.code,
        id: warehouse.id,
        name: warehouse.name,
    };
};
const mapMaterialSummary = (material) => {
    return {
        category: {
            id: material.category.id,
            name: material.category.name,
            slug: material.category.slug,
        },
        code: material.code,
        id: material.id,
        materialType: material.materialType,
        name: material.name,
    };
};
const mapUserSummary = (user) => {
    if (!user) {
        return null;
    }
    return {
        email: user.email,
        id: user.id,
        name: user.name,
    };
};
const isSoftReservableStockType = (stockType) => {
    return stockType === "STANDARD" || stockType === "REMNANT";
};
const getAvailableQuantityForStock = (stock) => {
    if (stock.stockType === "RESERVED" ||
        stock.stockType === "DAMAGED" ||
        stock.stockType === "QUARANTINE" ||
        stock.condition === "DAMAGED" ||
        stock.condition === "CONSUMED" ||
        stock.condition === "SCRAPPED") {
        return 0;
    }
    return Number(stock.quantity);
};
const calculateStockMetrics = (stock, softReservationMap) => {
    const quantity = Number(stock.quantity);
    const reservedSoftQuantity = roundQuantity(softReservationMap.get(stock.id) ?? 0);
    const reservedFirmQuantity = stock.stockType === "RESERVED" ? roundQuantity(quantity) : 0;
    const availableQuantity = roundQuantity(getAvailableQuantityForStock(stock));
    return {
        availableQuantity,
        reservedFirmQuantity,
        reservedSoftQuantity,
    };
};
const mapWarehouse = (warehouse) => {
    return {
        address: warehouse.address,
        code: warehouse.code,
        createdAt: warehouse.createdAt.toISOString(),
        deletedAt: toIsoString(warehouse.deletedAt),
        description: warehouse.description,
        id: warehouse.id,
        latitude: decimalToNumber(warehouse.latitude ?? null),
        longitude: decimalToNumber(warehouse.longitude ?? null),
        name: warehouse.name,
        status: warehouse.status,
        updatedAt: warehouse.updatedAt.toISOString(),
    };
};
const mapInventoryStock = (stock, softReservationMap) => {
    const metrics = calculateStockMetrics(stock, softReservationMap);
    return {
        availableQuantity: metrics.availableQuantity,
        batchNumber: stock.batchNumber,
        condition: stock.condition,
        createdAt: stock.createdAt.toISOString(),
        deletedAt: toIsoString(stock.deletedAt),
        heightMm: decimalToNumber(stock.heightMm),
        id: stock.id,
        lengthMm: decimalToNumber(stock.lengthMm),
        locationCode: stock.locationCode,
        material: mapMaterialSummary(stock.material),
        materialId: stock.materialId,
        notes: stock.notes,
        quantity: Number(stock.quantity),
        reservedFirmQuantity: metrics.reservedFirmQuantity,
        reservedSoftQuantity: metrics.reservedSoftQuantity,
        sourceId: stock.sourceId,
        sourceType: stock.sourceType,
        stockType: stock.stockType,
        thicknessMm: decimalToNumber(stock.thicknessMm),
        unit: stock.unit,
        updatedAt: stock.updatedAt.toISOString(),
        warehouse: mapWarehouseSummary(stock.warehouse),
        warehouseId: stock.warehouseId,
        widthMm: decimalToNumber(stock.widthMm),
    };
};
const mapInventoryMovement = (movement) => {
    return {
        createdAt: movement.createdAt.toISOString(),
        createdByUser: mapUserSummary(movement.createdByUser),
        fromWarehouse: movement.fromWarehouse
            ? {
                code: movement.fromWarehouse.code,
                id: movement.fromWarehouse.id,
                name: movement.fromWarehouse.name,
            }
            : null,
        id: movement.id,
        inventoryStockId: movement.inventoryStockId,
        material: mapMaterialSummary(movement.material),
        materialId: movement.materialId,
        movementType: movement.movementType,
        quantity: Number(movement.quantity),
        reason: movement.reason,
        referenceId: movement.referenceId,
        referenceType: movement.referenceType,
        toWarehouse: movement.toWarehouse
            ? {
                code: movement.toWarehouse.code,
                id: movement.toWarehouse.id,
                name: movement.toWarehouse.name,
            }
            : null,
        unit: movement.unit,
        warehouse: {
            code: movement.warehouse.code,
            id: movement.warehouse.id,
            name: movement.warehouse.name,
        },
        warehouseId: movement.warehouseId,
    };
};
const mapInventoryReservation = (reservation) => {
    return {
        createdAt: reservation.createdAt.toISOString(),
        expiresAt: toIsoString(reservation.expiresAt),
        id: reservation.id,
        inventoryStock: reservation.inventoryStock
            ? {
                condition: reservation.inventoryStock.condition,
                id: reservation.inventoryStock.id,
                locationCode: reservation.inventoryStock.locationCode,
                stockType: reservation.inventoryStock.stockType,
            }
            : null,
        inventoryStockId: reservation.inventoryStockId,
        material: mapMaterialSummary(reservation.material),
        materialId: reservation.materialId,
        project: reservation.project
            ? {
                code: reservation.project.code,
                id: reservation.project.id,
                title: reservation.project.title,
            }
            : null,
        projectId: reservation.projectId,
        quantity: Number(reservation.quantity),
        quotation: reservation.quotation
            ? {
                code: reservation.quotation.code,
                id: reservation.quotation.id,
                status: reservation.quotation.status,
            }
            : null,
        quotationId: reservation.quotationId,
        reservationType: reservation.reservationType,
        reservedByUser: mapUserSummary(reservation.reservedByUser),
        status: reservation.status,
        unit: reservation.unit,
        updatedAt: reservation.updatedAt.toISOString(),
        warehouse: {
            code: reservation.warehouse.code,
            id: reservation.warehouse.id,
            name: reservation.warehouse.name,
        },
        warehouseId: reservation.warehouseId,
    };
};
const mapRemnantPiece = (remnant) => {
    return {
        code: remnant.code,
        createdAt: remnant.createdAt.toISOString(),
        id: remnant.id,
        lengthMm: decimalToNumber(remnant.lengthMm),
        material: mapMaterialSummary(remnant.material),
        materialId: remnant.materialId,
        notes: remnant.notes,
        parentInventoryStockId: remnant.parentInventoryStockId,
        quantity: Number(remnant.quantity),
        sourceId: remnant.sourceId,
        sourceType: remnant.sourceType,
        status: remnant.status,
        thicknessMm: decimalToNumber(remnant.thicknessMm),
        unit: remnant.unit,
        updatedAt: remnant.updatedAt.toISOString(),
        usableAreaM2: decimalToNumber(remnant.usableAreaM2),
        warehouse: {
            code: remnant.warehouse.code,
            id: remnant.warehouse.id,
            name: remnant.warehouse.name,
        },
        warehouseId: remnant.warehouseId,
        widthMm: decimalToNumber(remnant.widthMm),
    };
};
const mapDamagedMaterial = (damagedMaterial) => {
    return {
        createdAt: damagedMaterial.createdAt.toISOString(),
        damageType: damagedMaterial.damageType,
        description: damagedMaterial.description,
        id: damagedMaterial.id,
        inventoryStock: damagedMaterial.inventoryStock
            ? {
                condition: damagedMaterial.inventoryStock.condition,
                id: damagedMaterial.inventoryStock.id,
                locationCode: damagedMaterial.inventoryStock.locationCode,
                stockType: damagedMaterial.inventoryStock.stockType,
            }
            : null,
        inventoryStockId: damagedMaterial.inventoryStockId,
        material: mapMaterialSummary(damagedMaterial.material),
        materialId: damagedMaterial.materialId,
        quantity: Number(damagedMaterial.quantity),
        reportedByUser: mapUserSummary(damagedMaterial.reportedByUser),
        severity: damagedMaterial.severity,
        status: damagedMaterial.status,
        unit: damagedMaterial.unit,
        updatedAt: damagedMaterial.updatedAt.toISOString(),
        warehouse: {
            code: damagedMaterial.warehouse.code,
            id: damagedMaterial.warehouse.id,
            name: damagedMaterial.warehouse.name,
        },
        warehouseId: damagedMaterial.warehouseId,
    };
};
const buildWarehouseWhereClause = (query) => {
    return {
        deletedAt: null,
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        code: {
                            contains: query.search,
                        },
                    },
                    {
                        name: {
                            contains: query.search,
                        },
                    },
                    {
                        address: {
                            contains: query.search,
                        },
                    },
                ],
            }
            : {}),
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
    };
};
const buildInventoryStockWhereClause = (query) => {
    return {
        deletedAt: null,
        ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
            }
            : {}),
        ...(query.materialId
            ? {
                materialId: query.materialId,
            }
            : {}),
        ...(query.categoryId
            ? {
                material: {
                    categoryId: query.categoryId,
                },
            }
            : {}),
        ...(query.stockType
            ? {
                stockType: query.stockType,
            }
            : {}),
        ...(query.condition
            ? {
                condition: query.condition,
            }
            : {}),
        ...(query.minLengthMm !== undefined || query.maxLengthMm !== undefined
            ? {
                lengthMm: {
                    ...(query.minLengthMm !== undefined
                        ? {
                            gte: query.minLengthMm,
                        }
                        : {}),
                    ...(query.maxLengthMm !== undefined
                        ? {
                            lte: query.maxLengthMm,
                        }
                        : {}),
                },
            }
            : {}),
        ...(query.minWidthMm !== undefined || query.maxWidthMm !== undefined
            ? {
                widthMm: {
                    ...(query.minWidthMm !== undefined
                        ? {
                            gte: query.minWidthMm,
                        }
                        : {}),
                    ...(query.maxWidthMm !== undefined
                        ? {
                            lte: query.maxWidthMm,
                        }
                        : {}),
                },
            }
            : {}),
        ...(query.minHeightMm !== undefined || query.maxHeightMm !== undefined
            ? {
                heightMm: {
                    ...(query.minHeightMm !== undefined
                        ? {
                            gte: query.minHeightMm,
                        }
                        : {}),
                    ...(query.maxHeightMm !== undefined
                        ? {
                            lte: query.maxHeightMm,
                        }
                        : {}),
                },
            }
            : {}),
        ...(query.thicknessMm !== undefined
            ? {
                thicknessMm: query.thicknessMm,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        batchNumber: {
                            contains: query.search,
                        },
                    },
                    {
                        locationCode: {
                            contains: query.search,
                        },
                    },
                    {
                        material: {
                            code: {
                                contains: query.search,
                            },
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
                        warehouse: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        warehouse: {
                            name: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const buildInventoryStockOrderBy = (query) => {
    switch (query.sortBy) {
        case "material":
            return [
                {
                    material: {
                        name: query.sortDirection,
                    },
                },
            ];
        case "quantity":
            return [
                {
                    quantity: query.sortDirection,
                },
            ];
        case "warehouse":
            return [
                {
                    warehouse: {
                        name: query.sortDirection,
                    },
                },
            ];
        default:
            return [
                {
                    createdAt: query.sortDirection,
                },
            ];
    }
};
const buildMovementWhereClause = (query) => {
    const createdAt = query.dateFrom || query.dateTo
        ? {
            ...(query.dateFrom
                ? {
                    gte: new Date(`${query.dateFrom}T00:00:00.000Z`),
                }
                : {}),
            ...(query.dateTo
                ? {
                    lte: new Date(`${query.dateTo}T23:59:59.999Z`),
                }
                : {}),
        }
        : undefined;
    return {
        ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
            }
            : {}),
        ...(query.materialId
            ? {
                materialId: query.materialId,
            }
            : {}),
        ...(query.movementType
            ? {
                movementType: query.movementType,
            }
            : {}),
        ...(createdAt
            ? {
                createdAt,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        reason: {
                            contains: query.search,
                        },
                    },
                    {
                        referenceId: {
                            contains: query.search,
                        },
                    },
                    {
                        referenceType: {
                            contains: query.search,
                        },
                    },
                    {
                        material: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        material: {
                            name: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const buildReservationWhereClause = (query) => {
    return {
        ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
            }
            : {}),
        ...(query.materialId
            ? {
                materialId: query.materialId,
            }
            : {}),
        ...(query.quotationId
            ? {
                quotationId: query.quotationId,
            }
            : {}),
        ...(query.projectId
            ? {
                projectId: query.projectId,
            }
            : {}),
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
        ...(query.reservationType
            ? {
                reservationType: query.reservationType,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
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
                    {
                        project: {
                            title: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        material: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        material: {
                            name: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const buildRemnantWhereClause = (query) => {
    return {
        ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
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
        ...(query.thicknessMm !== undefined
            ? {
                thicknessMm: query.thicknessMm,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        code: {
                            contains: query.search,
                        },
                    },
                    {
                        material: {
                            code: {
                                contains: query.search,
                            },
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
                        warehouse: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        warehouse: {
                            name: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const buildDamagedWhereClause = (query) => {
    return {
        ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
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
        ...(query.severity
            ? {
                severity: query.severity,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        description: {
                            contains: query.search,
                        },
                    },
                    {
                        material: {
                            code: {
                                contains: query.search,
                            },
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
                        warehouse: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        warehouse: {
                            name: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const getMaterialOrThrow = async (db, materialId) => {
    const material = await db.material.findFirst({
        select: {
            category: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                },
            },
            code: true,
            id: true,
            isStockable: true,
            materialType: true,
            name: true,
            unitConversionJson: true,
        },
        where: {
            deletedAt: null,
            id: materialId,
        },
    });
    if (!material) {
        throw new AppError("Material not found.", 404);
    }
    return material;
};
const getWarehouseOrThrow = async (db, warehouseId) => {
    const warehouse = await db.warehouse.findFirst({
        where: {
            deletedAt: null,
            id: warehouseId,
        },
    });
    if (!warehouse) {
        throw new AppError("Warehouse not found.", 404);
    }
    return warehouse;
};
const getInventoryStockOrThrow = async (db, inventoryStockId) => {
    const stock = await db.inventoryStock.findFirst({
        where: {
            deletedAt: null,
            id: inventoryStockId,
        },
    });
    if (!stock) {
        throw new AppError("Inventory stock not found.", 404);
    }
    return stock;
};
const getReservationOrThrow = async (db, reservationId) => {
    const reservation = await db.inventoryReservation.findUnique({
        include: inventoryReservationInclude,
        where: {
            id: reservationId,
        },
    });
    if (!reservation) {
        throw new AppError("Inventory reservation not found.", 404);
    }
    return reservation;
};
const getDamagedMaterialOrThrow = async (db, damagedMaterialId) => {
    const damagedMaterial = await db.damagedMaterial.findUnique({
        include: damagedMaterialInclude,
        where: {
            id: damagedMaterialId,
        },
    });
    if (!damagedMaterial) {
        throw new AppError("Damaged material record not found.", 404);
    }
    return damagedMaterial;
};
const getRemnantOrThrow = async (db, remnantPieceId) => {
    const remnant = await db.remnantPiece.findUnique({
        include: remnantInclude,
        where: {
            id: remnantPieceId,
        },
    });
    if (!remnant) {
        throw new AppError("Remnant piece not found.", 404);
    }
    return remnant;
};
const validateDimensionsForMaterial = (material, input) => {
    if (material.materialType === "SHEET") {
        const hasHeight = input.heightMm !== null && input.heightMm !== undefined;
        const hasLength = input.lengthMm !== null && input.lengthMm !== undefined;
        if (input.widthMm === null || input.widthMm === undefined) {
            throw new AppError("Sheet materials require a width in millimeters.", 400);
        }
        if (!hasHeight && !hasLength) {
            throw new AppError("Sheet materials require a height or length in millimeters.", 400);
        }
        if (input.thicknessMm === null || input.thicknessMm === undefined) {
            throw new AppError("Sheet materials require a thickness in millimeters.", 400);
        }
    }
    if (material.materialType === "LINEAR") {
        if (input.lengthMm === null || input.lengthMm === undefined) {
            throw new AppError("Linear materials require a length in millimeters.", 400);
        }
    }
};
const convertQuantity = (material, quantity, fromUnit, toUnit) => {
    return roundQuantity(convertMaterialUnit({
        fromUnit,
        material: materialBehaviorFromRecord(material),
        quantity,
        toUnit,
    }));
};
const getSoftReservationCapacity = (stock, softReservationMap) => {
    if (!isSoftReservableStockType(stock.stockType)) {
        return 0;
    }
    const softReserved = softReservationMap.get(stock.id) ?? 0;
    return roundQuantity(Math.max(0, Number(stock.quantity) - softReserved));
};
const calculateRemnantAreaM2 = (lengthMm, widthMm) => {
    if (lengthMm === null ||
        lengthMm === undefined ||
        widthMm === null ||
        widthMm === undefined) {
        return null;
    }
    return roundQuantity((lengthMm * widthMm) / 1_000_000);
};
const createInventoryMovement = async (db, input) => {
    await db.inventoryMovement.create({
        data: {
            createdByUserId: input.createdByUserId ?? null,
            fromWarehouseId: input.fromWarehouseId ?? null,
            inventoryStockId: input.inventoryStockId ?? null,
            materialId: input.materialId,
            movementType: input.movementType,
            quantity: input.quantity,
            reason: input.reason ?? null,
            referenceId: input.referenceId ?? null,
            referenceType: input.referenceType ?? null,
            toWarehouseId: input.toWarehouseId ?? null,
            unit: input.unit,
            warehouseId: input.warehouseId,
        },
    });
};
const auditInventoryAction = async (input) => {
    await auditLogService.create({
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        after: input.after,
        before: input.before,
        entityId: input.entityId,
        entityType: input.entityType,
        metadata: input.metadata,
    });
};
const getActiveSoftReservationsByStock = async (db, options) => {
    const reservations = await db.inventoryReservation.findMany({
        select: {
            inventoryStockId: true,
            quantity: true,
        },
        where: {
            reservationType: "SOFT",
            status: "ACTIVE",
            ...(options.warehouseId
                ? {
                    warehouseId: options.warehouseId,
                }
                : {}),
            ...(options.materialId
                ? {
                    materialId: options.materialId,
                }
                : {}),
            ...(options.stockIds && options.stockIds.length > 0
                ? {
                    inventoryStockId: {
                        in: options.stockIds,
                    },
                }
                : {}),
        },
    });
    const byStockId = new Map();
    let unassignedQuantity = 0;
    reservations.forEach((reservation) => {
        const quantity = Number(reservation.quantity);
        if (reservation.inventoryStockId) {
            byStockId.set(reservation.inventoryStockId, roundQuantity((byStockId.get(reservation.inventoryStockId) ?? 0) + quantity));
            return;
        }
        unassignedQuantity = roundQuantity(unassignedQuantity + quantity);
    });
    return {
        byStockId,
        unassignedQuantity,
    };
};
const updateSoftReservationCondition = async (db, stockId) => {
    const stock = await db.inventoryStock.findUnique({
        where: {
            id: stockId,
        },
    });
    if (!stock || stock.deletedAt || !isPositiveQuantity(stock.quantity)) {
        return;
    }
    if (!isSoftReservableStockType(stock.stockType)) {
        return;
    }
    const activeSoftReservations = await db.inventoryReservation.count({
        where: {
            inventoryStockId: stockId,
            reservationType: "SOFT",
            status: "ACTIVE",
        },
    });
    await db.inventoryStock.update({
        data: {
            condition: activeSoftReservations > 0 ? "RESERVED_SOFT" : "AVAILABLE",
        },
        where: {
            id: stockId,
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
const createOrRestoreStock = async (db, input) => {
    const existingStock = await db.inventoryStock.findFirst({
        where: {
            batchNumber: input.batchNumber ?? null,
            condition: input.condition,
            deletedAt: null,
            heightMm: input.heightMm ?? null,
            lengthMm: input.lengthMm ?? null,
            locationCode: input.locationCode ?? null,
            materialId: input.materialId,
            sourceId: input.sourceId ?? null,
            sourceType: input.sourceType,
            stockType: input.stockType,
            thicknessMm: input.thicknessMm ?? null,
            unit: input.unit,
            warehouseId: input.warehouseId,
            widthMm: input.widthMm ?? null,
        },
    });
    if (existingStock) {
        return db.inventoryStock.update({
            data: {
                quantity: new PrismaNamespace.Decimal(roundQuantity(Number(existingStock.quantity) + input.quantity)),
            },
            where: {
                id: existingStock.id,
            },
        });
    }
    return db.inventoryStock.create({
        data: {
            batchNumber: input.batchNumber ?? null,
            condition: input.condition,
            heightMm: input.heightMm ?? null,
            lengthMm: input.lengthMm ?? null,
            locationCode: input.locationCode ?? null,
            materialId: input.materialId,
            notes: input.notes ?? null,
            quantity: input.quantity,
            sourceId: input.sourceId ?? null,
            sourceType: input.sourceType,
            stockType: input.stockType,
            thicknessMm: input.thicknessMm ?? null,
            unit: input.unit,
            warehouseId: input.warehouseId,
            widthMm: input.widthMm ?? null,
        },
    });
};
const syncRemnantStatusBySourceId = async (db, remnantId, status) => {
    await db.remnantPiece.updateMany({
        data: {
            status,
        },
        where: {
            id: remnantId,
        },
    });
};
const getDefaultSoftReservationHours = async (db) => {
    const setting = await db.systemSetting.findUnique({
        where: {
            key: SYSTEM_SETTING_SOFT_RESERVATION_HOURS,
        },
    });
    if (!setting) {
        return 48;
    }
    const value = typeof setting.valueJson === "number" ? setting.valueJson : Number(setting.valueJson);
    return Number.isFinite(value) && value > 0 ? value : 48;
};
const expireSoftReservations = async (db, scope) => {
    const reservations = await db.inventoryReservation.findMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
            reservationType: "SOFT",
            status: "ACTIVE",
            ...(scope?.materialId
                ? {
                    materialId: scope.materialId,
                }
                : {}),
            ...(scope?.warehouseId
                ? {
                    warehouseId: scope.warehouseId,
                }
                : {}),
        },
    });
    for (const reservation of reservations) {
        await db.inventoryReservation.update({
            data: {
                status: "EXPIRED",
            },
            where: {
                id: reservation.id,
            },
        });
        await createInventoryMovement(db, {
            createdByUserId: null,
            inventoryStockId: reservation.inventoryStockId,
            materialId: reservation.materialId,
            movementType: "RESERVATION_RELEASE",
            quantity: Number(reservation.quantity),
            reason: "Soft reservation expired automatically.",
            referenceId: reservation.id,
            referenceType: "inventory_reservation",
            unit: reservation.unit,
            warehouseId: reservation.warehouseId,
        });
        if (reservation.inventoryStockId) {
            await updateSoftReservationCondition(db, reservation.inventoryStockId);
        }
        await auditInventoryAction({
            action: "inventory_reservation.expired",
            after: {
                ...reservation,
                status: "EXPIRED",
            },
            before: reservation,
            entityId: reservation.id,
            entityType: INVENTORY_RESERVATION_ENTITY_TYPE,
            metadata: {
                materialId: reservation.materialId,
                warehouseId: reservation.warehouseId,
            },
        });
    }
};
const getReservationTargetStock = async (db, input, material, options) => {
    const candidateStocks = await db.inventoryStock.findMany({
        where: {
            condition: {
                in: ["AVAILABLE", "RESERVED_SOFT"],
            },
            deletedAt: null,
            materialId: input.materialId,
            stockType: {
                in: ["REMNANT", "STANDARD"],
            },
            warehouseId: input.warehouseId,
            ...(input.inventoryStockId
                ? {
                    id: input.inventoryStockId,
                }
                : {}),
        },
    });
    const softReservationState = await getActiveSoftReservationsByStock(db, {
        materialId: input.materialId,
        stockIds: candidateStocks.map((stock) => stock.id),
        warehouseId: input.warehouseId,
    });
    const requestedMaterialQuantity = convertQuantity(material, input.quantity, input.unit, candidateStocks[0]?.unit ?? input.unit);
    const singleStock = candidateStocks.find((stock) => {
        const requestedQuantity = convertQuantity(material, input.quantity, input.unit, stock.unit);
        return getSoftReservationCapacity(stock, softReservationState.byStockId) >= requestedQuantity;
    });
    if (singleStock) {
        return {
            canReserve: true,
            requestedQuantityInStockUnit: convertQuantity(material, input.quantity, input.unit, singleStock.unit),
            stock: singleStock,
        };
    }
    if (options.reservationType === "SOFT" &&
        options.allowMaterialLevelSoftReservation) {
        const totalCapacity = candidateStocks.reduce((total, stock) => {
            return total + getSoftReservationCapacity(stock, softReservationState.byStockId);
        }, 0);
        if (totalCapacity >= requestedMaterialQuantity) {
            return {
                canReserve: true,
                requestedQuantityInStockUnit: null,
                stock: null,
            };
        }
    }
    return {
        canReserve: false,
        requestedQuantityInStockUnit: null,
        stock: null,
    };
};
const decrementStockQuantity = async (db, stockId, quantityToSubtract) => {
    const stock = await getInventoryStockOrThrow(db, stockId);
    if (Number(stock.quantity) < quantityToSubtract) {
        throw new AppError("Insufficient stock quantity.", 400);
    }
    const remainingQuantity = roundQuantity(Number(stock.quantity) - quantityToSubtract);
    if (remainingQuantity === 0) {
        await closeInventoryStock(db, stockId, "CONSUMED");
        return;
    }
    await db.inventoryStock.update({
        data: {
            quantity: remainingQuantity,
        },
        where: {
            id: stockId,
        },
    });
};
const buildAvailabilitySummary = (stocks, softReservationState) => {
    return stocks.reduce((summary, stock) => {
        const quantity = Number(stock.quantity);
        const metrics = calculateStockMetrics(stock, softReservationState.byStockId);
        summary.totalQuantity = roundQuantity(summary.totalQuantity + quantity);
        summary.availableQuantity = roundQuantity(summary.availableQuantity + metrics.availableQuantity);
        summary.reservedFirmQuantity = roundQuantity(summary.reservedFirmQuantity + metrics.reservedFirmQuantity);
        summary.reservedSoftQuantity = roundQuantity(summary.reservedSoftQuantity + metrics.reservedSoftQuantity);
        if (stock.stockType === "DAMAGED") {
            summary.damagedQuantity = roundQuantity(summary.damagedQuantity + quantity);
        }
        if (stock.stockType === "REMNANT") {
            summary.remnantQuantity = roundQuantity(summary.remnantQuantity + quantity);
        }
        return summary;
    }, {
        availableQuantity: 0,
        damagedQuantity: 0,
        remnantQuantity: 0,
        reservedFirmQuantity: 0,
        reservedSoftQuantity: softReservationState.unassignedQuantity,
        totalQuantity: 0,
    });
};
const buildRequestedQuantitySufficiency = (material, summary, input) => {
    if (!input.quantity || !input.unit) {
        return null;
    }
    const requestedQuantity = convertQuantity(material, input.quantity, input.unit, material.materialType === "SERVICE" ? input.unit : input.unit);
    return summary.availableQuantity >= requestedQuantity;
};
export const inventoryService = {
    async listWarehouses(query) {
        const warehouses = await prisma.warehouse.findMany({
            orderBy: [
                {
                    code: "asc",
                },
            ],
            where: buildWarehouseWhereClause(query),
        });
        return warehouses.map(mapWarehouse);
    },
    async getWarehouseById(warehouseId) {
        const warehouse = await prisma.warehouse.findFirst({
            where: {
                deletedAt: null,
                id: warehouseId,
            },
        });
        if (!warehouse) {
            throw new AppError("Warehouse not found.", 404);
        }
        return mapWarehouse(warehouse);
    },
    async createWarehouse(input, userId) {
        const warehouse = await prisma.warehouse.create({
            data: input,
        });
        const record = mapWarehouse(warehouse);
        await auditInventoryAction({
            action: "warehouse.created",
            actorUserId: userId,
            after: record,
            before: null,
            entityId: warehouse.id,
            entityType: WAREHOUSE_ENTITY_TYPE,
            metadata: {
                code: warehouse.code,
            },
        });
        return record;
    },
    async updateWarehouse(warehouseId, input, userId) {
        const existingWarehouse = await prisma.warehouse.findFirst({
            where: {
                deletedAt: null,
                id: warehouseId,
            },
        });
        if (!existingWarehouse) {
            throw new AppError("Warehouse not found.", 404);
        }
        const warehouse = await prisma.warehouse.update({
            data: input,
            where: {
                id: warehouseId,
            },
        });
        const previous = mapWarehouse(existingWarehouse);
        const current = mapWarehouse(warehouse);
        await auditInventoryAction({
            action: "warehouse.updated",
            actorUserId: userId,
            after: current,
            before: previous,
            entityId: warehouse.id,
            entityType: WAREHOUSE_ENTITY_TYPE,
            metadata: {
                code: warehouse.code,
            },
        });
        return current;
    },
    async deleteWarehouse(warehouseId, userId) {
        const existingWarehouse = await prisma.warehouse.findFirst({
            where: {
                deletedAt: null,
                id: warehouseId,
            },
        });
        if (!existingWarehouse) {
            throw new AppError("Warehouse not found.", 404);
        }
        const activeStockCount = await prisma.inventoryStock.count({
            where: {
                deletedAt: null,
                quantity: {
                    gt: 0,
                },
                warehouseId,
            },
        });
        if (activeStockCount > 0) {
            throw new AppError("Cannot delete a warehouse that still has active stock.", 400);
        }
        const deletedWarehouse = await prisma.warehouse.update({
            data: {
                deletedAt: new Date(),
                status: "INACTIVE",
            },
            where: {
                id: warehouseId,
            },
        });
        const record = mapWarehouse(deletedWarehouse);
        await auditInventoryAction({
            action: "warehouse.deleted",
            actorUserId: userId,
            after: record,
            before: mapWarehouse(existingWarehouse),
            entityId: warehouseId,
            entityType: WAREHOUSE_ENTITY_TYPE,
            metadata: {
                code: existingWarehouse.code,
            },
        });
        return record;
    },
    async getDashboard() {
        await expireSoftReservations(prisma);
        const [materialRows, lowStockRows, activeReservationCount, damagedCount, remnantCount, recentMovements] = await prisma.$transaction([
            prisma.inventoryStock.findMany({
                distinct: ["materialId"],
                select: {
                    materialId: true,
                },
                where: {
                    deletedAt: null,
                    quantity: {
                        gt: 0,
                    },
                },
            }),
            prisma.inventoryStock.findMany({
                select: {
                    id: true,
                    quantity: true,
                },
                where: {
                    condition: {
                        in: ["AVAILABLE", "RESERVED_SOFT"],
                    },
                    deletedAt: null,
                    stockType: {
                        in: ["STANDARD", "REMNANT"],
                    },
                },
            }),
            prisma.inventoryReservation.count({
                where: {
                    status: "ACTIVE",
                },
            }),
            prisma.damagedMaterial.count({
                where: {
                    status: {
                        in: ["REPORTED", "REVIEWED"],
                    },
                },
            }),
            prisma.remnantPiece.count({
                where: {
                    status: {
                        in: ["AVAILABLE", "RESERVED"],
                    },
                },
            }),
            prisma.inventoryMovement.findMany({
                include: inventoryMovementInclude,
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
                take: 10,
            }),
        ]);
        return {
            damagedStockCount: damagedCount,
            lowStockCount: lowStockRows.filter((row) => Number(row.quantity) <= 1).length,
            recentMovements: recentMovements.map(mapInventoryMovement),
            remnantsCount: remnantCount,
            reservedStockCount: activeReservationCount,
            totalMaterialsWithStock: materialRows.length,
        };
    },
    async listInventoryStock(query) {
        await expireSoftReservations(prisma, {
            materialId: query.materialId,
            warehouseId: query.warehouseId,
        });
        const where = buildInventoryStockWhereClause(query);
        const orderBy = buildInventoryStockOrderBy(query);
        const [total, stocks] = await prisma.$transaction([
            prisma.inventoryStock.count({
                where,
            }),
            prisma.inventoryStock.findMany({
                include: inventoryStockInclude,
                orderBy,
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
        ]);
        const softReservationState = await getActiveSoftReservationsByStock(prisma, {
            materialId: query.materialId,
            stockIds: stocks.map((stock) => stock.id),
            warehouseId: query.warehouseId,
        });
        return {
            data: stocks.map((stock) => mapInventoryStock(stock, softReservationState.byStockId)),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async listInventoryMovements(query) {
        const where = buildMovementWhereClause(query);
        const [total, movements] = await prisma.$transaction([
            prisma.inventoryMovement.count({
                where,
            }),
            prisma.inventoryMovement.findMany({
                include: inventoryMovementInclude,
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
            data: movements.map(mapInventoryMovement),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getAvailableStock(materialId, filters) {
        await expireSoftReservations(prisma, {
            materialId,
            warehouseId: filters.warehouseId,
        });
        const material = await getMaterialOrThrow(prisma, materialId);
        const stocks = await prisma.inventoryStock.findMany({
            include: inventoryStockInclude,
            where: {
                deletedAt: null,
                materialId,
                ...(filters.warehouseId
                    ? {
                        warehouseId: filters.warehouseId,
                    }
                    : {}),
            },
        });
        const softReservationState = await getActiveSoftReservationsByStock(prisma, {
            materialId,
            stockIds: stocks.map((stock) => stock.id),
            warehouseId: filters.warehouseId,
        });
        const summary = buildAvailabilitySummary(stocks, softReservationState);
        return {
            material: mapMaterialSummary(material),
            requestedQuantity: filters.quantity ?? null,
            requestedUnit: filters.unit ?? null,
            stocks: stocks.map((stock) => mapInventoryStock(stock, softReservationState.byStockId)),
            sufficientForRequestedQuantity: buildRequestedQuantitySufficiency(material, summary, filters),
            summary,
            warehouseId: filters.warehouseId ?? null,
        };
    },
    async getAvailableGlassSheets(materialId, widthMm, heightMm, thicknessMm, warehouseId) {
        const material = await getMaterialOrThrow(prisma, materialId);
        await expireSoftReservations(prisma, {
            materialId,
            warehouseId,
        });
        const matchingStocks = await prisma.inventoryStock.findMany({
            include: inventoryStockInclude,
            where: {
                condition: {
                    in: ["AVAILABLE", "RESERVED_SOFT"],
                },
                deletedAt: null,
                materialId,
                stockType: "STANDARD",
                ...(warehouseId
                    ? {
                        warehouseId,
                    }
                    : {}),
                ...(thicknessMm !== undefined
                    ? {
                        thicknessMm,
                    }
                    : {}),
            },
        });
        const stockMatches = matchingStocks.filter((stock) => {
            const stockWidth = Number(stock.widthMm ?? 0);
            const stockHeight = Number(stock.heightMm ?? 0);
            const directFit = stockWidth >= widthMm && stockHeight >= heightMm;
            const rotatedFit = material.materialType === "SHEET" &&
                stockWidth >= heightMm &&
                stockHeight >= widthMm;
            return directFit || rotatedFit;
        });
        const softReservationState = await getActiveSoftReservationsByStock(prisma, {
            materialId,
            stockIds: stockMatches.map((stock) => stock.id),
            warehouseId,
        });
        const matchingRemnants = await this.findUsableRemnants(materialId, widthMm, heightMm, {
            thicknessMm,
            warehouseId,
        });
        return {
            matchingRemnants,
            matchingStocks: stockMatches.map((stock) => mapInventoryStock(stock, softReservationState.byStockId)),
            material: mapMaterialSummary(material),
            requestedHeightMm: heightMm,
            requestedWidthMm: widthMm,
            sufficient: stockMatches.length > 0 || matchingRemnants.length > 0,
            thicknessMm: thicknessMm ?? null,
            warehouseId: warehouseId ?? null,
        };
    },
    async getAvailableLinearStock(materialId, requiredLengthMm, warehouseId) {
        const material = await getMaterialOrThrow(prisma, materialId);
        await expireSoftReservations(prisma, {
            materialId,
            warehouseId,
        });
        const stocks = await prisma.inventoryStock.findMany({
            include: inventoryStockInclude,
            where: {
                condition: {
                    in: ["AVAILABLE", "RESERVED_SOFT"],
                },
                deletedAt: null,
                materialId,
                stockType: {
                    in: ["REMNANT", "STANDARD"],
                },
                ...(warehouseId
                    ? {
                        warehouseId,
                    }
                    : {}),
            },
        });
        const matchingStocks = stocks.filter((stock) => {
            const stockLength = decimalToNumber(stock.lengthMm);
            return stockLength === null || stockLength >= requiredLengthMm;
        });
        const softReservationState = await getActiveSoftReservationsByStock(prisma, {
            materialId,
            stockIds: matchingStocks.map((stock) => stock.id),
            warehouseId,
        });
        return {
            material: mapMaterialSummary(material),
            matchingStocks: matchingStocks.map((stock) => mapInventoryStock(stock, softReservationState.byStockId)),
            requiredLengthMm,
            sufficient: matchingStocks.length > 0,
            warehouseId: warehouseId ?? null,
        };
    },
    async createStockEntry(input, userId) {
        return prisma.$transaction(async (db) => {
            const material = await getMaterialOrThrow(db, input.materialId);
            await getWarehouseOrThrow(db, input.warehouseId);
            validateDimensionsForMaterial(material, input);
            const stock = await db.inventoryStock.create({
                data: {
                    batchNumber: input.batchNumber,
                    condition: input.condition,
                    heightMm: input.heightMm,
                    lengthMm: input.lengthMm,
                    locationCode: input.locationCode,
                    materialId: input.materialId,
                    notes: input.notes,
                    quantity: input.quantity,
                    sourceId: input.sourceId,
                    sourceType: input.sourceType,
                    stockType: input.stockType,
                    thicknessMm: input.thicknessMm,
                    unit: input.unit,
                    warehouseId: input.warehouseId,
                    widthMm: input.widthMm,
                },
                include: inventoryStockInclude,
            });
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: stock.id,
                materialId: stock.materialId,
                movementType: "IN",
                quantity: Number(stock.quantity),
                reason: input.notes ?? "Stock entry created.",
                referenceId: stock.id,
                referenceType: "inventory_stock",
                unit: stock.unit,
                warehouseId: stock.warehouseId,
            });
            const record = mapInventoryStock(stock, new Map());
            await auditInventoryAction({
                action: "inventory_stock.created",
                actorUserId: userId,
                after: record,
                before: null,
                entityId: stock.id,
                entityType: INVENTORY_STOCK_ENTITY_TYPE,
                metadata: {
                    materialCode: stock.material.code,
                    warehouseCode: stock.warehouse.code,
                },
            });
            return record;
        });
    },
    async adjustStock(input, userId) {
        return prisma.$transaction(async (db) => {
            const stock = await getInventoryStockOrThrow(db, input.inventoryStockId);
            const previousStock = stock;
            const newQuantity = roundQuantity(Number(stock.quantity) + input.quantityDelta);
            if (newQuantity < 0) {
                throw new AppError("Adjustment would result in negative stock.", 400);
            }
            if (newQuantity === 0) {
                await closeInventoryStock(db, stock.id, "CONSUMED");
            }
            else {
                await db.inventoryStock.update({
                    data: {
                        quantity: newQuantity,
                    },
                    where: {
                        id: stock.id,
                    },
                });
            }
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: stock.id,
                materialId: stock.materialId,
                movementType: "ADJUSTMENT",
                quantity: Math.abs(input.quantityDelta),
                reason: input.reason ?? input.notes ?? "Inventory adjustment.",
                referenceId: stock.id,
                referenceType: "inventory_stock",
                unit: stock.unit,
                warehouseId: stock.warehouseId,
            });
            await updateSoftReservationCondition(db, stock.id);
            const updatedStock = await db.inventoryStock.findUnique({
                include: inventoryStockInclude,
                where: {
                    id: stock.id,
                },
            });
            if (!updatedStock) {
                throw new AppError("Inventory stock not found after adjustment.", 404);
            }
            const record = mapInventoryStock(updatedStock, new Map());
            await auditInventoryAction({
                action: "inventory_stock.adjusted",
                actorUserId: userId,
                after: record,
                before: previousStock,
                entityId: stock.id,
                entityType: INVENTORY_STOCK_ENTITY_TYPE,
                metadata: {
                    quantityDelta: input.quantityDelta,
                },
            });
            return record;
        });
    },
    async transferStock(input, userId) {
        return prisma.$transaction(async (db) => {
            const sourceStock = await getInventoryStockOrThrow(db, input.inventoryStockId);
            await getWarehouseOrThrow(db, input.toWarehouseId);
            if (sourceStock.warehouseId === input.toWarehouseId) {
                throw new AppError("Destination warehouse must be different from the source warehouse.", 400);
            }
            if (Number(sourceStock.quantity) < input.quantity) {
                throw new AppError("Transfer quantity exceeds available stock.", 400);
            }
            await decrementStockQuantity(db, sourceStock.id, input.quantity);
            await updateSoftReservationCondition(db, sourceStock.id);
            const destinationStock = await db.inventoryStock.create({
                data: {
                    batchNumber: sourceStock.batchNumber,
                    condition: "AVAILABLE",
                    heightMm: sourceStock.heightMm,
                    lengthMm: sourceStock.lengthMm,
                    locationCode: input.locationCode ?? sourceStock.locationCode,
                    materialId: sourceStock.materialId,
                    notes: input.reason ?? sourceStock.notes,
                    quantity: input.quantity,
                    sourceId: sourceStock.sourceId,
                    sourceType: sourceStock.sourceType,
                    stockType: sourceStock.stockType,
                    thicknessMm: sourceStock.thicknessMm,
                    unit: sourceStock.unit,
                    warehouseId: input.toWarehouseId,
                    widthMm: sourceStock.widthMm,
                },
                include: inventoryStockInclude,
            });
            await createInventoryMovement(db, {
                createdByUserId: userId,
                fromWarehouseId: sourceStock.warehouseId,
                inventoryStockId: sourceStock.id,
                materialId: sourceStock.materialId,
                movementType: "TRANSFER",
                quantity: input.quantity,
                reason: input.reason ?? "Stock transfer.",
                referenceId: destinationStock.id,
                referenceType: "inventory_stock",
                toWarehouseId: input.toWarehouseId,
                unit: sourceStock.unit,
                warehouseId: sourceStock.warehouseId,
            });
            const record = mapInventoryStock(destinationStock, new Map());
            await auditInventoryAction({
                action: "inventory_stock.transferred",
                actorUserId: userId,
                after: record,
                before: {
                    id: sourceStock.id,
                    warehouseId: sourceStock.warehouseId,
                },
                entityId: destinationStock.id,
                entityType: INVENTORY_STOCK_ENTITY_TYPE,
                metadata: {
                    quantity: input.quantity,
                    sourceWarehouseId: sourceStock.warehouseId,
                    targetWarehouseId: input.toWarehouseId,
                },
            });
            return {
                destinationStock: record,
                sourceStockId: sourceStock.id,
            };
        });
    },
    async createSoftReservation(input, userId) {
        return prisma.$transaction(async (db) => {
            await expireSoftReservations(db, {
                materialId: input.materialId,
                warehouseId: input.warehouseId,
            });
            const material = await getMaterialOrThrow(db, input.materialId);
            await getWarehouseOrThrow(db, input.warehouseId);
            const target = await getReservationTargetStock(db, input, material, {
                allowMaterialLevelSoftReservation: true,
                reservationType: "SOFT",
            });
            if (!target.canReserve) {
                throw new AppError("Cannot reserve more quantity than the available stock.", 400);
            }
            const expiresAt = input.expiresAt ?? addHours(new Date(), await getDefaultSoftReservationHours(db));
            const reservation = await db.inventoryReservation.create({
                data: {
                    expiresAt,
                    inventoryStockId: target.stock?.id ?? input.inventoryStockId ?? null,
                    materialId: input.materialId,
                    projectId: input.projectId ?? null,
                    quantity: input.quantity,
                    quotationId: input.quotationId ?? null,
                    reservationType: "SOFT",
                    reservedByUserId: userId,
                    unit: input.unit,
                    warehouseId: input.warehouseId,
                },
                include: inventoryReservationInclude,
            });
            if (reservation.inventoryStockId) {
                await updateSoftReservationCondition(db, reservation.inventoryStockId);
            }
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: reservation.inventoryStockId,
                materialId: reservation.materialId,
                movementType: "RESERVATION_SOFT",
                quantity: Number(reservation.quantity),
                reason: "Soft reservation created.",
                referenceId: reservation.id,
                referenceType: "inventory_reservation",
                unit: reservation.unit,
                warehouseId: reservation.warehouseId,
            });
            const record = mapInventoryReservation(reservation);
            await auditInventoryAction({
                action: "inventory_reservation.created",
                actorUserId: userId,
                after: record,
                before: null,
                entityId: reservation.id,
                entityType: INVENTORY_RESERVATION_ENTITY_TYPE,
                metadata: {
                    reservationType: "SOFT",
                },
            });
            return record;
        });
    },
    async createFirmReservation(input, userId) {
        return prisma.$transaction(async (db) => {
            await expireSoftReservations(db, {
                materialId: input.materialId,
                warehouseId: input.warehouseId,
            });
            const material = await getMaterialOrThrow(db, input.materialId);
            await getWarehouseOrThrow(db, input.warehouseId);
            const target = await getReservationTargetStock(db, input, material, {
                allowMaterialLevelSoftReservation: false,
                reservationType: "FIRM",
            });
            if (!target.canReserve || !target.stock || target.requestedQuantityInStockUnit === null) {
                throw new AppError("Firm reservations require a specific stock row with enough available quantity.", 400);
            }
            await decrementStockQuantity(db, target.stock.id, target.requestedQuantityInStockUnit);
            await updateSoftReservationCondition(db, target.stock.id);
            const reservedStock = await db.inventoryStock.create({
                data: {
                    batchNumber: target.stock.batchNumber,
                    condition: "RESERVED_FIRM",
                    heightMm: target.stock.heightMm,
                    lengthMm: target.stock.lengthMm,
                    locationCode: target.stock.locationCode,
                    materialId: target.stock.materialId,
                    notes: `Firm reservation for ${input.quotationId ?? input.projectId ?? "manual allocation"}.`,
                    quantity: target.requestedQuantityInStockUnit,
                    sourceId: target.stock.sourceType === "REMNANT_GENERATED"
                        ? target.stock.sourceId
                        : target.stock.sourceId,
                    sourceType: target.stock.sourceType,
                    stockType: "RESERVED",
                    thicknessMm: target.stock.thicknessMm,
                    unit: target.stock.unit,
                    warehouseId: target.stock.warehouseId,
                    widthMm: target.stock.widthMm,
                },
            });
            const reservation = await db.inventoryReservation.create({
                data: {
                    expiresAt: input.expiresAt,
                    inventoryStockId: reservedStock.id,
                    materialId: input.materialId,
                    projectId: input.projectId ?? null,
                    quantity: input.quantity,
                    quotationId: input.quotationId ?? null,
                    reservationType: "FIRM",
                    reservedByUserId: userId,
                    unit: input.unit,
                    warehouseId: input.warehouseId,
                },
                include: inventoryReservationInclude,
            });
            if (target.stock.stockType === "REMNANT" && target.stock.sourceId) {
                await syncRemnantStatusBySourceId(db, target.stock.sourceId, "RESERVED");
            }
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: reservedStock.id,
                materialId: reservation.materialId,
                movementType: "RESERVATION_FIRM",
                quantity: Number(reservation.quantity),
                reason: "Firm reservation created.",
                referenceId: reservation.id,
                referenceType: "inventory_reservation",
                unit: reservation.unit,
                warehouseId: reservation.warehouseId,
            });
            const record = mapInventoryReservation(reservation);
            await auditInventoryAction({
                action: "inventory_reservation.created",
                actorUserId: userId,
                after: record,
                before: null,
                entityId: reservation.id,
                entityType: INVENTORY_RESERVATION_ENTITY_TYPE,
                metadata: {
                    reservationType: "FIRM",
                },
            });
            return record;
        });
    },
    async releaseReservation(reservationId, userId) {
        return prisma.$transaction(async (db) => {
            const reservation = await getReservationOrThrow(db, reservationId);
            if (reservation.status === "CONSUMED") {
                throw new AppError("Cannot release a consumed reservation.", 400);
            }
            if (reservation.status === "RELEASED") {
                throw new AppError("Reservation is already released.", 400);
            }
            if (reservation.status !== "ACTIVE") {
                throw new AppError("Only active reservations can be released.", 400);
            }
            if (reservation.reservationType === "FIRM") {
                const reservedStock = reservation.inventoryStockId
                    ? await getInventoryStockOrThrow(db, reservation.inventoryStockId)
                    : null;
                if (!reservedStock) {
                    throw new AppError("Reserved stock could not be found.", 404);
                }
                await createOrRestoreStock(db, {
                    batchNumber: reservedStock.batchNumber,
                    condition: "AVAILABLE",
                    heightMm: decimalToNumber(reservedStock.heightMm),
                    lengthMm: decimalToNumber(reservedStock.lengthMm),
                    locationCode: reservedStock.locationCode,
                    materialId: reservedStock.materialId,
                    notes: reservedStock.notes,
                    quantity: Number(reservedStock.quantity),
                    sourceId: reservedStock.sourceId,
                    sourceType: reservedStock.sourceType,
                    stockType: reservedStock.sourceType === "REMNANT_GENERATED" ? "REMNANT" : "STANDARD",
                    thicknessMm: decimalToNumber(reservedStock.thicknessMm),
                    unit: reservedStock.unit,
                    warehouseId: reservedStock.warehouseId,
                    widthMm: decimalToNumber(reservedStock.widthMm),
                });
                if (reservedStock.sourceType === "REMNANT_GENERATED" && reservedStock.sourceId) {
                    await syncRemnantStatusBySourceId(db, reservedStock.sourceId, "AVAILABLE");
                }
                await closeInventoryStock(db, reservedStock.id, "CONSUMED");
            }
            if (reservation.inventoryStockId) {
                await updateSoftReservationCondition(db, reservation.inventoryStockId);
            }
            const updatedReservation = await db.inventoryReservation.update({
                data: {
                    status: "RELEASED",
                },
                include: inventoryReservationInclude,
                where: {
                    id: reservation.id,
                },
            });
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: reservation.inventoryStockId,
                materialId: reservation.materialId,
                movementType: "RESERVATION_RELEASE",
                quantity: Number(reservation.quantity),
                reason: "Reservation released.",
                referenceId: reservation.id,
                referenceType: "inventory_reservation",
                unit: reservation.unit,
                warehouseId: reservation.warehouseId,
            });
            const record = mapInventoryReservation(updatedReservation);
            await auditInventoryAction({
                action: "inventory_reservation.released",
                actorUserId: userId,
                after: record,
                before: mapInventoryReservation(reservation),
                entityId: reservation.id,
                entityType: INVENTORY_RESERVATION_ENTITY_TYPE,
            });
            return record;
        });
    },
    async consumeReservation(reservationId, userId) {
        return prisma.$transaction(async (db) => {
            const reservation = await getReservationOrThrow(db, reservationId);
            if (reservation.status === "RELEASED") {
                throw new AppError("Cannot consume a released reservation.", 400);
            }
            if (reservation.status === "CONSUMED") {
                throw new AppError("Reservation is already consumed.", 400);
            }
            if (reservation.status !== "ACTIVE") {
                throw new AppError("Only active reservations can be consumed.", 400);
            }
            const material = await getMaterialOrThrow(db, reservation.materialId);
            if (reservation.reservationType === "FIRM") {
                const reservedStock = reservation.inventoryStockId
                    ? await getInventoryStockOrThrow(db, reservation.inventoryStockId)
                    : null;
                if (!reservedStock) {
                    throw new AppError("Reserved stock could not be found.", 404);
                }
                if (reservedStock.sourceType === "REMNANT_GENERATED" && reservedStock.sourceId) {
                    await syncRemnantStatusBySourceId(db, reservedStock.sourceId, "CONSUMED");
                    await auditInventoryAction({
                        action: "remnant_piece.consumed",
                        actorUserId: userId,
                        after: {
                            status: "CONSUMED",
                        },
                        before: {
                            status: "RESERVED",
                        },
                        entityId: reservedStock.sourceId,
                        entityType: REMNANT_PIECE_ENTITY_TYPE,
                    });
                }
                await closeInventoryStock(db, reservedStock.id, "CONSUMED");
            }
            else {
                const stock = reservation.inventoryStockId
                    ? await getInventoryStockOrThrow(db, reservation.inventoryStockId)
                    : (await getReservationTargetStock(db, {
                        expiresAt: null,
                        inventoryStockId: undefined,
                        materialId: reservation.materialId,
                        projectId: reservation.projectId ?? undefined,
                        quantity: Number(reservation.quantity),
                        quotationId: reservation.quotationId ?? undefined,
                        unit: reservation.unit,
                        warehouseId: reservation.warehouseId,
                    }, material, {
                        allowMaterialLevelSoftReservation: false,
                        reservationType: "FIRM",
                    })).stock;
                if (!stock) {
                    throw new AppError("No matching stock row could be found to consume this reservation.", 400);
                }
                const quantityToConsume = convertQuantity(material, Number(reservation.quantity), reservation.unit, stock.unit);
                await decrementStockQuantity(db, stock.id, quantityToConsume);
                await updateSoftReservationCondition(db, stock.id);
                if (stock.stockType === "REMNANT" && stock.sourceId) {
                    await syncRemnantStatusBySourceId(db, stock.sourceId, "CONSUMED");
                    await auditInventoryAction({
                        action: "remnant_piece.consumed",
                        actorUserId: userId,
                        after: {
                            status: "CONSUMED",
                        },
                        before: {
                            status: "AVAILABLE",
                        },
                        entityId: stock.sourceId,
                        entityType: REMNANT_PIECE_ENTITY_TYPE,
                    });
                }
            }
            const updatedReservation = await db.inventoryReservation.update({
                data: {
                    status: "CONSUMED",
                },
                include: inventoryReservationInclude,
                where: {
                    id: reservation.id,
                },
            });
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: reservation.inventoryStockId,
                materialId: reservation.materialId,
                movementType: "OUT",
                quantity: Number(reservation.quantity),
                reason: "Reservation consumed.",
                referenceId: reservation.id,
                referenceType: "inventory_reservation",
                unit: reservation.unit,
                warehouseId: reservation.warehouseId,
            });
            const record = mapInventoryReservation(updatedReservation);
            await auditInventoryAction({
                action: "inventory_reservation.consumed",
                actorUserId: userId,
                after: record,
                before: mapInventoryReservation(reservation),
                entityId: reservation.id,
                entityType: INVENTORY_RESERVATION_ENTITY_TYPE,
            });
            return record;
        });
    },
    async listReservations(query) {
        await expireSoftReservations(prisma, {
            materialId: query.materialId,
            warehouseId: query.warehouseId,
        });
        const where = buildReservationWhereClause(query);
        const [total, reservations] = await prisma.$transaction([
            prisma.inventoryReservation.count({
                where,
            }),
            prisma.inventoryReservation.findMany({
                include: inventoryReservationInclude,
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
            data: reservations.map(mapInventoryReservation),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async createRemnantPiece(input, userId) {
        return prisma.$transaction(async (db) => {
            const material = await getMaterialOrThrow(db, input.materialId);
            await getWarehouseOrThrow(db, input.warehouseId);
            validateDimensionsForMaterial(material, {
                heightMm: null,
                lengthMm: input.lengthMm,
                thicknessMm: input.thicknessMm,
                widthMm: input.widthMm,
            });
            const code = input.code ?? `RMN-${randomUUID().slice(0, 8).toUpperCase()}`;
            const usableAreaM2 = calculateRemnantAreaM2(input.lengthMm, input.widthMm);
            const remnant = await db.remnantPiece.create({
                data: {
                    code,
                    lengthMm: input.lengthMm,
                    materialId: input.materialId,
                    notes: input.notes,
                    parentInventoryStockId: input.parentInventoryStockId ?? null,
                    quantity: input.quantity,
                    sourceId: input.sourceId,
                    sourceType: input.sourceType,
                    thicknessMm: input.thicknessMm,
                    unit: input.unit,
                    usableAreaM2,
                    warehouseId: input.warehouseId,
                    widthMm: input.widthMm,
                },
                include: remnantInclude,
            });
            await db.inventoryStock.create({
                data: {
                    condition: "AVAILABLE",
                    heightMm: input.lengthMm,
                    lengthMm: input.lengthMm,
                    materialId: input.materialId,
                    notes: input.notes,
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
                createdByUserId: userId,
                materialId: input.materialId,
                movementType: "IN",
                quantity: input.quantity,
                reason: "Remnant piece created.",
                referenceId: remnant.id,
                referenceType: "remnant_piece",
                unit: input.unit,
                warehouseId: input.warehouseId,
            });
            const record = mapRemnantPiece(remnant);
            await auditInventoryAction({
                action: "remnant_piece.created",
                actorUserId: userId,
                after: record,
                before: null,
                entityId: remnant.id,
                entityType: REMNANT_PIECE_ENTITY_TYPE,
            });
            return record;
        });
    },
    async findUsableRemnants(materialId, requiredWidthMm, requiredHeightMm, options) {
        const remnants = await prisma.remnantPiece.findMany({
            include: remnantInclude,
            orderBy: [
                {
                    usableAreaM2: "asc",
                },
            ],
            where: {
                materialId,
                status: "AVAILABLE",
                ...(options?.warehouseId
                    ? {
                        warehouseId: options.warehouseId,
                    }
                    : {}),
                ...(options?.thicknessMm !== undefined
                    ? {
                        thicknessMm: options.thicknessMm,
                    }
                    : {}),
            },
        });
        return remnants
            .filter((remnant) => {
            const remnantWidth = Number(remnant.widthMm ?? 0);
            const remnantLength = Number(remnant.lengthMm ?? 0);
            return ((remnantWidth >= requiredWidthMm && remnantLength >= requiredHeightMm) ||
                (remnantWidth >= requiredHeightMm && remnantLength >= requiredWidthMm));
        })
            .map(mapRemnantPiece);
    },
    async listRemnants(query) {
        const where = buildRemnantWhereClause(query);
        const [total, remnants] = await prisma.$transaction([
            prisma.remnantPiece.count({
                where,
            }),
            prisma.remnantPiece.findMany({
                include: remnantInclude,
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
            data: remnants.map(mapRemnantPiece),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async markMaterialDamaged(input, userId) {
        return prisma.$transaction(async (db) => {
            const material = await getMaterialOrThrow(db, input.materialId);
            await getWarehouseOrThrow(db, input.warehouseId);
            const target = await getReservationTargetStock(db, {
                expiresAt: null,
                inventoryStockId: input.inventoryStockId,
                materialId: input.materialId,
                projectId: undefined,
                quantity: input.quantity,
                quotationId: undefined,
                unit: input.unit,
                warehouseId: input.warehouseId,
            }, material, {
                allowMaterialLevelSoftReservation: false,
                reservationType: "FIRM",
            });
            if (!target.canReserve || !target.stock || target.requestedQuantityInStockUnit === null) {
                throw new AppError("Cannot mark more material as damaged than the current available stock.", 400);
            }
            await decrementStockQuantity(db, target.stock.id, target.requestedQuantityInStockUnit);
            await updateSoftReservationCondition(db, target.stock.id);
            const damagedStock = await db.inventoryStock.create({
                data: {
                    batchNumber: target.stock.batchNumber,
                    condition: "DAMAGED",
                    heightMm: target.stock.heightMm,
                    lengthMm: target.stock.lengthMm,
                    locationCode: target.stock.locationCode,
                    materialId: target.stock.materialId,
                    notes: input.description,
                    quantity: target.requestedQuantityInStockUnit,
                    sourceId: target.stock.sourceId,
                    sourceType: target.stock.sourceType,
                    stockType: "DAMAGED",
                    thicknessMm: target.stock.thicknessMm,
                    unit: target.stock.unit,
                    warehouseId: target.stock.warehouseId,
                    widthMm: target.stock.widthMm,
                },
            });
            const damagedMaterial = await db.damagedMaterial.create({
                data: {
                    damageType: input.damageType,
                    description: input.description,
                    inventoryStockId: damagedStock.id,
                    materialId: input.materialId,
                    quantity: target.requestedQuantityInStockUnit,
                    reportedByUserId: userId,
                    severity: input.severity,
                    unit: damagedStock.unit,
                    warehouseId: input.warehouseId,
                },
                include: damagedMaterialInclude,
            });
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: damagedStock.id,
                materialId: input.materialId,
                movementType: "DAMAGE",
                quantity: target.requestedQuantityInStockUnit,
                reason: input.description ?? "Material reported as damaged.",
                referenceId: damagedMaterial.id,
                referenceType: "damaged_material",
                unit: damagedStock.unit,
                warehouseId: input.warehouseId,
            });
            const record = mapDamagedMaterial(damagedMaterial);
            await auditInventoryAction({
                action: "damaged_material.reported",
                actorUserId: userId,
                after: record,
                before: null,
                entityId: damagedMaterial.id,
                entityType: DAMAGED_MATERIAL_ENTITY_TYPE,
            });
            return record;
        });
    },
    async reviewDamagedMaterial(damagedMaterialId, input, userId) {
        return prisma.$transaction(async (db) => {
            const damagedMaterial = await getDamagedMaterialOrThrow(db, damagedMaterialId);
            if (["SCRAPPED", "RETURNED_TO_SUPPLIER"].includes(damagedMaterial.status)) {
                throw new AppError("This damaged material record is already closed.", 400);
            }
            if (input.status === "REUSABLE") {
                const damagedStock = damagedMaterial.inventoryStockId
                    ? await getInventoryStockOrThrow(db, damagedMaterial.inventoryStockId)
                    : null;
                if (!damagedStock) {
                    throw new AppError("Damaged stock could not be found.", 404);
                }
                await createOrRestoreStock(db, {
                    batchNumber: damagedStock.batchNumber,
                    condition: "AVAILABLE",
                    heightMm: decimalToNumber(damagedStock.heightMm),
                    lengthMm: decimalToNumber(damagedStock.lengthMm),
                    locationCode: damagedStock.locationCode,
                    materialId: damagedStock.materialId,
                    notes: input.description ?? damagedStock.notes,
                    quantity: Number(damagedStock.quantity),
                    sourceId: damagedStock.sourceId,
                    sourceType: "RETURN",
                    stockType: damagedStock.sourceType === "REMNANT_GENERATED" ? "REMNANT" : "STANDARD",
                    thicknessMm: decimalToNumber(damagedStock.thicknessMm),
                    unit: damagedStock.unit,
                    warehouseId: damagedStock.warehouseId,
                    widthMm: decimalToNumber(damagedStock.widthMm),
                });
                if (damagedStock.sourceType === "REMNANT_GENERATED" && damagedStock.sourceId) {
                    await syncRemnantStatusBySourceId(db, damagedStock.sourceId, "AVAILABLE");
                }
                await closeInventoryStock(db, damagedStock.id, "CONSUMED");
                await createInventoryMovement(db, {
                    createdByUserId: userId,
                    inventoryStockId: damagedStock.id,
                    materialId: damagedMaterial.materialId,
                    movementType: "ADJUSTMENT",
                    quantity: Number(damagedMaterial.quantity),
                    reason: input.description ?? "Damaged material reclassified as reusable.",
                    referenceId: damagedMaterial.id,
                    referenceType: "damaged_material",
                    unit: damagedMaterial.unit,
                    warehouseId: damagedMaterial.warehouseId,
                });
            }
            const updated = await db.damagedMaterial.update({
                data: {
                    description: input.description ?? damagedMaterial.description,
                    status: input.status,
                },
                include: damagedMaterialInclude,
                where: {
                    id: damagedMaterial.id,
                },
            });
            const record = mapDamagedMaterial(updated);
            await auditInventoryAction({
                action: "damaged_material.reviewed",
                actorUserId: userId,
                after: record,
                before: mapDamagedMaterial(damagedMaterial),
                entityId: damagedMaterial.id,
                entityType: DAMAGED_MATERIAL_ENTITY_TYPE,
            });
            return record;
        });
    },
    async scrapMaterial(input, userId) {
        return prisma.$transaction(async (db) => {
            if (input.damagedMaterialId) {
                const damagedMaterial = await getDamagedMaterialOrThrow(db, input.damagedMaterialId);
                if (damagedMaterial.status === "SCRAPPED") {
                    throw new AppError("Damaged material is already scrapped.", 400);
                }
                if (damagedMaterial.status === "REUSABLE") {
                    throw new AppError("Reusable damaged material cannot be scrapped.", 400);
                }
                if (damagedMaterial.inventoryStockId) {
                    await closeInventoryStock(db, damagedMaterial.inventoryStockId, "SCRAPPED");
                }
                const updatedDamagedMaterial = await db.damagedMaterial.update({
                    data: {
                        status: "SCRAPPED",
                    },
                    include: damagedMaterialInclude,
                    where: {
                        id: damagedMaterial.id,
                    },
                });
                await createInventoryMovement(db, {
                    createdByUserId: userId,
                    inventoryStockId: damagedMaterial.inventoryStockId,
                    materialId: damagedMaterial.materialId,
                    movementType: "SCRAP",
                    quantity: Number(damagedMaterial.quantity),
                    reason: input.reason ?? "Damaged material scrapped.",
                    referenceId: damagedMaterial.id,
                    referenceType: "damaged_material",
                    unit: damagedMaterial.unit,
                    warehouseId: damagedMaterial.warehouseId,
                });
                const record = mapDamagedMaterial(updatedDamagedMaterial);
                await auditInventoryAction({
                    action: "damaged_material.scrapped",
                    actorUserId: userId,
                    after: record,
                    before: mapDamagedMaterial(damagedMaterial),
                    entityId: damagedMaterial.id,
                    entityType: DAMAGED_MATERIAL_ENTITY_TYPE,
                });
                return {
                    damagedMaterial: record,
                };
            }
            if (input.remnantPieceId) {
                const remnant = await getRemnantOrThrow(db, input.remnantPieceId);
                if (remnant.status === "CONSUMED") {
                    throw new AppError("Cannot scrap a consumed remnant.", 400);
                }
                if (remnant.status === "SCRAPPED") {
                    throw new AppError("Remnant is already scrapped.", 400);
                }
                const remnantStock = await db.inventoryStock.findFirst({
                    where: {
                        deletedAt: null,
                        sourceId: remnant.id,
                        sourceType: "REMNANT_GENERATED",
                        stockType: "REMNANT",
                    },
                });
                if (remnantStock) {
                    await closeInventoryStock(db, remnantStock.id, "SCRAPPED");
                    await createInventoryMovement(db, {
                        createdByUserId: userId,
                        inventoryStockId: remnantStock.id,
                        materialId: remnant.materialId,
                        movementType: "SCRAP",
                        quantity: Number(remnant.quantity),
                        reason: input.reason ?? "Remnant scrapped.",
                        referenceId: remnant.id,
                        referenceType: "remnant_piece",
                        unit: remnant.unit,
                        warehouseId: remnant.warehouseId,
                    });
                }
                const updatedRemnant = await db.remnantPiece.update({
                    data: {
                        status: "SCRAPPED",
                    },
                    include: remnantInclude,
                    where: {
                        id: remnant.id,
                    },
                });
                const record = mapRemnantPiece(updatedRemnant);
                await auditInventoryAction({
                    action: "remnant_piece.scrapped",
                    actorUserId: userId,
                    after: record,
                    before: mapRemnantPiece(remnant),
                    entityId: remnant.id,
                    entityType: REMNANT_PIECE_ENTITY_TYPE,
                });
                return {
                    remnant: record,
                };
            }
            if (input.inventoryStockId) {
                const stock = await getInventoryStockOrThrow(db, input.inventoryStockId);
                if (stock.condition === "CONSUMED") {
                    throw new AppError("Cannot scrap already consumed material.", 400);
                }
                await closeInventoryStock(db, stock.id, "SCRAPPED");
                await createInventoryMovement(db, {
                    createdByUserId: userId,
                    inventoryStockId: stock.id,
                    materialId: stock.materialId,
                    movementType: "SCRAP",
                    quantity: Number(stock.quantity),
                    reason: input.reason ?? "Material scrapped.",
                    referenceId: stock.id,
                    referenceType: "inventory_stock",
                    unit: stock.unit,
                    warehouseId: stock.warehouseId,
                });
                if (stock.stockType === "REMNANT" && stock.sourceId) {
                    await syncRemnantStatusBySourceId(db, stock.sourceId, "SCRAPPED");
                }
                await auditInventoryAction({
                    action: "inventory_stock.scrapped",
                    actorUserId: userId,
                    after: {
                        id: stock.id,
                        status: "SCRAPPED",
                    },
                    before: stock,
                    entityId: stock.id,
                    entityType: INVENTORY_STOCK_ENTITY_TYPE,
                });
                return {};
            }
            throw new AppError("A damaged material, remnant, or stock row is required to scrap material.", 400);
        });
    },
    async returnDamagedMaterialToSupplier(damagedMaterialId, input, userId) {
        return prisma.$transaction(async (db) => {
            const damagedMaterial = await getDamagedMaterialOrThrow(db, damagedMaterialId);
            if (damagedMaterial.status === "RETURNED_TO_SUPPLIER") {
                throw new AppError("Damaged material has already been returned.", 400);
            }
            if (damagedMaterial.inventoryStockId) {
                await closeInventoryStock(db, damagedMaterial.inventoryStockId, "CONSUMED");
            }
            const updated = await db.damagedMaterial.update({
                data: {
                    status: "RETURNED_TO_SUPPLIER",
                },
                include: damagedMaterialInclude,
                where: {
                    id: damagedMaterial.id,
                },
            });
            await createInventoryMovement(db, {
                createdByUserId: userId,
                inventoryStockId: damagedMaterial.inventoryStockId,
                materialId: damagedMaterial.materialId,
                movementType: "ADJUSTMENT",
                quantity: Number(damagedMaterial.quantity),
                reason: input.reason ?? "Damaged material returned to supplier.",
                referenceId: damagedMaterial.id,
                referenceType: "damaged_material",
                unit: damagedMaterial.unit,
                warehouseId: damagedMaterial.warehouseId,
            });
            const record = mapDamagedMaterial(updated);
            await auditInventoryAction({
                action: "damaged_material.returned_to_supplier",
                actorUserId: userId,
                after: record,
                before: mapDamagedMaterial(damagedMaterial),
                entityId: damagedMaterial.id,
                entityType: DAMAGED_MATERIAL_ENTITY_TYPE,
            });
            return record;
        });
    },
    async listDamagedMaterials(query) {
        const where = buildDamagedWhereClause(query);
        const [total, damagedMaterials] = await prisma.$transaction([
            prisma.damagedMaterial.count({
                where,
            }),
            prisma.damagedMaterial.findMany({
                include: damagedMaterialInclude,
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
            data: damagedMaterials.map(mapDamagedMaterial),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
};
//# sourceMappingURL=inventory.service.js.map