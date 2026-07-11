export const PROJECT_PROFITABILITY_API_PATH = "/project-profitability";
export const PROJECT_PROFITABILITY_DASHBOARD_API_PATH =
  "/project-profitability/dashboard";

export const PROJECT_PROFITABILITY_PERMISSIONS = {
  analyze: "rentabilidad.analizar",
  export: "rentabilidad.exportar",
  view: "rentabilidad.ver",
} as const;

export const RENTABILIDAD_PROYECTO_ESTADOS = [
  "EN_EJECUCION",
  "PENDIENTE_DE_CIERRE",
  "CERRADO",
  "ANALIZADO",
] as const;

export const COSTO_PROYECTO_CATEGORIAS = [
  "MATERIALES",
  "MANO_DE_OBRA",
  "PRODUCCION",
  "INSTALACION",
  "COMPRAS",
  "TRANSPORTE",
  "GARANTIAS",
  "RECLAMOS",
  "REPOSICIONES",
  "OTROS",
] as const;

export const COSTO_PROYECTO_ORIGENES = [
  "COTIZACION",
  "ORDEN_COMPRA",
  "RECEPCION",
  "CONSUMO_INVENTARIO",
  "PRODUCCION",
  "INSTALACION",
  "GARANTIA",
  "POSTVENTA",
  "OPTIMIZACION",
  "DERIVADO",
  "OTRO",
] as const;

export const EVENTO_RENTABILIDAD_TIPOS = [
  "COTIZACION_BASE",
  "COSTO_REAL",
  "DESPERDICIO",
  "ALERTA",
  "PRODUCCION",
  "INSTALACION",
  "COMPRA",
  "RECEPCION",
  "POSTVENTA",
] as const;

export const ALERTA_RENTABILIDAD_TIPOS = [
  "MARGEN_BAJO",
  "SOBRECOSTO",
  "DESPERDICIO_EXCEDIDO",
  "PROYECTO_EN_PERDIDA",
] as const;

export const RENTABILIDAD_ENTITY_TYPES = {
  costoProyecto: "rentabilidad_costo_proyecto",
  eventoRentabilidad: "rentabilidad_evento",
  rentabilidadProyecto: "rentabilidad_proyecto",
} as const;
