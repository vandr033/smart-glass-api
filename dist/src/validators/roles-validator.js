import { z } from "zod";
import { integerQueryParamSchema } from "../utils/query-schemas.js";
import { isPermissionKeyKnown } from "../permissions/definitions.js";
const roleSortFields = ["createdAt", "name"];
const permissionNamesSchema = z
    .array(z.string().trim().min(1))
    .max(200)
    .transform((value) => Array.from(new Set(value)));
const managedPermissionNamesSchema = permissionNamesSchema.refine((value) => value.every((permissionKey) => isPermissionKeyKnown(permissionKey)), {
    message: "Some selected permissions are no longer supported by this ERP version.",
});
const roleDescriptionSchema = z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
})
    .refine((value) => value === null || value.length <= 255, {
    message: "Description must be 255 characters or fewer.",
});
export const roleIdParamSchema = z.object({
    id: z.uuid(),
});
export const listRolesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    search: z.string().trim().default(""),
    sortBy: z.enum(roleSortFields).default("name"),
    sortDirection: z.enum(["asc", "desc"]).default("asc"),
});
export const createRoleSchema = z.object({
    description: roleDescriptionSchema,
    name: z.string().trim().min(2).max(191),
    permissionNames: managedPermissionNamesSchema.default([]),
});
export const updateRoleSchema = createRoleSchema;
export const updateRolePermissionsSchema = z.object({
    permissionKeys: managedPermissionNamesSchema.default([]),
});
//# sourceMappingURL=roles-validator.js.map