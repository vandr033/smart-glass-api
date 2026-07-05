import { authorizationService, createAuthorizationRequestCache, } from "../services/authorization-service.js";
import { sendError } from "../utils/response.js";
const getRequestCache = (request) => {
    request.authorizationCache ??= createAuthorizationRequestCache();
    return request.authorizationCache;
};
const getAuthenticatedUserId = (request) => {
    return request.authSession?.user.id ?? null;
};
const populateAuthorizationContext = async (request) => {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
        request.authorizationSummary = null;
        request.currentUser = null;
        return false;
    }
    const currentUser = await authorizationService.getCurrentUserWithPermissions(userId, {
        cache: getRequestCache(request),
    });
    request.currentUser = currentUser;
    request.authorizationSummary = currentUser
        ? {
            isAdmin: currentUser.isAdmin,
            isSuperAdmin: currentUser.isSuperAdmin,
            permissions: currentUser.permissions,
            roles: currentUser.roles,
            userId: currentUser.userId,
        }
        : null;
    return Boolean(currentUser);
};
export const requireAuth = () => {
    return async (request, response, next) => {
        if (!request.authSession?.session) {
            sendError(response, "Autenticacion requerida.", 401);
            return;
        }
        try {
            const isAuthenticated = await populateAuthorizationContext(request);
            if (!isAuthenticated) {
                sendError(response, "Autenticacion requerida.", 401);
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const requirePermission = (permission) => {
    return async (request, response, next) => {
        if (!request.authSession?.session) {
            sendError(response, "Autenticacion requerida.", 401);
            return;
        }
        try {
            const isAuthenticated = await populateAuthorizationContext(request);
            if (!isAuthenticated) {
                sendError(response, "Autenticacion requerida.", 401);
                return;
            }
            if (!request.authorizationSummary?.permissions.includes(permission)) {
                sendError(response, `Falta el permiso requerido: ${permission}.`, 403);
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const requireAnyPermission = (permissions) => {
    return async (request, response, next) => {
        if (!request.authSession?.session) {
            sendError(response, "Autenticacion requerida.", 401);
            return;
        }
        try {
            const isAuthenticated = await populateAuthorizationContext(request);
            if (!isAuthenticated) {
                sendError(response, "Autenticacion requerida.", 401);
                return;
            }
            const userPermissions = new Set(request.authorizationSummary?.permissions ?? []);
            if (!permissions.some((permission) => userPermissions.has(permission))) {
                sendError(response, `Falta al menos uno de los permisos requeridos: ${permissions.join(", ")}.`, 403);
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const requireAllPermissions = (permissions) => {
    return async (request, response, next) => {
        if (!request.authSession?.session) {
            sendError(response, "Autenticacion requerida.", 401);
            return;
        }
        try {
            const isAuthenticated = await populateAuthorizationContext(request);
            if (!isAuthenticated) {
                sendError(response, "Autenticacion requerida.", 401);
                return;
            }
            const userPermissions = new Set(request.authorizationSummary?.permissions ?? []);
            if (!permissions.every((permission) => userPermissions.has(permission))) {
                sendError(response, `Faltan los permisos requeridos: ${permissions.join(", ")}.`, 403);
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const requireAdmin = () => {
    return async (request, response, next) => {
        if (!request.authSession?.session) {
            sendError(response, "Autenticacion requerida.", 401);
            return;
        }
        try {
            const isAuthenticated = await populateAuthorizationContext(request);
            if (!isAuthenticated) {
                sendError(response, "Autenticacion requerida.", 401);
                return;
            }
            if (!request.authorizationSummary?.isAdmin) {
                sendError(response, "Se requiere acceso de administrador.", 403);
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
//# sourceMappingURL=authorization-middleware.js.map