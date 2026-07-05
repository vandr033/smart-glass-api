import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { CLIENT_STATUSES, CLIENT_TYPES } from "./clients.constants.js";
const trimOrNull = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};
const nullableStringSchema = (maxLength, label) => z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => trimOrNull(value))
    .refine((value) => value === null || value.length <= maxLength, {
    message: `${label} must be ${maxLength} characters or fewer.`,
});
const nullableEmailSchema = (label) => nullableStringSchema(191, label).refine((value) => value === null || z.email().safeParse(value).success, {
    message: `${label} must be a valid email address.`,
});
const nullableCoordinateSchema = (label) => z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) {
            return null;
        }
        return Number(trimmedValue);
    }
    return value;
})
    .refine((value) => value === null || Number.isFinite(value), {
    message: `${label} must be a valid number.`,
})
    .refine((value) => value === null || value >= -90, {
    message: `${label} must be greater than or equal to -90.`,
})
    .refine((value) => value === null || value <= 90, {
    message: `${label} must be less than or equal to 90.`,
});
const nullableLongitudeSchema = (label) => z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) {
            return null;
        }
        return Number(trimmedValue);
    }
    return value;
})
    .refine((value) => value === null || Number.isFinite(value), {
    message: `${label} must be a valid number.`,
})
    .refine((value) => value === null || value >= -180, {
    message: `${label} must be greater than or equal to -180.`,
})
    .refine((value) => value === null || value <= 180, {
    message: `${label} must be less than or equal to 180.`,
});
export const clientTypeSchema = z.enum(CLIENT_TYPES);
export const clientStatusSchema = z.enum(CLIENT_STATUSES);
export const clientIdParamSchema = z.object({
    id: z.uuid(),
});
export const clientContactParamsSchema = z.object({
    contactId: z.uuid(),
    id: z.uuid(),
});
export const clientAddressParamsSchema = z.object({
    addressId: z.uuid(),
    id: z.uuid(),
});
export const clientMutationSchema = z
    .object({
    billingAddress: nullableStringSchema(255, "Billing address"),
    city: nullableStringSchema(100, "City"),
    clientType: clientTypeSchema,
    code: nullableStringSchema(100, "Code"),
    commercialName: nullableStringSchema(191, "Commercial name"),
    country: z.string().trim().min(1).max(100).default("Bolivia"),
    email: nullableEmailSchema("Email"),
    firstName: nullableStringSchema(191, "First name"),
    lastName: nullableStringSchema(191, "Last name"),
    legalName: nullableStringSchema(191, "Legal name"),
    notes: nullableStringSchema(4000, "Notes"),
    phone: nullableStringSchema(50, "Phone"),
    status: clientStatusSchema.default("ACTIVE"),
    taxId: nullableStringSchema(100, "Tax id"),
    whatsapp: nullableStringSchema(50, "WhatsApp"),
})
    .superRefine((value, context) => {
    if (value.clientType === "INDIVIDUAL") {
        if (!value.firstName && !value.lastName) {
            context.addIssue({
                code: "custom",
                message: "First name or last name is required for individual clients.",
                path: ["firstName"],
            });
        }
        return;
    }
    if (!value.legalName && !value.commercialName) {
        context.addIssue({
            code: "custom",
            message: "Legal name or commercial name is required for company clients.",
            path: ["legalName"],
        });
    }
});
export const listClientsQuerySchema = z.object({
    clientType: clientTypeSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 10, min: 1, max: 100 }),
    search: z.string().trim().default(""),
    sortBy: z.enum(["createdAt", "name", "status"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    status: clientStatusSchema.optional(),
});
export const clientContactInputSchema = z.object({
    email: nullableEmailSchema("Contact email"),
    isPrimary: z.boolean().default(false),
    name: z.string().trim().min(1, "Contact name is required.").max(191),
    notes: nullableStringSchema(4000, "Contact notes"),
    phone: nullableStringSchema(50, "Contact phone"),
    position: nullableStringSchema(191, "Contact position"),
    whatsapp: nullableStringSchema(50, "Contact WhatsApp"),
});
export const clientAddressInputSchema = z.object({
    address: z.string().trim().min(1, "Address is required.").max(255),
    city: nullableStringSchema(100, "Address city"),
    isBilling: z.boolean().default(false),
    isProjectSite: z.boolean().default(false),
    label: z.string().trim().min(1, "Label is required.").max(191),
    latitude: nullableCoordinateSchema("Latitude"),
    longitude: nullableLongitudeSchema("Longitude"),
    notes: nullableStringSchema(4000, "Address notes"),
});
//# sourceMappingURL=clients.validators.js.map