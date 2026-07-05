import type { Request, Response } from "express";

import { activityLogService } from "../../services/activity-log-service.js";
import { auditLogService } from "../../services/audit-log-service.js";
import { SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE } from "../materials/materials.constants.js";
import { AppError } from "../../utils/app-error.js";
import { getRequestLogActorContext } from "../../utils/request-context.js";
import { sendPaginated, sendSuccess } from "../../utils/response.js";
import {
  PRICE_LIST_IMPORT_ENTITY_TYPE,
  PRICE_LIST_IMPORT_ROW_ENTITY_TYPE,
  PRICE_LISTS_PERMISSIONS,
  SUPPLIER_MATERIAL_PRICE_ENTITY_TYPE,
} from "./price-lists.constants.js";
import { priceListsService } from "./price-lists.service.js";
import {
  importPriceListSchema,
  listPriceHistoryQuerySchema,
  listPriceListImportRowsQuerySchema,
  listPriceListImportsQuerySchema,
  mapPriceListImportRowSchema,
  materialIdParamSchema,
  priceListFileUploadSchema,
  priceListImportIdParamSchema,
  priceListImportRowParamsSchema,
  supplierIdParamSchema,
} from "./price-lists.validators.js";

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

const getRequiredImportId = (value: string | string[] | undefined): string => {
  const importId = Array.isArray(value) ? value[0] : value;

  if (!importId) {
    throw new AppError("Import id is required.", 400);
  }

  return priceListImportIdParamSchema.parse({
    id: importId,
  }).id;
};

const getRequiredImportRowParams = (
  importIdValue: string | string[] | undefined,
  rowIdValue: string | string[] | undefined,
) => {
  const importId = Array.isArray(importIdValue) ? importIdValue[0] : importIdValue;
  const rowId = Array.isArray(rowIdValue) ? rowIdValue[0] : rowIdValue;

  if (!importId || !rowId) {
    throw new AppError("Import id and row id are required.", 400);
  }

  return priceListImportRowParamsSchema.parse({
    id: importId,
    rowId,
  });
};

const getRequiredMaterialId = (value: string | string[] | undefined): string => {
  const materialId = Array.isArray(value) ? value[0] : value;

  if (!materialId) {
    throw new AppError("Material id is required.", 400);
  }

  return materialIdParamSchema.parse({
    id: materialId,
  }).id;
};

const getRequiredSupplierId = (value: string | string[] | undefined): string => {
  const supplierId = Array.isArray(value) ? value[0] : value;

  if (!supplierId) {
    throw new AppError("Supplier id is required.", 400);
  }

  return supplierIdParamSchema.parse({
    id: supplierId,
  }).id;
};

const getAuthenticatedUserId = (request: Request): string => {
  const userId = request.authSession?.user.id;

  if (!userId) {
    throw new AppError("Authentication required.", 401);
  }

  return userId;
};

const logActivityEvent = async (
  request: Request,
  payload: {
    action: string;
    entityId: string;
    entityType: string;
    metadata?: unknown;
  },
) => {
  const actorContext = getRequestLogActorContext(request);

  await activityLogService.logUserAction({
    ...actorContext,
    action: payload.action,
    entityId: payload.entityId,
    entityType: payload.entityType,
    metadata: payload.metadata,
  });
};

const logAuditEvent = async (
  request: Request,
  payload: {
    action: string;
    after: unknown;
    before: unknown;
    entityId: string;
    entityType: string;
    metadata?: unknown;
  },
) => {
  const actorContext = getRequestLogActorContext(request);

  await auditLogService.create({
    action: payload.action,
    actorUserId: actorContext.userId,
    after: payload.after,
    before: payload.before,
    entityId: payload.entityId,
    entityType: payload.entityType,
    ipAddress: actorContext.ipAddress,
    metadata: payload.metadata,
    userAgent: actorContext.userAgent,
  });
};

export const priceListsController = {
  async importPriceList(request: Request, response: Response) {
    const file = request.file;

    if (!file) {
      throw new AppError("A price list file is required.", 400);
    }

    const payload = importPriceListSchema.parse(request.body);
    const metadata = priceListFileUploadSchema.parse({
      mimetype: file.mimetype,
      originalName: file.originalname,
      size: file.size,
    });
    const createdImport = await priceListsService.createImport(
      payload,
      {
        buffer: file.buffer,
        mimetype: metadata.mimetype,
        originalName: metadata.originalName,
        size: metadata.size,
      },
      getAuthenticatedUserId(request),
    );

    await Promise.all([
      logActivityEvent(request, {
        action: PRICE_LISTS_PERMISSIONS.import,
        entityId: createdImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          fileName: createdImport.fileName,
          rowCount: createdImport.rowCount,
          supplierId: createdImport.supplierId,
        },
      }),
      logAuditEvent(request, {
        action: "price_list_import.imported",
        after: createdImport,
        before: null,
        entityId: createdImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          fileName: createdImport.fileName,
          rowCount: createdImport.rowCount,
          supplierId: createdImport.supplierId,
        },
      }),
    ]);

    sendSuccess(response, createdImport, 201);
  },

  async listImports(request: Request, response: Response) {
    const query = listPriceListImportsQuerySchema.parse({
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      status: getQueryValue(request.query["filter.status"]),
      supplierId: getQueryValue(request.query["filter.supplierId"]),
    });
    const result = await priceListsService.listImports(query);

    sendPaginated(response, result.data, result.pagination);
  },

  async getImportById(request: Request, response: Response) {
    const importRecord = await priceListsService.getImportById(
      getRequiredImportId(request.params.id),
    );

    sendSuccess(response, importRecord);
  },

  async listImportRows(request: Request, response: Response) {
    const importId = getRequiredImportId(request.params.id);
    const query = listPriceListImportRowsQuerySchema.parse({
      attentionOnly: getQueryValue(request.query.attentionOnly),
      mappingStatus: getQueryValue(request.query["filter.mappingStatus"]),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      search: getQueryValue(request.query.search),
      sortBy: getQueryValue(request.query.sortBy),
      sortDirection: getQueryValue(request.query.sortDirection),
      validationStatus: getQueryValue(request.query["filter.validationStatus"]),
    });
    const result = await priceListsService.listImportRows(importId, query);

    sendPaginated(response, result.data, result.pagination);
  },

  async autoMapImportRows(request: Request, response: Response) {
    const importId = getRequiredImportId(request.params.id);
    const before = await priceListsService.getImportById(importId);
    const updatedImport = await priceListsService.autoMapImportRows(importId);

    await Promise.all([
      logActivityEvent(request, {
        action: PRICE_LISTS_PERMISSIONS.validate,
        entityId: updatedImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          mappedCount: updatedImport.mappedCount,
          unmappedCount: updatedImport.unmappedCount,
        },
      }),
      logAuditEvent(request, {
        action: "price_list_import.auto_mapped",
        after: updatedImport,
        before,
        entityId: updatedImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          mappedCount: updatedImport.mappedCount,
          unmappedCount: updatedImport.unmappedCount,
        },
      }),
    ]);

    sendSuccess(response, updatedImport);
  },

  async mapImportRow(request: Request, response: Response) {
    const params = getRequiredImportRowParams(request.params.id, request.params.rowId);
    const beforeRows = await priceListsService.listImportRows(params.id, {
      attentionOnly: false,
      mappingStatus: undefined,
      page: 1,
      perPage: 200,
      search: "",
      sortBy: "rowNumber",
      sortDirection: "asc",
      validationStatus: undefined,
    });
    const before = beforeRows.data.find((row) => row.id === params.rowId) ?? null;
    const payload = mapPriceListImportRowSchema.parse(request.body);
    const mappingResult = await priceListsService.mapImportRow(
      params.id,
      params.rowId,
      payload,
    );
    const updatedRow = mappingResult.row;

    const auditTasks = [
      logActivityEvent(request, {
        action: PRICE_LISTS_PERMISSIONS.validate,
        entityId: updatedRow.id,
        entityType: PRICE_LIST_IMPORT_ROW_ENTITY_TYPE,
        metadata: {
          importId: params.id,
          materialId: payload.materialId,
        },
      }),
      logAuditEvent(request, {
        action: "price_list_import_row.manually_mapped",
        after: updatedRow,
        before,
        entityId: updatedRow.id,
        entityType: PRICE_LIST_IMPORT_ROW_ENTITY_TYPE,
        metadata: {
          createOrUpdateEquivalence: payload.createOrUpdateEquivalence,
          importId: params.id,
          materialId: payload.materialId,
        },
      }),
    ];

    if (mappingResult.supplierMaterialEquivalence) {
      auditTasks.push(
        logAuditEvent(request, {
          action:
            mappingResult.supplierMaterialEquivalence.action === "created"
              ? "supplier_material_equivalence.created"
              : "supplier_material_equivalence.updated",
          after: mappingResult.supplierMaterialEquivalence.current,
          before: mappingResult.supplierMaterialEquivalence.previous,
          entityId: mappingResult.supplierMaterialEquivalence.current.id,
          entityType: SUPPLIER_MATERIAL_EQUIVALENCE_ENTITY_TYPE,
          metadata: {
            importId: params.id,
            rowId: params.rowId,
            source: "price_list_import_mapping",
          },
        }),
      );
    }

    await Promise.all(auditTasks);

    sendSuccess(response, updatedRow);
  },

  async ignoreImportRow(request: Request, response: Response) {
    const params = getRequiredImportRowParams(request.params.id, request.params.rowId);
    const beforeRows = await priceListsService.listImportRows(params.id, {
      attentionOnly: false,
      mappingStatus: undefined,
      page: 1,
      perPage: 200,
      search: "",
      sortBy: "rowNumber",
      sortDirection: "asc",
      validationStatus: undefined,
    });
    const before = beforeRows.data.find((row) => row.id === params.rowId) ?? null;
    const updatedRow = await priceListsService.ignoreImportRow(params.id, params.rowId);

    await Promise.all([
      logActivityEvent(request, {
        action: PRICE_LISTS_PERMISSIONS.validate,
        entityId: updatedRow.id,
        entityType: PRICE_LIST_IMPORT_ROW_ENTITY_TYPE,
        metadata: {
          importId: params.id,
        },
      }),
      logAuditEvent(request, {
        action: "price_list_import_row.ignored",
        after: updatedRow,
        before,
        entityId: updatedRow.id,
        entityType: PRICE_LIST_IMPORT_ROW_ENTITY_TYPE,
        metadata: {
          importId: params.id,
        },
      }),
    ]);

    sendSuccess(response, updatedRow);
  },

  async validateImport(request: Request, response: Response) {
    const importId = getRequiredImportId(request.params.id);
    const before = await priceListsService.getImportById(importId);
    const validatedImport = await priceListsService.validateImport(importId);

    await Promise.all([
      logActivityEvent(request, {
        action: PRICE_LISTS_PERMISSIONS.validate,
        entityId: validatedImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          invalidCount: validatedImport.invalidCount,
          mappedCount: validatedImport.mappedCount,
          status: validatedImport.status,
          unmappedCount: validatedImport.unmappedCount,
        },
      }),
      logAuditEvent(request, {
        action: "price_list_import.validated",
        after: validatedImport,
        before,
        entityId: validatedImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          invalidCount: validatedImport.invalidCount,
          status: validatedImport.status,
        },
      }),
    ]);

    sendSuccess(response, validatedImport);
  },

  async approveImport(request: Request, response: Response) {
    const importId = getRequiredImportId(request.params.id);
    const before = await priceListsService.getImportById(importId);
    const { approvalResult, appliedPriceAudits } = await priceListsService.approveImport(
      importId,
      getAuthenticatedUserId(request),
    );

    const auditTasks = [
      logActivityEvent(request, {
        action: PRICE_LISTS_PERMISSIONS.approve,
        entityId: approvalResult.import.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          appliedPricesCount: approvalResult.appliedPricesCount,
          changeLogsCount: approvalResult.changeLogsCount,
          status: approvalResult.import.status,
        },
      }),
      logAuditEvent(request, {
        action: "price_list_import.approved",
        after: approvalResult.import,
        before,
        entityId: approvalResult.import.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          appliedPricesCount: approvalResult.appliedPricesCount,
          changeLogsCount: approvalResult.changeLogsCount,
          status: approvalResult.import.status,
        },
      }),
    ];

    appliedPriceAudits.forEach((appliedPriceAudit) => {
      auditTasks.push(
        logAuditEvent(request, {
          action: appliedPriceAudit.previous
            ? "supplier_material_price.changed"
            : "supplier_material_price.created",
          after: appliedPriceAudit.current,
          before: appliedPriceAudit.previous,
          entityId: appliedPriceAudit.current.id,
          entityType: SUPPLIER_MATERIAL_PRICE_ENTITY_TYPE,
          metadata: {
            importId,
            materialId: appliedPriceAudit.current.materialId,
            source: "price_list_import_approval",
            supplierId: appliedPriceAudit.current.supplierId,
          },
        }),
      );
    });

    await Promise.all(auditTasks);

    sendSuccess(response, approvalResult);
  },

  async rejectImport(request: Request, response: Response) {
    const importId = getRequiredImportId(request.params.id);
    const before = await priceListsService.getImportById(importId);
    const rejectedImport = await priceListsService.rejectImport(importId);

    await Promise.all([
      logActivityEvent(request, {
        action: PRICE_LISTS_PERMISSIONS.approve,
        entityId: rejectedImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          status: rejectedImport.status,
        },
      }),
      logAuditEvent(request, {
        action: "price_list_import.rejected",
        after: rejectedImport,
        before,
        entityId: rejectedImport.id,
        entityType: PRICE_LIST_IMPORT_ENTITY_TYPE,
        metadata: {
          status: rejectedImport.status,
        },
      }),
    ]);

    sendSuccess(response, rejectedImport);
  },

  async getMaterialSupplierPrices(request: Request, response: Response) {
    const materialId = getRequiredMaterialId(request.params.id);
    const prices = await priceListsService.getCurrentSupplierPrices(materialId);

    sendSuccess(response, prices);
  },

  async getSupplierMaterialPrices(request: Request, response: Response) {
    const supplierId = getRequiredSupplierId(request.params.id);
    const prices = await priceListsService.listSupplierMaterialPrices(supplierId);

    sendSuccess(response, prices);
  },

  async getPriceHistory(request: Request, response: Response) {
    const query = listPriceHistoryQuerySchema.parse({
      dateFrom: getQueryValue(request.query.dateFrom),
      dateTo: getQueryValue(request.query.dateTo),
      materialId: getQueryValue(request.query["filter.materialId"]),
      page: getQueryValue(request.query.page),
      perPage: getQueryValue(request.query.perPage),
      supplierId: getQueryValue(request.query["filter.supplierId"]),
    });
    const result = await priceListsService.getPriceHistory(query);

    sendPaginated(response, result.data, result.pagination);
  },
};
