import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "../../../generated/prisma/client.js";
import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";

import { buildDateRangeFilter } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import {
  buildInstallationEvidenceUrl,
  installationEvidenceUploadsDir,
} from "../../utils/uploads.js";
import { getClientDisplayName } from "../clients/clients.service.js";
import type {
  ChangeInstallationStatusInput,
  CreateInstallationIssueInput,
  CreateInstallationOrderInput,
  InstallationCalendarQuery,
  InstallationEvidenceMetadataInput,
  InstallationIssueStatus,
  InstallationOrderStatus,
  InstallationPriority,
  InstallationTaskStatus,
  InstallationTeamMutationInput,
  ListInstallationOrdersQuery,
  RescheduleInstallationOrderInput,
  ResolveInstallationIssueInput,
  UpdateInstallationOrderInput,
  UpdateInstallationTaskInput,
} from "./installation.types.js";
import {
  INSTALLATION_DEFAULT_TASK_TEMPLATES,
  INSTALLATION_ENTITY_TYPES,
  INSTALLATION_ORDER_ACTIVE_STATUSES,
  INSTALLATION_STATUS_TRANSITIONS,
} from "./installation.constants.js";

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
  billingAddress: true,
  city: true,
  clientType: true,
  commercialName: true,
  firstName: true,
  id: true,
  lastName: true,
  legalName: true,
} satisfies Prisma.ClientSelect;

const clientAddressSummarySelect = {
  address: true,
  city: true,
  id: true,
  label: true,
  latitude: true,
  longitude: true,
} satisfies Prisma.ClientAddressSelect;

const projectSummarySelect = {
  city: true,
  code: true,
  id: true,
  latitude: true,
  longitude: true,
  siteAddress: true,
  status: true,
  title: true,
} satisfies Prisma.ProjectSelect;

const quotationSummarySelect = {
  code: true,
  id: true,
  status: true,
} satisfies Prisma.QuotationSelect;

const teamMemberInclude = {
  user: {
    select: userSummarySelect,
  },
} satisfies Prisma.InstallationTeamMemberInclude;

const teamInclude = {
  members: {
    include: teamMemberInclude,
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  },
  supervisor: {
    select: userSummarySelect,
  },
} satisfies Prisma.InstallationTeamInclude;

const taskInclude = {
  completedByUser: {
    select: userSummarySelect,
  },
} satisfies Prisma.InstallationTaskInclude;

const evidenceInclude = {
  task: {
    select: {
      id: true,
      title: true,
    },
  },
  uploadedByUser: {
    select: userSummarySelect,
  },
} satisfies Prisma.InstallationEvidenceInclude;

const issueInclude = {
  reportedByUser: {
    select: userSummarySelect,
  },
  resolvedByUser: {
    select: userSummarySelect,
  },
} satisfies Prisma.InstallationIssueInclude;

const statusHistoryInclude = {
  changedByUser: {
    select: userSummarySelect,
  },
} satisfies Prisma.InstallationStatusHistoryInclude;

const installationOrderListInclude = {
  address: {
    select: clientAddressSummarySelect,
  },
  assignedSupervisor: {
    select: userSummarySelect,
  },
  assignedTeam: {
    include: teamInclude,
  },
  client: {
    select: clientSummarySelect,
  },
  evidence: {
    select: {
      id: true,
    },
  },
  issues: {
    select: {
      id: true,
      status: true,
    },
  },
  project: {
    select: projectSummarySelect,
  },
  quotation: {
    select: quotationSummarySelect,
  },
  tasks: {
    select: {
      status: true,
    },
  },
} satisfies Prisma.InstallationOrderInclude;

const installationOrderDetailInclude = {
  ...installationOrderListInclude,
  createdByUser: {
    select: userSummarySelect,
  },
  evidence: {
    include: evidenceInclude,
    orderBy: [
      {
        uploadedAt: "desc",
      },
    ],
  },
  issues: {
    include: issueInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
  statusHistory: {
    include: statusHistoryInclude,
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  },
  tasks: {
    include: taskInclude,
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  },
} satisfies Prisma.InstallationOrderInclude;

type InstallationOrderListEntity = Prisma.InstallationOrderGetPayload<{
  include: typeof installationOrderListInclude;
}>;

type InstallationOrderDetailEntity = Prisma.InstallationOrderGetPayload<{
  include: typeof installationOrderDetailInclude;
}>;

type InstallationTaskEntity = Prisma.InstallationTaskGetPayload<{
  include: typeof taskInclude;
}>;

type InstallationTeamEntity = Prisma.InstallationTeamGetPayload<{
  include: typeof teamInclude;
}>;

type InstallationIssueEntity = Prisma.InstallationIssueGetPayload<{
  include: typeof issueInclude;
}>;

type InstallationEvidenceEntity = Prisma.InstallationEvidenceGetPayload<{
  include: typeof evidenceInclude;
}>;

type InstallationStatusHistoryEntity = Prisma.InstallationStatusHistoryGetPayload<{
  include: typeof statusHistoryInclude;
}>;

type OrderHeader = {
  addressId: string | null;
  assignedSupervisorId: string | null;
  assignedTeamId: string | null;
  clientId: string;
  code: string;
  id: string;
  projectId: string | null;
  quotationId: string | null;
  scheduledDate: Date;
  scheduledEndTime: string | null;
  scheduledStartTime: string | null;
  status: InstallationOrderStatus;
};

type InstallationReadinessSummary = {
  activeReservationCount: number;
  productionCompletedCount: number;
  productionPendingCount: number;
  productionReady: boolean;
  readyReservationCount: number;
  reservationsReady: boolean;
  warnings: string[];
};

const installationActiveStatusSet = new Set<string>(INSTALLATION_ORDER_ACTIVE_STATUSES);

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
) => {
  if (!user) {
    return null;
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
};

const mapTeamMember = (member: InstallationTeamEntity["members"][number]) => ({
  active: member.active,
  id: member.id,
  role: member.role,
  user: mapUserSummary(member.user),
});

const mapTeam = (team: InstallationTeamEntity | null) => {
  if (!team) {
    return null;
  }

  return {
    id: team.id,
    members: team.members.map(mapTeamMember),
    name: team.name,
    notes: team.notes,
    status: team.status,
    supervisor: mapUserSummary(team.supervisor),
    updatedAt: team.updatedAt.toISOString(),
  };
};

const mapTask = (task: InstallationTaskEntity) => ({
  completedAt: toIsoString(task.completedAt),
  completedByUser: mapUserSummary(task.completedByUser),
  createdAt: task.createdAt.toISOString(),
  description: task.description,
  estimatedMinutes: task.estimatedMinutes,
  id: task.id,
  installationOrderId: task.installationOrderId,
  sortOrder: task.sortOrder,
  status: task.status,
  title: task.title,
  updatedAt: task.updatedAt.toISOString(),
});

const mapEvidence = (evidence: InstallationEvidenceEntity) => ({
  description: evidence.description,
  fileName: evidence.fileName,
  fileUrl: evidence.fileUrl,
  id: evidence.id,
  mimeType: evidence.mimeType,
  sizeBytes: evidence.sizeBytes ?? null,
  task: evidence.task,
  taskId: evidence.taskId,
  type: evidence.type,
  uploadedAt: evidence.uploadedAt.toISOString(),
  uploadedByUser: mapUserSummary(evidence.uploadedByUser),
});

const mapIssue = (issue: InstallationIssueEntity) => ({
  createdAt: issue.createdAt.toISOString(),
  description: issue.description,
  id: issue.id,
  installationOrderId: issue.installationOrderId,
  reportedByUser: mapUserSummary(issue.reportedByUser),
  resolvedAt: toIsoString(issue.resolvedAt),
  resolvedByUser: mapUserSummary(issue.resolvedByUser),
  severity: issue.severity,
  status: issue.status,
  type: issue.type,
  updatedAt: issue.updatedAt.toISOString(),
});

const mapStatusHistory = (entry: InstallationStatusHistoryEntity) => ({
  changedByUser: mapUserSummary(entry.changedByUser),
  createdAt: entry.createdAt.toISOString(),
  fromStatus: entry.fromStatus,
  id: entry.id,
  metadataJson: entry.metadataJson,
  notes: entry.notes,
  toStatus: entry.toStatus,
});

const buildAddressSummary = (
  order: Pick<InstallationOrderListEntity, "address" | "client" | "project">,
) => {
  if (order.address) {
    return {
      address: order.address.address,
      city: order.address.city,
      id: order.address.id,
      label: order.address.label,
      latitude: decimalToNumber(order.address.latitude),
      longitude: decimalToNumber(order.address.longitude),
    };
  }

  return {
    address: order.project?.siteAddress ?? order.client.billingAddress ?? null,
    city: order.project?.city ?? order.client.city ?? null,
    id: null,
    label: order.project?.title ?? "Direccion de obra",
    latitude: decimalToNumber(order.project?.latitude ?? null),
    longitude: decimalToNumber(order.project?.longitude ?? null),
  };
};

const mapClientSummary = (client: InstallationOrderListEntity["client"]) => ({
  clientType: client.clientType,
  displayName: getClientDisplayName(client),
  id: client.id,
});

const buildReadinessSummary = async (
  input: {
    projectId: string | null;
    quotationId: string | null;
  },
  db: DbClient = prisma,
): Promise<InstallationReadinessSummary> => {
  const relationFilters: Prisma.ProductionJobWhereInput[] = [];
  const reservationFilters: Prisma.InventoryReservationWhereInput[] = [];

  if (input.projectId) {
    relationFilters.push({
      projectId: input.projectId,
    });
    reservationFilters.push({
      projectId: input.projectId,
    });
  }

  if (input.quotationId) {
    relationFilters.push({
      quotationId: input.quotationId,
    });
    reservationFilters.push({
      quotationId: input.quotationId,
    });
  }

  if (relationFilters.length === 0 && reservationFilters.length === 0) {
    return {
      activeReservationCount: 0,
      productionCompletedCount: 0,
      productionPendingCount: 0,
      productionReady: false,
      readyReservationCount: 0,
      reservationsReady: false,
      warnings: [
        "La orden no tiene proyecto ni cotizacion relacionada para validar preparacion.",
      ],
    };
  }

  const [productionJobs, reservations] = await Promise.all([
    db.productionJob.findMany({
      select: {
        id: true,
        status: true,
      },
      where: {
        OR: relationFilters,
        deletedAt: null,
      },
    }),
    db.inventoryReservation.findMany({
      select: {
        id: true,
        inventoryStockId: true,
        reservationType: true,
        status: true,
      },
      where: {
        OR: reservationFilters,
        status: "ACTIVE",
      },
    }),
  ]);

  const productionCompletedCount = productionJobs.filter(
    (job) => job.status === "COMPLETED",
  ).length;
  const productionPendingCount = productionJobs.length - productionCompletedCount;
  const activeReservationCount = reservations.length;
  const readyReservationCount = reservations.filter((reservation) => reservation.inventoryStockId)
    .length;
  const warnings: string[] = [];

  if (productionJobs.length === 0) {
    warnings.push("No hay ordenes de produccion relacionadas.");
  } else if (productionPendingCount > 0) {
    warnings.push("La produccion relacionada aun no esta completada.");
  }

  if (activeReservationCount === 0) {
    warnings.push("No hay materiales reservados para esta instalacion.");
  } else if (readyReservationCount < activeReservationCount) {
    warnings.push("Hay reservas sin stock puntual asignado.");
  }

  return {
    activeReservationCount,
    productionCompletedCount,
    productionPendingCount,
    productionReady:
      productionJobs.length > 0 && productionPendingCount === 0,
    readyReservationCount,
    reservationsReady:
      activeReservationCount > 0 && readyReservationCount === activeReservationCount,
    warnings,
  };
};

const mapInstallationOrderListItem = async (
  order: InstallationOrderListEntity,
  db: DbClient = prisma,
) => {
  const readiness = await buildReadinessSummary(
    {
      projectId: order.projectId,
      quotationId: order.quotationId,
    },
    db,
  );
  const completedTaskCount = order.tasks.filter((task) => task.status === "COMPLETED").length;

  return {
    address: buildAddressSummary(order),
    assignedSupervisor: mapUserSummary(order.assignedSupervisor),
    assignedTeam: mapTeam(order.assignedTeam),
    client: mapClientSummary(order.client),
    code: order.code,
    createdAt: order.createdAt.toISOString(),
    evidenceCount: order.evidence.length,
    id: order.id,
    installationType: order.installationType,
    notes: order.notes,
    openIssueCount: order.issues.filter((issue) => issue.status !== "RESOLVED" && issue.status !== "CLOSED").length,
    pendingTaskCount: order.tasks.length - completedTaskCount,
    priority: order.priority,
    project: order.project
      ? {
          code: order.project.code,
          id: order.project.id,
          status: order.project.status,
          title: order.project.title,
        }
      : null,
    quotation: order.quotation,
    readiness,
    scheduledDate: order.scheduledDate.toISOString(),
    scheduledEndTime: order.scheduledEndTime,
    scheduledStartTime: order.scheduledStartTime,
    status: order.status,
    taskCount: order.tasks.length,
    completedTaskCount,
    updatedAt: order.updatedAt.toISOString(),
  };
};

const mapInstallationOrderDetail = async (
  order: InstallationOrderDetailEntity,
  db: DbClient = prisma,
) => {
  const base = await mapInstallationOrderListItem(order, db);

  return {
    ...base,
    createdByUser: mapUserSummary(order.createdByUser),
    deletedAt: toIsoString(order.deletedAt),
    evidence: order.evidence.map(mapEvidence),
    issues: order.issues.map(mapIssue),
    statusHistory: order.statusHistory.map(mapStatusHistory),
    tasks: order.tasks.map(mapTask),
  };
};

const parseTimeToMinutes = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parts = value.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const getRangeStartMinutes = (value: string | null): number => {
  return parseTimeToMinutes(value) ?? 0;
};

const getRangeEndMinutes = (value: string | null): number => {
  return parseTimeToMinutes(value) ?? 24 * 60;
};

const ensureValidScheduleWindow = (
  scheduledStartTime: string | null,
  scheduledEndTime: string | null,
) => {
  const startMinutes = parseTimeToMinutes(scheduledStartTime);
  const endMinutes = parseTimeToMinutes(scheduledEndTime);

  if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
    throw new AppError(
      "La hora de inicio debe ser anterior a la hora de fin.",
      400,
    );
  }
};

const buildDayRange = (value: Date) => {
  const start = new Date(value);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    end,
    start,
  };
};

const rangesOverlap = (
  startA: string | null,
  endA: string | null,
  startB: string | null,
  endB: string | null,
): boolean => {
  const aStart = getRangeStartMinutes(startA);
  const aEnd = getRangeEndMinutes(endA);
  const bStart = getRangeStartMinutes(startB);
  const bEnd = getRangeEndMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
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

const findProjectSummaryById = async (projectId: string, db: DbClient) => {
  return db.project.findFirst({
    select: {
      clientId: true,
      id: true,
      title: true,
    },
    where: {
      deletedAt: null,
      id: projectId,
    },
  });
};

const findQuotationSummaryById = async (quotationId: string, db: DbClient) => {
  return db.quotation.findFirst({
    select: {
      clientId: true,
      id: true,
      projectId: true,
    },
    where: {
      deletedAt: null,
      id: quotationId,
    },
  });
};

const assertUserExists = async (userId: string, db: DbClient) => {
  const user = await db.user.findFirst({
    select: {
      id: true,
    },
    where: {
      deletedAt: null,
      id: userId,
      isActive: true,
    },
  });

  if (!user) {
    throw new AppError("El usuario seleccionado no existe o no esta activo.", 404);
  }
};

const assertTeamExists = async (teamId: string, db: DbClient) => {
  const team = await db.installationTeam.findUnique({
    select: {
      id: true,
      status: true,
    },
    where: {
      id: teamId,
    },
  });

  if (!team) {
    throw new AppError("La cuadrilla seleccionada no existe.", 404);
  }

  if (team.status !== "ACTIVE") {
    throw new AppError("La cuadrilla seleccionada no esta activa.", 400);
  }
};

const assertAddressBelongsToClient = async (
  addressId: string,
  clientId: string,
  db: DbClient,
) => {
  const address = await db.clientAddress.findFirst({
    select: {
      id: true,
    },
    where: {
      clientId,
      id: addressId,
    },
  });

  if (!address) {
    throw new AppError("La direccion seleccionada no pertenece al cliente.", 400);
  }
};

const resolveOrderRelations = async (
  input: Pick<
    CreateInstallationOrderInput,
    "clientId" | "projectId" | "quotationId" | "addressId"
  >,
  db: DbClient,
) => {
  const project =
    input.projectId ? await findProjectSummaryById(input.projectId, db) : null;

  if (input.projectId && !project) {
    throw new AppError("El proyecto seleccionado no existe.", 404);
  }

  const quotation =
    input.quotationId ? await findQuotationSummaryById(input.quotationId, db) : null;

  if (input.quotationId && !quotation) {
    throw new AppError("La cotizacion seleccionada no existe.", 404);
  }

  if (
    project &&
    quotation &&
    quotation.projectId &&
    quotation.projectId !== project.id
  ) {
    throw new AppError(
      "La cotizacion seleccionada no corresponde al proyecto indicado.",
      400,
    );
  }

  const clientId = input.clientId ?? project?.clientId ?? quotation?.clientId ?? null;

  if (!clientId) {
    throw new AppError("Debes seleccionar un cliente, proyecto o cotizacion valida.", 400);
  }

  if (project && project.clientId !== clientId) {
    throw new AppError("El proyecto no corresponde al cliente seleccionado.", 400);
  }

  if (quotation && quotation.clientId !== clientId) {
    throw new AppError("La cotizacion no corresponde al cliente seleccionado.", 400);
  }

  await assertClientExists(clientId, db);

  if (input.addressId) {
    await assertAddressBelongsToClient(input.addressId, clientId, db);
  }

  return {
    clientId,
    projectId: project?.id ?? quotation?.projectId ?? null,
    quotationId: quotation?.id ?? null,
  };
};

const assertNoSchedulingConflict = async (
  input: {
    assignedSupervisorId: string | null;
    assignedTeamId: string | null;
    orderId?: string;
    scheduledDate: Date;
    scheduledEndTime: string | null;
    scheduledStartTime: string | null;
  },
  db: DbClient,
) => {
  if (!input.assignedSupervisorId && !input.assignedTeamId) {
    return;
  }

  ensureValidScheduleWindow(input.scheduledStartTime, input.scheduledEndTime);

  const dayRange = buildDayRange(input.scheduledDate);
  const candidates = await db.installationOrder.findMany({
    select: {
      assignedSupervisorId: true,
      assignedTeamId: true,
      code: true,
      id: true,
      scheduledEndTime: true,
      scheduledStartTime: true,
      status: true,
    },
    where: {
      deletedAt: null,
      ...(input.orderId
        ? {
            id: {
              not: input.orderId,
            },
          }
        : {}),
      OR: [
        ...(input.assignedTeamId
          ? [
              {
                assignedTeamId: input.assignedTeamId,
              },
            ]
          : []),
        ...(input.assignedSupervisorId
          ? [
              {
                assignedSupervisorId: input.assignedSupervisorId,
              },
            ]
          : []),
      ],
      scheduledDate: {
        gte: dayRange.start,
        lt: dayRange.end,
      },
      status: {
        in: [...INSTALLATION_ORDER_ACTIVE_STATUSES],
      },
    },
  });

  const conflictingOrders = candidates.filter((candidate) => {
    if (!installationActiveStatusSet.has(candidate.status)) {
      return false;
    }

    return rangesOverlap(
      input.scheduledStartTime,
      input.scheduledEndTime,
      candidate.scheduledStartTime,
      candidate.scheduledEndTime,
    );
  });

  if (conflictingOrders.length > 0) {
    throw new AppError(
      `Se detecto un conflicto de agenda con ${conflictingOrders
        .map((order) => order.code)
        .join(", ")}.`,
      409,
    );
  }
};

const buildOrderWhereClause = (
  query: Omit<ListInstallationOrdersQuery, "page" | "perPage" | "sortBy" | "sortDirection">,
): Prisma.InstallationOrderWhereInput => {
  const scheduledDate = buildDateRangeFilter(query.dateFrom, query.dateTo);

  return {
    deletedAt: null,
    ...(query.clientId
      ? {
          clientId: query.clientId,
        }
      : {}),
    ...(query.projectId
      ? {
          projectId: query.projectId,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
    ...(query.teamId
      ? {
          assignedTeamId: query.teamId,
        }
      : {}),
    ...(scheduledDate
      ? {
          scheduledDate,
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
              installationType: {
                contains: query.search,
              },
            },
            {
              notes: {
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
            {
              project: {
                title: {
                  contains: query.search,
                },
              },
            },
            {
              address: {
                address: {
                  contains: query.search,
                },
              },
            },
            {
              address: {
                label: {
                  contains: query.search,
                },
              },
            },
          ],
        }
      : {}),
  };
};

const buildOrderBy = (
  sortBy: ListInstallationOrdersQuery["sortBy"],
  sortDirection: ListInstallationOrdersQuery["sortDirection"],
): Prisma.InstallationOrderOrderByWithRelationInput[] => {
  switch (sortBy) {
    case "createdAt":
      return [
        {
          createdAt: sortDirection,
        },
      ];
    case "priority":
      return [
        {
          priority: sortDirection,
        },
        {
          scheduledDate: "asc",
        },
        {
          scheduledStartTime: "asc",
        },
      ];
    case "status":
      return [
        {
          status: sortDirection,
        },
        {
          scheduledDate: "asc",
        },
        {
          scheduledStartTime: "asc",
        },
      ];
    case "scheduledDate":
    default:
      return [
        {
          scheduledDate: sortDirection,
        },
        {
          scheduledStartTime: sortDirection,
        },
      ];
  }
};

const getInstallationEvidenceRequirement = async (
  db: DbClient,
): Promise<boolean> => {
  const setting = await db.systemSetting.findUnique({
    select: {
      valueJson: true,
    },
    where: {
      key: "installation.require_evidence_before_completion",
    },
  });

  return setting?.valueJson === true;
};

const createStatusHistoryEntry = async (
  db: DbClient,
  input: {
    changedByUserId: string | null;
    fromStatus: InstallationOrderStatus | null;
    installationOrderId: string;
    metadataJson?: Prisma.InputJsonValue | null;
    notes?: string | null;
    toStatus: InstallationOrderStatus;
  },
) => {
  await db.installationStatusHistory.create({
    data: {
      changedByUserId: input.changedByUserId,
      fromStatus: input.fromStatus,
      installationOrderId: input.installationOrderId,
      metadataJson:
        input.metadataJson === undefined || input.metadataJson === null
          ? PrismaNamespace.JsonNull
          : input.metadataJson,
      notes: input.notes ?? null,
      toStatus: input.toStatus,
    },
  });
};

const buildTaskCreateData = (
  orderId: string,
  tasks: CreateInstallationOrderInput["tasks"],
) => {
  const sourceTasks =
    tasks.length > 0
      ? tasks
      : INSTALLATION_DEFAULT_TASK_TEMPLATES.map((task) => ({
          description: task.description,
          estimatedMinutes: task.estimatedMinutes,
          status: "PENDING" as InstallationTaskStatus,
          title: task.title,
        }));

  return sourceTasks.map((task, index) => ({
    completedAt: task.status === "COMPLETED" ? new Date() : null,
    completedByUserId: null,
    description: task.description ?? null,
    estimatedMinutes: task.estimatedMinutes ?? null,
    installationOrderId: orderId,
    sortOrder: index,
    status: task.status,
    title: task.title.trim(),
  }));
};

const generateInstallationOrderCode = async (
  db: DbClient = prisma,
  value = new Date(),
): Promise<string> => {
  const year = value.getUTCFullYear();
  const prefix = `INS-${year}-`;
  const latestOrder = await db.installationOrder.findFirst({
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
  const latestSequence = latestOrder?.code.match(/(\d+)$/)?.[1];
  const nextSequence = latestSequence ? Number(latestSequence) + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
};

const createOrderWithUniqueCode = async (
  run: (db: DbClient, code: string) => Promise<string>,
) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await prisma.$transaction(async (db) => {
        const code = await generateInstallationOrderCode(db);
        return run(db, code);
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

  throw new AppError("No se pudo generar un codigo unico para la instalacion.", 500);
};

const findInstallationOrderHeaderOrThrow = async (
  installationOrderId: string,
  db: DbClient,
): Promise<OrderHeader> => {
  const order = await db.installationOrder.findFirst({
    select: {
      addressId: true,
      assignedSupervisorId: true,
      assignedTeamId: true,
      clientId: true,
      code: true,
      id: true,
      projectId: true,
      quotationId: true,
      scheduledDate: true,
      scheduledEndTime: true,
      scheduledStartTime: true,
      status: true,
    },
    where: {
      deletedAt: null,
      id: installationOrderId,
    },
  });

  if (!order) {
    throw new AppError("La orden de instalacion no existe.", 404);
  }

  return order;
};

const findInstallationTaskOrThrow = async (
  taskId: string,
  db: DbClient,
) => {
  const task = await db.installationTask.findUnique({
    include: taskInclude,
    where: {
      id: taskId,
    },
  });

  if (!task) {
    throw new AppError("La tarea de instalacion no existe.", 404);
  }

  return task;
};

const findInstallationIssueOrThrow = async (
  issueId: string,
  db: DbClient,
) => {
  const issue = await db.installationIssue.findUnique({
    include: issueInclude,
    where: {
      id: issueId,
    },
  });

  if (!issue) {
    throw new AppError("La incidencia de instalacion no existe.", 404);
  }

  return issue;
};

const assertCompletionRules = async (
  installationOrderId: string,
  db: DbClient,
) => {
  const [pendingTaskCount, evidenceCount, requireEvidence] = await Promise.all([
    db.installationTask.count({
      where: {
        installationOrderId,
        status: {
          not: "COMPLETED",
        },
      },
    }),
    db.installationEvidence.count({
      where: {
        installationOrderId,
      },
    }),
    getInstallationEvidenceRequirement(db),
  ]);

  if (pendingTaskCount > 0) {
    throw new AppError(
      "No puedes completar la instalacion mientras existan tareas pendientes.",
      400,
    );
  }

  if (requireEvidence && evidenceCount === 0) {
    throw new AppError(
      "La configuracion exige al menos una evidencia antes de completar la instalacion.",
      400,
    );
  }
};

const assertTransitionAllowed = (
  currentStatus: InstallationOrderStatus,
  nextStatus: InstallationOrderStatus,
) => {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = INSTALLATION_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw new AppError(
      `No se puede cambiar el estado de ${currentStatus} a ${nextStatus}.`,
      400,
    );
  }
};

const buildEvidenceFileName = (originalName: string) => {
  const extension = path.extname(originalName).toLowerCase() || ".bin";
  return `installation-${Date.now()}-${randomUUID()}${extension}`;
};

const assertUsersExist = async (userIds: string[], db: DbClient) => {
  if (userIds.length === 0) {
    return;
  }

  const existingUsers = await db.user.findMany({
    select: {
      id: true,
    },
    where: {
      deletedAt: null,
      id: {
        in: userIds,
      },
      isActive: true,
    },
  });

  if (existingUsers.length !== new Set(userIds).size) {
    throw new AppError("Uno o mas usuarios de la cuadrilla no existen o no estan activos.", 400);
  }
};

export const installationService = {
  async listInstallationOrders(query: ListInstallationOrdersQuery) {
    const where = buildOrderWhereClause(query);
    const [total, orders] = await prisma.$transaction([
      prisma.installationOrder.count({
        where,
      }),
      prisma.installationOrder.findMany({
        include: installationOrderListInclude,
        orderBy: buildOrderBy(query.sortBy, query.sortDirection),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    const data = await Promise.all(
      orders.map((order) => mapInstallationOrderListItem(order)),
    );

    return {
      data,
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async listInstallationCalendar(query: InstallationCalendarQuery) {
    const defaultDate = new Date();
    const rangeStart = query.dateFrom
      ? new Date(`${query.dateFrom}T00:00:00.000Z`)
      : new Date(Date.UTC(defaultDate.getUTCFullYear(), defaultDate.getUTCMonth(), 1));
    const rangeEnd = query.dateTo
      ? new Date(`${query.dateTo}T23:59:59.999Z`)
      : new Date(Date.UTC(defaultDate.getUTCFullYear(), defaultDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const orders = await prisma.installationOrder.findMany({
      include: installationOrderListInclude,
      orderBy: [
        {
          scheduledDate: "asc",
        },
        {
          scheduledStartTime: "asc",
        },
      ],
      where: {
        ...buildOrderWhereClause({
          clientId: query.clientId,
          dateFrom: rangeStart.toISOString().slice(0, 10),
          dateTo: rangeEnd.toISOString().slice(0, 10),
          projectId: query.projectId,
          search: "",
          status: query.status,
          teamId: query.teamId,
        }),
      },
    });

    return Promise.all(orders.map((order) => mapInstallationOrderListItem(order)));
  },

  async getInstallationOrderById(installationOrderId: string) {
    const order = await prisma.installationOrder.findFirst({
      include: installationOrderDetailInclude,
      where: {
        deletedAt: null,
        id: installationOrderId,
      },
    });

    if (!order) {
      throw new AppError("La orden de instalacion no existe.", 404);
    }

    return mapInstallationOrderDetail(order);
  },

  async createInstallationOrder(
    input: CreateInstallationOrderInput,
    userId: string | null,
  ) {
    if (input.assignedTeamId) {
      await assertTeamExists(input.assignedTeamId, prisma);
    }

    if (input.assignedSupervisorId) {
      await assertUserExists(input.assignedSupervisorId, prisma);
    }

    const orderId = await createOrderWithUniqueCode(async (db, code) => {
      const relations = await resolveOrderRelations(input, db);

      await assertNoSchedulingConflict(
        {
          assignedSupervisorId: input.assignedSupervisorId,
          assignedTeamId: input.assignedTeamId,
          scheduledDate: input.scheduledDate,
          scheduledEndTime: input.scheduledEndTime,
          scheduledStartTime: input.scheduledStartTime,
        },
        db,
      );

      const order = await db.installationOrder.create({
        data: {
          addressId: input.addressId,
          assignedSupervisorId: input.assignedSupervisorId,
          assignedTeamId: input.assignedTeamId,
          clientId: relations.clientId,
          code,
          createdByUserId: userId,
          installationType: input.installationType.trim(),
          notes: input.notes,
          priority: input.priority as InstallationPriority,
          projectId: relations.projectId,
          quotationId: relations.quotationId,
          scheduledDate: input.scheduledDate,
          scheduledEndTime: input.scheduledEndTime,
          scheduledStartTime: input.scheduledStartTime,
          status: input.status,
        },
      });

      const taskData = buildTaskCreateData(order.id, input.tasks);

      if (taskData.length > 0) {
        await db.installationTask.createMany({
          data: taskData,
        });
      }

      await createStatusHistoryEntry(db, {
        changedByUserId: userId,
        fromStatus: null,
        installationOrderId: order.id,
        notes: "Orden creada.",
        toStatus: order.status,
      });

      return order.id;
    });

    return this.getInstallationOrderById(orderId);
  },

  async createInstallationOrderFromProject(
    projectId: string,
    input: Omit<CreateInstallationOrderInput, "projectId">,
    userId: string | null,
  ) {
    return this.createInstallationOrder(
      {
        ...input,
        projectId,
      },
      userId,
    );
  },

  async createInstallationOrderFromQuotation(
    quotationId: string,
    input: Omit<CreateInstallationOrderInput, "quotationId">,
    userId: string | null,
  ) {
    return this.createInstallationOrder(
      {
        ...input,
        quotationId,
      },
      userId,
    );
  },

  async updateInstallationOrder(
    installationOrderId: string,
    input: UpdateInstallationOrderInput,
  ) {
    const previous = await this.getInstallationOrderById(installationOrderId);
    const header = await findInstallationOrderHeaderOrThrow(installationOrderId, prisma);

    if (input.assignedTeamId) {
      await assertTeamExists(input.assignedTeamId, prisma);
    }

    if (input.assignedSupervisorId) {
      await assertUserExists(input.assignedSupervisorId, prisma);
    }

    if (input.addressId) {
      await assertAddressBelongsToClient(input.addressId, header.clientId, prisma);
    }

    await assertNoSchedulingConflict(
      {
        assignedSupervisorId: input.assignedSupervisorId,
        assignedTeamId: input.assignedTeamId,
        orderId: installationOrderId,
        scheduledDate: input.scheduledDate,
        scheduledEndTime: input.scheduledEndTime,
        scheduledStartTime: input.scheduledStartTime,
      },
      prisma,
    );

    await prisma.installationOrder.update({
      data: {
        addressId: input.addressId,
        assignedSupervisorId: input.assignedSupervisorId,
        assignedTeamId: input.assignedTeamId,
        installationType: input.installationType.trim(),
        notes: input.notes,
        priority: input.priority as InstallationPriority,
        scheduledDate: input.scheduledDate,
        scheduledEndTime: input.scheduledEndTime,
        scheduledStartTime: input.scheduledStartTime,
      },
      where: {
        id: installationOrderId,
      },
    });

    return {
      current: await this.getInstallationOrderById(installationOrderId),
      previous,
    };
  },

  async assignInstallationOrder(
    installationOrderId: string,
    input: {
      assignedSupervisorId: string | null;
      assignedTeamId: string | null;
    },
  ) {
    const previous = await this.getInstallationOrderById(installationOrderId);
    const header = await findInstallationOrderHeaderOrThrow(installationOrderId, prisma);

    if (input.assignedTeamId) {
      await assertTeamExists(input.assignedTeamId, prisma);
    }

    if (input.assignedSupervisorId) {
      await assertUserExists(input.assignedSupervisorId, prisma);
    }

    await assertNoSchedulingConflict(
      {
        assignedSupervisorId: input.assignedSupervisorId,
        assignedTeamId: input.assignedTeamId,
        orderId: installationOrderId,
        scheduledDate: header.scheduledDate,
        scheduledEndTime: header.scheduledEndTime,
        scheduledStartTime: header.scheduledStartTime,
      },
      prisma,
    );

    await prisma.installationOrder.update({
      data: {
        assignedSupervisorId: input.assignedSupervisorId,
        assignedTeamId: input.assignedTeamId,
      },
      where: {
        id: installationOrderId,
      },
    });

    return {
      current: await this.getInstallationOrderById(installationOrderId),
      previous,
    };
  },

  async rescheduleInstallationOrder(
    installationOrderId: string,
    input: RescheduleInstallationOrderInput,
    userId: string | null,
  ) {
    const previous = await this.getInstallationOrderById(installationOrderId);
    const header = await findInstallationOrderHeaderOrThrow(installationOrderId, prisma);

    await assertNoSchedulingConflict(
      {
        assignedSupervisorId: header.assignedSupervisorId,
        assignedTeamId: header.assignedTeamId,
        orderId: installationOrderId,
        scheduledDate: input.scheduledDate,
        scheduledEndTime: input.scheduledEndTime,
        scheduledStartTime: input.scheduledStartTime,
      },
      prisma,
    );

    await prisma.$transaction(async (db) => {
      await db.installationOrder.update({
        data: {
          scheduledDate: input.scheduledDate,
          scheduledEndTime: input.scheduledEndTime,
          scheduledStartTime: input.scheduledStartTime,
          status: "RESCHEDULED",
        },
        where: {
          id: installationOrderId,
        },
      });

      await createStatusHistoryEntry(db, {
        changedByUserId: userId,
        fromStatus: header.status,
        installationOrderId,
        metadataJson: {
          previousSchedule: {
            scheduledDate: header.scheduledDate.toISOString(),
            scheduledEndTime: header.scheduledEndTime,
            scheduledStartTime: header.scheduledStartTime,
          },
          updatedSchedule: {
            scheduledDate: input.scheduledDate.toISOString(),
            scheduledEndTime: input.scheduledEndTime,
            scheduledStartTime: input.scheduledStartTime,
          },
        },
        notes: input.reason,
        toStatus: "RESCHEDULED",
      });
    });

    return {
      current: await this.getInstallationOrderById(installationOrderId),
      previous,
    };
  },

  async changeInstallationOrderStatus(
    installationOrderId: string,
    input: ChangeInstallationStatusInput,
    userId: string | null,
  ) {
    const header = await findInstallationOrderHeaderOrThrow(installationOrderId, prisma);

    if (header.status !== input.status) {
      assertTransitionAllowed(header.status, input.status);
    }

    if (input.status === "COMPLETED") {
      await assertCompletionRules(installationOrderId, prisma);
    }

    await prisma.$transaction(async (db) => {
      await db.installationOrder.update({
        data: {
          status: input.status,
        },
        where: {
          id: installationOrderId,
        },
      });

      await createStatusHistoryEntry(db, {
        changedByUserId: userId,
        fromStatus: header.status,
        installationOrderId,
        notes: input.notes,
        toStatus: input.status,
      });
    });

    return this.getInstallationOrderById(installationOrderId);
  },

  async updateInstallationTask(
    taskId: string,
    input: UpdateInstallationTaskInput,
    userId: string | null,
  ) {
    const task = await findInstallationTaskOrThrow(taskId, prisma);
    const completedAt = input.status === "COMPLETED" ? new Date() : null;
    const completedByUserId = input.status === "COMPLETED" ? userId : null;

    const updated = await prisma.installationTask.update({
      include: taskInclude,
      data: {
        completedAt,
        completedByUserId,
        description: input.description,
        estimatedMinutes: input.estimatedMinutes,
        sortOrder: input.sortOrder,
        status: input.status,
        title: input.title.trim(),
      },
      where: {
        id: taskId,
      },
    });

    return {
      current: mapTask(updated),
      previous: mapTask(task),
    };
  },

  async completeInstallationTask(taskId: string, userId: string | null) {
    const task = await findInstallationTaskOrThrow(taskId, prisma);
    const updated = await prisma.installationTask.update({
      include: taskInclude,
      data: {
        completedAt: new Date(),
        completedByUserId: userId,
        status: "COMPLETED",
      },
      where: {
        id: taskId,
      },
    });

    return {
      current: mapTask(updated),
      previous: mapTask(task),
    };
  },

  async createInstallationEvidence(
    installationOrderId: string,
    metadata: InstallationEvidenceMetadataInput,
    file: UploadFile,
    userId: string | null,
  ) {
    const order = await findInstallationOrderHeaderOrThrow(installationOrderId, prisma);

    if (metadata.taskId) {
      const relatedTask = await prisma.installationTask.findFirst({
        select: {
          id: true,
        },
        where: {
          id: metadata.taskId,
          installationOrderId,
        },
      });

      if (!relatedTask) {
        throw new AppError("La tarea seleccionada no pertenece a la orden.", 400);
      }
    }

    const storedFileName = buildEvidenceFileName(file.originalName);
    const storedFilePath = path.join(installationEvidenceUploadsDir, storedFileName);
    const fileUrl = buildInstallationEvidenceUrl(storedFileName);

    await writeFile(storedFilePath, file.buffer);

    const evidence = await prisma.installationEvidence.create({
      include: evidenceInclude,
      data: {
        description: metadata.description,
        fileName: file.originalName,
        fileUrl,
        installationOrderId: order.id,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        taskId: metadata.taskId,
        type: metadata.type,
        uploadedByUserId: userId,
      },
    });

    return mapEvidence(evidence);
  },

  async createInstallationIssue(
    installationOrderId: string,
    input: CreateInstallationIssueInput,
    userId: string | null,
  ) {
    const header = await findInstallationOrderHeaderOrThrow(installationOrderId, prisma);

    const issueId = await prisma.$transaction(async (db) => {
      const issue = await db.installationIssue.create({
        data: {
          description: input.description.trim(),
          installationOrderId,
          reportedByUserId: userId,
          severity: input.severity,
          status: "OPEN",
          type: input.type,
        },
      });

      if (
        header.status !== "WITH_OBSERVATIONS" &&
        header.status !== "COMPLETED" &&
        header.status !== "CANCELLED"
      ) {
        await db.installationOrder.update({
          data: {
            status: "WITH_OBSERVATIONS",
          },
          where: {
            id: installationOrderId,
          },
        });

        await createStatusHistoryEntry(db, {
          changedByUserId: userId,
          fromStatus: header.status,
          installationOrderId,
          notes: "Se registro una observacion en campo.",
          toStatus: "WITH_OBSERVATIONS",
        });
      }

      return issue.id;
    });

    const issue = await findInstallationIssueOrThrow(issueId, prisma);
    return mapIssue(issue);
  },

  async resolveInstallationIssue(
    issueId: string,
    input: ResolveInstallationIssueInput,
    userId: string | null,
  ) {
    const issue = await findInstallationIssueOrThrow(issueId, prisma);
    const resolvedAt =
      input.status === "RESOLVED" || input.status === "CLOSED" ? new Date() : null;
    const resolvedByUserId =
      input.status === "RESOLVED" || input.status === "CLOSED" ? userId : null;

    const updated = await prisma.installationIssue.update({
      include: issueInclude,
      data: {
        description:
          input.notes && input.notes.length > 0
            ? `${issue.description}\n\nResolucion: ${input.notes}`
            : issue.description,
        resolvedAt,
        resolvedByUserId,
        status: input.status as InstallationIssueStatus,
      },
      where: {
        id: issueId,
      },
    });

    return {
      current: mapIssue(updated),
      previous: mapIssue(issue),
    };
  },

  async listInstallationTeams() {
    const teams = await prisma.installationTeam.findMany({
      include: teamInclude,
      orderBy: [
        {
          status: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return teams.map(mapTeam);
  },

  async createInstallationTeam(input: InstallationTeamMutationInput) {
    const memberIds = input.members.map((member) => member.userId);
    const userIds = [
      ...memberIds,
      ...(input.supervisorId ? [input.supervisorId] : []),
    ];
    await assertUsersExist(userIds, prisma);

    const team = await prisma.installationTeam.create({
      include: teamInclude,
      data: {
        members: {
          create: input.members.map((member) => ({
            active: member.active,
            role: member.role.trim(),
            userId: member.userId,
          })),
        },
        name: input.name.trim(),
        notes: input.notes,
        status: input.status,
        supervisorId: input.supervisorId,
      },
    });

    return mapTeam(team);
  },

  async updateInstallationTeam(
    teamId: string,
    input: InstallationTeamMutationInput,
  ) {
    const previous = await prisma.installationTeam.findUnique({
      include: teamInclude,
      where: {
        id: teamId,
      },
    });

    if (!previous) {
      throw new AppError("La cuadrilla no existe.", 404);
    }

    const memberIds = input.members.map((member) => member.userId);
    const userIds = [
      ...memberIds,
      ...(input.supervisorId ? [input.supervisorId] : []),
    ];
    await assertUsersExist(userIds, prisma);

    const current = await prisma.installationTeam.update({
      include: teamInclude,
      data: {
        members: {
          deleteMany: {},
          create: input.members.map((member) => ({
            active: member.active,
            role: member.role.trim(),
            userId: member.userId,
          })),
        },
        name: input.name.trim(),
        notes: input.notes,
        status: input.status,
        supervisorId: input.supervisorId,
      },
      where: {
        id: teamId,
      },
    });

    return {
      current: mapTeam(current),
      previous: mapTeam(previous),
    };
  },

  async softDeleteInstallationOrder(installationOrderId: string) {
    const previous = await this.getInstallationOrderById(installationOrderId);
    await prisma.installationOrder.update({
      data: {
        deletedAt: new Date(),
      },
      where: {
        id: installationOrderId,
      },
    });

    return previous;
  },
};
