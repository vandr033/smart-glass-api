import type { Request, Response } from "express";

import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import {
  MEASUREMENTS_ENTITY_TYPES,
  MEASUREMENTS_PERMISSIONS,
} from "./measurements.constants.js";
import { measurementsService } from "./measurements.service.js";
import {
  cancelMeasurementRequestSchema,
  createMeasurementOpeningSchema,
  createMeasurementRequestSchema,
  createTechnicalObservationSchema,
  listMeasurementRequestsQuerySchema,
  measurementCalendarQuerySchema,
  measurementDecisionSchema,
  measurementEvidenceMetadataSchema,
  measurementOpeningIdParamSchema,
  measurementRequestIdParamSchema,
  reprogramMeasurementRequestSchema,
  resolveTechnicalObservationSchema,
  scheduleMeasurementRequestSchema,
  startMeasurementVisitSchema,
  submitMeasurementApprovalSchema,
  technicalObservationIdParamSchema,
  updateMeasurementOpeningSchema,
  updateMeasurementRequestSchema,
} from "./measurements.validators.js";

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

const getRequiredRequestId = (value: string | string[] | undefined): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new AppError("El identificador de la solicitud es obligatorio.", 400);
  }

  return measurementRequestIdParamSchema.parse({
    id,
  }).id;
};

const getRequiredOpeningId = (value: string | string[] | undefined): string => {
  const openingId = Array.isArray(value) ? value[0] : value;

  if (!openingId) {
    throw new AppError("El identificador de la abertura es obligatorio.", 400);
  }

  return measurementOpeningIdParamSchema.parse({
    openingId,
  }).openingId;
};

const getRequiredObservationId = (value: string | string[] | undefined): string => {
  const observationId = Array.isArray(value) ? value[0] : value;

  if (!observationId) {
    throw new AppError("El identificador de la observacion es obligatorio.", 400);
  }

  return technicalObservationIdParamSchema.parse({
    observationId,
  }).observationId;
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

export const measurementsController = {
  async listMeasurementRequests(request: Request, response: Response) {
    const query = listMeasurementRequestsQuerySchema.parse({
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
      technicianId: getQueryValue(request.query["filter.technicianId"]),
    });

    const result = await measurementsService.listMeasurementRequests(query);
    sendPaginated(response, result.data, result.pagination);
  },

  async listMeasurementCalendar(request: Request, response: Response) {
    const query = measurementCalendarQuerySchema.parse({
      clientId: getQueryValue(request.query["filter.clientId"]),
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      projectId: getQueryValue(request.query["filter.projectId"]),
      status: getQueryValue(request.query["filter.status"]),
      technicianId: getQueryValue(request.query["filter.technicianId"]),
      view: getQueryValue(request.query.view),
    });

    const result = await measurementsService.listMeasurementCalendar(query);
    sendSuccess(response, result);
  },

  async getMeasurementRequestById(request: Request, response: Response) {
    const result = await measurementsService.getMeasurementRequestById(
      getRequiredRequestId(request.params.id),
    );

    sendSuccess(response, result);
  },

  async createMeasurementRequest(request: Request, response: Response) {
    const payload = createMeasurementRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.createMeasurementRequest(
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.create,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.created",
      after: result,
      before: null,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result, 201);
  },

  async updateMeasurementRequest(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = updateMeasurementRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.updateMeasurementRequest(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.update,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.updated",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async scheduleMeasurementRequest(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = scheduleMeasurementRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.scheduleMeasurementRequest(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.schedule,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.scheduled",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async reprogramMeasurementRequest(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = reprogramMeasurementRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.reprogramMeasurementRequest(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.schedule,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.rescheduled",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async cancelMeasurementRequest(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = cancelMeasurementRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.cancelMeasurementRequest(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: "mediciones.cancelar",
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.cancelled",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async startMeasurementVisit(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = startMeasurementVisitSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.startMeasurementVisit(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.execute,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.visit,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_visit.started",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async createMeasurementOpening(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = createMeasurementOpeningSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.createMeasurementOpening(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.execute,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.opening,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_opening.created",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result, 201);
  },

  async updateMeasurementOpening(request: Request, response: Response) {
    const openingId = getRequiredOpeningId(request.params.openingId);
    const payload = updateMeasurementOpeningSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.updateMeasurementOpening(
      openingId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.update,
      entityId: openingId,
      entityType: MEASUREMENTS_ENTITY_TYPES.opening,
      metadata: {
        requestId: result.id,
      },
    });

    sendSuccess(response, result);
  },

  async duplicateMeasurementOpening(request: Request, response: Response) {
    const openingId = getRequiredOpeningId(request.params.openingId);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.duplicateMeasurementOpening(
      openingId,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.update,
      entityId: openingId,
      entityType: MEASUREMENTS_ENTITY_TYPES.opening,
      metadata: {
        duplicatedIntoRequestId: result.id,
      },
    });

    sendSuccess(response, result);
  },

  async uploadMeasurementEvidence(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const file = request.file;

    if (!file) {
      throw new AppError("Debes adjuntar un archivo de evidencia.", 400);
    }

    const payload = measurementEvidenceMetadataSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.uploadMeasurementEvidence(
      requestId,
      payload,
      {
        buffer: file.buffer,
        mimetype: file.mimetype ?? null,
        originalName: file.originalname,
        size: file.size,
      },
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.execute,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.evidence,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result, 201);
  },

  async createTechnicalObservation(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = createTechnicalObservationSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.createTechnicalObservation(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.execute,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.observation,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "technical_observation.created",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result, 201);
  },

  async resolveTechnicalObservation(request: Request, response: Response) {
    const observationId = getRequiredObservationId(request.params.observationId);
    const payload = resolveTechnicalObservationSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.resolveTechnicalObservation(
      observationId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.update,
      entityId: observationId,
      entityType: MEASUREMENTS_ENTITY_TYPES.observation,
      metadata: {
        requestId: result.id,
      },
    });

    sendSuccess(response, result);
  },

  async submitMeasurementForApproval(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = submitMeasurementApprovalSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.submitMeasurementForApproval(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.execute,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.submitted_for_approval",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async approveMeasurementRequest(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = measurementDecisionSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.approveMeasurementRequest(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.approve,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.approved",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async rejectMeasurementRequest(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const previous = await measurementsService.getMeasurementRequestById(requestId);
    const payload = measurementDecisionSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.rejectMeasurementRequest(
      requestId,
      payload,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: MEASUREMENTS_PERMISSIONS.reject,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });
    await logAuditEvent(request, {
      action: "measurement_request.rejected",
      after: result,
      before: previous,
      entityId: result.id,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        code: result.code,
      },
    });

    sendSuccess(response, result);
  },

  async createQuotationFromMeasurement(request: Request, response: Response) {
    const requestId = getRequiredRequestId(request.params.id);
    const actorContext = getRequestLogActorContext(request);
    const result = await measurementsService.createQuotationFromMeasurement(
      requestId,
      actorContext.userId ?? null,
    );

    await logActivityEvent(request, {
      action: "measurements.create_quotation",
      entityId: requestId,
      entityType: MEASUREMENTS_ENTITY_TYPES.request,
      metadata: {
        quotationCode: result.code,
        quotationId: result.id,
      },
    });

    sendSuccess(response, result, 201);
  },
};
