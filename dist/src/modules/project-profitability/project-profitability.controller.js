import { AppError } from "../../utils/app-error.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { projectProfitabilityService } from "./project-profitability.service.js";
import { listProjectProfitabilityDashboardQuerySchema, listProjectProfitabilityQuerySchema, projectProfitabilityProjectIdParamSchema, } from "./project-profitability.validators.js";
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
const getRequiredProjectId = (value) => {
    const projectId = Array.isArray(value) ? value[0] : value;
    if (!projectId) {
        throw new AppError("Project id is required.", 400);
    }
    return projectProfitabilityProjectIdParamSchema.parse({
        id: projectId,
    }).id;
};
export const projectProfitabilityController = {
    async getDashboard(request, response) {
        const query = listProjectProfitabilityDashboardQuerySchema.parse({
            clientId: getQueryValue(request.query["filter.clientId"]),
            dateFrom: getQueryValue(request.query.dateFrom),
            dateTo: getQueryValue(request.query.dateTo),
            priority: getQueryValue(request.query["filter.priority"]),
            projectType: getQueryValue(request.query["filter.projectType"]),
            salesUserId: getQueryValue(request.query["filter.salesUserId"]),
            search: getQueryValue(request.query.search),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await projectProfitabilityService.getDashboard(query);
        sendSuccess(response, result);
    },
    async listProjectProfitability(request, response) {
        const query = listProjectProfitabilityQuerySchema.parse({
            clientId: getQueryValue(request.query["filter.clientId"]),
            dateFrom: getQueryValue(request.query.dateFrom),
            dateTo: getQueryValue(request.query.dateTo),
            page: getQueryValue(request.query.page),
            perPage: getQueryValue(request.query.perPage),
            priority: getQueryValue(request.query["filter.priority"]),
            projectType: getQueryValue(request.query["filter.projectType"]),
            salesUserId: getQueryValue(request.query["filter.salesUserId"]),
            search: getQueryValue(request.query.search),
            sortBy: getQueryValue(request.query.sortBy),
            sortDirection: getQueryValue(request.query.sortDirection),
            status: getQueryValue(request.query["filter.status"]),
        });
        const result = await projectProfitabilityService.listProjectProfitability(query);
        sendPaginated(response, result.data, result.pagination);
    },
    async getProjectProfitabilityByProjectId(request, response) {
        const result = await projectProfitabilityService.getProjectProfitabilityByProjectId(getRequiredProjectId(request.params.id));
        sendSuccess(response, result);
    },
};
//# sourceMappingURL=project-profitability.controller.js.map