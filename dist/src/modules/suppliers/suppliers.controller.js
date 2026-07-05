import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { supplierScoringService } from "./supplier-scoring.service.js";
import { SUPPLIER_CATEGORY_ENTITY_TYPE, SUPPLIER_CONTACT_ENTITY_TYPE, SUPPLIER_ENTITY_TYPE, SUPPLIER_SCORING_CONFIG_ENTITY_TYPE, SUPPLIER_SCORING_PERMISSIONS, SUPPLIERS_PERMISSIONS, } from "./suppliers.constants.js";
import { suppliersService } from "./suppliers.service.js";
import { createSupplierCategorySchema, createSupplierContactSchema, createSupplierSchema, createSupplierScoringConfigSchema, listSupplierCategoriesQuerySchema, listSupplierScoringConfigsQuerySchema, listSuppliersQuerySchema, simulateSupplierScoringSchema, supplierCategoryDeleteQuerySchema, supplierCategoryIdParamSchema, supplierContactParamsSchema, supplierIdParamSchema, supplierScoringConfigIdParamSchema, updateSupplierCategorySchema, updateSupplierContactSchema, updateSupplierSchema, updateSupplierScoringConfigSchema, } from "./suppliers.validators.js";
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
const getRequiredSupplierId = (value) => {
    const supplierId = Array.isArray(value) ? value[0] : value;
    if (!supplierId) {
        throw new AppError("Supplier id is required.", 400);
    }
    return supplierIdParamSchema.parse({
        id: supplierId,
    }).id;
};
const getRequiredCategoryId = (value) => {
    const categoryId = Array.isArray(value) ? value[0] : value;
    if (!categoryId) {
        throw new AppError("Supplier category id is required.", 400);
    }
    return supplierCategoryIdParamSchema.parse({
        id: categoryId,
    }).id;
};
const getRequiredConfigId = (value) => {
    const configId = Array.isArray(value) ? value[0] : value;
    if (!configId) {
        throw new AppError("Supplier scoring config id is required.", 400);
    }
    return supplierScoringConfigIdParamSchema.parse({
        id: configId,
    }).id;
};
const getRequiredContactParams = (supplierId, contactId) => {
    const normalizedSupplierId = Array.isArray(supplierId) ? supplierId[0] : supplierId;
    const normalizedContactId = Array.isArray(contactId) ? contactId[0] : contactId;
    if (!normalizedSupplierId || !normalizedContactId) {
        throw new AppError("Supplier and contact ids are required.", 400);
    }
    return supplierContactParamsSchema.parse({
        contactId: normalizedContactId,
        id: normalizedSupplierId,
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
export const suppliersController = {
    async listSuppliers(request, response) {
        const query = listSuppliersQuerySchema.parse({
            categoryId: getQueryValue(request.query["filter.categoryId"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await suppliersService.listSuppliers(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async getSupplierById(request, response) {
        const supplier = await suppliersService.getSupplierById(getRequiredSupplierId(request.params.id));
        sendSuccess(response, supplier);
    },
    async createSupplier(request, response) {
        const payload = createSupplierSchema.parse(request.body);
        const supplier = await suppliersService.createSupplier(payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.create,
                entityId: supplier.id,
                entityType: SUPPLIER_ENTITY_TYPE,
                metadata: {
                    legalName: supplier.legalName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier.created",
                after: supplier,
                before: null,
                entityId: supplier.id,
                entityType: SUPPLIER_ENTITY_TYPE,
                metadata: {
                    legalName: supplier.legalName,
                },
            }),
        ]);
        sendSuccess(response, supplier, 201);
    },
    async updateSupplier(request, response) {
        const supplierId = getRequiredSupplierId(request.params.id);
        const payload = updateSupplierSchema.parse(request.body);
        const result = await suppliersService.updateSupplier(supplierId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: SUPPLIER_ENTITY_TYPE,
                metadata: {
                    legalName: result.current.legalName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: SUPPLIER_ENTITY_TYPE,
                metadata: {
                    legalName: result.current.legalName,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteSupplier(request, response) {
        const supplier = await suppliersService.deleteSupplier(getRequiredSupplierId(request.params.id));
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.delete,
                entityId: supplier.id,
                entityType: SUPPLIER_ENTITY_TYPE,
                metadata: {
                    legalName: supplier.legalName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier.deleted",
                after: null,
                before: supplier,
                entityId: supplier.id,
                entityType: SUPPLIER_ENTITY_TYPE,
                metadata: {
                    legalName: supplier.legalName,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: supplier.id,
        });
    },
    async listSupplierContacts(request, response) {
        const contacts = await suppliersService.listSupplierContacts(getRequiredSupplierId(request.params.id));
        sendSuccess(response, contacts);
    },
    async createSupplierContact(request, response) {
        const supplierId = getRequiredSupplierId(request.params.id);
        const payload = createSupplierContactSchema.parse(request.body);
        const contact = await suppliersService.addSupplierContact(supplierId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.update,
                entityId: contact.id,
                entityType: SUPPLIER_CONTACT_ENTITY_TYPE,
                metadata: {
                    name: contact.name,
                    supplierId,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_contact.created",
                after: contact,
                before: null,
                entityId: contact.id,
                entityType: SUPPLIER_CONTACT_ENTITY_TYPE,
                metadata: {
                    supplierId,
                },
            }),
        ]);
        sendSuccess(response, contact, 201);
    },
    async updateSupplierContact(request, response) {
        const params = getRequiredContactParams(request.params.id, request.params.contactId);
        const payload = updateSupplierContactSchema.parse(request.body);
        const result = await suppliersService.updateSupplierContact(params.id, params.contactId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: SUPPLIER_CONTACT_ENTITY_TYPE,
                metadata: {
                    name: result.current.name,
                    supplierId: params.id,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_contact.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: SUPPLIER_CONTACT_ENTITY_TYPE,
                metadata: {
                    supplierId: params.id,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteSupplierContact(request, response) {
        const params = getRequiredContactParams(request.params.id, request.params.contactId);
        const contact = await suppliersService.deleteSupplierContact(params.id, params.contactId);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.update,
                entityId: contact.id,
                entityType: SUPPLIER_CONTACT_ENTITY_TYPE,
                metadata: {
                    name: contact.name,
                    supplierId: params.id,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_contact.deleted",
                after: null,
                before: contact,
                entityId: contact.id,
                entityType: SUPPLIER_CONTACT_ENTITY_TYPE,
                metadata: {
                    supplierId: params.id,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: contact.id,
        });
    },
    async listSupplierCategories(request, response) {
        const query = listSupplierCategoriesQuerySchema.parse({
            search: getQueryValue(request.query.search),
        });
        const categories = await suppliersService.listCategories(query);
        sendSuccess(response, categories);
    },
    async createSupplierCategory(request, response) {
        const payload = createSupplierCategorySchema.parse(request.body);
        const category = await suppliersService.createCategory(payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.create,
                entityId: category.id,
                entityType: SUPPLIER_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: category.name,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_category.created",
                after: category,
                before: null,
                entityId: category.id,
                entityType: SUPPLIER_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: category.name,
                },
            }),
        ]);
        sendSuccess(response, category, 201);
    },
    async updateSupplierCategory(request, response) {
        const payload = updateSupplierCategorySchema.parse(request.body);
        const result = await suppliersService.updateCategory(getRequiredCategoryId(request.params.id), payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: SUPPLIER_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: result.current.name,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_category.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: SUPPLIER_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: result.current.name,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteSupplierCategory(request, response) {
        const categoryId = getRequiredCategoryId(request.params.id);
        const deleteQuery = supplierCategoryDeleteQuerySchema.parse({
            force: getQueryValue(request.query.force),
        });
        const category = await suppliersService.deleteCategory(categoryId, deleteQuery);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIERS_PERMISSIONS.delete,
                entityId: category.id,
                entityType: SUPPLIER_CATEGORY_ENTITY_TYPE,
                metadata: {
                    force: deleteQuery.force,
                    name: category.name,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_category.deleted",
                after: null,
                before: category,
                entityId: category.id,
                entityType: SUPPLIER_CATEGORY_ENTITY_TYPE,
                metadata: {
                    force: deleteQuery.force,
                    name: category.name,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: category.id,
        });
    },
    async listScoringCriteria(_request, response) {
        const criteria = await supplierScoringService.listCriteria();
        sendSuccess(response, criteria);
    },
    async listScoringConfigs(request, response) {
        const query = listSupplierScoringConfigsQuerySchema.parse({
            isActive: getQueryValue(request.query["filter.isActive"]),
            scope: getQueryValue(request.query["filter.scope"]),
        });
        const configs = await supplierScoringService.listConfigs(query);
        sendSuccess(response, configs);
    },
    async getScoringConfigById(request, response) {
        const config = await supplierScoringService.getConfigById(getRequiredConfigId(request.params.id));
        sendSuccess(response, config);
    },
    async createScoringConfig(request, response) {
        const payload = createSupplierScoringConfigSchema.parse(request.body);
        const config = await supplierScoringService.createConfig(payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIER_SCORING_PERMISSIONS.update,
                entityId: config.id,
                entityType: SUPPLIER_SCORING_CONFIG_ENTITY_TYPE,
                metadata: {
                    name: config.name,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_scoring_config.created",
                after: config,
                before: null,
                entityId: config.id,
                entityType: SUPPLIER_SCORING_CONFIG_ENTITY_TYPE,
                metadata: {
                    name: config.name,
                },
            }),
        ]);
        sendSuccess(response, config, 201);
    },
    async updateScoringConfig(request, response) {
        const configId = getRequiredConfigId(request.params.id);
        const payload = updateSupplierScoringConfigSchema.parse(request.body);
        const result = await supplierScoringService.updateConfig(configId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIER_SCORING_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: SUPPLIER_SCORING_CONFIG_ENTITY_TYPE,
                metadata: {
                    name: result.current.name,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_scoring_config.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: SUPPLIER_SCORING_CONFIG_ENTITY_TYPE,
                metadata: {
                    name: result.current.name,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteScoringConfig(request, response) {
        const config = await supplierScoringService.deleteConfig(getRequiredConfigId(request.params.id));
        await Promise.all([
            logActivityEvent(request, {
                action: SUPPLIER_SCORING_PERMISSIONS.update,
                entityId: config.id,
                entityType: SUPPLIER_SCORING_CONFIG_ENTITY_TYPE,
                metadata: {
                    name: config.name,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_scoring_config.deleted",
                after: null,
                before: config,
                entityId: config.id,
                entityType: SUPPLIER_SCORING_CONFIG_ENTITY_TYPE,
                metadata: {
                    name: config.name,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: config.id,
        });
    },
    async simulateScoring(request, response) {
        const payload = simulateSupplierScoringSchema.parse(request.body);
        const result = await supplierScoringService.simulateScores(payload);
        sendSuccess(response, result);
    },
};
//# sourceMappingURL=suppliers.controller.js.map