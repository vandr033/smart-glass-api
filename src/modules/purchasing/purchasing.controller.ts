import type { Request, Response } from "express";

import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import { purchasingService } from "./purchasing.service.js";
import {
  createInventoryShortagePurchaseRequestSchema,
  createPurchaseOrderSchema,
  createPurchaseRequestSchema,
  cuttingPlanIdParamSchema,
  listPurchaseOrdersQuerySchema,
  listPurchaseReceiptsQuerySchema,
  listPurchaseRequestsQuerySchema,
  listSupplierComparisonsQuerySchema,
  profileCuttingPlanIdParamSchema,
  purchaseOrderIdParamSchema,
  purchaseOrderStatusNoteSchema,
  purchaseReceiptIdParamSchema,
  purchaseRequestDecisionSchema,
  purchaseRequestIdParamSchema,
  quotationIdParamSchema,
  receivePurchaseOrderSchema,
  supplierComparisonApprovalSchema,
  supplierComparisonIdParamSchema,
  supplierComparisonRunSchema,
  updatePurchaseOrderSchema,
  updatePurchaseRequestSchema,
} from "./purchasing.validators.js";
import { PURCHASING_PERMISSIONS } from "./purchasing.constants.js";

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

const getRequiredPurchaseRequestId = (value: string | string[] | undefined): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new AppError("Purchase request id is required.", 400);
  }

  return purchaseRequestIdParamSchema.parse({
    id,
  }).id;
};

const getRequiredSupplierComparisonId = (value: string | string[] | undefined): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new AppError("Supplier comparison id is required.", 400);
  }

  return supplierComparisonIdParamSchema.parse({
    id,
  }).id;
};

const getRequiredPurchaseOrderId = (value: string | string[] | undefined): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new AppError("Purchase order id is required.", 400);
  }

  return purchaseOrderIdParamSchema.parse({
    id,
  }).id;
};

const getRequiredPurchaseReceiptId = (value: string | string[] | undefined): string => {
  const id = Array.isArray(value) ? value[0] : value;

  if (!id) {
    throw new AppError("Purchase receipt id is required.", 400);
  }

  return purchaseReceiptIdParamSchema.parse({
    id,
  }).id;
};

const canViewCost = (request: Request): boolean => {
  return (
    request.authorizationSummary?.permissions.includes(
      PURCHASING_PERMISSIONS.viewCost,
    ) ?? false
  );
};

export const purchasingController = {
  async getDashboard(request: Request, response: Response) {
    const dashboard = await purchasingService.getDashboard({
      canViewCost: canViewCost(request),
    });

    sendSuccess(response, dashboard);
  },

  async listPurchaseRequests(request: Request, response: Response) {
    const query = listPurchaseRequestsQuerySchema.parse({
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      sourceType: getQueryValue(request.query["filter.sourceType"]),
      status: getQueryValue(request.query["filter.status"]),
    });

    const result = await purchasingService.listPurchaseRequests(query, {
      canViewCost: canViewCost(request),
    });
    sendPaginated(response, result.data, result.pagination);
  },

  async getPurchaseRequestById(request: Request, response: Response) {
    const record = await purchasingService.getPurchaseRequestById(
      getRequiredPurchaseRequestId(request.params.id),
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async createPurchaseRequest(request: Request, response: Response) {
    const payload = createPurchaseRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.createPurchaseRequest(
      payload,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record, 201);
  },

  async updatePurchaseRequest(request: Request, response: Response) {
    const payload = updatePurchaseRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.updatePurchaseRequest(
      getRequiredPurchaseRequestId(request.params.id),
      payload,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async deletePurchaseRequest(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await purchasingService.deletePurchaseRequest(
      getRequiredPurchaseRequestId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async createPurchaseRequestFromQuotation(request: Request, response: Response) {
    const { quotationId } = quotationIdParamSchema.parse(request.params);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.createPurchaseRequestFromQuotation(
      quotationId,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record, 201);
  },

  async createPurchaseRequestFromCuttingPlan(request: Request, response: Response) {
    const { cuttingPlanId } = cuttingPlanIdParamSchema.parse(request.params);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.createPurchaseRequestFromCuttingPlan(
      cuttingPlanId,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record, 201);
  },

  async createPurchaseRequestFromProfileCuttingPlan(
    request: Request,
    response: Response,
  ) {
    const { profileCuttingPlanId } = profileCuttingPlanIdParamSchema.parse(
      request.params,
    );
    const actorContext = getRequestLogActorContext(request);
    const record =
      await purchasingService.createPurchaseRequestFromProfileCuttingPlan(
        profileCuttingPlanId,
        actorContext.userId ?? null,
        {
          canViewCost: canViewCost(request),
        },
      );

    sendSuccess(response, record, 201);
  },

  async createPurchaseRequestFromInventoryShortage(
    request: Request,
    response: Response,
  ) {
    const payload = createInventoryShortagePurchaseRequestSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.createPurchaseRequestFromInventoryShortage(
      payload,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record, 201);
  },

  async approvePurchaseRequest(request: Request, response: Response) {
    const payload = purchaseRequestDecisionSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.approvePurchaseRequest(
      getRequiredPurchaseRequestId(request.params.id),
      actorContext.userId ?? null,
      payload,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async rejectPurchaseRequest(request: Request, response: Response) {
    const payload = purchaseRequestDecisionSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.rejectPurchaseRequest(
      getRequiredPurchaseRequestId(request.params.id),
      actorContext.userId ?? null,
      payload,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async compareSuppliersForPurchaseRequest(request: Request, response: Response) {
    const payload = supplierComparisonRunSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.compareSuppliersForPurchaseRequest(
      getRequiredPurchaseRequestId(request.params.id),
      payload,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record, 201);
  },

  async listSupplierComparisons(request: Request, response: Response) {
    const query = listSupplierComparisonsQuerySchema.parse({
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      purchaseRequestId: getQueryValue(request.query["filter.purchaseRequestId"]),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
    });

    const result = await purchasingService.listSupplierComparisons(query);
    sendPaginated(response, result.data, result.pagination);
  },

  async getSupplierComparisonById(request: Request, response: Response) {
    const record = await purchasingService.getSupplierComparisonById(
      getRequiredSupplierComparisonId(request.params.id),
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async approveSupplierComparison(request: Request, response: Response) {
    supplierComparisonApprovalSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.approveSupplierComparison(
      getRequiredSupplierComparisonId(request.params.id),
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async createPurchaseOrdersFromComparison(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const records = await purchasingService.createPurchaseOrdersFromComparison(
      getRequiredSupplierComparisonId(request.params.id),
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, records, 201);
  },

  async listPurchaseOrders(request: Request, response: Response) {
    const query = listPurchaseOrdersQuerySchema.parse({
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      purchaseRequestId: getQueryValue(request.query["filter.purchaseRequestId"]),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
      supplierId: getQueryValue(request.query["filter.supplierId"]),
    });

    const result = await purchasingService.listPurchaseOrders(query, {
      canViewCost: canViewCost(request),
    });
    sendPaginated(response, result.data, result.pagination);
  },

  async getPurchaseOrderById(request: Request, response: Response) {
    const record = await purchasingService.getPurchaseOrderById(
      getRequiredPurchaseOrderId(request.params.id),
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async createPurchaseOrder(request: Request, response: Response) {
    const payload = createPurchaseOrderSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.createPurchaseOrderManually(
      payload,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record, 201);
  },

  async updatePurchaseOrder(request: Request, response: Response) {
    const payload = updatePurchaseOrderSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.updatePurchaseOrder(
      getRequiredPurchaseOrderId(request.params.id),
      payload,
      actorContext.userId ?? null,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async deletePurchaseOrder(request: Request, response: Response) {
    const actorContext = getRequestLogActorContext(request);
    const result = await purchasingService.deletePurchaseOrder(
      getRequiredPurchaseOrderId(request.params.id),
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async sendPurchaseOrder(request: Request, response: Response) {
    const payload = purchaseOrderStatusNoteSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.sendPurchaseOrder(
      getRequiredPurchaseOrderId(request.params.id),
      actorContext.userId ?? null,
      payload.notes,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async confirmPurchaseOrder(request: Request, response: Response) {
    const payload = purchaseOrderStatusNoteSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.confirmPurchaseOrder(
      getRequiredPurchaseOrderId(request.params.id),
      actorContext.userId ?? null,
      payload.notes,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async cancelPurchaseOrder(request: Request, response: Response) {
    const payload = purchaseOrderStatusNoteSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const record = await purchasingService.cancelPurchaseOrder(
      getRequiredPurchaseOrderId(request.params.id),
      actorContext.userId ?? null,
      payload.notes,
      {
        canViewCost: canViewCost(request),
      },
    );

    sendSuccess(response, record);
  },

  async receivePurchaseOrder(request: Request, response: Response) {
    const payload = receivePurchaseOrderSchema.parse(request.body);
    const actorContext = getRequestLogActorContext(request);
    const result = await purchasingService.receivePurchaseOrder(
      getRequiredPurchaseOrderId(request.params.id),
      payload,
      actorContext.userId ?? null,
    );

    sendSuccess(response, result);
  },

  async listPurchaseReceipts(request: Request, response: Response) {
    const query = listPurchaseReceiptsQuerySchema.parse({
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      purchaseOrderId: getQueryValue(request.query["filter.purchaseOrderId"]),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      warehouseId: getQueryValue(request.query["filter.warehouseId"]),
    });

    const result = await purchasingService.listPurchaseReceipts(query);
    sendPaginated(response, result.data, result.pagination);
  },

  async getPurchaseReceiptById(request: Request, response: Response) {
    const record = await purchasingService.getPurchaseReceiptById(
      getRequiredPurchaseReceiptId(request.params.id),
    );

    sendSuccess(response, record);
  },
};
