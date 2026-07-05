import {
  ADMIN_ROLE_NAME,
  SUPER_ADMIN_ROLE_NAME,
  isAdminRoleName,
} from "../permissions/definitions.js";
import { prisma } from "../utils/prisma.js";

export type AuthorizationSummary = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  roles: string[];
  userId: string;
};

export type CurrentUserWithPermissions = AuthorizationSummary & {
  user: {
    avatar: string | null;
    email: string;
    id: string;
    isActive: boolean;
    name: string;
  };
};

export type AuthorizationRequestCache = {
  currentUserById: Map<string, CurrentUserWithPermissions | null>;
  summaryByUserId: Map<string, AuthorizationSummary | null>;
};

type AuthorizationLookupOptions = {
  cache?: AuthorizationRequestCache;
};

const buildCurrentUserWithPermissions = async (
  userId: string,
): Promise<CurrentUserWithPermissions | null> => {
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

  const permissions = Array.from(
    new Set(
      user.userRoles.flatMap(({ role }) =>
        role.rolePermissions.map(({ permission }) => permission.name),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));

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

const toSummary = (
  currentUser: CurrentUserWithPermissions | null,
): AuthorizationSummary | null => {
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

const getCachedCurrentUser = (
  userId: string,
  options?: AuthorizationLookupOptions,
): CurrentUserWithPermissions | null | undefined => {
  return options?.cache?.currentUserById.get(userId);
};

const setCachedCurrentUser = (
  userId: string,
  value: CurrentUserWithPermissions | null,
  options?: AuthorizationLookupOptions,
): CurrentUserWithPermissions | null => {
  options?.cache?.currentUserById.set(userId, value);

  if (value) {
    options?.cache?.summaryByUserId.set(userId, toSummary(value));
  } else {
    options?.cache?.summaryByUserId.set(userId, null);
  }

  return value;
};

const getCachedSummary = (
  userId: string,
  options?: AuthorizationLookupOptions,
): AuthorizationSummary | null | undefined => {
  return options?.cache?.summaryByUserId.get(userId);
};

export const createAuthorizationRequestCache = (): AuthorizationRequestCache => {
  return {
    currentUserById: new Map(),
    summaryByUserId: new Map(),
  };
};

export const authorizationService = {
  async getCurrentUserWithPermissions(
    userId: string,
    options?: AuthorizationLookupOptions,
  ): Promise<CurrentUserWithPermissions | null> {
    const cachedUser = getCachedCurrentUser(userId, options);

    if (cachedUser !== undefined) {
      return cachedUser;
    }

    const currentUser = await buildCurrentUserWithPermissions(userId);
    return setCachedCurrentUser(userId, currentUser, options);
  },

  async getUserAuthorizationSummary(
    userId: string,
    options?: AuthorizationLookupOptions,
  ): Promise<AuthorizationSummary | null> {
    const cachedSummary = getCachedSummary(userId, options);

    if (cachedSummary !== undefined) {
      return cachedSummary;
    }

    const currentUser = await this.getCurrentUserWithPermissions(userId, options);
    return toSummary(currentUser);
  },

  async getUserPermissions(
    userId: string,
    options?: AuthorizationLookupOptions,
  ): Promise<string[]> {
    const summary = await this.getUserAuthorizationSummary(userId, options);
    return summary?.permissions ?? [];
  },

  async hasPermission(
    userId: string,
    permission: string,
    options?: AuthorizationLookupOptions,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, options);
    return permissions.includes(permission);
  },

  async hasAnyPermission(
    userId: string,
    permissions: string[],
    options?: AuthorizationLookupOptions,
  ): Promise<boolean> {
    if (permissions.length === 0) {
      return true;
    }

    const userPermissions = new Set(await this.getUserPermissions(userId, options));
    return permissions.some((permission) => userPermissions.has(permission));
  },

  async hasAllPermissions(
    userId: string,
    permissions: string[],
    options?: AuthorizationLookupOptions,
  ): Promise<boolean> {
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
] as const;
