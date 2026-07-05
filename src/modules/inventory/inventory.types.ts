import type { z } from "zod";

import type { MaterialType, MaterialUnit } from "../materials/materials.behavior.js";
import type {
  availabilityGlassQuerySchema,
  availabilityLinearQuerySchema,
  availabilityMaterialQuerySchema,
  adjustStockSchema,
  damagedMaterialMutationSchema,
  damagedMaterialStatusSchema,
  damageSeveritySchema,
  damageTypeSchema,
  inventoryConditionSchema,
  inventoryMovementTypeSchema,
  inventoryReservationStatusSchema,
  inventoryReservationTypeSchema,
  inventorySourceTypeSchema,
  inventoryStockTypeSchema,
  listDamagedMaterialsQuerySchema,
  listInventoryMovementsQuerySchema,
  listInventoryStockQuerySchema,
  listRemnantsQuerySchema,
  listReservationsQuerySchema,
  listWarehousesQuerySchema,
  remnantPieceMutationSchema,
  remnantPieceStatusSchema,
  reviewDamagedMaterialSchema,
  returnToSupplierSchema,
  scrapMaterialSchema,
  stockEntrySchema,
  transferStockSchema,
  usableRemnantsQuerySchema,
  warehouseMutationSchema,
  warehouseStatusSchema,
  reservationMutationSchema,
} from "./inventory.validators.js";

export type WarehouseStatus = z.infer<typeof warehouseStatusSchema>;
export type InventoryStockType = z.infer<typeof inventoryStockTypeSchema>;
export type InventoryCondition = z.infer<typeof inventoryConditionSchema>;
export type InventorySourceType = z.infer<typeof inventorySourceTypeSchema>;
export type InventoryMovementType = z.infer<typeof inventoryMovementTypeSchema>;
export type InventoryReservationType = z.infer<
  typeof inventoryReservationTypeSchema
>;
export type InventoryReservationStatus = z.infer<
  typeof inventoryReservationStatusSchema
>;
export type RemnantPieceStatus = z.infer<typeof remnantPieceStatusSchema>;
export type DamageType = z.infer<typeof damageTypeSchema>;
export type DamageSeverity = z.infer<typeof damageSeveritySchema>;
export type DamagedMaterialStatus = z.infer<
  typeof damagedMaterialStatusSchema
>;

export type WarehouseSummary = {
  code: string;
  id: string;
  name: string;
};

export type InventoryMaterialSummary = {
  category: {
    id: string;
    name: string;
    slug: string;
  };
  code: string;
  id: string;
  materialType: MaterialType;
  name: string;
};

export type InventoryUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type WarehouseRecord = {
  address: string | null;
  code: string;
  createdAt: string;
  deletedAt: string | null;
  description: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  status: WarehouseStatus;
  updatedAt: string;
};

export type InventoryStockRecord = {
  availableQuantity: number;
  batchNumber: string | null;
  condition: InventoryCondition;
  createdAt: string;
  deletedAt: string | null;
  heightMm: number | null;
  id: string;
  lengthMm: number | null;
  locationCode: string | null;
  material: InventoryMaterialSummary;
  materialId: string;
  notes: string | null;
  quantity: number;
  reservedFirmQuantity: number;
  reservedSoftQuantity: number;
  sourceId: string | null;
  sourceType: InventorySourceType;
  stockType: InventoryStockType;
  thicknessMm: number | null;
  unit: MaterialUnit;
  updatedAt: string;
  warehouse: WarehouseSummary;
  warehouseId: string;
  widthMm: number | null;
};

export type InventoryMovementRecord = {
  createdAt: string;
  createdByUser: InventoryUserSummary;
  fromWarehouse: WarehouseSummary | null;
  id: string;
  inventoryStockId: string | null;
  material: InventoryMaterialSummary;
  materialId: string;
  movementType: InventoryMovementType;
  quantity: number;
  reason: string | null;
  referenceId: string | null;
  referenceType: string | null;
  toWarehouse: WarehouseSummary | null;
  unit: MaterialUnit;
  warehouse: WarehouseSummary;
  warehouseId: string;
};

export type InventoryReservationRecord = {
  createdAt: string;
  expiresAt: string | null;
  id: string;
  inventoryStock: {
    condition: InventoryCondition;
    id: string;
    locationCode: string | null;
    stockType: InventoryStockType;
  } | null;
  inventoryStockId: string | null;
  material: InventoryMaterialSummary;
  materialId: string;
  project: {
    code: string;
    id: string;
    title: string;
  } | null;
  projectId: string | null;
  quantity: number;
  quotation: {
    code: string;
    id: string;
    status: string;
  } | null;
  quotationId: string | null;
  reservationType: InventoryReservationType;
  reservedByUser: InventoryUserSummary;
  status: InventoryReservationStatus;
  unit: MaterialUnit;
  updatedAt: string;
  warehouse: WarehouseSummary;
  warehouseId: string;
};

export type RemnantPieceRecord = {
  code: string;
  createdAt: string;
  id: string;
  lengthMm: number | null;
  material: InventoryMaterialSummary;
  materialId: string;
  notes: string | null;
  parentInventoryStockId: string | null;
  quantity: number;
  sourceId: string | null;
  sourceType: "CUT_OPTIMIZATION" | "MANUAL" | "PRODUCTION_RETURN";
  status: RemnantPieceStatus;
  thicknessMm: number | null;
  unit: MaterialUnit;
  updatedAt: string;
  usableAreaM2: number | null;
  warehouse: WarehouseSummary;
  warehouseId: string;
  widthMm: number | null;
};

export type DamagedMaterialRecord = {
  createdAt: string;
  damageType: DamageType;
  description: string | null;
  id: string;
  inventoryStock: {
    condition: InventoryCondition;
    id: string;
    locationCode: string | null;
    stockType: InventoryStockType;
  } | null;
  inventoryStockId: string | null;
  material: InventoryMaterialSummary;
  materialId: string;
  quantity: number;
  reportedByUser: InventoryUserSummary;
  severity: DamageSeverity;
  status: DamagedMaterialStatus;
  unit: MaterialUnit;
  updatedAt: string;
  warehouse: WarehouseSummary;
  warehouseId: string;
};

export type InventoryAvailabilitySummary = {
  availableQuantity: number;
  damagedQuantity: number;
  remnantQuantity: number;
  reservedFirmQuantity: number;
  reservedSoftQuantity: number;
  totalQuantity: number;
};

export type MaterialAvailabilityRecord = {
  material: InventoryMaterialSummary;
  requestedQuantity: number | null;
  requestedUnit: MaterialUnit | null;
  stocks: InventoryStockRecord[];
  sufficientForRequestedQuantity: boolean | null;
  summary: InventoryAvailabilitySummary;
  warehouseId: string | null;
};

export type GlassAvailabilityRecord = {
  matchingRemnants: RemnantPieceRecord[];
  matchingStocks: InventoryStockRecord[];
  material: InventoryMaterialSummary;
  requestedHeightMm: number;
  requestedWidthMm: number;
  sufficient: boolean;
  thicknessMm: number | null;
  warehouseId: string | null;
};

export type LinearAvailabilityRecord = {
  material: InventoryMaterialSummary;
  matchingStocks: InventoryStockRecord[];
  requiredLengthMm: number;
  sufficient: boolean;
  warehouseId: string | null;
};

export type InventoryDashboardRecord = {
  damagedStockCount: number;
  lowStockCount: number;
  recentMovements: InventoryMovementRecord[];
  remnantsCount: number;
  reservedStockCount: number;
  totalMaterialsWithStock: number;
};

export type CreateWarehouseInput = z.infer<typeof warehouseMutationSchema>;
export type UpdateWarehouseInput = z.infer<typeof warehouseMutationSchema>;
export type ListWarehousesQuery = z.infer<typeof listWarehousesQuerySchema>;
export type CreateStockEntryInput = z.infer<typeof stockEntrySchema>;
export type ListInventoryStockQuery = z.infer<typeof listInventoryStockQuerySchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type TransferStockInput = z.infer<typeof transferStockSchema>;
export type ListInventoryMovementsQuery = z.infer<
  typeof listInventoryMovementsQuerySchema
>;
export type ReservationInput = z.infer<typeof reservationMutationSchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
export type CreateRemnantPieceInput = z.infer<typeof remnantPieceMutationSchema>;
export type ListRemnantsQuery = z.infer<typeof listRemnantsQuerySchema>;
export type UsableRemnantsQuery = z.infer<typeof usableRemnantsQuerySchema>;
export type MarkDamagedMaterialInput = z.infer<
  typeof damagedMaterialMutationSchema
>;
export type ListDamagedMaterialsQuery = z.infer<
  typeof listDamagedMaterialsQuerySchema
>;
export type ReviewDamagedMaterialInput = z.infer<
  typeof reviewDamagedMaterialSchema
>;
export type ScrapMaterialInput = z.infer<typeof scrapMaterialSchema>;
export type ReturnToSupplierInput = z.infer<typeof returnToSupplierSchema>;
export type AvailabilityMaterialQuery = z.infer<
  typeof availabilityMaterialQuerySchema
>;
export type AvailabilityGlassQuery = z.infer<typeof availabilityGlassQuerySchema>;
export type AvailabilityLinearQuery = z.infer<
  typeof availabilityLinearQuerySchema
>;
