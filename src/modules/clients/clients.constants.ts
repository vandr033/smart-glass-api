export const CLIENTS_API_PATH = "/clients";

export const CLIENTS_PERMISSIONS = {
  create: "clients.create",
  delete: "clients.delete",
  read: "clients.read",
  update: "clients.update",
} as const;

export const CLIENT_TYPES = ["INDIVIDUAL", "COMPANY"] as const;
export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;

export const CLIENT_ENTITY_TYPE = "Client";
export const CLIENT_CONTACT_ENTITY_TYPE = "ClientContact";
export const CLIENT_ADDRESS_ENTITY_TYPE = "ClientAddress";
