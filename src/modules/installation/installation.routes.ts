import multer from "multer";
import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../middleware/authorization-middleware.js";
import {
  INSTALLATION_CALENDAR_API_PATH,
  INSTALLATION_ISSUES_API_PATH,
  INSTALLATION_ORDERS_API_PATH,
  INSTALLATION_PERMISSIONS,
  INSTALLATION_TASKS_API_PATH,
  INSTALLATION_TEAMS_API_PATH,
} from "./installation.constants.js";
import { installationController } from "./installation.controller.js";

const upload = multer({
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
});

export const installationRouter = Router();

installationRouter.get(
  INSTALLATION_CALENDAR_API_PATH,
  requirePermission(INSTALLATION_PERMISSIONS.view),
  asyncHandler(installationController.listInstallationCalendar),
);

installationRouter.get(
  INSTALLATION_ORDERS_API_PATH,
  requirePermission(INSTALLATION_PERMISSIONS.view),
  asyncHandler(installationController.listInstallationOrders),
);

installationRouter.post(
  INSTALLATION_ORDERS_API_PATH,
  requirePermission(INSTALLATION_PERMISSIONS.create),
  asyncHandler(installationController.createInstallationOrder),
);

installationRouter.post(
  `${INSTALLATION_ORDERS_API_PATH}/from-project/:projectId`,
  requirePermission(INSTALLATION_PERMISSIONS.create),
  asyncHandler(installationController.createInstallationOrderFromProject),
);

installationRouter.post(
  `${INSTALLATION_ORDERS_API_PATH}/from-quotation/:quotationId`,
  requirePermission(INSTALLATION_PERMISSIONS.create),
  asyncHandler(installationController.createInstallationOrderFromQuotation),
);

installationRouter.get(
  `${INSTALLATION_ORDERS_API_PATH}/:id`,
  requirePermission(INSTALLATION_PERMISSIONS.view),
  asyncHandler(installationController.getInstallationOrderById),
);

installationRouter.put(
  `${INSTALLATION_ORDERS_API_PATH}/:id`,
  requirePermission(INSTALLATION_PERMISSIONS.update),
  asyncHandler(installationController.updateInstallationOrder),
);

installationRouter.post(
  `${INSTALLATION_ORDERS_API_PATH}/:id/assign`,
  requirePermission(INSTALLATION_PERMISSIONS.assign),
  asyncHandler(installationController.assignInstallationOrder),
);

installationRouter.post(
  `${INSTALLATION_ORDERS_API_PATH}/:id/reschedule`,
  requirePermission(INSTALLATION_PERMISSIONS.schedule),
  asyncHandler(installationController.rescheduleInstallationOrder),
);

installationRouter.post(
  `${INSTALLATION_ORDERS_API_PATH}/:id/status`,
  requireAnyPermission([
    INSTALLATION_PERMISSIONS.execute,
    INSTALLATION_PERMISSIONS.schedule,
    INSTALLATION_PERMISSIONS.complete,
    INSTALLATION_PERMISSIONS.cancel,
  ]),
  asyncHandler(installationController.changeInstallationOrderStatus),
);

installationRouter.post(
  `${INSTALLATION_ORDERS_API_PATH}/:id/evidence`,
  requirePermission(INSTALLATION_PERMISSIONS.execute),
  upload.single("file"),
  asyncHandler(installationController.createInstallationEvidence),
);

installationRouter.post(
  `${INSTALLATION_ORDERS_API_PATH}/:id/issues`,
  requirePermission(INSTALLATION_PERMISSIONS.execute),
  asyncHandler(installationController.createInstallationIssue),
);

installationRouter.put(
  `${INSTALLATION_TASKS_API_PATH}/:taskId`,
  requirePermission(INSTALLATION_PERMISSIONS.update),
  asyncHandler(installationController.updateInstallationTask),
);

installationRouter.post(
  `${INSTALLATION_TASKS_API_PATH}/:taskId/complete`,
  requireAnyPermission([
    INSTALLATION_PERMISSIONS.execute,
    INSTALLATION_PERMISSIONS.complete,
  ]),
  asyncHandler(installationController.completeInstallationTask),
);

installationRouter.post(
  `${INSTALLATION_ISSUES_API_PATH}/:issueId/resolve`,
  requirePermission(INSTALLATION_PERMISSIONS.update),
  asyncHandler(installationController.resolveInstallationIssue),
);

installationRouter.get(
  INSTALLATION_TEAMS_API_PATH,
  requirePermission(INSTALLATION_PERMISSIONS.view),
  asyncHandler(installationController.listInstallationTeams),
);

installationRouter.post(
  INSTALLATION_TEAMS_API_PATH,
  requirePermission(INSTALLATION_PERMISSIONS.assign),
  asyncHandler(installationController.createInstallationTeam),
);

installationRouter.put(
  `${INSTALLATION_TEAMS_API_PATH}/:teamId`,
  requirePermission(INSTALLATION_PERMISSIONS.assign),
  asyncHandler(installationController.updateInstallationTeam),
);
