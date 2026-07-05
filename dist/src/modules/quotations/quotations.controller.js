import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { QUOTATION_ENTITY_TYPES, QUOTATION_PERMISSIONS, QUOTATIONS_API_PATH, QUOTATION_PDF_EXPORT_TODO_MESSAGE, } from "./quotations.constants.js";
import { quotationsService } from "./quotations.service.js";
import { addManualMaterialItemSchema, addManualServiceItemSchema, addTemplateQuotationItemSchema, changeQuotationStatusSchema, listQuotationsQuerySchema, quotationDecisionSchema, quotationIdParamSchema, quotationItemIdParamSchema, quotationMutationSchema, submitQuotationApprovalSchema, updateQuotationItemSchema, } from "./quotations.validators.js";
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
const getRequiredQuotationId = (value) => {
    const quotationId = Array.isArray(value) ? value[0] : value;
    if (!quotationId) {
        throw new AppError("Quotation id is required.", 400);
    }
    return quotationIdParamSchema.parse({
        id: quotationId,
    }).id;
};
const getRequiredQuotationItemId = (value) => {
    const itemId = Array.isArray(value) ? value[0] : value;
    if (!itemId) {
        throw new AppError("Quotation item id is required.", 400);
    }
    return quotationItemIdParamSchema.parse({
        itemId,
    }).itemId;
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
const canViewCosts = (request) => request.authorizationSummary?.permissions.includes(QUOTATION_PERMISSIONS.viewCost) ?? false;
const canOverrideCosts = (request) => request.authorizationSummary?.permissions.includes(QUOTATION_PERMISSIONS.overrideCost) ?? false;
const canApprove = (request) => request.authorizationSummary?.permissions.includes(QUOTATION_PERMISSIONS.approve) ?? false;
const canSend = (request) => request.authorizationSummary?.permissions.includes(QUOTATION_PERMISSIONS.send) ?? false;
export const quotationsController = {
    async listQuotations(request, response) {
        const query = listQuotationsQuerySchema.parse({
            clientId: getQueryValue(request.query["filter.clientId"]),
            dateFrom: getQueryValue(request.query.dateFrom),
            dateTo: getQueryValue(request.query.dateTo),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            projectId: getQueryValue(request.query["filter.projectId"]),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await quotationsService.listQuotations(query, {
            canViewCost: canViewCosts(request),
        });
        sendPaginated(response, result.data, result.pagination);
    },
    async getQuotationById(request, response) {
        const quotation = await quotationsService.getQuotationById(getRequiredQuotationId(request.params.id), {
            canViewCost: canViewCosts(request),
        });
        sendSuccess(response, quotation);
    },
    async createQuotation(request, response) {
        const payload = quotationMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const quotation = await quotationsService.createQuotation(payload, actorContext.userId ?? null, {
            canViewCost: canViewCosts(request),
        });
        await logAuditEvent(request, {
            action: "quotation.created",
            after: quotation,
            before: null,
            entityId: quotation.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: quotation.code,
            },
        });
        sendSuccess(response, quotation, 201);
    },
    async updateQuotation(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = quotationMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const result = await quotationsService.updateQuotation(quotationId, payload, {
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.updated",
            after: result.current,
            before: result.previous,
            entityId: result.current.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: result.current.code,
            },
        });
        sendSuccess(response, result.current);
    },
    async deleteQuotation(request, response) {
        const quotation = await quotationsService.deleteQuotation(getRequiredQuotationId(request.params.id));
        await logAuditEvent(request, {
            action: "quotation.deleted",
            after: null,
            before: quotation,
            entityId: quotation.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: quotation.code,
            },
        });
        sendSuccess(response, {
            deleted: true,
            id: quotation.id,
        });
    },
    async addTemplateItem(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = addTemplateQuotationItemSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const result = await quotationsService.addTemplateQuotationItem(quotationId, payload, actorContext.userId ?? null, {
            canViewCost: canViewCosts(request),
        });
        await logAuditEvent(request, {
            action: "quotation.item.added",
            after: result.item,
            before: null,
            entityId: result.item.id,
            entityType: QUOTATION_ENTITY_TYPES.item,
            metadata: {
                quotationId: result.quotation.id,
                quotationCode: result.quotation.code,
            },
        });
        sendSuccess(response, result.quotation, 201);
    },
    async addManualMaterialItem(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = addManualMaterialItemSchema.parse(request.body);
        const result = await quotationsService.addManualMaterialItem(quotationId, payload, {
            canViewCost: canViewCosts(request),
        });
        await logAuditEvent(request, {
            action: "quotation.item.added",
            after: result.item,
            before: null,
            entityId: result.item.id,
            entityType: QUOTATION_ENTITY_TYPES.item,
            metadata: {
                quotationId: result.quotation.id,
                quotationCode: result.quotation.code,
            },
        });
        sendSuccess(response, result.quotation, 201);
    },
    async addManualServiceItem(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = addManualServiceItemSchema.parse(request.body);
        const result = await quotationsService.addManualServiceItem(quotationId, payload, {
            canViewCost: canViewCosts(request),
        });
        await logAuditEvent(request, {
            action: "quotation.item.added",
            after: result.item,
            before: null,
            entityId: result.item.id,
            entityType: QUOTATION_ENTITY_TYPES.item,
            metadata: {
                quotationId: result.quotation.id,
                quotationCode: result.quotation.code,
            },
        });
        sendSuccess(response, result.quotation, 201);
    },
    async updateQuotationItem(request, response) {
        const itemId = getRequiredQuotationItemId(request.params.itemId);
        const payload = updateQuotationItemSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const result = await quotationsService.updateQuotationItem(itemId, payload, {
            canOverrideCost: canOverrideCosts(request),
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.item.updated",
            after: result.current,
            before: result.previous,
            entityId: result.current.id,
            entityType: QUOTATION_ENTITY_TYPES.item,
            metadata: {
                quotationId: result.quotation.id,
                quotationCode: result.quotation.code,
            },
        });
        sendSuccess(response, result.quotation);
    },
    async deleteQuotationItem(request, response) {
        const itemId = getRequiredQuotationItemId(request.params.itemId);
        const result = await quotationsService.deleteQuotationItem(itemId, {
            canViewCost: canViewCosts(request),
        });
        await logAuditEvent(request, {
            action: "quotation.item.deleted",
            after: null,
            before: result.deleted,
            entityId: result.deleted.id,
            entityType: QUOTATION_ENTITY_TYPES.item,
            metadata: {
                quotationId: result.quotation.id,
                quotationCode: result.quotation.code,
            },
        });
        sendSuccess(response, result.quotation);
    },
    async recalculateQuotation(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const actorContext = getRequestLogActorContext(request);
        const quotation = await quotationsService.recalculateQuotation(quotationId, {
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.recalculated",
            after: quotation,
            before: null,
            entityId: quotation.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: quotation.code,
            },
        });
        sendSuccess(response, quotation);
    },
    async createQuotationVersion(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const actorContext = getRequestLogActorContext(request);
        const version = await quotationsService.createQuotationVersion(quotationId, {
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.version.created",
            after: version,
            before: null,
            entityId: version.id,
            entityType: QUOTATION_ENTITY_TYPES.version,
            metadata: {
                quotationId,
                versionNumber: version.versionNumber,
            },
        });
        sendSuccess(response, version, 201);
    },
    async submitQuotationForApproval(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = submitQuotationApprovalSchema.parse(request.body ?? {});
        const actorContext = getRequestLogActorContext(request);
        const result = await quotationsService.submitQuotationForApproval(quotationId, payload, {
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.submitted_for_approval",
            after: result.quotation,
            before: null,
            entityId: result.quotation.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: result.quotation.code,
                evaluation: result.evaluation,
            },
        });
        sendSuccess(response, {
            evaluation: result.evaluation,
            quotation: result.quotation,
        });
    },
    async approveQuotation(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = quotationDecisionSchema.parse(request.body ?? {});
        const actorContext = getRequestLogActorContext(request);
        const quotation = await quotationsService.approveQuotation(quotationId, payload.decisionNotes, {
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.approved",
            after: quotation,
            before: null,
            entityId: quotation.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: quotation.code,
            },
        });
        sendSuccess(response, quotation);
    },
    async rejectQuotation(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = quotationDecisionSchema.parse(request.body ?? {});
        const actorContext = getRequestLogActorContext(request);
        const quotation = await quotationsService.rejectQuotation(quotationId, payload.decisionNotes, {
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.rejected",
            after: quotation,
            before: null,
            entityId: quotation.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: quotation.code,
            },
        });
        sendSuccess(response, quotation);
    },
    async changeQuotationStatus(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = changeQuotationStatusSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const result = await quotationsService.changeQuotationStatus(quotationId, payload, {
            canApprove: canApprove(request),
            canSend: canSend(request),
            canViewCost: canViewCosts(request),
            userId: actorContext.userId ?? null,
        });
        await logAuditEvent(request, {
            action: "quotation.status.changed",
            after: result.historyEntry,
            before: null,
            entityId: result.historyEntry.id,
            entityType: QUOTATION_ENTITY_TYPES.statusHistory,
            metadata: {
                quotationId: result.quotation.id,
                quotationCode: result.quotation.code,
            },
        });
        sendSuccess(response, result.quotation);
    },
    async listQuotationVersions(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const versions = await quotationsService.listQuotationVersions(quotationId, {
            canViewCost: canViewCosts(request),
        });
        sendSuccess(response, versions);
    },
    async listQuotationApprovals(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const approvals = await quotationsService.listQuotationApprovals(quotationId);
        sendSuccess(response, approvals);
    },
    async listPendingApprovals(_request, response) {
        const approvals = await quotationsService.listPendingApprovals();
        sendSuccess(response, approvals);
    },
    async exportQuotationPdf(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const quotation = await quotationsService.getQuotationById(quotationId, {
            canViewCost: canViewCosts(request),
        });
        const exportPayload = {
            message: QUOTATION_PDF_EXPORT_TODO_MESSAGE,
            quotationId: quotation.id,
            route: `${QUOTATIONS_API_PATH}/${quotation.id}`,
        };
        await logAuditEvent(request, {
            action: "quotation.exported",
            after: exportPayload,
            before: null,
            entityId: quotation.id,
            entityType: QUOTATION_ENTITY_TYPES.quotation,
            metadata: {
                code: quotation.code,
                placeholder: true,
            },
        });
        sendSuccess(response, exportPayload);
    },
};
//# sourceMappingURL=quotations.controller.js.map