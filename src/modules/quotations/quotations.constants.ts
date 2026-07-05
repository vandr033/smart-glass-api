export const QUOTATIONS_API_PATH = "/quotations";
export const QUOTATION_ITEMS_API_PATH = "/quotation-items";
export const QUOTATION_APPROVALS_API_PATH = "/quotation-approvals";

export const QUOTATION_PERMISSIONS = {
  approve: "quotations.approve",
  create: "quotations.create",
  delete: "quotations.delete",
  exportPdf: "quotations.export_pdf",
  overrideCost: "quotations.override_cost",
  read: "quotations.read",
  send: "quotations.send",
  update: "quotations.update",
  viewCost: "quotations.view_cost",
} as const;

export const QUOTATION_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export const QUOTATION_VERSION_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
] as const;

export const QUOTATION_ITEM_TYPES = [
  "TEMPLATE_PRODUCT",
  "MANUAL_MATERIAL",
  "MANUAL_SERVICE",
  "DISCOUNT",
  "NOTE",
] as const;

export const QUOTATION_ITEM_MATERIAL_RULE_TYPES = [
  "LINEAR_CUT",
  "SHEET_CUT",
  "UNIT_QUANTITY",
  "PACKAGE_QUANTITY",
  "SERVICE_COST",
  "MANUAL",
] as const;

export const QUOTATION_ITEM_MATERIAL_SOURCES = [
  "TEMPLATE",
  "MANUAL",
  "PRICE_LIST",
] as const;

export const QUOTATION_APPROVAL_TYPES = [
  "LOW_MARGIN",
  "HIGH_DISCOUNT",
  "MANUAL_REVIEW",
  "PRICE_EXCEPTION",
] as const;

export const QUOTATION_APPROVAL_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export const QUOTATION_LOCKED_STATUSES = [
  "ACCEPTED",
  "CANCELLED",
] as const;

export const QUOTATION_EDITABLE_STATUSES = [
  "DRAFT",
] as const;

export const QUOTATION_ENTITY_TYPES = {
  approval: "QuotationApproval",
  item: "QuotationItem",
  itemMaterial: "QuotationItemMaterial",
  pdfExport: "QuotationPdfExport",
  quotation: "Quotation",
  statusHistory: "QuotationStatusHistory",
  version: "QuotationVersion",
} as const;

export const QUOTATION_PDF_EXPORT_TODO_MESSAGE =
  "PDF export is not available yet. Use the quotation preview page until PDF generation infrastructure is added.";
