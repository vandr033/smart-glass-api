export const INSTALLATION_ORDERS_API_PATH = "/installations/orders";
export const INSTALLATION_TEAMS_API_PATH = "/installations/teams";
export const INSTALLATION_TASKS_API_PATH = "/installations/tasks";
export const INSTALLATION_ISSUES_API_PATH = "/installations/issues";
export const INSTALLATION_CALENDAR_API_PATH = "/installations/calendar";
export const INSTALLATION_PERMISSIONS = {
    assign: "installations.assign",
    cancel: "installations.cancel",
    complete: "installations.complete",
    create: "installations.create",
    execute: "installations.execute",
    export: "installations.export",
    schedule: "installations.schedule",
    update: "installations.update",
    view: "installations.view",
};
export const INSTALLATION_ENTITY_TYPES = {
    evidence: "installation_evidence",
    issue: "installation_issue",
    order: "installation_order",
    statusHistory: "installation_status_history",
    task: "installation_task",
    team: "installation_team",
    teamMember: "installation_team_member",
};
export const INSTALLATION_PRIORITIES = [
    "LOW",
    "NORMAL",
    "HIGH",
    "URGENT",
];
export const INSTALLATION_ORDER_STATUSES = [
    "SCHEDULED",
    "EN_ROUTE",
    "IN_INSTALLATION",
    "PAUSED",
    "WITH_OBSERVATIONS",
    "COMPLETED",
    "CANCELLED",
    "RESCHEDULED",
];
export const INSTALLATION_TEAM_STATUSES = ["ACTIVE", "INACTIVE"];
export const INSTALLATION_TASK_STATUSES = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "BLOCKED",
    "CANCELLED",
];
export const INSTALLATION_EVIDENCE_TYPES = [
    "PHOTO",
    "FILE",
    "SIGNATURE",
    "CHECKLIST",
    "OTHER",
];
export const INSTALLATION_ISSUE_TYPES = [
    "ACCESS",
    "CLIENT",
    "MATERIAL",
    "SAFETY",
    "TECHNICAL",
    "WEATHER",
    "OTHER",
];
export const INSTALLATION_ISSUE_SEVERITIES = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
];
export const INSTALLATION_ISSUE_STATUSES = [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
];
export const INSTALLATION_DEFAULT_TYPE = "ESTANDAR";
export const INSTALLATION_ORDER_ACTIVE_STATUSES = [
    "SCHEDULED",
    "EN_ROUTE",
    "IN_INSTALLATION",
    "PAUSED",
    "WITH_OBSERVATIONS",
    "RESCHEDULED",
];
export const INSTALLATION_DEFAULT_TASK_TEMPLATES = [
    {
        description: "Confirmar acceso al sitio, materiales y condiciones de trabajo antes de iniciar.",
        estimatedMinutes: 30,
        title: "Preparacion del sitio",
    },
    {
        description: "Ejecutar la instalacion principal segun alcance, planos y observaciones del proyecto.",
        estimatedMinutes: 180,
        title: "Instalacion principal",
    },
    {
        description: "Revisar acabados, funcionamiento y conformidad final con el cliente.",
        estimatedMinutes: 45,
        title: "Verificacion y cierre",
    },
];
export const INSTALLATION_STATUS_TRANSITIONS = {
    CANCELLED: [],
    COMPLETED: [],
    EN_ROUTE: [
        "IN_INSTALLATION",
        "PAUSED",
        "WITH_OBSERVATIONS",
        "CANCELLED",
    ],
    IN_INSTALLATION: [
        "PAUSED",
        "WITH_OBSERVATIONS",
        "COMPLETED",
        "CANCELLED",
    ],
    PAUSED: [
        "EN_ROUTE",
        "IN_INSTALLATION",
        "WITH_OBSERVATIONS",
        "RESCHEDULED",
        "CANCELLED",
    ],
    RESCHEDULED: ["SCHEDULED", "EN_ROUTE", "CANCELLED"],
    SCHEDULED: [
        "EN_ROUTE",
        "PAUSED",
        "WITH_OBSERVATIONS",
        "RESCHEDULED",
        "CANCELLED",
    ],
    WITH_OBSERVATIONS: [
        "EN_ROUTE",
        "IN_INSTALLATION",
        "PAUSED",
        "COMPLETED",
        "RESCHEDULED",
        "CANCELLED",
    ],
};
//# sourceMappingURL=installation.constants.js.map