import multer from "multer";
import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { sendError } from "../../utils/response.js";
import { CLIENT_PORTAL_AUTH_API_PATH, CLIENT_PORTAL_COOKIE_NAME, CLIENT_PORTAL_API_PATH } from "./client-portal.constants.js";
import { clientPortalController } from "./client-portal.controller.js";
import { verifyClientPortalSessionToken } from "./client-portal.service.js";
const upload = multer({
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    storage: multer.memoryStorage(),
});
const parseCookies = (cookieHeader) => {
    const cookies = new Map();
    if (!cookieHeader) {
        return cookies;
    }
    cookieHeader.split(";").forEach((pair) => {
        const separatorIndex = pair.indexOf("=");
        if (separatorIndex <= 0) {
            return;
        }
        const key = pair.slice(0, separatorIndex).trim();
        const value = pair.slice(separatorIndex + 1).trim();
        if (key.length === 0) {
            return;
        }
        cookies.set(key, decodeURIComponent(value));
    });
    return cookies;
};
const requireClientPortalAuth = (request, response, next) => {
    const cookieHeader = request.headers.cookie;
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies.get(CLIENT_PORTAL_COOKIE_NAME);
    if (!sessionToken) {
        sendError(response, "Autenticacion requerida para el portal del cliente.", 401);
        return;
    }
    const session = verifyClientPortalSessionToken(sessionToken);
    if (!session) {
        sendError(response, "La sesion del portal no es valida o ya vencio.", 401);
        return;
    }
    request.portalClientSession = session;
    next();
};
export const clientPortalPublicRouter = Router();
clientPortalPublicRouter.post(`${CLIENT_PORTAL_AUTH_API_PATH}/iniciar-sesion`, asyncHandler(clientPortalController.login));
clientPortalPublicRouter.post(`${CLIENT_PORTAL_AUTH_API_PATH}/cerrar-sesion`, requireClientPortalAuth, asyncHandler(clientPortalController.logout));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_AUTH_API_PATH}/sesion`, requireClientPortalAuth, asyncHandler(clientPortalController.getSession));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_AUTH_API_PATH}/invitacion/:token`, asyncHandler(clientPortalController.previewInvitation));
clientPortalPublicRouter.post(`${CLIENT_PORTAL_AUTH_API_PATH}/invitacion/:token/aceptar`, asyncHandler(clientPortalController.acceptInvitation));
clientPortalPublicRouter.post(`${CLIENT_PORTAL_AUTH_API_PATH}/solicitar-restablecimiento`, asyncHandler(clientPortalController.requestPasswordReset));
clientPortalPublicRouter.post(`${CLIENT_PORTAL_AUTH_API_PATH}/restablecer-contrasena`, asyncHandler(clientPortalController.resetPassword));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/resumen`, requireClientPortalAuth, asyncHandler(clientPortalController.getDashboard));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/cotizaciones`, requireClientPortalAuth, asyncHandler(clientPortalController.listQuotations));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/cotizaciones/:quotationId`, requireClientPortalAuth, asyncHandler(clientPortalController.getQuotation));
clientPortalPublicRouter.post(`${CLIENT_PORTAL_API_PATH}/cotizaciones/:quotationId/decision`, requireClientPortalAuth, asyncHandler(clientPortalController.decideQuotation));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/cotizaciones/:quotationId/pdf`, requireClientPortalAuth, asyncHandler(clientPortalController.prepareQuotationPdf));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/proyectos`, requireClientPortalAuth, asyncHandler(clientPortalController.listProjects));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/proyectos/:projectId`, requireClientPortalAuth, asyncHandler(clientPortalController.getProject));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/instalaciones`, requireClientPortalAuth, asyncHandler(clientPortalController.listInstallations));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/instalaciones/:orderId`, requireClientPortalAuth, asyncHandler(clientPortalController.getInstallation));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/instalaciones/:orderId/reporte`, requireClientPortalAuth, asyncHandler(clientPortalController.prepareInstallationReport));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/garantias`, requireClientPortalAuth, asyncHandler(clientPortalController.listWarranties));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/garantias/:warrantyId/pdf`, requireClientPortalAuth, asyncHandler(clientPortalController.prepareWarrantyDocument));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/postventa`, requireClientPortalAuth, asyncHandler(clientPortalController.listPostventaCases));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/postventa/:caseId`, requireClientPortalAuth, asyncHandler(clientPortalController.getPostventaCase));
clientPortalPublicRouter.post(`${CLIENT_PORTAL_API_PATH}/postventa`, requireClientPortalAuth, upload.single("file"), asyncHandler(clientPortalController.createPostventaCase));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/documentos`, requireClientPortalAuth, asyncHandler(clientPortalController.listDocuments));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/documentos/:documentId/descargar`, requireClientPortalAuth, asyncHandler(clientPortalController.prepareDocumentDownload));
clientPortalPublicRouter.get(`${CLIENT_PORTAL_API_PATH}/mensajes`, requireClientPortalAuth, asyncHandler(clientPortalController.listMessages));
clientPortalPublicRouter.post(`${CLIENT_PORTAL_API_PATH}/mensajes`, requireClientPortalAuth, upload.single("file"), asyncHandler(clientPortalController.createMessage));
//# sourceMappingURL=client-portal-public.routes.js.map