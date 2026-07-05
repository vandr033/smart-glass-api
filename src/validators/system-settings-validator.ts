import { z } from "zod";

const isJsonValue = (value: unknown): boolean => {
  if (value === null) {
    return true;
  }

  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((entry) =>
      isJsonValue(entry),
    );
  }

  return false;
};

export const systemSettingKeyParamSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(191)
    .regex(/^[a-z0-9._-]+$/i, {
      message:
        "Setting keys may only contain letters, numbers, periods, underscores, and hyphens.",
    }),
});

export const updateSystemSettingSchema = z.object({
  description: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") {
        return null;
      }

      const trimmedValue = value.trim();
      return trimmedValue.length > 0 ? trimmedValue : null;
    })
    .refine((value) => value === null || value.length <= 255, {
      message: "Description must be 255 characters or fewer.",
    })
    .optional(),
  valueJson: z.custom<unknown>((value) => isJsonValue(value), {
    message: "valueJson must be valid JSON data.",
  }),
});

export type UpdateSystemSettingInput = z.infer<
  typeof updateSystemSettingSchema
>;
