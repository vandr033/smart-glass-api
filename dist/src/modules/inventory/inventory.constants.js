export const WAREHOUSES_API_PATH = "/warehouses";
export const INVENTORY_STOCK_API_PATH = "/inventory/stock";
export const INVENTORY_ADJUST_API_PATH = "/inventory/adjust";
export const INVENTORY_TRANSFER_API_PATH = "/inventory/transfer";
export const INVENTORY_MOVEMENTS_API_PATH = "/inventory/movements";
export const INVENTORY_RESERVATIONS_API_PATH = "/inventory/reservations";
export const INVENTORY_REMNANTS_API_PATH = "/inventory/remnants";
export const INVENTORY_DAMAGED_API_PATH = "/inventory/damaged";
export const INVENTORY_AVAILABILITY_API_PATH = "/inventory/availability";
export const INVENTORY_PERMISSIONS = {
    adjust: "inventory.adjust",
    create: "inventory.create",
    damage: "inventory.damage",
    read: "inventory.read",
    releaseReservation: "inventory.release_reservation",
    reserve: "inventory.reserve",
    scrap: "inventory.scrap",
    update: "inventory.update",
    viewCost: "inventory.view_cost",
};
export const WAREHOUSE_ENTITY_TYPE = "warehouse";
export const INVENTORY_STOCK_ENTITY_TYPE = "inventory_stock";
export const INVENTORY_MOVEMENT_ENTITY_TYPE = "inventory_movement";
export const INVENTORY_RESERVATION_ENTITY_TYPE = "inventory_reservation";
export const REMNANT_PIECE_ENTITY_TYPE = "remnant_piece";
export const DAMAGED_MATERIAL_ENTITY_TYPE = "damaged_material";
export const WAREHOUSE_STATUSES = ["ACTIVE", "INACTIVE"];
export const INVENTORY_STOCK_TYPES = [
    "STANDARD",
    "REMNANT",
    "DAMAGED",
    "RESERVED",
    "QUARANTINE",
];
export const INVENTORY_CONDITIONS = [
    "AVAILABLE",
    "RESERVED_SOFT",
    "RESERVED_FIRM",
    "DAMAGED",
    "CONSUMED",
    "SCRAPPED",
];
export const INVENTORY_SOURCE_TYPES = [
    "MANUAL",
    "PURCHASE",
    "REMNANT_GENERATED",
    "RETURN",
    "ADJUSTMENT",
];
export const INVENTORY_MOVEMENT_TYPES = [
    "IN",
    "OUT",
    "TRANSFER",
    "ADJUSTMENT",
    "RESERVATION_SOFT",
    "RESERVATION_FIRM",
    "RESERVATION_RELEASE",
    "DAMAGE",
    "SCRAP",
];
export const INVENTORY_RESERVATION_TYPES = ["SOFT", "FIRM"];
export const INVENTORY_RESERVATION_STATUSES = [
    "ACTIVE",
    "RELEASED",
    "CONSUMED",
    "EXPIRED",
    "CANCELLED",
];
export const REMNANT_PIECE_STATUSES = [
    "AVAILABLE",
    "RESERVED",
    "CONSUMED",
    "SCRAPPED",
];
export const REMNANT_PIECE_SOURCE_TYPES = [
    "MANUAL",
    "CUT_OPTIMIZATION",
    "PRODUCTION_RETURN",
];
export const DAMAGE_TYPES = [
    "BROKEN",
    "SCRATCHED",
    "BENT",
    "MISSING_PARTS",
    "OTHER",
];
export const DAMAGE_SEVERITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "TOTAL_LOSS",
];
export const DAMAGED_MATERIAL_STATUSES = [
    "REPORTED",
    "REVIEWED",
    "SCRAPPED",
    "REUSABLE",
    "RETURNED_TO_SUPPLIER",
];
//# sourceMappingURL=inventory.constants.js.map