import { auditLog } from "../../services/audit-log-service.js";
import { notificationService } from "../../services/notification-service.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { calculateCapacityUtilization, calculateProductionProgress, isProductionWorkflowTransitionAllowed, } from "./production-board.rules.js";
const workflowLabels = {
    DRAFT: "Borrador",
    PENDING_PLANNING: "Pendientes de planificación",
    SCHEDULED: "Programadas",
    MATERIALS_PREPARATION: "Materiales por preparar",
    READY_TO_START: "Listas para iniciar",
    IN_PROGRESS: "En proceso",
    PAUSED: "Pausadas",
    BLOCKED: "Bloqueadas",
    PENDING_QUALITY: "Pendientes de control",
    COMPLETED: "Completadas",
    CANCELLED: "Canceladas",
};
const workflowToJobStatus = {
    DRAFT: "DRAFT",
    PENDING_PLANNING: "READY",
    SCHEDULED: "READY",
    MATERIALS_PREPARATION: "READY",
    READY_TO_START: "READY",
    IN_PROGRESS: "IN_PROGRESS",
    PAUSED: "PAUSED",
    BLOCKED: "PAUSED",
    PENDING_QUALITY: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
};
const workflowOrder = [
    "PENDING_PLANNING",
    "SCHEDULED",
    "MATERIALS_PREPARATION",
    "READY_TO_START",
    "IN_PROGRESS",
    "PAUSED",
    "BLOCKED",
    "PENDING_QUALITY",
    "COMPLETED",
];
const userSelect = {
    id: true,
    name: true,
    email: true,
};
const workCenterSelect = {
    id: true,
    code: true,
    name: true,
    type: true,
};
const jobInclude = {
    assignedToUser: { select: userSelect },
    currentWorkCenter: { select: workCenterSelect },
    items: { orderBy: { createdAt: "asc" } },
    materialConsumptions: { select: { quantity: true, consumptionType: true } },
    qualityChecks: { orderBy: { createdAt: "desc" }, take: 10 },
    blocks: {
        where: { status: { in: ["OPEN", "UNDER_REVIEW", "IN_PROGRESS"] } },
        select: { id: true, severity: true },
    },
    tasks: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
            assignedToUser: { select: userSelect },
            workCenter: { select: workCenterSelect },
        },
    },
    project: {
        select: {
            id: true,
            code: true,
            title: true,
            client: {
                select: {
                    legalName: true,
                    commercialName: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    },
};
const dateWindow = (from, to) => {
    if (!from && !to)
        return undefined;
    return {
        ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
    };
};
const effectiveWorkflowStatus = (job) => {
    if (job.workflowStatus !== "DRAFT")
        return job.workflowStatus;
    if (job.status === "READY")
        return "READY_TO_START";
    if (job.status === "IN_PROGRESS")
        return "IN_PROGRESS";
    if (job.status === "PAUSED")
        return "PAUSED";
    if (job.status === "COMPLETED")
        return "COMPLETED";
    if (job.status === "CANCELLED")
        return "CANCELLED";
    return "PENDING_PLANNING";
};
const toIso = (value) => value ? value.toISOString() : null;
const numberValue = (value) => Number(value ?? 0);
const mapBoardJob = (job, now = Date.now()) => {
    const workflowStatus = effectiveWorkflowStatus(job);
    const completedTasks = job.tasks.filter((task) => task.status === "COMPLETED").length;
    const estimatedMinutes = job.estimatedMinutes ||
        job.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
    const planned = job.materialConsumptions
        .filter((entry) => entry.consumptionType === "PLANNED")
        .reduce((sum, entry) => sum + numberValue(entry.quantity), 0);
    const actual = job.materialConsumptions
        .filter((entry) => entry.consumptionType === "ACTUAL")
        .reduce((sum, entry) => sum + numberValue(entry.quantity), 0);
    const materialStatus = planned <= 0
        ? "WITHOUT_RESERVATION"
        : actual >= planned
            ? "READY"
            : actual > 0
                ? "PARTIAL"
                : "RESERVED";
    const latestQuality = job.qualityChecks[0];
    const qualityStatus = job.tasks.some((task) => task.requiresQualityControl) ||
        job.qualityChecks.length > 0
        ? latestQuality?.status === "PASSED"
            ? "APPROVED"
            : latestQuality?.status === "FAILED" ||
                latestQuality?.status === "REWORK_REQUIRED"
                ? "REJECTED"
                : latestQuality
                    ? "IN_REVIEW"
                    : "PENDING"
        : "NOT_REQUIRED";
    const due = job.plannedEndDate?.getTime() ?? null;
    return {
        id: job.id,
        code: job.code,
        workflowStatus,
        priority: job.priority,
        project: job.project
            ? {
                id: job.project.id,
                code: job.project.code,
                title: job.project.title,
                clientName: job.project.client.commercialName ||
                    job.project.client.legalName ||
                    [job.project.client.firstName, job.project.client.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                    "Sin cliente",
            }
            : null,
        product: job.items[0]?.name ?? null,
        quantity: job.items.reduce((sum, item) => sum + numberValue(item.quantity), 0),
        assignedToUser: job.assignedToUser,
        currentWorkCenter: job.currentWorkCenter,
        plannedStartDate: toIso(job.plannedStartDate),
        plannedEndDate: toIso(job.plannedEndDate),
        estimatedMinutes,
        consumedMinutes: job.tasks.reduce((sum, task) => sum + task.actualMinutes, 0),
        progressPercent: job.tasks.length
            ? calculateProductionProgress(completedTasks, job.tasks.length)
            : workflowStatus === "COMPLETED"
                ? 100
                : 0,
        materialStatus,
        qualityStatus,
        openBlockCount: job.blocks.length,
        overdue: Boolean(due && due < now && !["COMPLETED", "CANCELLED"].includes(workflowStatus)),
        version: job.version,
        tasks: job.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            taskType: task.taskType,
            estimatedMinutes: task.estimatedMinutes,
            scheduledStart: toIso(task.scheduledStart),
            scheduledEnd: toIso(task.scheduledEnd),
            assignedToUser: task.assignedToUser,
            workCenter: task.workCenter,
        })),
    };
};
const jobWhere = (query) => ({
    deletedAt: null,
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.search
        ? {
            OR: [
                { code: { contains: query.search } },
                { notes: { contains: query.search } },
                {
                    project: {
                        OR: [
                            { code: { contains: query.search } },
                            { title: { contains: query.search } },
                        ],
                    },
                },
            ],
        }
        : {}),
    ...(dateWindow(query.dateFrom, query.dateTo)
        ? { plannedEndDate: dateWindow(query.dateFrom, query.dateTo) }
        : {}),
});
const assertExpectedVersion = (actual, expected) => {
    if (expected !== undefined && actual !== expected) {
        throw new AppError("La orden fue actualizada por otro usuario. Actualiza la información antes de continuar.", 409);
    }
};
const assertTransition = async (db, job, input) => {
    const from = effectiveWorkflowStatus(job);
    if (!isProductionWorkflowTransitionAllowed(from, input.toStatus)) {
        throw new AppError("La transición de estado no está permitida.", 422);
    }
    if (["IN_PROGRESS", "PENDING_QUALITY"].includes(input.toStatus)) {
        const dependencies = await db.productionTaskDependency.findMany({
            where: {
                task: { productionJobId: job.id },
                dependsOnTask: { status: { not: "COMPLETED" } },
            },
            select: { id: true },
        });
        if (dependencies.length > 0)
            throw new AppError("Esta orden tiene dependencias pendientes.", 422);
    }
    if (input.toStatus === "COMPLETED") {
        const criticalBlocks = await db.productionBlock.count({
            where: {
                productionJobId: job.id,
                status: { in: ["OPEN", "UNDER_REVIEW", "IN_PROGRESS"] },
                severity: "CRITICAL",
            },
        });
        if (criticalBlocks > 0)
            throw new AppError("La orden tiene un bloqueo crítico.", 422);
        const pendingQuality = job.qualityChecks.some((check) => ["PENDING", "FAILED", "REWORK_REQUIRED"].includes(check.status));
        if (pendingQuality)
            throw new AppError("Debes completar el control de calidad.", 422);
    }
    if (input.toStatus === "IN_PROGRESS" &&
        job.materialConsumptions.some((entry) => entry.consumptionType === "PLANNED") &&
        !job.materialConsumptions.some((entry) => entry.consumptionType === "ACTUAL")) {
        throw new AppError("No existe suficiente material preparado para iniciar la orden.", 422);
    }
};
const mapBlock = (block) => ({
    id: block.id,
    productionJobId: block.productionJobId,
    productionTaskId: block.productionTaskId,
    type: block.type,
    severity: block.severity,
    status: block.status,
    description: block.description,
    resolution: block.resolution,
    estimatedImpactMinutes: block.estimatedImpactMinutes,
    createdAt: block.createdAt.toISOString(),
    resolvedAt: toIso(block.resolvedAt),
    job: block.productionJob,
    task: block.productionTask,
    createdBy: block.createdBy,
    assignedTo: block.assignedTo,
});
const blockInclude = {
    createdBy: { select: userSelect },
    assignedTo: { select: userSelect },
    productionJob: { select: { id: true, code: true } },
    productionTask: { select: { id: true, title: true } },
};
export const productionBoardService = {
    async getBoard(query) {
        const jobs = await prisma.productionJob.findMany({
            where: jobWhere(query),
            include: jobInclude,
            orderBy: [
                { priority: "desc" },
                { plannedEndDate: "asc" },
                { updatedAt: "desc" },
            ],
        });
        const mapped = jobs.map((job) => mapBoardJob(job));
        const columns = workflowOrder.map((key) => ({
            key,
            label: workflowLabels[key] ?? key,
            jobs: mapped.filter((job) => job.workflowStatus === key),
        }));
        const inScope = mapped.filter((job) => !["CANCELLED", "COMPLETED"].includes(job.workflowStatus));
        const plannedMinutes = mapped.reduce((sum, job) => sum + job.estimatedMinutes, 0);
        const capacity = await prisma.productionWorkCenter.aggregate({
            _sum: { capacityDailyMinutes: true },
            where: { active: true, status: { not: "INACTIVE" } },
        });
        return {
            generatedAt: new Date().toISOString(),
            filters: {
                dateFrom: query.dateFrom ?? null,
                dateTo: query.dateTo ?? null,
                search: query.search,
                priority: query.priority ?? null,
            },
            metrics: {
                pendingOrders: inScope.filter((job) => [
                    "PENDING_PLANNING",
                    "SCHEDULED",
                    "MATERIALS_PREPARATION",
                    "READY_TO_START",
                ].includes(job.workflowStatus)).length,
                inProgressOrders: inScope.filter((job) => ["IN_PROGRESS", "PAUSED"].includes(job.workflowStatus)).length,
                overdueOrders: mapped.filter((job) => job.overdue).length,
                blockedOrders: mapped.filter((job) => job.workflowStatus === "BLOCKED" || job.openBlockCount > 0).length,
                pendingQualityTasks: mapped.filter((job) => job.workflowStatus === "PENDING_QUALITY").length,
                capacityUtilizationPercent: capacity._sum.capacityDailyMinutes
                    ? Math.min(999, Math.round((plannedMinutes / Number(capacity._sum.capacityDailyMinutes)) *
                        100))
                    : 0,
                estimatedWasteAreaM2: Number((await prisma.productionWasteReport.aggregate({
                    _sum: { theoreticalWasteAreaM2: true },
                }))._sum.theoreticalWasteAreaM2 ?? 0),
                actualWasteAreaM2: Number((await prisma.productionWasteReport.aggregate({
                    _sum: { actualWasteAreaM2: true },
                }))._sum.actualWasteAreaM2 ?? 0),
            },
            columns,
        };
    },
    async listWorkCenters(date = new Date()) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const centers = await prisma.productionWorkCenter.findMany({
            where: { active: true },
            include: {
                tasks: {
                    where: {
                        scheduledStart: { gte: start, lt: end },
                        status: { not: "CANCELLED" },
                    },
                    select: { estimatedMinutes: true },
                },
            },
            orderBy: { name: "asc" },
        });
        return centers.map((center) => {
            const scheduledMinutes = center.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
            const availableMinutes = center.capacityDailyMinutes * Math.max(1, center.workstationCount);
            return {
                id: center.id,
                code: center.code,
                name: center.name,
                description: center.description,
                type: center.type,
                status: center.status,
                active: center.active,
                capacityDailyMinutes: center.capacityDailyMinutes,
                scheduleStart: center.scheduleStart,
                scheduleEnd: center.scheduleEnd,
                workstationCount: center.workstationCount,
                scheduledMinutes,
                availableMinutes,
                utilizationPercent: calculateCapacityUtilization(scheduledMinutes, availableMinutes),
            };
        });
    },
    async listCalendar(query) {
        const tasks = await prisma.productionTask.findMany({
            where: { productionJob: jobWhere(query), scheduledStart: { not: null } },
            include: {
                productionJob: {
                    select: {
                        id: true,
                        code: true,
                        priority: true,
                        workflowStatus: true,
                        project: { select: { title: true } },
                    },
                },
                assignedToUser: { select: userSelect },
                workCenter: { select: workCenterSelect },
            },
            orderBy: { scheduledStart: "asc" },
        });
        return tasks.map((task) => ({
            id: task.id,
            title: task.title,
            taskType: task.taskType,
            status: task.status,
            scheduledStart: toIso(task.scheduledStart),
            scheduledEnd: toIso(task.scheduledEnd),
            estimatedMinutes: task.estimatedMinutes,
            assignedToUser: task.assignedToUser,
            workCenter: task.workCenter,
            productionJob: task.productionJob,
        }));
    },
    async listBlocks(status) {
        const blocks = await prisma.productionBlock.findMany({
            where: status ? { status } : {},
            include: blockInclude,
            orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        });
        return blocks.map((block) => mapBlock(block));
    },
    async transitionJob(jobId, input, actorUserId) {
        return prisma.$transaction(async (db) => {
            const job = await db.productionJob.findUnique({
                where: { id: jobId },
                include: jobInclude,
            });
            if (!job)
                throw new AppError("La orden de producción no existe.", 404);
            assertExpectedVersion(job.version, input.expectedVersion);
            await assertTransition(db, job, input);
            const from = effectiveWorkflowStatus(job);
            const nextJobStatus = workflowToJobStatus[input.toStatus];
            if (!nextJobStatus)
                throw new AppError("La transición de estado no está permitida.", 422);
            const updated = await db.productionJob.update({
                where: { id: jobId },
                data: {
                    workflowStatus: input.toStatus,
                    status: nextJobStatus,
                    version: { increment: 1 },
                    ...(input.toStatus === "IN_PROGRESS" && !job.actualStartDate
                        ? { actualStartDate: new Date() }
                        : {}),
                    ...(input.toStatus === "COMPLETED"
                        ? { actualEndDate: new Date() }
                        : {}),
                },
                include: jobInclude,
            });
            await db.productionStatusHistory.create({
                data: {
                    productionJobId: jobId,
                    fromStatus: job.status,
                    toStatus: nextJobStatus,
                    changedByUserId: actorUserId,
                    notes: input.reason,
                },
            });
            await auditLog({
                action: "production.workflow_transitioned",
                actorUserId,
                before: { workflowStatus: from, version: job.version },
                after: { workflowStatus: input.toStatus, version: updated.version },
                entityId: jobId,
                entityType: "production_job",
                metadata: { reason: input.reason },
            }, { db });
            if (updated.assignedToUserId && input.toStatus === "BLOCKED")
                await notificationService.create({
                    userId: updated.assignedToUserId,
                    title: "Orden bloqueada",
                    message: `La orden ${updated.code} requiere atención para continuar.`,
                    type: "warning",
                }, { db });
            return mapBoardJob(updated);
        });
    },
    async scheduleJob(jobId, input, actorUserId) {
        return prisma.$transaction(async (db) => {
            const job = await db.productionJob.findUnique({
                where: { id: jobId },
                include: jobInclude,
            });
            if (!job)
                throw new AppError("La orden de producción no existe.", 404);
            assertExpectedVersion(job.version, input.expectedVersion);
            if (input.currentWorkCenterId) {
                const center = await db.productionWorkCenter.findUnique({
                    where: { id: input.currentWorkCenterId },
                });
                if (!center ||
                    !center.active ||
                    center.status === "MAINTENANCE" ||
                    center.status === "INACTIVE")
                    throw new AppError("El centro de trabajo no está disponible.", 422);
            }
            const from = effectiveWorkflowStatus(job);
            if (![
                "DRAFT",
                "PENDING_PLANNING",
                "SCHEDULED",
                "MATERIALS_PREPARATION",
                "READY_TO_START",
            ].includes(from))
                throw new AppError("Solo se pueden programar órdenes pendientes de producción.", 422);
            const nextStatus = input.plannedStartDate && input.plannedEndDate
                ? "SCHEDULED"
                : "PENDING_PLANNING";
            const updated = await db.productionJob.update({
                where: { id: jobId },
                data: {
                    workflowStatus: nextStatus,
                    status: "READY",
                    plannedStartDate: input.plannedStartDate,
                    plannedEndDate: input.plannedEndDate,
                    currentWorkCenterId: input.currentWorkCenterId,
                    version: { increment: 1 },
                },
                include: jobInclude,
            });
            await auditLog({
                action: "production.job_scheduled",
                actorUserId,
                before: {
                    plannedStartDate: job.plannedStartDate,
                    plannedEndDate: job.plannedEndDate,
                    currentWorkCenterId: job.currentWorkCenterId,
                },
                after: {
                    plannedStartDate: updated.plannedStartDate,
                    plannedEndDate: updated.plannedEndDate,
                    currentWorkCenterId: updated.currentWorkCenterId,
                },
                entityId: jobId,
                entityType: "production_job",
                metadata: { reason: input.reason },
            }, { db });
            return mapBoardJob(updated);
        });
    },
    async assignTask(taskId, input, actorUserId) {
        return prisma.$transaction(async (db) => {
            const task = await db.productionTask.findUnique({
                where: { id: taskId },
                include: { productionJob: true },
            });
            if (!task)
                throw new AppError("La tarea de producción no existe.", 404);
            assertExpectedVersion(task.productionJob.version, input.expectedVersion);
            if (input.currentWorkCenterId) {
                const center = await db.productionWorkCenter.findUnique({
                    where: { id: input.currentWorkCenterId },
                });
                if (!center ||
                    !center.active ||
                    center.status === "MAINTENANCE" ||
                    center.status === "INACTIVE")
                    throw new AppError("El centro de trabajo no está disponible.", 422);
            }
            const updated = await db.productionTask.update({
                where: { id: taskId },
                data: {
                    assignedToUserId: input.assignedToUserId,
                    workCenterId: input.currentWorkCenterId,
                },
            });
            await db.productionJob.update({
                where: { id: task.productionJobId },
                data: { version: { increment: 1 } },
            });
            await auditLog({
                action: "production.task_assigned",
                actorUserId,
                before: {
                    assignedToUserId: task.assignedToUserId,
                    workCenterId: task.workCenterId,
                },
                after: {
                    assignedToUserId: updated.assignedToUserId,
                    workCenterId: updated.workCenterId,
                },
                entityId: taskId,
                entityType: "production_task",
            }, { db });
            return updated;
        });
    },
    async transitionTask(taskId, toStatus, reason, actorUserId) {
        return prisma.$transaction(async (db) => {
            const task = await db.productionTask.findUnique({
                where: { id: taskId },
                include: { productionJob: true },
            });
            if (!task)
                throw new AppError("La tarea de producción no existe.", 404);
            const allowed = {
                PENDING: ["IN_PROGRESS", "CANCELLED"],
                IN_PROGRESS: ["PAUSED", "BLOCKED", "COMPLETED"],
                PAUSED: ["IN_PROGRESS", "BLOCKED"],
                BLOCKED: ["PAUSED", "IN_PROGRESS"],
                COMPLETED: [],
            };
            if (!allowed[task.status]?.includes(toStatus))
                throw new AppError("La transición de estado no está permitida.", 422);
            if (toStatus === "COMPLETED" && task.requiresQualityControl) {
                const check = await db.qualityCheck.findFirst({
                    where: { productionTaskId: taskId },
                    orderBy: { createdAt: "desc" },
                });
                if (!check || check.status !== "PASSED")
                    throw new AppError("Debes completar el control de calidad.", 422);
            }
            const eventMap = {
                IN_PROGRESS: task.status === "PAUSED" ? "RESUME" : "START",
                PAUSED: "PAUSE",
                BLOCKED: "BLOCK",
                COMPLETED: "FINISH",
                PENDING: "UNBLOCK",
            };
            const now = new Date();
            const updated = await db.productionTask.update({
                where: { id: taskId },
                data: {
                    status: toStatus,
                    ...(toStatus === "IN_PROGRESS" && !task.startedAt
                        ? { startedAt: now }
                        : {}),
                    ...(toStatus === "COMPLETED" ? { completedAt: now } : {}),
                },
            });
            const eventType = eventMap[toStatus];
            if (!eventType)
                throw new AppError("No se pudo registrar el tiempo de la tarea.", 422);
            await db.productionTimeEntry.create({
                data: {
                    productionTaskId: taskId,
                    userId: actorUserId,
                    eventType,
                    eventAt: now,
                    reason,
                },
            });
            await db.productionJob.update({
                where: { id: task.productionJobId },
                data: { version: { increment: 1 } },
            });
            await auditLog({
                action: `production.task_${toStatus.toLowerCase()}`,
                actorUserId,
                before: { status: task.status },
                after: { status: toStatus },
                entityId: taskId,
                entityType: "production_task",
                metadata: { reason },
            }, { db });
            return updated;
        });
    },
    async createBlock(input, actorUserId) {
        return prisma.$transaction(async (db) => {
            if (!input.productionJobId && !input.productionTaskId)
                throw new AppError("Vincula el bloqueo a una orden o tarea.", 422);
            const block = await db.productionBlock.create({
                data: {
                    productionJobId: input.productionJobId,
                    productionTaskId: input.productionTaskId,
                    type: input.type,
                    severity: input.severity,
                    description: input.description,
                    estimatedImpactMinutes: input.estimatedImpactMinutes,
                    createdById: actorUserId,
                },
                include: blockInclude,
            });
            if (input.productionJobId)
                await db.productionJob.update({
                    where: { id: input.productionJobId },
                    data: {
                        workflowStatus: "BLOCKED",
                        status: "PAUSED",
                        version: { increment: 1 },
                    },
                });
            const job = input.productionJobId
                ? await db.productionJob.findUnique({
                    where: { id: input.productionJobId },
                    select: { code: true, assignedToUserId: true },
                })
                : null;
            if (job?.assignedToUserId && input.severity === "CRITICAL")
                await notificationService.create({
                    userId: job.assignedToUserId,
                    title: "Bloqueo crítico",
                    message: `La orden ${job.code} tiene un bloqueo crítico: ${input.description}`,
                    type: "error",
                }, { db });
            await auditLog({
                action: "production.block_created",
                actorUserId,
                after: {
                    type: input.type,
                    severity: input.severity,
                    description: input.description,
                },
                entityId: block.id,
                entityType: "production_block",
            }, { db });
            return mapBlock(block);
        });
    },
    async resolveBlock(blockId, input, actorUserId) {
        return prisma.$transaction(async (db) => {
            const block = await db.productionBlock.findUnique({
                where: { id: blockId },
                include: blockInclude,
            });
            if (!block)
                throw new AppError("El bloqueo no existe.", 404);
            if (["RESOLVED", "DISMISSED"].includes(block.status))
                throw new AppError("El bloqueo ya está cerrado.", 422);
            const updated = await db.productionBlock.update({
                where: { id: blockId },
                data: {
                    status: "RESOLVED",
                    resolution: input.resolution,
                    resolvedById: actorUserId,
                    resolvedAt: new Date(),
                },
                include: blockInclude,
            });
            if (block.productionJobId) {
                const remaining = await db.productionBlock.count({
                    where: {
                        productionJobId: block.productionJobId,
                        status: { in: ["OPEN", "UNDER_REVIEW", "IN_PROGRESS"] },
                        id: { not: blockId },
                    },
                });
                if (remaining === 0)
                    await db.productionJob.update({
                        where: { id: block.productionJobId },
                        data: {
                            workflowStatus: "READY_TO_START",
                            status: "READY",
                            version: { increment: 1 },
                        },
                    });
            }
            await auditLog({
                action: "production.block_resolved",
                actorUserId,
                before: { status: block.status },
                after: { status: "RESOLVED", resolution: input.resolution },
                entityId: blockId,
                entityType: "production_block",
            }, { db });
            return mapBlock(updated);
        });
    },
    async createWasteEntry(input, actorUserId) {
        const entry = await prisma.productionWasteEntry.create({
            data: {
                productionJobId: input.productionJobId,
                productionTaskId: input.productionTaskId,
                materialId: input.materialId,
                entryType: input.entryType,
                reason: input.reason,
                quantity: input.quantity,
                unit: input.unit,
                areaM2: input.areaM2,
                widthMm: input.widthMm,
                heightMm: input.heightMm,
                lengthMm: input.lengthMm,
                recoverable: input.recoverable,
                notes: input.notes,
                reportedById: actorUserId,
            },
        });
        await auditLog({
            action: "production.waste_entry_created",
            actorUserId,
            after: {
                quantity: input.quantity,
                unit: input.unit,
                reason: input.reason,
                recoverable: input.recoverable,
            },
            entityId: entry.id,
            entityType: "production_waste_entry",
        });
        return {
            id: entry.id,
            productionJobId: entry.productionJobId,
            quantity: Number(entry.quantity),
            unit: entry.unit,
            reason: entry.reason,
            entryType: entry.entryType,
            recoverable: entry.recoverable,
            createdAt: entry.createdAt.toISOString(),
        };
    },
    async exportBoard(query, format = "csv") {
        const board = await this.getBoard(query);
        const rows = board.columns.flatMap((column) => column.jobs.map((job) => ({
            estado: workflowLabels[job.workflowStatus],
            codigo: job.code,
            proyecto: job.project?.title ?? "Sin proyecto",
            cliente: job.project?.clientName ?? "Sin cliente",
            prioridad: job.priority,
            responsable: job.assignedToUser?.name ?? "Sin asignar",
            centro: job.currentWorkCenter?.name ?? "Sin centro",
            fechaRequerida: job.plannedEndDate ?? "",
            progreso: job.progressPercent,
            atraso: job.overdue ? "Sí" : "No",
        })));
        if (format !== "csv")
            throw new AppError("Formato de exportación no disponible.", 422);
        const header = Object.keys(rows[0] ?? { estado: "", codigo: "" });
        const csv = [
            header,
            ...rows.map((row) => header.map((key) => String(row[key] ?? ""))),
        ]
            .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
            .join("\n");
        return `\uFEFF${csv}`;
    },
};
export const PRODUCTION_WORKFLOW_LABELS = workflowLabels;
//# sourceMappingURL=production-board.service.js.map