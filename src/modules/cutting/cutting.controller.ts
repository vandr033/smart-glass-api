import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { cuttingService } from "./cutting.service.js";
import {
  approveCuttingPlanSchema,
  cuttingOptimizationRunIdParamSchema,
  cuttingPlanIdParamSchema,
  listCuttingOptimizationsQuerySchema,
  listCuttingPlansQuerySchema,
  quotationGlassOptimizationSchema,
  quotationIdParamSchema,
  runGlassOptimizationSchema,
} from "./cutting.validators.js";

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

const getRequiredRunId = (value: string | string[] | undefined): string => {
  const runId = Array.isArray(value) ? value[0] : value;

  if (!runId) {
    throw new AppError("Cutting optimization run id is required.", 400);
  }

  return cuttingOptimizationRunIdParamSchema.parse({
    id: runId,
  }).id;
};

const getRequiredPlanId = (value: string | string[] | undefined): string => {
  const cuttingPlanId = Array.isArray(value) ? value[0] : value;

  if (!cuttingPlanId) {
    throw new AppError("Cutting plan id is required.", 400);
  }

  return cuttingPlanIdParamSchema.parse({
    id: cuttingPlanId,
  }).id;
};

const getRequiredQuotationId = (value: string | string[] | undefined): string => {
  const quotationId = Array.isArray(value) ? value[0] : value;

  if (!quotationId) {
    throw new AppError("Quotation id is required.", 400);
  }

  return quotationIdParamSchema.parse({
    id: quotationId,
  }).id;
};

export const cuttingController = {
  async listCuttingOptimizations(request: Request, response: Response) {
    const query = listCuttingOptimizationsQuerySchema.parse({
      materialId: getQueryValue(request.query["filter.materialId"]),
      mode: getQueryValue(request.query["filter.mode"]),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      projectId: getQueryValue(request.query["filter.projectId"]),
      quotationId: getQueryValue(request.query["filter.quotationId"]),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
      warehouseId: getQueryValue(request.query["filter.warehouseId"]),
    });
    const result = await cuttingService.listCuttingOptimizations(query);

    sendPaginated(response, result.data, result.pagination);
  },

  async runGlassOptimization(request: Request, response: Response) {
    const payload = runGlassOptimizationSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const run = await cuttingService.runGlassOptimization(
      payload,
      actorContext.userId ?? null,
    );

    sendSuccess(response, run, 201);
  },

  async getCuttingOptimizationById(request: Request, response: Response) {
    const run = await cuttingService.getCuttingOptimizationRunById(
      getRequiredRunId(request.params.id),
    );

    sendSuccess(response, run);
  },

  async generateCuttingPlanFromRun(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const plans = await cuttingService.generateCuttingPlanFromOptimizationRun(
      getRequiredRunId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, plans, 201);
  },

  async cancelCuttingOptimizationRun(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const run = await cuttingService.cancelOptimizationRun(
      getRequiredRunId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, run);
  },

  async getQuotationGlassRequirements(request: Request, response: Response) {
    const requirements = await cuttingService.collectGlassRequirementsFromQuotation(
      getRequiredQuotationId(request.params.id),
    );

    sendSuccess(response, requirements);
  },

  async runQuotationGlassOptimization(request: Request, response: Response) {
    const quotationId = getRequiredQuotationId(request.params.id);
    const payload = quotationGlassOptimizationSchema.parse(request.body ?? {});
    const requirements =
      await cuttingService.collectGlassRequirementsFromQuotation(quotationId);

    if (requirements.pieces.length === 0) {
      throw new AppError(
        "No glass sheet requirements could be extracted from this quotation.",
        400,
      );
    }

    const actorContext = getRequestLogActorContext(request);
    const run = await cuttingService.runGlassOptimization(
      {
        allowRotation: payload.allowRotation,
        materialId: payload.materialId,
        mode: payload.mode,
        pieces: requirements.pieces,
        preferRemnants: payload.preferRemnants,
        projectId: null,
        quotationId,
        warehouseId: payload.warehouseId,
      },
      actorContext.userId ?? null,
    );

    sendSuccess(response, {
      requirements,
      run,
    }, 201);
  },

  async listCuttingPlans(request: Request, response: Response) {
    const query = listCuttingPlansQuerySchema.parse({
      materialId: getQueryValue(request.query["filter.materialId"]),
      optimizationRunId: getQueryValue(request.query["filter.optimizationRunId"]),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
      warehouseId: getQueryValue(request.query["filter.warehouseId"]),
    });
    const result = await cuttingService.listCuttingPlans(query);

    sendPaginated(response, result.data, result.pagination);
  },

  async getCuttingPlanById(request: Request, response: Response) {
    const plan = await cuttingService.getCuttingPlanById(
      getRequiredPlanId(request.params.id),
    );

    sendSuccess(response, plan);
  },

  async approveCuttingPlan(request: Request, response: Response) {
    const payload = approveCuttingPlanSchema.parse(request.body ?? {});
    const actorContext = getRequestLogActorContext(request);
    const plan = await cuttingService.approveCuttingPlan(
      getRequiredPlanId(request.params.id),
      actorContext.userId ?? null,
      payload,
    );

    sendSuccess(response, plan);
  },

  async createRemnantsFromCuttingPlan(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const plan = await cuttingService.createRemnantsFromCuttingPlan(
      getRequiredPlanId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, plan);
  },

  async getPrintableCuttingPlan(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const plan = await cuttingService.getPrintableCuttingPlan(
      getRequiredPlanId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, plan);
  },
};
