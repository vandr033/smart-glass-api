import { AppError } from "../utils/app-error.js";
import { prisma } from "../utils/prisma.js";
const mapSystemSetting = (setting) => {
    return {
        createdAt: setting.createdAt.toISOString(),
        description: setting.description,
        id: setting.id,
        key: setting.key,
        updatedAt: setting.updatedAt.toISOString(),
        valueJson: setting.valueJson,
    };
};
export const systemSettingsService = {
    async getSettingByKey(key) {
        const setting = await prisma.systemSetting.findUnique({
            where: {
                key,
            },
        });
        return setting ? mapSystemSetting(setting) : null;
    },
    async listSettings() {
        const settings = await prisma.systemSetting.findMany({
            orderBy: {
                key: "asc",
            },
        });
        return settings.map(mapSystemSetting);
    },
    async updateSetting(key, input) {
        const setting = await prisma.systemSetting.upsert({
            create: {
                description: input.description ?? null,
                key,
                valueJson: input.valueJson,
            },
            update: {
                ...(input.description !== undefined
                    ? {
                        description: input.description,
                    }
                    : {}),
                valueJson: input.valueJson,
            },
            where: {
                key,
            },
        });
        return mapSystemSetting(setting);
    },
    async updateSettingOrThrow(key, input) {
        const existingSetting = await prisma.systemSetting.findUnique({
            where: {
                key,
            },
        });
        if (!existingSetting) {
            throw new AppError("System setting not found.", 404);
        }
        const setting = await prisma.systemSetting.update({
            data: {
                ...(input.description !== undefined
                    ? {
                        description: input.description,
                    }
                    : {}),
                valueJson: input.valueJson,
            },
            where: {
                key,
            },
        });
        return {
            after: mapSystemSetting(setting),
            before: mapSystemSetting(existingSetting),
        };
    },
};
//# sourceMappingURL=system-settings-service.js.map