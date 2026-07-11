import { sendSuccess } from "../../utils/response.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { productionBoardService } from "./production-board.service.js";
import { productionBlockCreateSchema, productionBlockResolveSchema, productionBoardQuerySchema, productionScheduleSchema, productionTaskAssignmentSchema, productionTaskTransitionSchema, productionTransitionSchema, productionWasteEntrySchema, } from "./production.validators.js";
const queryString = (value) => {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value) && typeof value[0] === "string")
        return value[0];
    return undefined;
};
const queryInput = (request) => productionBoardQuerySchema.parse({
    dateFrom: queryString(request.query.dateFrom),
    dateTo: queryString(request.query.dateTo),
    priority: queryString(request.query.priority),
    search: queryString(request.query.search),
});
const idParam = (request, name) => String(request.params[name] ?? "");
export const productionBoardController = {
    async getBoard(request, response) {
        sendSuccess(response, await productionBoardService.getBoard(queryInput(request)));
    },
    async getSummary(request, response) {
        const board = await productionBoardService.getBoard(queryInput(request));
        sendSuccess(response, board.metrics);
    },
    async getReports(request, response) {
        sendSuccess(response, await productionBoardService.getBoard(queryInput(request)));
    },
    async listWorkCenters(_request, response) {
        sendSuccess(response, await productionBoardService.listWorkCenters());
    },
    async getCapacity(_request, response) {
        sendSuccess(response, await productionBoardService.listWorkCenters());
    },
    async getCalendar(request, response) {
        sendSuccess(response, await productionBoardService.listCalendar(queryInput(request)));
    },
    async listBlocks(request, response) {
        const status = queryString(request.query.status);
        sendSuccess(response, await productionBoardService.listBlocks(status));
    },
    async createBlock(request, response) {
        const actor = getRequestLogActorContext(request);
        sendSuccess(response, await productionBoardService.createBlock(productionBlockCreateSchema.parse(request.body), actor.userId ?? null), 201);
    },
    async resolveBlock(request, response) {
        const actor = getRequestLogActorContext(request);
        sendSuccess(response, await productionBoardService.resolveBlock(idParam(request, "blockId"), productionBlockResolveSchema.parse(request.body), actor.userId ?? null));
    },
    async transitionJob(request, response) {
        const actor = getRequestLogActorContext(request);
        sendSuccess(response, await productionBoardService.transitionJob(idParam(request, "id"), productionTransitionSchema.parse(request.body), actor.userId ?? null));
    },
    async scheduleJob(request, response) {
        const actor = getRequestLogActorContext(request);
        sendSuccess(response, await productionBoardService.scheduleJob(idParam(request, "id"), productionScheduleSchema.parse(request.body), actor.userId ?? null));
    },
    async assignTask(request, response) {
        const actor = getRequestLogActorContext(request);
        sendSuccess(response, await productionBoardService.assignTask(idParam(request, "taskId"), productionTaskAssignmentSchema.parse(request.body), actor.userId ?? null));
    },
    async transitionTask(request, response) {
        const actor = getRequestLogActorContext(request);
        const body = productionTaskTransitionSchema.parse(request.body);
        sendSuccess(response, await productionBoardService.transitionTask(idParam(request, "taskId"), body.toStatus, body.reason, actor.userId ?? null));
    },
    async createWasteEntry(request, response) {
        const actor = getRequestLogActorContext(request);
        sendSuccess(response, await productionBoardService.createWasteEntry(productionWasteEntrySchema.parse(request.body), actor.userId ?? null), 201);
    },
    async exportBoard(request, response) {
        const csv = await productionBoardService.exportBoard(queryInput(request));
        response.setHeader("Content-Type", "text/csv; charset=utf-8");
        response.setHeader("Content-Disposition", `attachment; filename="plan-produccion-${new Date().toISOString().slice(0, 10)}.csv"`);
        response.send(csv);
    },
};
//# sourceMappingURL=production-board.controller.js.map