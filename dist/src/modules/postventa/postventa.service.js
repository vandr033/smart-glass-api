import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { buildDateRangeFilter } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { buildPostventaEvidenceUrl, postventaEvidenceUploadsDir, } from "../../utils/uploads.js";
import { getClientDisplayName } from "../clients/clients.service.js";
import { inventoryService } from "../inventory/inventory.service.js";
import { projectProfitabilityService } from "../project-profitability/project-profitability.service.js";
import { POSTVENTA_STATUS_TRANSITIONS, } from "./postventa.constants.js";
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
    status: true,
    title: true,
};
const quotationSummarySelect = {
    code: true,
    id: true,
    status: true,
};
const installationSummarySelect = {
    code: true,
    id: true,
    scheduledDate: true,
    status: true,
};
const productWarrantyInclude = {
    _count: {
        select: {
            cases: true,
        },
    },
    client: {
        select: clientSummarySelect,
    },
    project: {
        select: projectSummarySelect,
    },
};
const activityInclude = {
    responsibleUser: {
        select: userSummarySelect,
    },
};
const evidenceInclude = {
    uploadedByUser: {
        select: userSummarySelect,
    },
};
const statusHistoryInclude = {
    changedByUser: {
        select: userSummarySelect,
    },
};
const reservationLinkInclude = {
    createdByUser: {
        select: userSummarySelect,
    },
    inventoryReservation: {
        include: {
            inventoryStock: {
                select: {
                    condition: true,
                    id: true,
                    locationCode: true,
                    stockType: true,
                },
            },
            material: {
                select: {
                    code: true,
                    id: true,
                    materialType: true,
                    name: true,
                },
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
                select: userSummarySelect,
            },
            warehouse: {
                select: {
                    code: true,
                    id: true,
                    name: true,
                },
            },
        },
    },
};
const postventaCaseListInclude = {
    activities: {
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
        select: {
            status: true,
        },
    },
    client: {
        select: clientSummarySelect,
    },
    costs: {
        orderBy: [
            {
                costDate: "desc",
            },
        ],
        select: {
            amount: true,
            category: true,
            costDate: true,
            description: true,
            id: true,
            origin: true,
            postventaCaseId: true,
            referenceId: true,
        },
    },
    createdByUser: {
        select: userSummarySelect,
    },
    evidences: {
        select: {
            id: true,
        },
    },
    project: {
        select: projectSummarySelect,
    },
    responsibleUser: {
        select: userSummarySelect,
    },
    warranty: {
        include: productWarrantyInclude,
    },
};
const postventaCaseDetailInclude = {
    ...postventaCaseListInclude,
    activities: {
        include: activityInclude,
        orderBy: [
            {
                scheduledAt: "desc",
            },
            {
                createdAt: "desc",
            },
        ],
    },
    evidences: {
        include: evidenceInclude,
        orderBy: [
            {
                uploadedAt: "desc",
            },
        ],
    },
    installation: {
        select: installationSummarySelect,
    },
    inventoryReservations: {
        include: reservationLinkInclude,
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
    quotation: {
        select: quotationSummarySelect,
    },
    statusHistory: {
        include: statusHistoryInclude,
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
};
const toIsoString = (value) => value ? value.toISOString() : null;
const roundTo = (value, decimals = 4) => Number(value.toFixed(decimals));
const mapUserSummary = (user) => user
    ? {
        email: user.email,
        id: user.id,
        name: user.name,
    }
    : null;
const mapClientSummary = (client) => ({
    clientType: client.clientType,
    displayName: getClientDisplayName(client),
    id: client.id,
});
const mapProjectSummary = (project) => project
    ? {
        code: project.code,
        id: project.id,
        status: project.status,
        title: project.title,
    }
    : null;
const mapQuotationSummary = (quotation) => quotation
    ? {
        code: quotation.code,
        id: quotation.id,
        status: quotation.status,
    }
    : null;
const mapInstallationSummary = (installation) => installation
    ? {
        code: installation.code,
        id: installation.id,
        scheduledDate: installation.scheduledDate.toISOString(),
        status: installation.status,
    }
    : null;
const getWarrantyEffectiveStatus = (warranty) => {
    if (warranty.status === "ANULADA") {
        return "ANULADA";
    }
    const now = new Date();
    if (warranty.endDate < now || warranty.startDate > warranty.endDate) {
        return "VENCIDA";
    }
    return "VIGENTE";
};
const isWarrantyCurrent = (warranty, referenceDate = new Date()) => {
    if (warranty.status === "ANULADA") {
        return false;
    }
    return (referenceDate >= warranty.startDate &&
        referenceDate <= warranty.endDate);
};
const mapWarrantyRecord = (warranty) => {
    if (!warranty) {
        return null;
    }
    return {
        caseCount: warranty._count.cases,
        client: mapClientSummary(warranty.client),
        conditions: warranty.conditions,
        createdAt: warranty.createdAt.toISOString(),
        endDate: warranty.endDate.toISOString(),
        estaVigente: isWarrantyCurrent(warranty),
        id: warranty.id,
        productType: warranty.productType,
        project: mapProjectSummary(warranty.project),
        startDate: warranty.startDate.toISOString(),
        status: getWarrantyEffectiveStatus(warranty),
        updatedAt: warranty.updatedAt.toISOString(),
    };
};
const mapActivityRecord = (activity) => ({
    createdAt: activity.createdAt.toISOString(),
    description: activity.description,
    executedAt: toIsoString(activity.executedAt),
    id: activity.id,
    postventaCaseId: activity.postventaCaseId,
    responsible: mapUserSummary(activity.responsibleUser),
    scheduledAt: toIsoString(activity.scheduledAt),
    status: activity.status,
    type: activity.activityType,
    updatedAt: activity.updatedAt.toISOString(),
});
const mapEvidenceRecord = (evidence) => ({
    activityId: evidence.postventaActivityId,
    description: evidence.description,
    fileName: evidence.fileName,
    fileUrl: evidence.fileUrl,
    id: evidence.id,
    mimeType: evidence.mimeType,
    postventaCaseId: evidence.postventaCaseId,
    sizeBytes: evidence.sizeBytes ?? null,
    type: evidence.evidenceType,
    uploadedAt: evidence.uploadedAt.toISOString(),
    uploadedBy: mapUserSummary(evidence.uploadedByUser),
});
const mapCostRecord = (cost) => ({
    amount: roundTo(Number(cost.amount), 4),
    category: cost.category,
    costDate: cost.costDate.toISOString(),
    description: cost.description,
    id: cost.id,
    origin: cost.origin,
    postventaCaseId: cost.postventaCaseId,
    referenceId: cost.referenceId,
});
const mapStatusHistoryRecord = (entry) => ({
    changedBy: mapUserSummary(entry.changedByUser),
    createdAt: entry.createdAt.toISOString(),
    fromStatus: entry.fromStatus,
    id: entry.id,
    metadataJson: entry.metadataJson,
    notes: entry.notes,
    postventaCaseId: entry.postventaCaseId,
    toStatus: entry.toStatus,
});
const mapReservationRecord = (link) => ({
    createdAt: link.createdAt.toISOString(),
    id: link.id,
    inventoryReservation: {
        createdAt: link.inventoryReservation.createdAt.toISOString(),
        expiresAt: toIsoString(link.inventoryReservation.expiresAt),
        id: link.inventoryReservation.id,
        inventoryStock: link.inventoryReservation.inventoryStock,
        material: link.inventoryReservation.material,
        project: link.inventoryReservation.project,
        quantity: Number(link.inventoryReservation.quantity),
        quotation: link.inventoryReservation.quotation,
        reservationType: link.inventoryReservation.reservationType,
        reservedByUser: mapUserSummary(link.inventoryReservation.reservedByUser),
        status: link.inventoryReservation.status,
        unit: link.inventoryReservation.unit,
        updatedAt: link.inventoryReservation.updatedAt.toISOString(),
        warehouse: link.inventoryReservation.warehouse,
    },
    notes: link.notes,
});
const summarizeCostBucket = (caseType, category) => {
    if (category === "GARANTIA") {
        return "GARANTIA";
    }
    if (category === "RECLAMO") {
        return "RECLAMO";
    }
    if (category === "REPOSICION") {
        return "REPOSICION";
    }
    if (caseType === "GARANTIA") {
        return "GARANTIA";
    }
    if (caseType === "RECLAMO") {
        return "RECLAMO";
    }
    if (caseType === "REPOSICION") {
        return "REPOSICION";
    }
    return null;
};
const buildFinancialImpact = async (record) => {
    const costs = record.costs.map(mapCostRecord);
    const costTotal = roundTo(costs.reduce((sum, cost) => sum + cost.amount, 0), 4);
    const costByBucket = costs.reduce((summary, cost) => {
        const bucket = summarizeCostBucket(record.caseType, cost.category);
        if (bucket === "GARANTIA") {
            summary.costoGarantia += cost.amount;
        }
        if (bucket === "RECLAMO") {
            summary.costoReclamo += cost.amount;
        }
        if (bucket === "REPOSICION") {
            summary.costoReposicion += cost.amount;
        }
        return summary;
    }, {
        costoGarantia: 0,
        costoReclamo: 0,
        costoReposicion: 0,
    });
    let ventaProyecto = null;
    let utilidadProyecto = null;
    if (record.projectId) {
        try {
            const detail = await projectProfitabilityService.getProjectProfitabilityByProjectId(record.projectId);
            ventaProyecto = detail.rentabilidad.ingresoReal;
            utilidadProyecto = detail.indicadores.rentabilidadPorProyecto;
        }
        catch {
            ventaProyecto = null;
            utilidadProyecto = null;
        }
    }
    return {
        costoGarantia: roundTo(costByBucket.costoGarantia, 4),
        costoReclamo: roundTo(costByBucket.costoReclamo, 4),
        costoReposicion: roundTo(costByBucket.costoReposicion, 4),
        costoTotal: costTotal,
        porcentajeSobreUtilidad: utilidadProyecto && utilidadProyecto !== 0
            ? roundTo((costTotal / utilidadProyecto) * 100, 4)
            : null,
        porcentajeSobreVenta: ventaProyecto && ventaProyecto !== 0
            ? roundTo((costTotal / ventaProyecto) * 100, 4)
            : null,
        utilidadProyecto,
        ventaProyecto,
    };
};
const mapCaseListItem = (record) => {
    const totalCost = roundTo(record.costs.reduce((sum, cost) => sum + Number(cost.amount), 0), 4);
    return {
        activityPendingCount: record.activities.filter((activity) => activity.status !== "EJECUTADA" && activity.status !== "CANCELADA").length,
        client: mapClientSummary(record.client),
        closedAt: toIsoString(record.closedAt),
        code: record.code,
        commitmentDate: toIsoString(record.commitmentDate),
        createdAt: record.createdAt.toISOString(),
        createdBy: mapUserSummary(record.createdByUser),
        descripcionCorta: record.description.length > 160
            ? `${record.description.slice(0, 157)}...`
            : record.description,
        evidenceCount: record.evidences.length,
        id: record.id,
        outsideWarranty: record.outsideWarranty,
        priority: record.priority,
        project: mapProjectSummary(record.project),
        reportedAt: record.reportedAt.toISOString(),
        responsible: mapUserSummary(record.responsibleUser),
        status: record.status,
        totalCost,
        type: record.caseType,
        updatedAt: record.updatedAt.toISOString(),
        warranty: mapWarrantyRecord(record.warranty),
    };
};
const mapCaseDetail = async (record) => {
    const summary = mapCaseListItem(record);
    return {
        ...summary,
        activities: record.activities.map(mapActivityRecord),
        costs: record.costs.map(mapCostRecord),
        description: record.description,
        evidences: record.evidences.map(mapEvidenceRecord),
        financialImpact: await buildFinancialImpact(record),
        installation: mapInstallationSummary(record.installation),
        internalNotes: record.internalNotes,
        inventoryReservations: record.inventoryReservations.map(mapReservationRecord),
        proposedSolution: record.proposedSolution,
        quotation: mapQuotationSummary(record.quotation),
        statusHistory: record.statusHistory.map(mapStatusHistoryRecord),
    };
};
const normalizeWarrantyStatus = (status, endDate) => {
    if (status === "ANULADA") {
        return "ANULADA";
    }
    return endDate < new Date() ? "VENCIDA" : "VIGENTE";
};
const generatePostventaCaseCode = async (db = prisma, value = new Date()) => {
    const year = value.getUTCFullYear();
    const prefix = `POS-${year}-`;
    const latestCase = await db.postventaCase.findFirst({
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
    const latestSequence = latestCase?.code.match(/(\d+)$/)?.[1];
    const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;
    return `${prefix}${String(nextSequence).padStart(4, "0")}`;
};
const getPostventaCaseOrThrow = async (db, caseId) => {
    const record = await db.postventaCase.findUnique({
        include: postventaCaseDetailInclude,
        where: {
            id: caseId,
        },
    });
    if (!record) {
        throw new AppError("No se encontro el caso postventa solicitado.", 404);
    }
    return record;
};
const getProductWarrantyOrThrow = async (db, warrantyId) => {
    const record = await db.productWarranty.findUnique({
        include: productWarrantyInclude,
        where: {
            id: warrantyId,
        },
    });
    if (!record) {
        throw new AppError("No se encontro la garantia solicitada.", 404);
    }
    return record;
};
const getPostventaActivityOrThrow = async (db, activityId) => {
    const record = await db.postventaActivity.findUnique({
        include: activityInclude,
        where: {
            id: activityId,
        },
    });
    if (!record) {
        throw new AppError("No se encontro la actividad postventa solicitada.", 404);
    }
    return record;
};
const getPostventaReservationLinkOrThrow = async (db, reservationLinkId) => {
    const record = await db.postventaInventoryReservation.findUnique({
        include: reservationLinkInclude,
        where: {
            id: reservationLinkId,
        },
    });
    if (!record) {
        throw new AppError("No se encontro la reserva vinculada al caso postventa.", 404);
    }
    return record;
};
const ensureUserExists = async (db, userId, label) => {
    if (!userId) {
        return null;
    }
    const user = await db.user.findFirst({
        select: {
            id: true,
        },
        where: {
            deletedAt: null,
            id: userId,
        },
    });
    if (!user) {
        throw new AppError(`No se encontro el usuario indicado para ${label}.`, 404);
    }
    return user.id;
};
const ensureClientExists = async (db, clientId) => {
    const client = await db.client.findFirst({
        select: {
            id: true,
        },
        where: {
            deletedAt: null,
            id: clientId,
        },
    });
    if (!client) {
        throw new AppError("No se encontro el cliente indicado.", 404);
    }
    return client.id;
};
const ensureProjectExists = async (db, projectId) => {
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
        throw new AppError("No se encontro el proyecto indicado.", 404);
    }
    return project;
};
const ensureQuotationExists = async (db, quotationId) => {
    const quotation = await db.quotation.findFirst({
        select: {
            clientId: true,
            id: true,
            projectId: true,
        },
        where: {
            deletedAt: null,
            id: quotationId,
        },
    });
    if (!quotation) {
        throw new AppError("No se encontro la cotizacion indicada.", 404);
    }
    return quotation;
};
const ensureInstallationExists = async (db, installationId) => {
    const installation = await db.installationOrder.findFirst({
        select: {
            clientId: true,
            code: true,
            id: true,
            projectId: true,
            quotationId: true,
            status: true,
            scheduledDate: true,
        },
        where: {
            deletedAt: null,
            id: installationId,
        },
    });
    if (!installation) {
        throw new AppError("No se encontro la instalacion indicada.", 404);
    }
    return installation;
};
const findApplicableWarranty = async (db, input) => {
    if (!input.projectId) {
        return null;
    }
    const warranty = await db.productWarranty.findFirst({
        include: productWarrantyInclude,
        orderBy: [
            {
                endDate: "desc",
            },
            {
                createdAt: "desc",
            },
        ],
        where: {
            clientId: input.clientId,
            projectId: input.projectId,
            status: {
                not: "ANULADA",
            },
            startDate: {
                lte: input.reportedAt,
            },
            endDate: {
                gte: input.reportedAt,
            },
        },
    });
    return warranty;
};
const resolveCaseContext = async (db, input) => {
    const installation = input.installationId
        ? await ensureInstallationExists(db, input.installationId)
        : null;
    const quotation = input.quotationId
        ? await ensureQuotationExists(db, input.quotationId)
        : null;
    const project = input.projectId
        ? await ensureProjectExists(db, input.projectId)
        : installation?.projectId
            ? await ensureProjectExists(db, installation.projectId)
            : quotation?.projectId
                ? await ensureProjectExists(db, quotation.projectId)
                : null;
    const derivedClientId = input.clientId ??
        installation?.clientId ??
        quotation?.clientId ??
        project?.clientId ??
        null;
    if (!derivedClientId) {
        throw new AppError("El caso postventa debe estar asociado al menos a un cliente valido.", 400);
    }
    await ensureClientExists(db, derivedClientId);
    if (project && project.clientId !== derivedClientId) {
        throw new AppError("El proyecto seleccionado no pertenece al cliente indicado.", 400);
    }
    if (quotation && quotation.clientId !== derivedClientId) {
        throw new AppError("La cotizacion seleccionada no pertenece al cliente indicado.", 400);
    }
    if (quotation && project && quotation.projectId !== project.id) {
        throw new AppError("La cotizacion seleccionada no corresponde al proyecto indicado.", 400);
    }
    if (installation && project && installation.projectId && installation.projectId !== project.id) {
        throw new AppError("La instalacion seleccionada no corresponde al proyecto indicado.", 400);
    }
    if (installation &&
        quotation &&
        installation.quotationId &&
        installation.quotationId !== quotation.id) {
        throw new AppError("La instalacion seleccionada no corresponde a la cotizacion indicada.", 400);
    }
    const selectedWarranty = input.warrantyId
        ? await getProductWarrantyOrThrow(db, input.warrantyId)
        : await findApplicableWarranty(db, {
            clientId: derivedClientId,
            projectId: project?.id ?? null,
            reportedAt: input.reportedAt,
        });
    if (selectedWarranty) {
        if (selectedWarranty.client.id !== derivedClientId) {
            throw new AppError("La garantia seleccionada no pertenece al cliente indicado.", 400);
        }
        if (project && selectedWarranty.project?.id !== project.id) {
            throw new AppError("La garantia seleccionada no corresponde al proyecto indicado.", 400);
        }
    }
    if (input.type === "GARANTIA" &&
        !selectedWarranty &&
        !input.outsideWarranty) {
        throw new AppError("No existe una garantia vigente para la fecha reportada. Marca el caso como fuera de garantia si corresponde.", 400);
    }
    if (input.type === "GARANTIA" &&
        selectedWarranty &&
        !isWarrantyCurrent(selectedWarranty, input.reportedAt) &&
        !input.outsideWarranty) {
        throw new AppError("La garantia asociada ya no se encuentra vigente para la fecha reportada.", 400);
    }
    return {
        clientId: derivedClientId,
        installationId: installation?.id ?? input.installationId ?? null,
        projectId: project?.id ?? input.projectId ?? null,
        quotationId: quotation?.id ?? installation?.quotationId ?? input.quotationId ?? null,
        warrantyId: selectedWarranty?.id ?? null,
    };
};
const updateCaseStatusWithinTransaction = async (db, input) => {
    const currentCase = await db.postventaCase.findUnique({
        select: {
            closedAt: true,
            id: true,
            status: true,
        },
        where: {
            id: input.caseId,
        },
    });
    if (!currentCase) {
        throw new AppError("No se encontro el caso postventa solicitado.", 404);
    }
    if (currentCase.status === input.status) {
        return;
    }
    const allowedTransitions = POSTVENTA_STATUS_TRANSITIONS[currentCase.status] ?? [];
    if (!allowedTransitions.includes(input.status)) {
        throw new AppError("El cambio de estado solicitado no esta permitido para este caso.", 400);
    }
    await db.postventaCase.update({
        data: {
            closedAt: input.status === "CERRADO" ? new Date() : null,
            status: input.status,
        },
        where: {
            id: input.caseId,
        },
    });
    await db.postventaStatusHistory.create({
        data: {
            changedByUserId: input.changedByUserId,
            fromStatus: currentCase.status,
            metadataJson: input.metadata ?? PrismaNamespace.JsonNull,
            notes: input.notes ?? null,
            postventaCaseId: input.caseId,
            toStatus: input.status,
        },
    });
};
const getAutoStatusFromActivity = (input) => {
    if (input.type === "VISITA_REVISION" && input.scheduledAt && !input.executedAt) {
        return "VISITA_PROGRAMADA";
    }
    if (input.type === "REPUESTO" && !input.executedAt) {
        return "PENDIENTE_REPUESTO";
    }
    if ((input.type === "DIAGNOSTICO" ||
        input.type === "SOLUCION" ||
        input.type === "VISITA_REVISION") &&
        input.executedAt) {
        return "EN_ATENCION";
    }
    if (input.type === "CIERRE" && input.executedAt) {
        return "RESUELTO";
    }
    return null;
};
const buildCasesWhereClause = (query) => {
    const reportedAt = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
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
        ...(query.responsibleId
            ? {
                responsibleUserId: query.responsibleId,
            }
            : {}),
        ...(query.priority
            ? {
                priority: query.priority,
            }
            : {}),
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
        ...(reportedAt
            ? {
                reportedAt,
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
                        description: {
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
                    {
                        quotation: {
                            code: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        installation: {
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
const buildWarrantiesWhereClause = (query) => {
    const now = new Date();
    return {
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
        ...(query.vigente === true
            ? {
                endDate: {
                    gte: now,
                },
                startDate: {
                    lte: now,
                },
                status: {
                    not: "ANULADA",
                },
            }
            : {}),
        ...(query.vigente === false
            ? {
                OR: [
                    {
                        status: "ANULADA",
                    },
                    {
                        endDate: {
                            lt: now,
                        },
                    },
                ],
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        productType: {
                            contains: query.search,
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
                ],
            }
            : {}),
    };
};
export const postventaService = {
    async listCases(query) {
        const where = buildCasesWhereClause(query);
        const [rows, total] = await Promise.all([
            prisma.postventaCase.findMany({
                include: postventaCaseListInclude,
                orderBy: {
                    [query.sortBy]: query.sortDirection,
                },
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
            prisma.postventaCase.count({
                where,
            }),
        ]);
        return {
            data: rows.map(mapCaseListItem),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getCaseById(caseId) {
        const record = await prisma.postventaCase.findUnique({
            include: postventaCaseDetailInclude,
            where: {
                id: caseId,
            },
        });
        if (!record) {
            throw new AppError("No se encontro el caso postventa solicitado.", 404);
        }
        return mapCaseDetail(record);
    },
    async getWarrantyById(warrantyId) {
        const record = await getProductWarrantyOrThrow(prisma, warrantyId);
        return mapWarrantyRecord(record);
    },
    async getActivityById(activityId) {
        const record = await getPostventaActivityOrThrow(prisma, activityId);
        return mapActivityRecord(record);
    },
    async createCase(input, userId) {
        await ensureUserExists(prisma, input.responsibleId, "la asignacion del caso");
        let createdCaseId = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
            try {
                createdCaseId = await prisma.$transaction(async (db) => {
                    const context = await resolveCaseContext(db, input);
                    const code = await generatePostventaCaseCode(db, input.reportedAt);
                    const createdCase = await db.postventaCase.create({
                        data: {
                            caseType: input.type,
                            clientId: context.clientId,
                            code,
                            commitmentDate: input.commitmentDate,
                            createdByUserId: userId,
                            description: input.description.trim(),
                            installationId: context.installationId,
                            internalNotes: input.internalNotes,
                            outsideWarranty: input.outsideWarranty,
                            priority: input.priority,
                            projectId: context.projectId,
                            proposedSolution: input.proposedSolution,
                            quotationId: context.quotationId,
                            reportedAt: input.reportedAt,
                            responsibleUserId: input.responsibleId,
                            status: "REPORTADO",
                            warrantyId: context.warrantyId,
                        },
                        select: {
                            id: true,
                        },
                    });
                    await db.postventaStatusHistory.create({
                        data: {
                            changedByUserId: userId,
                            fromStatus: null,
                            metadataJson: {
                                createdFrom: input.installationId
                                    ? "instalacion"
                                    : input.projectId
                                        ? "proyecto"
                                        : input.clientId
                                            ? "cliente"
                                            : "manual",
                            },
                            notes: "Caso postventa registrado.",
                            postventaCaseId: createdCase.id,
                            toStatus: "REPORTADO",
                        },
                    });
                    return createdCase.id;
                });
                break;
            }
            catch (error) {
                if (error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
                    error.code === "P2002") {
                    continue;
                }
                throw error;
            }
        }
        if (!createdCaseId) {
            throw new AppError("No se pudo generar un codigo unico para el caso postventa.", 500);
        }
        return this.getCaseById(createdCaseId);
    },
    async createCaseFromClient(clientId, input, userId) {
        return this.createCase({
            ...input,
            clientId,
        }, userId);
    },
    async createCaseFromProject(projectId, input, userId) {
        return this.createCase({
            ...input,
            projectId,
        }, userId);
    },
    async createCaseFromInstallation(installationId, input, userId) {
        return this.createCase({
            ...input,
            installationId,
        }, userId);
    },
    async updateCase(caseId, input) {
        const currentCase = await getPostventaCaseOrThrow(prisma, caseId);
        if (input.warrantyId) {
            const warranty = await getProductWarrantyOrThrow(prisma, input.warrantyId);
            if (warranty.client.id !== currentCase.client.id) {
                throw new AppError("La garantia seleccionada no pertenece al cliente del caso.", 400);
            }
            if (currentCase.project && warranty.project?.id !== currentCase.project.id) {
                throw new AppError("La garantia seleccionada no corresponde al proyecto del caso.", 400);
            }
        }
        await prisma.postventaCase.update({
            data: {
                ...(input.commitmentDate !== undefined
                    ? {
                        commitmentDate: input.commitmentDate,
                    }
                    : {}),
                ...(input.description !== undefined
                    ? {
                        description: input.description,
                    }
                    : {}),
                ...(input.internalNotes !== undefined
                    ? {
                        internalNotes: input.internalNotes,
                    }
                    : {}),
                ...(input.outsideWarranty !== undefined
                    ? {
                        outsideWarranty: input.outsideWarranty,
                    }
                    : {}),
                ...(input.priority !== undefined
                    ? {
                        priority: input.priority,
                    }
                    : {}),
                ...(input.proposedSolution !== undefined
                    ? {
                        proposedSolution: input.proposedSolution,
                    }
                    : {}),
                ...(input.type !== undefined
                    ? {
                        caseType: input.type,
                    }
                    : {}),
                ...(input.warrantyId !== undefined
                    ? {
                        warrantyId: input.warrantyId,
                    }
                    : {}),
            },
            where: {
                id: caseId,
            },
        });
        return this.getCaseById(caseId);
    },
    async assignCase(caseId, input) {
        await getPostventaCaseOrThrow(prisma, caseId);
        await ensureUserExists(prisma, input.responsibleId, "la asignacion del caso");
        await prisma.postventaCase.update({
            data: {
                responsibleUserId: input.responsibleId,
            },
            where: {
                id: caseId,
            },
        });
        return this.getCaseById(caseId);
    },
    async changeCaseStatus(caseId, input, userId) {
        await prisma.$transaction(async (db) => {
            await updateCaseStatusWithinTransaction(db, {
                caseId,
                changedByUserId: userId,
                notes: input.notes,
                status: input.status,
            });
        });
        return this.getCaseById(caseId);
    },
    async closeCase(caseId, input, userId) {
        await prisma.$transaction(async (db) => {
            await db.postventaCase.update({
                data: {
                    ...(input.proposedSolution !== null && input.proposedSolution !== undefined
                        ? {
                            proposedSolution: input.proposedSolution,
                        }
                        : {}),
                },
                where: {
                    id: caseId,
                },
            });
            await updateCaseStatusWithinTransaction(db, {
                caseId,
                changedByUserId: userId,
                notes: input.notes ?? "Caso postventa cerrado.",
                status: "CERRADO",
            });
        });
        return this.getCaseById(caseId);
    },
    async listWarranties(query) {
        const where = buildWarrantiesWhereClause(query);
        const [rows, total] = await Promise.all([
            prisma.productWarranty.findMany({
                include: productWarrantyInclude,
                orderBy: {
                    [query.sortBy]: query.sortDirection,
                },
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
            prisma.productWarranty.count({
                where,
            }),
        ]);
        return {
            data: rows.map(mapWarrantyRecord),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async createWarranty(input) {
        const project = await ensureProjectExists(prisma, input.projectId);
        const clientId = input.clientId ?? project.clientId;
        if (clientId !== project.clientId) {
            throw new AppError("La garantia debe asociarse al mismo cliente del proyecto.", 400);
        }
        const created = await prisma.productWarranty.create({
            data: {
                clientId,
                conditions: input.conditions,
                endDate: input.endDate,
                productType: input.productType.trim(),
                projectId: input.projectId,
                startDate: input.startDate,
                status: normalizeWarrantyStatus(input.status, input.endDate),
            },
            include: productWarrantyInclude,
        });
        return mapWarrantyRecord(created);
    },
    async updateWarranty(warrantyId, input) {
        const current = await getProductWarrantyOrThrow(prisma, warrantyId);
        const projectId = input.projectId ?? current.project.id;
        const project = await ensureProjectExists(prisma, projectId);
        const clientId = input.clientId ?? current.client.id;
        if (clientId !== project.clientId) {
            throw new AppError("La garantia debe asociarse al mismo cliente del proyecto.", 400);
        }
        const updated = await prisma.productWarranty.update({
            data: {
                ...(input.conditions !== undefined
                    ? {
                        conditions: input.conditions,
                    }
                    : {}),
                ...(input.endDate !== undefined
                    ? {
                        endDate: input.endDate,
                    }
                    : {}),
                ...(input.productType !== undefined
                    ? {
                        productType: input.productType.trim(),
                    }
                    : {}),
                ...(input.projectId !== undefined
                    ? {
                        projectId: input.projectId,
                    }
                    : {}),
                ...(input.startDate !== undefined
                    ? {
                        startDate: input.startDate,
                    }
                    : {}),
                status: normalizeWarrantyStatus(input.status ?? current.status, input.endDate ?? current.endDate),
                clientId,
            },
            include: productWarrantyInclude,
            where: {
                id: warrantyId,
            },
        });
        return mapWarrantyRecord(updated);
    },
    async createActivity(caseId, input, userId) {
        await getPostventaCaseOrThrow(prisma, caseId);
        await ensureUserExists(prisma, input.responsibleId, "la actividad postventa");
        await prisma.$transaction(async (db) => {
            const activityStatus = input.status ??
                (input.executedAt
                    ? "EJECUTADA"
                    : input.scheduledAt
                        ? "PROGRAMADA"
                        : "PENDIENTE");
            await db.postventaActivity.create({
                data: {
                    activityType: input.type,
                    description: input.description.trim(),
                    executedAt: input.executedAt,
                    postventaCaseId: caseId,
                    responsibleUserId: input.responsibleId,
                    scheduledAt: input.scheduledAt,
                    status: activityStatus,
                },
            });
            const autoStatus = getAutoStatusFromActivity({
                executedAt: input.executedAt,
                scheduledAt: input.scheduledAt,
                type: input.type,
            });
            if (autoStatus) {
                const currentCase = await db.postventaCase.findUnique({
                    select: {
                        status: true,
                    },
                    where: {
                        id: caseId,
                    },
                });
                if (currentCase &&
                    autoStatus !== currentCase.status &&
                    (POSTVENTA_STATUS_TRANSITIONS[currentCase.status] ?? []).includes(autoStatus)) {
                    await updateCaseStatusWithinTransaction(db, {
                        caseId,
                        changedByUserId: userId,
                        notes: `Estado actualizado automaticamente por la actividad ${input.type.toLowerCase()}.`,
                        status: autoStatus,
                    });
                }
            }
        });
        return this.getCaseById(caseId);
    },
    async updateActivity(activityId, input, userId) {
        const current = await getPostventaActivityOrThrow(prisma, activityId);
        await ensureUserExists(prisma, input.responsibleId ?? current.responsibleUser?.id ?? null, "la actividad postventa");
        await prisma.$transaction(async (db) => {
            await db.postventaActivity.update({
                data: {
                    ...(input.description !== undefined
                        ? {
                            description: input.description,
                        }
                        : {}),
                    ...(input.executedAt !== undefined
                        ? {
                            executedAt: input.executedAt,
                        }
                        : {}),
                    ...(input.responsibleId !== undefined
                        ? {
                            responsibleUserId: input.responsibleId,
                        }
                        : {}),
                    ...(input.scheduledAt !== undefined
                        ? {
                            scheduledAt: input.scheduledAt,
                        }
                        : {}),
                    ...(input.status !== undefined
                        ? {
                            status: input.status,
                        }
                        : {}),
                    ...(input.type !== undefined
                        ? {
                            activityType: input.type,
                        }
                        : {}),
                },
                where: {
                    id: activityId,
                },
            });
            const autoStatus = getAutoStatusFromActivity({
                executedAt: input.executedAt ?? current.executedAt,
                scheduledAt: input.scheduledAt ?? current.scheduledAt,
                type: input.type ?? current.activityType,
            });
            if (autoStatus) {
                const currentCase = await db.postventaCase.findUnique({
                    select: {
                        status: true,
                    },
                    where: {
                        id: current.postventaCaseId,
                    },
                });
                if (currentCase &&
                    autoStatus !== currentCase.status &&
                    (POSTVENTA_STATUS_TRANSITIONS[currentCase.status] ?? []).includes(autoStatus)) {
                    await updateCaseStatusWithinTransaction(db, {
                        caseId: current.postventaCaseId,
                        changedByUserId: userId,
                        notes: "Estado actualizado automaticamente por cambios en la actividad.",
                        status: autoStatus,
                    });
                }
            }
        });
        return this.getCaseById(current.postventaCaseId);
    },
    async createEvidence(caseId, metadata, file, userId) {
        const currentCase = await getPostventaCaseOrThrow(prisma, caseId);
        if (metadata.activityId) {
            const activity = await getPostventaActivityOrThrow(prisma, metadata.activityId);
            if (activity.postventaCaseId !== caseId) {
                throw new AppError("La actividad seleccionada no pertenece al caso postventa indicado.", 400);
            }
        }
        const extension = path.extname(file.originalName || metadata.originalName).slice(0, 12);
        const storedFileName = `${randomUUID()}${extension ? extension : ""}`;
        const filePath = path.join(postventaEvidenceUploadsDir, storedFileName);
        await writeFile(filePath, file.buffer);
        await prisma.postventaEvidence.create({
            data: {
                description: metadata.description,
                evidenceType: metadata.type,
                fileName: metadata.originalName,
                fileUrl: buildPostventaEvidenceUrl(storedFileName),
                mimeType: metadata.mimetype ?? file.mimetype,
                postventaActivityId: metadata.activityId,
                postventaCaseId: caseId,
                sizeBytes: file.size,
                uploadedByUserId: userId,
            },
        });
        return this.getCaseById(currentCase.id);
    },
    async createCost(caseId, input) {
        await getPostventaCaseOrThrow(prisma, caseId);
        await prisma.postventaCost.create({
            data: {
                amount: new PrismaNamespace.Decimal(input.amount),
                category: input.category,
                costDate: input.costDate,
                description: input.description.trim(),
                origin: input.origin,
                postventaCaseId: caseId,
                referenceId: input.referenceId,
            },
        });
        return this.getCaseById(caseId);
    },
    async createInventoryReservation(caseId, input, userId) {
        const currentCase = await getPostventaCaseOrThrow(prisma, caseId);
        if (!currentCase.project && !currentCase.quotation) {
            throw new AppError("Para reservar repuestos debes asociar el caso a un proyecto o una cotizacion.", 400);
        }
        try {
            const reservation = input.reservationType === "SOFT"
                ? await inventoryService.createSoftReservation({
                    expiresAt: input.expiresAt,
                    inventoryStockId: input.inventoryStockId ?? undefined,
                    materialId: input.materialId,
                    projectId: currentCase.project?.id ?? undefined,
                    quantity: input.quantity,
                    quotationId: currentCase.quotation?.id ?? undefined,
                    unit: input.unit,
                    warehouseId: input.warehouseId,
                }, userId)
                : await inventoryService.createFirmReservation({
                    expiresAt: input.expiresAt,
                    inventoryStockId: input.inventoryStockId ?? undefined,
                    materialId: input.materialId,
                    projectId: currentCase.project?.id ?? undefined,
                    quantity: input.quantity,
                    quotationId: currentCase.quotation?.id ?? undefined,
                    unit: input.unit,
                    warehouseId: input.warehouseId,
                }, userId);
            await prisma.postventaInventoryReservation.create({
                data: {
                    createdByUserId: userId,
                    inventoryReservationId: reservation.id,
                    notes: input.notes,
                    postventaCaseId: caseId,
                },
            });
        }
        catch (error) {
            if (error instanceof AppError) {
                throw new AppError("No se pudo reservar el repuesto solicitado. Verifica disponibilidad, almacen y cantidad.", error.statusCode);
            }
            throw error;
        }
        return this.getCaseById(caseId);
    },
    async consumeInventoryReservation(reservationLinkId, input, userId) {
        const link = await getPostventaReservationLinkOrThrow(prisma, reservationLinkId);
        try {
            const reservation = await inventoryService.consumeReservation(link.inventoryReservation.id, userId);
            const cost = await prisma.postventaCost.create({
                data: {
                    amount: new PrismaNamespace.Decimal(input.amount),
                    category: input.category,
                    costDate: input.costDate,
                    description: input.description.trim(),
                    origin: "INVENTARIO",
                    postventaCaseId: link.postventaCaseId,
                    referenceId: reservation.id,
                },
            });
            return {
                cost: mapCostRecord({
                    amount: cost.amount,
                    category: cost.category,
                    costDate: cost.costDate,
                    description: cost.description,
                    id: cost.id,
                    origin: cost.origin,
                    postventaCaseId: cost.postventaCaseId,
                    referenceId: cost.referenceId,
                }),
                reservation,
            };
        }
        catch (error) {
            if (error instanceof AppError) {
                throw new AppError("No se pudo registrar el consumo de la reserva vinculada al caso.", error.statusCode);
            }
            throw error;
        }
    },
    async releaseInventoryReservation(reservationLinkId, userId) {
        const link = await getPostventaReservationLinkOrThrow(prisma, reservationLinkId);
        try {
            return await inventoryService.releaseReservation(link.inventoryReservation.id, userId);
        }
        catch (error) {
            if (error instanceof AppError) {
                throw new AppError("No se pudo liberar la reserva vinculada al caso postventa.", error.statusCode);
            }
            throw error;
        }
    },
};
//# sourceMappingURL=postventa.service.js.map