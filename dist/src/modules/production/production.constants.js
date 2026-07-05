export const PRODUCTION_JOBS_API_PATH = "/production/jobs";
export const PRODUCTION_TASKS_API_PATH = "/production/tasks";
export const PRODUCTION_PERMISSIONS = {
    complete: "production.complete",
    consumeMaterial: "production.consume_material",
    create: "production.create",
    delete: "production.delete",
    qualityCheck: "production.quality_check",
    read: "production.read",
    reportWaste: "production.report_waste",
    start: "production.start",
    update: "production.update",
    viewCost: "production.view_cost",
};
export const PRODUCTION_ENTITY_TYPES = {
    job: "production_job",
    jobItem: "production_job_item",
    materialConsumption: "material_consumption",
    qualityCheck: "quality_check",
    statusHistory: "production_status_history",
    task: "production_task",
    wasteReport: "production_waste_report",
};
export const PRODUCTION_JOB_STATUSES = [
    "DRAFT",
    "READY",
    "IN_PROGRESS",
    "PAUSED",
    "COMPLETED",
    "CANCELLED",
];
export const PRODUCTION_JOB_PRIORITIES = [
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
];
export const PRODUCTION_JOB_ITEM_STATUSES = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
];
export const PRODUCTION_TASK_TYPES = [
    "MEASURE",
    "CUT_GLASS",
    "CUT_PROFILE",
    "ASSEMBLE",
    "QUALITY_CHECK",
    "PACK",
    "OTHER",
];
export const PRODUCTION_TASK_STATUSES = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "BLOCKED",
    "CANCELLED",
];
export const MATERIAL_CONSUMPTION_TYPES = [
    "PLANNED",
    "ACTUAL",
    "WASTE",
    "SCRAP",
    "REMNANT_OUTPUT",
];
export const MATERIAL_CONSUMPTION_SOURCE_TYPES = [
    "INVENTORY_STOCK",
    "REMNANT",
    "MANUAL",
];
export const QUALITY_CHECK_STATUSES = [
    "PENDING",
    "PASSED",
    "FAILED",
    "REWORK_REQUIRED",
];
//# sourceMappingURL=production.constants.js.map