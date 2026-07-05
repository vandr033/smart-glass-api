export const PROFILE_OPTIMIZATIONS_API_PATH = "/profile-optimizations";
export const PROFILE_CUTTING_PLANS_API_PATH = "/profile-cutting-plans";

export const PROFILE_OPTIMIZATION_PERMISSIONS = {
  createRemnants: "cutting.create_remnants",
  print: "cutting.print",
  read: "cutting.read",
  run: "cutting.run",
} as const;

export const PROFILE_OPTIMIZATION_RUN_ENTITY_TYPE = "profile_optimization_run";
export const PROFILE_CUTTING_PLAN_ENTITY_TYPE = "profile_cutting_plan";
export const PROFILE_REMNANT_OUTPUT_ENTITY_TYPE = "profile_remnant_output";

export const PROFILE_OPTIMIZATION_RUN_STATUSES = [
  "DRAFT",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "APPROVED",
  "CANCELLED",
] as const;

export const PROFILE_OPTIMIZATION_MODES = [
  "COMMERCIAL_ESTIMATION",
  "OPERATIONAL_EXECUTION",
] as const;

export const PROFILE_CUTTING_PLAN_STATUSES = [
  "DRAFT",
  "APPROVED",
  "SENT_TO_PRODUCTION",
  "COMPLETED",
  "CANCELLED",
] as const;

export const PROFILE_CUTTING_BAR_SOURCE_TYPES = [
  "INVENTORY_BAR",
  "REMNANT",
  "PURCHASE_REQUIRED",
  "VIRTUAL",
] as const;

export const PROFILE_REMNANT_OUTPUT_STATUSES = [
  "PLANNED",
  "CREATED",
  "DISCARDED",
] as const;
