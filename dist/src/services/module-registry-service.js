import { prisma } from "../utils/prisma.js";
const mapModule = (moduleRecord) => {
    return {
        description: moduleRecord.description,
        icon: moduleRecord.icon,
        key: moduleRecord.key,
        label: moduleRecord.label,
        requiredPermission: moduleRecord.requiredPermission,
        route: moduleRecord.route,
        sortOrder: moduleRecord.sortOrder,
    };
};
export const moduleRegistryService = {
    async getEnabledModules(permissionKeys) {
        const permissionKeySet = new Set(permissionKeys);
        const moduleRecords = await prisma.moduleRegistry.findMany({
            orderBy: [
                {
                    sortOrder: "asc",
                },
                {
                    label: "asc",
                },
            ],
            select: {
                description: true,
                icon: true,
                key: true,
                label: true,
                requiredPermission: true,
                route: true,
                sortOrder: true,
            },
            where: {
                isEnabled: true,
            },
        });
        return moduleRecords
            .filter((moduleRecord) => {
            if (!moduleRecord.requiredPermission) {
                return true;
            }
            return permissionKeySet.has(moduleRecord.requiredPermission);
        })
            .map(mapModule);
    },
    async getModuleByKey(key) {
        const moduleRecord = await prisma.moduleRegistry.findUnique({
            select: {
                description: true,
                icon: true,
                key: true,
                label: true,
                requiredPermission: true,
                route: true,
                sortOrder: true,
            },
            where: {
                key,
            },
        });
        return moduleRecord ? mapModule(moduleRecord) : null;
    },
};
//# sourceMappingURL=module-registry-service.js.map