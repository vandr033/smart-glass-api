import { Router } from "express";

import { asyncHandler } from "../middleware/async-handler.js";
import {
  requireAuth,
  requirePermission,
} from "../middleware/authorization-middleware.js";
import { permissionsService } from "../services/permissions-service.js";
import { sendError, sendSuccess } from "../utils/response.js";

export const permissionsRouter = Router();

permissionsRouter.get(
  "/permissions/me",
  requireAuth(),
  asyncHandler(async (request, response) => {
    if (!request.authorizationSummary) {
      sendError(response, "Se requiere autenticación.", 401);
      return;
    }

    sendSuccess(response, request.authorizationSummary);
  }),
);

permissionsRouter.get(
  "/permissions",
  requirePermission("system.roles.read"),
  asyncHandler(async (_request, response) => {
    sendSuccess(response, {
      groups: permissionsService.listPermissionGroups(),
      permissions: permissionsService.listPermissions(),
    });
  }),
);
