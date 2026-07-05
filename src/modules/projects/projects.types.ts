import type { z } from "zod";

import type {
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

export type ProjectType =
  | "WINDOW"
  | "DOOR"
  | "SHOWER"
  | "FACADE"
  | "RAILING"
  | "MIRROR"
  | "CUSTOM"
  | "SERVICE";

export type ProjectStatus =
  | "LEAD"
  | "MEASUREMENT_PENDING"
  | "QUOTATION_PENDING"
  | "QUOTED"
  | "APPROVED"
  | "PURCHASE_PENDING"
  | "PRODUCTION_PENDING"
  | "IN_PRODUCTION"
  | "INSTALLATION_PENDING"
  | "IN_INSTALLATION"
  | "COMPLETED"
  | "CANCELLED"
  | "ON_HOLD";

export type ProjectPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type ProjectNoteVisibility = "INTERNAL" | "CLIENT_VISIBLE";
export type ProjectAttachmentType =
  | "PHOTO"
  | "PLAN"
  | "MEASUREMENT"
  | "CONTRACT"
  | "QUOTATION"
  | "OTHER";

export type ProjectClientSummary = {
  clientType: "INDIVIDUAL" | "COMPANY";
  displayName: string;
  id: string;
};

export type ProjectUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type ProjectStatusHistoryRecord = {
  changedByUser: ProjectUserSummary;
  createdAt: string;
  fromStatus: ProjectStatus | null;
  id: string;
  metadataJson: unknown;
  reason: string | null;
  toStatus: ProjectStatus;
};

export type ProjectNoteRecord = {
  createdAt: string;
  id: string;
  note: string;
  updatedAt: string;
  user: ProjectUserSummary;
  visibility: ProjectNoteVisibility;
};

export type ProjectAttachmentRecord = {
  attachmentType: ProjectAttachmentType;
  createdAt: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  id: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByUser: ProjectUserSummary;
};

export type ProjectMeasurementRecord = {
  createdAt: string;
  depthMm: number | null;
  heightMm: number | null;
  id: string;
  locationDescription: string | null;
  measuredByUser: ProjectUserSummary;
  measurementDate: string | null;
  notes: string | null;
  quantity: number;
  rawJson: unknown;
  updatedAt: string;
  widthMm: number | null;
};

export type ProjectSummaryRecord = {
  allowedTransitions: ProjectStatus[];
  attachmentCount: number;
  lastStatusChangeAt: string | null;
  measurementCount: number;
  noteCount: number;
  statusHistoryCount: number;
};

export type ProjectListItem = {
  client: ProjectClientSummary;
  code: string;
  createdAt: string;
  expectedDeliveryDate: string | null;
  expectedInstallationDate: string | null;
  expectedMeasurementDate: string | null;
  id: string;
  priority: ProjectPriority;
  projectType: ProjectType;
  responsibleUser: ProjectUserSummary;
  salesUser: ProjectUserSummary;
  siteAddress: string | null;
  status: ProjectStatus;
  title: string;
  updatedAt: string;
};

export type ProjectDetailRecord = ProjectListItem & {
  attachments: ProjectAttachmentRecord[];
  availableTransitions: ProjectStatus[];
  city: string | null;
  deletedAt: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  measurements: ProjectMeasurementRecord[];
  notes: string | null;
  projectNotes: ProjectNoteRecord[];
  statusHistory: ProjectStatusHistoryRecord[];
  summary: ProjectSummaryRecord;
};

export type ProjectDashboardSummaryRecord = {
  activeProjects: number;
  approvedProjects: number;
  pendingInstallationProjects: number;
  pendingQuotationProjects: number;
  projectsInProduction: number;
};

export type ProjectUserOption = {
  email: string;
  id: string;
  name: string;
};

export type ProjectTransitionResult = {
  availableTransitions: ProjectStatus[];
  currentStatus: ProjectStatus;
  historyEntry: ProjectStatusHistoryRecord;
  projectId: string;
};

export type CreateProjectInput = z.infer<typeof projectMutationSchema>;
export type UpdateProjectInput = z.infer<typeof projectMutationSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamSchema>;
export type TransitionProjectInput = z.infer<typeof projectTransitionSchema>;
export type CreateProjectNoteInput = z.infer<typeof projectNoteInputSchema>;
export type UpdateProjectNoteInput = z.infer<typeof projectNoteInputSchema>;
export type ProjectNoteParams = z.infer<typeof projectNoteParamsSchema>;
export type CreateProjectMeasurementInput = z.infer<typeof projectMeasurementInputSchema>;
export type UpdateProjectMeasurementInput = z.infer<typeof projectMeasurementInputSchema>;
export type ProjectMeasurementParams = z.infer<typeof projectMeasurementParamsSchema>;
export type CreateProjectAttachmentInput = z.infer<typeof projectAttachmentInputSchema>;
export type ProjectAttachmentParams = z.infer<typeof projectAttachmentParamsSchema>;
export type ProjectAttachmentUploadMetadata = z.infer<typeof projectFileUploadSchema>;
