import type { z } from "zod";

import type {
  listProjectProfitabilityDashboardQuerySchema,
  listProjectProfitabilityQuerySchema,
  projectProfitabilityProjectIdParamSchema,
} from "./project-profitability.validators.js";
import type {
  ALERTA_RENTABILIDAD_TIPOS,
  COSTO_PROYECTO_CATEGORIAS,
  COSTO_PROYECTO_ORIGENES,
  EVENTO_RENTABILIDAD_TIPOS,
  RENTABILIDAD_PROYECTO_ESTADOS,
} from "./project-profitability.constants.js";

export type RentabilidadProyectoEstado =
  (typeof RENTABILIDAD_PROYECTO_ESTADOS)[number];

export type CostoProyectoCategoria =
  (typeof COSTO_PROYECTO_CATEGORIAS)[number];

export type CostoProyectoOrigen =
  (typeof COSTO_PROYECTO_ORIGENES)[number];

export type EventoRentabilidadTipo =
  (typeof EVENTO_RENTABILIDAD_TIPOS)[number];

export type AlertaRentabilidadTipo =
  (typeof ALERTA_RENTABILIDAD_TIPOS)[number];

export type RentabilidadUserSummary = {
  email: string;
  id: string;
  name: string;
} | null;

export type RentabilidadClientSummary = {
  clientType: "COMPANY" | "INDIVIDUAL";
  displayName: string;
  id: string;
};

export type RentabilidadProjectSummary = {
  client: RentabilidadClientSummary;
  code: string;
  id: string;
  projectType:
    | "WINDOW"
    | "DOOR"
    | "SHOWER"
    | "FACADE"
    | "RAILING"
    | "MIRROR"
    | "CUSTOM"
    | "SERVICE";
  responsibleUser: RentabilidadUserSummary;
  salesUser: RentabilidadUserSummary;
  status:
    | "LEAD"
    | "MEASUREMENT_PENDING"
    | "QUOTATION_PENDING"
    | "QUOTED"
    | "APPROVED"
    | "PURCHASE_PENDING"
    | "PRODUCTION_PENDING"
    | "IN_PRODUCTION"
    | "INSTALLATION_PENDING"
    | "IN_INSTALLATION"
    | "COMPLETED"
    | "CANCELLED"
    | "ON_HOLD";
  title: string;
};

export type RentabilidadProyectoRecord = {
  calculadoEn: string;
  costoInstalacionPresupuestado: number;
  costoInstalacionReal: number;
  costoManoObraPresupuestado: number;
  costoManoObraReal: number;
  costoMaterialPresupuestado: number;
  costoMaterialReal: number;
  diferenciaContraPresupuesto: number;
  estado: RentabilidadProyectoEstado;
  id: string;
  ingresoPresupuestado: number;
  ingresoReal: number;
  margenBruto: number;
  proyectoId: string;
  totalCostoPresupuestado: number;
  totalCostoReal: number;
  utilidadBruta: number;
  desperdicioPresupuestado: number;
  desperdicioReal: number;
};

export type CostoProyectoRecord = {
  categoria: CostoProyectoCategoria;
  descripcion: string;
  fecha: string;
  id: string;
  monto: number;
  origen: CostoProyectoOrigen;
  proyectoId: string;
  referenciaId: string | null;
};

export type EventoRentabilidadRecord = {
  creadoEn: string;
  descripcion: string;
  id: string;
  impacto: number;
  proyectoId: string;
  tipo: EventoRentabilidadTipo;
};

export type AlertaRentabilidadRecord = {
  descripcion: string;
  id: string;
  impacto: number;
  severidad: "ALTA" | "MEDIA" | "BAJA";
  tipo: AlertaRentabilidadTipo;
};

export type VariacionRentabilidadRecord = {
  diferencia: number;
  etiqueta: string;
  porcentaje: number | null;
  presupuestado: number;
  real: number;
};

export type IndicadoresRentabilidadRecord = {
  margenNeto: number;
  rentabilidadPorMetroCuadrado: number | null;
  rentabilidadPorProyecto: number;
  recuperacionPorRemanentes: number;
  desperdicioGenerado: number;
};

export type RentabilidadAgrupadaRecord = {
  clave: string;
  margenPromedio: number;
  nombre: string;
  proyectos: number;
  utilidadTotal: number;
  ventaTotal: number;
};

export type RentabilidadProyectoListItem = {
  alertas: AlertaRentabilidadRecord[];
  indicadores: IndicadoresRentabilidadRecord;
  proyecto: RentabilidadProjectSummary;
  rentabilidad: RentabilidadProyectoRecord;
};

export type RentabilidadProyectoDetailRecord = RentabilidadProyectoListItem & {
  costos: CostoProyectoRecord[];
  eventos: EventoRentabilidadRecord[];
  metodologia: string[];
  reportes: {
    porCliente: RentabilidadAgrupadaRecord[];
    porTipoProducto: RentabilidadAgrupadaRecord[];
    porVendedor: RentabilidadAgrupadaRecord[];
  };
  variaciones: {
    costos: VariacionRentabilidadRecord;
    ingresos: VariacionRentabilidadRecord;
    instalacion: VariacionRentabilidadRecord;
    manoDeObra: VariacionRentabilidadRecord;
    materiales: VariacionRentabilidadRecord;
  };
};

export type RentabilidadProyectoDashboardRecord = {
  desperdicioPromedio: number;
  margenPromedio: number;
  proyectosMasRentables: RentabilidadProyectoListItem[];
  proyectosMenosRentables: RentabilidadProyectoListItem[];
  proyectosRentables: number;
  reportes: {
    porCliente: RentabilidadAgrupadaRecord[];
    porTipoProducto: RentabilidadAgrupadaRecord[];
    porVendedor: RentabilidadAgrupadaRecord[];
  };
  totalProyectos: number;
  utilidadTotal: number;
};

export type ListProjectProfitabilityQuery = z.infer<
  typeof listProjectProfitabilityQuerySchema
>;

export type ListProjectProfitabilityDashboardQuery = z.infer<
  typeof listProjectProfitabilityDashboardQuerySchema
>;

export type ProjectProfitabilityProjectIdParams = z.infer<
  typeof projectProfitabilityProjectIdParamSchema
>;
