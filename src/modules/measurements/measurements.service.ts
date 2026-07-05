import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "../../../generated/prisma/client.js";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";

import { getClientDisplayName } from "../clients/clients.service.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import {
  buildMeasurementEvidenceUrl,
  measurementEvidenceUploadsDir,
} from "../../utils/uploads.js";
import { buildDateRangeFilter } from "../../services/logging-utils.js";
import type {
  CancelMeasurementRequestInput,
  CreateMeasurementOpeningInput,
  CreateMeasurementRequestInput,
  CreateTechnicalObservationInput,
  ListMeasurementRequestsQuery,
  MeasurementAddressSummary,
  MeasurementCalendarQuery,
  MeasurementClientSummary,
  MeasurementDecisionInput,
  MeasurementEvidenceMetadataInput,
  MeasurementEvidenceRecord,
  MeasurementOpeningRecord,
  MeasurementProductionJobSummary,
  MeasurementProjectSummary,
  MeasurementRequestDetailRecord,
  MeasurementRequestListItem,
  MeasurementRequestStatus,
  MeasurementStatusHistoryRecord,
  MeasurementUserSummary,
  MeasurementVisitRecord,
  ReprogramMeasurementRequestInput,
  ResolveTechnicalObservationInput,
  ScheduleMeasurementRequestInput,
  StartMeasurementVisitInput,
  SubmitMeasurementApprovalInput,
  TechnicalObservationRecord,
  UpdateMeasurementOpeningInput,
  UpdateMeasurementRequestInput,
} from "./measurements.types.js";
import {
  MEASUREMENT_ACTIVE_SCHEDULE_STATUSES,
  MEASUREMENT_SCHEDULABLE_STATUSES,
} from "./measurements.constants.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

type UploadFile = {
  buffer: Buffer;
  mimetype: string | null;
  originalName: string;
  size: number;
};

const userSummarySelect = {
  email: true,
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

const clientSummarySelect = {
  clientType: true,
  commercialName: true,
  firstName: true,
  id: true,
  lastName: true,
  legalName: true,
} satisfies Prisma.ClientSelect;

const projectSummarySelect = {
  code: true,
  id: true,
  status: true,
  title: true,
} satisfies Prisma.ProjectSelect;

const addressSummarySelect = {
  address: true,
  city: true,
  id: true,
  label: true,
  latitude: true,
  longitude: true,
} satisfies Prisma.ClientAddressSelect;

const quotationSummarySelect = {
  code: true,
  id: true,
  status: true,
} satisfies Prisma.QuotationSelect;

const productionJobSummarySelect = {
  code: true,
  id: true,
  status: true,
} satisfies Prisma.ProductionJobSelect;

const measurementEvidenceInclude = {
  uploadedByUser: {
    select: userSummarySelect,
  },
} satisfies Prisma.MeasurementEvidenceInclude;

const technicalObservationInclude = {
  createdByUser: {
    select: userSummarySelect,
  },
  resolvedByUser: {
    select: userSummarySelect,
  },
} satisfies Prisma.TechnicalObservationInclude;

const measurementVisitInclude = {
  evidence: {
    include: measurementEvidenceInclude,
    orderBy: [
      {
        uploadedAt: "desc",
      },
    ],
  },
  observations: {
    include: technicalObservationInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
  openings: {
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  },
  technician: {
    select: userSummarySelect,
  },
} satisfies Prisma.MeasurementVisitInclude;

const measurementRequestListInclude = {
  address: {
    select: addressSummarySelect,
  },
  approvedByUser: {
    select: userSummarySelect,
  },
  assignedTechnician: {
    select: userSummarySelect,
  },
  client: {
    select: clientSummarySelect,
  },
  productionJobs: {
    select: productionJobSummarySelect,
    where: {
      deletedAt: null,
    },
  },
  project: {
    select: projectSummarySelect,
  },
  quotations: {
    select: quotationSummarySelect,
    where: {
      deletedAt: null,
    },
  },
  technicalVisits: {
    include: {
      evidence: {
        select: {
          id: true,
        },
      },
      observations: {
        select: {
          status: true,
        },
      },
      openings: {
        select: {
          id: true,
          requiresCorrection: true,
        },
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
} satisfies Prisma.MeasurementRequestInclude;

const measurementRequestDetailInclude = {
  ...measurementRequestListInclude,
  approvedByUser: {
    select: userSummarySelect,
  },
  createdByUser: {
    select: userSummarySelect,
  },
  statusHistory: {
    include: {
      changedByUser: {
        select: userSummarySelect,
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
  technicalVisits: {
    include: measurementVisitInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
} satisfies Prisma.MeasurementRequestInclude;

type MeasurementRequestListEntity = Prisma.MeasurementRequestGetPayload<{
  include: typeof measurementRequestListInclude;
}>;

type MeasurementRequestDetailEntity = Prisma.MeasurementRequestGetPayload<{
  include: typeof measurementRequestDetailInclude;
}>;

type MeasurementVisitEntity = Prisma.MeasurementVisitGetPayload<{
  include: typeof measurementVisitInclude;
}>;

type MeasurementEvidenceEntity = Prisma.MeasurementEvidenceGetPayload<{
  include: typeof measurementEvidenceInclude;
}>;

type TechnicalObservationEntity = Prisma.TechnicalObservationGetPayload<{
  include: typeof technicalObservationInclude;
}>;

type MeasurementStatusHistoryEntity = Prisma.MeasurementStatusHistoryGetPayload<{
  include: {
    changedByUser: {
      select: typeof userSummarySelect;
    };
  };
}>;

type CurrentRequestHeader = {
  addressId: string | null;
  approvedAt: Date | null;
  assignedTechnicianId: string | null;
  clientId: string;
  code: string;
  deletedAt: Date | null;
  id: string;
  projectId: string | null;
  requestedDate: Date;
  scheduledDate: Date | null;
  scheduledEndTime: string | null;
  scheduledStartTime: string | null;
  status: MeasurementRequestStatus;
};

const decimalToNumber = (
  value: PrismaNamespace.Decimal | number | null,
): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

const toIsoString = (value: Date | null): string | null => value?.toISOString() ?? null;

const mapUserSummary = (
  user:
    | {
        email: string;
        id: string;
        name: string;
      }
    | null,
): MeasurementUserSummary => {
  if (!user) {
    return null;
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
};

const mapClientSummary = (client: {
  clientType: "COMPANY" | "INDIVIDUAL";
  commercialName: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  legalName: string | null;
}): MeasurementClientSummary => ({
  clientType: client.clientType,
  displayName: getClientDisplayName(client),
  id: client.id,
});

const mapProjectSummary = (
  project:
    | {
        code: string;
        id: string;
        status: string;
        title: string;
      }
    | null,
): MeasurementProjectSummary => {
  if (!project) {
    return null;
  }

  return {
    code: project.code,
    id: project.id,
    status: project.status,
    title: project.title,
  };
};

const mapAddressSummary = (
  address:
    | {
        address: string | null;
        city: string | null;
        id: string;
        label: string;
        latitude: PrismaNamespace.Decimal | null;
        longitude: PrismaNamespace.Decimal | null;
      }
    | null,
): MeasurementAddressSummary => {
  if (!address) {
    return null;
  }

  return {
    address: address.address,
    city: address.city,
    id: address.id,
    label: address.label,
    latitude: decimalToNumber(address.latitude),
    longitude: decimalToNumber(address.longitude),
  };
};

const mapEvidence = (record: MeasurementEvidenceEntity): MeasurementEvidenceRecord => ({
  description: record.description,
  fileName: record.fileName,
  fileUrl: record.fileUrl,
  id: record.id,
  measurementOpeningId: record.measurementOpeningId,
  mimeType: record.mimeType,
  sizeBytes: record.sizeBytes,
  type: record.type,
  uploadedAt: record.uploadedAt.toISOString(),
  uploadedByUser: mapUserSummary(record.uploadedByUser),
});

const mapObservation = (
  record: TechnicalObservationEntity,
): TechnicalObservationRecord => ({
  createdAt: record.createdAt.toISOString(),
  createdByUser: mapUserSummary(record.createdByUser),
  description: record.description,
  id: record.id,
  resolvedAt: toIsoString(record.resolvedAt),
  resolvedByUser: mapUserSummary(record.resolvedByUser),
  severity: record.severity,
  status: record.status,
  type: record.type,
  updatedAt: record.updatedAt.toISOString(),
});

const mapOpening = (
  record: MeasurementVisitEntity["openings"][number],
  evidence: MeasurementEvidenceEntity[],
): MeasurementOpeningRecord => ({
  code: record.code,
  createdAt: record.createdAt.toISOString(),
  depthMm: decimalToNumber(record.depthMm),
  elementType: record.elementType,
  environment: record.environment,
  evidence: evidence
    .filter((entry) => entry.measurementOpeningId === record.id)
    .map(mapEvidence),
  heightMm: Number(record.heightMm),
  id: record.id,
  observations: record.observations,
  quantity: record.quantity,
  requiresCorrection: record.requiresCorrection,
  status: record.status,
  updatedAt: record.updatedAt.toISOString(),
  widthMm: Number(record.widthMm),
});

const mapVisit = (record: MeasurementVisitEntity): MeasurementVisitRecord => ({
  createdAt: record.createdAt.toISOString(),
  evidence: record.evidence.map(mapEvidence),
  finishedAt: toIsoString(record.finishedAt),
  generalObservations: record.generalObservations,
  id: record.id,
  locationConfirmed: record.locationConfirmed,
  observations: record.observations.map(mapObservation),
  openings: record.openings.map((opening) => mapOpening(opening, record.evidence)),
  result: record.result,
  startedAt: toIsoString(record.startedAt),
  status: record.status,
  technician: mapUserSummary(record.technician),
  updatedAt: record.updatedAt.toISOString(),
});

const mapStatusHistory = (
  record: MeasurementStatusHistoryEntity,
): MeasurementStatusHistoryRecord => ({
  changedByUser: mapUserSummary(record.changedByUser),
  createdAt: record.createdAt.toISOString(),
  fromStatus: record.fromStatus,
  id: record.id,
  metadataJson: record.metadataJson,
  notes: record.notes,
  toStatus: record.toStatus,
});

const mapQuotationSummary = (
  records: Array<{
    code: string;
    id: string;
    status: string;
  }>,
) => {
  return records.map((record) => ({
    code: record.code,
    id: record.id,
    status: record.status,
  }));
};

const mapProductionJobSummary = (
  records: Array<{
    code: string;
    id: string;
    status: string;
  }>,
) => {
  return records.map((record) => ({
    code: record.code,
    id: record.id,
    status: record.status,
  }));
};

const toScheduleDateString = (value: Date | null): string | null =>
  value ? value.toISOString() : null;

const collectVisitMetrics = (
  visits: Array<{
    evidence: Array<{ id: string }>;
    observations: Array<{ status: string }>;
    openings: Array<{ id: string; requiresCorrection: boolean }>;
  }>,
) => {
  return visits.reduce(
    (result, visit) => {
      result.evidenceCount += visit.evidence.length;
      result.openingCount += visit.openings.length;
      result.openObservationCount += visit.observations.filter((entry) =>
        entry.status === "OPEN" || entry.status === "IN_PROGRESS",
      ).length;
      result.requiresCorrection =
        result.requiresCorrection || visit.openings.some((entry) => entry.requiresCorrection);
      return result;
    },
    {
      evidenceCount: 0,
      openObservationCount: 0,
      openingCount: 0,
      requiresCorrection: false,
    },
  );
};

const buildMeasurementAlerts = (
  input: {
    productionJobs: Array<{ code: string }>;
    quotations: Array<{ code: string }>;
    status: MeasurementRequestStatus;
  },
) => {
  const quotation = [] as string[];
  const production = [] as string[];
  const statusMessage =
    input.status === "REJECTED"
      ? "Las medidas vinculadas fueron rechazadas."
      : input.status === "PENDING_APPROVAL"
        ? "Las medidas vinculadas estan pendientes de aprobacion."
        : input.status === "WITH_OBSERVATIONS"
          ? "Las medidas vinculadas tienen observaciones tecnicas pendientes."
          : input.status === "REGISTERED"
            ? "Las medidas vinculadas todavia no fueron aprobadas."
            : null;

  if (statusMessage && input.quotations.length > 0) {
    quotation.push(statusMessage);
  }

  if (statusMessage && input.productionJobs.length > 0) {
    production.push(statusMessage);
  }

  return {
    production,
    quotation,
  };
};

const mapMeasurementRequestListItem = (
  record: MeasurementRequestListEntity,
  hasScheduleConflict: boolean,
): MeasurementRequestListItem => {
  const metrics = collectVisitMetrics(record.technicalVisits);
  const latestVisit = record.technicalVisits[0] ?? null;

  return {
    address: mapAddressSummary(record.address),
    approvedAt: toIsoString(record.approvedAt),
    approvedByUser: mapUserSummary(record.approvedByUser),
    assignedTechnician: mapUserSummary(record.assignedTechnician),
    client: mapClientSummary(record.client),
    code: record.code,
    createdAt: record.createdAt.toISOString(),
    evidenceCount: metrics.evidenceCount,
    hasScheduleConflict,
    id: record.id,
    latestVisit: latestVisit
      ? {
          id: latestVisit.id,
          result: latestVisit.result,
          status: latestVisit.status,
        }
      : null,
    observations: record.observations,
    openingCount: metrics.openingCount,
    openObservationCount: metrics.openObservationCount,
    priority: record.priority,
    productionJobCount: record.productionJobs.length,
    project: mapProjectSummary(record.project),
    quotationCount: record.quotations.length,
    rejectedAt: toIsoString(record.rejectedAt),
    requestedDate: record.requestedDate.toISOString(),
    scheduledDate: toScheduleDateString(record.scheduledDate),
    scheduledEndTime: record.scheduledEndTime,
    scheduledStartTime: record.scheduledStartTime,
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
    visitCount: record.technicalVisits.length,
  };
};

const mapMeasurementRequestDetail = (
  record: MeasurementRequestDetailEntity,
  hasScheduleConflict: boolean,
): MeasurementRequestDetailRecord => {
  const base = mapMeasurementRequestListItem(record, hasScheduleConflict);

  return {
    ...base,
    alerts: buildMeasurementAlerts(record),
    createdByUser: mapUserSummary(record.createdByUser),
    productionJobs: mapProductionJobSummary(record.productionJobs),
    quotations: mapQuotationSummary(record.quotations),
    statusHistory: record.statusHistory.map(mapStatusHistory),
    visits: record.technicalVisits.map(mapVisit),
  };
};

const assertClientExists = async (clientId: string, db: DbClient) => {
  const client = await db.client.findFirst({
    select: {
      id: true,
    },
    where: {
      deletedAt: null,
      id: clientId,
    },
  });

  if (!client) {
    throw new AppError("El cliente seleccionado no existe.", 404);
  }
};

const assertProjectMatchesClient = async (
  projectId: string | null,
  clientId: string,
  db: DbClient,
) => {
  if (!projectId) {
    return;
  }

  const project = await db.project.findFirst({
    select: {
      clientId: true,
      id: true,
    },
    where: {
      deletedAt: null,
      id: projectId,
    },
  });

  if (!project) {
    throw new AppError("El proyecto seleccionado no existe.", 404);
  }

  if (project.clientId !== clientId) {
    throw new AppError("El proyecto seleccionado no pertenece al cliente.", 400);
  }
};

const assertAddressMatchesClient = async (
  addressId: string | null,
  clientId: string,
  db: DbClient,
) => {
  if (!addressId) {
    return;
  }

  const address = await db.clientAddress.findFirst({
    select: {
      clientId: true,
      id: true,
    },
    where: {
      id: addressId,
    },
  });

  if (!address) {
    throw new AppError("La direccion seleccionada no existe.", 404);
  }

  if (address.clientId !== clientId) {
    throw new AppError("La direccion seleccionada no pertenece al cliente.", 400);
  }
};

const assertMeasurementRequestHeaderExists = async (
  requestId: string,
  db: DbClient,
): Promise<CurrentRequestHeader> => {
  const request = await db.measurementRequest.findFirst({
    select: {
      addressId: true,
      approvedAt: true,
      assignedTechnicianId: true,
      clientId: true,
      code: true,
      deletedAt: true,
      id: true,
      projectId: true,
      requestedDate: true,
      scheduledDate: true,
      scheduledEndTime: true,
      scheduledStartTime: true,
      status: true,
    },
    where: {
      deletedAt: null,
      id: requestId,
    },
  });

  if (!request) {
    throw new AppError("La solicitud de medicion no existe.", 404);
  }

  return request;
};

const assertMeasurementRequestExists = async (
  requestId: string,
  db: DbClient,
): Promise<MeasurementRequestDetailEntity> => {
  const request = await db.measurementRequest.findFirst({
    include: measurementRequestDetailInclude,
    where: {
      deletedAt: null,
      id: requestId,
    },
  });

  if (!request) {
    throw new AppError("La solicitud de medicion no existe.", 404);
  }

  return request;
};

const assertRequestIsMutable = (status: MeasurementRequestStatus) => {
  if (status === "APPROVED") {
    throw new AppError(
      "La solicitud ya fue aprobada. Rechazala o reprogramala para modificarla.",
      400,
    );
  }

  if (status === "CANCELLED") {
    throw new AppError("La solicitud esta cancelada y no puede modificarse.", 400);
  }
};

const buildMeasurementRequestWhere = (
  query: Omit<ListMeasurementRequestsQuery, "page" | "perPage" | "sortBy" | "sortDirection">,
): Prisma.MeasurementRequestWhereInput => {
  const dateRange = buildDateRangeFilter(query.dateFrom, query.dateTo);
  const search = query.search.trim();
  const andClauses: Prisma.MeasurementRequestWhereInput[] = [];

  if (dateRange) {
    andClauses.push({
      OR: [
        {
          requestedDate: dateRange,
        },
        {
          scheduledDate: dateRange,
        },
      ],
    });
  }

  if (search.length > 0) {
    andClauses.push({
      OR: [
        {
          code: {
            contains: search,
          },
        },
        {
          client: {
            commercialName: {
              contains: search,
            },
          },
        },
        {
          client: {
            legalName: {
              contains: search,
            },
          },
        },
        {
          project: {
            title: {
              contains: search,
            },
          },
        },
      ],
    });
  }

  return {
    ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    ...(query.technicianId ? { assignedTechnicianId: query.technicianId } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.status ? { status: query.status } : {}),
    deletedAt: null,
  };
};

const generateMeasurementRequestCode = async (
  db: DbClient = prisma,
  value = new Date(),
): Promise<string> => {
  const year = value.getUTCFullYear();
  const prefix = `MED-${year}-`;
  const latestRequest = await db.measurementRequest.findFirst({
    orderBy: {
      code: "desc",
    },
    select: {
      code: true,
    },
    where: {
      code: {
        startsWith: prefix,
      },
    },
  });
  const latestSequence = latestRequest?.code.match(/(\d+)$/)?.[1];
  const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(6, "0")}`;
};

const generateQuotationCode = async (
  db: DbClient = prisma,
  value = new Date(),
): Promise<string> => {
  const year = value.getUTCFullYear();
  const prefix = `COT-${year}-`;
  const latestQuotation = await db.quotation.findFirst({
    orderBy: {
      code: "desc",
    },
    select: {
      code: true,
    },
    where: {
      code: {
        startsWith: prefix,
      },
    },
  });
  const latestSequence = latestQuotation?.code.match(/(\d+)$/)?.[1];
  const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(6, "0")}`;
};

const getLatestVisit = async (
  requestId: string,
  db: DbClient,
) => {
  return db.measurementVisit.findFirst({
    include: measurementVisitInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    where: {
      measurementRequestId: requestId,
    },
  });
};

const toTimeMinutes = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const [hours = Number.NaN, minutes = Number.NaN] = value
    .split(":")
    .map((part) => Number(part));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const hasScheduleOverlap = (
  leftStart: string | null,
  leftEnd: string | null,
  rightStart: string | null,
  rightEnd: string | null,
): boolean => {
  const startA = toTimeMinutes(leftStart);
  const endA = toTimeMinutes(leftEnd);
  const startB = toTimeMinutes(rightStart);
  const endB = toTimeMinutes(rightEnd);

  if (startA === null || endA === null || startB === null || endB === null) {
    return false;
  }

  return startA < endB && startB < endA;
};

const hasMeasurementScheduleConflict = async (
  request: {
    assignedTechnicianId: string | null;
    id: string;
    scheduledDate: Date | null;
    scheduledEndTime: string | null;
    scheduledStartTime: string | null;
  },
  db: DbClient,
): Promise<boolean> => {
  if (
    !request.assignedTechnicianId ||
    !request.scheduledDate ||
    !request.scheduledStartTime ||
    !request.scheduledEndTime
  ) {
    return false;
  }

  const dayStart = new Date(request.scheduledDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const siblingRequests = await db.measurementRequest.findMany({
    select: {
      id: true,
      scheduledEndTime: true,
      scheduledStartTime: true,
    },
    where: {
      assignedTechnicianId: request.assignedTechnicianId,
      deletedAt: null,
      id: {
        not: request.id,
      },
      scheduledDate: {
        gte: dayStart,
        lt: dayEnd,
      },
      status: {
        in: [...MEASUREMENT_ACTIVE_SCHEDULE_STATUSES],
      },
    },
  });

  return siblingRequests.some((entry) =>
    hasScheduleOverlap(
      request.scheduledStartTime,
      request.scheduledEndTime,
      entry.scheduledStartTime,
      entry.scheduledEndTime,
    ),
  );
};

const createMeasurementStatusHistory = async (
  input: {
    changedByUserId: string | null;
    fromStatus: MeasurementRequestStatus | null;
    measurementRequestId: string;
    metadataJson?: Prisma.InputJsonValue | null;
    notes?: string | null;
    toStatus: MeasurementRequestStatus;
  },
  db: DbClient,
) => {
  if (input.fromStatus === input.toStatus) {
    return;
  }

  await db.measurementStatusHistory.create({
    data: {
      changedByUserId: input.changedByUserId,
      fromStatus: input.fromStatus,
      measurementRequestId: input.measurementRequestId,
      ...(input.metadataJson === undefined
        ? {}
        : {
            metadataJson:
              input.metadataJson === null
                ? PrismaNamespace.JsonNull
                : input.metadataJson,
          }),
      ...(input.notes === undefined ? {} : { notes: input.notes }),
      toStatus: input.toStatus,
    },
  });
};

const createScheduledVisit = async (
  input: {
    measurementRequestId: string;
    technicianId: string | null;
  },
  db: DbClient,
) => {
  return db.measurementVisit.create({
    data: {
      measurementRequestId: input.measurementRequestId,
      status: "SCHEDULED",
      technicianId: input.technicianId,
    },
  });
};

const syncEditableRequestStatus = async (
  requestId: string,
  userId: string | null,
  db: DbClient,
) => {
  const request = await db.measurementRequest.findFirst({
    include: {
      technicalVisits: {
        include: {
          observations: {
            select: {
              status: true,
            },
          },
          openings: {
            select: {
              requiresCorrection: true,
            },
          },
        },
      },
    },
    where: {
      deletedAt: null,
      id: requestId,
    },
  });

  if (!request) {
    throw new AppError("La solicitud de medicion no existe.", 404);
  }

  if (
    request.status === "APPROVED" ||
    request.status === "CANCELLED" ||
    request.status === "PENDING_APPROVAL"
  ) {
    return;
  }

  const openObservationCount = request.technicalVisits.reduce(
    (sum, visit) =>
      sum +
      visit.observations.filter(
        (entry) => entry.status === "OPEN" || entry.status === "IN_PROGRESS",
      ).length,
    0,
  );
  const openingCount = request.technicalVisits.reduce(
    (sum, visit) => sum + visit.openings.length,
    0,
  );
  const hasCorrections = request.technicalVisits.some((visit) =>
    visit.openings.some((opening) => opening.requiresCorrection),
  );

  let nextStatus: MeasurementRequestStatus = request.status;

  if (openObservationCount > 0 || hasCorrections) {
    nextStatus = "WITH_OBSERVATIONS";
  } else if (openingCount > 0) {
    nextStatus = "REGISTERED";
  } else if (request.scheduledDate) {
    nextStatus =
      request.status === "RESCHEDULED" ? "RESCHEDULED" : "SCHEDULED";
  } else {
    nextStatus = "REQUESTED";
  }

  if (nextStatus !== request.status) {
    await db.measurementRequest.update({
      data: {
        status: nextStatus,
      },
      where: {
        id: request.id,
      },
    });

    await createMeasurementStatusHistory(
      {
        changedByUserId: userId,
        fromStatus: request.status,
        measurementRequestId: request.id,
        notes: "Estado recalculado por cambios operativos.",
        toStatus: nextStatus,
      },
      db,
    );
  }
};

const getMeasurementRequestByIdInternal = async (
  requestId: string,
  db: DbClient,
): Promise<MeasurementRequestDetailRecord> => {
  const request = await assertMeasurementRequestExists(requestId, db);
  const hasConflict = await hasMeasurementScheduleConflict(request, db);
  return mapMeasurementRequestDetail(request, hasConflict);
};

export const measurementsService = {
  async listMeasurementRequests(query: ListMeasurementRequestsQuery): Promise<{
    data: MeasurementRequestListItem[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
    };
  }> {
    const where = buildMeasurementRequestWhere(query);
    const orderBy: Prisma.MeasurementRequestOrderByWithRelationInput = {
      [query.sortBy]:
        query.sortDirection,
    };

    const [total, records] = await Promise.all([
      prisma.measurementRequest.count({
        where,
      }),
      prisma.measurementRequest.findMany({
        include: measurementRequestListInclude,
        orderBy,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    const conflictStates = await Promise.all(
      records.map((record) => hasMeasurementScheduleConflict(record, prisma)),
    );

    return {
      data: records.map((record, index) =>
        mapMeasurementRequestListItem(record, conflictStates[index] ?? false),
      ),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async listMeasurementCalendar(
    query: MeasurementCalendarQuery,
  ): Promise<MeasurementRequestListItem[]> {
    const where = buildMeasurementRequestWhere({
      clientId: query.clientId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      projectId: query.projectId,
      search: "",
      status: query.status,
      technicianId: query.technicianId,
    });

    const records = await prisma.measurementRequest.findMany({
      include: measurementRequestListInclude,
      orderBy: [
        {
          scheduledDate: "asc",
        },
        {
          scheduledStartTime: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      where,
    });

    const conflictStates = await Promise.all(
      records.map((record) => hasMeasurementScheduleConflict(record, prisma)),
    );

    return records.map((record, index) =>
      mapMeasurementRequestListItem(record, conflictStates[index] ?? false),
    );
  },

  async getMeasurementRequestById(
    requestId: string,
  ): Promise<MeasurementRequestDetailRecord> {
    return getMeasurementRequestByIdInternal(requestId, prisma);
  },

  async createMeasurementRequest(
    input: CreateMeasurementRequestInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    await assertClientExists(input.clientId, prisma);
    await assertProjectMatchesClient(input.projectId, input.clientId, prisma);
    await assertAddressMatchesClient(input.addressId, input.clientId, prisma);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const requestId = await prisma.$transaction(async (db) => {
          const code = await generateMeasurementRequestCode(db);
          const initialStatus: MeasurementRequestStatus = input.scheduledDate
            ? "SCHEDULED"
            : "REQUESTED";

          const request = await db.measurementRequest.create({
            data: {
              addressId: input.addressId,
              assignedTechnicianId: input.assignedTechnicianId,
              clientId: input.clientId,
              code,
              createdByUserId: userId,
              observations: input.observations,
              priority: input.priority,
              projectId: input.projectId,
              requestedDate: input.requestedDate,
              scheduledDate: input.scheduledDate,
              scheduledEndTime: input.scheduledEndTime,
              scheduledStartTime: input.scheduledStartTime,
              status: initialStatus,
            },
            select: {
              id: true,
            },
          });

          await createMeasurementStatusHistory(
            {
              changedByUserId: userId,
              fromStatus: null,
              measurementRequestId: request.id,
              notes: "Solicitud de medicion creada.",
              toStatus: initialStatus,
            },
            db,
          );

          if (input.scheduledDate) {
            await createScheduledVisit(
              {
                measurementRequestId: request.id,
                technicianId: input.assignedTechnicianId,
              },
              db,
            );
          }

          return request.id;
        });

        return this.getMeasurementRequestById(requestId);
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new AppError(
      "No se pudo generar un codigo unico para la solicitud de medicion.",
      500,
    );
  },

  async updateMeasurementRequest(
    requestId: string,
    input: UpdateMeasurementRequestInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);
    await assertClientExists(input.clientId, prisma);
    await assertProjectMatchesClient(input.projectId, input.clientId, prisma);
    await assertAddressMatchesClient(input.addressId, input.clientId, prisma);

    const nextStatus =
      request.status === "REQUESTED" && input.scheduledDate ? "SCHEDULED" : request.status;

    await prisma.$transaction(async (db) => {
      await db.measurementRequest.update({
        data: {
          addressId: input.addressId,
          assignedTechnicianId: input.assignedTechnicianId,
          clientId: input.clientId,
          observations: input.observations,
          priority: input.priority,
          projectId: input.projectId,
          requestedDate: input.requestedDate,
          scheduledDate: input.scheduledDate,
          scheduledEndTime: input.scheduledEndTime,
          scheduledStartTime: input.scheduledStartTime,
          status: nextStatus,
        },
        where: {
          id: requestId,
        },
      });

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: "Solicitud actualizada.",
          toStatus: nextStatus,
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async scheduleMeasurementRequest(
    requestId: string,
    input: ScheduleMeasurementRequestInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);

    const nextStatus: MeasurementRequestStatus =
      request.scheduledDate || request.status === "RESCHEDULED"
        ? "RESCHEDULED"
        : "SCHEDULED";

    await prisma.$transaction(async (db) => {
      await db.measurementRequest.update({
        data: {
          assignedTechnicianId: input.assignedTechnicianId,
          scheduledDate: input.scheduledDate,
          scheduledEndTime: input.scheduledEndTime,
          scheduledStartTime: input.scheduledStartTime,
          status: nextStatus,
        },
        where: {
          id: requestId,
        },
      });

      const latestVisit = await db.measurementVisit.findFirst({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        where: {
          measurementRequestId: requestId,
        },
      });

      if (
        !latestVisit ||
        latestVisit.status === "COMPLETED" ||
        latestVisit.status === "CANCELLED"
      ) {
        await createScheduledVisit(
          {
            measurementRequestId: requestId,
            technicianId: input.assignedTechnicianId,
          },
          db,
        );
      } else {
        await db.measurementVisit.update({
          data: {
            status: "SCHEDULED",
            technicianId: input.assignedTechnicianId,
          },
          where: {
            id: latestVisit.id,
          },
        });
      }

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: input.notes || "Visita tecnica programada.",
          toStatus: nextStatus,
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async reprogramMeasurementRequest(
    requestId: string,
    input: ReprogramMeasurementRequestInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);

    await prisma.$transaction(async (db) => {
      await db.measurementRequest.update({
        data: {
          assignedTechnicianId: input.assignedTechnicianId,
          scheduledDate: input.scheduledDate,
          scheduledEndTime: input.scheduledEndTime,
          scheduledStartTime: input.scheduledStartTime,
          status: "RESCHEDULED",
        },
        where: {
          id: requestId,
        },
      });

      await createScheduledVisit(
        {
          measurementRequestId: requestId,
          technicianId: input.assignedTechnicianId,
        },
        db,
      );

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: input.reason,
          toStatus: "RESCHEDULED",
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async cancelMeasurementRequest(
    requestId: string,
    input: CancelMeasurementRequestInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);

    if (request.status === "CANCELLED") {
      return this.getMeasurementRequestById(requestId);
    }

    await prisma.$transaction(async (db) => {
      await db.measurementRequest.update({
        data: {
          status: "CANCELLED",
        },
        where: {
          id: requestId,
        },
      });

      await db.measurementVisit.updateMany({
        data: {
          status: "CANCELLED",
        },
        where: {
          measurementRequestId: requestId,
          status: {
            not: "COMPLETED",
          },
        },
      });

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: input.notes || "Solicitud cancelada.",
          toStatus: "CANCELLED",
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async startMeasurementVisit(
    requestId: string,
    input: StartMeasurementVisitInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);

    if (!request.scheduledDate) {
      throw new AppError("Debes programar la visita antes de iniciarla.", 400);
    }

    await prisma.$transaction(async (db) => {
      const latestVisit = await db.measurementVisit.findFirst({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        where: {
          measurementRequestId: requestId,
        },
      });

      const visitId =
        latestVisit?.id ??
        (
          await createScheduledVisit(
            {
              measurementRequestId: requestId,
              technicianId: request.assignedTechnicianId,
            },
            db,
          )
        ).id;

      await db.measurementVisit.update({
        data: {
          generalObservations: input.generalObservations,
          locationConfirmed: input.locationConfirmed,
          startedAt: new Date(),
          status: "IN_PROGRESS",
          technicianId: request.assignedTechnicianId ?? userId,
        },
        where: {
          id: visitId,
        },
      });

      await db.measurementRequest.update({
        data: {
          status: "IN_VISIT",
        },
        where: {
          id: requestId,
        },
      });

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: "Visita tecnica iniciada.",
          toStatus: "IN_VISIT",
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async createMeasurementOpening(
    requestId: string,
    input: CreateMeasurementOpeningInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);

    await prisma.$transaction(async (db) => {
      const latestVisit = await getLatestVisit(requestId, db);

      if (!latestVisit) {
        throw new AppError(
          "Debes iniciar o programar una visita tecnica antes de registrar medidas.",
          400,
        );
      }

      const openingCount = await db.measurementOpening.count({
        where: {
          measurementVisitId: latestVisit.id,
        },
      });

      await db.measurementOpening.create({
        data: {
          code:
            input.code ??
            `${request.code}-AB-${String(openingCount + 1).padStart(2, "0")}`,
          depthMm: input.depthMm,
          elementType: input.elementType,
          environment: input.environment,
          heightMm: input.heightMm,
          measurementVisitId: latestVisit.id,
          observations: input.observations,
          quantity: input.quantity,
          requiresCorrection: input.requiresCorrection,
          status: input.status,
          widthMm: input.widthMm,
        },
      });

      const nextStatus =
        input.requiresCorrection || request.status === "WITH_OBSERVATIONS"
          ? "WITH_OBSERVATIONS"
          : "REGISTERED";

      await db.measurementRequest.update({
        data: {
          status: nextStatus,
        },
        where: {
          id: requestId,
        },
      });

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: "Medicion registrada en obra.",
          toStatus: nextStatus,
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async updateMeasurementOpening(
    openingId: string,
    input: UpdateMeasurementOpeningInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const opening = await prisma.measurementOpening.findFirst({
      include: {
        measurementVisit: {
          select: {
            measurementRequestId: true,
          },
        },
      },
      where: {
        id: openingId,
      },
    });

    if (!opening) {
      throw new AppError("La abertura no existe.", 404);
    }

    const request = await assertMeasurementRequestHeaderExists(
      opening.measurementVisit.measurementRequestId,
      prisma,
    );
    assertRequestIsMutable(request.status);

    await prisma.$transaction(async (db) => {
      await db.measurementOpening.update({
        data: {
          code: input.code ?? opening.code,
          depthMm: input.depthMm,
          elementType: input.elementType,
          environment: input.environment,
          heightMm: input.heightMm,
          observations: input.observations,
          quantity: input.quantity,
          requiresCorrection: input.requiresCorrection,
          status: input.status,
          widthMm: input.widthMm,
        },
        where: {
          id: openingId,
        },
      });

      await syncEditableRequestStatus(
        opening.measurementVisit.measurementRequestId,
        userId,
        db,
      );
    });

    return this.getMeasurementRequestById(opening.measurementVisit.measurementRequestId);
  },

  async duplicateMeasurementOpening(
    openingId: string,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const opening = await prisma.measurementOpening.findFirst({
      include: {
        measurementVisit: {
          select: {
            measurementRequestId: true,
          },
        },
      },
      where: {
        id: openingId,
      },
    });

    if (!opening) {
      throw new AppError("La abertura no existe.", 404);
    }

    const request = await assertMeasurementRequestHeaderExists(
      opening.measurementVisit.measurementRequestId,
      prisma,
    );
    assertRequestIsMutable(request.status);

    await prisma.measurementOpening.create({
      data: {
        code: `${opening.code}-COPIA`,
        depthMm: opening.depthMm,
        elementType: opening.elementType,
        environment: opening.environment,
        heightMm: opening.heightMm,
        measurementVisitId: opening.measurementVisitId,
        observations: opening.observations,
        quantity: opening.quantity,
        requiresCorrection: opening.requiresCorrection,
        status: opening.status,
        widthMm: opening.widthMm,
      },
    });

    await prisma.$transaction(async (db) => {
      await syncEditableRequestStatus(
        opening.measurementVisit.measurementRequestId,
        userId,
        db,
      );
    });

    return this.getMeasurementRequestById(opening.measurementVisit.measurementRequestId);
  },

  async uploadMeasurementEvidence(
    requestId: string,
    metadata: MeasurementEvidenceMetadataInput,
    file: UploadFile,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);

    const latestVisit = await getLatestVisit(requestId, prisma);

    if (!latestVisit) {
      throw new AppError("No existe una visita tecnica activa para adjuntar evidencia.", 400);
    }

    if (metadata.measurementOpeningId) {
      const opening = latestVisit.openings.find(
        (entry) => entry.id === metadata.measurementOpeningId,
      );

      if (!opening) {
        throw new AppError("La abertura seleccionada no pertenece a la visita activa.", 400);
      }
    }

    const extension = path.extname(file.originalName) || ".bin";
    const fileName = `${randomUUID()}${extension}`;
    const filePath = path.join(measurementEvidenceUploadsDir, fileName);

    try {
      await writeFile(filePath, file.buffer);
    } catch (error) {
      throw new AppError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la evidencia de medicion.",
        500,
      );
    }

    try {
      await prisma.measurementEvidence.create({
        data: {
          description: metadata.description,
          fileName: file.originalName,
          fileUrl: buildMeasurementEvidenceUrl(fileName),
          measurementOpeningId: metadata.measurementOpeningId,
          measurementVisitId: latestVisit.id,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          type: metadata.type,
          uploadedByUserId: userId,
        },
      });
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw error;
    }

    return this.getMeasurementRequestById(requestId);
  },

  async createTechnicalObservation(
    requestId: string,
    input: CreateTechnicalObservationInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);

    const latestVisit = await getLatestVisit(requestId, prisma);

    if (!latestVisit) {
      throw new AppError("Debes iniciar una visita tecnica antes de registrar observaciones.", 400);
    }

    await prisma.$transaction(async (db) => {
      await db.technicalObservation.create({
        data: {
          createdByUserId: userId,
          description: input.description,
          measurementVisitId: latestVisit.id,
          severity: input.severity,
          status: input.status,
          type: input.type,
        },
      });

      await db.measurementRequest.update({
        data: {
          status: "WITH_OBSERVATIONS",
        },
        where: {
          id: requestId,
        },
      });

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: "Se registraron observaciones tecnicas.",
          toStatus: "WITH_OBSERVATIONS",
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async resolveTechnicalObservation(
    observationId: string,
    input: ResolveTechnicalObservationInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const observation = await prisma.technicalObservation.findFirst({
      include: {
        measurementVisit: {
          select: {
            measurementRequestId: true,
          },
        },
      },
      where: {
        id: observationId,
      },
    });

    if (!observation) {
      throw new AppError("La observacion tecnica no existe.", 404);
    }

    await prisma.$transaction(async (db) => {
      await db.technicalObservation.update({
        data: {
          resolvedAt:
            input.status === "RESOLVED" || input.status === "REJECTED" ? new Date() : null,
          resolvedByUserId:
            input.status === "RESOLVED" || input.status === "REJECTED" ? userId : null,
          status: input.status,
        },
        where: {
          id: observationId,
        },
      });

      await syncEditableRequestStatus(
        observation.measurementVisit.measurementRequestId,
        userId,
        db,
      );
    });

    return this.getMeasurementRequestById(observation.measurementVisit.measurementRequestId);
  },

  async submitMeasurementForApproval(
    requestId: string,
    input: SubmitMeasurementApprovalInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);
    assertRequestIsMutable(request.status);
    const detail = await assertMeasurementRequestExists(requestId, prisma);

    const openingCount = detail.technicalVisits.reduce(
      (sum, visit) => sum + visit.openings.length,
      0,
    );

    if (openingCount === 0) {
      throw new AppError("No puedes enviar a aprobacion una solicitud sin medidas registradas.", 400);
    }

    const openObservationCount = detail.technicalVisits.reduce(
      (sum, visit) =>
        sum +
        visit.observations.filter(
          (entry) => entry.status === "OPEN" || entry.status === "IN_PROGRESS",
        ).length,
      0,
    );

    const nextStatus: MeasurementRequestStatus =
      input.result === "REQUIRES_REVISIT" || openObservationCount > 0
        ? "WITH_OBSERVATIONS"
        : "PENDING_APPROVAL";

    await prisma.$transaction(async (db) => {
      const latestVisit = await db.measurementVisit.findFirst({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        where: {
          measurementRequestId: requestId,
        },
      });

      if (latestVisit) {
        await db.measurementVisit.update({
          data: {
            finishedAt: new Date(),
            result: input.result,
            status: "COMPLETED",
          },
          where: {
            id: latestVisit.id,
          },
        });
      }

      await db.measurementRequest.update({
        data: {
          status: nextStatus,
        },
        where: {
          id: requestId,
        },
      });

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: input.notes || "Solicitud enviada a revision.",
          toStatus: nextStatus,
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async approveMeasurementRequest(
    requestId: string,
    input: MeasurementDecisionInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);

    if (request.status === "APPROVED") {
      return this.getMeasurementRequestById(requestId);
    }

    await prisma.$transaction(async (db) => {
      await db.measurementRequest.update({
        data: {
          approvedAt: new Date(),
          approvedByUserId: userId,
          status: "APPROVED",
        },
        where: {
          id: requestId,
        },
      });

      const latestVisit = await db.measurementVisit.findFirst({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        where: {
          measurementRequestId: requestId,
        },
      });

      if (latestVisit) {
        await db.measurementVisit.update({
          data: {
            finishedAt: latestVisit.finishedAt ?? new Date(),
            result: "APPROVED",
            status: "COMPLETED",
          },
          where: {
            id: latestVisit.id,
          },
        });
      }

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: input.notes || "Medicion aprobada.",
          toStatus: "APPROVED",
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async rejectMeasurementRequest(
    requestId: string,
    input: MeasurementDecisionInput,
    userId: string | null,
  ): Promise<MeasurementRequestDetailRecord> {
    const request = await assertMeasurementRequestHeaderExists(requestId, prisma);

    await prisma.$transaction(async (db) => {
      await db.measurementRequest.update({
        data: {
          approvedAt: null,
          approvedByUserId: null,
          rejectedAt: new Date(),
          status: "REJECTED",
        },
        where: {
          id: requestId,
        },
      });

      const latestVisit = await db.measurementVisit.findFirst({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        where: {
          measurementRequestId: requestId,
        },
      });

      if (latestVisit) {
        await db.measurementVisit.update({
          data: {
            finishedAt: latestVisit.finishedAt ?? new Date(),
            result: "REJECTED",
            status: "COMPLETED",
          },
          where: {
            id: latestVisit.id,
          },
        });
      }

      await createMeasurementStatusHistory(
        {
          changedByUserId: userId,
          fromStatus: request.status,
          measurementRequestId: requestId,
          notes: input.notes || "Medicion rechazada.",
          toStatus: "REJECTED",
        },
        db,
      );
    });

    return this.getMeasurementRequestById(requestId);
  },

  async createQuotationFromMeasurement(
    requestId: string,
    userId: string | null,
  ): Promise<{
    code: string;
    id: string;
    status: string;
  }> {
    const request = await assertMeasurementRequestExists(requestId, prisma);

    if (request.status !== "APPROVED") {
      throw new AppError(
        "Solo puedes crear cotizaciones desde mediciones aprobadas.",
        400,
      );
    }

    const existingQuotation = request.quotations[0];

    if (existingQuotation) {
      return {
        code: existingQuotation.code,
        id: existingQuotation.id,
        status: existingQuotation.status,
      };
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        return await prisma.$transaction(async (db) => {
          const code = await generateQuotationCode(db);

          const quotation = await db.quotation.create({
            data: {
              clientId: request.clientId,
              code,
              createdByUserId: userId,
              currency: "BOB",
              discountAmount: 0,
              internalNotes: `Cotizacion creada desde la solicitud de medicion ${request.code}.`,
              measurementRequestId: request.id,
              notes: `Medicion aprobada ${request.code}.`,
              projectId: request.projectId,
              taxAmount: 0,
            },
            select: {
              code: true,
              id: true,
              status: true,
            },
          });

          await db.quotationStatusHistory.create({
            data: {
              changedByUserId: userId,
              fromStatus: null,
              notes: `Cotizacion creada desde medicion ${request.code}.`,
              quotationId: quotation.id,
              toStatus: "DRAFT",
            },
          });

          return quotation;
        });
      } catch (error) {
        if (
          error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new AppError("No se pudo generar la cotizacion desde la medicion.", 500);
  },
};
