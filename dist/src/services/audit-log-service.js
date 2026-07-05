import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../utils/prisma.js";
import { buildDateRangeFilter, toLogJsonValue, } from "./logging-utils.js";
const getRequestIpAddress = (request) => {
    if (!request) {
        return null;
    }
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0]?.trim() ?? request.ip ?? null;
    }
    if (Array.isArray(forwardedFor)) {
        return forwardedFor[0]?.split(",")[0]?.trim() ?? request.ip ?? null;
    }
    return request.ip ?? null;
};
const getRequestUserAgent = (request) => {
    if (!request) {
        return null;
    }
    const userAgent = request.headers["user-agent"];
    if (typeof userAgent === "string") {
        return userAgent.trim() || null;
    }
    if (Array.isArray(userAgent)) {
        const firstUserAgent = String(userAgent[0] ?? "");
        return firstUserAgent.trim() || null;
    }
    return null;
};
export const auditLog = async (rawInput, options) => {
    const db = options?.db ?? prisma;
    const normalizedInput = "action" in rawInput
        ? rawInput
        : {
            action: rawInput.oldValues == null && rawInput.newValues != null
                ? `${rawInput.entityType}.created`
                : rawInput.oldValues != null && rawInput.newValues == null
                    ? `${rawInput.entityType}.deleted`
                    : `${rawInput.entityType}.updated`,
            actorUserId: rawInput.userId ?? null,
            after: rawInput.newValues,
            before: rawInput.oldValues,
            entityId: rawInput.entityId,
            entityType: rawInput.entityType,
            ipAddress: rawInput.ipAddress,
            metadata: undefined,
            request: undefined,
            userAgent: rawInput.userAgent,
        };
    const serializedAfter = toLogJsonValue(normalizedInput.after);
    const serializedBefore = toLogJsonValue(normalizedInput.before);
    const serializedMetadata = toLogJsonValue(normalizedInput.metadata);
    await db.auditLog.create({
        data: {
            action: normalizedInput.action,
            ...(normalizedInput.actorUserId
                ? {
                    actorUser: {
                        connect: {
                            id: normalizedInput.actorUserId,
                        },
                    },
                }
                : {}),
            afterJson: serializedAfter === null || normalizedInput.after === undefined
                ? Prisma.JsonNull
                : serializedAfter,
            beforeJson: serializedBefore === null || normalizedInput.before === undefined
                ? Prisma.JsonNull
                : serializedBefore,
            entityId: normalizedInput.entityId ?? null,
            entityType: normalizedInput.entityType,
            ipAddress: normalizedInput.ipAddress ?? getRequestIpAddress(normalizedInput.request),
            metadataJson: serializedMetadata === null || normalizedInput.metadata === undefined
                ? Prisma.JsonNull
                : serializedMetadata,
            userAgent: normalizedInput.userAgent ?? getRequestUserAgent(normalizedInput.request),
        },
    });
};
const buildWhereClause = (query) => {
    const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
        ...(query.action
            ? {
                action: query.action,
            }
            : {}),
        ...(query.actorUserId
            ? {
                actorUserId: query.actorUserId,
            }
            : {}),
        ...(createdAt
            ? {
                createdAt,
            }
            : {}),
        ...(query.entityType
            ? {
                entityType: query.entityType,
            }
            : {}),
        ...(query.search && query.search.length > 0
            ? {
                OR: [
                    {
                        action: {
                            contains: query.search,
                        },
                    },
                    {
                        entityId: {
                            contains: query.search,
                        },
                    },
                    {
                        entityType: {
                            contains: query.search,
                        },
                    },
                    {
                        actorUser: {
                            email: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        actorUser: {
                            name: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
export const auditLogService = {
    async create(payload, options) {
        await auditLog(payload, options);
    },
    async listAuditLogs(query) {
        const where = buildWhereClause(query);
        const [total, auditLogs] = await prisma.$transaction([
            prisma.auditLog.count({
                where,
            }),
            prisma.auditLog.findMany({
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    action: true,
                    actorUser: {
                        select: {
                            email: true,
                            id: true,
                            name: true,
                        },
                    },
                    afterJson: true,
                    beforeJson: true,
                    createdAt: true,
                    entityId: true,
                    entityType: true,
                    id: true,
                    ipAddress: true,
                    metadataJson: true,
                    userAgent: true,
                },
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
        ]);
        return {
            data: auditLogs.map((auditLogRecord) => ({
                action: auditLogRecord.action,
                actorUser: auditLogRecord.actorUser,
                afterJson: auditLogRecord.afterJson,
                beforeJson: auditLogRecord.beforeJson,
                createdAt: auditLogRecord.createdAt.toISOString(),
                entityId: auditLogRecord.entityId,
                entityType: auditLogRecord.entityType,
                id: auditLogRecord.id,
                ipAddress: auditLogRecord.ipAddress,
                metadataJson: auditLogRecord.metadataJson,
                userAgent: auditLogRecord.userAgent,
            })),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
};
//# sourceMappingURL=audit-log-service.js.map