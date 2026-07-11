import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAnyPermission } from "../../middleware/authorization-middleware.js";
import { INDICADORES_PERMISSIONS, LEGACY_REPORT_PERMISSIONS, REPORTES_BI_PERMISSIONS, TABLEROS_PANEL_API_PATH, TABLEROS_PERMISSIONS, } from "./tableros.constants.js";
import { tablerosController } from "./tableros.controller.js";
export const tablerosRouter = Router();
tablerosRouter.get(TABLEROS_PANEL_API_PATH, requireAnyPermission([
    TABLEROS_PERMISSIONS.ver,
    INDICADORES_PERMISSIONS.ver,
    REPORTES_BI_PERMISSIONS.ver,
    LEGACY_REPORT_PERMISSIONS.ver,
]), asyncHandler(tablerosController.getPanelEjecutivo));
//# sourceMappingURL=tableros.routes.js.map