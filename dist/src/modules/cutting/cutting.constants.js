export const CUTTING_OPTIMIZATIONS_API_PATH = "/cutting-optimizations";
export const CUTTING_PLANS_API_PATH = "/cutting-plans";
export const CUTTING_PERMISSIONS = {
    approve: "cutting.approve",
    createRemnants: "cutting.create_remnants",
    print: "cutting.print",
    read: "cutting.read",
    run: "cutting.run",
};
export const CUTTING_OPTIMIZATION_RUN_ENTITY_TYPE = "cutting_optimization_run";
export const CUTTING_PLAN_ENTITY_TYPE = "cutting_plan";
export const CUTTING_PLAN_SHEET_ENTITY_TYPE = "cutting_plan_sheet";
export const CUTTING_PLAN_REMNANT_OUTPUT_ENTITY_TYPE = "cutting_plan_remnant_output";
export const CUTTING_OPTIMIZATION_RUN_STATUSES = [
    "DRAFT",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "APPROVED",
    "CANCELLED",
];
export const CUTTING_OPTIMIZATION_MODES = [
    "COMMERCIAL_ESTIMATION",
    "OPERATIONAL_PURCHASE",
];
export const CUTTING_PLAN_STATUSES = [
    "DRAFT",
    "APPROVED",
    "SENT_TO_PRODUCTION",
    "COMPLETED",
    "CANCELLED",
];
export const CUTTING_PLAN_SHEET_SOURCES = [
    "INVENTORY_SHEET",
    "REMNANT",
    "PURCHASE_REQUIRED",
    "VIRTUAL",
];
export const CUTTING_PLAN_REMNANT_OUTPUT_STATUSES = [
    "PLANNED",
    "CREATED",
    "DISCARDED",
];
//# sourceMappingURL=cutting.constants.js.map