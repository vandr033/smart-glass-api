import type { Request, Response } from "express";

import { sendSuccess } from "../../utils/response.js";
import { tablerosService } from "./tableros.service.js";
import { tablerosPanelQuerySchema } from "./tableros.validators.js";

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

export const tablerosController = {
  async getPanelEjecutivo(request: Request, response: Response) {
    const query = tablerosPanelQuerySchema.parse({
      clientId: getQueryValue(request.query["filter.clientId"]),
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      projectId: getQueryValue(request.query["filter.projectId"]),
      responsibleId: getQueryValue(request.query["filter.responsibleId"]),
      salesUserId: getQueryValue(request.query["filter.salesUserId"]),
      status: getQueryValue(request.query["filter.status"]),
      warehouseId: getQueryValue(request.query["filter.warehouseId"]),
    });

    const panel = await tablerosService.getPanelEjecutivo(query);
    sendSuccess(response, panel);
  },
};
