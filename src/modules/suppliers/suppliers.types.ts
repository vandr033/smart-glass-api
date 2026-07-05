import type { z } from "zod";

import type { SupplierScoringCriterionKey } from "./suppliers.constants.js";
import type {
  createSupplierCategorySchema,
  createSupplierContactSchema,
  createSupplierSchema,
  createSupplierScoringConfigSchema,
  listSupplierCategoriesQuerySchema,
  listSupplierScoringConfigsQuerySchema,
  listSuppliersQuerySchema,
  simulateSupplierScoringSchema,
  updateSupplierCategorySchema,
  updateSupplierContactSchema,
  updateSupplierSchema,
  updateSupplierScoringConfigSchema,
  supplierCategoryDeleteQuerySchema,
} from "./suppliers.validators.js";

export type SupplierStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
export type SupplierScoringScope = "GLOBAL" | "CATEGORY";

export type SupplierCategorySummary = {
  id: string;
  name: string;
};

export type SupplierContactRecord = {
  createdAt: string;
  email: string | null;
  id: string;
  isPrimary: boolean;
  name: string;
  notes: string | null;
  phone: string | null;
  position: string | null;
  updatedAt: string;
  whatsapp: string | null;
};

export type SupplierListItem = {
  categories: SupplierCategorySummary[];
  city: string | null;
  code: string | null;
  commercialName: string | null;
  country: string;
  createdAt: string;
  defaultLeadTimeDays: number | null;
  email: string | null;
  id: string;
  legalName: string;
  phone: string | null;
  preferenceScore: number | null;
  reliabilityScore: number | null;
  status: SupplierStatus;
  taxId: string | null;
  updatedAt: string;
};

export type SupplierDetailRecord = SupplierListItem & {
  address: string | null;
  contactEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactPosition: string | null;
  contacts: SupplierContactRecord[];
  creditAvailable: boolean;
  creditLimit: number | null;
  deletedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  paymentTerms: string | null;
  website: string | null;
  whatsapp: string | null;
};

export type SupplierCategoryRecord = {
  activeScoringConfigsCount: number;
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  suppliersCount: number;
  updatedAt: string;
};

export type SupplierScoringCriterionRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  isEnabled: boolean;
  key: SupplierScoringCriterionKey;
  label: string;
  sortOrder: number;
  updatedAt: string;
};

export type SupplierScoringConfigWeightRecord = {
  criterionId: string;
  criterionKey: SupplierScoringCriterionKey;
  criterionLabel: string;
  isCriterionEnabled: boolean;
  weight: number;
};

export type SupplierScoringConfigRecord = {
  category: SupplierCategorySummary | null;
  createdAt: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  scope: SupplierScoringScope;
  totalWeight: number;
  updatedAt: string;
  weights: SupplierScoringConfigWeightRecord[];
};

export type SupplierScoringBreakdownRecord = {
  contribution: number;
  criterionId: string;
  criterionKey: SupplierScoringCriterionKey;
  criterionLabel: string;
  normalizedScore: number;
  source: "derived" | "direct" | "manual";
  weight: number;
};

export type RankedSupplierScoreRecord = {
  breakdown: SupplierScoringBreakdownRecord[];
  finalScore: number;
  supplierId: string;
  supplierName: string;
};

export type SupplierScoringSimulationResponse = {
  rankedSuppliers: RankedSupplierScoreRecord[];
  selectedConfig: SupplierScoringConfigRecord;
  weights: SupplierScoringConfigWeightRecord[];
};

export type SupplierScoringManualScores = Record<
  string,
  Partial<Record<SupplierScoringCriterionKey, number | null | undefined>>
>;

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
export type CreateSupplierContactInput = z.infer<typeof createSupplierContactSchema>;
export type UpdateSupplierContactInput = z.infer<typeof updateSupplierContactSchema>;
export type CreateSupplierCategoryInput = z.infer<typeof createSupplierCategorySchema>;
export type UpdateSupplierCategoryInput = z.infer<typeof updateSupplierCategorySchema>;
export type ListSupplierCategoriesQuery = z.infer<typeof listSupplierCategoriesQuerySchema>;
export type DeleteSupplierCategoryQuery = z.infer<typeof supplierCategoryDeleteQuerySchema>;
export type CreateSupplierScoringConfigInput = z.infer<
  typeof createSupplierScoringConfigSchema
>;
export type UpdateSupplierScoringConfigInput = z.infer<
  typeof updateSupplierScoringConfigSchema
>;
export type ListSupplierScoringConfigsQuery = z.infer<
  typeof listSupplierScoringConfigsQuerySchema
>;
export type SimulateSupplierScoringInput = z.infer<
  typeof simulateSupplierScoringSchema
>;
