import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";

import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import {
  DEFAULT_SYSTEM_SETTINGS,
  MODULE_REGISTRY_SEED,
  PERMISSION_DEFINITIONS,
  READ_ONLY_ROLE_NAME,
  ROLE_DEFINITIONS,
  SUPER_ADMIN_ROLE_NAME,
} from "../src/permissions/definitions.js";

const SEED_NAMESPACE = "f7f9b6d0-5603-4ce2-a745-9dceb8bbf57f";

const seedEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SEED_ADMIN_NAME: z.string().min(1).default("System Administrator"),
  SEED_ADMIN_EMAIL: z.email().default("admin@example.com"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin123!"),
  SEED_APP_NAME: z.string().min(1).default("Smart Glass Bolivia"),
  SEED_SUPPORT_EMAIL: z.email().default("support@example.com"),
  SEED_TIMEZONE: z.string().min(1).default("America/La_Paz"),
  SEED_DATE_FORMAT: z.string().min(1).default("YYYY-MM-DD"),
  SEED_SENDER_NAME: z.string().min(1).default("Smart Glass Bolivia"),
  SEED_SENDER_EMAIL: z.email().default("no-reply@example.com"),
  SEED_PRIMARY_COLOR: z.string().min(1).default("#1f2937"),
  SEED_LOGO: z.string().optional(),
});

const env = seedEnvSchema.parse(process.env);

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(env.DATABASE_URL),
});

const ids = {
  adminAccount: uuidv5("account:default-admin", SEED_NAMESPACE),
  adminUser: uuidv5("user:default-admin", SEED_NAMESPACE),
  settings: uuidv5("settings:default", SEED_NAMESPACE),
};

const roleId = (roleName: string): string => {
  return uuidv5(`role:${roleName}`, SEED_NAMESPACE);
};

const permissionId = (permissionKey: string): string => {
  return uuidv5(`permission:${permissionKey}`, SEED_NAMESPACE);
};

const systemSettingId = (key: string): string => {
  return uuidv5(`system-setting:${key}`, SEED_NAMESPACE);
};

const moduleRegistryId = (key: string): string => {
  return uuidv5(`module-registry:${key}`, SEED_NAMESPACE);
};

const supplierCategoryId = (name: string): string => {
  return uuidv5(`supplier-category:${name}`, SEED_NAMESPACE);
};

const supplierScoringCriterionId = (key: string): string => {
  return uuidv5(`supplier-scoring-criterion:${key}`, SEED_NAMESPACE);
};

const supplierScoringConfigId = (key: string): string => {
  return uuidv5(`supplier-scoring-config:${key}`, SEED_NAMESPACE);
};

const supplierScoringConfigWeightId = (
  configId: string,
  criterionId: string,
): string => {
  return uuidv5(
    `supplier-scoring-config-weight:${configId}:${criterionId}`,
    SEED_NAMESPACE,
  );
};

const materialCategoryId = (slug: string): string => {
  return uuidv5(`material-category:${slug}`, SEED_NAMESPACE);
};

const materialId = (code: string): string => {
  return uuidv5(`material:${code}`, SEED_NAMESPACE);
};

const productTemplateId = (code: string): string => {
  return uuidv5(`product-template:${code}`, SEED_NAMESPACE);
};

const productTemplateVersionId = (
  code: string,
  versionNumber: number,
): string => {
  return uuidv5(
    `product-template-version:${code}:${versionNumber}`,
    SEED_NAMESPACE,
  );
};

const toJsonValue = (value: Prisma.InputJsonValue): Prisma.InputJsonValue => {
  return value;
};

const jsonNullToNull = (
  value: Prisma.InputJsonValue | typeof Prisma.JsonNull,
): Prisma.InputJsonValue | null => {
  return value === Prisma.JsonNull ? null : (value as Prisma.InputJsonValue);
};

const toNullableJsonValue = (
  value: object | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

const toSystemSettingSeedValue = (
  value: Prisma.InputJsonValue | null,
): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  return value === null ? Prisma.JsonNull : value;
};

const DEFAULT_SUPPLIER_CATEGORIES: Array<{
  description: string;
  name: string;
}> = [
  {
    description: "Proveedores principales de vidrio y socios de abastecimiento relacionados.",
    name: "Vidrio",
  },
  {
    description: "Socios de abastecimiento de extrusión, perfiles y aluminio.",
    name: "Aluminio",
  },
  {
    description: "Proveedores de herrajes como cerraduras, bisagras y sujetadores.",
    name: "Herrajes",
  },
  {
    description: "Accesorios de apoyo utilizados en fabricación e instalación.",
    name: "Accesorios",
  },
  {
    description: "Materiales consumibles utilizados durante la producción y el ensamblaje.",
    name: "Consumibles",
  },
  {
    description: "Subcontratistas de instalación y proveedores de soporte en campo.",
    name: "Instalación",
  },
  {
    description: "Proveedores de servicios de transporte y entrega.",
    name: "Transporte",
  },
  {
    description: "Proveedores de servicios externos fuera del suministro directo de materiales.",
    name: "Servicios",
  },
];

const DEFAULT_MATERIAL_CATEGORIES: Array<{
  description: string;
  name: string;
  parentSlug?: string;
  slug: string;
  sortOrder: number;
}> = [
  {
    description: "Familias base de materiales de vidrio para hojas y paneles de corte.",
    name: "Vidrio",
    slug: "vidrio",
    sortOrder: 10,
  },
  {
    description: "Clear float glass material variants.",
    name: "Vidrio claro",
    parentSlug: "vidrio",
    slug: "vidrio-claro",
    sortOrder: 10,
  },
  {
    description: "Tempered safety glass variants.",
    name: "Vidrio templado",
    parentSlug: "vidrio",
    slug: "vidrio-templado",
    sortOrder: 20,
  },
  {
    description: "Laminated safety glass variants.",
    name: "Vidrio laminado",
    parentSlug: "vidrio",
    slug: "vidrio-laminado",
    sortOrder: 30,
  },
  {
    description: "Variantes de vidrio reflectivo y recubierto.",
    name: "Vidrio reflectivo",
    parentSlug: "vidrio",
    slug: "vidrio-reflectivo",
    sortOrder: 40,
  },
  {
    description: "Hojas de espejo y productos de vidrio espejado.",
    name: "Espejo",
    parentSlug: "vidrio",
    slug: "espejo",
    sortOrder: 50,
  },
  {
    description: "Familias de existencias y extrusiones de aluminio.",
    name: "Aluminio",
    slug: "aluminio",
    sortOrder: 20,
  },
  {
    description: "Perfiles de extrusión principales utilizados en fabricación.",
    name: "Perfiles",
    parentSlug: "aluminio",
    slug: "aluminio-perfiles",
    sortOrder: 10,
  },
  {
    description: "Existencias de aluminio tubular.",
    name: "Tubos",
    parentSlug: "aluminio",
    slug: "aluminio-tubos",
    sortOrder: 20,
  },
  {
    description: "Perfiles de rieles corredizos y guías.",
    name: "Rieles",
    parentSlug: "aluminio",
    slug: "aluminio-rieles",
    sortOrder: 30,
  },
  {
    description: "Existencias de aluminio angular y perfiles de borde.",
    name: "Ángulos",
    parentSlug: "aluminio",
    slug: "aluminio-angulos",
    sortOrder: 40,
  },
  {
    description: "Accesorios complementarios específicos para aluminio.",
    name: "Accesorios de aluminio",
    parentSlug: "aluminio",
    slug: "aluminio-accesorios",
    sortOrder: 50,
  },
  {
    description: "Herrajes utilizados en ventanas, puertas y ensamblajes.",
    name: "Herrajes",
    slug: "herrajes",
    sortOrder: 30,
  },
  {
    description: "Herrajes de cerraduras y accesorios de seguridad.",
    name: "Cerraduras",
    parentSlug: "herrajes",
    slug: "herrajes-cerraduras",
    sortOrder: 10,
  },
  {
    description: "Manijas, tiradores y herrajes de agarre.",
    name: "Manijas",
    parentSlug: "herrajes",
    slug: "herrajes-manijas",
    sortOrder: 20,
  },
  {
    description: "Ruedas, rodillos y accesorios de desplazamiento.",
    name: "Ruedas",
    parentSlug: "herrajes",
    slug: "herrajes-ruedas",
    sortOrder: 30,
  },
  {
    description: "Bisagras y herrajes articulados.",
    name: "Bisagras",
    parentSlug: "herrajes",
    slug: "herrajes-bisagras",
    sortOrder: 40,
  },
  {
    description: "Accesorios generales y componentes de apoyo.",
    name: "Accesorios",
    slug: "accesorios",
    sortOrder: 40,
  },
  {
    description: "Insumos consumibles de producción e instalación.",
    name: "Consumibles",
    slug: "consumibles",
    sortOrder: 50,
  },
  {
    description: "Siliconas neutras y especiales.",
    name: "Silicona",
    parentSlug: "consumibles",
    slug: "consumibles-silicona",
    sortOrder: 10,
  },
  {
    description: "Existencias de tornillos y sujetadores.",
    name: "Tornillos",
    parentSlug: "consumibles",
    slug: "consumibles-tornillos",
    sortOrder: 20,
  },
  {
    description: "Anclajes y tarugos de pared.",
    name: "Tarugos",
    parentSlug: "consumibles",
    slug: "consumibles-tarugos",
    sortOrder: 30,
  },
  {
    description: "Productos de cinta para ensamblaje y protección.",
    name: "Cintas",
    parentSlug: "consumibles",
    slug: "consumibles-cintas",
    sortOrder: 40,
  },
  {
    description: "Selladores distintos de los productos de silicona.",
    name: "Selladores",
    parentSlug: "consumibles",
    slug: "consumibles-selladores",
    sortOrder: 50,
  },
  {
    description: "Catálogo de servicios de mano de obra e instalación.",
    name: "Mano de Obra",
    slug: "mano-de-obra",
    sortOrder: 60,
  },
  {
    description: "Servicios de transporte y entrega.",
    name: "Transporte",
    slug: "transporte",
    sortOrder: 70,
  },
  {
    description: "Otros servicios externos vinculados al trabajo materializado.",
    name: "Servicios",
    slug: "servicios",
    sortOrder: 80,
  },
];

const DEFAULT_MATERIALS: Array<{
  allowsRotation: boolean;
  baseUnit: "MM" | "CM" | "M" | "M2" | "UNIT" | "PACKAGE" | "KG" | "LITER" | "HOUR" | "DAY";
  brand: string | null;
  categorySlug: string;
  code: string;
  color: string | null;
  consumptionUnit: "MM" | "CM" | "M" | "M2" | "UNIT" | "PACKAGE" | "KG" | "LITER" | "HOUR" | "DAY";
  defaultWastePercent: number | null;
  description: string | null;
  finish: string | null;
  isCuttable: boolean;
  isPurchasable: boolean;
  isRemnantEligible: boolean;
  isSellable: boolean;
  isStockable: boolean;
  materialType: "LINEAR" | "SHEET" | "UNIT" | "PACKAGE" | "SERVICE";
  minimumReusableHeightMm: number | null;
  minimumReusableLengthMm: number | null;
  minimumReusableWidthMm: number | null;
  name: string;
  notes: string | null;
  purchaseUnit: "MM" | "CM" | "M" | "M2" | "UNIT" | "PACKAGE" | "KG" | "LITER" | "HOUR" | "DAY";
  standardHeightMm: number | null;
  standardLengthMm: number | null;
  standardWidthMm: number | null;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  stockUnit: "MM" | "CM" | "M" | "M2" | "UNIT" | "PACKAGE" | "KG" | "LITER" | "HOUR" | "DAY";
  thicknessMm: number | null;
  unitConversionJson: object | null;
}> = [
  {
    allowsRotation: true,
    baseUnit: "M2",
    brand: null,
    categorySlug: "vidrio-claro",
    code: "VID-CLR-006",
    color: "Claro",
    consumptionUnit: "M2",
    defaultWastePercent: 8,
    description: "Vidrio claro monolítico de 6 mm para hojas y paneles.",
    finish: "Float",
    isCuttable: true,
    isPurchasable: true,
    isRemnantEligible: true,
    isSellable: true,
    isStockable: true,
    materialType: "SHEET",
    minimumReusableHeightMm: 300,
    minimumReusableLengthMm: null,
    minimumReusableWidthMm: 300,
    name: "Vidrio claro 6mm",
    notes: "Usa dimensiones estándar de plancha para futuros cálculos de optimización 2D.",
    purchaseUnit: "M2",
    standardHeightMm: null,
    standardLengthMm: 3600,
    standardWidthMm: 2600,
    status: "ACTIVE",
    stockUnit: "M2",
    thicknessMm: 6,
    unitConversionJson: null,
  },
  {
    allowsRotation: true,
    baseUnit: "M2",
    brand: null,
    categorySlug: "vidrio-claro",
    code: "VID-CLR-008",
    color: "Claro",
    consumptionUnit: "M2",
    defaultWastePercent: 8,
    description: "Vidrio claro monolítico de 8 mm para paños y cerramientos.",
    finish: "Float",
    isCuttable: true,
    isPurchasable: true,
    isRemnantEligible: true,
    isSellable: true,
    isStockable: true,
    materialType: "SHEET",
    minimumReusableHeightMm: 300,
    minimumReusableLengthMm: null,
    minimumReusableWidthMm: 300,
    name: "Vidrio claro 8mm",
    notes: "Mantiene el mismo formato estándar de plancha que el vidrio claro de 6 mm.",
    purchaseUnit: "M2",
    standardHeightMm: null,
    standardLengthMm: 3600,
    standardWidthMm: 2600,
    status: "ACTIVE",
    stockUnit: "M2",
    thicknessMm: 8,
    unitConversionJson: null,
  },
  {
    allowsRotation: false,
    baseUnit: "M",
    brand: null,
    categorySlug: "aluminio-perfiles",
    code: "ALU-PER-6000",
    color: "Natural",
    consumptionUnit: "M",
    defaultWastePercent: 3,
    description: "Perfil de aluminio estándar adquirido en barras de 6 metros.",
    finish: "Mill finish",
    isCuttable: true,
    isPurchasable: true,
    isRemnantEligible: true,
    isSellable: true,
    isStockable: true,
    materialType: "LINEAR",
    minimumReusableHeightMm: null,
    minimumReusableLengthMm: 500,
    minimumReusableWidthMm: null,
    name: "Perfil aluminio estándar 6m",
    notes: "Semilla base para futuros perfiles equivalentes y optimización 1D.",
    purchaseUnit: "M",
    standardHeightMm: null,
    standardLengthMm: 6000,
    standardWidthMm: null,
    status: "ACTIVE",
    stockUnit: "M",
    thicknessMm: null,
    unitConversionJson: null,
  },
  {
    allowsRotation: false,
    baseUnit: "UNIT",
    brand: null,
    categorySlug: "consumibles-silicona",
    code: "SIL-NEU-001",
    color: "Transparente",
    consumptionUnit: "UNIT",
    defaultWastePercent: null,
    description: "Silicona neutra en cartucho para instalación y sellado.",
    finish: null,
    isCuttable: false,
    isPurchasable: true,
    isRemnantEligible: false,
    isSellable: false,
    isStockable: true,
    materialType: "PACKAGE",
    minimumReusableHeightMm: null,
    minimumReusableLengthMm: null,
    minimumReusableWidthMm: null,
    name: "Silicona neutra",
    notes: "Se compra por cartucho y se consume por unidad de cartucho.",
    purchaseUnit: "PACKAGE",
    standardHeightMm: null,
    standardLengthMm: null,
    standardWidthMm: null,
    status: "ACTIVE",
    stockUnit: "PACKAGE",
    thicknessMm: null,
    unitConversionJson: {
      unitLabel: "cartucho",
      unitsPerPackage: 1,
    },
  },
  {
    allowsRotation: false,
    baseUnit: "UNIT",
    brand: null,
    categorySlug: "herrajes-manijas",
    code: "MAN-STD-001",
    color: "Negro",
    consumptionUnit: "UNIT",
    defaultWastePercent: null,
    description: "Manija estándar para puertas y ventanas de aluminio.",
    finish: "Pintado",
    isCuttable: false,
    isPurchasable: true,
    isRemnantEligible: false,
    isSellable: true,
    isStockable: true,
    materialType: "UNIT",
    minimumReusableHeightMm: null,
    minimumReusableLengthMm: null,
    minimumReusableWidthMm: null,
    name: "Manija estándar",
    notes: null,
    purchaseUnit: "UNIT",
    standardHeightMm: null,
    standardLengthMm: null,
    standardWidthMm: null,
    status: "ACTIVE",
    stockUnit: "UNIT",
    thicknessMm: null,
    unitConversionJson: null,
  },
  {
    allowsRotation: false,
    baseUnit: "HOUR",
    brand: null,
    categorySlug: "mano-de-obra",
    code: "LAB-INST-001",
    color: null,
    consumptionUnit: "HOUR",
    defaultWastePercent: null,
    description: "Servicio base de mano de obra para instalación en obra.",
    finish: null,
    isCuttable: false,
    isPurchasable: true,
    isRemnantEligible: false,
    isSellable: true,
    isStockable: false,
    materialType: "SERVICE",
    minimumReusableHeightMm: null,
    minimumReusableLengthMm: null,
    minimumReusableWidthMm: null,
    name: "Mano de obra instalación",
    notes: "Servicio no inventariable que será reutilizado en cotizaciones y producción.",
    purchaseUnit: "HOUR",
    standardHeightMm: null,
    standardLengthMm: null,
    standardWidthMm: null,
    status: "ACTIVE",
    stockUnit: "HOUR",
    thicknessMm: null,
    unitConversionJson: null,
  },
];

const DEFAULT_SUPPLIER_SCORING_CRITERIA: Array<{
  description: string;
  key: string;
  label: string;
  sortOrder: number;
}> = [
  {
    description: "Puntuación manual de competitividad de precios hasta disponer de listas de precios.",
    key: "price",
    label: "Precio",
    sortOrder: 10,
  },
  {
    description: "Puntuación normalizada del plazo de entrega del proveedor según las expectativas de entrega.",
    key: "delivery_time",
    label: "Plazo de entrega",
    sortOrder: 20,
  },
  {
    description: "Puntuación histórica de confiabilidad para la entrega y el cumplimiento.",
    key: "reliability",
    label: "Confiabilidad",
    sortOrder: 30,
  },
  {
    description: "Disponibilidad de crédito y solidez del límite de crédito.",
    key: "credit",
    label: "Crédito",
    sortOrder: 40,
  },
  {
    description: "Puntuación de preferencia comercial asignada por la empresa.",
    key: "preference",
    label: "Preferencia",
    sortOrder: 50,
  },
  {
    description: "Puntuación manual de disponibilidad hasta contar con señales de compras e inventario.",
    key: "availability",
    label: "Disponibilidad",
    sortOrder: 60,
  },
];

const DEFAULT_GLOBAL_SUPPLIER_SCORING_CONFIG = {
  key: "default-global",
  name: "Puntuación global predeterminada de proveedores",
  weights: [
    {
      criterionKey: "price",
      weight: 60,
    },
    {
      criterionKey: "delivery_time",
      weight: 20,
    },
    {
      criterionKey: "reliability",
      weight: 10,
    },
    {
      criterionKey: "credit",
      weight: 5,
    },
    {
      criterionKey: "preference",
      weight: 5,
    },
    {
      criterionKey: "availability",
      weight: 0,
    },
  ],
} as const;

const legacyRoleRenames: Array<{
  from: string;
  to: string;
}> = [
  {
    from: "Admin",
    to: SUPER_ADMIN_ROLE_NAME,
  },
  {
    from: "Non Admin",
    to: READ_ONLY_ROLE_NAME,
  },
];

const renameLegacyRoles = async (): Promise<void> => {
  for (const roleRename of legacyRoleRenames) {
    const existingTarget = await prisma.role.findFirst({
      select: {
        id: true,
      },
      where: {
        deletedAt: null,
        name: roleRename.to,
      },
    });

    if (existingTarget) {
      continue;
    }

    const legacyRole = await prisma.role.findFirst({
      select: {
        id: true,
      },
      where: {
        deletedAt: null,
        name: roleRename.from,
      },
    });

    if (!legacyRole) {
      continue;
    }

    await prisma.role.update({
      data: {
        description:
          ROLE_DEFINITIONS.find((role) => role.name === roleRename.to)?.description ??
          null,
        name: roleRename.to,
      },
      where: {
        id: legacyRole.id,
      },
    });
  }
};

const seedRoles = async (): Promise<Map<string, string>> => {
  const roleMap = new Map<string, string>();

  for (const role of ROLE_DEFINITIONS) {
    const record = await prisma.role.upsert({
      create: {
        description: role.description,
        id: roleId(role.name),
        name: role.name,
      },
      update: {
        deletedAt: null,
        description: role.description,
      },
      where: {
        name: role.name,
      },
    });

    roleMap.set(role.name, record.id);
  }

  return roleMap;
};

const seedPermissions = async (): Promise<Map<string, string>> => {
  const permissionMap = new Map<string, string>();

  for (const permission of PERMISSION_DEFINITIONS) {
    const record = await prisma.permission.upsert({
      create: {
        description: permission.description,
        id: permissionId(permission.key),
        name: permission.key,
      },
      update: {
        deletedAt: null,
        description: permission.description,
      },
      where: {
        name: permission.key,
      },
    });

    permissionMap.set(permission.key, record.id);
  }

  return permissionMap;
};

const syncRolePermissions = async (
  roleMap: Map<string, string>,
  permissionMap: Map<string, string>,
): Promise<void> => {
  for (const role of ROLE_DEFINITIONS) {
    const currentRoleId = roleMap.get(role.name);

    if (!currentRoleId) {
      throw new Error(`No se encontró el rol inicial ${role.name}.`);
    }

    const nextPermissionIds = role.permissionKeys.map((permissionKey) => {
      const currentPermissionId = permissionMap.get(permissionKey);

      if (!currentPermissionId) {
        throw new Error(`No se encontró el permiso inicial ${permissionKey}.`);
      }

      return currentPermissionId;
    });

    await prisma.rolePermission.deleteMany({
      where: {
        permissionId: {
          notIn: nextPermissionIds,
        },
        roleId: currentRoleId,
      },
    });

    for (const currentPermissionId of nextPermissionIds) {
      await prisma.rolePermission.upsert({
        create: {
          id: uuidv5(
            `role-permission:${currentRoleId}:${currentPermissionId}`,
            SEED_NAMESPACE,
          ),
          permissionId: currentPermissionId,
          roleId: currentRoleId,
        },
        update: {},
        where: {
          roleId_permissionId: {
            permissionId: currentPermissionId,
            roleId: currentRoleId,
          },
        },
      });
    }
  }
};

const seedAdminUser = async (): Promise<string> => {
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);

  const user = await prisma.user.upsert({
    create: {
      email: env.SEED_ADMIN_EMAIL,
      emailVerified: true,
      id: ids.adminUser,
      isActive: true,
      name: env.SEED_ADMIN_NAME,
      password: passwordHash,
    },
    update: {
      deletedAt: null,
      emailVerified: true,
      isActive: true,
      name: env.SEED_ADMIN_NAME,
      password: passwordHash,
    },
    where: {
      email: env.SEED_ADMIN_EMAIL,
    },
  });

  await prisma.account.upsert({
    create: {
      accountId: user.id,
      id: ids.adminAccount,
      password: passwordHash,
      providerId: "credential",
      userId: user.id,
    },
    update: {
      password: passwordHash,
      userId: user.id,
    },
    where: {
      providerId_accountId: {
        accountId: user.id,
        providerId: "credential",
      },
    },
  });

  return user.id;
};

const assignSuperAdminRole = async (
  adminUserId: string,
  roleMap: Map<string, string>,
): Promise<void> => {
  const superAdminRoleId = roleMap.get(SUPER_ADMIN_ROLE_NAME);

  if (!superAdminRoleId) {
    throw new Error("No se inicializó el rol SUPER_ADMIN.");
  }

  await prisma.userRole.upsert({
    create: {
      id: uuidv5(`user-role:${adminUserId}:${superAdminRoleId}`, SEED_NAMESPACE),
      roleId: superAdminRoleId,
      userId: adminUserId,
    },
    update: {},
    where: {
      userId_roleId: {
        roleId: superAdminRoleId,
        userId: adminUserId,
      },
    },
  });
};

const seedLegacyAppSettings = async (): Promise<void> => {
  await prisma.setting.upsert({
    create: {
      appName: env.SEED_APP_NAME,
      dateFormat: env.SEED_DATE_FORMAT,
      id: ids.settings,
      logo: env.SEED_LOGO ?? null,
      primaryColor: env.SEED_PRIMARY_COLOR,
      senderEmail: env.SEED_SENDER_EMAIL,
      senderName: env.SEED_SENDER_NAME,
      supportEmail: env.SEED_SUPPORT_EMAIL,
      timezone: env.SEED_TIMEZONE,
    },
    update: {
      appName: env.SEED_APP_NAME,
      dateFormat: env.SEED_DATE_FORMAT,
      deletedAt: null,
      logo: env.SEED_LOGO ?? null,
      primaryColor: env.SEED_PRIMARY_COLOR,
      senderEmail: env.SEED_SENDER_EMAIL,
      senderName: env.SEED_SENDER_NAME,
      supportEmail: env.SEED_SUPPORT_EMAIL,
      timezone: env.SEED_TIMEZONE,
    },
    where: {
      id: ids.settings,
    },
  });
};

const seedSystemSettings = async (): Promise<void> => {
  for (const setting of DEFAULT_SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      create: {
        description: setting.description,
        id: systemSettingId(setting.key),
        key: setting.key,
        valueJson: toSystemSettingSeedValue(setting.valueJson),
      },
      update: {
        description: setting.description,
        valueJson: toSystemSettingSeedValue(setting.valueJson),
      },
      where: {
        key: setting.key,
      },
    });
  }
};

const seedModuleRegistry = async (): Promise<void> => {
  for (const moduleEntry of MODULE_REGISTRY_SEED) {
    await prisma.moduleRegistry.upsert({
      create: {
        description: moduleEntry.description,
        icon: moduleEntry.icon,
        id: moduleRegistryId(moduleEntry.key),
        isEnabled: moduleEntry.isEnabled,
        key: moduleEntry.key,
        label: moduleEntry.label,
        requiredPermission: moduleEntry.requiredPermission,
        route: moduleEntry.route,
        sortOrder: moduleEntry.sortOrder,
      },
      update: {
        description: moduleEntry.description,
        icon: moduleEntry.icon,
        isEnabled: moduleEntry.isEnabled,
        label: moduleEntry.label,
        requiredPermission: moduleEntry.requiredPermission,
        route: moduleEntry.route,
        sortOrder: moduleEntry.sortOrder,
      },
      where: {
        key: moduleEntry.key,
      },
    });
  }
};

const seedSupplierCategories = async (): Promise<void> => {
  for (const category of DEFAULT_SUPPLIER_CATEGORIES) {
    await prisma.supplierCategory.upsert({
      create: {
        description: category.description,
        id: supplierCategoryId(category.name),
        name: category.name,
      },
      update: {
        description: category.description,
      },
      where: {
        name: category.name,
      },
    });
  }
};

const seedMaterialCategories = async (): Promise<Map<string, string>> => {
  const categoryMap = new Map<string, string>();

  for (const category of DEFAULT_MATERIAL_CATEGORIES) {
    const parentId = category.parentSlug
      ? (categoryMap.get(category.parentSlug) ?? null)
      : null;

    if (category.parentSlug && !parentId) {
      throw new Error(`No se inicializó la categoría de material padre ${category.parentSlug}.`);
    }

    const record = await prisma.materialCategory.upsert({
      create: {
        description: category.description,
        id: materialCategoryId(category.slug),
        isActive: true,
        name: category.name,
        parentId,
        slug: category.slug,
        sortOrder: category.sortOrder,
      },
      update: {
        description: category.description,
        isActive: true,
        name: category.name,
        parentId,
        sortOrder: category.sortOrder,
      },
      where: {
        slug: category.slug,
      },
    });

    categoryMap.set(category.slug, record.id);
  }

  return categoryMap;
};

const seedMaterials = async (categoryMap: Map<string, string>): Promise<void> => {
  for (const material of DEFAULT_MATERIALS) {
    const categoryId = categoryMap.get(material.categorySlug);

    if (!categoryId) {
      throw new Error(`No se inicializó la categoría de material ${material.categorySlug}.`);
    }

    await prisma.material.upsert({
      create: {
        allowsRotation: material.allowsRotation,
        baseUnit: material.baseUnit,
        brand: material.brand,
        categoryId,
        code: material.code,
        color: material.color,
        consumptionUnit: material.consumptionUnit,
        defaultWastePercent: material.defaultWastePercent,
        deletedAt: null,
        description: material.description,
        finish: material.finish,
        id: materialId(material.code),
        isCuttable: material.isCuttable,
        isPurchasable: material.isPurchasable,
        isRemnantEligible: material.isRemnantEligible,
        isSellable: material.isSellable,
        isStockable: material.isStockable,
        materialType: material.materialType,
        minimumReusableHeightMm: material.minimumReusableHeightMm,
        minimumReusableLengthMm: material.minimumReusableLengthMm,
        minimumReusableWidthMm: material.minimumReusableWidthMm,
        name: material.name,
        notes: material.notes,
        purchaseUnit: material.purchaseUnit,
        standardHeightMm: material.standardHeightMm,
        standardLengthMm: material.standardLengthMm,
        standardWidthMm: material.standardWidthMm,
        status: material.status,
        stockUnit: material.stockUnit,
        thicknessMm: material.thicknessMm,
        unitConversionJson: toNullableJsonValue(material.unitConversionJson),
      },
      update: {
        allowsRotation: material.allowsRotation,
        baseUnit: material.baseUnit,
        brand: material.brand,
        categoryId,
        color: material.color,
        consumptionUnit: material.consumptionUnit,
        defaultWastePercent: material.defaultWastePercent,
        deletedAt: null,
        description: material.description,
        finish: material.finish,
        isCuttable: material.isCuttable,
        isPurchasable: material.isPurchasable,
        isRemnantEligible: material.isRemnantEligible,
        isSellable: material.isSellable,
        isStockable: material.isStockable,
        materialType: material.materialType,
        minimumReusableHeightMm: material.minimumReusableHeightMm,
        minimumReusableLengthMm: material.minimumReusableLengthMm,
        minimumReusableWidthMm: material.minimumReusableWidthMm,
        name: material.name,
        notes: material.notes,
        purchaseUnit: material.purchaseUnit,
        standardHeightMm: material.standardHeightMm,
        standardLengthMm: material.standardLengthMm,
        standardWidthMm: material.standardWidthMm,
        status: material.status,
        stockUnit: material.stockUnit,
        thicknessMm: material.thicknessMm,
        unitConversionJson: toNullableJsonValue(material.unitConversionJson),
      },
      where: {
        code: material.code,
      },
    });
  }
};

const seedProductTemplates = async (): Promise<number> => {
  const fallbackGlass = await prisma.material.findUnique({
    select: {
      id: true,
    },
    where: {
      code: "VID-CLR-006",
    },
  });
  const fallbackAluminumProfile = await prisma.material.findUnique({
    select: {
      id: true,
    },
    where: {
      code: "ALU-PER-6000",
    },
  });
  const fallbackHandle = await prisma.material.findUnique({
    select: {
      id: true,
    },
    where: {
      code: "MAN-STD-001",
    },
  });
  const fallbackMirror = await prisma.material.findFirst({
    select: {
      id: true,
    },
    where: {
      deletedAt: null,
      OR: [
        {
          code: {
            contains: "ESP",
          },
        },
        {
          name: {
            contains: "Espejo",
          },
        },
      ],
    },
  });

  const upsertTemplateVersion = async (input: {
    accessoryRules: Array<{
      isActive: boolean;
      isOptional: boolean;
      label: string;
      materialId: string;
      quantityFormulaJson: Prisma.InputJsonValue;
      sortOrder: number;
    }>;
    activatedAt: Date | null;
    code: string;
    defaultMarginPercent: number | null;
    defaultWastePercent: number | null;
    description: string | null;
    inputs: Array<{
      defaultValueJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      inputType:
        | "BOOLEAN"
        | "MATERIAL_SELECT"
        | "NUMBER"
        | "SELECT"
        | "TEXT";
      isRequired: boolean;
      key: string;
      label: string;
      optionsJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
      sortOrder: number;
      unit: string | null;
      validationJson: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    }>;
    laborRules: Array<{
      formulaJson: Prisma.InputJsonValue;
      isActive: boolean;
      label: string;
      laborType: "FABRICATION" | "INSTALLATION" | "OTHER" | "TRANSPORT";
      sortOrder: number;
      unitCost: number | null;
    }>;
    materialRules: Array<{
      allowRemnantUse: boolean;
      allowRotation: boolean;
      formulaJson: Prisma.InputJsonValue;
      isActive: boolean;
      label: string;
      materialId: string;
      ruleType:
        | "LINEAR_CUT"
        | "PACKAGE_QUANTITY"
        | "SERVICE_COST"
        | "SHEET_CUT"
        | "UNIT_QUANTITY";
      sortOrder: number;
      wastePercent: number | null;
    }>;
    name: string;
    notes: string | null;
    productType:
      | "CUSTOM"
      | "DOOR"
      | "FACADE"
      | "MIRROR"
      | "RAILING"
      | "SERVICE"
      | "SHOWER"
      | "WINDOW";
    status: "ACTIVE" | "DRAFT";
    templateDescription: string | null;
    templateName: string;
  }) => {
    const inputSchemaSnapshot = input.inputs.map((item) => ({
      defaultValueJson: jsonNullToNull(item.defaultValueJson),
      inputType: item.inputType,
      isRequired: item.isRequired,
      key: item.key,
      label: item.label,
      optionsJson: jsonNullToNull(item.optionsJson),
      sortOrder: item.sortOrder,
      unit: item.unit,
      validationJson: jsonNullToNull(item.validationJson),
    }));

    const template = await prisma.productTemplate.upsert({
      create: {
        code: input.code,
        description: input.templateDescription,
        id: productTemplateId(input.code),
        name: input.templateName,
        productType: input.productType,
        status: input.status,
      },
      update: {
        deletedAt: null,
        description: input.templateDescription,
        name: input.templateName,
        productType: input.productType,
        status: input.status,
      },
      where: {
        code: input.code,
      },
    });

    const version = await prisma.productTemplateVersion.upsert({
      create: {
        activatedAt: input.activatedAt,
        calculationRulesJson: toJsonValue({
          accessoryRules: input.accessoryRules,
          materialRules: input.materialRules,
        }),
        defaultMarginPercent: input.defaultMarginPercent,
        defaultWastePercent: input.defaultWastePercent,
        description: input.description,
        id: productTemplateVersionId(input.code, 1),
        inputSchemaJson: inputSchemaSnapshot as Prisma.InputJsonArray,
        laborRulesJson: toJsonValue(input.laborRules),
        name: input.name,
        notes: input.notes,
        status: input.status,
        templateId: template.id,
        versionNumber: 1,
      },
      update: {
        activatedAt: input.activatedAt,
        calculationRulesJson: toJsonValue({
          accessoryRules: input.accessoryRules,
          materialRules: input.materialRules,
        }),
        defaultMarginPercent: input.defaultMarginPercent,
        defaultWastePercent: input.defaultWastePercent,
        description: input.description,
        inputSchemaJson: inputSchemaSnapshot as Prisma.InputJsonArray,
        laborRulesJson: toJsonValue(input.laborRules),
        name: input.name,
        notes: input.notes,
        status: input.status,
      },
      where: {
        templateId_versionNumber: {
          templateId: template.id,
          versionNumber: 1,
        },
      },
    });

    await prisma.productTemplate.update({
      data: {
        currentVersionId: version.id,
        status: input.status,
      },
      where: {
        id: template.id,
      },
    });

    await prisma.productTemplateInput.deleteMany({
      where: {
        versionId: version.id,
      },
    });
    await prisma.productTemplateMaterialRule.deleteMany({
      where: {
        versionId: version.id,
      },
    });
    await prisma.productTemplateAccessoryRule.deleteMany({
      where: {
        versionId: version.id,
      },
    });
    await prisma.productTemplateLaborRule.deleteMany({
      where: {
        versionId: version.id,
      },
    });

    if (input.inputs.length > 0) {
      await prisma.productTemplateInput.createMany({
        data: input.inputs.map((item) => ({
          defaultValueJson: item.defaultValueJson,
          inputType: item.inputType,
          isRequired: item.isRequired,
          key: item.key,
          label: item.label,
          optionsJson: item.optionsJson,
          sortOrder: item.sortOrder,
          unit: item.unit,
          validationJson: item.validationJson,
          versionId: version.id,
        })),
      });
    }

    if (input.materialRules.length > 0) {
      await prisma.productTemplateMaterialRule.createMany({
        data: input.materialRules.map((item) => ({
          allowRemnantUse: item.allowRemnantUse,
          allowRotation: item.allowRotation,
          formulaJson: item.formulaJson,
          isActive: item.isActive,
          label: item.label,
          materialId: item.materialId,
          ruleType: item.ruleType,
          sortOrder: item.sortOrder,
          versionId: version.id,
          wastePercent: item.wastePercent,
        })),
      });
    }

    if (input.accessoryRules.length > 0) {
      await prisma.productTemplateAccessoryRule.createMany({
        data: input.accessoryRules.map((item) => ({
          isActive: item.isActive,
          isOptional: item.isOptional,
          label: item.label,
          materialId: item.materialId,
          quantityFormulaJson: item.quantityFormulaJson,
          sortOrder: item.sortOrder,
          versionId: version.id,
        })),
      });
    }

    if (input.laborRules.length > 0) {
      await prisma.productTemplateLaborRule.createMany({
        data: input.laborRules.map((item) => ({
          formulaJson: item.formulaJson,
          isActive: item.isActive,
          label: item.label,
          laborType: item.laborType,
          sortOrder: item.sortOrder,
          unitCost: item.unitCost,
          versionId: version.id,
        })),
      });
    }
  };

  let seededCount = 0;
  const activatedAt = new Date();

  if (fallbackGlass) {
    await upsertTemplateVersion({
      accessoryRules: [],
      activatedAt,
      code: "TPL-FIXED-GLASS",
      defaultMarginPercent: 18,
      defaultWastePercent: 10,
      description:
        "Plantilla simple de panel fijo de vidrio para vistas previas rápidas de simulación.",
      inputs: [
        {
          defaultValueJson: Prisma.JsonNull,
          inputType: "NUMBER",
          isRequired: true,
          key: "widthMm",
          label: "Width",
          optionsJson: Prisma.JsonNull,
          sortOrder: 10,
          unit: "mm",
          validationJson: toNullableJsonValue({
            min: 100,
          }),
        },
        {
          defaultValueJson: Prisma.JsonNull,
          inputType: "NUMBER",
          isRequired: true,
          key: "heightMm",
          label: "Height",
          optionsJson: Prisma.JsonNull,
          sortOrder: 20,
          unit: "mm",
          validationJson: toNullableJsonValue({
            min: 100,
          }),
        },
        {
          defaultValueJson: toJsonValue(fallbackGlass.id),
          inputType: "MATERIAL_SELECT",
          isRequired: true,
          key: "glassMaterialId",
          label: "Glass material",
          optionsJson: Prisma.JsonNull,
          sortOrder: 30,
          unit: null,
          validationJson: Prisma.JsonNull,
        },
        {
          defaultValueJson: toJsonValue(1),
          inputType: "NUMBER",
          isRequired: true,
          key: "quantity",
          label: "Cantidad",
          optionsJson: Prisma.JsonNull,
          sortOrder: 40,
          unit: "unit",
          validationJson: toNullableJsonValue({
            min: 1,
          }),
        },
      ],
      laborRules: [
        {
          formulaJson: toJsonValue({
            quantityFormula: {
              precision: 1,
              type: "ROUND_UP",
              value: {
                left: {
                  type: "MULTIPLY",
                  values: [
                    {
                      key: "widthMm",
                      type: "INPUT",
                    },
                    {
                      key: "heightMm",
                      type: "INPUT",
                    },
                    {
                      key: "quantity",
                      type: "INPUT",
                    },
                  ],
                },
                right: {
                  type: "CONSTANT",
                  value: 1000000,
                },
                type: "DIVIDE",
              },
            },
          }),
          isActive: true,
          label: "Mano de obra de instalación",
          laborType: "INSTALLATION",
          sortOrder: 10,
          unitCost: 45,
        },
      ],
      materialRules: [
        {
          allowRemnantUse: true,
          allowRotation: true,
          formulaJson: toJsonValue({
            materialInputKey: "glassMaterialId",
            quantityFormula: {
              key: "quantity",
              type: "INPUT",
            },
            requiredHeightMmFormula: {
              key: "heightMm",
              type: "INPUT",
            },
            requiredWidthMmFormula: {
              key: "widthMm",
              type: "INPUT",
            },
          }),
          isActive: true,
          label: "Glass panel",
          materialId: fallbackGlass.id,
          ruleType: "SHEET_CUT",
          sortOrder: 10,
          wastePercent: 8,
        },
      ],
      name: "Fixed glass panel v1",
      notes: "Ejemplo inicial para vistas previas directas de simulación de hojas de vidrio.",
      productType: "WINDOW",
      status: "ACTIVE",
      templateDescription:
        "Definiciones reutilizables de panel fijo de vidrio para futuros flujos de cotización.",
      templateName: "Fixed Glass Panel",
    });
    seededCount += 1;
  } else {
    console.warn(
      "[seed] Skipping template TPL-FIXED-GLASS because fallback glass material VID-CLR-006 was not found.",
    );
  }

  if (fallbackGlass && fallbackAluminumProfile) {
    await upsertTemplateVersion({
      accessoryRules: fallbackHandle
        ? [
            {
              isActive: true,
              isOptional: true,
              label: "Handle placeholder",
              materialId: fallbackHandle.id,
              quantityFormulaJson: toJsonValue({
                key: "quantity",
                type: "INPUT",
              }),
              sortOrder: 10,
            },
          ]
        : [],
      activatedAt,
      code: "TPL-SLIDING-WINDOW",
      defaultMarginPercent: 22,
      defaultWastePercent: 12,
      description:
        "Aproximación básica de ventana corrediza con una regla de vidrio y una regla de perímetro de aluminio.",
      inputs: [
        {
          defaultValueJson: Prisma.JsonNull,
          inputType: "NUMBER",
          isRequired: true,
          key: "widthMm",
          label: "Width",
          optionsJson: Prisma.JsonNull,
          sortOrder: 10,
          unit: "mm",
          validationJson: toNullableJsonValue({
            min: 300,
          }),
        },
        {
          defaultValueJson: Prisma.JsonNull,
          inputType: "NUMBER",
          isRequired: true,
          key: "heightMm",
          label: "Height",
          optionsJson: Prisma.JsonNull,
          sortOrder: 20,
          unit: "mm",
          validationJson: toNullableJsonValue({
            min: 300,
          }),
        },
        {
          defaultValueJson: toJsonValue(fallbackGlass.id),
          inputType: "MATERIAL_SELECT",
          isRequired: true,
          key: "glassMaterialId",
          label: "Material de vidrio",
          optionsJson: Prisma.JsonNull,
          sortOrder: 30,
          unit: null,
          validationJson: Prisma.JsonNull,
        },
        {
          defaultValueJson: toJsonValue(fallbackAluminumProfile.id),
          inputType: "MATERIAL_SELECT",
          isRequired: true,
          key: "aluminumProfileMaterialId",
          label: "Perfil de aluminio",
          optionsJson: Prisma.JsonNull,
          sortOrder: 40,
          unit: null,
          validationJson: Prisma.JsonNull,
        },
        {
          defaultValueJson: toJsonValue(1),
          inputType: "NUMBER",
          isRequired: true,
          key: "quantity",
          label: "Cantidad",
          optionsJson: Prisma.JsonNull,
          sortOrder: 50,
          unit: "unit",
          validationJson: toNullableJsonValue({
            min: 1,
          }),
        },
        {
          defaultValueJson: toJsonValue(2),
          inputType: "NUMBER",
          isRequired: true,
          key: "panels",
          label: "Panels",
          optionsJson: Prisma.JsonNull,
          sortOrder: 60,
          unit: "unit",
          validationJson: toNullableJsonValue({
            min: 1,
          }),
        },
      ],
      laborRules: [
        {
          formulaJson: toJsonValue({
            quantityFormula: {
              precision: 1,
              type: "ROUND_UP",
              value: {
                type: "DIVIDE",
                left: {
                  type: "MULTIPLY",
                  values: [
                    {
                      key: "widthMm",
                      type: "INPUT",
                    },
                    {
                      key: "heightMm",
                      type: "INPUT",
                    },
                    {
                      key: "quantity",
                      type: "INPUT",
                    },
                  ],
                },
                right: {
                  type: "CONSTANT",
                  value: 800000,
                },
              },
            },
          }),
          isActive: true,
          label: "Fabrication labor",
          laborType: "FABRICATION",
          sortOrder: 10,
          unitCost: 55,
        },
      ],
      materialRules: [
        {
          allowRemnantUse: true,
          allowRotation: true,
          formulaJson: toJsonValue({
            materialInputKey: "glassMaterialId",
            quantityFormula: {
              type: "MULTIPLY",
              values: [
                {
                  key: "quantity",
                  type: "INPUT",
                },
                {
                  key: "panels",
                  type: "INPUT",
                },
              ],
            },
            requiredHeightMmFormula: {
              key: "heightMm",
              type: "INPUT",
            },
            requiredWidthMmFormula: {
              type: "DIVIDE",
              left: {
                key: "widthMm",
                type: "INPUT",
              },
              right: {
                key: "panels",
                type: "INPUT",
              },
            },
          }),
          isActive: true,
          label: "Sliding glass panels",
          materialId: fallbackGlass.id,
          ruleType: "SHEET_CUT",
          sortOrder: 10,
          wastePercent: 10,
        },
        {
          allowRemnantUse: true,
          allowRotation: false,
          formulaJson: toJsonValue({
            materialInputKey: "aluminumProfileMaterialId",
            quantityFormula: {
              key: "quantity",
              type: "INPUT",
            },
            requiredLengthMmFormula: {
              type: "MULTIPLY",
              values: [
                {
                  type: "ADD",
                  values: [
                    {
                      key: "widthMm",
                      type: "INPUT",
                    },
                    {
                      key: "heightMm",
                      type: "INPUT",
                    },
                  ],
                },
                {
                  type: "CONSTANT",
                  value: 2,
                },
              ],
            },
          }),
          isActive: true,
          label: "Aproximación de perfil perimetral",
          materialId: fallbackAluminumProfile.id,
          ruleType: "LINEAR_CUT",
          sortOrder: 20,
          wastePercent: 5,
        },
      ],
      name: "Sliding window basic v1",
      notes:
        "Aproximación inicial para futuros flujos de cotización y optimización de múltiples paneles.",
      productType: "WINDOW",
      status: "ACTIVE",
      templateDescription:
        "Plantilla reutilizable de ventana corrediza con reglas de vista previa para vidrio y aluminio.",
      templateName: "Ventana corrediza básica",
    });
    seededCount += 1;
  } else {
    console.warn(
      "[seed] Skipping template TPL-SLIDING-WINDOW because required fallback materials were not found.",
    );
  }

  if (fallbackMirror) {
    await upsertTemplateVersion({
      accessoryRules: [],
      activatedAt,
      code: "TPL-MIRROR",
      defaultMarginPercent: 18,
      defaultWastePercent: 8,
      description: "Plantilla básica de espejo inicializada solo cuando existe un material de espejo.",
      inputs: [
        {
          defaultValueJson: Prisma.JsonNull,
          inputType: "NUMBER",
          isRequired: true,
          key: "widthMm",
          label: "Ancho",
          optionsJson: Prisma.JsonNull,
          sortOrder: 10,
          unit: "mm",
          validationJson: toNullableJsonValue({
            min: 100,
          }),
        },
        {
          defaultValueJson: Prisma.JsonNull,
          inputType: "NUMBER",
          isRequired: true,
          key: "heightMm",
          label: "Alto",
          optionsJson: Prisma.JsonNull,
          sortOrder: 20,
          unit: "mm",
          validationJson: toNullableJsonValue({
            min: 100,
          }),
        },
        {
          defaultValueJson: toJsonValue(fallbackMirror.id),
          inputType: "MATERIAL_SELECT",
          isRequired: true,
          key: "mirrorMaterialId",
          label: "Material de espejo",
          optionsJson: Prisma.JsonNull,
          sortOrder: 30,
          unit: null,
          validationJson: Prisma.JsonNull,
        },
        {
          defaultValueJson: toJsonValue(1),
          inputType: "NUMBER",
          isRequired: true,
          key: "quantity",
          label: "Cantidad",
          optionsJson: Prisma.JsonNull,
          sortOrder: 40,
          unit: "unit",
          validationJson: toNullableJsonValue({
            min: 1,
          }),
        },
      ],
      laborRules: [],
      materialRules: [
        {
          allowRemnantUse: true,
          allowRotation: true,
          formulaJson: toJsonValue({
            materialInputKey: "mirrorMaterialId",
            quantityFormula: {
              key: "quantity",
              type: "INPUT",
            },
            requiredHeightMmFormula: {
              key: "heightMm",
              type: "INPUT",
            },
            requiredWidthMmFormula: {
              key: "widthMm",
              type: "INPUT",
            },
          }),
          isActive: true,
          label: "Mirror sheet",
          materialId: fallbackMirror.id,
          ruleType: "SHEET_CUT",
          sortOrder: 10,
          wastePercent: 8,
        },
      ],
      name: "Mirror v1",
      notes: "Inicializado solo cuando existe un material compatible con espejo en el catálogo.",
      productType: "MIRROR",
      status: "ACTIVE",
      templateDescription:
        "Plantilla reutilizable de espejo para futuros flujos de simulación y cotización.",
      templateName: "Mirror",
    });
    seededCount += 1;
  } else {
    console.warn(
      "[seed] Skipping template TPL-MIRROR because no mirror material exists yet.",
    );
  }

  return seededCount;
};

const seedSupplierScoringCriteria = async (): Promise<Map<string, string>> => {
  const criterionMap = new Map<string, string>();

  for (const criterion of DEFAULT_SUPPLIER_SCORING_CRITERIA) {
    const record = await prisma.supplierScoringCriterion.upsert({
      create: {
        description: criterion.description,
        id: supplierScoringCriterionId(criterion.key),
        isEnabled: true,
        key: criterion.key,
        label: criterion.label,
        sortOrder: criterion.sortOrder,
      },
      update: {
        description: criterion.description,
        isEnabled: true,
        label: criterion.label,
        sortOrder: criterion.sortOrder,
      },
      where: {
        key: criterion.key,
      },
    });

    criterionMap.set(criterion.key, record.id);
  }

  return criterionMap;
};

const seedDefaultSupplierScoringConfig = async (
  criterionMap: Map<string, string>,
): Promise<void> => {
  const configId = supplierScoringConfigId(
    DEFAULT_GLOBAL_SUPPLIER_SCORING_CONFIG.key,
  );

  const existingConfig = await prisma.supplierScoringConfig.findUnique({
    select: {
      id: true,
    },
    where: {
      id: configId,
    },
  });

  if (existingConfig) {
    return;
  }

  await prisma.supplierScoringConfig.create({
    data: {
      id: configId,
      isActive: true,
      isDefault: true,
      name: DEFAULT_GLOBAL_SUPPLIER_SCORING_CONFIG.name,
      scope: "GLOBAL",
    },
  });

  for (const weight of DEFAULT_GLOBAL_SUPPLIER_SCORING_CONFIG.weights) {
    const criterionId = criterionMap.get(weight.criterionKey);

    if (!criterionId) {
      throw new Error(
        `Unable to find seeded supplier scoring criterion ${weight.criterionKey}.`,
      );
    }

    await prisma.supplierScoringConfigWeight.create({
      data: {
        configId,
        criterionId,
        id: supplierScoringConfigWeightId(configId, criterionId),
        weight: weight.weight,
      },
    });
  }
};

const main = async (): Promise<void> => {
  await renameLegacyRoles();

  const roleMap = await seedRoles();
  const permissionMap = await seedPermissions();
  await syncRolePermissions(roleMap, permissionMap);

  const adminUserId = await seedAdminUser();
  await assignSuperAdminRole(adminUserId, roleMap);

  await seedLegacyAppSettings();
  await seedSystemSettings();
  await seedModuleRegistry();
  await seedSupplierCategories();
  const materialCategoryMap = await seedMaterialCategories();
  await seedMaterials(materialCategoryMap);
  const seededProductTemplates = await seedProductTemplates();
  const supplierCriterionMap = await seedSupplierScoringCriteria();
  await seedDefaultSupplierScoringConfig(supplierCriterionMap);

  console.info("Database seed completed.");
  console.info(
    JSON.stringify(
      {
        adminEmail: env.SEED_ADMIN_EMAIL,
        moduleRegistryEntries: MODULE_REGISTRY_SEED.length,
        materialCategories: DEFAULT_MATERIAL_CATEGORIES.length,
        materials: DEFAULT_MATERIALS.length,
        productTemplates: seededProductTemplates,
        permissions: PERMISSION_DEFINITIONS.length,
        roles: ROLE_DEFINITIONS.length,
        seededRoles: ROLE_DEFINITIONS.map((role) => role.name),
        systemSettings: DEFAULT_SYSTEM_SETTINGS.length,
      },
      null,
      2,
    ),
  );
};

void main()
  .catch((error: unknown) => {
    console.error("La inicialización de la base de datos falló.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
