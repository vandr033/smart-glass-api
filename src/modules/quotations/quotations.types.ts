import type { z } from "zod";

import type {
  addManualMaterialItemSchema,
  addManualServiceItemSchema,
  addTemplateQuotationItemSchema,
  changeQuotationStatusSchema,
  listQuotationsQuerySchema,
  quotationDecisionSchema,
  quotationIdParamSchema,
  quotationItemIdParamSchema,
  quotationMutationSchema,
  submitQuotationApprovalSchema,
  updateQuotationItemSchema,
} from "./quotations.validators.js";

import type {
  QUOTATION_APPROVAL_STATUSES,
  QUOTATION_APPROVAL_TYPES,
  QUOTATION_ITEM_MATERIAL_RULE_TYPES,
  QUOTATION_ITEM_MATERIAL_SOURCES,
  QUOTATION_ITEM_TYPES,
  QUOTATION_STATUSES,
  QUOTATION_VERSION_STATUSES,
} from "./quotations.constants.js";

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];
export type QuotationVersionStatus = (typeof QUOTATION_VERSION_STATUSES)[number];
export type QuotationItemType = (typeof QUOTATION_ITEM_TYPES)[number];
export type QuotationItemMaterialRuleType =
  (typeof QUOTATION_ITEM_MATERIAL_RULE_TYPES)[number];
export type QuotationItemMaterialSource =
  (typeof QUOTATION_ITEM_MATERIAL_SOURCES)[number];
export type QuotationApprovalType = (typeof QUOTATION_APPROVAL_TYPES)[number];
export type QuotationApprovalStatus = (typeof QUOTATION_APPROVAL_STATUSES)[number];

export type QuotationUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type QuotationClientSummary = {
  clientType: "COMPANY" | "INDIVIDUAL";
  displayName: string;
  id: string;
};

export type QuotationProjectSummary = {
  code: string;
  id: string;
  title: string;
} | null;

export type QuotationMeasurementRequestSummary = {
  code: string;
  id: string;
  status: string;
} | null;

export type QuotationItemMaterialRecord = {
  createdAt: string;
  id: string;
  materialCode: string | null;
  materialId: string | null;
  materialName: string;
  metadataJson: unknown;
  requiredQuantity: number;
  ruleType: QuotationItemMaterialRuleType;
  source: QuotationItemMaterialSource;
  supplierId: string | null;
  totalCost: number | null;
  unit: string;
  unitCost: number | null;
  updatedAt: string;
  wastePercent: number | null;
};

export type QuotationItemRecord = {
  calculationResultJson: unknown;
  createdAt: string;
  description: string | null;
  hasManualOverride: boolean;
  id: string;
  inputValuesJson: unknown;
  itemType: QuotationItemType;
  marginPercent: number | null;
  materials: QuotationItemMaterialRecord[];
  name: string;
  productTemplateId: string | null;
  productTemplateVersionId: string | null;
  quantity: number;
  quotationId: string;
  quotationVersionId: string | null;
  sortOrder: number;
  subtotalCost: number | null;
  subtotalSale: number;
  updatedAt: string;
};

export type QuotationApprovalRecord = {
  approvalType: QuotationApprovalType;
  approverUser: QuotationUserSummary;
  createdAt: string;
  decisionNotes: string | null;
  decidedAt: string | null;
  decidedByUser: QuotationUserSummary;
  id: string;
  quotation: {
    client: QuotationClientSummary;
    code: string;
    id: string;
    project: QuotationProjectSummary;
    status: QuotationStatus;
  };
  reason: string;
  requestedByUser: QuotationUserSummary;
  status: QuotationApprovalStatus;
  updatedAt: string;
};

export type QuotationStatusHistoryRecord = {
  changedByUser: QuotationUserSummary;
  createdAt: string;
  fromStatus: QuotationStatus | null;
  id: string;
  notes: string | null;
  toStatus: QuotationStatus;
};

export type QuotationVersionRecord = {
  createdAt: string;
  createdByUser: QuotationUserSummary;
  discountAmount: number;
  id: string;
  itemCount: number;
  marginAmount: number | null;
  marginPercent: number | null;
  snapshotJson: unknown;
  status: QuotationVersionStatus;
  subtotalCost: number | null;
  subtotalSale: number;
  taxAmount: number;
  totalSale: number;
  updatedAt: string;
  versionNumber: number;
};

export type QuotationListItem = {
  approvedAt: string | null;
  approvedByUser: QuotationUserSummary;
  client: QuotationClientSummary;
  code: string;
  createdAt: string;
  createdByUser: QuotationUserSummary;
  currency: string;
  discountAmount: number;
  id: string;
  marginAmount: number | null;
  marginPercent: number | null;
  measurementRequest: QuotationMeasurementRequestSummary;
  project: QuotationProjectSummary;
  status: QuotationStatus;
  subtotalCost: number | null;
  subtotalSale: number;
  taxAmount: number;
  totalSale: number;
  updatedAt: string;
  validUntil: string | null;
};

export type QuotationDetailRecord = QuotationListItem & {
  approvals: QuotationApprovalRecord[];
  deletedAt: string | null;
  exchangeRate: number | null;
  internalNotes: string | null;
  items: QuotationItemRecord[];
  notes: string | null;
  statusHistory: QuotationStatusHistoryRecord[];
  versions: QuotationVersionRecord[];
};

export type QuotationApprovalRequirement = {
  approvalType: QuotationApprovalType;
  reason: string;
};

export type QuotationApprovalEvaluation = {
  discountPercent: number;
  hasManualOverride: boolean;
  minimumMarginPercent: number;
  maximumDiscountPercent: number;
  requirements: QuotationApprovalRequirement[];
  requiresApproval: boolean;
};

export type CreateQuotationInput = z.infer<typeof quotationMutationSchema>;
export type UpdateQuotationInput = z.infer<typeof quotationMutationSchema>;
export type ListQuotationsQuery = z.infer<typeof listQuotationsQuerySchema>;
export type QuotationIdParams = z.infer<typeof quotationIdParamSchema>;
export type AddTemplateQuotationItemInput = z.infer<
  typeof addTemplateQuotationItemSchema
>;
export type AddManualMaterialItemInput = z.infer<
  typeof addManualMaterialItemSchema
>;
export type AddManualServiceItemInput = z.infer<
  typeof addManualServiceItemSchema
>;
export type UpdateQuotationItemInput = z.infer<typeof updateQuotationItemSchema>;
export type QuotationItemIdParams = z.infer<typeof quotationItemIdParamSchema>;
export type SubmitQuotationApprovalInput = z.infer<
  typeof submitQuotationApprovalSchema
>;
export type QuotationDecisionInput = z.infer<typeof quotationDecisionSchema>;
export type ChangeQuotationStatusInput = z.infer<typeof changeQuotationStatusSchema>;
