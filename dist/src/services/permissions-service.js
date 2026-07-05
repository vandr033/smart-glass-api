import { PERMISSION_DEFINITION_BY_KEY, PERMISSION_GROUPS, } from "../permissions/definitions.js";
export const permissionsService = {
    listPermissionGroups() {
        return PERMISSION_GROUPS.map((group) => ({
            key: group.key,
            label: group.label,
            permissions: group.permissions.map((permission) => ({
                description: permission.description,
                key: permission.key,
                label: permission.label,
            })),
        }));
    },
    listPermissions() {
        return Array.from(PERMISSION_DEFINITION_BY_KEY.values()).map((permission) => ({
            description: permission.description,
            key: permission.key,
            label: permission.label,
        }));
    },
};
//# sourceMappingURL=permissions-service.js.map