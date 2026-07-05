import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { MATERIAL_CATEGORY_ENTITY_TYPE, MATERIAL_DIMENSION_PRESET_ENTITY_TYPE, MATERIAL_ENTITY_TYPE, MATERIALS_PERMISSIONS, SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE, } from "./materials.constants.js";
import { materialsService } from "./materials.service.js";
import { createMaterialCategorySchema, createMaterialDimensionPresetSchema, createMaterialSchema, createSupplierMaterialEquivalenceSchema, listMaterialCategoriesQuerySchema, listMaterialsQuerySchema, listSupplierMaterialEquivalencesQuerySchema, mapSupplierMaterialEquivalenceSchema, materialCategoryIdParamSchema, materialDimensionPresetParamsSchema, materialIdParamSchema, supplierMaterialEquivalenceIdParamSchema, updateMaterialCategorySchema, updateMaterialDimensionPresetSchema, updateMaterialSchema, updateSupplierMaterialEquivalenceSchema, } from "./materials.validators.js";
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
const getRequiredMaterialId = (value) => {
    const materialId = Array.isArray(value) ? value[0] : value;
    if (!materialId) {
        throw new AppError("Material id is required.", 400);
    }
    return materialIdParamSchema.parse({
        id: materialId,
    }).id;
};
const getRequiredMaterialCategoryId = (value) => {
    const categoryId = Array.isArray(value) ? value[0] : value;
    if (!categoryId) {
        throw new AppError("Material category id is required.", 400);
    }
    return materialCategoryIdParamSchema.parse({
        id: categoryId,
    }).id;
};
const getRequiredDimensionPresetParams = (materialId, presetId) => {
    const normalizedMaterialId = Array.isArray(materialId) ? materialId[0] : materialId;
    const normalizedPresetId = Array.isArray(presetId) ? presetId[0] : presetId;
    if (!normalizedMaterialId || !normalizedPresetId) {
        throw new AppError("Material and preset ids are required.", 400);
    }
    return materialDimensionPresetParamsSchema.parse({
        id: normalizedMaterialId,
        presetId: normalizedPresetId,
    });
};
const getRequiredSupplierMaterialEquivalenceId = (value) => {
    const equivalenceId = Array.isArray(value) ? value[0] : value;
    if (!equivalenceId) {
        throw new AppError("Supplier material equivalence id is required.", 400);
    }
    return supplierMaterialEquivalenceIdParamSchema.parse({
        id: equivalenceId,
    }).id;
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
export const materialsController = {
    async listMaterialCategories(request, response) {
        const query = listMaterialCategoriesQuerySchema.parse({
            search: getQueryValue(request.query.search),
        });
        const categories = await materialsService.listMaterialCategories(query);
        sendSuccess(response, categories);
    },
    async createMaterialCategory(request, response) {
        const payload = createMaterialCategorySchema.parse(request.body);
        const category = await materialsService.createMaterialCategory(payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.create,
                entityId: category.id,
                entityType: MATERIAL_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: category.name,
                },
            }),
            logAuditEvent(request, {
                action: "material_category.created",
                after: category,
                before: null,
                entityId: category.id,
                entityType: MATERIAL_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: category.name,
                },
            }),
        ]);
        sendSuccess(response, category, 201);
    },
    async updateMaterialCategory(request, response) {
        const categoryId = getRequiredMaterialCategoryId(request.params.id);
        const payload = updateMaterialCategorySchema.parse(request.body);
        const result = await materialsService.updateMaterialCategory(categoryId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: MATERIAL_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: result.current.name,
                },
            }),
            logAuditEvent(request, {
                action: "material_category.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: MATERIAL_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: result.current.name,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteMaterialCategory(request, response) {
        const category = await materialsService.deleteMaterialCategory(getRequiredMaterialCategoryId(request.params.id));
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.delete,
                entityId: category.id,
                entityType: MATERIAL_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: category.name,
                },
            }),
            logAuditEvent(request, {
                action: "material_category.deleted",
                after: null,
                before: category,
                entityId: category.id,
                entityType: MATERIAL_CATEGORY_ENTITY_TYPE,
                metadata: {
                    name: category.name,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: category.id,
        });
    },
    async listMaterials(request, response) {
        const query = listMaterialsQuerySchema.parse({
            categoryId: getQueryValue(request.query["filter.categoryId"]),
            isCuttable: getQueryValue(request.query["filter.isCuttable"]),
            isRemnantEligible: getQueryValue(request.query["filter.isRemnantEligible"]),
            isStockable: getQueryValue(request.query["filter.isStockable"]),
            materialType: getQueryValue(request.query["filter.materialType"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await materialsService.listMaterials(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async getMaterialById(request, response) {
        const material = await materialsService.getMaterialById(getRequiredMaterialId(request.params.id));
        sendSuccess(response, material);
    },
    async createMaterial(request, response) {
        const payload = createMaterialSchema.parse(request.body);
        const material = await materialsService.createMaterial(payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.create,
                entityId: material.id,
                entityType: MATERIAL_ENTITY_TYPE,
                metadata: {
                    code: material.code,
                    name: material.name,
                },
            }),
            logAuditEvent(request, {
                action: "material.created",
                after: material,
                before: null,
                entityId: material.id,
                entityType: MATERIAL_ENTITY_TYPE,
                metadata: {
                    code: material.code,
                    name: material.name,
                },
            }),
        ]);
        sendSuccess(response, material, 201);
    },
    async updateMaterial(request, response) {
        const materialId = getRequiredMaterialId(request.params.id);
        const payload = updateMaterialSchema.parse(request.body);
        const result = await materialsService.updateMaterial(materialId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: MATERIAL_ENTITY_TYPE,
                metadata: {
                    code: result.current.code,
                    name: result.current.name,
                },
            }),
            logAuditEvent(request, {
                action: "material.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: MATERIAL_ENTITY_TYPE,
                metadata: {
                    code: result.current.code,
                    name: result.current.name,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteMaterial(request, response) {
        const material = await materialsService.deleteMaterial(getRequiredMaterialId(request.params.id));
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.delete,
                entityId: material.id,
                entityType: MATERIAL_ENTITY_TYPE,
                metadata: {
                    code: material.code,
                    name: material.name,
                },
            }),
            logAuditEvent(request, {
                action: "material.deleted",
                after: null,
                before: material,
                entityId: material.id,
                entityType: MATERIAL_ENTITY_TYPE,
                metadata: {
                    code: material.code,
                    name: material.name,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: material.id,
        });
    },
    async listMaterialDimensionPresets(request, response) {
        const presets = await materialsService.listMaterialDimensionPresets(getRequiredMaterialId(request.params.id));
        sendSuccess(response, presets);
    },
    async createMaterialDimensionPreset(request, response) {
        const materialId = getRequiredMaterialId(request.params.id);
        const payload = createMaterialDimensionPresetSchema.parse(request.body);
        const preset = await materialsService.createMaterialDimensionPreset(materialId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: preset.id,
                entityType: MATERIAL_DIMENSION_PRESET_ENTITY_TYPE,
                metadata: {
                    label: preset.label,
                    materialId,
                },
            }),
            logAuditEvent(request, {
                action: "material_dimension_preset.created",
                after: preset,
                before: null,
                entityId: preset.id,
                entityType: MATERIAL_DIMENSION_PRESET_ENTITY_TYPE,
                metadata: {
                    materialId,
                },
            }),
        ]);
        sendSuccess(response, preset, 201);
    },
    async updateMaterialDimensionPreset(request, response) {
        const params = getRequiredDimensionPresetParams(request.params.id, request.params.presetId);
        const payload = updateMaterialDimensionPresetSchema.parse(request.body);
        const result = await materialsService.updateMaterialDimensionPreset(params.id, params.presetId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: MATERIAL_DIMENSION_PRESET_ENTITY_TYPE,
                metadata: {
                    label: result.current.label,
                    materialId: params.id,
                },
            }),
            logAuditEvent(request, {
                action: "material_dimension_preset.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: MATERIAL_DIMENSION_PRESET_ENTITY_TYPE,
                metadata: {
                    materialId: params.id,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteMaterialDimensionPreset(request, response) {
        const params = getRequiredDimensionPresetParams(request.params.id, request.params.presetId);
        const preset = await materialsService.deleteMaterialDimensionPreset(params.id, params.presetId);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: preset.id,
                entityType: MATERIAL_DIMENSION_PRESET_ENTITY_TYPE,
                metadata: {
                    label: preset.label,
                    materialId: params.id,
                },
            }),
            logAuditEvent(request, {
                action: "material_dimension_preset.deleted",
                after: null,
                before: preset,
                entityId: preset.id,
                entityType: MATERIAL_DIMENSION_PRESET_ENTITY_TYPE,
                metadata: {
                    materialId: params.id,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: preset.id,
        });
    },
    async listSupplierMaterialEquivalences(request, response) {
        const query = listSupplierMaterialEquivalencesQuerySchema.parse({
            confidence: getQueryValue(request.query["filter.confidence"]),
            materialId: getQueryValue(request.query["filter.materialId"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
            supplierId: getQueryValue(request.query["filter.supplierId"]),
        });
        const result = await materialsService.listSupplierMaterialEquivalences(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async createSupplierMaterialEquivalence(request, response) {
        const payload = createSupplierMaterialEquivalenceSchema.parse(request.body);
        const record = await materialsService.createSupplierMaterialEquivalence(payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.create,
                entityId: record.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: record.materialId,
                    supplierId: record.supplierId,
                    supplierName: record.supplierName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_material_equivalence.created",
                after: record,
                before: null,
                entityId: record.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: record.materialId,
                    supplierId: record.supplierId,
                },
            }),
        ]);
        sendSuccess(response, record, 201);
    },
    async updateSupplierMaterialEquivalence(request, response) {
        const equivalenceId = getRequiredSupplierMaterialEquivalenceId(request.params.id);
        const payload = updateSupplierMaterialEquivalenceSchema.parse(request.body);
        const result = await materialsService.updateSupplierMaterialEquivalence(equivalenceId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: result.current.materialId,
                    supplierId: result.current.supplierId,
                    supplierName: result.current.supplierName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_material_equivalence.updated",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: result.current.materialId,
                    supplierId: result.current.supplierId,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async deleteSupplierMaterialEquivalence(request, response) {
        const record = await materialsService.deleteSupplierMaterialEquivalence(getRequiredSupplierMaterialEquivalenceId(request.params.id));
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.delete,
                entityId: record.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: record.materialId,
                    supplierId: record.supplierId,
                    supplierName: record.supplierName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_material_equivalence.deleted",
                after: null,
                before: record,
                entityId: record.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: record.materialId,
                    supplierId: record.supplierId,
                },
            }),
        ]);
        sendSuccess(response, {
            deleted: true,
            id: record.id,
        });
    },
    async verifySupplierMaterialEquivalence(request, response) {
        const equivalenceId = getRequiredSupplierMaterialEquivalenceId(request.params.id);
        const result = await materialsService.verifySupplierMaterialEquivalence(equivalenceId);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    confidence: result.current.confidence,
                    supplierName: result.current.supplierName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_material_equivalence.verified",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: result.current.materialId,
                    supplierId: result.current.supplierId,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
    async mapSupplierMaterialEquivalence(request, response) {
        const equivalenceId = getRequiredSupplierMaterialEquivalenceId(request.params.id);
        const payload = mapSupplierMaterialEquivalenceSchema.parse(request.body);
        const result = await materialsService.mapSupplierMaterialEquivalence(equivalenceId, payload);
        await Promise.all([
            logActivityEvent(request, {
                action: MATERIALS_PERMISSIONS.update,
                entityId: result.current.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: result.current.materialId,
                    supplierId: result.current.supplierId,
                    supplierName: result.current.supplierName,
                },
            }),
            logAuditEvent(request, {
                action: "supplier_material_equivalence.mapped",
                after: result.current,
                before: result.previous,
                entityId: result.current.id,
                entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
                metadata: {
                    materialId: result.current.materialId,
                    supplierId: result.current.supplierId,
                },
            }),
        ]);
        sendSuccess(response, result.current);
    },
};
//# sourceMappingURL=materials.controller.js.map