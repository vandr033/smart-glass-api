import type { Prisma } from "../../../generated/prisma/client.js";
import type { Prisma as PrismaNamespace } from "../../../generated/prisma/client.js";

import { buildDateRangeFilter } from "../../services/logging-utils.js";
import { prisma } from "../../utils/prisma.js";
import { projectProfitabilityService } from "../project-profitability/project-profitability.service.js";
import {
  TABLERO_VISIBLE_PARA_ROLES,
} from "./tableros.constants.js";
import type {
  IndicadorGestionRecord,
  MetaIndicadorRecord,
  PanelEjecutivoRecord,
  RankingRecord,
  ReporteBIRecord,
  SerieTemporalRecord,
  SerieValorRecord,
  TablerosPanelQuery,
  TarjetaIndicadorRecord,
  TableroEjecutivoRecord,
} from "./tableros.types.js";

type MetaConfig = {
  descripcion: string;
  formula: string;
  meta: number | null;
  nombre: string;
  sentido: "alto" | "bajo";
  unidad: IndicadorGestionRecord["unidad"];
};

type EffectiveQuery = {
  clientId: string | null;
  dateFrom: string;
  dateTo: string;
  projectId: string | null;
  responsibleId: string | null;
  salesUserId: string | null;
  status: string | null;
  warehouseId: string | null;
};

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const CHART_COLORS = {
  accent: "#0f5bd7",
  amber: "#c27d2c",
  cyan: "#1a8fb8",
  emerald: "#198754",
  rose: "#be4b62",
  slate: "#5f6b7a",
} as const;

const PROJECT_STATUS_SET = new Set([
  "LEAD",
  "MEASUREMENT_PENDING",
  "QUOTATION_PENDING",
  "QUOTED",
  "APPROVED",
  "PURCHASE_PENDING",
  "PRODUCTION_PENDING",
  "IN_PRODUCTION",
  "INSTALLATION_PENDING",
  "IN_INSTALLATION",
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
]);

const QUOTATION_STATUS_SET = new Set([
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
]);

const PRODUCTION_STATUS_SET = new Set([
  "DRAFT",
  "READY",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

const INSTALLATION_STATUS_SET = new Set([
  "SCHEDULED",
  "EN_ROUTE",
  "IN_INSTALLATION",
  "PAUSED",
  "WITH_OBSERVATIONS",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
]);

const POSTVENTA_STATUS_SET = new Set([
  "REPORTADO",
  "EN_REVISION",
  "VISITA_PROGRAMADA",
  "EN_ATENCION",
  "PENDIENTE_REPUESTO",
  "RESUELTO",
  "RECHAZADO",
  "CERRADO",
]);

const OPEN_POSTVENTA_STATUS_VALUES = [
  "REPORTADO",
  "EN_REVISION",
  "VISITA_PROGRAMADA",
  "EN_ATENCION",
  "PENDIENTE_REPUESTO",
 ] as const;

const OPEN_POSTVENTA_STATUSES = new Set<string>(OPEN_POSTVENTA_STATUS_VALUES);

const ACTIVE_PRODUCTION_STATUS_VALUES = ["READY", "IN_PROGRESS", "PAUSED"] as const;

const ACTIVE_PRODUCTION_STATUSES = new Set<string>(ACTIVE_PRODUCTION_STATUS_VALUES);

const ACTIVE_INSTALLATION_STATUS_VALUES = [
  "SCHEDULED",
  "EN_ROUTE",
  "IN_INSTALLATION",
  "PAUSED",
  "WITH_OBSERVATIONS",
  "RESCHEDULED",
] as const;

const ACTIVE_INSTALLATION_STATUSES = new Set<string>(ACTIVE_INSTALLATION_STATUS_VALUES);

const LOST_QUOTATION_STATUSES = new Set(["REJECTED", "EXPIRED", "CANCELLED"]);

const META_CONFIG: Record<string, MetaConfig> = {
  casos_postventa_abiertos: {
    descripcion: "Casos postventa con atencion pendiente dentro del periodo filtrado.",
    formula: "Casos abiertos del periodo",
    meta: 5,
    nombre: "Casos postventa abiertos",
    sentido: "bajo",
    unidad: "numero",
  },
  conversion_cotizaciones: {
    descripcion: "Relacion entre cotizaciones aceptadas y cotizaciones emitidas.",
    formula: "Cotizaciones aceptadas / cotizaciones emitidas",
    meta: 0.55,
    nombre: "Conversion de cotizaciones",
    sentido: "alto",
    unidad: "porcentaje",
  },
  cumplimiento_fechas: {
    descripcion: "Porcentaje combinado de produccion e instalaciones completadas a tiempo.",
    formula: "Trabajos a tiempo / trabajos completados",
    meta: 0.9,
    nombre: "Cumplimiento de fechas",
    sentido: "alto",
    unidad: "porcentaje",
  },
  costos_reales: {
    descripcion: "Costo real acumulado del portafolio filtrado.",
    formula: "Suma de costos reales",
    meta: null,
    nombre: "Costos reales",
    sentido: "bajo",
    unidad: "moneda",
  },
  cotizaciones_aprobadas: {
    descripcion: "Cotizaciones aceptadas por el cliente dentro del periodo.",
    formula: "Conteo de cotizaciones aceptadas",
    meta: 12,
    nombre: "Cotizaciones aprobadas",
    sentido: "alto",
    unidad: "numero",
  },
  cotizaciones_emitidas: {
    descripcion: "Cotizaciones compartidas con el cliente durante el periodo.",
    formula: "Conteo de cotizaciones emitidas",
    meta: 20,
    nombre: "Cotizaciones emitidas",
    sentido: "alto",
    unidad: "numero",
  },
  desperdicio_generado: {
    descripcion: "Merma real acumulada segun reportes de produccion.",
    formula: "Suma de merma real",
    meta: 15,
    nombre: "Desperdicio generado",
    sentido: "bajo",
    unidad: "numero",
  },
  desperdicio_promedio: {
    descripcion: "Promedio de desperdicio real calculado para el portafolio filtrado.",
    formula: "Promedio de desperdicio real",
    meta: 0.08,
    nombre: "Desperdicio promedio",
    sentido: "bajo",
    unidad: "porcentaje",
  },
  desviacion_presupuesto: {
    descripcion: "Diferencia acumulada contra el presupuesto del proyecto.",
    formula: "Ingreso real - ingreso presupuestado",
    meta: 0,
    nombre: "Desviacion contra presupuesto",
    sentido: "alto",
    unidad: "moneda",
  },
  ingreso_presupuestado: {
    descripcion: "Ingreso planificado para los proyectos del periodo filtrado.",
    formula: "Suma del ingreso presupuestado",
    meta: null,
    nombre: "Ingreso presupuestado",
    sentido: "alto",
    unidad: "moneda",
  },
  ingreso_real: {
    descripcion: "Ingreso real vendido o comprometido para el periodo.",
    formula: "Suma del ingreso real",
    meta: null,
    nombre: "Ingreso real",
    sentido: "alto",
    unidad: "moneda",
  },
  instalaciones_atrasadas: {
    descripcion: "Instalaciones cuya fecha programada ya vencio.",
    formula: "Instalaciones pendientes con fecha vencida",
    meta: 1,
    nombre: "Instalaciones atrasadas",
    sentido: "bajo",
    unidad: "numero",
  },
  instalaciones_programadas: {
    descripcion: "Instalaciones programadas dentro del rango de fechas visible.",
    formula: "Conteo de instalaciones programadas",
    meta: 10,
    nombre: "Instalaciones programadas",
    sentido: "alto",
    unidad: "numero",
  },
  margen_bruto: {
    descripcion: "Margen bruto consolidado de los proyectos filtrados.",
    formula: "Utilidad bruta / ingreso real",
    meta: 0.3,
    nombre: "Margen bruto",
    sentido: "alto",
    unidad: "porcentaje",
  },
  margen_promedio: {
    descripcion: "Promedio de margen bruto dentro del rango analizado.",
    formula: "Promedio de margen bruto",
    meta: 0.28,
    nombre: "Margen promedio",
    sentido: "alto",
    unidad: "porcentaje",
  },
  materiales_criticos: {
    descripcion: "Materiales con disponibilidad comprometida o stock bajo.",
    formula: "Materiales con saldo disponible <= 1",
    meta: 3,
    nombre: "Materiales criticos",
    sentido: "bajo",
    unidad: "numero",
  },
  ordenes_trabajo_activas: {
    descripcion: "Ordenes de trabajo que siguen activas en produccion.",
    formula: "Conteo de ordenes activas",
    meta: 18,
    nombre: "Ordenes de trabajo activas",
    sentido: "alto",
    unidad: "numero",
  },
  produccion_atrasada: {
    descripcion: "Ordenes de produccion que ya vencieron frente a su fecha planificada.",
    formula: "Ordenes pendientes con fecha vencida",
    meta: 2,
    nombre: "Produccion atrasada",
    sentido: "bajo",
    unidad: "numero",
  },
  produccion_pendiente: {
    descripcion: "Carga pendiente que todavia no llega a completarse.",
    formula: "Ordenes activas en produccion",
    meta: 16,
    nombre: "Produccion pendiente",
    sentido: "bajo",
    unidad: "numero",
  },
  proyectos_activos: {
    descripcion: "Proyectos en curso dentro del frente operativo actual.",
    formula: "Proyectos no cerrados ni cancelados",
    meta: 24,
    nombre: "Proyectos activos",
    sentido: "alto",
    unidad: "numero",
  },
  proyectos_en_perdida: {
    descripcion: "Proyectos con rentabilidad negativa dentro del analisis actual.",
    formula: "Conteo de proyectos con utilidad negativa",
    meta: 0,
    nombre: "Proyectos en perdida",
    sentido: "bajo",
    unidad: "numero",
  },
  proyectos_ganados: {
    descripcion: "Cotizaciones convertidas en negocio ganado.",
    formula: "Conteo de cotizaciones aceptadas",
    meta: 10,
    nombre: "Proyectos ganados",
    sentido: "alto",
    unidad: "numero",
  },
  proyectos_perdidos: {
    descripcion: "Cotizaciones perdidas por rechazo, vencimiento o cancelacion.",
    formula: "Conteo de cotizaciones perdidas",
    meta: 4,
    nombre: "Proyectos perdidos",
    sentido: "bajo",
    unidad: "numero",
  },
  remanentes_disponibles: {
    descripcion: "Piezas remanentes reutilizables disponibles para futuros trabajos.",
    formula: "Conteo de remanentes disponibles",
    meta: 12,
    nombre: "Remanentes disponibles",
    sentido: "alto",
    unidad: "numero",
  },
  rotacion_inventario: {
    descripcion: "Rotacion relativa segun movimientos de salida sobre materiales en stock.",
    formula: "Movimientos de salida / materiales con stock",
    meta: 2,
    nombre: "Rotacion de inventario",
    sentido: "alto",
    unidad: "veces",
  },
  stock_bajo: {
    descripcion: "Materiales actualmente en o por debajo del nivel operativo minimo.",
    formula: "Materiales con stock disponible <= 1",
    meta: 5,
    nombre: "Stock bajo",
    sentido: "bajo",
    unidad: "numero",
  },
  tiempo_instalacion_promedio: {
    descripcion: "Tiempo promedio estimado entre programacion y cierre de la instalacion.",
    formula: "Promedio de dias por instalacion completada",
    meta: 2,
    nombre: "Tiempo promedio de instalacion",
    sentido: "bajo",
    unidad: "dias",
  },
  tiempo_produccion_promedio: {
    descripcion: "Tiempo promedio transcurrido en produccion para trabajos completados.",
    formula: "Promedio de dias por orden de produccion",
    meta: 6,
    nombre: "Tiempo promedio de produccion",
    sentido: "bajo",
    unidad: "dias",
  },
  tiempo_resolucion_postventa: {
    descripcion: "Tiempo promedio requerido para cerrar casos postventa.",
    formula: "Promedio de dias entre reporte y cierre",
    meta: 5,
    nombre: "Tiempo promedio de resolucion",
    sentido: "bajo",
    unidad: "dias",
  },
  utilidad_bruta: {
    descripcion: "Utilidad bruta consolidada de proyectos visibles en el tablero.",
    formula: "Ingreso real - costos reales",
    meta: null,
    nombre: "Utilidad bruta",
    sentido: "alto",
    unidad: "moneda",
  },
  valor_total_inventario: {
    descripcion: "Valor estimado del inventario segun precios actuales conocidos.",
    formula: "Cantidad en stock x precio vigente",
    meta: null,
    nombre: "Valor total de inventario",
    sentido: "alto",
    unidad: "moneda",
  },
  ventas_periodo: {
    descripcion: "Valor vendido dentro del periodo filtrado.",
    formula: "Suma de ventas aceptadas",
    meta: 250000,
    nombre: "Ventas del periodo",
    sentido: "alto",
    unidad: "moneda",
  },
};

const getMetaConfig = (codigo: string): MetaConfig => {
  const metaConfig = META_CONFIG[codigo];

  if (!metaConfig) {
    throw new Error(`No se encontro configuracion de meta para ${codigo}.`);
  }

  return metaConfig;
};

const decimalToNumber = (
  value: PrismaNamespace.Decimal | number | null | undefined,
): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
};

const roundTo = (value: number, digits = 2): number => {
  return Number(value.toFixed(digits));
};

const safeDivide = (value: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }

  return value / total;
};

const normalizeText = (value: string | null | undefined): string => {
  return value?.trim() || "";
};

const buildClientDisplayName = (client: {
  clientType: "COMPANY" | "INDIVIDUAL";
  commercialName: string | null;
  firstName: string | null;
  id: string;
  lastName: string | null;
  legalName: string | null;
}): string => {
  if (client.clientType === "COMPANY") {
    return (
      normalizeText(client.commercialName) ||
      normalizeText(client.legalName) ||
      `Cliente ${client.id.slice(0, 8).toUpperCase()}`
    );
  }

  const fullName = [client.firstName, client.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName.length > 0 ? fullName : `Cliente ${client.id.slice(0, 8).toUpperCase()}`;
};

const getMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const formatMonthLabel = (date: Date): string =>
  `${MONTH_LABELS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(-2)}`;

const buildMonthlyBuckets = (dateFrom: string, dateTo: string) => {
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const buckets: Array<{ etiqueta: string; periodo: string }> = [];

  while (cursor <= endCursor) {
    buckets.push({
      etiqueta: formatMonthLabel(cursor),
      periodo: getMonthKey(cursor),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return buckets;
};

const resolveEffectiveQuery = (query: TablerosPanelQuery): EffectiveQuery => {
  const today = new Date();
  const dateTo = query.dateTo ?? today.toISOString().slice(0, 10);
  const dateFrom =
    query.dateFrom ??
    `${dateTo.slice(0, 7)}-01`;

  return {
    clientId: query.clientId ?? null,
    dateFrom,
    dateTo,
    projectId: query.projectId ?? null,
    responsibleId: query.responsibleId ?? null,
    salesUserId: query.salesUserId ?? null,
    status: query.status ?? null,
    warehouseId: query.warehouseId ?? null,
  };
};

const buildPeriodoLabel = (query: EffectiveQuery): string => {
  const start = new Date(`${query.dateFrom}T00:00:00.000Z`);
  const end = new Date(`${query.dateTo}T00:00:00.000Z`);

  return `Del ${String(start.getUTCDate()).padStart(2, "0")} ${MONTH_LABELS[start.getUTCMonth()]} ${start.getUTCFullYear()} al ${String(end.getUTCDate()).padStart(2, "0")} ${MONTH_LABELS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
};

const buildQuotationWhere = (
  query: EffectiveQuery,
  options: {
    dateField: "createdAt" | "updatedAt";
    emittedOnly?: boolean;
    exactStatus?: string;
  },
): Prisma.QuotationWhereInput => {
  const andFilters: Prisma.QuotationWhereInput[] = [
    {
      deletedAt: null,
    },
  ];
  const dateRange = buildDateRangeFilter(query.dateFrom, query.dateTo);
  const quotationStatusFilter =
    query.status && QUOTATION_STATUS_SET.has(query.status) ? query.status : null;

  if (query.clientId) {
    andFilters.push({
      clientId: query.clientId,
    });
  }

  if (query.projectId) {
    andFilters.push({
      projectId: query.projectId,
    });
  }

  if (query.salesUserId) {
    andFilters.push({
      OR: [
        {
          createdByUserId: query.salesUserId,
        },
        {
          project: {
            is: {
              salesUserId: query.salesUserId,
            },
          },
        },
      ],
    });
  }

  if (query.responsibleId) {
    andFilters.push({
      project: {
        is: {
          responsibleUserId: query.responsibleId,
        },
      },
    });
  }

  if (quotationStatusFilter) {
    andFilters.push({
      status: quotationStatusFilter as never,
    });
  }

  if (options.emittedOnly) {
    andFilters.push({
      status: {
        not: "DRAFT",
      },
    });
  }

  if (options.exactStatus) {
    andFilters.push({
      status: options.exactStatus as never,
    });
  }

  if (dateRange) {
    andFilters.push({
      [options.dateField]: dateRange,
    } as Prisma.QuotationWhereInput);
  }

  return {
    AND: andFilters,
  };
};

const buildProjectWhere = (
  query: EffectiveQuery,
  options: {
    activeOnly?: boolean;
    includeDateRange?: boolean;
  } = {},
): Prisma.ProjectWhereInput => {
  const andFilters: Prisma.ProjectWhereInput[] = [
    {
      deletedAt: null,
    },
  ];
  const projectStatusFilter =
    query.status && PROJECT_STATUS_SET.has(query.status) ? query.status : null;

  if (query.clientId) {
    andFilters.push({
      clientId: query.clientId,
    });
  }

  if (query.projectId) {
    andFilters.push({
      id: query.projectId,
    });
  }

  if (query.salesUserId) {
    andFilters.push({
      salesUserId: query.salesUserId,
    });
  }

  if (query.responsibleId) {
    andFilters.push({
      responsibleUserId: query.responsibleId,
    });
  }

  if (projectStatusFilter) {
    andFilters.push({
      status: projectStatusFilter as never,
    });
  } else if (options.activeOnly) {
    andFilters.push({
      status: {
        notIn: ["COMPLETED", "CANCELLED"],
      },
    });
  }

  if (options.includeDateRange) {
    const dateRange = buildDateRangeFilter(query.dateFrom, query.dateTo);

    if (dateRange) {
      andFilters.push({
        createdAt: dateRange,
      });
    }
  }

  return {
    AND: andFilters,
  };
};

const buildProductionWhere = (
  query: EffectiveQuery,
  options: {
    completedOnly?: boolean;
    currentOnly?: boolean;
    useActualEndDateRange?: boolean;
  } = {},
): Prisma.ProductionJobWhereInput => {
  const andFilters: Prisma.ProductionJobWhereInput[] = [
    {
      deletedAt: null,
    },
  ];
  const productionStatusFilter =
    query.status && PRODUCTION_STATUS_SET.has(query.status) ? query.status : null;

  if (query.projectId) {
    andFilters.push({
      projectId: query.projectId,
    });
  }

  if (query.responsibleId) {
    andFilters.push({
      OR: [
        {
          assignedToUserId: query.responsibleId,
        },
        {
          project: {
            is: {
              responsibleUserId: query.responsibleId,
            },
          },
        },
      ],
    });
  }

  if (query.salesUserId) {
    andFilters.push({
      project: {
        is: {
          salesUserId: query.salesUserId,
        },
      },
    });
  }

  if (query.clientId) {
    andFilters.push({
      project: {
        is: {
          clientId: query.clientId,
        },
      },
    });
  }

  if (productionStatusFilter) {
    andFilters.push({
      status: productionStatusFilter as never,
    });
  } else if (options.completedOnly) {
    andFilters.push({
      status: "COMPLETED",
    });
  } else if (options.currentOnly) {
    andFilters.push({
      status: {
        in: [...ACTIVE_PRODUCTION_STATUS_VALUES],
      },
    });
  }

  if (options.useActualEndDateRange) {
    const dateRange = buildDateRangeFilter(query.dateFrom, query.dateTo);

    if (dateRange) {
      andFilters.push({
        actualEndDate: dateRange,
      });
    }
  }

  return {
    AND: andFilters,
  };
};

const buildInstallationWhere = (
  query: EffectiveQuery,
  options: {
    completedOnly?: boolean;
    openOnly?: boolean;
    useScheduledDateRange?: boolean;
  } = {},
): Prisma.InstallationOrderWhereInput => {
  const andFilters: Prisma.InstallationOrderWhereInput[] = [
    {
      deletedAt: null,
    },
  ];
  const installationStatusFilter =
    query.status && INSTALLATION_STATUS_SET.has(query.status) ? query.status : null;

  if (query.clientId) {
    andFilters.push({
      clientId: query.clientId,
    });
  }

  if (query.projectId) {
    andFilters.push({
      projectId: query.projectId,
    });
  }

  if (query.responsibleId) {
    andFilters.push({
      OR: [
        {
          assignedSupervisorId: query.responsibleId,
        },
        {
          project: {
            is: {
              responsibleUserId: query.responsibleId,
            },
          },
        },
      ],
    });
  }

  if (query.salesUserId) {
    andFilters.push({
      project: {
        is: {
          salesUserId: query.salesUserId,
        },
      },
    });
  }

  if (installationStatusFilter) {
    andFilters.push({
      status: installationStatusFilter as never,
    });
  } else if (options.completedOnly) {
    andFilters.push({
      status: "COMPLETED",
    });
  } else if (options.openOnly) {
    andFilters.push({
      status: {
        in: [...ACTIVE_INSTALLATION_STATUS_VALUES],
      },
    });
  }

  if (options.useScheduledDateRange) {
    const dateRange = buildDateRangeFilter(query.dateFrom, query.dateTo);

    if (dateRange) {
      andFilters.push({
        scheduledDate: dateRange,
      });
    }
  }

  return {
    AND: andFilters,
  };
};

const buildPostventaWhere = (query: EffectiveQuery): Prisma.PostventaCaseWhereInput => {
  const andFilters: Prisma.PostventaCaseWhereInput[] = [];
  const postventaStatusFilter =
    query.status && POSTVENTA_STATUS_SET.has(query.status) ? query.status : null;
  const dateRange = buildDateRangeFilter(query.dateFrom, query.dateTo);

  if (query.clientId) {
    andFilters.push({
      clientId: query.clientId,
    });
  }

  if (query.projectId) {
    andFilters.push({
      projectId: query.projectId,
    });
  }

  if (query.responsibleId) {
    andFilters.push({
      responsibleUserId: query.responsibleId,
    });
  }

  if (query.salesUserId) {
    andFilters.push({
      project: {
        is: {
          salesUserId: query.salesUserId,
        },
      },
    });
  }

  if (postventaStatusFilter) {
    andFilters.push({
      status: postventaStatusFilter as never,
    });
  }

  if (dateRange) {
    andFilters.push({
      reportedAt: dateRange,
    });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
};

const buildInventoryWhere = (query: EffectiveQuery): Prisma.InventoryStockWhereInput => {
  const andFilters: Prisma.InventoryStockWhereInput[] = [
    {
      deletedAt: null,
    },
    {
      quantity: {
        gt: 0,
      },
    },
  ];

  if (query.warehouseId) {
    andFilters.push({
      warehouseId: query.warehouseId,
    });
  }

  return {
    AND: andFilters,
  };
};

const buildReservationWhere = (query: EffectiveQuery): Prisma.InventoryReservationWhereInput => {
  const andFilters: Prisma.InventoryReservationWhereInput[] = [
    {
      status: "ACTIVE",
    },
  ];

  if (query.warehouseId) {
    andFilters.push({
      warehouseId: query.warehouseId,
    });
  }

  if (query.projectId) {
    andFilters.push({
      projectId: query.projectId,
    });
  }

  return {
    AND: andFilters,
  };
};

const buildMetaState = (
  codigo: string,
  valorActual: number,
  meta: number | null,
): {
  estado: MetaIndicadorRecord["estado"];
  tendencia: IndicadorGestionRecord["tendencia"];
  variacion: number | null;
} => {
  if (meta === null) {
    return {
      estado: "VIGENTE",
      tendencia: "ESTABLE",
      variacion: null,
    };
  }

  const config = getMetaConfig(codigo);
  const variacion = roundTo(valorActual - meta, 4);
  const tolerance = Math.max(Math.abs(meta) * 0.05, config.unidad === "porcentaje" ? 0.01 : 0.5);

  if (config.sentido === "alto") {
    if (valorActual >= meta) {
      return {
        estado: "ALCANZADA",
        tendencia: "ALZA",
        variacion,
      };
    }

    if (valorActual >= meta - tolerance) {
      return {
        estado: "VIGENTE",
        tendencia: "ESTABLE",
        variacion,
      };
    }

    return {
      estado: "EN_RIESGO",
      tendencia: "BAJA",
      variacion,
    };
  }

  if (valorActual <= meta) {
    return {
      estado: "ALCANZADA",
      tendencia: "ALZA",
      variacion,
    };
  }

  if (valorActual <= meta + tolerance) {
    return {
      estado: "VIGENTE",
      tendencia: "ESTABLE",
      variacion,
    };
  }

  return {
    estado: "EN_RIESGO",
    tendencia: "BAJA",
    variacion,
  };
};

const createIndicador = (input: {
  categoria: IndicadorGestionRecord["categoria"];
  codigo: string;
  periodo: string;
  valorActual: number;
}): {
  indicador: IndicadorGestionRecord;
  meta: MetaIndicadorRecord;
} => {
  const metaConfig = getMetaConfig(input.codigo);
  const evaluated = buildMetaState(input.codigo, input.valorActual, metaConfig.meta);
  const indicadorId = `indicador:${input.codigo}`;

  return {
    indicador: {
      actualizadoEn: new Date().toISOString(),
      categoria: input.categoria,
      codigo: input.codigo,
      descripcion: metaConfig.descripcion,
      formula: metaConfig.formula,
      id: indicadorId,
      meta: metaConfig.meta,
      nombre: metaConfig.nombre,
      periodo: input.periodo,
      tendencia: evaluated.tendencia,
      unidad: metaConfig.unidad,
      valorActual: roundTo(input.valorActual, metaConfig.unidad === "moneda" ? 2 : 4),
      variacion: evaluated.variacion,
    },
    meta: {
      estado: evaluated.estado,
      id: `meta:${input.codigo}`,
      indicadorId,
      periodo: input.periodo,
      responsableId: null,
      valorMeta: metaConfig.meta ?? 0,
    },
  };
};

const createTarjeta = (input: {
  categoria: TarjetaIndicadorRecord["categoria"];
  codigo: string;
  descripcion: string;
  titulo: string;
  unidad: TarjetaIndicadorRecord["unidad"];
  valor: number;
}): TarjetaIndicadorRecord => {
  const evaluated = buildMetaState(input.codigo, input.valor, META_CONFIG[input.codigo]?.meta ?? null);

  return {
    categoria: input.categoria,
    codigo: input.codigo,
    descripcion: input.descripcion,
    id: `tarjeta:${input.codigo}`,
    meta: META_CONFIG[input.codigo]?.meta ?? null,
    titulo: input.titulo,
    tendencia: evaluated.tendencia,
    unidad: input.unidad,
    valor: roundTo(input.valor, input.unidad === "moneda" ? 2 : 4),
    variacion: evaluated.variacion,
  };
};

const buildSerieMap = (query: EffectiveQuery) => {
  const buckets = buildMonthlyBuckets(query.dateFrom, query.dateTo);
  return new Map(
    buckets.map((bucket) => [
      bucket.periodo,
      {
        etiqueta: bucket.etiqueta,
        periodo: bucket.periodo,
        valor: 0,
        valorSecundario: 0,
      },
    ]),
  );
};

const mapSerieValues = (
  entries: Map<string, { etiqueta: string; periodo: string; valor: number; valorSecundario: number }>,
): SerieTemporalRecord[] =>
  Array.from(entries.values()).map((item) => ({
    etiqueta: item.etiqueta,
    periodo: item.periodo,
    valor: roundTo(item.valor, 2),
    ...(item.valorSecundario > 0
      ? {
          valorSecundario: roundTo(item.valorSecundario, 2),
        }
      : {}),
  }));

const sortRanking = (items: RankingRecord[], take = 6): RankingRecord[] =>
  [...items]
    .sort((left, right) => right.valor - left.valor)
    .slice(0, take);

const buildLegacyNormalizedReportes = (query: EffectiveQuery): ReporteBIRecord[] => {
  const filtros = {
    cliente: query.clientId,
    desde: query.dateFrom,
    hasta: query.dateTo,
    proyecto: query.projectId,
    responsable: query.responsibleId,
    vendedor: query.salesUserId,
    estado: query.status,
    almacen: query.warehouseId,
  };
  const generatedAt = new Date().toISOString();

  return [
    {
      archivoUrl: null,
      filtros,
      generadoEn: generatedAt,
      generadoPor: null,
      id: "reporte-ejecutivo-pdf",
      nombre: "Reporte ejecutivo PDF",
      tipo: "Reporte PDF",
    },
    {
      archivoUrl: null,
      filtros,
      generadoEn: generatedAt,
      generadoPor: null,
      id: "reporte-comercial-pdf",
      nombre: "Reporte comercial PDF",
      tipo: "Reporte PDF",
    },
    {
      archivoUrl: null,
      filtros,
      generadoEn: generatedAt,
      generadoPor: null,
      id: "reporte-operativo-pdf",
      nombre: "Reporte operativo PDF",
      tipo: "Reporte PDF",
    },
    {
      archivoUrl: null,
      filtros,
      generadoEn: generatedAt,
      generadoPor: null,
      id: "reporte-financiero-pdf",
      nombre: "Reporte financiero PDF",
      tipo: "Reporte PDF",
    },
    {
      archivoUrl: null,
      filtros,
      generadoEn: generatedAt,
      generadoPor: null,
      id: "reporte-postventa-pdf",
      nombre: "Reporte postventa PDF",
      tipo: "Reporte PDF",
    },
    {
      archivoUrl: null,
      filtros,
      generadoEn: generatedAt,
      generadoPor: null,
      id: "indicadores-excel",
      nombre: "Exportacion Excel de indicadores",
      tipo: "Indicadores Excel",
    },
    {
      archivoUrl: null,
      filtros,
      generadoEn: generatedAt,
      generadoPor: null,
      id: "datos-base-excel",
      nombre: "Exportacion Excel de datos base",
      tipo: "Datos base Excel",
    },
  ];
};

const buildTableroRecord = (): TableroEjecutivoRecord => {
  const timestamp = new Date().toISOString();

  return {
    actualizadoEn: timestamp,
    creadoEn: "2026-07-07T00:00:00.000Z",
    creadoPor: "Sistema",
    descripcion:
      "Vista consolidada comercial, operativa, productiva y financiera para gerencia de Vidriera Sebitas ERP.",
    id: "tablero-ejecutivo-principal",
    nombre: "Panel ejecutivo principal",
    tipo: "Gerencial consolidado",
    visibleParaRoles: [...TABLERO_VISIBLE_PARA_ROLES],
  };
};

export const tablerosService = {
  async getPanelEjecutivo(query: TablerosPanelQuery): Promise<PanelEjecutivoRecord> {
    const effectiveQuery = resolveEffectiveQuery(query);
    const periodo = buildPeriodoLabel(effectiveQuery);
    const now = new Date();
    const movementWhere: Prisma.InventoryMovementWhereInput = {};
    const movementDateRange = buildDateRangeFilter(
      effectiveQuery.dateFrom,
      effectiveQuery.dateTo,
    );

    if (effectiveQuery.warehouseId) {
      movementWhere.warehouseId = effectiveQuery.warehouseId;
    }

    if (movementDateRange) {
      movementWhere.createdAt = movementDateRange;
    }

    const [
      emittedQuotations,
      acceptedPipelineQuotations,
      salesQuotations,
      activeProjectsCount,
      productionStatusRows,
      delayedProductionJobs,
      completedProductionJobs,
      installationStatusRows,
      delayedInstallations,
      completedInstallations,
      inventoryStocks,
      reservationsByMaterial,
      currentPrices,
      wasteReports,
      movementCounts,
      remnantCount,
      postventaCases,
      warrantyCount,
      profitabilityResult,
    ] = await Promise.all([
      prisma.quotation.findMany({
        select: {
          createdAt: true,
          status: true,
        },
        where: buildQuotationWhere(effectiveQuery, {
          dateField: "createdAt",
          emittedOnly: true,
        }),
      }),
      prisma.quotation.findMany({
        select: {
          createdAt: true,
        },
        where: buildQuotationWhere(effectiveQuery, {
          dateField: "createdAt",
          exactStatus: "ACCEPTED",
        }),
      }),
      prisma.quotation.findMany({
        select: {
          client: {
            select: {
              clientType: true,
              commercialName: true,
              firstName: true,
              id: true,
              lastName: true,
              legalName: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
            },
          },
          project: {
            select: {
              id: true,
              salesUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
              title: true,
            },
          },
          totalSale: true,
          updatedAt: true,
        },
        where: buildQuotationWhere(effectiveQuery, {
          dateField: "updatedAt",
          exactStatus: "ACCEPTED",
        }),
      }),
      prisma.project.count({
        where: buildProjectWhere(effectiveQuery, {
          activeOnly: true,
        }),
      }),
      prisma.productionJob.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
        where: buildProductionWhere(effectiveQuery),
      }),
      prisma.productionJob.findMany({
        orderBy: {
          plannedEndDate: "asc",
        },
        select: {
          code: true,
          id: true,
          plannedEndDate: true,
          project: {
            select: {
              title: true,
            },
          },
          status: true,
        },
        take: 5,
        where: {
          AND: [
            buildProductionWhere(effectiveQuery, {
              currentOnly: true,
            }),
            {
              plannedEndDate: {
                lt: now,
              },
            },
          ],
        },
      }),
      prisma.productionJob.findMany({
        select: {
          actualEndDate: true,
          actualStartDate: true,
          createdAt: true,
          plannedEndDate: true,
        },
        where: buildProductionWhere(effectiveQuery, {
          completedOnly: true,
          useActualEndDateRange: true,
        }),
      }),
      prisma.installationOrder.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
        where: buildInstallationWhere(effectiveQuery, {
          useScheduledDateRange: true,
        }),
      }),
      prisma.installationOrder.findMany({
        orderBy: {
          scheduledDate: "asc",
        },
        select: {
          code: true,
          id: true,
          project: {
            select: {
              title: true,
            },
          },
          scheduledDate: true,
          status: true,
        },
        take: 5,
        where: {
          AND: [
            buildInstallationWhere(effectiveQuery, {
              openOnly: true,
            }),
            {
              scheduledDate: {
                lt: now,
              },
            },
          ],
        },
      }),
      prisma.installationOrder.findMany({
        select: {
          code: true,
          scheduledDate: true,
          tasks: {
            select: {
              completedAt: true,
            },
          },
          updatedAt: true,
        },
        where: buildInstallationWhere(effectiveQuery, {
          completedOnly: true,
          useScheduledDateRange: true,
        }),
      }),
      prisma.inventoryStock.findMany({
        select: {
          id: true,
          material: {
            select: {
              code: true,
              id: true,
              name: true,
            },
          },
          materialId: true,
          quantity: true,
          warehouse: {
            select: {
              name: true,
            },
          },
        },
        where: buildInventoryWhere(effectiveQuery),
      }),
      prisma.inventoryReservation.groupBy({
        by: ["materialId"],
        _sum: {
          quantity: true,
        },
        where: buildReservationWhere(effectiveQuery),
      }),
      prisma.supplierMaterialPrice.findMany({
        select: {
          materialId: true,
          price: true,
        },
        where: {
          isCurrent: true,
        },
      }),
      prisma.productionWasteReport.findMany({
        select: {
          actualWasteAreaM2: true,
          actualWastePercent: true,
          theoreticalWastePercent: true,
        },
        where: {
          productionJob: buildProductionWhere(effectiveQuery),
        },
      }),
      prisma.inventoryMovement.findMany({
        select: {
          movementType: true,
        },
        where: movementWhere,
      }),
      prisma.remnantPiece.count({
        where: {
          ...(effectiveQuery.warehouseId
            ? {
                warehouseId: effectiveQuery.warehouseId,
              }
            : {}),
          status: {
            in: ["AVAILABLE", "RESERVED"],
          },
        },
      }),
      prisma.postventaCase.findMany({
        select: {
          caseType: true,
          closedAt: true,
          costs: {
            select: {
              amount: true,
              category: true,
              origin: true,
            },
          },
          id: true,
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          reportedAt: true,
          status: true,
        },
        where: buildPostventaWhere(effectiveQuery),
      }),
      prisma.productWarranty.count({
        where: {
          ...(effectiveQuery.clientId
            ? {
                clientId: effectiveQuery.clientId,
              }
            : {}),
          ...(effectiveQuery.projectId
            ? {
                projectId: effectiveQuery.projectId,
              }
            : {}),
          status: "VIGENTE",
        },
      }),
      projectProfitabilityService.listProjectProfitability({
        clientId: effectiveQuery.clientId ?? undefined,
        dateFrom: effectiveQuery.dateFrom,
        dateTo: effectiveQuery.dateTo,
        page: 1,
        perPage: 500,
        priority: undefined,
        projectType: undefined,
        salesUserId: effectiveQuery.salesUserId ?? undefined,
        search: "",
        sortBy: "utilidadBruta",
        sortDirection: "desc",
        status:
          effectiveQuery.status && PROJECT_STATUS_SET.has(effectiveQuery.status)
            ? (effectiveQuery.status as never)
            : undefined,
      }),
    ]);

    const profitabilityRows = profitabilityResult.data.filter((row) => {
      if (effectiveQuery.projectId && row.proyecto.id !== effectiveQuery.projectId) {
        return false;
      }

      if (
        effectiveQuery.responsibleId &&
        row.proyecto.responsibleUser?.id !== effectiveQuery.responsibleId
      ) {
        return false;
      }

      return true;
    });

    const ventasPorPeriodoMap = buildSerieMap(effectiveQuery);
    salesQuotations.forEach((quotation) => {
      const bucket = ventasPorPeriodoMap.get(getMonthKey(quotation.updatedAt));

      if (!bucket) {
        return;
      }

      bucket.valor += decimalToNumber(quotation.totalSale);
    });

    const conversionMap = buildSerieMap(effectiveQuery);
    emittedQuotations.forEach((quotation) => {
      const bucket = conversionMap.get(getMonthKey(quotation.createdAt));

      if (!bucket) {
        return;
      }

      bucket.valor += 1;
    });

    acceptedPipelineQuotations.forEach((quotation) => {
      const bucket = conversionMap.get(getMonthKey(quotation.createdAt));

      if (!bucket) {
        return;
      }

      bucket.valorSecundario += 1;
    });

    const ventasPorCliente = new Map<
      string,
      { descripcion: string; etiqueta: string; id: string; secundario: string | null; valor: number }
    >();
    const ventasPorVendedor = new Map<
      string,
      { descripcion: string; etiqueta: string; id: string; secundario: string | null; valor: number }
    >();

    salesQuotations.forEach((quotation) => {
      const monto = decimalToNumber(quotation.totalSale);
      const cliente = buildClientDisplayName(quotation.client);
      const vendedorId =
        quotation.project?.salesUser?.id ??
        quotation.createdByUser?.id ??
        "sin-vendedor";
      const vendedorNombre =
        quotation.project?.salesUser?.name ??
        quotation.createdByUser?.name ??
        "Sin vendedor asignado";

      ventasPorCliente.set(quotation.client.id, {
        descripcion: "Ventas acumuladas del periodo",
        etiqueta: cliente,
        id: quotation.client.id,
        secundario: quotation.project?.title ?? null,
        valor:
          (ventasPorCliente.get(quotation.client.id)?.valor ?? 0) +
          monto,
      });

      ventasPorVendedor.set(vendedorId, {
        descripcion: "Ventas acumuladas por responsable comercial",
        etiqueta: vendedorNombre,
        id: vendedorId,
        secundario: quotation.project?.title ?? null,
        valor: (ventasPorVendedor.get(vendedorId)?.valor ?? 0) + monto,
      });
    });

    const cotizacionesPorEstadoBase = new Map<string, number>();
    emittedQuotations.forEach((quotation) => {
      cotizacionesPorEstadoBase.set(
        quotation.status,
        (cotizacionesPorEstadoBase.get(quotation.status) ?? 0) + 1,
      );
    });

    const cotizacionesPorEstado: SerieValorRecord[] = [
      {
        color: CHART_COLORS.accent,
        etiqueta: "Aceptadas",
        porcentaje: roundTo(
          safeDivide(acceptedPipelineQuotations.length, Math.max(emittedQuotations.length, 1)),
          4,
        ),
        valor: acceptedPipelineQuotations.length,
      },
      {
        color: CHART_COLORS.rose,
        etiqueta: "Perdidas",
        porcentaje: roundTo(
          safeDivide(
            emittedQuotations.filter((quotation) => LOST_QUOTATION_STATUSES.has(quotation.status)).length,
            Math.max(emittedQuotations.length, 1),
          ),
          4,
        ),
        valor: emittedQuotations.filter((quotation) => LOST_QUOTATION_STATUSES.has(quotation.status)).length,
      },
      {
        color: CHART_COLORS.slate,
        etiqueta: "En seguimiento",
        porcentaje: roundTo(
          safeDivide(
            emittedQuotations.filter(
              (quotation) =>
                quotation.status === "SENT" ||
                quotation.status === "APPROVED" ||
                quotation.status === "PENDING_APPROVAL",
            ).length,
            Math.max(emittedQuotations.length, 1),
          ),
          4,
        ),
        valor: emittedQuotations.filter(
          (quotation) =>
            quotation.status === "SENT" ||
            quotation.status === "APPROVED" ||
            quotation.status === "PENDING_APPROVAL",
        ).length,
      },
    ];

    const proyectosGanados = acceptedPipelineQuotations.length;
    const proyectosPerdidos = emittedQuotations.filter((quotation) =>
      LOST_QUOTATION_STATUSES.has(quotation.status),
    ).length;
    const cotizacionesEnSeguimiento = Math.max(
      emittedQuotations.length - proyectosGanados - proyectosPerdidos,
      0,
    );

    const ordenesTrabajoActivas = productionStatusRows.reduce((sum, row) => {
      return ACTIVE_PRODUCTION_STATUSES.has(row.status)
        ? sum + row._count._all
        : sum;
    }, 0);

    const produccionAtrasada = delayedProductionJobs.length;

    const instalacionesProgramadas = installationStatusRows.reduce((sum, row) => {
      return ACTIVE_INSTALLATION_STATUSES.has(row.status)
        ? sum + row._count._all
        : sum;
    }, 0);

    const instalacionesAtrasadas = delayedInstallations.length;

    const productionDurations = completedProductionJobs
      .map((job) => {
        const startAt = job.actualStartDate ?? job.createdAt;
        const endAt = job.actualEndDate;

        if (!endAt) {
          return null;
        }

        return (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((value): value is number => value !== null);

    const tiempoPromedioProduccion = roundTo(
      productionDurations.reduce((sum, value) => sum + value, 0) /
        Math.max(productionDurations.length, 1),
      2,
    );

    const instalacionesConCierre = completedInstallations
      .map((order) => {
        const lastTaskAt = order.tasks.reduce<Date | null>((latest, task) => {
          if (!task.completedAt) {
            return latest;
          }

          if (!latest || task.completedAt > latest) {
            return task.completedAt;
          }

          return latest;
        }, null);
        const closedAt = lastTaskAt ?? order.updatedAt;

        return {
          closedAt,
          scheduledDate: order.scheduledDate,
        };
      })
      .filter((entry) => entry.closedAt !== null);

    const tiempoPromedioInstalacion = roundTo(
      instalacionesConCierre.reduce((sum, entry) => {
        return (
          sum +
          (entry.closedAt.getTime() - entry.scheduledDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }, 0) / Math.max(instalacionesConCierre.length, 1),
      2,
    );

    const cumplimientoProduccion = roundTo(
      safeDivide(
        completedProductionJobs.filter(
          (job) =>
            Boolean(job.actualEndDate && job.plannedEndDate) &&
            job.actualEndDate!.getTime() <= job.plannedEndDate!.getTime(),
        ).length,
        completedProductionJobs.filter((job) => Boolean(job.actualEndDate && job.plannedEndDate))
          .length,
      ),
      4,
    );

    const cumplimientoInstalacion = roundTo(
      safeDivide(
        instalacionesConCierre.filter(
          (entry) => entry.closedAt.getTime() <= entry.scheduledDate.getTime() + 24 * 60 * 60 * 1000,
        ).length,
        instalacionesConCierre.length,
      ),
      4,
    );

    const cumplimientoFechas = roundTo(
      safeDivide(
        cumplimientoProduccion + cumplimientoInstalacion,
        [cumplimientoProduccion, cumplimientoInstalacion].filter((value) => value > 0).length || 1,
      ),
      4,
    );

    const reservationMap = new Map(
      reservationsByMaterial.map((row) => [row.materialId, decimalToNumber(row._sum.quantity)]),
    );
    const priceMap = new Map<string, number>();
    currentPrices.forEach((row) => {
      priceMap.set(row.materialId, decimalToNumber(row.price));
    });

    const stockByMaterial = new Map<
      string,
      {
        disponible: number;
        id: string;
        materialCode: string;
        materialName: string;
        reservado: number;
        warehouseNames: Set<string>;
      }
    >();
    let valorTotalInventario = 0;

    inventoryStocks.forEach((stock) => {
      const existing = stockByMaterial.get(stock.materialId) ?? {
        disponible: 0,
        id: stock.materialId,
        materialCode: stock.material.code,
        materialName: stock.material.name,
        reservado: reservationMap.get(stock.materialId) ?? 0,
        warehouseNames: new Set<string>(),
      };
      const quantity = decimalToNumber(stock.quantity);

      existing.disponible += quantity;
      existing.warehouseNames.add(stock.warehouse.name);
      stockByMaterial.set(stock.materialId, existing);
      valorTotalInventario += quantity * (priceMap.get(stock.materialId) ?? 0);
    });

    const stockBajoRanking = sortRanking(
      Array.from(stockByMaterial.values())
        .map((entry) => {
          const saldo = roundTo(entry.disponible - entry.reservado, 4);

          return {
            descripcion: `Reservado ${roundTo(entry.reservado, 2)} · Almacenes ${Array.from(entry.warehouseNames).join(", ")}`,
            etiqueta: `${entry.materialCode} · ${entry.materialName}`,
            id: entry.id,
            secundario: saldo <= 1 ? "Requiere reposicion" : "Con cobertura",
            valor: saldo,
          };
        })
        .filter((entry) => entry.valor <= 1),
      6,
    );

    const materialesCriticos = stockBajoRanking.length;
    const movimientosSalida = movementCounts.reduce((sum, row) => {
      return ["OUT", "TRANSFER", "DAMAGE", "SCRAP"].includes(row.movementType)
        ? sum + 1
        : sum;
    }, 0);
    const rotacionInventario = roundTo(
      safeDivide(movimientosSalida, Math.max(stockByMaterial.size, 1)),
      2,
    );

    const desperdicioGenerado = roundTo(
      wasteReports.reduce((sum, report) => sum + decimalToNumber(report.actualWasteAreaM2), 0),
      2,
    );

    const rentabilidadFiltrada = profitabilityRows;
    const ingresoPresupuestado = roundTo(
      rentabilidadFiltrada.reduce(
        (sum, row) => sum + row.rentabilidad.ingresoPresupuestado,
        0,
      ),
      2,
    );
    const ingresoReal = roundTo(
      rentabilidadFiltrada.reduce((sum, row) => sum + row.rentabilidad.ingresoReal, 0),
      2,
    );
    const costosReales = roundTo(
      rentabilidadFiltrada.reduce(
        (sum, row) => sum + row.rentabilidad.totalCostoReal,
        0,
      ),
      2,
    );
    const utilidadBruta = roundTo(
      rentabilidadFiltrada.reduce(
        (sum, row) => sum + row.rentabilidad.utilidadBruta,
        0,
      ),
      2,
    );
    const margenBruto = roundTo(
      safeDivide(utilidadBruta, Math.max(ingresoReal, 1)),
      4,
    );
    const margenPromedio = roundTo(
      safeDivide(
        rentabilidadFiltrada.reduce((sum, row) => sum + row.rentabilidad.margenBruto, 0),
        Math.max(rentabilidadFiltrada.length, 1),
      ),
      4,
    );
    const desperdicioPromedio = roundTo(
      safeDivide(
        rentabilidadFiltrada.reduce(
          (sum, row) => sum + row.rentabilidad.desperdicioReal,
          0,
        ),
        Math.max(rentabilidadFiltrada.length, 1),
      ),
      4,
    );
    const proyectosEnPerdida = rentabilidadFiltrada.filter(
      (row) => row.indicadores.rentabilidadPorProyecto < 0,
    ).length;
    const desviacionPresupuesto = roundTo(
      rentabilidadFiltrada.reduce(
        (sum, row) => sum + row.rentabilidad.diferenciaContraPresupuesto,
        0,
      ),
      2,
    );

    const proyectosEnPerdidaRanking = sortRanking(
      rentabilidadFiltrada
        .filter((row) => row.indicadores.rentabilidadPorProyecto < 0)
        .map((row) => ({
          descripcion: `Margen ${roundTo(row.rentabilidad.margenBruto * 100, 2)}%`,
          etiqueta: `${row.proyecto.code} · ${row.proyecto.title}`,
          id: row.proyecto.id,
          secundario: row.proyecto.client.displayName,
          valor: roundTo(Math.abs(row.rentabilidad.utilidadBruta), 2),
        })),
      6,
    );

    const desviacionProyectos = sortRanking(
      rentabilidadFiltrada.map((row) => ({
        descripcion: `Presupuestado ${roundTo(row.rentabilidad.ingresoPresupuestado, 2)}`,
        etiqueta: `${row.proyecto.code} · ${row.proyecto.title}`,
        id: row.proyecto.id,
        secundario: row.proyecto.client.displayName,
        valor: roundTo(Math.abs(row.rentabilidad.diferenciaContraPresupuesto), 2),
      })),
      6,
    );

    const postventaAbiertos = postventaCases.filter((item) =>
      OPEN_POSTVENTA_STATUSES.has(item.status),
    ).length;
    const postventaCerrados = postventaCases.filter(
      (item) => item.status === "CERRADO" || item.closedAt !== null,
    ).length;
    const tiemposResolucion = postventaCases
      .filter((item) => item.closedAt !== null)
      .map((item) => {
        return (item.closedAt!.getTime() - item.reportedAt.getTime()) / (1000 * 60 * 60 * 24);
      });
    const tiempoResolucionPromedio = roundTo(
      tiemposResolucion.reduce((sum, value) => sum + value, 0) /
        Math.max(tiemposResolucion.length, 1),
      2,
    );
    const costosGarantia = roundTo(
      postventaCases.reduce((sum, item) => {
        return (
          sum +
          item.costs.reduce((innerSum, cost) => {
            if (cost.category === "GARANTIA" || cost.origin === "GARANTIA") {
              return innerSum + decimalToNumber(cost.amount);
            }

            return innerSum;
          }, 0)
        );
      }, 0),
      2,
    );

    const reclamosPorTipoMap = new Map<string, number>();
    const reclamosPorProyectoMap = new Map<
      string,
      { casos: number; costo: number; etiqueta: string; id: string }
    >();

    postventaCases.forEach((item) => {
      reclamosPorTipoMap.set(item.caseType, (reclamosPorTipoMap.get(item.caseType) ?? 0) + 1);

      const proyectoId = item.project?.id ?? "sin-proyecto";
      const proyectoLabel = item.project?.title ?? "Sin proyecto";
      const costo = item.costs.reduce((sum, cost) => sum + decimalToNumber(cost.amount), 0);
      const current = reclamosPorProyectoMap.get(proyectoId) ?? {
        casos: 0,
        costo: 0,
        etiqueta: proyectoLabel,
        id: proyectoId,
      };

      current.casos += 1;
      current.costo += costo;
      reclamosPorProyectoMap.set(proyectoId, current);
    });

    const indicadoresConMeta = [
      createIndicador({
        categoria: "Comercial",
        codigo: "ventas_periodo",
        periodo,
        valorActual: salesQuotations.reduce((sum, quotation) => sum + decimalToNumber(quotation.totalSale), 0),
      }),
      createIndicador({
        categoria: "Comercial",
        codigo: "cotizaciones_emitidas",
        periodo,
        valorActual: emittedQuotations.length,
      }),
      createIndicador({
        categoria: "Comercial",
        codigo: "cotizaciones_aprobadas",
        periodo,
        valorActual: acceptedPipelineQuotations.length,
      }),
      createIndicador({
        categoria: "Comercial",
        codigo: "conversion_cotizaciones",
        periodo,
        valorActual: roundTo(
          safeDivide(acceptedPipelineQuotations.length, Math.max(emittedQuotations.length, 1)),
          4,
        ),
      }),
      createIndicador({
        categoria: "Comercial",
        codigo: "proyectos_ganados",
        periodo,
        valorActual: proyectosGanados,
      }),
      createIndicador({
        categoria: "Comercial",
        codigo: "proyectos_perdidos",
        periodo,
        valorActual: proyectosPerdidos,
      }),
      createIndicador({
        categoria: "Operaciones",
        codigo: "ordenes_trabajo_activas",
        periodo,
        valorActual: ordenesTrabajoActivas,
      }),
      createIndicador({
        categoria: "Produccion",
        codigo: "produccion_atrasada",
        periodo,
        valorActual: produccionAtrasada,
      }),
      createIndicador({
        categoria: "Instalaciones",
        codigo: "instalaciones_atrasadas",
        periodo,
        valorActual: instalacionesAtrasadas,
      }),
      createIndicador({
        categoria: "Produccion",
        codigo: "tiempo_produccion_promedio",
        periodo,
        valorActual: tiempoPromedioProduccion,
      }),
      createIndicador({
        categoria: "Instalaciones",
        codigo: "tiempo_instalacion_promedio",
        periodo,
        valorActual: tiempoPromedioInstalacion,
      }),
      createIndicador({
        categoria: "Operaciones",
        codigo: "cumplimiento_fechas",
        periodo,
        valorActual: cumplimientoFechas,
      }),
      createIndicador({
        categoria: "Inventario",
        codigo: "valor_total_inventario",
        periodo,
        valorActual: valorTotalInventario,
      }),
      createIndicador({
        categoria: "Inventario",
        codigo: "materiales_criticos",
        periodo,
        valorActual: materialesCriticos,
      }),
      createIndicador({
        categoria: "Inventario",
        codigo: "stock_bajo",
        periodo,
        valorActual: stockBajoRanking.length,
      }),
      createIndicador({
        categoria: "Inventario",
        codigo: "remanentes_disponibles",
        periodo,
        valorActual: remnantCount,
      }),
      createIndicador({
        categoria: "Inventario",
        codigo: "desperdicio_generado",
        periodo,
        valorActual: desperdicioGenerado,
      }),
      createIndicador({
        categoria: "Inventario",
        codigo: "rotacion_inventario",
        periodo,
        valorActual: rotacionInventario,
      }),
      createIndicador({
        categoria: "Rentabilidad",
        codigo: "ingreso_presupuestado",
        periodo,
        valorActual: ingresoPresupuestado,
      }),
      createIndicador({
        categoria: "Rentabilidad",
        codigo: "ingreso_real",
        periodo,
        valorActual: ingresoReal,
      }),
      createIndicador({
        categoria: "Rentabilidad",
        codigo: "costos_reales",
        periodo,
        valorActual: costosReales,
      }),
      createIndicador({
        categoria: "Rentabilidad",
        codigo: "utilidad_bruta",
        periodo,
        valorActual: utilidadBruta,
      }),
      createIndicador({
        categoria: "Rentabilidad",
        codigo: "margen_bruto",
        periodo,
        valorActual: margenBruto,
      }),
      createIndicador({
        categoria: "Rentabilidad",
        codigo: "proyectos_en_perdida",
        periodo,
        valorActual: proyectosEnPerdida,
      }),
      createIndicador({
        categoria: "Rentabilidad",
        codigo: "desviacion_presupuesto",
        periodo,
        valorActual: desviacionPresupuesto,
      }),
      createIndicador({
        categoria: "Postventa",
        codigo: "casos_postventa_abiertos",
        periodo,
        valorActual: postventaAbiertos,
      }),
      createIndicador({
        categoria: "Postventa",
        codigo: "tiempo_resolucion_postventa",
        periodo,
        valorActual: tiempoResolucionPromedio,
      }),
    ];

    const indicadores = indicadoresConMeta.map((entry) => entry.indicador);
    const metas = indicadoresConMeta
      .filter((entry) => entry.indicador.meta !== null)
      .map((entry) => entry.meta);

    const tarjetas: TarjetaIndicadorRecord[] = [
      createTarjeta({
        categoria: "Comercial",
        codigo: "ventas_periodo",
        descripcion: "Ventas aceptadas dentro del periodo visible.",
        titulo: "Ventas del mes",
        unidad: "moneda",
        valor: salesQuotations.reduce((sum, quotation) => sum + decimalToNumber(quotation.totalSale), 0),
      }),
      createTarjeta({
        categoria: "Comercial",
        codigo: "cotizaciones_emitidas",
        descripcion: "Cotizaciones compartidas con cliente en el periodo.",
        titulo: "Cotizaciones emitidas",
        unidad: "numero",
        valor: emittedQuotations.length,
      }),
      createTarjeta({
        categoria: "Comercial",
        codigo: "cotizaciones_aprobadas",
        descripcion: "Cotizaciones convertidas en negocio ganado.",
        titulo: "Cotizaciones aprobadas",
        unidad: "numero",
        valor: acceptedPipelineQuotations.length,
      }),
      createTarjeta({
        categoria: "Comercial",
        codigo: "conversion_cotizaciones",
        descripcion: "Relacion entre emitidas y aceptadas.",
        titulo: "Tasa de conversion",
        unidad: "porcentaje",
        valor: roundTo(
          safeDivide(acceptedPipelineQuotations.length, Math.max(emittedQuotations.length, 1)),
          4,
        ),
      }),
      createTarjeta({
        categoria: "Operaciones",
        codigo: "proyectos_activos",
        descripcion: "Proyectos que siguen en curso.",
        titulo: "Proyectos activos",
        unidad: "numero",
        valor: activeProjectsCount,
      }),
      createTarjeta({
        categoria: "Produccion",
        codigo: "produccion_pendiente",
        descripcion: "Ordenes que todavia no se completan.",
        titulo: "Produccion pendiente",
        unidad: "numero",
        valor: ordenesTrabajoActivas,
      }),
      createTarjeta({
        categoria: "Instalaciones",
        codigo: "instalaciones_programadas",
        descripcion: "Instalaciones programadas en el rango visible.",
        titulo: "Instalaciones programadas",
        unidad: "numero",
        valor: instalacionesProgramadas,
      }),
      createTarjeta({
        categoria: "Rentabilidad",
        codigo: "margen_promedio",
        descripcion: "Margen promedio del portafolio visible.",
        titulo: "Margen promedio",
        unidad: "porcentaje",
        valor: margenPromedio,
      }),
      createTarjeta({
        categoria: "Produccion",
        codigo: "desperdicio_promedio",
        descripcion: "Desperdicio promedio calculado para los proyectos visibles.",
        titulo: "Desperdicio promedio",
        unidad: "porcentaje",
        valor: desperdicioPromedio,
      }),
      createTarjeta({
        categoria: "Postventa",
        codigo: "casos_postventa_abiertos",
        descripcion: "Casos que requieren seguimiento o cierre.",
        titulo: "Casos postventa abiertos",
        unidad: "numero",
        valor: postventaAbiertos,
      }),
    ];

    return {
      actualizadoEn: new Date().toISOString(),
      filtrosAplicados: effectiveQuery,
      indicadores,
      metas,
      reportes: buildLegacyNormalizedReportes(effectiveQuery),
      secciones: {
        comercial: {
          conversion: {
            aprobadas: acceptedPipelineQuotations.length,
            emitidas: emittedQuotations.length,
            tasa: roundTo(
              safeDivide(acceptedPipelineQuotations.length, Math.max(emittedQuotations.length, 1)),
              4,
            ),
          },
          cotizacionesPorEstado,
          proyectosResultado: [
            {
              color: CHART_COLORS.emerald,
              etiqueta: "Ganados",
              porcentaje: roundTo(
                safeDivide(proyectosGanados, Math.max(emittedQuotations.length, 1)),
                4,
              ),
              valor: proyectosGanados,
            },
            {
              color: CHART_COLORS.rose,
              etiqueta: "Perdidos",
              porcentaje: roundTo(
                safeDivide(proyectosPerdidos, Math.max(emittedQuotations.length, 1)),
                4,
              ),
              valor: proyectosPerdidos,
            },
            {
              color: CHART_COLORS.slate,
              etiqueta: "En seguimiento",
              porcentaje: roundTo(
                safeDivide(cotizacionesEnSeguimiento, Math.max(emittedQuotations.length, 1)),
                4,
              ),
              valor: cotizacionesEnSeguimiento,
            },
          ],
          ventasPorCliente: sortRanking(Array.from(ventasPorCliente.values())),
          ventasPorPeriodo: mapSerieValues(ventasPorPeriodoMap),
          ventasPorVendedor: sortRanking(Array.from(ventasPorVendedor.values())),
        },
        financiero: {
          desviacionProyectos,
          proyectosEnPerdida: proyectosEnPerdidaRanking,
          resumen: [
            {
              color: CHART_COLORS.accent,
              etiqueta: "Ingreso presupuestado",
              porcentaje: ingresoReal > 0 ? roundTo(safeDivide(ingresoPresupuestado, ingresoReal), 4) : null,
              valor: ingresoPresupuestado,
            },
            {
              color: CHART_COLORS.cyan,
              etiqueta: "Ingreso real",
              porcentaje: ingresoReal > 0 ? 1 : null,
              valor: ingresoReal,
            },
            {
              color: CHART_COLORS.amber,
              etiqueta: "Costos reales",
              porcentaje: ingresoReal > 0 ? roundTo(safeDivide(costosReales, ingresoReal), 4) : null,
              valor: costosReales,
            },
            {
              color: CHART_COLORS.emerald,
              etiqueta: "Utilidad bruta",
              porcentaje: ingresoReal > 0 ? roundTo(safeDivide(utilidadBruta, ingresoReal), 4) : null,
              valor: utilidadBruta,
            },
          ],
        },
        inventario: {
          materialesCriticos: stockBajoRanking,
          rotacion: [
            {
              color: CHART_COLORS.accent,
              etiqueta: "Movimientos de salida",
              porcentaje: null,
              valor: movimientosSalida,
            },
            {
              color: CHART_COLORS.cyan,
              etiqueta: "Materiales con stock",
              porcentaje: null,
              valor: stockByMaterial.size,
            },
            {
              color: CHART_COLORS.amber,
              etiqueta: "Reservas activas",
              porcentaje: null,
              valor: reservationsByMaterial.length,
            },
            {
              color: CHART_COLORS.emerald,
              etiqueta: "Remanentes disponibles",
              porcentaje: null,
              valor: remnantCount,
            },
          ],
          stockBajo: stockBajoRanking,
          resumen: [
            {
              detalle: "Estimado con precios actuales conocidos",
              etiqueta: "Valor total de inventario",
              meta: null,
              unidad: "moneda",
              valor: valorTotalInventario,
            },
            {
              detalle: "Materiales con saldo disponible igual o menor a uno",
              etiqueta: "Materiales criticos",
              meta: getMetaConfig("materiales_criticos").meta,
              unidad: "numero",
              valor: materialesCriticos,
            },
            {
              detalle: "Materiales hoy bajo cobertura minima",
              etiqueta: "Stock bajo",
              meta: getMetaConfig("stock_bajo").meta,
              unidad: "numero",
              valor: stockBajoRanking.length,
            },
            {
              detalle: "Piezas reutilizables listas para nuevo uso",
              etiqueta: "Remanentes disponibles",
              meta: getMetaConfig("remanentes_disponibles").meta,
              unidad: "numero",
              valor: remnantCount,
            },
            {
              detalle: "Merma real acumulada segun produccion",
              etiqueta: "Desperdicio generado",
              meta: getMetaConfig("desperdicio_generado").meta,
              unidad: "numero",
              valor: desperdicioGenerado,
            },
            {
              detalle: "Rotacion relativa del periodo",
              etiqueta: "Rotacion de inventario",
              meta: getMetaConfig("rotacion_inventario").meta,
              unidad: "veces",
              valor: rotacionInventario,
            },
          ],
        },
        operaciones: {
          alertasOperativas: [
            ...delayedProductionJobs.map((job) => ({
              descripcion: `Produccion con fecha planificada vencida`,
              etiqueta: `Produccion ${job.code}`,
              id: job.id,
              secundario: job.project?.title ?? null,
              valor:
                job.plannedEndDate
                  ? roundTo((now.getTime() - job.plannedEndDate.getTime()) / (1000 * 60 * 60 * 24), 2)
                  : 0,
            })),
            ...delayedInstallations.map((order) => ({
              descripcion: `Instalacion programada sin cierre`,
              etiqueta: `Instalacion ${order.code}`,
              id: order.id,
              secundario: order.project?.title ?? null,
              valor: roundTo((now.getTime() - order.scheduledDate.getTime()) / (1000 * 60 * 60 * 24), 2),
            })),
          ]
            .sort((left, right) => right.valor - left.valor)
            .slice(0, 6),
          cumplimiento: [
            {
              detalle: "Ordenes de trabajo listas o en ejecucion",
              etiqueta: "Ordenes de trabajo activas",
              meta: getMetaConfig("ordenes_trabajo_activas").meta,
              unidad: "numero",
              valor: ordenesTrabajoActivas,
            },
            {
              detalle: "Ordenes productivas vencidas al dia de hoy",
              etiqueta: "Produccion atrasada",
              meta: getMetaConfig("produccion_atrasada").meta,
              unidad: "numero",
              valor: produccionAtrasada,
            },
            {
              detalle: "Instalaciones con fecha programada vencida",
              etiqueta: "Instalaciones atrasadas",
              meta: getMetaConfig("instalaciones_atrasadas").meta,
              unidad: "numero",
              valor: instalacionesAtrasadas,
            },
            {
              detalle: "Promedio de dias para completar produccion",
              etiqueta: "Tiempo promedio de produccion",
              meta: getMetaConfig("tiempo_produccion_promedio").meta,
              unidad: "dias",
              valor: tiempoPromedioProduccion,
            },
            {
              detalle: "Promedio de dias entre programacion y cierre",
              etiqueta: "Tiempo promedio de instalacion",
              meta: getMetaConfig("tiempo_instalacion_promedio").meta,
              unidad: "dias",
              valor: tiempoPromedioInstalacion,
            },
            {
              detalle: "Cumplimiento combinado de produccion e instalaciones",
              etiqueta: "Cumplimiento de fechas",
              meta: getMetaConfig("cumplimiento_fechas").meta,
              unidad: "porcentaje",
              valor: cumplimientoFechas,
            },
          ],
          instalacionesPorEstado: installationStatusRows.map((row) => ({
            color:
              row.status === "COMPLETED"
                ? CHART_COLORS.emerald
                : row.status === "CANCELLED"
                  ? CHART_COLORS.rose
                  : CHART_COLORS.accent,
            etiqueta: row.status,
            porcentaje: roundTo(
              safeDivide(
                row._count._all,
                Math.max(
                  installationStatusRows.reduce((sum, item) => sum + item._count._all, 0),
                  1,
                ),
              ),
              4,
            ),
            valor: row._count._all,
          })),
          ordenesTrabajoPorEstado: productionStatusRows.map((row) => ({
            color:
              row.status === "COMPLETED"
                ? CHART_COLORS.emerald
                : row.status === "CANCELLED"
                  ? CHART_COLORS.rose
                  : CHART_COLORS.accent,
            etiqueta: row.status,
            porcentaje: roundTo(
              safeDivide(
                row._count._all,
                Math.max(
                  productionStatusRows.reduce((sum, item) => sum + item._count._all, 0),
                  1,
                ),
              ),
              4,
            ),
            valor: row._count._all,
          })),
        },
        postventa: {
          estados: [
            {
              color: CHART_COLORS.rose,
              etiqueta: "Abiertos",
              porcentaje: roundTo(
                safeDivide(postventaAbiertos, Math.max(postventaCases.length, 1)),
                4,
              ),
              valor: postventaAbiertos,
            },
            {
              color: CHART_COLORS.emerald,
              etiqueta: "Cerrados",
              porcentaje: roundTo(
                safeDivide(postventaCerrados, Math.max(postventaCases.length, 1)),
                4,
              ),
              valor: postventaCerrados,
            },
            {
              color: CHART_COLORS.cyan,
              etiqueta: "Garantias vigentes",
              porcentaje: null,
              valor: warrantyCount,
            },
          ],
          reclamosPorProyecto: sortRanking(
            Array.from(reclamosPorProyectoMap.values()).map((entry) => ({
              descripcion: `Costo acumulado ${roundTo(entry.costo, 2)}`,
              etiqueta: entry.etiqueta,
              id: entry.id,
              secundario: `${entry.casos} casos`,
              valor: entry.casos,
            })),
          ),
          reclamosPorTipo: Array.from(reclamosPorTipoMap.entries()).map(([tipo, cantidad]) => ({
            color:
              tipo === "GARANTIA"
                ? CHART_COLORS.accent
                : tipo === "RECLAMO"
                  ? CHART_COLORS.rose
                  : CHART_COLORS.slate,
            etiqueta: tipo,
            porcentaje: roundTo(
              safeDivide(cantidad, Math.max(postventaCases.length, 1)),
              4,
            ),
            valor: cantidad,
          })),
          resumen: [
            {
              detalle: "Casos con atencion o cierre pendiente",
              etiqueta: "Casos abiertos",
              meta: getMetaConfig("casos_postventa_abiertos").meta,
              unidad: "numero",
              valor: postventaAbiertos,
            },
            {
              detalle: "Casos efectivamente cerrados en el periodo",
              etiqueta: "Casos cerrados",
              meta: null,
              unidad: "numero",
              valor: postventaCerrados,
            },
            {
              detalle: "Promedio de dias entre reporte y cierre",
              etiqueta: "Tiempo promedio de resolucion",
              meta: getMetaConfig("tiempo_resolucion_postventa").meta,
              unidad: "dias",
              valor: tiempoResolucionPromedio,
            },
            {
              detalle: "Costos asociados a garantia",
              etiqueta: "Costos por garantia",
              meta: null,
              unidad: "moneda",
              valor: costosGarantia,
            },
          ],
        },
      },
      tablero: buildTableroRecord(),
      tarjetas,
    };
  },
};
