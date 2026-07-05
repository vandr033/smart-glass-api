import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { productionService } from "./production.service.js";
import {
  assignProductionJobSchema,
  consumeMaterialForTaskSchema,
  createProductionJobSchema,
  cuttingPlanIdParamSchema,
  generateProductionTasksSchema,
  listProductionJobsQuerySchema,
  profileCuttingPlanIdParamSchema,
  productionJobIdParamSchema,
  productionTaskIdParamSchema,
  qualityCheckMutationSchema,
  quotationIdParamSchema,
  updateProductionJobSchema,
  updateProductionTaskSchema,
} from "./production.validators.js";

const getQueryValue = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const firstValue = value[0];

    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return undefined;
};

const getRequiredProductionJobId = (value: string | string[] | undefined): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new AppError("Production job id is required.", 400);
  }

  return productionJobIdParamSchema.parse({
    id,
  }).id;
};

const getRequiredProductionTaskId = (value: string | string[] | undefined): string => {
  const taskId = Array.isArray(value) ? value[0] : value;

  if (!taskId) {
    throw new AppError("Production task id is required.", 400);
  }

  return productionTaskIdParamSchema.parse({
    taskId,
  }).taskId;
};

const getRequiredQuotationId = (value: string | string[] | undefined): string => {
  const quotationId = Array.isArray(value) ? value[0] : value;

  if (!quotationId) {
    throw new AppError("Quotation id is required.", 400);
  }

  return quotationIdParamSchema.parse({
    quotationId,
  }).quotationId;
};

const getRequiredCuttingPlanId = (value: string | string[] | undefined): string => {
  const cuttingPlanId = Array.isArray(value) ? value[0] : value;

  if (!cuttingPlanId) {
    throw new AppError("Cutting plan id is required.", 400);
  }

  return cuttingPlanIdParamSchema.parse({
    cuttingPlanId,
  }).cuttingPlanId;
};

export const productionController = {
  async listProductionJobs(request: Request, response: Response) {
    const query = listProductionJobsQuerySchema.parse({
      assignedToUserId: getQueryValue(request.query["filter.assignedToUserId"]),
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      priority: getQueryValue(request.query["filter.priority"]),
      projectId: getQueryValue(request.query["filter.projectId"]),
      quotationId: getQueryValue(request.query["filter.quotationId"]),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
    });

    const result = await productionService.listProductionJobs(query);
    sendPaginated(response, result.data, result.pagination);
  },

  async createProductionJob(request: Request, response: Response) {
    const payload = createProductionJobSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.createProductionJobManually(
      payload,
      actorContext.userId ?? null,
    );

    sendSuccess(response, result, 201);
  },

  async getProductionJobById(request: Request, response: Response) {
    const result = await productionService.getProductionJobById(
      getRequiredProductionJobId(request.params.id),
    );

    sendSuccess(response, result);
  },

  async updateProductionJob(request: Request, response: Response) {
    const payload = updateProductionJobSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.updateProductionJob(
      getRequiredProductionJobId(request.params.id),
      payload,
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async deleteProductionJob(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.deleteProductionJob(
      getRequiredProductionJobId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async createProductionJobFromQuotation(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.createProductionJobFromQuotation(
      getRequiredQuotationId(request.params.quotationId),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result, 201);
  },

  async createProductionJobFromCuttingPlan(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.createProductionJobFromCuttingPlan(
      getRequiredCuttingPlanId(request.params.cuttingPlanId),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result, 201);
  },

  async createProductionJobFromProfileCuttingPlan(
    request: Request,
    response: Response,
  ) {
    const actorContext = getRequestLogActorContext(request);
    const { profileCuttingPlanId } = profileCuttingPlanIdParamSchema.parse(
      request.params,
    );
    const result =
      await productionService.createProductionJobFromProfileCuttingPlan(
        profileCuttingPlanId,
        actorContext.userId ?? null,
      );

    sendSuccess(response, result, 201);
  },

  async startProductionJob(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.startProductionJob(
      getRequiredProductionJobId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async pauseProductionJob(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.pauseProductionJob(
      getRequiredProductionJobId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async completeProductionJob(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.completeProductionJob(
      getRequiredProductionJobId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async cancelProductionJob(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.cancelProductionJob(
      getRequiredProductionJobId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async assignProductionJob(request: Request, response: Response) {
    const payload = assignProductionJobSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.assignProductionJob(
      getRequiredProductionJobId(request.params.id),
      payload.assignedToUserId,
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async listProductionJobTasks(request: Request, response: Response) {
    const result = await productionService.listProductionJobTasks(
      getRequiredProductionJobId(request.params.id),
    );

    sendSuccess(response, result);
  },

  async generateProductionTasks(request: Request, response: Response) {
    const payload = generateProductionTasksSchema.parse(request.body ?? {});
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.generateProductionTasks(
      getRequiredProductionJobId(request.params.id),
      actorContext.userId ?? null,
      payload,
    );

    sendSuccess(response, result, 201);
  },

  async getProductionJobConsumption(request: Request, response: Response) {
    const job = await productionService.getProductionJobById(
      getRequiredProductionJobId(request.params.id),
    );

    sendSuccess(response, job.materialConsumptions);
  },

  async updateProductionTask(request: Request, response: Response) {
    const payload = updateProductionTaskSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.updateProductionTask(
      getRequiredProductionTaskId(request.params.taskId),
      payload,
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async startProductionTask(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.startProductionTask(
      getRequiredProductionTaskId(request.params.taskId),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async completeProductionTask(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.completeProductionTask(
      getRequiredProductionTaskId(request.params.taskId),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async consumeMaterialForTask(request: Request, response: Response) {
    const payload = consumeMaterialForTaskSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.consumeMaterialForTask(
      getRequiredProductionTaskId(request.params.taskId),
      payload,
      actorContext.userId ?? null,
    );

    sendSuccess(response, result, 201);
  },

  async listQualityChecks(request: Request, response: Response) {
    const result = await productionService.listQualityChecks(
      getRequiredProductionJobId(request.params.id),
    );

    sendSuccess(response, result);
  },

  async recordQualityCheck(request: Request, response: Response) {
    const payload = qualityCheckMutationSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.recordQualityCheck(
      getRequiredProductionJobId(request.params.id),
      payload,
      actorContext.userId ?? null,
    );

    sendSuccess(response, result, 201);
  },

  async getWasteReport(request: Request, response: Response) {
    const result = await productionService.getWasteReport(
      getRequiredProductionJobId(request.params.id),
    );

    sendSuccess(response, result);
  },

  async calculateWasteReport(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await productionService.calculateProductionWaste(
      getRequiredProductionJobId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },
};
