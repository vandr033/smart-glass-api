import { Router } from "express";

import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/authorization-middleware.js";
import { moduleRegistryService } from "../services/module-registry-service.js";
import { sendError, sendSuccess } from "../utils/response.js";

export const modulesRouter = Router();

modulesRouter.get(
  "/modules",
  requireAuth(),
  asyncHandler(async (request, response) => {
    if (!request.authorizationSummary) {
      sendError(response, "Authentication required.", 401);
      return;
    }

    const modules = await moduleRegistryService.getEnabledModules(
      request.authorizationSummary.permissions,
    );

    sendSuccess(response, modules);
  }),
);
