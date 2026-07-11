import { prisma } from "../utils/prisma.js";
const normalizeModuleRecord = (moduleRecord) => {
    if (moduleRecord.key === "reports" || moduleRecord.route === "/admin/reports") {
        return {
            ...moduleRecord,
            description: "Panel ejecutivo, analisis comercial, indicadores operativos y exportaciones gerenciales.",
            key: "tableros",
            label: "Tableros ejecutivos",
            route: "/admin/tableros",
        };
    }
    return moduleRecord;
};
const mapModule = (moduleRecord) => {
    const normalizedRecord = normalizeModuleRecord(moduleRecord);
    return {
        description: normalizedRecord.description,
        icon: normalizedRecord.icon,
        key: normalizedRecord.key,
        label: normalizedRecord.label,
        requiredPermission: normalizedRecord.requiredPermission,
        route: normalizedRecord.route,
        sortOrder: normalizedRecord.sortOrder,
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