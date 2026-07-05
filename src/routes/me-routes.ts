import { Router } from "express";

import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/authorization-middleware.js";
import { moduleRegistryService } from "../services/module-registry-service.js";
import { sendError, sendSuccess } from "../utils/response.js";

export const meRouter = Router();

meRouter.get(
  "/me",
  requireAuth(),
  asyncHandler(async (request, response) => {
    if (!request.currentUser || !request.authorizationSummary) {
      sendError(response, "Authentication required.", 401);
      return;
    }

    const enabledModules = await moduleRegistryService.getEnabledModules(
      request.authorizationSummary.permissions,
    );

    sendSuccess(response, {
      enabledModules,
      isAdmin: request.currentUser.isAdmin,
      isSuperAdmin: request.currentUser.isSuperAdmin,
      permissions: request.currentUser.permissions,
      roles: request.currentUser.roles,
      user: request.currentUser.user,
    });
  }),
);
