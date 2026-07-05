import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import {
  SUPPLIER_CATEGORIES_API_PATH,
  SUPPLIER_SCORING_API_PATH,
  SUPPLIER_SCORING_PERMISSIONS,
  SUPPLIERS_API_PATH,
  SUPPLIERS_PERMISSIONS,
} from "./suppliers.constants.js";
import { suppliersController } from "./suppliers.controller.js";

export const suppliersRouter = Router();

suppliersRouter.get(
  SUPPLIERS_API_PATH,
  requirePermission(SUPPLIERS_PERMISSIONS.read),
  asyncHandler(suppliersController.listSuppliers),
);

suppliersRouter.get(
  `${SUPPLIERS_API_PATH}/:id`,
  requirePermission(SUPPLIERS_PERMISSIONS.read),
  asyncHandler(suppliersController.getSupplierById),
);

suppliersRouter.post(
  SUPPLIERS_API_PATH,
  requirePermission(SUPPLIERS_PERMISSIONS.create),
  asyncHandler(suppliersController.createSupplier),
);

suppliersRouter.put(
  `${SUPPLIERS_API_PATH}/:id`,
  requirePermission(SUPPLIERS_PERMISSIONS.update),
  asyncHandler(suppliersController.updateSupplier),
);

suppliersRouter.delete(
  `${SUPPLIERS_API_PATH}/:id`,
  requirePermission(SUPPLIERS_PERMISSIONS.delete),
  asyncHandler(suppliersController.deleteSupplier),
);

suppliersRouter.get(
  `${SUPPLIERS_API_PATH}/:id/contacts`,
  requirePermission(SUPPLIERS_PERMISSIONS.read),
  asyncHandler(suppliersController.listSupplierContacts),
);

suppliersRouter.post(
  `${SUPPLIERS_API_PATH}/:id/contacts`,
  requirePermission(SUPPLIERS_PERMISSIONS.update),
  asyncHandler(suppliersController.createSupplierContact),
);

suppliersRouter.put(
  `${SUPPLIERS_API_PATH}/:id/contacts/:contactId`,
  requirePermission(SUPPLIERS_PERMISSIONS.update),
  asyncHandler(suppliersController.updateSupplierContact),
);

suppliersRouter.delete(
  `${SUPPLIERS_API_PATH}/:id/contacts/:contactId`,
  requirePermission(SUPPLIERS_PERMISSIONS.update),
  asyncHandler(suppliersController.deleteSupplierContact),
);

suppliersRouter.get(
  SUPPLIER_CATEGORIES_API_PATH,
  requirePermission(SUPPLIERS_PERMISSIONS.read),
  asyncHandler(suppliersController.listSupplierCategories),
);

suppliersRouter.post(
  SUPPLIER_CATEGORIES_API_PATH,
  requirePermission(SUPPLIERS_PERMISSIONS.create),
  asyncHandler(suppliersController.createSupplierCategory),
);

suppliersRouter.put(
  `${SUPPLIER_CATEGORIES_API_PATH}/:id`,
  requirePermission(SUPPLIERS_PERMISSIONS.update),
  asyncHandler(suppliersController.updateSupplierCategory),
);

suppliersRouter.delete(
  `${SUPPLIER_CATEGORIES_API_PATH}/:id`,
  requirePermission(SUPPLIERS_PERMISSIONS.delete),
  asyncHandler(suppliersController.deleteSupplierCategory),
);

suppliersRouter.get(
  `${SUPPLIER_SCORING_API_PATH}/criteria`,
  requirePermission(SUPPLIER_SCORING_PERMISSIONS.read),
  asyncHandler(suppliersController.listScoringCriteria),
);

suppliersRouter.get(
  `${SUPPLIER_SCORING_API_PATH}/configs`,
  requirePermission(SUPPLIER_SCORING_PERMISSIONS.read),
  asyncHandler(suppliersController.listScoringConfigs),
);

suppliersRouter.get(
  `${SUPPLIER_SCORING_API_PATH}/configs/:id`,
  requirePermission(SUPPLIER_SCORING_PERMISSIONS.read),
  asyncHandler(suppliersController.getScoringConfigById),
);

suppliersRouter.post(
  `${SUPPLIER_SCORING_API_PATH}/configs`,
  requirePermission(SUPPLIER_SCORING_PERMISSIONS.update),
  asyncHandler(suppliersController.createScoringConfig),
);

suppliersRouter.put(
  `${SUPPLIER_SCORING_API_PATH}/configs/:id`,
  requirePermission(SUPPLIER_SCORING_PERMISSIONS.update),
  asyncHandler(suppliersController.updateScoringConfig),
);

suppliersRouter.delete(
  `${SUPPLIER_SCORING_API_PATH}/configs/:id`,
  requirePermission(SUPPLIER_SCORING_PERMISSIONS.update),
  asyncHandler(suppliersController.deleteScoringConfig),
);

suppliersRouter.post(
  `${SUPPLIER_SCORING_API_PATH}/simulate`,
  requirePermission(SUPPLIER_SCORING_PERMISSIONS.simulate),
  asyncHandler(suppliersController.simulateScoring),
);
