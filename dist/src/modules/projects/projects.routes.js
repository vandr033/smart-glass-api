import multer from "multer";
import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAnyPermission, requirePermission, } from "../../middleware/authorization-middleware.js";
import { PROJECTS_API_PATH, PROJECTS_DASHBOARD_SUMMARY_API_PATH, PROJECTS_PERMISSIONS, PROJECTS_USER_OPTIONS_API_PATH, } from "./projects.constants.js";
import { projectsController } from "./projects.controller.js";
const upload = multer({
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    storage: multer.memoryStorage(),
});
export const projectsRouter = Router();
projectsRouter.get(PROJECTS_DASHBOARD_SUMMARY_API_PATH, requirePermission(PROJECTS_PERMISSIONS.read), asyncHandler(projectsController.getDashboardSummary));
projectsRouter.get(PROJECTS_USER_OPTIONS_API_PATH, requireAnyPermission([
    PROJECTS_PERMISSIONS.create,
    PROJECTS_PERMISSIONS.read,
    PROJECTS_PERMISSIONS.update,
]), asyncHandler(projectsController.listProjectUserOptions));
projectsRouter.get(PROJECTS_API_PATH, requirePermission(PROJECTS_PERMISSIONS.read), asyncHandler(projectsController.listProjects));
projectsRouter.get(`${PROJECTS_API_PATH}/:id`, requirePermission(PROJECTS_PERMISSIONS.read), asyncHandler(projectsController.getProjectById));
projectsRouter.post(PROJECTS_API_PATH, requirePermission(PROJECTS_PERMISSIONS.create), asyncHandler(projectsController.createProject));
projectsRouter.put(`${PROJECTS_API_PATH}/:id`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.updateProject));
projectsRouter.delete(`${PROJECTS_API_PATH}/:id`, requirePermission(PROJECTS_PERMISSIONS.delete), asyncHandler(projectsController.deleteProject));
projectsRouter.post(`${PROJECTS_API_PATH}/:id/transition`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.transitionProject));
projectsRouter.get(`${PROJECTS_API_PATH}/:id/status-history`, requirePermission(PROJECTS_PERMISSIONS.read), asyncHandler(projectsController.getProjectStatusHistory));
projectsRouter.get(`${PROJECTS_API_PATH}/:id/notes`, requirePermission(PROJECTS_PERMISSIONS.read), asyncHandler(projectsController.listProjectNotes));
projectsRouter.post(`${PROJECTS_API_PATH}/:id/notes`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.createProjectNote));
projectsRouter.put(`${PROJECTS_API_PATH}/:id/notes/:noteId`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.updateProjectNote));
projectsRouter.delete(`${PROJECTS_API_PATH}/:id/notes/:noteId`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.deleteProjectNote));
projectsRouter.get(`${PROJECTS_API_PATH}/:id/attachments`, requirePermission(PROJECTS_PERMISSIONS.read), asyncHandler(projectsController.listProjectAttachments));
projectsRouter.post(`${PROJECTS_API_PATH}/:id/attachments`, requirePermission(PROJECTS_PERMISSIONS.update), upload.single("file"), asyncHandler(projectsController.createProjectAttachment));
projectsRouter.delete(`${PROJECTS_API_PATH}/:id/attachments/:attachmentId`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.deleteProjectAttachment));
projectsRouter.get(`${PROJECTS_API_PATH}/:id/measurements`, requirePermission(PROJECTS_PERMISSIONS.read), asyncHandler(projectsController.listProjectMeasurements));
projectsRouter.post(`${PROJECTS_API_PATH}/:id/measurements`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.createProjectMeasurement));
projectsRouter.put(`${PROJECTS_API_PATH}/:id/measurements/:measurementId`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.updateProjectMeasurement));
projectsRouter.delete(`${PROJECTS_API_PATH}/:id/measurements/:measurementId`, requirePermission(PROJECTS_PERMISSIONS.update), asyncHandler(projectsController.deleteProjectMeasurement));
//# sourceMappingURL=projects.routes.js.map