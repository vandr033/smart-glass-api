import type { Prisma } from "../../../generated/prisma/client.js";

import { settingsService } from "../../services/settings-service.js";
import { AppError } from "../../utils/app-error.js";
import { buildSimplePdf, paginatePdfLines, wrapPdfText } from "../../utils/simple-pdf.js";
import { prisma } from "../../utils/prisma.js";

export type QuotationPdfVariant = "commercial" | "internal";

type PdfItem = {
  description: string | null;
  itemType: string;
  materials: Array<{
    materialCode: string | null;
    materialName: string;
    requiredQuantity: Prisma.Decimal;
    supplier: { commercialName: string | null; legalName: string } | null;
    totalCost: Prisma.Decimal;
    unit: string;
    unitCost: Prisma.Decimal | null;
    wastePercent: Prisma.Decimal | null;
  }>;
  marginPercent: Prisma.Decimal | null;
  name: string;
  quantity: Prisma.Decimal;
  subtotalCost: Prisma.Decimal;
  subtotalSale: Prisma.Decimal;
};

type PdfSource = {
  approvedAt: Date | null;
  approvedByUser: { name: string } | null;
  client: {
    addresses: Array<{ address: string; city: string | null; isProjectSite: boolean; label: string }>;
    billingAddress: string | null;
    city: string | null;
    commercialName: string | null;
    contacts: Array<{ email: string | null; name: string; phone: string | null; position: string | null }>;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    legalName: string | null;
    phone: string | null;
    taxId: string | null;
  };
  code: string;
  createdAt: Date;
  createdByUser: { name: string } | null;
  currency: string;
  discountAmount: Prisma.Decimal;
  internalNotes: string | null;
  items: PdfItem[];
  marginAmount: Prisma.Decimal;
  marginPercent: Prisma.Decimal;
  notes: string | null;
  project: {
    city: string | null;
    code: string;
    responsibleUser: { name: string } | null;
    salesUser: { name: string } | null;
    siteAddress: string | null;
    title: string;
  } | null;
  status: string;
  subtotalCost: Prisma.Decimal;
  subtotalSale: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalSale: Prisma.Decimal;
  validUntil: Date | null;
};

type PdfCompanyProfile = {
  address: string;
  legalName: string;
  phone: string;
  taxId: string;
  tradeName: string;
};

const quotationPdfInclude = {
  approvedByUser: { select: { name: true } },
  client: {
    include: {
      addresses: {
        orderBy: [{ isProjectSite: "desc" }, { isBilling: "desc" }, { createdAt: "asc" }],
        select: { address: true, city: true, isProjectSite: true, label: true },
      },
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { email: true, name: true, phone: true, position: true },
      },
    },
  },
  createdByUser: { select: { name: true } },
  items: {
    include: {
      materials: {
        include: { supplier: { select: { commercialName: true, legalName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  project: {
    include: {
      responsibleUser: { select: { name: true } },
      salesUser: { select: { name: true } },
    },
  },
} satisfies Prisma.QuotationInclude;

type QuotationWithPdfInclude = Prisma.QuotationGetPayload<{ include: typeof quotationPdfInclude }>;

const decimal = (value: Prisma.Decimal | null | undefined): number =>
  value === null || value === undefined ? 0 : Number(value);

const date = (value: Date | null): string =>
  value
    ? new Intl.DateTimeFormat("es-BO", { dateStyle: "short", timeZone: "America/La_Paz" }).format(value)
    : "No definida";

const money = (value: Prisma.Decimal | number | null, currency: string): string =>
  new Intl.NumberFormat("es-BO", { currency, currencyDisplay: "code", minimumFractionDigits: 2, style: "currency" }).format(Number(value ?? 0));

const percent = (value: Prisma.Decimal | number | null): string =>
  `${new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Number(value ?? 0))}%`;

const labelStatus = (status: string): string =>
  ({
    ACCEPTED: "Aceptada",
    APPROVED: "Aprobada",
    CANCELLED: "Cancelada",
    DRAFT: "Borrador",
    EXPIRED: "Vencida",
    PENDING_APPROVAL: "Pendiente de aprobación",
    REJECTED: "Rechazada",
    SENT: "Enviada",
  })[status] ?? status.replaceAll("_", " ").toLowerCase();

const displayClientName = (client: PdfSource["client"]): string =>
  client.commercialName ?? client.legalName ?? [client.firstName, client.lastName].filter(Boolean).join(" ") ?? "Cliente sin nombre";

const getString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const readCompanyProfile = (value: Prisma.JsonValue | null | undefined): PdfCompanyProfile => {
  const profile = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return {
    address: getString(profile.address, "No registrada en configuración"),
    legalName: getString(profile.legalName, "Smart Glass Bolivia"),
    phone: getString(profile.phone, "No registrado en configuración"),
    taxId: getString(profile.taxId, "No registrado en configuración"),
    tradeName: getString(profile.tradeName, "Smart Glass Bolivia"),
  };
};

const buildPdfLines = (
  source: PdfSource,
  settings: Awaited<ReturnType<typeof settingsService.getSettings>>,
  company: PdfCompanyProfile,
  variant: QuotationPdfVariant,
  versionNumber: number,
  generatedBy: string,
): string[] => {
  const internal = variant === "internal";
  const lines: string[] = [
    "## SMART GLASS BOLIVIA · VIDRIERA SEBITAS ERP",
    `${company.tradeName} · Documento ${internal ? "interno" : "comercial"}`,
    `Cotización ${source.code} · Versión ${versionNumber} · Estado: ${labelStatus(source.status)}`,
    `Emitida: ${date(source.createdAt)} · Válida hasta: ${date(source.validUntil)} · Generada: ${date(new Date())}`,
    `Responsable comercial: ${source.project?.salesUser?.name ?? source.createdByUser?.name ?? "No asignado"}`,
    "",
    "## DATOS DE LA EMPRESA",
    `Nombre comercial: ${company.tradeName}`,
    `Razón social: ${company.legalName}`,
    `Identificación tributaria: ${company.taxId}`,
    `Dirección: ${company.address}`,
    `Correo: ${settings.supportEmail}`,
    `Teléfono: ${company.phone}`,
    "",
    "## CLIENTE Y PROYECTO",
    `Cliente: ${displayClientName(source.client)}`,
    `Identificación tributaria: ${source.client.taxId ?? "No registrada"}`,
    `Contacto: ${source.client.contacts[0]?.name ?? "No registrado"}${source.client.contacts[0]?.position ? ` · ${source.client.contacts[0].position}` : ""}`,
    `Correo / teléfono: ${source.client.contacts[0]?.email ?? source.client.email ?? "No registrado"} · ${source.client.contacts[0]?.phone ?? source.client.phone ?? "No registrado"}`,
    `Dirección de facturación: ${source.client.billingAddress ?? "No registrada"}${source.client.city ? ` · ${source.client.city}` : ""}`,
    `Proyecto: ${source.project ? `${source.project.code} · ${source.project.title}` : "No asociado"}`,
    `Dirección del proyecto: ${source.project?.siteAddress ?? source.client.addresses.find((address) => address.isProjectSite)?.address ?? "No registrada"}${source.project?.city ? ` · ${source.project.city}` : ""}`,
    "",
    "## PRODUCTOS Y SERVICIOS",
    "Producto | Cantidad | Unidad | Precio unitario | Subtotal",
  ];

  for (const item of source.items) {
    const unit = item.materials[0]?.unit ?? "unidad";
    lines.push(
      `${item.name} | ${decimal(item.quantity)} | ${unit} | ${money(decimal(item.subtotalSale) / Math.max(decimal(item.quantity), 1), source.currency)} | ${money(item.subtotalSale, source.currency)}`,
    );
    for (const description of wrapPdfText(item.description ?? "Sin descripción adicional.", 92)) {
      lines.push(`  ${description}`);
    }
    if (internal) {
      lines.push(`  Costo estimado: ${money(item.subtotalCost, source.currency)} · Margen: ${percent(item.marginPercent)}`);
    }
  }

  lines.push(
    "",
    "## TOTALES",
    `Subtotal: ${money(source.subtotalSale, source.currency)}`,
    `Descuento: ${money(source.discountAmount, source.currency)}`,
    `Impuestos: ${money(source.taxAmount, source.currency)}`,
    `Total: ${money(source.totalSale, source.currency)}`,
    `Moneda: ${source.currency}`,
    "",
    "## CONDICIONES COMERCIALES",
    ...wrapPdfText(source.notes ?? "Sin condiciones comerciales registradas.", 96),
    "Condiciones de pago: No registradas",
    "Tiempo estimado de entrega: No registrado",
    `Validez: ${date(source.validUntil)}`,
  );

  if (internal) {
    lines.push(
      "",
      "## INFORMACIÓN INTERNA",
      `Subtotal de costos: ${money(source.subtotalCost, source.currency)}`,
      `Costo total: ${money(source.subtotalCost, source.currency)}`,
      `Precio de venta: ${money(source.totalSale, source.currency)}`,
      `Utilidad estimada: ${money(source.marginAmount, source.currency)}`,
      `Margen estimado: ${percent(source.marginPercent)}`,
      `Impacto del descuento: ${money(source.discountAmount, source.currency)}`,
      "",
      "## DETALLE DE MATERIALES",
    );

    for (const item of source.items) {
      for (const material of item.materials) {
        lines.push(
          `${item.name} · ${material.materialCode ?? "Sin código"} · ${material.materialName} · ${decimal(material.requiredQuantity)} ${material.unit} · Costo: ${money(material.totalCost, source.currency)} · Desperdicio: ${percent(material.wastePercent)}`,
        );
        if (material.supplier) {
          lines.push(`  Proveedor: ${material.supplier.commercialName ?? material.supplier.legalName}`);
        }
      }
    }

    lines.push(
      "",
      "## APROBACIÓN Y TRAZABILIDAD",
      `Aprobada por: ${source.approvedByUser?.name ?? "Pendiente"} · Fecha: ${date(source.approvedAt)}`,
      `Generada por: ${generatedBy}`,
      ...wrapPdfText(source.internalNotes ?? "Sin observaciones internas registradas.", 96),
    );
  } else {
    lines.push(
      "",
      "## NOTAS PARA EL CLIENTE",
      ...wrapPdfText(source.notes ?? "Sin notas adicionales para el cliente.", 96),
    );
  }

  lines.push("", "Smart Glass Bolivia · Documento generado desde Vidriera Sebitas ERP");
  return lines;
};

const toPdfSource = (quotation: QuotationWithPdfInclude, items: PdfItem[]): PdfSource => ({
  approvedAt: quotation.approvedAt,
  approvedByUser: quotation.approvedByUser,
  client: quotation.client,
  code: quotation.code,
  createdAt: quotation.createdAt,
  createdByUser: quotation.createdByUser,
  currency: quotation.currency,
  discountAmount: quotation.discountAmount,
  internalNotes: quotation.internalNotes,
  items,
  marginAmount: quotation.marginAmount,
  marginPercent: quotation.marginPercent,
  notes: quotation.notes,
  project: quotation.project,
  status: quotation.status,
  subtotalCost: quotation.subtotalCost,
  subtotalSale: quotation.subtotalSale,
  taxAmount: quotation.taxAmount,
  totalSale: quotation.totalSale,
  validUntil: quotation.validUntil,
});

const mapItems = (items: QuotationWithPdfInclude["items"]): PdfItem[] =>
  items.map((item) => ({
    description: item.description,
    itemType: item.itemType,
    materials: item.materials,
    marginPercent: item.marginPercent,
    name: item.name,
    quantity: item.quantity,
    subtotalCost: item.subtotalCost,
    subtotalSale: item.subtotalSale,
  }));

export const quotationPdfService = {
  async generate(
    quotationId: string,
    input: {
      generatedBy: string;
      generatedByUserId: string | null;
      variant: QuotationPdfVariant;
      versionNumber?: number;
    },
  ): Promise<{ buffer: Buffer; fileName: string; versionNumber: number }> {
    const quotation = await prisma.quotation.findFirst({
      include: quotationPdfInclude,
      where: { deletedAt: null, id: quotationId },
    });

    if (!quotation) {
      throw new AppError("No se encontró la cotización solicitada.", 404);
    }

    let source = toPdfSource(quotation, mapItems(quotation.items.filter((item) => item.quotationVersionId === null)));
    const latestVersion = input.versionNumber === undefined
      ? await prisma.quotationVersion.findFirst({
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
          where: { quotationId },
        })
      : null;
    const versionNumber = input.versionNumber ?? latestVersion?.versionNumber ?? 1;

    if (input.versionNumber !== undefined) {
      const version = await prisma.quotationVersion.findFirst({
        include: { items: { include: { materials: { include: { supplier: { select: { commercialName: true, legalName: true } } } }, orderBy: { createdAt: "asc" } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
        where: { quotationId, versionNumber: input.versionNumber },
      });

      if (!version) {
        throw new AppError("No se encontró la versión solicitada.", 404);
      }

      source = {
        ...source,
        discountAmount: version.discountAmount,
        items: mapItems(version.items as QuotationWithPdfInclude["items"]),
        marginAmount: version.marginAmount,
        marginPercent: version.marginPercent,
        subtotalCost: version.subtotalCost,
        subtotalSale: version.subtotalSale,
        taxAmount: version.taxAmount,
        totalSale: version.totalSale,
      };
    }

    const settings = await settingsService.getSettings();
    const companyProfileSetting = await prisma.systemSetting.findUnique({
      select: { valueJson: true },
      where: { key: "company.profile" },
    });
    const company = readCompanyProfile(companyProfileSetting?.valueJson);
    const lines = buildPdfLines(source, settings, company, input.variant, versionNumber, input.generatedBy);
    const pages = paginatePdfLines(lines, {
      header: [
        "Vidriera Sebitas ERP · Documento oficial",
        input.variant === "internal" ? "INFORMACIÓN INTERNA AUTORIZADA" : "DOCUMENTO COMERCIAL",
        "",
      ],
    });

    const version = input.versionNumber
      ? await prisma.quotationVersion.findFirst({
          select: { id: true },
          where: { quotationId, versionNumber: input.versionNumber },
        })
      : null;
    const fileName = `Cotizacion-${quotation.code}-v${versionNumber}${input.variant === "internal" ? "-Interna" : ""}.pdf`;

    await prisma.quotationPdfExport.create({
      data: {
        filePath: fileName,
        generatedByUserId: input.generatedByUserId,
        metadataJson: {
          variant: input.variant,
          versionNumber,
        },
        quotationId,
        quotationVersionId: version?.id ?? null,
      },
    });

    return {
      buffer: buildSimplePdf(pages),
      fileName,
      versionNumber,
    };
  },
};
