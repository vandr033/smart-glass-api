import type { Request, Response } from "express";

import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import {
  INSTALLATION_ENTITY_TYPES,
  INSTALLATION_PERMISSIONS,
} from "./installation.constants.js";
import { installationService } from "./installation.service.js";
import {
  assignInstallationOrderSchema,
  changeInstallationStatusSchema,
  createInstallationIssueSchema,
  createInstallationOrderSchema,
  installationCalendarQuerySchema,
  installationEvidenceMetadataSchema,
  installationIssueIdParamSchema,
  installationOrderIdParamSchema,
  installationTaskIdParamSchema,
  installationTeamIdParamSchema,
  installationTeamMutationSchema,
  listInstallationOrdersQuerySchema,
  projectIdParamSchema,
  quotationIdParamSchema,
  resolveInstallationIssueSchema,
  rescheduleInstallationOrderSchema,
  updateInstallationOrderSchema,
  updateInstallationTaskSchema,
} from "./installation.validators.js";

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

const getRequiredOrderId = (value: string | string[] | undefined): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new AppError("El identificador de la orden es obligatorio.", 400);
  }

  return installationOrderIdParamSchema.parse({
    id,
  }).id;
};

const getRequiredTaskId = (value: string | string[] | undefined): string => {
  const taskId = Array.isArray(value) ? value[0] : value;

  if (!taskId) {
    throw new AppError("El identificador de la tarea es obligatorio.", 400);
  }

  return installationTaskIdParamSchema.parse({
    taskId,
  }).taskId;
};

const getRequiredIssueId = (value: string | string[] | undefined): string => {
  const issueId = Array.isArray(value) ? value[0] : value;

  if (!issueId) {
    throw new AppError("El identificador de la incidencia es obligatorio.", 400);
  }

  return installationIssueIdParamSchema.parse({
    issueId,
  }).issueId;
};

const getRequiredPermissionForStatus = (status: string) => {
  if (status === "COMPLETED") {
    return INSTALLATION_PERMISSIONS.complete;
  }

  if (status === "CANCELLED") {
    return INSTALLATION_PERMISSIONS.cancel;
  }

  if (status === "SCHEDULED" || status === "RESCHEDULED") {
    return INSTALLATION_PERMISSIONS.schedule;
  }

  return INSTALLATION_PERMISSIONS.execute;
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

export const installationController = {
  async listInstallationOrders(request: Request, response: Response) {
    const query = listInstallationOrdersQuerySchema.parse({
      clientId: getQueryValue(request.query["filter.clientId"]),
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      projectId: getQueryValue(request.query["filter.projectId"]),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
      teamId: getQueryValue(request.query["filter.teamId"]),
    });

    const result = await installationService.listInstallationOrders(query);
    sendPaginated(response, result.data, result.pagination);
  },

  async listInstallationCalendar(request: Request, response: Response) {
    const query = installationCalendarQuerySchema.parse({
      clientId: getQueryValue(request.query["filter.clientId"]),
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      projectId: getQueryValue(request.query["filter.projectId"]),
      status: getQueryValue(request.query["filter.status"]),
      teamId: getQueryValue(request.query["filter.teamId"]),
      view: getQueryValue(request.query.view),
    });

    const result = await installationService.listInstallationCalendar(query);
    sendSuccess(response, result);
  },

  async getInstallationOrderById(request: Request, response: Response) {
    const result = await installationService.getInstallationOrderById(
      getRequiredOrderId(request.params.id),
    );

    sendSuccess(response, result);
  },

  async createInstallationOrder(request: Request, response: Response) {
    const payload = createInstallationOrderSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await installationService.createInstallationOrder(
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.create,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "installation_order.created",
      after: result,
      before: null,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result, 201);
  },

  async createInstallationOrderFromProject(request: Request, response: Response) {
    const payload = createInstallationOrderSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const { projectId } = projectIdParamSchema.parse(request.params);
    const result = await installationService.createInstallationOrderFromProject(
      projectId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.create,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
        projectId,
      },
    });
    await logAuditEvent(request, {
      action: "installation_order.created_from_project",
      after: result,
      before: null,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
        projectId,
      },
    });

    sendSuccess(response, result, 201);
  },

  async createInstallationOrderFromQuotation(request: Request, response: Response) {
    const payload = createInstallationOrderSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const { quotationId } = quotationIdParamSchema.parse(request.params);
    const result = await installationService.createInstallationOrderFromQuotation(
      quotationId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.create,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
        quotationId,
      },
    });
    await logAuditEvent(request, {
      action: "installation_order.created_from_quotation",
      after: result,
      before: null,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
        quotationId,
      },
    });

    sendSuccess(response, result, 201);
  },

  async updateInstallationOrder(request: Request, response: Response) {
    const installationOrderId = getRequiredOrderId(request.params.id);
    const payload = updateInstallationOrderSchema.parse(request.body);
    const result = await installationService.updateInstallationOrder(
      installationOrderId,
      payload,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.update,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.current.code,
      },
    });
    await logAuditEvent(request, {
      action: "installation_order.updated",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.current.code,
      },
    });

    sendSuccess(response, result.current);
  },

  async assignInstallationOrder(request: Request, response: Response) {
    const installationOrderId = getRequiredOrderId(request.params.id);
    const payload = assignInstallationOrderSchema.parse(request.body);
    const result = await installationService.assignInstallationOrder(
      installationOrderId,
      payload,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.assign,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        assignedSupervisorId: result.current.assignedSupervisor?.id ?? null,
        assignedTeamId: result.current.assignedTeam?.id ?? null,
        code: result.current.code,
      },
    });
    await logAuditEvent(request, {
      action: "installation_order.assigned",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.current.code,
      },
    });

    sendSuccess(response, result.current);
  },

  async rescheduleInstallationOrder(request: Request, response: Response) {
    const installationOrderId = getRequiredOrderId(request.params.id);
    const payload = rescheduleInstallationOrderSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await installationService.rescheduleInstallationOrder(
      installationOrderId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.schedule,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.current.code,
        reason: payload.reason,
      },
    });
    await logAuditEvent(request, {
      action: "installation_order.rescheduled",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.current.code,
        reason: payload.reason,
      },
    });

    sendSuccess(response, result.current);
  },

  async changeInstallationOrderStatus(request: Request, response: Response) {
    const installationOrderId = getRequiredOrderId(request.params.id);
    const payload = changeInstallationStatusSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const requiredPermission = getRequiredPermissionForStatus(payload.status);
    const actorPermissions = new Set(
      request.authorizationSummary?.permissions ?? [],
    );

    if (!actorPermissions.has(requiredPermission)) {
      throw new AppError(
        "No tienes permiso para registrar el estado seleccionado.",
        403,
      );
    }

    const previous = await installationService.getInstallationOrderById(installationOrderId);
    const result = await installationService.changeInstallationOrderStatus(
      installationOrderId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: requiredPermission,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
        status: payload.status,
      },
    });
    await logAuditEvent(request, {
      action: "installation_order.status_changed",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.order,
      metadata: {
        code: result.code,
        status: payload.status,
      },
    });

    sendSuccess(response, result);
  },

  async updateInstallationTask(request: Request, response: Response) {
    const taskId = getRequiredTaskId(request.params.taskId);
    const payload = updateInstallationTaskSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await installationService.updateInstallationTask(
      taskId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.update,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.task,
      metadata: {
        status: result.current.status,
        title: result.current.title,
      },
    });
    await logAuditEvent(request, {
      action: "installation_task.updated",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.task,
    });

    sendSuccess(response, result.current);
  },

  async completeInstallationTask(request: Request, response: Response) {
    const taskId = getRequiredTaskId(request.params.taskId);
    const actorContext = getRequestLogActorContext(request);
    const actorPermissions = new Set(
      request.authorizationSummary?.permissions ?? [],
    );
    const result = await installationService.completeInstallationTask(
      taskId,
      actorContext.userId ?? null,
    );
    const activityPermission = actorPermissions.has(INSTALLATION_PERMISSIONS.execute)
      ? INSTALLATION_PERMISSIONS.execute
      : INSTALLATION_PERMISSIONS.complete;

    await logActivityEvent(request, {
      action: activityPermission,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.task,
      metadata: {
        status: result.current.status,
        title: result.current.title,
      },
    });
    await logAuditEvent(request, {
      action: "installation_task.completed",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.task,
    });

    sendSuccess(response, result.current);
  },

  async createInstallationEvidence(request: Request, response: Response) {
    const installationOrderId = getRequiredOrderId(request.params.id);
    const uploadedFile = request.file;

    if (!uploadedFile) {
      throw new AppError("Debes adjuntar un archivo de evidencia.", 400);
    }

    const metadata = installationEvidenceMetadataSchema.parse({
      description: request.body.description,
      mimetype: uploadedFile.mimetype,
      originalName: uploadedFile.originalname,
      size: uploadedFile.size,
      taskId: request.body.taskId,
      type: request.body.type,
    });

    const actorContext = getRequestLogActorContext(request);
    const result = await installationService.createInstallationEvidence(
      installationOrderId,
      metadata,
      {
        buffer: uploadedFile.buffer,
        mimetype: metadata.mimetype,
        originalName: metadata.originalName,
        size: metadata.size,
      },
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.execute,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.evidence,
      metadata: {
        installationOrderId,
        type: result.type,
      },
    });
    await logAuditEvent(request, {
      action: "installation_evidence.uploaded",
      after: result,
      before: null,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.evidence,
      metadata: {
        installationOrderId,
      },
    });

    sendSuccess(response, result, 201);
  },

  async createInstallationIssue(request: Request, response: Response) {
    const installationOrderId = getRequiredOrderId(request.params.id);
    const payload = createInstallationIssueSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await installationService.createInstallationIssue(
      installationOrderId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.execute,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.issue,
      metadata: {
        installationOrderId,
        severity: result.severity,
        status: result.status,
        type: result.type,
      },
    });
    await logAuditEvent(request, {
      action: "installation_issue.created",
      after: result,
      before: null,
      entityId: result.id,
      entityType: INSTALLATION_ENTITY_TYPES.issue,
      metadata: {
        installationOrderId,
      },
    });

    sendSuccess(response, result, 201);
  },

  async resolveInstallationIssue(request: Request, response: Response) {
    const issueId = getRequiredIssueId(request.params.issueId);
    const payload = resolveInstallationIssueSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await installationService.resolveInstallationIssue(
      issueId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.update,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.issue,
      metadata: {
        status: result.current.status,
      },
    });
    await logAuditEvent(request, {
      action: "installation_issue.updated",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: INSTALLATION_ENTITY_TYPES.issue,
    });

    sendSuccess(response, result.current);
  },

  async listInstallationTeams(_request: Request, response: Response) {
    const result = await installationService.listInstallationTeams();
    sendSuccess(response, result);
  },

  async createInstallationTeam(request: Request, response: Response) {
    const payload = installationTeamMutationSchema.parse(request.body);
    const result = await installationService.createInstallationTeam(payload);

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.assign,
      entityId: result?.id ?? "",
      entityType: INSTALLATION_ENTITY_TYPES.team,
      metadata: {
        name: result?.name ?? null,
      },
    });
    await logAuditEvent(request, {
      action: "installation_team.created",
      after: result,
      before: null,
      entityId: result?.id ?? "",
      entityType: INSTALLATION_ENTITY_TYPES.team,
    });

    sendSuccess(response, result, 201);
  },

  async updateInstallationTeam(request: Request, response: Response) {
    const { teamId } = installationTeamIdParamSchema.parse(request.params);
    const payload = installationTeamMutationSchema.parse(request.body);
    const result = await installationService.updateInstallationTeam(teamId, payload);

    await logActivityEvent(request, {
      action: INSTALLATION_PERMISSIONS.assign,
      entityId: result.current?.id ?? "",
      entityType: INSTALLATION_ENTITY_TYPES.team,
      metadata: {
        name: result.current?.name ?? null,
      },
    });
    await logAuditEvent(request, {
      action: "installation_team.updated",
      after: result.current,
      before: result.previous,
      entityId: result.current?.id ?? "",
      entityType: INSTALLATION_ENTITY_TYPES.team,
    });

    sendSuccess(response, result.current);
  },
};
