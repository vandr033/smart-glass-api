import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
const clientListInclude = {};
const clientDetailInclude = {
    addresses: {
        orderBy: [
            {
                isBilling: "desc",
            },
            {
                label: "asc",
            },
        ],
    },
    contacts: {
        orderBy: [
            {
                isPrimary: "desc",
            },
            {
                name: "asc",
            },
        ],
    },
};
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
export const getClientDisplayName = (client) => {
    if (client.clientType === "COMPANY") {
        return (client.commercialName ??
            client.legalName ??
            `Client ${client.id.slice(0, 8).toUpperCase()}`);
    }
    const fullName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
    return fullName.length > 0 ? fullName : `Client ${client.id.slice(0, 8).toUpperCase()}`;
};
const mapClientContact = (record) => {
    return {
        createdAt: record.createdAt.toISOString(),
        email: record.email,
        id: record.id,
        isPrimary: record.isPrimary,
        name: record.name,
        notes: record.notes,
        phone: record.phone,
        position: record.position,
        updatedAt: record.updatedAt.toISOString(),
        whatsapp: record.whatsapp,
    };
};
const mapClientAddress = (record) => {
    return {
        address: record.address,
        city: record.city,
        createdAt: record.createdAt.toISOString(),
        id: record.id,
        isBilling: record.isBilling,
        isProjectSite: record.isProjectSite,
        label: record.label,
        latitude: decimalToNumber(record.latitude),
        longitude: decimalToNumber(record.longitude),
        notes: record.notes,
        updatedAt: record.updatedAt.toISOString(),
    };
};
const mapRelatedProject = (record) => {
    return {
        code: record.code,
        createdAt: record.createdAt.toISOString(),
        expectedDeliveryDate: record.expectedDeliveryDate?.toISOString() ?? null,
        id: record.id,
        priority: record.priority,
        projectType: record.projectType,
        status: record.status,
        title: record.title,
    };
};
const mapClientListItem = (record) => {
    return {
        billingAddress: record.billingAddress,
        city: record.city,
        clientType: record.clientType,
        code: record.code,
        commercialName: record.commercialName,
        country: record.country,
        createdAt: record.createdAt.toISOString(),
        displayName: getClientDisplayName(record),
        email: record.email,
        firstName: record.firstName,
        id: record.id,
        lastName: record.lastName,
        legalName: record.legalName,
        phone: record.phone,
        status: record.status,
        taxId: record.taxId,
        updatedAt: record.updatedAt.toISOString(),
        whatsapp: record.whatsapp,
    };
};
const mapClientDetail = (record, relatedProjects) => {
    return {
        ...mapClientListItem(record),
        addresses: record.addresses.map(mapClientAddress),
        contacts: record.contacts.map(mapClientContact),
        deletedAt: record.deletedAt?.toISOString() ?? null,
        notes: record.notes,
        relatedProjects,
    };
};
const buildClientOrderBy = (sortBy, sortDirection) => {
    switch (sortBy) {
        case "createdAt":
            return {
                createdAt: sortDirection,
            };
        case "name":
            return [
                {
                    commercialName: sortDirection,
                },
                {
                    legalName: sortDirection,
                },
                {
                    lastName: sortDirection,
                },
                {
                    firstName: sortDirection,
                },
            ];
        case "status":
            return {
                status: sortDirection,
            };
    }
};
const buildClientWhereClause = (query) => {
    return {
        deletedAt: null,
        ...(query.clientType
            ? {
                clientType: query.clientType,
            }
            : {}),
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        legalName: {
                            contains: query.search,
                        },
                    },
                    {
                        commercialName: {
                            contains: query.search,
                        },
                    },
                    {
                        firstName: {
                            contains: query.search,
                        },
                    },
                    {
                        lastName: {
                            contains: query.search,
                        },
                    },
                    {
                        taxId: {
                            contains: query.search,
                        },
                    },
                    {
                        phone: {
                            contains: query.search,
                        },
                    },
                    {
                        email: {
                            contains: query.search,
                        },
                    },
                ],
            }
            : {}),
    };
};
const getClientMutationData = (input) => {
    return {
        billingAddress: input.billingAddress,
        city: input.city,
        clientType: input.clientType,
        code: input.code,
        commercialName: input.commercialName,
        country: input.country,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        legalName: input.legalName,
        notes: input.notes,
        phone: input.phone,
        status: input.status,
        taxId: input.taxId,
        whatsapp: input.whatsapp,
    };
};
const translateUniqueConstraintError = (error, labelsByField) => {
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
        error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
            ? String(error.meta?.target[0] ?? "")
            : "";
        const label = labelsByField[target] ?? "record";
        throw new AppError(`A ${label} with the same value already exists.`, 409);
    }
    throw error;
};
const findClientDetailOrThrow = async (id, db = prisma) => {
    const client = await db.client.findFirst({
        include: clientDetailInclude,
        where: {
            deletedAt: null,
            id,
        },
    });
    if (!client) {
        throw new AppError("Client not found.", 404);
    }
    return client;
};
const findClientContactOrThrow = async (clientId, contactId, db = prisma) => {
    const contact = await db.clientContact.findFirst({
        where: {
            clientId,
            id: contactId,
        },
    });
    if (!contact) {
        throw new AppError("Client contact not found.", 404);
    }
    return contact;
};
const findClientAddressOrThrow = async (clientId, addressId, db = prisma) => {
    const address = await db.clientAddress.findFirst({
        where: {
            clientId,
            id: addressId,
        },
    });
    if (!address) {
        throw new AppError("Client address not found.", 404);
    }
    return address;
};
const getClientContactMutationData = (input) => {
    return {
        email: input.email,
        isPrimary: false,
        name: input.name,
        notes: input.notes,
        phone: input.phone,
        position: input.position,
        whatsapp: input.whatsapp,
    };
};
const getClientAddressMutationData = (input) => {
    return {
        address: input.address,
        city: input.city,
        isBilling: input.isBilling,
        isProjectSite: input.isProjectSite,
        label: input.label,
        latitude: input.latitude,
        longitude: input.longitude,
        notes: input.notes,
    };
};
const getRelatedProjects = async (clientId, includeRelatedProjects, db) => {
    if (!includeRelatedProjects) {
        return [];
    }
    const projects = await db.project.findMany({
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
        select: {
            code: true,
            createdAt: true,
            expectedDeliveryDate: true,
            id: true,
            priority: true,
            projectType: true,
            status: true,
            title: true,
        },
        where: {
            clientId,
            deletedAt: null,
        },
    });
    return projects.map(mapRelatedProject);
};
export const clientsService = {
    async listClients(query) {
        const where = buildClientWhereClause(query);
        const [total, clients] = await prisma.$transaction([
            prisma.client.count({
                where,
            }),
            prisma.client.findMany({
                include: clientListInclude,
                orderBy: buildClientOrderBy(query.sortBy, query.sortDirection),
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
        ]);
        return {
            data: clients.map(mapClientListItem),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getClientById(id, options) {
        const client = await findClientDetailOrThrow(id);
        const relatedProjects = await getRelatedProjects(client.id, options?.includeRelatedProjects ?? false, prisma);
        return mapClientDetail(client, relatedProjects);
    },
    async createClient(input) {
        try {
            const client = await prisma.client.create({
                data: getClientMutationData(input),
            });
            return this.getClientById(client.id);
        }
        catch (error) {
            translateUniqueConstraintError(error, {
                code: "client code",
            });
        }
        throw new Error("Estado inesperado al crear el cliente.");
    },
    async updateClient(id, input, options) {
        const previous = await this.getClientById(id, {
            includeRelatedProjects: options?.includeRelatedProjects,
        });
        try {
            await prisma.client.update({
                data: getClientMutationData(input),
                where: {
                    id: previous.id,
                },
            });
        }
        catch (error) {
            translateUniqueConstraintError(error, {
                code: "client code",
            });
        }
        const current = await this.getClientById(id, {
            includeRelatedProjects: options?.includeRelatedProjects,
        });
        return {
            current,
            previous,
        };
    },
    async deleteClient(id) {
        const existingClient = await this.getClientById(id, {
            includeRelatedProjects: true,
        });
        await prisma.client.update({
            data: {
                deletedAt: new Date(),
            },
            where: {
                id: existingClient.id,
            },
        });
        return existingClient;
    },
    async listClientContacts(clientId) {
        const client = await findClientDetailOrThrow(clientId);
        return client.contacts.map(mapClientContact);
    },
    async addClientContact(clientId, input) {
        await findClientDetailOrThrow(clientId);
        const createdContact = await prisma.$transaction(async (db) => {
            const contact = await db.clientContact.create({
                data: {
                    ...getClientContactMutationData(input),
                    clientId,
                },
            });
            if (input.isPrimary) {
                await db.clientContact.updateMany({
                    data: {
                        isPrimary: false,
                    },
                    where: {
                        clientId,
                    },
                });
                return db.clientContact.update({
                    data: {
                        isPrimary: true,
                    },
                    where: {
                        id: contact.id,
                    },
                });
            }
            return contact;
        });
        return mapClientContact(createdContact);
    },
    async updateClientContact(clientId, contactId, input) {
        return prisma.$transaction(async (db) => {
            await findClientDetailOrThrow(clientId, db);
            const existingContact = await findClientContactOrThrow(clientId, contactId, db);
            const updatedContact = await db.clientContact.update({
                data: getClientContactMutationData(input),
                where: {
                    id: existingContact.id,
                },
            });
            if (input.isPrimary) {
                await db.clientContact.updateMany({
                    data: {
                        isPrimary: false,
                    },
                    where: {
                        clientId,
                    },
                });
                const primaryContact = await db.clientContact.update({
                    data: {
                        isPrimary: true,
                    },
                    where: {
                        id: existingContact.id,
                    },
                });
                return {
                    current: mapClientContact(primaryContact),
                    previous: mapClientContact(existingContact),
                };
            }
            return {
                current: mapClientContact(updatedContact),
                previous: mapClientContact(existingContact),
            };
        });
    },
    async deleteClientContact(clientId, contactId) {
        await findClientDetailOrThrow(clientId);
        const existingContact = await findClientContactOrThrow(clientId, contactId);
        await prisma.clientContact.delete({
            where: {
                id: existingContact.id,
            },
        });
        return mapClientContact(existingContact);
    },
    async listClientAddresses(clientId) {
        const client = await findClientDetailOrThrow(clientId);
        return client.addresses.map(mapClientAddress);
    },
    async addClientAddress(clientId, input) {
        await findClientDetailOrThrow(clientId);
        const address = await prisma.clientAddress.create({
            data: {
                ...getClientAddressMutationData(input),
                clientId,
            },
        });
        return mapClientAddress(address);
    },
    async updateClientAddress(clientId, addressId, input) {
        await findClientDetailOrThrow(clientId);
        const existingAddress = await findClientAddressOrThrow(clientId, addressId);
        const updatedAddress = await prisma.clientAddress.update({
            data: getClientAddressMutationData(input),
            where: {
                id: existingAddress.id,
            },
        });
        return {
            current: mapClientAddress(updatedAddress),
            previous: mapClientAddress(existingAddress),
        };
    },
    async deleteClientAddress(clientId, addressId) {
        await findClientDetailOrThrow(clientId);
        const existingAddress = await findClientAddressOrThrow(clientId, addressId);
        await prisma.clientAddress.delete({
            where: {
                id: existingAddress.id,
            },
        });
        return mapClientAddress(existingAddress);
    },
};
//# sourceMappingURL=clients.service.js.map