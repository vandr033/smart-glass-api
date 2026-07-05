import type { Request, Response } from "express";

import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import {
  CLIENT_ADDRESS_ENTITY_TYPE,
  CLIENT_CONTACT_ENTITY_TYPE,
  CLIENT_ENTITY_TYPE,
  CLIENTS_PERMISSIONS,
} from "./clients.constants.js";
import { clientsService } from "./clients.service.js";
import {
  clientAddressInputSchema,
  clientAddressParamsSchema,
  clientContactInputSchema,
  clientContactParamsSchema,
  clientIdParamSchema,
  clientMutationSchema,
  listClientsQuerySchema,
} from "./clients.validators.js";

const getQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return undefined;
};

const getRequiredClientId = (value: string | string[] | undefined): string => {
  const clientId = Array.isArray(value) ? value[0] : value;

  if (!clientId) {
    throw new AppError("Client id is required.", 400);
  }

  return clientIdParamSchema.parse({
    id: clientId,
  }).id;
};

const getRequiredContactParams = (
  clientId: string | string[] | undefined,
  contactId: string | string[] | undefined,
) => {
  const normalizedClientId = Array.isArray(clientId) ? clientId[0] : clientId;
  const normalizedContactId = Array.isArray(contactId) ? contactId[0] : contactId;

  if (!normalizedClientId || !normalizedContactId) {
    throw new AppError("Client and contact ids are required.", 400);
  }

  return clientContactParamsSchema.parse({
    contactId: normalizedContactId,
    id: normalizedClientId,
  });
};

const getRequiredAddressParams = (
  clientId: string | string[] | undefined,
  addressId: string | string[] | undefined,
) => {
  const normalizedClientId = Array.isArray(clientId) ? clientId[0] : clientId;
  const normalizedAddressId = Array.isArray(addressId) ? addressId[0] : addressId;

  if (!normalizedClientId || !normalizedAddressId) {
    throw new AppError("Client and address ids are required.", 400);
  }

  return clientAddressParamsSchema.parse({
    addressId: normalizedAddressId,
    id: normalizedClientId,
  });
};

const canReadProjects = (request: Request): boolean => {
  return request.authorizationSummary?.permissions.includes("projects.read") ?? false;
};

const logAuditEvent = async (
  request: Request,
  input: {
    action: string;
    after: unknown;
    before: unknown;
    entityId: string;
    entityType: string;
    metadata?: unknown;
  },
) => {
  const actorContext = getRequestLogActorContext(request);

  await auditLogService.create({
    action: input.action,
    actorUserId: actorContext.userId,
    after: input.after,
    before: input.before,
    entityId: input.entityId,
    entityType: input.entityType,
    ipAddress: actorContext.ipAddress,
    metadata: input.metadata,
    userAgent: actorContext.userAgent,
  });
};

const logActivityEvent = async (
  request: Request,
  input: {
    action: string;
    entityId: string;
    entityType: string;
    metadata?: unknown;
  },
) => {
  const actorContext = getRequestLogActorContext(request);

  await activityLogService.logUserAction({
    ...actorContext,
    action: input.action,
    entityId: input.entityId,
    entityType: input.entityType,
    metadata: input.metadata,
  });
};

export const clientsController = {
  async listClients(request: Request, response: Response) {
    const query = listClientsQuerySchema.parse({
      clientType: getQueryValue(request.query["filter.clientType"]),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
    });

    const result = await clientsService.listClients(query);
    sendPaginated(response, result.data, result.pagination);
  },

  async getClientById(request: Request, response: Response) {
    const client = await clientsService.getClientById(
      getRequiredClientId(request.params.id),
      {
        includeRelatedProjects: canReadProjects(request),
      },
    );

    sendSuccess(response, client);
  },

  async createClient(request: Request, response: Response) {
    const payload = clientMutationSchema.parse(request.body);
    const client = await clientsService.createClient(payload);

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.create,
        entityId: client.id,
        entityType: CLIENT_ENTITY_TYPE,
        metadata: {
          displayName: client.displayName,
        },
      }),
      logAuditEvent(request, {
        action: "client.created",
        after: client,
        before: null,
        entityId: client.id,
        entityType: CLIENT_ENTITY_TYPE,
        metadata: {
          displayName: client.displayName,
        },
      }),
    ]);

    sendSuccess(response, client, 201);
  },

  async updateClient(request: Request, response: Response) {
    const clientId = getRequiredClientId(request.params.id);
    const payload = clientMutationSchema.parse(request.body);
    const result = await clientsService.updateClient(clientId, payload, {
      includeRelatedProjects: canReadProjects(request),
    });

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.update,
        entityId: result.current.id,
        entityType: CLIENT_ENTITY_TYPE,
        metadata: {
          displayName: result.current.displayName,
        },
      }),
      logAuditEvent(request, {
        action: "client.updated",
        after: result.current,
        before: result.previous,
        entityId: result.current.id,
        entityType: CLIENT_ENTITY_TYPE,
        metadata: {
          displayName: result.current.displayName,
        },
      }),
    ]);

    sendSuccess(response, result.current);
  },

  async deleteClient(request: Request, response: Response) {
    const client = await clientsService.deleteClient(getRequiredClientId(request.params.id));

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.delete,
        entityId: client.id,
        entityType: CLIENT_ENTITY_TYPE,
        metadata: {
          displayName: client.displayName,
        },
      }),
      logAuditEvent(request, {
        action: "client.deleted",
        after: null,
        before: client,
        entityId: client.id,
        entityType: CLIENT_ENTITY_TYPE,
        metadata: {
          displayName: client.displayName,
        },
      }),
    ]);

    sendSuccess(response, {
      deleted: true,
      id: client.id,
    });
  },

  async listClientContacts(request: Request, response: Response) {
    const contacts = await clientsService.listClientContacts(
      getRequiredClientId(request.params.id),
    );

    sendSuccess(response, contacts);
  },

  async createClientContact(request: Request, response: Response) {
    const clientId = getRequiredClientId(request.params.id);
    const payload = clientContactInputSchema.parse(request.body);
    const contact = await clientsService.addClientContact(clientId, payload);

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.update,
        entityId: contact.id,
        entityType: CLIENT_CONTACT_ENTITY_TYPE,
        metadata: {
          clientId,
          name: contact.name,
        },
      }),
      logAuditEvent(request, {
        action: "client_contact.created",
        after: contact,
        before: null,
        entityId: contact.id,
        entityType: CLIENT_CONTACT_ENTITY_TYPE,
        metadata: {
          clientId,
        },
      }),
    ]);

    sendSuccess(response, contact, 201);
  },

  async updateClientContact(request: Request, response: Response) {
    const params = getRequiredContactParams(request.params.id, request.params.contactId);
    const payload = clientContactInputSchema.parse(request.body);
    const result = await clientsService.updateClientContact(
      params.id,
      params.contactId,
      payload,
    );

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.update,
        entityId: result.current.id,
        entityType: CLIENT_CONTACT_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
          name: result.current.name,
        },
      }),
      logAuditEvent(request, {
        action: "client_contact.updated",
        after: result.current,
        before: result.previous,
        entityId: result.current.id,
        entityType: CLIENT_CONTACT_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
        },
      }),
    ]);

    sendSuccess(response, result.current);
  },

  async deleteClientContact(request: Request, response: Response) {
    const params = getRequiredContactParams(request.params.id, request.params.contactId);
    const contact = await clientsService.deleteClientContact(params.id, params.contactId);

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.update,
        entityId: contact.id,
        entityType: CLIENT_CONTACT_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
          name: contact.name,
        },
      }),
      logAuditEvent(request, {
        action: "client_contact.deleted",
        after: null,
        before: contact,
        entityId: contact.id,
        entityType: CLIENT_CONTACT_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
        },
      }),
    ]);

    sendSuccess(response, {
      deleted: true,
      id: contact.id,
    });
  },

  async listClientAddresses(request: Request, response: Response) {
    const addresses = await clientsService.listClientAddresses(
      getRequiredClientId(request.params.id),
    );

    sendSuccess(response, addresses);
  },

  async createClientAddress(request: Request, response: Response) {
    const clientId = getRequiredClientId(request.params.id);
    const payload = clientAddressInputSchema.parse(request.body);
    const address = await clientsService.addClientAddress(clientId, payload);

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.update,
        entityId: address.id,
        entityType: CLIENT_ADDRESS_ENTITY_TYPE,
        metadata: {
          clientId,
          label: address.label,
        },
      }),
      logAuditEvent(request, {
        action: "client_address.created",
        after: address,
        before: null,
        entityId: address.id,
        entityType: CLIENT_ADDRESS_ENTITY_TYPE,
        metadata: {
          clientId,
        },
      }),
    ]);

    sendSuccess(response, address, 201);
  },

  async updateClientAddress(request: Request, response: Response) {
    const params = getRequiredAddressParams(request.params.id, request.params.addressId);
    const payload = clientAddressInputSchema.parse(request.body);
    const result = await clientsService.updateClientAddress(
      params.id,
      params.addressId,
      payload,
    );

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.update,
        entityId: result.current.id,
        entityType: CLIENT_ADDRESS_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
          label: result.current.label,
        },
      }),
      logAuditEvent(request, {
        action: "client_address.updated",
        after: result.current,
        before: result.previous,
        entityId: result.current.id,
        entityType: CLIENT_ADDRESS_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
        },
      }),
    ]);

    sendSuccess(response, result.current);
  },

  async deleteClientAddress(request: Request, response: Response) {
    const params = getRequiredAddressParams(request.params.id, request.params.addressId);
    const address = await clientsService.deleteClientAddress(
      params.id,
      params.addressId,
    );

    await Promise.all([
      logActivityEvent(request, {
        action: CLIENTS_PERMISSIONS.update,
        entityId: address.id,
        entityType: CLIENT_ADDRESS_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
          label: address.label,
        },
      }),
      logAuditEvent(request, {
        action: "client_address.deleted",
        after: null,
        before: address,
        entityId: address.id,
        entityType: CLIENT_ADDRESS_ENTITY_TYPE,
        metadata: {
          clientId: params.id,
        },
      }),
    ]);

    sendSuccess(response, {
      deleted: true,
      id: address.id,
    });
  },
};
