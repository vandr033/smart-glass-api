import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import {
  PROJECT_PROFITABILITY_API_PATH,
  PROJECT_PROFITABILITY_DASHBOARD_API_PATH,
  PROJECT_PROFITABILITY_PERMISSIONS,
} from "./project-profitability.constants.js";
import { projectProfitabilityController } from "./project-profitability.controller.js";

export const projectProfitabilityRouter = Router();

projectProfitabilityRouter.get(
  PROJECT_PROFITABILITY_DASHBOARD_API_PATH,
  requirePermission(PROJECT_PROFITABILITY_PERMISSIONS.view),
  asyncHandler(projectProfitabilityController.getDashboard),
);

projectProfitabilityRouter.get(
  PROJECT_PROFITABILITY_API_PATH,
  requirePermission(PROJECT_PROFITABILITY_PERMISSIONS.view),
  asyncHandler(projectProfitabilityController.listProjectProfitability),
);

projectProfitabilityRouter.get(
  `${PROJECT_PROFITABILITY_API_PATH}/projects/:id`,
  requirePermission(PROJECT_PROFITABILITY_PERMISSIONS.analyze),
  asyncHandler(projectProfitabilityController.getProjectProfitabilityByProjectId),
);
