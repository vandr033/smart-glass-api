import type { Request, Response } from "express";

import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { PROJECTS_PERMISSIONS } from "./projects.constants.js";
import {
  projectsService,
  PROJECT_ENTITY_TYPES,
  transitionProjectStatus,
} from "./projects.service.js";
import {
  listProjectsQuerySchema,
  projectAttachmentInputSchema,
  projectAttachmentParamsSchema,
  projectFileUploadSchema,
  projectIdParamSchema,
  projectMeasurementInputSchema,
  projectMeasurementParamsSchema,
  projectMutationSchema,
  projectNoteInputSchema,
  projectNoteParamsSchema,
  projectTransitionSchema,
} from "./projects.validators.js";

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

const getRequiredProjectId = (value: string | string[] | undefined): string => {
  const projectId = Array.isArray(value) ? value[0] : value;

  if (!projectId) {
    throw new AppError("Project id is required.", 400);
  }

  return projectIdParamSchema.parse({
    id: projectId,
  }).id;
};

const getRequiredNoteParams = (
  projectId: string | string[] | undefined,
  noteId: string | string[] | undefined,
) => {
  const normalizedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
  const normalizedNoteId = Array.isArray(noteId) ? noteId[0] : noteId;

  if (!normalizedProjectId || !normalizedNoteId) {
    throw new AppError("Project and note ids are required.", 400);
  }

  return projectNoteParamsSchema.parse({
    id: normalizedProjectId,
    noteId: normalizedNoteId,
  });
};

const getRequiredAttachmentParams = (
  projectId: string | string[] | undefined,
  attachmentId: string | string[] | undefined,
) => {
  const normalizedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
  const normalizedAttachmentId = Array.isArray(attachmentId)
    ? attachmentId[0]
    : attachmentId;

  if (!normalizedProjectId || !normalizedAttachmentId) {
    throw new AppError("Project and attachment ids are required.", 400);
  }

  return projectAttachmentParamsSchema.parse({
    attachmentId: normalizedAttachmentId,
    id: normalizedProjectId,
  });
};

const getRequiredMeasurementParams = (
  projectId: string | string[] | undefined,
  measurementId: string | string[] | undefined,
) => {
  const normalizedProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
  const normalizedMeasurementId = Array.isArray(measurementId)
    ? measurementId[0]
    : measurementId;

  if (!normalizedProjectId || !normalizedMeasurementId) {
    throw new AppError("Project and measurement ids are required.", 400);
  }

  return projectMeasurementParamsSchema.parse({
    id: normalizedProjectId,
    measurementId: normalizedMeasurementId,
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

export const projectsController = {
  async listProjects(request: Request, response: Response) {
    const query = listProjectsQuerySchema.parse({
      clientId: getQueryValue(request.query["filter.clientId"]),
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      priority: getQueryValue(request.query["filter.priority"]),
      projectType: getQueryValue(request.query["filter.projectType"]),
      responsibleUserId: getQueryValue(request.query["filter.responsibleUserId"]),
      salesUserId: getQueryValue(request.query["filter.salesUserId"]),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
    });

    const result = await projectsService.listProjects(query);
    sendPaginated(response, result.data, result.pagination);
  },

  async getProjectById(request: Request, response: Response) {
    const project = await projectsService.getProjectById(
      getRequiredProjectId(request.params.id),
      {
        isSuperAdmin: request.authorizationSummary?.isSuperAdmin ?? false,
      },
    );

    sendSuccess(response, project);
  },

  async createProject(request: Request, response: Response) {
    const payload = projectMutationSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const project = await projectsService.createProject(payload, {
      isSuperAdmin: request.authorizationSummary?.isSuperAdmin ?? false,
      userId: actorContext.userId,
    });

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.create,
      entityId: project.id,
      entityType: PROJECT_ENTITY_TYPES.project,
      metadata: {
        code: project.code,
        title: project.title,
      },
    });
    await logAuditEvent(request, {
      action: "project.created",
      after: project,
      before: null,
      entityId: project.id,
      entityType: PROJECT_ENTITY_TYPES.project,
      metadata: {
        code: project.code,
      },
    });

    sendSuccess(response, project, 201);
  },

  async updateProject(request: Request, response: Response) {
    const projectId = getRequiredProjectId(request.params.id);
    const payload = projectMutationSchema.parse(request.body);
    const result = await projectsService.updateProject(projectId, payload, {
      isSuperAdmin: request.authorizationSummary?.isSuperAdmin ?? false,
    });

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: result.current.id,
      entityType: PROJECT_ENTITY_TYPES.project,
      metadata: {
        code: result.current.code,
        title: result.current.title,
      },
    });
    await logAuditEvent(request, {
      action: "project.updated",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: PROJECT_ENTITY_TYPES.project,
      metadata: {
        code: result.current.code,
      },
    });

    sendSuccess(response, result.current);
  },

  async deleteProject(request: Request, response: Response) {
    const project = await projectsService.deleteProject(
      getRequiredProjectId(request.params.id),
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.delete,
      entityId: project.id,
      entityType: PROJECT_ENTITY_TYPES.project,
      metadata: {
        code: project.code,
        title: project.title,
      },
    });
    await logAuditEvent(request, {
      action: "project.deleted",
      after: null,
      before: project,
      entityId: project.id,
      entityType: PROJECT_ENTITY_TYPES.project,
      metadata: {
        code: project.code,
      },
    });

    sendSuccess(response, {
      deleted: true,
      id: project.id,
    });
  },

  async transitionProject(request: Request, response: Response) {
    const projectId = getRequiredProjectId(request.params.id);
    const payload = projectTransitionSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await transitionProjectStatus({
      ipAddress: actorContext.ipAddress,
      isSuperAdmin: request.authorizationSummary?.isSuperAdmin ?? false,
      metadata: payload.metadata,
      projectId,
      reason: payload.reason,
      toStatus: payload.toStatus,
      userAgent: actorContext.userAgent,
      userId: actorContext.userId,
    });

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: result.projectId,
      entityType: PROJECT_ENTITY_TYPES.project,
      metadata: {
        fromStatus: result.historyEntry.fromStatus,
        toStatus: result.historyEntry.toStatus,
      },
    });

    sendSuccess(response, result);
  },

  async getProjectStatusHistory(request: Request, response: Response) {
    const history = await projectsService.listProjectStatusHistory(
      getRequiredProjectId(request.params.id),
    );

    sendSuccess(response, history);
  },

  async listProjectNotes(request: Request, response: Response) {
    const notes = await projectsService.listProjectNotes(
      getRequiredProjectId(request.params.id),
    );

    sendSuccess(response, notes);
  },

  async createProjectNote(request: Request, response: Response) {
    const projectId = getRequiredProjectId(request.params.id);
    const payload = projectNoteInputSchema.parse(request.body);
    const note = await projectsService.addProjectNote(
      projectId,
      payload,
      request.authSession?.user.id ?? null,
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: note.id,
      entityType: PROJECT_ENTITY_TYPES.note,
      metadata: {
        projectId,
        visibility: note.visibility,
      },
    });
    await logAuditEvent(request, {
      action: "project_note.created",
      after: note,
      before: null,
      entityId: note.id,
      entityType: PROJECT_ENTITY_TYPES.note,
      metadata: {
        projectId,
      },
    });

    sendSuccess(response, note, 201);
  },

  async updateProjectNote(request: Request, response: Response) {
    const params = getRequiredNoteParams(request.params.id, request.params.noteId);
    const payload = projectNoteInputSchema.parse(request.body);
    const result = await projectsService.updateProjectNote(
      params.id,
      params.noteId,
      payload,
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: result.current.id,
      entityType: PROJECT_ENTITY_TYPES.note,
      metadata: {
        projectId: params.id,
        visibility: result.current.visibility,
      },
    });
    await logAuditEvent(request, {
      action: "project_note.updated",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: PROJECT_ENTITY_TYPES.note,
      metadata: {
        projectId: params.id,
      },
    });

    sendSuccess(response, result.current);
  },

  async deleteProjectNote(request: Request, response: Response) {
    const params = getRequiredNoteParams(request.params.id, request.params.noteId);
    const note = await projectsService.deleteProjectNote(params.id, params.noteId);

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: note.id,
      entityType: PROJECT_ENTITY_TYPES.note,
      metadata: {
        projectId: params.id,
        visibility: note.visibility,
      },
    });
    await logAuditEvent(request, {
      action: "project_note.deleted",
      after: null,
      before: note,
      entityId: note.id,
      entityType: PROJECT_ENTITY_TYPES.note,
      metadata: {
        projectId: params.id,
      },
    });

    sendSuccess(response, {
      deleted: true,
      id: note.id,
    });
  },

  async listProjectAttachments(request: Request, response: Response) {
    const attachments = await projectsService.listProjectAttachments(
      getRequiredProjectId(request.params.id),
    );

    sendSuccess(response, attachments);
  },

  async createProjectAttachment(request: Request, response: Response) {
    const projectId = getRequiredProjectId(request.params.id);
    const file = request.file;

    if (!file) {
      throw new AppError("Attachment file is required.", 400);
    }

    const uploadMetadata = projectFileUploadSchema.parse({
      mimetype: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    });
    const payload = projectAttachmentInputSchema.parse(request.body);
    const attachment = await projectsService.addProjectAttachment(
      projectId,
      payload,
      {
        buffer: file.buffer,
        mimetype: uploadMetadata.mimetype,
        originalName: uploadMetadata.originalName,
        size: uploadMetadata.size,
      },
      request.authSession?.user.id ?? null,
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: attachment.id,
      entityType: PROJECT_ENTITY_TYPES.attachment,
      metadata: {
        attachmentType: attachment.attachmentType,
        projectId,
      },
    });
    await logAuditEvent(request, {
      action: "project_attachment.uploaded",
      after: attachment,
      before: null,
      entityId: attachment.id,
      entityType: PROJECT_ENTITY_TYPES.attachment,
      metadata: {
        projectId,
      },
    });

    sendSuccess(response, attachment, 201);
  },

  async deleteProjectAttachment(request: Request, response: Response) {
    const params = getRequiredAttachmentParams(
      request.params.id,
      request.params.attachmentId,
    );
    const attachment = await projectsService.deleteProjectAttachment(
      params.id,
      params.attachmentId,
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: attachment.id,
      entityType: PROJECT_ENTITY_TYPES.attachment,
      metadata: {
        attachmentType: attachment.attachmentType,
        projectId: params.id,
      },
    });
    await logAuditEvent(request, {
      action: "project_attachment.deleted",
      after: null,
      before: attachment,
      entityId: attachment.id,
      entityType: PROJECT_ENTITY_TYPES.attachment,
      metadata: {
        projectId: params.id,
      },
    });

    sendSuccess(response, {
      deleted: true,
      id: attachment.id,
    });
  },

  async listProjectMeasurements(request: Request, response: Response) {
    const measurements = await projectsService.listProjectMeasurements(
      getRequiredProjectId(request.params.id),
    );

    sendSuccess(response, measurements);
  },

  async createProjectMeasurement(request: Request, response: Response) {
    const projectId = getRequiredProjectId(request.params.id);
    const payload = projectMeasurementInputSchema.parse(request.body);
    const measurement = await projectsService.addProjectMeasurement(
      projectId,
      payload,
      request.authSession?.user.id ?? null,
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: measurement.id,
      entityType: PROJECT_ENTITY_TYPES.measurement,
      metadata: {
        projectId,
        quantity: measurement.quantity,
      },
    });
    await logAuditEvent(request, {
      action: "project_measurement.created",
      after: measurement,
      before: null,
      entityId: measurement.id,
      entityType: PROJECT_ENTITY_TYPES.measurement,
      metadata: {
        projectId,
      },
    });

    sendSuccess(response, measurement, 201);
  },

  async updateProjectMeasurement(request: Request, response: Response) {
    const params = getRequiredMeasurementParams(
      request.params.id,
      request.params.measurementId,
    );
    const payload = projectMeasurementInputSchema.parse(request.body);
    const result = await projectsService.updateProjectMeasurement(
      params.id,
      params.measurementId,
      payload,
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: result.current.id,
      entityType: PROJECT_ENTITY_TYPES.measurement,
      metadata: {
        projectId: params.id,
        quantity: result.current.quantity,
      },
    });
    await logAuditEvent(request, {
      action: "project_measurement.updated",
      after: result.current,
      before: result.previous,
      entityId: result.current.id,
      entityType: PROJECT_ENTITY_TYPES.measurement,
      metadata: {
        projectId: params.id,
      },
    });

    sendSuccess(response, result.current);
  },

  async deleteProjectMeasurement(request: Request, response: Response) {
    const params = getRequiredMeasurementParams(
      request.params.id,
      request.params.measurementId,
    );
    const measurement = await projectsService.deleteProjectMeasurement(
      params.id,
      params.measurementId,
    );

    await logActivityEvent(request, {
      action: PROJECTS_PERMISSIONS.update,
      entityId: measurement.id,
      entityType: PROJECT_ENTITY_TYPES.measurement,
      metadata: {
        projectId: params.id,
        quantity: measurement.quantity,
      },
    });
    await logAuditEvent(request, {
      action: "project_measurement.deleted",
      after: null,
      before: measurement,
      entityId: measurement.id,
      entityType: PROJECT_ENTITY_TYPES.measurement,
      metadata: {
        projectId: params.id,
      },
    });

    sendSuccess(response, {
      deleted: true,
      id: measurement.id,
    });
  },

  async getDashboardSummary(_request: Request, response: Response) {
    const summary = await projectsService.getDashboardSummary();
    sendSuccess(response, summary);
  },

  async listProjectUserOptions(_request: Request, response: Response) {
    const users = await projectsService.listProjectUserOptions();
    sendSuccess(response, users);
  },
};
