import multer from "multer";
import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import { PRICE_LIST_IMPORT_UPLOAD_API_PATH, PRICE_LIST_IMPORTS_API_PATH, PRICE_LIST_PRICE_HISTORY_API_PATH, PRICE_LISTS_PERMISSIONS, } from "./price-lists.constants.js";
import { priceListsController } from "./price-lists.controller.js";
const upload = multer({
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    storage: multer.memoryStorage(),
});
export const priceListsRouter = Router();
priceListsRouter.post(PRICE_LIST_IMPORT_UPLOAD_API_PATH, requirePermission(PRICE_LISTS_PERMISSIONS.import), upload.single("file"), asyncHandler(priceListsController.importPriceList));
priceListsRouter.get(PRICE_LIST_IMPORTS_API_PATH, requirePermission(PRICE_LISTS_PERMISSIONS.read), asyncHandler(priceListsController.listImports));
priceListsRouter.get(`${PRICE_LIST_IMPORTS_API_PATH}/:id`, requirePermission(PRICE_LISTS_PERMISSIONS.read), asyncHandler(priceListsController.getImportById));
priceListsRouter.get(`${PRICE_LIST_IMPORTS_API_PATH}/:id/rows`, requirePermission(PRICE_LISTS_PERMISSIONS.read), asyncHandler(priceListsController.listImportRows));
priceListsRouter.post(`${PRICE_LIST_IMPORTS_API_PATH}/:id/auto-map`, requirePermission(PRICE_LISTS_PERMISSIONS.validate), asyncHandler(priceListsController.autoMapImportRows));
priceListsRouter.post(`${PRICE_LIST_IMPORTS_API_PATH}/:id/rows/:rowId/map`, requirePermission(PRICE_LISTS_PERMISSIONS.validate), asyncHandler(priceListsController.mapImportRow));
priceListsRouter.post(`${PRICE_LIST_IMPORTS_API_PATH}/:id/rows/:rowId/ignore`, requirePermission(PRICE_LISTS_PERMISSIONS.validate), asyncHandler(priceListsController.ignoreImportRow));
priceListsRouter.post(`${PRICE_LIST_IMPORTS_API_PATH}/:id/validate`, requirePermission(PRICE_LISTS_PERMISSIONS.validate), asyncHandler(priceListsController.validateImport));
priceListsRouter.post(`${PRICE_LIST_IMPORTS_API_PATH}/:id/approve`, requirePermission(PRICE_LISTS_PERMISSIONS.approve), asyncHandler(priceListsController.approveImport));
priceListsRouter.post(`${PRICE_LIST_IMPORTS_API_PATH}/:id/reject`, requirePermission(PRICE_LISTS_PERMISSIONS.approve), asyncHandler(priceListsController.rejectImport));
priceListsRouter.get("/materials/:id/supplier-prices", requirePermission(PRICE_LISTS_PERMISSIONS.read), asyncHandler(priceListsController.getMaterialSupplierPrices));
priceListsRouter.get("/suppliers/:id/material-prices", requirePermission(PRICE_LISTS_PERMISSIONS.read), asyncHandler(priceListsController.getSupplierMaterialPrices));
priceListsRouter.get(PRICE_LIST_PRICE_HISTORY_API_PATH, requirePermission(PRICE_LISTS_PERMISSIONS.read), asyncHandler(priceListsController.getPriceHistory));
//# sourceMappingURL=price-lists.routes.js.map