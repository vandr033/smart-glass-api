import multer from "multer";
import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { requirePermission } from "../../middleware/authorization-middleware.js";
import { CLIENT_PORTAL_ADMIN_API_PATH, CLIENT_PORTAL_PERMISSIONS, } from "./client-portal.constants.js";
import { clientPortalController } from "./client-portal.controller.js";
const upload = multer({
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    storage: multer.memoryStorage(),
});
export const clientPortalRouter = Router();
clientPortalRouter.get(`${CLIENT_PORTAL_ADMIN_API_PATH}/usuarios`, requirePermission(CLIENT_PORTAL_PERMISSIONS.ver), asyncHandler(clientPortalController.listAdminUsers));
clientPortalRouter.post(`${CLIENT_PORTAL_ADMIN_API_PATH}/usuarios/invitar`, requirePermission(CLIENT_PORTAL_PERMISSIONS.invitar), asyncHandler(clientPortalController.inviteUser));
clientPortalRouter.put(`${CLIENT_PORTAL_ADMIN_API_PATH}/usuarios/:userId`, requirePermission(CLIENT_PORTAL_PERMISSIONS.configurar), asyncHandler(clientPortalController.updateUser));
clientPortalRouter.post(`${CLIENT_PORTAL_ADMIN_API_PATH}/usuarios/:userId/estado`, requirePermission(CLIENT_PORTAL_PERMISSIONS.bloquear), asyncHandler(clientPortalController.changeUserStatus));
clientPortalRouter.post(`${CLIENT_PORTAL_ADMIN_API_PATH}/documentos`, requirePermission(CLIENT_PORTAL_PERMISSIONS.documentos), upload.single("file"), asyncHandler(clientPortalController.createDocument));
clientPortalRouter.post(`${CLIENT_PORTAL_ADMIN_API_PATH}/mensajes`, requirePermission(CLIENT_PORTAL_PERMISSIONS.mensajes), upload.single("file"), asyncHandler(clientPortalController.createInternalMessage));
//# sourceMappingURL=client-portal.routes.js.map