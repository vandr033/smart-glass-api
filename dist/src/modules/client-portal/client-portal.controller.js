import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestIpAddress, getRequestUserAgent } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { env } from "../../utils/env.js";
import { CLIENT_PORTAL_COOKIE_NAME, CLIENT_PORTAL_ENTITY_TYPES, } from "./client-portal.constants.js";
import { clientPortalService } from "./client-portal.service.js";
import { changeClientPortalUserStatusSchema, clientPortalAcceptInvitationSchema, clientPortalCaseIdParamSchema, clientPortalClientUserIdParamSchema, clientPortalDocumentIdParamSchema, clientPortalForgotPasswordSchema, clientPortalInstallationIdParamSchema, clientPortalInvitationTokenParamSchema, clientPortalLoginSchema, clientPortalProjectIdParamSchema, clientPortalQuotationDecisionSchema, clientPortalQuotationIdParamSchema, clientPortalResetPasswordSchema, clientPortalWarrantyIdParamSchema, createClientPortalDocumentSchema, createClientPortalMessageSchema, createInternalClientPortalMessageSchema, createPortalPostventaCaseSchema, inviteClientPortalUserSchema, listPortalMessagesQuerySchema, listPortalUsersQuerySchema, updateClientPortalUserSchema, } from "./client-portal.validators.js";
const portalCookieOptions = {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
};
const getPortalUserId = (request) => {
    const userId = request.portalClientSession?.userId;
    if (!userId) {
        throw new AppError("Autenticacion requerida para el portal del cliente.", 401);
    }
    return userId;
};
const toPortalUploadFile = (file) => {
    if (!file) {
        return undefined;
    }
    return {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalName: file.originalname,
        size: file.size,
    };
};
const logPortalAuditEvent = async (request, input) => {
    await auditLogService.create({
        action: input.action,
        actorUserId: request.authSession?.user.id ?? null,
        after: input.after,
        before: input.before,
        entityId: input.entityId ?? null,
        entityType: input.entityType,
        ipAddress: getRequestIpAddress(request),
        metadata: {
            ...(input.metadata && typeof input.metadata === "object" ? input.metadata : {}),
            portalClientUserId: request.portalClientSession?.userId ?? null,
            portalClientEmail: request.portalClientSession?.email ?? null,
        },
        userAgent: getRequestUserAgent(request),
    });
};
export const clientPortalController = {
    async login(request, response) {
        const payload = clientPortalLoginSchema.parse(request.body);
        try {
            const result = await clientPortalService.login(payload);
            response.cookie(CLIENT_PORTAL_COOKIE_NAME, result.token, portalCookieOptions);
            await logPortalAuditEvent(request, {
                action: "portal_cliente.login_exitoso",
                after: {
                    email: result.user.email,
                    userId: result.user.id,
                },
                entityId: result.user.id,
                entityType: CLIENT_PORTAL_ENTITY_TYPES.usuario,
                metadata: {
                    tipoAcceso: "portal_cliente",
                },
            });
            sendSuccess(response, {
                user: result.user,
            });
        }
        catch (error) {
            await logPortalAuditEvent(request, {
                action: "portal_cliente.login_fallido",
                after: {
                    correo: payload.correo,
                },
                entityId: null,
                entityType: CLIENT_PORTAL_ENTITY_TYPES.usuario,
            });
            throw error;
        }
    },
    async logout(request, response) {
        const result = await clientPortalService.logout();
        response.clearCookie(result.cookieName, portalCookieOptions);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.logout",
            entityId: request.portalClientSession?.userId ?? null,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.usuario,
        });
        sendSuccess(response, result);
    },
    async getSession(request, response) {
        getPortalUserId(request);
        const user = await clientPortalService.getAuthenticatedPortalUser(request.portalClientSession);
        sendSuccess(response, user);
    },
    async previewInvitation(request, response) {
        const { token } = clientPortalInvitationTokenParamSchema.parse(request.params);
        const preview = await clientPortalService.previewInvitation(token);
        sendSuccess(response, preview);
    },
    async acceptInvitation(request, response) {
        const token = clientPortalInvitationTokenParamSchema.parse(request.params).token;
        const payload = clientPortalAcceptInvitationSchema.parse({
            ...request.body,
            token,
        });
        const result = await clientPortalService.acceptInvitation(payload);
        response.cookie(CLIENT_PORTAL_COOKIE_NAME, result.token, portalCookieOptions);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.invitacion_aceptada",
            after: {
                userId: result.user.id,
            },
            entityId: result.user.id,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.invitacion,
        });
        sendSuccess(response, {
            user: result.user,
        });
    },
    async requestPasswordReset(request, response) {
        const payload = clientPortalForgotPasswordSchema.parse(request.body);
        const result = await clientPortalService.requestPasswordReset(payload);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.restablecimiento_solicitado",
            after: {
                correo: payload.correo,
            },
            entityId: null,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.restablecimiento,
        });
        sendSuccess(response, result);
    },
    async resetPassword(request, response) {
        const payload = clientPortalResetPasswordSchema.parse(request.body);
        const result = await clientPortalService.resetPassword(payload);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.contrasena_restablecida",
            entityId: null,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.restablecimiento,
        });
        sendSuccess(response, result);
    },
    async listAdminUsers(request, response) {
        const query = listPortalUsersQuerySchema.parse({
            page: request.query.page,
            perPage: request.query.perPage,
            search: request.query.search,
            status: request.query.status,
        });
        const result = await clientPortalService.listAdminUsers(query);
        sendPaginated(response, {
            options: result.options,
            recentDocuments: result.recentDocuments,
            recentMessages: result.recentMessages,
            users: result.data,
        }, result.pagination);
    },
    async inviteUser(request, response) {
        const payload = inviteClientPortalUserSchema.parse(request.body);
        const result = await clientPortalService.inviteUser(payload, request.authSession?.user.id ?? null);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.invitado",
            after: result,
            entityId: result.id,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.usuario,
        });
        sendSuccess(response, result, 201);
    },
    async updateUser(request, response) {
        const { userId } = clientPortalClientUserIdParamSchema.parse(request.params);
        const payload = updateClientPortalUserSchema.parse(request.body);
        const result = await clientPortalService.updateUser(userId, payload);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.actualizado",
            after: result,
            entityId: userId,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.usuario,
        });
        sendSuccess(response, result);
    },
    async changeUserStatus(request, response) {
        const { userId } = clientPortalClientUserIdParamSchema.parse(request.params);
        const payload = changeClientPortalUserStatusSchema.parse(request.body);
        const result = await clientPortalService.changeUserStatus(userId, payload);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.estado_actualizado",
            after: result,
            entityId: userId,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.usuario,
        });
        sendSuccess(response, result);
    },
    async createDocument(request, response) {
        const payload = createClientPortalDocumentSchema.parse({
            clientId: request.body.clientId,
            name: request.body.name,
            projectId: request.body.projectId,
            type: request.body.type,
            visibleToClient: request.body.visibleToClient === "false"
                ? false
                : request.body.visibleToClient === "true"
                    ? true
                    : request.body.visibleToClient,
        });
        const file = toPortalUploadFile(request.file);
        if (!file) {
            throw new AppError("Debes adjuntar un archivo para el documento.", 400);
        }
        const result = await clientPortalService.createDocument(payload, file, request.authSession?.user.id ?? null);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.documento_creado",
            after: result,
            entityId: result.id,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.documento,
        });
        sendSuccess(response, result, 201);
    },
    async createInternalMessage(request, response) {
        const payload = createInternalClientPortalMessageSchema.parse(request.body);
        const file = toPortalUploadFile(request.file);
        const actorUserId = request.authSession?.user.id;
        if (!actorUserId) {
            throw new AppError("Autenticacion requerida.", 401);
        }
        const result = await clientPortalService.createInternalMessage(payload, actorUserId, file);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.mensaje_interno_creado",
            after: result,
            entityId: result.id,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.mensaje,
        });
        sendSuccess(response, result, 201);
    },
    async getDashboard(request, response) {
        const result = await clientPortalService.getDashboard(getPortalUserId(request));
        sendSuccess(response, result);
    },
    async listQuotations(request, response) {
        const result = await clientPortalService.listQuotations(getPortalUserId(request));
        sendSuccess(response, result);
    },
    async getQuotation(request, response) {
        const { quotationId } = clientPortalQuotationIdParamSchema.parse(request.params);
        const result = await clientPortalService.getQuotation(getPortalUserId(request), quotationId);
        sendSuccess(response, result);
    },
    async decideQuotation(request, response) {
        const { quotationId } = clientPortalQuotationIdParamSchema.parse(request.params);
        const payload = clientPortalQuotationDecisionSchema.parse(request.body);
        const result = await clientPortalService.decideQuotation(getPortalUserId(request), quotationId, payload);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.cotizacion_decidida",
            after: {
                decision: payload.decision,
                quotationId,
            },
            entityId: quotationId,
            entityType: "Quotation",
        });
        sendSuccess(response, result);
    },
    async prepareQuotationPdf(request, response) {
        const { quotationId } = clientPortalQuotationIdParamSchema.parse(request.params);
        const result = await clientPortalService.prepareQuotationPdf(getPortalUserId(request), quotationId);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.cotizacion_descargada",
            after: {
                quotationId,
            },
            entityId: quotationId,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.descarga,
        });
        sendSuccess(response, result);
    },
    async listProjects(request, response) {
        const result = await clientPortalService.listProjects(getPortalUserId(request));
        sendSuccess(response, result);
    },
    async getProject(request, response) {
        const { projectId } = clientPortalProjectIdParamSchema.parse(request.params);
        const result = await clientPortalService.getProject(getPortalUserId(request), projectId);
        sendSuccess(response, result);
    },
    async listInstallations(request, response) {
        const result = await clientPortalService.listInstallations(getPortalUserId(request));
        sendSuccess(response, result);
    },
    async getInstallation(request, response) {
        const { orderId } = clientPortalInstallationIdParamSchema.parse(request.params);
        const result = await clientPortalService.getInstallation(getPortalUserId(request), orderId);
        sendSuccess(response, result);
    },
    async prepareInstallationReport(request, response) {
        const { orderId } = clientPortalInstallationIdParamSchema.parse(request.params);
        const result = await clientPortalService.prepareInstallationReport(getPortalUserId(request), orderId);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.reporte_instalacion_descargado",
            after: {
                orderId,
            },
            entityId: orderId,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.descarga,
        });
        sendSuccess(response, result);
    },
    async listWarranties(request, response) {
        const result = await clientPortalService.listWarranties(getPortalUserId(request));
        sendSuccess(response, result);
    },
    async prepareWarrantyDocument(request, response) {
        const { warrantyId } = clientPortalWarrantyIdParamSchema.parse(request.params);
        const result = await clientPortalService.prepareWarrantyDocument(getPortalUserId(request), warrantyId);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.garantia_descargada",
            after: {
                warrantyId,
            },
            entityId: warrantyId,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.descarga,
        });
        sendSuccess(response, result);
    },
    async listPostventaCases(request, response) {
        const result = await clientPortalService.listPostventaCases(getPortalUserId(request));
        sendSuccess(response, result);
    },
    async getPostventaCase(request, response) {
        const { caseId } = clientPortalCaseIdParamSchema.parse(request.params);
        const result = await clientPortalService.getPostventaCase(getPortalUserId(request), caseId);
        sendSuccess(response, result);
    },
    async createPostventaCase(request, response) {
        const payload = createPortalPostventaCaseSchema.parse(request.body);
        const file = toPortalUploadFile(request.file);
        const result = await clientPortalService.createPostventaCase(getPortalUserId(request), payload, file);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.postventa_creada",
            after: result,
            entityId: result.id,
            entityType: "PostventaCase",
        });
        sendSuccess(response, result, 201);
    },
    async listDocuments(request, response) {
        const result = await clientPortalService.listDocuments(getPortalUserId(request));
        sendSuccess(response, result);
    },
    async prepareDocumentDownload(request, response) {
        const { documentId } = clientPortalDocumentIdParamSchema.parse(request.params);
        const result = await clientPortalService.prepareDocumentDownload(getPortalUserId(request), documentId);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.documento_descargado",
            after: {
                documentId,
                referenceId: result.referenceId,
                referenceKey: result.referenceKey,
            },
            entityId: documentId,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.descarga,
        });
        sendSuccess(response, result);
    },
    async listMessages(request, response) {
        const query = listPortalMessagesQuerySchema.parse({
            projectId: request.query.projectId,
        });
        const result = await clientPortalService.listMessages(getPortalUserId(request), query);
        sendSuccess(response, result);
    },
    async createMessage(request, response) {
        const payload = createClientPortalMessageSchema.parse(request.body);
        const file = toPortalUploadFile(request.file);
        const result = await clientPortalService.createMessage(getPortalUserId(request), payload, file);
        await logPortalAuditEvent(request, {
            action: "portal_cliente.mensaje_creado",
            after: result,
            entityId: result.id,
            entityType: CLIENT_PORTAL_ENTITY_TYPES.mensaje,
        });
        sendSuccess(response, result, 201);
    },
};
//# sourceMappingURL=client-portal.controller.js.map