import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import XLSX from "xlsx";

import type { Prisma } from "../../../generated/prisma/client.js";

import { buildDateRangeFilter, toLogJsonValue } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import {
  buildPriceListFileUrl,
  priceListUploadsDir,
} from "../../utils/uploads.js";
import {
  PRICE_LIST_ACCEPTED_EXTENSIONS,
  PRICE_LIST_ACCEPTED_MIME_TYPES,
} from "./price-lists.constants.js";
import type {
  ImportPriceListInput,
  ListPriceHistoryQuery,
  ListPriceListImportRowsQuery,
  ListPriceListImportsQuery,
  MapPriceListImportRowInput,
  MaterialSupplierPriceRecord,
  PriceChangeLogRecord,
  PriceListApprovalResult,
  PriceListImportDetailRecord,
  PriceListImportRecord,
  PriceListImportRowRecord,
  SupplierMaterialPriceRecord,
  SupplierMaterialPriceListRecord,
} from "./price-lists.types.js";

type UploadFile = {
  buffer: Buffer;
  mimetype: string | null;
  originalName: string;
  size: number;
};

type DbClient = typeof prisma | Prisma.TransactionClient;

type ParsedImportRow = {
  currency: string | null;
  mappingStatus: "UNMAPPED";
  normalizedPrice: number | null;
  rawJson: Prisma.InputJsonObject;
  rawPrice: string | null;
  rowNumber: number;
  supplierDescription: string | null;
  supplierName: string;
  supplierSku: string | null;
  supplierUnit: string | null;
  validationMessage: string | null;
  validationStatus: "INVALID" | "PENDING";
};

type ParsedPriceListFile = {
  rows: ParsedImportRow[];
  sourceType: "CSV" | "EXCEL";
};

type HeaderColumnMapping = {
  currency: number | null;
  price: number | null;
  supplierDescription: number | null;
  supplierName: number | null;
  supplierSku: number | null;
  supplierUnit: number | null;
};

type ImportAggregateCounts = {
  ignoredCount: number;
  invalidCount: number;
  mappedCount: number;
  rowCount: number;
  status: "APPROVED" | "FAILED" | "NEEDS_MAPPING" | "PARSED" | "REJECTED" | "UPLOADED" | "VALIDATED";
  unmappedCount: number;
};

const priceListImportInclude = {
  approvedByUser: {
    select: {
      email: true,
      id: true,
      name: true,
    },
  },
  importedByUser: {
    select: {
      email: true,
      id: true,
      name: true,
    },
  },
  supplier: {
    select: {
      code: true,
      id: true,
      legalName: true,
    },
  },
} satisfies Prisma.PriceListImportInclude;

const priceListImportRowInclude = {
  detectedMaterial: {
    select: {
      code: true,
      id: true,
      name: true,
    },
  },
  supplierMaterialEquivalence: {
    select: {
      confidence: true,
      id: true,
      materialId: true,
      supplierName: true,
      supplierSku: true,
    },
  },
} satisfies Prisma.PriceListImportRowInclude;

const supplierMaterialPriceInclude = {
  import: {
    select: {
      createdAt: true,
      fileName: true,
      id: true,
      status: true,
    },
  },
  material: {
    select: {
      code: true,
      id: true,
      name: true,
    },
  },
  supplier: {
    select: {
      code: true,
      id: true,
      legalName: true,
    },
  },
} satisfies Prisma.SupplierMaterialPriceInclude;

const priceChangeLogInclude = {
  import: {
    select: {
      createdAt: true,
      fileName: true,
      id: true,
      status: true,
    },
  },
  material: {
    select: {
      code: true,
      id: true,
      name: true,
    },
  },
  supplier: {
    select: {
      code: true,
      id: true,
      legalName: true,
    },
  },
} satisfies Prisma.PriceChangeLogInclude;

type PriceListImportEntity = Prisma.PriceListImportGetPayload<{
  include: typeof priceListImportInclude;
}>;

type PriceListImportRowEntity = Prisma.PriceListImportRowGetPayload<{
  include: typeof priceListImportRowInclude;
}>;

type SupplierMaterialPriceEntity = Prisma.SupplierMaterialPriceGetPayload<{
  include: typeof supplierMaterialPriceInclude;
}>;

type PriceChangeLogEntity = Prisma.PriceChangeLogGetPayload<{
  include: typeof priceChangeLogInclude;
}>;

type AutoMapMaterial = {
  code: string;
  id: string;
  name: string;
  normalizedCode: string;
  normalizedName: string;
  normalizedSearchText: string;
};

type AutoMapEquivalence = {
  confidence: string;
  conversionFactor: Prisma.Decimal | null;
  id: string;
  materialId: string | null;
  notes: string | null;
  supplierDescription: string | null;
  supplierName: string;
  supplierSku: string | null;
  supplierUnit: string | null;
};

type AutoMapDecision = {
  detectedMaterialId: string | null;
  mappingStatus: "AUTO_MAPPED" | "UNMAPPED";
  supplierMaterialEquivalenceId: string | null;
};

type SupplierMaterialEquivalenceAuditRecord = {
  confidence: string;
  conversionFactor: number | null;
  createdAt: string;
  id: string;
  materialId: string | null;
  notes: string | null;
  status: string;
  supplierDescription: string | null;
  supplierId: string;
  supplierName: string;
  supplierSku: string | null;
  supplierUnit: string | null;
  updatedAt: string;
};

type SupplierMaterialEquivalenceMutationAudit = {
  action: "created" | "updated";
  current: SupplierMaterialEquivalenceAuditRecord;
  previous: SupplierMaterialEquivalenceAuditRecord | null;
};

type SupplierMaterialPriceAuditEntry = {
  current: SupplierMaterialPriceRecord;
  previous: SupplierMaterialPriceRecord | null;
};

const decimalToNumber = (
  value: Prisma.Decimal | number | null,
): number | null => {
  if (value === null) {
    return null;
  }

  return Number(value);
};

const toDecimalString = (value: number, fractionDigits: number): string => {
  return value.toFixed(fractionDigits);
};

const toIsoString = (value: Date | null): string | null => {
  return value?.toISOString() ?? null;
};

const normalizeWhitespace = (value: string): string => {
  return value.replace(/\s+/g, " ").trim();
};

const normalizeText = (value: string): string => {
  return normalizeWhitespace(
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[_/\\-]+/g, " ")
      .replace(/[^\p{Letter}\p{Number}\s.]/gu, " "),
  );
};

const normalizeCompactText = (value: string): string => {
  return normalizeText(value).replace(/\s+/g, "");
};

const sanitizeFileName = (value: string): string => {
  const parsedFileName = path.basename(value).trim();

  return parsedFileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
};

const stringifyCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
};

const isMeaningfulRow = (row: unknown[]): boolean => {
  return row.some((value) => stringifyCell(value).length > 0);
};

const headerAliasGroups = {
  currency: ["currency", "moneda"],
  price: ["costo", "precio", "precio unitario", "price", "unit price"],
  supplierDescription: [
    "descripcion",
    "description",
    "detalle",
    "observacion",
    "observaciones",
  ],
  supplierName: ["descripcion", "item", "material", "nombre", "producto"],
  supplierSku: [
    "cod",
    "codigo",
    "codigo item",
    "codigo producto",
    "item code",
    "product code",
    "sku",
  ],
  supplierUnit: ["medida", "und", "unidad", "unit"],
} satisfies Record<keyof HeaderColumnMapping, readonly string[]>;

const headerMatchesAlias = (header: string, alias: string): boolean => {
  if (header === alias) {
    return true;
  }

  return (
    header.startsWith(`${alias} `) ||
    header.endsWith(` ${alias}`) ||
    header.includes(` ${alias} `)
  );
};

const detectHeaderRowIndex = (rows: unknown[][]): number => {
  let bestIndex = 0;
  let bestScore = -1;

  for (const [index, row] of rows.slice(0, 10).entries()) {
    if (!isMeaningfulRow(row)) {
      continue;
    }

    const matchedGroups = new Set<string>();

    row.forEach((cell) => {
      const headerValue = normalizeText(stringifyCell(cell));

      if (headerValue.length === 0) {
        return;
      }

      for (const [group, aliases] of Object.entries(headerAliasGroups)) {
        if (aliases.some((alias) => headerMatchesAlias(headerValue, alias))) {
          matchedGroups.add(group);
        }
      }
    });

    if (matchedGroups.size > bestScore) {
      bestIndex = index;
      bestScore = matchedGroups.size;
    }
  }

  if (bestScore >= 2) {
    return bestIndex;
  }

  return rows.findIndex((row) => isMeaningfulRow(row));
};

const makeUniqueHeaders = (headers: string[]): string[] => {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const baseHeader = header.trim().length > 0 ? header.trim() : `Column ${index + 1}`;
    const nextCount = (counts.get(baseHeader) ?? 0) + 1;
    counts.set(baseHeader, nextCount);

    return nextCount === 1 ? baseHeader : `${baseHeader} (${nextCount})`;
  });
};

const findColumnIndex = (
  normalizedHeaders: string[],
  aliases: readonly string[],
  excludedIndexes = new Set<number>(),
): number | null => {
  let bestIndex: number | null = null;
  let bestScore = -1;

  normalizedHeaders.forEach((header, index) => {
    if (excludedIndexes.has(index)) {
      return;
    }

    aliases.forEach((alias) => {
      let score = -1;

      if (header === alias) {
        score = 3;
      } else if (header.startsWith(`${alias} `) || header.endsWith(` ${alias}`)) {
        score = 2;
      } else if (header.includes(` ${alias} `)) {
        score = 1;
      }

      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });
  });

  return bestIndex;
};

const resolveColumnMapping = (normalizedHeaders: string[]): HeaderColumnMapping => {
  const usedIndexes = new Set<number>();

  const supplierSku = findColumnIndex(
    normalizedHeaders,
    headerAliasGroups.supplierSku,
    usedIndexes,
  );
  if (supplierSku !== null) {
    usedIndexes.add(supplierSku);
  }

  const supplierName = findColumnIndex(
    normalizedHeaders,
    headerAliasGroups.supplierName,
    usedIndexes,
  );
  if (supplierName !== null) {
    usedIndexes.add(supplierName);
  }

  const supplierDescription = findColumnIndex(
    normalizedHeaders,
    headerAliasGroups.supplierDescription,
    usedIndexes,
  );
  if (supplierDescription !== null) {
    usedIndexes.add(supplierDescription);
  }

  const supplierUnit = findColumnIndex(
    normalizedHeaders,
    headerAliasGroups.supplierUnit,
    usedIndexes,
  );
  if (supplierUnit !== null) {
    usedIndexes.add(supplierUnit);
  }

  const price = findColumnIndex(normalizedHeaders, headerAliasGroups.price, usedIndexes);
  if (price !== null) {
    usedIndexes.add(price);
  }

  const currency = findColumnIndex(
    normalizedHeaders,
    headerAliasGroups.currency,
    usedIndexes,
  );

  return {
    currency,
    price,
    supplierDescription,
    supplierName,
    supplierSku,
    supplierUnit,
  };
};

const parsePriceNumber = (value: string): number | null => {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  const cleanedValue = trimmedValue
    .replace(/[^\d,.-]/g, "")
    .replace(/(?!^)-/g, "");

  if (cleanedValue.length === 0) {
    return null;
  }

  const lastCommaIndex = cleanedValue.lastIndexOf(",");
  const lastDotIndex = cleanedValue.lastIndexOf(".");
  let normalizedValue = cleanedValue;

  if (lastCommaIndex >= 0 && lastDotIndex >= 0) {
    const decimalSeparator = lastCommaIndex > lastDotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";

    normalizedValue = cleanedValue
      .split(thousandsSeparator)
      .join("")
      .replace(decimalSeparator, ".");
  } else if (lastCommaIndex >= 0) {
    const decimalDigits = cleanedValue.length - lastCommaIndex - 1;

    normalizedValue =
      decimalDigits > 0 && decimalDigits <= 2
        ? cleanedValue.replace(/\./g, "").replace(",", ".")
        : cleanedValue.replace(/,/g, "");
  } else if ((cleanedValue.match(/\./g) ?? []).length > 1) {
    const segments = cleanedValue.split(".");
    const decimalSegment = segments.pop() ?? "";
    normalizedValue = `${segments.join("")}.${decimalSegment}`;
  }

  const numericValue = Number(normalizedValue);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const buildRawJsonObject = (
  headers: string[],
  row: unknown[],
): Prisma.InputJsonObject => {
  const result: Record<string, unknown> = {};

  headers.forEach((header, index) => {
    const cellValue = row[index];
    result[header] = cellValue === undefined || cellValue === "" ? null : cellValue;
  });

  return (toLogJsonValue(result) ?? {}) as Prisma.InputJsonObject;
};

export const normalizePriceListRow = (
  rawRow: unknown[],
  options: {
    defaultCurrency: string;
    headers: string[];
    mapping: HeaderColumnMapping;
    rowNumber: number;
  },
): ParsedImportRow | null => {
  if (!isMeaningfulRow(rawRow)) {
    return null;
  }

  const getRawValue = (index: number | null): string | null => {
    if (index === null) {
      return null;
    }

    const rawValue = stringifyCell(rawRow[index]);
    return rawValue.length > 0 ? rawValue : null;
  };

  const rawPrice = getRawValue(options.mapping.price);
  const supplierName =
    getRawValue(options.mapping.supplierName) ??
    getRawValue(options.mapping.supplierDescription) ??
    "";
  const supplierDescription =
    options.mapping.supplierDescription !== null &&
    options.mapping.supplierDescription !== options.mapping.supplierName
      ? getRawValue(options.mapping.supplierDescription)
      : null;
  const currency = getRawValue(options.mapping.currency) ?? options.defaultCurrency;
  const parsedPrice = rawPrice ? parsePriceNumber(rawPrice) : null;
  const validationMessages: string[] = [];

  if (supplierName.trim().length === 0) {
    validationMessages.push("Supplier name is required.");
  }

  if (!rawPrice) {
    validationMessages.push("Price is required.");
  } else if (parsedPrice === null) {
    validationMessages.push("Price must be numeric and greater than zero.");
  }

  return {
    currency,
    mappingStatus: "UNMAPPED",
    normalizedPrice: parsedPrice,
    rawJson: buildRawJsonObject(options.headers, rawRow),
    rawPrice,
    rowNumber: options.rowNumber,
    supplierDescription,
    supplierName,
    supplierSku: getRawValue(options.mapping.supplierSku),
    supplierUnit: getRawValue(options.mapping.supplierUnit),
    validationMessage:
      validationMessages.length > 0 ? validationMessages.join(" ") : null,
    validationStatus: validationMessages.length > 0 ? "INVALID" : "PENDING",
  };
};

const inferSourceType = (
  fileName: string,
  mimeType: string | null,
): "CSV" | "EXCEL" => {
  const extension = path.extname(fileName).toLowerCase();

  if (
    extension &&
    !PRICE_LIST_ACCEPTED_EXTENSIONS.includes(
      extension as (typeof PRICE_LIST_ACCEPTED_EXTENSIONS)[number],
    )
  ) {
    throw new AppError("Only .xlsx, .xls, and .csv files are supported.", 400);
  }

  if (
    mimeType &&
    !PRICE_LIST_ACCEPTED_MIME_TYPES.includes(
      mimeType as (typeof PRICE_LIST_ACCEPTED_MIME_TYPES)[number],
    )
  ) {
    const allowedByExtension =
      extension === ".csv" || extension === ".xls" || extension === ".xlsx";

    if (!allowedByExtension) {
      throw new AppError("The uploaded file type is not supported.", 400);
    }
  }

  return extension === ".csv" || mimeType === "text/csv" ? "CSV" : "EXCEL";
};

export const parsePriceListFile = (
  file: UploadFile,
  options: {
    defaultCurrency: string;
  },
): ParsedPriceListFile => {
  const sourceType = inferSourceType(file.originalName, file.mimetype);
  const workbook = XLSX.read(file.buffer, {
    cellDates: false,
    dense: true,
    type: "buffer",
  });
  const firstSheetName = workbook.SheetNames.find((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return false;
    }

    const previewRows = XLSX.utils.sheet_to_json(sheet, {
      blankrows: false,
      defval: null,
      header: 1,
      raw: false,
    }) as unknown[][];

    return previewRows.some((row) => isMeaningfulRow(row));
  });

  if (!firstSheetName) {
    throw new AppError("The uploaded file does not contain any readable rows.", 400);
  }

  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    throw new AppError("The uploaded file could not be parsed.", 400);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    blankrows: false,
    defval: null,
    header: 1,
    raw: false,
  }) as unknown[][];

  if (rows.length === 0) {
    throw new AppError("The uploaded file does not contain any rows.", 400);
  }

  const headerRowIndex = detectHeaderRowIndex(rows);

  if (headerRowIndex < 0) {
    throw new AppError("Could not detect a header row in the uploaded file.", 400);
  }

  const headerRow = rows[headerRowIndex] ?? [];
  const headers = makeUniqueHeaders(headerRow.map((value) => stringifyCell(value)));
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  const mapping = resolveColumnMapping(normalizedHeaders);
  const parsedRows = rows
    .slice(headerRowIndex + 1)
    .map((row, index) =>
      normalizePriceListRow(row, {
        defaultCurrency: options.defaultCurrency,
        headers,
        mapping,
        rowNumber: headerRowIndex + index + 2,
      }),
    )
    .filter((row): row is ParsedImportRow => Boolean(row));

  return {
    rows: parsedRows,
    sourceType,
  };
};

const levenshteinDistance = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  const previousRow = new Array<number>(right.length + 1).fill(0);
  const currentRow = new Array<number>(right.length + 1).fill(0);

  for (let index = 0; index <= right.length; index += 1) {
    previousRow[index] = index;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    currentRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      currentRow[rightIndex] = Math.min(
        (currentRow[rightIndex - 1] ?? 0) + 1,
        (previousRow[rightIndex] ?? 0) + 1,
        (previousRow[rightIndex - 1] ?? 0) + cost,
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previousRow[index] = currentRow[index] ?? 0;
    }
  }

  return previousRow[right.length] ?? left.length;
};

const diceCoefficient = (left: string, right: string): number => {
  if (left === right) {
    return 1;
  }

  if (left.length < 2 || right.length < 2) {
    return 0;
  }

  const pairs = new Map<string, number>();

  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }

  let intersection = 0;

  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = pairs.get(pair) ?? 0;

    if (count > 0) {
      pairs.set(pair, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (left.length + right.length - 2);
};

const jaccardSimilarity = (left: string, right: string): number => {
  const leftTokens = new Set(normalizeText(left).split(" ").filter(Boolean));
  const rightTokens = new Set(normalizeText(right).split(" ").filter(Boolean));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  });

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
};

const textSimilarity = (left: string, right: string): number => {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);

  if (normalizedLeft.length === 0 || normalizedRight.length === 0) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  const editSimilarity =
    1 -
    levenshteinDistance(normalizedLeft, normalizedRight) /
      Math.max(normalizedLeft.length, normalizedRight.length);

  return Math.max(
    diceCoefficient(normalizedLeft, normalizedRight),
    jaccardSimilarity(normalizedLeft, normalizedRight),
    editSimilarity,
  );
};

const buildAutoMapDecision = (
  row: {
    supplierDescription: string | null;
    supplierName: string;
    supplierSku: string | null;
  },
  options: {
    equivalenceByName: Map<string, AutoMapEquivalence>;
    equivalenceBySku: Map<string, AutoMapEquivalence>;
    materials: AutoMapMaterial[];
    materialByCode: Map<string, AutoMapMaterial>;
    materialByName: Map<string, AutoMapMaterial>;
  },
): AutoMapDecision => {
  const normalizedSku = row.supplierSku ? normalizeCompactText(row.supplierSku) : "";

  if (normalizedSku.length > 0) {
    const equivalence = options.equivalenceBySku.get(normalizedSku);

    if (equivalence?.materialId) {
      return {
        detectedMaterialId: equivalence.materialId,
        mappingStatus: "AUTO_MAPPED",
        supplierMaterialEquivalenceId: equivalence.id,
      };
    }
  }

  const normalizedName = normalizeText(row.supplierName);

  if (normalizedName.length > 0) {
    const equivalence = options.equivalenceByName.get(normalizedName);

    if (equivalence?.materialId) {
      return {
        detectedMaterialId: equivalence.materialId,
        mappingStatus: "AUTO_MAPPED",
        supplierMaterialEquivalenceId: equivalence.id,
      };
    }

    const exactMaterial =
      options.materialByName.get(normalizedName) ??
      options.materialByCode.get(normalizedName);

    if (exactMaterial) {
      return {
        detectedMaterialId: exactMaterial.id,
        mappingStatus: "AUTO_MAPPED",
        supplierMaterialEquivalenceId: null,
      };
    }
  }

  const searchText = normalizeText(
    [row.supplierName, row.supplierDescription].filter(Boolean).join(" "),
  );

  if (searchText.length < 3) {
    return {
      detectedMaterialId: null,
      mappingStatus: "UNMAPPED",
      supplierMaterialEquivalenceId: null,
    };
  }

  let bestMatch: AutoMapMaterial | null = null;
  let bestScore = 0;
  let secondBestScore = 0;

  for (const material of options.materials) {
    const score = Math.max(
      textSimilarity(searchText, material.normalizedSearchText),
      textSimilarity(searchText, material.normalizedName),
      textSimilarity(searchText, material.normalizedCode),
    );

    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestMatch = material;
      continue;
    }

    if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  if (bestMatch && bestScore >= 0.86 && bestScore - secondBestScore >= 0.06) {
    return {
      detectedMaterialId: bestMatch.id,
      mappingStatus: "AUTO_MAPPED",
      supplierMaterialEquivalenceId: null,
    };
  }

  return {
    detectedMaterialId: null,
    mappingStatus: "UNMAPPED",
    supplierMaterialEquivalenceId: null,
  };
};

const mapPriceListImportRecord = (
  record: PriceListImportEntity,
): PriceListImportRecord => {
  return {
    approvedAt: toIsoString(record.approvedAt),
    approvedByUser: record.approvedByUser,
    createdAt: record.createdAt.toISOString(),
    currency: record.currency,
    errorMessage: record.errorMessage,
    fileName: record.fileName,
    fileUrl: record.fileUrl,
    id: record.id,
    importedByUser: record.importedByUser,
    mappedCount: record.mappedCount,
    mimeType: record.mimeType,
    rowCount: record.rowCount,
    sizeBytes: record.sizeBytes,
    sourceType: record.sourceType,
    status: record.status,
    supplier: record.supplier,
    supplierId: record.supplierId,
    unmappedCount: record.unmappedCount,
    updatedAt: record.updatedAt.toISOString(),
  };
};

const mapPriceListImportRowRecord = (
  record: PriceListImportRowEntity,
): PriceListImportRowRecord => {
  return {
    createdAt: record.createdAt.toISOString(),
    currency: record.currency,
    detectedMaterial: record.detectedMaterial,
    detectedMaterialId: record.detectedMaterialId,
    id: record.id,
    importId: record.importId,
    mappingStatus: record.mappingStatus,
    normalizedPrice: decimalToNumber(record.normalizedPrice),
    rawJson:
      record.rawJson && typeof record.rawJson === "object" && !Array.isArray(record.rawJson)
        ? (record.rawJson as Record<string, unknown>)
        : {},
    rawPrice: record.rawPrice,
    rowNumber: record.rowNumber,
    supplierDescription: record.supplierDescription,
    supplierMaterialEquivalence: record.supplierMaterialEquivalence
      ? {
          confidence: record.supplierMaterialEquivalence.confidence,
          id: record.supplierMaterialEquivalence.id,
          materialId: record.supplierMaterialEquivalence.materialId,
          supplierName: record.supplierMaterialEquivalence.supplierName,
          supplierSku: record.supplierMaterialEquivalence.supplierSku,
        }
      : null,
    supplierMaterialEquivalenceId: record.supplierMaterialEquivalenceId,
    supplierName: record.supplierName,
    supplierSku: record.supplierSku,
    supplierUnit: record.supplierUnit,
    updatedAt: record.updatedAt.toISOString(),
    validationMessage: record.validationMessage,
    validationStatus: record.validationStatus,
  };
};

const mapSupplierMaterialPriceRecord = (
  record: SupplierMaterialPriceEntity,
): {
  base: Omit<SupplierMaterialPriceListRecord, "supplier"> &
    Omit<MaterialSupplierPriceRecord, "material"> & {
      material: SupplierMaterialPriceListRecord["material"];
      supplier: MaterialSupplierPriceRecord["supplier"];
    };
} => {
  return {
    base: {
      conversionFactor: decimalToNumber(record.conversionFactor),
      createdAt: record.createdAt.toISOString(),
      currency: record.currency,
      effectiveFrom: record.effectiveFrom.toISOString(),
      effectiveTo: toIsoString(record.effectiveTo),
      id: record.id,
      import: record.import
        ? {
            createdAt: record.import.createdAt.toISOString(),
            fileName: record.import.fileName,
            id: record.import.id,
            status: record.import.status,
          }
        : null,
      importId: record.importId,
      isCurrent: record.isCurrent,
      material: record.material,
      materialId: record.materialId,
      normalizedUnit: record.normalizedUnit,
      price: decimalToNumber(record.price) ?? 0,
      supplier: record.supplier,
      supplierId: record.supplierId,
      supplierMaterialEquivalenceId: record.supplierMaterialEquivalenceId,
      supplierUnit: record.supplierUnit,
      updatedAt: record.updatedAt.toISOString(),
    },
  };
};

const mapPriceChangeLogRecord = (record: PriceChangeLogEntity): PriceChangeLogRecord => {
  return {
    changePercent: decimalToNumber(record.changePercent),
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    import: record.import
      ? {
          createdAt: record.import.createdAt.toISOString(),
          fileName: record.import.fileName,
          id: record.import.id,
          status: record.import.status,
        }
      : null,
    importId: record.importId,
    material: record.material,
    materialId: record.materialId,
    newCurrency: record.newCurrency,
    newPrice: decimalToNumber(record.newPrice) ?? 0,
    oldCurrency: record.oldCurrency,
    oldPrice: decimalToNumber(record.oldPrice),
    supplier: record.supplier,
    supplierId: record.supplierId,
  };
};

const mapSupplierMaterialEquivalenceAuditRecord = (record: {
  confidence: string;
  conversionFactor: Prisma.Decimal | null;
  createdAt: Date;
  id: string;
  materialId: string | null;
  notes: string | null;
  status: string;
  supplierDescription: string | null;
  supplierId: string;
  supplierName: string;
  supplierSku: string | null;
  supplierUnit: string | null;
  updatedAt: Date;
}): SupplierMaterialEquivalenceAuditRecord => {
  return {
    confidence: record.confidence,
    conversionFactor: decimalToNumber(record.conversionFactor),
    createdAt: record.createdAt.toISOString(),
    id: record.id,
    materialId: record.materialId,
    notes: record.notes,
    status: record.status,
    supplierDescription: record.supplierDescription,
    supplierId: record.supplierId,
    supplierName: record.supplierName,
    supplierSku: record.supplierSku,
    supplierUnit: record.supplierUnit,
    updatedAt: record.updatedAt.toISOString(),
  };
};

const getPriceListImportOrThrow = async (
  importId: string,
  options?: {
    tx?: DbClient;
  },
) => {
  const db = options?.tx ?? prisma;
  const record = await db.priceListImport.findUnique({
    include: priceListImportInclude,
    where: {
      id: importId,
    },
  });

  if (!record) {
    throw new AppError("Price list import not found.", 404);
  }

  return record;
};

const getMutableImportOrThrow = async (
  importId: string,
  options?: {
    tx?: DbClient;
  },
) => {
  const record = await getPriceListImportOrThrow(importId, options);

  if (record.status === "APPROVED") {
    throw new AppError("Approved imports cannot be modified.", 400);
  }

  if (record.status === "REJECTED") {
    throw new AppError("Rejected imports cannot be modified.", 400);
  }

  return record;
};

const getImportCounts = async (
  importId: string,
  options?: {
    tx?: DbClient;
    validationMode?: boolean;
  },
): Promise<ImportAggregateCounts> => {
  const db = options?.tx ?? prisma;

  const [rowCount, mappedCount, unmappedCount, invalidCount, ignoredCount] =
    await Promise.all([
      db.priceListImportRow.count({
        where: {
          importId,
        },
      }),
      db.priceListImportRow.count({
        where: {
          detectedMaterialId: {
            not: null,
          },
          importId,
          mappingStatus: {
            in: ["AUTO_MAPPED", "MANUAL_MAPPED"],
          },
        },
      }),
      db.priceListImportRow.count({
        where: {
          importId,
          mappingStatus: {
            not: "IGNORED",
          },
          OR: [
            {
              detectedMaterialId: null,
            },
            {
              mappingStatus: {
                in: ["UNMAPPED", "ERROR"],
              },
            },
          ],
        },
      }),
      db.priceListImportRow.count({
        where: {
          importId,
          validationStatus: "INVALID",
        },
      }),
      db.priceListImportRow.count({
        where: {
          importId,
          mappingStatus: "IGNORED",
        },
      }),
    ]);

  const pendingValidationCount = await db.priceListImportRow.count({
    where: {
      importId,
      mappingStatus: {
        not: "IGNORED",
      },
      validationStatus: {
        not: "VALID",
      },
    },
  });
  const blockingInvalidCount = await db.priceListImportRow.count({
    where: {
      importId,
      mappingStatus: {
        not: "IGNORED",
      },
      validationStatus: "INVALID",
    },
  });
  const status =
    options?.validationMode === true
      ? unmappedCount === 0 && pendingValidationCount === 0
        ? "VALIDATED"
        : "NEEDS_MAPPING"
      : unmappedCount === 0 && blockingInvalidCount === 0
        ? "PARSED"
        : "NEEDS_MAPPING";

  return {
    ignoredCount,
    invalidCount,
    mappedCount,
    rowCount,
    status,
    unmappedCount,
  };
};

const refreshImportProgress = async (
  importId: string,
  options?: {
    tx?: DbClient;
    validationMode?: boolean;
  },
): Promise<ImportAggregateCounts> => {
  const db = options?.tx ?? prisma;
  const counts = await getImportCounts(importId, options);

  await db.priceListImport.update({
    data: {
      mappedCount: counts.mappedCount,
      rowCount: counts.rowCount,
      status: counts.status,
      unmappedCount: counts.unmappedCount,
    },
    where: {
      id: importId,
    },
  });

  return counts;
};

const mapPriceListImportDetail = async (
  importId: string,
): Promise<PriceListImportDetailRecord> => {
  const [record, counts] = await Promise.all([
    getPriceListImportOrThrow(importId),
    getImportCounts(importId),
  ]);

  return {
    ...mapPriceListImportRecord(record),
    ignoredCount: counts.ignoredCount,
    invalidCount: counts.invalidCount,
  };
};

const buildImportOrderBy = (
  sortBy: ListPriceListImportsQuery["sortBy"],
  sortDirection: ListPriceListImportsQuery["sortDirection"],
): Prisma.PriceListImportOrderByWithRelationInput => {
  switch (sortBy) {
    case "approvedAt":
      return {
        approvedAt: sortDirection,
      };
    case "fileName":
      return {
        fileName: sortDirection,
      };
    case "status":
      return {
        status: sortDirection,
      };
    case "createdAt":
      return {
        createdAt: sortDirection,
      };
  }
};

const buildImportWhereClause = (
  query: ListPriceListImportsQuery,
): Prisma.PriceListImportWhereInput => {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo);

  return {
    ...(createdAt
      ? {
          createdAt,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
    ...(query.supplierId
      ? {
          supplierId: query.supplierId,
        }
      : {}),
    ...(query.search.length > 0
      ? {
          OR: [
            {
              fileName: {
                contains: query.search,
              },
            },
            {
              supplier: {
                legalName: {
                  contains: query.search,
                },
              },
            },
          ],
        }
      : {}),
  };
};

const buildImportRowOrderBy = (
  sortBy: ListPriceListImportRowsQuery["sortBy"],
  sortDirection: ListPriceListImportRowsQuery["sortDirection"],
): Prisma.PriceListImportRowOrderByWithRelationInput => {
  switch (sortBy) {
    case "mappingStatus":
      return {
        mappingStatus: sortDirection,
      };
    case "price":
      return {
        normalizedPrice: sortDirection,
      };
    case "supplierName":
      return {
        supplierName: sortDirection,
      };
    case "validationStatus":
      return {
        validationStatus: sortDirection,
      };
    case "rowNumber":
      return {
        rowNumber: sortDirection,
      };
  }
};

const buildImportRowWhereClause = (
  importId: string,
  query: ListPriceListImportRowsQuery,
): Prisma.PriceListImportRowWhereInput => {
  const andClauses: Prisma.PriceListImportRowWhereInput[] = [];

  if (query.mappingStatus) {
    andClauses.push({
      mappingStatus: query.mappingStatus,
    });
  }

  if (query.validationStatus) {
    andClauses.push({
      validationStatus: query.validationStatus,
    });
  }

  if (query.attentionOnly) {
    andClauses.push({
      OR: [
        {
          mappingStatus: {
            in: ["UNMAPPED", "ERROR"],
          },
        },
        {
          validationStatus: "INVALID",
        },
      ],
    });
  }

  if (query.search.length > 0) {
    andClauses.push({
      OR: [
        {
          supplierName: {
            contains: query.search,
          },
        },
        {
          supplierSku: {
            contains: query.search,
          },
        },
        {
          supplierDescription: {
            contains: query.search,
          },
        },
        {
          rawPrice: {
            contains: query.search,
          },
        },
      ],
    });
  }

  return {
    importId,
    ...(andClauses.length > 0
      ? {
          AND: andClauses,
        }
      : {}),
  };
};

const findExactEquivalenceForRow = async (
  supplierId: string,
  row: {
    supplierName: string;
    supplierSku: string | null;
  },
  options?: {
    tx?: DbClient;
  },
) => {
  const db = options?.tx ?? prisma;
  const normalizedName = normalizeText(row.supplierName);
  const normalizedSku = row.supplierSku ? normalizeCompactText(row.supplierSku) : "";

  const equivalences = await db.supplierMaterialEquivalence.findMany({
    select: {
      confidence: true,
      conversionFactor: true,
      createdAt: true,
      id: true,
      materialId: true,
      notes: true,
      status: true,
      supplierDescription: true,
      supplierId: true,
      supplierName: true,
      supplierSku: true,
      supplierUnit: true,
      updatedAt: true,
    },
    where: {
      materialId: {
        not: null,
      },
      status: "ACTIVE",
      supplierId,
    },
  });

  if (normalizedSku.length > 0) {
    const match = equivalences.find(
      (equivalence) =>
        equivalence.supplierSku &&
        normalizeCompactText(equivalence.supplierSku) === normalizedSku,
    );

    if (match) {
      return match;
    }
  }

  return (
    equivalences.find(
      (equivalence) => normalizeText(equivalence.supplierName) === normalizedName,
    ) ?? null
  );
};

export const autoMapPriceListRows = async (
  importId: string,
): Promise<PriceListImportDetailRecord> => {
  await prisma.$transaction(async (tx) => {
    const importRecord = await getMutableImportOrThrow(importId, {
      tx,
    });

    const [rows, equivalences, materials] = await Promise.all([
      tx.priceListImportRow.findMany({
        where: {
          importId,
          mappingStatus: {
            notIn: ["IGNORED", "MANUAL_MAPPED"],
          },
        },
      }),
      tx.supplierMaterialEquivalence.findMany({
        select: {
          confidence: true,
          conversionFactor: true,
          id: true,
          materialId: true,
          notes: true,
          supplierDescription: true,
          supplierName: true,
          supplierSku: true,
          supplierUnit: true,
        },
        where: {
          materialId: {
            not: null,
          },
          status: "ACTIVE",
          supplierId: importRecord.supplierId,
        },
      }),
      tx.material.findMany({
        select: {
          code: true,
          id: true,
          name: true,
        },
        where: {
          deletedAt: null,
        },
      }),
    ]);

    const equivalenceBySku = new Map<string, AutoMapEquivalence>();
    const equivalenceByName = new Map<string, AutoMapEquivalence>();

    equivalences.forEach((equivalence) => {
      if (equivalence.supplierSku) {
        equivalenceBySku.set(
          normalizeCompactText(equivalence.supplierSku),
          equivalence,
        );
      }

      equivalenceByName.set(normalizeText(equivalence.supplierName), equivalence);
    });

    const autoMapMaterials: AutoMapMaterial[] = materials.map((material) => ({
      code: material.code,
      id: material.id,
      name: material.name,
      normalizedCode: normalizeText(material.code),
      normalizedName: normalizeText(material.name),
      normalizedSearchText: normalizeText(`${material.code} ${material.name}`),
    }));
    const materialByCode = new Map<string, AutoMapMaterial>();
    const materialByName = new Map<string, AutoMapMaterial>();

    autoMapMaterials.forEach((material) => {
      materialByCode.set(material.normalizedCode, material);

      if (!materialByName.has(material.normalizedName)) {
        materialByName.set(material.normalizedName, material);
      }
    });

    for (const row of rows) {
      const decision = buildAutoMapDecision(row, {
        equivalenceByName,
        equivalenceBySku,
        materialByCode,
        materialByName,
        materials: autoMapMaterials,
      });
      const hasValidPrice = row.validationStatus !== "INVALID";

      await tx.priceListImportRow.update({
        data: {
          detectedMaterialId: decision.detectedMaterialId,
          mappingStatus: decision.mappingStatus,
          supplierMaterialEquivalenceId: decision.supplierMaterialEquivalenceId,
          validationMessage:
            row.validationStatus === "INVALID" ? row.validationMessage : null,
          validationStatus:
            row.validationStatus === "INVALID"
              ? "INVALID"
              : decision.detectedMaterialId && hasValidPrice
                ? "VALID"
                : "PENDING",
        },
        where: {
          id: row.id,
        },
      });
    }

    await refreshImportProgress(importId, {
      tx,
    });
  });

  return mapPriceListImportDetail(importId);
};

export const validatePriceListImport = async (
  importId: string,
): Promise<PriceListImportDetailRecord> => {
  await prisma.$transaction(async (tx) => {
    await getMutableImportOrThrow(importId, {
      tx,
    });

    await refreshImportProgress(importId, {
      tx,
      validationMode: true,
    });
  });

  return mapPriceListImportDetail(importId);
};

export const approvePriceListImport = async (
  importId: string,
  userId: string,
): Promise<{
  approvalResult: PriceListApprovalResult;
  appliedPriceAudits: SupplierMaterialPriceAuditEntry[];
}> => {
  const approvalSummary = await prisma.$transaction(async (tx) => {
    const importRecord = await tx.priceListImport.findUnique({
      include: {
        rows: {
          include: {
            supplierMaterialEquivalence: {
              select: {
                conversionFactor: true,
                id: true,
              },
            },
          },
          orderBy: {
            rowNumber: "asc",
          },
        },
        supplier: {
          select: {
            id: true,
          },
        },
      },
      where: {
        id: importId,
      },
    });

    if (!importRecord) {
      throw new AppError("Price list import not found.", 404);
    }

    if (importRecord.status !== "VALIDATED") {
      throw new AppError("Only validated imports can be approved.", 400);
    }

    const approvedRows = importRecord.rows.filter(
      (row) =>
        row.mappingStatus !== "IGNORED" &&
        row.validationStatus === "VALID" &&
        row.detectedMaterialId &&
        row.normalizedPrice,
    );

    if (approvedRows.length === 0) {
      throw new AppError("There are no approved rows to apply.", 400);
    }

    const lastRowByMaterialId = new Map<string, (typeof approvedRows)[number]>();
    approvedRows.forEach((row) => {
      if (row.detectedMaterialId) {
        lastRowByMaterialId.set(row.detectedMaterialId, row);
      }
    });

    const materialIds = Array.from(lastRowByMaterialId.keys());
    const [materials, existingCurrentPrices] = await Promise.all([
      tx.material.findMany({
        select: {
          id: true,
          purchaseUnit: true,
        },
        where: {
          id: {
            in: materialIds,
          },
        },
      }),
      tx.supplierMaterialPrice.findMany({
        include: supplierMaterialPriceInclude,
        where: {
          isCurrent: true,
          materialId: {
            in: materialIds,
          },
          supplierId: importRecord.supplierId,
        },
      }),
    ]);
    const materialById = new Map(materials.map((material) => [material.id, material]));
    const currentPriceByMaterialId = new Map(
      existingCurrentPrices.map((record) => [record.materialId, record]),
    );
    const approvalTimestamp = new Date();
    const appliedPriceAudits: SupplierMaterialPriceAuditEntry[] = [];

    await tx.supplierMaterialPrice.updateMany({
      data: {
        effectiveTo: approvalTimestamp,
        isCurrent: false,
      },
      where: {
        isCurrent: true,
        materialId: {
          in: materialIds,
        },
        supplierId: importRecord.supplierId,
      },
    });

    let appliedPricesCount = 0;
    let changeLogsCount = 0;

    for (const [materialId, row] of lastRowByMaterialId.entries()) {
      const material = materialById.get(materialId);

      if (!material) {
        throw new AppError("A mapped material is no longer available.", 400);
      }

      if (row.normalizedPrice === null) {
        continue;
      }

      const previousPrice = currentPriceByMaterialId.get(materialId);
      const nextPriceValue = decimalToNumber(row.normalizedPrice);

      if (nextPriceValue === null) {
        continue;
      }

      const createdPrice = await tx.supplierMaterialPrice.create({
        data: {
          conversionFactor:
            row.supplierMaterialEquivalence?.conversionFactor === null
              ? null
              : row.supplierMaterialEquivalence?.conversionFactor
                ? toDecimalString(
                    decimalToNumber(row.supplierMaterialEquivalence.conversionFactor) ?? 0,
                    6,
                  )
                : null,
          currency: row.currency ?? importRecord.currency,
          effectiveFrom: approvalTimestamp,
          importId,
          isCurrent: true,
          materialId,
          normalizedUnit: material.purchaseUnit,
          price: toDecimalString(nextPriceValue, 4),
          supplierId: importRecord.supplierId,
          supplierMaterialEquivalenceId: row.supplierMaterialEquivalenceId,
          supplierUnit: row.supplierUnit,
        },
        include: supplierMaterialPriceInclude,
      });

      const previousPriceValue = decimalToNumber(previousPrice?.price ?? null);
      const changePercent =
        previousPriceValue && previousPriceValue > 0
          ? ((nextPriceValue - previousPriceValue) / previousPriceValue) * 100
          : null;

      await tx.priceChangeLog.create({
        data: {
          changePercent:
            changePercent === null ? null : toDecimalString(changePercent, 4),
          importId,
          materialId,
          newCurrency: row.currency ?? importRecord.currency,
          newPrice: toDecimalString(nextPriceValue, 4),
          oldCurrency: previousPrice?.currency ?? null,
          oldPrice:
            previousPriceValue === null ? null : toDecimalString(previousPriceValue, 4),
          supplierId: importRecord.supplierId,
        },
      });

      appliedPriceAudits.push({
        current: mapSupplierMaterialPriceRecord(createdPrice).base,
        previous: previousPrice
          ? mapSupplierMaterialPriceRecord(previousPrice).base
          : null,
      });

      appliedPricesCount += 1;
      changeLogsCount += 1;
    }

    await tx.priceListImport.update({
      data: {
        approvedAt: approvalTimestamp,
        approvedByUserId: userId,
        status: "APPROVED",
      },
      where: {
        id: importId,
      },
    });

    return {
      appliedPriceAudits,
      appliedPricesCount,
      changeLogsCount,
    };
  });

  return {
    approvalResult: {
      appliedPricesCount: approvalSummary.appliedPricesCount,
      changeLogsCount: approvalSummary.changeLogsCount,
      import: await mapPriceListImportDetail(importId),
    },
    appliedPriceAudits: approvalSummary.appliedPriceAudits,
  };
};

const buildStoredFileName = (originalName: string): string => {
  const safeName = sanitizeFileName(originalName) || "price-list";
  const extension = path.extname(safeName).toLowerCase();
  const nameWithoutExtension = extension
    ? safeName.slice(0, -extension.length)
    : safeName;

  return `${nameWithoutExtension}-${randomUUID()}${extension}`;
};

export const getCurrentSupplierPrices = async (
  materialId: string,
): Promise<MaterialSupplierPriceRecord[]> => {
  const prices = await prisma.supplierMaterialPrice.findMany({
    include: supplierMaterialPriceInclude,
    orderBy: [
      {
        price: "asc",
      },
      {
        supplier: {
          legalName: "asc",
        },
      },
    ],
    where: {
      isCurrent: true,
      materialId,
    },
  });

  return prices.map((price) => {
    const mapped = mapSupplierMaterialPriceRecord(price).base;

    return {
      conversionFactor: mapped.conversionFactor,
      createdAt: mapped.createdAt,
      currency: mapped.currency,
      effectiveFrom: mapped.effectiveFrom,
      effectiveTo: mapped.effectiveTo,
      id: mapped.id,
      import: mapped.import,
      importId: mapped.importId,
      isCurrent: mapped.isCurrent,
      normalizedUnit: mapped.normalizedUnit,
      price: mapped.price,
      supplier: mapped.supplier,
      supplierId: mapped.supplierId,
      supplierMaterialEquivalenceId: mapped.supplierMaterialEquivalenceId,
      supplierUnit: mapped.supplierUnit,
      updatedAt: mapped.updatedAt,
    };
  });
};

export const getPriceHistory = async (
  query: ListPriceHistoryQuery,
): Promise<{
  data: PriceChangeLogRecord[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
}> => {
  const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo);
  const where: Prisma.PriceChangeLogWhereInput = {
    ...(createdAt
      ? {
          createdAt,
        }
      : {}),
    ...(query.materialId
      ? {
          materialId: query.materialId,
        }
      : {}),
    ...(query.supplierId
      ? {
          supplierId: query.supplierId,
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.priceChangeLog.count({
      where,
    }),
    prisma.priceChangeLog.findMany({
      include: priceChangeLogInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      where,
    }),
  ]);

  return {
    data: rows.map(mapPriceChangeLogRecord),
    pagination: {
      page: query.page,
      perPage: query.perPage,
      total,
    },
  };
};

export const priceListsService = {
  async createImport(
    payload: ImportPriceListInput,
    file: UploadFile,
    importedByUserId: string,
  ): Promise<PriceListImportDetailRecord> {
    const supplier = await prisma.supplier.findFirst({
      select: {
        id: true,
      },
      where: {
        deletedAt: null,
        id: payload.supplierId,
      },
    });

    if (!supplier) {
      throw new AppError("Supplier not found.", 404);
    }

    const fileName = file.originalName.trim();
    const storedFileName = buildStoredFileName(fileName);
    const fileUrl = buildPriceListFileUrl(storedFileName);

    await writeFile(path.join(priceListUploadsDir, storedFileName), file.buffer);

    const importRecord = await prisma.priceListImport.create({
      data: {
        currency: payload.currency,
        fileName,
        fileUrl,
        importedByUserId,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        sourceType: inferSourceType(file.originalName, file.mimetype),
        status: "UPLOADED",
        supplierId: payload.supplierId,
      },
    });

    try {
      const parsedFile = parsePriceListFile(file, {
        defaultCurrency: payload.currency,
      });

      if (parsedFile.rows.length === 0) {
        throw new AppError("The uploaded file did not produce any import rows.", 400);
      }

      await prisma.$transaction(async (tx) => {
        await tx.priceListImport.update({
          data: {
            errorMessage: null,
            rowCount: parsedFile.rows.length,
            sourceType: parsedFile.sourceType,
            status: "PARSED",
          },
          where: {
            id: importRecord.id,
          },
        });

        await tx.priceListImportRow.createMany({
          data: parsedFile.rows.map((row) => ({
            currency: row.currency,
            importId: importRecord.id,
            mappingStatus: row.mappingStatus,
            normalizedPrice:
              row.normalizedPrice === null
                ? null
                : toDecimalString(row.normalizedPrice, 4),
            rawJson: row.rawJson,
            rawPrice: row.rawPrice,
            rowNumber: row.rowNumber,
            supplierDescription: row.supplierDescription,
            supplierName: row.supplierName,
            supplierSku: row.supplierSku,
            supplierUnit: row.supplierUnit,
            validationMessage: row.validationMessage,
            validationStatus: row.validationStatus,
          })),
        });
      });

      await autoMapPriceListRows(importRecord.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import parsing failed.";

      await prisma.priceListImport.update({
        data: {
          errorMessage: message,
          status: "FAILED",
        },
        where: {
          id: importRecord.id,
        },
      });

      throw error;
    }

    return mapPriceListImportDetail(importRecord.id);
  },

  async listImports(query: ListPriceListImportsQuery): Promise<{
    data: PriceListImportRecord[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
    };
  }> {
    const where = buildImportWhereClause(query);
    const [total, records] = await prisma.$transaction([
      prisma.priceListImport.count({
        where,
      }),
      prisma.priceListImport.findMany({
        include: priceListImportInclude,
        orderBy: buildImportOrderBy(query.sortBy, query.sortDirection),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    return {
      data: records.map(mapPriceListImportRecord),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async getImportById(importId: string): Promise<PriceListImportDetailRecord> {
    return mapPriceListImportDetail(importId);
  },

  async listImportRows(
    importId: string,
    query: ListPriceListImportRowsQuery,
  ): Promise<{
    data: PriceListImportRowRecord[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
    };
  }> {
    await getPriceListImportOrThrow(importId);

    const where = buildImportRowWhereClause(importId, query);
    const [total, rows] = await prisma.$transaction([
      prisma.priceListImportRow.count({
        where,
      }),
      prisma.priceListImportRow.findMany({
        include: priceListImportRowInclude,
        orderBy: buildImportRowOrderBy(query.sortBy, query.sortDirection),
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
        where,
      }),
    ]);

    return {
      data: rows.map(mapPriceListImportRowRecord),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total,
      },
    };
  },

  async autoMapImportRows(importId: string): Promise<PriceListImportDetailRecord> {
    return autoMapPriceListRows(importId);
  },

  async mapImportRow(
    importId: string,
    rowId: string,
    input: MapPriceListImportRowInput,
  ): Promise<{
    row: PriceListImportRowRecord;
    supplierMaterialEquivalence: SupplierMaterialEquivalenceMutationAudit | null;
  }> {
    let supplierMaterialEquivalenceAudit: SupplierMaterialEquivalenceMutationAudit | null =
      null;

    await prisma.$transaction(async (tx) => {
      const importRecord = await getMutableImportOrThrow(importId, {
        tx,
      });
      const row = await tx.priceListImportRow.findFirst({
        include: priceListImportRowInclude,
        where: {
          id: rowId,
          importId,
        },
      });

      if (!row) {
        throw new AppError("Import row not found.", 404);
      }

      const material = await tx.material.findFirst({
        select: {
          id: true,
        },
        where: {
          deletedAt: null,
          id: input.materialId,
        },
      });

      if (!material) {
        throw new AppError("Material not found.", 404);
      }

      let equivalenceId: string | null = null;

      if (input.createOrUpdateEquivalence) {
        const existingEquivalence = await findExactEquivalenceForRow(
          importRecord.supplierId,
          row,
          {
            tx,
          },
        );

        if (existingEquivalence) {
          const updatedEquivalence = await tx.supplierMaterialEquivalence.update({
            data: {
              confidence: input.confidence,
              conversionFactor:
                input.conversionFactor === null
                  ? existingEquivalence.conversionFactor
                  : toDecimalString(input.conversionFactor, 6),
              materialId: input.materialId,
              notes: input.notes ?? existingEquivalence.notes,
              status: "ACTIVE",
              supplierDescription:
                row.supplierDescription ?? existingEquivalence.supplierDescription,
              supplierSku: row.supplierSku ?? existingEquivalence.supplierSku,
              supplierUnit: row.supplierUnit ?? existingEquivalence.supplierUnit,
            },
            where: {
              id: existingEquivalence.id,
            },
          });

          equivalenceId = updatedEquivalence.id;
          supplierMaterialEquivalenceAudit = {
            action: "updated",
            current: mapSupplierMaterialEquivalenceAuditRecord(updatedEquivalence),
            previous: mapSupplierMaterialEquivalenceAuditRecord(existingEquivalence),
          };
        } else {
          const createdEquivalence = await tx.supplierMaterialEquivalence.create({
            data: {
              confidence: input.confidence,
              conversionFactor:
                input.conversionFactor === null
                  ? null
                  : toDecimalString(input.conversionFactor, 6),
              materialId: input.materialId,
              notes: input.notes,
              status: "ACTIVE",
              supplierDescription: row.supplierDescription,
              supplierId: importRecord.supplierId,
              supplierName: row.supplierName,
              supplierSku: row.supplierSku,
              supplierUnit: row.supplierUnit,
            },
          });

          equivalenceId = createdEquivalence.id;
          supplierMaterialEquivalenceAudit = {
            action: "created",
            current: mapSupplierMaterialEquivalenceAuditRecord(createdEquivalence),
            previous: null,
          };
        }
      }

      await tx.priceListImportRow.update({
        data: {
          detectedMaterialId: input.materialId,
          mappingStatus: "MANUAL_MAPPED",
          supplierMaterialEquivalenceId: equivalenceId,
          validationMessage:
            row.validationStatus === "INVALID" ? row.validationMessage : null,
          validationStatus:
            row.validationStatus === "INVALID" ? "INVALID" : "VALID",
        },
        where: {
          id: rowId,
        },
      });

      await refreshImportProgress(importId, {
        tx,
      });
    });

    const updatedRow = await prisma.priceListImportRow.findFirst({
      include: priceListImportRowInclude,
      where: {
        id: rowId,
        importId,
      },
    });

    if (!updatedRow) {
      throw new AppError("Import row not found.", 404);
    }

    return {
      row: mapPriceListImportRowRecord(updatedRow),
      supplierMaterialEquivalence: supplierMaterialEquivalenceAudit,
    };
  },

  async ignoreImportRow(
    importId: string,
    rowId: string,
  ): Promise<PriceListImportRowRecord> {
    await prisma.$transaction(async (tx) => {
      await getMutableImportOrThrow(importId, {
        tx,
      });
      const row = await tx.priceListImportRow.findFirst({
        where: {
          id: rowId,
          importId,
        },
      });

      if (!row) {
        throw new AppError("Import row not found.", 404);
      }

      await tx.priceListImportRow.update({
        data: {
          detectedMaterialId: null,
          mappingStatus: "IGNORED",
          supplierMaterialEquivalenceId: null,
        },
        where: {
          id: rowId,
        },
      });

      await refreshImportProgress(importId, {
        tx,
      });
    });

    const updatedRow = await prisma.priceListImportRow.findFirst({
      include: priceListImportRowInclude,
      where: {
        id: rowId,
        importId,
      },
    });

    if (!updatedRow) {
      throw new AppError("Import row not found.", 404);
    }

    return mapPriceListImportRowRecord(updatedRow);
  },

  async validateImport(importId: string): Promise<PriceListImportDetailRecord> {
    return validatePriceListImport(importId);
  },

  async approveImport(
    importId: string,
    userId: string,
  ): Promise<{
    approvalResult: PriceListApprovalResult;
    appliedPriceAudits: SupplierMaterialPriceAuditEntry[];
  }> {
    return approvePriceListImport(importId, userId);
  },

  async rejectImport(importId: string): Promise<PriceListImportDetailRecord> {
    await prisma.$transaction(async (tx) => {
      const importRecord = await getPriceListImportOrThrow(importId, {
        tx,
      });

      if (importRecord.status === "APPROVED") {
        throw new AppError("Approved imports cannot be rejected.", 400);
      }

      await tx.priceListImport.update({
        data: {
          status: "REJECTED",
        },
        where: {
          id: importId,
        },
      });
    });

    return mapPriceListImportDetail(importId);
  },

  async getCurrentSupplierPrices(
    materialId: string,
  ): Promise<MaterialSupplierPriceRecord[]> {
    return getCurrentSupplierPrices(materialId);
  },

  async listSupplierMaterialPrices(
    supplierId: string,
  ): Promise<SupplierMaterialPriceListRecord[]> {
    const prices = await prisma.supplierMaterialPrice.findMany({
      include: supplierMaterialPriceInclude,
      orderBy: [
        {
          material: {
            name: "asc",
          },
        },
        {
          effectiveFrom: "desc",
        },
      ],
      where: {
        isCurrent: true,
        supplierId,
      },
    });

    return prices.map((price) => {
      const mapped = mapSupplierMaterialPriceRecord(price).base;

      return {
        conversionFactor: mapped.conversionFactor,
        createdAt: mapped.createdAt,
        currency: mapped.currency,
        effectiveFrom: mapped.effectiveFrom,
        effectiveTo: mapped.effectiveTo,
        id: mapped.id,
        import: mapped.import,
        importId: mapped.importId,
        isCurrent: mapped.isCurrent,
        material: mapped.material,
        materialId: mapped.materialId,
        normalizedUnit: mapped.normalizedUnit,
        price: mapped.price,
        supplierMaterialEquivalenceId: mapped.supplierMaterialEquivalenceId,
        supplierUnit: mapped.supplierUnit,
        updatedAt: mapped.updatedAt,
      };
    });
  },

  async getPriceHistory(query: ListPriceHistoryQuery): Promise<{
    data: PriceChangeLogRecord[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
    };
  }> {
    return getPriceHistory(query);
  },
};
