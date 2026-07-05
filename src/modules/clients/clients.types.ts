import type { z } from "zod";

import type {
  clientAddressInputSchema,
  clientContactInputSchema,
  clientIdParamSchema,
  clientMutationSchema,
  clientAddressParamsSchema,
  clientContactParamsSchema,
  listClientsQuerySchema,
} from "./clients.validators.js";

export type ClientType = "INDIVIDUAL" | "COMPANY";
export type ClientStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export type ClientContactRecord = {
  createdAt: string;
  email: string | null;
  id: string;
  isPrimary: boolean;
  name: string;
  notes: string | null;
  phone: string | null;
  position: string | null;
  updatedAt: string;
  whatsapp: string | null;
};

export type ClientAddressRecord = {
  address: string;
  city: string | null;
  createdAt: string;
  id: string;
  isBilling: boolean;
  isProjectSite: boolean;
  label: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  updatedAt: string;
};

export type ClientRelatedProjectRecord = {
  code: string;
  createdAt: string;
  expectedDeliveryDate: string | null;
  id: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  projectType:
    | "WINDOW"
    | "DOOR"
    | "SHOWER"
    | "FACADE"
    | "RAILING"
    | "MIRROR"
    | "CUSTOM"
    | "SERVICE";
  status:
    | "LEAD"
    | "MEASUREMENT_PENDING"
    | "QUOTATION_PENDING"
    | "QUOTED"
    | "APPROVED"
    | "PURCHASE_PENDING"
    | "PRODUCTION_PENDING"
    | "IN_PRODUCTION"
    | "INSTALLATION_PENDING"
    | "IN_INSTALLATION"
    | "COMPLETED"
    | "CANCELLED"
    | "ON_HOLD";
  title: string;
};

export type ClientListItem = {
  billingAddress: string | null;
  city: string | null;
  clientType: ClientType;
  code: string | null;
  commercialName: string | null;
  country: string;
  createdAt: string;
  displayName: string;
  email: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  legalName: string | null;
  phone: string | null;
  status: ClientStatus;
  taxId: string | null;
  updatedAt: string;
  whatsapp: string | null;
};

export type ClientDetailRecord = ClientListItem & {
  addresses: ClientAddressRecord[];
  contacts: ClientContactRecord[];
  deletedAt: string | null;
  notes: string | null;
  relatedProjects: ClientRelatedProjectRecord[];
};

export type CreateClientInput = z.infer<typeof clientMutationSchema>;
export type UpdateClientInput = z.infer<typeof clientMutationSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
export type ClientIdParams = z.infer<typeof clientIdParamSchema>;
export type CreateClientContactInput = z.infer<typeof clientContactInputSchema>;
export type UpdateClientContactInput = z.infer<typeof clientContactInputSchema>;
export type ClientContactParams = z.infer<typeof clientContactParamsSchema>;
export type CreateClientAddressInput = z.infer<typeof clientAddressInputSchema>;
export type UpdateClientAddressInput = z.infer<typeof clientAddressInputSchema>;
export type ClientAddressParams = z.infer<typeof clientAddressParamsSchema>;
