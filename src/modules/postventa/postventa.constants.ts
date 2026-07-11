export const POSTVENTA_CASES_API_PATH = "/postventa/casos";
export const POSTVENTA_WARRANTIES_API_PATH = "/postventa/garantias";
export const POSTVENTA_ACTIVITIES_API_PATH = "/postventa/actividades";
export const POSTVENTA_RESERVATIONS_API_PATH = "/postventa/reservas";

export const POSTVENTA_PERMISSIONS = {
  asignar: "postventa.asignar",
  actualizar: "postventa.actualizar",
  cerrar: "postventa.cerrar",
  crear: "postventa.crear",
  exportar: "postventa.exportar",
  ver: "postventa.ver",
} as const;

export const GARANTIAS_PERMISSIONS = {
  actualizar: "garantias.actualizar",
  crear: "garantias.crear",
  ver: "garantias.ver",
} as const;

export const POSTVENTA_ENTITY_TYPES = {
  actividad: "postventa_actividad",
  caso: "postventa_caso",
  costo: "postventa_costo",
  evidencia: "postventa_evidencia",
  garantia: "postventa_garantia",
  historialEstado: "postventa_historial_estado",
  reserva: "postventa_reserva",
} as const;

export const POSTVENTA_CASE_TYPES = [
  "GARANTIA",
  "RECLAMO",
  "AJUSTE",
  "ROTURA",
  "FUGA",
  "MALA_INSTALACION",
  "PRODUCTO_INCOMPLETO",
  "REPOSICION",
  "OTRO",
] as const;

export const POSTVENTA_CASE_STATUSES = [
  "REPORTADO",
  "EN_REVISION",
  "VISITA_PROGRAMADA",
  "EN_ATENCION",
  "PENDIENTE_REPUESTO",
  "RESUELTO",
  "RECHAZADO",
  "CERRADO",
] as const;

export const POSTVENTA_PRIORITIES = [
  "BAJA",
  "MEDIA",
  "ALTA",
  "CRITICA",
] as const;

export const PRODUCT_WARRANTY_STATUSES = [
  "VIGENTE",
  "VENCIDA",
  "ANULADA",
] as const;

export const POSTVENTA_ACTIVITY_TYPES = [
  "VISITA_REVISION",
  "DIAGNOSTICO",
  "SOLUCION",
  "REPUESTO",
  "CIERRE",
  "NOTA_INTERNA",
] as const;

export const POSTVENTA_ACTIVITY_STATUSES = [
  "PENDIENTE",
  "PROGRAMADA",
  "EJECUTADA",
  "CANCELADA",
] as const;

export const POSTVENTA_EVIDENCE_TYPES = [
  "FOTO",
  "DOCUMENTO",
  "VIDEO",
  "OTRO",
] as const;

export const POSTVENTA_COST_CATEGORIES = [
  "GARANTIA",
  "RECLAMO",
  "REPOSICION",
  "VISITA",
  "DIAGNOSTICO",
  "MATERIAL",
  "MANO_DE_OBRA",
  "TRANSPORTE",
  "INSTALACION",
  "OTRO",
] as const;

export const POSTVENTA_COST_ORIGINS = [
  "MANUAL",
  "INVENTARIO",
  "INSTALACION",
  "PRODUCCION",
  "GARANTIA",
  "COTIZACION",
  "OTRO",
] as const;

export const POSTVENTA_STATUS_TRANSITIONS: Record<
  (typeof POSTVENTA_CASE_STATUSES)[number],
  (typeof POSTVENTA_CASE_STATUSES)[number][]
> = {
  CERRADO: [],
  EN_ATENCION: [
    "PENDIENTE_REPUESTO",
    "RESUELTO",
    "RECHAZADO",
    "CERRADO",
  ],
  EN_REVISION: [
    "VISITA_PROGRAMADA",
    "EN_ATENCION",
    "PENDIENTE_REPUESTO",
    "RESUELTO",
    "RECHAZADO",
    "CERRADO",
  ],
  PENDIENTE_REPUESTO: [
    "EN_ATENCION",
    "RESUELTO",
    "RECHAZADO",
    "CERRADO",
  ],
  RECHAZADO: ["CERRADO"],
  REPORTADO: [
    "EN_REVISION",
    "VISITA_PROGRAMADA",
    "RESUELTO",
    "RECHAZADO",
    "CERRADO",
  ],
  RESUELTO: ["EN_ATENCION", "CERRADO"],
  VISITA_PROGRAMADA: [
    "EN_ATENCION",
    "PENDIENTE_REPUESTO",
    "RESUELTO",
    "RECHAZADO",
    "CERRADO",
  ],
};
