export const PROJECTS_API_PATH = "/projects";
export const PROJECTS_DASHBOARD_SUMMARY_API_PATH = "/projects/dashboard-summary";
export const PROJECTS_USER_OPTIONS_API_PATH = "/projects/user-options";

export const PROJECTS_PERMISSIONS = {
  create: "projects.create",
  delete: "projects.delete",
  read: "projects.read",
  update: "projects.update",
} as const;

export const PROJECT_TYPES = [
  "WINDOW",
  "DOOR",
  "SHOWER",
  "FACADE",
  "RAILING",
  "MIRROR",
  "CUSTOM",
  "SERVICE",
] as const;

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
] as const;

export const PROJECT_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

export const PROJECT_NOTE_VISIBILITIES = [
  "INTERNAL",
  "CLIENT_VISIBLE",
] as const;

export const PROJECT_ATTACHMENT_TYPES = [
  "PHOTO",
  "PLAN",
  "MEASUREMENT",
  "CONTRACT",
  "QUOTATION",
  "OTHER",
] as const;

export const ACTIVE_PROJECT_STATUSES = PROJECT_STATUSES.filter(
  (status) => !["CANCELLED", "COMPLETED", "ON_HOLD"].includes(status),
) as Array<
  Exclude<(typeof PROJECT_STATUSES)[number], "CANCELLED" | "COMPLETED" | "ON_HOLD">
>;

export const PROJECT_ENTITY_TYPE = "Project";
export const PROJECT_STATUS_HISTORY_ENTITY_TYPE = "ProjectStatusHistory";
export const PROJECT_NOTE_ENTITY_TYPE = "ProjectNote";
export const PROJECT_ATTACHMENT_ENTITY_TYPE = "ProjectAttachment";
export const PROJECT_MEASUREMENT_ENTITY_TYPE = "ProjectMeasurement";
