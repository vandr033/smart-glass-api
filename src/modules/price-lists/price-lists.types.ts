import type { z } from "zod";

import type {
  importPriceListSchema,
  listPriceHistoryQuerySchema,
  listPriceListImportRowsQuerySchema,
  listPriceListImportsQuerySchema,
  mapPriceListImportRowSchema,
} from "./price-lists.validators.js";
import type {
  PRICE_LIST_IMPORT_STATUSES,
  PRICE_LIST_ROW_MAPPING_STATUSES,
  PRICE_LIST_ROW_VALIDATION_STATUSES,
  PRICE_LIST_SOURCE_TYPES,
} from "./price-lists.constants.js";
import type { SupplierMaterialEquivalenceConfidence } from "../materials/materials.behavior.js";

export type PriceListImportStatus = (typeof PRICE_LIST_IMPORT_STATUSES)[number];
export type PriceListSourceType = (typeof PRICE_LIST_SOURCE_TYPES)[number];
export type PriceListRowMappingStatus =
  (typeof PRICE_LIST_ROW_MAPPING_STATUSES)[number];
export type PriceListRowValidationStatus =
  (typeof PRICE_LIST_ROW_VALIDATION_STATUSES)[number];

export type PriceListSupplierSummary = {
  code: string | null;
  id: string;
  legalName: string;
};

export type PriceListUserSummary = {
  email: string;
  id: string;
  name: string;
};

export type PriceListMaterialSummary = {
  code: string;
  id: string;
  name: string;
};

export type PriceListSupplierMaterialEquivalenceSummary = {
  confidence: SupplierMaterialEquivalenceConfidence;
  id: string;
  materialId: string | null;
  supplierName: string;
  supplierSku: string | null;
};

export type PriceListImportRecord = {
  approvedAt: string | null;
  approvedByUser: PriceListUserSummary | null;
  createdAt: string;
  currency: string;
  errorMessage: string | null;
  fileName: string;
  fileUrl: string | null;
  id: string;
  importedByUser: PriceListUserSummary;
  mappedCount: number;
  mimeType: string | null;
  rowCount: number;
  sizeBytes: number | null;
  sourceType: PriceListSourceType;
  status: PriceListImportStatus;
  supplier: PriceListSupplierSummary;
  supplierId: string;
  unmappedCount: number;
  updatedAt: string;
};

export type PriceListImportDetailRecord = PriceListImportRecord & {
  ignoredCount: number;
  invalidCount: number;
};

export type PriceListImportRowRecord = {
  createdAt: string;
  currency: string | null;
  detectedMaterial: PriceListMaterialSummary | null;
  detectedMaterialId: string | null;
  id: string;
  importId: string;
  mappingStatus: PriceListRowMappingStatus;
  normalizedPrice: number | null;
  rawJson: Record<string, unknown>;
  rawPrice: string | null;
  rowNumber: number;
  supplierDescription: string | null;
  supplierMaterialEquivalence: PriceListSupplierMaterialEquivalenceSummary | null;
  supplierMaterialEquivalenceId: string | null;
  supplierName: string;
  supplierSku: string | null;
  supplierUnit: string | null;
  updatedAt: string;
  validationMessage: string | null;
  validationStatus: PriceListRowValidationStatus;
};

export type PriceListImportRowListResult = {
  data: PriceListImportRowRecord[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
};

export type SupplierMaterialPriceRecord = {
  conversionFactor: number | null;
  createdAt: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  id: string;
  import: Pick<PriceListImportRecord, "createdAt" | "fileName" | "id" | "status"> | null;
  importId: string | null;
  isCurrent: boolean;
  material: PriceListMaterialSummary;
  materialId: string;
  normalizedUnit: string | null;
  price: number;
  supplier: PriceListSupplierSummary;
  supplierId: string;
  supplierMaterialEquivalenceId: string | null;
  supplierUnit: string | null;
  updatedAt: string;
};

export type MaterialSupplierPriceRecord = Omit<
  SupplierMaterialPriceRecord,
  "material" | "materialId"
>;

export type SupplierMaterialPriceListRecord = Omit<
  SupplierMaterialPriceRecord,
  "supplier" | "supplierId"
>;

export type PriceChangeLogRecord = {
  changePercent: number | null;
  createdAt: string;
  id: string;
  import: Pick<PriceListImportRecord, "createdAt" | "fileName" | "id" | "status"> | null;
  importId: string | null;
  material: PriceListMaterialSummary;
  materialId: string;
  newCurrency: string;
  newPrice: number;
  oldCurrency: string | null;
  oldPrice: number | null;
  supplier: PriceListSupplierSummary;
  supplierId: string;
};

export type PriceListApprovalResult = {
  appliedPricesCount: number;
  changeLogsCount: number;
  import: PriceListImportDetailRecord;
};

export type ImportPriceListInput = z.infer<typeof importPriceListSchema>;
export type ListPriceListImportsQuery = z.infer<
  typeof listPriceListImportsQuerySchema
>;
export type ListPriceListImportRowsQuery = z.infer<
  typeof listPriceListImportRowsQuerySchema
>;
export type MapPriceListImportRowInput = z.infer<
  typeof mapPriceListImportRowSchema
>;
export type ListPriceHistoryQuery = z.infer<typeof listPriceHistoryQuerySchema>;
