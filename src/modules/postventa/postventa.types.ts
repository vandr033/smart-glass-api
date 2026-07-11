import type { z } from "zod";

import type {
  assignPostventaCaseSchema,
  changePostventaCaseStatusSchema,
  closePostventaCaseSchema,
  consumePostventaReservationSchema,
  createPostventaActivitySchema,
  createPostventaCaseSchema,
  createPostventaCostSchema,
  createPostventaReservationSchema,
  createProductWarrantySchema,
  listPostventaCasesQuerySchema,
  listProductWarrantiesQuerySchema,
  postventaActivityIdParamSchema,
  postventaCaseIdParamSchema,
  postventaEvidenceMetadataSchema,
  postventaReservationLinkIdParamSchema,
  productWarrantyIdParamSchema,
  updatePostventaActivitySchema,
  updatePostventaCaseSchema,
  updateProductWarrantySchema,
} from "./postventa.validators.js";
import type {
  POSTVENTA_ACTIVITY_STATUSES,
  POSTVENTA_ACTIVITY_TYPES,
  POSTVENTA_CASE_STATUSES,
  POSTVENTA_CASE_TYPES,
  POSTVENTA_COST_CATEGORIES,
  POSTVENTA_COST_ORIGINS,
  POSTVENTA_EVIDENCE_TYPES,
  POSTVENTA_PRIORITIES,
  PRODUCT_WARRANTY_STATUSES,
} from "./postventa.constants.js";

export type PostventaCaseType = (typeof POSTVENTA_CASE_TYPES)[number];
export type PostventaCaseStatus = (typeof POSTVENTA_CASE_STATUSES)[number];
export type PostventaPriority = (typeof POSTVENTA_PRIORITIES)[number];
export type ProductWarrantyStatus = (typeof PRODUCT_WARRANTY_STATUSES)[number];
export type PostventaActivityType = (typeof POSTVENTA_ACTIVITY_TYPES)[number];
export type PostventaActivityStatus =
  (typeof POSTVENTA_ACTIVITY_STATUSES)[number];
export type PostventaEvidenceType = (typeof POSTVENTA_EVIDENCE_TYPES)[number];
export type PostventaCostCategory = (typeof POSTVENTA_COST_CATEGORIES)[number];
export type PostventaCostOrigin = (typeof POSTVENTA_COST_ORIGINS)[number];

export type PostventaUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type PostventaClientSummary = {
  clientType: "COMPANY" | "INDIVIDUAL";
  displayName: string;
  id: string;
};

export type PostventaProjectSummary = {
  code: string;
  id: string;
  status:
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
  title: string;
} | null;

export type PostventaQuotationSummary = {
  code: string;
  id: string;
  status: string;
} | null;

export type PostventaInstallationSummary = {
  code: string;
  id: string;
  scheduledDate: string | null;
  status: string;
} | null;

export type ProductWarrantyRecord = {
  caseCount: number;
  client: PostventaClientSummary;
  conditions: string | null;
  createdAt: string;
  endDate: string;
  estaVigente: boolean;
  id: string;
  productType: string;
  project: PostventaProjectSummary;
  startDate: string;
  status: ProductWarrantyStatus;
  updatedAt: string;
};

export type PostventaActivityRecord = {
  createdAt: string;
  description: string;
  executedAt: string | null;
  id: string;
  postventaCaseId: string;
  responsible: PostventaUserSummary;
  scheduledAt: string | null;
  status: PostventaActivityStatus;
  type: PostventaActivityType;
  updatedAt: string;
};

export type PostventaEvidenceRecord = {
  activityId: string | null;
  createdAt?: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  id: string;
  mimeType: string | null;
  postventaCaseId: string;
  sizeBytes: number | null;
  type: PostventaEvidenceType;
  uploadedAt: string;
  uploadedBy: PostventaUserSummary;
};

export type PostventaCostRecord = {
  amount: number;
  category: PostventaCostCategory;
  costDate: string;
  description: string;
  id: string;
  origin: PostventaCostOrigin;
  postventaCaseId: string;
  referenceId: string | null;
};

export type PostventaStatusHistoryRecord = {
  changedBy: PostventaUserSummary;
  createdAt: string;
  fromStatus: PostventaCaseStatus | null;
  id: string;
  metadataJson: unknown;
  notes: string | null;
  postventaCaseId: string;
  toStatus: PostventaCaseStatus;
};

export type PostventaReservationRecord = {
  createdAt: string;
  id: string;
  inventoryReservation: {
    createdAt: string;
    expiresAt: string | null;
    id: string;
    inventoryStock: {
      condition: string;
      id: string;
      locationCode: string | null;
      stockType: string;
    } | null;
    material: {
      code: string;
      id: string;
      materialType: "LINEAR" | "PACKAGE" | "SERVICE" | "SHEET" | "UNIT";
      name: string;
    };
    project: {
      code: string;
      id: string;
      title: string;
    } | null;
    quantity: number;
    quotation: {
      code: string;
      id: string;
      status: string;
    } | null;
    reservationType: "SOFT" | "FIRM";
    reservedByUser: PostventaUserSummary;
    status: "ACTIVE" | "RELEASED" | "CONSUMED" | "EXPIRED" | "CANCELLED";
    unit: "MM" | "CM" | "M" | "M2" | "UNIT" | "PACKAGE" | "KG" | "LITER" | "HOUR" | "DAY";
    updatedAt: string;
    warehouse: {
      code: string;
      id: string;
      name: string;
    };
  };
  notes: string | null;
};

export type PostventaImpactoFinancieroRecord = {
  costoGarantia: number;
  costoReclamo: number;
  costoReposicion: number;
  costoTotal: number;
  porcentajeSobreUtilidad: number | null;
  porcentajeSobreVenta: number | null;
  utilidadProyecto: number | null;
  ventaProyecto: number | null;
};

export type PostventaCaseListItem = {
  activityPendingCount: number;
  client: PostventaClientSummary;
  closedAt: string | null;
  code: string;
  commitmentDate: string | null;
  createdAt: string;
  createdBy: PostventaUserSummary;
  descripcionCorta: string;
  evidenceCount: number;
  id: string;
  outsideWarranty: boolean;
  priority: PostventaPriority;
  project: PostventaProjectSummary;
  reportedAt: string;
  responsible: PostventaUserSummary;
  status: PostventaCaseStatus;
  totalCost: number;
  type: PostventaCaseType;
  updatedAt: string;
  warranty: ProductWarrantyRecord | null;
};

export type PostventaCaseDetailRecord = PostventaCaseListItem & {
  activities: PostventaActivityRecord[];
  costs: PostventaCostRecord[];
  description: string;
  evidences: PostventaEvidenceRecord[];
  financialImpact: PostventaImpactoFinancieroRecord;
  installation: PostventaInstallationSummary;
  internalNotes: string | null;
  inventoryReservations: PostventaReservationRecord[];
  proposedSolution: string | null;
  quotation: PostventaQuotationSummary;
  statusHistory: PostventaStatusHistoryRecord[];
};

export type CreatePostventaCaseInput = z.infer<typeof createPostventaCaseSchema>;
export type UpdatePostventaCaseInput = z.infer<typeof updatePostventaCaseSchema>;
export type AssignPostventaCaseInput = z.infer<typeof assignPostventaCaseSchema>;
export type ChangePostventaCaseStatusInput = z.infer<
  typeof changePostventaCaseStatusSchema
>;
export type ClosePostventaCaseInput = z.infer<typeof closePostventaCaseSchema>;
export type CreateProductWarrantyInput = z.infer<typeof createProductWarrantySchema>;
export type UpdateProductWarrantyInput = z.infer<typeof updateProductWarrantySchema>;
export type CreatePostventaActivityInput = z.infer<
  typeof createPostventaActivitySchema
>;
export type UpdatePostventaActivityInput = z.infer<
  typeof updatePostventaActivitySchema
>;
export type PostventaEvidenceMetadataInput = z.infer<
  typeof postventaEvidenceMetadataSchema
>;
export type CreatePostventaCostInput = z.infer<typeof createPostventaCostSchema>;
export type CreatePostventaReservationInput = z.infer<
  typeof createPostventaReservationSchema
>;
export type ConsumePostventaReservationInput = z.infer<
  typeof consumePostventaReservationSchema
>;
export type ListPostventaCasesQuery = z.infer<typeof listPostventaCasesQuerySchema>;
export type ListProductWarrantiesQuery = z.infer<
  typeof listProductWarrantiesQuerySchema
>;
export type PostventaCaseIdParams = z.infer<typeof postventaCaseIdParamSchema>;
export type PostventaActivityIdParams = z.infer<
  typeof postventaActivityIdParamSchema
>;
export type ProductWarrantyIdParams = z.infer<typeof productWarrantyIdParamSchema>;
export type PostventaReservationLinkIdParams = z.infer<
  typeof postventaReservationLinkIdParamSchema
>;
