import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAnyPermission, requirePermission, } from "../../middleware/authorization-middleware.js";
import { PRODUCTION_JOBS_API_PATH, PRODUCTION_PERMISSIONS, PRODUCTION_TASKS_API_PATH, } from "./production.constants.js";
import { productionController } from "./production.controller.js";
import { productionBoardController } from "./production-board.controller.js";
export const productionRouter = Router();
const advancedRead = requireAnyPermission([
    PRODUCTION_PERMISSIONS.boardRead,
    PRODUCTION_PERMISSIONS.read,
]);
const advancedPlan = requireAnyPermission([
    PRODUCTION_PERMISSIONS.planningSchedule,
    PRODUCTION_PERMISSIONS.update,
]);
const advancedExecute = requireAnyPermission([
    PRODUCTION_PERMISSIONS.tasksExecute,
    PRODUCTION_PERMISSIONS.start,
]);
productionRouter.get("/production/tablero", advancedRead, asyncHandler(productionBoardController.getBoard));
productionRouter.get("/production/resumen", advancedRead, asyncHandler(productionBoardController.getSummary));
productionRouter.get("/production/centros-trabajo", advancedRead, asyncHandler(productionBoardController.listWorkCenters));
productionRouter.get("/production/capacidad", advancedRead, asyncHandler(productionBoardController.getCapacity));
productionRouter.get("/production/calendario", advancedRead, asyncHandler(productionBoardController.getCalendar));
productionRouter.get("/production/reportes", advancedRead, asyncHandler(productionBoardController.getReports));
productionRouter.get("/production/bloqueos", advancedRead, asyncHandler(productionBoardController.listBlocks));
productionRouter.post("/production/bloqueos", requireAnyPermission([
    PRODUCTION_PERMISSIONS.blocksCreate,
    PRODUCTION_PERMISSIONS.update,
]), asyncHandler(productionBoardController.createBlock));
productionRouter.post("/production/bloqueos/:blockId/resolver", requireAnyPermission([
    PRODUCTION_PERMISSIONS.blocksResolve,
    PRODUCTION_PERMISSIONS.update,
]), asyncHandler(productionBoardController.resolveBlock));
productionRouter.get("/production/exportar", requireAnyPermission([
    PRODUCTION_PERMISSIONS.export,
    PRODUCTION_PERMISSIONS.read,
]), asyncHandler(productionBoardController.exportBoard));
productionRouter.post("/production/ordenes/:id/programar", advancedPlan, asyncHandler(productionBoardController.scheduleJob));
productionRouter.post("/production/ordenes/:id/reprogramar", requireAnyPermission([
    PRODUCTION_PERMISSIONS.planningReschedule,
    PRODUCTION_PERMISSIONS.update,
]), asyncHandler(productionBoardController.scheduleJob));
productionRouter.post("/production/ordenes/:id/transicion", advancedPlan, asyncHandler(productionBoardController.transitionJob));
productionRouter.post("/production/tareas/:taskId/asignar", requireAnyPermission([
    PRODUCTION_PERMISSIONS.tasksAssign,
    PRODUCTION_PERMISSIONS.update,
]), asyncHandler(productionBoardController.assignTask));
productionRouter.post("/production/tareas/:taskId/iniciar", advancedExecute, asyncHandler(productionBoardController.transitionTask));
productionRouter.post("/production/tareas/:taskId/pausar", advancedExecute, asyncHandler(productionBoardController.transitionTask));
productionRouter.post("/production/tareas/:taskId/reanudar", advancedExecute, asyncHandler(productionBoardController.transitionTask));
productionRouter.post("/production/tareas/:taskId/bloquear", requireAnyPermission([
    PRODUCTION_PERMISSIONS.blocksCreate,
    PRODUCTION_PERMISSIONS.update,
]), asyncHandler(productionBoardController.transitionTask));
productionRouter.post("/production/tareas/:taskId/desbloquear", advancedExecute, asyncHandler(productionBoardController.transitionTask));
productionRouter.post("/production/tareas/:taskId/enviar-control", requireAnyPermission([
    PRODUCTION_PERMISSIONS.qualityApprove,
    PRODUCTION_PERMISSIONS.qualityCheck,
]), asyncHandler(productionBoardController.transitionTask));
productionRouter.post("/production/tareas/:taskId/completar", requireAnyPermission([
    PRODUCTION_PERMISSIONS.tasksComplete,
    PRODUCTION_PERMISSIONS.complete,
]), asyncHandler(productionBoardController.transitionTask));
productionRouter.post("/production/desperdicios", requireAnyPermission([
    PRODUCTION_PERMISSIONS.wasteCreate,
    PRODUCTION_PERMISSIONS.reportWaste,
]), asyncHandler(productionBoardController.createWasteEntry));
// Spanish aliases for the advanced module; the existing /production/jobs contract remains intact.
productionRouter.get("/production/ordenes", requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.listProductionJobs));
productionRouter.post("/production/ordenes", requirePermission(PRODUCTION_PERMISSIONS.create), asyncHandler(productionController.createProductionJob));
productionRouter.get("/production/ordenes/:id", requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.getProductionJobById));
productionRouter.get(PRODUCTION_JOBS_API_PATH, requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.listProductionJobs));
productionRouter.post(PRODUCTION_JOBS_API_PATH, requirePermission(PRODUCTION_PERMISSIONS.create), asyncHandler(productionController.createProductionJob));
productionRouter.get(`${PRODUCTION_JOBS_API_PATH}/:id`, requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.getProductionJobById));
productionRouter.put(`${PRODUCTION_JOBS_API_PATH}/:id`, requirePermission(PRODUCTION_PERMISSIONS.update), asyncHandler(productionController.updateProductionJob));
productionRouter.delete(`${PRODUCTION_JOBS_API_PATH}/:id`, requirePermission(PRODUCTION_PERMISSIONS.delete), asyncHandler(productionController.deleteProductionJob));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/from-quotation/:quotationId`, requirePermission(PRODUCTION_PERMISSIONS.create), asyncHandler(productionController.createProductionJobFromQuotation));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/from-cutting-plan/:cuttingPlanId`, requirePermission(PRODUCTION_PERMISSIONS.create), asyncHandler(productionController.createProductionJobFromCuttingPlan));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/from-profile-cutting-plan/:profileCuttingPlanId`, requirePermission(PRODUCTION_PERMISSIONS.create), asyncHandler(productionController.createProductionJobFromProfileCuttingPlan));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/start`, requirePermission(PRODUCTION_PERMISSIONS.start), asyncHandler(productionController.startProductionJob));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/pause`, requirePermission(PRODUCTION_PERMISSIONS.start), asyncHandler(productionController.pauseProductionJob));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/complete`, requirePermission(PRODUCTION_PERMISSIONS.complete), asyncHandler(productionController.completeProductionJob));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/cancel`, requirePermission(PRODUCTION_PERMISSIONS.delete), asyncHandler(productionController.cancelProductionJob));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/assign`, requirePermission(PRODUCTION_PERMISSIONS.update), asyncHandler(productionController.assignProductionJob));
productionRouter.get(`${PRODUCTION_JOBS_API_PATH}/:id/tasks`, requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.listProductionJobTasks));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/generate-tasks`, requirePermission(PRODUCTION_PERMISSIONS.update), asyncHandler(productionController.generateProductionTasks));
productionRouter.get(`${PRODUCTION_JOBS_API_PATH}/:id/consumption`, requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.getProductionJobConsumption));
productionRouter.get(`${PRODUCTION_JOBS_API_PATH}/:id/quality-checks`, requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.listQualityChecks));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/quality-checks`, requirePermission(PRODUCTION_PERMISSIONS.qualityCheck), asyncHandler(productionController.recordQualityCheck));
productionRouter.get(`${PRODUCTION_JOBS_API_PATH}/:id/waste-report`, requirePermission(PRODUCTION_PERMISSIONS.read), asyncHandler(productionController.getWasteReport));
productionRouter.post(`${PRODUCTION_JOBS_API_PATH}/:id/calculate-waste`, requirePermission(PRODUCTION_PERMISSIONS.reportWaste), asyncHandler(productionController.calculateWasteReport));
productionRouter.put(`${PRODUCTION_TASKS_API_PATH}/:taskId`, requirePermission(PRODUCTION_PERMISSIONS.update), asyncHandler(productionController.updateProductionTask));
productionRouter.post(`${PRODUCTION_TASKS_API_PATH}/:taskId/start`, requirePermission(PRODUCTION_PERMISSIONS.start), asyncHandler(productionController.startProductionTask));
productionRouter.post(`${PRODUCTION_TASKS_API_PATH}/:taskId/complete`, requirePermission(PRODUCTION_PERMISSIONS.complete), asyncHandler(productionController.completeProductionTask));
productionRouter.post(`${PRODUCTION_TASKS_API_PATH}/:taskId/consume-material`, requirePermission(PRODUCTION_PERMISSIONS.consumeMaterial), asyncHandler(productionController.consumeMaterialForTask));
//# sourceMappingURL=production.routes.js.map