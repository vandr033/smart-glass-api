import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { PRODUCT_TEMPLATE_ENTITY_TYPES } from "./product-templates.constants.js";
import { productTemplatesService } from "./product-templates.service.js";
import { createProductTemplateSchema, createProductTemplateVersionSchema, listProductTemplateSimulationsQuerySchema, listProductTemplatesQuerySchema, productTemplateIdParamSchema, productTemplateVersionIdParamSchema, simulateProductTemplateSchema, updateProductTemplateRulesSchema, updateProductTemplateSchema, updateProductTemplateVersionSchema, } from "./product-templates.validators.js";
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
const getRequiredTemplateId = (value) => {
    const templateId = Array.isArray(value) ? value[0] : value;
    if (!templateId) {
        throw new AppError("Product template id is required.", 400);
    }
    return productTemplateIdParamSchema.parse({
        id: templateId,
    }).id;
};
const getRequiredVersionId = (value) => {
    const versionId = Array.isArray(value) ? value[0] : value;
    if (!versionId) {
        throw new AppError("Product template version id is required.", 400);
    }
    return productTemplateVersionIdParamSchema.parse({
        versionId,
    }).versionId;
};
const logActivity = async (request, input) => {
    const actorContext = getRequestLogActorContext(request);
    await activityLogService.logUserAction({
        ...actorContext,
        action: input.action,
        entityId: input.entityId,
        entityType: input.entityType,
        metadata: input.metadata,
    });
};
const logAudit = async (request, input) => {
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
export const productTemplatesController = {
    async listTemplates(request, response) {
        const query = listProductTemplatesQuerySchema.parse({
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            productType: getQueryValue(request.query["filter.productType"]),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await productTemplatesService.listProductTemplates(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async getTemplateById(request, response) {
        const template = await productTemplatesService.getProductTemplateById(getRequiredTemplateId(request.params.id));
        sendSuccess(response, template);
    },
    async createTemplate(request, response) {
        const payload = createProductTemplateSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const template = await productTemplatesService.createProductTemplate(payload, actorContext.userId ?? null);
        await logActivity(request, {
            action: "product_template.created",
            entityId: template.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.template,
            metadata: {
                code: template.code,
                name: template.name,
            },
        });
        await logAudit(request, {
            action: "product_template.created",
            after: template,
            before: null,
            entityId: template.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.template,
            metadata: {
                code: template.code,
            },
        });
        if (template.currentVersion) {
            await logAudit(request, {
                action: "product_template_version.created",
                after: template.currentVersion,
                before: null,
                entityId: template.currentVersion.id,
                entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
                metadata: {
                    templateCode: template.code,
                    templateId: template.id,
                },
            });
        }
        sendSuccess(response, template, 201);
    },
    async updateTemplate(request, response) {
        const templateId = getRequiredTemplateId(request.params.id);
        const payload = updateProductTemplateSchema.parse(request.body);
        const result = await productTemplatesService.updateProductTemplate(templateId, payload);
        await logActivity(request, {
            action: "product_template.updated",
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.template,
            metadata: {
                code: result.current.code,
                name: result.current.name,
            },
        });
        await logAudit(request, {
            action: "product_template.updated",
            after: result.current,
            before: result.previous,
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.template,
            metadata: {
                code: result.current.code,
            },
        });
        sendSuccess(response, result.current);
    },
    async deleteTemplate(request, response) {
        const template = await productTemplatesService.deleteProductTemplate(getRequiredTemplateId(request.params.id));
        await logActivity(request, {
            action: "product_template.deleted",
            entityId: template.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.template,
            metadata: {
                code: template.code,
                name: template.name,
            },
        });
        await logAudit(request, {
            action: "product_template.deleted",
            after: null,
            before: template,
            entityId: template.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.template,
            metadata: {
                code: template.code,
            },
        });
        sendSuccess(response, template);
    },
    async listTemplateVersions(request, response) {
        const versions = await productTemplatesService.listTemplateVersions(getRequiredTemplateId(request.params.id));
        sendSuccess(response, versions);
    },
    async createTemplateVersion(request, response) {
        const templateId = getRequiredTemplateId(request.params.id);
        const payload = createProductTemplateVersionSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const version = await productTemplatesService.createTemplateVersion(templateId, payload, actorContext.userId ?? null);
        await logActivity(request, {
            action: "product_template_version.created",
            entityId: version.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
            metadata: {
                templateId,
                versionNumber: version.versionNumber,
            },
        });
        await logAudit(request, {
            action: "product_template_version.created",
            after: version,
            before: null,
            entityId: version.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
            metadata: {
                templateId,
                versionNumber: version.versionNumber,
            },
        });
        sendSuccess(response, version, 201);
    },
    async getTemplateVersionById(request, response) {
        const version = await productTemplatesService.getProductTemplateVersionById(getRequiredVersionId(request.params.versionId));
        sendSuccess(response, version);
    },
    async updateTemplateVersion(request, response) {
        const versionId = getRequiredVersionId(request.params.versionId);
        const payload = updateProductTemplateVersionSchema.parse(request.body);
        const result = await productTemplatesService.updateProductTemplateVersion(versionId, payload);
        await logActivity(request, {
            action: "product_template_version.updated",
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
            metadata: {
                templateId: result.current.templateId,
                versionNumber: result.current.versionNumber,
            },
        });
        await logAudit(request, {
            action: "product_template_version.updated",
            after: result.current,
            before: result.previous,
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
            metadata: {
                templateId: result.current.templateId,
                versionNumber: result.current.versionNumber,
            },
        });
        sendSuccess(response, result.current);
    },
    async updateTemplateVersionRules(request, response) {
        const versionId = getRequiredVersionId(request.params.versionId);
        const payload = updateProductTemplateRulesSchema.parse(request.body);
        const result = await productTemplatesService.updateTemplateVersionRules(versionId, payload);
        await logActivity(request, {
            action: "product_template_rules.updated",
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
            metadata: {
                templateId: result.current.templateId,
                versionNumber: result.current.versionNumber,
            },
        });
        await logAudit(request, {
            action: "product_template_rules.updated",
            after: result.current.inputs,
            before: result.previous.inputs,
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.input,
        });
        await logAudit(request, {
            action: "product_template_rules.updated",
            after: result.current.materialRules,
            before: result.previous.materialRules,
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.materialRule,
        });
        await logAudit(request, {
            action: "product_template_rules.updated",
            after: result.current.accessoryRules,
            before: result.previous.accessoryRules,
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.accessoryRule,
        });
        await logAudit(request, {
            action: "product_template_rules.updated",
            after: result.current.laborRules,
            before: result.previous.laborRules,
            entityId: result.current.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.laborRule,
        });
        sendSuccess(response, result.current);
    },
    async activateTemplateVersion(request, response) {
        const versionId = getRequiredVersionId(request.params.versionId);
        const actorContext = getRequestLogActorContext(request);
        const version = await productTemplatesService.activateTemplateVersion(versionId, actorContext.userId ?? null);
        await logActivity(request, {
            action: "product_template_version.activated",
            entityId: version.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
            metadata: {
                templateId: version.templateId,
                versionNumber: version.versionNumber,
            },
        });
        await logAudit(request, {
            action: "product_template_version.activated",
            after: version,
            before: null,
            entityId: version.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.version,
            metadata: {
                templateId: version.templateId,
                versionNumber: version.versionNumber,
            },
        });
        sendSuccess(response, version);
    },
    async simulateTemplateVersion(request, response) {
        const versionId = getRequiredVersionId(request.params.versionId);
        const payload = simulateProductTemplateSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const simulation = await productTemplatesService.simulateProductTemplate({
            inputValues: payload.inputValues,
            templateVersionId: versionId,
            userId: actorContext.userId ?? null,
        });
        await logActivity(request, {
            action: "product_template.simulated",
            entityId: simulation.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.simulation,
            metadata: {
                versionId,
            },
        });
        await logAudit(request, {
            action: "product_template.simulated",
            after: simulation,
            before: null,
            entityId: simulation.id,
            entityType: PRODUCT_TEMPLATE_ENTITY_TYPES.simulation,
            metadata: {
                versionId,
            },
        });
        sendSuccess(response, simulation, 201);
    },
    async listTemplateVersionSimulations(request, response) {
        const versionId = getRequiredVersionId(request.params.versionId);
        const query = listProductTemplateSimulationsQuerySchema.parse({
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
        });
        const result = await productTemplatesService.listTemplateSimulations(versionId, query);
        sendPaginated(response, result.data, result.pagination);
    },
};
//# sourceMappingURL=product-templates.controller.js.map