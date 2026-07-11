import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { buildDateRangeFilter, toLogJsonValue } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { getClientDisplayName } from "../clients/clients.service.js";
import { productTemplatesService } from "../product-templates/product-templates.service.js";
import { QUOTATION_EDITABLE_STATUSES, QUOTATION_LOCKED_STATUSES, } from "./quotations.constants.js";
const userSummarySelect = {
    email: true,
    id: true,
    name: true,
};
const clientSummarySelect = {
    clientType: true,
    commercialName: true,
    firstName: true,
    id: true,
    lastName: true,
    legalName: true,
};
const projectSummarySelect = {
    code: true,
    id: true,
    title: true,
};
const measurementRequestSummarySelect = {
    code: true,
    id: true,
    status: true,
};
const quotationListInclude = {
    approvedByUser: {
        select: userSummarySelect,
    },
    client: {
        select: clientSummarySelect,
    },
    createdByUser: {
        select: userSummarySelect,
    },
    measurementRequest: {
        select: measurementRequestSummarySelect,
    },
    project: {
        select: projectSummarySelect,
    },
};
const quotationApprovalInclude = {
    approverUser: {
        select: userSummarySelect,
    },
    decidedByUser: {
        select: userSummarySelect,
    },
    quotation: {
        include: {
            client: {
                select: clientSummarySelect,
            },
            project: {
                select: projectSummarySelect,
            },
        },
    },
    requestedByUser: {
        select: userSummarySelect,
    },
};
const quotationVersionListInclude = {
    _count: {
        select: {
            items: true,
        },
    },
    createdByUser: {
        select: userSummarySelect,
    },
};
const quotationDetailInclude = {
    ...quotationListInclude,
    approvals: {
        include: {
            approverUser: {
                select: userSummarySelect,
            },
            decidedByUser: {
                select: userSummarySelect,
            },
            quotation: {
                include: {
                    client: {
                        select: clientSummarySelect,
                    },
                    project: {
                        select: projectSummarySelect,
                    },
                },
            },
            requestedByUser: {
                select: userSummarySelect,
            },
        },
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
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
    statusHistory: {
        include: {
            changedByUser: {
                select: userSummarySelect,
            },
        },
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
    versions: {
        include: {
            _count: {
                select: {
                    items: true,
                },
            },
            createdByUser: {
                select: userSummarySelect,
            },
        },
        orderBy: [
            {
                versionNumber: "desc",
            },
        ],
    },
};
const MATERIAL_SUMMARY_SELECT = {
    code: true,
    consumptionUnit: true,
    defaultWastePercent: true,
    deletedAt: true,
    id: true,
    name: true,
    status: true,
};
const PRODUCT_TEMPLATE_VERSION_LOOKUP_INCLUDE = {
    template: {
        select: {
            code: true,
            deletedAt: true,
            id: true,
            name: true,
            status: true,
        },
    },
};
const QUOTATION_SETTINGS_DEFAULTS = {
    maximumDiscountPercent: 10,
    minimumMarginPercent: 15,
    requireApprovalForManualOverride: true,
};
const roundTo = (value, precision = 4) => {
    const factor = 10 ** precision;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
const toIsoString = (value) => {
    return value?.toISOString() ?? null;
};
const toInputJsonValue = (value) => {
    const serialized = toLogJsonValue(value);
    return (serialized ?? {});
};
const isPlainObject = (value) => {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};
const asObject = (value) => {
    return isPlainObject(value) ? value : null;
};
const asJsonLikeRecord = (value) => {
    return value;
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
const mapClientSummary = (client) => {
    return {
        clientType: client.clientType,
        displayName: getClientDisplayName(client),
        id: client.id,
    };
};
const mapProjectSummary = (project) => {
    if (!project) {
        return null;
    }
    return {
        code: project.code,
        id: project.id,
        title: project.title,
    };
};
const mapMeasurementRequestSummary = (measurementRequest) => {
    if (!measurementRequest) {
        return null;
    }
    return {
        code: measurementRequest.code,
        id: measurementRequest.id,
        status: measurementRequest.status,
    };
};
const hideCostValue = (value, canViewCost) => {
    return canViewCost ? value : null;
};
const computeMarginPercent = (subtotalCost, subtotalSale) => {
    if (subtotalSale <= 0) {
        return 0;
    }
    return roundTo(((subtotalSale - subtotalCost) / subtotalSale) * 100, 4);
};
const computeSaleFromMargin = (subtotalCost, marginPercent) => {
    if (subtotalCost <= 0) {
        return 0;
    }
    return roundTo(subtotalCost / (1 - marginPercent / 100), 4);
};
const computeDiscountPercent = (subtotalSale, discountAmount) => {
    if (subtotalSale <= 0) {
        return discountAmount > 0 ? 100 : 0;
    }
    return roundTo((discountAmount / subtotalSale) * 100, 4);
};
const hasManualOverride = (calculationResultJson) => {
    return extractTemplateManualOverride(calculationResultJson) !== null;
};
const extractTemplateManualOverride = (calculationResultJson) => {
    const container = asObject(calculationResultJson);
    if (!container) {
        return null;
    }
    const overrideRecord = asObject(container.manualOverride);
    if (!overrideRecord) {
        return null;
    }
    return {
        marginPercent: typeof overrideRecord.marginPercent === "number"
            ? overrideRecord.marginPercent
            : null,
        reason: typeof overrideRecord.reason === "string"
            ? overrideRecord.reason
            : null,
        subtotalCost: typeof overrideRecord.subtotalCost === "number"
            ? overrideRecord.subtotalCost
            : null,
        subtotalSale: typeof overrideRecord.subtotalSale === "number"
            ? overrideRecord.subtotalSale
            : null,
        updatedAt: typeof overrideRecord.updatedAt === "string"
            ? overrideRecord.updatedAt
            : new Date().toISOString(),
    };
};
const buildTemplateCalculationResultJson = (input) => {
    return {
        kind: "template_simulation",
        manualOverride: input.manualOverride,
        requestedQuantity: input.requestedQuantity,
        result: input.result,
        simulationId: input.simulationId,
    };
};
const applyTemplateManualOverride = (input) => {
    if (!input.manualOverride) {
        return {
            costAdjustment: 0,
            marginPercent: computeMarginPercent(input.baseSubtotalCost, input.baseSubtotalSale),
            subtotalCost: input.baseSubtotalCost,
            subtotalSale: input.baseSubtotalSale,
        };
    }
    const subtotalCost = input.manualOverride.subtotalCost ?? input.baseSubtotalCost;
    let subtotalSale = input.baseSubtotalSale;
    if (input.manualOverride.subtotalSale !== null) {
        subtotalSale = input.manualOverride.subtotalSale;
    }
    else if (input.manualOverride.marginPercent !== null) {
        subtotalSale = computeSaleFromMargin(subtotalCost, input.manualOverride.marginPercent);
    }
    return {
        costAdjustment: roundTo(subtotalCost - input.baseSubtotalCost, 4),
        marginPercent: computeMarginPercent(subtotalCost, subtotalSale),
        subtotalCost,
        subtotalSale,
    };
};
const mapQuotationItemMaterial = (record, canViewCost) => {
    const totalCost = roundTo(Number(record.totalCost), 4);
    const unitCost = decimalToNumber(record.unitCost);
    return {
        createdAt: record.createdAt.toISOString(),
        id: record.id,
        materialCode: record.materialCode,
        materialId: record.materialId,
        materialName: record.materialName,
        metadataJson: record.metadataJson,
        requiredQuantity: roundTo(Number(record.requiredQuantity), 4),
        ruleType: record.ruleType,
        source: record.source,
        supplierId: record.supplierId,
        totalCost: hideCostValue(totalCost, canViewCost),
        unit: record.unit,
        unitCost: canViewCost ? unitCost : null,
        updatedAt: record.updatedAt.toISOString(),
        wastePercent: decimalToNumber(record.wastePercent),
    };
};
const mapQuotationItem = (record, canViewCost) => {
    const subtotalCost = roundTo(Number(record.subtotalCost), 4);
    const subtotalSale = roundTo(Number(record.subtotalSale), 4);
    return {
        calculationResultJson: record.calculationResultJson,
        createdAt: record.createdAt.toISOString(),
        description: record.description,
        hasManualOverride: hasManualOverride(record.calculationResultJson),
        id: record.id,
        inputValuesJson: record.inputValuesJson,
        itemType: record.itemType,
        marginPercent: canViewCost ? decimalToNumber(record.marginPercent) : null,
        materials: record.materials.map((material) => mapQuotationItemMaterial(material, canViewCost)),
        name: record.name,
        productTemplateId: record.productTemplateId,
        productTemplateVersionId: record.productTemplateVersionId,
        quantity: roundTo(Number(record.quantity), 4),
        quotationId: record.quotationId,
        quotationVersionId: record.quotationVersionId,
        sortOrder: record.sortOrder,
        subtotalCost: hideCostValue(subtotalCost, canViewCost),
        subtotalSale,
        updatedAt: record.updatedAt.toISOString(),
    };
};
const sanitizeSnapshotJson = (snapshotJson, canViewCost) => {
    if (canViewCost) {
        return snapshotJson;
    }
    const snapshot = asObject(snapshotJson);
    if (!snapshot) {
        return snapshotJson;
    }
    const quotation = asObject(snapshot.quotation);
    const items = Array.isArray(snapshot.items) ? snapshot.items : [];
    return {
        ...snapshot,
        items: items.map((item) => {
            const itemRecord = asObject(item);
            const materials = Array.isArray(itemRecord?.materials)
                ? itemRecord.materials
                : [];
            if (!itemRecord) {
                return item;
            }
            return {
                ...itemRecord,
                marginPercent: null,
                subtotalCost: null,
                materials: materials.map((material) => {
                    const materialRecord = asObject(material);
                    if (!materialRecord) {
                        return material;
                    }
                    return {
                        ...materialRecord,
                        totalCost: null,
                        unitCost: null,
                    };
                }),
            };
        }),
        quotation: quotation
            ? {
                ...quotation,
                marginAmount: null,
                marginPercent: null,
                subtotalCost: null,
            }
            : snapshot.quotation,
    };
};
const mapQuotationVersion = (record, canViewCost) => {
    const subtotalCost = roundTo(Number(record.subtotalCost), 4);
    return {
        createdAt: record.createdAt.toISOString(),
        createdByUser: mapUserSummary(record.createdByUser),
        discountAmount: roundTo(Number(record.discountAmount), 4),
        id: record.id,
        itemCount: record._count.items,
        marginAmount: hideCostValue(roundTo(Number(record.marginAmount), 4), canViewCost),
        marginPercent: canViewCost ? roundTo(Number(record.marginPercent), 4) : null,
        snapshotJson: sanitizeSnapshotJson(record.snapshotJson, canViewCost),
        status: record.status,
        subtotalCost: hideCostValue(subtotalCost, canViewCost),
        subtotalSale: roundTo(Number(record.subtotalSale), 4),
        taxAmount: roundTo(Number(record.taxAmount), 4),
        totalSale: roundTo(Number(record.totalSale), 4),
        updatedAt: record.updatedAt.toISOString(),
        versionNumber: record.versionNumber,
    };
};
const mapQuotationApproval = (record) => {
    return {
        approvalType: record.approvalType,
        approverUser: mapUserSummary(record.approverUser),
        createdAt: record.createdAt.toISOString(),
        decisionNotes: record.decisionNotes,
        decidedAt: toIsoString(record.decidedAt),
        decidedByUser: mapUserSummary(record.decidedByUser),
        id: record.id,
        quotation: {
            client: mapClientSummary(record.quotation.client),
            code: record.quotation.code,
            id: record.quotation.id,
            project: mapProjectSummary(record.quotation.project),
            status: record.quotation.status,
        },
        reason: record.reason,
        requestedByUser: mapUserSummary(record.requestedByUser),
        status: record.status,
        updatedAt: record.updatedAt.toISOString(),
    };
};
const mapQuotationStatusHistory = (record) => {
    return {
        changedByUser: mapUserSummary(record.changedByUser),
        createdAt: record.createdAt.toISOString(),
        fromStatus: record.fromStatus,
        id: record.id,
        notes: record.notes,
        toStatus: record.toStatus,
    };
};
const mapQuotationListItem = (record, canViewCost) => {
    const subtotalCost = roundTo(Number(record.subtotalCost), 4);
    return {
        approvedAt: toIsoString(record.approvedAt),
        approvedByUser: mapUserSummary(record.approvedByUser),
        client: mapClientSummary(record.client),
        code: record.code,
        createdAt: record.createdAt.toISOString(),
        createdByUser: mapUserSummary(record.createdByUser),
        currency: record.currency,
        discountAmount: roundTo(Number(record.discountAmount), 4),
        id: record.id,
        marginAmount: hideCostValue(roundTo(Number(record.marginAmount), 4), canViewCost),
        marginPercent: canViewCost ? roundTo(Number(record.marginPercent), 4) : null,
        measurementRequest: mapMeasurementRequestSummary(record.measurementRequest),
        project: mapProjectSummary(record.project),
        status: record.status,
        subtotalCost: hideCostValue(subtotalCost, canViewCost),
        subtotalSale: roundTo(Number(record.subtotalSale), 4),
        taxAmount: roundTo(Number(record.taxAmount), 4),
        totalSale: roundTo(Number(record.totalSale), 4),
        updatedAt: record.updatedAt.toISOString(),
        validUntil: toIsoString(record.validUntil),
    };
};
const mapQuotationDetail = (record, canViewCost) => {
    return {
        ...mapQuotationListItem(record, canViewCost),
        approvals: record.approvals.map(mapQuotationApproval),
        deletedAt: toIsoString(record.deletedAt),
        exchangeRate: decimalToNumber(record.exchangeRate),
        internalNotes: record.internalNotes,
        items: record.items.map((item) => mapQuotationItem(item, canViewCost)),
        notes: record.notes,
        statusHistory: record.statusHistory.map(mapQuotationStatusHistory),
        versions: record.versions.map((version) => mapQuotationVersion(version, canViewCost)),
    };
};
const assertClientExists = async (clientId, db) => {
    const client = await db.client.findFirst({
        select: {
            id: true,
        },
        where: {
            deletedAt: null,
            id: clientId,
            status: {
                not: "BLOCKED",
            },
        },
    });
    if (!client) {
        throw new AppError("Client not found.", 404);
    }
};
const assertProjectMatchesClient = async (projectId, clientId, db) => {
    if (!projectId) {
        return;
    }
    const project = await db.project.findFirst({
        select: {
            clientId: true,
            id: true,
        },
        where: {
            deletedAt: null,
            id: projectId,
        },
    });
    if (!project) {
        throw new AppError("Project not found.", 404);
    }
    if (project.clientId !== clientId) {
        throw new AppError("The selected project does not belong to the selected client.", 400);
    }
};
const assertQuotationHeaderExists = async (quotationId, db) => {
    const quotation = await db.quotation.findFirst({
        select: {
            approvedAt: true,
            approvedByUserId: true,
            clientId: true,
            code: true,
            createdAt: true,
            createdByUserId: true,
            currency: true,
            deletedAt: true,
            discountAmount: true,
            exchangeRate: true,
            id: true,
            internalNotes: true,
            marginAmount: true,
            marginPercent: true,
            notes: true,
            projectId: true,
            status: true,
            subtotalCost: true,
            subtotalSale: true,
            taxAmount: true,
            totalSale: true,
            updatedAt: true,
            validUntil: true,
        },
        where: {
            deletedAt: null,
            id: quotationId,
        },
    });
    if (!quotation) {
        throw new AppError("Quotation not found.", 404);
    }
    return quotation;
};
const assertQuotationExists = async (quotationId, db) => {
    const quotation = await db.quotation.findFirst({
        include: quotationDetailInclude,
        where: {
            deletedAt: null,
            id: quotationId,
        },
    });
    if (!quotation) {
        throw new AppError("Quotation not found.", 404);
    }
    return quotation;
};
const assertQuotationIsEditable = (status) => {
    if (!QUOTATION_EDITABLE_STATUSES.includes(status)) {
        throw new AppError("Only draft quotations can be edited.", 400);
    }
};
const assertQuotationIsNotLocked = (status) => {
    if (QUOTATION_LOCKED_STATUSES.includes(status)) {
        throw new AppError("This quotation is locked and can no longer be edited.", 400);
    }
};
const getQuotationSettings = async (db) => {
    const settings = await db.systemSetting.findMany({
        where: {
            key: {
                in: [
                    "quotation.minimum_margin_percent",
                    "quotation.maximum_discount_percent",
                    "quotation.require_approval_for_manual_override",
                ],
            },
        },
    });
    const settingMap = new Map(settings.map((setting) => [setting.key, setting.valueJson]));
    const minimumMarginPercent = Number(settingMap.get("quotation.minimum_margin_percent") ??
        QUOTATION_SETTINGS_DEFAULTS.minimumMarginPercent);
    const maximumDiscountPercent = Number(settingMap.get("quotation.maximum_discount_percent") ??
        QUOTATION_SETTINGS_DEFAULTS.maximumDiscountPercent);
    const requireApprovalForManualOverride = Boolean(settingMap.get("quotation.require_approval_for_manual_override") ??
        QUOTATION_SETTINGS_DEFAULTS.requireApprovalForManualOverride);
    return {
        maximumDiscountPercent: Number.isFinite(maximumDiscountPercent)
            ? maximumDiscountPercent
            : QUOTATION_SETTINGS_DEFAULTS.maximumDiscountPercent,
        minimumMarginPercent: Number.isFinite(minimumMarginPercent)
            ? minimumMarginPercent
            : QUOTATION_SETTINGS_DEFAULTS.minimumMarginPercent,
        requireApprovalForManualOverride,
    };
};
const generateQuotationCode = async (db = prisma, value = new Date()) => {
    const year = value.getUTCFullYear();
    const prefix = `COT-${year}-`;
    const latestQuotation = await db.quotation.findFirst({
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
    const latestSequence = latestQuotation?.code.match(/(\d+)$/)?.[1];
    const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;
    return `${prefix}${String(nextSequence).padStart(6, "0")}`;
};
const updateQuotationTotals = async (quotationId, db) => {
    const quotation = await db.quotation.findUnique({
        select: {
            discountAmount: true,
            id: true,
            taxAmount: true,
        },
        where: {
            id: quotationId,
        },
    });
    if (!quotation) {
        throw new AppError("Quotation not found.", 404);
    }
    const items = await db.quotationItem.findMany({
        select: {
            subtotalCost: true,
            subtotalSale: true,
        },
        where: {
            quotationId,
            quotationVersionId: null,
        },
    });
    const subtotalCost = roundTo(items.reduce((sum, item) => sum + Number(item.subtotalCost), 0), 4);
    const subtotalSale = roundTo(items.reduce((sum, item) => sum + Number(item.subtotalSale), 0), 4);
    const discountAmount = roundTo(Number(quotation.discountAmount), 4);
    const taxAmount = roundTo(Number(quotation.taxAmount), 4);
    const marginAmount = roundTo(subtotalSale - subtotalCost, 4);
    const marginPercent = computeMarginPercent(subtotalCost, subtotalSale);
    const totalSale = roundTo(subtotalSale - discountAmount + taxAmount, 4);
    await db.quotation.update({
        data: {
            marginAmount,
            marginPercent,
            subtotalCost,
            subtotalSale,
            totalSale,
        },
        where: {
            id: quotationId,
        },
    });
};
const buildQuotationVersionSnapshot = (quotation, versionNumber) => {
    return {
        generatedAt: new Date().toISOString(),
        items: quotation.items.map((item) => mapQuotationItem(item, true)),
        quotation: {
            approvedAt: toIsoString(quotation.approvedAt),
            client: mapClientSummary(quotation.client),
            code: quotation.code,
            currency: quotation.currency,
            discountAmount: roundTo(Number(quotation.discountAmount), 4),
            exchangeRate: decimalToNumber(quotation.exchangeRate),
            id: quotation.id,
            internalNotes: quotation.internalNotes,
            marginAmount: roundTo(Number(quotation.marginAmount), 4),
            marginPercent: roundTo(Number(quotation.marginPercent), 4),
            notes: quotation.notes,
            project: mapProjectSummary(quotation.project),
            status: quotation.status,
            subtotalCost: roundTo(Number(quotation.subtotalCost), 4),
            subtotalSale: roundTo(Number(quotation.subtotalSale), 4),
            taxAmount: roundTo(Number(quotation.taxAmount), 4),
            totalSale: roundTo(Number(quotation.totalSale), 4),
            validUntil: toIsoString(quotation.validUntil),
        },
        versionNumber,
    };
};
const createPreparedItemMaterials = async (quotationItemId, materials, db) => {
    if (materials.length === 0) {
        return;
    }
    await db.quotationItemMaterial.createMany({
        data: materials.map((material) => ({
            materialCode: material.materialCode,
            materialId: material.materialId,
            materialName: material.materialName,
            metadataJson: material.metadataJson,
            quotationItemId,
            requiredQuantity: material.requiredQuantity,
            ruleType: material.ruleType,
            source: material.source,
            supplierId: material.supplierId,
            totalCost: material.totalCost,
            unit: material.unit,
            unitCost: material.unitCost,
            wastePercent: material.wastePercent,
        })),
    });
};
const buildManualAdjustmentMaterial = (costAdjustment) => {
    if (Math.abs(costAdjustment) < 0.0001) {
        return null;
    }
    return {
        materialCode: null,
        materialId: null,
        materialName: "Manual cost override adjustment",
        metadataJson: toInputJsonValue({
            kind: "manual_cost_override_adjustment",
        }),
        requiredQuantity: 1,
        ruleType: "MANUAL",
        source: "MANUAL",
        supplierId: null,
        totalCost: roundTo(costAdjustment, 4),
        unit: "adjustment",
        unitCost: roundTo(costAdjustment, 4),
        wastePercent: null,
    };
};
const getCurrentItemCount = async (quotationId, db) => {
    return db.quotationItem.count({
        where: {
            quotationId,
            quotationVersionId: null,
        },
    });
};
const assertMaterialExists = async (materialId, db) => {
    const material = await db.material.findFirst({
        select: MATERIAL_SUMMARY_SELECT,
        where: {
            deletedAt: null,
            id: materialId,
            status: "ACTIVE",
        },
    });
    if (!material) {
        throw new AppError("Material not found.", 404);
    }
    return material;
};
const assertTemplateVersionExists = async (versionId, db) => {
    const version = await db.productTemplateVersion.findFirst({
        include: PRODUCT_TEMPLATE_VERSION_LOOKUP_INCLUDE,
        where: {
            id: versionId,
        },
    });
    if (!version || version.template.deletedAt) {
        throw new AppError("Product template version not found.", 404);
    }
    return version;
};
const buildManualPricing = (input) => {
    const subtotalCost = roundTo(input.quantity * input.unitCost, 4);
    const subtotalSale = input.unitSalePrice !== null
        ? roundTo(input.quantity * input.unitSalePrice, 4)
        : computeSaleFromMargin(subtotalCost, input.marginPercent ?? 0);
    return {
        marginPercent: computeMarginPercent(subtotalCost, subtotalSale),
        subtotalCost,
        subtotalSale,
        unitSalePrice: input.unitSalePrice !== null
            ? input.unitSalePrice
            : input.quantity > 0
                ? roundTo(subtotalSale / input.quantity, 4)
                : 0,
    };
};
const buildManualMaterialItem = async (input, db) => {
    const material = await assertMaterialExists(input.materialId, db);
    const quantity = roundTo(input.quantity, 4);
    const pricing = buildManualPricing({
        marginPercent: input.marginPercent,
        quantity,
        unitCost: input.unitCost,
        unitSalePrice: input.unitSalePrice,
    });
    const itemName = input.name ?? material.name;
    return {
        calculationResultJson: toInputJsonValue({
            kind: "manual_material",
            marginPercent: input.marginPercent,
            unitCost: input.unitCost,
            unitSalePrice: pricing.unitSalePrice,
        }),
        description: input.description,
        inputValuesJson: toInputJsonValue({
            marginPercent: input.marginPercent,
            materialId: input.materialId,
            supplierId: input.supplierId,
            unit: input.unit,
            unitCost: input.unitCost,
            unitSalePrice: pricing.unitSalePrice,
        }),
        itemType: "MANUAL_MATERIAL",
        marginPercent: pricing.marginPercent,
        materials: [
            {
                materialCode: material.code,
                materialId: material.id,
                materialName: itemName,
                metadataJson: toInputJsonValue({
                    kind: "manual_material_breakdown",
                }),
                requiredQuantity: quantity,
                ruleType: "MANUAL",
                source: "MANUAL",
                supplierId: input.supplierId,
                totalCost: pricing.subtotalCost,
                unit: input.unit,
                unitCost: input.unitCost,
                wastePercent: decimalToNumber(material.defaultWastePercent),
            },
        ],
        name: itemName,
        productTemplateId: null,
        productTemplateVersionId: null,
        quantity,
        subtotalCost: pricing.subtotalCost,
        subtotalSale: pricing.subtotalSale,
    };
};
const buildManualServiceItem = async (input) => {
    const quantity = roundTo(input.quantity, 4);
    const pricing = buildManualPricing({
        marginPercent: input.marginPercent,
        quantity,
        unitCost: input.unitCost,
        unitSalePrice: input.unitSalePrice,
    });
    return {
        calculationResultJson: toInputJsonValue({
            kind: "manual_service",
            marginPercent: input.marginPercent,
            unitCost: input.unitCost,
            unitSalePrice: pricing.unitSalePrice,
        }),
        description: input.description,
        inputValuesJson: toInputJsonValue({
            marginPercent: input.marginPercent,
            unit: input.unit,
            unitCost: input.unitCost,
            unitSalePrice: pricing.unitSalePrice,
        }),
        itemType: "MANUAL_SERVICE",
        marginPercent: pricing.marginPercent,
        materials: [
            {
                materialCode: null,
                materialId: null,
                materialName: input.name,
                metadataJson: toInputJsonValue({
                    kind: "manual_service_breakdown",
                }),
                requiredQuantity: quantity,
                ruleType: "SERVICE_COST",
                source: "MANUAL",
                supplierId: null,
                totalCost: pricing.subtotalCost,
                unit: input.unit,
                unitCost: input.unitCost,
                wastePercent: null,
            },
        ],
        name: input.name,
        productTemplateId: null,
        productTemplateVersionId: null,
        quantity,
        subtotalCost: pricing.subtotalCost,
        subtotalSale: pricing.subtotalSale,
    };
};
const buildTemplateItem = async (input, db) => {
    const version = await assertTemplateVersionExists(input.productTemplateVersionId, db);
    const simulation = await productTemplatesService.simulateProductTemplate({
        inputValues: input.inputValues,
        templateVersionId: input.productTemplateVersionId,
        userId: input.userId,
    });
    const baseSubtotalCost = roundTo(simulation.resultJson.totalCost * input.quantity, 4);
    const baseSubtotalSale = roundTo(simulation.resultJson.suggestedSalePrice * input.quantity, 4);
    const overrideResult = applyTemplateManualOverride({
        baseSubtotalCost,
        baseSubtotalSale,
        manualOverride: input.manualOverride,
    });
    const materialRows = [];
    simulation.resultJson.materials.forEach((material) => {
        const requiredQuantity = roundTo(material.requiredQuantity * input.quantity, 4);
        const wasteQuantity = roundTo(material.estimatedWasteQuantity * input.quantity, 4);
        const unitCost = material.estimatedUnitCost;
        const totalCost = roundTo(unitCost === null
            ? 0
            : (requiredQuantity + wasteQuantity) * unitCost, 4);
        materialRows.push({
            materialCode: material.materialCode,
            materialId: material.materialId,
            materialName: material.materialName,
            metadataJson: toInputJsonValue({
                estimatedWasteQuantity: wasteQuantity,
            }),
            requiredQuantity,
            ruleType: material.ruleType,
            source: "TEMPLATE",
            supplierId: null,
            totalCost,
            unit: material.unit,
            unitCost,
            wastePercent: material.wastePercent,
        });
    });
    simulation.resultJson.labor.forEach((labor) => {
        materialRows.push({
            materialCode: null,
            materialId: null,
            materialName: labor.label,
            metadataJson: toInputJsonValue({
                laborType: labor.laborType,
            }),
            requiredQuantity: roundTo(labor.quantity * input.quantity, 4),
            ruleType: "SERVICE_COST",
            source: "TEMPLATE",
            supplierId: null,
            totalCost: roundTo(labor.totalCost * input.quantity, 4),
            unit: labor.laborType.toLowerCase(),
            unitCost: roundTo(labor.unitCost, 4),
            wastePercent: null,
        });
    });
    const manualAdjustment = buildManualAdjustmentMaterial(overrideResult.costAdjustment);
    if (manualAdjustment) {
        materialRows.push(manualAdjustment);
    }
    return {
        calculationResultJson: toInputJsonValue(buildTemplateCalculationResultJson({
            manualOverride: input.manualOverride,
            requestedQuantity: input.quantity,
            result: simulation.resultJson,
            simulationId: simulation.id,
        })),
        description: input.description,
        inputValuesJson: toInputJsonValue(input.inputValues),
        itemType: "TEMPLATE_PRODUCT",
        marginPercent: overrideResult.marginPercent,
        materials: materialRows,
        name: input.name,
        productTemplateId: version.template.id,
        productTemplateVersionId: version.id,
        quantity: input.quantity,
        subtotalCost: overrideResult.subtotalCost,
        subtotalSale: overrideResult.subtotalSale,
    };
};
const evaluateApprovalRequirements = async (quotationId, options) => {
    const quotation = await assertQuotationExists(quotationId, options.db);
    const settings = await getQuotationSettings(options.db);
    const requirements = [];
    const marginPercent = roundTo(Number(quotation.marginPercent), 4);
    const subtotalSale = roundTo(Number(quotation.subtotalSale), 4);
    const discountAmount = roundTo(Number(quotation.discountAmount), 4);
    const discountPercent = computeDiscountPercent(subtotalSale, discountAmount);
    const manualOverrideDetected = quotation.items.some((item) => hasManualOverride(item.calculationResultJson));
    if (marginPercent < settings.minimumMarginPercent) {
        requirements.push({
            approvalType: "LOW_MARGIN",
            reason: `Margin ${marginPercent.toFixed(2)}% is below the configured minimum of ${settings.minimumMarginPercent.toFixed(2)}%.`,
        });
    }
    if (discountPercent > settings.maximumDiscountPercent) {
        requirements.push({
            approvalType: "HIGH_DISCOUNT",
            reason: `Discount ${discountPercent.toFixed(2)}% is above the configured maximum of ${settings.maximumDiscountPercent.toFixed(2)}%.`,
        });
    }
    if (settings.requireApprovalForManualOverride &&
        manualOverrideDetected) {
        requirements.push({
            approvalType: "PRICE_EXCEPTION",
            reason: "One or more quotation items include a manual price or cost override.",
        });
    }
    if (options.forceManualReview) {
        requirements.push({
            approvalType: "MANUAL_REVIEW",
            reason: options.manualReason ?? "Manual commercial review was requested.",
        });
    }
    return {
        discountPercent,
        hasManualOverride: manualOverrideDetected,
        maximumDiscountPercent: settings.maximumDiscountPercent,
        minimumMarginPercent: settings.minimumMarginPercent,
        requirements,
        requiresApproval: requirements.length > 0,
    };
};
const createCurrentItemVersionCopies = async (quotation, quotationVersionId, db) => {
    for (const item of quotation.items) {
        const versionItem = await db.quotationItem.create({
            data: {
                calculationResultJson: item.calculationResultJson === null
                    ? PrismaNamespace.JsonNull
                    : item.calculationResultJson,
                description: item.description,
                inputValuesJson: item.inputValuesJson === null
                    ? PrismaNamespace.JsonNull
                    : item.inputValuesJson,
                itemType: item.itemType,
                marginPercent: item.marginPercent,
                name: item.name,
                productTemplateId: item.productTemplateId,
                productTemplateVersionId: item.productTemplateVersionId,
                quantity: item.quantity,
                quotationId: item.quotationId,
                quotationVersionId,
                sortOrder: item.sortOrder,
                subtotalCost: item.subtotalCost,
                subtotalSale: item.subtotalSale,
            },
        });
        await createPreparedItemMaterials(versionItem.id, item.materials.map((material) => ({
            materialCode: material.materialCode,
            materialId: material.materialId,
            materialName: material.materialName,
            metadataJson: material.metadataJson === null
                ? PrismaNamespace.JsonNull
                : material.metadataJson,
            requiredQuantity: Number(material.requiredQuantity),
            ruleType: material.ruleType,
            source: material.source,
            supplierId: material.supplierId,
            totalCost: Number(material.totalCost),
            unit: material.unit,
            unitCost: decimalToNumber(material.unitCost),
            wastePercent: decimalToNumber(material.wastePercent),
        })), db);
    }
};
const buildQuotationOrderBy = (sortBy, sortDirection) => {
    switch (sortBy) {
        case "createdAt":
            return {
                createdAt: sortDirection,
            };
        case "totalSale":
            return {
                totalSale: sortDirection,
            };
        case "validUntil":
            return {
                validUntil: sortDirection,
            };
        case "updatedAt":
        default:
            return {
                updatedAt: sortDirection,
            };
    }
};
const buildQuotationWhereClause = (query) => {
    const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
        deletedAt: null,
        ...(createdAt
            ? {
                createdAt,
            }
            : {}),
        ...(query.clientId
            ? {
                clientId: query.clientId,
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
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        code: {
                            contains: query.search,
                        },
                    },
                    {
                        client: {
                            commercialName: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        client: {
                            legalName: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        client: {
                            firstName: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        client: {
                            lastName: {
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
                ],
            }
            : {}),
    };
};
export const quotationsService = {
    async listQuotations(query, options) {
        const where = buildQuotationWhereClause(query);
        const [total, quotations] = await prisma.$transaction([
            prisma.quotation.count({
                where,
            }),
            prisma.quotation.findMany({
                include: quotationListInclude,
                orderBy: buildQuotationOrderBy(query.sortBy, query.sortDirection),
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
        ]);
        const canViewCost = options?.canViewCost ?? false;
        return {
            data: quotations.map((quotation) => mapQuotationListItem(quotation, canViewCost)),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getQuotationById(quotationId, options) {
        const quotation = await assertQuotationExists(quotationId, prisma);
        return mapQuotationDetail(quotation, options?.canViewCost ?? false);
    },
    async createQuotation(input, userId, options) {
        await assertClientExists(input.clientId, prisma);
        await assertProjectMatchesClient(input.projectId, input.clientId, prisma);
        for (let attempt = 0; attempt < 8; attempt += 1) {
            try {
                const quotationId = await prisma.$transaction(async (db) => {
                    const code = await generateQuotationCode(db);
                    const quotation = await db.quotation.create({
                        data: {
                            clientId: input.clientId,
                            code,
                            createdByUserId: userId,
                            currency: input.currency,
                            discountAmount: input.discountAmount,
                            exchangeRate: input.exchangeRate,
                            internalNotes: input.internalNotes,
                            notes: input.notes,
                            projectId: input.projectId,
                            taxAmount: input.taxAmount,
                            validUntil: input.validUntil,
                        },
                        select: {
                            id: true,
                        },
                    });
                    await db.quotationStatusHistory.create({
                        data: {
                            changedByUserId: userId,
                            fromStatus: null,
                            notes: "Quotation created.",
                            quotationId: quotation.id,
                            toStatus: "DRAFT",
                        },
                    });
                    return quotation.id;
                });
                return this.getQuotationById(quotationId, {
                    canViewCost: options?.canViewCost ?? false,
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
        throw new AppError("Unable to generate a unique quotation code.", 500);
    },
    async updateQuotation(quotationId, input, options) {
        const previous = await this.getQuotationById(quotationId, {
            canViewCost: true,
        });
        const header = await assertQuotationHeaderExists(quotationId, prisma);
        assertQuotationIsEditable(header.status);
        await assertClientExists(input.clientId, prisma);
        await assertProjectMatchesClient(input.projectId, input.clientId, prisma);
        await prisma.quotation.update({
            data: {
                clientId: input.clientId,
                currency: input.currency,
                discountAmount: input.discountAmount,
                exchangeRate: input.exchangeRate,
                internalNotes: input.internalNotes,
                notes: input.notes,
                projectId: input.projectId,
                taxAmount: input.taxAmount,
                validUntil: input.validUntil,
            },
            where: {
                id: quotationId,
            },
        });
        await updateQuotationTotals(quotationId, prisma);
        return {
            current: await this.getQuotationById(quotationId, {
                canViewCost: options.canViewCost ?? false,
            }),
            previous,
        };
    },
    async deleteQuotation(quotationId) {
        const previous = await this.getQuotationById(quotationId, {
            canViewCost: true,
        });
        const header = await assertQuotationHeaderExists(quotationId, prisma);
        if (header.status === "ACCEPTED") {
            throw new AppError("Accepted quotations cannot be deleted.", 400);
        }
        await prisma.quotation.update({
            data: {
                deletedAt: new Date(),
            },
            where: {
                id: quotationId,
            },
        });
        return previous;
    },
    async addTemplateQuotationItem(quotationId, input, userId, options) {
        const quotation = await assertQuotationHeaderExists(quotationId, prisma);
        assertQuotationIsEditable(quotation.status);
        const preparedItem = await buildTemplateItem({
            description: null,
            inputValues: asJsonLikeRecord(input.inputValues),
            manualOverride: null,
            name: input.name,
            productTemplateVersionId: input.productTemplateVersionId,
            quantity: input.quantity,
            userId,
        }, prisma);
        const itemId = await prisma.$transaction(async (db) => {
            const sortOrder = await getCurrentItemCount(quotationId, db);
            const createdItem = await db.quotationItem.create({
                data: {
                    calculationResultJson: preparedItem.calculationResultJson,
                    description: preparedItem.description,
                    inputValuesJson: preparedItem.inputValuesJson,
                    itemType: preparedItem.itemType,
                    marginPercent: preparedItem.marginPercent,
                    name: preparedItem.name,
                    productTemplateId: preparedItem.productTemplateId,
                    productTemplateVersionId: preparedItem.productTemplateVersionId,
                    quantity: preparedItem.quantity,
                    quotationId,
                    sortOrder,
                    subtotalCost: preparedItem.subtotalCost,
                    subtotalSale: preparedItem.subtotalSale,
                },
                select: {
                    id: true,
                },
            });
            await createPreparedItemMaterials(createdItem.id, preparedItem.materials, db);
            await updateQuotationTotals(quotationId, db);
            return createdItem.id;
        });
        const refreshed = await this.getQuotationById(quotationId, {
            canViewCost: options?.canViewCost ?? false,
        });
        const item = refreshed.items.find((record) => record.id === itemId);
        if (!item) {
            throw new AppError("No se pudo cargar el ítem de cotización después de crearlo.", 500);
        }
        return {
            item,
            quotation: refreshed,
        };
    },
    async addManualMaterialItem(quotationId, input, options) {
        const quotation = await assertQuotationHeaderExists(quotationId, prisma);
        assertQuotationIsEditable(quotation.status);
        const preparedItem = await buildManualMaterialItem(input, prisma);
        const itemId = await prisma.$transaction(async (db) => {
            const sortOrder = await getCurrentItemCount(quotationId, db);
            const createdItem = await db.quotationItem.create({
                data: {
                    calculationResultJson: preparedItem.calculationResultJson,
                    description: preparedItem.description,
                    inputValuesJson: preparedItem.inputValuesJson,
                    itemType: preparedItem.itemType,
                    marginPercent: preparedItem.marginPercent,
                    name: preparedItem.name,
                    quantity: preparedItem.quantity,
                    quotationId,
                    sortOrder,
                    subtotalCost: preparedItem.subtotalCost,
                    subtotalSale: preparedItem.subtotalSale,
                },
                select: {
                    id: true,
                },
            });
            await createPreparedItemMaterials(createdItem.id, preparedItem.materials, db);
            await updateQuotationTotals(quotationId, db);
            return createdItem.id;
        });
        const refreshed = await this.getQuotationById(quotationId, {
            canViewCost: options?.canViewCost ?? false,
        });
        const item = refreshed.items.find((record) => record.id === itemId);
        if (!item) {
            throw new AppError("No se pudo cargar el ítem de cotización después de crearlo.", 500);
        }
        return {
            item,
            quotation: refreshed,
        };
    },
    async addManualServiceItem(quotationId, input, options) {
        const quotation = await assertQuotationHeaderExists(quotationId, prisma);
        assertQuotationIsEditable(quotation.status);
        const preparedItem = await buildManualServiceItem(input);
        const itemId = await prisma.$transaction(async (db) => {
            const sortOrder = await getCurrentItemCount(quotationId, db);
            const createdItem = await db.quotationItem.create({
                data: {
                    calculationResultJson: preparedItem.calculationResultJson,
                    description: preparedItem.description,
                    inputValuesJson: preparedItem.inputValuesJson,
                    itemType: preparedItem.itemType,
                    marginPercent: preparedItem.marginPercent,
                    name: preparedItem.name,
                    quantity: preparedItem.quantity,
                    quotationId,
                    sortOrder,
                    subtotalCost: preparedItem.subtotalCost,
                    subtotalSale: preparedItem.subtotalSale,
                },
                select: {
                    id: true,
                },
            });
            await createPreparedItemMaterials(createdItem.id, preparedItem.materials, db);
            await updateQuotationTotals(quotationId, db);
            return createdItem.id;
        });
        const refreshed = await this.getQuotationById(quotationId, {
            canViewCost: options?.canViewCost ?? false,
        });
        const item = refreshed.items.find((record) => record.id === itemId);
        if (!item) {
            throw new AppError("No se pudo cargar el ítem de cotización después de crearlo.", 500);
        }
        return {
            item,
            quotation: refreshed,
        };
    },
    async updateQuotationItem(itemId, input, options) {
        const item = await prisma.quotationItem.findFirst({
            include: {
                materials: {
                    orderBy: [
                        {
                            createdAt: "asc",
                        },
                    ],
                },
            },
            where: {
                id: itemId,
                quotation: {
                    deletedAt: null,
                },
            },
        });
        if (!item) {
            throw new AppError("Quotation item not found.", 404);
        }
        const quotation = await assertQuotationHeaderExists(item.quotationId, prisma);
        assertQuotationIsEditable(quotation.status);
        const previous = mapQuotationItem({
            ...item,
        }, true);
        const quantity = input.quantity ?? Number(item.quantity);
        const nextSortOrder = input.sortOrder ?? item.sortOrder;
        let preparedItem;
        if (item.itemType === "TEMPLATE_PRODUCT") {
            const currentInputValues = asObject(item.inputValuesJson) ?? {};
            const currentOverride = extractTemplateManualOverride(item.calculationResultJson);
            let manualOverride = currentOverride;
            const hasOverrideChange = input.marginPercent !== undefined ||
                input.unitCost !== undefined ||
                input.unitSalePrice !== undefined ||
                input.clearManualOverride;
            if (hasOverrideChange && !options.canOverrideCost) {
                throw new AppError("Missing required permission: quotations.override_cost.", 403);
            }
            if (input.clearManualOverride) {
                manualOverride = null;
            }
            else if (input.marginPercent !== undefined ||
                input.unitCost !== undefined ||
                input.unitSalePrice !== undefined) {
                manualOverride = {
                    marginPercent: input.marginPercent ?? currentOverride?.marginPercent ?? null,
                    reason: "Manual template pricing override",
                    subtotalCost: input.unitCost !== undefined ? input.unitCost : currentOverride?.subtotalCost ?? null,
                    subtotalSale: input.unitSalePrice !== undefined
                        ? input.unitSalePrice
                        : currentOverride?.subtotalSale ?? null,
                    updatedAt: new Date().toISOString(),
                };
            }
            preparedItem = await buildTemplateItem({
                description: input.description === undefined
                    ? item.description
                    : input.description,
                inputValues: input.inputValues && isPlainObject(input.inputValues)
                    ? asJsonLikeRecord(input.inputValues)
                    : asJsonLikeRecord(currentInputValues),
                manualOverride,
                name: input.name ?? item.name,
                productTemplateVersionId: item.productTemplateVersionId ?? "",
                quantity,
                userId: options.userId,
            }, prisma);
        }
        else if (item.itemType === "MANUAL_MATERIAL") {
            const currentValues = asObject(item.inputValuesJson) ?? {};
            preparedItem = await buildManualMaterialItem({
                description: input.description === undefined
                    ? item.description
                    : input.description,
                marginPercent: input.marginPercent === undefined
                    ? typeof currentValues.marginPercent === "number"
                        ? currentValues.marginPercent
                        : null
                    : input.marginPercent,
                materialId: input.materialId ?? String(currentValues.materialId ?? ""),
                name: input.name === undefined
                    ? item.name
                    : input.name ?? item.name,
                quantity,
                supplierId: input.supplierId === undefined
                    ? (typeof currentValues.supplierId === "string"
                        ? currentValues.supplierId
                        : null)
                    : input.supplierId,
                unit: input.unit === undefined
                    ? String(currentValues.unit ?? item.materials[0]?.unit ?? "unit")
                    : input.unit ?? item.materials[0]?.unit ?? "unit",
                unitCost: input.unitCost === undefined
                    ? Number(currentValues.unitCost ?? item.materials[0]?.unitCost ?? 0)
                    : input.unitCost ?? 0,
                unitSalePrice: input.unitSalePrice === undefined
                    ? typeof currentValues.unitSalePrice === "number"
                        ? currentValues.unitSalePrice
                        : null
                    : input.unitSalePrice,
            }, prisma);
        }
        else if (item.itemType === "MANUAL_SERVICE") {
            const currentValues = asObject(item.inputValuesJson) ?? {};
            preparedItem = await buildManualServiceItem({
                description: input.description === undefined
                    ? item.description
                    : input.description,
                marginPercent: input.marginPercent === undefined
                    ? typeof currentValues.marginPercent === "number"
                        ? currentValues.marginPercent
                        : null
                    : input.marginPercent,
                name: input.name === undefined
                    ? item.name
                    : input.name ?? item.name,
                quantity,
                unit: input.unit === undefined
                    ? String(currentValues.unit ?? item.materials[0]?.unit ?? "service")
                    : input.unit ?? item.materials[0]?.unit ?? "service",
                unitCost: input.unitCost === undefined
                    ? Number(currentValues.unitCost ?? item.materials[0]?.unitCost ?? 0)
                    : input.unitCost ?? 0,
                unitSalePrice: input.unitSalePrice === undefined
                    ? typeof currentValues.unitSalePrice === "number"
                        ? currentValues.unitSalePrice
                        : null
                    : input.unitSalePrice,
            });
        }
        else {
            preparedItem = {
                calculationResultJson: item.calculationResultJson === null
                    ? PrismaNamespace.JsonNull
                    : item.calculationResultJson,
                description: input.description === undefined
                    ? item.description
                    : input.description,
                inputValuesJson: item.inputValuesJson === null
                    ? PrismaNamespace.JsonNull
                    : item.inputValuesJson,
                itemType: item.itemType,
                marginPercent: decimalToNumber(item.marginPercent),
                materials: item.materials.map((material) => ({
                    materialCode: material.materialCode,
                    materialId: material.materialId,
                    materialName: material.materialName,
                    metadataJson: material.metadataJson === null
                        ? PrismaNamespace.JsonNull
                        : material.metadataJson,
                    requiredQuantity: Number(material.requiredQuantity),
                    ruleType: material.ruleType,
                    source: material.source,
                    supplierId: material.supplierId,
                    totalCost: Number(material.totalCost),
                    unit: material.unit,
                    unitCost: decimalToNumber(material.unitCost),
                    wastePercent: decimalToNumber(material.wastePercent),
                })),
                name: input.name ?? item.name,
                productTemplateId: item.productTemplateId,
                productTemplateVersionId: item.productTemplateVersionId,
                quantity,
                subtotalCost: Number(item.subtotalCost),
                subtotalSale: Number(item.subtotalSale),
            };
        }
        await prisma.$transaction(async (db) => {
            await db.quotationItem.update({
                data: {
                    calculationResultJson: preparedItem.calculationResultJson,
                    description: preparedItem.description,
                    inputValuesJson: preparedItem.inputValuesJson,
                    marginPercent: preparedItem.marginPercent,
                    name: preparedItem.name,
                    productTemplateId: preparedItem.productTemplateId,
                    productTemplateVersionId: preparedItem.productTemplateVersionId,
                    quantity: preparedItem.quantity,
                    sortOrder: nextSortOrder,
                    subtotalCost: preparedItem.subtotalCost,
                    subtotalSale: preparedItem.subtotalSale,
                },
                where: {
                    id: itemId,
                },
            });
            await db.quotationItemMaterial.deleteMany({
                where: {
                    quotationItemId: itemId,
                },
            });
            await createPreparedItemMaterials(itemId, preparedItem.materials, db);
            await updateQuotationTotals(item.quotationId, db);
        });
        const refreshed = await this.getQuotationById(item.quotationId, {
            canViewCost: options.canViewCost ?? false,
        });
        const current = refreshed.items.find((record) => record.id === itemId);
        if (!current) {
            throw new AppError("No se pudo cargar el ítem de cotización después de actualizarlo.", 500);
        }
        return {
            current,
            previous,
            quotation: refreshed,
        };
    },
    async deleteQuotationItem(itemId, options) {
        const item = await prisma.quotationItem.findFirst({
            include: {
                materials: {
                    orderBy: [
                        {
                            createdAt: "asc",
                        },
                    ],
                },
            },
            where: {
                id: itemId,
                quotation: {
                    deletedAt: null,
                },
            },
        });
        if (!item) {
            throw new AppError("Quotation item not found.", 404);
        }
        const quotation = await assertQuotationHeaderExists(item.quotationId, prisma);
        assertQuotationIsEditable(quotation.status);
        const deleted = mapQuotationItem(item, true);
        await prisma.$transaction(async (db) => {
            await db.quotationItemMaterial.deleteMany({
                where: {
                    quotationItemId: itemId,
                },
            });
            await db.quotationItem.delete({
                where: {
                    id: itemId,
                },
            });
            await updateQuotationTotals(item.quotationId, db);
        });
        return {
            deleted,
            quotation: await this.getQuotationById(item.quotationId, {
                canViewCost: options?.canViewCost ?? false,
            }),
        };
    },
    async recalculateQuotation(quotationId, options) {
        const quotation = await assertQuotationExists(quotationId, prisma);
        assertQuotationIsNotLocked(quotation.status);
        for (const item of quotation.items) {
            await this.updateQuotationItem(item.id, {}, {
                canOverrideCost: true,
                canViewCost: true,
                userId: options.userId,
            });
        }
        return this.getQuotationById(quotationId, {
            canViewCost: options.canViewCost ?? false,
        });
    },
    async createQuotationVersion(quotationId, options) {
        const quotation = await assertQuotationExists(quotationId, prisma);
        const versionId = await prisma.$transaction(async (db) => {
            const latestVersion = await db.quotationVersion.findFirst({
                orderBy: {
                    versionNumber: "desc",
                },
                select: {
                    versionNumber: true,
                },
                where: {
                    quotationId,
                },
            });
            const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
            await db.quotationVersion.updateMany({
                data: {
                    status: "ARCHIVED",
                },
                where: {
                    quotationId,
                    status: "ACTIVE",
                },
            });
            const version = await db.quotationVersion.create({
                data: {
                    createdByUserId: options.userId,
                    discountAmount: quotation.discountAmount,
                    marginAmount: quotation.marginAmount,
                    marginPercent: quotation.marginPercent,
                    quotationId,
                    snapshotJson: toInputJsonValue(buildQuotationVersionSnapshot(quotation, versionNumber)),
                    status: "ACTIVE",
                    subtotalCost: quotation.subtotalCost,
                    subtotalSale: quotation.subtotalSale,
                    taxAmount: quotation.taxAmount,
                    totalSale: quotation.totalSale,
                    versionNumber,
                },
                select: {
                    id: true,
                },
            });
            await createCurrentItemVersionCopies(quotation, version.id, db);
            return version.id;
        });
        const version = await prisma.quotationVersion.findFirst({
            include: quotationVersionListInclude,
            where: {
                id: versionId,
            },
        });
        if (!version) {
            throw new AppError("No se pudo cargar la versión de cotización.", 500);
        }
        return mapQuotationVersion(version, options.canViewCost ?? false);
    },
    async submitQuotationForApproval(quotationId, input, options) {
        const quotation = await assertQuotationExists(quotationId, prisma);
        assertQuotationIsEditable(quotation.status);
        if (!options.userId) {
            throw new AppError("Authenticated user context is required.", 401);
        }
        const requestedByUserId = options.userId;
        if (quotation.items.length === 0) {
            throw new AppError("Add at least one quotation item before submitting.", 400);
        }
        const evaluation = await evaluateApprovalRequirements(quotationId, {
            db: prisma,
            forceManualReview: input.forceManualReview,
            manualReason: input.reason,
        });
        if (!evaluation.requiresApproval) {
            await prisma.$transaction(async (db) => {
                await db.quotationApproval.updateMany({
                    data: {
                        status: "CANCELLED",
                    },
                    where: {
                        quotationId,
                        status: "PENDING",
                    },
                });
                await db.quotation.update({
                    data: {
                        approvedAt: new Date(),
                        approvedByUserId: options.userId,
                        status: "APPROVED",
                    },
                    where: {
                        id: quotationId,
                    },
                });
                await db.quotationStatusHistory.create({
                    data: {
                        changedByUserId: options.userId,
                        fromStatus: quotation.status,
                        notes: "Quotation auto-approved because no approval triggers were found.",
                        quotationId,
                        toStatus: "APPROVED",
                    },
                });
            });
        }
        else {
            await prisma.$transaction(async (db) => {
                await db.quotationApproval.updateMany({
                    data: {
                        status: "CANCELLED",
                    },
                    where: {
                        quotationId,
                        status: "PENDING",
                    },
                });
                for (const requirement of evaluation.requirements) {
                    await db.quotationApproval.create({
                        data: {
                            approvalType: requirement.approvalType,
                            reason: requirement.reason,
                            quotationId,
                            requestedByUserId,
                            status: "PENDING",
                        },
                    });
                }
                await db.quotation.update({
                    data: {
                        status: "PENDING_APPROVAL",
                    },
                    where: {
                        id: quotationId,
                    },
                });
                await db.quotationStatusHistory.create({
                    data: {
                        changedByUserId: options.userId,
                        fromStatus: quotation.status,
                        notes: input.reason ??
                            "Quotation submitted for approval due to approval-rule triggers.",
                        quotationId,
                        toStatus: "PENDING_APPROVAL",
                    },
                });
            });
        }
        return {
            evaluation,
            quotation: await this.getQuotationById(quotationId, {
                canViewCost: options.canViewCost ?? false,
            }),
        };
    },
    async approveQuotation(quotationId, decisionNotes, options) {
        const quotation = await assertQuotationHeaderExists(quotationId, prisma);
        if (quotation.status !== "PENDING_APPROVAL") {
            throw new AppError("Only quotations pending approval can be approved.", 400);
        }
        await prisma.$transaction(async (db) => {
            await db.quotationApproval.updateMany({
                data: {
                    approverUserId: options?.userId ?? null,
                    decidedAt: new Date(),
                    decidedByUserId: options?.userId ?? null,
                    decisionNotes,
                    status: "APPROVED",
                },
                where: {
                    quotationId,
                    status: "PENDING",
                },
            });
            await db.quotation.update({
                data: {
                    approvedAt: new Date(),
                    approvedByUserId: options?.userId ?? null,
                    status: "APPROVED",
                },
                where: {
                    id: quotationId,
                },
            });
            await db.quotationStatusHistory.create({
                data: {
                    changedByUserId: options?.userId ?? null,
                    fromStatus: quotation.status,
                    notes: decisionNotes ?? "Quotation approved.",
                    quotationId,
                    toStatus: "APPROVED",
                },
            });
        });
        return this.getQuotationById(quotationId, {
            canViewCost: options?.canViewCost ?? false,
        });
    },
    async rejectQuotation(quotationId, decisionNotes, options) {
        const quotation = await assertQuotationHeaderExists(quotationId, prisma);
        if (quotation.status !== "PENDING_APPROVAL") {
            throw new AppError("Only quotations pending approval can be rejected.", 400);
        }
        await prisma.$transaction(async (db) => {
            await db.quotationApproval.updateMany({
                data: {
                    approverUserId: options?.userId ?? null,
                    decidedAt: new Date(),
                    decidedByUserId: options?.userId ?? null,
                    decisionNotes,
                    status: "REJECTED",
                },
                where: {
                    quotationId,
                    status: "PENDING",
                },
            });
            await db.quotation.update({
                data: {
                    approvedAt: null,
                    approvedByUserId: null,
                    status: "DRAFT",
                },
                where: {
                    id: quotationId,
                },
            });
            await db.quotationStatusHistory.create({
                data: {
                    changedByUserId: options?.userId ?? null,
                    fromStatus: quotation.status,
                    notes: decisionNotes ?? "Quotation rejected and returned to draft.",
                    quotationId,
                    toStatus: "DRAFT",
                },
            });
        });
        return this.getQuotationById(quotationId, {
            canViewCost: options?.canViewCost ?? false,
        });
    },
    async changeQuotationStatus(quotationId, input, options) {
        const quotation = await assertQuotationExists(quotationId, prisma);
        if (quotation.status === "ACCEPTED") {
            throw new AppError("Accepted quotations are locked.", 400);
        }
        if (input.toStatus === "PENDING_APPROVAL") {
            throw new AppError("Use the submit approval endpoint to move a quotation into pending approval.", 400);
        }
        if (input.toStatus === "APPROVED") {
            if (!options.canApprove) {
                throw new AppError("Only approvers can mark quotations as approved.", 403);
            }
        }
        if (input.toStatus === "SENT") {
            if (!options.canSend) {
                throw new AppError("Missing required permission: quotations.send.", 403);
            }
            if (quotation.items.length === 0) {
                throw new AppError("Cannot send a quotation without items.", 400);
            }
            if (quotation.status !== "APPROVED") {
                throw new AppError("Only approved quotations can be sent.", 400);
            }
        }
        if (input.toStatus === "ACCEPTED" &&
            !["APPROVED", "SENT"].includes(quotation.status)) {
            throw new AppError("A quotation can only be accepted after it has been approved or sent.", 400);
        }
        if (input.toStatus === "REJECTED" &&
            !["APPROVED", "SENT"].includes(quotation.status)) {
            throw new AppError("Only approved or sent quotations can be marked as rejected.", 400);
        }
        if (input.toStatus === "EXPIRED" &&
            !["APPROVED", "SENT"].includes(quotation.status)) {
            throw new AppError("Only approved or sent quotations can be marked as expired.", 400);
        }
        await prisma.$transaction(async (db) => {
            const quotationUpdate = {
                status: input.toStatus,
            };
            if (input.toStatus === "APPROVED") {
                quotationUpdate.approvedAt = new Date();
                if (options.userId) {
                    quotationUpdate.approvedByUser = {
                        connect: {
                            id: options.userId,
                        },
                    };
                }
            }
            await db.quotation.update({
                data: quotationUpdate,
                where: {
                    id: quotationId,
                },
            });
            await db.quotationStatusHistory.create({
                data: {
                    changedByUserId: options.userId,
                    fromStatus: quotation.status,
                    notes: input.notes,
                    quotationId,
                    toStatus: input.toStatus,
                },
            });
        });
        const refreshed = await this.getQuotationById(quotationId, {
            canViewCost: options.canViewCost ?? false,
        });
        const historyEntry = refreshed.statusHistory[0];
        if (!historyEntry) {
            throw new AppError("No se pudo cargar el historial de estados de la cotización.", 500);
        }
        return {
            historyEntry,
            quotation: refreshed,
        };
    },
    async listQuotationVersions(quotationId, options) {
        await assertQuotationHeaderExists(quotationId, prisma);
        const versions = await prisma.quotationVersion.findMany({
            include: quotationVersionListInclude,
            orderBy: [
                {
                    versionNumber: "desc",
                },
            ],
            where: {
                quotationId,
            },
        });
        return versions.map((version) => mapQuotationVersion(version, options?.canViewCost ?? false));
    },
    async listQuotationApprovals(quotationId) {
        await assertQuotationHeaderExists(quotationId, prisma);
        const approvals = await prisma.quotationApproval.findMany({
            include: quotationApprovalInclude,
            orderBy: [
                {
                    createdAt: "desc",
                },
            ],
            where: {
                quotationId,
            },
        });
        return approvals.map(mapQuotationApproval);
    },
    async listPendingApprovals() {
        const approvals = await prisma.quotationApproval.findMany({
            include: quotationApprovalInclude,
            orderBy: [
                {
                    createdAt: "desc",
                },
            ],
            where: {
                quotation: {
                    deletedAt: null,
                },
                status: "PENDING",
            },
        });
        return approvals.map(mapQuotationApproval);
    },
};
//# sourceMappingURL=quotations.service.js.map