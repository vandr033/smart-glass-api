import { Prisma as PrismaNamespace, SupplierScoringScope, } from "../../../generated/prisma/client.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
const supplierScoringConfigInclude = {
    category: {
        select: {
            id: true,
            name: true,
        },
    },
    weights: {
        include: {
            criterion: true,
        },
        orderBy: {
            createdAt: "asc",
        },
    },
};
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
const roundToTwoDecimals = (value) => {
    return Number(value.toFixed(2));
};
const clampScore = (value) => {
    return Math.max(0, Math.min(100, value));
};
const sortWeights = (left, right) => {
    if (left.criterion.sortOrder !== right.criterion.sortOrder) {
        return left.criterion.sortOrder - right.criterion.sortOrder;
    }
    return left.criterion.label.localeCompare(right.criterion.label);
};
const mapCriterion = (record) => {
    return {
        createdAt: record.createdAt.toISOString(),
        description: record.description,
        id: record.id,
        isEnabled: record.isEnabled,
        key: record.key,
        label: record.label,
        sortOrder: record.sortOrder,
        updatedAt: record.updatedAt.toISOString(),
    };
};
const mapConfigWeight = (record) => {
    return {
        criterionId: record.criterionId,
        criterionKey: record.criterion.key,
        criterionLabel: record.criterion.label,
        isCriterionEnabled: record.criterion.isEnabled,
        weight: roundToTwoDecimals(Number(record.weight)),
    };
};
const mapConfig = (record) => {
    const weights = [...record.weights].sort(sortWeights).map(mapConfigWeight);
    return {
        category: record.category
            ? {
                id: record.category.id,
                name: record.category.name,
            }
            : null,
        createdAt: record.createdAt.toISOString(),
        id: record.id,
        isActive: record.isActive,
        isDefault: record.isDefault,
        name: record.name,
        scope: record.scope,
        totalWeight: roundToTwoDecimals(weights.reduce((sum, weight) => sum + weight.weight, 0)),
        updatedAt: record.updatedAt.toISOString(),
        weights,
    };
};
const translateUniqueConstraintError = (error, labelsByField) => {
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
        error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
            ? String(error.meta?.target[0] ?? "")
            : "";
        const label = labelsByField[target] ?? "record";
        throw new AppError(`A ${label} with the same value already exists.`, 409);
    }
    throw error;
};
const buildConfigWhereClause = (query) => {
    return {
        ...(query.isActive !== undefined
            ? {
                isActive: query.isActive,
            }
            : {}),
        ...(query.scope
            ? {
                scope: query.scope,
            }
            : {}),
    };
};
const findConfigByIdOrThrow = async (id, db = prisma) => {
    const config = await db.supplierScoringConfig.findUnique({
        include: supplierScoringConfigInclude,
        where: {
            id,
        },
    });
    if (!config) {
        throw new AppError("Supplier scoring config not found.", 404);
    }
    return config;
};
const ensureCategoryExists = async (categoryId, db) => {
    const category = await db.supplierCategory.findUnique({
        select: {
            id: true,
        },
        where: {
            id: categoryId,
        },
    });
    if (!category) {
        throw new AppError("Supplier category not found.", 404);
    }
};
const ensureCriteriaExist = async (criterionIds, db) => {
    const total = await db.supplierScoringCriterion.count({
        where: {
            id: {
                in: criterionIds,
            },
        },
    });
    if (total !== criterionIds.length) {
        throw new AppError("One or more scoring criteria do not exist.", 400);
    }
};
const ensureCategoryConfigConstraints = async (configId, input, db) => {
    if (input.scope !== "CATEGORY" || !input.isActive || !input.categoryId) {
        return;
    }
    const existingConfig = await db.supplierScoringConfig.findFirst({
        select: {
            id: true,
        },
        where: {
            categoryId: input.categoryId,
            isActive: true,
            scope: SupplierScoringScope.CATEGORY,
            ...(configId
                ? {
                    id: {
                        not: configId,
                    },
                }
                : {}),
        },
    });
    if (existingConfig) {
        throw new AppError("Only one active CATEGORY scoring config may exist per category.", 409);
    }
};
const normalizeManualScore = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    return clampScore(value);
};
const normalizeHigherIsBetter = (value, values) => {
    if (value === null || values.length === 0) {
        return 0;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) {
        return 100;
    }
    return clampScore(((value - min) / (max - min)) * 100);
};
const normalizeLowerIsBetter = (value, values) => {
    if (value === null || values.length === 0) {
        return 0;
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) {
        return 100;
    }
    return clampScore(((max - value) / (max - min)) * 100);
};
const getCriterionScore = (criterionKey, supplier, manualScores, stats) => {
    const manualScore = normalizeManualScore(manualScores?.[criterionKey]);
    if (manualScore !== null) {
        return {
            normalizedScore: manualScore,
            source: "manual",
        };
    }
    switch (criterionKey) {
        case "price":
            return {
                normalizedScore: 0,
                source: "derived",
            };
        case "availability":
            return {
                normalizedScore: 0,
                source: "derived",
            };
        case "delivery_time":
            return {
                normalizedScore: roundToTwoDecimals(normalizeLowerIsBetter(supplier.defaultLeadTimeDays, stats.leadTimes)),
                source: "derived",
            };
        case "reliability":
            return {
                normalizedScore: roundToTwoDecimals(clampScore(decimalToNumber(supplier.reliabilityScore) ?? 0)),
                source: "direct",
            };
        case "credit": {
            const creditLimit = decimalToNumber(supplier.creditLimit);
            const creditLimitComponent = normalizeHigherIsBetter(creditLimit, stats.creditLimits);
            const creditAvailabilityComponent = supplier.creditAvailable ? 60 : 0;
            const finalCreditScore = creditAvailabilityComponent + creditLimitComponent * 0.4;
            return {
                normalizedScore: roundToTwoDecimals(clampScore(finalCreditScore)),
                source: "derived",
            };
        }
        case "preference":
            return {
                normalizedScore: roundToTwoDecimals(clampScore(decimalToNumber(supplier.preferenceScore) ?? 0)),
                source: "direct",
            };
    }
};
const buildRankedSupplierScores = (config, suppliers, manualScores) => {
    const leadTimes = suppliers
        .map((supplier) => supplier.defaultLeadTimeDays)
        .filter((value) => value !== null);
    const creditLimits = suppliers
        .map((supplier) => decimalToNumber(supplier.creditLimit))
        .filter((value) => value !== null && value > 0);
    return suppliers
        .map((supplier) => {
        const breakdown = config.weights.map((weight) => {
            const score = getCriterionScore(weight.criterionKey, supplier, manualScores[supplier.id], {
                creditLimits,
                leadTimes,
            });
            const contribution = roundToTwoDecimals((score.normalizedScore * weight.weight) / 100);
            return {
                contribution,
                criterionId: weight.criterionId,
                criterionKey: weight.criterionKey,
                criterionLabel: weight.criterionLabel,
                normalizedScore: score.normalizedScore,
                source: score.source,
                weight: weight.weight,
            };
        });
        return {
            breakdown,
            finalScore: roundToTwoDecimals(breakdown.reduce((sum, item) => sum + item.contribution, 0)),
            supplierId: supplier.id,
            supplierName: supplier.legalName,
        };
    })
        .sort((left, right) => {
        if (right.finalScore !== left.finalScore) {
            return right.finalScore - left.finalScore;
        }
        return left.supplierName.localeCompare(right.supplierName);
    });
};
export const supplierScoringService = {
    async listCriteria() {
        const criteria = await prisma.supplierScoringCriterion.findMany({
            orderBy: [
                {
                    sortOrder: "asc",
                },
                {
                    label: "asc",
                },
            ],
        });
        return criteria.map(mapCriterion);
    },
    async listConfigs(query) {
        const configs = await prisma.supplierScoringConfig.findMany({
            include: supplierScoringConfigInclude,
            orderBy: [
                {
                    scope: "asc",
                },
                {
                    isDefault: "desc",
                },
                {
                    isActive: "desc",
                },
                {
                    name: "asc",
                },
            ],
            where: buildConfigWhereClause(query),
        });
        return configs.map(mapConfig);
    },
    async getConfigById(id) {
        const config = await findConfigByIdOrThrow(id);
        return mapConfig(config);
    },
    async createConfig(input) {
        try {
            return await prisma.$transaction(async (db) => {
                if (input.categoryId) {
                    await ensureCategoryExists(input.categoryId, db);
                }
                await ensureCriteriaExist(input.weights.map((weight) => weight.criterionId), db);
                await ensureCategoryConfigConstraints(null, input, db);
                if (input.scope === "GLOBAL" && input.isDefault) {
                    await db.supplierScoringConfig.updateMany({
                        data: {
                            isDefault: false,
                        },
                        where: {
                            scope: SupplierScoringScope.GLOBAL,
                        },
                    });
                }
                const config = await db.supplierScoringConfig.create({
                    data: {
                        categoryId: input.scope === "CATEGORY" ? input.categoryId : null,
                        isActive: input.isActive,
                        isDefault: input.scope === "GLOBAL" ? input.isDefault : false,
                        name: input.name,
                        scope: input.scope,
                    },
                });
                await db.supplierScoringConfigWeight.createMany({
                    data: input.weights.map((weight) => ({
                        configId: config.id,
                        criterionId: weight.criterionId,
                        weight: weight.weight,
                    })),
                });
                return mapConfig(await findConfigByIdOrThrow(config.id, db));
            });
        }
        catch (error) {
            translateUniqueConstraintError(error, {
                name: "supplier scoring config name",
            });
        }
        throw new Error("Unexpected supplier scoring config creation state.");
    },
    async updateConfig(id, input) {
        return prisma.$transaction(async (db) => {
            const existingConfig = await findConfigByIdOrThrow(id, db);
            if (input.categoryId) {
                await ensureCategoryExists(input.categoryId, db);
            }
            await ensureCriteriaExist(input.weights.map((weight) => weight.criterionId), db);
            await ensureCategoryConfigConstraints(existingConfig.id, input, db);
            if (input.scope === "GLOBAL" && input.isDefault) {
                await db.supplierScoringConfig.updateMany({
                    data: {
                        isDefault: false,
                    },
                    where: {
                        id: {
                            not: existingConfig.id,
                        },
                        scope: SupplierScoringScope.GLOBAL,
                    },
                });
            }
            await db.supplierScoringConfig.update({
                data: {
                    categoryId: input.scope === "CATEGORY" ? input.categoryId : null,
                    isActive: input.isActive,
                    isDefault: input.scope === "GLOBAL" ? input.isDefault : false,
                    name: input.name,
                    scope: input.scope,
                },
                where: {
                    id: existingConfig.id,
                },
            });
            await db.supplierScoringConfigWeight.deleteMany({
                where: {
                    configId: existingConfig.id,
                },
            });
            await db.supplierScoringConfigWeight.createMany({
                data: input.weights.map((weight) => ({
                    configId: existingConfig.id,
                    criterionId: weight.criterionId,
                    weight: weight.weight,
                })),
            });
            return {
                current: mapConfig(await findConfigByIdOrThrow(existingConfig.id, db)),
                previous: mapConfig(existingConfig),
            };
        });
    },
    async deleteConfig(id) {
        const existingConfig = await findConfigByIdOrThrow(id);
        await prisma.supplierScoringConfig.delete({
            where: {
                id: existingConfig.id,
            },
        });
        return mapConfig(existingConfig);
    },
    async resolveApplicableConfig(categoryId, db = prisma) {
        if (categoryId) {
            const categoryConfig = await db.supplierScoringConfig.findFirst({
                include: supplierScoringConfigInclude,
                orderBy: [
                    {
                        updatedAt: "desc",
                    },
                ],
                where: {
                    categoryId,
                    isActive: true,
                    scope: SupplierScoringScope.CATEGORY,
                },
            });
            if (categoryConfig) {
                return mapConfig(categoryConfig);
            }
        }
        const globalConfig = await db.supplierScoringConfig.findFirst({
            include: supplierScoringConfigInclude,
            orderBy: [
                {
                    isDefault: "desc",
                },
                {
                    updatedAt: "desc",
                },
            ],
            where: {
                isActive: true,
                scope: SupplierScoringScope.GLOBAL,
            },
        });
        if (!globalConfig) {
            throw new AppError("No active GLOBAL supplier scoring config is available.", 409);
        }
        return mapConfig(globalConfig);
    },
    async scoreSuppliers(input) {
        const selectedConfig = input.configOverride ??
            (await this.resolveApplicableConfig(input.categoryId ?? null));
        return {
            rankedSuppliers: buildRankedSupplierScores(selectedConfig, input.suppliers, input.manualScores ?? {}),
            selectedConfig,
            weights: selectedConfig.weights,
        };
    },
    async simulateScores(input) {
        if (input.categoryId) {
            await ensureCategoryExists(input.categoryId, prisma);
        }
        const suppliers = await prisma.supplier.findMany({
            orderBy: {
                legalName: "asc",
            },
            select: {
                creditAvailable: true,
                creditLimit: true,
                defaultLeadTimeDays: true,
                id: true,
                legalName: true,
                preferenceScore: true,
                reliabilityScore: true,
            },
            where: {
                deletedAt: null,
                id: {
                    in: input.supplierIds,
                },
            },
        });
        if (suppliers.length !== input.supplierIds.length) {
            throw new AppError("One or more suppliers could not be found.", 404);
        }
        return this.scoreSuppliers({
            categoryId: input.categoryId,
            manualScores: input.manualScores,
            suppliers,
        });
    },
};
//# sourceMappingURL=supplier-scoring.service.js.map