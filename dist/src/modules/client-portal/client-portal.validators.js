import { z } from "zod";
import { integerQueryParamSchema } from "../../utils/query-schemas.js";
import { CLIENT_PORTAL_DOCUMENT_TYPES, CLIENT_PORTAL_MESSAGE_SENDERS, CLIENT_PORTAL_USER_STATUSES, } from "./client-portal.constants.js";
const trimToNull = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
};
const normalizedTextSchema = (maxLength, label) => z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => trimToNull(value))
    .refine((value) => value === null || value.length <= maxLength, {
    message: `${label} debe tener ${maxLength} caracteres o menos.`,
});
const nullableUuidSchema = z
    .union([z.uuid(), z.null(), z.undefined()])
    .transform((value) => value ?? null);
const requiredUuidSchema = (label) => z.uuid({
    message: `${label} no es valido.`,
});
const normalizedDateSchema = (label) => z
    .union([z.string(), z.date()])
    .transform((value) => {
    if (value instanceof Date) {
        return value;
    }
    const normalizedValue = value.trim();
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
        ? `${normalizedValue}T00:00:00.000Z`
        : normalizedValue);
})
    .refine((value) => !Number.isNaN(value.getTime()), {
    message: `${label} no es valida.`,
});
export const clientPortalUserStatusSchema = z.enum(CLIENT_PORTAL_USER_STATUSES);
export const clientPortalDocumentTypeSchema = z.enum(CLIENT_PORTAL_DOCUMENT_TYPES);
export const clientPortalMessageSenderSchema = z.enum(CLIENT_PORTAL_MESSAGE_SENDERS);
export const clientPortalClientUserIdParamSchema = z.object({
    userId: requiredUuidSchema("El usuario del portal"),
});
export const clientPortalProjectIdParamSchema = z.object({
    projectId: requiredUuidSchema("El proyecto"),
});
export const clientPortalQuotationIdParamSchema = z.object({
    quotationId: requiredUuidSchema("La cotizacion"),
});
export const clientPortalInstallationIdParamSchema = z.object({
    orderId: requiredUuidSchema("La instalacion"),
});
export const clientPortalCaseIdParamSchema = z.object({
    caseId: requiredUuidSchema("El caso postventa"),
});
export const clientPortalWarrantyIdParamSchema = z.object({
    warrantyId: requiredUuidSchema("La garantia"),
});
export const clientPortalDocumentIdParamSchema = z.object({
    documentId: requiredUuidSchema("El documento"),
});
export const clientPortalMessageIdParamSchema = z.object({
    messageId: requiredUuidSchema("El mensaje"),
});
export const clientPortalInvitationTokenParamSchema = z.object({
    token: z.string().trim().min(20, "El token de invitacion no es valido."),
});
export const clientPortalResetTokenParamSchema = z.object({
    token: z.string().trim().min(20, "El token de restablecimiento no es valido."),
});
export const inviteClientPortalUserSchema = z.object({
    clientId: requiredUuidSchema("El cliente"),
    email: z.email("El correo debe ser valido.").transform((value) => value.trim().toLowerCase()),
    name: z
        .string()
        .trim()
        .min(1, "El nombre es obligatorio.")
        .max(191, "El nombre debe tener 191 caracteres o menos."),
    phone: normalizedTextSchema(50, "El telefono"),
    projectIds: z
        .array(z.uuid())
        .min(1, "Debes habilitar al menos un proyecto.")
        .max(100, "Solo puedes habilitar hasta 100 proyectos por invitacion."),
});
export const updateClientPortalUserSchema = z.object({
    name: z
        .union([z.string(), z.undefined()])
        .transform((value) => value?.trim())
        .refine((value) => value === undefined || value.length > 0, {
        message: "El nombre no puede quedar vacio.",
    })
        .refine((value) => value === undefined || value.length <= 191, {
        message: "El nombre debe tener 191 caracteres o menos.",
    }),
    phone: normalizedTextSchema(50, "El telefono").optional(),
    projectIds: z
        .array(z.uuid())
        .min(1, "Debes habilitar al menos un proyecto.")
        .max(100, "Solo puedes habilitar hasta 100 proyectos por usuario.")
        .optional(),
    status: clientPortalUserStatusSchema.optional(),
});
export const changeClientPortalUserStatusSchema = z.object({
    motivo: normalizedTextSchema(500, "El motivo"),
    status: clientPortalUserStatusSchema,
});
export const clientPortalLoginSchema = z.object({
    correo: z.email("El correo debe ser valido.").transform((value) => value.trim().toLowerCase()),
    contrasena: z
        .string()
        .min(8, "La contrasena debe tener al menos 8 caracteres.")
        .max(128, "La contrasena debe tener 128 caracteres o menos."),
});
export const clientPortalForgotPasswordSchema = z.object({
    correo: z.email("El correo debe ser valido.").transform((value) => value.trim().toLowerCase()),
});
export const clientPortalResetPasswordSchema = z.object({
    contrasena: z
        .string()
        .min(8, "La contrasena debe tener al menos 8 caracteres.")
        .max(128, "La contrasena debe tener 128 caracteres o menos."),
    token: z.string().trim().min(20, "El token no es valido."),
});
export const clientPortalAcceptInvitationSchema = z.object({
    contrasena: z
        .string()
        .min(8, "La contrasena debe tener al menos 8 caracteres.")
        .max(128, "La contrasena debe tener 128 caracteres o menos."),
    telefono: normalizedTextSchema(50, "El telefono"),
    token: z.string().trim().min(20, "El token de invitacion no es valido."),
});
export const clientPortalQuotationDecisionSchema = z
    .object({
    decision: z.enum(["ACEPTAR", "RECHAZAR"]),
    motivo: normalizedTextSchema(1000, "El motivo"),
})
    .refine((value) => value.decision === "ACEPTAR" || (value.motivo ?? "").length > 0, {
    message: "Debes indicar un motivo cuando rechazas la cotizacion.",
    path: ["motivo"],
});
export const createClientPortalDocumentSchema = z.object({
    clientId: requiredUuidSchema("El cliente"),
    name: z
        .string()
        .trim()
        .min(1, "El nombre del documento es obligatorio.")
        .max(255, "El nombre del documento debe tener 255 caracteres o menos."),
    projectId: nullableUuidSchema,
    type: clientPortalDocumentTypeSchema,
    visibleToClient: z.boolean().default(true),
});
export const createClientPortalMessageSchema = z.object({
    mensaje: z
        .string()
        .trim()
        .min(1, "El mensaje es obligatorio.")
        .max(4000, "El mensaje debe tener 4000 caracteres o menos."),
    projectId: requiredUuidSchema("El proyecto"),
});
export const createInternalClientPortalMessageSchema = z.object({
    mensaje: z
        .string()
        .trim()
        .min(1, "El mensaje es obligatorio.")
        .max(4000, "El mensaje debe tener 4000 caracteres o menos."),
    projectId: requiredUuidSchema("El proyecto"),
    sender: clientPortalMessageSenderSchema.default("EQUIPO_INTERNO"),
});
export const createPortalPostventaCaseSchema = z.object({
    descripcion: z
        .string()
        .trim()
        .min(1, "La descripcion del caso es obligatoria.")
        .max(4000, "La descripcion debe tener 4000 caracteres o menos."),
    installationId: nullableUuidSchema,
    prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA"),
    projectId: nullableUuidSchema,
    quotationId: nullableUuidSchema,
    reportedAt: normalizedDateSchema("La fecha del reporte"),
    tipo: z
        .enum([
        "GARANTIA",
        "RECLAMO",
        "AJUSTE",
        "ROTURA",
        "FUGA",
        "MALA_INSTALACION",
        "PRODUCTO_INCOMPLETO",
        "REPOSICION",
        "OTRO",
    ])
        .default("RECLAMO"),
    warrantyId: nullableUuidSchema,
});
export const listPortalMessagesQuerySchema = z.object({
    projectId: z.union([z.uuid(), z.undefined()]).optional(),
});
export const listPortalUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: integerQueryParamSchema({ defaultValue: 20, min: 1, max: 100 }),
    search: z.string().trim().default(""),
    status: clientPortalUserStatusSchema.optional(),
});
//# sourceMappingURL=client-portal.validators.js.map