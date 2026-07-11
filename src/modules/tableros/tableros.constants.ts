export const TABLEROS_API_PATH = "/tableros";
export const TABLEROS_PANEL_API_PATH = "/tableros/panel-ejecutivo";

export const TABLEROS_PERMISSIONS = {
  configurar: "tableros.configurar",
  exportar: "tableros.exportar",
  ver: "tableros.ver",
} as const;

export const INDICADORES_PERMISSIONS = {
  configurar: "indicadores.configurar",
  ver: "indicadores.ver",
} as const;

export const REPORTES_BI_PERMISSIONS = {
  exportar: "reportes.exportar",
  ver: "reportes.ver",
} as const;

export const LEGACY_REPORT_PERMISSIONS = {
  exportar: "reports.export",
  ver: "reports.read",
} as const;

export const TABLERO_CATEGORIAS = [
  "Comercial",
  "Operaciones",
  "Produccion",
  "Inventario",
  "Compras",
  "Instalaciones",
  "Rentabilidad",
  "Postventa",
] as const;

export const TABLERO_VISIBLE_PARA_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "ACCOUNTING",
  "READ_ONLY",
] as const;
