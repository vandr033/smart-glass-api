export const PRODUCTION_JOBS_API_PATH = "/production/jobs";
export const PRODUCTION_TASKS_API_PATH = "/production/tasks";
export const PRODUCTION_PERMISSIONS = {
    boardRead: "produccion.tablero.ver",
    planningRead: "produccion.planificacion.ver",
    planningSchedule: "produccion.planificacion.programar",
    planningReschedule: "produccion.planificacion.reprogramar",
    tasksAssign: "produccion.tareas.asignar",
    tasksExecute: "produccion.tareas.ejecutar",
    tasksComplete: "produccion.tareas.completar",
    priorityUpdate: "produccion.prioridad.actualizar",
    blocksRead: "produccion.bloqueos.ver",
    blocksCreate: "produccion.bloqueos.crear",
    blocksResolve: "produccion.bloqueos.resolver",
    centersRead: "produccion.centros.ver",
    centersConfigure: "produccion.centros.configurar",
    capacityRead: "produccion.capacidad.ver",
    qualityRead: "produccion.calidad.ver",
    qualityApprove: "produccion.calidad.aprobar",
    wasteRead: "produccion.desperdicios.ver",
    wasteCreate: "produccion.desperdicios.registrar",
    export: "produccion.exportar",
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
export const PRODUCTION_WORKFLOW_STATUSES = [
    "DRAFT",
    "PENDING_PLANNING",
    "SCHEDULED",
    "MATERIALS_PREPARATION",
    "READY_TO_START",
    "IN_PROGRESS",
    "PAUSED",
    "BLOCKED",
    "PENDING_QUALITY",
    "COMPLETED",
    "CANCELLED",
];
export const PRODUCTION_WORK_CENTER_TYPES = [
    "GLASS_CUTTING",
    "POLISHING",
    "DRILLING",
    "SANDBLASTING",
    "LAMINATION",
    "EXTERNAL_TEMPERING",
    "ALUMINUM_CUTTING",
    "PROFILE_MACHINING",
    "ASSEMBLY",
    "SEALING",
    "QUALITY_CONTROL",
    "PACKING",
    "DISPATCH_PREPARATION",
    "OTHER",
];
export const PRODUCTION_WORK_CENTER_STATUSES = [
    "AVAILABLE",
    "OCCUPIED",
    "SATURATED",
    "MAINTENANCE",
    "INACTIVE",
];
export const PRODUCTION_BLOCK_TYPES = [
    "MATERIAL_SHORTAGE",
    "MEASUREMENT_PENDING",
    "MEASUREMENT_REJECTED",
    "DRAWING_PENDING",
    "APPROVAL_PENDING",
    "MACHINE_UNAVAILABLE",
    "WORK_CENTER_SATURATED",
    "QUALITY_INCIDENT",
    "DEFECTIVE_PART",
    "EXTERNAL_PROCESS_PENDING",
    "STAFF_SHORTAGE",
    "OTHER",
];
export const PRODUCTION_BLOCK_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const PRODUCTION_BLOCK_STATUSES = ["OPEN", "UNDER_REVIEW", "IN_PROGRESS", "RESOLVED", "DISMISSED"];
export const PRODUCTION_TASK_DEPENDENCY_TYPES = ["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH"];
export const PRODUCTION_TIME_EVENT_TYPES = ["START", "PAUSE", "RESUME", "BLOCK", "UNBLOCK", "FINISH"];
export const PRODUCTION_WASTE_ENTRY_TYPES = ["WASTE", "SCRAP", "REMNANT"];
export const PRODUCTION_WASTE_REASONS = [
    "CUTTING",
    "BREAKAGE",
    "MEASUREMENT_ERROR",
    "MATERIAL_DEFECT",
    "MANUFACTURING_ERROR",
    "TECHNICAL_ADJUSTMENT",
    "HANDLING_DAMAGE",
    "OTHER",
];
export const PRODUCTION_JOB_PRIORITIES = [
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
    "CRITICAL",
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
    "PAUSED",
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