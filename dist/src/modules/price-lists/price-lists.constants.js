export const PRICE_LISTS_API_PATH = "/price-lists";
export const PRICE_LIST_IMPORTS_API_PATH = "/price-lists/imports";
export const PRICE_LIST_IMPORT_UPLOAD_API_PATH = "/price-lists/import";
export const PRICE_LIST_PRICE_HISTORY_API_PATH = "/price-lists/price-history";
export const PRICE_LISTS_PERMISSIONS = {
    approve: "price_lists.approve",
    import: "price_lists.import",
    read: "price_lists.read",
    validate: "price_lists.validate",
};
export const PRICE_LIST_IMPORT_STATUSES = [
    "UPLOADED",
    "PARSED",
    "NEEDS_MAPPING",
    "VALIDATED",
    "APPROVED",
    "REJECTED",
    "FAILED",
];
export const PRICE_LIST_SOURCE_TYPES = ["EXCEL", "CSV"];
export const PRICE_LIST_ROW_MAPPING_STATUSES = [
    "UNMAPPED",
    "AUTO_MAPPED",
    "MANUAL_MAPPED",
    "IGNORED",
    "ERROR",
];
export const PRICE_LIST_ROW_VALIDATION_STATUSES = [
    "PENDING",
    "VALID",
    "INVALID",
];
export const PRICE_LIST_IMPORT_ENTITY_TYPE = "PriceListImport";
export const PRICE_LIST_IMPORT_ROW_ENTITY_TYPE = "PriceListImportRow";
export const SUPPLIER_MATERIAL_PRICE_ENTITY_TYPE = "SupplierMaterialPrice";
export const PRICE_CHANGE_LOG_ENTITY_TYPE = "PriceChangeLog";
export const PRICE_LIST_ACCEPTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];
export const PRICE_LIST_ACCEPTED_MIME_TYPES = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/csv",
    "text/plain",
];
//# sourceMappingURL=price-lists.constants.js.map