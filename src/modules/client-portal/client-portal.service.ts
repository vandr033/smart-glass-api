import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import bcrypt from "bcryptjs";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import jwt from "jsonwebtoken";

import { emailService } from "../../emails/EmailService.js";
import { notificationService } from "../../services/notification-service.js";
import { env } from "../../utils/env.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import {
  buildClientPortalFileUrl,
  clientPortalUploadsDir,
} from "../../utils/uploads.js";
import { postventaService } from "../postventa/postventa.service.js";
import { quotationsService } from "../quotations/quotations.service.js";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  CLIENT_PORTAL_DEFAULT_PROJECT_PERMISSIONS,
  CLIENT_PORTAL_INVITATION_DURATION_MS,
  CLIENT_PORTAL_PASSWORD_RESET_DURATION_MS,
  CLIENT_PORTAL_SESSION_DURATION_MS,
} from "./client-portal.constants.js";
import type {
  ChangeClientPortalUserStatusInput,
  ClientPortalAcceptInvitationInput,
  ClientPortalForgotPasswordInput,
  ClientPortalLoginInput,
  ClientPortalQuotationDecisionInput,
  ClientPortalResetPasswordInput,
  ClientPortalSession,
  CreateClientPortalDocumentInput,
  CreateClientPortalMessageInput,
  CreateInternalClientPortalMessageInput,
  CreatePortalPostventaCaseInput,
  InviteClientPortalUserInput,
  ListPortalMessagesQuery,
  ListPortalUsersQuery,
  UpdateClientPortalUserInput,
} from "./client-portal.types.js";

type PortalUploadFile = {
  buffer: Buffer;
  mimetype?: string | null | undefined;
  originalName: string;
  size: number;
};

type PortalUserContext = {
  client: {
    commercialName: string | null;
    firstName: string | null;
    id: string;
    lastName: string | null;
    legalName: string | null;
  };
  email: string;
  id: string;
  lastAccessAt: Date | null;
  name: string;
  phone: string | null;
  projectAccesses: Array<{
    permissionsJson: Prisma.JsonValue | null;
    project: {
      clientId: string;
      code: string;
      id: string;
      status: string;
      title: string;
    };
    projectId: string;
    status: "ACTIVO" | "INACTIVO";
  }>;
  status:
    | "ACTIVO"
    | "INACTIVO"
    | "PENDIENTE_INVITACION"
    | "INVITACION_ENVIADA"
    | "ACCESO_BLOQUEADO";
};

type PortalDocumentDownloadRequest = {
  documentId?: string | null;
  referenceId: string;
  referenceKey: string;
};

const portalBaseUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/portal-cliente`;

const projectStatusProgressMap: Record<string, number> = {
  LEAD: 10,
  MEASUREMENT_PENDING: 20,
  QUOTATION_PENDING: 35,
  QUOTED: 45,
  APPROVED: 55,
  PURCHASE_PENDING: 60,
  PRODUCTION_PENDING: 70,
  IN_PRODUCTION: 80,
  INSTALLATION_PENDING: 88,
  IN_INSTALLATION: 94,
  COMPLETED: 100,
  CANCELLED: 0,
  ON_HOLD: 50,
};

const decimalToNumber = (
  value: PrismaNamespace.Decimal | number | null,
): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

const getClientDisplayName = (client: {
  commercialName: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  legalName: string | null;
}): string => {
  const companyName = client.commercialName ?? client.legalName;

  if (companyName) {
    return companyName;
  }

  const fullName = [client.firstName, client.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName.length > 0 ? fullName : `Cliente ${client.id.slice(0, 8).toUpperCase()}`;
};

const dateToIso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

const hashPortalToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

const createPortalToken = (): string => {
  return randomBytes(32).toString("hex");
};

const buildPortalSessionToken = (session: ClientPortalSession): string => {
  return jwt.sign(session, env.BETTER_AUTH_SECRET, {
    algorithm: "HS256",
    expiresIn: Math.floor(CLIENT_PORTAL_SESSION_DURATION_MS / 1000),
    issuer: "vidriera-sebitas-portal-cliente",
    subject: session.userId,
  });
};

export const verifyClientPortalSessionToken = (
  token: string,
): ClientPortalSession | null => {
  try {
    const payload = jwt.verify(token, env.BETTER_AUTH_SECRET, {
      algorithms: ["HS256"],
      issuer: "vidriera-sebitas-portal-cliente",
    });

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.sub !== "string" ||
      typeof payload["clientId"] !== "string" ||
      typeof payload["email"] !== "string" ||
      typeof payload["userId"] !== "string"
    ) {
      return null;
    }

    return {
      clientId: payload["clientId"],
      email: payload["email"],
      userId: payload["userId"],
    };
  } catch {
    return null;
  }
};

const storePortalFile = async (
  file: PortalUploadFile,
): Promise<{
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number;
}> => {
  const extension = path.extname(file.originalName).slice(0, 12);
  const storedFileName = `${randomUUID()}${extension || ""}`;
  const filePath = path.join(clientPortalUploadsDir, storedFileName);

  await writeFile(filePath, file.buffer);

  return {
    fileName: file.originalName,
    fileUrl: buildClientPortalFileUrl(storedFileName),
    mimeType: file.mimetype ?? null,
    sizeBytes: file.size,
  };
};

const buildInvitationLink = (token: string): string => {
  return `${portalBaseUrl}/invitacion?token=${encodeURIComponent(token)}`;
};

const buildResetLink = (token: string): string => {
  return `${portalBaseUrl}/restablecer-clave?token=${encodeURIComponent(token)}`;
};

const buildInvitationEmailHtml = (input: {
  clientName: string;
  link: string;
  userName: string;
}) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">Portal del Cliente de Vidriera Sebitas ERP</h2>
      <p>Hola ${input.userName}.</p>
      <p>Te invitamos a ingresar al portal del cliente para consultar cotizaciones, proyectos, instalaciones, documentos, garantias y soporte de <strong>${input.clientName}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${input.link}" style="background: #0f5bd7; color: #ffffff; padding: 14px 20px; border-radius: 10px; text-decoration: none; font-weight: 700;">
          Activar acceso
        </a>
      </p>
      <p>Si el boton no funciona, abre este enlace:</p>
      <p><a href="${input.link}" style="color: #0f5bd7;">${input.link}</a></p>
      <p>Este acceso vence en 7 dias.</p>
    </div>
  `;
};

const buildResetEmailHtml = (input: {
  clientName: string;
  link: string;
  userName: string;
}) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">Restablecimiento de acceso</h2>
      <p>Hola ${input.userName}.</p>
      <p>Recibimos una solicitud para restablecer tu contrasena del Portal del Cliente de <strong>${input.clientName}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${input.link}" style="background: #0f5bd7; color: #ffffff; padding: 14px 20px; border-radius: 10px; text-decoration: none; font-weight: 700;">
          Restablecer contrasena
        </a>
      </p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
      <p>Enlace directo: <a href="${input.link}" style="color: #0f5bd7;">${input.link}</a></p>
      <p>Este enlace vence en 30 minutos.</p>
    </div>
  `;
};

const buildPortalUserSummary = (context: PortalUserContext) => {
  return {
    client: {
      displayName: getClientDisplayName(context.client),
      id: context.client.id,
    },
    email: context.email,
    id: context.id,
    lastAccessAt: dateToIso(context.lastAccessAt),
    name: context.name,
    phone: context.phone,
    projects: context.projectAccesses
      .filter((access) => access.status === "ACTIVO")
      .map((access) => ({
        code: access.project.code,
        id: access.project.id,
        permissions: Array.isArray(access.permissionsJson)
          ? access.permissionsJson
          : [...CLIENT_PORTAL_DEFAULT_PROJECT_PERMISSIONS],
        status: access.project.status,
        title: access.project.title,
      })),
    status: context.status,
  };
};

const mapQuotationListItemToPortal = (quotation: Awaited<
  ReturnType<typeof quotationsService.listQuotations>
>["data"][number]) => {
  return {
    client: quotation.client,
    code: quotation.code,
    createdAt: quotation.createdAt,
    currency: quotation.currency,
    id: quotation.id,
    project: quotation.project,
    status: quotation.status,
    totalSale: quotation.totalSale,
    validUntil: quotation.validUntil,
  };
};

const mapQuotationDetailToPortal = (
  quotation: Awaited<ReturnType<typeof quotationsService.getQuotationById>>,
) => {
  return {
    client: quotation.client,
    code: quotation.code,
    createdAt: quotation.createdAt,
    currency: quotation.currency,
    id: quotation.id,
    items: quotation.items.map((item) => ({
      description: item.description,
      id: item.id,
      itemType: item.itemType,
      name: item.name,
      quantity: item.quantity,
      subtotalSale: item.subtotalSale,
    })),
    notes: quotation.notes,
    project: quotation.project,
    status: quotation.status,
    statusHistory: quotation.statusHistory,
    totalSale: quotation.totalSale,
    validUntil: quotation.validUntil,
  };
};

const resolvePortalPostventaEvidenceType = (
  file: PortalUploadFile | null,
): "DOCUMENTO" | "FOTO" | "OTRO" | "VIDEO" => {
  if (!file?.mimetype) {
    return "OTRO";
  }

  if (file.mimetype.startsWith("image/")) {
    return "FOTO";
  }

  if (file.mimetype.startsWith("video/")) {
    return "VIDEO";
  }

  return "DOCUMENTO";
};

const getPortalUserContext = async (
  userId: string,
): Promise<PortalUserContext> => {
  const user = await prisma.clientPortalUser.findUnique({
    include: {
      client: {
        select: {
          commercialName: true,
          firstName: true,
          id: true,
          lastName: true,
          legalName: true,
        },
      },
      projectAccesses: {
        include: {
          project: {
            select: {
              clientId: true,
              code: true,
              id: true,
              status: true,
              title: true,
            },
          },
        },
        orderBy: [
          {
            project: {
              title: "asc",
            },
          },
        ],
      },
    },
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError("No se encontro el usuario del portal.", 404);
  }

  return user as PortalUserContext;
};

const ensurePortalUserCanAccess = async (
  userId: string,
): Promise<PortalUserContext> => {
  const user = await getPortalUserContext(userId);

  if (user.status !== "ACTIVO") {
    throw new AppError("Tu acceso al portal no se encuentra activo.", 403);
  }

  return user;
};

const getAccessibleProjectIds = (context: PortalUserContext): string[] => {
  return context.projectAccesses
    .filter((access) => access.status === "ACTIVO")
    .map((access) => access.projectId);
};

const assertProjectBelongsToPortalUser = (
  context: PortalUserContext,
  projectId: string | null | undefined,
): void => {
  if (!projectId) {
    return;
  }

  const accessibleProjectIds = new Set(getAccessibleProjectIds(context));

  if (!accessibleProjectIds.has(projectId)) {
    throw new AppError("No tienes acceso al proyecto solicitado.", 403);
  }
};

const buildPortalQuotations = async (
  context: PortalUserContext,
) => {
  const result = await quotationsService.listQuotations(
      {
        clientId: context.client.id,
        dateFrom: undefined,
        dateTo: undefined,
        page: 1,
        perPage: 100,
        search: "",
      sortBy: "updatedAt",
      sortDirection: "desc",
    },
    {
      canViewCost: false,
    },
  );

  const allowedProjectIds = new Set(getAccessibleProjectIds(context));

  return result.data
    .filter(
      (quotation) =>
        !quotation.project?.id || allowedProjectIds.has(quotation.project.id),
    )
    .map(mapQuotationListItemToPortal);
};

const buildPortalDocuments = async (
  context: PortalUserContext,
) => {
  const projectIds = getAccessibleProjectIds(context);
  const projectIdFilter =
    projectIds.length > 0
      ? {
          in: projectIds,
        }
      : {
          equals: "__sin_proyectos__",
        };

  const [manualDocuments, projectAttachments, quotations, completedInstallations, warranties] =
    await Promise.all([
      prisma.clientPortalDocument.findMany({
        include: {
          project: {
            select: {
              code: true,
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          uploadedAt: "desc",
        },
        where: {
          clientId: context.client.id,
          visibleToClient: true,
          OR: [
            {
              projectId: null,
            },
            ...(projectIds.length > 0
              ? [
                  {
                    projectId: projectIdFilter,
                  },
                ]
              : []),
          ],
        },
      }),
      prisma.projectAttachment.findMany({
        include: {
          project: {
            select: {
              code: true,
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        where: {
          project: {
            clientId: context.client.id,
            id: projectIdFilter,
          },
        },
      }),
      buildPortalQuotations(context),
      prisma.installationOrder.findMany({
        include: {
          project: {
            select: {
              code: true,
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          scheduledDate: "desc",
        },
        where: {
          clientId: context.client.id,
          status: "COMPLETED",
          ...(projectIds.length > 0
            ? {
                OR: [
                  {
                    projectId: null,
                  },
                  {
                    projectId: projectIdFilter,
                  },
                ],
              }
            : {}),
        },
      }),
      prisma.productWarranty.findMany({
        include: {
          project: {
            select: {
              code: true,
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          endDate: "desc",
        },
        where: {
          clientId: context.client.id,
          ...(projectIds.length > 0
            ? {
                projectId: projectIdFilter,
              }
            : {}),
        },
      }),
    ]);

  const manual = manualDocuments.map((document) => ({
    createdAt: document.uploadedAt.toISOString(),
    documentType: document.type,
    downloadKind: "ARCHIVO" as const,
    fileUrl: document.fileUrl,
    id: `manual:${document.id}`,
    name: document.name,
    project: document.project,
    referenceId: document.id,
    referenceKey: "MANUAL",
  }));

  const attachments = projectAttachments.map((attachment) => ({
    createdAt: attachment.createdAt.toISOString(),
    documentType:
      attachment.attachmentType === "CONTRACT"
        ? "CONTRATO"
        : attachment.attachmentType === "PLAN"
          ? "PLANO"
          : attachment.attachmentType === "MEASUREMENT"
            ? "MEDICION"
            : attachment.attachmentType === "QUOTATION"
              ? "COTIZACION"
              : "DOCUMENTO_ADICIONAL",
    downloadKind: "ARCHIVO" as const,
    fileUrl: attachment.fileUrl,
    id: `adjunto:${attachment.id}`,
    name: attachment.fileName,
    project: attachment.project,
    referenceId: attachment.id,
    referenceKey: "ADJUNTO_PROYECTO",
  }));

  const quotationDocuments = quotations.map((quotation) => ({
    createdAt: quotation.createdAt,
    documentType: "COTIZACION",
    downloadKind: "COTIZACION_PDF" as const,
    fileUrl: null,
    id: `cotizacion:${quotation.id}`,
    name: `Cotizacion comercial ${quotation.code}`,
    project: quotation.project,
    referenceId: quotation.id,
    referenceKey: "COTIZACION",
  }));

  const installationDocuments = completedInstallations.map((installation) => ({
    createdAt: installation.updatedAt.toISOString(),
    documentType: "REPORTE_INSTALACION",
    downloadKind: "REPORTE_INSTALACION_PDF" as const,
    fileUrl: null,
    id: `instalacion:${installation.id}`,
    name: `Reporte de instalacion ${installation.code}`,
    project: installation.project,
    referenceId: installation.id,
    referenceKey: "REPORTE_INSTALACION",
  }));

  const warrantyDocuments = warranties.map((warranty) => ({
    createdAt: warranty.updatedAt.toISOString(),
    documentType: "GARANTIA",
    downloadKind: "GARANTIA_PDF" as const,
    fileUrl: null,
    id: `garantia:${warranty.id}`,
    name: `Certificado de garantia ${warranty.productType}`,
    project: warranty.project,
    referenceId: warranty.id,
    referenceKey: "GARANTIA",
  }));

  return [...manual, ...attachments, ...quotationDocuments, ...installationDocuments, ...warrantyDocuments]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const registerDocumentDownload = async (
  userId: string,
  input: PortalDocumentDownloadRequest,
) => {
  await prisma.clientPortalDocumentDownload.create({
    data: {
      documentId: input.documentId ?? null,
      referenceId: input.referenceId,
      referenceKey: input.referenceKey,
      userId,
    },
  });
};

export const clientPortalService = {
  buildPortalSessionToken,

  async getAuthenticatedPortalUser(
    session: ClientPortalSession,
  ) {
    const context = await ensurePortalUserCanAccess(session.userId);

    if (context.client.id !== session.clientId || context.email !== session.email) {
      throw new AppError("La sesion del portal ya no es valida.", 401);
    }

    return buildPortalUserSummary(context);
  },

  async login(input: ClientPortalLoginInput) {
    const user = await prisma.clientPortalUser.findUnique({
      include: {
        client: {
          select: {
            commercialName: true,
            firstName: true,
            id: true,
            lastName: true,
            legalName: true,
          },
        },
      },
      where: {
        email: input.correo,
      },
    });

    if (!user?.passwordHash) {
      throw new AppError("Credenciales invalidas.", 401);
    }

    const passwordMatches = await bcrypt.compare(input.contrasena, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Credenciales invalidas.", 401);
    }

    if (user.status === "PENDIENTE_INVITACION" || user.status === "INVITACION_ENVIADA") {
      throw new AppError("Debes activar tu invitacion antes de ingresar.", 403);
    }

    if (user.status === "ACCESO_BLOQUEADO") {
      throw new AppError("Tu acceso al portal se encuentra bloqueado.", 403);
    }

    if (user.status === "INACTIVO") {
      throw new AppError("Tu acceso al portal esta inactivo.", 403);
    }

    const updatedUser = await prisma.clientPortalUser.update({
      data: {
        lastAccessAt: new Date(),
      },
      where: {
        id: user.id,
      },
    });

    const session: ClientPortalSession = {
      clientId: user.clientId,
      email: user.email,
      userId: user.id,
    };

    return {
      session,
      token: buildPortalSessionToken(session),
      user: {
        client: {
          displayName: getClientDisplayName(user.client),
          id: user.client.id,
        },
        email: user.email,
        id: user.id,
        lastAccessAt: dateToIso(updatedUser.lastAccessAt),
        name: user.name,
        phone: user.phone,
        status: user.status,
      },
    };
  },

  async logout() {
    return {
      cookieName: CLIENT_PORTAL_COOKIE_NAME,
      loggedOut: true,
    };
  },

  async previewInvitation(token: string) {
    const invitation = await prisma.clientPortalInvitationToken.findUnique({
      include: {
        user: {
          include: {
            client: {
              select: {
                commercialName: true,
                firstName: true,
                id: true,
                lastName: true,
                legalName: true,
              },
            },
            projectAccesses: {
              include: {
                project: {
                  select: {
                    code: true,
                    id: true,
                    title: true,
                  },
                },
              },
              orderBy: {
                project: {
                  title: "asc",
                },
              },
            },
          },
        },
      },
      where: {
        tokenHash: hashPortalToken(token),
      },
    });

    if (!invitation || invitation.usedAt) {
      throw new AppError("La invitacion no es valida o ya fue utilizada.", 404);
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new AppError("La invitacion ya vencio.", 410);
    }

    return {
      client: {
        displayName: getClientDisplayName(invitation.user.client),
        id: invitation.user.client.id,
      },
      email: invitation.user.email,
      expiresAt: invitation.expiresAt.toISOString(),
      name: invitation.user.name,
      phone: invitation.user.phone,
      projectAccesses: invitation.user.projectAccesses.map((access) => ({
        code: access.project.code,
        id: access.project.id,
        title: access.project.title,
      })),
      status: invitation.user.status,
      userId: invitation.user.id,
    };
  },

  async acceptInvitation(input: ClientPortalAcceptInvitationInput) {
    const invitation = await prisma.clientPortalInvitationToken.findUnique({
      include: {
        user: {
          select: {
            clientId: true,
            email: true,
            id: true,
          },
        },
      },
      where: {
        tokenHash: hashPortalToken(input.token),
      },
    });

    if (!invitation || invitation.usedAt) {
      throw new AppError("La invitacion no es valida o ya fue utilizada.", 404);
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new AppError("La invitacion ya vencio.", 410);
    }

    const passwordHash = await bcrypt.hash(input.contrasena, 12);

    await prisma.$transaction(async (db) => {
      await db.clientPortalUser.update({
        data: {
          lastAccessAt: new Date(),
          passwordHash,
          status: "ACTIVO",
          ...(input.telefono !== undefined
            ? {
                phone: input.telefono,
              }
            : {}),
        },
        where: {
          id: invitation.user.id,
        },
      });

      await db.clientPortalInvitationToken.update({
        data: {
          usedAt: new Date(),
        },
        where: {
          id: invitation.id,
        },
      });
    });

    const session: ClientPortalSession = {
      clientId: invitation.user.clientId,
      email: invitation.user.email,
      userId: invitation.user.id,
    };

    return {
      session,
      token: buildPortalSessionToken(session),
      user: await this.getAuthenticatedPortalUser(session),
    };
  },

  async requestPasswordReset(input: ClientPortalForgotPasswordInput) {
    const user = await prisma.clientPortalUser.findUnique({
      include: {
        client: {
          select: {
            commercialName: true,
            firstName: true,
            id: true,
            lastName: true,
            legalName: true,
          },
        },
      },
      where: {
        email: input.correo,
      },
    });

    if (!user || user.status !== "ACTIVO") {
      return {
        sent: true,
      };
    }

    const token = createPortalToken();
    const tokenHash = hashPortalToken(token);
    const expiresAt = new Date(Date.now() + CLIENT_PORTAL_PASSWORD_RESET_DURATION_MS);

    await prisma.clientPortalPasswordResetToken.create({
      data: {
        expiresAt,
        tokenHash,
        userId: user.id,
      },
    });

    await emailService.sendEmail({
      html: buildResetEmailHtml({
        clientName: getClientDisplayName(user.client),
        link: buildResetLink(token),
        userName: user.name,
      }),
      subject: "Restablece tu acceso al Portal del Cliente",
      text: `Hola ${user.name}. Restablece tu acceso usando este enlace: ${buildResetLink(token)}`,
      to: user.email,
    });

    return {
      sent: true,
    };
  },

  async resetPassword(input: ClientPortalResetPasswordInput) {
    const resetToken = await prisma.clientPortalPasswordResetToken.findUnique({
      include: {
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      where: {
        tokenHash: hashPortalToken(input.token),
      },
    });

    if (!resetToken || resetToken.usedAt) {
      throw new AppError("El enlace de restablecimiento no es valido.", 404);
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      throw new AppError("El enlace de restablecimiento ya vencio.", 410);
    }

    const passwordHash = await bcrypt.hash(input.contrasena, 12);

    await prisma.$transaction(async (db) => {
      await db.clientPortalUser.update({
        data: {
          passwordHash,
          status:
            resetToken.user.status === "ACCESO_BLOQUEADO"
              ? "ACCESO_BLOQUEADO"
              : "ACTIVO",
        },
        where: {
          id: resetToken.user.id,
        },
      });

      await db.clientPortalPasswordResetToken.update({
        data: {
          usedAt: new Date(),
        },
        where: {
          id: resetToken.id,
        },
      });
    });

    return {
      updated: true,
    };
  },

  async listAdminUsers(query: ListPortalUsersQuery) {
    const where: Prisma.ClientPortalUserWhereInput = {
      ...(query.search.length > 0
        ? {
            OR: [
              {
                email: {
                  contains: query.search,
                },
              },
              {
                name: {
                  contains: query.search,
                },
              },
              {
                client: {
                  OR: [
                    {
                      commercialName: {
                        contains: query.search,
                      },
                    },
                    {
                      legalName: {
                        contains: query.search,
                      },
                    },
                    {
                      firstName: {
                        contains: query.search,
                      },
                    },
                    {
                      lastName: {
                        contains: query.search,
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),
    };

    const [total, users, recentMessages, recentDocuments, clients] = await prisma.$transaction([
      prisma.clientPortalUser.count({
        where,
      }),
      prisma.clientPortalUser.findMany({
        include: {
          client: {
            select: {
              commercialName: true,
              firstName: true,
              id: true,
              lastName: true,
              legalName: true,
            },
          },
          projectAccesses: {
            include: {
              project: {
                select: {
                  code: true,
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: {
              project: {
                title: "asc",
              },
            },
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
      prisma.clientPortalMessage.findMany({
        include: {
          client: {
            select: {
              commercialName: true,
              firstName: true,
              id: true,
              lastName: true,
              legalName: true,
            },
          },
          portalUser: {
            select: {
              email: true,
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              code: true,
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),
      prisma.clientPortalDocument.findMany({
        include: {
          client: {
            select: {
              commercialName: true,
              firstName: true,
              id: true,
              lastName: true,
              legalName: true,
            },
          },
          project: {
            select: {
              code: true,
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          uploadedAt: "desc",
        },
        take: 20,
      }),
      prisma.client.findMany({
        orderBy: [
          {
            commercialName: "asc",
          },
          {
            legalName: "asc",
          },
        ],
        select: {
          commercialName: true,
          firstName: true,
          id: true,
          lastName: true,
          legalName: true,
          projects: {
            orderBy: {
              title: "asc",
            },
            select: {
              code: true,
              id: true,
              status: true,
              title: true,
            },
            where: {
              deletedAt: null,
            },
          },
        },
        where: {
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: users.map((user) => ({
        client: {
          displayName: getClientDisplayName(user.client),
          id: user.client.id,
        },
        createdAt: user.createdAt.toISOString(),
        email: user.email,
        id: user.id,
        lastAccessAt: dateToIso(user.lastAccessAt),
        name: user.name,
        phone: user.phone,
        projectAccesses: user.projectAccesses.map((access) => ({
          code: access.project.code,
          id: access.project.id,
          status: access.status,
          title: access.project.title,
        })),
        status: user.status,
      })),
      options: clients.map((client) => ({
        displayName: getClientDisplayName(client),
        id: client.id,
        projects: client.projects.map((project) => ({
          code: project.code,
          id: project.id,
          status: project.status,
          title: project.title,
        })),
      })),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
      recentDocuments: recentDocuments.map((document) => ({
        client: {
          displayName: getClientDisplayName(document.client),
          id: document.client.id,
        },
        id: document.id,
        name: document.name,
        project: document.project,
        type: document.type,
        uploadedAt: document.uploadedAt.toISOString(),
        visibleToClient: document.visibleToClient,
      })),
      recentMessages: recentMessages.map((message) => ({
        client: {
          displayName: getClientDisplayName(message.client),
          id: message.client.id,
        },
        createdAt: message.createdAt.toISOString(),
        id: message.id,
        message: message.message,
        portalUser: message.portalUser,
        project: message.project,
        readAt: dateToIso(message.readAt),
        sentBy: message.sentBy,
      })),
    };
  },

  async inviteUser(input: InviteClientPortalUserInput, actorUserId: string | null) {
    const client = await prisma.client.findFirst({
      select: {
        commercialName: true,
        firstName: true,
        id: true,
        lastName: true,
        legalName: true,
        projects: {
          select: {
            id: true,
          },
          where: {
            deletedAt: null,
            id: {
              in: input.projectIds,
            },
          },
        },
      },
      where: {
        deletedAt: null,
        id: input.clientId,
      },
    });

    if (!client) {
      throw new AppError("El cliente seleccionado no existe.", 404);
    }

    if (client.projects.length !== input.projectIds.length) {
      throw new AppError(
        "Uno o mas proyectos no pertenecen al cliente seleccionado.",
        400,
      );
    }

    const existingUser = await prisma.clientPortalUser.findUnique({
      where: {
        email: input.email,
      },
    });

    if (existingUser && existingUser.status === "ACTIVO") {
      throw new AppError(
        "Ya existe un usuario cliente activo con ese correo. Actualiza sus accesos desde el modulo.",
        400,
      );
    }

    const invitationToken = createPortalToken();
    const tokenHash = hashPortalToken(invitationToken);
    const expiresAt = new Date(Date.now() + CLIENT_PORTAL_INVITATION_DURATION_MS);

    const user = await prisma.$transaction(async (db) => {
      const upsertedUser = existingUser
        ? await db.clientPortalUser.update({
            data: {
              clientId: input.clientId,
              name: input.name,
              phone: input.phone,
              status: "INVITACION_ENVIADA",
            },
            where: {
              id: existingUser.id,
            },
          })
        : await db.clientPortalUser.create({
            data: {
              clientId: input.clientId,
              email: input.email,
              name: input.name,
              phone: input.phone,
              status: "INVITACION_ENVIADA",
            },
          });

      await db.clientPortalProjectAccess.deleteMany({
        where: {
          userId: upsertedUser.id,
        },
      });

      await db.clientPortalProjectAccess.createMany({
        data: input.projectIds.map((projectId) => ({
          permissionsJson: [...CLIENT_PORTAL_DEFAULT_PROJECT_PERMISSIONS],
          projectId,
          status: "ACTIVO",
          userId: upsertedUser.id,
        })),
      });

      await db.clientPortalInvitationToken.create({
        data: {
          createdByUserId: actorUserId,
          expiresAt,
          tokenHash,
          userId: upsertedUser.id,
        },
      });

      return upsertedUser;
    });

    await emailService.sendEmail({
      html: buildInvitationEmailHtml({
        clientName: getClientDisplayName(client),
        link: buildInvitationLink(invitationToken),
        userName: input.name,
      }),
      subject: "Invitacion al Portal del Cliente",
      text: `Hola ${input.name}. Activa tu acceso al portal aqui: ${buildInvitationLink(invitationToken)}`,
      to: input.email,
    });

    return {
      client: {
        displayName: getClientDisplayName(client),
        id: client.id,
      },
      email: user.email,
      expiresAt: expiresAt.toISOString(),
      id: user.id,
      name: user.name,
      phone: user.phone,
      projectIds: input.projectIds,
      status: user.status,
    };
  },

  async updateUser(userId: string, input: UpdateClientPortalUserInput) {
    const currentUser = await prisma.clientPortalUser.findUnique({
      include: {
        projectAccesses: true,
      },
      where: {
        id: userId,
      },
    });

    if (!currentUser) {
      throw new AppError("No se encontro el usuario del portal.", 404);
    }

    if (input.projectIds) {
      const projectCount = await prisma.project.count({
        where: {
          clientId: currentUser.clientId,
          deletedAt: null,
          id: {
            in: input.projectIds,
          },
        },
      });

      if (projectCount !== input.projectIds.length) {
        throw new AppError(
          "Uno o mas proyectos no pertenecen al cliente del usuario.",
          400,
        );
      }
    }

    await prisma.$transaction(async (db) => {
      await db.clientPortalUser.update({
        data: {
          ...(input.name !== undefined
            ? {
                name: input.name,
              }
            : {}),
          ...(input.phone !== undefined
            ? {
                phone: input.phone,
              }
            : {}),
          ...(input.status !== undefined
            ? {
                status: input.status,
              }
            : {}),
        },
        where: {
          id: userId,
        },
      });

      if (input.projectIds) {
        await db.clientPortalProjectAccess.deleteMany({
          where: {
            userId,
          },
        });

        await db.clientPortalProjectAccess.createMany({
          data: input.projectIds.map((projectId) => ({
            permissionsJson: [...CLIENT_PORTAL_DEFAULT_PROJECT_PERMISSIONS],
            projectId,
            status: "ACTIVO",
            userId,
          })),
        });
      }
    });

    return getPortalUserContext(userId).then(buildPortalUserSummary);
  },

  async changeUserStatus(userId: string, input: ChangeClientPortalUserStatusInput) {
    const user = await prisma.clientPortalUser.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new AppError("No se encontro el usuario del portal.", 404);
    }

    await prisma.clientPortalUser.update({
      data: {
        status: input.status,
      },
      where: {
        id: userId,
      },
    });

    return {
      id: userId,
      motivo: input.motivo,
      status: input.status,
    };
  },

  async createDocument(
    input: CreateClientPortalDocumentInput,
    file: PortalUploadFile,
    actorUserId: string | null,
  ) {
    const client = await prisma.client.findFirst({
      select: {
        id: true,
      },
      where: {
        deletedAt: null,
        id: input.clientId,
      },
    });

    if (!client) {
      throw new AppError("El cliente seleccionado no existe.", 404);
    }

    if (input.projectId) {
      const project = await prisma.project.findFirst({
        select: {
          id: true,
        },
        where: {
          clientId: input.clientId,
          deletedAt: null,
          id: input.projectId,
        },
      });

      if (!project) {
        throw new AppError("El proyecto seleccionado no pertenece al cliente.", 400);
      }
    }

    const storedFile = await storePortalFile(file);

    const document = await prisma.clientPortalDocument.create({
      data: {
        clientId: input.clientId,
        fileUrl: storedFile.fileUrl,
        mimeType: storedFile.mimeType,
        name: input.name,
        projectId: input.projectId,
        sizeBytes: storedFile.sizeBytes,
        type: input.type,
        uploadedByUserId: actorUserId,
        visibleToClient: input.visibleToClient,
      },
      include: {
        project: {
          select: {
            code: true,
            id: true,
            title: true,
          },
        },
      },
    });

    return {
      fileUrl: document.fileUrl,
      id: document.id,
      name: document.name,
      project: document.project,
      type: document.type,
      uploadedAt: document.uploadedAt.toISOString(),
      visibleToClient: document.visibleToClient,
    };
  },

  async createInternalMessage(
    input: CreateInternalClientPortalMessageInput,
    actorUserId: string,
    file?: PortalUploadFile,
  ) {
    const project = await prisma.project.findFirst({
      select: {
        clientId: true,
        code: true,
        id: true,
        title: true,
      },
      where: {
        deletedAt: null,
        id: input.projectId,
      },
    });

    if (!project) {
      throw new AppError("El proyecto seleccionado no existe.", 404);
    }

    const attachment = file ? await storePortalFile(file) : null;

    const message = await prisma.clientPortalMessage.create({
      data: {
        attachmentMimeType: attachment?.mimeType ?? null,
        attachmentName: attachment?.fileName ?? null,
        attachmentSizeBytes: attachment?.sizeBytes ?? null,
        clientId: project.clientId,
        fileUrl: attachment?.fileUrl ?? null,
        internalUserId: actorUserId,
        message: input.mensaje,
        projectId: project.id,
        sentBy: "EQUIPO_INTERNO",
      },
    });

    return {
      createdAt: message.createdAt.toISOString(),
      id: message.id,
    };
  },

  async getDashboard(userId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    const projectIds = getAccessibleProjectIds(context);

    const [
      quotations,
      activeProjectCount,
      installations,
      documents,
      openCases,
      activeWarranties,
    ] = await Promise.all([
      buildPortalQuotations(context),
      prisma.project.count({
        where: {
          deletedAt: null,
          id: {
            in: projectIds,
          },
          status: {
            in: [
              "LEAD",
              "MEASUREMENT_PENDING",
              "QUOTATION_PENDING",
              "QUOTED",
              "APPROVED",
              "PURCHASE_PENDING",
              "PRODUCTION_PENDING",
              "IN_PRODUCTION",
              "INSTALLATION_PENDING",
              "IN_INSTALLATION",
            ],
          },
        },
      }),
      prisma.installationOrder.findMany({
        include: {
          address: {
            select: {
              address: true,
              label: true,
            },
          },
          project: {
            select: {
              code: true,
              id: true,
              title: true,
            },
          },
        },
        orderBy: [
          {
            scheduledDate: "asc",
          },
        ],
        take: 5,
        where: {
          clientId: context.client.id,
          status: {
            in: ["SCHEDULED", "EN_ROUTE", "IN_INSTALLATION", "PAUSED", "RESCHEDULED"],
          },
          ...(projectIds.length > 0
            ? {
                OR: [
                  {
                    projectId: null,
                  },
                  {
                    projectId: {
                      in: projectIds,
                    },
                  },
                ],
              }
            : {}),
        },
      }),
      buildPortalDocuments(context),
      prisma.postventaCase.count({
        where: {
          clientId: context.client.id,
          status: {
            in: [
              "REPORTADO",
              "EN_REVISION",
              "VISITA_PROGRAMADA",
              "EN_ATENCION",
              "PENDIENTE_REPUESTO",
            ],
          },
          ...(projectIds.length > 0
            ? {
                OR: [
                  {
                    projectId: null,
                  },
                  {
                    projectId: {
                      in: projectIds,
                    },
                  },
                ],
              }
            : {}),
        },
      }),
      prisma.productWarranty.count({
        where: {
          clientId: context.client.id,
          status: "VIGENTE",
          ...(projectIds.length > 0
            ? {
                projectId: {
                  in: projectIds,
                },
              }
            : {}),
        },
      }),
    ]);

    return {
      cliente: {
        displayName: getClientDisplayName(context.client),
        id: context.client.id,
      },
      contadores: {
        casosPostventaAbiertos: openCases,
        cotizacionesPendientes: quotations.filter((quotation) =>
          ["APPROVED", "SENT"].includes(quotation.status),
        ).length,
        documentosDisponibles: documents.length,
        garantiasVigentes: activeWarranties,
        instalacionesProximas: installations.length,
        proyectosActivos: activeProjectCount,
      },
      instalacionesProximas: installations.map((installation) => ({
        address: installation.address,
        code: installation.code,
        id: installation.id,
        project: installation.project,
        scheduledDate: installation.scheduledDate.toISOString(),
        scheduledEndTime: installation.scheduledEndTime,
        scheduledStartTime: installation.scheduledStartTime,
        status: installation.status,
      })),
      resumenCotizaciones: quotations.slice(0, 5),
      resumenDocumentos: documents.slice(0, 5),
    };
  },

  async listQuotations(userId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    return buildPortalQuotations(context);
  },

  async getQuotation(userId: string, quotationId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    const quotation = await quotationsService.getQuotationById(quotationId, {
      canViewCost: false,
    });

    if (quotation.client.id !== context.client.id) {
      throw new AppError("No tienes acceso a la cotizacion solicitada.", 403);
    }

    assertProjectBelongsToPortalUser(context, quotation.project?.id);

    return mapQuotationDetailToPortal(quotation);
  },

  async decideQuotation(
    userId: string,
    quotationId: string,
    input: ClientPortalQuotationDecisionInput,
  ) {
    const context = await ensurePortalUserCanAccess(userId);
    const quotation = await quotationsService.getQuotationById(quotationId, {
      canViewCost: false,
    });

    if (quotation.client.id !== context.client.id) {
      throw new AppError("No tienes acceso a la cotizacion solicitada.", 403);
    }

    assertProjectBelongsToPortalUser(context, quotation.project?.id);

    const result = await quotationsService.changeQuotationStatus(
      quotationId,
      {
        notes: input.motivo,
        toStatus: input.decision === "ACEPTAR" ? "ACCEPTED" : "REJECTED",
      },
      {
        canApprove: false,
        canSend: false,
        canViewCost: false,
        userId: null,
      },
    );

    return {
      decision: input.decision,
      quotation: mapQuotationDetailToPortal(result.quotation),
    };
  },

  async prepareQuotationPdf(userId: string, quotationId: string) {
    const quotation = await this.getQuotation(userId, quotationId);
    await registerDocumentDownload(userId, {
      referenceId: quotationId,
      referenceKey: "COTIZACION",
    });

    return quotation;
  },

  async listProjects(userId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    const projectIds = getAccessibleProjectIds(context);

    const projects = await prisma.project.findMany({
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],
      select: {
        code: true,
        expectedDeliveryDate: true,
        expectedInstallationDate: true,
        expectedMeasurementDate: true,
        id: true,
        priority: true,
        projectType: true,
        status: true,
        title: true,
        updatedAt: true,
      },
      where: {
        deletedAt: null,
        id: {
          in: projectIds,
        },
      },
    });

    return projects.map((project) => ({
      avanceGeneral: projectStatusProgressMap[project.status] ?? 0,
      code: project.code,
      expectedDeliveryDate: dateToIso(project.expectedDeliveryDate),
      expectedInstallationDate: dateToIso(project.expectedInstallationDate),
      expectedMeasurementDate: dateToIso(project.expectedMeasurementDate),
      id: project.id,
      priority: project.priority,
      projectType: project.projectType,
      status: project.status,
      title: project.title,
      updatedAt: project.updatedAt.toISOString(),
    }));
  },

  async getProject(userId: string, projectId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    assertProjectBelongsToPortalUser(context, projectId);

    const [project, approvedMeasurementRequests, installations] = await Promise.all([
      prisma.project.findFirst({
        include: {
          attachments: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              attachmentType: true,
              createdAt: true,
              description: true,
              fileName: true,
              fileUrl: true,
              id: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
          measurements: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              createdAt: true,
              depthMm: true,
              heightMm: true,
              id: true,
              locationDescription: true,
              measurementDate: true,
              notes: true,
              quantity: true,
              widthMm: true,
            },
          },
          statusHistory: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              createdAt: true,
              fromStatus: true,
              id: true,
              reason: true,
              toStatus: true,
            },
            take: 20,
          },
        },
        where: {
          clientId: context.client.id,
          deletedAt: null,
          id: projectId,
        },
      }),
      prisma.measurementRequest.findMany({
        include: {
          technicalVisits: {
            include: {
              evidence: {
                orderBy: {
                  uploadedAt: "desc",
                },
                select: {
                  fileName: true,
                  fileUrl: true,
                  id: true,
                  type: true,
                  uploadedAt: true,
                },
              },
              openings: {
                orderBy: {
                  createdAt: "desc",
                },
                select: {
                  code: true,
                  depthMm: true,
                  elementType: true,
                  environment: true,
                  heightMm: true,
                  id: true,
                  observations: true,
                  quantity: true,
                  status: true,
                  widthMm: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        where: {
          clientId: context.client.id,
          projectId,
          status: "APPROVED",
        },
      }),
      prisma.installationOrder.findMany({
        orderBy: {
          scheduledDate: "desc",
        },
        select: {
          code: true,
          id: true,
          scheduledDate: true,
          scheduledEndTime: true,
          scheduledStartTime: true,
          status: true,
        },
        where: {
          clientId: context.client.id,
          deletedAt: null,
          projectId,
        },
      }),
    ]);

    if (!project) {
      throw new AppError("No se encontro el proyecto solicitado.", 404);
    }

    return {
      attachments: project.attachments.map((attachment) => ({
        attachmentType: attachment.attachmentType,
        createdAt: attachment.createdAt.toISOString(),
        description: attachment.description,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        id: attachment.id,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      })),
      approvedMeasurements: approvedMeasurementRequests.map((request) => ({
        code: request.code,
        id: request.id,
        requestedDate: request.requestedDate.toISOString(),
        scheduledDate: dateToIso(request.scheduledDate),
        scheduledEndTime: request.scheduledEndTime,
        scheduledStartTime: request.scheduledStartTime,
        status: request.status,
        visits: request.technicalVisits.map((visit) => ({
          evidence: visit.evidence.map((evidence) => ({
            fileName: evidence.fileName,
            fileUrl: evidence.fileUrl,
            id: evidence.id,
            type: evidence.type,
            uploadedAt: evidence.uploadedAt.toISOString(),
          })),
          id: visit.id,
          openings: visit.openings.map((opening) => ({
            code: opening.code,
            depthMm: decimalToNumber(opening.depthMm),
            elementType: opening.elementType,
            environment: opening.environment,
            heightMm: decimalToNumber(opening.heightMm),
            id: opening.id,
            observations: opening.observations,
            quantity: opening.quantity,
            status: opening.status,
            widthMm: decimalToNumber(opening.widthMm),
          })),
        })),
      })),
      avanceGeneral: projectStatusProgressMap[project.status] ?? 0,
      code: project.code,
      description: project.description,
      expectedDeliveryDate: dateToIso(project.expectedDeliveryDate),
      expectedInstallationDate: dateToIso(project.expectedInstallationDate),
      expectedMeasurementDate: dateToIso(project.expectedMeasurementDate),
      id: project.id,
      installations: installations.map((installation) => ({
        code: installation.code,
        id: installation.id,
        scheduledDate: installation.scheduledDate.toISOString(),
        scheduledEndTime: installation.scheduledEndTime,
        scheduledStartTime: installation.scheduledStartTime,
        status: installation.status,
      })),
      measurements: project.measurements.map((measurement) => ({
        createdAt: measurement.createdAt.toISOString(),
        depthMm: decimalToNumber(measurement.depthMm),
        heightMm: decimalToNumber(measurement.heightMm),
        id: measurement.id,
        locationDescription: measurement.locationDescription,
        measurementDate: dateToIso(measurement.measurementDate),
        notes: measurement.notes,
        quantity: measurement.quantity,
        widthMm: decimalToNumber(measurement.widthMm),
      })),
      priority: project.priority,
      projectType: project.projectType,
      siteAddress: project.siteAddress,
      status: project.status,
      statusHistory: project.statusHistory.map((item) => ({
        createdAt: item.createdAt.toISOString(),
        fromStatus: item.fromStatus,
        id: item.id,
        reason: item.reason,
        toStatus: item.toStatus,
      })),
      title: project.title,
    };
  },

  async listInstallations(userId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    const projectIds = getAccessibleProjectIds(context);

    const orders = await prisma.installationOrder.findMany({
      include: {
        address: {
          select: {
            address: true,
            city: true,
            label: true,
          },
        },
        project: {
          select: {
            code: true,
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        scheduledDate: "desc",
      },
      where: {
        clientId: context.client.id,
        deletedAt: null,
        ...(projectIds.length > 0
          ? {
              OR: [
                {
                  projectId: null,
                },
                {
                  projectId: {
                    in: projectIds,
                  },
                },
              ],
            }
          : {}),
      },
    });

    return orders.map((order) => ({
      address: order.address,
      code: order.code,
      id: order.id,
      installationType: order.installationType,
      notes: order.notes,
      project: order.project,
      scheduledDate: order.scheduledDate.toISOString(),
      scheduledEndTime: order.scheduledEndTime,
      scheduledStartTime: order.scheduledStartTime,
      status: order.status,
    }));
  },

  async getInstallation(userId: string, orderId: string) {
    const context = await ensurePortalUserCanAccess(userId);

    const order = await prisma.installationOrder.findFirst({
      include: {
        address: {
          select: {
            address: true,
            city: true,
            id: true,
            label: true,
          },
        },
        evidence: {
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            description: true,
            fileName: true,
            fileUrl: true,
            id: true,
            mimeType: true,
            sizeBytes: true,
            type: true,
            uploadedAt: true,
          },
        },
        issues: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            description: true,
            id: true,
            severity: true,
            status: true,
            type: true,
          },
        },
        project: {
          select: {
            code: true,
            id: true,
            title: true,
          },
        },
        tasks: {
          orderBy: {
            sortOrder: "asc",
          },
          select: {
            completedAt: true,
            description: true,
            estimatedMinutes: true,
            id: true,
            sortOrder: true,
            status: true,
            title: true,
          },
        },
      },
      where: {
        clientId: context.client.id,
        deletedAt: null,
        id: orderId,
      },
    });

    if (!order) {
      throw new AppError("No se encontro la instalacion solicitada.", 404);
    }

    assertProjectBelongsToPortalUser(context, order.project?.id);

    return {
      address: order.address,
      code: order.code,
      evidence: order.evidence.map((evidence) => ({
        description: evidence.description,
        fileName: evidence.fileName,
        fileUrl: evidence.fileUrl,
        id: evidence.id,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.sizeBytes,
        type: evidence.type,
        uploadedAt: evidence.uploadedAt.toISOString(),
      })),
      id: order.id,
      installationType: order.installationType,
      issues: order.issues,
      notes: order.notes,
      project: order.project,
      scheduledDate: order.scheduledDate.toISOString(),
      scheduledEndTime: order.scheduledEndTime,
      scheduledStartTime: order.scheduledStartTime,
      status: order.status,
      tasks: order.tasks.map((task) => ({
        completedAt: dateToIso(task.completedAt),
        description: task.description,
        estimatedMinutes: task.estimatedMinutes,
        id: task.id,
        sortOrder: task.sortOrder,
        status: task.status,
        title: task.title,
      })),
    };
  },

  async prepareInstallationReport(userId: string, orderId: string) {
    const order = await this.getInstallation(userId, orderId);
    await registerDocumentDownload(userId, {
      referenceId: orderId,
      referenceKey: "REPORTE_INSTALACION",
    });

    return order;
  },

  async listWarranties(userId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    const projectIds = getAccessibleProjectIds(context);

    const warranties = await prisma.productWarranty.findMany({
      include: {
        project: {
          select: {
            code: true,
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        endDate: "desc",
      },
      where: {
        clientId: context.client.id,
        ...(projectIds.length > 0
          ? {
              projectId: {
                in: projectIds,
              },
            }
          : {}),
      },
    });

    return warranties.map((warranty) => ({
      conditions: warranty.conditions,
      endDate: warranty.endDate.toISOString(),
      estaVigente: warranty.status === "VIGENTE",
      id: warranty.id,
      productType: warranty.productType,
      project: warranty.project,
      startDate: warranty.startDate.toISOString(),
      status: warranty.status,
    }));
  },

  async prepareWarrantyDocument(userId: string, warrantyId: string) {
    const context = await ensurePortalUserCanAccess(userId);

    const warranty = await prisma.productWarranty.findFirst({
      include: {
        client: {
          select: {
            commercialName: true,
            firstName: true,
            id: true,
            lastName: true,
            legalName: true,
          },
        },
        project: {
          select: {
            code: true,
            id: true,
            title: true,
          },
        },
      },
      where: {
        clientId: context.client.id,
        id: warrantyId,
      },
    });

    if (!warranty) {
      throw new AppError("No se encontro la garantia solicitada.", 404);
    }

    assertProjectBelongsToPortalUser(context, warranty.projectId);

    await registerDocumentDownload(userId, {
      referenceId: warranty.id,
      referenceKey: "GARANTIA",
    });

    return {
      client: {
        displayName: getClientDisplayName(warranty.client),
        id: warranty.client.id,
      },
      conditions: warranty.conditions,
      endDate: warranty.endDate.toISOString(),
      id: warranty.id,
      productType: warranty.productType,
      project: warranty.project,
      startDate: warranty.startDate.toISOString(),
      status: warranty.status,
    };
  },

  async listPostventaCases(userId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    const projectIds = getAccessibleProjectIds(context);

    const cases = await prisma.postventaCase.findMany({
      include: {
        evidences: {
          select: {
            id: true,
          },
        },
        installation: {
          select: {
            code: true,
            id: true,
            scheduledDate: true,
            status: true,
          },
        },
        project: {
          select: {
            code: true,
            id: true,
            status: true,
            title: true,
          },
        },
        warranty: {
          select: {
            endDate: true,
            id: true,
            productType: true,
            startDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        reportedAt: "desc",
      },
      where: {
        clientId: context.client.id,
        ...(projectIds.length > 0
          ? {
              OR: [
                {
                  projectId: null,
                },
                {
                  projectId: {
                    in: projectIds,
                  },
                },
              ],
            }
          : {}),
      },
    });

    return cases.map((item) => ({
      code: item.code,
      commitmentDate: dateToIso(item.commitmentDate),
      description: item.description,
      evidenceCount: item.evidences.length,
      id: item.id,
      installation: item.installation
        ? {
            code: item.installation.code,
            id: item.installation.id,
            scheduledDate: item.installation.scheduledDate.toISOString(),
            status: item.installation.status,
          }
        : null,
      priority: item.priority,
      project: item.project,
      proposedSolution: item.proposedSolution,
      reportedAt: item.reportedAt.toISOString(),
      status: item.status,
      type: item.caseType,
      warranty: item.warranty
        ? {
            endDate: item.warranty.endDate.toISOString(),
            id: item.warranty.id,
            productType: item.warranty.productType,
            startDate: item.warranty.startDate.toISOString(),
            status: item.warranty.status,
          }
        : null,
    }));
  },

  async getPostventaCase(userId: string, caseId: string) {
    const context = await ensurePortalUserCanAccess(userId);

    const item = await prisma.postventaCase.findFirst({
      include: {
        activities: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
            description: true,
            executedAt: true,
            id: true,
            scheduledAt: true,
            status: true,
            activityType: true,
          },
        },
        evidences: {
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            description: true,
            fileName: true,
            fileUrl: true,
            id: true,
            mimeType: true,
            sizeBytes: true,
            uploadedAt: true,
          },
        },
        installation: {
          select: {
            code: true,
            id: true,
            scheduledDate: true,
            status: true,
          },
        },
        project: {
          select: {
            code: true,
            id: true,
            status: true,
            title: true,
          },
        },
        quotation: {
          select: {
            code: true,
            id: true,
            status: true,
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
            fromStatus: true,
            id: true,
            notes: true,
            toStatus: true,
          },
        },
        warranty: {
          select: {
            endDate: true,
            id: true,
            productType: true,
            startDate: true,
            status: true,
          },
        },
      },
      where: {
        clientId: context.client.id,
        id: caseId,
      },
    });

    if (!item) {
      throw new AppError("No se encontro el caso postventa solicitado.", 404);
    }

    assertProjectBelongsToPortalUser(context, item.projectId);

    return {
      activities: item.activities.map((activity) => ({
        createdAt: activity.createdAt.toISOString(),
        description: activity.description,
        executedAt: dateToIso(activity.executedAt),
        id: activity.id,
        scheduledAt: dateToIso(activity.scheduledAt),
        status: activity.status,
        type: activity.activityType,
      })),
      code: item.code,
      commitmentDate: dateToIso(item.commitmentDate),
      description: item.description,
      evidences: item.evidences.map((evidence) => ({
        description: evidence.description,
        fileName: evidence.fileName,
        fileUrl: evidence.fileUrl,
        id: evidence.id,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.sizeBytes,
        uploadedAt: evidence.uploadedAt.toISOString(),
      })),
      id: item.id,
      installation: item.installation
        ? {
            code: item.installation.code,
            id: item.installation.id,
            scheduledDate: item.installation.scheduledDate.toISOString(),
            status: item.installation.status,
          }
        : null,
      priority: item.priority,
      project: item.project,
      proposedSolution: item.proposedSolution,
      quotation: item.quotation,
      reportedAt: item.reportedAt.toISOString(),
      status: item.status,
      statusHistory: item.statusHistory.map((history) => ({
        createdAt: history.createdAt.toISOString(),
        fromStatus: history.fromStatus,
        id: history.id,
        notes: history.notes,
        toStatus: history.toStatus,
      })),
      type: item.caseType,
      warranty: item.warranty
        ? {
            endDate: item.warranty.endDate.toISOString(),
            id: item.warranty.id,
            productType: item.warranty.productType,
            startDate: item.warranty.startDate.toISOString(),
            status: item.warranty.status,
          }
        : null,
    };
  },

  async createPostventaCase(
    userId: string,
    input: CreatePortalPostventaCaseInput,
    file?: PortalUploadFile,
  ) {
    const context = await ensurePortalUserCanAccess(userId);
    assertProjectBelongsToPortalUser(context, input.projectId);

    const created = await postventaService.createCase(
      {
        clientId: context.client.id,
        commitmentDate: null,
        description: input.descripcion,
        installationId: input.installationId,
        internalNotes: null,
        outsideWarranty: false,
        priority: input.prioridad,
        projectId: input.projectId,
        proposedSolution: null,
        quotationId: input.quotationId,
        reportedAt: input.reportedAt,
        responsibleId: null,
        type: input.tipo,
        warrantyId: input.warrantyId,
      },
      null,
    );

    if (file) {
      await postventaService.createEvidence(
        created.id,
        {
          activityId: null,
          description: "Evidencia adjunta desde el Portal del Cliente.",
          mimetype: file.mimetype ?? null,
          originalName: file.originalName,
          size: file.size,
          type: resolvePortalPostventaEvidenceType(file),
        },
        {
          buffer: file.buffer,
          mimetype: file.mimetype ?? "",
          originalName: file.originalName,
          size: file.size,
        },
        null,
      );
    }

    return this.getPostventaCase(userId, created.id);
  },

  async listDocuments(userId: string) {
    const context = await ensurePortalUserCanAccess(userId);
    return buildPortalDocuments(context);
  },

  async prepareDocumentDownload(userId: string, documentId: string) {
    const documents = await this.listDocuments(userId);
    const document = documents.find((item) => item.referenceId === documentId || item.id.endsWith(documentId));

    if (!document) {
      throw new AppError("No se encontro el documento solicitado.", 404);
    }

    await registerDocumentDownload(userId, {
      documentId:
        document.referenceKey === "MANUAL" ? document.referenceId : null,
      referenceId: document.referenceId,
      referenceKey: document.referenceKey,
    });

    return document;
  },

  async listMessages(userId: string, query: ListPortalMessagesQuery) {
    const context = await ensurePortalUserCanAccess(userId);
    assertProjectBelongsToPortalUser(context, query.projectId);

    const where: Prisma.ClientPortalMessageWhereInput = {
      clientId: context.client.id,
      ...(query.projectId
        ? {
            projectId: query.projectId,
          }
        : {
            projectId: {
              in: getAccessibleProjectIds(context),
            },
          }),
    };

    if (query.projectId) {
      await prisma.clientPortalMessage.updateMany({
        data: {
          readAt: new Date(),
        },
        where: {
          ...where,
          readAt: null,
          sentBy: "EQUIPO_INTERNO",
        },
      });
    }

    const messages = await prisma.clientPortalMessage.findMany({
      include: {
        portalUser: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
        project: {
          select: {
            code: true,
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      where,
    });

    return messages.map((message) => ({
      attachmentName: message.attachmentName,
      attachmentSizeBytes: message.attachmentSizeBytes,
      createdAt: message.createdAt.toISOString(),
      fileUrl: message.fileUrl,
      id: message.id,
      message: message.message,
      portalUser: message.portalUser,
      project: message.project,
      readAt: dateToIso(message.readAt),
      sentBy: message.sentBy,
    }));
  },

  async createMessage(
    userId: string,
    input: CreateClientPortalMessageInput,
    file?: PortalUploadFile,
  ) {
    const context = await ensurePortalUserCanAccess(userId);
    assertProjectBelongsToPortalUser(context, input.projectId);

    const project = await prisma.project.findFirst({
      select: {
        code: true,
        id: true,
        responsibleUserId: true,
        salesUserId: true,
        title: true,
      },
      where: {
        clientId: context.client.id,
        deletedAt: null,
        id: input.projectId,
      },
    });

    if (!project) {
      throw new AppError("No se encontro el proyecto indicado.", 404);
    }

    const attachment = file ? await storePortalFile(file) : null;

    const message = await prisma.clientPortalMessage.create({
      data: {
        attachmentMimeType: attachment?.mimeType ?? null,
        attachmentName: attachment?.fileName ?? null,
        attachmentSizeBytes: attachment?.sizeBytes ?? null,
        clientId: context.client.id,
        fileUrl: attachment?.fileUrl ?? null,
        message: input.mensaje,
        portalUserId: userId,
        projectId: project.id,
        sentBy: "CLIENTE",
      },
    });

    const internalUserIds = Array.from(
      new Set([project.responsibleUserId, project.salesUserId].filter(Boolean)),
    ) as string[];

    await notificationService.createMany({
      message: `${context.name} envio un mensaje desde el Portal del Cliente para el proyecto ${project.code}.`,
      title: "Nuevo mensaje del portal del cliente",
      type: "info",
      userIds: internalUserIds,
    });

    return {
      createdAt: message.createdAt.toISOString(),
      id: message.id,
    };
  },
};
