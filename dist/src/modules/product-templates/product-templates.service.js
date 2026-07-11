import { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
import { evaluateNumericFormula, validateFormula, } from "./product-template-formulas.js";
const userSummarySelect = {
    email: true,
    id: true,
    name: true,
};
const materialSummarySelect = {
    code: true,
    consumptionUnit: true,
    defaultWastePercent: true,
    id: true,
    materialType: true,
    name: true,
    thicknessMm: true,
};
const productTemplateListInclude = {
    createdByUser: {
        select: userSummarySelect,
    },
    currentVersion: {
        select: {
            activatedAt: true,
            createdAt: true,
            description: true,
            id: true,
            name: true,
            notes: true,
            status: true,
            updatedAt: true,
            versionNumber: true,
        },
    },
};
const productTemplateDetailInclude = {
    ...productTemplateListInclude,
    versions: {
        orderBy: [
            {
                versionNumber: "desc",
            },
        ],
        select: {
            activatedAt: true,
            createdAt: true,
            description: true,
            id: true,
            name: true,
            notes: true,
            status: true,
            updatedAt: true,
            versionNumber: true,
        },
    },
};
const productTemplateVersionDetailInclude = {
    accessoryRules: {
        include: {
            material: {
                select: materialSummarySelect,
            },
        },
        orderBy: [
            {
                sortOrder: "asc",
            },
            {
                createdAt: "asc",
            },
        ],
    },
    createdByUser: {
        select: userSummarySelect,
    },
    inputs: {
        orderBy: [
            {
                sortOrder: "asc",
            },
            {
                createdAt: "asc",
            },
        ],
    },
    laborRules: {
        orderBy: [
            {
                sortOrder: "asc",
            },
            {
                createdAt: "asc",
            },
        ],
    },
    materialRules: {
        include: {
            material: {
                select: materialSummarySelect,
            },
        },
        orderBy: [
            {
                sortOrder: "asc",
            },
            {
                createdAt: "asc",
            },
        ],
    },
    template: {
        select: {
            code: true,
            currentVersionId: true,
            deletedAt: true,
            description: true,
            id: true,
            name: true,
            productType: true,
            status: true,
        },
    },
};
const productTemplateSimulationInclude = {
    simulatedByUser: {
        select: userSummarySelect,
    },
};
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
const toIsoString = (value) => {
    return value?.toISOString() ?? null;
};
const toJsonLike = (value) => {
    return value ?? null;
};
const toPrismaJsonValue = (value) => {
    return value;
};
const toNullablePrismaJsonValue = (value) => {
    if (value === null) {
        return PrismaNamespace.JsonNull;
    }
    return value;
};
const roundTo = (value, decimals = 4) => {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
};
const isRecord = (value) => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};
const isPrimitiveJsonLike = (value) => {
    return (value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean");
};
const mapUserSummary = (user) => {
    if (!user) {
        return null;
    }
    return {
        email: user.email,
        id: user.id,
        name: user.name,
    };
};
const mapMaterialSummary = (material) => {
    return {
        code: material.code,
        consumptionUnit: material.consumptionUnit,
        defaultWastePercent: decimalToNumber(material.defaultWastePercent),
        id: material.id,
        materialType: material.materialType,
        name: material.name,
        thicknessMm: decimalToNumber(material.thicknessMm),
    };
};
const mapVersionSummary = (version) => {
    if (!version) {
        return null;
    }
    return {
        activatedAt: toIsoString(version.activatedAt),
        createdAt: version.createdAt.toISOString(),
        description: version.description,
        id: version.id,
        name: version.name,
        notes: version.notes,
        status: version.status,
        updatedAt: version.updatedAt.toISOString(),
        versionNumber: version.versionNumber,
    };
};
const mapTemplateListItem = (template) => {
    return {
        code: template.code,
        createdAt: template.createdAt.toISOString(),
        createdByUser: mapUserSummary(template.createdByUser),
        currentVersion: mapVersionSummary(template.currentVersion),
        currentVersionId: template.currentVersionId,
        description: template.description,
        id: template.id,
        name: template.name,
        productType: template.productType,
        status: template.status,
        updatedAt: template.updatedAt.toISOString(),
    };
};
const mapProductTemplateInput = (input) => {
    return {
        createdAt: input.createdAt.toISOString(),
        defaultValueJson: toJsonLike(input.defaultValueJson),
        id: input.id,
        inputType: input.inputType,
        isRequired: input.isRequired,
        key: input.key,
        label: input.label,
        optionsJson: toJsonLike(input.optionsJson),
        sortOrder: input.sortOrder,
        unit: input.unit,
        updatedAt: input.updatedAt.toISOString(),
        validationJson: toJsonLike(input.validationJson),
        versionId: input.versionId,
    };
};
const mapProductTemplateMaterialRule = (rule) => {
    const formulaJson = toJsonLike(rule.formulaJson);
    if (formulaJson === null || !isRecord(formulaJson)) {
        throw new AppError(`Material rule "${rule.label}" contains invalid formula JSON.`, 500);
    }
    return {
        allowRemnantUse: rule.allowRemnantUse,
        allowRotation: rule.allowRotation,
        createdAt: rule.createdAt.toISOString(),
        formulaJson,
        id: rule.id,
        isActive: rule.isActive,
        label: rule.label,
        material: mapMaterialSummary(rule.material),
        materialId: rule.materialId,
        ruleType: rule.ruleType,
        sortOrder: rule.sortOrder,
        updatedAt: rule.updatedAt.toISOString(),
        versionId: rule.versionId,
        wastePercent: decimalToNumber(rule.wastePercent),
    };
};
const mapProductTemplateAccessoryRule = (rule) => {
    const quantityFormulaJson = toJsonLike(rule.quantityFormulaJson);
    if (quantityFormulaJson === null) {
        throw new AppError(`Accessory rule "${rule.label}" contains invalid quantity formula JSON.`, 500);
    }
    return {
        createdAt: rule.createdAt.toISOString(),
        id: rule.id,
        isActive: rule.isActive,
        isOptional: rule.isOptional,
        label: rule.label,
        material: mapMaterialSummary(rule.material),
        materialId: rule.materialId,
        quantityFormulaJson,
        sortOrder: rule.sortOrder,
        updatedAt: rule.updatedAt.toISOString(),
        versionId: rule.versionId,
    };
};
const mapProductTemplateLaborRule = (rule) => {
    const formulaJson = toJsonLike(rule.formulaJson);
    if (formulaJson === null) {
        throw new AppError(`Labor rule "${rule.label}" contains invalid formula JSON.`, 500);
    }
    return {
        createdAt: rule.createdAt.toISOString(),
        formulaJson,
        id: rule.id,
        isActive: rule.isActive,
        label: rule.label,
        laborType: rule.laborType,
        sortOrder: rule.sortOrder,
        unitCost: decimalToNumber(rule.unitCost),
        updatedAt: rule.updatedAt.toISOString(),
        versionId: rule.versionId,
    };
};
const mapTemplateDetailRecord = (template) => {
    return {
        ...mapTemplateListItem(template),
        deletedAt: toIsoString(template.deletedAt),
        versions: template.versions
            .map((version) => mapVersionSummary(version))
            .filter((version) => Boolean(version)),
    };
};
const mapTemplateVersionDetailRecord = (version, validation) => {
    const inputSchemaJson = toJsonLike(version.inputSchemaJson);
    if (inputSchemaJson === null) {
        throw new AppError(`Template version "${version.name}" contains invalid input schema JSON.`, 500);
    }
    return {
        accessoryRules: version.accessoryRules.map(mapProductTemplateAccessoryRule),
        activatedAt: toIsoString(version.activatedAt),
        calculationRulesJson: toJsonLike(version.calculationRulesJson),
        createdAt: version.createdAt.toISOString(),
        createdByUser: mapUserSummary(version.createdByUser),
        defaultMarginPercent: decimalToNumber(version.defaultMarginPercent),
        defaultWastePercent: decimalToNumber(version.defaultWastePercent),
        description: version.description,
        id: version.id,
        inputSchemaJson,
        inputs: version.inputs.map(mapProductTemplateInput),
        installationRulesJson: toJsonLike(version.installationRulesJson),
        laborRules: version.laborRules.map(mapProductTemplateLaborRule),
        laborRulesJson: toJsonLike(version.laborRulesJson),
        materialRules: version.materialRules.map(mapProductTemplateMaterialRule),
        name: version.name,
        notes: version.notes,
        status: version.status,
        template: {
            code: version.template.code,
            currentVersionId: version.template.currentVersionId,
            description: version.template.description,
            id: version.template.id,
            name: version.template.name,
            productType: version.template.productType,
            status: version.template.status,
        },
        templateId: version.templateId,
        updatedAt: version.updatedAt.toISOString(),
        validation,
        versionNumber: version.versionNumber,
    };
};
const mapSimulationRecord = (simulation) => {
    const inputValuesJson = toJsonLike(simulation.inputValuesJson);
    const resultJson = toJsonLike(simulation.resultJson);
    if (!isRecord(inputValuesJson) ||
        !isRecord(resultJson) ||
        !Array.isArray(resultJson.warnings)) {
        throw new AppError("Stored simulation JSON is invalid.", 500);
    }
    return {
        createdAt: simulation.createdAt.toISOString(),
        id: simulation.id,
        inputValuesJson: inputValuesJson,
        resultJson: resultJson,
        simulatedByUser: mapUserSummary(simulation.simulatedByUser),
        versionId: simulation.versionId,
    };
};
const buildTemplateOrderBy = (sortBy, sortDirection) => {
    switch (sortBy) {
        case "code":
            return {
                code: sortDirection,
            };
        case "createdAt":
            return {
                createdAt: sortDirection,
            };
        case "name":
            return {
                name: sortDirection,
            };
        case "updatedAt":
            return {
                updatedAt: sortDirection,
            };
    }
};
const buildTemplateWhereClause = (query) => {
    return {
        deletedAt: null,
        ...(query.productType
            ? {
                productType: query.productType,
            }
            : {}),
        ...(query.status
            ? {
                status: query.status,
            }
            : {}),
        ...(query.search.length > 0
            ? {
                OR: [
                    {
                        code: {
                            contains: query.search,
                        },
                    },
                    {
                        name: {
                            contains: query.search,
                        },
                    },
                    {
                        description: {
                            contains: query.search,
                        },
                    },
                ],
            }
            : {}),
    };
};
const assertTemplateExists = async (id, db) => {
    const template = await db.productTemplate.findFirst({
        include: productTemplateDetailInclude,
        where: {
            deletedAt: null,
            id,
        },
    });
    if (!template) {
        throw new AppError("Product template not found.", 404);
    }
    return template;
};
const assertTemplateVersionExists = async (versionId, db) => {
    const version = await db.productTemplateVersion.findUnique({
        include: productTemplateVersionDetailInclude,
        where: {
            id: versionId,
        },
    });
    if (!version || version.template.deletedAt !== null) {
        throw new AppError("Product template version not found.", 404);
    }
    return version;
};
const ensureObject = (value, label) => {
    if (!isRecord(value)) {
        throw new Error(`${label} debe ser un objeto.`);
    }
    return value;
};
const getOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};
const getFormulaValue = (value, key, label) => {
    if (!(key in value)) {
        throw new Error(`${label} es obligatorio.`);
    }
    return value[key];
};
const parseMaterialRuleFormula = (ruleType, formulaJson) => {
    switch (ruleType) {
        case "LINEAR_CUT": {
            const formulaObject = ensureObject(formulaJson, "LINEAR_CUT formula");
            return {
                materialInputKey: getOptionalString(formulaObject.materialInputKey),
                quantityFormula: formulaObject.quantityFormula ?? {
                    type: "CONSTANT",
                    value: 1,
                },
                requiredLengthMmFormula: getFormulaValue(formulaObject, "requiredLengthMmFormula", "LINEAR_CUT.requiredLengthMmFormula"),
                ruleType,
            };
        }
        case "SHEET_CUT": {
            const formulaObject = ensureObject(formulaJson, "SHEET_CUT formula");
            return {
                materialInputKey: getOptionalString(formulaObject.materialInputKey),
                quantityFormula: formulaObject.quantityFormula ?? {
                    type: "CONSTANT",
                    value: 1,
                },
                requiredHeightMmFormula: getFormulaValue(formulaObject, "requiredHeightMmFormula", "SHEET_CUT.requiredHeightMmFormula"),
                requiredWidthMmFormula: getFormulaValue(formulaObject, "requiredWidthMmFormula", "SHEET_CUT.requiredWidthMmFormula"),
                ruleType,
                thicknessMmFormula: formulaObject.thicknessMmFormula ?? null,
            };
        }
        case "PACKAGE_QUANTITY":
        case "SERVICE_COST":
        case "UNIT_QUANTITY": {
            if (isRecord(formulaJson) && "quantityFormula" in formulaJson) {
                return {
                    materialInputKey: getOptionalString(formulaJson.materialInputKey),
                    quantityFormula: getFormulaValue(formulaJson, "quantityFormula", `${ruleType}.quantityFormula`),
                    ruleType,
                    unitCostFormula: "unitCostFormula" in formulaJson ? formulaJson.unitCostFormula ?? null : null,
                };
            }
            return {
                materialInputKey: null,
                quantityFormula: formulaJson,
                ruleType,
                unitCostFormula: null,
            };
        }
    }
};
const parseLaborRuleFormula = (formulaJson) => {
    if (isRecord(formulaJson) && "quantityFormula" in formulaJson) {
        return {
            quantityFormula: getFormulaValue(formulaJson, "quantityFormula", "LaborRule.quantityFormula"),
        };
    }
    return {
        quantityFormula: formulaJson,
    };
};
const validateInputReference = (context, inputKey, requiredInputType, label, errors) => {
    const input = context.inputByKey.get(inputKey);
    if (!input) {
        errors.push(`${label} references unknown input "${inputKey}".`);
        return;
    }
    if (input.inputType !== requiredInputType) {
        errors.push(`${label} must reference a ${requiredInputType} input, but "${inputKey}" is ${input.inputType}.`);
    }
};
const validateFormulaAndCollectErrors = (formulaJson, label, allowedInputKeys, errors) => {
    const validation = validateFormula(formulaJson, {
        allowedInputKeys,
    });
    validation.errors.forEach((error) => {
        errors.push(`${label}: ${error}`);
    });
};
const validateMaterialTypeCompatibility = (materialType, expectedMaterialType, label, errors) => {
    if (materialType !== expectedMaterialType) {
        errors.push(`${label} requires a ${expectedMaterialType} material, but the linked material is ${materialType}.`);
    }
};
const validateTemplateVersionEntity = (version) => {
    const errors = [];
    const warnings = [];
    const inputByKey = new Map(version.inputs.map((input) => [input.key, input]));
    const context = {
        inputByKey,
        inputKeys: new Set(version.inputs.map((input) => input.key)),
        version,
    };
    if (version.inputs.length === 0) {
        warnings.push("The version does not define any inputs yet.");
    }
    version.inputs.forEach((input) => {
        if (input.inputType === "SELECT" && !Array.isArray(input.optionsJson)) {
            errors.push(`Input "${input.label}" must define optionsJson as an array.`);
        }
    });
    version.materialRules.forEach((rule) => {
        try {
            const formulaJson = toJsonLike(rule.formulaJson);
            if (formulaJson === null) {
                errors.push(`Material rule "${rule.label}" has empty formula JSON.`);
                return;
            }
            const config = parseMaterialRuleFormula(rule.ruleType, formulaJson);
            switch (config.ruleType) {
                case "LINEAR_CUT":
                    validateMaterialTypeCompatibility(rule.material.materialType, "LINEAR", `Material rule "${rule.label}"`, errors);
                    validateFormulaAndCollectErrors(config.requiredLengthMmFormula, `Material rule "${rule.label}" length formula`, context.inputKeys, errors);
                    validateFormulaAndCollectErrors(config.quantityFormula, `Material rule "${rule.label}" quantity formula`, context.inputKeys, errors);
                    if (config.materialInputKey) {
                        validateInputReference(context, config.materialInputKey, "MATERIAL_SELECT", `Material rule "${rule.label}" materialInputKey`, errors);
                    }
                    return;
                case "SHEET_CUT":
                    validateMaterialTypeCompatibility(rule.material.materialType, "SHEET", `Material rule "${rule.label}"`, errors);
                    validateFormulaAndCollectErrors(config.requiredWidthMmFormula, `Material rule "${rule.label}" width formula`, context.inputKeys, errors);
                    validateFormulaAndCollectErrors(config.requiredHeightMmFormula, `Material rule "${rule.label}" height formula`, context.inputKeys, errors);
                    validateFormulaAndCollectErrors(config.quantityFormula, `Material rule "${rule.label}" quantity formula`, context.inputKeys, errors);
                    if (config.thicknessMmFormula) {
                        validateFormulaAndCollectErrors(config.thicknessMmFormula, `Material rule "${rule.label}" thickness formula`, context.inputKeys, errors);
                    }
                    if (config.materialInputKey) {
                        validateInputReference(context, config.materialInputKey, "MATERIAL_SELECT", `Material rule "${rule.label}" materialInputKey`, errors);
                    }
                    return;
                case "UNIT_QUANTITY":
                    validateMaterialTypeCompatibility(rule.material.materialType, "UNIT", `Material rule "${rule.label}"`, errors);
                    break;
                case "PACKAGE_QUANTITY":
                    validateMaterialTypeCompatibility(rule.material.materialType, "PACKAGE", `Material rule "${rule.label}"`, errors);
                    break;
                case "SERVICE_COST":
                    validateMaterialTypeCompatibility(rule.material.materialType, "SERVICE", `Material rule "${rule.label}"`, errors);
                    break;
            }
            validateFormulaAndCollectErrors(config.quantityFormula, `Material rule "${rule.label}" quantity formula`, context.inputKeys, errors);
            if (config.unitCostFormula) {
                validateFormulaAndCollectErrors(config.unitCostFormula, `Material rule "${rule.label}" unit cost formula`, context.inputKeys, errors);
            }
            if (config.materialInputKey) {
                validateInputReference(context, config.materialInputKey, "MATERIAL_SELECT", `Material rule "${rule.label}" materialInputKey`, errors);
            }
        }
        catch (error) {
            errors.push(error instanceof Error
                ? `Material rule "${rule.label}": ${error.message}`
                : `Material rule "${rule.label}" could not be parsed.`);
        }
    });
    version.accessoryRules.forEach((rule) => {
        if (!["PACKAGE", "UNIT"].includes(rule.material.materialType)) {
            errors.push(`Accessory rule "${rule.label}" requires a UNIT or PACKAGE material, but the linked material is ${rule.material.materialType}.`);
        }
        validateFormulaAndCollectErrors(toJsonLike(rule.quantityFormulaJson), `Accessory rule "${rule.label}" quantity formula`, context.inputKeys, errors);
    });
    version.laborRules.forEach((rule) => {
        try {
            const formulaJson = toJsonLike(rule.formulaJson);
            if (formulaJson === null) {
                errors.push(`Labor rule "${rule.label}" has empty formula JSON.`);
                return;
            }
            const config = parseLaborRuleFormula(formulaJson);
            validateFormulaAndCollectErrors(config.quantityFormula, `Labor rule "${rule.label}" quantity formula`, context.inputKeys, errors);
        }
        catch (error) {
            errors.push(error instanceof Error
                ? `Labor rule "${rule.label}": ${error.message}`
                : `Labor rule "${rule.label}" could not be parsed.`);
        }
    });
    return {
        errors,
        isValid: errors.length === 0,
        warnings,
    };
};
const normalizeBooleanValue = (value, label) => {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const normalizedValue = value.trim().toLowerCase();
        if (["true", "1", "yes"].includes(normalizedValue)) {
            return true;
        }
        if (["false", "0", "no"].includes(normalizedValue)) {
            return false;
        }
    }
    throw new AppError(`${label} must be true or false.`, 400);
};
const normalizeNumberValue = (value, label) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const trimmedValue = value.trim();
        const parsedValue = Number(trimmedValue);
        if (trimmedValue.length > 0 && Number.isFinite(parsedValue)) {
            return parsedValue;
        }
    }
    throw new AppError(`${label} must be a valid number.`, 400);
};
const normalizeSimulationInputs = (version, rawInputValues) => {
    const normalizedInputs = {};
    const inputErrors = [];
    version.inputs.forEach((input) => {
        const fallbackValue = toJsonLike(input.defaultValueJson);
        const rawValue = rawInputValues[input.key] !== undefined
            ? rawInputValues[input.key]
            : fallbackValue;
        if (input.isRequired &&
            (rawValue === undefined ||
                rawValue === null ||
                (typeof rawValue === "string" && rawValue.trim().length === 0))) {
            inputErrors.push(`Input "${input.label}" is required.`);
            return;
        }
        if (rawValue === undefined || rawValue === null) {
            normalizedInputs[input.key] = null;
            return;
        }
        try {
            switch (input.inputType) {
                case "BOOLEAN":
                    normalizedInputs[input.key] = normalizeBooleanValue(rawValue, input.label);
                    return;
                case "MATERIAL_SELECT": {
                    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
                        throw new AppError(`${input.label} must be a material id.`, 400);
                    }
                    normalizedInputs[input.key] = rawValue.trim();
                    return;
                }
                case "NUMBER":
                    normalizedInputs[input.key] = normalizeNumberValue(rawValue, input.label);
                    return;
                case "SELECT": {
                    if (!isPrimitiveJsonLike(rawValue)) {
                        throw new AppError(`${input.label} must be a primitive value.`, 400);
                    }
                    if (Array.isArray(input.optionsJson)) {
                        const options = input.optionsJson
                            .map((option) => {
                            if (isPrimitiveJsonLike(option)) {
                                return option;
                            }
                            if (isRecord(option) && isPrimitiveJsonLike(option.value)) {
                                return option.value;
                            }
                            return undefined;
                        })
                            .filter((option) => option !== undefined);
                        const selectedValue = String(rawValue);
                        if (!options.some((option) => String(option) === selectedValue)) {
                            throw new AppError(`${input.label} must match one of the configured options.`, 400);
                        }
                    }
                    normalizedInputs[input.key] = rawValue;
                    return;
                }
                case "TEXT":
                    normalizedInputs[input.key] =
                        typeof rawValue === "string"
                            ? rawValue.trim()
                            : String(rawValue);
                    return;
            }
        }
        catch (error) {
            inputErrors.push(error instanceof Error
                ? error.message
                : `Input "${input.label}" is invalid.`);
        }
    });
    if (inputErrors.length > 0) {
        throw new AppError(inputErrors.join(" "), 400);
    }
    return normalizedInputs;
};
const buildCurrentPriceMap = async (materialIds, db) => {
    if (materialIds.length === 0) {
        return new Map();
    }
    const currentPrices = await db.supplierMaterialPrice.findMany({
        orderBy: [
            {
                effectiveFrom: "desc",
            },
            {
                createdAt: "desc",
            },
            {
                price: "asc",
            },
        ],
        select: {
            currency: true,
            materialId: true,
            price: true,
        },
        where: {
            isCurrent: true,
            materialId: {
                in: materialIds,
            },
        },
    });
    const groupedPrices = new Map();
    currentPrices.forEach((price) => {
        const bucket = groupedPrices.get(price.materialId) ?? [];
        bucket.push(price);
        groupedPrices.set(price.materialId, bucket);
    });
    const currentPriceMap = new Map();
    groupedPrices.forEach((group, materialId) => {
        if (group.length === 0) {
            return;
        }
        const currencies = new Set(group.map((price) => price.currency));
        if (currencies.size > 1) {
            const latestPrice = group[0];
            if (!latestPrice) {
                return;
            }
            currentPriceMap.set(materialId, {
                currency: latestPrice.currency,
                price: decimalToNumber(latestPrice.price) ?? 0,
                selectionMode: "latest_mixed_currency",
            });
            return;
        }
        const firstPrice = group[0];
        if (!firstPrice) {
            return;
        }
        const lowestPrice = group.reduce((bestPrice, currentPrice) => {
            return currentPrice.price.lt(bestPrice.price) ? currentPrice : bestPrice;
        }, firstPrice);
        currentPriceMap.set(materialId, {
            currency: lowestPrice.currency,
            price: decimalToNumber(lowestPrice.price) ?? 0,
            selectionMode: "lowest_same_currency",
        });
    });
    return currentPriceMap;
};
const getQuantityOrWarn = (value, label, warnings, options) => {
    if (value <= 0) {
        warnings.push(`${label} resolved to ${roundTo(value, 2)} and was skipped.`);
        return null;
    }
    if (options?.allowDecimal) {
        return roundTo(value, 4);
    }
    const normalizedValue = Math.ceil(value);
    if (normalizedValue !== value) {
        warnings.push(`${label} was rounded up from ${value} to ${normalizedValue}.`);
    }
    return normalizedValue;
};
const getPositiveMeasurementOrWarn = (value, label, warnings) => {
    if (value <= 0) {
        warnings.push(`${label} resolved to ${roundTo(value, 2)} and was skipped.`);
        return null;
    }
    return roundTo(value, 2);
};
const getRuleWastePercent = (versionDefaultWastePercent, materialDefaultWastePercent, ruleWastePercent) => {
    return roundTo(ruleWastePercent ??
        materialDefaultWastePercent ??
        versionDefaultWastePercent ??
        0, 2);
};
const resolveRuleMaterialId = (fallbackMaterialId, materialInputKey, normalizedInputs) => {
    if (!materialInputKey) {
        return fallbackMaterialId;
    }
    const selectedValue = normalizedInputs[materialInputKey];
    if (typeof selectedValue !== "string" || selectedValue.trim().length === 0) {
        throw new AppError(`Input "${materialInputKey}" must provide a material id to simulate this rule.`, 400);
    }
    return selectedValue.trim();
};
const buildRuleSnapshots = (input) => {
    return {
        calculationRulesJson: {
            accessoryRules: input.accessoryRules,
            materialRules: input.materialRules,
        },
        inputSchemaJson: input.inputs,
        laborRulesJson: input.laborRules,
    };
};
const replaceVersionRules = async (versionId, input, db) => {
    const snapshots = buildRuleSnapshots(input);
    await db.productTemplateInput.deleteMany({
        where: {
            versionId,
        },
    });
    await db.productTemplateMaterialRule.deleteMany({
        where: {
            versionId,
        },
    });
    await db.productTemplateAccessoryRule.deleteMany({
        where: {
            versionId,
        },
    });
    await db.productTemplateLaborRule.deleteMany({
        where: {
            versionId,
        },
    });
    if (input.inputs.length > 0) {
        await db.productTemplateInput.createMany({
            data: input.inputs.map((item) => ({
                defaultValueJson: toNullablePrismaJsonValue(item.defaultValueJson),
                inputType: item.inputType,
                isRequired: item.isRequired,
                key: item.key,
                label: item.label,
                optionsJson: toNullablePrismaJsonValue(item.optionsJson),
                sortOrder: item.sortOrder,
                unit: item.unit,
                validationJson: toNullablePrismaJsonValue(item.validationJson),
                versionId,
            })),
        });
    }
    if (input.materialRules.length > 0) {
        await db.productTemplateMaterialRule.createMany({
            data: input.materialRules.map((item) => ({
                allowRemnantUse: item.allowRemnantUse,
                allowRotation: item.allowRotation,
                formulaJson: toPrismaJsonValue(item.formulaJson),
                isActive: item.isActive,
                label: item.label,
                materialId: item.materialId,
                ruleType: item.ruleType,
                sortOrder: item.sortOrder,
                versionId,
                wastePercent: item.wastePercent,
            })),
        });
    }
    if (input.accessoryRules.length > 0) {
        await db.productTemplateAccessoryRule.createMany({
            data: input.accessoryRules.map((item) => ({
                isActive: item.isActive,
                isOptional: item.isOptional,
                label: item.label,
                materialId: item.materialId,
                quantityFormulaJson: toPrismaJsonValue(item.quantityFormulaJson),
                sortOrder: item.sortOrder,
                versionId,
            })),
        });
    }
    if (input.laborRules.length > 0) {
        await db.productTemplateLaborRule.createMany({
            data: input.laborRules.map((item) => ({
                formulaJson: toPrismaJsonValue(item.formulaJson),
                isActive: item.isActive,
                label: item.label,
                laborType: item.laborType,
                sortOrder: item.sortOrder,
                unitCost: item.unitCost,
                versionId,
            })),
        });
    }
    await db.productTemplateVersion.update({
        data: {
            calculationRulesJson: toPrismaJsonValue(snapshots.calculationRulesJson),
            inputSchemaJson: toPrismaJsonValue(snapshots.inputSchemaJson),
            laborRulesJson: toPrismaJsonValue(snapshots.laborRulesJson),
        },
        where: {
            id: versionId,
        },
    });
};
const createVersionRecord = async (templateId, input, actorUserId, db) => {
    const template = await assertTemplateExists(templateId, db);
    const nextVersionNumber = (template.versions[0]?.versionNumber ?? 0) + 1;
    let rulesPayload = {
        accessoryRules: [],
        inputs: [],
        laborRules: [],
        materialRules: [],
    };
    if (input.duplicateFromVersionId) {
        const sourceVersion = await assertTemplateVersionExists(input.duplicateFromVersionId, db);
        if (sourceVersion.templateId !== templateId) {
            throw new AppError("Only versions from the same template can be duplicated.", 400);
        }
        rulesPayload = {
            accessoryRules: sourceVersion.accessoryRules.map((rule) => ({
                isActive: rule.isActive,
                isOptional: rule.isOptional,
                label: rule.label,
                materialId: rule.materialId,
                quantityFormulaJson: toJsonLike(rule.quantityFormulaJson) ?? {
                    type: "CONSTANT",
                    value: 0,
                },
                sortOrder: rule.sortOrder,
            })),
            inputs: sourceVersion.inputs.map((item) => ({
                defaultValueJson: toJsonLike(item.defaultValueJson) ?? null,
                inputType: item.inputType,
                isRequired: item.isRequired,
                key: item.key,
                label: item.label,
                optionsJson: toJsonLike(item.optionsJson) ?? null,
                sortOrder: item.sortOrder,
                unit: item.unit,
                validationJson: toJsonLike(item.validationJson) ?? null,
            })),
            laborRules: sourceVersion.laborRules.map((rule) => ({
                formulaJson: toJsonLike(rule.formulaJson) ?? {
                    type: "CONSTANT",
                    value: 0,
                },
                isActive: rule.isActive,
                label: rule.label,
                laborType: rule.laborType,
                sortOrder: rule.sortOrder,
                unitCost: decimalToNumber(rule.unitCost),
            })),
            materialRules: sourceVersion.materialRules.map((rule) => ({
                allowRemnantUse: rule.allowRemnantUse,
                allowRotation: rule.allowRotation,
                formulaJson: toJsonLike(rule.formulaJson) ?? {
                    type: "CONSTANT",
                    value: 0,
                },
                isActive: rule.isActive,
                label: rule.label,
                materialId: rule.materialId,
                ruleType: rule.ruleType,
                sortOrder: rule.sortOrder,
                wastePercent: decimalToNumber(rule.wastePercent),
            })),
        };
    }
    const version = await db.productTemplateVersion.create({
        data: {
            calculationRulesJson: toPrismaJsonValue({
                accessoryRules: rulesPayload.accessoryRules,
                materialRules: rulesPayload.materialRules,
            }),
            createdByUserId: actorUserId,
            defaultMarginPercent: input.defaultMarginPercent,
            defaultWastePercent: input.defaultWastePercent,
            description: input.description,
            inputSchemaJson: toPrismaJsonValue(rulesPayload.inputs),
            laborRulesJson: toPrismaJsonValue(rulesPayload.laborRules),
            name: input.name,
            notes: input.notes,
            status: input.status,
            templateId,
            versionNumber: nextVersionNumber,
        },
    });
    await replaceVersionRules(version.id, rulesPayload, db);
    return version.id;
};
const loadSimulationMaterials = async (version, normalizedInputs, db) => {
    const referencedMaterialIds = new Set();
    version.materialRules.forEach((rule) => {
        const formulaJson = toJsonLike(rule.formulaJson);
        if (!formulaJson) {
            return;
        }
        const config = parseMaterialRuleFormula(rule.ruleType, formulaJson);
        referencedMaterialIds.add(resolveRuleMaterialId(rule.materialId, config.materialInputKey, normalizedInputs));
    });
    version.accessoryRules.forEach((rule) => {
        referencedMaterialIds.add(rule.materialId);
    });
    if (referencedMaterialIds.size === 0) {
        return new Map();
    }
    const materials = await db.material.findMany({
        select: {
            code: true,
            consumptionUnit: true,
            defaultWastePercent: true,
            id: true,
            materialType: true,
            name: true,
            thicknessMm: true,
        },
        where: {
            deletedAt: null,
            id: {
                in: [...referencedMaterialIds],
            },
        },
    });
    return new Map(materials.map((material) => [material.id, material]));
};
const getProductTemplateVersionDetail = async (versionId, db) => {
    const version = await assertTemplateVersionExists(versionId, db);
    const validation = validateTemplateVersionEntity(version);
    return mapTemplateVersionDetailRecord(version, validation);
};
export const productTemplatesService = {
    async listProductTemplates(query) {
        const where = buildTemplateWhereClause(query);
        const [total, templates] = await prisma.$transaction([
            prisma.productTemplate.count({
                where,
            }),
            prisma.productTemplate.findMany({
                include: productTemplateListInclude,
                orderBy: buildTemplateOrderBy(query.sortBy, query.sortDirection),
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
        ]);
        return {
            data: templates.map((template) => mapTemplateListItem(template)),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
    async getProductTemplateById(id) {
        const template = await assertTemplateExists(id, prisma);
        return mapTemplateDetailRecord(template);
    },
    async createProductTemplate(input, actorUserId) {
        const existingTemplate = await prisma.productTemplate.findFirst({
            select: {
                id: true,
            },
            where: {
                code: input.code,
            },
        });
        if (existingTemplate) {
            throw new AppError("A product template with this code already exists.", 409);
        }
        const templateId = await prisma.$transaction(async (db) => {
            const template = await db.productTemplate.create({
                data: {
                    code: input.code,
                    createdByUserId: actorUserId,
                    description: input.description,
                    name: input.name,
                    productType: input.productType,
                    status: input.status,
                },
            });
            if (input.initialVersion) {
                const versionId = await createVersionRecord(template.id, {
                    ...input.initialVersion,
                    duplicateFromVersionId: null,
                    status: "DRAFT",
                }, actorUserId, db);
                await db.productTemplate.update({
                    data: {
                        currentVersionId: versionId,
                    },
                    where: {
                        id: template.id,
                    },
                });
            }
            return template.id;
        });
        return this.getProductTemplateById(templateId);
    },
    async updateProductTemplate(id, input) {
        const previous = await this.getProductTemplateById(id);
        const existingWithCode = await prisma.productTemplate.findFirst({
            select: {
                id: true,
            },
            where: {
                code: input.code,
                deletedAt: null,
                id: {
                    not: id,
                },
            },
        });
        if (existingWithCode) {
            throw new AppError("A product template with this code already exists.", 409);
        }
        await prisma.productTemplate.update({
            data: {
                code: input.code,
                description: input.description,
                name: input.name,
                productType: input.productType,
                status: input.status,
            },
            where: {
                id,
            },
        });
        return {
            current: await this.getProductTemplateById(id),
            previous,
        };
    },
    async deleteProductTemplate(id) {
        const previous = await this.getProductTemplateById(id);
        await prisma.productTemplate.update({
            data: {
                currentVersionId: null,
                deletedAt: new Date(),
                status: "ARCHIVED",
            },
            where: {
                id,
            },
        });
        return previous;
    },
    async listTemplateVersions(templateId) {
        const template = await assertTemplateExists(templateId, prisma);
        return template.versions
            .map((version) => mapVersionSummary(version))
            .filter((version) => Boolean(version));
    },
    async createTemplateVersion(templateId, input, actorUserId) {
        if (input.status === "ACTIVE") {
            throw new AppError("Create the version in DRAFT or ARCHIVED status, then activate it with the activation endpoint.", 400);
        }
        const versionId = await prisma.$transaction((db) => createVersionRecord(templateId, input, actorUserId, db));
        return getProductTemplateVersionDetail(versionId, prisma);
    },
    async getProductTemplateVersionById(versionId) {
        return getProductTemplateVersionDetail(versionId, prisma);
    },
    async updateProductTemplateVersion(versionId, input) {
        const previous = await this.getProductTemplateVersionById(versionId);
        if (input.status === "ACTIVE" && previous.status !== "ACTIVE") {
            throw new AppError("Use the activation endpoint to activate a template version.", 400);
        }
        if (previous.status === "ACTIVE" && input.status !== "ACTIVE") {
            throw new AppError("Active template versions stay active until another version is activated.", 400);
        }
        await prisma.productTemplateVersion.update({
            data: {
                defaultMarginPercent: input.defaultMarginPercent,
                defaultWastePercent: input.defaultWastePercent,
                description: input.description,
                name: input.name,
                notes: input.notes,
                status: input.status,
            },
            where: {
                id: versionId,
            },
        });
        return {
            current: await this.getProductTemplateVersionById(versionId),
            previous,
        };
    },
    async updateTemplateVersionRules(versionId, input) {
        const version = await assertTemplateVersionExists(versionId, prisma);
        const previous = {
            accessoryRules: version.accessoryRules.map(mapProductTemplateAccessoryRule),
            inputs: version.inputs.map(mapProductTemplateInput),
            laborRules: version.laborRules.map(mapProductTemplateLaborRule),
            materialRules: version.materialRules.map(mapProductTemplateMaterialRule),
        };
        await prisma.$transaction((db) => replaceVersionRules(versionId, input, db));
        return {
            current: await this.getProductTemplateVersionById(versionId),
            previous,
        };
    },
    async validateTemplateVersion(versionId) {
        const version = await assertTemplateVersionExists(versionId, prisma);
        return validateTemplateVersionEntity(version);
    },
    async activateTemplateVersion(versionId, _userId) {
        void _userId;
        const version = await assertTemplateVersionExists(versionId, prisma);
        const validation = validateTemplateVersionEntity(version);
        if (!validation.isValid) {
            throw new AppError(`The template version is invalid and cannot be activated. ${validation.errors.join(" ")}`, 400);
        }
        await prisma.$transaction(async (db) => {
            await db.productTemplateVersion.updateMany({
                data: {
                    status: "ARCHIVED",
                },
                where: {
                    id: {
                        not: versionId,
                    },
                    status: "ACTIVE",
                    templateId: version.templateId,
                },
            });
            await db.productTemplateVersion.update({
                data: {
                    activatedAt: new Date(),
                    status: "ACTIVE",
                },
                where: {
                    id: versionId,
                },
            });
            await db.productTemplate.update({
                data: {
                    currentVersionId: versionId,
                    status: "ACTIVE",
                },
                where: {
                    id: version.templateId,
                },
            });
        });
        return this.getProductTemplateVersionById(versionId);
    },
    async getTemplateCurrentVersion(templateId) {
        const template = await assertTemplateExists(templateId, prisma);
        if (!template.currentVersionId) {
            return null;
        }
        return this.getProductTemplateVersionById(template.currentVersionId);
    },
    async simulateProductTemplate(input) {
        const version = await assertTemplateVersionExists(input.templateVersionId, prisma);
        const validation = validateTemplateVersionEntity(version);
        if (!validation.isValid) {
            throw new AppError(`The template version is invalid and cannot be simulated. ${validation.errors.join(" ")}`, 400);
        }
        const normalizedInputs = normalizeSimulationInputs(version, input.inputValues);
        const simulationMaterials = await loadSimulationMaterials(version, normalizedInputs, prisma);
        const currentPriceMap = await buildCurrentPriceMap([...simulationMaterials.keys()], prisma);
        const materialBreakdown = [];
        const laborBreakdown = [];
        const linearCuts = [];
        const sheetCuts = [];
        const warnings = [...validation.warnings];
        const versionDefaultWastePercent = decimalToNumber(version.defaultWastePercent);
        version.materialRules
            .filter((rule) => rule.isActive)
            .forEach((rule) => {
            const formulaJson = toJsonLike(rule.formulaJson);
            if (formulaJson === null) {
                warnings.push(`Material rule "${rule.label}" was skipped because it has no formula.`);
                return;
            }
            const config = parseMaterialRuleFormula(rule.ruleType, formulaJson);
            const resolvedMaterialId = resolveRuleMaterialId(rule.materialId, config.materialInputKey, normalizedInputs);
            const material = simulationMaterials.get(resolvedMaterialId);
            if (!material) {
                throw new AppError(`Material rule "${rule.label}" points to a material that does not exist or is inactive.`, 400);
            }
            const priceSummary = currentPriceMap.get(material.id) ?? null;
            const wastePercent = getRuleWastePercent(versionDefaultWastePercent, decimalToNumber(material.defaultWastePercent), decimalToNumber(rule.wastePercent));
            if (priceSummary?.selectionMode === "latest_mixed_currency") {
                warnings.push(`Material "${material.name}" has mixed current supplier currencies. The latest price in ${priceSummary.currency} was used for preview.`);
            }
            switch (config.ruleType) {
                case "LINEAR_CUT": {
                    const rawLength = evaluateNumericFormula(config.requiredLengthMmFormula, normalizedInputs, {
                        path: `materialRule:${rule.label}.requiredLengthMmFormula`,
                    });
                    const rawQuantity = evaluateNumericFormula(config.quantityFormula, normalizedInputs, {
                        path: `materialRule:${rule.label}.quantityFormula`,
                    });
                    const requiredLengthMm = getPositiveMeasurementOrWarn(rawLength, `${rule.label} required length`, warnings);
                    const quantity = getQuantityOrWarn(rawQuantity, `${rule.label} quantity`, warnings);
                    if (requiredLengthMm === null || quantity === null) {
                        return;
                    }
                    const requiredQuantity = roundTo((requiredLengthMm * quantity) / 1000, 4);
                    const estimatedWasteQuantity = roundTo((requiredQuantity * wastePercent) / 100, 4);
                    materialBreakdown.push({
                        estimatedCost: roundTo(requiredQuantity * (priceSummary?.price ?? 0), 4),
                        estimatedUnitCost: priceSummary?.price ?? null,
                        estimatedWasteQuantity,
                        materialCode: material.code,
                        materialId: material.id,
                        materialName: material.name,
                        requiredQuantity,
                        ruleType: rule.ruleType,
                        unit: material.consumptionUnit,
                        wastePercent,
                    });
                    linearCuts.push({
                        allowRemnantUse: rule.allowRemnantUse,
                        cutPieces: Array.from({ length: quantity }, () => ({
                            lengthMm: requiredLengthMm,
                        })),
                        label: rule.label,
                        materialId: material.id,
                        quantity,
                        requiredLengthMm,
                        wastePercent,
                    });
                    return;
                }
                case "SHEET_CUT": {
                    const rawWidth = evaluateNumericFormula(config.requiredWidthMmFormula, normalizedInputs, {
                        path: `materialRule:${rule.label}.requiredWidthMmFormula`,
                    });
                    const rawHeight = evaluateNumericFormula(config.requiredHeightMmFormula, normalizedInputs, {
                        path: `materialRule:${rule.label}.requiredHeightMmFormula`,
                    });
                    const rawQuantity = evaluateNumericFormula(config.quantityFormula, normalizedInputs, {
                        path: `materialRule:${rule.label}.quantityFormula`,
                    });
                    const requiredWidthMm = getPositiveMeasurementOrWarn(rawWidth, `${rule.label} required width`, warnings);
                    const requiredHeightMm = getPositiveMeasurementOrWarn(rawHeight, `${rule.label} required height`, warnings);
                    const quantity = getQuantityOrWarn(rawQuantity, `${rule.label} quantity`, warnings);
                    if (requiredWidthMm === null ||
                        requiredHeightMm === null ||
                        quantity === null) {
                        return;
                    }
                    const thicknessMm = config.thicknessMmFormula
                        ? roundTo(evaluateNumericFormula(config.thicknessMmFormula, normalizedInputs, {
                            path: `materialRule:${rule.label}.thicknessMmFormula`,
                        }), 2)
                        : decimalToNumber(material.thicknessMm);
                    const requiredQuantity = roundTo(((requiredWidthMm * requiredHeightMm) / 1_000_000) * quantity, 4);
                    const estimatedWasteQuantity = roundTo((requiredQuantity * wastePercent) / 100, 4);
                    materialBreakdown.push({
                        estimatedCost: roundTo(requiredQuantity * (priceSummary?.price ?? 0), 4),
                        estimatedUnitCost: priceSummary?.price ?? null,
                        estimatedWasteQuantity,
                        materialCode: material.code,
                        materialId: material.id,
                        materialName: material.name,
                        requiredQuantity,
                        ruleType: rule.ruleType,
                        unit: material.consumptionUnit,
                        wastePercent,
                    });
                    sheetCuts.push({
                        allowRotation: rule.allowRotation,
                        label: rule.label,
                        materialId: material.id,
                        quantity,
                        requiredHeightMm,
                        requiredWidthMm,
                        sheetPieces: Array.from({ length: quantity }, () => ({
                            heightMm: requiredHeightMm,
                            widthMm: requiredWidthMm,
                        })),
                        thicknessMm,
                        wastePercent,
                    });
                    return;
                }
                case "UNIT_QUANTITY":
                case "PACKAGE_QUANTITY":
                case "SERVICE_COST": {
                    const rawQuantity = evaluateNumericFormula(config.quantityFormula, normalizedInputs, {
                        path: `materialRule:${rule.label}.quantityFormula`,
                    });
                    const quantity = getQuantityOrWarn(rawQuantity, `${rule.label} quantity`, warnings, {
                        allowDecimal: config.ruleType === "SERVICE_COST",
                    });
                    if (quantity === null) {
                        return;
                    }
                    const unitCost = config.ruleType === "SERVICE_COST" && config.unitCostFormula
                        ? roundTo(evaluateNumericFormula(config.unitCostFormula, normalizedInputs, {
                            path: `materialRule:${rule.label}.unitCostFormula`,
                        }), 4)
                        : priceSummary?.price ?? null;
                    if (unitCost === null) {
                        warnings.push(`No current supplier price was found for material "${material.name}". Its estimated cost was treated as 0.`);
                    }
                    const estimatedWasteQuantity = roundTo((quantity * wastePercent) / 100, 4);
                    materialBreakdown.push({
                        estimatedCost: roundTo(quantity * (unitCost ?? 0), 4),
                        estimatedUnitCost: unitCost,
                        estimatedWasteQuantity,
                        materialCode: material.code,
                        materialId: material.id,
                        materialName: material.name,
                        requiredQuantity: roundTo(quantity, 4),
                        ruleType: rule.ruleType,
                        unit: material.consumptionUnit,
                        wastePercent,
                    });
                    return;
                }
            }
        });
        version.accessoryRules
            .filter((rule) => rule.isActive)
            .forEach((rule) => {
            const material = simulationMaterials.get(rule.materialId);
            if (!material) {
                throw new AppError(`Accessory rule "${rule.label}" points to a material that does not exist or is inactive.`, 400);
            }
            const rawQuantity = evaluateNumericFormula(toJsonLike(rule.quantityFormulaJson), normalizedInputs, {
                path: `accessoryRule:${rule.label}.quantityFormulaJson`,
            });
            const quantity = getQuantityOrWarn(rawQuantity, `${rule.label} quantity`, warnings);
            if (quantity === null) {
                return;
            }
            const priceSummary = currentPriceMap.get(material.id) ?? null;
            const ruleType = material.materialType === "PACKAGE"
                ? "PACKAGE_QUANTITY"
                : "UNIT_QUANTITY";
            const wastePercent = getRuleWastePercent(versionDefaultWastePercent, decimalToNumber(material.defaultWastePercent), null);
            const estimatedWasteQuantity = roundTo((quantity * wastePercent) / 100, 4);
            if (!priceSummary) {
                warnings.push(`No current supplier price was found for accessory "${material.name}". Its estimated cost was treated as 0.`);
            }
            materialBreakdown.push({
                estimatedCost: roundTo(quantity * (priceSummary?.price ?? 0), 4),
                estimatedUnitCost: priceSummary?.price ?? null,
                estimatedWasteQuantity,
                materialCode: material.code,
                materialId: material.id,
                materialName: material.name,
                requiredQuantity: quantity,
                ruleType,
                unit: material.consumptionUnit,
                wastePercent,
            });
        });
        version.laborRules
            .filter((rule) => rule.isActive)
            .forEach((rule) => {
            const formulaJson = toJsonLike(rule.formulaJson);
            if (!formulaJson) {
                warnings.push(`Labor rule "${rule.label}" was skipped because it has no formula.`);
                return;
            }
            const config = parseLaborRuleFormula(formulaJson);
            const rawQuantity = evaluateNumericFormula(config.quantityFormula, normalizedInputs, {
                path: `laborRule:${rule.label}.quantityFormula`,
            });
            const quantity = getQuantityOrWarn(rawQuantity, `${rule.label} quantity`, warnings, {
                allowDecimal: true,
            });
            if (quantity === null) {
                return;
            }
            const unitCost = roundTo(decimalToNumber(rule.unitCost) ?? 0, 4);
            laborBreakdown.push({
                label: rule.label,
                laborType: rule.laborType,
                quantity,
                totalCost: roundTo(quantity * unitCost, 4),
                unitCost,
            });
        });
        const subtotalCost = roundTo(materialBreakdown.reduce((sum, item) => sum + item.estimatedCost, 0), 4);
        const wasteCost = roundTo(materialBreakdown.reduce((sum, item) => {
            const unitCost = item.estimatedUnitCost ?? 0;
            return sum + item.estimatedWasteQuantity * unitCost;
        }, 0), 4);
        const laborCost = roundTo(laborBreakdown.reduce((sum, item) => sum + item.totalCost, 0), 4);
        const marginPercent = roundTo(decimalToNumber(version.defaultMarginPercent) ?? 0, 2);
        const totalCost = roundTo(subtotalCost + wasteCost + laborCost, 4);
        const simulationResult = {
            cuts: {
                linear: linearCuts,
                sheets: sheetCuts,
            },
            inputs: normalizedInputs,
            labor: laborBreakdown,
            laborCost,
            marginPercent,
            materials: materialBreakdown,
            subtotalCost,
            suggestedSalePrice: roundTo(totalCost * (1 + marginPercent / 100), 4),
            totalCost,
            warnings,
            wasteCost,
        };
        const simulation = await prisma.productTemplateSimulation.create({
            data: {
                inputValuesJson: toPrismaJsonValue(normalizedInputs),
                resultJson: toPrismaJsonValue(simulationResult),
                simulatedByUserId: input.userId,
                versionId: version.id,
            },
            include: productTemplateSimulationInclude,
        });
        return mapSimulationRecord(simulation);
    },
    async listTemplateSimulations(versionId, query) {
        await assertTemplateVersionExists(versionId, prisma);
        const where = {
            versionId,
        };
        const [total, simulations] = await prisma.$transaction([
            prisma.productTemplateSimulation.count({
                where,
            }),
            prisma.productTemplateSimulation.findMany({
                include: productTemplateSimulationInclude,
                orderBy: {
                    createdAt: "desc",
                },
                skip: (query.page - 1) * query.perPage,
                take: query.perPage,
                where,
            }),
        ]);
        return {
            data: simulations.map((simulation) => mapSimulationRecord(simulation)),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
            },
        };
    },
};
//# sourceMappingURL=product-templates.service.js.map