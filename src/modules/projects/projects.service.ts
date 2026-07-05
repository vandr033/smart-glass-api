import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "../../../generated/prisma/client.js";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";

import { auditLogService } from "../../services/audit-log-service.js";
import { buildDateRangeFilter, toLogJsonValue } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import {
  buildProjectAttachmentUrl,
  projectAttachmentUploadsDir,
} from "../../utils/uploads.js";
import { getClientDisplayName } from "../clients/clients.service.js";
import {
  ACTIVE_PROJECT_STATUSES,
  PROJECT_ATTACHMENT_ENTITY_TYPE,
  PROJECT_ENTITY_TYPE,
  PROJECT_MEASUREMENT_ENTITY_TYPE,
  PROJECT_NOTE_ENTITY_TYPE,
  PROJECT_STATUSES,
  PROJECT_STATUS_HISTORY_ENTITY_TYPE,
} from "./projects.constants.js";
import type {
  CreateProjectAttachmentInput,
  CreateProjectInput,
  CreateProjectMeasurementInput,
  CreateProjectNoteInput,
  ListProjectsQuery,
  ProjectAttachmentRecord,
  ProjectDashboardSummaryRecord,
  ProjectDetailRecord,
  ProjectListItem,
  ProjectMeasurementRecord,
  ProjectNoteRecord,
  ProjectStatus,
  ProjectStatusHistoryRecord,
  ProjectSummaryRecord,
  ProjectTransitionResult,
  ProjectUserOption,
  ProjectUserSummary,
  UpdateProjectInput,
  UpdateProjectMeasurementInput,
  UpdateProjectNoteInput,
} from "./projects.types.js";

type UploadFile = {
  buffer: Buffer;
  mimetype: string | null;
  originalName: string;
  size: number;
};

type DbClient = typeof prisma | Prisma.TransactionClient;

type CurrentProjectUser = {
  isSuperAdmin: boolean;
};

type TransitionProjectStatusInput = {
  ipAddress?: string | null | undefined;
  isSuperAdmin?: boolean | undefined;
  metadata?: Record<string, unknown> | null | undefined;
  projectId: string;
  reason?: string | null | undefined;
  toStatus: ProjectStatus;
  userAgent?: string | null | undefined;
  userId?: string | null | undefined;
};

const projectUserSummarySelect = {
  email: true,
  id: true,
  name: true,
} satisfies Prisma.UserSelect;

const projectListInclude = {
  client: {
    select: {
      clientType: true,
      commercialName: true,
      firstName: true,
      id: true,
      lastName: true,
      legalName: true,
    },
  },
  responsibleUser: {
    select: projectUserSummarySelect,
  },
  salesUser: {
    select: projectUserSummarySelect,
  },
} satisfies Prisma.ProjectInclude;

const projectDetailInclude = {
  ...projectListInclude,
  attachments: {
    include: {
      uploadedByUser: {
        select: projectUserSummarySelect,
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
  measurements: {
    include: {
      measuredByUser: {
        select: projectUserSummarySelect,
      },
    },
    orderBy: [
      {
        measurementDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  },
  projectNotes: {
    include: {
      user: {
        select: projectUserSummarySelect,
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
  statusHistory: {
    include: {
      changedByUser: {
        select: projectUserSummarySelect,
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
} satisfies Prisma.ProjectInclude;

type ProjectListEntity = Prisma.ProjectGetPayload<{
  include: typeof projectListInclude;
}>;

type ProjectDetailEntity = Prisma.ProjectGetPayload<{
  include: typeof projectDetailInclude;
}>;

type ProjectStatusHistoryEntity = Prisma.ProjectStatusHistoryGetPayload<{
  include: {
    changedByUser: {
      select: typeof projectUserSummarySelect;
    };
  };
}>;

type ProjectNoteEntity = Prisma.ProjectNoteGetPayload<{
  include: {
    user: {
      select: typeof projectUserSummarySelect;
    };
  };
}>;

type ProjectAttachmentEntity = Prisma.ProjectAttachmentGetPayload<{
  include: {
    uploadedByUser: {
      select: typeof projectUserSummarySelect;
    };
  };
}>;

type ProjectMeasurementEntity = Prisma.ProjectMeasurementGetPayload<{
  include: {
    measuredByUser: {
      select: typeof projectUserSummarySelect;
    };
  };
}>;

const PROJECT_STATUS_SET = new Set(PROJECT_STATUSES);

const decimalToNumber = (
  value: PrismaNamespace.Decimal | number | null,
): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

const toIsoString = (value: Date | null): string | null => {
  return value?.toISOString() ?? null;
};

const mapUserSummary = (
  user:
    | {
        email: string;
        id: string;
        name: string;
      }
    | null,
): ProjectUserSummary => {
  if (!user) {
    return null;
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
};

const mapStatusHistory = (
  record: ProjectStatusHistoryEntity,
): ProjectStatusHistoryRecord => {
  return {
    changedByUser: mapUserSummary(record.changedByUser),
    createdAt: record.createdAt.toISOString(),
    fromStatus: record.fromStatus,
    id: record.id,
    metadataJson: record.metadataJson,
    reason: record.reason,
    toStatus: record.toStatus,
  };
};

const mapProjectNote = (record: ProjectNoteEntity): ProjectNoteRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    note: record.note,
    updatedAt: record.updatedAt.toISOString(),
    user: mapUserSummary(record.user),
    visibility: record.visibility,
  };
};

const mapProjectAttachment = (
  record: ProjectAttachmentEntity,
): ProjectAttachmentRecord => {
  return {
    attachmentType: record.attachmentType,
    createdAt: record.createdAt.toISOString(),
    description: record.description,
    fileName: record.fileName,
    fileUrl: record.fileUrl,
    id: record.id,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes ?? null,
    uploadedByUser: mapUserSummary(record.uploadedByUser),
  };
};

const mapProjectMeasurement = (
  record: ProjectMeasurementEntity,
): ProjectMeasurementRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    depthMm: decimalToNumber(record.depthMm),
    heightMm: decimalToNumber(record.heightMm),
    id: record.id,
    locationDescription: record.locationDescription,
    measuredByUser: mapUserSummary(record.measuredByUser),
    measurementDate: toIsoString(record.measurementDate),
    notes: record.notes,
    quantity: record.quantity,
    rawJson: record.rawJson,
    updatedAt: record.updatedAt.toISOString(),
    widthMm: decimalToNumber(record.widthMm),
  };
};

const mapProjectListItem = (record: ProjectListEntity): ProjectListItem => {
  return {
    client: {
      clientType: record.client.clientType,
      displayName: getClientDisplayName(record.client),
      id: record.client.id,
    },
    code: record.code,
    createdAt: record.createdAt.toISOString(),
    expectedDeliveryDate: toIsoString(record.expectedDeliveryDate),
    expectedInstallationDate: toIsoString(record.expectedInstallationDate),
    expectedMeasurementDate: toIsoString(record.expectedMeasurementDate),
    id: record.id,
    priority: record.priority,
    projectType: record.projectType,
    responsibleUser: mapUserSummary(record.responsibleUser),
    salesUser: mapUserSummary(record.salesUser),
    siteAddress: record.siteAddress,
    status: record.status,
    title: record.title,
    updatedAt: record.updatedAt.toISOString(),
  };
};

const mapProjectDetail = (
  record: ProjectDetailEntity,
  summary: ProjectSummaryRecord,
): ProjectDetailRecord => {
  return {
    ...mapProjectListItem(record),
    attachments: record.attachments.map(mapProjectAttachment),
    availableTransitions: summary.allowedTransitions,
    city: record.city,
    deletedAt: toIsoString(record.deletedAt),
    description: record.description,
    latitude: decimalToNumber(record.latitude),
    longitude: decimalToNumber(record.longitude),
    measurements: record.measurements.map(mapProjectMeasurement),
    notes: record.notes,
    projectNotes: record.projectNotes.map(mapProjectNote),
    statusHistory: record.statusHistory.map(mapStatusHistory),
    summary,
  };
};

const buildProjectOrderBy = (
  sortBy: ListProjectsQuery["sortBy"],
  sortDirection: ListProjectsQuery["sortDirection"],
): Prisma.ProjectOrderByWithRelationInput => {
  switch (sortBy) {
    case "createdAt":
      return {
        createdAt: sortDirection,
      };
    case "expectedDeliveryDate":
      return {
        expectedDeliveryDate: sortDirection,
      };
    case "priority":
      return {
        priority: sortDirection,
      };
    case "status":
      return {
        status: sortDirection,
      };
  }
};

const buildProjectWhereClause = (
  query: ListProjectsQuery,
): Prisma.ProjectWhereInput => {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo);

  return {
    deletedAt: null,
    ...(query.clientId
      ? {
          clientId: query.clientId,
        }
      : {}),
    ...(query.priority
      ? {
          priority: query.priority,
        }
      : {}),
    ...(query.projectType
      ? {
          projectType: query.projectType,
        }
      : {}),
    ...(query.responsibleUserId
      ? {
          responsibleUserId: query.responsibleUserId,
        }
      : {}),
    ...(query.salesUserId
      ? {
          salesUserId: query.salesUserId,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
    ...(createdAt
      ? {
          createdAt,
        }
      : {}),
    ...(query.search.length > 0
      ? {
          OR: [
            {
              code: {
                contains: query.search,
              },
            },
            {
              title: {
                contains: query.search,
              },
            },
            {
              siteAddress: {
                contains: query.search,
              },
            },
            {
              client: {
                commercialName: {
                  contains: query.search,
                },
              },
            },
            {
              client: {
                legalName: {
                  contains: query.search,
                },
              },
            },
            {
              client: {
                firstName: {
                  contains: query.search,
                },
              },
            },
            {
              client: {
                lastName: {
                  contains: query.search,
                },
              },
            },
          ],
        }
      : {}),
  };
};

const getProjectCreateMutationData = (
  input: CreateProjectInput,
  code: string,
): Prisma.ProjectUncheckedCreateInput => {
  return {
    city: input.city,
    clientId: input.clientId,
    code,
    description: input.description,
    expectedDeliveryDate: input.expectedDeliveryDate,
    expectedInstallationDate: input.expectedInstallationDate,
    expectedMeasurementDate: input.expectedMeasurementDate,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: input.notes,
    priority: input.priority,
    projectType: input.projectType,
    responsibleUserId: input.responsibleUserId,
    salesUserId: input.salesUserId,
    siteAddress: input.siteAddress,
    status: input.status,
    title: input.title,
  };
};

const getProjectUpdateMutationData = (
  input: UpdateProjectInput,
): Prisma.ProjectUncheckedUpdateInput => {
  return {
    city: input.city,
    clientId: input.clientId,
    description: input.description,
    expectedDeliveryDate: input.expectedDeliveryDate,
    expectedInstallationDate: input.expectedInstallationDate,
    expectedMeasurementDate: input.expectedMeasurementDate,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: input.notes,
    priority: input.priority,
    projectType: input.projectType,
    responsibleUserId: input.responsibleUserId,
    salesUserId: input.salesUserId,
    siteAddress: input.siteAddress,
    title: input.title,
  };
};

const translateUniqueConstraintError = (
  error: unknown,
  labelsByField: Record<string, string>,
): never => {
  if (
    error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target)
      ? String(error.meta?.target[0] ?? "")
      : "";
    const label = labelsByField[target] ?? "record";

    throw new AppError(`A ${label} with the same value already exists.`, 409);
  }

  throw error;
};

const isProjectCodeUniqueError = (error: unknown): boolean => {
  if (
    !(error instanceof PrismaNamespace.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  if (!Array.isArray(error.meta?.target)) {
    return false;
  }

  return error.meta.target.includes("code");
};

const sanitizeFileName = (value: string): string => {
  const parsedFileName = path.basename(value).trim();

  return parsedFileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
};

const buildProjectAttachmentStoredFileName = (originalName: string): string => {
  const sanitizedName = sanitizeFileName(originalName);
  const extension = path.extname(sanitizedName).toLowerCase() || ".bin";
  return `project-attachment-${Date.now()}-${randomUUID()}${extension}`;
};

const removeLocalProjectAttachmentIfPresent = async (
  fileUrl: string | null | undefined,
): Promise<void> => {
  if (!fileUrl) {
    return;
  }

  const marker = "/uploads/project-attachments/";
  const markerIndex = fileUrl.indexOf(marker);

  if (markerIndex === -1) {
    return;
  }

  const fileName = fileUrl.slice(markerIndex + marker.length);

  if (!fileName) {
    return;
  }

  try {
    await unlink(path.join(projectAttachmentUploadsDir, fileName));
  } catch {
    // Ignore missing files so attachment deletion remains resilient.
  }
};

const findProjectDetailOrThrow = async (
  id: string,
  db: DbClient = prisma,
): Promise<ProjectDetailEntity> => {
  const project = await db.project.findFirst({
    include: projectDetailInclude,
    where: {
      deletedAt: null,
      id,
    },
  });

  if (!project) {
    throw new AppError("Project not found.", 404);
  }

  return project;
};

const findProjectNoteOrThrow = async (
  projectId: string,
  noteId: string,
  db: DbClient = prisma,
): Promise<ProjectNoteEntity> => {
  const note = await db.projectNote.findFirst({
    include: {
      user: {
        select: projectUserSummarySelect,
      },
    },
    where: {
      id: noteId,
      projectId,
    },
  });

  if (!note) {
    throw new AppError("Project note not found.", 404);
  }

  return note;
};

const findProjectAttachmentOrThrow = async (
  projectId: string,
  attachmentId: string,
  db: DbClient = prisma,
): Promise<ProjectAttachmentEntity> => {
  const attachment = await db.projectAttachment.findFirst({
    include: {
      uploadedByUser: {
        select: projectUserSummarySelect,
      },
    },
    where: {
      id: attachmentId,
      projectId,
    },
  });

  if (!attachment) {
    throw new AppError("Project attachment not found.", 404);
  }

  return attachment;
};

const findProjectMeasurementOrThrow = async (
  projectId: string,
  measurementId: string,
  db: DbClient = prisma,
): Promise<ProjectMeasurementEntity> => {
  const measurement = await db.projectMeasurement.findFirst({
    include: {
      measuredByUser: {
        select: projectUserSummarySelect,
      },
    },
    where: {
      id: measurementId,
      projectId,
    },
  });

  if (!measurement) {
    throw new AppError("Project measurement not found.", 404);
  }

  return measurement;
};

const ensureClientExists = async (
  clientId: string,
  db: DbClient,
): Promise<void> => {
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
    throw new AppError("Client not found.", 400);
  }
};

const ensureUserIdsExist = async (
  userIds: Array<string | null>,
  db: DbClient,
): Promise<void> => {
  const normalizedUserIds = Array.from(
    new Set(userIds.filter((userId): userId is string => Boolean(userId))),
  );

  if (normalizedUserIds.length === 0) {
    return;
  }

  const total = await db.user.count({
    where: {
      deletedAt: null,
      id: {
        in: normalizedUserIds,
      },
    },
  });

  if (total !== normalizedUserIds.length) {
    throw new AppError("One or more selected users do not exist.", 400);
  }
};

const extractPreviousActiveStatus = (value: unknown): ProjectStatus | null => {
  if (
    !value ||
    typeof value !== "object" ||
    !("previousStatus" in value) ||
    typeof value.previousStatus !== "string"
  ) {
    return null;
  }

  return PROJECT_STATUS_SET.has(value.previousStatus as ProjectStatus)
    ? (value.previousStatus as ProjectStatus)
    : null;
};

const resolveOnHoldPreviousStatus = async (
  projectId: string,
  db: DbClient,
): Promise<ProjectStatus | null> => {
  const latestOnHoldEntry = await db.projectStatusHistory.findFirst({
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    select: {
      metadataJson: true,
    },
    where: {
      projectId,
      toStatus: "ON_HOLD",
    },
  });

  return extractPreviousActiveStatus(latestOnHoldEntry?.metadataJson);
};

export const generateProjectCode = async (
  db: DbClient = prisma,
  value = new Date(),
): Promise<string> => {
  const year = value.getUTCFullYear();
  const prefix = `PRJ-${year}-`;
  const latestProject = await db.project.findFirst({
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
  const latestSequence = latestProject?.code.match(/(\d+)$/)?.[1];
  const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
};

export const getAllowedProjectTransitions = (
  currentStatus: ProjectStatus,
  user?: CurrentProjectUser | null,
  previousActiveStatus?: ProjectStatus | null,
): ProjectStatus[] => {
  if (currentStatus === "COMPLETED" || currentStatus === "CANCELLED") {
    return user?.isSuperAdmin ? [...ACTIVE_PROJECT_STATUSES] : [];
  }

  if (currentStatus === "ON_HOLD") {
    const transitions = [
      ...(previousActiveStatus ? [previousActiveStatus] : []),
      "CANCELLED",
    ] satisfies ProjectStatus[];

    return Array.from(new Set(transitions));
  }

  const transitionsByStatus: Record<ProjectStatus, ProjectStatus[]> = {
    APPROVED: ["PURCHASE_PENDING", "ON_HOLD", "CANCELLED"],
    CANCELLED: [],
    COMPLETED: [],
    IN_INSTALLATION: ["COMPLETED", "ON_HOLD", "CANCELLED"],
    IN_PRODUCTION: ["INSTALLATION_PENDING", "ON_HOLD", "CANCELLED"],
    INSTALLATION_PENDING: ["IN_INSTALLATION", "ON_HOLD", "CANCELLED"],
    LEAD: ["MEASUREMENT_PENDING", "QUOTATION_PENDING", "ON_HOLD", "CANCELLED"],
    MEASUREMENT_PENDING: ["QUOTATION_PENDING", "ON_HOLD", "CANCELLED"],
    ON_HOLD: [],
    PRODUCTION_PENDING: ["IN_PRODUCTION", "ON_HOLD", "CANCELLED"],
    PURCHASE_PENDING: ["PRODUCTION_PENDING", "ON_HOLD", "CANCELLED"],
    QUOTATION_PENDING: ["QUOTED", "ON_HOLD", "CANCELLED"],
    QUOTED: ["APPROVED", "CANCELLED", "ON_HOLD"],
  };

  return transitionsByStatus[currentStatus];
};

export const getProjectSummary = async (
  projectId: string,
  options?: {
    currentStatus?: ProjectStatus;
    db?: DbClient;
    isSuperAdmin?: boolean;
    previousActiveStatus?: ProjectStatus | null;
  },
): Promise<ProjectSummaryRecord> => {
  const db = options?.db ?? prisma;
  const currentStatus =
    options?.currentStatus ??
    (
      await db.project.findFirst({
        select: {
          status: true,
        },
        where: {
          deletedAt: null,
          id: projectId,
        },
      })
    )?.status;

  if (!currentStatus) {
    throw new AppError("Project not found.", 404);
  }

  const previousActiveStatus =
    options?.previousActiveStatus ??
    (currentStatus === "ON_HOLD"
      ? await resolveOnHoldPreviousStatus(projectId, db)
      : null);

  const [attachmentCount, latestHistoryEntry, measurementCount, noteCount, statusHistoryCount] =
    await Promise.all([
      db.projectAttachment.count({
        where: {
          projectId,
        },
      }),
      db.projectStatusHistory.findFirst({
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        select: {
          createdAt: true,
        },
        where: {
          projectId,
        },
      }),
      db.projectMeasurement.count({
        where: {
          projectId,
        },
      }),
      db.projectNote.count({
        where: {
          projectId,
        },
      }),
      db.projectStatusHistory.count({
        where: {
          projectId,
        },
      }),
    ]);

  return {
    allowedTransitions: getAllowedProjectTransitions(
      currentStatus,
      {
        isSuperAdmin: options?.isSuperAdmin ?? false,
      },
      previousActiveStatus,
    ),
    attachmentCount,
    lastStatusChangeAt: latestHistoryEntry?.createdAt.toISOString() ?? null,
    measurementCount,
    noteCount,
    statusHistoryCount,
  };
};

export const transitionProjectStatus = async (
  input: TransitionProjectStatusInput,
): Promise<ProjectTransitionResult> => {
  return prisma.$transaction(async (db) => {
    const project = await db.project.findFirst({
      select: {
        id: true,
        status: true,
      },
      where: {
        deletedAt: null,
        id: input.projectId,
      },
    });

    if (!project) {
      throw new AppError("Project not found.", 404);
    }

    if (project.status === input.toStatus) {
      throw new AppError("Project is already in the requested status.", 400);
    }

    if (
      (input.toStatus === "CANCELLED" || input.toStatus === "ON_HOLD") &&
      !input.reason
    ) {
      throw new AppError(
        "Reason is required when moving a project to cancelled or on hold.",
        400,
      );
    }

    const previousActiveStatus =
      project.status === "ON_HOLD"
        ? await resolveOnHoldPreviousStatus(project.id, db)
        : null;

    const allowedTransitions = getAllowedProjectTransitions(
      project.status,
      {
        isSuperAdmin: input.isSuperAdmin ?? false,
      },
      previousActiveStatus,
    );

    if (!allowedTransitions.includes(input.toStatus)) {
      throw new AppError(
        `Transition from ${project.status} to ${input.toStatus} is not allowed.`,
        400,
      );
    }

    const metadata = {
      ...(input.metadata ?? {}),
      ...(input.toStatus === "ON_HOLD"
        ? {
            previousStatus: project.status,
          }
        : {}),
      ...(project.status === "ON_HOLD" && previousActiveStatus
        ? {
            resumedStatus: previousActiveStatus,
          }
        : {}),
    };
    const serializedMetadata = toLogJsonValue(metadata);

    await db.project.update({
      data: {
        status: input.toStatus,
      },
      where: {
        id: project.id,
      },
    });

    const historyEntry = await db.projectStatusHistory.create({
      data: {
        changedByUserId: input.userId ?? null,
        fromStatus: project.status,
        metadataJson:
          serializedMetadata === null
            ? PrismaNamespace.JsonNull
            : (serializedMetadata as Prisma.InputJsonValue),
        projectId: project.id,
        reason: input.reason ?? null,
        toStatus: input.toStatus,
      },
      include: {
        changedByUser: {
          select: projectUserSummarySelect,
        },
      },
    });

    await auditLogService.create(
      {
        action: "project.status_transitioned",
        actorUserId: input.userId ?? null,
        after: {
          status: input.toStatus,
        },
        before: {
          status: project.status,
        },
        entityId: historyEntry.id,
        entityType: PROJECT_STATUS_HISTORY_ENTITY_TYPE,
        ipAddress: input.ipAddress ?? null,
        metadata: {
          fromStatus: project.status,
          projectId: project.id,
          reason: input.reason ?? null,
          toStatus: input.toStatus,
          ...(metadata ?? {}),
        },
        userAgent: input.userAgent ?? null,
      },
      {
        db,
      },
    );

    return {
      availableTransitions: getAllowedProjectTransitions(
        input.toStatus,
        {
          isSuperAdmin: input.isSuperAdmin ?? false,
        },
        input.toStatus === "ON_HOLD" ? project.status : null,
      ),
      currentStatus: input.toStatus,
      historyEntry: mapStatusHistory(historyEntry),
      projectId: project.id,
    };
  });
};

export const projectsService = {
  async listProjects(query: ListProjectsQuery) {
    const where = buildProjectWhereClause(query);
    const [total, projects] = await prisma.$transaction([
      prisma.project.count({
        where,
      }),
      prisma.project.findMany({
        include: projectListInclude,
        orderBy: buildProjectOrderBy(query.sortBy, query.sortDirection),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    return {
      data: projects.map(mapProjectListItem),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async getProjectById(
    id: string,
    options?: {
      isSuperAdmin?: boolean | undefined;
    },
  ): Promise<ProjectDetailRecord> {
    const project = await findProjectDetailOrThrow(id);
    const previousActiveStatus =
      project.status === "ON_HOLD"
        ? await resolveOnHoldPreviousStatus(project.id, prisma)
        : null;
    const summary = await getProjectSummary(project.id, {
      currentStatus: project.status,
      db: prisma,
      isSuperAdmin: options?.isSuperAdmin ?? false,
      previousActiveStatus,
    });

    return mapProjectDetail(project, summary);
  },

  async createProject(
    input: CreateProjectInput,
    options?: {
      isSuperAdmin?: boolean | undefined;
      userId?: string | null | undefined;
    },
  ): Promise<ProjectDetailRecord> {
    if (input.status === "ON_HOLD" || input.status === "CANCELLED") {
      throw new AppError(
        "Use the transition endpoint to place a project on hold or cancel it.",
        400,
      );
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await prisma.$transaction(async (db) => {
          await ensureClientExists(input.clientId, db);
          await ensureUserIdsExist(
            [input.responsibleUserId, input.salesUserId],
            db,
          );

          const code = await generateProjectCode(db);
          const project = await db.project.create({
            data: getProjectCreateMutationData(input, code),
          });

          await db.projectStatusHistory.create({
            data: {
              changedByUserId: options?.userId ?? null,
              fromStatus: null,
              metadataJson: PrismaNamespace.JsonNull,
              projectId: project.id,
              reason: null,
              toStatus: input.status,
            },
          });

          const createdProject = await findProjectDetailOrThrow(project.id, db);
          const summary = await getProjectSummary(project.id, {
            currentStatus: createdProject.status,
            db,
            isSuperAdmin: options?.isSuperAdmin ?? false,
            previousActiveStatus: null,
          });

          return mapProjectDetail(createdProject, summary);
        });
      } catch (error) {
        if (isProjectCodeUniqueError(error) && attempt < 4) {
          continue;
        }

        translateUniqueConstraintError(error, {
          code: "project code",
        });
      }
    }

    throw new Error("Unexpected project creation state.");
  },

  async updateProject(
    id: string,
    input: UpdateProjectInput,
    options?: {
      isSuperAdmin?: boolean | undefined;
    },
  ): Promise<{
    current: ProjectDetailRecord;
    previous: ProjectDetailRecord;
  }> {
    const previous = await this.getProjectById(id, {
      isSuperAdmin: options?.isSuperAdmin ?? false,
    });

    if (input.status !== previous.status) {
      throw new AppError(
        "Use the transition endpoint to change the project status.",
        400,
      );
    }

    await ensureClientExists(input.clientId, prisma);
    await ensureUserIdsExist([input.responsibleUserId, input.salesUserId], prisma);

    await prisma.project.update({
      data: getProjectUpdateMutationData(input),
      where: {
        id: previous.id,
      },
    });

    const current = await this.getProjectById(id, {
      isSuperAdmin: options?.isSuperAdmin ?? false,
    });

    return {
      current,
      previous,
    };
  },

  async deleteProject(id: string): Promise<ProjectDetailRecord> {
    const existingProject = await this.getProjectById(id, {
      isSuperAdmin: false,
    });

    await prisma.project.update({
      data: {
        deletedAt: new Date(),
      },
      where: {
        id: existingProject.id,
      },
    });

    return existingProject;
  },

  async listProjectStatusHistory(projectId: string): Promise<ProjectStatusHistoryRecord[]> {
    await findProjectDetailOrThrow(projectId);

    const history = await prisma.projectStatusHistory.findMany({
      include: {
        changedByUser: {
          select: projectUserSummarySelect,
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      where: {
        projectId,
      },
    });

    return history.map(mapStatusHistory);
  },

  async listProjectNotes(projectId: string): Promise<ProjectNoteRecord[]> {
    await findProjectDetailOrThrow(projectId);

    const notes = await prisma.projectNote.findMany({
      include: {
        user: {
          select: projectUserSummarySelect,
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      where: {
        projectId,
      },
    });

    return notes.map(mapProjectNote);
  },

  async addProjectNote(
    projectId: string,
    input: CreateProjectNoteInput,
    userId?: string | null,
  ): Promise<ProjectNoteRecord> {
    await findProjectDetailOrThrow(projectId);
    await ensureUserIdsExist([userId ?? null], prisma);

    const note = await prisma.projectNote.create({
      data: {
        note: input.note,
        projectId,
        userId: userId ?? null,
        visibility: input.visibility,
      },
      include: {
        user: {
          select: projectUserSummarySelect,
        },
      },
    });

    return mapProjectNote(note);
  },

  async updateProjectNote(
    projectId: string,
    noteId: string,
    input: UpdateProjectNoteInput,
  ): Promise<{
    current: ProjectNoteRecord;
    previous: ProjectNoteRecord;
  }> {
    await findProjectDetailOrThrow(projectId);
    const existingNote = await findProjectNoteOrThrow(projectId, noteId);

    const updatedNote = await prisma.projectNote.update({
      data: {
        note: input.note,
        visibility: input.visibility,
      },
      include: {
        user: {
          select: projectUserSummarySelect,
        },
      },
      where: {
        id: existingNote.id,
      },
    });

    return {
      current: mapProjectNote(updatedNote),
      previous: mapProjectNote(existingNote),
    };
  },

  async deleteProjectNote(projectId: string, noteId: string): Promise<ProjectNoteRecord> {
    await findProjectDetailOrThrow(projectId);
    const existingNote = await findProjectNoteOrThrow(projectId, noteId);

    await prisma.projectNote.delete({
      where: {
        id: existingNote.id,
      },
    });

    return mapProjectNote(existingNote);
  },

  async listProjectAttachments(projectId: string): Promise<ProjectAttachmentRecord[]> {
    await findProjectDetailOrThrow(projectId);

    const attachments = await prisma.projectAttachment.findMany({
      include: {
        uploadedByUser: {
          select: projectUserSummarySelect,
        },
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      where: {
        projectId,
      },
    });

    return attachments.map(mapProjectAttachment);
  },

  async addProjectAttachment(
    projectId: string,
    input: CreateProjectAttachmentInput,
    file: UploadFile,
    userId?: string | null,
  ): Promise<ProjectAttachmentRecord> {
    await findProjectDetailOrThrow(projectId);
    await ensureUserIdsExist([userId ?? null], prisma);

    const storedFileName = buildProjectAttachmentStoredFileName(file.originalName);
    const storedFilePath = path.join(projectAttachmentUploadsDir, storedFileName);
    const fileUrl = buildProjectAttachmentUrl(storedFileName);

    await writeFile(storedFilePath, file.buffer);

    try {
      const attachment = await prisma.projectAttachment.create({
        data: {
          attachmentType: input.attachmentType,
          description: input.description,
          fileName: file.originalName,
          fileUrl,
          mimeType: file.mimetype,
          projectId,
          sizeBytes: file.size,
          uploadedByUserId: userId ?? null,
        },
        include: {
          uploadedByUser: {
            select: projectUserSummarySelect,
          },
        },
      });

      return mapProjectAttachment(attachment);
    } catch (error) {
      await removeLocalProjectAttachmentIfPresent(fileUrl);
      throw error;
    }
  },

  async deleteProjectAttachment(
    projectId: string,
    attachmentId: string,
  ): Promise<ProjectAttachmentRecord> {
    await findProjectDetailOrThrow(projectId);
    const existingAttachment = await findProjectAttachmentOrThrow(projectId, attachmentId);

    await prisma.projectAttachment.delete({
      where: {
        id: existingAttachment.id,
      },
    });
    await removeLocalProjectAttachmentIfPresent(existingAttachment.fileUrl);

    return mapProjectAttachment(existingAttachment);
  },

  async listProjectMeasurements(projectId: string): Promise<ProjectMeasurementRecord[]> {
    await findProjectDetailOrThrow(projectId);

    const measurements = await prisma.projectMeasurement.findMany({
      include: {
        measuredByUser: {
          select: projectUserSummarySelect,
        },
      },
      orderBy: [
        {
          measurementDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      where: {
        projectId,
      },
    });

    return measurements.map(mapProjectMeasurement);
  },

  async addProjectMeasurement(
    projectId: string,
    input: CreateProjectMeasurementInput,
    userId?: string | null,
  ): Promise<ProjectMeasurementRecord> {
    await findProjectDetailOrThrow(projectId);
    await ensureUserIdsExist([userId ?? null], prisma);

    const measurement = await prisma.projectMeasurement.create({
      data: {
        depthMm: input.depthMm,
        heightMm: input.heightMm,
        locationDescription: input.locationDescription,
        measuredByUserId: userId ?? null,
        measurementDate: input.measurementDate,
        notes: input.notes,
        projectId,
        quantity: input.quantity,
        rawJson:
          input.rawJson === null
            ? PrismaNamespace.JsonNull
            : (input.rawJson as Prisma.InputJsonValue),
        widthMm: input.widthMm,
      },
      include: {
        measuredByUser: {
          select: projectUserSummarySelect,
        },
      },
    });

    return mapProjectMeasurement(measurement);
  },

  async updateProjectMeasurement(
    projectId: string,
    measurementId: string,
    input: UpdateProjectMeasurementInput,
  ): Promise<{
    current: ProjectMeasurementRecord;
    previous: ProjectMeasurementRecord;
  }> {
    await findProjectDetailOrThrow(projectId);
    const existingMeasurement = await findProjectMeasurementOrThrow(
      projectId,
      measurementId,
    );

    const updatedMeasurement = await prisma.projectMeasurement.update({
      data: {
        depthMm: input.depthMm,
        heightMm: input.heightMm,
        locationDescription: input.locationDescription,
        measurementDate: input.measurementDate,
        notes: input.notes,
        quantity: input.quantity,
        rawJson:
          input.rawJson === null
            ? PrismaNamespace.JsonNull
            : (input.rawJson as Prisma.InputJsonValue),
        widthMm: input.widthMm,
      },
      include: {
        measuredByUser: {
          select: projectUserSummarySelect,
        },
      },
      where: {
        id: existingMeasurement.id,
      },
    });

    return {
      current: mapProjectMeasurement(updatedMeasurement),
      previous: mapProjectMeasurement(existingMeasurement),
    };
  },

  async deleteProjectMeasurement(
    projectId: string,
    measurementId: string,
  ): Promise<ProjectMeasurementRecord> {
    await findProjectDetailOrThrow(projectId);
    const existingMeasurement = await findProjectMeasurementOrThrow(
      projectId,
      measurementId,
    );

    await prisma.projectMeasurement.delete({
      where: {
        id: existingMeasurement.id,
      },
    });

    return mapProjectMeasurement(existingMeasurement);
  },

  async getDashboardSummary(): Promise<ProjectDashboardSummaryRecord> {
    const [activeProjects, approvedProjects, pendingInstallationProjects, pendingQuotationProjects, projectsInProduction] =
      await prisma.$transaction([
        prisma.project.count({
          where: {
            deletedAt: null,
            status: {
              notIn: ["CANCELLED", "COMPLETED"],
            },
          },
        }),
        prisma.project.count({
          where: {
            deletedAt: null,
            status: "APPROVED",
          },
        }),
        prisma.project.count({
          where: {
            deletedAt: null,
            status: "INSTALLATION_PENDING",
          },
        }),
        prisma.project.count({
          where: {
            deletedAt: null,
            status: "QUOTATION_PENDING",
          },
        }),
        prisma.project.count({
          where: {
            deletedAt: null,
            status: "IN_PRODUCTION",
          },
        }),
      ]);

    return {
      activeProjects,
      approvedProjects,
      pendingInstallationProjects,
      pendingQuotationProjects,
      projectsInProduction,
    };
  },

  async listProjectUserOptions(): Promise<ProjectUserOption[]> {
    const users = await prisma.user.findMany({
      orderBy: [
        {
          name: "asc",
        },
      ],
      select: {
        email: true,
        id: true,
        name: true,
      },
      where: {
        deletedAt: null,
        isActive: true,
      },
    });

    return users.map((user) => ({
      email: user.email,
      id: user.id,
      name: user.name,
    }));
  },
};

export const PROJECT_ENTITY_TYPES = {
  attachment: PROJECT_ATTACHMENT_ENTITY_TYPE,
  measurement: PROJECT_MEASUREMENT_ENTITY_TYPE,
  note: PROJECT_NOTE_ENTITY_TYPE,
  project: PROJECT_ENTITY_TYPE,
  statusHistory: PROJECT_STATUS_HISTORY_ENTITY_TYPE,
} as const;
