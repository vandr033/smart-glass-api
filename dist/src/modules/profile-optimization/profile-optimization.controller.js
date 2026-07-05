import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { profileOptimizationService } from "./profile-optimization.service.js";
import { listProfileCuttingPlansQuerySchema, listProfileOptimizationsQuerySchema, profileCuttingPlanIdParamSchema, profileOptimizationRunIdParamSchema, quotationIdParamSchema, quotationProfileOptimizationSchema, runProfileOptimizationSchema, } from "./profile-optimization.validators.js";
const getQueryValue = (value) => {
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
const getRequiredRunId = (value) => {
    const runId = Array.isArray(value) ? value[0] : value;
    if (!runId) {
        throw new AppError("Profile optimization run id is required.", 400);
    }
    return profileOptimizationRunIdParamSchema.parse({
        id: runId,
    }).id;
};
const getRequiredPlanId = (value) => {
    const planId = Array.isArray(value) ? value[0] : value;
    if (!planId) {
        throw new AppError("Profile cutting plan id is required.", 400);
    }
    return profileCuttingPlanIdParamSchema.parse({
        id: planId,
    }).id;
};
const getRequiredQuotationId = (value) => {
    const quotationId = Array.isArray(value) ? value[0] : value;
    if (!quotationId) {
        throw new AppError("Quotation id is required.", 400);
    }
    return quotationIdParamSchema.parse({
        id: quotationId,
    }).id;
};
export const profileOptimizationController = {
    async listProfileOptimizations(request, response) {
        const query = listProfileOptimizationsQuerySchema.parse({
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
        });
        const result = await profileOptimizationService.listProfileOptimizations(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async runProfileOptimization(request, response) {
        const payload = runProfileOptimizationSchema.parse(request.body);
        const actorContext = getRequestLogActorContext(request);
        const run = await profileOptimizationService.runProfileOptimization(payload, actorContext.userId ?? null);
        sendSuccess(response, run, 201);
    },
    async getProfileOptimizationById(request, response) {
        const run = await profileOptimizationService.getProfileOptimizationById(getRequiredRunId(request.params.id));
        sendSuccess(response, run);
    },
    async generateProfileCuttingPlan(request, response) {
        const actorContext = getRequestLogActorContext(request);
        const plan = await profileOptimizationService.generateProfileCuttingPlan(getRequiredRunId(request.params.id), actorContext.userId ?? null);
        sendSuccess(response, plan, 201);
    },
    async listProfileCuttingPlans(request, response) {
        const query = listProfileCuttingPlansQuerySchema.parse({
            materialId: getQueryValue(request.query["filter.materialId"]),
            optimizationRunId: getQueryValue(request.query["filter.optimizationRunId"]),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await profileOptimizationService.listProfileCuttingPlans(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async getProfileCuttingPlanById(request, response) {
        const plan = await profileOptimizationService.getProfileCuttingPlanById(getRequiredPlanId(request.params.id));
        sendSuccess(response, plan);
    },
    async createProfileRemnants(request, response) {
        const actorContext = getRequestLogActorContext(request);
        const plan = await profileOptimizationService.createProfileRemnants(getRequiredPlanId(request.params.id), actorContext.userId ?? null);
        sendSuccess(response, plan);
    },
    async getQuotationProfileRequirements(request, response) {
        const requirements = await profileOptimizationService.collectProfileRequirementsFromQuotation(getRequiredQuotationId(request.params.id));
        sendSuccess(response, requirements);
    },
    async runQuotationProfileOptimization(request, response) {
        const quotationId = getRequiredQuotationId(request.params.id);
        const payload = quotationProfileOptimizationSchema.parse(request.body ?? {});
        const actorContext = getRequestLogActorContext(request);
        const result = await profileOptimizationService.runQuotationProfileOptimizations(quotationId, payload, actorContext.userId ?? null);
        sendSuccess(response, result, 201);
    },
};
//# sourceMappingURL=profile-optimization.controller.js.map