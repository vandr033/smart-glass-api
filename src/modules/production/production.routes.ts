import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import {
  PRODUCTION_JOBS_API_PATH,
  PRODUCTION_PERMISSIONS,
  PRODUCTION_TASKS_API_PATH,
} from "./production.constants.js";
import { productionController } from "./production.controller.js";

export const productionRouter = Router();

productionRouter.get(
  PRODUCTION_JOBS_API_PATH,
  requirePermission(PRODUCTION_PERMISSIONS.read),
  asyncHandler(productionController.listProductionJobs),
);

productionRouter.post(
  PRODUCTION_JOBS_API_PATH,
  requirePermission(PRODUCTION_PERMISSIONS.create),
  asyncHandler(productionController.createProductionJob),
);

productionRouter.get(
  `${PRODUCTION_JOBS_API_PATH}/:id`,
  requirePermission(PRODUCTION_PERMISSIONS.read),
  asyncHandler(productionController.getProductionJobById),
);

productionRouter.put(
  `${PRODUCTION_JOBS_API_PATH}/:id`,
  requirePermission(PRODUCTION_PERMISSIONS.update),
  asyncHandler(productionController.updateProductionJob),
);

productionRouter.delete(
  `${PRODUCTION_JOBS_API_PATH}/:id`,
  requirePermission(PRODUCTION_PERMISSIONS.delete),
  asyncHandler(productionController.deleteProductionJob),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/from-quotation/:quotationId`,
  requirePermission(PRODUCTION_PERMISSIONS.create),
  asyncHandler(productionController.createProductionJobFromQuotation),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/from-cutting-plan/:cuttingPlanId`,
  requirePermission(PRODUCTION_PERMISSIONS.create),
  asyncHandler(productionController.createProductionJobFromCuttingPlan),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/from-profile-cutting-plan/:profileCuttingPlanId`,
  requirePermission(PRODUCTION_PERMISSIONS.create),
  asyncHandler(productionController.createProductionJobFromProfileCuttingPlan),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/start`,
  requirePermission(PRODUCTION_PERMISSIONS.start),
  asyncHandler(productionController.startProductionJob),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/pause`,
  requirePermission(PRODUCTION_PERMISSIONS.start),
  asyncHandler(productionController.pauseProductionJob),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/complete`,
  requirePermission(PRODUCTION_PERMISSIONS.complete),
  asyncHandler(productionController.completeProductionJob),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/cancel`,
  requirePermission(PRODUCTION_PERMISSIONS.delete),
  asyncHandler(productionController.cancelProductionJob),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/assign`,
  requirePermission(PRODUCTION_PERMISSIONS.update),
  asyncHandler(productionController.assignProductionJob),
);

productionRouter.get(
  `${PRODUCTION_JOBS_API_PATH}/:id/tasks`,
  requirePermission(PRODUCTION_PERMISSIONS.read),
  asyncHandler(productionController.listProductionJobTasks),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/generate-tasks`,
  requirePermission(PRODUCTION_PERMISSIONS.update),
  asyncHandler(productionController.generateProductionTasks),
);

productionRouter.get(
  `${PRODUCTION_JOBS_API_PATH}/:id/consumption`,
  requirePermission(PRODUCTION_PERMISSIONS.read),
  asyncHandler(productionController.getProductionJobConsumption),
);

productionRouter.get(
  `${PRODUCTION_JOBS_API_PATH}/:id/quality-checks`,
  requirePermission(PRODUCTION_PERMISSIONS.read),
  asyncHandler(productionController.listQualityChecks),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/quality-checks`,
  requirePermission(PRODUCTION_PERMISSIONS.qualityCheck),
  asyncHandler(productionController.recordQualityCheck),
);

productionRouter.get(
  `${PRODUCTION_JOBS_API_PATH}/:id/waste-report`,
  requirePermission(PRODUCTION_PERMISSIONS.read),
  asyncHandler(productionController.getWasteReport),
);

productionRouter.post(
  `${PRODUCTION_JOBS_API_PATH}/:id/calculate-waste`,
  requirePermission(PRODUCTION_PERMISSIONS.reportWaste),
  asyncHandler(productionController.calculateWasteReport),
);

productionRouter.put(
  `${PRODUCTION_TASKS_API_PATH}/:taskId`,
  requirePermission(PRODUCTION_PERMISSIONS.update),
  asyncHandler(productionController.updateProductionTask),
);

productionRouter.post(
  `${PRODUCTION_TASKS_API_PATH}/:taskId/start`,
  requirePermission(PRODUCTION_PERMISSIONS.start),
  asyncHandler(productionController.startProductionTask),
);

productionRouter.post(
  `${PRODUCTION_TASKS_API_PATH}/:taskId/complete`,
  requirePermission(PRODUCTION_PERMISSIONS.complete),
  asyncHandler(productionController.completeProductionTask),
);

productionRouter.post(
  `${PRODUCTION_TASKS_API_PATH}/:taskId/consume-material`,
  requirePermission(PRODUCTION_PERMISSIONS.consumeMaterial),
  asyncHandler(productionController.consumeMaterialForTask),
);
