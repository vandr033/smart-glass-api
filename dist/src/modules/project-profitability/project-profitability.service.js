import { getClientDisplayName } from "../clients/clients.service.js";
import { convertMaterialUnit, } from "../materials/materials.behavior.js";
import { buildDateRangeFilter } from "../../services/logging-utils.js";
import { AppError } from "../../utils/app-error.js";
import { prisma } from "../../utils/prisma.js";
const VALID_MATERIAL_UNITS = new Set([
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
]);
const userSummarySelect = {
    email: true,
    id: true,
    name: true,
};
const clientSummarySelect = {
    clientType: true,
    commercialName: true,
    firstName: true,
    id: true,
    lastName: true,
    legalName: true,
};
const materialCostSelect = {
    code: true,
    defaultWastePercent: true,
    id: true,
    materialType: true,
    name: true,
    purchaseUnit: true,
    stockUnit: true,
    unitConversionJson: true,
};
const projectProfitabilityInclude = {
    client: {
        select: clientSummarySelect,
    },
    installationOrders: {
        include: {
            issues: {
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
                select: {
                    createdAt: true,
                    description: true,
                    id: true,
                    severity: true,
                    status: true,
                },
            },
            tasks: {
                orderBy: [
                    {
                        sortOrder: "asc",
                    },
                ],
                select: {
                    completedAt: true,
                    estimatedMinutes: true,
                    id: true,
                    status: true,
                    title: true,
                },
            },
        },
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
        where: {
            deletedAt: null,
        },
    },
    postventaCases: {
        include: {
            costs: {
                orderBy: [
                    {
                        costDate: "desc",
                    },
                ],
                select: {
                    amount: true,
                    category: true,
                    costDate: true,
                    description: true,
                    id: true,
                    origin: true,
                    referenceId: true,
                },
            },
        },
        orderBy: [
            {
                reportedAt: "desc",
            },
        ],
    },
    measurements: {
        select: {
            heightMm: true,
            id: true,
            quantity: true,
            widthMm: true,
        },
    },
    productionJobs: {
        include: {
            materialConsumptions: {
                include: {
                    material: {
                        select: materialCostSelect,
                    },
                },
                orderBy: [
                    {
                        consumedAt: "desc",
                    },
                ],
            },
            qualityChecks: {
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
                select: {
                    createdAt: true,
                    id: true,
                    status: true,
                },
            },
            tasks: {
                orderBy: [
                    {
                        sortOrder: "asc",
                    },
                ],
                select: {
                    completedAt: true,
                    id: true,
                    status: true,
                    title: true,
                },
            },
            wasteReports: {
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
                select: {
                    actualWastePercent: true,
                    createdAt: true,
                    id: true,
                    theoreticalWastePercent: true,
                    varianceAreaM2: true,
                    variancePercent: true,
                },
            },
        },
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
        where: {
            deletedAt: null,
        },
    },
    profileOptimizationRuns: {
        include: {
            cuttingPlans: {
                include: {
                    bars: {
                        include: {
                            remnantOutputs: {
                                orderBy: [
                                    {
                                        createdAt: "desc",
                                    },
                                ],
                                select: {
                                    createdAt: true,
                                    id: true,
                                    materialId: true,
                                    remainingLengthMm: true,
                                    remnantPieceId: true,
                                    status: true,
                                },
                            },
                        },
                        orderBy: [
                            {
                                sortOrder: "asc",
                            },
                        ],
                    },
                    material: {
                        select: materialCostSelect,
                    },
                },
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
            },
        },
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
    quotations: {
        include: {
            items: {
                include: {
                    materials: {
                        include: {
                            material: {
                                select: materialCostSelect,
                            },
                        },
                        orderBy: [
                            {
                                createdAt: "asc",
                            },
                        ],
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
                where: {
                    quotationVersionId: null,
                },
            },
        },
        orderBy: [
            {
                updatedAt: "desc",
            },
        ],
        where: {
            deletedAt: null,
        },
    },
    responsibleUser: {
        select: userSummarySelect,
    },
    salesUser: {
        select: userSummarySelect,
    },
    cuttingOptimizationRuns: {
        include: {
            cuttingPlans: {
                include: {
                    material: {
                        select: materialCostSelect,
                    },
                    sheets: {
                        include: {
                            remnantOutputs: {
                                orderBy: [
                                    {
                                        createdAt: "desc",
                                    },
                                ],
                                select: {
                                    areaM2: true,
                                    createdAt: true,
                                    id: true,
                                    materialId: true,
                                    remnantPieceId: true,
                                    status: true,
                                },
                            },
                        },
                        orderBy: [
                            {
                                sortOrder: "asc",
                            },
                        ],
                    },
                },
                orderBy: [
                    {
                        createdAt: "desc",
                    },
                ],
            },
        },
        orderBy: [
            {
                createdAt: "desc",
            },
        ],
    },
};
const purchaseOrderInclude = {
    items: {
        include: {
            material: {
                select: materialCostSelect,
            },
        },
        orderBy: [
            {
                createdAt: "asc",
            },
        ],
    },
    purchaseRequest: {
        select: {
            code: true,
            id: true,
            sourceId: true,
            sourceType: true,
        },
    },
    receipts: {
        include: {
            items: {
                include: {
                    material: {
                        select: materialCostSelect,
                    },
                },
                orderBy: [
                    {
                        createdAt: "asc",
                    },
                ],
            },
        },
        orderBy: [
            {
                receivedAt: "desc",
            },
        ],
    },
    supplier: {
        select: {
            commercialName: true,
            id: true,
            legalName: true,
        },
    },
};
const decimalToNumber = (value) => {
    if (value === null) {
        return null;
    }
    return Number(value);
};
const roundTo = (value, decimals = 4) => {
    return Number(value.toFixed(decimals));
};
const safeDivide = (dividend, divisor) => {
    if (!Number.isFinite(dividend) || !Number.isFinite(divisor) || divisor === 0) {
        return null;
    }
    return dividend / divisor;
};
const normalizeText = (value) => {
    return value?.trim().toLowerCase() ?? "";
};
const getJsonRecord = (value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") {
        return null;
    }
    return value;
};
const getMaterialBehaviorInput = (material) => ({
    code: material.code,
    materialType: material.materialType,
    name: material.name,
    unitConversionJson: material.unitConversionJson,
});
const convertUnitCost = (candidate, targetUnit) => {
    if (candidate.unit === targetUnit) {
        return candidate.unitCost;
    }
    if (!VALID_MATERIAL_UNITS.has(candidate.unit) ||
        !VALID_MATERIAL_UNITS.has(targetUnit)) {
        return null;
    }
    try {
        const sourceQuantityForTargetUnit = convertMaterialUnit({
            fromUnit: targetUnit,
            material: getMaterialBehaviorInput(candidate.material),
            quantity: 1,
            toUnit: candidate.unit,
        });
        return roundTo(candidate.unitCost * sourceQuantityForTargetUnit, 6);
    }
    catch {
        return null;
    }
};
const buildClientSummary = (client) => ({
    clientType: client.clientType,
    displayName: getClientDisplayName(client),
    id: client.id,
});
const buildUserSummary = (user) => user
    ? {
        email: user.email,
        id: user.id,
        name: user.name,
    }
    : null;
const buildProjectSummary = (project) => ({
    client: buildClientSummary(project.client),
    code: project.code,
    id: project.id,
    projectType: project.projectType,
    responsibleUser: buildUserSummary(project.responsibleUser),
    salesUser: buildUserSummary(project.salesUser),
    status: project.status,
    title: project.title,
});
const buildProjectWhereClause = (query) => {
    const createdAt = buildDateRangeFilter(query.dateFrom, query.dateTo);
    return {
        deletedAt: null,
        ...(createdAt
            ? {
                createdAt,
            }
            : {}),
        ...(query.clientId
            ? {
                clientId: query.clientId,
            }
            : {}),
        ...(query.priority
            ? {
                priority: query.priority,
            }
            : {}),
        ...(query.projectType
            ? {
                projectType: query.projectType,
            }
            : {}),
        ...(query.salesUserId
            ? {
                salesUserId: query.salesUserId,
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
                        title: {
                            contains: query.search,
                        },
                    },
                    {
                        siteAddress: {
                            contains: query.search,
                        },
                    },
                    {
                        client: {
                            commercialName: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        client: {
                            legalName: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        client: {
                            firstName: {
                                contains: query.search,
                            },
                        },
                    },
                    {
                        client: {
                            lastName: {
                                contains: query.search,
                            },
                        },
                    },
                ],
            }
            : {}),
    };
};
const chooseBudgetQuotation = (project) => {
    const preferred = project.quotations.find((quotation) => ["ACCEPTED", "APPROVED", "SENT"].includes(quotation.status));
    return preferred ?? project.quotations[0] ?? null;
};
const chooseActualQuotation = (project) => {
    const preferred = project.quotations.find((quotation) => ["ACCEPTED", "APPROVED", "SENT", "PENDING_APPROVAL"].includes(quotation.status));
    return preferred ?? project.quotations[0] ?? null;
};
const getLaborType = (metadataJson) => {
    const record = getJsonRecord(metadataJson);
    const laborType = record?.laborType;
    return typeof laborType === "string" ? laborType : null;
};
const classifyServiceCategory = (value) => {
    if (value.laborType === "INSTALLATION") {
        return "INSTALACION";
    }
    if (value.laborType === "TRANSPORT") {
        return "TRANSPORTE";
    }
    if (value.laborType === "FABRICATION") {
        return "MANO_DE_OBRA";
    }
    const haystack = [
        normalizeText(value.materialName),
        normalizeText(value.description),
    ].join(" ");
    if (haystack.includes("garantia") ||
        haystack.includes("postventa") ||
        haystack.includes("reposicion")) {
        return "GARANTIAS";
    }
    if (haystack.includes("flete") ||
        haystack.includes("transporte") ||
        haystack.includes("envio")) {
        return "TRANSPORTE";
    }
    if (haystack.includes("instal") ||
        haystack.includes("montaje") ||
        haystack.includes("obra")) {
        return "INSTALACION";
    }
    if (haystack.includes("mano de obra") ||
        haystack.includes("fabricacion") ||
        haystack.includes("ensamble") ||
        haystack.includes("armado")) {
        return "MANO_DE_OBRA";
    }
    return "OTROS";
};
const classifyQuotationMaterialCategory = (line, itemDescription) => {
    if (line.material?.materialType && line.material.materialType !== "SERVICE") {
        return "MATERIALES";
    }
    return classifyServiceCategory({
        description: itemDescription,
        laborType: getLaborType(line.metadataJson),
        materialName: line.materialName,
    });
};
const classifyPurchaseItemCategory = (item) => {
    if (item.material.materialType !== "SERVICE") {
        return "MATERIALES";
    }
    return classifyServiceCategory({
        description: item.description,
        materialName: item.material.name,
    });
};
const classifyPostventaCostCategory = (caseType, category) => {
    if (category === "GARANTIA") {
        return "GARANTIAS";
    }
    if (category === "RECLAMO") {
        return "RECLAMOS";
    }
    if (category === "REPOSICION") {
        return "REPOSICIONES";
    }
    if (category === "MATERIAL") {
        return caseType === "REPOSICION" ? "REPOSICIONES" : "MATERIALES";
    }
    if (category === "MANO_DE_OBRA") {
        return "MANO_DE_OBRA";
    }
    if (category === "TRANSPORTE") {
        return "TRANSPORTE";
    }
    if (category === "INSTALACION" ||
        category === "VISITA" ||
        category === "DIAGNOSTICO") {
        return "INSTALACION";
    }
    if (caseType === "GARANTIA") {
        return "GARANTIAS";
    }
    if (caseType === "RECLAMO") {
        return "RECLAMOS";
    }
    if (caseType === "REPOSICION") {
        return "REPOSICIONES";
    }
    return "OTROS";
};
const mapPostventaCostOrigin = (origin) => {
    if (origin === "INVENTARIO") {
        return "CONSUMO_INVENTARIO";
    }
    if (origin === "INSTALACION") {
        return "INSTALACION";
    }
    if (origin === "PRODUCCION") {
        return "PRODUCCION";
    }
    if (origin === "GARANTIA") {
        return "GARANTIA";
    }
    if (origin === "COTIZACION") {
        return "COTIZACION";
    }
    return "POSTVENTA";
};
const POSTVENTA_EVENT_TYPE_LABELS = {
    AJUSTE: "ajuste",
    FUGA: "fuga",
    GARANTIA: "garantia",
    MALA_INSTALACION: "mala instalacion",
    OTRO: "caso general",
    PRODUCTO_INCOMPLETO: "producto incompleto",
    RECLAMO: "reclamo",
    REPOSICION: "reposicion",
    ROTURA: "rotura",
};
const POSTVENTA_EVENT_STATUS_LABELS = {
    CERRADO: "cerrado",
    EN_ATENCION: "en atencion",
    EN_REVISION: "en revision",
    PENDIENTE_REPUESTO: "pendiente de repuesto",
    RECHAZADO: "rechazado",
    REPORTADO: "reportado",
    RESUELTO: "resuelto",
    VISITA_PROGRAMADA: "visita programada",
};
const weightedAverage = (rows) => {
    const normalized = rows.filter((row) => row.value !== null &&
        Number.isFinite(row.value) &&
        Number.isFinite(row.weight) &&
        row.weight > 0);
    if (normalized.length === 0) {
        return 0;
    }
    const totalWeight = normalized.reduce((sum, row) => sum + row.weight, 0);
    const totalValue = normalized.reduce((sum, row) => sum + row.value * row.weight, 0);
    return roundTo(totalValue / totalWeight, 4);
};
const buildMaterialCostCandidateMap = (project, purchaseOrders) => {
    const candidates = new Map();
    const appendCandidate = (materialId, candidate) => {
        const existing = candidates.get(materialId) ?? [];
        existing.push(candidate);
        existing.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        candidates.set(materialId, existing);
    };
    project.quotations.forEach((quotation) => {
        quotation.items.forEach((item) => {
            item.materials.forEach((line) => {
                if (!line.materialId || line.unitCost === null || !line.material) {
                    return;
                }
                appendCandidate(line.materialId, {
                    createdAt: line.createdAt,
                    material: line.material,
                    unit: line.unit,
                    unitCost: Number(line.unitCost),
                });
            });
        });
    });
    purchaseOrders.forEach((order) => {
        order.items.forEach((item) => {
            appendCandidate(item.materialId, {
                createdAt: item.createdAt,
                material: item.material,
                unit: item.unit,
                unitCost: Number(item.unitPrice),
            });
        });
    });
    return candidates;
};
const resolveMaterialUnitCost = (material, unit, candidates) => {
    const materialCandidates = candidates.get(material.id) ?? [];
    for (const candidate of materialCandidates) {
        const converted = convertUnitCost(candidate, unit);
        if (converted !== null && Number.isFinite(converted) && converted >= 0) {
            return converted;
        }
    }
    return 0;
};
const buildVariationRecord = (input) => {
    const diferencia = roundTo(input.real - input.presupuestado, 4);
    const porcentaje = safeDivide(diferencia, input.presupuestado);
    return {
        diferencia,
        etiqueta: input.etiqueta,
        porcentaje: porcentaje === null ? null : roundTo(porcentaje * 100, 4),
        presupuestado: roundTo(input.presupuestado, 4),
        real: roundTo(input.real, 4),
    };
};
const calculateProjectAreaM2 = (project) => {
    const area = project.measurements.reduce((sum, measurement) => {
        const widthMm = decimalToNumber(measurement.widthMm);
        const heightMm = decimalToNumber(measurement.heightMm);
        if (!widthMm || !heightMm) {
            return sum;
        }
        return (sum +
            (widthMm * heightMm * measurement.quantity) /
                1_000_000);
    }, 0);
    return area > 0 ? roundTo(area, 4) : null;
};
const calculateTaskProgress = (rows) => {
    if (rows.length === 0) {
        return 0;
    }
    const progress = rows.reduce((sum, row) => {
        if (row.status === "COMPLETED" || row.completedAt) {
            return sum + 1;
        }
        if (row.status === "IN_PROGRESS") {
            return sum + 0.5;
        }
        if (row.status === "PAUSED" || row.status === "BLOCKED") {
            return sum + 0.25;
        }
        return sum;
    }, 0);
    return roundTo(Math.min(progress / rows.length, 1), 4);
};
const buildAlertRecord = (input) => ({
    descripcion: input.descripcion,
    id: `${input.tipo}:${Math.abs(Math.round(input.impacto * 100))}`,
    impacto: roundTo(input.impacto, 4),
    severidad: input.severidad,
    tipo: input.tipo,
});
const mapProjectState = (input) => {
    if (input.project.status === "COMPLETED" &&
        !input.hasOpenInstallation &&
        !input.hasOpenPurchases &&
        !input.hasOpenProduction) {
        return input.severeAlertCount > 0 ? "CERRADO" : "ANALIZADO";
    }
    if (input.project.status === "COMPLETED" ||
        (!input.hasOpenInstallation && !input.hasOpenProduction && input.hasOpenPurchases)) {
        return "PENDIENTE_DE_CIERRE";
    }
    return "EN_EJECUCION";
};
const sortProfitabilityItems = (rows, query) => {
    const sorted = [...rows];
    sorted.sort((left, right) => {
        const leftValue = query.sortBy === "calculadoEn"
            ? new Date(left.rentabilidad.calculadoEn).getTime()
            : query.sortBy === "diferenciaContraPresupuesto"
                ? left.rentabilidad.diferenciaContraPresupuesto
                : query.sortBy === "ingresoReal"
                    ? left.rentabilidad.ingresoReal
                    : query.sortBy === "margenBruto"
                        ? left.rentabilidad.margenBruto
                        : left.rentabilidad.utilidadBruta;
        const rightValue = query.sortBy === "calculadoEn"
            ? new Date(right.rentabilidad.calculadoEn).getTime()
            : query.sortBy === "diferenciaContraPresupuesto"
                ? right.rentabilidad.diferenciaContraPresupuesto
                : query.sortBy === "ingresoReal"
                    ? right.rentabilidad.ingresoReal
                    : query.sortBy === "margenBruto"
                        ? right.rentabilidad.margenBruto
                        : right.rentabilidad.utilidadBruta;
        if (leftValue === rightValue) {
            return left.proyecto.code.localeCompare(right.proyecto.code);
        }
        return query.sortDirection === "asc"
            ? leftValue - rightValue
            : rightValue - leftValue;
    });
    return sorted;
};
const buildGroupingReport = (rows, selector) => {
    const grouped = new Map();
    rows.forEach((row) => {
        const selected = selector(row);
        const existing = grouped.get(selected.clave);
        if (existing) {
            existing.margenPromedio = roundTo((existing.margenPromedio * existing.proyectos +
                row.rentabilidad.margenBruto) /
                (existing.proyectos + 1), 4);
            existing.proyectos += 1;
            existing.utilidadTotal = roundTo(existing.utilidadTotal + row.rentabilidad.utilidadBruta, 4);
            existing.ventaTotal = roundTo(existing.ventaTotal + row.rentabilidad.ingresoReal, 4);
            return;
        }
        grouped.set(selected.clave, {
            clave: selected.clave,
            margenPromedio: row.rentabilidad.margenBruto,
            nombre: selected.nombre,
            proyectos: 1,
            utilidadTotal: row.rentabilidad.utilidadBruta,
            ventaTotal: row.rentabilidad.ingresoReal,
        });
    });
    return Array.from(grouped.values()).sort((left, right) => right.utilidadTotal - left.utilidadTotal);
};
const buildReceiptImpact = (receipt, order, candidateMap) => {
    return roundTo(receipt.items.reduce((sum, item) => {
        const unitCost = resolveMaterialUnitCost(item.material, item.unit, candidateMap);
        return sum + Number(item.receivedQuantity) * unitCost;
    }, 0), 4);
};
const buildProfitabilityForProject = (project, purchaseOrders, minimumMarginPercent, allRowsForReports) => {
    const budgetQuotation = chooseBudgetQuotation(project);
    const actualQuotation = chooseActualQuotation(project);
    const projectSummary = buildProjectSummary(project);
    const costCandidateMap = buildMaterialCostCandidateMap(project, purchaseOrders);
    const costos = [];
    const eventos = [];
    const metodologia = [
        "Los ingresos presupuestados se toman de la cotizacion comercial vigente del proyecto.",
        "Los costos reales de materiales priorizan ordenes de compra vinculadas; cuando no existen, se valoran consumos reales de inventario y remanentes.",
        "La mano de obra e instalacion real se derivan del avance registrado cuando no existe un costo horario directo en el ERP.",
        "Los casos de postventa, garantias y reposiciones afectan el costo real total y se reflejan en la utilidad del proyecto.",
    ];
    const budgetLines = budgetQuotation?.items.flatMap((item) => item.materials.map((line) => ({
        categoria: classifyQuotationMaterialCategory(line, item.description),
        descripcion: `${item.name} · ${line.materialName}`,
        fecha: budgetQuotation.updatedAt.toISOString(),
        id: `cotizacion:${line.id}`,
        monto: roundTo(Number(line.totalCost), 4),
        origen: "COTIZACION",
        proyectoId: project.id,
        referenciaId: line.id,
    }))) ?? [];
    budgetLines.forEach((line) => {
        costos.push(line);
    });
    if (budgetQuotation) {
        eventos.push({
            creadoEn: budgetQuotation.updatedAt.toISOString(),
            descripcion: `Cotizacion base ${budgetQuotation.code} considerada para el presupuesto del proyecto.`,
            id: `evento:cotizacion:${budgetQuotation.id}`,
            impacto: roundTo(Number(budgetQuotation.totalSale), 4),
            proyectoId: project.id,
            tipo: "COTIZACION_BASE",
        });
    }
    const poMaterialIds = new Set();
    let poLaborCost = 0;
    let poInstallationCost = 0;
    purchaseOrders.forEach((order) => {
        eventos.push({
            creadoEn: order.orderDate.toISOString(),
            descripcion: `Orden de compra ${order.code} registrada con proveedor ${order.supplier.commercialName || order.supplier.legalName}.`,
            id: `evento:oc:${order.id}`,
            impacto: roundTo(Number(order.total), 4),
            proyectoId: project.id,
            tipo: "COMPRA",
        });
        order.items.forEach((item) => {
            const categoria = classifyPurchaseItemCategory(item);
            const monto = roundTo(Number(item.totalPrice), 4);
            if (categoria === "MATERIALES") {
                poMaterialIds.add(item.materialId);
            }
            if (categoria === "MANO_DE_OBRA") {
                poLaborCost += monto;
            }
            if (categoria === "INSTALACION") {
                poInstallationCost += monto;
            }
            costos.push({
                categoria,
                descripcion: `${order.code} · ${item.material.name}`,
                fecha: order.orderDate.toISOString(),
                id: `oc:${item.id}`,
                monto,
                origen: "ORDEN_COMPRA",
                proyectoId: project.id,
                referenciaId: item.id,
            });
        });
        order.receipts.forEach((receipt) => {
            eventos.push({
                creadoEn: receipt.receivedAt.toISOString(),
                descripcion: `Recepcion ${receipt.code} registrada para la orden ${order.code}.`,
                id: `evento:recepcion:${receipt.id}`,
                impacto: buildReceiptImpact(receipt, order, costCandidateMap),
                proyectoId: project.id,
                tipo: "RECEPCION",
            });
        });
    });
    project.productionJobs.forEach((job) => {
        job.wasteReports.forEach((report) => {
            eventos.push({
                creadoEn: report.createdAt.toISOString(),
                descripcion: `Merma real registrada en produccion ${job.code}.`,
                id: `evento:merma:${report.id}`,
                impacto: roundTo(Number(report.variancePercent), 4),
                proyectoId: project.id,
                tipo: "DESPERDICIO",
            });
        });
        job.qualityChecks
            .filter((check) => check.status === "FAILED" || check.status === "REWORK_REQUIRED")
            .forEach((check) => {
            eventos.push({
                creadoEn: check.createdAt.toISOString(),
                descripcion: `Control de calidad con observaciones en la orden ${job.code}.`,
                id: `evento:calidad:${check.id}`,
                impacto: 0,
                proyectoId: project.id,
                tipo: "PRODUCCION",
            });
        });
    });
    project.installationOrders.forEach((order) => {
        order.issues
            .filter((issue) => issue.status !== "RESOLVED" && issue.status !== "CLOSED")
            .forEach((issue) => {
            eventos.push({
                creadoEn: issue.createdAt.toISOString(),
                descripcion: `Incidencia de instalacion abierta: ${issue.description}.`,
                id: `evento:instalacion:${issue.id}`,
                impacto: 0,
                proyectoId: project.id,
                tipo: "INSTALACION",
            });
        });
    });
    project.postventaCases.forEach((postventaCase) => {
        const caseTypeLabel = POSTVENTA_EVENT_TYPE_LABELS[postventaCase.caseType] ?? "caso";
        const caseStatusLabel = POSTVENTA_EVENT_STATUS_LABELS[postventaCase.status] ?? "en seguimiento";
        const caseTotalCost = roundTo(postventaCase.costs.reduce((sum, cost) => sum + Number(cost.amount), 0), 4);
        eventos.push({
            creadoEn: postventaCase.reportedAt.toISOString(),
            descripcion: `Caso postventa ${postventaCase.code} registrado por ${caseTypeLabel} con estado ${caseStatusLabel}.`,
            id: `evento:postventa:${postventaCase.id}`,
            impacto: caseTotalCost,
            proyectoId: project.id,
            tipo: "POSTVENTA",
        });
        postventaCase.costs.forEach((cost) => {
            costos.push({
                categoria: classifyPostventaCostCategory(postventaCase.caseType, cost.category),
                descripcion: `${postventaCase.code} · ${cost.description}`,
                fecha: cost.costDate.toISOString(),
                id: `postventa:${cost.id}`,
                monto: roundTo(Number(cost.amount), 4),
                origen: mapPostventaCostOrigin(cost.origin),
                proyectoId: project.id,
                referenciaId: cost.referenceId,
            });
        });
    });
    project.productionJobs.forEach((job) => {
        job.materialConsumptions.forEach((consumption) => {
            if (!["ACTUAL", "WASTE", "SCRAP"].includes(consumption.consumptionType)) {
                return;
            }
            if (poMaterialIds.has(consumption.materialId)) {
                return;
            }
            const unitCost = resolveMaterialUnitCost(consumption.material, consumption.unit, costCandidateMap);
            const monto = roundTo(Number(consumption.quantity) * unitCost, 4);
            if (monto <= 0) {
                return;
            }
            costos.push({
                categoria: "MATERIALES",
                descripcion: `${job.code} · ${consumption.material.name} consumido desde inventario`,
                fecha: consumption.consumedAt.toISOString(),
                id: `consumo:${consumption.id}`,
                monto,
                origen: "CONSUMO_INVENTARIO",
                proyectoId: project.id,
                referenciaId: consumption.id,
            });
        });
    });
    const budgetMaterial = roundTo(budgetLines
        .filter((line) => line.categoria === "MATERIALES")
        .reduce((sum, line) => sum + line.monto, 0), 4);
    const budgetLabor = roundTo(budgetLines
        .filter((line) => line.categoria === "MANO_DE_OBRA")
        .reduce((sum, line) => sum + line.monto, 0), 4);
    const budgetInstallation = roundTo(budgetLines
        .filter((line) => line.categoria === "INSTALACION")
        .reduce((sum, line) => sum + line.monto, 0), 4);
    const actualMaterialBase = roundTo(costos
        .filter((line) => line.categoria === "MATERIALES" &&
        (line.origen === "ORDEN_COMPRA" || line.origen === "CONSUMO_INVENTARIO"))
        .reduce((sum, line) => sum + line.monto, 0), 4);
    const productionProgress = weightedAverage(project.productionJobs.map((job) => ({
        value: calculateTaskProgress(job.tasks),
        weight: Math.max(job.tasks.length, 1),
    })));
    const installationProgress = weightedAverage(project.installationOrders.map((order) => ({
        value: calculateTaskProgress(order.tasks),
        weight: Math.max(order.tasks.length, 1),
    })));
    const derivedLaborTarget = roundTo(budgetLabor * productionProgress, 4);
    const derivedInstallationTarget = roundTo(budgetInstallation * installationProgress, 4);
    if (derivedLaborTarget > poLaborCost) {
        costos.push({
            categoria: "MANO_DE_OBRA",
            descripcion: "Costo de mano de obra derivado del avance de produccion registrado.",
            fecha: new Date().toISOString(),
            id: `derivado:mano-obra:${project.id}`,
            monto: roundTo(derivedLaborTarget - poLaborCost, 4),
            origen: "DERIVADO",
            proyectoId: project.id,
            referenciaId: null,
        });
    }
    if (derivedInstallationTarget > poInstallationCost) {
        costos.push({
            categoria: "INSTALACION",
            descripcion: "Costo de instalacion derivado del avance operativo registrado.",
            fecha: new Date().toISOString(),
            id: `derivado:instalacion:${project.id}`,
            monto: roundTo(derivedInstallationTarget - poInstallationCost, 4),
            origen: "DERIVADO",
            proyectoId: project.id,
            referenciaId: null,
        });
    }
    const actualMaterial = roundTo(costos
        .filter((line) => line.categoria === "MATERIALES")
        .reduce((sum, line) => sum + line.monto, 0), 4);
    const actualLabor = roundTo(costos
        .filter((line) => line.categoria === "MANO_DE_OBRA")
        .reduce((sum, line) => sum + line.monto, 0), 4);
    const actualInstallation = roundTo(costos
        .filter((line) => line.categoria === "INSTALACION")
        .reduce((sum, line) => sum + line.monto, 0), 4);
    const totalBudgetCostFromLines = roundTo(budgetLines.reduce((sum, line) => sum + line.monto, 0), 4);
    const totalBudgetCost = roundTo(Math.max(totalBudgetCostFromLines, budgetQuotation ? Number(budgetQuotation.subtotalCost) : 0), 4);
    const totalActualCost = roundTo(costos.reduce((sum, line) => sum + line.monto, 0), 4);
    const ingresoPresupuestado = roundTo(budgetQuotation ? Number(budgetQuotation.totalSale) : 0, 4);
    const ingresoReal = roundTo(actualQuotation ? Number(actualQuotation.totalSale) : ingresoPresupuestado, 4);
    const utilidadBruta = roundTo(ingresoReal - totalActualCost, 4);
    const margenBruto = roundTo(safeDivide(utilidadBruta, ingresoReal) === null
        ? 0
        : (safeDivide(utilidadBruta, ingresoReal) ?? 0) * 100, 4);
    const budgetWaste = weightedAverage((budgetQuotation?.items ?? []).flatMap((item) => item.materials.map((line) => ({
        value: decimalToNumber(line.wastePercent),
        weight: Number(line.totalCost),
    }))));
    const wasteReportRows = project.productionJobs.flatMap((job) => job.wasteReports);
    const actualWasteFromReports = weightedAverage(wasteReportRows.map((report) => ({
        value: Number(report.actualWastePercent),
        weight: Math.max(Math.abs(Number(report.variancePercent)), 1),
    })));
    const actualWasteFromConsumptions = (() => {
        const actualConsumptions = project.productionJobs.flatMap((job) => job.materialConsumptions.filter((consumption) => ["ACTUAL", "WASTE", "SCRAP"].includes(consumption.consumptionType)));
        const wasteQuantity = actualConsumptions
            .filter((consumption) => ["WASTE", "SCRAP"].includes(consumption.consumptionType))
            .reduce((sum, row) => sum + Number(row.quantity), 0);
        const totalQuantity = actualConsumptions.reduce((sum, row) => sum + Number(row.quantity), 0);
        if (totalQuantity <= 0) {
            return 0;
        }
        return roundTo((wasteQuantity / totalQuantity) * 100, 4);
    })();
    const desperdicioReal = actualWasteFromReports > 0 ? actualWasteFromReports : actualWasteFromConsumptions;
    const recuperacionPorRemanentes = roundTo([
        ...project.cuttingOptimizationRuns.flatMap((run) => run.cuttingPlans.flatMap((plan) => plan.sheets.flatMap((sheet) => sheet.remnantOutputs
            .filter((output) => output.remnantPieceId)
            .map((output) => {
            const unitCost = resolveMaterialUnitCost(plan.material, "M2", costCandidateMap);
            return Number(output.areaM2) * unitCost;
        })))),
        ...project.profileOptimizationRuns.flatMap((run) => run.cuttingPlans.flatMap((plan) => plan.bars.flatMap((bar) => bar.remnantOutputs
            .filter((output) => output.remnantPieceId)
            .map((output) => {
            const unitCost = resolveMaterialUnitCost(plan.material, "MM", costCandidateMap);
            return Number(output.remainingLengthMm) * unitCost;
        })))),
    ].reduce((sum, value) => sum + value, 0), 4);
    const netMargin = roundTo(safeDivide(ingresoReal - totalActualCost, ingresoReal) === null
        ? 0
        : (safeDivide(ingresoReal - totalActualCost, ingresoReal) ?? 0) * 100, 4);
    const indicators = {
        margenNeto: netMargin,
        rentabilidadPorMetroCuadrado: calculateProjectAreaM2(project) && calculateProjectAreaM2(project) > 0
            ? roundTo(utilidadBruta / (calculateProjectAreaM2(project) ?? 1), 4)
            : null,
        rentabilidadPorProyecto: roundTo(ingresoReal - totalActualCost, 4),
        recuperacionPorRemanentes,
        desperdicioGenerado: desperdicioReal,
    };
    const alerts = [];
    if (margenBruto < minimumMarginPercent) {
        alerts.push(buildAlertRecord({
            descripcion: `El margen bruto (${margenBruto.toFixed(2)}%) esta por debajo del minimo permitido (${minimumMarginPercent.toFixed(2)}%).`,
            impacto: minimumMarginPercent - margenBruto,
            severidad: "ALTA",
            tipo: "MARGEN_BAJO",
        }));
    }
    if (totalActualCost > totalBudgetCost) {
        alerts.push(buildAlertRecord({
            descripcion: "Los costos reales superan el presupuesto aprobado del proyecto.",
            impacto: totalActualCost - totalBudgetCost,
            severidad: "ALTA",
            tipo: "SOBRECOSTO",
        }));
    }
    if (desperdicioReal > budgetWaste && budgetWaste > 0) {
        alerts.push(buildAlertRecord({
            descripcion: "El desperdicio real excede el objetivo presupuestado del proyecto.",
            impacto: desperdicioReal - budgetWaste,
            severidad: "MEDIA",
            tipo: "DESPERDICIO_EXCEDIDO",
        }));
    }
    if (ingresoReal - totalActualCost < 0) {
        alerts.push(buildAlertRecord({
            descripcion: "El proyecto ya se encuentra en perdida con los costos actuales.",
            impacto: Math.abs(ingresoReal - totalActualCost),
            severidad: "ALTA",
            tipo: "PROYECTO_EN_PERDIDA",
        }));
    }
    alerts.forEach((alert) => {
        eventos.push({
            creadoEn: new Date().toISOString(),
            descripcion: alert.descripcion,
            id: `evento:alerta:${alert.id}`,
            impacto: alert.impacto,
            proyectoId: project.id,
            tipo: "ALERTA",
        });
    });
    const rentabilidad = {
        calculadoEn: new Date().toISOString(),
        costoInstalacionPresupuestado: budgetInstallation,
        costoInstalacionReal: actualInstallation,
        costoManoObraPresupuestado: budgetLabor,
        costoManoObraReal: actualLabor,
        costoMaterialPresupuestado: budgetMaterial,
        costoMaterialReal: actualMaterial,
        diferenciaContraPresupuesto: roundTo(totalActualCost - totalBudgetCost, 4),
        estado: mapProjectState({
            hasOpenInstallation: project.installationOrders.some((order) => !["COMPLETED", "CANCELLED"].includes(order.status)),
            hasOpenProduction: project.productionJobs.some((job) => !["COMPLETED", "CANCELLED"].includes(job.status)),
            hasOpenPurchases: purchaseOrders.some((order) => !["RECEIVED", "CANCELLED"].includes(order.status)),
            project,
            severeAlertCount: alerts.filter((alert) => alert.severidad === "ALTA").length,
        }),
        id: `rentabilidad:${project.id}`,
        ingresoPresupuestado,
        ingresoReal,
        margenBruto,
        proyectoId: project.id,
        totalCostoPresupuestado: totalBudgetCost,
        totalCostoReal: totalActualCost,
        utilidadBruta,
        desperdicioPresupuestado: budgetWaste,
        desperdicioReal,
    };
    const listItem = {
        alertas: alerts,
        indicadores: indicators,
        proyecto: projectSummary,
        rentabilidad,
    };
    const reportRows = allRowsForReports ?? [listItem];
    return {
        ...listItem,
        costos: costos.sort((left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime()),
        eventos: eventos.sort((left, right) => new Date(right.creadoEn).getTime() -
            new Date(left.creadoEn).getTime()),
        metodologia,
        reportes: {
            porCliente: buildGroupingReport(reportRows, (row) => ({
                clave: row.proyecto.client.id,
                nombre: row.proyecto.client.displayName,
            })),
            porTipoProducto: buildGroupingReport(reportRows, (row) => ({
                clave: row.proyecto.projectType,
                nombre: row.proyecto.projectType,
            })),
            porVendedor: buildGroupingReport(reportRows, (row) => ({
                clave: row.proyecto.salesUser?.id ?? "sin-vendedor",
                nombre: row.proyecto.salesUser?.name ?? "Sin vendedor asignado",
            })),
        },
        variaciones: {
            costos: buildVariationRecord({
                etiqueta: "Costos totales",
                presupuestado: totalBudgetCost,
                real: totalActualCost,
            }),
            ingresos: buildVariationRecord({
                etiqueta: "Ingresos",
                presupuestado: ingresoPresupuestado,
                real: ingresoReal,
            }),
            instalacion: buildVariationRecord({
                etiqueta: "Instalacion",
                presupuestado: budgetInstallation,
                real: actualInstallation,
            }),
            manoDeObra: buildVariationRecord({
                etiqueta: "Mano de obra",
                presupuestado: budgetLabor,
                real: actualLabor,
            }),
            materiales: buildVariationRecord({
                etiqueta: "Materiales",
                presupuestado: budgetMaterial,
                real: actualMaterialBase,
            }),
        },
    };
};
const fetchProjectsWithContext = async (where) => {
    const projects = await prisma.project.findMany({
        include: projectProfitabilityInclude,
        orderBy: [
            {
                updatedAt: "desc",
            },
        ],
        where,
    });
    if (projects.length === 0) {
        return [];
    }
    const projectIds = projects.map((project) => project.id);
    const quotationIdToProjectId = new Map();
    const planIdToProjectId = new Map();
    projects.forEach((project) => {
        project.quotations.forEach((quotation) => {
            quotationIdToProjectId.set(quotation.id, project.id);
        });
        project.cuttingOptimizationRuns.forEach((run) => {
            run.cuttingPlans.forEach((plan) => {
                planIdToProjectId.set(plan.id, project.id);
            });
        });
        project.profileOptimizationRuns.forEach((run) => {
            run.cuttingPlans.forEach((plan) => {
                planIdToProjectId.set(plan.id, project.id);
            });
        });
    });
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        include: purchaseOrderInclude,
        orderBy: [
            {
                orderDate: "desc",
            },
        ],
        where: {
            deletedAt: null,
            purchaseRequest: {
                is: {
                    OR: [
                        {
                            sourceId: {
                                in: projectIds,
                            },
                            sourceType: "PROJECT",
                        },
                        {
                            sourceId: {
                                in: Array.from(quotationIdToProjectId.keys()),
                            },
                            sourceType: "QUOTATION",
                        },
                        {
                            sourceId: {
                                in: Array.from(planIdToProjectId.keys()),
                            },
                            sourceType: "CUTTING_PLAN",
                        },
                    ],
                },
            },
        },
    });
    const projectPurchaseOrderMap = new Map();
    purchaseOrders.forEach((order) => {
        const sourceType = order.purchaseRequest?.sourceType;
        const sourceId = order.purchaseRequest?.sourceId;
        let projectId = null;
        if (sourceType === "PROJECT" && sourceId) {
            projectId = sourceId;
        }
        else if (sourceType === "QUOTATION" && sourceId) {
            projectId = quotationIdToProjectId.get(sourceId) ?? null;
        }
        else if (sourceType === "CUTTING_PLAN" && sourceId) {
            projectId = planIdToProjectId.get(sourceId) ?? null;
        }
        if (!projectId) {
            return;
        }
        const existing = projectPurchaseOrderMap.get(projectId) ?? [];
        existing.push(order);
        projectPurchaseOrderMap.set(projectId, existing);
    });
    return projects.map((project) => ({
        project,
        purchaseOrders: projectPurchaseOrderMap.get(project.id) ?? [],
    }));
};
const getMinimumMarginPercent = async () => {
    const setting = await prisma.systemSetting.findUnique({
        select: {
            valueJson: true,
        },
        where: {
            key: "quotation.minimum_margin_percent",
        },
    });
    const rawValue = Number(setting?.valueJson ?? 18);
    return Number.isFinite(rawValue) ? rawValue : 18;
};
export const projectProfitabilityService = {
    async listProjectProfitability(query) {
        const [minimumMarginPercent, projects] = await Promise.all([
            getMinimumMarginPercent(),
            fetchProjectsWithContext(buildProjectWhereClause(query)),
        ]);
        const detailRows = projects.map(({ project, purchaseOrders }) => buildProfitabilityForProject(project, purchaseOrders, minimumMarginPercent));
        const rows = detailRows.map((row) => ({
            alertas: row.alertas,
            indicadores: row.indicadores,
            proyecto: row.proyecto,
            rentabilidad: row.rentabilidad,
        }));
        const sorted = sortProfitabilityItems(rows, query);
        const startIndex = (query.page - 1) * query.perPage;
        return {
            data: sorted.slice(startIndex, startIndex + query.perPage),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total: sorted.length,
            },
        };
    },
    async getDashboard(query) {
        const [minimumMarginPercent, projects] = await Promise.all([
            getMinimumMarginPercent(),
            fetchProjectsWithContext(buildProjectWhereClause(query)),
        ]);
        const detailRows = projects.map(({ project, purchaseOrders }) => buildProfitabilityForProject(project, purchaseOrders, minimumMarginPercent));
        const rows = detailRows.map((row) => ({
            alertas: row.alertas,
            indicadores: row.indicadores,
            proyecto: row.proyecto,
            rentabilidad: row.rentabilidad,
        }));
        const byUtility = [...rows].sort((left, right) => right.rentabilidad.utilidadBruta - left.rentabilidad.utilidadBruta);
        return {
            desperdicioPromedio: roundTo(safeDivide(rows.reduce((sum, row) => sum + row.rentabilidad.desperdicioReal, 0), Math.max(rows.length, 1)) ?? 0, 4),
            margenPromedio: roundTo(safeDivide(rows.reduce((sum, row) => sum + row.rentabilidad.margenBruto, 0), Math.max(rows.length, 1)) ?? 0, 4),
            proyectosMasRentables: byUtility.slice(0, 5),
            proyectosMenosRentables: [...byUtility].reverse().slice(0, 5),
            proyectosRentables: rows.filter((row) => row.indicadores.rentabilidadPorProyecto > 0).length,
            reportes: {
                porCliente: buildGroupingReport(rows, (row) => ({
                    clave: row.proyecto.client.id,
                    nombre: row.proyecto.client.displayName,
                })),
                porTipoProducto: buildGroupingReport(rows, (row) => ({
                    clave: row.proyecto.projectType,
                    nombre: row.proyecto.projectType,
                })),
                porVendedor: buildGroupingReport(rows, (row) => ({
                    clave: row.proyecto.salesUser?.id ?? "sin-vendedor",
                    nombre: row.proyecto.salesUser?.name ?? "Sin vendedor asignado",
                })),
            },
            totalProyectos: rows.length,
            utilidadTotal: roundTo(rows.reduce((sum, row) => sum + row.rentabilidad.utilidadBruta, 0), 4),
        };
    },
    async getProjectProfitabilityByProjectId(projectId) {
        const [minimumMarginPercent, projects] = await Promise.all([
            getMinimumMarginPercent(),
            fetchProjectsWithContext({
                deletedAt: null,
                id: projectId,
            }),
        ]);
        const entry = projects[0];
        if (!entry) {
            throw new AppError("Project not found.", 404);
        }
        const allRows = [
            buildProfitabilityForProject(entry.project, entry.purchaseOrders, minimumMarginPercent),
        ];
        return buildProfitabilityForProject(entry.project, entry.purchaseOrders, minimumMarginPercent, allRows.map((row) => ({
            alertas: row.alertas,
            indicadores: row.indicadores,
            proyecto: row.proyecto,
            rentabilidad: row.rentabilidad,
        })));
    },
};
//# sourceMappingURL=project-profitability.service.js.map