import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { requirePermission } from "../middleware/authorization-middleware.js";
import { auditLog } from "../services/audit-log-service.js";
import { systemSettingsService } from "../services/system-settings-service.js";
import { getRequestLogActorContext } from "../utils/request-context.js";
import { sendSuccess } from "../utils/response.js";
import { systemSettingKeyParamSchema, updateSystemSettingSchema, } from "../validators/system-settings-validator.js";
export const settingsRouter = Router();
settingsRouter.get("/settings", requirePermission("system.settings.read"), asyncHandler(async (_request, response) => {
    const settings = await systemSettingsService.listSettings();
    sendSuccess(response, settings);
}));
settingsRouter.put("/settings/:key", requirePermission("system.settings.update"), asyncHandler(async (request, response) => {
    const { key } = systemSettingKeyParamSchema.parse(request.params);
    const payload = updateSystemSettingSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const before = await systemSettingsService.getSettingByKey(key);
    const setting = await systemSettingsService.updateSetting(key, {
        description: payload.description ?? undefined,
        valueJson: payload.valueJson,
    });
    await auditLog({
        action: "system.setting.updated",
        actorUserId: actorContext.userId ?? null,
        after: setting,
        before,
        entityId: setting.id,
        entityType: "system_setting",
        ipAddress: actorContext.ipAddress,
        metadata: {
            key: setting.key,
        },
        userAgent: actorContext.userAgent,
    });
    sendSuccess(response, setting);
}));
//# sourceMappingURL=settings-routes.js.map