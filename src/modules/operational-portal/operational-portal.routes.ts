import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { requireAnyPermission } from "../../middleware/authorization-middleware.js";
import { prisma } from "../../utils/prisma.js";
import { sendSuccess } from "../../utils/response.js";
import {
  OPERATIONAL_AREA_PERMISSIONS,
  OPERATIONAL_PORTAL_ACCESS_PERMISSIONS,
} from "./operational-portal.constants.js";

const hasAny = (permissions: string[], required: readonly string[]) =>
  required.some((permission) => permissions.includes(permission));

const portalAccessGuard = requireAnyPermission([
  ...OPERATIONAL_PORTAL_ACCESS_PERMISSIONS,
  ...Object.values(OPERATIONAL_AREA_PERMISSIONS).flat(),
]);

export const operationalPortalRouter = Router();

operationalPortalRouter.get(
  "/operaciones/permisos",
  portalAccessGuard,
  asyncHandler(async (request, response) => {
    const permissions = request.authorizationSummary?.permissions ?? [];
    const areas = Object.entries(OPERATIONAL_AREA_PERMISSIONS)
      .filter(([, areaPermissions]) => hasAny(permissions, areaPermissions))
      .map(([key]) => key);

    sendSuccess(response, {
      areas,
      permissions,
      puedeAcceder: hasAny(permissions, OPERATIONAL_PORTAL_ACCESS_PERMISSIONS),
    });
  }),
);

operationalPortalRouter.get(
  "/operaciones/resumen",
  portalAccessGuard,
  asyncHandler(async (request, response) => {
    const userId = request.authSession?.user.id ?? "";
    const permissions = request.authorizationSummary?.permissions ?? [];
    const canSeeAll = permissions.includes("operaciones.supervision.ver") ||
      permissions.includes("production.read");

    const [production, productionPending, measurements, installations, notifications, stock, tasks] =
      await Promise.all([
        prisma.productionJob.count({ where: { deletedAt: null } }),
        prisma.productionTask.count({ where: canSeeAll ? {} : { assignedToUserId: userId } }),
        prisma.measurementRequest.count({
          where: {
            deletedAt: null,
            ...(canSeeAll ? {} : { assignedTechnicianId: userId }),
          },
        }),
        prisma.installationOrder.count({
          where: {
            deletedAt: null,
            ...(canSeeAll ? {} : { assignedSupervisorId: userId }),
          },
        }),
        prisma.notification.count({ where: { userId, deletedAt: null, isRead: false } }),
        prisma.inventoryStock.count({ where: { deletedAt: null } }),
        prisma.productionTask.count({
          where: {
            assignedToUserId: userId,
            completedAt: null,
          },
        }),
      ]);

    sendSuccess(response, {
      almacen: stock,
      instalaciones: installations,
      mediciones: measurements,
      notificaciones: notifications,
      ordenesProduccion: production,
      tareasAsignadas: tasks,
      tareasPendientes: productionPending,
    });
  }),
);

operationalPortalRouter.get(
  "/operaciones/mis-tareas",
  portalAccessGuard,
  asyncHandler(async (request, response) => {
    const userId = request.authSession?.user.id ?? "";
    const tasks = await prisma.productionTask.findMany({
      where: { assignedToUserId: userId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        assignedToUserId: true,
        completedAt: true,
        description: true,
        id: true,
        productionJob: {
          select: {
            code: true,
            plannedEndDate: true,
            priority: true,
          },
        },
        startedAt: true,
        status: true,
        taskType: true,
        title: true,
        updatedAt: true,
      },
    });

    sendSuccess(response, tasks);
  }),
);

operationalPortalRouter.post(
  "/operaciones/escanear/resolver",
  portalAccessGuard,
  asyncHandler(async (request, response) => {
    const code = typeof request.body?.code === "string" ? request.body.code.trim() : "";

    if (code.length < 2 || code.length > 191) {
      sendSuccess(response, { encontrado: false, mensaje: "Ingresa un código válido." });
      return;
    }

    const [stock, productionJob, measurement, installation] = await Promise.all([
      prisma.inventoryStock.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { batchNumber: code },
            { material: { code } },
          ],
        },
        select: {
          availableQuantity: true,
          condition: true,
          id: true,
          material: { select: { code: true, name: true } },
          unit: true,
          warehouse: { select: { name: true } },
        },
      }),
      prisma.productionJob.findFirst({
        where: { code, deletedAt: null },
        select: { code: true, id: true, priority: true, status: true },
      }),
      prisma.measurementRequest.findFirst({
        where: { id: code, deletedAt: null },
        select: { id: true, status: true },
      }),
      prisma.installationOrder.findFirst({
        where: { code, deletedAt: null },
        select: { code: true, id: true, priority: true, status: true },
      }),
    ]);

    const result = stock
      ? {
          entidad: "material",
          encontrado: true,
          registro: stock,
        }
      : productionJob
        ? { entidad: "produccion", encontrado: true, registro: productionJob }
        : measurement
          ? { entidad: "medicion", encontrado: true, registro: measurement }
          : installation
            ? { entidad: "instalacion", encontrado: true, registro: installation }
            : { encontrado: false, mensaje: "No encontramos ese código en el ERP." };

    sendSuccess(response, result);
  }),
);
