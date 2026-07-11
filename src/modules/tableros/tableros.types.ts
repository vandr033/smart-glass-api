import type { z } from "zod";

import type { tablerosPanelQuerySchema } from "./tableros.validators.js";
import type { TABLERO_CATEGORIAS } from "./tableros.constants.js";

export type CategoriaTablero = (typeof TABLERO_CATEGORIAS)[number];

export type TableroEjecutivoRecord = {
  actualizadoEn: string;
  creadoEn: string;
  creadoPor: string;
  descripcion: string;
  id: string;
  nombre: string;
  tipo: string;
  visibleParaRoles: string[];
};

export type IndicadorGestionRecord = {
  actualizadoEn: string;
  categoria: CategoriaTablero;
  codigo: string;
  descripcion: string;
  formula: string;
  id: string;
  meta: number | null;
  nombre: string;
  periodo: string;
  tendencia: "ALZA" | "BAJA" | "ESTABLE";
  unidad: "dias" | "moneda" | "numero" | "porcentaje" | "veces";
  valorActual: number;
  variacion: number | null;
};

export type MetaIndicadorRecord = {
  estado: "ALCANZADA" | "EN_RIESGO" | "VIGENTE";
  id: string;
  indicadorId: string;
  periodo: string;
  responsableId: string | null;
  valorMeta: number;
};

export type ReporteBIRecord = {
  archivoUrl: string | null;
  filtros: Record<string, string | null>;
  generadoEn: string;
  generadoPor: string | null;
  id: string;
  nombre: string;
  tipo: "Datos base Excel" | "Indicadores Excel" | "Reporte PDF";
};

export type TarjetaIndicadorRecord = {
  categoria: CategoriaTablero;
  codigo: string;
  descripcion: string;
  id: string;
  meta: number | null;
  titulo: string;
  tendencia: "ALZA" | "BAJA" | "ESTABLE";
  unidad: "dias" | "moneda" | "numero" | "porcentaje";
  valor: number;
  variacion: number | null;
};

export type SerieTemporalRecord = {
  etiqueta: string;
  periodo: string;
  valor: number;
  valorSecundario?: number;
};

export type SerieValorRecord = {
  color: string;
  etiqueta: string;
  porcentaje: number | null;
  valor: number;
};

export type RankingRecord = {
  descripcion: string;
  etiqueta: string;
  id: string;
  secundario: string | null;
  valor: number;
};

export type ComparativaRecord = {
  detalle: string;
  etiqueta: string;
  meta: number | null;
  unidad: "dias" | "moneda" | "numero" | "porcentaje" | "veces";
  valor: number;
};

export type PanelSeccionComercialRecord = {
  conversion: {
    aprobadas: number;
    emitidas: number;
    tasa: number;
  };
  cotizacionesPorEstado: SerieValorRecord[];
  proyectosResultado: SerieValorRecord[];
  ventasPorCliente: RankingRecord[];
  ventasPorPeriodo: SerieTemporalRecord[];
  ventasPorVendedor: RankingRecord[];
};

export type PanelSeccionOperacionesRecord = {
  alertasOperativas: RankingRecord[];
  cumplimiento: ComparativaRecord[];
  instalacionesPorEstado: SerieValorRecord[];
  ordenesTrabajoPorEstado: SerieValorRecord[];
};

export type PanelSeccionInventarioRecord = {
  materialesCriticos: RankingRecord[];
  rotacion: SerieValorRecord[];
  stockBajo: RankingRecord[];
  resumen: ComparativaRecord[];
};

export type PanelSeccionFinancieraRecord = {
  desviacionProyectos: RankingRecord[];
  proyectosEnPerdida: RankingRecord[];
  resumen: SerieValorRecord[];
};

export type PanelSeccionPostventaRecord = {
  estados: SerieValorRecord[];
  reclamosPorProyecto: RankingRecord[];
  reclamosPorTipo: SerieValorRecord[];
  resumen: ComparativaRecord[];
};

export type PanelEjecutivoRecord = {
  actualizadoEn: string;
  filtrosAplicados: {
    clientId: string | null;
    dateFrom: string;
    dateTo: string;
    projectId: string | null;
    responsibleId: string | null;
    salesUserId: string | null;
    status: string | null;
    warehouseId: string | null;
  };
  indicadores: IndicadorGestionRecord[];
  metas: MetaIndicadorRecord[];
  reportes: ReporteBIRecord[];
  secciones: {
    comercial: PanelSeccionComercialRecord;
    financiero: PanelSeccionFinancieraRecord;
    inventario: PanelSeccionInventarioRecord;
    operaciones: PanelSeccionOperacionesRecord;
    postventa: PanelSeccionPostventaRecord;
  };
  tablero: TableroEjecutivoRecord;
  tarjetas: TarjetaIndicadorRecord[];
};

export type TablerosPanelQuery = z.infer<typeof tablerosPanelQuerySchema>;
