import type { Request, Response } from "express";

import { sendSuccess } from "../../utils/response.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { productionBoardService } from "./production-board.service.js";
import {
  productionBlockCreateSchema,
  productionBlockResolveSchema,
  productionBoardQuerySchema,
  productionScheduleSchema,
  productionTaskAssignmentSchema,
  productionTaskTransitionSchema,
  productionTransitionSchema,
  productionWasteEntrySchema,
} from "./production.validators.js";

const queryString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const queryInput = (request: Request) =>
  productionBoardQuerySchema.parse({
    dateFrom: queryString(request.query.dateFrom),
    dateTo: queryString(request.query.dateTo),
    priority: queryString(request.query.priority),
    search: queryString(request.query.search),
  });

const idParam = (request: Request, name: string) =>
  String(request.params[name] ?? "");

export const productionBoardController = {
  async getBoard(request: Request, response: Response) {
    sendSuccess(
      response,
      await productionBoardService.getBoard(queryInput(request)),
    );
  },

  async getSummary(request: Request, response: Response) {
    const board = await productionBoardService.getBoard(queryInput(request));
    sendSuccess(response, board.metrics);
  },

  async getReports(request: Request, response: Response) {
    sendSuccess(
      response,
      await productionBoardService.getBoard(queryInput(request)),
    );
  },

  async listWorkCenters(_request: Request, response: Response) {
    sendSuccess(response, await productionBoardService.listWorkCenters());
  },

  async getCapacity(_request: Request, response: Response) {
    sendSuccess(response, await productionBoardService.listWorkCenters());
  },

  async getCalendar(request: Request, response: Response) {
    sendSuccess(
      response,
      await productionBoardService.listCalendar(queryInput(request)),
    );
  },

  async listBlocks(request: Request, response: Response) {
    const status = queryString(request.query.status) as
      | "OPEN"
      | "UNDER_REVIEW"
      | "IN_PROGRESS"
      | "RESOLVED"
      | "DISMISSED"
      | undefined;
    sendSuccess(response, await productionBoardService.listBlocks(status));
  },

  async createBlock(request: Request, response: Response) {
    const actor = getRequestLogActorContext(request);
    sendSuccess(
      response,
      await productionBoardService.createBlock(
        productionBlockCreateSchema.parse(request.body),
        actor.userId ?? null,
      ),
      201,
    );
  },

  async resolveBlock(request: Request, response: Response) {
    const actor = getRequestLogActorContext(request);
    sendSuccess(
      response,
      await productionBoardService.resolveBlock(
        idParam(request, "blockId"),
        productionBlockResolveSchema.parse(request.body),
        actor.userId ?? null,
      ),
    );
  },

  async transitionJob(request: Request, response: Response) {
    const actor = getRequestLogActorContext(request);
    sendSuccess(
      response,
      await productionBoardService.transitionJob(
        idParam(request, "id"),
        productionTransitionSchema.parse(request.body),
        actor.userId ?? null,
      ),
    );
  },

  async scheduleJob(request: Request, response: Response) {
    const actor = getRequestLogActorContext(request);
    sendSuccess(
      response,
      await productionBoardService.scheduleJob(
        idParam(request, "id"),
        productionScheduleSchema.parse(request.body),
        actor.userId ?? null,
      ),
    );
  },

  async assignTask(request: Request, response: Response) {
    const actor = getRequestLogActorContext(request);
    sendSuccess(
      response,
      await productionBoardService.assignTask(
        idParam(request, "taskId"),
        productionTaskAssignmentSchema.parse(request.body),
        actor.userId ?? null,
      ),
    );
  },

  async transitionTask(request: Request, response: Response) {
    const actor = getRequestLogActorContext(request);
    const body = productionTaskTransitionSchema.parse(request.body);
    sendSuccess(
      response,
      await productionBoardService.transitionTask(
        idParam(request, "taskId"),
        body.toStatus,
        body.reason,
        actor.userId ?? null,
      ),
    );
  },

  async createWasteEntry(request: Request, response: Response) {
    const actor = getRequestLogActorContext(request);
    sendSuccess(
      response,
      await productionBoardService.createWasteEntry(
        productionWasteEntrySchema.parse(request.body),
        actor.userId ?? null,
      ),
      201,
    );
  },

  async exportBoard(request: Request, response: Response) {
    const csv = await productionBoardService.exportBoard(queryInput(request));
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="plan-produccion-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    response.send(csv);
  },
};
