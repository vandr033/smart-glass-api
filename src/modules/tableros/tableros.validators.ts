import { z } from "zod";

const dateFilterSchema = z
  .union([z.string(), z.undefined()])
  .transform((value) => value?.trim() || undefined)
  .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Las fechas deben usar el formato YYYY-MM-DD.",
  });

const optionalUuidSchema = z.union([z.uuid(), z.undefined()]).optional();

export const tablerosPanelQuerySchema = z.object({
  clientId: optionalUuidSchema,
  dateFrom: dateFilterSchema,
  dateTo: dateFilterSchema,
  projectId: optionalUuidSchema,
  responsibleId: optionalUuidSchema,
  salesUserId: optionalUuidSchema,
  status: z
    .union([z.string(), z.undefined()])
    .transform((value) => value?.trim() || undefined)
    .refine((value) => value === undefined || value.length <= 100, {
      message: "El estado no puede exceder 100 caracteres.",
    }),
  warehouseId: optionalUuidSchema,
});
