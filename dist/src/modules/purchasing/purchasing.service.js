import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { buildDateRangeFilter, toLogJsonValue } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { convertMaterialUnit, } from "../materials/materials.behavior.js";
import { INVENTORY_MOVEMENT_ENTITY_TYPE, INVENTORY_STOCK_ENTITY_TYPE, } from "../inventory/inventory.constants.js";
import { supplierScoringService } from "../suppliers/supplier-scoring.service.js";
import { PURCHASE_ORDER_ENTITY_TYPE, PURCHASE_RECEIPT_ENTITY_TYPE, PURCHASE_REQUEST_ENTITY_TYPE, SUPPLIER_COMPARISON_ENTITY_TYPE, } from "./purchasing.constants.js";
const PURCHASING_PREFER_SINGLE_SUPPLIER = "purchasing.prefer_single_supplier";
const PURCHASING_DEFAULT_SCORING_CONFIG = "purchasing.default_supplier_scoring_config_id";
const PURCHASING_REQUIRE_APPROVAL_BEFORE_PO = "purchasing.require_approval_before_po";
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
const toIsoString = (value) => {
    return value ? value.toISOString() : null;
};
const roundTo = (value, decimals = 4) => {
    return Number(value.toFixed(decimals));
};
const hideCostValue = (value, canViewCost) => {
    return canViewCost ? value : null;
};
const toInputJsonValue = (value) => {
    const serializedValue = toLogJsonValue(value);
    return serializedValue === null ? PrismaNamespace.JsonNull : serializedValue;
};
const userSummarySelect = {
    email: true,
    id: true,
    name: true,
};
const supplierSummarySelect = {
    code: true,
    commercialName: true,
    creditAvailable: true,
    defaultLeadTimeDays: true,
    id: true,
    legalName: true,
    preferenceScore: true,
    reliabilityScore: true,
};
const materialSummarySelect = {
    code: true,
    id: true,
    materialType: true,
    name: true,
    purchaseUnit: true,
    stockUnit: true,
};
const materialForPurchaseSelect = {
    code: true,
    id: true,
    materialType: true,
    name: true,
    purchaseUnit: true,
    standardHeightMm: true,
    standardLengthMm: true,
    standardWidthMm: true,
    stockUnit: true,
    thicknessMm: true,
    unitConversionJson: true,
};
const warehouseSummarySelect = {
    code: true,
    id: true,
    name: true,
};
const purchaseRequestListInclude = {
    _count: {
        select: {
            items: true,
        },
    },
    approvedByUser: {
        select: userSummarySelect,
    },
    items: {
        select: {
            estimatedTotalCost: true,
            selectedSupplierId: true,
        },
    },
    requestedByUser: {
        select: userSummarySelect,
    },
};
const purchaseRequestDetailInclude = {
    approvedByUser: {
        select: userSummarySelect,
    },
    items: {
        include: {
            material: {
                select: materialSummarySelect,
            },
            preferredSupplier: {
                select: supplierSummarySelect,
            },
            selectedSupplier: {
                select: supplierSummarySelect,
            },
        },
        orderBy: [
            {
                createdAt: "asc",
            },
        ],
    },
    requestedByUser: {
        select: userSummarySelect,
    },
};
const supplierComparisonListInclude = {
    approvedByUser: {
        select: userSummarySelect,
    },
    createdByUser: {
        select: userSummarySelect,
    },
    options: {
        select: {
            supplierId: true,
        },
        where: {
            isSelected: true,
        },
    },
    purchaseRequest: {
        select: {
            code: true,
            id: true,
            sourceType: true,
            status: true,
        },
    },
    scoringConfig: {
        select: {
            id: true,
            name: true,
        },
    },
};
const supplierComparisonDetailInclude = {
    ...supplierComparisonListInclude,
    options: {
        include: {
            material: {
                select: materialSummarySelect,
            },
            supplier: {
                select: supplierSummarySelect,
            },
        },
        orderBy: [
            {
                createdAt: "asc",
            },
        ],
    },
    purchaseRequest: {
        include: purchaseRequestDetailInclude,
    },
};
const purchaseOrderListInclude = {
    _count: {
        select: {
            items: true,
        },
    },
    createdByUser: {
        select: userSummarySelect,
    },
    purchaseRequest: {
        select: {
            code: true,
            id: true,
        },
    },
    supplier: {
        select: supplierSummarySelect,
    },
};
const purchaseOrderDetailInclude = {
    ...purchaseOrderListInclude,
    items: {
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
    receipts: {
        include: {
            warehouse: {
                select: warehouseSummarySelect,
            },
        },
        orderBy: [
            {
                receivedAt: "desc",
            },
        ],
    },
};
const purchaseReceiptListInclude = {
    _count: {
        select: {
            items: true,
        },
    },
    purchaseOrder: {
        include: {
            supplier: {
                select: supplierSummarySelect,
            },
        },
    },
    receivedByUser: {
        select: userSummarySelect,
    },
    warehouse: {
        select: warehouseSummarySelect,
    },
};
const purchaseReceiptDetailInclude = {
    ...purchaseReceiptListInclude,
    items: {
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
const mapSupplierSummary = (supplier) => {
    if (!supplier) {
        return null;
    }
    return {
        code: supplier.code,
        commercialName: supplier.commercialName,
        creditAvailable: supplier.creditAvailable,
        defaultLeadTimeDays: supplier.defaultLeadTimeDays,
        id: supplier.id,
        legalName: supplier.legalName,
        preferenceScore: decimalToNumber(supplier.preferenceScore),
        reliabilityScore: decimalToNumber(supplier.reliabilityScore),
    };
};
const mapMaterialSummary = (material) => {
    return {
        code: material.code,
        id: material.id,
        materialType: material.materialType,
        name: material.name,
        purchaseUnit: material.purchaseUnit,
        stockUnit: material.stockUnit,
    };
};
const mapWarehouseSummary = (warehouse) => {
    if (!warehouse) {
        return null;
    }
    return {
        code: warehouse.code,
        id: warehouse.id,
        name: warehouse.name,
    };
};
const computePurchaseRequestTotals = (items, canViewCost) => {
    const estimatedSubtotal = roundTo(items.reduce((sum, item) => sum + Number(item.estimatedTotalCost ?? 0), 0));
    const selectedSupplierCount = new Set(items
        .map((item) => item.selectedSupplierId)
        .filter((supplierId) => Boolean(supplierId))).size;
    return {
        estimatedSubtotal: hideCostValue(estimatedSubtotal, canViewCost),
        itemCount: items.length,
        selectedSupplierCount,
    };
};
const resolveSourceReferenceLabel = async (db, sourceType, sourceId) => {
    if (!sourceId) {
        return null;
    }
    if (sourceType === "QUOTATION") {
        const quotation = await db.quotation.findUnique({
            select: {
                code: true,
            },
            where: {
                id: sourceId,
            },
        });
        return quotation?.code ?? sourceId;
    }
    if (sourceType === "PROJECT") {
        const project = await db.project.findUnique({
            select: {
                code: true,
                title: true,
            },
            where: {
                id: sourceId,
            },
        });
        return project ? `${project.code} - ${project.title}` : sourceId;
    }
    if (sourceType === "CUTTING_PLAN") {
        const cuttingPlan = await db.cuttingPlan.findUnique({
            select: {
                code: true,
            },
            where: {
                id: sourceId,
            },
        });
        if (cuttingPlan?.code) {
            return cuttingPlan.code;
        }
        const profileCuttingPlan = await db.profileCuttingPlan.findUnique({
            select: {
                code: true,
            },
            where: {
                id: sourceId,
            },
        });
        return profileCuttingPlan?.code ?? sourceId;
    }
    return sourceId;
};
const mapPurchaseRequestItem = (item, canViewCost) => {
    return {
        createdAt: item.createdAt.toISOString(),
        description: item.description,
        estimatedTotalCost: hideCostValue(roundTo(Number(item.estimatedTotalCost ?? 0)), canViewCost),
        estimatedUnitCost: item.estimatedUnitCost
            ? hideCostValue(roundTo(Number(item.estimatedUnitCost)), canViewCost)
            : null,
        id: item.id,
        material: mapMaterialSummary(item.material),
        materialId: item.materialId,
        metadataJson: item.metadataJson ?? null,
        preferredSupplier: mapSupplierSummary(item.preferredSupplier),
        preferredSupplierId: item.preferredSupplierId,
        purchaseRequestId: item.purchaseRequestId,
        quantity: roundTo(Number(item.quantity)),
        requiredDate: toIsoString(item.requiredDate),
        selectedSupplier: mapSupplierSummary(item.selectedSupplier),
        selectedSupplierId: item.selectedSupplierId,
        status: item.status,
        unit: item.unit,
        updatedAt: item.updatedAt.toISOString(),
    };
};
const mapPurchaseRequestListItem = async (record, canViewCost, db) => {
    return {
        approvedAt: toIsoString(record.approvedAt),
        approvedByUser: mapUserSummary(record.approvedByUser),
        code: record.code,
        createdAt: record.createdAt.toISOString(),
        id: record.id,
        notes: record.notes,
        requestedByUser: mapUserSummary(record.requestedByUser),
        sourceId: record.sourceId,
        sourceReferenceLabel: await resolveSourceReferenceLabel(db, record.sourceType, record.sourceId),
        sourceType: record.sourceType,
        status: record.status,
        totals: computePurchaseRequestTotals(record.items, canViewCost),
        updatedAt: record.updatedAt.toISOString(),
    };
};
const mapPurchaseRequestRecord = async (record, canViewCost, db) => {
    return {
        ...(await mapPurchaseRequestListItem(record, canViewCost, db)),
        deletedAt: toIsoString(record.deletedAt),
        items: record.items.map((item) => mapPurchaseRequestItem(item, canViewCost)),
    };
};
const mapSupplierComparisonOption = (option, canViewCost) => {
    return {
        availableCredit: option.availableCredit,
        comparisonId: option.comparisonId,
        createdAt: option.createdAt.toISOString(),
        deliveryDays: option.deliveryDays,
        finalScore: decimalToNumber(option.finalScore),
        id: option.id,
        isSelected: option.isSelected,
        material: mapMaterialSummary(option.material),
        materialId: option.materialId,
        purchaseRequestItemId: option.purchaseRequestItemId,
        scoreBreakdownJson: option.scoreBreakdownJson ?? null,
        supplier: mapSupplierSummary(option.supplier),
        supplierId: option.supplierId,
        supplierScore: decimalToNumber(option.supplierScore),
        totalPrice: option.totalPrice
            ? hideCostValue(roundTo(Number(option.totalPrice)), canViewCost)
            : null,
        unitPrice: option.unitPrice
            ? hideCostValue(roundTo(Number(option.unitPrice)), canViewCost)
            : null,
        updatedAt: option.updatedAt.toISOString(),
    };
};
const mapSupplierComparisonListItem = (record) => {
    return {
        approvedAt: toIsoString(record.approvedAt),
        approvedByUser: mapUserSummary(record.approvedByUser),
        createdAt: record.createdAt.toISOString(),
        createdByUser: mapUserSummary(record.createdByUser),
        id: record.id,
        purchaseRequest: {
            code: record.purchaseRequest.code,
            id: record.purchaseRequest.id,
            sourceType: record.purchaseRequest.sourceType,
            status: record.purchaseRequest.status,
        },
        scoringConfig: record.scoringConfig
            ? {
                id: record.scoringConfig.id,
                name: record.scoringConfig.name,
            }
            : null,
        selectedSuppliersCount: new Set(record.options.map((option) => option.supplierId)).size,
        status: record.status,
        updatedAt: record.updatedAt.toISOString(),
    };
};
const hideComparisonSummaryCosts = (value, canViewCost) => {
    if (canViewCost || !value || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => hideComparisonSummaryCosts(entry, canViewCost));
    }
    return Object.entries(value).reduce((result, [key, entry]) => {
        if (["estimatedSubtotal", "totalPrice", "unitPrice"].includes(key)) {
            result[key] = null;
            return result;
        }
        result[key] = hideComparisonSummaryCosts(entry, canViewCost);
        return result;
    }, {});
};
const mapSupplierComparisonRecord = async (record, canViewCost, db) => {
    return {
        ...mapSupplierComparisonListItem(record),
        options: record.options.map((option) => mapSupplierComparisonOption(option, canViewCost)),
        purchaseRequestDetail: await mapPurchaseRequestRecord(record.purchaseRequest, canViewCost, db),
        resultJson: hideComparisonSummaryCosts(record.resultJson, canViewCost),
        selectedCombinationJson: hideComparisonSummaryCosts(record.selectedCombinationJson, canViewCost),
    };
};
const mapPurchaseOrderItem = (item, canViewCost) => {
    return {
        createdAt: item.createdAt.toISOString(),
        description: item.description,
        id: item.id,
        material: mapMaterialSummary(item.material),
        materialId: item.materialId,
        metadataJson: item.metadataJson ?? null,
        purchaseOrderId: item.purchaseOrderId,
        quantity: roundTo(Number(item.quantity)),
        receivedQuantity: roundTo(Number(item.receivedQuantity)),
        totalPrice: hideCostValue(roundTo(Number(item.totalPrice)), canViewCost),
        unit: item.unit,
        unitPrice: hideCostValue(roundTo(Number(item.unitPrice)), canViewCost),
        updatedAt: item.updatedAt.toISOString(),
    };
};
const mapPurchaseOrderListItem = (record, canViewCost) => {
    return {
        code: record.code,
        createdAt: record.createdAt.toISOString(),
        createdByUser: mapUserSummary(record.createdByUser),
        currency: record.currency,
        discountAmount: hideCostValue(roundTo(Number(record.discountAmount)), canViewCost),
        expectedDeliveryDate: toIsoString(record.expectedDeliveryDate),
        id: record.id,
        itemCount: record._count.items,
        notes: record.notes,
        orderDate: record.orderDate.toISOString(),
        purchaseRequest: record.purchaseRequest
            ? {
                code: record.purchaseRequest.code,
                id: record.purchaseRequest.id,
            }
            : null,
        purchaseRequestId: record.purchaseRequestId,
        status: record.status,
        subtotal: hideCostValue(roundTo(Number(record.subtotal)), canViewCost),
        supplier: mapSupplierSummary(record.supplier),
        supplierId: record.supplierId,
        taxAmount: hideCostValue(roundTo(Number(record.taxAmount)), canViewCost),
        total: hideCostValue(roundTo(Number(record.total)), canViewCost),
        updatedAt: record.updatedAt.toISOString(),
    };
};
const mapPurchaseOrderRecord = (record, canViewCost) => {
    return {
        ...mapPurchaseOrderListItem(record, canViewCost),
        confirmedAt: toIsoString(record.confirmedAt),
        deletedAt: toIsoString(record.deletedAt),
        items: record.items.map((item) => mapPurchaseOrderItem(item, canViewCost)),
        receipts: record.receipts.map((receipt) => ({
            code: receipt.code,
            id: receipt.id,
            receivedAt: receipt.receivedAt.toISOString(),
            warehouse: mapWarehouseSummary(receipt.warehouse),
        })),
        sentAt: toIsoString(record.sentAt),
    };
};
const mapPurchaseReceiptItem = (item) => {
    return {
        batchNumber: item.batchNumber,
        createdAt: item.createdAt.toISOString(),
        id: item.id,
        locationCode: item.locationCode,
        material: mapMaterialSummary(item.material),
        materialId: item.materialId,
        notes: item.notes,
        purchaseOrderItemId: item.purchaseOrderItemId,
        purchaseReceiptId: item.purchaseReceiptId,
        receivedQuantity: roundTo(Number(item.receivedQuantity)),
        unit: item.unit,
        updatedAt: item.updatedAt.toISOString(),
    };
};
const mapPurchaseReceiptListItem = (record) => {
    return {
        code: record.code,
        createdAt: record.createdAt.toISOString(),
        id: record.id,
        itemCount: record._count.items,
        purchaseOrder: {
            code: record.purchaseOrder.code,
            id: record.purchaseOrder.id,
            status: record.purchaseOrder.status,
        },
        purchaseOrderId: record.purchaseOrderId,
        receivedAt: record.receivedAt.toISOString(),
        receivedByUser: mapUserSummary(record.receivedByUser),
        supplier: mapSupplierSummary(record.purchaseOrder.supplier),
        warehouse: mapWarehouseSummary(record.warehouse),
        warehouseId: record.warehouseId,
    };
};
const mapPurchaseReceiptRecord = (record) => {
    return {
        ...mapPurchaseReceiptListItem(record),
        items: record.items.map(mapPurchaseReceiptItem),
        notes: record.notes,
    };
};
const generatePurchaseRequestCode = async (db, value = new Date()) => {
    const year = value.getUTCFullYear();
    const prefix = `PR-${year}-`;
    const latest = await db.purchaseRequest.findFirst({
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
    return `${prefix}${String(nextSequence).padStart(6, "0")}`;
};
const generatePurchaseOrderCode = async (db, value = new Date()) => {
    const year = value.getUTCFullYear();
    const prefix = `PO-${year}-`;
    const latest = await db.purchaseOrder.findFirst({
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
    return `${prefix}${String(nextSequence).padStart(6, "0")}`;
};
const generatePurchaseReceiptCode = async (db, value = new Date()) => {
    const year = value.getUTCFullYear();
    const prefix = `REC-${year}-`;
    const latest = await db.purchaseReceipt.findFirst({
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
    return `${prefix}${String(nextSequence).padStart(6, "0")}`;
};
const getPurchasingSettings = async (db) => {
    const settings = await db.systemSetting.findMany({
        where: {
            key: {
                in: [
                    PURCHASING_PREFER_SINGLE_SUPPLIER,
                    PURCHASING_DEFAULT_SCORING_CONFIG,
                    PURCHASING_REQUIRE_APPROVAL_BEFORE_PO,
                ],
            },
        },
    });
    const byKey = new Map(settings.map((setting) => [setting.key, setting.valueJson]));
    const readBoolean = (key, fallback) => {
        const raw = byKey.get(key);
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
    const readNullableString = (key) => {
        const raw = byKey.get(key);
        return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    };
    return {
        defaultSupplierScoringConfigId: readNullableString(PURCHASING_DEFAULT_SCORING_CONFIG),
        preferSingleSupplier: readBoolean(PURCHASING_PREFER_SINGLE_SUPPLIER, false),
        requireApprovalBeforePo: readBoolean(PURCHASING_REQUIRE_APPROVAL_BEFORE_PO, true),
    };
};
const findPurchaseRequestOrThrow = async (db, purchaseRequestId) => {
    const purchaseRequest = await db.purchaseRequest.findUnique({
        include: purchaseRequestDetailInclude,
        where: {
            id: purchaseRequestId,
        },
    });
    if (!purchaseRequest || purchaseRequest.deletedAt) {
        throw new AppError("Purchase request not found.", 404);
    }
    return purchaseRequest;
};
const findSupplierComparisonOrThrow = async (db, comparisonId) => {
    const comparison = await db.supplierComparison.findUnique({
        include: supplierComparisonDetailInclude,
        where: {
            id: comparisonId,
        },
    });
    if (!comparison) {
        throw new AppError("Supplier comparison not found.", 404);
    }
    return comparison;
};
const findPurchaseOrderOrThrow = async (db, purchaseOrderId) => {
    const purchaseOrder = await db.purchaseOrder.findUnique({
        include: purchaseOrderDetailInclude,
        where: {
            id: purchaseOrderId,
        },
    });
    if (!purchaseOrder || purchaseOrder.deletedAt) {
        throw new AppError("Purchase order not found.", 404);
    }
    return purchaseOrder;
};
const findPurchaseReceiptOrThrow = async (db, purchaseReceiptId) => {
    const purchaseReceipt = await db.purchaseReceipt.findUnique({
        include: purchaseReceiptDetailInclude,
        where: {
            id: purchaseReceiptId,
        },
    });
    if (!purchaseReceipt) {
        throw new AppError("Purchase receipt not found.", 404);
    }
    return purchaseReceipt;
};
const ensurePurchaseRequestIsEditable = (status) => {
    if (["CONVERTED_TO_PO", "CANCELLED"].includes(status)) {
        throw new AppError("This purchase request can no longer be edited.", 400);
    }
};
const ensurePurchaseRequestCanChangeLines = (status) => {
    if (!["DRAFT", "PENDING_APPROVAL", "REJECTED"].includes(status)) {
        throw new AppError("Only draft, pending approval, or rejected purchase requests can change items.", 400);
    }
};
const ensureAuthenticatedUser = (userId) => {
    if (!userId) {
        throw new AppError("Authenticated user context is required.", 401);
    }
    return userId;
};
const getMaterialForPurchaseOrThrow = async (db, materialId) => {
    const material = await db.material.findUnique({
        select: materialForPurchaseSelect,
        where: {
            id: materialId,
        },
    });
    if (!material) {
        throw new AppError("Material not found.", 404);
    }
    return material;
};
const ensureSupplierExists = async (db, supplierId) => {
    const supplier = await db.supplier.findFirst({
        select: {
            id: true,
        },
        where: {
            deletedAt: null,
            id: supplierId,
        },
    });
    if (!supplier) {
        throw new AppError("Supplier not found.", 404);
    }
};
const ensureWarehouseExists = async (db, warehouseId) => {
    const warehouse = await db.warehouse.findFirst({
        select: {
            id: true,
        },
        where: {
            deletedAt: null,
            id: warehouseId,
        },
    });
    if (!warehouse) {
        throw new AppError("Warehouse not found.", 404);
    }
};
const buildPurchaseRequestWhereClause = (query) => {
    const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
        deletedAt: null,
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
        ...(query.sourceType
            ? {
                sourceType: query.sourceType,
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
                        sourceId: {
                            contains: query.search,
                        },
                    },
                ],
            }
            : {}),
    };
};
const buildSupplierComparisonWhereClause = (query) => {
    return {
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
        ...(query.purchaseRequestId
            ? {
                purchaseRequestId: query.purchaseRequestId,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        purchaseRequest: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        scoringConfig: {
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
const buildPurchaseOrderWhereClause = (query) => {
    const orderDate = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
        deletedAt: null,
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
        ...(query.supplierId
            ? {
                supplierId: query.supplierId,
            }
            : {}),
        ...(query.purchaseRequestId
            ? {
                purchaseRequestId: query.purchaseRequestId,
            }
            : {}),
        ...(orderDate
            ? {
                orderDate,
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
                        supplier: {
                            legalName: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        purchaseRequest: {
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
const buildPurchaseReceiptWhereClause = (query) => {
    const receivedAt = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
        ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
            }
            : {}),
        ...(query.purchaseOrderId
            ? {
                purchaseOrderId: query.purchaseOrderId,
            }
            : {}),
        ...(receivedAt
            ? {
                receivedAt,
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
                        purchaseOrder: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        purchaseOrder: {
                            supplier: {
                                legalName: {
                                    contains: query.search,
                                },
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const sanitizePurchaseRequestItems = (items) => {
    return items.map((item) => {
        const estimatedUnitCost = item.estimatedUnitCost === null || item.estimatedUnitCost === undefined
            ? null
            : roundTo(item.estimatedUnitCost);
        const estimatedTotalCost = estimatedUnitCost === null ? null : roundTo(item.quantity * estimatedUnitCost);
        return {
            description: item.description,
            estimatedTotalCost,
            estimatedUnitCost,
            materialId: item.materialId,
            metadataJson: item.metadataJson ?? null,
            preferredSupplierId: item.preferredSupplierId ?? null,
            quantity: roundTo(item.quantity),
            requiredDate: item.requiredDate ?? null,
            selectedSupplierId: item.selectedSupplierId ?? null,
            status: item.status ?? "OPEN",
            unit: item.unit,
        };
    });
};
const upsertPurchaseRequestItems = async (db, purchaseRequestId, items) => {
    await db.purchaseRequestItem.deleteMany({
        where: {
            purchaseRequestId,
        },
    });
    const nextItems = sanitizePurchaseRequestItems(items);
    for (const item of nextItems) {
        await db.purchaseRequestItem.create({
            data: {
                description: item.description,
                estimatedTotalCost: item.estimatedTotalCost,
                estimatedUnitCost: item.estimatedUnitCost,
                materialId: item.materialId,
                metadataJson: toInputJsonValue(item.metadataJson),
                preferredSupplierId: item.preferredSupplierId,
                purchaseRequestId,
                quantity: item.quantity,
                requiredDate: item.requiredDate,
                selectedSupplierId: item.selectedSupplierId,
                status: item.status,
                unit: item.unit,
            },
        });
    }
};
const calculateOrderTotalsFromInputs = (items, discountAmount, taxAmount) => {
    const subtotal = roundTo(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
    const total = roundTo(subtotal - discountAmount + taxAmount);
    return {
        subtotal,
        total,
    };
};
const resolveComparisonConfig = async (db, scoringConfigId) => {
    if (scoringConfigId) {
        return supplierScoringService.getConfigById(scoringConfigId);
    }
    const settings = await getPurchasingSettings(db);
    if (settings.defaultSupplierScoringConfigId) {
        return supplierScoringService.getConfigById(settings.defaultSupplierScoringConfigId);
    }
    return supplierScoringService.resolveApplicableConfig(null);
};
const normalizeHigherIsBetter = (value, values) => {
    if (value === null || values.length === 0) {
        return 0;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) {
        return 100;
    }
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
};
const normalizeLowerIsBetter = (value, values) => {
    if (value === null || values.length === 0) {
        return 0;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) {
        return 100;
    }
    return Math.max(0, Math.min(100, ((max - value) / (max - min)) * 100));
};
const calculateItemPricing = (item, material, candidate) => {
    if (!candidate) {
        return {
            convertedQuantity: null,
            normalizedUnit: null,
            totalPrice: null,
            unitPrice: null,
        };
    }
    const itemQuantity = roundTo(Number(item.quantity));
    const targetUnit = candidate.normalizedUnit ?? candidate.supplierUnit ?? material.purchaseUnit;
    const targetMaterialUnit = targetUnit;
    let convertedQuantity = null;
    try {
        convertedQuantity =
            item.unit === targetMaterialUnit
                ? itemQuantity
                : roundTo(convertMaterialUnit({
                    fromUnit: item.unit,
                    material: {
                        code: material.code,
                        materialType: material.materialType,
                        name: material.name,
                        unitConversionJson: material.unitConversionJson,
                    },
                    quantity: itemQuantity,
                    toUnit: targetMaterialUnit,
                }));
    }
    catch {
        const metadata = item.metadataJson && typeof item.metadataJson === "object"
            ? item.metadataJson
            : null;
        const totalSheetAreaM2 = metadata?.totalSheetAreaM2;
        if (targetMaterialUnit === "M2" && typeof totalSheetAreaM2 === "number") {
            convertedQuantity = roundTo(totalSheetAreaM2);
        }
    }
    if (convertedQuantity === null) {
        return {
            convertedQuantity: null,
            normalizedUnit: targetUnit,
            totalPrice: null,
            unitPrice: null,
        };
    }
    const totalPrice = roundTo(convertedQuantity * candidate.price);
    const unitPrice = itemQuantity > 0 ? roundTo(totalPrice / itemQuantity) : null;
    return {
        convertedQuantity,
        normalizedUnit: targetUnit,
        totalPrice,
        unitPrice,
    };
};
const createInventoryStockFromReceipt = async (db, input) => {
    if (input.material.materialType === "SHEET") {
        if (input.widthMm === null) {
            throw new AppError("Sheet materials require a width in millimeters.", 400);
        }
        if (input.heightMm === null && input.lengthMm === null) {
            throw new AppError("Sheet materials require a height or length in millimeters.", 400);
        }
        if (input.thicknessMm === null) {
            throw new AppError("Sheet materials require a thickness in millimeters.", 400);
        }
    }
    if (input.material.materialType === "LINEAR" && input.lengthMm === null) {
        throw new AppError("Linear materials require a length in millimeters.", 400);
    }
    const stock = await db.inventoryStock.create({
        data: {
            batchNumber: input.batchNumber,
            condition: "AVAILABLE",
            heightMm: input.heightMm,
            lengthMm: input.lengthMm,
            locationCode: input.locationCode,
            materialId: input.material.id,
            notes: input.notes,
            quantity: input.quantity,
            sourceId: input.sourceId,
            sourceType: "PURCHASE",
            stockType: "STANDARD",
            thicknessMm: input.thicknessMm,
            unit: input.material.stockUnit,
            warehouseId: input.warehouseId,
            widthMm: input.widthMm,
        },
    });
    await db.inventoryMovement.create({
        data: {
            createdByUserId: input.userId,
            inventoryStockId: stock.id,
            materialId: input.material.id,
            movementType: "IN",
            quantity: input.quantity,
            reason: input.notes ?? "Purchase receipt received into inventory.",
            referenceId: input.sourceId,
            referenceType: "purchase_receipt_item",
            unit: input.material.stockUnit,
            warehouseId: input.warehouseId,
        },
    });
    await auditLogService.create({
        action: "inventory_stock.created",
        actorUserId: input.userId,
        after: {
            id: stock.id,
            materialId: stock.materialId,
            quantity: input.quantity,
            sourceId: stock.sourceId,
            unit: stock.unit,
            warehouseId: stock.warehouseId,
        },
        before: null,
        entityId: stock.id,
        entityType: INVENTORY_STOCK_ENTITY_TYPE,
        metadata: {
            source: "purchase_receipt",
            sourceId: input.sourceId,
        },
    }, {
        db: {
            auditLog: db.auditLog,
        },
    });
    await auditLogService.create({
        action: "inventory_movement.created",
        actorUserId: input.userId,
        after: {
            inventoryStockId: stock.id,
            materialId: stock.materialId,
            movementType: "IN",
            quantity: input.quantity,
            warehouseId: stock.warehouseId,
        },
        before: null,
        entityId: stock.id,
        entityType: INVENTORY_MOVEMENT_ENTITY_TYPE,
        metadata: {
            source: "purchase_receipt",
            sourceId: input.sourceId,
        },
    }, {
        db: {
            auditLog: db.auditLog,
        },
    });
};
const convertReceiptQuantityToStockUnit = (material, quantity, unit) => {
    if (unit === material.stockUnit) {
        return roundTo(quantity);
    }
    return roundTo(convertMaterialUnit({
        fromUnit: unit,
        material: {
            code: material.code,
            materialType: material.materialType,
            name: material.name,
            unitConversionJson: material.unitConversionJson,
        },
        quantity,
        toUnit: material.stockUnit,
    }));
};
const resolveReceiptDimensions = (material, line) => {
    return {
        heightMm: line.heightMm ??
            decimalToNumber(material.standardHeightMm) ??
            decimalToNumber(material.standardLengthMm),
        lengthMm: line.lengthMm ?? decimalToNumber(material.standardLengthMm),
        thicknessMm: line.thicknessMm ?? decimalToNumber(material.thicknessMm),
        widthMm: line.widthMm ?? decimalToNumber(material.standardWidthMm),
    };
};
export const purchasingService = {
    async getDashboard(options) {
        const now = new Date();
        const [pendingPurchaseRequests, pendingApprovals, openPurchaseOrders, delayedOrders, partialOrders, recentReceipts,] = await prisma.$transaction([
            prisma.purchaseRequest.count({
                where: {
                    deletedAt: null,
                    status: {
                        in: ["DRAFT", "PENDING_APPROVAL"],
                    },
                },
            }),
            prisma.purchaseRequest.count({
                where: {
                    deletedAt: null,
                    status: "PENDING_APPROVAL",
                },
            }),
            prisma.purchaseOrder.count({
                where: {
                    deletedAt: null,
                    status: {
                        in: ["DRAFT", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED"],
                    },
                },
            }),
            prisma.purchaseOrder.findMany({
                include: purchaseOrderListInclude,
                orderBy: {
                    expectedDeliveryDate: "asc",
                },
                take: 5,
                where: {
                    deletedAt: null,
                    expectedDeliveryDate: {
                        lt: now,
                    },
                    status: {
                        in: ["DRAFT", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED"],
                    },
                },
            }),
            prisma.purchaseOrder.findMany({
                include: purchaseOrderListInclude,
                orderBy: {
                    updatedAt: "desc",
                },
                take: 5,
                where: {
                    deletedAt: null,
                    status: "PARTIALLY_RECEIVED",
                },
            }),
            prisma.purchaseReceipt.findMany({
                include: purchaseReceiptListInclude,
                orderBy: {
                    receivedAt: "desc",
                },
                take: 6,
            }),
        ]);
        return {
            delayedExpectedDeliveries: delayedOrders.map((order) => mapPurchaseOrderListItem(order, options.canViewCost)),
            openPurchaseOrders,
            partialPurchaseOrders: partialOrders.map((order) => mapPurchaseOrderListItem(order, options.canViewCost)),
            pendingApprovals,
            pendingPurchaseRequests,
            recentReceipts: recentReceipts.map(mapPurchaseReceiptListItem),
        };
    },
    async listPurchaseRequests(query, options) {
        const where = buildPurchaseRequestWhereClause(query);
        const [total, records] = await prisma.$transaction([
            prisma.purchaseRequest.count({
                where,
            }),
            prisma.purchaseRequest.findMany({
                include: purchaseRequestListInclude,
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
            data: await Promise.all(records.map((record) => mapPurchaseRequestListItem(record, options.canViewCost, prisma))),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getPurchaseRequestById(purchaseRequestId, options) {
        const record = await findPurchaseRequestOrThrow(prisma, purchaseRequestId);
        return mapPurchaseRequestRecord(record, options.canViewCost, prisma);
    },
    async createPurchaseRequest(input, userId, options) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            const code = await generatePurchaseRequestCode(db);
            const created = await db.purchaseRequest.create({
                data: {
                    code,
                    notes: input.notes,
                    requestedByUserId: actorUserId,
                    sourceId: input.sourceId,
                    sourceType: input.sourceType,
                },
                include: purchaseRequestDetailInclude,
            });
            if (input.items.length > 0) {
                await upsertPurchaseRequestItems(db, created.id, input.items);
            }
            const current = await findPurchaseRequestOrThrow(db, created.id);
            await auditLogService.create({
                action: "purchase_request.created",
                actorUserId,
                after: await mapPurchaseRequestRecord(current, true, db),
                before: null,
                entityId: current.id,
                entityType: PURCHASE_REQUEST_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseRequestRecord(current, options?.canViewCost ?? true, db);
        });
    },
    async createPurchaseRequestFromQuotation(quotationId, userId, options) {
        const quotation = await prisma.quotation.findUnique({
            select: {
                code: true,
                id: true,
                items: {
                    select: {
                        materials: {
                            select: {
                                materialId: true,
                                materialName: true,
                                requiredQuantity: true,
                                supplierId: true,
                                unit: true,
                            },
                        },
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
        const grouped = new Map();
        quotation.items.forEach((item) => {
            item.materials.forEach((material) => {
                if (!material.materialId) {
                    return;
                }
                const key = `${material.materialId}:${material.unit}`;
                const existing = grouped.get(key);
                if (existing) {
                    existing.quantity = roundTo(existing.quantity + Number(material.requiredQuantity));
                    if (material.supplierId) {
                        existing.preferredSupplierIds.add(material.supplierId);
                    }
                    return;
                }
                grouped.set(key, {
                    description: material.materialName,
                    materialId: material.materialId,
                    preferredSupplierIds: material.supplierId
                        ? new Set([material.supplierId])
                        : new Set(),
                    quantity: roundTo(Number(material.requiredQuantity)),
                    unit: material.unit,
                });
            });
        });
        if (grouped.size === 0) {
            throw new AppError("The quotation does not contain material requirements to purchase.", 400);
        }
        return this.createPurchaseRequest({
            items: Array.from(grouped.values()).map((entry) => ({
                description: entry.description,
                estimatedUnitCost: null,
                id: undefined,
                materialId: entry.materialId,
                metadataJson: {
                    quotationCode: quotation.code,
                    sourceType: "quotation_material_requirement",
                },
                preferredSupplierId: entry.preferredSupplierIds.size === 1
                    ? Array.from(entry.preferredSupplierIds)[0]
                    : undefined,
                quantity: entry.quantity,
                requiredDate: null,
                selectedSupplierId: undefined,
                unit: entry.unit,
            })),
            notes: `Generated from quotation ${quotation.code}.`,
            sourceId: quotation.id,
            sourceType: "QUOTATION",
        }, userId, options);
    },
    async createPurchaseRequestFromCuttingPlan(cuttingPlanId, userId, options) {
        const cuttingPlan = await prisma.cuttingPlan.findUnique({
            include: {
                material: {
                    select: materialForPurchaseSelect,
                },
                sheets: {
                    select: {
                        heightMm: true,
                        sheetAreaM2: true,
                        sheetSource: true,
                        widthMm: true,
                    },
                    where: {
                        sheetSource: "PURCHASE_REQUIRED",
                    },
                },
            },
            where: {
                id: cuttingPlanId,
            },
        });
        if (!cuttingPlan) {
            throw new AppError("Cutting plan not found.", 404);
        }
        if (cuttingPlan.sheets.length === 0) {
            throw new AppError("This cutting plan does not require additional purchased sheets.", 400);
        }
        const totalAreaM2 = roundTo(cuttingPlan.sheets.reduce((sum, sheet) => sum + Number(sheet.sheetAreaM2), 0));
        return this.createPurchaseRequest({
            items: [
                {
                    description: `${cuttingPlan.material.name} purchase requirement from cutting plan ${cuttingPlan.code}.`,
                    estimatedUnitCost: null,
                    id: undefined,
                    materialId: cuttingPlan.material.id,
                    metadataJson: {
                        sheetCount: cuttingPlan.sheets.length,
                        sheets: cuttingPlan.sheets.map((sheet) => ({
                            heightMm: decimalToNumber(sheet.heightMm),
                            widthMm: decimalToNumber(sheet.widthMm),
                        })),
                        totalSheetAreaM2: totalAreaM2,
                    },
                    preferredSupplierId: undefined,
                    quantity: totalAreaM2,
                    requiredDate: null,
                    selectedSupplierId: undefined,
                    unit: "M2",
                },
            ],
            notes: `Generated from cutting plan ${cuttingPlan.code}.`,
            sourceId: cuttingPlan.id,
            sourceType: "CUTTING_PLAN",
        }, userId, options);
    },
    async createPurchaseRequestFromProfileCuttingPlan(profileCuttingPlanId, userId, options) {
        const profileCuttingPlan = await prisma.profileCuttingPlan.findUnique({
            include: {
                bars: {
                    select: {
                        originalLengthMm: true,
                        sourceType: true,
                    },
                    where: {
                        sourceType: "PURCHASE_REQUIRED",
                    },
                },
                material: {
                    select: materialForPurchaseSelect,
                },
            },
            where: {
                id: profileCuttingPlanId,
            },
        });
        if (!profileCuttingPlan) {
            throw new AppError("Profile cutting plan not found.", 404);
        }
        if (profileCuttingPlan.bars.length === 0) {
            throw new AppError("This profile cutting plan does not require additional purchased bars.", 400);
        }
        const totalLengthMm = roundTo(profileCuttingPlan.bars.reduce((sum, bar) => sum + Number(bar.originalLengthMm), 0), 2);
        const purchaseQuantity = roundTo(convertMaterialUnit({
            fromUnit: "MM",
            material: {
                code: profileCuttingPlan.material.code,
                materialType: profileCuttingPlan.material.materialType,
                name: profileCuttingPlan.material.name,
                unitConversionJson: profileCuttingPlan.material.unitConversionJson,
            },
            quantity: totalLengthMm,
            toUnit: profileCuttingPlan.material.purchaseUnit,
        }), 4);
        return this.createPurchaseRequest({
            items: [
                {
                    description: `${profileCuttingPlan.material.name} purchase requirement from profile cutting plan ${profileCuttingPlan.code}.`,
                    estimatedUnitCost: null,
                    id: undefined,
                    materialId: profileCuttingPlan.material.id,
                    metadataJson: {
                        bars: profileCuttingPlan.bars.map((bar) => ({
                            originalLengthMm: decimalToNumber(bar.originalLengthMm),
                        })),
                        totalBars: profileCuttingPlan.bars.length,
                        totalLengthMm,
                    },
                    preferredSupplierId: undefined,
                    quantity: purchaseQuantity,
                    requiredDate: null,
                    selectedSupplierId: undefined,
                    unit: profileCuttingPlan.material.purchaseUnit,
                },
            ],
            notes: `Generated from profile cutting plan ${profileCuttingPlan.code}.`,
            sourceId: profileCuttingPlan.id,
            sourceType: "CUTTING_PLAN",
        }, userId, options);
    },
    async createPurchaseRequestFromInventoryShortage(input, userId, options) {
        const materials = await prisma.material.findMany({
            select: materialForPurchaseSelect,
            where: {
                id: {
                    in: input.materialIds,
                },
            },
        });
        if (materials.length !== input.materialIds.length) {
            throw new AppError("One or more materials do not exist.", 404);
        }
        const stockRows = await prisma.inventoryStock.groupBy({
            _sum: {
                quantity: true,
            },
            by: ["materialId"],
            where: {
                deletedAt: null,
                materialId: {
                    in: input.materialIds,
                },
            },
        });
        const stockByMaterialId = new Map(stockRows.map((row) => [row.materialId, Number(row._sum.quantity ?? 0)]));
        return this.createPurchaseRequest({
            items: materials.map((material) => ({
                description: `Inventory shortage review for ${material.name}.`,
                estimatedUnitCost: null,
                id: undefined,
                materialId: material.id,
                metadataJson: {
                    availableQuantity: roundTo(stockByMaterialId.get(material.id) ?? 0),
                    assumption: "Shortage requests default to a quantity of 1 when no reorder target is configured.",
                },
                preferredSupplierId: undefined,
                quantity: 1,
                requiredDate: null,
                selectedSupplierId: undefined,
                unit: material.purchaseUnit,
            })),
            notes: input.notes ??
                "Generated from an inventory shortage review. Quantities may require manual adjustment.",
            sourceId: null,
            sourceType: "INVENTORY_SHORTAGE",
        }, userId, options);
    },
    async updatePurchaseRequest(purchaseRequestId, input, userId, options) {
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            ensurePurchaseRequestIsEditable(existing.status);
            if (input.items) {
                ensurePurchaseRequestCanChangeLines(existing.status);
            }
            await db.purchaseRequest.update({
                data: {
                    notes: input.notes ?? existing.notes,
                    sourceId: input.sourceId === undefined ? existing.sourceId : input.sourceId,
                    sourceType: input.sourceType ?? existing.sourceType,
                },
                where: {
                    id: purchaseRequestId,
                },
            });
            if (input.items) {
                await upsertPurchaseRequestItems(db, purchaseRequestId, input.items);
            }
            const current = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            await auditLogService.create({
                action: "purchase_request.updated",
                actorUserId: userId,
                after: await mapPurchaseRequestRecord(current, true, db),
                before: await mapPurchaseRequestRecord(existing, true, db),
                entityId: current.id,
                entityType: PURCHASE_REQUEST_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseRequestRecord(current, options?.canViewCost ?? true, db);
        });
    },
    async deletePurchaseRequest(purchaseRequestId, userId) {
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            if (!["DRAFT", "REJECTED", "CANCELLED"].includes(existing.status)) {
                throw new AppError("Only draft, rejected, or cancelled purchase requests can be deleted.", 400);
            }
            await db.purchaseRequest.update({
                data: {
                    deletedAt: new Date(),
                },
                where: {
                    id: purchaseRequestId,
                },
            });
            await auditLogService.create({
                action: "purchase_request.deleted",
                actorUserId: userId,
                after: null,
                before: await mapPurchaseRequestRecord(existing, true, db),
                entityId: existing.id,
                entityType: PURCHASE_REQUEST_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return {
                deleted: true,
                id: existing.id,
            };
        });
    },
    async approvePurchaseRequest(purchaseRequestId, userId, input, options) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            if (existing.items.length === 0) {
                throw new AppError("Purchase request must contain at least one item before approval.", 400);
            }
            if (existing.status === "CONVERTED_TO_PO") {
                throw new AppError("Converted purchase requests cannot be approved again.", 400);
            }
            await db.purchaseRequest.update({
                data: {
                    approvedAt: new Date(),
                    approvedByUserId: actorUserId,
                    notes: input.notes ?? existing.notes,
                    status: "APPROVED",
                },
                where: {
                    id: purchaseRequestId,
                },
            });
            const current = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            await auditLogService.create({
                action: "purchase_request.approved",
                actorUserId,
                after: await mapPurchaseRequestRecord(current, true, db),
                before: await mapPurchaseRequestRecord(existing, true, db),
                entityId: current.id,
                entityType: PURCHASE_REQUEST_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseRequestRecord(current, options?.canViewCost ?? true, db);
        });
    },
    async rejectPurchaseRequest(purchaseRequestId, userId, input, options) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            if (existing.status === "CONVERTED_TO_PO") {
                throw new AppError("Converted purchase requests cannot be rejected.", 400);
            }
            await db.purchaseRequest.update({
                data: {
                    approvedAt: null,
                    approvedByUserId: null,
                    notes: input.notes ?? existing.notes,
                    status: "REJECTED",
                },
                where: {
                    id: purchaseRequestId,
                },
            });
            const current = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            await auditLogService.create({
                action: "purchase_request.rejected",
                actorUserId,
                after: await mapPurchaseRequestRecord(current, true, db),
                before: await mapPurchaseRequestRecord(existing, true, db),
                entityId: current.id,
                entityType: PURCHASE_REQUEST_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseRequestRecord(current, options?.canViewCost ?? true, db);
        });
    },
    async calculatePurchaseRequestTotals(purchaseRequestId, options) {
        const purchaseRequest = await prisma.purchaseRequest.findUnique({
            select: {
                items: {
                    select: {
                        estimatedTotalCost: true,
                        selectedSupplierId: true,
                    },
                },
            },
            where: {
                id: purchaseRequestId,
            },
        });
        if (!purchaseRequest) {
            throw new AppError("Purchase request not found.", 404);
        }
        return computePurchaseRequestTotals(purchaseRequest.items, options.canViewCost);
    },
    async listSupplierComparisons(query) {
        const where = buildSupplierComparisonWhereClause(query);
        const [total, records] = await prisma.$transaction([
            prisma.supplierComparison.count({
                where,
            }),
            prisma.supplierComparison.findMany({
                include: supplierComparisonListInclude,
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
            data: records.map(mapSupplierComparisonListItem),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getSupplierComparisonById(comparisonId, options) {
        const comparison = await findSupplierComparisonOrThrow(prisma, comparisonId);
        return mapSupplierComparisonRecord(comparison, options.canViewCost, prisma);
    },
    async compareSuppliersForPurchaseRequest(purchaseRequestId, input, userId, options) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            const purchaseRequest = await findPurchaseRequestOrThrow(db, purchaseRequestId);
            const settings = await getPurchasingSettings(db);
            if (purchaseRequest.items.length === 0) {
                throw new AppError("Purchase request must contain at least one item before supplier comparison.", 400);
            }
            if (settings.requireApprovalBeforePo &&
                purchaseRequest.status !== "APPROVED") {
                throw new AppError("This purchase request must be approved before suppliers can be compared.", 400);
            }
            const scoringConfig = await resolveComparisonConfig(db, input.scoringConfigId);
            const materialIds = Array.from(new Set(purchaseRequest.items.map((item) => item.materialId)));
            const materials = await db.material.findMany({
                select: materialForPurchaseSelect,
                where: {
                    id: {
                        in: materialIds,
                    },
                },
            });
            const materialById = new Map(materials.map((material) => [material.id, material]));
            const priceRows = await db.supplierMaterialPrice.findMany({
                orderBy: [
                    {
                        effectiveFrom: "desc",
                    },
                    {
                        updatedAt: "desc",
                    },
                ],
                select: {
                    materialId: true,
                    normalizedUnit: true,
                    price: true,
                    supplierId: true,
                    supplierUnit: true,
                },
                where: {
                    isCurrent: true,
                    materialId: {
                        in: materialIds,
                    },
                    supplier: {
                        deletedAt: null,
                        status: "ACTIVE",
                    },
                },
            });
            const equivalenceRows = await db.supplierMaterialEquivalence.findMany({
                select: {
                    materialId: true,
                    supplier: {
                        select: {
                            code: true,
                            commercialName: true,
                            creditAvailable: true,
                            creditLimit: true,
                            defaultLeadTimeDays: true,
                            id: true,
                            legalName: true,
                            preferenceScore: true,
                            reliabilityScore: true,
                        },
                    },
                    supplierId: true,
                },
                where: {
                    materialId: {
                        in: materialIds,
                    },
                    status: "ACTIVE",
                    supplier: {
                        deletedAt: null,
                        status: "ACTIVE",
                    },
                },
            });
            const directSuppliers = await db.supplier.findMany({
                select: {
                    code: true,
                    commercialName: true,
                    creditAvailable: true,
                    creditLimit: true,
                    defaultLeadTimeDays: true,
                    id: true,
                    legalName: true,
                    preferenceScore: true,
                    reliabilityScore: true,
                },
                where: {
                    deletedAt: null,
                    id: {
                        in: Array.from(new Set(priceRows.map((row) => row.supplierId))),
                    },
                    status: "ACTIVE",
                },
            });
            const supplierById = new Map(directSuppliers.map((supplier) => [supplier.id, supplier]));
            equivalenceRows.forEach((row) => {
                supplierById.set(row.supplier.id, row.supplier);
            });
            const latestPriceByKey = new Map();
            priceRows.forEach((row) => {
                const key = `${row.materialId}:${row.supplierId}`;
                if (!latestPriceByKey.has(key)) {
                    latestPriceByKey.set(key, {
                        normalizedUnit: row.normalizedUnit,
                        price: Number(row.price),
                        supplierId: row.supplierId,
                        supplierUnit: row.supplierUnit,
                    });
                }
            });
            const candidatesByMaterialId = new Map();
            materialIds.forEach((materialId) => {
                const supplierIds = new Set();
                priceRows
                    .filter((row) => row.materialId === materialId)
                    .forEach((row) => supplierIds.add(row.supplierId));
                equivalenceRows
                    .filter((row) => row.materialId === materialId)
                    .forEach((row) => supplierIds.add(row.supplierId));
                const candidates = Array.from(supplierIds)
                    .map((supplierId) => {
                    const supplier = supplierById.get(supplierId);
                    if (!supplier) {
                        return null;
                    }
                    const priceCandidate = latestPriceByKey.get(`${materialId}:${supplierId}`) ?? null;
                    const hasEquivalence = equivalenceRows.some((row) => row.materialId === materialId && row.supplierId === supplierId);
                    return {
                        availableCredit: supplier.creditAvailable,
                        creditLimit: decimalToNumber(supplier.creditLimit),
                        deliveryDays: supplier.defaultLeadTimeDays,
                        hasEquivalence,
                        materialId,
                        normalizedUnit: priceCandidate?.normalizedUnit ?? null,
                        price: priceCandidate?.price ?? null,
                        preferred: false,
                        preferenceScore: decimalToNumber(supplier.preferenceScore),
                        reliabilityScore: decimalToNumber(supplier.reliabilityScore),
                        supplierCode: supplier.code,
                        supplierCommercialName: supplier.commercialName,
                        supplierId: supplier.id,
                        supplierLegalName: supplier.legalName,
                        supplierUnit: priceCandidate?.supplierUnit ?? null,
                    };
                })
                    .filter((candidate) => Boolean(candidate));
                candidatesByMaterialId.set(materialId, candidates);
            });
            const comparison = await db.supplierComparison.create({
                data: {
                    createdByUserId: actorUserId,
                    purchaseRequestId,
                    scoringConfigId: scoringConfig.id,
                    status: "COMPLETED",
                },
                include: supplierComparisonDetailInclude,
            });
            await db.supplierComparisonOption.deleteMany({
                where: {
                    comparisonId: comparison.id,
                },
            });
            const warnings = [];
            const createdOptions = [];
            const bestPriceSelections = {};
            const bestScoreSelections = {};
            const optionIdsByItemAndSupplier = new Map();
            const optionTotalsBySupplier = new Map();
            const optionScoresBySupplier = new Map();
            const selectionByItem = new Map();
            for (const requestItem of purchaseRequest.items) {
                const material = materialById.get(requestItem.materialId);
                if (!material) {
                    throw new AppError("Material not found for purchase request item.", 404);
                }
                const baseCandidates = candidatesByMaterialId.get(requestItem.materialId) ?? [];
                if (baseCandidates.length === 0) {
                    warnings.push(`No supplier candidates were found for material ${requestItem.material.name}.`);
                    continue;
                }
                const pricingOptions = baseCandidates.map((candidate) => {
                    const pricing = calculateItemPricing({
                        metadataJson: requestItem.metadataJson,
                        quantity: requestItem.quantity,
                        unit: requestItem.unit,
                    }, material, candidate.price === null
                        ? null
                        : {
                            normalizedUnit: candidate.normalizedUnit,
                            price: candidate.price,
                            supplierId: candidate.supplierId,
                            supplierUnit: candidate.supplierUnit,
                        });
                    return {
                        ...candidate,
                        preferred: candidate.supplierId === requestItem.preferredSupplierId,
                        totalPrice: pricing.totalPrice,
                        unitPrice: pricing.unitPrice,
                    };
                });
                const priceValues = pricingOptions
                    .map((option) => option.totalPrice)
                    .filter((value) => value !== null);
                const deliveryValues = pricingOptions
                    .map((option) => option.deliveryDays)
                    .filter((value) => value !== null);
                const creditValues = pricingOptions
                    .map((option) => option.creditLimit)
                    .filter((value) => value !== null && value > 0);
                const scoredOptions = pricingOptions.map((option) => {
                    const breakdown = scoringConfig.weights.map((weight) => {
                        let normalizedScore = 0;
                        switch (weight.criterionKey) {
                            case "price":
                                normalizedScore = roundTo(normalizeLowerIsBetter(option.totalPrice, priceValues), 2);
                                break;
                            case "delivery_time":
                                normalizedScore = roundTo(normalizeLowerIsBetter(option.deliveryDays, deliveryValues), 2);
                                break;
                            case "reliability":
                                normalizedScore = roundTo(Math.max(0, Math.min(100, option.reliabilityScore ?? 0)), 2);
                                break;
                            case "credit": {
                                const creditLimitScore = normalizeHigherIsBetter(option.creditLimit, creditValues);
                                normalizedScore = roundTo(Math.max(0, Math.min(100, (option.availableCredit ? 60 : 0) + creditLimitScore * 0.4)), 2);
                                break;
                            }
                            case "preference":
                                normalizedScore = roundTo(Math.max(0, Math.min(100, (option.preferenceScore ?? 0) + (option.preferred ? 10 : 0))), 2);
                                break;
                            case "availability":
                                normalizedScore = option.totalPrice !== null ? 100 : option.hasEquivalence ? 70 : 0;
                                break;
                        }
                        return {
                            contribution: roundTo((normalizedScore * weight.weight) / 100, 2),
                            criterionId: weight.criterionId,
                            criterionKey: weight.criterionKey,
                            criterionLabel: weight.criterionLabel,
                            normalizedScore,
                            weight: weight.weight,
                        };
                    });
                    const finalScore = roundTo(breakdown.reduce((sum, entry) => sum + entry.contribution, 0), 2);
                    const supplierScore = roundTo([
                        option.reliabilityScore ?? 0,
                        option.preferenceScore ?? 0,
                        option.availableCredit ? 100 : 0,
                        option.hasEquivalence ? 100 : 0,
                    ].reduce((sum, value) => sum + value, 0) / 4, 2);
                    return {
                        ...option,
                        breakdown,
                        finalScore,
                        supplierScore,
                    };
                });
                const bestPriceOption = scoredOptions
                    .filter((option) => option.totalPrice !== null)
                    .sort((left, right) => {
                    if ((left.totalPrice ?? 0) !== (right.totalPrice ?? 0)) {
                        return (left.totalPrice ?? 0) - (right.totalPrice ?? 0);
                    }
                    return right.finalScore - left.finalScore;
                })[0];
                const bestScoreOption = scoredOptions.sort((left, right) => {
                    if (right.finalScore !== left.finalScore) {
                        return right.finalScore - left.finalScore;
                    }
                    return (left.totalPrice ?? Number.MAX_SAFE_INTEGER) -
                        (right.totalPrice ?? Number.MAX_SAFE_INTEGER);
                })[0];
                bestPriceSelections[requestItem.id] = bestPriceOption?.supplierId ?? null;
                bestScoreSelections[requestItem.id] = bestScoreOption?.supplierId ?? null;
                for (const option of scoredOptions) {
                    const optionRecord = await db.supplierComparisonOption.create({
                        data: {
                            availableCredit: option.availableCredit,
                            comparisonId: comparison.id,
                            deliveryDays: option.deliveryDays,
                            finalScore: option.finalScore,
                            isSelected: false,
                            materialId: requestItem.materialId,
                            purchaseRequestItemId: requestItem.id,
                            scoreBreakdownJson: toInputJsonValue(option.breakdown),
                            supplierId: option.supplierId,
                            supplierScore: option.supplierScore,
                            totalPrice: option.totalPrice,
                            unitPrice: option.unitPrice,
                        },
                        select: {
                            id: true,
                        },
                    });
                    createdOptions.push({
                        isSelected: false,
                        materialId: requestItem.materialId,
                        purchaseRequestItemId: requestItem.id,
                        supplierId: option.supplierId,
                        totalPrice: option.totalPrice,
                    });
                    optionIdsByItemAndSupplier.set(`${requestItem.id}:${option.supplierId}`, optionRecord.id);
                    optionTotalsBySupplier.set(option.supplierId, roundTo((optionTotalsBySupplier.get(option.supplierId) ?? 0) +
                        (option.totalPrice ?? 0)));
                    optionScoresBySupplier.set(option.supplierId, [
                        ...(optionScoresBySupplier.get(option.supplierId) ?? []),
                        option.finalScore,
                    ]);
                }
            }
            const candidateSuppliers = Array.from(optionScoresBySupplier.keys());
            const singleSupplierCandidates = candidateSuppliers
                .map((supplierId) => {
                const coversAllItems = purchaseRequest.items.every((item) => optionIdsByItemAndSupplier.has(`${item.id}:${supplierId}`));
                if (!coversAllItems) {
                    return null;
                }
                const scores = optionScoresBySupplier.get(supplierId) ?? [];
                return {
                    averageScore: scores.length > 0
                        ? roundTo(scores.reduce((sum, score) => sum + score, 0) / scores.length, 2)
                        : 0,
                    supplierId,
                    totalPrice: optionTotalsBySupplier.get(supplierId) ?? 0,
                };
            })
                .filter((candidate) => Boolean(candidate))
                .sort((left, right) => {
                if (right.averageScore !== left.averageScore) {
                    return right.averageScore - left.averageScore;
                }
                return left.totalPrice - right.totalPrice;
            });
            const selectedStrategy = settings.preferSingleSupplier && singleSupplierCandidates.length > 0
                ? "single_supplier"
                : "best_weighted_score_per_item";
            if (selectedStrategy === "single_supplier") {
                const selectedSupplierId = singleSupplierCandidates[0]?.supplierId ?? null;
                purchaseRequest.items.forEach((item) => {
                    selectionByItem.set(item.id, selectedSupplierId);
                });
            }
            else {
                Object.entries(bestScoreSelections).forEach(([itemId, supplierId]) => {
                    selectionByItem.set(itemId, supplierId);
                });
            }
            for (const [itemId, supplierId] of selectionByItem.entries()) {
                if (!supplierId) {
                    continue;
                }
                const optionId = optionIdsByItemAndSupplier.get(`${itemId}:${supplierId}`);
                if (!optionId) {
                    continue;
                }
                await db.supplierComparisonOption.update({
                    data: {
                        isSelected: true,
                    },
                    where: {
                        id: optionId,
                    },
                });
                await db.purchaseRequestItem.update({
                    data: {
                        selectedSupplierId: supplierId,
                        status: "SUPPLIER_SELECTED",
                    },
                    where: {
                        id: itemId,
                    },
                });
            }
            const refreshedComparison = await findSupplierComparisonOrThrow(db, comparison.id);
            const selectedOptions = refreshedComparison.options.filter((option) => option.isSelected);
            const resultJson = {
                bestPricePerItem: bestPriceSelections,
                bestWeightedScorePerItem: bestScoreSelections,
                selectedStrategy,
                singleSupplierOptions: singleSupplierCandidates,
                warnings,
            };
            const selectedCombinationJson = {
                selectedOptionIds: selectedOptions.map((option) => option.id),
                selectedStrategy,
                supplierIds: Array.from(new Set(selectedOptions.map((option) => option.supplierId))),
            };
            await db.supplierComparison.update({
                data: {
                    resultJson: toInputJsonValue(resultJson),
                    selectedCombinationJson: toInputJsonValue(selectedCombinationJson),
                },
                where: {
                    id: comparison.id,
                },
            });
            const current = await findSupplierComparisonOrThrow(db, comparison.id);
            await auditLogService.create({
                action: "supplier_comparison.generated",
                actorUserId,
                after: await mapSupplierComparisonRecord(current, true, db),
                before: null,
                entityId: current.id,
                entityType: SUPPLIER_COMPARISON_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapSupplierComparisonRecord(current, options?.canViewCost ?? true, db);
        });
    },
    async approveSupplierComparison(comparisonId, userId, options) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            const existing = await findSupplierComparisonOrThrow(db, comparisonId);
            if (existing.options.length === 0) {
                throw new AppError("Supplier comparison must contain options before approval.", 400);
            }
            await db.supplierComparison.update({
                data: {
                    approvedAt: new Date(),
                    approvedByUserId: actorUserId,
                    status: "APPROVED",
                },
                where: {
                    id: comparisonId,
                },
            });
            const current = await findSupplierComparisonOrThrow(db, comparisonId);
            await auditLogService.create({
                action: "supplier_comparison.approved",
                actorUserId,
                after: await mapSupplierComparisonRecord(current, true, db),
                before: await mapSupplierComparisonRecord(existing, true, db),
                entityId: current.id,
                entityType: SUPPLIER_COMPARISON_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapSupplierComparisonRecord(current, options?.canViewCost ?? true, db);
        });
    },
    async createPurchaseOrdersFromComparison(comparisonId, userId, options) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            const comparison = await findSupplierComparisonOrThrow(db, comparisonId);
            const settings = await getPurchasingSettings(db);
            if (comparison.status !== "APPROVED") {
                throw new AppError("Supplier comparison must be approved before purchase orders can be created.", 400);
            }
            if (settings.requireApprovalBeforePo &&
                comparison.purchaseRequest.status !== "APPROVED") {
                throw new AppError("The purchase request must be approved before purchase orders can be created.", 400);
            }
            if (comparison.purchaseRequest.status === "CONVERTED_TO_PO") {
                throw new AppError("Purchase orders have already been created for this purchase request.", 400);
            }
            const selectedOptions = comparison.options.filter((option) => option.isSelected);
            const actionableItems = comparison.purchaseRequest.items.filter((item) => item.status !== "CANCELLED");
            if (actionableItems.some((item) => !selectedOptions.some((option) => option.purchaseRequestItemId === item.id))) {
                throw new AppError("Cannot create purchase orders until every purchase request item has a selected supplier.", 400);
            }
            const groupedBySupplier = new Map();
            selectedOptions.forEach((option) => {
                const current = groupedBySupplier.get(option.supplierId) ?? [];
                current.push(option);
                groupedBySupplier.set(option.supplierId, current);
            });
            const createdOrders = [];
            for (const [supplierId, supplierOptions] of groupedBySupplier.entries()) {
                if (supplierOptions.some((option) => option.unitPrice === null || option.totalPrice === null)) {
                    throw new AppError("Selected supplier options must include pricing before purchase orders can be created.", 400);
                }
                const code = await generatePurchaseOrderCode(db);
                const expectedDeliveryDays = Math.max(...supplierOptions.map((option) => option.deliveryDays ?? 0));
                const orderDate = new Date();
                const expectedDeliveryDate = expectedDeliveryDays > 0
                    ? new Date(orderDate.getTime() + expectedDeliveryDays * 24 * 60 * 60 * 1000)
                    : null;
                const totals = calculateOrderTotalsFromInputs(supplierOptions.map((option) => ({
                    quantity: Number(comparison.purchaseRequest.items.find((item) => item.id === option.purchaseRequestItemId)
                        ?.quantity ?? 0),
                    unitPrice: Number(option.unitPrice ?? 0),
                })), 0, 0);
                const createdOrder = await db.purchaseOrder.create({
                    data: {
                        code,
                        createdByUserId: actorUserId,
                        currency: "BOB",
                        expectedDeliveryDate,
                        orderDate,
                        purchaseRequestId: comparison.purchaseRequestId,
                        status: "DRAFT",
                        subtotal: totals.subtotal,
                        supplierId,
                        total: totals.total,
                        items: {
                            create: supplierOptions.map((option) => {
                                const requestItem = comparison.purchaseRequest.items.find((item) => item.id === option.purchaseRequestItemId);
                                if (!requestItem) {
                                    throw new AppError("Purchase request item not found.", 404);
                                }
                                return {
                                    description: requestItem.description,
                                    material: {
                                        connect: {
                                            id: option.materialId,
                                        },
                                    },
                                    metadataJson: toInputJsonValue({
                                        comparisonId,
                                        purchaseRequestItemId: requestItem.id,
                                    }),
                                    quantity: requestItem.quantity,
                                    totalPrice: Number(option.totalPrice ?? 0),
                                    unit: requestItem.unit,
                                    unitPrice: Number(option.unitPrice ?? 0),
                                };
                            }),
                        },
                    },
                    include: purchaseOrderDetailInclude,
                });
                createdOrders.push(mapPurchaseOrderRecord(createdOrder, options?.canViewCost ?? true));
                await auditLogService.create({
                    action: "purchase_order.created",
                    actorUserId,
                    after: mapPurchaseOrderRecord(createdOrder, true),
                    before: null,
                    entityId: createdOrder.id,
                    entityType: PURCHASE_ORDER_ENTITY_TYPE,
                }, {
                    db: {
                        auditLog: db.auditLog,
                    },
                });
            }
            await db.purchaseRequest.update({
                data: {
                    status: "CONVERTED_TO_PO",
                },
                where: {
                    id: comparison.purchaseRequestId,
                },
            });
            await db.purchaseRequestItem.updateMany({
                data: {
                    status: "ORDERED",
                },
                where: {
                    purchaseRequestId: comparison.purchaseRequestId,
                },
            });
            return createdOrders;
        });
    },
    async listPurchaseOrders(query, options) {
        const where = buildPurchaseOrderWhereClause(query);
        const [total, records] = await prisma.$transaction([
            prisma.purchaseOrder.count({
                where,
            }),
            prisma.purchaseOrder.findMany({
                include: purchaseOrderListInclude,
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
            data: records.map((record) => mapPurchaseOrderListItem(record, options.canViewCost)),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getPurchaseOrderById(purchaseOrderId, options) {
        const order = await findPurchaseOrderOrThrow(prisma, purchaseOrderId);
        return mapPurchaseOrderRecord(order, options.canViewCost);
    },
    async createPurchaseOrderManually(input, userId, options) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            await ensureSupplierExists(db, input.supplierId);
            if (input.purchaseRequestId) {
                const request = await findPurchaseRequestOrThrow(db, input.purchaseRequestId);
                const settings = await getPurchasingSettings(db);
                if (settings.requireApprovalBeforePo && request.status !== "APPROVED") {
                    throw new AppError("The linked purchase request must be approved before creating a purchase order.", 400);
                }
            }
            const totals = calculateOrderTotalsFromInputs(input.items.map((item) => ({
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })), input.discountAmount, input.taxAmount);
            const code = await generatePurchaseOrderCode(db);
            const created = await db.purchaseOrder.create({
                data: {
                    code,
                    createdByUserId: actorUserId,
                    currency: input.currency,
                    discountAmount: input.discountAmount,
                    expectedDeliveryDate: input.expectedDeliveryDate,
                    notes: input.notes,
                    orderDate: input.orderDate ?? new Date(),
                    purchaseRequestId: input.purchaseRequestId ?? null,
                    subtotal: totals.subtotal,
                    supplierId: input.supplierId,
                    taxAmount: input.taxAmount,
                    total: totals.total,
                    items: {
                        create: input.items.map((item) => ({
                            description: item.description,
                            material: {
                                connect: {
                                    id: item.materialId,
                                },
                            },
                            metadataJson: toInputJsonValue(item.metadataJson ?? null),
                            quantity: item.quantity,
                            totalPrice: roundTo(item.quantity * item.unitPrice),
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                        })),
                    },
                },
                include: purchaseOrderDetailInclude,
            });
            if (input.purchaseRequestId) {
                await db.purchaseRequest.update({
                    data: {
                        status: "CONVERTED_TO_PO",
                    },
                    where: {
                        id: input.purchaseRequestId,
                    },
                });
            }
            await auditLogService.create({
                action: "purchase_order.created",
                actorUserId,
                after: mapPurchaseOrderRecord(created, true),
                before: null,
                entityId: created.id,
                entityType: PURCHASE_ORDER_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseOrderRecord(created, options?.canViewCost ?? true);
        });
    },
    async updatePurchaseOrder(purchaseOrderId, input, userId, options) {
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            if (existing.status === "CANCELLED") {
                throw new AppError("Cancelled purchase orders cannot be edited.", 400);
            }
            const hasReceipts = existing.receipts.length > 0;
            if (["PARTIALLY_RECEIVED", "RECEIVED"].includes(existing.status) &&
                Object.keys(input).some((key) => key !== "notes")) {
                throw new AppError("Received purchase orders can only update notes.", 400);
            }
            if (hasReceipts && input.items) {
                throw new AppError("Purchase order items cannot be replaced after receipts have been recorded.", 400);
            }
            let subtotal = Number(existing.subtotal);
            let total = Number(existing.total);
            const discountAmount = input.discountAmount === undefined
                ? Number(existing.discountAmount)
                : input.discountAmount ?? 0;
            const taxAmount = input.taxAmount === undefined
                ? Number(existing.taxAmount)
                : input.taxAmount ?? 0;
            if (input.items) {
                const recalculated = calculateOrderTotalsFromInputs(input.items.map((item) => ({
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })), discountAmount, taxAmount);
                subtotal = recalculated.subtotal;
                total = recalculated.total;
                await db.purchaseOrderItem.deleteMany({
                    where: {
                        purchaseOrderId,
                    },
                });
                for (const item of input.items) {
                    await db.purchaseOrderItem.create({
                        data: {
                            description: item.description,
                            materialId: item.materialId,
                            metadataJson: toInputJsonValue(item.metadataJson ?? null),
                            purchaseOrderId,
                            quantity: item.quantity,
                            totalPrice: roundTo(item.quantity * item.unitPrice),
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                        },
                    });
                }
            }
            await db.purchaseOrder.update({
                data: {
                    currency: input.currency ?? existing.currency,
                    discountAmount,
                    expectedDeliveryDate: input.expectedDeliveryDate === undefined
                        ? existing.expectedDeliveryDate
                        : input.expectedDeliveryDate,
                    notes: input.notes ?? existing.notes,
                    orderDate: input.orderDate ?? existing.orderDate,
                    subtotal,
                    taxAmount,
                    total,
                },
                where: {
                    id: purchaseOrderId,
                },
            });
            const current = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            await auditLogService.create({
                action: "purchase_order.updated",
                actorUserId: userId,
                after: mapPurchaseOrderRecord(current, true),
                before: mapPurchaseOrderRecord(existing, true),
                entityId: current.id,
                entityType: PURCHASE_ORDER_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseOrderRecord(current, options?.canViewCost ?? true);
        });
    },
    async deletePurchaseOrder(purchaseOrderId, userId) {
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            if (existing.receipts.length > 0) {
                throw new AppError("Purchase orders with receipts cannot be deleted.", 400);
            }
            if (!["DRAFT", "CANCELLED"].includes(existing.status)) {
                throw new AppError("Only draft or cancelled purchase orders can be deleted.", 400);
            }
            await db.purchaseOrder.update({
                data: {
                    deletedAt: new Date(),
                },
                where: {
                    id: purchaseOrderId,
                },
            });
            await auditLogService.create({
                action: "purchase_order.deleted",
                actorUserId: userId,
                after: null,
                before: mapPurchaseOrderRecord(existing, true),
                entityId: existing.id,
                entityType: PURCHASE_ORDER_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return {
                deleted: true,
                id: existing.id,
            };
        });
    },
    async sendPurchaseOrder(purchaseOrderId, userId, notes, options) {
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            if (existing.status !== "DRAFT") {
                throw new AppError("Only draft purchase orders can be sent.", 400);
            }
            await db.purchaseOrder.update({
                data: {
                    notes: notes ?? existing.notes,
                    sentAt: new Date(),
                    status: "SENT",
                },
                where: {
                    id: purchaseOrderId,
                },
            });
            const current = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            await auditLogService.create({
                action: "purchase_order.sent",
                actorUserId: userId,
                after: mapPurchaseOrderRecord(current, true),
                before: mapPurchaseOrderRecord(existing, true),
                entityId: current.id,
                entityType: PURCHASE_ORDER_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseOrderRecord(current, options?.canViewCost ?? true);
        });
    },
    async confirmPurchaseOrder(purchaseOrderId, userId, notes, options) {
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            if (["CANCELLED", "RECEIVED"].includes(existing.status)) {
                throw new AppError("This purchase order can no longer be confirmed.", 400);
            }
            await db.purchaseOrder.update({
                data: {
                    confirmedAt: new Date(),
                    notes: notes ?? existing.notes,
                    status: "CONFIRMED",
                },
                where: {
                    id: purchaseOrderId,
                },
            });
            const current = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            await auditLogService.create({
                action: "purchase_order.confirmed",
                actorUserId: userId,
                after: mapPurchaseOrderRecord(current, true),
                before: mapPurchaseOrderRecord(existing, true),
                entityId: current.id,
                entityType: PURCHASE_ORDER_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseOrderRecord(current, options?.canViewCost ?? true);
        });
    },
    async cancelPurchaseOrder(purchaseOrderId, userId, notes, options) {
        return prisma.$transaction(async (db) => {
            const existing = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            if (existing.status === "RECEIVED") {
                throw new AppError("Fully received purchase orders cannot be cancelled.", 400);
            }
            if (existing.status === "CANCELLED") {
                throw new AppError("Purchase order is already cancelled.", 400);
            }
            await db.purchaseOrder.update({
                data: {
                    notes: notes ?? existing.notes,
                    status: "CANCELLED",
                },
                where: {
                    id: purchaseOrderId,
                },
            });
            const current = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            await auditLogService.create({
                action: "purchase_order.cancelled",
                actorUserId: userId,
                after: mapPurchaseOrderRecord(current, true),
                before: mapPurchaseOrderRecord(existing, true),
                entityId: current.id,
                entityType: PURCHASE_ORDER_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return mapPurchaseOrderRecord(current, options?.canViewCost ?? true);
        });
    },
    async receivePurchaseOrder(purchaseOrderId, input, userId) {
        const actorUserId = ensureAuthenticatedUser(userId);
        return prisma.$transaction(async (db) => {
            const existingOrder = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            if (existingOrder.status === "CANCELLED") {
                throw new AppError("Cancelled purchase orders cannot be received.", 400);
            }
            await ensureWarehouseExists(db, input.warehouseId);
            const receiptCode = await generatePurchaseReceiptCode(db);
            const receipt = await db.purchaseReceipt.create({
                data: {
                    code: receiptCode,
                    notes: input.notes,
                    purchaseOrderId,
                    receivedAt: input.receivedAt ?? new Date(),
                    receivedByUserId: actorUserId,
                    warehouseId: input.warehouseId,
                },
                include: purchaseReceiptDetailInclude,
            });
            const orderItemsById = new Map(existingOrder.items.map((item) => [item.id, item]));
            for (const line of input.items) {
                const orderItem = orderItemsById.get(line.purchaseOrderItemId);
                if (!orderItem) {
                    throw new AppError("Purchase order item not found for receipt.", 404);
                }
                const remainingQuantity = Number(orderItem.quantity) - Number(orderItem.receivedQuantity);
                if (line.receivedQuantity > remainingQuantity) {
                    throw new AppError("Cannot receive more quantity than remains on the purchase order item.", 400);
                }
                const material = await getMaterialForPurchaseOrThrow(db, orderItem.materialId);
                const dimensions = resolveReceiptDimensions(material, line);
                const receiptItem = await db.purchaseReceiptItem.create({
                    data: {
                        batchNumber: line.batchNumber,
                        locationCode: line.locationCode,
                        materialId: orderItem.materialId,
                        notes: line.notes,
                        purchaseOrderItemId: orderItem.id,
                        purchaseReceiptId: receipt.id,
                        receivedQuantity: line.receivedQuantity,
                        unit: orderItem.unit,
                    },
                });
                const stockQuantity = convertReceiptQuantityToStockUnit(material, line.receivedQuantity, orderItem.unit);
                await createInventoryStockFromReceipt(db, {
                    batchNumber: line.batchNumber,
                    heightMm: dimensions.heightMm,
                    lengthMm: dimensions.lengthMm,
                    locationCode: line.locationCode,
                    material,
                    notes: line.notes ??
                        `Received from purchase order ${existingOrder.code} via receipt ${receipt.code}.`,
                    quantity: stockQuantity,
                    sourceId: receiptItem.id,
                    thicknessMm: dimensions.thicknessMm,
                    userId: actorUserId,
                    warehouseId: input.warehouseId,
                    widthMm: dimensions.widthMm,
                });
                await db.purchaseOrderItem.update({
                    data: {
                        receivedQuantity: roundTo(Number(orderItem.receivedQuantity) + line.receivedQuantity),
                    },
                    where: {
                        id: orderItem.id,
                    },
                });
            }
            const refreshedOrder = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            const fullyReceived = refreshedOrder.items.every((item) => Number(item.receivedQuantity) >= Number(item.quantity));
            const partiallyReceived = refreshedOrder.items.some((item) => Number(item.receivedQuantity) > 0);
            await db.purchaseOrder.update({
                data: {
                    status: fullyReceived
                        ? "RECEIVED"
                        : partiallyReceived
                            ? "PARTIALLY_RECEIVED"
                            : refreshedOrder.status,
                },
                where: {
                    id: purchaseOrderId,
                },
            });
            const currentOrder = await findPurchaseOrderOrThrow(db, purchaseOrderId);
            const currentReceipt = await findPurchaseReceiptOrThrow(db, receipt.id);
            await auditLogService.create({
                action: "purchase_order.received",
                actorUserId,
                after: mapPurchaseOrderRecord(currentOrder, true),
                before: mapPurchaseOrderRecord(existingOrder, true),
                entityId: currentOrder.id,
                entityType: PURCHASE_ORDER_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            await auditLogService.create({
                action: "purchase_receipt.created",
                actorUserId,
                after: mapPurchaseReceiptRecord(currentReceipt),
                before: null,
                entityId: currentReceipt.id,
                entityType: PURCHASE_RECEIPT_ENTITY_TYPE,
            }, {
                db: {
                    auditLog: db.auditLog,
                },
            });
            return {
                purchaseOrder: mapPurchaseOrderRecord(currentOrder, true),
                receipt: mapPurchaseReceiptRecord(currentReceipt),
            };
        });
    },
    async listPurchaseReceipts(query) {
        const where = buildPurchaseReceiptWhereClause(query);
        const [total, records] = await prisma.$transaction([
            prisma.purchaseReceipt.count({
                where,
            }),
            prisma.purchaseReceipt.findMany({
                include: purchaseReceiptListInclude,
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
            data: records.map(mapPurchaseReceiptListItem),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getPurchaseReceiptById(purchaseReceiptId) {
        const receipt = await findPurchaseReceiptOrThrow(prisma, purchaseReceiptId);
        return mapPurchaseReceiptRecord(receipt);
    },
};
//# sourceMappingURL=purchasing.service.js.map