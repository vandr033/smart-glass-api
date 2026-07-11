import multer from "multer";
import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  requirePermission,
} from "../../middleware/authorization-middleware.js";
import {
  GARANTIAS_PERMISSIONS,
  POSTVENTA_ACTIVITIES_API_PATH,
  POSTVENTA_CASES_API_PATH,
  POSTVENTA_PERMISSIONS,
  POSTVENTA_RESERVATIONS_API_PATH,
  POSTVENTA_WARRANTIES_API_PATH,
} from "./postventa.constants.js";
import { postventaController } from "./postventa.controller.js";

const upload = multer({
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
});

export const postventaRouter = Router();

postventaRouter.get(
  POSTVENTA_CASES_API_PATH,
  requirePermission(POSTVENTA_PERMISSIONS.ver),
  asyncHandler(postventaController.listCases),
);

postventaRouter.post(
  POSTVENTA_CASES_API_PATH,
  requirePermission(POSTVENTA_PERMISSIONS.crear),
  asyncHandler(postventaController.createCase),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/from-client/:clientId`,
  requirePermission(POSTVENTA_PERMISSIONS.crear),
  asyncHandler(postventaController.createCaseFromClient),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/from-project/:projectId`,
  requirePermission(POSTVENTA_PERMISSIONS.crear),
  asyncHandler(postventaController.createCaseFromProject),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/from-installation/:installationId`,
  requirePermission(POSTVENTA_PERMISSIONS.crear),
  asyncHandler(postventaController.createCaseFromInstallation),
);

postventaRouter.get(
  `${POSTVENTA_CASES_API_PATH}/:id`,
  requirePermission(POSTVENTA_PERMISSIONS.ver),
  asyncHandler(postventaController.getCaseById),
);

postventaRouter.put(
  `${POSTVENTA_CASES_API_PATH}/:id`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.updateCase),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/:id/asignar`,
  requirePermission(POSTVENTA_PERMISSIONS.asignar),
  asyncHandler(postventaController.assignCase),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/:id/estado`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.changeCaseStatus),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/:id/cerrar`,
  requirePermission(POSTVENTA_PERMISSIONS.cerrar),
  asyncHandler(postventaController.closeCase),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/:id/actividades`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.createActivity),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/:id/evidencias`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  upload.single("file"),
  asyncHandler(postventaController.createEvidence),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/:id/costos`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.createCost),
);

postventaRouter.post(
  `${POSTVENTA_CASES_API_PATH}/:id/reservas`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.createReservation),
);

postventaRouter.put(
  `${POSTVENTA_ACTIVITIES_API_PATH}/:activityId`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.updateActivity),
);

postventaRouter.post(
  `${POSTVENTA_RESERVATIONS_API_PATH}/:reservationLinkId/consumir`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.consumeReservation),
);

postventaRouter.post(
  `${POSTVENTA_RESERVATIONS_API_PATH}/:reservationLinkId/liberar`,
  requirePermission(POSTVENTA_PERMISSIONS.actualizar),
  asyncHandler(postventaController.releaseReservation),
);

postventaRouter.get(
  POSTVENTA_WARRANTIES_API_PATH,
  requirePermission(GARANTIAS_PERMISSIONS.ver),
  asyncHandler(postventaController.listWarranties),
);

postventaRouter.post(
  POSTVENTA_WARRANTIES_API_PATH,
  requirePermission(GARANTIAS_PERMISSIONS.crear),
  asyncHandler(postventaController.createWarranty),
);

postventaRouter.put(
  `${POSTVENTA_WARRANTIES_API_PATH}/:warrantyId`,
  requirePermission(GARANTIAS_PERMISSIONS.actualizar),
  asyncHandler(postventaController.updateWarranty),
);
