import type { z } from "zod";

import type {
  createInventoryShortagePurchaseRequestSchema,
  createPurchaseOrderSchema,
  createPurchaseRequestSchema,
  listPurchaseOrdersQuerySchema,
  listPurchaseReceiptsQuerySchema,
  listPurchaseRequestsQuerySchema,
  listSupplierComparisonsQuerySchema,
  profileCuttingPlanIdParamSchema,
  purchaseOrderStatusSchema,
  purchaseOrderStatusNoteSchema,
  purchaseRequestDecisionSchema,
  purchaseRequestItemStatusSchema,
  purchaseRequestSourceTypeSchema,
  purchaseRequestStatusSchema,
  receivePurchaseOrderSchema,
  supplierComparisonApprovalSchema,
  supplierComparisonRunSchema,
  supplierComparisonStatusSchema,
  updatePurchaseOrderSchema,
  updatePurchaseRequestSchema,
} from "./purchasing.validators.js";

export type PurchaseRequestStatus = z.infer<typeof purchaseRequestStatusSchema>;
export type PurchaseRequestSourceType = z.infer<
  typeof purchaseRequestSourceTypeSchema
>;
export type PurchaseRequestItemStatus = z.infer<
  typeof purchaseRequestItemStatusSchema
>;
export type SupplierComparisonStatus = z.infer<
  typeof supplierComparisonStatusSchema
>;
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;

export type PurchasingUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type PurchasingSupplierSummary = {
  code: string | null;
  commercialName: string | null;
  creditAvailable: boolean;
  defaultLeadTimeDays: number | null;
  id: string;
  legalName: string;
  preferenceScore: number | null;
  reliabilityScore: number | null;
} | null;

export type PurchasingMaterialSummary = {
  code: string;
  id: string;
  materialType: "LINEAR" | "PACKAGE" | "SERVICE" | "SHEET" | "UNIT";
  name: string;
  purchaseUnit: string;
  stockUnit: string;
};

export type PurchasingWarehouseSummary = {
  code: string;
  id: string;
  name: string;
} | null;

export type PurchaseRequestTotals = {
  estimatedSubtotal: number | null;
  itemCount: number;
  selectedSupplierCount: number;
};

export type PurchaseRequestItemRecord = {
  createdAt: string;
  description: string | null;
  estimatedTotalCost: number | null;
  estimatedUnitCost: number | null;
  id: string;
  material: PurchasingMaterialSummary;
  materialId: string;
  metadataJson: unknown;
  preferredSupplier: PurchasingSupplierSummary;
  preferredSupplierId: string | null;
  purchaseRequestId: string;
  quantity: number;
  requiredDate: string | null;
  selectedSupplier: PurchasingSupplierSummary;
  selectedSupplierId: string | null;
  status: PurchaseRequestItemStatus;
  unit: string;
  updatedAt: string;
};

export type PurchaseRequestListItem = {
  approvedAt: string | null;
  approvedByUser: PurchasingUserSummary;
  code: string;
  createdAt: string;
  id: string;
  notes: string | null;
  requestedByUser: PurchasingUserSummary;
  sourceId: string | null;
  sourceReferenceLabel: string | null;
  sourceType: PurchaseRequestSourceType;
  status: PurchaseRequestStatus;
  totals: PurchaseRequestTotals;
  updatedAt: string;
};

export type PurchaseRequestRecord = PurchaseRequestListItem & {
  deletedAt: string | null;
  items: PurchaseRequestItemRecord[];
};

export type SupplierComparisonOptionRecord = {
  availableCredit: boolean | null;
  comparisonId: string;
  createdAt: string;
  deliveryDays: number | null;
  finalScore: number | null;
  id: string;
  isSelected: boolean;
  material: PurchasingMaterialSummary;
  materialId: string;
  purchaseRequestItemId: string;
  scoreBreakdownJson: unknown;
  supplier: PurchasingSupplierSummary;
  supplierId: string;
  supplierScore: number | null;
  totalPrice: number | null;
  unitPrice: number | null;
  updatedAt: string;
};

export type SupplierComparisonListItem = {
  approvedAt: string | null;
  approvedByUser: PurchasingUserSummary;
  createdAt: string;
  createdByUser: PurchasingUserSummary;
  id: string;
  purchaseRequest: Pick<
    PurchaseRequestListItem,
    "code" | "id" | "sourceType" | "status"
  >;
  scoringConfig: {
    id: string;
    name: string;
  } | null;
  selectedSuppliersCount: number;
  status: SupplierComparisonStatus;
  updatedAt: string;
};

export type SupplierComparisonRecord = SupplierComparisonListItem & {
  options: SupplierComparisonOptionRecord[];
  purchaseRequestDetail: PurchaseRequestRecord;
  resultJson: unknown;
  selectedCombinationJson: unknown;
};

export type PurchaseOrderItemRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  material: PurchasingMaterialSummary;
  materialId: string;
  metadataJson: unknown;
  purchaseOrderId: string;
  quantity: number;
  receivedQuantity: number;
  totalPrice: number | null;
  unit: string;
  unitPrice: number | null;
  updatedAt: string;
};

export type PurchaseOrderListItem = {
  code: string;
  createdAt: string;
  createdByUser: PurchasingUserSummary;
  currency: string;
  discountAmount: number | null;
  expectedDeliveryDate: string | null;
  id: string;
  itemCount: number;
  notes: string | null;
  orderDate: string;
  purchaseRequest: {
    code: string;
    id: string;
  } | null;
  purchaseRequestId: string | null;
  status: PurchaseOrderStatus;
  subtotal: number | null;
  supplier: PurchasingSupplierSummary;
  supplierId: string;
  taxAmount: number | null;
  total: number | null;
  updatedAt: string;
};

export type PurchaseOrderRecord = PurchaseOrderListItem & {
  deletedAt: string | null;
  confirmedAt: string | null;
  items: PurchaseOrderItemRecord[];
  receipts: Array<{
    code: string;
    id: string;
    receivedAt: string;
    warehouse: PurchasingWarehouseSummary;
  }>;
  sentAt: string | null;
};

export type PurchaseReceiptItemRecord = {
  batchNumber: string | null;
  createdAt: string;
  id: string;
  locationCode: string | null;
  material: PurchasingMaterialSummary;
  materialId: string;
  notes: string | null;
  purchaseOrderItemId: string;
  purchaseReceiptId: string;
  receivedQuantity: number;
  unit: string;
  updatedAt: string;
};

export type PurchaseReceiptListItem = {
  code: string;
  createdAt: string;
  id: string;
  itemCount: number;
  purchaseOrder: {
    code: string;
    id: string;
    status: PurchaseOrderStatus;
  };
  purchaseOrderId: string;
  receivedAt: string;
  receivedByUser: PurchasingUserSummary;
  supplier: PurchasingSupplierSummary;
  warehouse: PurchasingWarehouseSummary;
  warehouseId: string;
};

export type PurchaseReceiptRecord = PurchaseReceiptListItem & {
  items: PurchaseReceiptItemRecord[];
  notes: string | null;
};

export type PurchasingDashboardRecord = {
  delayedExpectedDeliveries: PurchaseOrderListItem[];
  openPurchaseOrders: number;
  partialPurchaseOrders: PurchaseOrderListItem[];
  pendingApprovals: number;
  pendingPurchaseRequests: number;
  recentReceipts: PurchaseReceiptListItem[];
};

export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type UpdatePurchaseRequestInput = z.infer<typeof updatePurchaseRequestSchema>;
export type CreateInventoryShortagePurchaseRequestInput = z.infer<
  typeof createInventoryShortagePurchaseRequestSchema
>;
export type PurchaseRequestDecisionInput = z.infer<
  typeof purchaseRequestDecisionSchema
>;
export type SupplierComparisonRunInput = z.infer<typeof supplierComparisonRunSchema>;
export type SupplierComparisonApprovalInput = z.infer<
  typeof supplierComparisonApprovalSchema
>;
export type ListPurchaseRequestsQuery = z.infer<
  typeof listPurchaseRequestsQuerySchema
>;
export type ListSupplierComparisonsQuery = z.infer<
  typeof listSupplierComparisonsQuerySchema
>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderStatusNoteInput = z.infer<
  typeof purchaseOrderStatusNoteSchema
>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;
export type ListPurchaseReceiptsQuery = z.infer<
  typeof listPurchaseReceiptsQuerySchema
>;
export type ProfileCuttingPlanIdParams = z.infer<
  typeof profileCuttingPlanIdParamSchema
>;
