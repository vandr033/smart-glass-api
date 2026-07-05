import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { inventoryService } from "./inventory.service.js";
import { adjustStockSchema, availabilityGlassQuerySchema, availabilityLinearQuerySchema, availabilityMaterialQuerySchema, damagedMaterialIdParamSchema, damagedMaterialMutationSchema, inventoryReservationIdParamSchema, listDamagedMaterialsQuerySchema, listInventoryMovementsQuerySchema, listInventoryStockQuerySchema, listRemnantsQuerySchema, listReservationsQuerySchema, listWarehousesQuerySchema, materialIdParamSchema, remnantPieceIdParamSchema, remnantPieceMutationSchema, reservationMutationSchema, reviewDamagedMaterialSchema, returnToSupplierSchema, scrapMaterialSchema, stockEntrySchema, transferStockSchema, usableRemnantsQuerySchema, warehouseIdParamSchema, warehouseMutationSchema, } from "./inventory.validators.js";
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
const getRequiredWarehouseId = (value) => {
    const warehouseId = Array.isArray(value) ? value[0] : value;
    if (!warehouseId) {
        throw new AppError("Warehouse id is required.", 400);
    }
    return warehouseIdParamSchema.parse({
        id: warehouseId,
    }).id;
};
const getRequiredReservationId = (value) => {
    const reservationId = Array.isArray(value) ? value[0] : value;
    if (!reservationId) {
        throw new AppError("Reservation id is required.", 400);
    }
    return inventoryReservationIdParamSchema.parse({
        id: reservationId,
    }).id;
};
const getRequiredRemnantId = (value) => {
    const remnantId = Array.isArray(value) ? value[0] : value;
    if (!remnantId) {
        throw new AppError("Remnant id is required.", 400);
    }
    return remnantPieceIdParamSchema.parse({
        id: remnantId,
    }).id;
};
const getRequiredDamagedId = (value) => {
    const damagedId = Array.isArray(value) ? value[0] : value;
    if (!damagedId) {
        throw new AppError("Damaged material id is required.", 400);
    }
    return damagedMaterialIdParamSchema.parse({
        id: damagedId,
    }).id;
};
const getRequiredMaterialId = (value) => {
    const materialId = Array.isArray(value) ? value[0] : value;
    if (!materialId) {
        throw new AppError("Material id is required.", 400);
    }
    return materialIdParamSchema.parse({
        materialId,
    }).materialId;
};
export const inventoryController = {
    async listWarehouses(request, response) {
        const query = listWarehousesQuerySchema.parse({
            search: getQueryValue(request.query.search),
            status: getQueryValue(request.query.status),
        });
        const warehouses = await inventoryService.listWarehouses(query);
        sendSuccess(response, warehouses);
    },
    async createWarehouse(request, response) {
        const payload = warehouseMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const warehouse = await inventoryService.createWarehouse(payload, actorContext.userId ?? null);
        sendSuccess(response, warehouse, 201);
    },
    async getWarehouseById(request, response) {
        const warehouse = await inventoryService.getWarehouseById(getRequiredWarehouseId(request.params.id));
        sendSuccess(response, warehouse);
    },
    async updateWarehouse(request, response) {
        const payload = warehouseMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const warehouse = await inventoryService.updateWarehouse(getRequiredWarehouseId(request.params.id), payload, actorContext.userId ?? null);
        sendSuccess(response, warehouse);
    },
    async deleteWarehouse(request, response) {
        const actorContext = getRequestLogActorContext(request);
        const warehouse = await inventoryService.deleteWarehouse(getRequiredWarehouseId(request.params.id), actorContext.userId ?? null);
        sendSuccess(response, {
            deleted: true,
            id: warehouse.id,
        });
    },
    async getDashboard(_request, response) {
        const dashboard = await inventoryService.getDashboard();
        sendSuccess(response, dashboard);
    },
    async listStock(request, response) {
        const query = listInventoryStockQuerySchema.parse({
            categoryId: getQueryValue(request.query["filter.categoryId"]),
            condition: getQueryValue(request.query["filter.condition"]),
            materialId: getQueryValue(request.query["filter.materialId"]),
            maxHeightMm: getQueryValue(request.query["filter.maxHeightMm"]),
            maxLengthMm: getQueryValue(request.query["filter.maxLengthMm"]),
            maxWidthMm: getQueryValue(request.query["filter.maxWidthMm"]),
            minHeightMm: getQueryValue(request.query["filter.minHeightMm"]),
            minLengthMm: getQueryValue(request.query["filter.minLengthMm"]),
            minWidthMm: getQueryValue(request.query["filter.minWidthMm"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            stockType: getQueryValue(request.query["filter.stockType"]),
            thicknessMm: getQueryValue(request.query["filter.thicknessMm"]),
            warehouseId: getQueryValue(request.query["filter.warehouseId"]),
        });
        const result = await inventoryService.listInventoryStock(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async createStockEntry(request, response) {
        const payload = stockEntrySchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const stock = await inventoryService.createStockEntry(payload, actorContext.userId ?? null);
        sendSuccess(response, stock, 201);
    },
    async adjustStock(request, response) {
        const payload = adjustStockSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const stock = await inventoryService.adjustStock(payload, actorContext.userId ?? null);
        sendSuccess(response, stock);
    },
    async transferStock(request, response) {
        const payload = transferStockSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const result = await inventoryService.transferStock(payload, actorContext.userId ?? null);
        sendSuccess(response, result);
    },
    async listMovements(request, response) {
        const query = listInventoryMovementsQuerySchema.parse({
            dateFrom: getQueryValue(request.query.dateFrom),
            dateTo: getQueryValue(request.query.dateTo),
            materialId: getQueryValue(request.query["filter.materialId"]),
            movementType: getQueryValue(request.query["filter.movementType"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            warehouseId: getQueryValue(request.query["filter.warehouseId"]),
        });
        const result = await inventoryService.listInventoryMovements(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async listReservations(request, response) {
        const query = listReservationsQuerySchema.parse({
            materialId: getQueryValue(request.query["filter.materialId"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            projectId: getQueryValue(request.query["filter.projectId"]),
            quotationId: getQueryValue(request.query["filter.quotationId"]),
            reservationType: getQueryValue(request.query["filter.reservationType"]),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
            warehouseId: getQueryValue(request.query["filter.warehouseId"]),
        });
        const result = await inventoryService.listReservations(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async createSoftReservation(request, response) {
        const payload = reservationMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const reservation = await inventoryService.createSoftReservation(payload, actorContext.userId ?? null);
        sendSuccess(response, reservation, 201);
    },
    async createFirmReservation(request, response) {
        const payload = reservationMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const reservation = await inventoryService.createFirmReservation(payload, actorContext.userId ?? null);
        sendSuccess(response, reservation, 201);
    },
    async releaseReservation(request, response) {
        const actorContext = getRequestLogActorContext(request);
        const reservation = await inventoryService.releaseReservation(getRequiredReservationId(request.params.id), actorContext.userId ?? null);
        sendSuccess(response, reservation);
    },
    async consumeReservation(request, response) {
        const actorContext = getRequestLogActorContext(request);
        const reservation = await inventoryService.consumeReservation(getRequiredReservationId(request.params.id), actorContext.userId ?? null);
        sendSuccess(response, reservation);
    },
    async listRemnants(request, response) {
        const query = listRemnantsQuerySchema.parse({
            materialId: getQueryValue(request.query["filter.materialId"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
            thicknessMm: getQueryValue(request.query["filter.thicknessMm"]),
            warehouseId: getQueryValue(request.query["filter.warehouseId"]),
        });
        const result = await inventoryService.listRemnants(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async createRemnant(request, response) {
        const payload = remnantPieceMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const remnant = await inventoryService.createRemnantPiece(payload, actorContext.userId ?? null);
        sendSuccess(response, remnant, 201);
    },
    async listUsableRemnants(request, response) {
        const query = usableRemnantsQuerySchema.parse({
            materialId: getQueryValue(request.query.materialId),
            requiredHeightMm: getQueryValue(request.query.requiredHeightMm),
            requiredWidthMm: getQueryValue(request.query.requiredWidthMm),
            thicknessMm: getQueryValue(request.query.thicknessMm),
            warehouseId: getQueryValue(request.query.warehouseId),
        });
        const remnants = await inventoryService.findUsableRemnants(query.materialId, query.requiredWidthMm, query.requiredHeightMm, {
            ...(query.thicknessMm !== undefined
                ? {
                    thicknessMm: query.thicknessMm,
                }
                : {}),
            ...(query.warehouseId
                ? {
                    warehouseId: query.warehouseId,
                }
                : {}),
        });
        sendSuccess(response, remnants);
    },
    async scrapRemnant(request, response) {
        const payload = scrapMaterialSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const result = await inventoryService.scrapMaterial({
            reason: payload.reason,
            remnantPieceId: getRequiredRemnantId(request.params.id),
        }, actorContext.userId ?? null);
        sendSuccess(response, result);
    },
    async listDamagedMaterials(request, response) {
        const query = listDamagedMaterialsQuerySchema.parse({
            materialId: getQueryValue(request.query["filter.materialId"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            severity: getQueryValue(request.query["filter.severity"]),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
            warehouseId: getQueryValue(request.query["filter.warehouseId"]),
        });
        const result = await inventoryService.listDamagedMaterials(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async createDamagedMaterial(request, response) {
        const payload = damagedMaterialMutationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const damagedMaterial = await inventoryService.markMaterialDamaged(payload, actorContext.userId ?? null);
        sendSuccess(response, damagedMaterial, 201);
    },
    async reviewDamagedMaterial(request, response) {
        const payload = reviewDamagedMaterialSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const damagedMaterial = await inventoryService.reviewDamagedMaterial(getRequiredDamagedId(request.params.id), payload, actorContext.userId ?? null);
        sendSuccess(response, damagedMaterial);
    },
    async scrapDamagedMaterial(request, response) {
        const payload = scrapMaterialSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const result = await inventoryService.scrapMaterial({
            damagedMaterialId: getRequiredDamagedId(request.params.id),
            reason: payload.reason,
        }, actorContext.userId ?? null);
        sendSuccess(response, result);
    },
    async returnDamagedMaterialToSupplier(request, response) {
        const payload = returnToSupplierSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const damagedMaterial = await inventoryService.returnDamagedMaterialToSupplier(getRequiredDamagedId(request.params.id), payload, actorContext.userId ?? null);
        sendSuccess(response, damagedMaterial);
    },
    async getMaterialAvailability(request, response) {
        const materialId = getRequiredMaterialId(request.params.materialId);
        const query = availabilityMaterialQuerySchema.parse({
            quantity: getQueryValue(request.query.quantity),
            unit: getQueryValue(request.query.unit),
            warehouseId: getQueryValue(request.query.warehouseId),
        });
        const availability = await inventoryService.getAvailableStock(materialId, query);
        sendSuccess(response, availability);
    },
    async getGlassAvailability(request, response) {
        const query = availabilityGlassQuerySchema.parse({
            heightMm: getQueryValue(request.query.heightMm),
            materialId: getQueryValue(request.query.materialId),
            thicknessMm: getQueryValue(request.query.thicknessMm),
            warehouseId: getQueryValue(request.query.warehouseId),
            widthMm: getQueryValue(request.query.widthMm),
        });
        const availability = await inventoryService.getAvailableGlassSheets(query.materialId, query.widthMm, query.heightMm, query.thicknessMm, query.warehouseId);
        sendSuccess(response, availability);
    },
    async getLinearAvailability(request, response) {
        const query = availabilityLinearQuerySchema.parse({
            materialId: getQueryValue(request.query.materialId),
            requiredLengthMm: getQueryValue(request.query.requiredLengthMm),
            warehouseId: getQueryValue(request.query.warehouseId),
        });
        const availability = await inventoryService.getAvailableLinearStock(query.materialId, query.requiredLengthMm, query.warehouseId);
        sendSuccess(response, availability);
    },
};
//# sourceMappingURL=inventory.controller.js.map