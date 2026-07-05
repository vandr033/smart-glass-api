import { AppError } from "../../utils/app-error.js";

export const MATERIAL_TYPES = [
  "LINEAR",
  "SHEET",
  "UNIT",
  "PACKAGE",
  "SERVICE",
] as const;

export const MATERIAL_UNITS = [
  "MM",
  "CM",
  "M",
  "M2",
  "UNIT",
  "PACKAGE",
  "KG",
  "LITER",
  "HOUR",
  "DAY",
] as const;

export const MATERIAL_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "DISCONTINUED",
] as const;

export const SUPPLIER_MATERIAL_EQUIVALENCE_CONFIDENCE_LEVELS = [
  "PENDING",
  "LOW",
  "MEDIUM",
  "HIGH",
  "VERIFIED",
] as const;

export const SUPPLIER_MATERIAL_EQUIVALENCE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "IGNORED",
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];
export type MaterialUnit = (typeof MATERIAL_UNITS)[number];
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
export type SupplierMaterialEquivalenceConfidence =
  (typeof SUPPLIER_MATERIAL_EQUIVALENCE_CONFIDENCE_LEVELS)[number];
export type SupplierMaterialEquivalenceStatus =
  (typeof SUPPLIER_MATERIAL_EQUIVALENCE_STATUSES)[number];

export type JsonLike =
  | boolean
  | number
  | string
  | null
  | JsonLike[]
  | {
      [key: string]: JsonLike;
    };

export type MaterialBehaviorInput = {
  allowsRotation: boolean;
  baseUnit: MaterialUnit;
  consumptionUnit: MaterialUnit;
  isCuttable: boolean;
  isPurchasable: boolean;
  isRemnantEligible: boolean;
  isSellable: boolean;
  isStockable: boolean;
  materialType: MaterialType;
  minimumReusableHeightMm: number | null;
  minimumReusableLengthMm: number | null;
  minimumReusableWidthMm: number | null;
  purchaseUnit: MaterialUnit;
  standardHeightMm: number | null;
  standardLengthMm: number | null;
  standardWidthMm: number | null;
  stockUnit: MaterialUnit;
  thicknessMm: number | null;
  unitConversionJson: JsonLike | null;
};

export type MaterialBehaviorIssue = {
  message: string;
  path: keyof MaterialBehaviorInput | string;
};

export type MaterialBehaviorValidationResult = {
  errors: MaterialBehaviorIssue[];
  warnings: MaterialBehaviorIssue[];
};

export type MaterialConsumptionResult = {
  quantity: number;
  unit: MaterialUnit;
};

export type MaterialCuttingProfile = {
  allowsRotation: boolean;
  isCuttable: boolean;
  materialType: MaterialType;
  standardStock: {
    heightMm: number | null;
    lengthMm: number | null;
    widthMm: number | null;
  } | null;
  strategy: "linear" | "none" | "sheet";
  usesLength: boolean;
  usesThickness: boolean;
  usesWidth: boolean;
};

export type MaterialRemnantRules = {
  eligible: boolean;
  minimumReusableHeightMm: number | null;
  minimumReusableLengthMm: number | null;
  minimumReusableWidthMm: number | null;
  strategy: "linear" | "none" | "sheet";
};

const LENGTH_UNIT_FACTORS_TO_MM: Partial<Record<MaterialUnit, number>> = {
  CM: 10,
  M: 1000,
  MM: 1,
};

const isObjectRecord = (value: JsonLike | null): value is Record<string, JsonLike> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const toFiniteNumber = (value: JsonLike | undefined): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const getUnitsPerPackage = (unitConversionJson: JsonLike | null): number | null => {
  if (!isObjectRecord(unitConversionJson)) {
    return null;
  }

  return (
    toFiniteNumber(unitConversionJson.unitsPerPackage) ??
    toFiniteNumber(unitConversionJson.conversionFactor)
  );
};

export const applyMaterialBehaviorDefaults = <
  TMaterial extends Pick<MaterialBehaviorInput, "isStockable" | "materialType">,
>(
  material: TMaterial,
): TMaterial => {
  if (material.materialType !== "SERVICE") {
    return material;
  }

  return {
    ...material,
    isStockable: false,
  };
};

export const validateMaterialBehavior = (
  rawMaterial: MaterialBehaviorInput,
): MaterialBehaviorValidationResult => {
  const material = applyMaterialBehaviorDefaults(rawMaterial);
  const errors: MaterialBehaviorIssue[] = [];
  const warnings: MaterialBehaviorIssue[] = [];

  if (
    rawMaterial.materialType === "SERVICE" &&
    rawMaterial.isStockable
  ) {
    errors.push({
      message: "Service materials cannot be stockable.",
      path: "isStockable",
    });
  }

  if (
    material.materialType === "SHEET" &&
    material.isCuttable &&
    material.standardLengthMm === null
  ) {
    errors.push({
      message: "Cuttable sheet materials require a standard length in millimeters.",
      path: "standardLengthMm",
    });
  }

  if (
    material.materialType === "SHEET" &&
    material.isCuttable &&
    material.standardWidthMm === null
  ) {
    errors.push({
      message: "Cuttable sheet materials require a standard width in millimeters.",
      path: "standardWidthMm",
    });
  }

  if (
    material.materialType === "LINEAR" &&
    material.isCuttable &&
    material.standardLengthMm === null
  ) {
    warnings.push({
      message:
        "Linear cuttable materials should define a standard purchased length for later optimization.",
      path: "standardLengthMm",
    });
  }

  if (
    material.materialType === "PACKAGE" &&
    material.unitConversionJson === null
  ) {
    warnings.push({
      message:
        "Package materials should define unit conversion JSON to support package-to-unit consumption later.",
      path: "unitConversionJson",
    });
  }

  if (material.isRemnantEligible && material.materialType === "LINEAR") {
    if (material.minimumReusableLengthMm === null) {
      errors.push({
        message:
          "Remnant-eligible linear materials require a minimum reusable length in millimeters.",
        path: "minimumReusableLengthMm",
      });
    }
  }

  if (material.isRemnantEligible && material.materialType === "SHEET") {
    if (material.minimumReusableWidthMm === null) {
      errors.push({
        message:
          "Remnant-eligible sheet materials require a minimum reusable width in millimeters.",
        path: "minimumReusableWidthMm",
      });
    }

    if (material.minimumReusableHeightMm === null) {
      errors.push({
        message:
          "Remnant-eligible sheet materials require a minimum reusable height in millimeters.",
        path: "minimumReusableHeightMm",
      });
    }
  }

  if (
    material.isRemnantEligible &&
    !["LINEAR", "SHEET"].includes(material.materialType)
  ) {
    errors.push({
      message:
        "Only LINEAR or SHEET materials can define reusable remnant behavior.",
      path: "isRemnantEligible",
    });
  }

  return {
    errors,
    warnings,
  };
};

export const convertMaterialUnit = ({
  fromUnit,
  material,
  quantity,
  toUnit,
}: {
  fromUnit: MaterialUnit;
  material: Pick<MaterialBehaviorInput, "materialType" | "unitConversionJson"> & {
    code?: string;
    name?: string;
  };
  quantity: number;
  toUnit: MaterialUnit;
}): number => {
  if (!Number.isFinite(quantity)) {
    throw new AppError("Quantity must be a finite number.", 400);
  }

  if (fromUnit === toUnit) {
    return quantity;
  }

  const fromLengthFactor = LENGTH_UNIT_FACTORS_TO_MM[fromUnit];
  const toLengthFactor = LENGTH_UNIT_FACTORS_TO_MM[toUnit];

  if (fromLengthFactor && toLengthFactor) {
    return (quantity * fromLengthFactor) / toLengthFactor;
  }

  if (fromUnit === "PACKAGE" && toUnit === "UNIT") {
    const unitsPerPackage = getUnitsPerPackage(material.unitConversionJson);

    if (unitsPerPackage === null || unitsPerPackage <= 0) {
      throw new AppError(
        `Material ${material.code ?? material.name ?? "record"} does not define a valid unitsPerPackage conversion.`,
        400,
      );
    }

    return quantity * unitsPerPackage;
  }

  if (fromUnit === "UNIT" && toUnit === "PACKAGE") {
    const unitsPerPackage = getUnitsPerPackage(material.unitConversionJson);

    if (unitsPerPackage === null || unitsPerPackage <= 0) {
      throw new AppError(
        `Material ${material.code ?? material.name ?? "record"} does not define a valid unitsPerPackage conversion.`,
        400,
      );
    }

    return quantity / unitsPerPackage;
  }

  throw new AppError(
    `Conversion from ${fromUnit} to ${toUnit} is not configured for this material yet.`,
    400,
  );
};

export const calculateMaterialConsumptionUnit = (
  material: Pick<
    MaterialBehaviorInput,
    "baseUnit" | "consumptionUnit" | "materialType" | "unitConversionJson"
  > & {
    code?: string;
    name?: string;
  },
  quantity: number,
): MaterialConsumptionResult => {
  return {
    quantity: convertMaterialUnit({
      fromUnit: material.baseUnit,
      material,
      quantity,
      toUnit: material.consumptionUnit,
    }),
    unit: material.consumptionUnit,
  };
};

export const getMaterialCuttingProfile = (
  material: Pick<
    MaterialBehaviorInput,
    | "allowsRotation"
    | "isCuttable"
    | "materialType"
    | "standardHeightMm"
    | "standardLengthMm"
    | "standardWidthMm"
  >,
): MaterialCuttingProfile => {
  const strategy =
    material.isCuttable && material.materialType === "LINEAR"
      ? "linear"
      : material.isCuttable && material.materialType === "SHEET"
        ? "sheet"
        : "none";

  return {
    allowsRotation: strategy === "sheet" ? material.allowsRotation : false,
    isCuttable: material.isCuttable,
    materialType: material.materialType,
    standardStock:
      strategy === "none"
        ? null
        : {
            heightMm: material.standardHeightMm,
            lengthMm: material.standardLengthMm,
            widthMm: material.standardWidthMm,
          },
    strategy,
    usesLength: strategy === "linear" || strategy === "sheet",
    usesThickness: strategy === "sheet",
    usesWidth: strategy === "sheet",
  };
};

export const getMaterialRemnantRules = (
  material: Pick<
    MaterialBehaviorInput,
    | "isRemnantEligible"
    | "materialType"
    | "minimumReusableHeightMm"
    | "minimumReusableLengthMm"
    | "minimumReusableWidthMm"
  >,
): MaterialRemnantRules => {
  const strategy =
    material.isRemnantEligible && material.materialType === "LINEAR"
      ? "linear"
      : material.isRemnantEligible && material.materialType === "SHEET"
        ? "sheet"
        : "none";

  return {
    eligible: material.isRemnantEligible,
    minimumReusableHeightMm:
      strategy === "sheet" ? material.minimumReusableHeightMm : null,
    minimumReusableLengthMm:
      strategy === "linear" ? material.minimumReusableLengthMm : null,
    minimumReusableWidthMm:
      strategy === "sheet" ? material.minimumReusableWidthMm : null,
    strategy,
  };
};
