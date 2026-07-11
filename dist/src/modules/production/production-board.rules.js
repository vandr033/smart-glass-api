export const PRODUCTION_WORKFLOW_TRANSITIONS = {
    DRAFT: ["PENDING_PLANNING", "CANCELLED"],
    PENDING_PLANNING: ["SCHEDULED", "CANCELLED"],
    SCHEDULED: ["MATERIALS_PREPARATION", "READY_TO_START", "CANCELLED"],
    MATERIALS_PREPARATION: ["READY_TO_START", "BLOCKED"],
    READY_TO_START: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["PAUSED", "BLOCKED", "PENDING_QUALITY"],
    PAUSED: ["IN_PROGRESS", "BLOCKED", "CANCELLED"],
    BLOCKED: ["READY_TO_START", "PAUSED"],
    PENDING_QUALITY: ["COMPLETED", "IN_PROGRESS"],
    COMPLETED: [],
    CANCELLED: [],
};
export const isProductionWorkflowTransitionAllowed = (from, to) => PRODUCTION_WORKFLOW_TRANSITIONS[from].includes(to);
export const calculateCapacityUtilization = (scheduledMinutes, availableMinutes) => availableMinutes > 0
    ? Math.round((scheduledMinutes / availableMinutes) * 100)
    : 0;
export const calculateProductionProgress = (completedTasks, totalTasks) => totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
//# sourceMappingURL=production-board.rules.js.map