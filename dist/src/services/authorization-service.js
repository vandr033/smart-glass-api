import { ADMIN_ROLE_NAME, SUPER_ADMIN_ROLE_NAME, isAdminRoleName, } from "../permissions/definitions.js";
import { prisma } from "../utils/prisma.js";
const buildCurrentUserWithPermissions = async (userId) => {
    const user = await prisma.user.findFirst({
        select: {
            avatar: true,
            email: true,
            id: true,
            isActive: true,
            name: true,
            userRoles: {
                select: {
                    role: {
                        select: {
                            name: true,
                            rolePermissions: {
                                select: {
                                    permission: {
                                        select: {
                                            name: true,
                                        },
                                    },
                                },
                                where: {
                                    permission: {
                                        deletedAt: null,
                                    },
                                },
                            },
                        },
                    },
                },
                where: {
                    role: {
                        deletedAt: null,
                    },
                },
            },
        },
        where: {
            deletedAt: null,
            id: userId,
            isActive: true,
        },
    });
    if (!user) {
        return null;
    }
    const roles = user.userRoles
        .map(({ role }) => role.name)
        .sort((left, right) => left.localeCompare(right));
    const permissions = Array.from(new Set(user.userRoles.flatMap(({ role }) => role.rolePermissions.map(({ permission }) => permission.name)))).sort((left, right) => left.localeCompare(right));
    const isSuperAdmin = roles.includes(SUPER_ADMIN_ROLE_NAME);
    return {
        isAdmin: roles.some((roleName) => isAdminRoleName(roleName)),
        isSuperAdmin,
        permissions,
        roles,
        user: {
            avatar: user.avatar,
            email: user.email,
            id: user.id,
            isActive: user.isActive,
            name: user.name,
        },
        userId: user.id,
    };
};
const toSummary = (currentUser) => {
    if (!currentUser) {
        return null;
    }
    return {
        isAdmin: currentUser.isAdmin,
        isSuperAdmin: currentUser.isSuperAdmin,
        permissions: currentUser.permissions,
        roles: currentUser.roles,
        userId: currentUser.userId,
    };
};
const getCachedCurrentUser = (userId, options) => {
    return options?.cache?.currentUserById.get(userId);
};
const setCachedCurrentUser = (userId, value, options) => {
    options?.cache?.currentUserById.set(userId, value);
    if (value) {
        options?.cache?.summaryByUserId.set(userId, toSummary(value));
    }
    else {
        options?.cache?.summaryByUserId.set(userId, null);
    }
    return value;
};
const getCachedSummary = (userId, options) => {
    return options?.cache?.summaryByUserId.get(userId);
};
export const createAuthorizationRequestCache = () => {
    return {
        currentUserById: new Map(),
        summaryByUserId: new Map(),
    };
};
export const authorizationService = {
    async getCurrentUserWithPermissions(userId, options) {
        const cachedUser = getCachedCurrentUser(userId, options);
        if (cachedUser !== undefined) {
            return cachedUser;
        }
        const currentUser = await buildCurrentUserWithPermissions(userId);
        return setCachedCurrentUser(userId, currentUser, options);
    },
    async getUserAuthorizationSummary(userId, options) {
        const cachedSummary = getCachedSummary(userId, options);
        if (cachedSummary !== undefined) {
            return cachedSummary;
        }
        const currentUser = await this.getCurrentUserWithPermissions(userId, options);
        return toSummary(currentUser);
    },
    async getUserPermissions(userId, options) {
        const summary = await this.getUserAuthorizationSummary(userId, options);
        return summary?.permissions ?? [];
    },
    async hasPermission(userId, permission, options) {
        const permissions = await this.getUserPermissions(userId, options);
        return permissions.includes(permission);
    },
    async hasAnyPermission(userId, permissions, options) {
        if (permissions.length === 0) {
            return true;
        }
        const userPermissions = new Set(await this.getUserPermissions(userId, options));
        return permissions.some((permission) => userPermissions.has(permission));
    },
    async hasAllPermissions(userId, permissions, options) {
        if (permissions.length === 0) {
            return true;
        }
        const userPermissions = new Set(await this.getUserPermissions(userId, options));
        return permissions.every((permission) => userPermissions.has(permission));
    },
};
export const ADMIN_ACCESS_ROLE_NAMES = [
    ADMIN_ROLE_NAME,
    SUPER_ADMIN_ROLE_NAME,
];
//# sourceMappingURL=authorization-service.js.map