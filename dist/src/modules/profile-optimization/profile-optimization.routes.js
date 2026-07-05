import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import { QUOTATIONS_API_PATH, QUOTATION_PERMISSIONS } from "../quotations/quotations.constants.js";
import { PROFILE_CUTTING_PLANS_API_PATH, PROFILE_OPTIMIZATION_PERMISSIONS, PROFILE_OPTIMIZATIONS_API_PATH, } from "./profile-optimization.constants.js";
import { profileOptimizationController } from "./profile-optimization.controller.js";
export const profileOptimizationRouter = Router();
profileOptimizationRouter.get(PROFILE_OPTIMIZATIONS_API_PATH, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.read), asyncHandler(profileOptimizationController.listProfileOptimizations));
profileOptimizationRouter.post(`${PROFILE_OPTIMIZATIONS_API_PATH}/run`, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.run), asyncHandler(profileOptimizationController.runProfileOptimization));
profileOptimizationRouter.get(`${PROFILE_OPTIMIZATIONS_API_PATH}/:id`, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.read), asyncHandler(profileOptimizationController.getProfileOptimizationById));
profileOptimizationRouter.post(`${PROFILE_OPTIMIZATIONS_API_PATH}/:id/generate-plan`, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.run), asyncHandler(profileOptimizationController.generateProfileCuttingPlan));
profileOptimizationRouter.get(PROFILE_CUTTING_PLANS_API_PATH, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.read), asyncHandler(profileOptimizationController.listProfileCuttingPlans));
profileOptimizationRouter.get(`${PROFILE_CUTTING_PLANS_API_PATH}/:id`, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.read), asyncHandler(profileOptimizationController.getProfileCuttingPlanById));
profileOptimizationRouter.post(`${PROFILE_CUTTING_PLANS_API_PATH}/:id/create-remnants`, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.createRemnants), asyncHandler(profileOptimizationController.createProfileRemnants));
profileOptimizationRouter.get(`${QUOTATIONS_API_PATH}/:id/profile-requirements`, requirePermission(QUOTATION_PERMISSIONS.read), asyncHandler(profileOptimizationController.getQuotationProfileRequirements));
profileOptimizationRouter.post(`${QUOTATIONS_API_PATH}/:id/profile-optimization`, requirePermission(PROFILE_OPTIMIZATION_PERMISSIONS.run), asyncHandler(profileOptimizationController.runQuotationProfileOptimization));
//# sourceMappingURL=profile-optimization.routes.js.map