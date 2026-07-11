export const CLIENT_PORTAL_ADMIN_API_PATH = "/portal-cliente/admin";
export const CLIENT_PORTAL_AUTH_API_PATH = "/portal-cliente/auth";
export const CLIENT_PORTAL_API_PATH = "/portal-cliente";

export const CLIENT_PORTAL_PERMISSIONS = {
  ver: "portal_cliente.ver",
  configurar: "portal_cliente.configurar",
  invitar: "portal_cliente.invitar",
  bloquear: "portal_cliente.bloquear",
  documentos: "portal_cliente.documentos",
  mensajes: "portal_cliente.mensajes",
} as const;

export const CLIENT_PORTAL_USER_STATUSES = [
  "ACTIVO",
  "INACTIVO",
  "PENDIENTE_INVITACION",
  "INVITACION_ENVIADA",
  "ACCESO_BLOQUEADO",
] as const;

export const CLIENT_PORTAL_PROJECT_ACCESS_STATUSES = [
  "ACTIVO",
  "INACTIVO",
] as const;

export const CLIENT_PORTAL_DOCUMENT_TYPES = [
  "COTIZACION",
  "CONTRATO",
  "PLANO",
  "MEDICION",
  "REPORTE_INSTALACION",
  "GARANTIA",
  "DOCUMENTO_ADICIONAL",
] as const;

export const CLIENT_PORTAL_MESSAGE_SENDERS = [
  "CLIENTE",
  "EQUIPO_INTERNO",
] as const;

export const CLIENT_PORTAL_COOKIE_NAME = "portal_cliente_token";
export const CLIENT_PORTAL_SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
export const CLIENT_PORTAL_INVITATION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
export const CLIENT_PORTAL_PASSWORD_RESET_DURATION_MS = 1000 * 60 * 30;

export const CLIENT_PORTAL_DEFAULT_PROJECT_PERMISSIONS = [
  "resumen",
  "cotizaciones",
  "proyectos",
  "instalaciones",
  "documentos",
  "garantias",
  "postventa",
  "mensajes",
] as const;

export const CLIENT_PORTAL_ENTITY_TYPES = {
  acceso: "ClientPortalProjectAccess",
  documento: "ClientPortalDocument",
  descarga: "ClientPortalDocumentDownload",
  invitacion: "ClientPortalInvitationToken",
  mensaje: "ClientPortalMessage",
  restablecimiento: "ClientPortalPasswordResetToken",
  usuario: "ClientPortalUser",
} as const;
