import { prisma } from "../utils/prisma.js";

export type EnabledModule = {
  description: string | null;
  icon: string | null;
  key: string;
  label: string;
  requiredPermission: string | null;
  route: string;
  sortOrder: number;
};

const normalizeModuleRecord = (moduleRecord: {
  description: string | null;
  icon: string | null;
  key: string;
  label: string;
  requiredPermission: string | null;
  route: string;
  sortOrder: number;
}) => {
  if (moduleRecord.key === "reports" || moduleRecord.route === "/admin/reports") {
    return {
      ...moduleRecord,
      description:
        "Panel ejecutivo, analisis comercial, indicadores operativos y exportaciones gerenciales.",
      key: "tableros",
      label: "Tableros ejecutivos",
      route: "/admin/tableros",
    };
  }

  return moduleRecord;
};

const mapModule = (moduleRecord: {
  description: string | null;
  icon: string | null;
  key: string;
  label: string;
  requiredPermission: string | null;
  route: string;
  sortOrder: number;
}): EnabledModule => {
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
  async getEnabledModules(
    permissionKeys: string[],
  ): Promise<EnabledModule[]> {
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

  async getModuleByKey(key: string): Promise<EnabledModule | null> {
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
