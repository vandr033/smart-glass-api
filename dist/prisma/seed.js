import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";
import { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { DEFAULT_SYSTEM_SETTINGS, MODULE_REGISTRY_SEED, PERMISSION_DEFINITIONS, READ_ONLY_ROLE_NAME, ROLE_DEFINITIONS, SUPER_ADMIN_ROLE_NAME, } from "../src/permissions/definitions.js";
const SEED_NAMESPACE = "f7f9b6d0-5603-4ce2-a745-9dceb8bbf57f";
const seedEnvSchema = z.object({
    DATABASE_URL: z.string().min(1),
    SEED_ADMIN_NAME: z.string().min(1).default("System Administrator"),
    SEED_ADMIN_EMAIL: z.email().default("admin@example.com"),
    SEED_ADMIN_PASSWORD: z.string().min(8).default("Admin123!"),
    SEED_APP_NAME: z.string().min(1).default("ERP Foundation"),
    SEED_SUPPORT_EMAIL: z.email().default("support@example.com"),
    SEED_TIMEZONE: z.string().min(1).default("America/La_Paz"),
    SEED_DATE_FORMAT: z.string().min(1).default("YYYY-MM-DD"),
    SEED_SENDER_NAME: z.string().min(1).default("ERP Foundation"),
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
const roleId = (roleName) => {
    return uuidv5(`role:${roleName}`, SEED_NAMESPACE);
};
const permissionId = (permissionKey) => {
    return uuidv5(`permission:${permissionKey}`, SEED_NAMESPACE);
};
const systemSettingId = (key) => {
    return uuidv5(`system-setting:${key}`, SEED_NAMESPACE);
};
const moduleRegistryId = (key) => {
    return uuidv5(`module-registry:${key}`, SEED_NAMESPACE);
};
const supplierCategoryId = (name) => {
    return uuidv5(`supplier-category:${name}`, SEED_NAMESPACE);
};
const supplierScoringCriterionId = (key) => {
    return uuidv5(`supplier-scoring-criterion:${key}`, SEED_NAMESPACE);
};
const supplierScoringConfigId = (key) => {
    return uuidv5(`supplier-scoring-config:${key}`, SEED_NAMESPACE);
};
const supplierScoringConfigWeightId = (configId, criterionId) => {
    return uuidv5(`supplier-scoring-config-weight:${configId}:${criterionId}`, SEED_NAMESPACE);
};
const materialCategoryId = (slug) => {
    return uuidv5(`material-category:${slug}`, SEED_NAMESPACE);
};
const materialId = (code) => {
    return uuidv5(`material:${code}`, SEED_NAMESPACE);
};
const productTemplateId = (code) => {
    return uuidv5(`product-template:${code}`, SEED_NAMESPACE);
};
const productTemplateVersionId = (code, versionNumber) => {
    return uuidv5(`product-template-version:${code}:${versionNumber}`, SEED_NAMESPACE);
};
const toJsonValue = (value) => {
    return value;
};
const jsonNullToNull = (value) => {
    return value === Prisma.JsonNull ? null : value;
};
const toNullableJsonValue = (value) => {
    if (value === null) {
        return Prisma.JsonNull;
    }
    return value;
};
const toSystemSettingSeedValue = (value) => {
    return value === null ? Prisma.JsonNull : value;
};
const DEFAULT_SUPPLIER_CATEGORIES = [
    {
        description: "Primary glass suppliers and related sourcing partners.",
        name: "Vidrio",
    },
    {
        description: "Extrusion, profile, and aluminum sourcing partners.",
        name: "Aluminio",
    },
    {
        description: "Hardware suppliers such as locks, hinges, and fasteners.",
        name: "Herrajes",
    },
    {
        description: "Supporting accessories used in fabrication and installation.",
        name: "Accesorios",
    },
    {
        description: "Consumable materials used during production and assembly.",
        name: "Consumibles",
    },
    {
        description: "Installation subcontractors and field support providers.",
        name: "Instalación",
    },
    {
        description: "Transport and delivery service providers.",
        name: "Transporte",
    },
    {
        description: "External service providers outside direct material supply.",
        name: "Servicios",
    },
];
const DEFAULT_MATERIAL_CATEGORIES = [
    {
        description: "Base glass material families used for cut sheets and panels.",
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
        description: "Reflective and coated glass variants.",
        name: "Vidrio reflectivo",
        parentSlug: "vidrio",
        slug: "vidrio-reflectivo",
        sortOrder: 40,
    },
    {
        description: "Mirror sheets and mirrored glass products.",
        name: "Espejo",
        parentSlug: "vidrio",
        slug: "espejo",
        sortOrder: 50,
    },
    {
        description: "Aluminum stock and extrusion families.",
        name: "Aluminio",
        slug: "aluminio",
        sortOrder: 20,
    },
    {
        description: "Primary extrusion profiles used in fabrication.",
        name: "Perfiles",
        parentSlug: "aluminio",
        slug: "aluminio-perfiles",
        sortOrder: 10,
    },
    {
        description: "Tubular aluminum stock.",
        name: "Tubos",
        parentSlug: "aluminio",
        slug: "aluminio-tubos",
        sortOrder: 20,
    },
    {
        description: "Sliding and guide rail profiles.",
        name: "Rieles",
        parentSlug: "aluminio",
        slug: "aluminio-rieles",
        sortOrder: 30,
    },
    {
        description: "Angular aluminum stock and edge profiles.",
        name: "Ángulos",
        parentSlug: "aluminio",
        slug: "aluminio-angulos",
        sortOrder: 40,
    },
    {
        description: "Complementary aluminum-specific accessories.",
        name: "Accesorios de aluminio",
        parentSlug: "aluminio",
        slug: "aluminio-accesorios",
        sortOrder: 50,
    },
    {
        description: "Hardware items used in windows, doors, and assemblies.",
        name: "Herrajes",
        slug: "herrajes",
        sortOrder: 30,
    },
    {
        description: "Lock hardware and security fittings.",
        name: "Cerraduras",
        parentSlug: "herrajes",
        slug: "herrajes-cerraduras",
        sortOrder: 10,
    },
    {
        description: "Handles, pulls, and grip hardware.",
        name: "Manijas",
        parentSlug: "herrajes",
        slug: "herrajes-manijas",
        sortOrder: 20,
    },
    {
        description: "Wheels, rollers, and running accessories.",
        name: "Ruedas",
        parentSlug: "herrajes",
        slug: "herrajes-ruedas",
        sortOrder: 30,
    },
    {
        description: "Hinges and articulated hardware.",
        name: "Bisagras",
        parentSlug: "herrajes",
        slug: "herrajes-bisagras",
        sortOrder: 40,
    },
    {
        description: "General accessories and supporting components.",
        name: "Accesorios",
        slug: "accesorios",
        sortOrder: 40,
    },
    {
        description: "Consumable production and installation inputs.",
        name: "Consumibles",
        slug: "consumibles",
        sortOrder: 50,
    },
    {
        description: "Neutral and specialty silicones.",
        name: "Silicona",
        parentSlug: "consumibles",
        slug: "consumibles-silicona",
        sortOrder: 10,
    },
    {
        description: "Screws and fastener stock.",
        name: "Tornillos",
        parentSlug: "consumibles",
        slug: "consumibles-tornillos",
        sortOrder: 20,
    },
    {
        description: "Anchors and wall plugs.",
        name: "Tarugos",
        parentSlug: "consumibles",
        slug: "consumibles-tarugos",
        sortOrder: 30,
    },
    {
        description: "Tape products for assembly and protection.",
        name: "Cintas",
        parentSlug: "consumibles",
        slug: "consumibles-cintas",
        sortOrder: 40,
    },
    {
        description: "Sealants beyond silicone products.",
        name: "Selladores",
        parentSlug: "consumibles",
        slug: "consumibles-selladores",
        sortOrder: 50,
    },
    {
        description: "Labor and installation service catalog.",
        name: "Mano de Obra",
        slug: "mano-de-obra",
        sortOrder: 60,
    },
    {
        description: "Transport and delivery services.",
        name: "Transporte",
        slug: "transporte",
        sortOrder: 70,
    },
    {
        description: "Other external services tied to materialized work.",
        name: "Servicios",
        slug: "servicios",
        sortOrder: 80,
    },
];
const DEFAULT_MATERIALS = [
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
const DEFAULT_SUPPLIER_SCORING_CRITERIA = [
    {
        description: "Manual price competitiveness score until price lists are available.",
        key: "price",
        label: "Price",
        sortOrder: 10,
    },
    {
        description: "Normalized supplier lead time score based on delivery expectations.",
        key: "delivery_time",
        label: "Delivery Time",
        sortOrder: 20,
    },
    {
        description: "Historical reliability score for delivery and fulfillment confidence.",
        key: "reliability",
        label: "Reliability",
        sortOrder: 30,
    },
    {
        description: "Credit availability and credit limit strength.",
        key: "credit",
        label: "Credit",
        sortOrder: 40,
    },
    {
        description: "Commercial preference score assigned by the business.",
        key: "preference",
        label: "Preference",
        sortOrder: 50,
    },
    {
        description: "Manual availability score until purchasing and inventory signals exist.",
        key: "availability",
        label: "Availability",
        sortOrder: 60,
    },
];
const DEFAULT_GLOBAL_SUPPLIER_SCORING_CONFIG = {
    key: "default-global",
    name: "Default Global Supplier Scoring",
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
};
const legacyRoleRenames = [
    {
        from: "Admin",
        to: SUPER_ADMIN_ROLE_NAME,
    },
    {
        from: "Non Admin",
        to: READ_ONLY_ROLE_NAME,
    },
];
const renameLegacyRoles = async () => {
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
                description: ROLE_DEFINITIONS.find((role) => role.name === roleRename.to)?.description ??
                    null,
                name: roleRename.to,
            },
            where: {
                id: legacyRole.id,
            },
        });
    }
};
const seedRoles = async () => {
    const roleMap = new Map();
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
const seedPermissions = async () => {
    const permissionMap = new Map();
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
const syncRolePermissions = async (roleMap, permissionMap) => {
    for (const role of ROLE_DEFINITIONS) {
        const currentRoleId = roleMap.get(role.name);
        if (!currentRoleId) {
            throw new Error(`Unable to find seeded role ${role.name}.`);
        }
        const nextPermissionIds = role.permissionKeys.map((permissionKey) => {
            const currentPermissionId = permissionMap.get(permissionKey);
            if (!currentPermissionId) {
                throw new Error(`Unable to find seeded permission ${permissionKey}.`);
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
                    id: uuidv5(`role-permission:${currentRoleId}:${currentPermissionId}`, SEED_NAMESPACE),
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
const seedAdminUser = async () => {
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
const assignSuperAdminRole = async (adminUserId, roleMap) => {
    const superAdminRoleId = roleMap.get(SUPER_ADMIN_ROLE_NAME);
    if (!superAdminRoleId) {
        throw new Error("SUPER_ADMIN role was not seeded.");
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
const seedLegacyAppSettings = async () => {
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
const seedSystemSettings = async () => {
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
const seedModuleRegistry = async () => {
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
const seedSupplierCategories = async () => {
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
const seedMaterialCategories = async () => {
    const categoryMap = new Map();
    for (const category of DEFAULT_MATERIAL_CATEGORIES) {
        const parentId = category.parentSlug
            ? (categoryMap.get(category.parentSlug) ?? null)
            : null;
        if (category.parentSlug && !parentId) {
            throw new Error(`Parent material category ${category.parentSlug} was not seeded.`);
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
const seedMaterials = async (categoryMap) => {
    for (const material of DEFAULT_MATERIALS) {
        const categoryId = categoryMap.get(material.categorySlug);
        if (!categoryId) {
            throw new Error(`Material category ${material.categorySlug} was not seeded.`);
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
const seedProductTemplates = async () => {
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
    const upsertTemplateVersion = async (input) => {
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
                inputSchemaJson: inputSchemaSnapshot,
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
                inputSchemaJson: inputSchemaSnapshot,
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
            description: "Simple fixed glass panel template used for quick simulation previews.",
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
                    label: "Quantity",
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
                    label: "Installation labor",
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
            notes: "Seeded example for direct glass sheet simulation previews.",
            productType: "WINDOW",
            status: "ACTIVE",
            templateDescription: "Reusable fixed glass panel definitions for later quotation workflows.",
            templateName: "Fixed Glass Panel",
        });
        seededCount += 1;
    }
    else {
        console.warn("[seed] Skipping template TPL-FIXED-GLASS because fallback glass material VID-CLR-006 was not found.");
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
            description: "Basic sliding window approximation with one glass rule and one aluminum perimeter rule.",
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
                    label: "Glass material",
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
                    label: "Aluminum profile",
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
                    label: "Quantity",
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
                    label: "Perimeter profile approximation",
                    materialId: fallbackAluminumProfile.id,
                    ruleType: "LINEAR_CUT",
                    sortOrder: 20,
                    wastePercent: 5,
                },
            ],
            name: "Sliding window basic v1",
            notes: "Seeded approximation for future multi-panel quotation and optimization flows.",
            productType: "WINDOW",
            status: "ACTIVE",
            templateDescription: "Reusable sliding window template with glass and aluminum preview rules.",
            templateName: "Sliding Window Basic",
        });
        seededCount += 1;
    }
    else {
        console.warn("[seed] Skipping template TPL-SLIDING-WINDOW because required fallback materials were not found.");
    }
    if (fallbackMirror) {
        await upsertTemplateVersion({
            accessoryRules: [],
            activatedAt,
            code: "TPL-MIRROR",
            defaultMarginPercent: 18,
            defaultWastePercent: 8,
            description: "Basic mirror template seeded only when a mirror material exists.",
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
                    defaultValueJson: toJsonValue(fallbackMirror.id),
                    inputType: "MATERIAL_SELECT",
                    isRequired: true,
                    key: "mirrorMaterialId",
                    label: "Mirror material",
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
                    label: "Quantity",
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
            notes: "Seeded only when a mirror-compatible material exists in the catalog.",
            productType: "MIRROR",
            status: "ACTIVE",
            templateDescription: "Reusable mirror template for future simulation and quotation flows.",
            templateName: "Mirror",
        });
        seededCount += 1;
    }
    else {
        console.warn("[seed] Skipping template TPL-MIRROR because no mirror material exists yet.");
    }
    return seededCount;
};
const seedSupplierScoringCriteria = async () => {
    const criterionMap = new Map();
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
const seedDefaultSupplierScoringConfig = async (criterionMap) => {
    const configId = supplierScoringConfigId(DEFAULT_GLOBAL_SUPPLIER_SCORING_CONFIG.key);
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
            throw new Error(`Unable to find seeded supplier scoring criterion ${weight.criterionKey}.`);
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
const main = async () => {
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
    console.info(JSON.stringify({
        adminEmail: env.SEED_ADMIN_EMAIL,
        moduleRegistryEntries: MODULE_REGISTRY_SEED.length,
        materialCategories: DEFAULT_MATERIAL_CATEGORIES.length,
        materials: DEFAULT_MATERIALS.length,
        productTemplates: seededProductTemplates,
        permissions: PERMISSION_DEFINITIONS.length,
        roles: ROLE_DEFINITIONS.length,
        seededRoles: ROLE_DEFINITIONS.map((role) => role.name),
        systemSettings: DEFAULT_SYSTEM_SETTINGS.length,
    }, null, 2));
};
void main()
    .catch((error) => {
    console.error("Database seed failed.");
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map