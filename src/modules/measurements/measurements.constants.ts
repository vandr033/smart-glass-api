export const MEASUREMENT_REQUESTS_API_PATH = "/measurements/requests";
export const MEASUREMENTS_CALENDAR_API_PATH = "/measurements/calendar";
export const MEASUREMENTS_OPENINGS_API_PATH = "/measurements/openings";
export const MEASUREMENTS_OBSERVATIONS_API_PATH = "/measurements/observations";

export const MEASUREMENTS_PERMISSIONS = {
  approve: "mediciones.aprobar",
  assign: "mediciones.asignar",
  create: "mediciones.crear",
  execute: "mediciones.ejecutar",
  export: "mediciones.exportar",
  reject: "mediciones.rechazar",
  schedule: "mediciones.programar",
  update: "mediciones.actualizar",
  view: "mediciones.ver",
} as const;

export const MEASUREMENTS_ENTITY_TYPES = {
  evidence: "measurement_evidence",
  observation: "technical_observation",
  opening: "measurement_opening",
  request: "measurement_request",
  statusHistory: "measurement_status_history",
  visit: "measurement_visit",
} as const;

export const MEASUREMENT_REQUEST_STATUSES = [
  "REQUESTED",
  "SCHEDULED",
  "IN_VISIT",
  "REGISTERED",
  "WITH_OBSERVATIONS",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "RESCHEDULED",
  "CANCELLED",
] as const;

export const MEASUREMENT_VISIT_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const MEASUREMENT_VISIT_RESULTS = [
  "PENDING",
  "READY_FOR_APPROVAL",
  "APPROVED",
  "REJECTED",
  "REQUIRES_REVISIT",
] as const;

export const MEASUREMENT_ELEMENT_TYPES = [
  "WINDOW",
  "DOOR",
  "SHOWER",
  "RAILING",
  "MIRROR",
  "DIVISION",
  "COVER",
  "OTHER",
] as const;

export const MEASUREMENT_OPENING_STATUSES = [
  "DRAFT",
  "REGISTERED",
  "NEEDS_CORRECTION",
  "APPROVED",
  "REJECTED",
] as const;

export const MEASUREMENT_EVIDENCE_TYPES = [
  "PHOTO",
  "FILE",
  "SKETCH",
  "CHECKLIST",
  "OTHER",
] as const;

export const TECHNICAL_OBSERVATION_TYPES = [
  "ACCESS",
  "STRUCTURAL",
  "LEVEL",
  "MATERIAL",
  "SAFETY",
  "OTHER",
] as const;

export const TECHNICAL_OBSERVATION_SEVERITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export const TECHNICAL_OBSERVATION_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "REJECTED",
] as const;

export const MEASUREMENT_SCHEDULABLE_STATUSES = [
  "REQUESTED",
  "SCHEDULED",
  "RESCHEDULED",
  "REJECTED",
  "WITH_OBSERVATIONS",
] as const;

export const MEASUREMENT_ACTIVE_SCHEDULE_STATUSES = [
  "SCHEDULED",
  "IN_VISIT",
  "RESCHEDULED",
] as const;
