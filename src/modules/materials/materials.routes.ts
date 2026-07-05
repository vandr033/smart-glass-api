import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import {
  MATERIAL_CATEGORIES_API_PATH,
  MATERIALS_API_PATH,
  MATERIALS_PERMISSIONS,
  SUPPLIER_MATERIAL_EQUIVALENCES_API_PATH,
} from "./materials.constants.js";
import { materialsController } from "./materials.controller.js";

export const materialsRouter = Router();

materialsRouter.get(
  MATERIAL_CATEGORIES_API_PATH,
  requirePermission(MATERIALS_PERMISSIONS.read),
  asyncHandler(materialsController.listMaterialCategories),
);

materialsRouter.post(
  MATERIAL_CATEGORIES_API_PATH,
  requirePermission(MATERIALS_PERMISSIONS.create),
  asyncHandler(materialsController.createMaterialCategory),
);

materialsRouter.put(
  `${MATERIAL_CATEGORIES_API_PATH}/:id`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.updateMaterialCategory),
);

materialsRouter.delete(
  `${MATERIAL_CATEGORIES_API_PATH}/:id`,
  requirePermission(MATERIALS_PERMISSIONS.delete),
  asyncHandler(materialsController.deleteMaterialCategory),
);

materialsRouter.get(
  MATERIALS_API_PATH,
  requirePermission(MATERIALS_PERMISSIONS.read),
  asyncHandler(materialsController.listMaterials),
);

materialsRouter.post(
  MATERIALS_API_PATH,
  requirePermission(MATERIALS_PERMISSIONS.create),
  asyncHandler(materialsController.createMaterial),
);

materialsRouter.get(
  `${MATERIALS_API_PATH}/:id`,
  requirePermission(MATERIALS_PERMISSIONS.read),
  asyncHandler(materialsController.getMaterialById),
);

materialsRouter.put(
  `${MATERIALS_API_PATH}/:id`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.updateMaterial),
);

materialsRouter.delete(
  `${MATERIALS_API_PATH}/:id`,
  requirePermission(MATERIALS_PERMISSIONS.delete),
  asyncHandler(materialsController.deleteMaterial),
);

materialsRouter.get(
  `${MATERIALS_API_PATH}/:id/dimension-presets`,
  requirePermission(MATERIALS_PERMISSIONS.read),
  asyncHandler(materialsController.listMaterialDimensionPresets),
);

materialsRouter.post(
  `${MATERIALS_API_PATH}/:id/dimension-presets`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.createMaterialDimensionPreset),
);

materialsRouter.put(
  `${MATERIALS_API_PATH}/:id/dimension-presets/:presetId`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.updateMaterialDimensionPreset),
);

materialsRouter.delete(
  `${MATERIALS_API_PATH}/:id/dimension-presets/:presetId`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.deleteMaterialDimensionPreset),
);

materialsRouter.get(
  SUPPLIER_MATERIAL_EQUIVALENCES_API_PATH,
  requirePermission(MATERIALS_PERMISSIONS.read),
  asyncHandler(materialsController.listSupplierMaterialEquivalences),
);

materialsRouter.post(
  SUPPLIER_MATERIAL_EQUIVALENCES_API_PATH,
  requirePermission(MATERIALS_PERMISSIONS.create),
  asyncHandler(materialsController.createSupplierMaterialEquivalence),
);

materialsRouter.put(
  `${SUPPLIER_MATERIAL_EQUIVALENCES_API_PATH}/:id`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.updateSupplierMaterialEquivalence),
);

materialsRouter.delete(
  `${SUPPLIER_MATERIAL_EQUIVALENCES_API_PATH}/:id`,
  requirePermission(MATERIALS_PERMISSIONS.delete),
  asyncHandler(materialsController.deleteSupplierMaterialEquivalence),
);

materialsRouter.post(
  `${SUPPLIER_MATERIAL_EQUIVALENCES_API_PATH}/:id/verify`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.verifySupplierMaterialEquivalence),
);

materialsRouter.post(
  `${SUPPLIER_MATERIAL_EQUIVALENCES_API_PATH}/:id/map`,
  requirePermission(MATERIALS_PERMISSIONS.update),
  asyncHandler(materialsController.mapSupplierMaterialEquivalence),
);
