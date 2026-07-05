export const SUPPLIERS_API_PATH = "/suppliers";
export const SUPPLIER_CATEGORIES_API_PATH = "/supplier-categories";
export const SUPPLIER_SCORING_API_PATH = "/supplier-scoring";
export const SUPPLIERS_PERMISSIONS = {
    create: "suppliers.create",
    delete: "suppliers.delete",
    read: "suppliers.read",
    update: "suppliers.update",
};
export const SUPPLIER_SCORING_PERMISSIONS = {
    read: "system.settings.read",
    simulate: "suppliers.read",
    update: "system.settings.update",
};
export const SUPPLIER_ENTITY_TYPE = "Supplier";
export const SUPPLIER_CONTACT_ENTITY_TYPE = "SupplierContact";
export const SUPPLIER_CATEGORY_ENTITY_TYPE = "SupplierCategory";
export const SUPPLIER_SCORING_CONFIG_ENTITY_TYPE = "SupplierScoringConfig";
export const SUPPLIER_SCORING_CRITERION_KEYS = [
    "price",
    "delivery_time",
    "reliability",
    "credit",
    "preference",
    "availability",
];
//# sourceMappingURL=suppliers.constants.js.map