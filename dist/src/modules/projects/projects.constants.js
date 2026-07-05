export const PROJECTS_API_PATH = "/projects";
export const PROJECTS_DASHBOARD_SUMMARY_API_PATH = "/projects/dashboard-summary";
export const PROJECTS_USER_OPTIONS_API_PATH = "/projects/user-options";
export const PROJECTS_PERMISSIONS = {
    create: "projects.create",
    delete: "projects.delete",
    read: "projects.read",
    update: "projects.update",
};
export const PROJECT_TYPES = [
    "WINDOW",
    "DOOR",
    "SHOWER",
    "FACADE",
    "RAILING",
    "MIRROR",
    "CUSTOM",
    "SERVICE",
];
export const PROJECT_STATUSES = [
    "LEAD",
    "MEASUREMENT_PENDING",
    "QUOTATION_PENDING",
    "QUOTED",
    "APPROVED",
    "PURCHASE_PENDING",
    "PRODUCTION_PENDING",
    "IN_PRODUCTION",
    "INSTALLATION_PENDING",
    "IN_INSTALLATION",
    "COMPLETED",
    "CANCELLED",
    "ON_HOLD",
];
export const PROJECT_PRIORITIES = [
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
];
export const PROJECT_NOTE_VISIBILITIES = [
    "INTERNAL",
    "CLIENT_VISIBLE",
];
export const PROJECT_ATTACHMENT_TYPES = [
    "PHOTO",
    "PLAN",
    "MEASUREMENT",
    "CONTRACT",
    "QUOTATION",
    "OTHER",
];
export const ACTIVE_PROJECT_STATUSES = PROJECT_STATUSES.filter((status) => !["CANCELLED", "COMPLETED", "ON_HOLD"].includes(status));
export const PROJECT_ENTITY_TYPE = "Project";
export const PROJECT_STATUS_HISTORY_ENTITY_TYPE = "ProjectStatusHistory";
export const PROJECT_NOTE_ENTITY_TYPE = "ProjectNote";
export const PROJECT_ATTACHMENT_ENTITY_TYPE = "ProjectAttachment";
export const PROJECT_MEASUREMENT_ENTITY_TYPE = "ProjectMeasurement";
//# sourceMappingURL=projects.constants.js.map