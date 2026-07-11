import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { GARANTIAS_PERMISSIONS, POSTVENTA_ENTITY_TYPES, POSTVENTA_PERMISSIONS, } from "./postventa.constants.js";
import { postventaService } from "./postventa.service.js";
import { assignPostventaCaseSchema, changePostventaCaseStatusSchema, clientIdParamSchema, closePostventaCaseSchema, consumePostventaReservationSchema, createPostventaActivitySchema, createPostventaCaseSchema, createPostventaCostSchema, createPostventaReservationSchema, createProductWarrantySchema, installationIdParamSchema, listPostventaCasesQuerySchema, listProductWarrantiesQuerySchema, postventaActivityIdParamSchema, postventaCaseIdParamSchema, postventaEvidenceMetadataSchema, postventaReservationLinkIdParamSchema, productWarrantyIdParamSchema, projectIdParamSchema, updatePostventaActivitySchema, updatePostventaCaseSchema, updateProductWarrantySchema, } from "./postventa.validators.js";
const getQueryValue = (value) => {
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        const firstValue = value[0];
        if (typeof firstValue === "string") {
            return firstValue;
        }
    }
    return undefined;
};
const getActorUserId = (request) => {
    return getRequestLogActorContext(request).userId ?? null;
};
const logActivityEvent = async (request, input) => {
    const actorContext = getRequestLogActorContext(request);
    await activityLogService.logUserAction({
        ...actorContext,
        action: input.action,
        entityId: input.entityId,
        entityType: input.entityType,
        metadata: input.metadata,
    });
};
const logAuditEvent = async (request, input) => {
    const actorContext = getRequestLogActorContext(request);
    await auditLogService.create({
        action: input.action,
        actorUserId: actorContext.userId,
        after: input.after,
        before: input.before,
        entityId: input.entityId,
        entityType: input.entityType,
        ipAddress: actorContext.ipAddress,
        metadata: input.metadata,
        userAgent: actorContext.userAgent,
    });
};
export const postventaController = {
    async listCases(request, response) {
        const query = listPostventaCasesQuerySchema.parse({
            clientId: getQueryValue(request.query["filter.clientId"]),
            dateFrom: getQueryValue(request.query.dateFrom),
            dateTo: getQueryValue(request.query.dateTo),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            priority: getQueryValue(request.query["filter.priority"]),
            projectId: getQueryValue(request.query["filter.projectId"]),
            responsibleId: getQueryValue(request.query["filter.responsibleId"]),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await postventaService.listCases(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async getCaseById(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const result = await postventaService.getCaseById(id);
        sendSuccess(response, result);
    },
    async createCase(request, response) {
        const payload = createPostventaCaseSchema.parse(request.body);
        const result = await postventaService.createCase(payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.crear,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                codigo: result.code,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_case.created",
            after: result,
            before: null,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                codigo: result.code,
            },
        });
        sendSuccess(response, result, 201);
    },
    async createCaseFromClient(request, response) {
        const payload = createPostventaCaseSchema.parse(request.body);
        const { clientId } = clientIdParamSchema.parse(request.params);
        const result = await postventaService.createCaseFromClient(clientId, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.crear,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                clientId,
                codigo: result.code,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_case.created_from_client",
            after: result,
            before: null,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                clientId,
                codigo: result.code,
            },
        });
        sendSuccess(response, result, 201);
    },
    async createCaseFromProject(request, response) {
        const payload = createPostventaCaseSchema.parse(request.body);
        const { projectId } = projectIdParamSchema.parse(request.params);
        const result = await postventaService.createCaseFromProject(projectId, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.crear,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                codigo: result.code,
                projectId,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_case.created_from_project",
            after: result,
            before: null,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                codigo: result.code,
                projectId,
            },
        });
        sendSuccess(response, result, 201);
    },
    async createCaseFromInstallation(request, response) {
        const payload = createPostventaCaseSchema.parse(request.body);
        const { installationId } = installationIdParamSchema.parse(request.params);
        const result = await postventaService.createCaseFromInstallation(installationId, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.crear,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                codigo: result.code,
                installationId,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_case.created_from_installation",
            after: result,
            before: null,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                codigo: result.code,
                installationId,
            },
        });
        sendSuccess(response, result, 201);
    },
    async updateCase(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const before = await postventaService.getCaseById(id);
        const payload = updatePostventaCaseSchema.parse(request.body);
        const result = await postventaService.updateCase(id, payload);
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
        });
        await logAuditEvent(request, {
            action: "postventa_case.updated",
            after: result,
            before,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
        });
        sendSuccess(response, result);
    },
    async assignCase(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const before = await postventaService.getCaseById(id);
        const payload = assignPostventaCaseSchema.parse(request.body);
        const result = await postventaService.assignCase(id, payload);
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.asignar,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                responsibleId: payload.responsibleId,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_case.assigned",
            after: result,
            before,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                responsibleId: payload.responsibleId,
            },
        });
        sendSuccess(response, result);
    },
    async changeCaseStatus(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const before = await postventaService.getCaseById(id);
        const payload = changePostventaCaseStatusSchema.parse(request.body);
        const result = await postventaService.changeCaseStatus(id, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.historialEstado,
            metadata: {
                estado: payload.status,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_case.status_changed",
            after: result,
            before,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
            metadata: {
                estado: payload.status,
            },
        });
        sendSuccess(response, result);
    },
    async closeCase(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const before = await postventaService.getCaseById(id);
        const payload = closePostventaCaseSchema.parse(request.body);
        const result = await postventaService.closeCase(id, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.cerrar,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
        });
        await logAuditEvent(request, {
            action: "postventa_case.closed",
            after: result,
            before,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.caso,
        });
        sendSuccess(response, result);
    },
    async listWarranties(request, response) {
        const query = listProductWarrantiesQuerySchema.parse({
            clientId: getQueryValue(request.query["filter.clientId"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            projectId: getQueryValue(request.query["filter.projectId"]),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
            vigente: getQueryValue(request.query["filter.vigente"]),
        });
        const result = await postventaService.listWarranties(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async createWarranty(request, response) {
        const payload = createProductWarrantySchema.parse(request.body);
        const result = await postventaService.createWarranty(payload);
        await logActivityEvent(request, {
            action: GARANTIAS_PERMISSIONS.crear,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.garantia,
            metadata: {
                proyectoId: result.project?.id ?? null,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_warranty.created",
            after: result,
            before: null,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.garantia,
        });
        sendSuccess(response, result, 201);
    },
    async updateWarranty(request, response) {
        const { warrantyId } = productWarrantyIdParamSchema.parse(request.params);
        const before = await postventaService.getWarrantyById(warrantyId);
        const payload = updateProductWarrantySchema.parse(request.body);
        const result = await postventaService.updateWarranty(warrantyId, payload);
        await logActivityEvent(request, {
            action: GARANTIAS_PERMISSIONS.actualizar,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.garantia,
        });
        await logAuditEvent(request, {
            action: "postventa_warranty.updated",
            after: result,
            before,
            entityId: result.id,
            entityType: POSTVENTA_ENTITY_TYPES.garantia,
        });
        sendSuccess(response, result);
    },
    async createActivity(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const payload = createPostventaActivitySchema.parse(request.body);
        const result = await postventaService.createActivity(id, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.actividad,
            metadata: {
                tipo: payload.type,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_activity.created",
            after: result,
            before: null,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.actividad,
            metadata: {
                tipo: payload.type,
            },
        });
        sendSuccess(response, result, 201);
    },
    async updateActivity(request, response) {
        const { activityId } = postventaActivityIdParamSchema.parse(request.params);
        const payload = updatePostventaActivitySchema.parse(request.body);
        const before = await postventaService.getActivityById(activityId);
        const result = await postventaService.updateActivity(activityId, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: activityId,
            entityType: POSTVENTA_ENTITY_TYPES.actividad,
        });
        await logAuditEvent(request, {
            action: "postventa_activity.updated",
            after: result,
            before,
            entityId: activityId,
            entityType: POSTVENTA_ENTITY_TYPES.actividad,
        });
        sendSuccess(response, result);
    },
    async createEvidence(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        if (!request.file) {
            throw new AppError("Debes adjuntar un archivo como evidencia.", 400);
        }
        const payload = postventaEvidenceMetadataSchema.parse({
            activityId: request.body.activityId,
            description: request.body.description,
            mimetype: request.file.mimetype ?? request.body.mimetype,
            originalName: request.file.originalname ?? request.body.originalName,
            size: request.file.size ?? request.body.size,
            type: request.body.type,
        });
        const result = await postventaService.createEvidence(id, payload, {
            buffer: request.file.buffer,
            mimetype: request.file.mimetype,
            originalName: request.file.originalname,
            size: request.file.size,
        }, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.evidencia,
            metadata: {
                tipo: payload.type,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_evidence.created",
            after: result,
            before: null,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.evidencia,
            metadata: {
                tipo: payload.type,
            },
        });
        sendSuccess(response, result, 201);
    },
    async createCost(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const payload = createPostventaCostSchema.parse(request.body);
        const before = await postventaService.getCaseById(id);
        const result = await postventaService.createCost(id, payload);
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.costo,
            metadata: {
                categoria: payload.category,
                monto: payload.amount,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_cost.created",
            after: result,
            before,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.costo,
            metadata: {
                categoria: payload.category,
                monto: payload.amount,
            },
        });
        sendSuccess(response, result, 201);
    },
    async createReservation(request, response) {
        const { id } = postventaCaseIdParamSchema.parse(request.params);
        const payload = createPostventaReservationSchema.parse(request.body);
        const before = await postventaService.getCaseById(id);
        const result = await postventaService.createInventoryReservation(id, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.reserva,
            metadata: {
                materialId: payload.materialId,
                tipoReserva: payload.reservationType,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_reservation.created",
            after: result,
            before,
            entityId: id,
            entityType: POSTVENTA_ENTITY_TYPES.reserva,
            metadata: {
                materialId: payload.materialId,
                tipoReserva: payload.reservationType,
            },
        });
        sendSuccess(response, result, 201);
    },
    async consumeReservation(request, response) {
        const { reservationLinkId } = postventaReservationLinkIdParamSchema.parse(request.params);
        const payload = consumePostventaReservationSchema.parse(request.body);
        const result = await postventaService.consumeInventoryReservation(reservationLinkId, payload, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: reservationLinkId,
            entityType: POSTVENTA_ENTITY_TYPES.reserva,
            metadata: {
                categoria: payload.category,
                monto: payload.amount,
            },
        });
        await logAuditEvent(request, {
            action: "postventa_reservation.consumed",
            after: result,
            before: null,
            entityId: reservationLinkId,
            entityType: POSTVENTA_ENTITY_TYPES.reserva,
            metadata: {
                categoria: payload.category,
                monto: payload.amount,
            },
        });
        sendSuccess(response, result);
    },
    async releaseReservation(request, response) {
        const { reservationLinkId } = postventaReservationLinkIdParamSchema.parse(request.params);
        const result = await postventaService.releaseInventoryReservation(reservationLinkId, getActorUserId(request));
        await logActivityEvent(request, {
            action: POSTVENTA_PERMISSIONS.actualizar,
            entityId: reservationLinkId,
            entityType: POSTVENTA_ENTITY_TYPES.reserva,
        });
        await logAuditEvent(request, {
            action: "postventa_reservation.released",
            after: result,
            before: null,
            entityId: reservationLinkId,
            entityType: POSTVENTA_ENTITY_TYPES.reserva,
        });
        sendSuccess(response, result);
    },
};
//# sourceMappingURL=postventa.controller.js.map