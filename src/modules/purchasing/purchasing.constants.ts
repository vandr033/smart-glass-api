export const PURCHASE_REQUESTS_API_PATH = "/purchase-requests";
export const SUPPLIER_COMPARISONS_API_PATH = "/supplier-comparisons";
export const PURCHASE_ORDERS_API_PATH = "/purchase-orders";
export const PURCHASE_RECEIPTS_API_PATH = "/purchase-receipts";
export const PURCHASING_DASHBOARD_API_PATH = "/purchasing/dashboard";

export const PURCHASING_PERMISSIONS = {
  approve: "purchasing.approve",
  compareSuppliers: "purchasing.compare_suppliers",
  create: "purchasing.create",
  createPo: "purchasing.create_po",
  delete: "purchasing.delete",
  read: "purchasing.read",
  receive: "purchasing.receive",
  sendPo: "purchasing.send_po",
  update: "purchasing.update",
  viewCost: "purchasing.view_cost",
} as const;

export const PURCHASE_REQUEST_ENTITY_TYPE = "purchase_request";
export const SUPPLIER_COMPARISON_ENTITY_TYPE = "supplier_comparison";
export const PURCHASE_ORDER_ENTITY_TYPE = "purchase_order";
export const PURCHASE_RECEIPT_ENTITY_TYPE = "purchase_receipt";

export const PURCHASE_REQUEST_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CONVERTED_TO_PO",
  "CANCELLED",
] as const;

export const PURCHASE_REQUEST_SOURCE_TYPES = [
  "QUOTATION",
  "PROJECT",
  "CUTTING_PLAN",
  "INVENTORY_SHORTAGE",
  "MANUAL",
] as const;

export const PURCHASE_REQUEST_ITEM_STATUSES = [
  "OPEN",
  "SUPPLIER_SELECTED",
  "ORDERED",
  "CANCELLED",
] as const;

export const SUPPLIER_COMPARISON_STATUSES = [
  "DRAFT",
  "COMPLETED",
  "APPROVED",
  "CANCELLED",
] as const;

export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "SENT",
  "CONFIRMED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
] as const;
