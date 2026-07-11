export const OPERATIONAL_PORTAL_ACCESS_PERMISSIONS = [
    "portal_operativo.acceder",
    "inventory.read",
    "production.read",
    "mediciones.ver",
    "installations.view",
    "postventa.ver",
];
export const OPERATIONAL_AREA_PERMISSIONS = {
    almacen: [
        "operaciones.almacen.ver",
        "inventory.read",
    ],
    produccion: [
        "operaciones.produccion.ver",
        "production.read",
    ],
    mediciones: [
        "operaciones.mediciones.ver",
        "mediciones.ver",
    ],
    instalaciones: [
        "operaciones.instalaciones.ver",
        "installations.view",
    ],
    incidencias: [
        "operaciones.incidencias.ver",
        "postventa.ver",
        "installations.view",
    ],
    calidad: [
        "operaciones.calidad.ver",
        "production.quality_check",
    ],
    supervision: [
        "operaciones.supervision.ver",
        "production.read",
        "installations.view",
    ],
};
//# sourceMappingURL=operational-portal.constants.js.map