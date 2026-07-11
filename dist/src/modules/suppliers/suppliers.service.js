import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
const supplierListInclude = {
    categoryAssignments: {
        select: {
            category: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
};
const supplierDetailInclude = {
    ...supplierListInclude,
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
const roundToTwoDecimals = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value.toFixed(2));
};
const mapSupplierCategorySummary = (record) => {
    return {
        id: record.id,
        name: record.name,
    };
};
const mapSupplierContact = (record) => {
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
const mapSupplierListItem = (record) => {
    return {
        categories: record.categoryAssignments.map((assignment) => mapSupplierCategorySummary(assignment.category)),
        city: record.city,
        code: record.code,
        commercialName: record.commercialName,
        country: record.country,
        createdAt: record.createdAt.toISOString(),
        defaultLeadTimeDays: record.defaultLeadTimeDays,
        email: record.email,
        id: record.id,
        legalName: record.legalName,
        phone: record.phone,
        preferenceScore: roundToTwoDecimals(decimalToNumber(record.preferenceScore)),
        reliabilityScore: roundToTwoDecimals(decimalToNumber(record.reliabilityScore)),
        status: record.status,
        taxId: record.taxId,
        updatedAt: record.updatedAt.toISOString(),
    };
};
const mapSupplierDetail = (record) => {
    const locationRecord = record;
    return {
        ...mapSupplierListItem(record),
        address: record.address,
        contactEmail: record.contactEmail,
        contactName: record.contactName,
        contactPhone: record.contactPhone,
        contactPosition: record.contactPosition,
        contacts: record.contacts.map(mapSupplierContact),
        creditAvailable: record.creditAvailable,
        creditLimit: roundToTwoDecimals(decimalToNumber(record.creditLimit)),
        deletedAt: record.deletedAt?.toISOString() ?? null,
        latitude: decimalToNumber(locationRecord.latitude ?? null),
        longitude: decimalToNumber(locationRecord.longitude ?? null),
        notes: record.notes,
        paymentTerms: record.paymentTerms,
        website: record.website,
        whatsapp: record.whatsapp,
    };
};
const mapSupplierCategory = (record) => {
    return {
        activeScoringConfigsCount: record._count.scoringConfigs,
        createdAt: record.createdAt.toISOString(),
        description: record.description,
        id: record.id,
        name: record.name,
        suppliersCount: record._count.assignments,
        updatedAt: record.updatedAt.toISOString(),
    };
};
const buildSupplierOrderBy = (sortBy, sortDirection) => {
    switch (sortBy) {
        case "createdAt":
            return {
                createdAt: sortDirection,
            };
        case "name":
            return {
                legalName: sortDirection,
            };
        case "reliabilityScore":
            return {
                reliabilityScore: sortDirection,
            };
        case "status":
            return {
                status: sortDirection,
            };
    }
};
const buildSupplierWhereClause = (query) => {
    return {
        deletedAt: null,
        ...(query.categoryId
            ? {
                categoryAssignments: {
                    some: {
                        categoryId: query.categoryId,
                    },
                },
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
const getSupplierMutationData = (input) => {
    return {
        address: input.address,
        city: input.city,
        code: input.code,
        commercialName: input.commercialName,
        contactEmail: input.contactEmail,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactPosition: input.contactPosition,
        country: input.country,
        creditAvailable: input.creditAvailable,
        creditLimit: input.creditLimit,
        defaultLeadTimeDays: input.defaultLeadTimeDays,
        email: input.email,
        legalName: input.legalName,
        latitude: input.latitude,
        longitude: input.longitude,
        notes: input.notes,
        paymentTerms: input.paymentTerms,
        phone: input.phone,
        preferenceScore: input.preferenceScore,
        reliabilityScore: input.reliabilityScore,
        status: input.status,
        taxId: input.taxId,
        website: input.website,
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
const ensureCategoryIdsExist = async (categoryIds, db) => {
    if (categoryIds.length === 0) {
        return;
    }
    const total = await db.supplierCategory.count({
        where: {
            id: {
                in: categoryIds,
            },
        },
    });
    if (total !== categoryIds.length) {
        throw new AppError("One or more supplier categories do not exist.", 400);
    }
};
const findSupplierDetailOrThrow = async (id, db = prisma) => {
    const supplier = await db.supplier.findFirst({
        include: supplierDetailInclude,
        where: {
            deletedAt: null,
            id,
        },
    });
    if (!supplier) {
        throw new AppError("Supplier not found.", 404);
    }
    return supplier;
};
const syncSupplierCategories = async (supplierId, categoryIds, db) => {
    await db.supplierCategoryAssignment.deleteMany({
        where: {
            supplierId,
        },
    });
    if (categoryIds.length === 0) {
        return;
    }
    await db.supplierCategoryAssignment.createMany({
        data: categoryIds.map((categoryId) => ({
            categoryId,
            supplierId,
        })),
    });
};
const syncSupplierContacts = async (supplierId, contacts, db) => {
    const existingContacts = await db.supplierContact.findMany({
        select: {
            id: true,
        },
        where: {
            supplierId,
        },
    });
    const existingContactIdSet = new Set(existingContacts.map((record) => record.id));
    const retainedContactIds = [];
    let primaryContactId = null;
    for (const contact of contacts) {
        const data = {
            email: contact.email,
            isPrimary: false,
            name: contact.name,
            notes: contact.notes,
            phone: contact.phone,
            position: contact.position,
            whatsapp: contact.whatsapp,
        };
        if (contact.id) {
            if (!existingContactIdSet.has(contact.id)) {
                throw new AppError("One or more supplier contacts do not exist.", 400);
            }
            await db.supplierContact.update({
                data,
                where: {
                    id: contact.id,
                },
            });
            retainedContactIds.push(contact.id);
            if (contact.isPrimary) {
                primaryContactId = contact.id;
            }
            continue;
        }
        const createdContact = await db.supplierContact.create({
            data: {
                ...data,
                supplierId,
            },
        });
        retainedContactIds.push(createdContact.id);
        if (contact.isPrimary) {
            primaryContactId = createdContact.id;
        }
    }
    if (retainedContactIds.length > 0) {
        await db.supplierContact.deleteMany({
            where: {
                id: {
                    notIn: retainedContactIds,
                },
                supplierId,
            },
        });
    }
    else {
        await db.supplierContact.deleteMany({
            where: {
                supplierId,
            },
        });
    }
    await db.supplierContact.updateMany({
        data: {
            isPrimary: false,
        },
        where: {
            supplierId,
        },
    });
    if (primaryContactId) {
        await db.supplierContact.update({
            data: {
                isPrimary: true,
            },
            where: {
                id: primaryContactId,
            },
        });
    }
};
const findSupplierContactOrThrow = async (supplierId, contactId, db = prisma) => {
    const contact = await db.supplierContact.findFirst({
        where: {
            id: contactId,
            supplierId,
        },
    });
    if (!contact) {
        throw new AppError("Supplier contact not found.", 404);
    }
    return contact;
};
const getSupplierContactMutationData = (input) => {
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
export const suppliersService = {
    async listSuppliers(query) {
        const where = buildSupplierWhereClause(query);
        const [total, suppliers] = await prisma.$transaction([
            prisma.supplier.count({
                where,
            }),
            prisma.supplier.findMany({
                include: supplierListInclude,
                orderBy: buildSupplierOrderBy(query.sortBy, query.sortDirection),
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
        ]);
        return {
            data: suppliers.map(mapSupplierListItem),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getSupplierById(id) {
        const supplier = await findSupplierDetailOrThrow(id);
        return mapSupplierDetail(supplier);
    },
    async createSupplier(input) {
        try {
            return await prisma.$transaction(async (db) => {
                await ensureCategoryIdsExist(input.categoryIds, db);
                const supplier = await db.supplier.create({
                    data: getSupplierMutationData(input),
                });
                await syncSupplierCategories(supplier.id, input.categoryIds, db);
                await syncSupplierContacts(supplier.id, input.contacts, db);
                const createdSupplier = await findSupplierDetailOrThrow(supplier.id, db);
                return mapSupplierDetail(createdSupplier);
            });
        }
        catch (error) {
            translateUniqueConstraintError(error, {
                code: "supplier code",
            });
        }
        throw new Error("Estado inesperado al crear el proveedor.");
    },
    async updateSupplier(id, input) {
        try {
            return await prisma.$transaction(async (db) => {
                const existingSupplier = await findSupplierDetailOrThrow(id, db);
                await ensureCategoryIdsExist(input.categoryIds, db);
                await db.supplier.update({
                    data: getSupplierMutationData(input),
                    where: {
                        id: existingSupplier.id,
                    },
                });
                await syncSupplierCategories(existingSupplier.id, input.categoryIds, db);
                await syncSupplierContacts(existingSupplier.id, input.contacts, db);
                const updatedSupplier = await findSupplierDetailOrThrow(existingSupplier.id, db);
                return {
                    current: mapSupplierDetail(updatedSupplier),
                    previous: mapSupplierDetail(existingSupplier),
                };
            });
        }
        catch (error) {
            translateUniqueConstraintError(error, {
                code: "supplier code",
            });
        }
        throw new Error("Estado inesperado al actualizar el proveedor.");
    },
    async deleteSupplier(id) {
        const existingSupplier = await findSupplierDetailOrThrow(id);
        await prisma.supplier.update({
            data: {
                deletedAt: new Date(),
            },
            where: {
                id: existingSupplier.id,
            },
        });
        return mapSupplierDetail(existingSupplier);
    },
    async listSupplierContacts(supplierId) {
        await findSupplierDetailOrThrow(supplierId);
        const contacts = await prisma.supplierContact.findMany({
            orderBy: [
                {
                    isPrimary: "desc",
                },
                {
                    name: "asc",
                },
            ],
            where: {
                supplierId,
            },
        });
        return contacts.map(mapSupplierContact);
    },
    async addSupplierContact(supplierId, input) {
        await findSupplierDetailOrThrow(supplierId);
        const createdContact = await prisma.$transaction(async (db) => {
            const contact = await db.supplierContact.create({
                data: {
                    ...getSupplierContactMutationData(input),
                    supplierId,
                },
            });
            if (input.isPrimary) {
                await db.supplierContact.updateMany({
                    data: {
                        isPrimary: false,
                    },
                    where: {
                        supplierId,
                    },
                });
                return db.supplierContact.update({
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
        return mapSupplierContact(createdContact);
    },
    async updateSupplierContact(supplierId, contactId, input) {
        return prisma.$transaction(async (db) => {
            await findSupplierDetailOrThrow(supplierId, db);
            const existingContact = await findSupplierContactOrThrow(supplierId, contactId, db);
            const updatedContact = await db.supplierContact.update({
                data: getSupplierContactMutationData(input),
                where: {
                    id: existingContact.id,
                },
            });
            if (input.isPrimary) {
                await db.supplierContact.updateMany({
                    data: {
                        isPrimary: false,
                    },
                    where: {
                        supplierId,
                    },
                });
                const primaryContact = await db.supplierContact.update({
                    data: {
                        isPrimary: true,
                    },
                    where: {
                        id: existingContact.id,
                    },
                });
                return {
                    current: mapSupplierContact(primaryContact),
                    previous: mapSupplierContact(existingContact),
                };
            }
            return {
                current: mapSupplierContact(updatedContact),
                previous: mapSupplierContact(existingContact),
            };
        });
    },
    async deleteSupplierContact(supplierId, contactId) {
        await findSupplierDetailOrThrow(supplierId);
        const existingContact = await findSupplierContactOrThrow(supplierId, contactId);
        await prisma.supplierContact.delete({
            where: {
                id: existingContact.id,
            },
        });
        return mapSupplierContact(existingContact);
    },
    async listCategories(query) {
        const categories = await prisma.supplierCategory.findMany({
            include: {
                _count: {
                    select: {
                        assignments: true,
                        scoringConfigs: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
            ...(query?.search
                ? {
                    where: {
                        OR: [
                            {
                                name: {
                                    contains: query.search,
                                },
                            },
                            {
                                description: {
                                    contains: query.search,
                                },
                            },
                        ],
                    },
                }
                : {}),
        });
        return categories.map(mapSupplierCategory);
    },
    async createCategory(input) {
        try {
            const category = await prisma.supplierCategory.create({
                data: {
                    description: input.description,
                    name: input.name,
                },
                include: {
                    _count: {
                        select: {
                            assignments: true,
                            scoringConfigs: true,
                        },
                    },
                },
            });
            return mapSupplierCategory(category);
        }
        catch (error) {
            translateUniqueConstraintError(error, {
                name: "supplier category name",
            });
        }
        throw new Error("Estado inesperado al crear la categoría del proveedor.");
    },
    async updateCategory(id, input) {
        const existingCategory = await prisma.supplierCategory.findUnique({
            include: {
                _count: {
                    select: {
                        assignments: true,
                        scoringConfigs: true,
                    },
                },
            },
            where: {
                id,
            },
        });
        if (!existingCategory) {
            throw new AppError("Supplier category not found.", 404);
        }
        try {
            const updatedCategory = await prisma.supplierCategory.update({
                data: {
                    description: input.description,
                    name: input.name,
                },
                include: {
                    _count: {
                        select: {
                            assignments: true,
                            scoringConfigs: true,
                        },
                    },
                },
                where: {
                    id: existingCategory.id,
                },
            });
            return {
                current: mapSupplierCategory(updatedCategory),
                previous: mapSupplierCategory(existingCategory),
            };
        }
        catch (error) {
            translateUniqueConstraintError(error, {
                name: "supplier category name",
            });
        }
        throw new Error("Estado inesperado al actualizar la categoría del proveedor.");
    },
    async deleteCategory(id, query) {
        const category = await prisma.supplierCategory.findUnique({
            include: {
                _count: {
                    select: {
                        assignments: true,
                        scoringConfigs: true,
                    },
                },
            },
            where: {
                id,
            },
        });
        if (!category) {
            throw new AppError("Supplier category not found.", 404);
        }
        if (category._count.assignments > 0 && !query.force) {
            throw new AppError("This category is assigned to one or more suppliers. Confirm deletion to remove those assignments first.", 409);
        }
        await prisma.$transaction(async (db) => {
            if (query.force) {
                await db.supplierCategoryAssignment.deleteMany({
                    where: {
                        categoryId: category.id,
                    },
                });
            }
            await db.supplierCategory.delete({
                where: {
                    id: category.id,
                },
            });
        });
        return mapSupplierCategory(category);
    },
};
//# sourceMappingURL=suppliers.service.js.map